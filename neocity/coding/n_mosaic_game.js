
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
  /** Cells returned by the last Hint() click; drawn highlighted on the board. */
  hintCells = [];

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

    const layout = this.paletteLayout(nMosaic);
    const swatchSize = layout.swatchSize;
    const spacing = layout.spacing;
    const startX = layout.startX;
    const startY = layout.startY;

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

    // Hint + pencil buttons stacked at the bottom of the palette.
    this.drawHintButton(nMosaic, layout.hintX, layout.hintY, layout.buttonSize);
    this.drawPencilButton(nMosaic, layout.pencilX, layout.pencilY, layout.buttonSize);
  }

  // Palette geometry, shared by drawPalette and the palette-click hit tests.
  paletteLayout(nMosaic) {
    const swatchSize = 44;
    const gap = 10;
    const spacing = swatchSize + gap;
    const totalHeight = nMosaic.BOARD_COLORS * spacing - gap;
    const startX = (this.PALETTE_WIDTH - swatchSize) / 2;
    const startY = (this.PALETTE_HEIGHT - totalHeight) / 2;

    // Two buttons stacked at the bottom; shrink them when many colour
    // swatches leave little room below the grid.
    const bottomSpace = this.PALETTE_HEIGHT - (startY + totalHeight);
    const buttonSize = Math.min(
      44,
      Math.max(22, Math.floor((bottomSpace - 24) / 2)),
    );
    const buttonX = (this.PALETTE_WIDTH - buttonSize) / 2;
    return {
      swatchSize,
      spacing,
      startX,
      startY,
      buttonSize,
      hintX: buttonX,
      hintY: this.PALETTE_HEIGHT - buttonSize - 15 - buttonSize - 8,
      pencilX: buttonX,
      pencilY: this.PALETTE_HEIGHT - buttonSize - 15,
    };
  }

  drawHintButton(nMosaic, x, y, size) {
    const g = this.paletteCtx;

    g.fillStyle = "#606060";
    g.fillRect(x, y, size, size);
    g.strokeStyle = "#000000";
    g.lineWidth = 2;
    g.strokeRect(x, y, size, size);

    // Lightbulb: a circular glass bulb over a ridged screw base.
    const cx = x + size / 2;
    const cy = y + size / 2;
    const s = size * 0.5;

    // Screw base first, so the glass can overlap its neck.
    const baseWidth = s * 0.56;
    const baseTop = cy + s * 0.28;
    const baseBottom = cy + s * 0.52;
    g.fillStyle = "#c8c8c8";
    g.fillRect(cx - baseWidth / 2, baseTop, baseWidth, baseBottom - baseTop);
    g.strokeStyle = "#7a7a7a";
    g.lineWidth = 1;
    for (let i = 1; i <= 3; i++) {
      const yy = baseTop + (baseBottom - baseTop) * (i / 4);
      g.beginPath();
      g.moveTo(cx - baseWidth / 2, yy);
      g.lineTo(cx + baseWidth / 2, yy);
      g.stroke();
    }

    // Glass bulb: a plain circle, sitting on the base.
    const radius = s * 0.4;
    const glassCx = cx;
    const glassCy = cy - s * 0.1;
    g.fillStyle = "#f8ef8a";
    g.beginPath();
    g.arc(glassCx, glassCy, radius, 0, 2 * Math.PI);
    g.closePath();
    g.fill();
    g.strokeStyle = "#a08a00";
    g.lineWidth = 1.5;
    g.stroke();

    // Glint highlight on the upper-left of the glass.
    g.strokeStyle = "#ffffff";
    g.lineWidth = 2;
    g.beginPath();
    g.arc(
      glassCx - radius * 0.35,
      glassCy - radius * 0.45,
      radius * 0.28,
      Math.PI * 1.15,
      Math.PI * 1.85,
    );
    g.stroke();

    // While a hint is displayed the button lights up like the pencil does.
    if (this.hintCells.length > 0) {
      g.strokeStyle = "#ffffff";
      g.lineWidth = 3;
      g.strokeRect(x, y, size, size);
    }
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

    // Clues are only final once generation completes: the generator mutates
    // the clue map as it places recipes, so don't render them while a puzzle
    // is being generated — the loading overlay's veil is translucent and
    // would show half-built clues underneath it.
    const clueEntries = nMosaic.generating ? [] : nMosaic.clueMap;

    for (const [clueCell, cellClues] of clueEntries) {
      const clue = cellClues[0];
      if (!clue) console.log("AAAAAAAAAA", nMosaic.clueMap);

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

    // Hint highlight: bright border + soft tint on the cells returned by
    // nMosaic.getHint() while a hint is currently displayed.
    if (this.hintCells.length > 0) {
      for (const cell of this.hintCells) {
        if (!cell.included) continue;
        this.ctx.fillStyle = "rgba(255, 235, 120, 0.28)";
        this.ctx.fillRect(
          cell.col * squareWidth + 1,
          cell.row * squareHeight + 1,
          squareWidth - 2,
          squareHeight - 2,
        );
      }
      this.ctx.strokeStyle = "#ffd23f";
      this.ctx.lineWidth = Math.max(2, Math.min(squareWidth, squareHeight) * 0.14);
      for (const cell of this.hintCells) {
        if (!cell.included) continue;
        this.ctx.strokeRect(
          cell.col * squareWidth + 1.5,
          cell.row * squareHeight + 1.5,
          squareWidth - 3,
          squareHeight - 3,
        );
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
    this.drawLoadingOverlay(nMosaic);
  }

  // Dimmed overlay with an animated spinner and a message, shown while
  // nMosaic is generating a new puzzle. Drawn last so it covers the board.
  drawLoadingOverlay(nMosaic) {
    if (!nMosaic.generating) return;

    const ctx = this.ctx;
    const cx = this.WIDTH / 2;
    const cy = this.HEIGHT / 2;
    const radius = 52;
    const lineWidth = 12;

    // Half-transparent veil so the half-built board stays readable behind it.
    ctx.fillStyle = "rgba(0, 0, 0, 0.45)";
    ctx.fillRect(0, 0, this.WIDTH, this.HEIGHT);

    // Static track ring.
    ctx.strokeStyle = "rgba(255, 255, 255, 0.25)";
    ctx.lineWidth = lineWidth;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, 2 * Math.PI);
    ctx.stroke();

    // Rotating arc (one full turn per second), as a polyline so it works on
    // any browser regardless of canvas arc-pathing support.
    const t = (performance.now() / 1000) % 1;
    const startAngle = t * 2 * Math.PI;
    const sweep = (4 / 3) * Math.PI;
    const segments = 48;
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = lineWidth;
    ctx.lineCap = "round";
    ctx.beginPath();
    for (let i = 0; i <= segments; i++) {
      const a = startAngle + (i / segments) * sweep;
      const x = cx + radius * Math.cos(a);
      const y = cy + radius * Math.sin(a);
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.stroke();

    // Message underneath the spinner.
    ctx.font = `bold 26px "Roboto Mono", monospace`;
    ctx.fillStyle = "#ffffff";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const difficulty =
      nMosaic.BOARD_DIFFICULTY && nMosaic.BOARD_DIFFICULTY !== "random"
        ? nMosaic.BOARD_DIFFICULTY
        : "";
    const message = `Generating${difficulty ? ` ${difficulty}` : ""} puzzle…`;
    ctx.fillText(message, cx, cy + radius + lineWidth + 40);
  }
}

// Do two hint results select the same cells? Compared by object identity:
// getHint() always returns cells from the current nMosaic.cells array, so two
// identical hints on an unchanged board reuse the same cell objects, while a
// regenerated board (or an actually different deduction) produces different
// references — even if the co-ordinates happen to match.
function sameHintCells(displayed, current) {
  if (displayed.length !== current.length) return false;
  return displayed.every((cell) => current.includes(cell));
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

    const layout = this.renderer.paletteLayout(nMosaic);
    const buttonSize = layout.buttonSize;

    // Hint button (top of the two bottom buttons): re-ask the puzzle for the
    // next deduction and show it. A hint is never refreshed implicitly — the
    // highlight only leaves once getHint() starts answering differently.
    if (
      x >= layout.hintX - 5 &&
      x <= layout.hintX + buttonSize + 5 &&
      y >= layout.hintY - 5 &&
      y <= layout.hintY + buttonSize + 5
    ) {
      this.showHint();
      return;
    }

    // Pencil-mode toggle button at the bottom of the palette.
    if (
      x >= layout.pencilX - 5 &&
      x <= layout.pencilX + buttonSize + 5 &&
      y >= layout.pencilY - 5 &&
      y <= layout.pencilY + buttonSize + 5
    ) {
      nMosaic.pencilMode = !nMosaic.pencilMode;
      return;
    }

    const swatchSize = layout.swatchSize;
    const spacing = layout.spacing;
    const startX = layout.startX;
    const startY = layout.startY;

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

  // Ask the puzzle for the current next deduction and highlight it. Called
  // only when the player clicks the hint button — never implicitly.
  showHint() {
    this.renderer.hintCells = this.nMosaic.getHint();
  }

  // Drop the displayed hint once nMosaic.getHint() stops returning it. Only
  // ever *clears*: showing a fresh hint is strictly the button's job.
  refreshHintExpiry() {
    if (this.renderer.hintCells.length === 0) return;
    if (!sameHintCells(this.renderer.hintCells, this.nMosaic.getHint())) {
      this.renderer.hintCells = [];
    }
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
    const wasColored = cell.color !== null;

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

    // Keep the hint solvers' candidate board in sync with what the player
    // paints. Colouring a previously-empty cell applies the same incremental
    // updateCandidateBoard() the solvers use. Erasing or re-colouring is the
    // opposite direction (updateCandidateBoard only ever deletes candidates,
    // never restores them), so drop the board and let the next hint rebuild
    // it from the current position.
    if (!nMosaic.pencilMode) {
      if (this.paintButton === 0 && !wasColored) {
        if (nMosaic.candidates === null) nMosaic.buildCandidateBoard();
        nMosaic.updateCandidateBoard(cell);
      } else {
        nMosaic.candidates = null;
      }
    }

    nMosaic.puzzleComplete = nMosaic.solved();
    this.onChange();
    // Strokes change the board, so re-check whether the shown hint still
    // matches what getHint() would now return.
    this.refreshHintExpiry();
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
  const gameController = new NMosaicGameController(
    renderer,
    nMosaic,
    canvas,
    paletteCanvas,
  );

  function regenerate() {
    // An empty seed field means "surprise me": mint a fresh seed up front so
    // the field, the URL and the generator all agree.
    let seed = parseSeed(seedInput.value);
    if (seed === null) {
      seed = NMosaic.randomSeed();
    }

    seedDisplay.textContent = `Puzzle Seed: ${String(seed)}`;
    nMosaic.regenerate(
      parseInt(sizeInput.value),
      parseInt(sizeInput.value),
      parseInt(colorsInput.value),
      undefined,
      currentDifficulty(),
      seed,
    );
    renderer.showSolution = false;
    renderer.hintCells = [];
  }

  newPuzzleButton.onclick = regenerate;
  // While a hint is displayed the highlight must expire as soon as
  // getHint() starts answering differently; a slow poll is a safety net on
  // top of the immediate check after each stroke.
  let hintTick = 0;
  function gameLoop() {
    renderer.drawBackground(nMosaic);
    renderer.drawBoard(nMosaic);
    renderer.drawPalette(nMosaic);

    if (++hintTick % 30 === 0) gameController.refreshHintExpiry();

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

// Expose the shared classes (same pattern as n_mosaic.js) so the vm sandbox
// and other tooling can construct them without a browser.
if (typeof window !== "undefined") {
  const exposed = window;
  exposed.SquareGridNMosaicRenderer = SquareGridNMosaicRenderer;
  exposed.NMosaicGameController = NMosaicGameController;
  exposed.sameHintCells = sameHintCells;
}
