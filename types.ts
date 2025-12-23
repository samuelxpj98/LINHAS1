
export enum CellStatus {
  UNPLAYED = 'unplayed',
  CORRECT = 'correct',
  WRONG = 'wrong'
}

export interface Player {
  id: number;
  name: string;
  hand: string[];
}

export interface GameState {
  isGameActive: boolean;
  view: 'config' | 'game';
  seconds: number;
  gridSize: number;
  playerCount: number;
  turnTime: number | 'inf';
  gridX: string[];
  gridY: string[];
  cellStatus: Record<string, CellStatus>;
  players: Player[];
  showFinalResult: boolean;
  currentPlayerIndex: number;
}

export interface TheologicalInsight {
  explanation: string;
  verse: string;
}
