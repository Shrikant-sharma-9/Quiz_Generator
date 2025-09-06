import { GoogleGenAI, Type } from "@google/genai";
import { Quiz, Difficulty, UserProfile, PerformanceAnalysis, QuizHistoryItem, MultipleChoiceQuestion, TrueFalseQuestion, FillInTheBlankQuestion, ShortAnswerQuestion } from '../types';

const API_KEY = process.env.API_KEY;

if (!API_KEY) {
    throw new Error("API_KEY environment variable not set.");
}

const ai = new GoogleGenAI({ apiKey: API_KEY });

const topicProperty = {
    type: Type.STRING,
    description: "A one or two-word topic for this question (e.g., 'Photosynthesis', 'World War II')."
};

export const generateQuestionsFromText = async (text: string, difficulty: Difficulty, history: Quiz[] = [], totalQuestions: number): Promise<Quiz | null> => {

    const schema = {
        type: Type.OBJECT,
        properties: {
            multipleChoiceQuestions: {
                type: Type.ARRAY,
                description: `An array of multiple-choice questions.`,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        question: { type: Type.STRING, description: "The question text." },
                        options: { type: Type.ARRAY, description: "Exactly 4 answer choices.", items: { type: Type.STRING } },
                        correctAnswer: { type: Type.STRING, description: "The correct answer." },
                        topic: topicProperty
                    },
                    required: ["question", "options", "correctAnswer", "topic"]
                }
            },
            trueFalseQuestions: {
                type: Type.ARRAY,
                description: `An array of true/false questions.`,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        question: { type: Type.STRING, description: "The question text." },
                        correctAnswer: { type: Type.BOOLEAN, description: "The correct answer." },
                        topic: topicProperty
                    },
                    required: ["question", "correctAnswer", "topic"]
                }
            },
            fillInTheBlankQuestions: {
                type: Type.ARRAY,
                description: `An array of fill-in-the-blank questions.`,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        question: { type: Type.STRING, description: "Question with '____' placeholder." },
                        correctAnswer: { type: Type.STRING, description: "The phrase that fills the blank." },
                        topic: topicProperty
                    },
                    required: ["question", "correctAnswer", "topic"]
                }
            },
            matchingQuestions: {
                type: Type.ARRAY,
                description: `One set of matching questions.`,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        title: { type: Type.STRING, description: "Title for the matching exercise." },
                        pairs: { type: Type.ARRAY, description: `A reasonable number of pairs for a quiz this size.`, items: {
                            type: Type.OBJECT,
                            properties: {
                                prompt: { type: Type.STRING, description: "Item in the first column." },
                                answer: { type: Type.STRING, description: "Item in the second column." }
                            },
                            required: ["prompt", "answer"]
                        }},
                        topic: topicProperty
                    },
                    required: ["title", "pairs", "topic"]
                }
            },
            shortAnswerQuestions: {
                type: Type.ARRAY,
                description: `An array of short answer questions.`,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        question: { type: Type.STRING, description: "The question text." },
                        idealAnswer: { type: Type.STRING, description: "A model answer." },
                        topic: topicProperty
                    },
                    required: ["question", "idealAnswer", "topic"]
                }
            }
        },
        required: ["multipleChoiceQuestions", "trueFalseQuestions", "fillInTheBlankQuestions", "matchingQuestions", "shortAnswerQuestions"]
    };

    const historyPrompt = history.length > 0
        ? `Additionally, do not generate questions that are conceptually identical to the following questions that have already been asked: ${JSON.stringify(history.flatMap(q => [...q.multipleChoiceQuestions.map(i => i.question), ...q.trueFalseQuestions.map(i => i.question), ...q.fillInTheBlankQuestions.map(i => i.question), ...q.shortAnswerQuestions.map(i => i.question), ...q.matchingQuestions.flatMap(mq => mq.pairs.map(p => p.prompt))]))}`
        : '';

    const prompt = `CRITICAL: Your entire JSON output, including all questions and topics, MUST be in the same language as the 'Text' provided below. Do not translate.

Based on the following text, generate a comprehensive quiz of ${difficulty} difficulty with a total of exactly ${totalQuestions} questions. 
    
Create a good mix of the following types: multiple-choice, true/false, fill-in-the-blank, a single matching set (if appropriate for the total number of questions), and short-answer questions. The total number of generated items across all question arrays should equal ${totalQuestions}. For example, if you generate one matching question set, that counts as 1 toward the total.

For each question, provide a brief, one or two-word topic.

Text:
---
${text.substring(0, 30000)}
---
    
${historyPrompt}

Ensure your output strictly follows the provided JSON schema.`;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                systemInstruction: "You are a multilingual quiz generation assistant. Your task is to analyze the provided text, automatically detect its language, and generate a quiz strictly in that same language. Do not translate any part of the quiz to English or any other language.",
                responseMimeType: 'application/json',
                responseSchema: schema,
                temperature: 0.7,
            },
        });

        const jsonString = response.text;
        const quizData: Quiz = JSON.parse(jsonString);

        // Inject UIDs into each question for tracking
        quizData.multipleChoiceQuestions.forEach((q, i) => (q as any).uid = `mcq-${i}`);
        quizData.trueFalseQuestions.forEach((q, i) => (q as any).uid = `tf-${i}`);
        quizData.fillInTheBlankQuestions.forEach((q, i) => (q as any).uid = `fib-${i}`);
        quizData.matchingQuestions.forEach((q, i) => (q as any).uid = `matching-${i}`);
        quizData.shortAnswerQuestions.forEach((q, i) => (q as any).uid = `sa-${i}`);

        return quizData;

    } catch (error) {
        console.error("Error generating questions:", error);
        throw new Error("Failed to communicate with the AI model.");
    }
};

