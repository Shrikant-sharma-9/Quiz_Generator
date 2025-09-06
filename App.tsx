import React, { useState, useCallback, useEffect } from 'react';
import { generateQuestionsFromText, generateReasoningForAnswer, analyzePerformance } from './services/geminiService';
// FIX: Import AnyQuestion and PlayerState from the centralized types file.
import { Quiz, UserAnswers, Difficulty, UserProfile, MultipleChoiceQuestion, TrueFalseQuestion, FillInTheBlankQuestion, ShortAnswerQuestion, MatchingQuestion, AnyQuestion, PlayerState } from './types';
import * as storage from './services/storageService';
import FileUpload from './components/FileUpload';
import QuizView, { TurnState } from './components/QuestionList';
import Dashboard from './components/Dashboard';
import { UserIcon } from './components/icons/UserIcon';
import { TrophyIcon } from './components/icons/TrophyIcon';
import { AlertTriangleIcon } from './components/icons/AlertTriangleIcon';
import { CheckIcon } from './components/icons/CheckIcon';
import { XIcon } from './components/icons/XIcon';
import { StarIcon } from './components/icons/StarIcon';
import QuizReview from './components/QuizReview';
import { ClipboardListIcon } from './components/icons/ClipboardListIcon';

export type AppState = 'dashboard' | 'creatingQuiz' | 'loading' | 'takingQuiz' | 'quizFinished' | 'error' | 'reviewingQuiz';
// FIX: Moved AnyQuestion and PlayerState definitions to types.ts to be shared across components.

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

