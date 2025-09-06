import React from 'react';
import { MultipleChoiceQuestion, TrueFalseQuestion, FillInTheBlankQuestion, ShortAnswerQuestion } from '../types';
import { CheckIcon } from './icons/CheckIcon';
import { XIcon } from './icons/XIcon';

type QuestionCardProps = {
    index: number;
    isInteractive: boolean;
    onAnswerChange: (value: any) => void;
    reasoning?: string;
} & ({
    // FIX: Changed type from 'mc' to 'mcq' to match the data structure.
    type: 'mcq';
    question: MultipleChoiceQuestion;
    userAnswer: string;
} | {
    type: 'tf';
    question: TrueFalseQuestion;
    userAnswer: boolean | null;
} | {
    type: 'fib';
    question: FillInTheBlankQuestion;
    userAnswer: string;
} | {
    type: 'sa';
    question: ShortAnswerQuestion;
    userAnswer: string;
});


const InteractiveMCQ: React.FC<{ q: MultipleChoiceQuestion, userAnswer: string, onChange: (v: string) => void }> = ({ q, userAnswer, onChange }) => (
    <div className="space-y-2" role="radiogroup">
        {q.options.map((option, i) => (
            <label key={i} className={`flex items-center p-3 rounded-md text-sm transition-colors cursor-pointer border ${
                userAnswer === option 
                    ? 'bg-blue-100 border-blue-400'
                    : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
            }`}>
                <input
                    type="radio"
                    name={`mcq-${q.question}`}
                    value={option}
                    checked={userAnswer === option}
                    onChange={(e) => onChange(e.target.value)}
                    className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 focus:ring-blue-500"
                />
                <span className="ml-3 text-slate-800">{option}</span>
            </label>
        ))}
    </div>
);

const ResultMCQ: React.FC<{ q: MultipleChoiceQuestion, userAnswer: string }> = ({ q, userAnswer }) => (
    <div className="space-y-2">
        {q.options.map((option, i) => {
            const isCorrect = option === q.correctAnswer;
            const isUserChoice = option === userAnswer;
            let styles = 'bg-slate-50 text-slate-700';
            if (isCorrect) styles = 'bg-green-100 border-green-300 text-green-800 font-medium border';
            if (!isCorrect && isUserChoice) styles = 'bg-red-100 border-red-300 text-red-800 font-medium border';
            
            return (
                 <div key={i} className={`flex items-center p-3 rounded-md text-sm transition-colors ${styles}`}>
                    {isCorrect && <CheckIcon className="w-5 h-5 mr-3 text-green-600 flex-shrink-0" />}
                    {!isCorrect && isUserChoice && <XIcon className="w-5 h-5 mr-3 text-red-600 flex-shrink-0" />}
                    <span>{option}</span>
                </div>
            );
        })}
    </div>
);


