import React, { useState, useEffect, useRef } from 'react';
// FIX: Import AnyQuestion and PlayerState from the centralized types file.
import { Difficulty, MultipleChoiceQuestion, TrueFalseQuestion, FillInTheBlankQuestion, ShortAnswerQuestion, MatchingQuestion, AnyQuestion, PlayerState } from '../types';
import QuestionCard from './QuestionCard';
import MatchingQuestionCard from './MatchingQuestionCard';
import { ClockIcon } from './icons/ClockIcon';
import { CheckIcon } from './icons/CheckIcon';
import { XIcon } from './icons/XIcon';
import { UsersIcon } from './icons/UsersIcon';

// FIX: Moved AnyQuestion and PlayerState to types.ts to be shared across components.
export type TurnState = 'playing' | 'betweenTurns' | 'results';

interface QuizViewProps {
    question: AnyQuestion;
    questionNumber: number;
    totalQuestions: number;
    difficulty: Difficulty;
    isTimerMode: boolean;
    onSubmitAnswer: (answer: any) => void;
    onNextQuestion: () => void;
    onReadyForNextTurn: () => void;
    onQuitQuiz: () => void;

    // Multiplayer props
    gameMode: 'single' | 'multiplayer';
    turnState: TurnState;
    currentPlayer: PlayerState;
    allPlayers?: PlayerState[]; // Includes current player
    reasoning?: string;
}

const TIME_LIMITS: Record<Difficulty, number> = {
    Easy: 60,
    Medium: 45,
    Hard: 30,
};

const ProgressBar: React.FC<{ current: number, total: number }> = ({ current, total }) => {
    const percentage = total > 0 ? (current / total) * 100 : 0;
    return (
        <div className="w-full bg-slate-200 rounded-full h-2.5 mb-4">
            <div className="bg-blue-600 h-2.5 rounded-full" style={{ width: `${percentage}%` }}></div>
        </div>
    );
};

const GameStats: React.FC<{ player: PlayerState }> = ({ player }) => (
    <div className="flex items-center gap-4 sm:gap-6">
        <div className="text-center">
            <div className="text-xs font-medium text-slate-500 uppercase tracking-wider">POINTS</div>
            <div className="text-2xl font-bold text-blue-600">{player.points}</div>
        </div>
        <div className="text-center">
            <div className="text-xs font-medium text-slate-500 uppercase tracking-wider">STREAK</div>
            <div className="text-2xl font-bold text-amber-500 flex items-center">
                {player.streak} {player.streak > 1 && <span className="text-xl ml-1">🔥</span>}
            </div>
        </div>
    </div>
);

const Timer: React.FC<{ timeLeft: number | null }> = ({ timeLeft }) => {
    if (timeLeft === null || timeLeft < 0) return null;
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;
    const isLowTime = timeLeft <= 10;
    const timeColor = isLowTime ? 'text-red-600' : 'text-slate-700';
    const animation = isLowTime && timeLeft > 0 ? 'animate-pulse' : '';
    return (
        <div className="flex items-center gap-2 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200">
             <ClockIcon className={`w-6 h-6 ${timeColor}`} />
             <div className={`text-xl font-bold ${timeColor} ${animation}`} style={{fontVariantNumeric: 'tabular-nums'}}>
                <span>{String(minutes).padStart(2, '0')}</span>:
                <span>{String(seconds).padStart(2, '0')}</span>
            </div>
        </div>
    );
};

const TurnTransitionScreen: React.FC<{ nextPlayerName: string; onReady: () => void }> = ({ nextPlayerName, onReady }) => (
    <div className="text-center bg-white p-10 rounded-xl shadow-md border border-slate-200 flex flex-col items-center">
        <UsersIcon className="w-16 h-16 text-blue-500 mb-4" />
        <h2 className="text-3xl font-bold text-slate-800">Turn Over!</h2>
        <p className="text-slate-600 mt-2 text-lg">
            Great job! Now, please pass the device to <span className="font-bold">{nextPlayerName}</span>.
        </p>
        <button
            onClick={onReady}
            className="mt-8 bg-blue-600 text-white font-bold py-3 px-8 rounded-lg hover:bg-blue-700 transition duration-300 text-lg"
        >
            I'm Ready!
        </button>
    </div>
);

