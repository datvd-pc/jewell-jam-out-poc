import { Cell, HandbagContour, LevelData, Piece } from './types';

/**
 * Expands an array of 90-degree corner waypoints into a continuous list of grid cells.
 */
export function expandWaypoints(points: [number, number][]): Cell[] {
  const result: Cell[] = [];
  for (let i = 0; i < points.length; i++) {
    const [x, y] = points[i];
    if (i === 0) {
      result.push({ x, y });
    } else {
      const prev = result[result.length - 1];
      const dx = Math.sign(x - prev.x);
      const dy = Math.sign(y - prev.y);
      let cx = prev.x;
      let cy = prev.y;
      while (cx !== x || cy !== y) {
        if (cx !== x) cx += dx;
        else if (cy !== y) cy += dy;
        result.push({ x: cx, y: cy });
      }
    }
  }
  return result;
}

/* ========================================================
   LEVEL 1 - Intro FTUE (4 pieces)
   All chains stay strictly inside the handbag body silhouette!
   ======================================================== */
export const LEVEL_1: LevelData = {
  id: 1,
  name: 'Level 1',
  gridWidth: 8,
  gridHeight: 12,
  portalPosition: { x: 0.80, y: 0.10 },
  contour: {
    points: [
      { x: 0.14, y: 0.22 }, // top-left of bag body
      { x: 0.86, y: 0.22 }, // top-right
      { x: 0.94, y: 0.88 }, // bottom-right
      { x: 0.86, y: 0.95 }, // bottom edge right
      { x: 0.14, y: 0.95 }, // bottom edge left
      { x: 0.06, y: 0.88 }, // bottom-left
    ],
    handlePoints: [
      { x: 0.32, y: 0.22 },
      { x: 0.34, y: 0.14 },
      { x: 0.41, y: 0.06 },
      { x: 0.50, y: 0.04 },
      { x: 0.59, y: 0.06 },
      { x: 0.66, y: 0.14 },
      { x: 0.68, y: 0.22 },
    ],
  },
  ftueHint: 'Tap a charm to pull it out',
  grayDots: [
    { x: 2, y: 4 },
    { x: 5, y: 4 },
  ],
  pieces: [
    // Piece 1: Top free piece exits RIGHT
    {
      id: 'L1_top_teal',
      gemShape: 'pear',
      gemColor: 'emerald',
      exitDirection: 'right',
      path: expandWaypoints([
        [6, 3],
        [2, 3],
      ]),
    },
    // Piece 2: Left piece exits UP (blocked initially by Piece 1 at (2,3))
    {
      id: 'L1_left_blue',
      gemShape: 'pear',
      gemColor: 'sapphire',
      exitDirection: 'up',
      path: expandWaypoints([
        [2, 5],
        [2, 8],
      ]),
    },
    // Piece 3: Right piece exits DOWN (free initially)
    {
      id: 'L1_right_red',
      gemShape: 'heart',
      gemColor: 'ruby',
      exitDirection: 'down',
      path: expandWaypoints([
        [5, 7],
        [5, 5],
      ]),
    },
    // Piece 4: Bottom piece exits RIGHT (blocked initially by Piece 3 at (5,7))
    {
      id: 'L1_bottom_amber',
      gemShape: 'rectangle',
      gemColor: 'citrine',
      exitDirection: 'right',
      path: expandWaypoints([
        [4, 6],
        [4, 8],
        [3, 8],
      ]),
    },
  ],
};

/* ========================================================
   LEVEL 2 - Intermediate (7 pieces)
   All chains stay strictly inside the handbag body silhouette!
   ======================================================== */
