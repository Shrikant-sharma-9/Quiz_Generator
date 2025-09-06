
import React, { useState, useCallback, useEffect } from 'react';
import { generateQuestionsFromText, analyzePerformance } from './services/geminiService';
import { Quiz, UserAnswers, Difficulty, UserProfile } from './types';
import * as storage from './services/storageService';
import FileUpload from './components/FileUpload';
import QuizView from './components/QuestionList';
import Dashboard from './components/Dashboard';

export type AppState = 'dashboard' | 'creatingQuiz' | 'loading' | 'takingQuiz' | 'quizFinished' | 'error';

const LoadingIndicator: React.FC<{ message: string }> = ({ message }) => (
    <div className="flex flex-col items-center justify-center text-center p-8">
        <svg className="animate-spin -ml-1 mr-3 h-10 w-10 text-blue-600 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <p className="text-lg font-medium text-slate-700">{message}</p>
        <p className="text-sm text-slate-500 mt-1">This may take a moment. Please don't close the page.</p>
    </div>
);

const getInitialAnswers = (quiz: Quiz): UserAnswers => ({
    mcq: Array(quiz.multipleChoiceQuestions.length).fill(''),
    tf: Array(quiz.trueFalseQuestions.length).fill(null),
    fib: Array(quiz.fillInTheBlankQuestions.length).fill(''),
    matching: Array(quiz.matchingQuestions.length).fill({ pairs: Array(quiz.matchingQuestions[0]?.pairs.length || 0).fill({ prompt: '', answer: '' }) }),
    sa: Array(quiz.shortAnswerQuestions.length).fill(''),
});


