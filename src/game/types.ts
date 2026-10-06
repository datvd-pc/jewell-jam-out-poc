export type Direction = 'up' | 'down' | 'left' | 'right';

export type GemShape = 'pear' | 'heart' | 'rectangle' | 'oval';

export type GemColor = 'sapphire' | 'emerald' | 'ruby' | 'citrine';

export interface Cell {
  x: number;
  y: number;
}

export type PieceState =
  | 'IDLE'
  | 'SELECTED'
  | 'BLOCKED_FEEDBACK'
  | 'EXITING'
  | 'ROUTING_TO_PORTAL'
  | 'COLLECTED';

export interface Piece {
  id: string;
  exitDirection: Direction;
  path: Cell[]; // path[0] is head cell, path[path.length - 1] is tail cell
  gemShape: GemShape;
  gemColor: GemColor;
}

export interface GrayDot {
  x: number;
  y: number;
}

export interface HandbagContour {
  // Normalized points (0..1) relative to board bounding box
  points: { x: number; y: number }[];
  handlePoints: { x: number; y: number }[];
}

export interface LevelData {
  id: number;
  name: string;
  gridWidth: number;
  gridHeight: number;
  pieces: Piece[];
  grayDots?: GrayDot[];
  portalPosition: { x: number; y: number }; // normalized relative to board area
  contour: HandbagContour;
  ftueHint?: string;
}

export interface SimulationResult {
  isFree: boolean;
  exitSteps: number;
  collisionCell?: Cell;
  blockedByPieceId?: string;
  fullPathHistory?: Cell[][]; // History of piece's cells at each step of exit
}

export interface ActiveRemoval {
  pieceId: string;
  piece: Piece;
  startPath: Cell[];
  exitDirection: Direction;
  // Step-based snake path: list of cell positions the head traversed
  headTraversedPath: Cell[]; 
  totalLengthCells: number; // piece.path.length
  
  // Animation state
  phase: 'EXITING' | 'ROUTING_TO_PORTAL';
  elapsedTime: number; // seconds
  exitDuration: number;
  portalDuration: number;
  
  // Exit point in canvas coordinates where piece cleared board
  exitScreenPos?: { x: number; y: number };
  portalStartScreenPos?: { x: number; y: number };
}

export interface GameSettings {
  soundEnabled: boolean;
  hapticsEnabled: boolean;
  reducedMotion: boolean;
}

export type GameState = 'PLAYING' | 'SETTINGS_OPEN' | 'REVEALING' | 'COMPLETE';
