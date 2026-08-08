// ─── SAT Puzzle ────────────────────────────────────────────────────────────
// Grid: rows = variables, columns = clauses.
// Each cell represents the literal state:
//   null  → variable not in clause
//   true  → positive literal (x)
//   false → negative literal (¬x)
//
// Left column: variable truth assignments (clickable toggles).
// Bottom row: clause satisfaction indicators (computed).

type LiteralState = boolean | null;

class SATPuzzle {
    ctx: CanvasRenderingContext2D;
    WIDTH: number;
    HEIGHT: number;

    numVariables: number;
    numClauses: number;
    board: LiteralState[][];
    assignments: boolean[];

    // Drawing constants
    private readonly PADDING_LEFT   = 120;
    private readonly PADDING_RIGHT  = 48;
    private readonly PADDING_TOP    = 64;
    private readonly PADDING_BOTTOM = 72;
    private readonly CIRCLE_RADIUS  = 24;
    private readonly LABEL_OFFSET   = 38;

    // Assignment toggle column
    private readonly LABEL_X   = 48;   // row labels right-aligned here
    private readonly TOGGLE_X  = 78;   // toggle centre x
    private readonly TOGGLE_W  = 32;
    private readonly TOGGLE_H  = 24;
    private readonly SEP_X     = 104;  // vertical separator

    // Satisfaction row
    private readonly SAT_ROW_OFFSET = 52;

    // Colours (using project palette)
    private readonly POSITIVE_COLOR = "#4ec9b0";   // --class
    private readonly NEGATIVE_COLOR = "#f14c4c";   // --error
    private readonly NEUTRAL_STROKE = "#404040";   // --line
    private readonly GRID_LINE      = "#404040";
    private readonly LABEL_COLOR    = "#6e7681";   // --line-number
    private readonly TRUE_COLOR     = "#4ec9b0";
    private readonly FALSE_COLOR    = "#f14c4c";
    private readonly SAT_COLOR      = "#4ec9b0";
    private readonly UNSAT_COLOR    = "#f14c4c";

    constructor(
        numVariables: number,
        numClauses: number,
        canvas: HTMLCanvasElement,
    ) {
        this.ctx = canvas.getContext("2d")!!;
        this.WIDTH = canvas.width;
        this.HEIGHT = canvas.height;
        this.numVariables = numVariables;
        this.numClauses = numClauses;
        this.board = [];
        this.assignments = [];
        this.regenerate(numVariables, numClauses);
    }

    // ─── Board generation ────────────────────────────────────────────────