const App: React.FC = () => {
    const [quiz, setQuiz] = useState<Quiz | null>(null);
    const [userAnswers, setUserAnswers] = useState<UserAnswers | null>(null);
    const [score, setScore] = useState<{ correct: number; total: number } | null>(null);
    const [appState, setAppState] = useState<AppState>('dashboard');
    const [error, setError] = useState<string | null>(null);
    const [fileName, setFileName] = useState<string>('');
    const [loadingMessage, setLoadingMessage] = useState<string>('');
    const [sourceText, setSourceText] = useState<string>('');
    const [currentDifficulty, setCurrentDifficulty] = useState<Difficulty>('Medium');
    const [userProfile, setUserProfile] = useState<UserProfile | null>(null);

    useEffect(() => {
        const loadedProfile = storage.loadUserProfile();
        if (loadedProfile) {
            setUserProfile(loadedProfile);
        } else {
             setUserProfile({
                quizHistory: [],
                performanceStats: {},
                analysis: null,
            });
        }
    }, []);

    const handleGenerate = useCallback(async (text: string, name: string, difficulty: Difficulty, isAdapting: boolean = false) => {
        if (!isAdapting) {
            setSourceText(text);
        }
        setFileName(name);
        setCurrentDifficulty(difficulty);
        setAppState('loading');
        setLoadingMessage(isAdapting ? `Generating ${difficulty} questions...` : 'Analyzing document and generating questions...');
        setError(null);
        setQuiz(null);
        setUserAnswers(null);

        try {
            // Pass only the questions from the history, not the full quiz objects
            const historyQuestions = userProfile?.quizHistory.map(h => h.quiz) || [];
            const generatedQuiz = await generateQuestionsFromText(text, difficulty, historyQuestions);
            if (generatedQuiz) {
                setQuiz(generatedQuiz);
                setUserAnswers(getInitialAnswers(generatedQuiz));
                setAppState('takingQuiz');
            } else {
                throw new Error("The generated quiz data is empty. Please try again.");
            }
        } catch (err) {
            console.error(err);
            const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
            setError(`Failed to generate questions. ${errorMessage}`);
            setAppState('error');
        }
    }, [userProfile]);

    const handleQuizSubmit = async (answers: UserAnswers) => {
        if (!quiz || !userProfile) return;

        setLoadingMessage("Calculating score and analyzing performance...");
        setAppState('loading');

        let correct = 0;
        let total = 0;
        
        const updatedStats = { ...userProfile.performanceStats };

        const updateStat = (type: string, isCorrect: boolean) => {
            if (!updatedStats[type]) updatedStats[type] = { correct: 0, total: 0 };
            if (isCorrect) updatedStats[type].correct++;
            updatedStats[type].total++;
        };

        quiz.multipleChoiceQuestions.forEach((q, i) => {
            const isCorrect = q.correctAnswer === answers.mcq[i];
            if (isCorrect) correct++;
            total++;
            updateStat('mcq', isCorrect);
        });
        quiz.trueFalseQuestions.forEach((q, i) => {
            const isCorrect = String(q.correctAnswer) === String(answers.tf[i]);
            if (isCorrect) correct++;
            total++;
            updateStat('tf', isCorrect);
        });
        quiz.fillInTheBlankQuestions.forEach((q, i) => {
            const isCorrect = q.correctAnswer.toLowerCase().trim() === answers.fib[i].toLowerCase().trim();
            if (isCorrect) correct++;
            total++;
            updateStat('fib', isCorrect);
        });
        
        const currentScore = { correct, total };
        setScore(currentScore);
        setUserAnswers(answers);
        
        const newHistoryItem = { quiz, userAnswers: answers, score: currentScore, date: new Date().toISOString(), sourceName: fileName, difficulty: currentDifficulty };
        const updatedHistory = [...userProfile.quizHistory, newHistoryItem];

        let newAnalysis = userProfile.analysis;
        if (updatedHistory.length > 0 && updatedHistory.length % 3 === 0) {
            try {
                 setLoadingMessage("Generating new AI-powered performance analysis...");
                 newAnalysis = await analyzePerformance(updatedHistory);
            } catch (err) {
                console.error("Failed to get performance analysis:", err);
                // Don't block the user flow if analysis fails
            }
        }
        
        const updatedProfile: UserProfile = {
            quizHistory: updatedHistory,
            performanceStats: updatedStats,
            analysis: newAnalysis,
        };

        storage.saveUserProfile(updatedProfile);
        setUserProfile(updatedProfile);

        setAppState('quizFinished');
    };

    const handleAdapt = () => {
        const autoGradedTotal = (quiz?.multipleChoiceQuestions.length || 0) + (quiz?.trueFalseQuestions.length || 0) + (quiz?.fillInTheBlankQuestions.length || 0);
        const percentage = score && autoGradedTotal > 0 ? (score.correct / autoGradedTotal) * 100 : 0;
        
        let nextDifficulty: Difficulty = currentDifficulty;

        if (percentage >= 80) {
            nextDifficulty = currentDifficulty === 'Easy' ? 'Medium' : 'Hard';
        } else if (percentage < 50) {
            nextDifficulty = currentDifficulty === 'Hard' ? 'Medium' : 'Easy';
        }
        
        handleGenerate(sourceText, fileName, nextDifficulty, true);
    };

    const handleResetToDashboard = () => {
        setQuiz(null);
        setUserAnswers(null);
        setScore(null);
        setAppState('dashboard');
        setError(null);
        setFileName('');
        setSourceText('');
    };
    
    const handleStartNewQuiz = () => setAppState('creatingQuiz');

    const handleExport = () => {
        if (!userProfile) return;
        const dataStr = JSON.stringify(userProfile, null, 2);
        const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
        const exportFileDefaultName = `quiz_ai_progress.json`;
        
        const linkElement = document.createElement('a');
        linkElement.setAttribute('href', dataUri);
        linkElement.setAttribute('download', exportFileDefaultName);
        linkElement.click();
    };

    const renderContent = () => {
        switch (appState) {
            case 'dashboard':
                return userProfile && <Dashboard profile={userProfile} onStartQuiz={handleStartNewQuiz} onExport={handleExport} />;
            case 'creatingQuiz':
                return <FileUpload onGenerateQuiz={handleGenerate} onCancel={handleResetToDashboard} />;
            case 'loading':
                return <LoadingIndicator message={loadingMessage} />;
            case 'takingQuiz':
            case 'quizFinished':
                return quiz && userAnswers && (
                    <QuizView
                        quiz={quiz}
                        userAnswers={userAnswers}
                        isInteractive={appState === 'takingQuiz'}
                        onSubmit={handleQuizSubmit}
                        onAnswerChange={setUserAnswers}
                        fileName={fileName}
                        onReset={handleResetToDashboard}
                        onAdapt={handleAdapt}
                        score={score}
                        currentDifficulty={currentDifficulty}
                    />
                );
            case 'error':
                return (
                    <div className="text-center p-8 bg-red-50 border border-red-200 rounded-lg">
                        <h3 className="text-xl font-semibold text-red-700">Generation Failed</h3>
                        <p className="text-red-600 mt-2">{error}</p>
                        <button
                            onClick={handleResetToDashboard}
                            className="mt-6 bg-blue-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-blue-700 transition duration-300"
                        >
                            Back to Dashboard
                        </button>
                    </div>
                );
            default:
                return null;
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 font-sans text-slate-800">
            <header className="bg-white border-b border-slate-200">
                <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
                            Adaptive Quiz AI
                        </h1>
                        <p className="text-slate-500 mt-1">
                            Your personal AI-powered study partner.
                        </p>
                    </div>
                </div>
            </header>
            <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="max-w-4xl mx-auto">
                    {renderContent()}
                </div>
            </main>
            <footer className="bg-white border-t border-slate-200 mt-auto">
                <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 text-center text-sm text-slate-500">
                    <p>&copy; {new Date().getFullYear()} Quiz Generator AI. Built for educators.</p>
                </div>
            </footer>
        </div>
    );
};

export default App;
