
class SquareGridNMosaicRenderer {
  // Drawing state and canvas contexts. NMosaic itself contains no drawing code.
  PALETTE = [
    "#cb4450",
    "#70c941",
    "#3888cb",
    "#c9ae38",
    "#8a49cc",
    "#ca7b35",
    "#3bc9be",
    "#34495e",
  ];
  ctx;
  paletteCtx;
  WIDTH;
  HEIGHT;
  PALETTE_WIDTH;
  PALETTE_HEIGHT;
  showSolution = false;

  constructor(canvas, paletteCanvas) {
    this.ctx = canvas.getContext("2d");
    this.paletteCtx = paletteCanvas.getContext("2d");
    this.WIDTH = canvas.width;
    this.HEIGHT = canvas.height;
    this.PALETTE_WIDTH = paletteCanvas.width;
    this.PALETTE_HEIGHT = paletteCanvas.height;
  }

  drawBackground(nMosaic) {
    this.ctx.fillStyle = "#808080";
    this.ctx.fillRect(0, 0, this.WIDTH, this.HEIGHT);
    const squareWidth = this.WIDTH / nMosaic.BOARD_WIDTH;
    const squareHeight = this.HEIGHT / nMosaic.BOARD_HEIGHT;

    this.ctx.strokeStyle = "#000000";
    this.ctx.lineWidth = 1;

    for (let row = 0; row <= nMosaic.BOARD_HEIGHT; row++) {
      this.ctx.beginPath();
      this.ctx.moveTo(0, row * squareHeight);
      this.ctx.lineTo(this.WIDTH, row * squareHeight);
      this.ctx.stroke();
    }

    for (let col = 0; col <= nMosaic.BOARD_WIDTH; col++) {
      this.ctx.beginPath();
      this.ctx.moveTo(col * squareWidth, 0);
      this.ctx.lineTo(col * squareWidth, this.HEIGHT);
      this.ctx.stroke();
    }
  }

  drawPalette(nMosaic) {
    this.paletteCtx.fillStyle = "#808080";
    this.paletteCtx.fillRect(0, 0, this.PALETTE_WIDTH, this.PALETTE_HEIGHT);

    const swatchSize = 44;
    const gap = 10;
    const spacing = swatchSize + gap;
    const totalHeight = nMosaic.BOARD_COLORS * spacing - gap;
    const startX = (this.PALETTE_WIDTH - swatchSize) / 2;
    const startY = (this.PALETTE_HEIGHT - totalHeight) / 2;

    for (let i = 0; i < nMosaic.BOARD_COLORS; i++) {
      const x = startX;
      const y = startY + i * spacing;

      this.paletteCtx.fillStyle = this.PALETTE[i];
      this.paletteCtx.fillRect(x, y, swatchSize, swatchSize);

      if (i === nMosaic.selectedColor) {
        this.paletteCtx.strokeStyle = "#ffffff";
        this.paletteCtx.lineWidth = 3;
        this.paletteCtx.strokeRect(x, y, swatchSize, swatchSize);
      }
    }

    // Pencil-mode toggle button at the bottom of the palette.
    const buttonSize = 44;
    const bx = (this.PALETTE_WIDTH - buttonSize) / 2;
    const by = this.PALETTE_HEIGHT - buttonSize - 15;
    this.drawPencilButton(nMosaic, bx, by, buttonSize);
  }

  drawPencilButton(nMosaic, x, y, size) {
    const g = this.paletteCtx;

    g.fillStyle = "#606060";
    g.fillRect(x, y, size, size);
    g.strokeStyle = "#000000";
    g.lineWidth = 2;
    g.strokeRect(x, y, size, size);

    // Pencil drawn pointing up-right.
    const cx = x + size / 2;
    const cy = y + size / 2;
    const s = size * 0.5;
    const half = s * 0.28;
    const tipLen = s * 0.42;
    const bodyLen = s * 0.58;
    const tip = -s / 2;

    g.save();
    g.translate(cx, cy);
    g.rotate(-Math.PI / 4);
    g.lineWidth = 1.5;

    // Wood of the tip.
    g.fillStyle = "#f2d8a7";
    g.beginPath();
    g.moveTo(0, tip);
    g.lineTo(-half, tip + tipLen);
    g.lineTo(half, tip + tipLen);
    g.closePath();
    g.fill();
    g.stroke();

    // Graphite point.
    g.fillStyle = "#333333";
    g.beginPath();
    g.moveTo(0, tip);
    g.lineTo(-half * 0.55, tip + tipLen * 0.5);
    g.lineTo(half * 0.55, tip + tipLen * 0.5);
    g.closePath();
    g.fill();
    g.stroke();

    // Body, in the currently selected color.
    g.fillStyle = this.PALETTE[nMosaic.selectedColor];
    g.fillRect(-half, tip + tipLen, 2 * half, bodyLen);
    g.strokeRect(-half, tip + tipLen, 2 * half, bodyLen);

    // Eraser.
    g.fillStyle = "#c8a4c8";
    g.fillRect(-half, tip + tipLen + bodyLen - 2, 2 * half, s * 0.1);
    g.strokeRect(-half, tip + tipLen + bodyLen - 2, 2 * half, s * 0.1);
    g.restore();

    if (nMosaic.pencilMode) {
      g.strokeStyle = "#ffffff";
      g.lineWidth = 3;
      g.strokeRect(x, y, size, size);
    }
  }