const QuestionCard: React.FC<QuestionCardProps> = ({ type, question, index, isInteractive, userAnswer, onAnswerChange, reasoning }) => {
    return (
        <div className="bg-white p-5 rounded-lg shadow-sm border border-slate-200">
            <p className="font-semibold text-slate-800 mb-4">
                {index + 1}. {question.question.replace('____', '______')}
            </p>

            {/* FIX: Changed type check from 'mc' to 'mcq' to match the updated prop type. */}
            {type === 'mcq' && (isInteractive
                ? <InteractiveMCQ q={question as MultipleChoiceQuestion} userAnswer={userAnswer as string} onChange={onAnswerChange} />
                : <ResultMCQ q={question as MultipleChoiceQuestion} userAnswer={userAnswer as string} />
            )}
            
            {type === 'tf' && (isInteractive ? (
                <div className="flex items-center space-x-4" role="radiogroup">
                    {([true, false]).map(val => (
                         <label key={String(val)} className={`flex items-center p-3 rounded-md text-sm transition-colors cursor-pointer border ${
                            userAnswer === val 
                                ? 'bg-blue-100 border-blue-400'
                                : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                        }`}>
                            <input
                                type="radio"
                                name={`tf-${index}`}
                                checked={userAnswer === val}
                                onChange={() => onAnswerChange(val)}
                                className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 focus:ring-blue-500"
                            />
                            <span className="ml-3 text-slate-800 capitalize">{String(val)}</span>
                        </label>
                    ))}
                </div>
            ) : (
                <div>
                    <p className="text-sm text-slate-500 mb-1">Your Answer:</p>
                    <div className={`inline-flex items-center p-2 rounded-md text-sm font-medium border ${
                        String((question as TrueFalseQuestion).correctAnswer) === String(userAnswer)
                            ? 'bg-green-100 text-green-800 border-green-200'
                            : 'bg-red-100 text-red-800 border-red-200'
                    }`}>
                        {String((question as TrueFalseQuestion).correctAnswer) === String(userAnswer)
                            ? <CheckIcon className="w-5 h-5 mr-2" />
                            : <XIcon className="w-5 h-5 mr-2" />
                        }
                        {userAnswer !== null ? String(userAnswer) : 'Not Answered'}
                    </div>
                     <p className="text-sm text-slate-500 mb-1 mt-3">Correct Answer:</p>
                     <div className="inline-flex items-center p-2 rounded-md text-sm font-medium border bg-green-100 text-green-800 border-green-200">
                        {String((question as TrueFalseQuestion).correctAnswer)}
                     </div>
                </div>
            ))}

            {type === 'fib' && (isInteractive ? (
                 <input
                    type="text"
                    value={userAnswer as string}
                    onChange={(e) => onAnswerChange(e.target.value)}
                    className="w-full sm:w-1/2 p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition shadow-sm"
                    placeholder="Type your answer here"
                 />
            ) : (
                 <div>
                    <p className="text-sm text-slate-500 mb-1">Your Answer:</p>
                     <p className={`font-medium p-2 rounded-md inline-block border ${
                        (userAnswer as string).toLowerCase().trim() === (question as FillInTheBlankQuestion).correctAnswer.toLowerCase().trim()
                            ? 'bg-green-100 text-green-800 border-green-200'
                            : 'bg-red-100 text-red-800 border-red-200'
                     }`}>
                         {userAnswer || 'Not Answered'}
                     </p>
                    <p className="text-sm text-slate-500 mb-1 mt-3">Correct Answer:</p>
                    <p className="font-medium bg-green-100 text-green-800 py-2 px-3 rounded-md inline-block border border-green-200">{(question as FillInTheBlankQuestion).correctAnswer}</p>
                </div>
            ))}

            {type === 'sa' && (isInteractive ? (
                <textarea
                    value={userAnswer as string}
                    onChange={(e) => onAnswerChange(e.target.value)}
                    rows={4}
                    className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition shadow-sm"
                    placeholder="Type your short answer here..."
                />
            ) : (
                <div>
                    <p className="text-sm text-slate-500 mb-1">Your Answer:</p>
                    <p className="text-slate-700 bg-slate-50 p-3 rounded-md border border-slate-200 text-sm italic">{userAnswer || 'Not Answered'}</p>
                    <p className="text-sm text-slate-500 mb-1 mt-3">Ideal Answer:</p>
                    <p className="text-slate-700 bg-green-50 p-3 rounded-md border border-green-200 text-sm">{(question as ShortAnswerQuestion).idealAnswer}</p>
                </div>
            ))}

            {!isInteractive && reasoning && (
                <div className="mt-4 pt-4 border-t border-slate-200">
                    <h4 className="font-semibold text-blue-800 text-sm mb-2">AI Explanation</h4>
                    <p className="text-sm text-slate-700 leading-relaxed">{reasoning}</p>
                </div>
            )}
        </div>
    );
};

export default QuestionCard;