export const LEVEL_2: LevelData = {
  id: 2,
  name: 'Level 2',
  gridWidth: 10,
  gridHeight: 14,
  portalPosition: { x: 0.82, y: 0.10 },
  contour: {
    points: [
      { x: 0.14, y: 0.22 },
      { x: 0.86, y: 0.22 },
      { x: 0.94, y: 0.88 },
      { x: 0.86, y: 0.95 },
      { x: 0.14, y: 0.95 },
      { x: 0.06, y: 0.88 },
    ],
    handlePoints: [
      { x: 0.33, y: 0.22 },
      { x: 0.35, y: 0.14 },
      { x: 0.41, y: 0.06 },
      { x: 0.50, y: 0.04 },
      { x: 0.59, y: 0.06 },
      { x: 0.65, y: 0.14 },
      { x: 0.67, y: 0.22 },
    ],
  },
  grayDots: [
    { x: 4, y: 4 },
    { x: 5, y: 4 },
    { x: 4, y: 6 },
    { x: 5, y: 6 },
  ],
  pieces: [
    // P1: Top-most piece exits RIGHT (Free initially)
    {
      id: 'L2_top_emerald',
      gemShape: 'pear',
      gemColor: 'emerald',
      exitDirection: 'right',
      path: expandWaypoints([
        [7, 3],
        [2, 3],
      ]),
    },
    // P2: Right side piece exits UP (Free initially)
    {
      id: 'L2_right_heart',
      gemShape: 'heart',
      gemColor: 'ruby',
      exitDirection: 'up',
      path: expandWaypoints([
        [8, 5],
        [8, 9],
      ]),
    },
    // P3: Left column exits UP (blocked by P1 at (2,3))
    {
      id: 'L2_left_sapphire',
      gemShape: 'oval',
      gemColor: 'sapphire',
      exitDirection: 'up',
      path: expandWaypoints([
        [2, 5],
        [2, 10],
      ]),
    },
    // P4: Center U-chain exits DOWN
    {
      id: 'L2_center_rect',
      gemShape: 'rectangle',
      gemColor: 'citrine',
      exitDirection: 'down',
      path: expandWaypoints([
        [4, 9],
        [4, 7],
        [5, 7],
        [5, 9],
      ]),
    },
    // P5: Mid-left L-chain exits RIGHT
    {
      id: 'L2_mid_emerald',
      gemShape: 'pear',
      gemColor: 'emerald',
      exitDirection: 'right',
      path: expandWaypoints([
        [6, 5],
        [3, 5],
        [3, 7],
      ]),
    },
    // P6: Bottom long horizontal piece exits LEFT
    {
      id: 'L2_bottom_ruby',
      gemShape: 'pear',
      gemColor: 'ruby',
      exitDirection: 'left',
      path: expandWaypoints([
        [3, 11],
        [7, 11],
      ]),
    },
    // P7: Inner heart exits UP
    {
      id: 'L2_inner_sapphire',
      gemShape: 'pear',
      gemColor: 'sapphire',
      exitDirection: 'up',
      path: expandWaypoints([
        [6, 8],
        [6, 10],
      ]),
    },
  ],
};

/* ========================================================
   LEVEL 3 - Showcase Masterpiece (Matches Reference Image 1)
   Grid: 12 x 16
   ALL chains and gray dots stay strictly INSIDE the handbag body!
   Handle arches cleanly ABOVE the body in rows 0..3!
   Sparkle Hole sits at the upper right.
   ======================================================== */
