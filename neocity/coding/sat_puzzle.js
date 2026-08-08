(() => {
  class SATPuzzle {
    ctx;
    WIDTH;
    HEIGHT;
    numVariables;
    numClauses;
    board;
    assignments;
    // Drawing constants
    PADDING_LEFT = 120;
    PADDING_RIGHT = 48;
    PADDING_TOP = 64;
    PADDING_BOTTOM = 72;
    CIRCLE_RADIUS = 24;
    LABEL_OFFSET = 38;
    // Assignment toggle column
    LABEL_X = 48;
    // row labels right-aligned here
    TOGGLE_X = 78;
    // toggle centre x
    TOGGLE_W = 32;
    TOGGLE_H = 24;
    SEP_X = 104;
    // vertical separator
    // Satisfaction row
    SAT_ROW_OFFSET = 52;
    // Colours (using project palette)
    POSITIVE_COLOR = "#4ec9b0";
    // --class
    NEGATIVE_COLOR = "#f14c4c";
    // --error
    NEUTRAL_STROKE = "#404040";
    // --line
    GRID_LINE = "#404040";
    LABEL_COLOR = "#6e7681";
    // --line-number
    TRUE_COLOR = "#4ec9b0";
    FALSE_COLOR = "#f14c4c";
    SAT_COLOR = "#4ec9b0";
    UNSAT_COLOR = "#f14c4c";
    constructor(numVariables, numClauses, canvas) {
      this.ctx = canvas.getContext("2d");
      this.WIDTH = canvas.width;
      this.HEIGHT = canvas.height;
      this.numVariables = numVariables;
      this.numClauses = numClauses;
      this.board = [];
      this.assignments = [];
      this.regenerate(numVariables, numClauses);
    }
    // ─── Board generation ────────────────────────────────────────────────
    regenerate(numVariables, numClauses) {
      this.numVariables = numVariables;
      this.numClauses = numClauses;
      this.board = [];
      this.assignments = [];
      for (let r = 0; r < this.numVariables; r++) {
        const row = [];
        for (let c = 0; c < this.numClauses; c++) {
          const roll = Math.random();
          if (roll < 0.35) {
            row.push(true);
          } else if (roll < 0.6) {
            row.push(false);
          } else {
            row.push(null);
          }
        }
        this.board.push(row);
        this.assignments.push(false);
      }
    }
    // ─── Clause satisfaction ─────────────────────────────────────────────
    /** Returns true if at least one literal in the clause evaluates to true. */
    isClauseSatisfied(col) {
      for (let r = 0; r < this.numVariables; r++) {
        const lit = this.board[r]?.[col] ?? null;
        if (lit !== null && this.literalIsSatisfied(r, lit)) return true;
      }
      return false;
    }
    // ─── Cell centre helpers ─────────────────────────────────────────────
    cellX(col) {
      const gridWidth = this.WIDTH - this.PADDING_LEFT - this.PADDING_RIGHT;
      const cellSpacingX = this.numClauses > 1 ? gridWidth / (this.numClauses - 1) : 0;
      const startX = this.PADDING_LEFT + (this.numClauses === 1 ? gridWidth / 2 : 0);
      return startX + col * cellSpacingX;
    }
    cellY(row) {
      const gridHeight = this.HEIGHT - this.PADDING_TOP - this.PADDING_BOTTOM;
      const cellSpacingY = this.numVariables > 1 ? gridHeight / (this.numVariables - 1) : 0;
      const startY = this.PADDING_TOP + (this.numVariables === 1 ? gridHeight / 2 : 0);
      return startY + row * cellSpacingY;
    }
    satisfactionRowY() {
      return this.cellY(this.numVariables - 1) + this.SAT_ROW_OFFSET;
    }
    // ─── Drawing ─────────────────────────────────────────────────────────
    drawBackground() {
      this.ctx.fillStyle = "#1f1f1f";
      this.ctx.fillRect(0, 0, this.WIDTH, this.HEIGHT);
    }
    /** Draw the full game board including the assignment column and satisfaction row. */
    drawGameBoard() {
      this.drawGridLines();
      this.drawCircles();
      this.drawAssignmentColumn();
      this.drawSatisfactionRow();
      this.drawLabels();
    }
    // ─── Grid lines ──────────────────────────────────────────────────────
    drawGridLines() {
      const { ctx } = this;
      ctx.strokeStyle = this.GRID_LINE;
      ctx.lineWidth = 0.5;
      for (let r = 0; r < this.numVariables; r++) {
        for (let c = 0; c < this.numClauses; c++) {
          if (c < this.numClauses - 1) {
            ctx.beginPath();
            ctx.moveTo(this.cellX(c), this.cellY(r));
            ctx.lineTo(this.cellX(c + 1), this.cellY(r));
            ctx.stroke();
          }
          if (r < this.numVariables - 1) {
            ctx.beginPath();
            ctx.moveTo(this.cellX(c), this.cellY(r));
            ctx.lineTo(this.cellX(c), this.cellY(r + 1));
            ctx.stroke();
          }
        }
      }
      ctx.strokeStyle = "#6e7681";
      ctx.lineWidth = 1;
      const sepTop = this.cellY(0) - this.CIRCLE_RADIUS - 8;
      const sepBot = this.cellY(this.numVariables - 1) + this.CIRCLE_RADIUS + 8;
      ctx.beginPath();
      ctx.moveTo(this.SEP_X, sepTop);
      ctx.lineTo(this.SEP_X, sepBot);
      ctx.stroke();
    }
    // ─── Circles (literal grid) ──────────────────────────────────────────
    /** A literal evaluates to true under the current assignment when:
     *  - positive literal (state===true)  ∧ variable is true, or
     *  - negative literal (state===false) ∧ variable is false. */
    literalIsSatisfied(row, state) {
      return state === this.assignments[row];
    }
    drawCircles() {
      const { ctx } = this;
      for (let r = 0; r < this.numVariables; r++) {
        for (let c = 0; c < this.numClauses; c++) {
          const state = this.board[r]?.[c] ?? null;
          if (state === null) continue;
          const cx = this.cellX(c);
          const cy = this.cellY(r);
          const lit = this.literalIsSatisfied(r, state);
          ctx.beginPath();
          ctx.arc(cx, cy, this.CIRCLE_RADIUS, 0, Math.PI * 2);
          if (lit && state === true) {
            ctx.fillStyle = this.POSITIVE_COLOR;
            ctx.fill();
            ctx.strokeStyle = "#3aa880";
          } else if (lit && state === false) {
            ctx.fillStyle = this.NEGATIVE_COLOR;
            ctx.fill();
            ctx.strokeStyle = "#c03030";
          } else {
            ctx.fillStyle = "transparent";
            ctx.strokeStyle = this.NEUTRAL_STROKE;
          }
          ctx.lineWidth = 2;
          ctx.stroke();
          ctx.fillStyle = lit ? "#1f1f1f" : "#6e7681";
          ctx.font = 'bold 12px "Roboto Mono", monospace';
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          if (state === true) {
            ctx.fillText(`x${r}`, cx, cy);
          } else {
            ctx.fillText(`\xACx${r}`, cx, cy);
          }
        }
      }
    }
    // ─── Assignment column ───────────────────────────────────────────────
    drawAssignmentColumn() {
      const { ctx } = this;
      for (let r = 0; r < this.numVariables; r++) {
        const val = this.assignments[r];
        const cy = this.cellY(r);
        const tx = this.TOGGLE_X;
        const halfW = this.TOGGLE_W / 2;
        const halfH = this.TOGGLE_H / 2;
        ctx.fillStyle = val ? this.TRUE_COLOR : this.FALSE_COLOR;
        ctx.strokeStyle = val ? "#3aa880" : "#c03030";
        ctx.lineWidth = 2;
        const cr = 4;
        ctx.beginPath();
        ctx.moveTo(tx - halfW + cr, cy - halfH);
        ctx.lineTo(tx + halfW - cr, cy - halfH);
        ctx.arcTo(tx + halfW, cy - halfH, tx + halfW, cy - halfH + cr, cr);
        ctx.lineTo(tx + halfW, cy + halfH - cr);
        ctx.arcTo(tx + halfW, cy + halfH, tx + halfW - cr, cy + halfH, cr);
        ctx.lineTo(tx - halfW + cr, cy + halfH);
        ctx.arcTo(tx - halfW, cy + halfH, tx - halfW, cy + halfH - cr, cr);
        ctx.lineTo(tx - halfW, cy - halfH + cr);
        ctx.arcTo(tx - halfW, cy - halfH, tx - halfW + cr, cy - halfH, cr);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = "#1f1f1f";
        ctx.font = 'bold 13px "Roboto Mono", monospace';
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(val ? "T" : "F", tx, cy);
      }
    }
    // ─── Satisfaction row ────────────────────────────────────────────────
    drawSatisfactionRow() {
      const { ctx } = this;
      const satY = this.satisfactionRowY();
      ctx.font = 'bold 13px "Roboto Mono", monospace';
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      for (let c = 0; c < this.numClauses; c++) {
        const satisfied = this.isClauseSatisfied(c);
        const cx = this.cellX(c);
        ctx.fillStyle = satisfied ? this.SAT_COLOR : this.UNSAT_COLOR;
        ctx.fillText(satisfied ? "\u2713" : "\u2717", cx, satY);
      }
    }
    // ─── Labels ──────────────────────────────────────────────────────────
    drawLabels() {
      const { ctx } = this;
      ctx.fillStyle = this.LABEL_COLOR;
      ctx.font = '14px "Roboto Mono", monospace';
      ctx.textAlign = "right";
      ctx.textBaseline = "middle";
      for (let r = 0; r < this.numVariables; r++) {
        ctx.fillText(`x${r}`, this.LABEL_X, this.cellY(r));
      }
      ctx.textAlign = "center";
      ctx.textBaseline = "bottom";
      for (let c = 0; c < this.numClauses; c++) {
        ctx.fillText(`C${c}`, this.cellX(c), this.PADDING_TOP - this.LABEL_OFFSET);
      }
    }
    // ─── Hit-testing ────────────────────────────────────────────────────
    /** Check if pixel hits an assignment toggle. Returns the variable index or null. */
    assignmentAtPixel(px, py) {
      const halfW = this.TOGGLE_W / 2;
      const halfH = this.TOGGLE_H / 2;
      for (let r = 0; r < this.numVariables; r++) {
        const cy = this.cellY(r);
        if (px >= this.TOGGLE_X - halfW && px <= this.TOGGLE_X + halfW && py >= cy - halfH && py <= cy + halfH) {
          return r;
        }
      }
      return null;
    }
  }
  function satPuzzleMain() {
    const canvas = document.getElementById("sat_puzzle_board");
    const variablesInput = document.getElementById("sat_puzzle_variables");
    const clausesInput = document.getElementById("sat_puzzle_clauses");
    const regenerateButton = document.getElementById("sat_puzzle_regenerate");
    const checkButton = document.getElementById("sat_puzzle_check");
    const puzzle = new SATPuzzle(
      parseInt(variablesInput.value, 10),
      parseInt(clausesInput.value, 10),
      canvas
    );
    function handleClick(e) {
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      const px = (e.clientX - rect.left) * scaleX;
      const py = (e.clientY - rect.top) * scaleY;
      const varIdx = puzzle.assignmentAtPixel(px, py);
      if (varIdx !== null) {
        puzzle.assignments[varIdx] = !puzzle.assignments[varIdx];
      }
    }
    canvas.addEventListener("click", handleClick);
    canvas.addEventListener("contextmenu", (e) => e.preventDefault());
    regenerateButton.onclick = () => {
      puzzle.regenerate(
        parseInt(variablesInput.value, 10),
        parseInt(clausesInput.value, 10)
      );
    };
    checkButton.onclick = () => {
      const allSatisfied = Array.from(
        { length: puzzle.numClauses },
        (_, c) => puzzle.isClauseSatisfied(c)
      );
      const solved = allSatisfied.every(Boolean);
      console.log(
        solved ? "\u2713 All clauses satisfied!" : "\u2717 Not all clauses satisfied.",
        allSatisfied
      );
    };
    function gameLoop() {
      puzzle.drawBackground();
      puzzle.drawGameBoard();
      requestAnimationFrame(gameLoop);
    }
    requestAnimationFrame(gameLoop);
  }
  satPuzzleMain();
})();
