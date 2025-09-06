import React from 'react';
import { MatchingQuestion, MatchingQuestionPair } from '../types';

interface MatchingQuestionCardProps {
    question: MatchingQuestion;
    index: number;
    isInteractive: boolean;
    userAnswers: MatchingQuestionPair[];
    onAnswerChange: (pairIndex: number, value: string) => void;
    reasoning?: string;
}

const MatchingQuestionCard: React.FC<MatchingQuestionCardProps> = ({ question, index, isInteractive, userAnswers, onAnswerChange, reasoning }) => {
    
    // Create a shuffled list of answer options for the dropdown
    const answerOptions = React.useMemo(() => {
        return [...question.pairs].sort(() => Math.random() - 0.5).map(p => p.answer);
    }, [question.pairs]);
    
    return (
        <div className="bg-white p-5 rounded-lg shadow-sm border border-slate-200 transition-shadow hover:shadow-md">
            <p className="font-semibold text-slate-800 mb-4">
                {index + 1}. {question.title}
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3 text-sm">
                <div className="font-semibold text-slate-600 border-b pb-2">Prompt</div>
                <div className="font-semibold text-slate-600 border-b pb-2">Answer</div>
                
                {question.pairs.map((pair, i) => (
                    <React.Fragment key={i}>
                        <div className="p-3 bg-slate-50 rounded-md text-slate-800 border border-slate-200 flex items-center">{pair.prompt}</div>
                        
                        {isInteractive ? (
                            <div>
                                <select 
                                    value={userAnswers?.[i]?.answer || ''}
                                    onChange={(e) => onAnswerChange(i, e.target.value)}
                                    className="w-full p-3 bg-white rounded-md text-slate-800 border border-slate-300 focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="" disabled>Select a match...</option>
                                    {answerOptions.map(opt => (
                                        <option key={opt} value={opt}>{opt}</option>
                                    ))}
                                </select>
                            </div>
                        ) : (
                            <div className="p-3 bg-green-100 rounded-md text-green-900 font-medium border border-green-200 flex items-center">{pair.answer}</div>
                        )}
                    </React.Fragment>
                ))}
            </div>
             {!isInteractive && (
                 <div className="mt-4 text-xs text-slate-500 bg-slate-50 p-2 rounded-md">
                    <strong>Note:</strong> Matching and Short Answer questions are not auto-graded. The correct answers are shown for review.
                </div>
             )}
             {!isInteractive && reasoning && (
                <div className="mt-4 pt-4 border-t border-slate-200">
                    <h4 className="font-semibold text-blue-800 text-sm mb-2">AI Explanation</h4>
                    <p className="text-sm text-slate-700 leading-relaxed">{reasoning}</p>
                </div>
            )}
        </div>
    );
};

export default MatchingQuestionCard;
