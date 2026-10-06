import { DIR_DELTAS } from './simulation';
import { ActiveRemoval, Cell, Direction, GameSettings, GemColor, GemShape, HandbagContour, LevelData, Piece } from './types';

// Particle for sparkles and portal effects
export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  maxLife: number;
  life: number;
  color: string;
  rotation: number;
  vRot: number;
}

export interface BoardLayout {
  boardX: number;
  boardY: number;
  boardWidth: number;
  boardHeight: number;
  cellSize: number;
  portalX: number;
  portalY: number;
  portalRadius: number;
}

export class GameRenderer {
  private particles: Particle[] = [];
  private dashOffset: number = 0;
  private portalAngle: number = 0;
  private revealSweepProgress: number = 0;
  private customRevealImage: HTMLImageElement | null = null;

  public setCustomRevealImage(img: HTMLImageElement | null) {
    this.customRevealImage = img;
  }

  public update(dt: number, settings: GameSettings) {
    if (!settings.reducedMotion) {
      this.dashOffset = (this.dashOffset + dt * 18) % 1000;
      this.portalAngle = (this.portalAngle + dt * 0.8) % (Math.PI * 2);
    }

    // Update active particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life += dt;
      if (p.life >= p.maxLife) {
        this.particles.splice(i, 1);
        continue;
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.rotation += p.vRot * dt;
    }
  }