  drawBoard(nMosaic) {
    const squareWidth = this.WIDTH / nMosaic.BOARD_WIDTH;
    const squareHeight = this.HEIGHT / nMosaic.BOARD_HEIGHT;
    const fontSize = Math.max(10, Math.min(squareWidth, squareHeight) * 0.6);

    for (const cell of nMosaic.cells) {
      if (!cell.included) {
        this.ctx.fillStyle = "#000000";
        this.ctx.fillRect(
          cell.col * squareWidth + 1,
          cell.row * squareHeight + 1,
          squareWidth - 2,
          squareHeight - 2,
        );
        continue;
      }
      const value = this.showSolution ? cell.solutionColor : cell.color;
      if (value !== null) {
        this.ctx.fillStyle = this.PALETTE[value];
        this.ctx.fillRect(
          cell.col * squareWidth + 1,
          cell.row * squareHeight + 1,
          squareWidth - 2,
          squareHeight - 2,
        );
      }
    }

    // Pencil marks (candidate colors) on uncoloured cells, laid out in
    // a compact grid the way sudoku apps show candidates.
    if (!this.showSolution) {
      const cols = nMosaic.BOARD_COLORS <= 4 ? 2 : nMosaic.BOARD_COLORS <= 6 ? 3 : 4;
      const rows = Math.ceil(nMosaic.BOARD_COLORS / cols);
      const subW = squareWidth / cols;
      const subH = squareHeight / rows;
      const dotR = Math.max(2, Math.min(subW, subH) * 0.28);

      for (const cell of nMosaic.cells) {
        if (
          !cell.included ||
          cell.color !== null ||
          cell.pencilMarks.size === 0
        )
          continue;
        for (const color of cell.pencilMarks) {
          const colIdx = color % cols;
          const rowIdx = Math.floor(color / cols);
          const dx = cell.col * squareWidth + (colIdx + 0.5) * subW;
          const dy = cell.row * squareHeight + (rowIdx + 0.5) * subH;
          this.ctx.fillStyle = this.PALETTE[color];
          this.ctx.beginPath();
          this.ctx.arc(dx, dy, dotR, 0, 2 * Math.PI);
          this.ctx.fill();
        }
      }
    }

    this.ctx.font = `bold ${fontSize}px "Roboto Mono", monospace`;
    this.ctx.textAlign = "center";
    this.ctx.textBaseline = "middle";

    // Group clues by cell so we can render multi-clue cells properly.
    const cluesByCell = new Map();
    for (const clue of nMosaic.clues) {
      if (clue.color === null) continue;
      const key = `${clue.row},${clue.col}`;
      if (!cluesByCell.has(key)) cluesByCell.set(key, []);
      cluesByCell.get(key).push(clue);
    }

    for (const [cellKey, cellClues] of cluesByCell) {
      const clue = cellClues[0];
      const clueCell = nMosaic.getCell(clue.row, clue.col);

      // Validate every clue on this cell; draw a red X if any is wrong.
      let anyInvalid = false;
      for (const c of cellClues) {
        let positiveGuessCount = 0;
        let negativeGuessCount = 0;
        let totalSpaces = 0;
        for (const neighbor of clueCell.neighbors) {
          totalSpaces += 1;
          if (neighbor.color === c.color) positiveGuessCount += 1;
          if (neighbor.color !== null && neighbor.color !== c.color)
            negativeGuessCount += 1;
        }
        if (
          positiveGuessCount > c.count ||
          totalSpaces - negativeGuessCount < c.count
        ) {
          anyInvalid = true;
          break;
        }
      }

      if (anyInvalid) {
        this.ctx.strokeStyle = "#ff0000";
        this.ctx.lineWidth = 3;
        const x1 = clue.col * squareWidth;
        const y1 = clue.row * squareHeight;
        const x2 = (clue.col + 1) * squareWidth;
        const y2 = (clue.row + 1) * squareHeight;
        this.ctx.beginPath();
        this.ctx.moveTo(x1, y1);
        this.ctx.lineTo(x2, y2);
        this.ctx.moveTo(x2, y1);
        this.ctx.lineTo(x1, y2);
        this.ctx.stroke();
      }

      this.ctx.font = `bold ${fontSize + 2}px "Roboto Mono", monospace`;
      const cx = (clue.col + 0.5) * squareWidth;
      const cy = (clue.row + 0.5) * squareHeight;

      if (cellClues.length === 1) {
        // Single clue — draw as before.
        this.ctx.fillStyle = this.PALETTE[clue.color];
        this.ctx.fillText(clue.count.toString(), cx, cy);
        this.ctx.strokeStyle = "#000000";
        this.ctx.lineWidth = 1;
        this.ctx.strokeText(clue.count.toString(), cx, cy);
      } else {
        // Multiple clues — comma-separated, each number in its clue
        // color.  Shrink the font if the text won't fit the cell.
        const parts = [];
        for (let i = 0; i < cellClues.length; i++) {
          if (i > 0) parts.push({ text: ",", color: null });
          parts.push({
            text: cellClues[i].count.toString(),
            color: this.PALETTE[cellClues[i].color],
          });
        }

        const baseFontSize = fontSize + 2;
        this.ctx.font = `bold ${baseFontSize}px "Roboto Mono", monospace`;
        const maxWidth = squareWidth - 6;
        let totalWidth = parts.reduce(
          (acc, p) => acc + this.ctx.measureText(p.text).width,
          0,
        );
        const drawFontSize =
          totalWidth > maxWidth
            ? Math.max(8, Math.floor((baseFontSize * maxWidth) / totalWidth))
            : baseFontSize;
        this.ctx.font = `bold ${drawFontSize}px "Roboto Mono", monospace`;

        totalWidth = parts.reduce(
          (acc, p) => acc + this.ctx.measureText(p.text).width,
          0,
        );
        let x = cx - totalWidth / 2;

        for (const part of parts) {
          const partWidth = this.ctx.measureText(part.text).width;
          const px = x + partWidth / 2;
          if (part.color !== null) {
            this.ctx.fillStyle = part.color;
            this.ctx.fillText(part.text, px, cy);
            this.ctx.strokeStyle = "#000000";
            this.ctx.lineWidth = 1;
            this.ctx.strokeText(part.text, px, cy);
          } else {
            this.ctx.fillStyle = "#000000";
            this.ctx.fillText(part.text, px, cy);
          }
          x += partWidth;
        }
      }
    }

    if (nMosaic.puzzleComplete) {
      this.ctx.font = `bold 96px "Roboto Mono", monospace`;
      this.ctx.fillStyle = "#ffffff";
      this.ctx.fillText("YOU WIN", this.WIDTH / 2, this.HEIGHT / 2, this.WIDTH);
      this.ctx.strokeStyle = "#000000";
      this.ctx.lineWidth = 1;
      this.ctx.strokeText(
        "YOU WIN",
        this.WIDTH / 2,
        this.HEIGHT / 2,
        this.WIDTH,
      );
    }
  }
}

