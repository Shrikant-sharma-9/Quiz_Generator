import React from 'react';
import { UserProfile } from '../types';
import { CheckIcon } from './icons/CheckIcon';
import { XIcon } from './icons/XIcon';

interface DashboardProps {
    profile: UserProfile;
    onStartQuiz: () => void;
    onExport: () => void;
}

const StatCard: React.FC<{ title: string; value: string; description: string }> = ({ title, value, description }) => (
    <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
        <p className="text-sm font-medium text-slate-500">{title}</p>
        <p className="text-3xl font-bold text-slate-800 mt-1">{value}</p>
        <p className="text-sm text-slate-500">{description}</p>
    </div>
);

const PerformanceChart: React.FC<{ stats: UserProfile['performanceStats'] }> = ({ stats }) => {
    const types = [
        { key: 'mcq', name: 'MCQ' },
        { key: 'tf', name: 'True/False' },
        { key: 'fib', name: 'Fill in Blank' },
    ];

    return (
        <div className="space-y-4">
            {types.map(type => {
                const stat = stats[type.key as keyof typeof stats];
                if (!stat || stat.total === 0) return null;
                const percentage = (stat.correct / stat.total) * 100;
                return (
                    <div key={type.key}>
                        <div className="flex justify-between items-center mb-1">
                            <span className="text-sm font-medium text-slate-700">{type.name}</span>
                            <span className="text-sm font-semibold text-slate-500">{stat.correct} / {stat.total}</span>
                        </div>
                        <div className="w-full bg-slate-200 rounded-full h-2.5">
                            <div className="bg-blue-600 h-2.5 rounded-full" style={{ width: `${percentage}%` }}></div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

const Dashboard: React.FC<DashboardProps> = ({ profile, onStartQuiz, onExport }) => {
    if (!profile || profile.quizHistory.length === 0) {
        return (
            <div className="text-center bg-white p-12 rounded-xl shadow-md border border-slate-200">
                <h2 className="text-2xl font-bold text-slate-800">Welcome to Your Learning Dashboard!</h2>
                <p className="mt-2 text-slate-600">Complete your first quiz to start tracking your progress and get personalized insights.</p>
                <button onClick={onStartQuiz} className="mt-8 bg-blue-600 text-white font-bold py-3 px-8 rounded-lg hover:bg-blue-700 transition duration-300 text-lg">
                    Start Your First Quiz
                </button>
            </div>
        );
    }
    
    // FIX: Safely calculate stats by filtering undefined values and using a type guard
    // to ensure proper typing for the reduce operations, fixing the 'unknown' type errors.
    const validStats = Object.values(profile.performanceStats).filter(
        (stat): stat is { correct: number; total: number } => !!stat
    );
    const totalCorrect = validStats.reduce((sum, stat) => sum + (stat.correct || 0), 0);
    const totalAnswered = validStats.reduce((sum, stat) => sum + (stat.total || 0), 0);
    const overallPercentage = totalAnswered > 0 ? ((totalCorrect / totalAnswered) * 100).toFixed(0) : '0';

    return (
        <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <StatCard title="Overall Accuracy" value={`${overallPercentage}%`} description={`${totalCorrect} of ${totalAnswered} correct`} />
                <StatCard title="Quizzes Taken" value={String(profile.quizHistory.length)} description="Keep up the great work!" />
                <StatCard title="Next Analysis" value={`${3 - (profile.quizHistory.length % 3)} quizzes`} description="AI feedback unlocks every 3 quizzes" />
            </div>

            {profile.analysis && (
                <div className="bg-white p-6 rounded-xl shadow-md border border-slate-200">
                    <h3 className="text-xl font-bold text-slate-800 mb-4">AI Performance Analysis</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <h4 className="font-semibold text-green-700 flex items-center mb-2"><CheckIcon className="w-5 h-5 mr-2"/> Strengths</h4>
                            <ul className="list-disc list-inside space-y-1 text-slate-600">
                                {profile.analysis.strengths.map((s, i) => <li key={i}>{s}</li>)}
                            </ul>
                        </div>
                        <div>
                            <h4 className="font-semibold text-red-700 flex items-center mb-2"><XIcon className="w-5 h-5 mr-2"/> Areas to Improve</h4>
                            <ul className="list-disc list-inside space-y-1 text-slate-600">
                                {profile.analysis.weaknesses.map((w, i) => <li key={i}>{w}</li>)}
                            </ul>
                        </div>
                    </div>
                    <div className="mt-4 border-t pt-4">
                         <h4 className="font-semibold text-blue-700 mb-2">Recommendations</h4>
                         <p className="text-slate-600">{profile.analysis.recommendations}</p>
                    </div>
                </div>
            )}
            
             <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="md:col-span-2 bg-white p-6 rounded-xl shadow-md border border-slate-200">
                     <h3 className="text-xl font-bold text-slate-800 mb-4">Quiz History</h3>
                     <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                        {profile.quizHistory.slice().reverse().map((item, index) => (
                             <div key={index} className="flex justify-between items-center bg-slate-50 p-3 rounded-lg border border-slate-200">
                                 <div>
                                    <p className="font-semibold text-slate-800">{item.sourceName}</p>
                                    <p className="text-sm text-slate-500">
                                        {new Date(item.date).toLocaleDateString()} - {item.difficulty}
                                    </p>
                                 </div>
                                 <div className="text-right">
                                    <p className="font-bold text-slate-800">{item.score.correct} / {item.score.total}</p>
                                    <p className="text-sm text-slate-500">Auto-graded</p>
                                 </div>
                             </div>
                        ))}
                     </div>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-md border border-slate-200">
                    <h3 className="text-xl font-bold text-slate-800 mb-4">Performance by Type</h3>
                    <PerformanceChart stats={profile.performanceStats} />
                </div>
            </div>

             <div className="mt-8 text-center flex flex-col sm:flex-row gap-4 justify-center">
                 <button onClick={onStartQuiz} className="w-full sm:w-auto bg-blue-600 text-white font-bold py-3 px-8 rounded-lg hover:bg-blue-700 transition duration-300 text-lg">
                    Start New Quiz
                </button>
                <button onClick={onExport} className="w-full sm:w-auto bg-slate-200 text-slate-700 font-semibold py-3 px-6 rounded-lg hover:bg-slate-300 transition duration-300 text-lg">
                    Export All Data
                </button>
            </div>

        </div>
    );
};

export default Dashboard;