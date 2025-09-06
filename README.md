# QuizSpark ✨

QuizSpark is an intelligent study application that transforms your documents and text into interactive quizzes using the power of Google's Gemini AI. Upload a PDF or paste your notes, and get a custom quiz with diverse question types, scoring, and AI-powered feedback.

**Your personal AI-powered study partner.**

![QuizSpark Dashboard](https://i.imgur.com/example.png) <!-- Placeholder image -->

---

## 🚀 Key Features

*   **AI-Powered Quiz Generation**: Leverages the Google Gemini API to create high-quality questions from any text content.
*   **Multiple Content Sources**: Supports both PDF file uploads and direct text pasting.
*   **Diverse Question Types**: Generates a rich mix of questions including Multiple Choice, True/False, Fill-in-the-Blank, Matching, and Short Answer.
*   **Customizable Quizzes**: Tailor your quiz by selecting the difficulty level (Easy, Medium, Hard) and the total number of questions.
*   **Single & Multiplayer Modes**:
    *   **Single Player**: Track your progress, earn points, and get detailed performance analysis.
    *   **Multiplayer**: Compete locally with a friend in a fun "hot seat" style game.
*   **Interactive Quiz Experience**: A clean, responsive, and engaging UI for taking quizzes, complete with an optional timer mode for an extra challenge.
*   **Intelligent Scoring**: Tracks points, calculates accuracy, and rewards you for building correct answer streaks.
*   **AI-Powered Feedback**: After completing a quiz, receive detailed, AI-generated explanations in English for each question to help you learn and improve.
*   **Personalized Dashboard**: A central hub to view your overall stats, quiz history, and an AI-driven analysis of your performance, highlighting your strengths and areas for improvement.
*   **Data Portability**: Export your entire quiz history and performance data to a JSON file at any time.
*   **Serverless Architecture**: Runs entirely in the browser, making it easy to deploy and use without any backend infrastructure.

---

## 🛠️ Tech Stack

*   **Frontend**: [React](https://reactjs.org/), [TypeScript](https://www.typescriptlang.org/), [Tailwind CSS](https://tailwindcss.com/)
*   **AI Model**: [Google Gemini API](https://ai.google.dev/) (`@google/genai`)
*   **PDF Processing**: [PDF.js](https://mozilla.github.io/pdf.js/)
*   **Local Storage**: Browser `localStorage` for persisting user profiles and quiz history.
*   **State Management**: React Hooks (`useState`, `useEffect`, `useCallback`)

---

## ⚙️ How It Works

1.  **Content Input**: The user uploads a PDF file or pastes text directly into the application.
2.  **Text Extraction**: For PDFs, the client-side `PDF.js` library extracts the complete text content.
3.  **Prompt Engineering**: A detailed prompt is constructed containing the extracted text, user-selected options (difficulty, number of questions), and a structured `responseSchema`. This schema instructs the Gemini model to return the quiz in a predictable JSON format.
4.  **AI Generation**: The prompt is sent to the Gemini API. The model analyzes the text and generates the quiz according to the requested specifications.
5.  **Interactive Quiz**: The application parses the returned JSON and dynamically renders the interactive quiz view.
6.  **State Management**: As the user answers questions, their selections are stored in the React component's state.
7.  **Scoring & Persistence**: Upon completion, the app calculates the score, updates the user's profile, and saves the entire session to the browser's `localStorage`.
8.  **AI Feedback Loop**: In single-player mode, the app makes subsequent calls to the Gemini API, sending each question, the user's answer, and the correct answer to generate a helpful explanation.
9.  **Dashboard Analytics**: The dashboard reads all historical data from `localStorage` to provide visualizations and, after every three quizzes, sends a summary to the AI to generate a high-level performance analysis.

---

## 🔧 Running Locally

To run this project on your local machine, follow these steps:

**1. Prerequisites**
*   A modern web browser.
*   A local web server to serve the files. The [Live Server](https://marketplace.visualstudio.com/items?itemName=ritwickdey.LiveServer) extension for VS Code is a great option.

**2. Get a Gemini API Key**
1.  Go to [Google AI Studio](https://aistudio.google.com/).
2.  Click on "**Get API key**" and create a new key.
3.  **Important**: This project is configured to use an environment variable for the API key. Since it's a client-side project, you would typically use a build tool like Vite or Create React App to manage this. For this project's setup, you may need to hardcode it for local testing (not recommended for production).

**3. Setup**
1.  Clone the repository:
    ```bash
    git clone https://github.com/your-username/quizspark.git
    ```
2.  Navigate to the project directory:
    ```bash
    cd quizspark
    ```
3.  If you were using a build tool, you would create a `.env` file and add your API key:
    ```
    API_KEY=YOUR_GEMINI_API_KEY_HERE
    ```
4.  Since this project runs directly in the browser without a build step, you might need to replace `process.env.API_KEY` in `services/geminiService.ts` with your actual key for it to work.

**4. Launch**
*   Open the `index.html` file using your local web server (e.g., by clicking "Go Live" in VS Code with the Live Server extension).

---

## 📂 Project Structure

```
.
├── components/
│   ├── icons/                # SVG icon components
│   ├── Dashboard.tsx         # User progress and history view
│   ├── FileUpload.tsx        # Handles PDF/text input and quiz settings
│   ├── MatchingQuestionCard.tsx # Renders matching questions
│   ├── QuestionCard.tsx      # Renders MCQ, T/F, FIB, SA questions
│   ├── QuestionList.tsx      # Main quiz-taking interface controller
│   └── QuizReview.tsx        # Final summary and answer review screen
├── services/
│   ├── geminiService.ts      # All logic for interacting with the Gemini API
│   └── storageService.ts     # Handles saving/loading data from localStorage
├── App.tsx                   # Root component, manages global state and app flow
├── index.html                # Main HTML entry point
├── index.tsx                 # Mounts the React application
├── README.md                 # This file
└── types.ts                  # Centralized TypeScript type definitions
```