// Shared input handling for a NMosaic board: painting cells, erasing,
// pencil marks, palette selection, colour cycling and win detection.
// Used by both the main game page and the test dashboard sandbox.
class NMosaicGameController {
  constructor(renderer, nMosaic, boardCanvas, paletteCanvas, onChange) {
    this.renderer = renderer;
    this.nMosaic = nMosaic;
    this.boardCanvas = boardCanvas;
    this.paletteCanvas = paletteCanvas;
    // Called after a stroke that actually changes the board.
    this.onChange = onChange ?? (() => {});

    this.isPainting = false;
    this.paintButton = 0;

    this.boardCanvas.addEventListener("mousedown", (e) => this.startPaint(e));
    this.boardCanvas.addEventListener("mousemove", (e) => this.continuePaint(e));
    window.addEventListener("mouseup", (e) => this.endPaint(e));
    this.paletteCanvas.addEventListener("mousedown", (e) => this.handlePaletteClick(e));
    this.boardCanvas.addEventListener("contextmenu", (e) => e.preventDefault());
    this.paletteCanvas.addEventListener("contextmenu", (e) => e.preventDefault());
    this.boardCanvas.addEventListener("wheel", (e) => this.handleWheel(e), { passive: false });
    this.paletteCanvas.addEventListener("wheel", (e) => this.handleWheel(e), { passive: false });
    window.addEventListener("keydown", (e) => this.handleKeyDown(e));
  }