const QuizView: React.FC<QuizViewProps> = (props) => {
    const { question, questionNumber, totalQuestions, difficulty, isTimerMode, turnState, gameMode, currentPlayer, allPlayers, reasoning, onSubmitAnswer, onNextQuestion, onReadyForNextTurn, onQuitQuiz } = props;
    const [localAnswer, setLocalAnswer] = useState<any>('');
    const [timeLeft, setTimeLeft] = useState<number | null>(null);

    const answerRef = useRef(localAnswer);
    useEffect(() => { answerRef.current = localAnswer; }, [localAnswer]);

    useEffect(() => {
        // Reset local answer state when question or player changes
        if (question.type === 'tf') setLocalAnswer(null);
        else if (question.type === 'matching') setLocalAnswer({ pairs: Array((question as MatchingQuestion).pairs.length).fill({ prompt: '', answer: '' }) });
        else setLocalAnswer('');
    }, [question, currentPlayer.name]);
    
    useEffect(() => {
        if (!isTimerMode || turnState !== 'playing') {
            if (timeLeft !== null) setTimeLeft(null);
            return;
        }
    
        const timeLimit = TIME_LIMITS[difficulty];
        setTimeLeft(timeLimit);
    
        const intervalId = setInterval(() => {
          setTimeLeft(prevTime => {
            if (prevTime !== null && prevTime <= 1) {
              clearInterval(intervalId);
              onSubmitAnswer(answerRef.current);
              return 0;
            }
            return prevTime ? prevTime - 1 : 0;
          });
        }, 1000);
    
        return () => clearInterval(intervalId);
    }, [question.uid, isTimerMode, turnState, difficulty, onSubmitAnswer, currentPlayer.name]);

    const handleSingleAnswerChange = (value: any) => setLocalAnswer(value);
    const handleMatchingAnswerChange = (pairIndex: number, value: string) => {
        const newPairs = [...localAnswer.pairs];
        const originalPrompt = (question as MatchingQuestion).pairs[pairIndex].prompt;
        newPairs[pairIndex] = { prompt: originalPrompt, answer: value };
        setLocalAnswer({ pairs: newPairs });
    };

    const getQuestionComponent = (isInteractive: boolean, playerAnswer: any) => {
        const commonProps = { key: question.uid, index: questionNumber - 1, isInteractive, reasoning };
        switch (question.type) {
            case 'mcq':
            case 'tf':
            case 'fib':
            case 'sa':
                return <QuestionCard {...commonProps} question={question as any} type={question.type} userAnswer={playerAnswer} onAnswerChange={handleSingleAnswerChange} />;
            case 'matching':
                return <MatchingQuestionCard {...commonProps} question={question} userAnswers={playerAnswer.pairs} onAnswerChange={handleMatchingAnswerChange} />;
            default: return null;
        }
    };

    if (gameMode === 'multiplayer' && turnState === 'betweenTurns') {
        // The next player is the current one because the index was already incremented
        const nextPlayer = allPlayers?.[(allPlayers.findIndex(p => p.name === currentPlayer.name) + 1) % allPlayers.length];
        return <TurnTransitionScreen nextPlayerName={currentPlayer.name} onReady={onReadyForNextTurn} />;
    }

    const isQuestionInteractive = turnState === 'playing';

    // FIX: Correctly determine if the submit button should be disabled.
    // The previous check `!localAnswer` incorrectly disabled the button when `localAnswer` was `false`.
    const isSubmitDisabled = question.type === 'tf' ? localAnswer === null : !localAnswer;

    return (
        <div className="space-y-6">
            <div>
                 <div className="flex justify-between items-center mb-2 flex-wrap gap-y-2">
                    <div>
                        <h2 className="text-xl font-bold text-slate-800">Question {questionNumber} of {totalQuestions}</h2>
                        <span className="text-sm font-medium bg-blue-100 text-blue-800 py-1 px-3 rounded-full">{difficulty}</span>
                        {gameMode === 'multiplayer' && (
                            <span className="text-sm font-semibold bg-slate-200 text-slate-800 py-1 px-3 rounded-full ml-2">
                                {currentPlayer.name}'s Turn
                            </span>
                        )}
                    </div>
                    <div className="flex items-center gap-4">
                        {isTimerMode && turnState === 'playing' && <Timer timeLeft={timeLeft} />}
                        <GameStats player={currentPlayer} />
                    </div>
                </div>
                 <ProgressBar current={questionNumber} total={totalQuestions} />
            </div>

            {getQuestionComponent(isQuestionInteractive, localAnswer)}

            {turnState === 'results' && gameMode === 'multiplayer' && allPlayers && (
                <div className="bg-white p-5 rounded-lg shadow-sm border border-slate-200">
                    <h3 className="text-lg font-bold text-slate-800 mb-3">Question Results</h3>
                    <div className="space-y-2">
                        {allPlayers.map(p => (
                            <div key={p.name} className={`flex justify-between items-center p-3 rounded-md border ${p.isCorrect ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                                <span className="font-semibold text-slate-800">{p.name}</span>
                                {p.isCorrect 
                                    ? <span className="flex items-center gap-2 font-bold text-green-700"><CheckIcon className="w-6 h-6"/> Correct</span>
                                    : <span className="flex items-center gap-2 font-bold text-red-700"><XIcon className="w-6 h-6"/> Incorrect</span>
                                }
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <div className="mt-6 flex justify-between items-center">
                 <button 
                    onClick={onQuitQuiz}
                    className="bg-slate-100 text-slate-700 font-semibold py-2 px-5 rounded-lg hover:bg-red-100 hover:text-red-700 transition"
                    aria-label="Quit the current quiz"
                >
                    Quit Quiz
                </button>
                {isQuestionInteractive ? (
                     <button 
                        onClick={() => onSubmitAnswer(localAnswer)}
                        disabled={isSubmitDisabled}
                        className="bg-blue-600 text-white font-bold py-3 px-8 rounded-lg hover:bg-blue-700 transition duration-300 text-lg disabled:bg-slate-400 disabled:cursor-not-allowed"
                    >
                        Check Answer
                    </button>
                ) : (
                     <button 
                        onClick={onNextQuestion}
                        className="bg-green-600 text-white font-bold py-3 px-8 rounded-lg hover:bg-green-700 transition duration-300 text-lg"
                    >
                        {questionNumber === totalQuestions ? 'Finish Quiz' : 'Next Question'}
                    </button>
                )}
            </div>
        </div>
    );
};

export default QuizView;