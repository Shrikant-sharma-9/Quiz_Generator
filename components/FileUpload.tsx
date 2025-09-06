import React, { useState, useCallback, useRef } from 'react';
import { UploadIcon } from './icons/UploadIcon';
import { FileIcon } from './icons/FileIcon';
import { DocumentTextIcon } from './icons/DocumentTextIcon';
import { Difficulty } from '../types';
import { UsersIcon } from './icons/UsersIcon'; // Assuming you have a UsersIcon
import { UserIcon } from './icons/UserIcon'; // Assuming you have a UserIcon

declare const pdfjsLib: any;

type GameMode = 'single' | 'multiplayer';

interface FileUploadProps {
    onGenerateQuiz: (text: string, fileName: string, difficulty: Difficulty, timerMode: boolean, playerNames: string[], numQuestions: number) => void;
    onCancel: () => void;
}

type InputMethod = 'pdf' | 'text';

const FileUpload: React.FC<FileUploadProps> = ({ onGenerateQuiz, onCancel }) => {
    const [isDragging, setIsDragging] = useState(false);
    const [difficulty, setDifficulty] = useState<Difficulty>('Medium');
    const [inputMethod, setInputMethod] = useState<InputMethod>('pdf');
    const [pastedText, setPastedText] = useState('');
    const [timerMode, setTimerMode] = useState(false);
    const [gameMode, setGameMode] = useState<GameMode>('single');
    const [playerNames, setPlayerNames] = useState(['Player 1', 'Player 2']);
    const [numQuestions, setNumQuestions] = useState(10);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handlePlayerNameChange = (index: number, name: string) => {
        const newNames = [...playerNames];
        newNames[index] = name;
        setPlayerNames(newNames);
    };

    const handleGenerate = (text: string, fileName: string) => {
        const finalPlayerNames = gameMode === 'multiplayer' ? playerNames : [];
        onGenerateQuiz(text, fileName, difficulty, timerMode, finalPlayerNames, numQuestions);
    };

    const extractText = useCallback(async (file: File) => {
        const reader = new FileReader();
        reader.onload = async (event) => {
            try {
                if (!event.target?.result) {
                    throw new Error("Failed to read file.");
                }

                pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;

                const pdf = await pdfjsLib.getDocument({ data: event.target.result }).promise;
                const numPages = pdf.numPages;
                let fullText = '';
                
                for (let i = 1; i <= numPages; i++) {
                    const page = await pdf.getPage(i);
                    const textContent = await page.getTextContent();
                    const pageText = textContent.items.map((item: any) => item.str).join(' ');
                    fullText += pageText + '\n\n';
                }
                handleGenerate(fullText, file.name);

            } catch (error) {
                console.error("Error processing PDF:", error);
                // Trigger error state in parent
            }
        };
        reader.readAsArrayBuffer(file);
    }, [onGenerateQuiz, difficulty, timerMode, gameMode, playerNames, numQuestions]);

    const handleTextSubmit = () => {
        if (!pastedText.trim()) {
            return;
        }
        handleGenerate(pastedText, 'Pasted Text');
    };

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files;
        if (files && files[0]) {
            extractText(files[0]);
        }
    };
    
    const handleDrop = useCallback((event: React.DragEvent<HTMLDivElement>) => {
        event.preventDefault();
        event.stopPropagation();
        setIsDragging(false);
        const files = event.dataTransfer.files;
        if (files && files[0] && files[0].type === 'application/pdf') {
            extractText(files[0]);
        }
    }, [extractText]);

    const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
        event.preventDefault();
        event.stopPropagation();
    };

    const handleDragEnter = (event: React.DragEvent<HTMLDivElement>) => {
        event.preventDefault();
        event.stopPropagation();
        setIsDragging(true);
    };

    const handleDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
        event.preventDefault();
        event.stopPropagation();
        setIsDragging(false);
    };

    const handleClick = () => {
        fileInputRef.current?.click();
    };
    
    const difficultyOptions: { id: Difficulty, label: string, description: string }[] = [
        { id: 'Easy', label: 'Easy', description: 'Fewer, simpler questions' },
        { id: 'Medium', label: 'Medium', description: 'A balanced quiz' },
        { id: 'Hard', label: 'Hard', description: 'More, challenging questions' },
    ];
    
    const inputMethodTabs: { id: InputMethod, label: string, icon: React.FC<React.SVGProps<SVGSVGElement>> }[] = [
        { id: 'pdf', label: 'Upload PDF', icon: FileIcon },
        { id: 'text', label: 'Paste Text', icon: DocumentTextIcon },
    ];

    const isMultiplayerReady = playerNames.every(name => name.trim() !== '');

    return (
        <div className="bg-white p-8 rounded-xl shadow-md border border-slate-200 space-y-8">
            <div className="flex justify-between items-start">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800">Create a New Quiz</h2>
                    <p className="text-slate-500 mt-1">Select your options and provide content to start.</p>
                </div>
                 <button onClick={onCancel} className="text-sm bg-slate-100 text-slate-600 font-semibold py-2 px-4 rounded-lg hover:bg-slate-200 transition duration-300">
                    Cancel
                 </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-6">
                    <div>
                        <h3 className="font-bold text-lg mb-4 text-slate-800">1. Select Game Mode</h3>
                        <div className="flex bg-slate-100 p-1 rounded-lg">
                            <button onClick={() => setGameMode('single')} className={`flex-1 flex justify-center items-center gap-2 p-2 rounded-md text-sm font-semibold transition-colors ${gameMode === 'single' ? 'bg-white shadow' : 'text-slate-600 hover:bg-slate-200'}`}><UserIcon className="w-5 h-5" /> Single Player</button>
                            <button onClick={() => setGameMode('multiplayer')} className={`flex-1 flex justify-center items-center gap-2 p-2 rounded-md text-sm font-semibold transition-colors ${gameMode === 'multiplayer' ? 'bg-white shadow' : 'text-slate-600 hover:bg-slate-200'}`}><UsersIcon className="w-5 h-5" /> Multiplayer</button>
                        </div>
                    </div>
                    {gameMode === 'multiplayer' && (
                        <div>
                             <h3 className="font-bold text-lg mb-4 text-slate-800">Enter Player Names</h3>
                             <div className="space-y-3">
                                <input type="text" value={playerNames[0]} onChange={(e) => handlePlayerNameChange(0, e.target.value)} placeholder="Player 1 Name" className="w-full p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500" />
                                <input type="text" value={playerNames[1]} onChange={(e) => handlePlayerNameChange(1, e.target.value)} placeholder="Player 2 Name" className="w-full p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500" />
                             </div>
                        </div>
                    )}
                </div>
                 <div className="space-y-6">
                    <div>
                        <h3 className="font-bold text-lg mb-4 text-slate-800">2. Select Difficulty</h3>
                        <div className="grid grid-cols-1 gap-2">
                            {difficultyOptions.map((option) => (
                                <button
                                    key={option.id}
                                    onClick={() => setDifficulty(option.id)}
                                    className={`p-3 rounded-lg border text-left transition-all duration-200 ${
                                        difficulty === option.id
                                            ? 'bg-blue-50 border-blue-500 ring-1 ring-blue-500'
                                            : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                                    }`}
                                >
                                    <p className="font-semibold text-slate-900 text-sm">{option.label}</p>
                                    <p className="text-xs text-slate-500">{option.description}</p>
                                </button>
                            ))}
                        </div>
                    </div>
                     <div>
                        <h3 className="font-bold text-lg mb-2 text-slate-800">3. Number of Questions</h3>
                        <div className="flex items-center gap-4 bg-slate-50 p-3 rounded-lg border border-slate-200">
                            <input
                                type="range"
                                min="5"
                                max="25"
                                value={numQuestions}
                                onChange={(e) => setNumQuestions(Number(e.target.value))}
                                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                                aria-label="Number of questions"
                            />
                            <span className="font-bold text-slate-800 bg-white px-3 py-1 rounded-md border border-slate-300 min-w-[40px] text-center">{numQuestions}</span>
                        </div>
                    </div>
                    <div>
                        <h3 className="font-bold text-lg mb-4 text-slate-800">4. Select Mode</h3>
                        <div className="flex items-center justify-between bg-slate-50 p-3 rounded-lg border border-slate-200">
                            <div>
                                <p className="font-semibold text-slate-900 text-sm">Timer Mode</p>
                                <p className="text-xs text-slate-500">Challenge yourself against the clock!</p>
                            </div>
                            <button
                                onClick={() => setTimerMode(!timerMode)}
                                className={`relative inline-flex items-center h-6 rounded-full w-11 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
                                    timerMode ? 'bg-blue-600' : 'bg-slate-300'
                                }`}
                                role="switch"
                                aria-checked={timerMode}
                            >
                                <span
                                    className={`inline-block w-4 h-4 transform bg-white rounded-full transition-transform ${
                                        timerMode ? 'translate-x-6' : 'translate-x-1'
                                    }`}
                                />
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <div>
                <h3 className="font-bold text-lg mb-4 text-slate-800">5. Provide Content</h3>
                 <div className="border-b border-slate-200">
                    <div className="flex -mb-px">
                        {inputMethodTabs.map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setInputMethod(tab.id)}
                                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-blue-500 rounded-t-md ${
                                    inputMethod === tab.id
                                        ? 'border-b-2 border-blue-600 text-blue-600'
                                        : 'text-slate-500 hover:text-slate-800 border-b-2 border-transparent'
                                }`}
                            >
                                <tab.icon className="w-5 h-5" />
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>
                <div className="pt-6">
                    {inputMethod === 'pdf' && (
                        <div
                            onClick={handleClick}
                            onDrop={handleDrop}
                            onDragOver={handleDragOver}
                            onDragEnter={handleDragEnter}
                            onDragLeave={handleDragLeave}
                            className={`flex flex-col items-center justify-center p-10 border-2 border-dashed rounded-lg cursor-pointer transition-colors duration-300
                            ${isDragging ? 'border-blue-500 bg-blue-50' : 'border-slate-300 hover:border-blue-400 hover:bg-slate-50'}`}
                        >
                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={handleFileChange}
                                accept=".pdf"
                                className="hidden"
                            />
                             <UploadIcon className="w-12 h-12 text-slate-400 mb-4" />
                            <p className="text-lg font-semibold text-slate-700">
                                Drag & drop your PDF here
                            </p>
                            <p className="text-slate-500">or click to browse files</p>
                        </div>
                    )}
                     {inputMethod === 'text' && (
                        <div>
                            <textarea
                                value={pastedText}
                                onChange={(e) => setPastedText(e.target.value)}
                                rows={8}
                                className="w-full p-4 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition shadow-sm"
                                placeholder="Paste your chapter text, article, or notes here..."
                            ></textarea>
                            <div className="flex justify-end mt-4">
                                <button
                                    onClick={handleTextSubmit}
                                    disabled={!pastedText.trim() || (gameMode === 'multiplayer' && !isMultiplayerReady)}
                                    className="bg-blue-600 text-white font-bold py-2 px-6 rounded-lg hover:bg-blue-700 transition duration-300 disabled:bg-slate-400 disabled:cursor-not-allowed"
                                >
                                    Generate Quiz
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default FileUpload;