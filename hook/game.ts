export interface Player {
  id: number;
  name: string;
  score: number;
}

export type MessageType = 'info' | 'error' | 'success';

export interface GameState {
  players: Player[];
  currentPlayerIndex: number;
  wordHistory: string[];
  currentWord: string;
  lastLetter: string;
  message: string;
  messageType: MessageType;
  timeLeft: number;
  gameStarted: boolean;
  gameOver: boolean;
}
