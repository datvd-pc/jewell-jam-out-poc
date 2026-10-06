import { DIR_DELTAS } from './simulation';
import { LevelData } from './types';

export interface ValidationError {
  levelId: number;
  pieceId?: string;
  message: string;
}

/**
 * Validates level data for consistency, connectivity, non-overlap, and valid bounds.
 */
export function validateLevel(level: LevelData): ValidationError[] {
  const errors: ValidationError[] = [];
  const pieceIds = new Set<string>();
  const occupiedCells = new Map<string, string>(); // key "x,y" -> pieceId

  for (const piece of level.pieces) {
    // 1. Duplicate ID check
    if (pieceIds.has(piece.id)) {
      errors.push({
        levelId: level.id,
        pieceId: piece.id,
        message: `Duplicate piece ID: "${piece.id}"`,
      });
    }
    pieceIds.add(piece.id);

    // 2. Path empty check
    if (!piece.path || piece.path.length === 0) {
      errors.push({
        levelId: level.id,
        pieceId: piece.id,
        message: 'Piece has empty path',
      });
      continue;
    }

    // 3. Direction check
    if (!['up', 'down', 'left', 'right'].includes(piece.exitDirection)) {
      errors.push({
        levelId: level.id,
        pieceId: piece.id,
        message: `Invalid exit direction "${piece.exitDirection}"`,
      });
    }

    // 4. Gem shape and color check
    if (!['pear', 'heart', 'rectangle', 'oval'].includes(piece.gemShape)) {
      errors.push({
        levelId: level.id,
        pieceId: piece.id,
        message: `Invalid gem shape "${piece.gemShape}"`,
      });
    }
    if (!['sapphire', 'emerald', 'ruby', 'citrine'].includes(piece.gemColor)) {
      errors.push({
        levelId: level.id,
        pieceId: piece.id,
        message: `Invalid gem color "${piece.gemColor}"`,
      });
    }

    // 5. Check chain continuity and bounds
    const visitedInPiece = new Set<string>();

    for (let i = 0; i < piece.path.length; i++) {
      const cell = piece.path[i];

      // Integer check
      if (!Number.isInteger(cell.x) || !Number.isInteger(cell.y)) {
        errors.push({
          levelId: level.id,
          pieceId: piece.id,
          message: `Cell at index ${i} has non-integer coordinates: (${cell.x}, ${cell.y})`,
        });
      }

      // Bounds check
      if (cell.x < 0 || cell.x >= level.gridWidth || cell.y < 0 || cell.y >= level.gridHeight) {
        errors.push({
          levelId: level.id,
          pieceId: piece.id,
          message: `Cell (${cell.x}, ${cell.y}) is outside board bounds (${level.gridWidth}x${level.gridHeight})`,
        });
      }

      // Self-overlap check
      const cellKey = `${cell.x},${cell.y}`;
      if (visitedInPiece.has(cellKey)) {
        errors.push({
          levelId: level.id,
          pieceId: piece.id,
          message: `Piece self-overlaps at cell (${cell.x}, ${cell.y})`,
        });
      }
      visitedInPiece.add(cellKey);

      // Overlap with other pieces
      const existingPiece = occupiedCells.get(cellKey);
      if (existingPiece) {
        errors.push({
          levelId: level.id,
          pieceId: piece.id,
          message: `Cell (${cell.x}, ${cell.y}) overlaps with piece "${existingPiece}"`,
        });
      } else {
        occupiedCells.set(cellKey, piece.id);
      }

      // Adjacency check for continuous path
      if (i > 0) {
        const prev = piece.path[i - 1];
        const dist = Math.abs(cell.x - prev.x) + Math.abs(cell.y - prev.y);
        if (dist !== 1) {
          errors.push({
            levelId: level.id,
            pieceId: piece.id,
            message: `Discontinuous path between cell ${i - 1} (${prev.x},${prev.y}) and cell ${i} (${cell.x},${cell.y})`,
          });
        }
      }
    }

    // 6. Chain must not be attached immediately in front of head in exitDirection
    if (piece.path.length > 1) {
      const head = piece.path[0];
      const nextBody = piece.path[1];
      const dirDelta = DIR_DELTAS[piece.exitDirection];
      if (nextBody.x === head.x + dirDelta.dx && nextBody.y === head.y + dirDelta.dy) {
        errors.push({
          levelId: level.id,
          pieceId: piece.id,
          message: `Chain body cell is placed directly in front of head in exit direction`,
        });
      }
    }
  }

  return errors;
}