  handlePaletteClick(e) {
    const nMosaic = this.nMosaic;
    const rect = this.paletteCanvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const swatchSize = 44;
    const gap = 10;
    const spacing = swatchSize + gap;

    // Pencil-mode toggle button at the bottom of the palette.
    const buttonSize = 44;
    const pencilX = (this.renderer.PALETTE_WIDTH - buttonSize) / 2;
    const pencilY = this.renderer.PALETTE_HEIGHT - buttonSize - 15;
    if (
      x >= pencilX - 5 &&
      x <= pencilX + buttonSize + 5 &&
      y >= pencilY - 5 &&
      y <= pencilY + buttonSize + 5
    ) {
      nMosaic.pencilMode = !nMosaic.pencilMode;
      return;
    }

    const totalHeight = nMosaic.BOARD_COLORS * spacing - gap;
    const startX = (this.renderer.PALETTE_WIDTH - swatchSize) / 2;
    const startY = (this.renderer.PALETTE_HEIGHT - totalHeight) / 2;

    if (x < startX - 5 || x > startX + swatchSize + 5) return;

    const relativeY = y - startY;
    const index = Math.floor(relativeY / spacing);
    const offsetInSwatch = relativeY - index * spacing;
    if (
      index < 0 ||
      index >= nMosaic.BOARD_COLORS ||
      offsetInSwatch < -5 ||
      offsetInSwatch > swatchSize + 5
    )
      return;

    nMosaic.selectedColor = index;
  }

  changeSelectedColor(direction) {
    const nMosaic = this.nMosaic;
    nMosaic.selectedColor =
      (nMosaic.selectedColor + direction + nMosaic.BOARD_COLORS) %
      nMosaic.BOARD_COLORS;
  }

  selectColorByNumber(num) {
    const nMosaic = this.nMosaic;
    if (num >= 1 && num <= nMosaic.BOARD_COLORS) {
      nMosaic.selectedColor = num - 1;
    }
  }

  handleKeyDown(e) {
    // Don't steal digits typed into form fields (the dashboard is full of
    // them); on the game page this only skips the colour switch while the
    // player is editing the size / seed fields.
    const target = e.target;
    if (target instanceof HTMLElement) {
      const tag = target.tagName;
      if (
        tag === "INPUT" ||
        tag === "TEXTAREA" ||
        tag === "SELECT" ||
        target.isContentEditable
      )
        return;
    }
    if (e.key >= "1" && e.key <= "9") {
      this.selectColorByNumber(parseInt(e.key, 10));
    }
  }

  handleWheel(e) {
    e.preventDefault();
    if (e.deltaY > 0) {
      this.changeSelectedColor(1);
    } else {
      this.changeSelectedColor(-1);
    }
  }

  paintAt(x, y) {
    const { nMosaic, renderer } = this;
    const squareWidth = renderer.WIDTH / nMosaic.BOARD_WIDTH;
    const squareHeight = renderer.HEIGHT / nMosaic.BOARD_HEIGHT;

    const col = Math.floor(x / squareWidth);
    const row = Math.floor(y / squareHeight);

    const cell = nMosaic.getCell(row, col);
    if (cell === null || !cell.included) return;

    let changed;
    if (nMosaic.pencilMode) {
      if (this.paintButton === 2) {
        changed = cell.pencilMarks.delete(nMosaic.selectedColor);
      } else if (this.paintButton === 0) {
        cell.pencilMarks.add(nMosaic.selectedColor);
        changed = true;
      }
    } else if (this.paintButton === 2) {
      changed = cell.color !== null;
      cell.color = null;
    } else if (this.paintButton === 0) {
      changed = cell.color !== nMosaic.selectedColor;
      cell.color = nMosaic.selectedColor;
      cell.pencilMarks.clear();
    }
    if (!changed) return;

    // Any modification resumes play even after a win, so the player can
    // erase and keep experimenting instead of being stuck on "YOU WIN".
    nMosaic.puzzleComplete = false;
    if (!nMosaic.pencilMode) {
      const allCluesValid = nMosaic.clues.every((clue) => {
        const clueCell = nMosaic.getCell(clue.row, clue.col);
        if (!clueCell) return false;
        const guessCount = clueCell.neighbors.filter(
          (neighbor) => neighbor.color === clue.color,
        ).length;
        return guessCount === clue.count;
      });
      if (
        nMosaic.cells.every((cell) => !cell.included || cell.color !== null) &&
        allCluesValid
      ) {
        nMosaic.puzzleComplete = true;
      }
    }
    this.onChange();
  }

