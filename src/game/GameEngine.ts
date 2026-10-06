import { audio } from './audio';
import { ALL_LEVELS, getLevelById } from './levels';
import { GameRenderer } from './renderer';
import { DIR_DELTAS, simulateRemoval, solveLevel } from './simulation';
import {
  ActiveRemoval,
  Cell,
  GameSettings,
  GameState,
  LevelData,
  Piece,
} from './types';

export interface GameEngineEvents {
  onLevelChanged?: (level: LevelData) => void;
  onStateChanged?: (state: GameState) => void;
  onFtueHint?: (hint: string | null) => void;
}

export class GameEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private renderer: GameRenderer;

  // Level & Game State
  private currentLevel: LevelData;
  private currentPieces: Piece[] = [];
  private gameState: GameState = 'PLAYING';
  private sessionToken: number = 1;

  // Active animations
  private activeRemoval: ActiveRemoval | null = null;
  private blockedPieceId: string | null = null;
  private blockedTimer: number = 0;
  private collisionCell: Cell | null = null;

  // Reveal presentation
  private revealProgress: number = 0;
  private revealDelayTimer: number = 0;
  private hasFiredCompletion: boolean = false;

  // Settings
  private settings: GameSettings = {
    soundEnabled: true,
    hapticsEnabled: true,
    reducedMotion: false,
  };

  // Debug & FTUE
  public isDebug: boolean = false;
  private ftueHint: string | null = null;
  private autoSolving: boolean = false;

  // Animation frame
  private animationFrameId: number | null = null;
  private lastTimestamp: number = 0;

  // Event callbacks
  private events: GameEngineEvents = {};

  constructor(canvas: HTMLCanvasElement, initialLevelId: number = 1, events: GameEngineEvents = {}) {
    this.canvas = canvas;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Failed to get 2D context');
    this.ctx = context;
    this.renderer = new GameRenderer();
    this.events = events;

    // Load persisted settings
    this.loadSettings();
    this.loadRevealImage();

    // Load initial level
    this.currentLevel = getLevelById(initialLevelId);
    this.resetLevel();

    // Start render loop
    this.startLoop();
  }

  private loadSettings() {
    try {
      const sound = localStorage.getItem('jewelry_jam_sound');
      if (sound !== null) this.settings.soundEnabled = sound === 'true';

      const haptics = localStorage.getItem('jewelry_jam_haptics');
      if (haptics !== null) this.settings.hapticsEnabled = haptics === 'true';

      const motion = localStorage.getItem('jewelry_jam_reduced_motion');
      if (motion !== null) this.settings.reducedMotion = motion === 'true';

      audio.setSoundEnabled(this.settings.soundEnabled);
      audio.setHapticsEnabled(this.settings.hapticsEnabled);
    } catch {}
  }

  private loadRevealImage() {
    try {
      const saved = localStorage.getItem('jewelry_jam_reveal_image');
      if (saved) {
        const img = new Image();
        img.src = saved;
        img.onload = () => this.renderer.setCustomRevealImage(img);
        return;
      }
    } catch {}

    // Fallback to /reveal.jpg
    const fixedImg = new Image();
    fixedImg.src = '/reveal.jpg';
    fixedImg.onload = () => this.renderer.setCustomRevealImage(fixedImg);
  }

  public setRevealImageData(dataUrl: string) {
    try {
      localStorage.setItem('jewelry_jam_reveal_image', dataUrl);
    } catch {}
    const img = new Image();
    img.src = dataUrl;
    img.onload = () => this.renderer.setCustomRevealImage(img);
  }

  public updateSettings(partial: Partial<GameSettings>) {
    this.settings = { ...this.settings, ...partial };
    if (partial.soundEnabled !== undefined) {
      audio.setSoundEnabled(partial.soundEnabled);
    }
    if (partial.hapticsEnabled !== undefined) {
      audio.setHapticsEnabled(partial.hapticsEnabled);
    }
    try {
      if (partial.reducedMotion !== undefined) {
        localStorage.setItem('jewelry_jam_reduced_motion', String(partial.reducedMotion));
      }
    } catch {}
  }

  public getSettings(): GameSettings {
    return { ...this.settings };
  }

  public getGameState(): GameState {
    return this.gameState;
  }

  public getCurrentLevel(): LevelData {
    return this.currentLevel;
  }

  public getRemainingPieces(): Piece[] {
    return this.currentPieces;
  }

  public setLevel(levelId: number) {
    this.sessionToken++;
    this.autoSolving = false;
    this.currentLevel = getLevelById(levelId);
    this.resetLevel();
    if (this.events.onLevelChanged) {
      this.events.onLevelChanged(this.currentLevel);
    }
  }

  public nextLevel() {
    const nextId = (this.currentLevel.id % ALL_LEVELS.length) + 1;
    this.setLevel(nextId);
  }

  public replay() {
    this.sessionToken++;
    this.autoSolving = false;
    this.resetLevel();
  }

  private resetLevel() {
    // Deep clone original level pieces
    this.currentPieces = this.currentLevel.pieces.map((p) => ({
      ...p,
      path: p.path.map((c) => ({ ...c })),
    }));

    this.activeRemoval = null;
    this.blockedPieceId = null;
    this.blockedTimer = 0;
    this.collisionCell = null;
    this.revealProgress = 0;
    this.revealDelayTimer = 0;
    this.hasFiredCompletion = false;
    this.gameState = 'PLAYING';

    this.ftueHint = this.currentLevel.ftueHint || null;
    if (this.events.onFtueHint) {
      this.events.onFtueHint(this.ftueHint);
    }
    if (this.events.onStateChanged) {
      this.events.onStateChanged('PLAYING');
    }
  }

  /**
   * Pointer Input Hit Testing.
   * Converts clientX, clientY into canvas virtual coordinates and tests for piece taps.
   */
  public handlePointerTap(clientX: number, clientY: number) {
    if (this.gameState !== 'PLAYING') return;
    if (this.activeRemoval !== null) return; // Only one removal at a time

    const rect = this.canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;

    // Convert CSS client coordinates to canvas internal pixel coordinates
    const scaleX = this.canvas.width / (rect.width * dpr);
    const scaleY = this.canvas.height / (rect.height * dpr);

    const px = (clientX - rect.left) * dpr * scaleX;
    const py = (clientY - rect.top) * dpr * scaleY;

    const layout = this.renderer.computeLayout(this.canvas.width, this.canvas.height, this.currentLevel);

    // Hit testing:
    // Min hit threshold ~44 CSS px scaled to canvas internal resolution
    const minHitRadius = Math.max(26 * dpr, layout.cellSize * 0.48);

    let bestPiece: Piece | null = null;
    let bestDist = Infinity;
    let hitIsGem = false;

    for (const piece of this.currentPieces) {
      if (piece.path.length === 0) continue;

      // 1. Test Gem Head (Priority 1)
      const headCell = piece.path[0];
      const headPixel = this.renderer.cellToPixel(headCell, layout);
      const gemDist = Math.hypot(px - headPixel.x, py - headPixel.y);

      // Generous gem hit area
      const gemHitRadius = Math.max(minHitRadius, layout.cellSize * 0.65);
      if (gemDist <= gemHitRadius) {
        if (!hitIsGem || gemDist < bestDist) {
          bestPiece = piece;
          bestDist = gemDist;
          hitIsGem = true;
          continue;
        }
      }

      // 2. Test Chain Polyline (Priority 2, only if no gem already closer)
      if (!hitIsGem && piece.path.length > 1) {
        for (let i = 0; i < piece.path.length - 1; i++) {
          const p1 = this.renderer.cellToPixel(piece.path[i], layout);
          const p2 = this.renderer.cellToPixel(piece.path[i + 1], layout);
          const segDist = this.distanceToSegment(px, py, p1.x, p1.y, p2.x, p2.y);

          if (segDist <= minHitRadius && segDist < bestDist) {
            bestPiece = piece;
            bestDist = segDist;
          }
        }
      }
    }

    if (bestPiece) {
      this.onPieceTapped(bestPiece);
    }
  }

  private distanceToSegment(
    px: number,
    py: number,
    x1: number,
    y1: number,
    x2: number,
    y2: number
  ): number {
    const l2 = (x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1);
    if (l2 === 0) return Math.hypot(px - x1, py - y1);
    let t = ((px - x1) * (x2 - x1) + (py - y1) * (y2 - y1)) / l2;
    t = Math.max(0, Math.min(1, t));
    return Math.hypot(px - (x1 + t * (x2 - x1)), py - (y1 + t * (y2 - y1)));
  }

  /**
   * Executes a piece tap: runs simulation to check if free or blocked.
   */
  public onPieceTapped(piece: Piece) {
    if (this.activeRemoval !== null || this.gameState !== 'PLAYING') return;

    // Simulate removal step by step
    const sim = simulateRemoval(
      piece,
      this.currentPieces,
      this.currentLevel.gridWidth,
      this.currentLevel.gridHeight
    );

    if (sim.isFree) {
      // 1. FREE: Start removal flow!
      this.ftueHint = null;
      if (this.events.onFtueHint) this.events.onFtueHint(null);

      // Remove from logical occupancy immediately
      this.currentPieces = this.currentPieces.filter((p) => p.id !== piece.id);

      const durationScale = this.settings.reducedMotion ? 0.4 : 1.0;
      // Duration depends slightly on length: base 0.5s + 0.05s per cell, clamped
      const exitDur = Math.max(0.45, Math.min(0.9, 0.4 + piece.path.length * 0.04)) * durationScale;
      const portalDur = 0.45 * durationScale;

      this.activeRemoval = {
        pieceId: piece.id,
        piece: { ...piece, path: piece.path.map((c) => ({ ...c })) },
        startPath: piece.path.map((c) => ({ ...c })),
        exitDirection: piece.exitDirection,
        headTraversedPath: [piece.path[0]],
        totalLengthCells: piece.path.length,
        phase: 'EXITING',
        elapsedTime: 0,
        exitDuration: exitDur,
        portalDuration: portalDur,
      };

      audio.playValidPull();
    } else {
      // 2. BLOCKED: Jiggle feedback and highlight collision
      this.blockedPieceId = piece.id;
      this.blockedTimer = 0.35;
      this.collisionCell = sim.collisionCell || null;

      audio.playBlockedClick();

      if (this.currentLevel.id === 1 && !this.ftueHint) {
        this.ftueHint = 'Clear the path first';
        if (this.events.onFtueHint) this.events.onFtueHint(this.ftueHint);
      }
    }
  }

  /**
   * Main game tick and render loop.
   */
  private startLoop() {
    const loop = (timestamp: number) => {
      if (!this.lastTimestamp) this.lastTimestamp = timestamp;
      const rawDt = (timestamp - this.lastTimestamp) / 1000;
      this.lastTimestamp = timestamp;

      // Clamp delta time to avoid large jumps when tab is hidden
      const dt = Math.min(0.1, rawDt);

      this.update(dt);
      this.render();

      this.animationFrameId = requestAnimationFrame(loop);
    };

    this.animationFrameId = requestAnimationFrame(loop);
  }

  private update(dt: number) {
    this.renderer.update(dt, this.settings);

    // Update blocked timer
    if (this.blockedTimer > 0) {
      this.blockedTimer = Math.max(0, this.blockedTimer - dt);
      if (this.blockedTimer === 0) {
        this.blockedPieceId = null;
        this.collisionCell = null;
      }
    }

    // Update Active Removal
    if (this.activeRemoval) {
      this.activeRemoval.elapsedTime += dt;

      if (this.activeRemoval.phase === 'EXITING') {
        if (this.activeRemoval.elapsedTime >= this.activeRemoval.exitDuration) {
          // Transition to portal routing
          this.activeRemoval.phase = 'ROUTING_TO_PORTAL';
          this.activeRemoval.elapsedTime = 0;

          // Compute screen exit position outside board
          const layout = this.renderer.computeLayout(this.canvas.width, this.canvas.height, this.currentLevel);
          const dir = DIR_DELTAS[this.activeRemoval.exitDirection];
          const headPx = this.renderer.cellToPixel(this.activeRemoval.startPath[0], layout);
          const margin = Math.max(layout.boardWidth, layout.boardHeight) * 0.75;

          this.activeRemoval.portalStartScreenPos = {
            x: headPx.x + dir.dx * margin,
            y: headPx.y + dir.dy * margin,
          };
        }
      } else if (this.activeRemoval.phase === 'ROUTING_TO_PORTAL') {
        if (this.activeRemoval.elapsedTime >= this.activeRemoval.portalDuration) {
          // Finished entering portal!
          const layout = this.renderer.computeLayout(this.canvas.width, this.canvas.height, this.currentLevel);
          this.renderer.addPortalBurst(layout.portalX, layout.portalY, 16);
          audio.playPortalAbsorb();

          this.activeRemoval = null;

          // Check level complete
          if (this.currentPieces.length === 0) {
            this.startRevealPhase();
          } else if (this.autoSolving) {
            this.stepAutoSolve();
          }
        }
      }
    }

    // Update Reveal Phase
    if (this.gameState === 'REVEALING' || this.gameState === 'COMPLETE') {
      if (this.revealProgress < 1) {
        const revealSpeed = this.settings.reducedMotion ? 2.5 : 1.2;
        this.revealProgress = Math.min(1, this.revealProgress + dt * revealSpeed);
      }

      this.revealDelayTimer += dt;
      if (this.revealDelayTimer >= 1.0 && this.gameState === 'REVEALING') {
        this.gameState = 'COMPLETE';
        if (this.events.onStateChanged) {
          this.events.onStateChanged('COMPLETE');
        }
      }
    }
  }

  private startRevealPhase() {
    if (this.hasFiredCompletion) return;
    this.hasFiredCompletion = true;

    this.gameState = 'REVEALING';
    this.revealProgress = 0;
    this.revealDelayTimer = 0;

    audio.playLevelComplete();

    if (this.events.onStateChanged) {
      this.events.onStateChanged('REVEALING');
    }
  }

  private render() {
    this.renderer.render(
      this.ctx,
      this.canvas.width,
      this.canvas.height,
      this.currentLevel,
      this.currentPieces,
      this.activeRemoval,
      this.blockedPieceId,
      this.blockedTimer,
      this.collisionCell,
      this.revealProgress,
      this.settings,
      this.isDebug
    );
  }

  /**
   * Auto-solve trigger for debug verification.
   * Executes genuine game removals one after another.
   */
  public triggerAutoSolve() {
    if (this.gameState !== 'PLAYING') return;
    this.autoSolving = true;
    this.stepAutoSolve();
  }

  private stepAutoSolve() {
    if (this.currentPieces.length === 0) {
      this.autoSolving = false;
      return;
    }

    const solution = solveLevel({
      ...this.currentLevel,
      pieces: this.currentPieces,
    });

    if (solution && solution.length > 0) {
      const nextPieceId = solution[0];
      const targetPiece = this.currentPieces.find((p) => p.id === nextPieceId);
      if (targetPiece) {
        setTimeout(() => {
          this.onPieceTapped(targetPiece);
        }, 80);
      }
    } else {
      this.autoSolving = false;
    }
  }

  public resize(width: number, height: number) {
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = width * dpr;
    this.canvas.height = height * dpr;
    this.canvas.style.width = `${width}px`;
    this.canvas.style.height = `${height}px`;
  }

  public destroy() {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
    }
  }
}