    regenerate(numVariables: number, numClauses: number): void {
        this.numVariables = numVariables;
        this.numClauses = numClauses;
        this.board = [];
        this.assignments = [];

        for (let r = 0; r < this.numVariables; r++) {
            const row: LiteralState[] = [];
            for (let c = 0; c < this.numClauses; c++) {
                const roll = Math.random();
                if (roll < 0.3333) {
                    row.push(true);
                } else if (roll < 0.6667) {
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
    isClauseSatisfied(col: number): boolean {
        for (let r = 0; r < this.numVariables; r++) {
            const lit = this.board[r]?.[col] ?? null;
            if (lit !== null && this.literalIsSatisfied(r, lit)) return true;
        }
        return false;
    }

    // ─── Cell centre helpers ─────────────────────────────────────────────

    private cellX(col: number): number {
        const gridWidth = this.WIDTH - this.PADDING_LEFT - this.PADDING_RIGHT;
        const cellSpacingX = this.numClauses > 1
            ? gridWidth / (this.numClauses - 1)
            : 0;
        const startX = this.PADDING_LEFT + (this.numClauses === 1 ? gridWidth / 2 : 0);
        return startX + col * cellSpacingX;
    }

    private cellY(row: number): number {
        const gridHeight = this.HEIGHT - this.PADDING_TOP - this.PADDING_BOTTOM;
        const cellSpacingY = this.numVariables > 1
            ? gridHeight / (this.numVariables - 1)
            : 0;
        const startY = this.PADDING_TOP + (this.numVariables === 1 ? gridHeight / 2 : 0);
        return startY + row * cellSpacingY;
    }

    private satisfactionRowY(): number {
        return this.cellY(this.numVariables - 1) + this.SAT_ROW_OFFSET;
    }

    // ─── Drawing ─────────────────────────────────────────────────────────

    drawBackground(): void {
        this.ctx.fillStyle = "#1f1f1f";
        this.ctx.fillRect(0, 0, this.WIDTH, this.HEIGHT);
    }

    /** Draw the full game board including the assignment column and satisfaction row. */
    drawGameBoard(): void {
        this.drawGridLines();
        this.drawCircles();
        this.drawAssignmentColumn();
        this.drawSatisfactionRow();
        this.drawLabels();
    }

    // ─── Grid lines ──────────────────────────────────────────────────────

    private drawGridLines(): void {
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

        // Vertical separator between assignment column and grid
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
    private literalIsSatisfied(row: number, state: LiteralState): boolean {
        return state === this.assignments[row];
    }

    private drawCircles(): void {
        const { ctx } = this;

        for (let r = 0; r < this.numVariables; r++) {
            for (let c = 0; c < this.numClauses; c++) {
                const state = this.board[r]?.[c] ?? null;
                if (state === null) continue;  // not in clause — draw nothing

                const cx = this.cellX(c);
                const cy = this.cellY(r);
                const lit = this.literalIsSatisfied(r, state);

                // Circle fill & stroke
                ctx.beginPath();
                ctx.arc(cx, cy, this.CIRCLE_RADIUS, 0, Math.PI * 2);

                if (lit && state === true) {
                    // Positive literal satisfied — lit green
                    ctx.fillStyle = this.POSITIVE_COLOR;
                    ctx.fill();
                    ctx.strokeStyle = "#3aa880";
                } else if (lit && state === false) {
                    // Negative literal satisfied — lit red
                    ctx.fillStyle = this.NEGATIVE_COLOR;
                    ctx.fill();
                    ctx.strokeStyle = "#c03030";
                } else {
                    // Not satisfied — unlit outline
                    ctx.fillStyle = "transparent";
                    ctx.strokeStyle = this.NEUTRAL_STROKE;
                }

                ctx.lineWidth = 2;
                ctx.stroke();

                // Label
                ctx.fillStyle = lit ? "#1f1f1f" : "#6e7681";
                ctx.font = "bold 12px \"Roboto Mono\", monospace";
                ctx.textAlign = "center";
                ctx.textBaseline = "middle";

                if (state === true) {
                    ctx.fillText(`x${r}`, cx, cy);
                } else {
                    ctx.fillText(`¬x${r}`, cx, cy);
                }
            }
        }
    }

    // ─── Assignment column ───────────────────────────────────────────────

    private drawAssignmentColumn(): void {
        const { ctx } = this;

        for (let r = 0; r < this.numVariables; r++) {
            const val = this.assignments[r];
            const cy = this.cellY(r);
            const tx = this.TOGGLE_X;
            const halfW = this.TOGGLE_W / 2;
            const halfH = this.TOGGLE_H / 2;

            // Toggle background
            ctx.fillStyle = val ? this.TRUE_COLOR : this.FALSE_COLOR;
            ctx.strokeStyle = val ? "#3aa880" : "#c03030";
            ctx.lineWidth = 2;

            // Rounded rectangle
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

            // Label
            ctx.fillStyle = "#1f1f1f";
            ctx.font = "bold 13px \"Roboto Mono\", monospace";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText(val ? "T" : "F", tx, cy);
        }
    }

    // ─── Satisfaction row ────────────────────────────────────────────────

    private drawSatisfactionRow(): void {
        const { ctx } = this;
        const satY = this.satisfactionRowY();

        ctx.font = "bold 13px \"Roboto Mono\", monospace";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";

        for (let c = 0; c < this.numClauses; c++) {
            const satisfied = this.isClauseSatisfied(c);
            const cx = this.cellX(c);

            ctx.fillStyle = satisfied ? this.SAT_COLOR : this.UNSAT_COLOR;
            ctx.fillText(satisfied ? "✓" : "✗", cx, satY);
        }
    }

    // ─── Labels ──────────────────────────────────────────────────────────

    private drawLabels(): void {
        const { ctx } = this;

        // Row labels (variable names)
        ctx.fillStyle = this.LABEL_COLOR;
        ctx.font = "14px \"Roboto Mono\", monospace";
        ctx.textAlign = "right";
        ctx.textBaseline = "middle";
        for (let r = 0; r < this.numVariables; r++) {
            ctx.fillText(`x${r}`, this.LABEL_X, this.cellY(r));
        }

        // Column labels (clause names)
        ctx.textAlign = "center";
        ctx.textBaseline = "bottom";
        for (let c = 0; c < this.numClauses; c++) {
            ctx.fillText(`C${c}`, this.cellX(c), this.PADDING_TOP - this.LABEL_OFFSET);
        }
    }

    // ─── Hit-testing ────────────────────────────────────────────────────

    /** Check if pixel hits an assignment toggle. Returns the variable index or null. */
    assignmentAtPixel(px: number, py: number): number | null {
        const halfW = this.TOGGLE_W / 2;
        const halfH = this.TOGGLE_H / 2;
        for (let r = 0; r < this.numVariables; r++) {
            const cy = this.cellY(r);
            if (
                px >= this.TOGGLE_X - halfW &&
                px <= this.TOGGLE_X + halfW &&
                py >= cy - halfH &&
                py <= cy + halfH
            ) {
                return r;
            }
        }
        return null;
    }
}

// ─── Main ─────────────────────────────────────────────────────────────────

function satPuzzleMain(): void {
    const canvas = document.getElementById("sat_puzzle_board")!! as HTMLCanvasElement;
    const variablesInput = document.getElementById("sat_puzzle_variables")!! as HTMLInputElement;
    const clausesInput = document.getElementById("sat_puzzle_clauses")!! as HTMLInputElement;
    const regenerateButton = document.getElementById("sat_puzzle_regenerate")!! as HTMLButtonElement;
    const checkButton = document.getElementById("sat_puzzle_check")!! as HTMLButtonElement;

    const puzzle = new SATPuzzle(
        parseInt(variablesInput.value, 10),
        parseInt(clausesInput.value, 10),
        canvas,
    );

    // ── Mouse handling ──────────────────────────────────────────────────

    function handleClick(e: MouseEvent): void {
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

    // ── Buttons ─────────────────────────────────────────────────────────

    regenerateButton.onclick = () => {
        puzzle.regenerate(
            parseInt(variablesInput.value, 10),
            parseInt(clausesInput.value, 10),
        );
    };

    checkButton.onclick = () => {
        const allSatisfied = Array.from(
            { length: puzzle.numClauses },
            (_, c) => puzzle.isClauseSatisfied(c),
        );
        const solved = allSatisfied.every(Boolean);
        console.log(
            solved ? "✓ All clauses satisfied!" : "✗ Not all clauses satisfied.",
            allSatisfied,
        );
    };

    // ── Game loop ───────────────────────────────────────────────────────

    function gameLoop(): void {
        puzzle.drawBackground();
        puzzle.drawGameBoard();
        requestAnimationFrame(gameLoop);
    }

    requestAnimationFrame(gameLoop);
}

satPuzzleMain();
