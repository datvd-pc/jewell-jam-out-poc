import { Cell, Direction, LevelData, Piece, SimulationResult } from './types';

export const DIR_DELTAS: Record<Direction, { dx: number; dy: number }> = {
  up: { dx: 0, dy: -1 },
  down: { dx: 0, dy: 1 },
  left: { dx: -1, dy: 0 },
  right: { dx: 1, dy: 0 },
};

/**
 * Checks if two cells are identical.
 */
export function areCellsEqual(a: Cell, b: Cell): boolean {
  return a.x === b.x && a.y === b.y;
}

/**
 * Checks if a cell is inside the board boundaries.
 */
export function isCellInsideBoard(cell: Cell, width: number, height: number): boolean {
  return cell.x >= 0 && cell.x < width && cell.y >= 0 && cell.y < height;
}

/**
 * Simulates pulling a piece out along its exitDirection according to snake rules.
 * Does NOT mutate any input pieces.
 */
export function simulateRemoval(
  pieceToTest: Piece,
  allPieces: Piece[],
  gridWidth: number,
  gridHeight: number
): SimulationResult {
  const dir = DIR_DELTAS[pieceToTest.exitDirection];
  
  // Clone active piece's path
  let currentPath: Cell[] = pieceToTest.path.map((c) => ({ ...c }));
  const initialLength = currentPath.length;
  
  // Build lookup of other pieces' occupied cells: key "x,y" => pieceId
  const otherPiecesOccupancy = new Map<string, string>();
  for (const other of allPieces) {
    if (other.id === pieceToTest.id) continue;
    for (const cell of other.path) {
      otherPiecesOccupancy.set(`${cell.x},${cell.y}`, other.id);
    }
  }

  const pathHistory: Cell[][] = [currentPath.map((c) => ({ ...c }))];
  let step = 0;
  // Maximum safety steps: enough to pull any snake completely off-screen
  const maxSteps = Math.max(gridWidth, gridHeight) * 2 + initialLength + 5;

  while (step < maxSteps) {
    step++;
    const currentHead = currentPath[0];
    const nextHead: Cell = {
      x: currentHead.x + dir.dx,
      y: currentHead.y + dir.dy,
    };

    // 1. Collision check with OTHER pieces (only relevant if nextHead is on-board)
    if (isCellInsideBoard(nextHead, gridWidth, gridHeight)) {
      const obstaclePieceId = otherPiecesOccupancy.get(`${nextHead.x},${nextHead.y}`);
      if (obstaclePieceId) {
        return {
          isFree: false,
          exitSteps: step,
          collisionCell: nextHead,
          blockedByPieceId: obstaclePieceId,
        };
      }
    }

    // 2. Self-collision check with current piece's body:
    // Snake advances: tail releases cell at end of step.
    // If nextHead is inside currentPath, is it the tail cell that's leaving?
    const currentTail = currentPath[currentPath.length - 1];
    const selfCollisionIndex = currentPath.findIndex((c) => areCellsEqual(c, nextHead));
    
    if (selfCollisionIndex !== -1) {
      // If it hits a body cell that is NOT the tail cell, or if length is 1, it's a self-collision
      if (selfCollisionIndex !== currentPath.length - 1 || currentPath.length <= 1) {
        return {
          isFree: false,
          exitSteps: step,
          collisionCell: nextHead,
          blockedByPieceId: pieceToTest.id,
        };
      }
    }

    // 3. Advance snake: add nextHead at front, remove last cell from tail
    currentPath = [nextHead, ...currentPath.slice(0, currentPath.length - 1)];
    pathHistory.push(currentPath.map((c) => ({ ...c })));

    // 4. Check if the ENTIRE piece has exited the board
    const anyCellInside = currentPath.some((c) => isCellInsideBoard(c, gridWidth, gridHeight));
    if (!anyCellInside) {
      return {
        isFree: true,
        exitSteps: step,
        fullPathHistory: pathHistory,
      };
    }
  }

  // If reached max steps without exiting or colliding (should not happen in normal bounds)
  return {
    isFree: false,
    exitSteps: step,
  };
}

/**
 * Finds all currently free pieces in the level.
 */
export function getFreePieces(
  pieces: Piece[],
  gridWidth: number,
  gridHeight: number
): Piece[] {
  return pieces.filter((p) => simulateRemoval(p, pieces, gridWidth, gridHeight).isFree);
}

/**
 * Solver algorithm to verify solvability and return a valid clearance sequence.
 * Uses DFS with backtracking to find a solution order.
 */
export function solveLevel(level: LevelData): string[] | null {
  const initialPieces = level.pieces.map((p) => ({
    ...p,
    path: p.path.map((c) => ({ ...c })),
  }));

  function search(remainingPieces: Piece[], pathTaken: string[]): string[] | null {
    if (remainingPieces.length === 0) {
      return pathTaken;
    }

    const freePieces = getFreePieces(remainingPieces, level.gridWidth, level.gridHeight);
    if (freePieces.length === 0) {
      return null;
    }

    for (const piece of freePieces) {
      const nextRemaining = remainingPieces.filter((p) => p.id !== piece.id);
      const res = search(nextRemaining, [...pathTaken, piece.id]);
      if (res !== null) {
        return res;
      }
    }

    return null;
  }

  return search(initialPieces, []);
}
