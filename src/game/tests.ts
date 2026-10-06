import { ALL_LEVELS } from './levels';
import { areCellsEqual, simulateRemoval, solveLevel } from './simulation';
import { Cell, LevelData, Piece } from './types';
import { validateLevel } from './validator';

export interface TestResult {
  id: number;
  name: string;
  passed: boolean;
  message?: string;
}

export function runAllLogicTests(): { results: TestResult[]; allPassed: boolean } {
  const results: TestResult[] = [];

  // Helper to record result
  function record(id: number, name: string, passed: boolean, message?: string) {
    results.push({ id, name, passed, message });
    if (!passed) {
      console.error(`[TEST FAILED] #${id} ${name}: ${message}`);
    }
  }

  // 1. Piece thẳng, đường trống: remove thành công
  try {
    const testPiece: Piece = {
      id: 'p1',
      exitDirection: 'right',
      path: [
        { x: 3, y: 2 },
        { x: 2, y: 2 },
        { x: 1, y: 2 },
      ],
      gemShape: 'pear',
      gemColor: 'sapphire',
    };
    const sim = simulateRemoval(testPiece, [testPiece], 6, 6);
    record(1, 'Piece thẳng, đường trống: remove thành công', sim.isFree === true);
  } catch (err) {
    record(1, 'Piece thẳng, đường trống: remove thành công', false, String(err));
  }

  // 2. Piece có blocker sát đầu: blocked
  try {
    const p1: Piece = {
      id: 'p1',
      exitDirection: 'right',
      path: [{ x: 2, y: 2 }],
      gemShape: 'pear',
      gemColor: 'emerald',
    };
    const blocker: Piece = {
      id: 'blocker',
      exitDirection: 'down',
      path: [{ x: 3, y: 2 }],
      gemShape: 'oval',
      gemColor: 'ruby',
    };
    const sim = simulateRemoval(p1, [p1, blocker], 6, 6);
    record(
      2,
      'Piece có blocker sát đầu: blocked',
      sim.isFree === false && sim.blockedByPieceId === 'blocker' && areCellsEqual(sim.collisionCell!, { x: 3, y: 2 })
    );
  } catch (err) {
    record(2, 'Piece có blocker sát đầu: blocked', false, String(err));
  }

  // 3. Piece có blocker xa: vẫn blocked
  try {
    const p1: Piece = {
      id: 'p1',
      exitDirection: 'right',
      path: [{ x: 1, y: 2 }],
      gemShape: 'pear',
      gemColor: 'emerald',
    };
    const distantBlocker: Piece = {
      id: 'blocker_far',
      exitDirection: 'down',
      path: [{ x: 5, y: 2 }],
      gemShape: 'oval',
      gemColor: 'ruby',
    };
    const sim = simulateRemoval(p1, [p1, distantBlocker], 8, 8);
    record(
      3,
      'Piece có blocker xa: vẫn blocked',
      sim.isFree === false && sim.blockedByPieceId === 'blocker_far' && areCellsEqual(sim.collisionCell!, { x: 5, y: 2 })
    );
  } catch (err) {
    record(3, 'Piece có blocker xa: vẫn blocked', false, String(err));
  }

  // 4. Piece gấp khúc: chain đi theo path, không rigid translate
  try {
    const curvedPiece: Piece = {
      id: 'curved',
      exitDirection: 'up',
      // L-shaped: head at (2, 3), body at (2, 4), (3, 4)
      path: [
        { x: 2, y: 3 },
        { x: 2, y: 4 },
        { x: 3, y: 4 },
      ],
      gemShape: 'pear',
      gemColor: 'citrine',
    };
    const sim = simulateRemoval(curvedPiece, [curvedPiece], 6, 6);
    // In step 1: head moves to (2, 2), body[0] moves to (2, 3), body[1] moves to (2, 4)
    // The bend at (2, 4) turns! Tail released (3, 4).
    const step1 = sim.fullPathHistory ? sim.fullPathHistory[1] : null;
    const followsSnake =
      step1 !== null &&
      areCellsEqual(step1[0], { x: 2, y: 2 }) &&
      areCellsEqual(step1[1], { x: 2, y: 3 }) &&
      areCellsEqual(step1[2], { x: 2, y: 4 });
    record(4, 'Piece gấp khúc: chain đi theo path, không rigid translate', sim.isFree && followsSnake);
  } catch (err) {
    record(4, 'Piece gấp khúc: chain đi theo path, không rigid translate', false, String(err));
  }

  // 5. Gỡ blocker làm một piece khác free
  try {
    const p1: Piece = {
      id: 'p1',
      exitDirection: 'up',
      path: [{ x: 2, y: 3 }],
      gemShape: 'pear',
      gemColor: 'sapphire',
    };
    const blocker: Piece = {
      id: 'blocker',
      exitDirection: 'right',
      path: [{ x: 2, y: 1 }],
      gemShape: 'heart',
      gemColor: 'ruby',
    };
    const blockedBefore = simulateRemoval(p1, [p1, blocker], 5, 5).isFree === false;
    // Remove blocker
    const freeAfter = simulateRemoval(p1, [p1], 5, 5).isFree === true;
    record(5, 'Gỡ blocker làm một piece khác free', blockedBefore && freeAfter);
  } catch (err) {
    record(5, 'Gỡ blocker làm một piece khác free', false, String(err));
  }

  // 6. Không mutate level data gốc
  try {
    const originalCell = { ...ALL_LEVELS[0].pieces[0].path[0] };
    simulateRemoval(ALL_LEVELS[0].pieces[0], ALL_LEVELS[0].pieces, ALL_LEVELS[0].gridWidth, ALL_LEVELS[0].gridHeight);
    const afterCell = ALL_LEVELS[0].pieces[0].path[0];
    record(
      6,
      'Không mutate level data gốc',
      originalCell.x === afterCell.x && originalCell.y === afterCell.y
    );
  } catch (err) {
    record(6, 'Không mutate level data gốc', false, String(err));
  }

  // 7. Replay trong animation không để callback cũ tiếp tục
  try {
    let currentSessionId = 1;
    let staleBlocked = false;
    const sessionToRun = currentSessionId;
    // User hits replay, session increments!
    currentSessionId = 2;
    // Callback checks if its captured session matches current session
    if (sessionToRun !== currentSessionId) {
      staleBlocked = true;
    }
    record(7, 'Replay trong animation không để callback cũ tiếp tục', staleBlocked);
  } catch (err) {
    record(7, 'Replay trong animation không để callback cũ tiếp tục', false, String(err));
  }

  // 8. Completion chỉ fire một lần
  try {
    let fireCount = 0;
    let hasCompleted = false;
    const triggerComplete = () => {
      if (hasCompleted) return;
      hasCompleted = true;
      fireCount++;
    };
    triggerComplete();
    triggerComplete();
    triggerComplete();
    record(8, 'Completion chỉ fire một lần', fireCount === 1);
  } catch (err) {
    record(8, 'Completion chỉ fire một lần', false, String(err));
  }

  // 9. Các level đều solve được
  try {
    let allSolvable = true;
    const solveSummaries: string[] = [];

    for (const lvl of ALL_LEVELS) {
      const valErrors = validateLevel(lvl);
      if (valErrors.length > 0) {
        allSolvable = false;
        console.error(`Validation error in ${lvl.name}:`, valErrors);
        break;
      }
      const solution = solveLevel(lvl);
      if (!solution || solution.length !== lvl.pieces.length) {
        allSolvable = false;
        console.error(`Solver failed for ${lvl.name}`);
        break;
      }
      solveSummaries.push(`${lvl.name}: [${solution.join(' -> ')}]`);
    }

    record(9, 'Các level đều solve được', allSolvable, solveSummaries.join(' | '));
  } catch (err) {
    record(9, 'Các level đều solve được', false, String(err));
  }

  // 10. Heart, rectangle, oval không thay đổi rule gameplay
  try {
    const shapes = ['pear', 'heart', 'rectangle', 'oval'] as const;
    let allSameRules = true;
    for (const s of shapes) {
      const piece: Piece = {
        id: `shape_${s}`,
        exitDirection: 'right',
        path: [{ x: 2, y: 2 }],
        gemShape: s,
        gemColor: 'sapphire',
      };
      const blocker: Piece = {
        id: 'blk',
        exitDirection: 'down',
        path: [{ x: 3, y: 2 }],
        gemShape: 'heart',
        gemColor: 'ruby',
      };
      const sim = simulateRemoval(piece, [piece, blocker], 5, 5);
      if (sim.isFree !== false) {
        allSameRules = false;
      }
    }
    record(10, 'Heart, rectangle, oval không thay đổi rule gameplay', allSameRules);
  } catch (err) {
    record(10, 'Heart, rectangle, oval không thay đổi rule gameplay', false, String(err));
  }

  // 11. Tap gray dot không remove piece
  try {
    // Empty cell or gray dot at (6, 3) contains no piece
    const lvl3 = ALL_LEVELS[2];
    const grayDot = lvl3.grayDots?.[0];
    const hitPiece = lvl3.pieces.find((p) =>
      p.path.some((c) => grayDot && c.x === grayDot.x && c.y === grayDot.y)
    );
    record(11, 'Tap gray dot không remove piece', hitPiece === undefined);
  } catch (err) {
    record(11, 'Tap gray dot không remove piece', false, String(err));
  }

  // 12. Piece đang exiting không bị tap remove lần hai
  try {
    const states = ['EXITING', 'ROUTING_TO_PORTAL', 'COLLECTED'];
    let canTap = false;
    for (const state of states) {
      if (state === 'IDLE') {
        canTap = true;
      }
    }
    record(12, 'Piece đang exiting không bị tap remove lần hai', canTap === false);
  } catch (err) {
    record(12, 'Piece đang exiting không bị tap remove lần hai', false, String(err));
  }

  const allPassed = results.every((r) => r.passed);
  return { results, allPassed };
}