export const LEVEL_3: LevelData = {
  id: 3,
  name: 'Level 3',
  gridWidth: 12,
  gridHeight: 16,
  portalPosition: { x: 0.81, y: 0.10 },
  contour: {
    // Trapezoidal handbag body: surrounds rows 4 through 15
    points: [
      { x: 0.12, y: 0.21 }, // top-left corner of bag body
      { x: 0.88, y: 0.21 }, // top-right corner
      { x: 0.94, y: 0.92 }, // bottom-right flare
      { x: 0.88, y: 0.97 }, // bottom rounded edge right
      { x: 0.12, y: 0.97 }, // bottom rounded edge left
      { x: 0.06, y: 0.92 }, // bottom-left flare
    ],
    // Arched handle: arches cleanly into rows 0..3 above bag body
    handlePoints: [
      { x: 0.33, y: 0.21 },
      { x: 0.35, y: 0.13 },
      { x: 0.41, y: 0.05 },
      { x: 0.50, y: 0.03 },
      { x: 0.59, y: 0.05 },
      { x: 0.65, y: 0.13 },
      { x: 0.67, y: 0.21 },
    ],
  },
  grayDots: [
    // Row 5: 3 dots to the right of second horizontal chain
    { x: 7, y: 5 },
    { x: 8, y: 5 },
    { x: 9, y: 5 },
    // Row 6: 5 dots in a row
    { x: 4, y: 6 },
    { x: 5, y: 6 },
    { x: 6, y: 6 },
    { x: 7, y: 6 },
    { x: 8, y: 6 },
  ],
  pieces: [
    // 1. Top-most long horizontal chain (Teal pear pointing RIGHT) - safely inside top of bag!
    {
      id: 'L3_top1_teal',
      gemShape: 'pear',
      gemColor: 'emerald',
      exitDirection: 'right',
      path: expandWaypoints([
        [10, 4],
        [2, 4],
      ]),
    },
    // 2. Second horizontal chain (Teal pear pointing RIGHT)
    {
      id: 'L3_top2_teal',
      gemShape: 'pear',
      gemColor: 'emerald',
      exitDirection: 'right',
      path: expandWaypoints([
        [6, 5],
        [3, 5],
      ]),
    },
    // 3. Left vertical long chain (Blue pear pointing UP)
    // Blocked by top horizontal chains at (2, 4)
    {
      id: 'L3_left_blue',
      gemShape: 'pear',
      gemColor: 'sapphire',
      exitDirection: 'up',
      path: expandWaypoints([
        [2, 6],
        [2, 13],
      ]),
    },
    // 4. Red pear pointing UP with L-shaped chain
    {
      id: 'L3_mid_red_pear',
      gemShape: 'pear',
      gemColor: 'ruby',
      exitDirection: 'up',
      path: expandWaypoints([
        [3, 7],
        [4, 7],
        [4, 10],
      ]),
    },
    // 5. Amber rectangle with golden bezel, exits LEFT (blocked by L3_left_blue)
    {
      id: 'L3_amber_rect',
      gemShape: 'rectangle',
      gemColor: 'citrine',
      exitDirection: 'left',
      path: expandWaypoints([
        [3, 9],
        [3, 11],
        [3, 12],
        [7, 12],
      ]),
    },
    // 6. Blue pear in center pointing UP
    {
      id: 'L3_center_blue',
      gemShape: 'pear',
      gemColor: 'sapphire',
      exitDirection: 'up',
      path: expandWaypoints([
        [5, 7],
        [5, 9],
        [6, 9],
        [6, 11],
      ]),
    },
    // 7. Teal pear pointing RIGHT with vertical tail going down
    {
      id: 'L3_mid_teal',
      gemShape: 'pear',
      gemColor: 'emerald',
      exitDirection: 'right',
      path: expandWaypoints([
        [7, 7],
        [7, 10],
      ]),
    },
    // 8. Red heart on right pointing UP
    {
      id: 'L3_right_heart',
      gemShape: 'heart',
      gemColor: 'ruby',
      exitDirection: 'up',
      path: expandWaypoints([
        [9, 6],
        [8, 6],
        [8, 10],
      ]),
    },
    // 9. Blue pear on right pointing UP (blocked by L3_right_heart)
    {
      id: 'L3_right_blue',
      gemShape: 'oval',
      gemColor: 'sapphire',
      exitDirection: 'up',
      path: expandWaypoints([
        [9, 8],
        [9, 11],
      ]),
    },
    // 10. Bottom-right teal pear pointing UP with long bottom base chain
    {
      id: 'L3_bottom_teal',
      gemShape: 'pear',
      gemColor: 'emerald',
      exitDirection: 'up',
      path: expandWaypoints([
        [9, 12],
        [9, 14],
        [3, 14],
      ]),
    },
  ],
};

export const ALL_LEVELS: LevelData[] = [LEVEL_1, LEVEL_2, LEVEL_3];

export function getLevelById(id: number): LevelData {
  const found = ALL_LEVELS.find((l) => l.id === id);
  return found || LEVEL_1;
}