  startPaint(e) {
    this.isPainting = true;
    this.paintButton = e.button;
    const rect = this.boardCanvas.getBoundingClientRect();
    this.paintAt(e.clientX - rect.left, e.clientY - rect.top);
  }

  continuePaint(e) {
    if (!this.isPainting) return;
    const rect = this.boardCanvas.getBoundingClientRect();
    this.paintAt(e.clientX - rect.left, e.clientY - rect.top);
  }

  endPaint() {
    this.isPainting = false;
  }
}

function nMosaicMain() {
  const newPuzzleButton = document.getElementById(
    "n_mosaic_regenerate",
  );
  const sizeInput = document.getElementById(
    "n_mosaic_size",
  );
  const colorsInput = document.getElementById(
    "n_mosaic_colors",
  );
  const canvas = document.getElementById(
    "n_mosaic_board",
  );
  const paletteCanvas = document.getElementById(
    "n_mosaic_palette",
  );
  const difficultyInput = document.getElementById(
    "n_mosaic_difficulty",
  );
  const seedInput = document.getElementById("n_mosaic_seed");
  const seedDisplay = document.getElementById("n_mosaic_seed_display")

  const DIFFICULTIES = [
    "beginner",
    "intermediate",
    "advanced",
    "expert",
    "grandmaster",
    "random",
  ];

  function clampInt(value, min, max, fallback) {
    const n = parseInt(value, 10);
    return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
  }

  function parseSeed(value) {
    const n = parseInt(value, 10);
    if (!Number.isFinite(n)) return null;
    return clampInt(n, 0, 4294967295, null);
  }

  function currentDifficulty() {
    return DIFFICULTIES.includes(difficultyInput.value)
      ? difficultyInput.value
      : "random";
  }

  const nMosaic = new NMosaic(
    parseInt(sizeInput.value),
    parseInt(sizeInput.value),
    parseInt(colorsInput.value),
    undefined,
    currentDifficulty(),
    // undefined -> the generator picks (and records) a fresh random seed.
    parseSeed(seedInput.value) ?? undefined,
  );
  // Reflect the seed that was actually used, so Refresh/Share stay truthful.
  seedDisplay.textContent = `Puzzle Seed: ${nMosaic.SEED}`;
  const renderer = new SquareGridNMosaicRenderer(canvas, paletteCanvas);

  // All interaction (painting, palette, keyboard, wheel) lives in
  // NMosaicGameController so the test dashboard sandbox can reuse it.
  new NMosaicGameController(renderer, nMosaic, canvas, paletteCanvas);

  function regenerate() {
    // An empty seed field means "surprise me": mint a fresh seed up front so
    // the field, the URL and the generator all agree.
    if (parseSeed(seedInput.value) === null) {
      seedInput.value = String(NMosaic.randomSeed());
    }
    nMosaic.regenerate(
      parseInt(sizeInput.value),
      parseInt(sizeInput.value),
      parseInt(colorsInput.value),
      undefined,
      currentDifficulty(),
      parseSeed(seedInput.value),
    );
    renderer.showSolution = false;
  }

  newPuzzleButton.onclick = regenerate;
  function gameLoop() {
    renderer.drawBackground(nMosaic);
    renderer.drawBoard(nMosaic);
    renderer.drawPalette(nMosaic);

    requestAnimationFrame(gameLoop);
  }

  requestAnimationFrame(gameLoop);
}

// Only boot the interactive game if its DOM is present (the test dashboard
// page has no #n_mosaic_board and skips this entirely).
if (
  typeof document !== "undefined" &&
  typeof document.getElementById("n_mosaic_board") !== "undefined" &&
  document.getElementById("n_mosaic_board") !== null
) {
  nMosaicMain();
}
