'use client'
import { useState, useEffect, useRef, useCallback } from 'react';
import Head from 'next/head';
import { Player, GameState, MessageType } from '@/hook/game';

// Custom hook for the timer
const useTimer = (initialTime: number, onTimeUp: () => void) => {
    const [timeLeft, setTimeLeft] = useState<number>(initialTime);
    const timerRef = useRef<NodeJS.Timeout | null>(null);

    const startTimer = useCallback(() => {
        if (timerRef.current) clearInterval(timerRef.current);

        setTimeLeft(initialTime);
        timerRef.current = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 1) {
                    if (timerRef.current) clearInterval(timerRef.current);
                    onTimeUp();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
    }, [initialTime, onTimeUp]);

    const stopTimer = useCallback(() => {
        if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
        }
    }, []);

    const resetTimer = useCallback(() => {
        stopTimer();
        setTimeLeft(initialTime);
    }, [initialTime, stopTimer]);

    useEffect(() => {
        return () => stopTimer();
    }, [stopTimer]);

    return { timeLeft, startTimer, stopTimer, resetTimer };
};

// Main game component
export default function ShiritoriGame() {
    const [players, setPlayers] = useState<Player[]>([
        { id: 1, name: 'Player 1', score: 0 },
        { id: 2, name: 'Player 2', score: 0 }
    ]);
    const [currentPlayerIndex, setCurrentPlayerIndex] = useState<number>(0);
    const [wordHistory, setWordHistory] = useState<string[]>([]);
    const [currentWord, setCurrentWord] = useState<string>('');
    const [lastLetter, setLastLetter] = useState<string>('');
    const [message, setMessage] = useState<string>('Press Start Game to begin!');
    const [messageType, setMessageType] = useState<MessageType>('info');
    const [gameStarted, setGameStarted] = useState<boolean>(false);
    const [gameOver, setGameOver] = useState<boolean>(false);
    const [isValidating, setIsValidating] = useState<boolean>(false);

    const currentPlayer: Player = players[currentPlayerIndex];

    // Timer setup
    const handleTimeUp = useCallback(() => {
        handleInvalidWord('Time is up!');
    }, []);

    const { timeLeft, startTimer, stopTimer, resetTimer } = useTimer(30, handleTimeUp);

    // Validate word using dictionary API
    const validateWord = useCallback(async (word: string): Promise<boolean> => {
        try {
            const response = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${word}`);
            return response.ok;
        } catch (error) {
            console.error('Validation error:', error);
            return false;
        }
    }, []);

    // Handle invalid word submission
    const handleInvalidWord = useCallback((errorMessage: string) => {
        setPlayers(prev => prev.map((player, index) =>
            index === currentPlayerIndex
                ? { ...player, score: Math.max(-5, player.score - 1) }
                : player
        ));

        stopTimer();
        setMessage(errorMessage);
        setMessageType('error');

        // Check if game is over (score <= -3)
        const updatedScore = players[currentPlayerIndex].score - 1;
        if (updatedScore <= -3) {
            setGameOver(true);
        } else {
            // Switch to next player after a short delay
            setTimeout(() => {
                switchPlayer();
                startTimer();
            }, 1000);
        }
    }, [currentPlayerIndex, players, startTimer, stopTimer]);

    // Switch to next player
    const switchPlayer = useCallback(() => {
        setCurrentPlayerIndex(prev => (prev + 1) % players.length);
        resetTimer();
        setMessage(`Turn: ${players[(currentPlayerIndex + 1) % players.length].name}. Word must start with "${lastLetter.toUpperCase()}"`);
        setMessageType('info');
    }, [currentPlayerIndex, players, lastLetter, resetTimer]);

    // Handle word submission
    const handleSubmit = useCallback(async (e: React.FormEvent) => {
        e.preventDefault();

        const word = currentWord.trim().toLowerCase();

        if (!gameStarted || gameOver) return;

        // Basic validation
        if (word.length < 4) {
            setMessage('Word must be at least 4 letters long!');
            setMessageType('error');
            return;
        }

        if (wordHistory.includes(word)) {
            handleInvalidWord('Word has already been used!');
            return;
        }

        if (lastLetter && word[0] !== lastLetter) {
            handleInvalidWord(`Word must start with "${lastLetter.toUpperCase()}"!`);
            return;
        }

        // Dictionary validation
        setIsValidating(true);
        const isValid = await validateWord(word);
        setIsValidating(false);

        if (!isValid) {
            handleInvalidWord('Not a valid English word!');
            return;
        }

        // Valid word handling
        const newLastLetter = word[word.length - 1] === 'x' || word[word.length - 1] === 'z' ?
            word[word.length - 2] : word[word.length - 1];

        setPlayers(prev => prev.map((player, index) =>
            index === currentPlayerIndex
                ? { ...player, score: player.score + 1 }
                : player
        ));

        setWordHistory(prev => [...prev, word]);
        setLastLetter(newLastLetter);
        setCurrentWord('');
        setMessage(`Good job! Next word must start with "${newLastLetter.toUpperCase()}"`);
        setMessageType('success');

        // Switch to next player after a short delay
        setTimeout(() => {
            switchPlayer();
        }, 1500);
    }, [currentWord, gameStarted, gameOver, wordHistory, lastLetter, validateWord, currentPlayerIndex, handleInvalidWord, switchPlayer]);

    // Start a new game
    const startGame = useCallback(() => {
        setPlayers([
            { id: 1, name: 'Player 1', score: 0 },
            { id: 2, name: 'Player 2', score: 0 }
        ]);
        setCurrentPlayerIndex(0);
        setWordHistory([]);
        setCurrentWord('');
        setLastLetter('');
        setMessage('Game started! Player 1, enter any word (min 4 letters)');
        setMessageType('info');
        setGameStarted(true);
        setGameOver(false);
        resetTimer();
        startTimer();
    }, [resetTimer, startTimer]);

    // Reset the game
    const resetGame = useCallback(() => {
        stopTimer();
        setPlayers([
            { id: 1, name: 'Player 1', score: 0 },
            { id: 2, name: 'Player 2', score: 0 }
        ]);
        setCurrentPlayerIndex(0);
        setWordHistory([]);
        setCurrentWord('');
        setLastLetter('');
        setMessage('Press Start Game to begin!');
        setMessageType('info');
        setGameStarted(false);
        setGameOver(false);
        resetTimer();
    }, [resetTimer, stopTimer]);

    // Keyboard shortcut for form submission
    useEffect(() => {
        const handleKeyPress = (e: KeyboardEvent) => {
            if (e.key === 'Enter' && gameStarted && !gameOver) {
                const submitButton = document.getElementById('submit-button');
                if (submitButton) {
                    submitButton.click();
                }
            }
        };

        window.addEventListener('keypress', handleKeyPress);
        return () => window.removeEventListener('keypress', handleKeyPress);
    }, [gameStarted, gameOver]);

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-500 to-purple-600 flex flex-col items-center justify-center p-4">
            <Head>
                <title>Shiritori Game</title>
                <meta name="description" content="A Japanese word game where players take turns entering words" />
                <link rel="icon" href="/favicon.ico" />
            </Head>

            <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md">
                <h1 className="text-3xl font-bold text-center text-gray-800 mb-2">Shiritori Game</h1>
                <p className="text-center text-gray-600 mb-6">Each word must start with the last letter of the previous word</p>

                {/* Game status */}
                <div className="flex justify-between mb-6">
                    {players.map((player, index) => (
                        <div
                            key={player.id}
                            className={`flex flex-col items-center p-3 rounded-lg transition-all duration-300 ${index === currentPlayerIndex ? 'bg-blue-100 border-2 border-blue-500 scale-105' : 'bg-gray-100'
                                }`}
                        >
                            <span className="font-semibold">{player.name}</span>
                            <span className={`text-2xl font-bold ${player.score > 0 ? 'text-green-600' : player.score < 0 ? 'text-red-600' : 'text-gray-800'
                                }`}>
                                {player.score}
                            </span>
                        </div>
                    ))}
                </div>

                {/* Timer */}
                <div className="mb-6">
                    <div className="flex justify-between items-center">
                        <span className="font-medium">Time left:</span>
                        <span className={`text-xl font-bold ${timeLeft <= 10 ? 'text-red-600' : 'text-gray-800'}`}>
                            {timeLeft}s
                        </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2.5 mt-2">
                        <div
                            className={`h-2.5 rounded-full transition-all duration-1000 ${timeLeft <= 10 ? 'bg-red-600' : 'bg-blue-600'
                                }`}
                            style={{ width: `${(timeLeft / 30) * 100}%` }}
                        ></div>
                    </div>
                </div>

                {/* Game message */}
                {message && (
                    <div className={`p-3 rounded-lg mb-6 text-center transition-all duration-300 ${messageType === 'error' ? 'bg-red-100 text-red-800' :
                        messageType === 'success' ? 'bg-green-100 text-green-800' :
                            'bg-blue-100 text-blue-800'
                        }`}>
                        {message}
                    </div>
                )}

                {/* Word input */}
                <form onSubmit={handleSubmit} className="mb-6">
                    <div className="flex">
                        <input
                            type="text"
                            value={currentWord}
                            onChange={(e) => setCurrentWord(e.target.value)}
                            placeholder="Enter a word..."
                            className="flex-grow px-4 py-2 border border-gray-300 rounded-l-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                            disabled={!gameStarted || gameOver || isValidating}
                            autoFocus
                        />
                        <button
                            id="submit-button"
                            type="submit"
                            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-r-lg font-medium disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                            disabled={!gameStarted || gameOver || isValidating}
                        >
                            {isValidating ? 'Checking...' : 'Submit'}
                        </button>
                    </div>
                    {lastLetter && (
                        <p className="text-sm text-gray-600 mt-2">
                            Must start with: <span className="font-bold text-blue-600">{lastLetter.toUpperCase()}</span>
                        </p>
                    )}
                </form>

                {/* Game controls */}
                <div className="flex justify-center space-x-4 mb-6">
                    {!gameStarted ? (
                        <button
                            onClick={startGame}
                            className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                        >
                            Start Game
                        </button>
                    ) : (
                        <button
                            onClick={resetGame}
                            className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                        >
                            Reset Game
                        </button>
                    )}
                </div>

                {/* Word history */}
                <div className="bg-gray-100 p-4 rounded-lg">
                    <h2 className="text-lg font-semibold text-gray-800 mb-2">Word History ({wordHistory.length})</h2>
                    {wordHistory.length > 0 ? (
                        <div className="max-h-40 overflow-y-auto">
                            <ul className="space-y-1">
                                {wordHistory.map((word, index) => (
                                    <li key={index} className="bg-white p-2 rounded-md shadow-sm flex">
                                        <span className="text-gray-500 w-6">{index + 1}.</span>
                                        <span className="font-medium">{word}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ) : (
                        <p className="text-gray-500 text-center py-2">No words yet...</p>
                    )}
                </div>

                {/* Game rules */}
                <details className="mt-6">
                    <summary className="cursor-pointer font-medium text-gray-700">Game Rules</summary>
                    <ul className="mt-2 text-sm text-gray-600 list-disc pl-5 space-y-1">
                        <li>Players take turns entering words</li>
                        <li>Each new word must begin with the last letter of the previous word</li>
                        <li>Words must be at least 4 letters long</li>
                        <li>Words cannot be repeated</li>
                        <li>Words must be valid English words</li>
                        <li>+1 point for a valid word, -1 point for an invalid word</li>
                        <li>Game ends when a player reaches -3 points</li>
                    </ul>
                </details>
            </div>

            {/* Game over modal */}
            {gameOver && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-10">
                    <div className="bg-white rounded-xl p-6 max-w-md w-full text-center">
                        <h2 className="text-2xl font-bold text-red-600 mb-4">Game Over!</h2>
                        <p className="text-lg text-gray-800 mb-2">
                            {players[0].score > players[1].score ? players[0].name :
                                players[1].score > players[0].score ? players[1].name :
                                    'It\'s a tie!'} wins!
                        </p>
                        <div className="my-4">
                            <p className="font-medium">Final Scores:</p>
                            {players.map(player => (
                                <p key={player.id} className="text-lg">
                                    {player.name}: <span className={player.score > 0 ? 'text-green-600' : 'text-red-600'}>{player.score}</span>
                                </p>
                            ))}
                        </div>
                        <button
                            onClick={resetGame}
                            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg font-medium mt-4 transition-colors"
                        >
                            Play Again
                        </button>
                    </div>
                </div>
            )}

            <footer className="mt-8 text-white text-center">
                <p>Shiritori - A Japanese word game</p>
            </footer>
        </div>
    );
}
