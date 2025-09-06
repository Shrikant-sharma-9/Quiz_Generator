import React from 'react';
import { AnyQuestion, PlayerState, UserAnswers, MultipleChoiceQuestion, TrueFalseQuestion, FillInTheBlankQuestion, ShortAnswerQuestion, MatchingQuestion } from '../types';
import { CheckIcon } from './icons/CheckIcon';
import { XIcon } from './icons/XIcon';

interface QuizReviewProps {
    allQuestions: AnyQuestion[];
    players: PlayerState[];
    reasonings: Record<string, string>;
    gameMode: 'single' | 'multiplayer';
    onBackToDashboard: () => void;
}

const CorrectAnswerDisplay: React.FC<{ question: AnyQuestion }> = ({ question }) => {
    let content: React.ReactNode;
    switch (question.type) {
        case 'mcq':
            content = <p>{(question as MultipleChoiceQuestion).correctAnswer}</p>;
            break;
        case 'tf':
            content = <p className="capitalize">{String((question as TrueFalseQuestion).correctAnswer)}</p>;
            break;
        case 'fib':
            content = <p>{(question as FillInTheBlankQuestion).correctAnswer}</p>;
            break;
        case 'sa':
             content = <p className="text-sm italic">{(question as ShortAnswerQuestion).idealAnswer}</p>;
             break;
        case 'matching':
            const q = question as MatchingQuestion;
            content = (
                <div className="text-sm space-y-1">
                    {q.pairs.map((p, i) => <p key={i}><strong>{p.prompt}</strong> &rarr; {p.answer}</p>)}
                </div>
            );
            break;
        default:
            content = <p>N/A</p>;
    }
    return (
        <div className="p-3 bg-green-50 border border-green-200 text-green-800 font-medium rounded-lg">
            {content}
        </div>
    );
};


const UserAnswerDisplay: React.FC<{ question: AnyQuestion; answer: any }> = ({ question, answer }) => {
    if (answer === null || answer === '' || answer === undefined) {
        return <p className="text-slate-500 italic">Not answered</p>;
    }
     if (question.type === 'matching' && answer.pairs) {
        const q = question as MatchingQuestion;
         return (
             <div className="text-sm space-y-1">
                 {q.pairs.map((p, i) => {
                     const userAnswerForPrompt = answer.pairs.find((ua: any) => ua.prompt === p.prompt)?.answer || 'Not matched';
                     return <p key={i}><strong>{p.prompt}</strong> &rarr; {userAnswerForPrompt}</p>
                 })}
             </div>
         );
    }
    return <p className="text-slate-800">{String(answer)}</p>;
};


const QuizReview: React.FC<QuizReviewProps> = ({ allQuestions, players, reasonings, gameMode, onBackToDashboard }) => {
    return (
        <div className="space-y-8">
            <div className="flex justify-between items-center flex-wrap gap-4">
                <h2 className="text-3xl font-bold text-slate-800">Quiz Summary</h2>
                <button onClick={onBackToDashboard} className="bg-blue-600 text-white font-bold py-2 px-5 rounded-lg hover:bg-blue-700 transition">
                    Back to Dashboard
                </button>
            </div>

            <div className="space-y-6">
                {allQuestions.map((question, index) => {
                    const originalIndex = parseInt(question.uid.split('-')[1]);
                    const questionType = question.type as keyof UserAnswers;

                    // FIX: Use a type guard to safely access 'question' or 'title' property on the 'AnyQuestion' union type.
                    const questionText = 'question' in question ? question.question : question.title;

                    return (
                        <div key={question.uid} className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                            <p className="font-semibold text-slate-800 mb-4 text-lg">
                                {index + 1}. {questionText}
                            </p>

                            <div className="mb-4">
                                <h4 className="text-sm font-bold text-slate-600 mb-2 uppercase tracking-wider">Correct Answer</h4>
                                <CorrectAnswerDisplay question={question} />
                            </div>

                            <div className="mb-4">
                                <h4 className="text-sm font-bold text-slate-600 mb-2 uppercase tracking-wider">{gameMode === 'single' ? 'Your Answer' : 'Player Answers'}</h4>
                                <div className="space-y-3">
                                    {players.map(player => {
                                        const userAnswer = player.answers[questionType][originalIndex];
                                        let isCorrect = false;
                                        
                                        if (['mcq', 'tf', 'fib'].includes(question.type)) {
                                            if (question.type === 'mcq') isCorrect = (question as MultipleChoiceQuestion).correctAnswer === userAnswer;
                                            else if (question.type === 'tf') isCorrect = String((question as TrueFalseQuestion).correctAnswer) === String(userAnswer);
                                            else if (question.type === 'fib') isCorrect = (userAnswer && (question as FillInTheBlankQuestion).correctAnswer.toLowerCase().trim() === String(userAnswer).toLowerCase().trim());
                                        } else {
                                            // Matching and SA are not auto-graded, so we don't show a check/x
                                            isCorrect = true; 
                                        }

                                        const showIcon = ['mcq', 'tf', 'fib'].includes(question.type);

                                        return (
                                            <div key={player.name} className={`flex items-start justify-between p-3 rounded-lg border ${isCorrect ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                                                <div className="flex-1 pr-4">
                                                    {gameMode === 'multiplayer' && <p className="font-bold text-sm text-slate-800">{player.name}</p>}
                                                    <UserAnswerDisplay question={question} answer={userAnswer} />
                                                </div>
                                                {showIcon && (
                                                    isCorrect 
                                                        ? <CheckIcon className="w-6 h-6 text-green-600 flex-shrink-0" /> 
                                                        : <XIcon className="w-6 h-6 text-red-600 flex-shrink-0" />
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {reasonings[question.uid] && (
                                <div className="mt-4 pt-4 border-t border-slate-200">
                                    <h4 className="font-semibold text-blue-800 text-sm mb-2">AI Explanation</h4>
                                    <p className="text-sm text-slate-700 leading-relaxed">{reasonings[question.uid]}</p>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default QuizReview;