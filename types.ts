export interface MultipleChoiceQuestion {
    uid: string;
    question: string;
    options: string[];
    correctAnswer: string;
    topic: string;
}

export interface TrueFalseQuestion {
    uid: string;
    question: string;
    correctAnswer: boolean;
    topic: string;
}

export interface FillInTheBlankQuestion {
    uid:string;
    question: string; // e.g., "The capital of France is ____."
    correctAnswer: string; // e.g., "Paris"
    topic: string;
}

export interface MatchingQuestionPair {
    prompt: string;
    answer: string;
}

export interface MatchingQuestion {
    uid: string;
    title: string; // e.g., "Match the capitals to their countries."
    pairs: MatchingQuestionPair[];
    topic: string;
}

export interface ShortAnswerQuestion {
    uid: string;
    question: string;
    idealAnswer: string;
    topic: string;
}

export interface Quiz {
    multipleChoiceQuestions: MultipleChoiceQuestion[];
    trueFalseQuestions: TrueFalseQuestion[];
    fillInTheBlankQuestions: FillInTheBlankQuestion[];
    matchingQuestions: MatchingQuestion[];
    shortAnswerQuestions: ShortAnswerQuestion[];
}

export interface UserAnswers {
    mcq: string[];
    tf: (boolean | null)[];
    fib: string[];
    matching: { pairs: { prompt: string, answer: string }[] }[];
    sa: string[];
}

export type Difficulty = 'Easy' | 'Medium' | 'Hard';

// New types for user progress tracking

export interface PerformanceAnalysis {
    strengths: string[];
    weaknesses: string[];
    recommendations: string;
}

export type PerformanceStats = {
    [key in 'mcq' | 'tf' | 'fib' | 'matching' | 'sa']?: {
        correct: number;
        total: number;
    }
};

export interface QuizHistoryItem {
    quiz: Quiz;
    userAnswers: UserAnswers; // For multiplayer, this belongs to the first player
    reasonings: Record<string, string>;
    date: string;
    sourceName: string;
    difficulty: Difficulty;
    isTimerMode: boolean;
    
    // For single player
    score?: { correct: number; total: number };
    pointsEarned?: number;

    // New fields for multiplayer
    gameMode?: 'single' | 'multiplayer';
    multiplayerResults?: { 
        name: string; 
        score: { correct: number, total: number}; 
        points: number 
    }[];
}


export interface UserProfile {
    quizHistory: QuizHistoryItem[];
    performanceStats: PerformanceStats;
    analysis: PerformanceAnalysis | null;
    points: number; // Overall points for the profile owner
    longestStreak: number;
}
// FIX: Moved AnyQuestion and PlayerState from App.tsx to centralize types.
export type AnyQuestion = (MultipleChoiceQuestion & { type: 'mcq'; uid: string }) |
    (TrueFalseQuestion & { type: 'tf'; uid: string }) |
    (FillInTheBlankQuestion & { type: 'fib'; uid: string }) |
    (ShortAnswerQuestion & { type: 'sa'; uid: string }) |
    (MatchingQuestion & { type: 'matching'; uid: string });

export interface PlayerState {
    name: string;
    answers: UserAnswers;
    score: { correct: number; total: number };
    points: number;
    streak: number;
    maxSessionStreak: number;
    answer?: any;
    isCorrect?: boolean;
}
