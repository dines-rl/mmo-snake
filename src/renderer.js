export class Renderer {
  constructor(canvas, minimapCanvas, config) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.minimap = minimapCanvas;
    this.mctx = minimapCanvas.getContext('2d');
    this.config = config;
    this.gridPixelW = config.gridW * config.cellSize;
    this.gridPixelH = config.gridH * config.cellSize;

    // Minimap dimensions
    this.minimap.width = 160;
    this.minimap.height = 120;
  }

  draw(state, camera, myId) {
    const { ctx, canvas, config } = this;
    const { cellSize, gridW, gridH } = config;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Background
    ctx.fillStyle = '#0a0a1a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    ctx.translate(-camera.x, -camera.y);

    // Draw grid
    this.drawGrid(camera);

    // Draw world border
    ctx.strokeStyle = 'rgba(255, 50, 50, 0.4)';
    ctx.lineWidth = 3;
    ctx.strokeRect(0, 0, gridW * cellSize, gridH * cellSize);

    // Draw food
    for (const f of state.food) {
      const fx = f.x * cellSize;
      const fy = f.y * cellSize;

      // Skip off-screen food
      if (fx + cellSize < camera.x || fx > camera.x + canvas.width ||
          fy + cellSize < camera.y || fy > camera.y + canvas.height) continue;

      const size = cellSize * (0.4 + f.value * 0.12);
      const offset = (cellSize - size) / 2;

      ctx.fillStyle = `hsl(${f.hue}, 90%, 60%)`;
      ctx.shadowColor = `hsl(${f.hue}, 100%, 50%)`;
      ctx.shadowBlur = 6;
      ctx.beginPath();
      ctx.arc(fx + cellSize / 2, fy + cellSize / 2, size / 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    // Draw snakes
    for (const snake of state.snakes) {
      if (!snake.alive) continue;
      this.drawSnake(snake, snake.id === myId, camera);
    }

    ctx.restore();

    // Draw minimap
    this.drawMinimap(state, camera, myId);
  }

  drawGrid(camera) {
    const { ctx, canvas, config } = this;
    const { cellSize, gridW, gridH } = config;

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
    ctx.lineWidth = 1;

    const startX = Math.max(0, Math.floor(camera.x / cellSize) * cellSize);
    const endX = Math.min(gridW * cellSize, camera.x + canvas.width + cellSize);
    const startY = Math.max(0, Math.floor(camera.y / cellSize) * cellSize);
    const endY = Math.min(gridH * cellSize, camera.y + canvas.height + cellSize);

    ctx.beginPath();
    for (let x = startX; x <= endX; x += cellSize) {
      ctx.moveTo(x, startY);
      ctx.lineTo(x, endY);
    }
    for (let y = startY; y <= endY; y += cellSize) {
      ctx.moveTo(startX, y);
      ctx.lineTo(endX, y);
    }
    ctx.stroke();
  }

  drawSnake(snake, isMe, camera) {
    const { ctx, canvas, config } = this;
    const { cellSize } = config;
    const hue = snake.hue;

    const segments = snake.segments;
    if (segments.length === 0) return;

    // Draw body segments
    for (let i = segments.length - 1; i >= 0; i--) {
      const seg = segments[i];
      const x = seg.x * cellSize;
      const y = seg.y * cellSize;

      // Skip off-screen segments (with padding for glow)
      if (x + cellSize < camera.x - 20 || x > camera.x + canvas.width + 20 ||
          y + cellSize < camera.y - 20 || y > camera.y + canvas.height + 20) continue;

      const t = i / Math.max(segments.length - 1, 1);
      const lightness = 55 - t * 15;
      const saturation = isMe ? 85 : 65;

      if (i === 0) {
        // Head - slightly larger with glow
        if (isMe) {
          ctx.shadowColor = `hsl(${hue}, 100%, 50%)`;
          ctx.shadowBlur = 12;
        }
        ctx.fillStyle = `hsl(${hue}, ${saturation}%, ${lightness + 10}%)`;
        const pad = -1;
        ctx.beginPath();
        ctx.roundRect(x + pad, y + pad, cellSize - pad * 2, cellSize - pad * 2, 3);
        ctx.fill();
        ctx.shadowBlur = 0;

        // Eyes
        this.drawEyes(segments, x, y, cellSize);
      } else {
        ctx.fillStyle = `hsl(${hue}, ${saturation}%, ${lightness}%)`;
        const gap = 1;
        ctx.fillRect(x + gap, y + gap, cellSize - gap * 2, cellSize - gap * 2);
      }
    }

    // Draw name above head
    const head = segments[0];
    const hx = head.x * cellSize + cellSize / 2;
    const hy = head.y * cellSize - 8;

    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = isMe ? '#fff' : 'rgba(255,255,255,0.7)';
    ctx.fillText(snake.name, hx, hy);

    if (snake.score > 0) {
      ctx.font = '10px sans-serif';
      ctx.fillStyle = `hsl(${hue}, 80%, 70%)`;
      ctx.fillText(snake.score, hx, hy - 13);
    }
  }

  drawEyes(segments, x, y, cellSize) {
    const { ctx } = this;
    // Determine direction from first two segments
    let dx = 1, dy = 0;
    if (segments.length > 1) {
      dx = segments[0].x - segments[1].x;
      dy = segments[0].y - segments[1].y;
      // Handle wrapping
      if (Math.abs(dx) > 1) dx = -Math.sign(dx);
      if (Math.abs(dy) > 1) dy = -Math.sign(dy);
    }

    const cx = x + cellSize / 2;
    const cy = y + cellSize / 2;
    const eyeOffset = cellSize * 0.22;
    const eyeRadius = cellSize * 0.12;
    const pupilRadius = cellSize * 0.06;

    let e1x, e1y, e2x, e2y;
    if (dx !== 0) {
      // Moving horizontally
      e1x = cx + dx * eyeOffset * 0.5;
      e1y = cy - eyeOffset;
      e2x = cx + dx * eyeOffset * 0.5;
      e2y = cy + eyeOffset;
    } else {
      // Moving vertically
      e1x = cx - eyeOffset;
      e1y = cy + dy * eyeOffset * 0.5;
      e2x = cx + eyeOffset;
      e2y = cy + dy * eyeOffset * 0.5;
    }

    // White of eyes
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(e1x, e1y, eyeRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(e2x, e2y, eyeRadius, 0, Math.PI * 2);
    ctx.fill();

    // Pupils
    ctx.fillStyle = '#111';
    ctx.beginPath();
    ctx.arc(e1x + dx * pupilRadius * 0.5, e1y + dy * pupilRadius * 0.5, pupilRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(e2x + dx * pupilRadius * 0.5, e2y + dy * pupilRadius * 0.5, pupilRadius, 0, Math.PI * 2);
    ctx.fill();
  }

  drawMinimap(state, camera, myId) {
    const { mctx, minimap, config } = this;
    const mw = minimap.width;
    const mh = minimap.height;
    const scaleX = mw / (config.gridW * config.cellSize);
    const scaleY = mh / (config.gridH * config.cellSize);

    mctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    mctx.fillRect(0, 0, mw, mh);

    // Draw food as dots
    mctx.fillStyle = 'rgba(255, 255, 0, 0.3)';
    for (const f of state.food) {
      mctx.fillRect(
        f.x * config.cellSize * scaleX,
        f.y * config.cellSize * scaleY,
        1, 1
      );
    }

    // Draw snakes
    for (const snake of state.snakes) {
      if (!snake.alive || snake.segments.length === 0) continue;
      const head = snake.segments[0];
      const isMe = snake.id === myId;

      mctx.fillStyle = isMe
        ? '#fff'
        : `hsl(${snake.hue}, 80%, 60%)`;

      const sx = head.x * config.cellSize * scaleX;
      const sy = head.y * config.cellSize * scaleY;
      const size = isMe ? 4 : 2;
      mctx.fillRect(sx - size / 2, sy - size / 2, size, size);
    }

    // Draw viewport rectangle
    mctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
    mctx.lineWidth = 1;
    mctx.strokeRect(
      camera.x * scaleX,
      camera.y * scaleY,
      this.canvas.width * scaleX,
      this.canvas.height * scaleY
    );
  }
}