  public addPortalBurst(x: number, y: number, count: number = 14) {
    const colors = ['#ffd700', '#fff8db', '#93c5fd', '#c084fc', '#ffffff'];
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 40 + Math.random() * 80;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 2.5 + Math.random() * 3.5,
        maxLife: 0.45 + Math.random() * 0.35,
        life: 0,
        color: colors[Math.floor(Math.random() * colors.length)],
        rotation: Math.random() * Math.PI * 2,
        vRot: (Math.random() - 0.5) * 6,
      });
    }
  }

  public addRevealSparkles(box: { x: number; y: number; width: number; height: number }, count: number = 4) {
    for (let i = 0; i < count; i++) {
      this.particles.push({
        x: box.x + Math.random() * box.width,
        y: box.y + Math.random() * box.height,
        vx: (Math.random() - 0.5) * 15,
        vy: -10 - Math.random() * 20,
        size: 3 + Math.random() * 4,
        maxLife: 0.6 + Math.random() * 0.5,
        life: 0,
        color: '#fffbeb',
        rotation: Math.random() * Math.PI * 2,
        vRot: 3,
      });
    }
  }

  /**
   * Calculates board bounding box, cell size, and portal position based on canvas dimensions.
   */
  public computeLayout(canvasWidth: number, canvasHeight: number, level: LevelData): BoardLayout {
    // Reserves top 120px for HUD
    const topMargin = 110;
    const bottomMargin = 70;
    const sideMargin = 24;

    const availWidth = canvasWidth - sideMargin * 2;
    const availHeight = canvasHeight - topMargin - bottomMargin;

    // Grid aspect ratio
    const cellW = availWidth / level.gridWidth;
    const cellH = availHeight / level.gridHeight;
    const cellSize = Math.min(cellW, cellH);

    const boardWidth = cellSize * level.gridWidth;
    const boardHeight = cellSize * level.gridHeight;

    const boardX = (canvasWidth - boardWidth) / 2;
    const boardY = topMargin + (availHeight - boardHeight) / 2;

    // Portal position
    const portalX = boardX + boardWidth * level.portalPosition.x;
    const portalY = boardY + boardHeight * level.portalPosition.y;
    const portalRadius = Math.min(32, cellSize * 0.95);

    return {
      boardX,
      boardY,
      boardWidth,
      boardHeight,
      cellSize,
      portalX,
      portalY,
      portalRadius,
    };
  }

  /**
   * Converts grid cell coordinates into canvas pixel center coordinates.
   */
  public cellToPixel(cell: Cell, layout: BoardLayout): { x: number; y: number } {
    return {
      x: layout.boardX + (cell.x + 0.5) * layout.cellSize,
      y: layout.boardY + (cell.y + 0.5) * layout.cellSize,
    };
  }

  /**
   * Main render method.
   */
  public render(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    level: LevelData,
    pieces: Piece[],
    activeRemoval: ActiveRemoval | null,
    blockedPieceId: string | null,
    blockedTimer: number,
    collisionCell: Cell | null,
    revealProgress: number, // 0 = playing, 1 = fully revealed
    settings: GameSettings,
    debug: boolean
  ) {
    const layout = this.computeLayout(width, height, level);

    ctx.clearRect(0, 0, width, height);

    // 1. Premium purple radial gradient background
    this.renderBackground(ctx, width, height);

    // If revealing, fade out board contour and gray dots
    const boardAlpha = Math.max(0, 1 - revealProgress * 1.5);

    if (boardAlpha > 0) {
      ctx.save();
      ctx.globalAlpha = boardAlpha;

      // 2. Handbag Dashed Contour
      this.renderContour(ctx, layout, level.contour);

      // 3. Gray reference dots
      if (level.grayDots) {
        this.renderGrayDots(ctx, layout, level.grayDots);
      }

      // 4. Debug grid if enabled
      if (debug) {
        this.renderDebugGrid(ctx, layout, level);
      }

      ctx.restore();
    }

    // 5. Sparkle Hole (Portal)
    this.renderPortal(ctx, layout.portalX, layout.portalY, layout.portalRadius, activeRemoval !== null);

    // 6. Render Idle / Static Pieces
    for (const piece of pieces) {
      // If this piece is currently in blocked feedback jiggle
      let jiggleX = 0;
      let jiggleY = 0;
      const isBlocked = piece.id === blockedPieceId && blockedTimer > 0;
      if (isBlocked) {
        const dir = DIR_DELTAS[piece.exitDirection];
        // Jiggle: fast oscillation damped over 0.3s
        const t = blockedTimer / 0.35;
        const jiggleAmount = Math.sin(t * Math.PI * 8) * (t * 4);
        jiggleX = dir.dx * jiggleAmount;
        jiggleY = dir.dy * jiggleAmount;
      }

      this.renderStaticPiece(ctx, piece, layout, jiggleX, jiggleY, isBlocked);
    }

    // 7. Render Blocked Collision Indicator Highlight
    if (collisionCell && blockedTimer > 0) {
      this.renderCollisionHighlight(ctx, collisionCell, layout, blockedTimer);
    }

    // 8. Render Active Removal Snake & Portal Routing
    if (activeRemoval) {
      this.renderActiveRemoval(ctx, activeRemoval, layout);
    }

    // 9. Render Particles
    this.renderParticles(ctx);

    // 10. Luxury Sapphire Handbag Reveal (if clearing / completed)
    if (revealProgress > 0) {
      this.renderLuxuryHandbagReveal(ctx, layout, revealProgress, settings);
    }
  }

  // 1. Background
  private renderBackground(ctx: CanvasRenderingContext2D, width: number, height: number) {
    const cx = width * 0.5;
    const cy = height * 0.44;
    const radius = Math.max(width, height) * 0.85;

    const grad = ctx.createRadialGradient(cx, cy, radius * 0.05, cx, cy, radius);
    grad.addColorStop(0, '#5a408e'); // violet center
    grad.addColorStop(0.55, '#442e72');
    grad.addColorStop(1, '#251745'); // deep dark purple edges

    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);
  }

  // 2. Dashed Handbag Contour
  private renderContour(ctx: CanvasRenderingContext2D, layout: BoardLayout, contour: HandbagContour) {
    ctx.save();
    ctx.strokeStyle = 'rgba(255, 238, 205, 0.72)';
    ctx.lineWidth = 2.2;
    ctx.setLineDash([7, 7]);
    ctx.lineDashOffset = -this.dashOffset;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const { boardX, boardY, boardWidth, boardHeight } = layout;

    // Body
    if (contour.points.length > 0) {
      ctx.beginPath();
      const first = contour.points[0];
      ctx.moveTo(boardX + first.x * boardWidth, boardY + first.y * boardHeight);
      for (let i = 1; i < contour.points.length; i++) {
        const pt = contour.points[i];
        ctx.lineTo(boardX + pt.x * boardWidth, boardY + pt.y * boardHeight);
      }
      ctx.closePath();
      ctx.stroke();
    }

    // Arched Handle
    if (contour.handlePoints.length > 0) {
      ctx.beginPath();
      const hPts = contour.handlePoints.map((p) => ({
        x: boardX + p.x * boardWidth,
        y: boardY + p.y * boardHeight,
      }));
      ctx.moveTo(hPts[0].x, hPts[0].y);
      for (let i = 1; i < hPts.length - 1; i++) {
        const xc = (hPts[i].x + hPts[i + 1].x) / 2;
        const yc = (hPts[i].y + hPts[i + 1].y) / 2;
        ctx.quadraticCurveTo(hPts[i].x, hPts[i].y, xc, yc);
      }
      ctx.lineTo(hPts[hPts.length - 1].x, hPts[hPts.length - 1].y);
      ctx.stroke();
    }

    ctx.restore();
  }

  // 3. Gray reference dots
  private renderGrayDots(ctx: CanvasRenderingContext2D, layout: BoardLayout, dots: Cell[]) {
    ctx.save();
    const dotRadius = Math.max(3.5, layout.cellSize * 0.14);
    ctx.fillStyle = 'rgba(45, 28, 77, 0.85)';

    for (const d of dots) {
      const pos = this.cellToPixel(d, layout);
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, dotRadius, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  // 4. Sparkle Hole (Portal)
  private renderPortal(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    radius: number,
    isActive: boolean
  ) {
    ctx.save();

    // Outer glow
    const outerGlow = ctx.createRadialGradient(x, y, radius * 0.7, x, y, radius * 1.5);
    outerGlow.addColorStop(0, isActive ? 'rgba(255, 215, 0, 0.45)' : 'rgba(255, 215, 0, 0.2)');
    outerGlow.addColorStop(1, 'rgba(255, 215, 0, 0)');
    ctx.fillStyle = outerGlow;
    ctx.beginPath();
    ctx.arc(x, y, radius * 1.5, 0, Math.PI * 2);
    ctx.fill();

    // Outer Gold Beveled Ring
    const goldGrad = ctx.createLinearGradient(x - radius, y - radius, x + radius, y + radius);
    goldGrad.addColorStop(0, '#ffe89c');
    goldGrad.addColorStop(0.3, '#d4af37');
    goldGrad.addColorStop(0.7, '#fff5cc');
    goldGrad.addColorStop(1, '#947014');

    ctx.fillStyle = goldGrad;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();

    // Inner bevel shadow
    ctx.strokeStyle = '#5a3d08';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Interior Cosmic Midnight Circle
    const innerRadius = radius * 0.78;
    const nebulaGrad = ctx.createRadialGradient(
      x - innerRadius * 0.2,
      y - innerRadius * 0.2,
      innerRadius * 0.1,
      x,
      y,
      innerRadius
    );
    nebulaGrad.addColorStop(0, '#382069');
    nebulaGrad.addColorStop(0.6, '#180e36');
    nebulaGrad.addColorStop(1, '#090317');

    ctx.fillStyle = nebulaGrad;
    ctx.beginPath();
    ctx.arc(x, y, innerRadius, 0, Math.PI * 2);
    ctx.fill();

    // Cosmic Sparkles inside portal
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(this.portalAngle);

    // Star points
    const starCount = 8;
    for (let i = 0; i < starCount; i++) {
      const angle = (i / starCount) * Math.PI * 2;
      const dist = innerRadius * (0.3 + 0.45 * Math.sin(i * 1.7));
      const sx = Math.cos(angle) * dist;
      const sy = Math.sin(angle) * dist;
      const sparkSize = 1.2 + (i % 3) * 0.8;

      ctx.fillStyle = i % 2 === 0 ? '#ffffff' : '#ffd700';
      ctx.beginPath();
      ctx.arc(sx, sy, sparkSize, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    // Golden Sparkle Cross Glint on Rim
    this.renderDiamondGlint(ctx, x + radius * 0.8, y - radius * 0.6, 5);
    this.renderDiamondGlint(ctx, x - radius * 0.8, y + radius * 0.5, 3.5);

    ctx.restore();
  }

  // 5. Static Piece
  private renderStaticPiece(
    ctx: CanvasRenderingContext2D,
    piece: Piece,
    layout: BoardLayout,
    offsetX: number,
    offsetY: number,
    isBlocked: boolean
  ) {
    if (piece.path.length === 0) return;

    // Convert piece cells to screen positions
    const screenPts = piece.path.map((c) => {
      const p = this.cellToPixel(c, layout);
      return { x: p.x + offsetX, y: p.y + offsetY };
    });

    // 1. Render Gold Bead Chain (Tail to Head) with delicate small beads
    this.renderGoldBeadChain(ctx, screenPts, layout.cellSize);

    // 2. Render Gem Charm Head at screenPts[0] (prominent and radiant)
    const headPt = screenPts[0];
    const gemRadius = Math.max(14, layout.cellSize * 0.44);
    this.renderGemCharm(
      ctx,
      headPt.x,
      headPt.y,
      gemRadius,
      piece.gemShape,
      piece.gemColor,
      piece.exitDirection,
      isBlocked
    );
  }

  /**
   * Renders a gold bead chain along an array of 2D screen points.
   * Uses smaller, delicate golden caviar beads closely strung together matching reference!
   */
  private renderGoldBeadChain(
    ctx: CanvasRenderingContext2D,
    points: { x: number; y: number }[],
    cellSize: number
  ) {
    if (points.length === 0) return;

    // Noticeably smaller, delicate gold beads matching the reference image!
    const beadRadius = Math.max(1.8, cellSize * 0.055);
    const beadSpacing = beadRadius * 2.05;

    // Build cumulative distances along points polyline
    const distances: number[] = [0];
    let totalLength = 0;
    for (let i = 1; i < points.length; i++) {
      const dx = points[i].x - points[i - 1].x;
      const dy = points[i].y - points[i - 1].y;
      totalLength += Math.hypot(dx, dy);
      distances.push(totalLength);
    }

    if (totalLength === 0 && points.length > 1) return;

    // Draw connecting thin gold wire
    ctx.save();
    ctx.strokeStyle = '#c59b27';
    ctx.lineWidth = Math.max(0.8, beadRadius * 0.45);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i].x, points[i].y);
    }
    ctx.stroke();
    ctx.restore();

    // Sample beads along the polyline, starting slightly behind the gem head
    const headOffset = beadRadius * 2.4;
    let dist = headOffset;

    while (dist <= totalLength) {
      // Find segment
      let segIdx = 0;
      for (let i = 1; i < distances.length; i++) {
        if (distances[i] >= dist) {
          segIdx = i - 1;
          break;
        }
      }

      const segStartDist = distances[segIdx];
      const segEndDist = distances[segIdx + 1];
      const segLen = segEndDist - segStartDist;
      const t = segLen > 0 ? (dist - segStartDist) / segLen : 0;

      const bx = points[segIdx].x + (points[segIdx + 1].x - points[segIdx].x) * t;
      const by = points[segIdx].y + (points[segIdx + 1].y - points[segIdx].y) * t;

      this.renderGoldBeadSphere(ctx, bx, by, beadRadius);

      dist += beadSpacing;
    }
  }

  /**
   * Renders a single 3D glossy metallic gold bead.
   */
  private renderGoldBeadSphere(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
    ctx.save();

    // Drop shadow
    ctx.fillStyle = 'rgba(25, 12, 40, 0.45)';
    ctx.beginPath();
    ctx.arc(x + 1, y + 1.2, r, 0, Math.PI * 2);
    ctx.fill();

    // Bead sphere gradient
    const grad = ctx.createRadialGradient(x - r * 0.35, y - r * 0.35, r * 0.1, x, y, r);
    grad.addColorStop(0, '#ffffff'); // Specular highlight
    grad.addColorStop(0.2, '#fff1a8');
    grad.addColorStop(0.55, '#f59e0b'); // Warm rich gold
    grad.addColorStop(0.85, '#d97706');
    grad.addColorStop(1, '#854d0e'); // Rim shadow

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();

    // Outer subtle gold rim
    ctx.strokeStyle = '#b45309';
    ctx.lineWidth = 0.6;
    ctx.stroke();

    ctx.restore();
  }

  /**
   * Renders the Gem Charm Head (Pear, Heart, Rectangle, Oval) with golden bezel and facets.
   */
  private renderGemCharm(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    radius: number,
    shape: GemShape,
    color: GemColor,
    direction: Direction,
    isBlocked: boolean
  ) {
    ctx.save();
    ctx.translate(x, y);

    // Rotation angle based on exitDirection:
    // Standard 'right' is 0, 'down' is PI/2, 'left' is PI, 'up' is -PI/2
    const dirAngles: Record<Direction, number> = {
      right: 0,
      down: Math.PI / 2,
      left: Math.PI,
      up: -Math.PI / 2,
    };
    ctx.rotate(dirAngles[direction]);

    // Drop shadow
    ctx.shadowColor = 'rgba(15, 6, 30, 0.55)';
    ctx.shadowBlur = 8;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 3;

    // Palette for gem
    const palette = this.getGemPalette(color);

    switch (shape) {
      case 'pear':
        this.drawPearGem(ctx, radius, palette);
        break;
      case 'heart':
        this.drawHeartGem(ctx, radius, palette);
        break;
      case 'rectangle':
        this.drawRectangleGem(ctx, radius, palette);
        break;
      case 'oval':
        this.drawOvalGem(ctx, radius, palette);
        break;
    }

    // Directional cue indicator when blocked or for symmetry assistance
    if (isBlocked) {
      this.drawDirectionalCue(ctx, radius);
    }

    ctx.restore();
  }

  private getGemPalette(color: GemColor) {
    switch (color) {
      case 'sapphire':
        return {
          base: '#1d4ed8',
          dark: '#0f296d',
          mid: '#2563eb',
          light: '#60a5fa',
          specular: '#e0f2fe',
        };
      case 'emerald':
        return {
          base: '#0d9488',
          dark: '#044e47',
          mid: '#14b8a6',
          light: '#5eead4',
          specular: '#f0fdfa',
        };
      case 'ruby':
        return {
          base: '#e11d48',
          dark: '#881337',
          mid: '#f43f5e',
          light: '#fda4af',
          specular: '#fff1f2',
        };
      case 'citrine':
        return {
          base: '#d97706',
          dark: '#78350f',
          mid: '#f59e0b',
          light: '#fde68a',
          specular: '#fffbeb',
        };
    }
  }

  // Draw Pear Gem (teardrop, pointed tip at right x > 0)
  private drawPearGem(
    ctx: CanvasRenderingContext2D,
    r: number,
    p: ReturnType<typeof this.getGemPalette>
  ) {
    const tipX = r * 1.25;
    const baseX = -r * 0.75;
    const halfH = r * 0.9;

    // 1. Outer Gold Bezel
    ctx.beginPath();
    ctx.moveTo(tipX + 2, 0);
    ctx.bezierCurveTo(tipX * 0.5, halfH + 2, baseX, halfH + 2, baseX - 2, 0);
    ctx.bezierCurveTo(baseX, -halfH - 2, tipX * 0.5, -halfH - 2, tipX + 2, 0);
    ctx.fillStyle = '#f59e0b';
    ctx.fill();
    ctx.strokeStyle = '#fffbeb';
    ctx.lineWidth = 1.2;
    ctx.stroke();

    // 2. Inner Gem Body
    ctx.beginPath();
    ctx.moveTo(tipX, 0);
    ctx.bezierCurveTo(tipX * 0.45, halfH, baseX, halfH, baseX, 0);
    ctx.bezierCurveTo(baseX, -halfH, tipX * 0.45, -halfH, tipX, 0);

    const grad = ctx.createRadialGradient(-r * 0.2, -r * 0.2, r * 0.1, 0, 0, r * 1.2);
    grad.addColorStop(0, p.light);
    grad.addColorStop(0.4, p.base);
    grad.addColorStop(1, p.dark);
    ctx.fillStyle = grad;
    ctx.fill();

    // 3. Facet lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    // Center diamond facet
    ctx.moveTo(tipX * 0.7, 0);
    ctx.lineTo(0, halfH * 0.45);
    ctx.lineTo(baseX * 0.5, 0);
    ctx.lineTo(0, -halfH * 0.45);
    ctx.closePath();
    ctx.stroke();

    // Facet rays
    ctx.beginPath();
    ctx.moveTo(tipX * 0.7, 0);
    ctx.lineTo(tipX, 0);
    ctx.moveTo(0, halfH * 0.45);
    ctx.lineTo(0, halfH * 0.95);
    ctx.moveTo(baseX * 0.5, 0);
    ctx.lineTo(baseX, 0);
    ctx.moveTo(0, -halfH * 0.45);
    ctx.lineTo(0, -halfH * 0.95);
    ctx.stroke();

    // Specular Glint
    this.renderDiamondGlint(ctx, tipX * 0.35, -halfH * 0.25, 4.5);
  }

  // Draw Heart Gem (pointed tip at right x > 0, lobes at left x < 0)
  private drawHeartGem(
    ctx: CanvasRenderingContext2D,
    r: number,
    p: ReturnType<typeof this.getGemPalette>
  ) {
    const tipX = r * 1.2;
    const lobeX = -r * 0.8;
    const halfH = r * 0.95;

    // 1. Gold Bezel
    ctx.beginPath();
    ctx.moveTo(tipX + 2, 0);
    ctx.bezierCurveTo(tipX * 0.3, halfH + 3, lobeX - 2, halfH * 1.1, lobeX, halfH * 0.3);
    ctx.bezierCurveTo(lobeX + r * 0.2, 0, lobeX + r * 0.2, 0, lobeX, -halfH * 0.3);
    ctx.bezierCurveTo(lobeX - 2, -halfH * 1.1, tipX * 0.3, -halfH - 3, tipX + 2, 0);
    ctx.fillStyle = '#f59e0b';
    ctx.fill();
    ctx.strokeStyle = '#fffbeb';
    ctx.lineWidth = 1.2;
    ctx.stroke();

    // 2. Inner Gem Body
    ctx.beginPath();
    ctx.moveTo(tipX, 0);
    ctx.bezierCurveTo(tipX * 0.3, halfH, lobeX, halfH * 1.05, lobeX + 2, halfH * 0.3);
    ctx.bezierCurveTo(lobeX + r * 0.2, 0, lobeX + r * 0.2, 0, lobeX + 2, -halfH * 0.3);
    ctx.bezierCurveTo(lobeX, -halfH * 1.05, tipX * 0.3, -halfH, tipX, 0);

    const grad = ctx.createRadialGradient(-r * 0.1, -r * 0.2, r * 0.1, 0, 0, r * 1.1);
    grad.addColorStop(0, p.light);
    grad.addColorStop(0.4, p.base);
    grad.addColorStop(1, p.dark);
    ctx.fillStyle = grad;
    ctx.fill();

    // Facet lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(tipX * 0.6, 0);
    ctx.lineTo(lobeX * 0.2, halfH * 0.4);
    ctx.lineTo(lobeX * 0.6, 0);
    ctx.lineTo(lobeX * 0.2, -halfH * 0.4);
    ctx.closePath();
    ctx.stroke();

    this.renderDiamondGlint(ctx, tipX * 0.4, -halfH * 0.25, 4.5);
  }

  // Draw Rectangle Gem (Emerald-cut, with gold bezel and directional front prong at right)
  private drawRectangleGem(
    ctx: CanvasRenderingContext2D,
    r: number,
    p: ReturnType<typeof this.getGemPalette>
  ) {
    const w = r * 1.7;
    const h = r * 1.2;
    const bevel = r * 0.3;

    // 1. Gold Bezel
    ctx.fillStyle = '#f59e0b';
    ctx.beginPath();
    this.roundOctagon(ctx, -w / 2 - 2.5, -h / 2 - 2.5, w + 5, h + 5, bevel + 1);
    ctx.fill();
    ctx.strokeStyle = '#fffbeb';
    ctx.lineWidth = 1.2;
    ctx.stroke();

    // Front directional chevron prong on right edge
    ctx.fillStyle = '#ffd700';
    ctx.beginPath();
    ctx.moveTo(w / 2 + 2, -h * 0.3);
    ctx.lineTo(w / 2 + 5.5, 0);
    ctx.lineTo(w / 2 + 2, h * 0.3);
    ctx.closePath();
    ctx.fill();

    // 2. Inner Gem Body
    ctx.beginPath();
    this.roundOctagon(ctx, -w / 2, -h / 2, w, h, bevel);
    const grad = ctx.createLinearGradient(-w / 2, -h / 2, w / 2, h / 2);
    grad.addColorStop(0, p.light);
    grad.addColorStop(0.3, p.base);
    grad.addColorStop(1, p.dark);
    ctx.fillStyle = grad;
    ctx.fill();

    // Inner table facet
    const iw = w * 0.55;
    const ih = h * 0.55;
    const ib = bevel * 0.55;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    this.roundOctagon(ctx, -iw / 2, -ih / 2, iw, ih, ib);
    ctx.stroke();

    // Corner rays
    ctx.beginPath();
    ctx.moveTo(-iw / 2, -ih / 2);
    ctx.lineTo(-w / 2 + bevel, -h / 2);
    ctx.moveTo(iw / 2, -ih / 2);
    ctx.lineTo(w / 2 - bevel, -h / 2);
    ctx.moveTo(iw / 2, ih / 2);
    ctx.lineTo(w / 2 - bevel, h / 2);
    ctx.moveTo(-iw / 2, ih / 2);
    ctx.lineTo(-w / 2 + bevel, h / 2);
    ctx.stroke();

    this.renderDiamondGlint(ctx, iw * 0.3, -ih * 0.3, 4.5);
  }

  // Draw Oval Gem (with front gold pointer prong)
  private drawOvalGem(
    ctx: CanvasRenderingContext2D,
    r: number,
    p: ReturnType<typeof this.getGemPalette>
  ) {
    const rx = r * 1.1;
    const ry = r * 0.85;

    // 1. Gold Bezel
    ctx.fillStyle = '#f59e0b';
    ctx.beginPath();
    ctx.ellipse(0, 0, rx + 2.5, ry + 2.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#fffbeb';
    ctx.lineWidth = 1.2;
    ctx.stroke();

    // Front directional gold accent prong at right
    ctx.fillStyle = '#ffd700';
    ctx.beginPath();
    ctx.moveTo(rx + 1, -ry * 0.35);
    ctx.lineTo(rx + 5, 0);
    ctx.lineTo(rx + 1, ry * 0.35);
    ctx.closePath();
    ctx.fill();

    // 2. Inner Gem Body
    ctx.beginPath();
    ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
    const grad = ctx.createRadialGradient(-rx * 0.25, -ry * 0.25, r * 0.1, 0, 0, rx * 1.1);
    grad.addColorStop(0, p.light);
    grad.addColorStop(0.4, p.base);
    grad.addColorStop(1, p.dark);
    ctx.fillStyle = grad;
    ctx.fill();

    // Inner facet
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.ellipse(0, 0, rx * 0.55, ry * 0.55, 0, 0, Math.PI * 2);
    ctx.stroke();

    this.renderDiamondGlint(ctx, rx * 0.25, -ry * 0.25, 4.5);
  }

  private roundOctagon(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    b: number
  ) {
    ctx.moveTo(x + b, y);
    ctx.lineTo(x + w - b, y);
    ctx.lineTo(x + w, y + b);
    ctx.lineTo(x + w, y + h - b);
    ctx.lineTo(x + w - b, y + h);
    ctx.lineTo(x + b, y + h);
    ctx.lineTo(x, y + h - b);
    ctx.lineTo(x, y + b);
    ctx.closePath();
  }

  // Diamond Starburst Glint
  private renderDiamondGlint(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    size: number
  ) {
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = '#ffffff';

    // 4-point cross glint
    ctx.beginPath();
    ctx.moveTo(0, -size);
    ctx.quadraticCurveTo(0, 0, size, 0);
    ctx.quadraticCurveTo(0, 0, 0, size);
    ctx.quadraticCurveTo(0, 0, -size, 0);
    ctx.quadraticCurveTo(0, 0, 0, -size);
    ctx.fill();

    ctx.restore();
  }

  // Directional cue indicator when blocked
  private drawDirectionalCue(ctx: CanvasRenderingContext2D, r: number) {
    ctx.save();
    ctx.strokeStyle = 'rgba(255, 215, 0, 0.85)';
    ctx.lineWidth = 2.2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(r * 1.3, -5);
    ctx.lineTo(r * 1.7, 0);
    ctx.lineTo(r * 1.3, 5);
    ctx.stroke();
    ctx.restore();
  }

  // 7. Collision Highlight on blocked obstacle cell
  private renderCollisionHighlight(
    ctx: CanvasRenderingContext2D,
    cell: Cell,
    layout: BoardLayout,
    timer: number
  ) {
    const pos = this.cellToPixel(cell, layout);
    const alpha = Math.min(1, timer / 0.35);

    ctx.save();
    ctx.strokeStyle = `rgba(239, 68, 68, ${alpha * 0.85})`;
    ctx.lineWidth = 2.5;
    ctx.setLineDash([4, 4]);

    const half = layout.cellSize * 0.44;
    ctx.strokeRect(pos.x - half, pos.y - half, half * 2, half * 2);
    ctx.restore();
  }

  // 8. Active Snake Removal & Portal Routing Animation
  private renderActiveRemoval(
    ctx: CanvasRenderingContext2D,
    removal: ActiveRemoval,
    layout: BoardLayout
  ) {
    const { piece, phase } = removal;
    const dir = DIR_DELTAS[removal.exitDirection];

    if (phase === 'EXITING') {
      // In-board snake withdrawal:
      // Head moves forward along exit vector:
      const t = Math.min(1, removal.elapsedTime / removal.exitDuration);
      // Distance traveled in grid units
      // Total travel distance is piece length + exit margin
      const totalSteps = removal.totalLengthCells + Math.max(layout.boardWidth, layout.boardHeight) / layout.cellSize + 2;
      const progressSteps = t * totalSteps;

      // Construct continuous polyline along snake's path
      // Start with original cells converted to pixels
      const origPixels = removal.startPath.map((c) => this.cellToPixel(c, layout));

      // Head moves along direction by progressSteps * cellSize
      const headAdvancement = progressSteps * layout.cellSize;
      const newHeadPixel = {
        x: origPixels[0].x + dir.dx * headAdvancement,
        y: origPixels[0].y + dir.dy * headAdvancement,
      };

      // Full active path for beads: [newHeadPixel, ...origPixels]
      const activePoints = [newHeadPixel, ...origPixels];

      // Measure total length of activePoints
      const distances: number[] = [0];
      let fullDist = 0;
      for (let i = 1; i < activePoints.length; i++) {
        fullDist += Math.hypot(
          activePoints[i].x - activePoints[i - 1].x,
          activePoints[i].y - activePoints[i - 1].y
        );
        distances.push(fullDist);
      }

      // Chain length in pixels:
      const chainLengthPx = (removal.totalLengthCells - 1) * layout.cellSize;

      // If head has advanced, tail must be cut off once advancement exceeds 0
      // We clip activePoints polyline between head (dist = 0) and tail (dist = chainLengthPx)
      const visibleSnakePoints = this.slicePolyline(activePoints, distances, 0, chainLengthPx);

      if (visibleSnakePoints.length > 0) {
        // Draw gold bead chain along visibleSnakePoints
        this.renderGoldBeadChain(ctx, visibleSnakePoints, layout.cellSize);

        // Draw Gem head at front
        const gemRadius = Math.max(14, layout.cellSize * 0.44) * 1.08; // Pop slightly
        this.renderGemCharm(
          ctx,
          visibleSnakePoints[0].x,
          visibleSnakePoints[0].y,
          gemRadius,
          piece.gemShape,
          piece.gemColor,
          piece.exitDirection,
          false
        );
      }
    } else {
      // Phase: ROUTING_TO_PORTAL
      // Smooth cubic bezier spline from board exit position to portal
      const t = Math.min(1, removal.elapsedTime / removal.portalDuration);
      const easeT = t * t * (3 - 2 * t); // smoothstep

      const startPos = removal.portalStartScreenPos || {
        x: layout.boardX + layout.boardWidth * 0.5,
        y: layout.boardY,
      };
      const endPos = { x: layout.portalX, y: layout.portalY };

      // Control points for nice dynamic cinematic curve
      const cp1 = {
        x: startPos.x + (endPos.x - startPos.x) * 0.2,
        y: startPos.y - 60,
      };
      const cp2 = {
        x: startPos.x + (endPos.x - startPos.x) * 0.8,
        y: endPos.y - 40,
      };

      // Current head position on bezier curve
      const headPos = this.getCubicBezierPoint(startPos, cp1, cp2, endPos, easeT);

      // Scale down and fade as it enters portal
      const scale = Math.max(0.15, 1 - easeT * 0.85);
      const alpha = Math.max(0, 1 - easeT * 0.75);

      ctx.save();
      ctx.globalAlpha = alpha;

      // Draw shrinking trailing beads along previous bezier samples
      const trailPoints: { x: number; y: number }[] = [headPos];
      const trailLength = Math.max(2, Math.floor((1 - easeT) * removal.totalLengthCells * 2));
      for (let i = 1; i <= trailLength; i++) {
        const trailT = Math.max(0, easeT - i * 0.04);
        trailPoints.push(this.getCubicBezierPoint(startPos, cp1, cp2, endPos, trailT));
      }

      const beadRadius = Math.max(1.6, layout.cellSize * 0.055 * scale);
      for (let i = 1; i < trailPoints.length; i++) {
        this.renderGoldBeadSphere(ctx, trailPoints[i].x, trailPoints[i].y, beadRadius);
      }

      // Draw Gem Head
      const gemRadius = Math.max(9, layout.cellSize * 0.44 * scale);
      this.renderGemCharm(
        ctx,
        headPos.x,
        headPos.y,
        gemRadius,
        piece.gemShape,
        piece.gemColor,
        piece.exitDirection,
        false
      );

      ctx.restore();
    }
  }

  private slicePolyline(
    points: { x: number; y: number }[],
    distances: number[],
    startDist: number,
    endDist: number
  ): { x: number; y: number }[] {
    if (points.length < 2) return points;

    const result: { x: number; y: number }[] = [];
    const totalDist = distances[distances.length - 1];
    const clampedEnd = Math.min(totalDist, endDist);

    if (startDist >= clampedEnd) return [];

    // Sample points along polyline from startDist to clampedEnd
    const step = 8;
    for (let d = startDist; d <= clampedEnd; d += step) {
      result.push(this.getPointAtDistance(points, distances, d));
    }
    // Always include exact end point
    result.push(this.getPointAtDistance(points, distances, clampedEnd));

    return result;
  }

  private getPointAtDistance(
    points: { x: number; y: number }[],
    distances: number[],
    dist: number
  ): { x: number; y: number } {
    if (dist <= 0) return points[0];
    const maxD = distances[distances.length - 1];
    if (dist >= maxD) return points[points.length - 1];

    let segIdx = 0;
    for (let i = 1; i < distances.length; i++) {
      if (distances[i] >= dist) {
        segIdx = i - 1;
        break;
      }
    }

    const segStartDist = distances[segIdx];
    const segEndDist = distances[segIdx + 1];
    const segLen = segEndDist - segStartDist;
    const t = segLen > 0 ? (dist - segStartDist) / segLen : 0;

    return {
      x: points[segIdx].x + (points[segIdx + 1].x - points[segIdx].x) * t,
      y: points[segIdx].y + (points[segIdx + 1].y - points[segIdx].y) * t,
    };
  }

  private getCubicBezierPoint(
    p0: { x: number; y: number },
    p1: { x: number; y: number },
    p2: { x: number; y: number },
    p3: { x: number; y: number },
    t: number
  ): { x: number; y: number } {
    const inv = 1 - t;
    return {
      x:
        inv * inv * inv * p0.x +
        3 * inv * inv * t * p1.x +
        3 * inv * t * t * p2.x +
        t * t * t * p3.x,
      y:
        inv * inv * inv * p0.y +
        3 * inv * inv * t * p1.y +
        3 * inv * t * t * p2.y +
        t * t * t * p3.y,
    };
  }

  // 9. Particles
  private renderParticles(ctx: CanvasRenderingContext2D) {
    for (const p of this.particles) {
      const alpha = Math.max(0, 1 - p.life / p.maxLife);
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation);
      ctx.fillStyle = p.color;

      // 4-pointed sparkle
      const s = p.size;
      ctx.beginPath();
      ctx.moveTo(0, -s);
      ctx.quadraticCurveTo(0, 0, s, 0);
      ctx.quadraticCurveTo(0, 0, 0, s);
      ctx.quadraticCurveTo(0, 0, -s, 0);
      ctx.quadraticCurveTo(0, 0, 0, -s);
      ctx.fill();

      ctx.restore();
    }
  }

  // 10. Luxury Sapphire Quilted Handbag Reveal
  // Accurately matches Reference Image 2:
  // - Sapphire quilted leather with golden lattice stitches
  // - Diamond studs at quilt intersections
  // - Gold diamond-encrusted borders
  // - Centerpiece brooch with oval sapphire, ruby, and emerald
  // - Curved arched diamond handle
  // - Diagonal shine sweep
  private renderLuxuryHandbagReveal(
    ctx: CanvasRenderingContext2D,
    layout: BoardLayout,
    progress: number,
    settings: GameSettings
  ) {
    const alpha = Math.min(1, progress * 1.25);
    ctx.save();
    ctx.globalAlpha = alpha;

    const { boardX, boardY, boardWidth, boardHeight } = layout;

    // Silhouette bounds
    const bagLeft = boardX + boardWidth * 0.08;
    const bagRight = boardX + boardWidth * 0.92;
    const bagTop = boardY + boardHeight * 0.21;
    const bagBottom = boardY + boardHeight * 0.96;
    const bagW = bagRight - bagLeft;
    const bagH = bagBottom - bagTop;

    // Handle bounds
    const handleW = bagW * 0.40;
    const handleH = bagH * 0.36;
    const handleCenterX = boardX + boardWidth * 0.5;
    const handleBottomY = bagTop + 8;

    // If custom original reveal image is provided, draw it directly!
    if (this.customRevealImage && this.customRevealImage.complete && this.customRevealImage.naturalWidth > 0) {
      const img = this.customRevealImage;
      const imgAspect = img.naturalWidth / img.naturalHeight;
      const canvasAspect = ctx.canvas.width / ctx.canvas.height;
      let dw = ctx.canvas.width;
      let dh = ctx.canvas.height;
      let dx = 0;
      let dy = 0;
      if (imgAspect > canvasAspect) {
        dw = dh * imgAspect;
        dx = (ctx.canvas.width - dw) / 2;
      } else {
        dh = dw / imgAspect;
        dy = (ctx.canvas.height - dh) / 2;
      }
      ctx.drawImage(img, dx, dy, dw, dh);

      // Subtle shine sweep and diamond starburst sparkles over the original image
      if (!settings.reducedMotion && progress > 0.3) {
        this.revealSweepProgress = Math.min(1, this.revealSweepProgress + 0.015);
        this.renderShineSweep(ctx, bagLeft, bagTop - handleH * 0.8, bagW, bagH + handleH);
      }
      if (!settings.reducedMotion && Math.random() < 0.25) {
        this.addRevealSparkles({ x: bagLeft, y: bagTop, width: bagW, height: bagH }, 1);
      }
      ctx.restore();
      return;
    }

    // 1. Draw Arched Diamond-Paved Handle
    this.renderHandbagHandle(ctx, handleCenterX, handleBottomY, handleW, handleH);

    // 2. Draw Main Quilted Sapphire Body
    this.renderQuiltedSapphireBody(ctx, bagLeft, bagTop, bagW, bagH);

    // 3. Draw Flap with Diamond Border & Centerpiece Brooch
    this.renderHandbagFlap(ctx, bagLeft, bagTop, bagW, bagH);

    // 4. Diagonal Shine Sweep Ray
    if (!settings.reducedMotion && progress > 0.4) {
      this.revealSweepProgress = Math.min(1, this.revealSweepProgress + 0.015);
      this.renderShineSweep(ctx, bagLeft, bagTop - handleH * 0.8, bagW, bagH + handleH);
    }

    // 5. Ambient diamond sparkles on bag
    if (!settings.reducedMotion && Math.random() < 0.2) {
      this.addRevealSparkles({ x: bagLeft, y: bagTop, width: bagW, height: bagH }, 1);
    }

    ctx.restore();
  }

  private renderHandbagHandle(
    ctx: CanvasRenderingContext2D,
    cx: number,
    bottomY: number,
    w: number,
    h: number
  ) {
    ctx.save();

    // Outer gold arch
    ctx.strokeStyle = '#d4af37';
    ctx.lineWidth = 14;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.ellipse(cx, bottomY, w * 0.5, h, 0, Math.PI, 0);
    ctx.stroke();

    // Inner bright gold bevel
    ctx.strokeStyle = '#ffe58f';
    ctx.lineWidth = 10;
    ctx.beginPath();
    ctx.ellipse(cx, bottomY, w * 0.5, h, 0, Math.PI, 0);
    ctx.stroke();

    // Row of sparkling diamonds inside handle arch
    const diamondCount = 18;
    for (let i = 0; i <= diamondCount; i++) {
      const angle = Math.PI + (i / diamondCount) * Math.PI;
      const dx = cx + Math.cos(angle) * (w * 0.5);
      const dy = bottomY + Math.sin(angle) * h;

      // Diamond sphere
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(dx, dy, 2.5, 0, Math.PI * 2);
      ctx.fill();

      // Specular highlight
      ctx.fillStyle = '#f0f9ff';
      ctx.beginPath();
      ctx.arc(dx - 0.7, dy - 0.7, 1.2, 0, Math.PI * 2);
      ctx.fill();
    }

    // Handle gold hinge connectors
    [-w * 0.5, w * 0.5].forEach((offset) => {
      ctx.fillStyle = '#f59e0b';
      ctx.fillRect(cx + offset - 6, bottomY - 14, 12, 18);
      ctx.strokeStyle = '#fffbeb';
      ctx.lineWidth = 1.2;
      ctx.strokeRect(cx + offset - 6, bottomY - 14, 12, 18);
    });

    ctx.restore();
  }

  private renderQuiltedSapphireBody(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number
  ) {
    ctx.save();

    // Trapezoid body path with rounded bottom
    ctx.beginPath();
    const insetTop = w * 0.08;
    const radius = 24;
    ctx.moveTo(x + insetTop, y + 15);
    ctx.lineTo(x + w - insetTop, y + 15);
    ctx.lineTo(x + w, y + h - radius);
    ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
    ctx.lineTo(x + radius, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
    ctx.closePath();

    // Base deep sapphire blue radial gradient
    const bagGrad = ctx.createRadialGradient(x + w * 0.5, y + h * 0.45, w * 0.1, x + w * 0.5, y + h * 0.5, w * 0.7);
    bagGrad.addColorStop(0, '#1a44a5');
    bagGrad.addColorStop(0.5, '#0e2b77');
    bagGrad.addColorStop(1, '#071642');
    ctx.fillStyle = bagGrad;
    ctx.fill();

    // Clip to body to draw quilting lattice
    ctx.save();
    ctx.clip();

    // Diamond quilted grid
    const quiltSize = w * 0.17;
    ctx.strokeStyle = 'rgba(212, 175, 55, 0.75)'; // gold stitches
    ctx.lineWidth = 1.6;

    // Diagonal lines / \
    for (let d = -w; d < w * 2 + h; d += quiltSize) {
      // Line 1: top-left to bottom-right
      ctx.beginPath();
      ctx.moveTo(x + d, y);
      ctx.lineTo(x + d + h, y + h);
      ctx.stroke();

      // Line 2: top-right to bottom-left
      ctx.beginPath();
      ctx.moveTo(x + d, y);
      ctx.lineTo(x + d - h, y + h);
      ctx.stroke();
    }

    // Gold diamond studs at quilt intersections
    for (let row = 0; row < 7; row++) {
      for (let col = -2; col < 8; col++) {
        const sx = x + (col + (row % 2) * 0.5) * quiltSize;
        const sy = y + row * (quiltSize * 0.5);
        if (sx > x && sx < x + w && sy > y + 15 && sy < y + h) {
          // Golden stud
          ctx.fillStyle = '#f59e0b';
          ctx.beginPath();
          ctx.arc(sx, sy, 3.2, 0, Math.PI * 2);
          ctx.fill();
          // Diamond center
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(sx, sy, 1.6, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    ctx.restore(); // unclip

    // Outer gold trim with diamonds around perimeter
    ctx.strokeStyle = '#d4af37';
    ctx.lineWidth = 6;
    ctx.stroke();

    // Perimeter diamond dots
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2.4;
    ctx.setLineDash([4, 6]);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.restore();
  }

  private renderHandbagFlap(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number
  ) {
    ctx.save();

    const flapH = h * 0.36;
    const flapInset = w * 0.05;

    // Flap contour: rounded rectangular flap
    ctx.beginPath();
    ctx.moveTo(x + flapInset + 10, y);
    ctx.lineTo(x + w - flapInset - 10, y);
    ctx.quadraticCurveTo(x + w - flapInset, y, x + w - flapInset, y + 10);
    ctx.lineTo(x + w - flapInset, y + flapH - 12);
    ctx.quadraticCurveTo(x + w - flapInset, y + flapH, x + w - flapInset - 14, y + flapH);
    ctx.lineTo(x + flapInset + 14, y + flapH);
    ctx.quadraticCurveTo(x + flapInset, y + flapH, x + flapInset, y + flapH - 12);
    ctx.lineTo(x + flapInset, y + 10);
    ctx.quadraticCurveTo(x + flapInset, y, x + flapInset + 10, y);
    ctx.closePath();

    // Flap sapphire gradient
    const flapGrad = ctx.createLinearGradient(x, y, x, y + flapH);
    flapGrad.addColorStop(0, '#1b419b');
    flapGrad.addColorStop(1, '#0c2364');
    ctx.fillStyle = flapGrad;
    ctx.fill();

    // Gold diamond-paved border on flap
    ctx.strokeStyle = '#d4af37';
    ctx.lineWidth = 5;
    ctx.stroke();

    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2.2;
    ctx.setLineDash([3, 5]);
    ctx.stroke();
    ctx.setLineDash([]);

    // Royal Centerpiece Brooch Clasp on the flap center!
    const broochX = x + w * 0.5;
    const broochY = y + flapH - 2;
    this.renderCenterpieceBrooch(ctx, broochX, broochY, w * 0.08);

    ctx.restore();
  }

  private renderCenterpieceBrooch(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    radius: number
  ) {
    ctx.save();
    ctx.translate(cx, cy);

    // Gold filigree scalloped halo
    ctx.fillStyle = '#f59e0b';
    ctx.beginPath();
    ctx.ellipse(0, 0, radius * 1.5, radius * 1.9, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#fffbeb';
    ctx.lineWidth = 1.2;
    ctx.stroke();

    // Halo diamonds
    const count = 10;
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      const dx = Math.cos(angle) * (radius * 1.3);
      const dy = Math.sin(angle) * (radius * 1.6);
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(dx, dy, 2, 0, Math.PI * 2);
      ctx.fill();
    }

    // 1. Center Royal Sapphire Oval Gem
    const sapGrad = ctx.createRadialGradient(-2, -3, 2, 0, 0, radius * 1.1);
    sapGrad.addColorStop(0, '#60a5fa');
    sapGrad.addColorStop(0.4, '#1d4ed8');
    sapGrad.addColorStop(1, '#0f172a');
    ctx.fillStyle = sapGrad;
    ctx.beginPath();
    ctx.ellipse(0, 0, radius * 0.85, radius * 1.2, 0, 0, Math.PI * 2);
    ctx.fill();

    // Center sapphire facets & glint
    this.renderDiamondGlint(ctx, -radius * 0.2, -radius * 0.35, 4.5);

    // 2. Left Ruby Pear Gem
    ctx.save();
    ctx.translate(-radius * 1.05, 0);
    ctx.rotate(Math.PI * 0.5);
    this.drawPearGem(ctx, radius * 0.55, this.getGemPalette('ruby'));
    ctx.restore();

    // 3. Right Emerald Pear Gem
    ctx.save();
    ctx.translate(radius * 1.05, 0);
    ctx.rotate(-Math.PI * 0.5);
    this.drawPearGem(ctx, radius * 0.55, this.getGemPalette('emerald'));
    ctx.restore();

    ctx.restore();
  }

  // Diagonal Shine Sweep Ray across the bag
  private renderShineSweep(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number
  ) {
    ctx.save();

    const sweepX = x - w * 0.3 + (w * 1.6) * this.revealSweepProgress;

    const shineGrad = ctx.createLinearGradient(sweepX - 45, y, sweepX + 45, y);
    shineGrad.addColorStop(0, 'rgba(255, 255, 255, 0)');
    shineGrad.addColorStop(0.5, 'rgba(255, 255, 255, 0.45)');
    shineGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');

    ctx.fillStyle = shineGrad;
    ctx.fillRect(x - 20, y, w + 40, h);

    ctx.restore();
  }

  // Debug Grid
  private renderDebugGrid(ctx: CanvasRenderingContext2D, layout: BoardLayout, level: LevelData) {
    ctx.save();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
    ctx.lineWidth = 1;

    for (let c = 0; c <= level.gridWidth; c++) {
      const gx = layout.boardX + c * layout.cellSize;
      ctx.beginPath();
      ctx.moveTo(gx, layout.boardY);
      ctx.lineTo(gx, layout.boardY + layout.boardHeight);
      ctx.stroke();
    }
    for (let r = 0; r <= level.gridHeight; r++) {
      const gy = layout.boardY + r * layout.cellSize;
      ctx.beginPath();
      ctx.moveTo(layout.boardX, gy);
      ctx.lineTo(layout.boardX + layout.boardWidth, gy);
      ctx.stroke();
    }
    ctx.restore();
  }
}