export const generateReasoningForAnswer = async (sourceText: string, question: any, userAnswer: any): Promise<string> => {
    let correctAnswer: any;
    let questionText = question.question || question.title;

    switch (question.type) {
        case 'mcq':
            correctAnswer = (question as MultipleChoiceQuestion).correctAnswer;
            break;
        case 'tf':
            correctAnswer = (question as TrueFalseQuestion).correctAnswer;
            break;
        case 'fib':
            correctAnswer = (question as FillInTheBlankQuestion).correctAnswer;
            break;
        default: // For 'sa' and 'matching', we just explain the ideal answer
            correctAnswer = (question as ShortAnswerQuestion).idealAnswer || "the provided matches";
    }

    const prompt = `The user is taking a quiz in the language of the "Source Text". Your task is to provide an explanation for a quiz answer.
CRITICAL: Your entire response must be in the same language as the "Source Text" and "Question". Do not translate to English or any other language.

Source Text:
---
${sourceText.substring(0, 28000)}
---

Question: "${questionText}"
The correct answer is: "${correctAnswer}"
The user answered: "${userAnswer}"

Task: Write a concise, 2-3 sentence explanation based on the "Source Text".
- If the user was correct, explain why their answer is correct.
- If the user was incorrect, explain why the correct answer is right and why the user's answer is wrong.`;

     try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                systemInstruction: "You are a multilingual teaching assistant. Your task is to analyze the provided text, question, and answers. You must automatically detect the language of the input and provide your entire explanation strictly in that same language. Do not translate."
            }
        });
        return response.text;
    } catch (error) {
        console.error("Error generating reasoning:", error);
        throw new Error("Failed to generate explanation with the AI model.");
    }
};


export const analyzePerformance = async (history: QuizHistoryItem[]): Promise<PerformanceAnalysis | null> => {
    
    // Sanitize history to only include relevant data for analysis
    const sanitizedHistory = history.map(item => ({
        difficulty: item.difficulty,
        score: item.score,
        questions: [
            ...item.quiz.multipleChoiceQuestions.map((q, i) => ({ q: q.question, topic: q.topic, userA: item.userAnswers.mcq[i], correctA: q.correctAnswer })),
            ...item.quiz.trueFalseQuestions.map((q, i) => ({ q: q.question, topic: q.topic, userA: item.userAnswers.tf[i], correctA: q.correctAnswer })),
            ...item.quiz.fillInTheBlankQuestions.map((q, i) => ({ q: q.question, topic: q.topic, userA: item.userAnswers.fib[i], correctA: q.correctAnswer })),
        ]
    }));

    const schema = {
        type: Type.OBJECT,
        properties: {
            strengths: {
                type: Type.ARRAY,
                description: "An array of 2-3 topics or concepts the user consistently answers correctly.",
                items: { type: Type.STRING }
            },
            weaknesses: {
                type: Type.ARRAY,
                description: "An array of 2-3 topics or concepts the user struggles with, based on incorrect answers.",
                items: { type: Type.STRING }
            },
            recommendations: {
                type: Type.STRING,
                description: "A concise, encouraging paragraph suggesting what the user should focus on next. Be specific based on the weaknesses."
            }
        },
        required: ["strengths", "weaknesses", "recommendations"]
    };

    const prompt = `CRITICAL: Your entire analysis (strengths, weaknesses, recommendations) MUST be in the same language as the questions and topics in the provided history. Do not translate.

Analyze the following user's quiz performance history. The user's answers are in 'userA' and correct answers are in 'correctA'. Identify their strengths and weaknesses based on the question topics they got right or wrong. 

History:
---
${JSON.stringify(sanitizedHistory)}
---

Provide an analysis that strictly follows the provided JSON schema.`;

    try {
         const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                systemInstruction: "You are a multilingual performance analyst AI. Your task is to analyze the user's quiz history, detect the language of the questions and topics, and provide your entire analysis (strengths, weaknesses, recommendations) strictly in that same language. Do not translate.",
                responseMimeType: 'application/json',
                responseSchema: schema,
                temperature: 0.5,
            },
        });
        const jsonString = response.text;
        return JSON.parse(jsonString);

    } catch (error) {
         console.error("Error analyzing performance:", error);
        throw new Error("Failed to analyze performance with the AI model.");
    }
};