const QuitConfirmationModal: React.FC<{ onConfirm: () => void; onCancel: () => void }> = ({ onConfirm, onCancel }) => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" role="dialog" aria-modal="true" aria-labelledby="quit-dialog-title">
        <div className="bg-white p-8 rounded-xl shadow-lg max-w-md w-full mx-4 text-center">
            <AlertTriangleIcon className="w-16 h-16 text-amber-500 mx-auto mb-4" />
            <h2 id="quit-dialog-title" className="text-2xl font-bold text-slate-800">Are you sure?</h2>
            <p className="text-slate-600 mt-2">
                If you quit now, your progress for this quiz will not be saved.
            </p>
            <div className="mt-8 flex justify-center gap-4">
                <button
                    onClick={onCancel}
                    className="bg-slate-200 text-slate-800 font-bold py-3 px-6 rounded-lg hover:bg-slate-300 transition"
                >
                    Cancel
                </button>
                <button
                    onClick={onConfirm}
                    className="bg-red-600 text-white font-bold py-3 px-6 rounded-lg hover:bg-red-700 transition"
                >
                    Quit Quiz
                </button>
            </div>
        </div>
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
    const [appState, setAppState] = useState<AppState>('dashboard');
    const [error, setError] = useState<string | null>(null);
    const [fileName, setFileName] = useState<string>('');
    const [loadingMessage, setLoadingMessage] = useState<string>('');
    const [sourceText, setSourceText] = useState<string>('');
    const [currentDifficulty, setCurrentDifficulty] = useState<Difficulty>('Medium');
    const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
    const [isTimerMode, setIsTimerMode] = useState(false);
    const [allQuestions, setAllQuestions] = useState<AnyQuestion[]>([]);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [reasonings, setReasonings] = useState<Record<string, string>>({});
    const [isQuitModalOpen, setIsQuitModalOpen] = useState(false);
    
    // Multiplayer and unified game state
    const [gameMode, setGameMode] = useState<'single' | 'multiplayer'>('single');
    const [players, setPlayers] = useState<PlayerState[]>([]);
    const [currentPlayerIndex, setCurrentPlayerIndex] = useState(0);
    const [turnState, setTurnState] = useState<TurnState>('playing');
    
    useEffect(() => {
        const loadedProfile = storage.loadUserProfile();
        setUserProfile(loadedProfile ?? {
            quizHistory: [],
            performanceStats: {},
            analysis: null,
            points: 0,
            longestStreak: 0,
        });
    }, []);

    const flattenQuiz = (q: Quiz): AnyQuestion[] => {
        const mcqs = q.multipleChoiceQuestions.map((question, i) => ({ ...question, type: 'mcq' as const, uid: `mcq-${i}` }));
        const tfs = q.trueFalseQuestions.map((question, i) => ({ ...question, type: 'tf' as const, uid: `tf-${i}` }));
        const fibs = q.fillInTheBlankQuestions.map((question, i) => ({ ...question, type: 'fib' as const, uid: `fib-${i}` }));
        const sas = q.shortAnswerQuestions.map((question, i) => ({ ...question, type: 'sa' as const, uid: `sa-${i}` }));
        const matches = q.matchingQuestions.map((question, i) => ({ ...question, type: 'matching' as const, uid: `matching-${i}` }));
        return [...mcqs, ...tfs, ...fibs, ...matches, ...sas];
    };

    const handleGenerate = useCallback(async (text: string, name: string, difficulty: Difficulty, timerMode: boolean, playerNames: string[], numQuestions: number) => {
        setSourceText(text);
        setFileName(name);
        setCurrentDifficulty(difficulty);
        setIsTimerMode(timerMode);
        setAppState('loading');
        setLoadingMessage('Analyzing document and generating questions...');
        setError(null);
        setQuiz(null);
        setAllQuestions([]);
        setCurrentQuestionIndex(0);
        setReasonings({});
        setCurrentPlayerIndex(0);
        setTurnState('playing');

        const isMultiplayer = playerNames.length > 0;
        setGameMode(isMultiplayer ? 'multiplayer' : 'single');

        try {
            const historyQuizzes = userProfile?.quizHistory.map(h => h.quiz) || [];
            const generatedQuiz = await generateQuestionsFromText(text, difficulty, historyQuizzes, numQuestions);
            
            if (generatedQuiz) {
                setQuiz(generatedQuiz);
                const initialAnswers = getInitialAnswers(generatedQuiz);
                
                const playerList = isMultiplayer ? playerNames : [userProfile?.quizHistory.length ? 'Learner' : 'Player 1'];
                const initialPlayers: PlayerState[] = playerList.map(name => ({
                    name,
                    answers: JSON.parse(JSON.stringify(initialAnswers)), // Deep copy
                    score: { correct: 0, total: 0 },
                    points: 0,
                    streak: 0,
                    maxSessionStreak: 0,
                }));
                setPlayers(initialPlayers);
                
                setAllQuestions(flattenQuiz(generatedQuiz));
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

    const handleAnswerSubmit = async (answer: any) => {
        if (!quiz || !players.length) return;
        
        const currentQuestion = allQuestions[currentQuestionIndex];
        const originalIndex = parseInt(currentQuestion.uid.split('-')[1]);
        
        let isCorrect = false;
        if (['mcq', 'tf', 'fib'].includes(currentQuestion.type)) {
            if (currentQuestion.type === 'mcq') isCorrect = (currentQuestion as MultipleChoiceQuestion).correctAnswer === answer;
            else if (currentQuestion.type === 'tf') isCorrect = String((currentQuestion as TrueFalseQuestion).correctAnswer) === String(answer);
            else if (currentQuestion.type === 'fib') isCorrect = (currentQuestion as FillInTheBlankQuestion).correctAnswer.toLowerCase().trim() === String(answer).toLowerCase().trim();
        }

        setPlayers(prevPlayers => {
            const newPlayers = [...prevPlayers];
            const currentPlayer = { ...newPlayers[currentPlayerIndex] };
            
            (currentPlayer.answers[currentQuestion.type as keyof UserAnswers] as any)[originalIndex] = answer;
            currentPlayer.answer = answer;
            currentPlayer.isCorrect = isCorrect;

            if (['mcq', 'tf', 'fib'].includes(currentQuestion.type)) {
                currentPlayer.score.total += 1;
                if (isCorrect) {
                    currentPlayer.score.correct += 1;
                    const POINTS_MAP: Record<Difficulty, number> = { Easy: 10, Medium: 15, Hard: 20 };
                    currentPlayer.points += POINTS_MAP[currentDifficulty];
                    currentPlayer.streak += 1;
                    currentPlayer.maxSessionStreak = Math.max(currentPlayer.maxSessionStreak, currentPlayer.streak);
                } else {
                    currentPlayer.streak = 0;
                }
            }
            newPlayers[currentPlayerIndex] = currentPlayer;
            return newPlayers;
        });

        if (gameMode === 'multiplayer' && currentPlayerIndex < players.length - 1) {
            setTurnState('betweenTurns');
        } else {
            setAppState('loading');
            setLoadingMessage('Generating explanation...');
            try {
                const reasoningText = await generateReasoningForAnswer(sourceText, currentQuestion, answer);
                setReasonings(prev => ({ ...prev, [currentQuestion.uid]: reasoningText }));
            } catch (err) {
                console.error("Failed to generate reasoning:", err);
                setReasonings(prev => ({ ...prev, [currentQuestion.uid]: "Could not generate an explanation at this time." }));
            }
            setAppState('takingQuiz');
            setTurnState('results');
        }
    };
    
    const handleReadyForNextTurn = () => {
        setCurrentPlayerIndex(prev => prev + 1);
        setTurnState('playing');
    };

    const handleNextQuestion = async () => {
        if (currentQuestionIndex < allQuestions.length - 1) {
            setCurrentQuestionIndex(prev => prev + 1);
            setCurrentPlayerIndex(0);
            setTurnState('playing');
            setPlayers(prev => prev.map(p => ({ ...p, answer: undefined, isCorrect: undefined })));
        } else {
            if (!quiz || !userProfile || !players.length) return;
            setAppState('loading');
            setLoadingMessage("Finalizing quiz and saving progress...");

            const sortedMultiplayerResults = gameMode === 'multiplayer'
                ? [...players].sort((a, b) => b.score.correct - a.score.correct || b.points - a.points).map(p => ({ name: p.name, score: p.score, points: p.points }))
                : undefined;

            const newHistoryItem: any = { 
                quiz, 
                date: new Date().toISOString(), 
                sourceName: fileName, 
                difficulty: currentDifficulty, 
                isTimerMode,
                gameMode,
            };

            if (gameMode === 'single') {
                newHistoryItem.userAnswers = players[0].answers;
                newHistoryItem.reasonings = reasonings;
                newHistoryItem.score = players[0].score;
                newHistoryItem.pointsEarned = players[0].points;
            } else {
                newHistoryItem.multiplayerResults = sortedMultiplayerResults;
            }
            
            const updatedHistory = [...userProfile.quizHistory, newHistoryItem];
            
            let newAnalysis = userProfile.analysis;
            if (gameMode === 'single' && updatedHistory.length > 0 && updatedHistory.length % 3 === 0) {
                 try {
                     setLoadingMessage("Generating new AI-powered performance analysis...");
                     newAnalysis = await analyzePerformance(updatedHistory);
                } catch (err) { console.error("Failed to get performance analysis:", err); }
            }
            
            const pointsEarnedThisSession = gameMode === 'single' ? players[0].points : 0;
            const newLongestStreak = gameMode === 'single' 
                ? Math.max(userProfile.longestStreak, players[0].maxSessionStreak) 
                : userProfile.longestStreak;

            const updatedProfile: UserProfile = { 
                ...userProfile, 
                quizHistory: updatedHistory, 
                analysis: newAnalysis, 
                points: userProfile.points + pointsEarnedThisSession,
                longestStreak: newLongestStreak
            };
            storage.saveUserProfile(updatedProfile);
            setUserProfile(updatedProfile);
            
            setAppState('quizFinished');
        }
    };
    
    const handleResetToDashboard = () => {
        // Keep quiz data for review, but reset other states
        setAppState('dashboard');
        setError(null);
    };

    const handleFullReset = () => {
        setQuiz(null);
        setAllQuestions([]);
        setPlayers([]);
        setCurrentQuestionIndex(0);
        setReasonings({});
        setAppState('dashboard');
        setError(null);
    };
    
    const handleStartNewQuiz = () => setAppState('creatingQuiz');

    const handleQuitQuiz = () => setIsQuitModalOpen(true);
    const handleCancelQuit = () => setIsQuitModalOpen(false);
    const handleConfirmQuit = () => {
        setIsQuitModalOpen(false);
        handleFullReset();
    };

    const handleReviewQuiz = () => {
        setAppState('reviewingQuiz');
    };

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
        const currentQuestion = allQuestions[currentQuestionIndex];
        const currentPlayer = players[currentPlayerIndex];

        switch (appState) {
            case 'dashboard':
                return userProfile && <Dashboard profile={userProfile} onStartQuiz={handleStartNewQuiz} onExport={handleExport} />;
            case 'creatingQuiz':
                return <FileUpload onGenerateQuiz={handleGenerate} onCancel={handleFullReset} />;
            case 'loading':
                return <LoadingIndicator message={loadingMessage} />;
            case 'takingQuiz':
                 return currentQuestion && currentPlayer && (
                    <QuizView
                        question={currentQuestion}
                        questionNumber={currentQuestionIndex + 1}
                        totalQuestions={allQuestions.length}
                        onSubmitAnswer={handleAnswerSubmit}
                        onNextQuestion={handleNextQuestion}
                        onReadyForNextTurn={handleReadyForNextTurn}
                        onQuitQuiz={handleQuitQuiz}
                        reasoning={reasonings[currentQuestion.uid]}
                        difficulty={currentDifficulty}
                        isTimerMode={isTimerMode}
                        // Game state props
                        gameMode={gameMode}
                        turnState={turnState}
                        currentPlayer={currentPlayer}
                        allPlayers={players}
                    />
                );
            case 'quizFinished':
                if (gameMode === 'multiplayer') {
                    const sortedPlayers = [...players].sort((a, b) => b.score.correct - a.score.correct || b.points - a.points);
                    const winner = sortedPlayers[0];
                    return (
                        <div className="bg-white p-8 rounded-xl shadow-md border border-slate-200 text-center">
                            <TrophyIcon className="w-20 h-20 text-amber-400 mx-auto mb-4" />
                            <h2 className="text-3xl font-bold text-slate-800">Quiz Complete!</h2>
                            <p className="text-xl font-semibold text-slate-700 mt-2">Winner: <span className="text-blue-600">{winner.name}</span></p>
                            <div className="mt-8 space-y-4 max-w-md mx-auto">
                                {sortedPlayers.map((p, i) => (
                                    <div key={p.name} className={`p-4 rounded-lg border flex justify-between items-center ${i === 0 ? 'bg-amber-50 border-amber-300' : 'bg-slate-50 border-slate-200'}`}>
                                        <div className="font-bold text-lg text-slate-800">{i + 1}. {p.name}</div>
                                        <div className="text-right">
                                            <div className="font-semibold text-xl text-slate-900">{p.score.correct} / {p.score.total}</div>
                                            <div className="text-blue-600 font-medium">{p.points} points</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
                                <button onClick={handleFullReset} className="bg-blue-600 text-white font-bold py-3 px-6 rounded-lg hover:bg-blue-700">Back to Dashboard</button>
                                <button onClick={handleReviewQuiz} className="flex items-center justify-center gap-2 bg-slate-200 text-slate-700 font-semibold py-3 px-6 rounded-lg hover:bg-slate-300">
                                    <ClipboardListIcon className="w-5 h-5" /> Review Answers
                                </button>
                            </div>
                        </div>
                    );
                }
                // Single player finished screen - New Report View
                if (players.length > 0) {
                    const finalPlayerState = players[0];
                    const { correct, total } = finalPlayerState.score;
                    const incorrect = total - correct;
                    const points = finalPlayerState.points;
                    return (
                        <div className="bg-white p-8 rounded-xl shadow-md border border-slate-200 text-center">
                            <h2 className="text-3xl font-bold text-slate-800">Quiz Report</h2>
                            <p className="text-slate-600 mt-2">Here's a summary of your performance.</p>
                            
                            <div className="my-8">
                                <p className="text-sm font-medium text-slate-500 uppercase tracking-wider">Final Score</p>
                                <p className="text-6xl font-bold text-slate-800 tracking-tight mt-1">{correct} <span className="text-4xl font-medium text-slate-400">/ {total}</span></p>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center max-w-lg mx-auto">
                                <div className="bg-green-50 border border-green-200 p-4 rounded-lg">
                                    <CheckIcon className="w-8 h-8 mx-auto text-green-500 mb-2" />
                                    <p className="text-3xl font-bold text-green-800">{correct}</p>
                                    <p className="text-sm font-medium text-green-700">Correct</p>
                                </div>
                                <div className="bg-red-50 border border-red-200 p-4 rounded-lg">
                                    <XIcon className="w-8 h-8 mx-auto text-red-500 mb-2" />
                                    <p className="text-3xl font-bold text-red-800">{incorrect}</p>
                                    <p className="text-sm font-medium text-red-700">Incorrect</p>
                                </div>
                                <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
                                    <StarIcon className="w-8 h-8 mx-auto text-blue-500 mb-2" />
                                    <p className="text-3xl font-bold text-blue-800">{points}</p>
                                    <p className="text-sm font-medium text-blue-700">Points Earned</p>
                                </div>
                            </div>
                            <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
                                <button onClick={handleFullReset} className="bg-blue-600 text-white font-bold py-3 px-8 rounded-lg hover:bg-blue-700 transition">Back to Dashboard</button>
                                <button onClick={handleReviewQuiz} className="flex items-center justify-center gap-2 bg-slate-200 text-slate-700 font-semibold py-3 px-6 rounded-lg hover:bg-slate-300">
                                    <ClipboardListIcon className="w-5 h-5" /> Review Answers
                                </button>
                            </div>
                        </div>
                    );
                }
                return null;
            case 'reviewingQuiz':
                return (
                    <QuizReview
                        allQuestions={allQuestions}
                        players={players}
                        reasonings={reasonings}
                        gameMode={gameMode}
                        onBackToDashboard={handleFullReset}
                    />
                );
            case 'error':
                return (
                    <div className="text-center p-8 bg-red-50 border border-red-200 rounded-lg">
                        <h3 className="text-xl font-semibold text-red-700">An Error Occurred</h3>
                        <p className="text-red-600 mt-2">{error}</p>
                        <button onClick={handleFullReset} className="mt-6 bg-blue-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-blue-700">Back to Dashboard</button>
                    </div>
                );
            default: return null;
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 font-sans text-slate-800">
            <header className="bg-white border-b border-slate-200">
                <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Adaptive Quiz AI</h1>
                        <p className="text-slate-500 mt-1">Your personal AI-powered study partner.</p>
                    </div>
                    {userProfile && (
                        <div className="flex items-center gap-2 bg-slate-100 p-2 rounded-lg">
                            <UserIcon className="w-6 h-6 text-slate-500" />
                            <div className="text-right">
                               <div className="font-bold text-slate-800">
                                   {appState === 'takingQuiz' && gameMode === 'single' && players.length > 0
                                        ? userProfile.points + players[0].points
                                        : userProfile.points
                                   } pts
                               </div>
                               <div className="text-xs text-slate-500">Total Points</div>
                            </div>
                        </div>
                    )}
                </div>
            </header>
            <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="max-w-4xl mx-auto">{renderContent()}</div>
            </main>
            {isQuitModalOpen && <QuitConfirmationModal onConfirm={handleConfirmQuit} onCancel={handleCancelQuit} />}
            <footer className="bg-white border-t border-slate-200 mt-auto">
                <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 text-center text-sm text-slate-500">
                    <p>&copy; {new Date().getFullYear()} Quiz Generator AI. Built for educators.</p>
                </div>
            </footer>
        </div>
    );
};

export default App;