// TODO: Puzzle Generation
    // Simple Remainder
        // if the number of empty cells + the number of on-color cells in the neighbourhood of a clue is equal to the clue's value
    // Total Neighbourhood Sum
        // if the sum of two differently colored clues equals the number of cells in their combined neighbourhoods
        // also applies to modified clues + modified neighbourhoods
        // this can be applied to any set of cells as long as any intersections between neighbourhoods belong to clues of different colors
        // correlary for when the clues are the same color: Excluded Difference
        // instead take the sum of the clue and it's inverse
    // Subset Restriction
        // if any region has an iff restriction placed on it and a subset of that region has the same iff restriction
    // Hard Mode (SAT Solver)
// TODO: Puzzle Generation Options and Descriptions
// TODO: Hint System?
// TODO: Project Writeup
// SAT solver globals (loaded from ../SATjs-master/SAT.js and helpers.js)
declare function satSolve(size: number, clauses: number[][]): boolean;
declare function exactlyOne(vars: number[]): number[][];
declare function exactlyK(vars: number[], k: number, varCache: VarCache): number[][];
declare class VarCache {
    last: number;
    constructor(max: number);
    getVar(): number;
}

class NMosaicCell {
    row: number;
    col: number;
    color: number | null;
    solutionColor: number | null;
    neighbors: NMosaicCell[];
    included: boolean;

    constructor(row: number, col: number) {
        this.row = row;
        this.col = col;
        this.color = null;
        this.solutionColor = null;
        this.neighbors = [];
        this.included = false;
    }
}

class NMosaicClue {
    row: number;
    col: number;
    color: number;
    count: number;

    constructor(row: number, col: number, color: number, count: number) {
        this.row = row;
        this.col = col;
        this.color = color;
        this.count = count;
    }
}

class NMosaic {
    PALETTE = [
      "#cb4450",
      "#70c941",
      "#3888cb",
      "#c9ae38",
      "#8a49cc",
      "#ca7b35",
      "#3bc9be",
      "#34495e"
    ];
    ctx: CanvasRenderingContext2D;
    paletteCtx: CanvasRenderingContext2D;

    cells: Array<NMosaicCell>;
    clues: Array<NMosaicClue>;
    HEIGHT: number;
    WIDTH: number;
    PALETTE_HEIGHT: number;
    PALETTE_WIDTH: number;
    BOARD_HEIGHT: number;
    BOARD_WIDTH: number;
    BOARD_COLORS: number;
    BOARD_FRACTION: number;
    BOARD_DIFFICULTY: string;
    showSolution: boolean = false;
    puzzleComplete: boolean = false;
    selectedColor: number = 0;

    constructor(height: number = 9, width: number = 9, colors: number = 2, fraction: number = 1.0, difficulty: string = "random", canvas: HTMLCanvasElement, paletteCanvas: HTMLCanvasElement) {
        this.ctx = canvas.getContext("2d")!!;
        this.paletteCtx = paletteCanvas.getContext("2d")!!;
        this.WIDTH = canvas.width;
        this.HEIGHT = canvas.height;
        this.PALETTE_WIDTH = paletteCanvas.width;
        this.PALETTE_HEIGHT = paletteCanvas.height;
        this.BOARD_HEIGHT = height;
        this.BOARD_WIDTH = width;
        this.BOARD_COLORS = colors;
        this.BOARD_FRACTION = fraction;
        this.BOARD_DIFFICULTY = difficulty;

        this.cells = [];
        this.clues = [];

        this.regenerate(this.BOARD_HEIGHT, this.BOARD_WIDTH, this.BOARD_COLORS, this.BOARD_FRACTION, this.BOARD_DIFFICULTY);
    }

    regenerate(height: number = 9, width: number = 9, colors: number = 2, fraction: number = 0.5, difficulty: string = "random") {
        this.BOARD_HEIGHT = height;
        this.BOARD_WIDTH = width;
        this.BOARD_COLORS = colors;
        this.BOARD_FRACTION = fraction;
        this.BOARD_DIFFICULTY = difficulty;
        this.selectedColor = 0;

        this.cells = [];
        this.clues = [];
        this.puzzleComplete = false;
        this.showSolution = false;

        for (let row = 0; row < this.BOARD_HEIGHT; row++) {
            for (let col = 0; col < this.BOARD_WIDTH; col++) {
                const cell = new NMosaicCell(row, col);
                this.cells.push(cell);
            }
        }

        this.generateBoardShape();

        if (this.BOARD_DIFFICULTY === "easy") {
            let possibleClues = this.cells.filter((cell) => cell.included &&
                !this.clues.find((clue) => clue.col === cell.col && clue.row === cell.row) &&
                cell.neighbors.find((neighbor) => neighbor.solutionColor === null));
            while (possibleClues.length > 0) {
                const clueWeights = possibleClues.map((cell) => {
                    const emptyNeighbours = cell.neighbors.filter((neighbor) => neighbor.solutionColor === null).length;
                    return 100 / Math.pow(this.BOARD_COLORS, emptyNeighbours);
                });

                const totalWeight = clueWeights.reduce((acc, cur) => acc + cur, 0);

                let rng = Math.random() * totalWeight;
                let newClueCell: NMosaicCell | undefined;
                clueWeights.find((weight, index) => {
                    rng -= weight;
                    if (rng < 0) {
                        newClueCell = possibleClues[index];
                        return true;
                    }
                    return false;
                })

                if (newClueCell) {
                    const randomColor = Math.floor(Math.random() * this.BOARD_COLORS);

                    newClueCell.neighbors.filter((neighbor) => neighbor.solutionColor === null)
                        .forEach((cell) => cell.solutionColor = randomColor);

                    const clue = new NMosaicClue(newClueCell.row, newClueCell.col, randomColor,
                        newClueCell.neighbors.filter(it => it.solutionColor === randomColor).length);
                    this.clues.push(clue);
                }

                possibleClues = this.cells.filter((cell) => cell.included &&
                    !this.clues.find((clue) => clue.col === cell.col && clue.row === cell.row) &&
                    cell.neighbors.find((neighbor) => neighbor.solutionColor === null));
            }
        } else if (this.BOARD_DIFFICULTY === "random") {
            for (const cell of this.cells) {
                if (!cell.included) continue;
                cell.solutionColor = Math.floor(Math.random() * this.BOARD_COLORS);
            }

            for (const cell of this.cells) {
                if (!cell.included) continue;

                let bestClueColor = 0;
                let bestClueCount = cell.neighbors.filter(it => it.solutionColor === 0).length;
                for (let i = 1; i < this.BOARD_COLORS; i++) {
                    let nextClueCount = cell.neighbors.filter(it => it.solutionColor === i).length;
                    if (nextClueCount > bestClueCount) {
                        bestClueColor = i;
                        bestClueCount = nextClueCount;
                    }
                }
                const clue = new NMosaicClue(cell.row, cell.col, bestClueColor, bestClueCount);
                this.clues.push(clue);
            }

        } else if (this.BOARD_DIFFICULTY === "sat") {
            // I think sometimes the random board isn't uniquely solvable
            const maxAttempts = 10;
            let allClues: NMosaicClue[] = [];
            let attempts = 0;
            do {
                for (const cell of this.cells) {
                    if (!cell.included) continue;
                    cell.solutionColor = Math.floor(Math.random() * this.BOARD_COLORS);
                }

                allClues = [];
                for (const cell of this.cells) {
                    if (!cell.included) continue;
                    for (let k = 0; k < this.BOARD_COLORS; k++) {
                        const count = cell.neighbors.filter((neighbor) => neighbor.solutionColor === k).length;
                        allClues.push(new NMosaicClue(cell.row, cell.col, k, count));
                    }
                }

                attempts++;
            } while (!this.satHasUniqueSolution(allClues) && attempts < maxAttempts);

            if (attempts >= maxAttempts) {
                console.warn(
                    "SAT difficulty: no unique solution after", maxAttempts,
                    "attempts. Try more colors or a larger board."
                );
            }

            // 2. Phase 1: Remove clues from cells with multiple clues,
            //    reducing to at most one clue per cell.
            const retainedClues = allClues.slice();
            const cluesPerCell = new Map<string, number>();
            for (const clue of allClues) {
                const key = `${clue.row},${clue.col}`;
                cluesPerCell.set(key, (cluesPerCell.get(key) ?? 0) + 1);
            }

            const shuffledPhase1 = allClues.slice().sort(() => Math.random() - 0.5);
            for (const clue of shuffledPhase1) {
                const key = `${clue.row},${clue.col}`;
                if ((cluesPerCell.get(key) ?? 0) <= 1) continue;

                const index = retainedClues.indexOf(clue);
                if (index === -1) continue;
                retainedClues.splice(index, 1);

                if (this.satHasUniqueSolution(retainedClues)) {
                    cluesPerCell.set(key, (cluesPerCell.get(key) ?? 0) - 1);
                } else {
                    retainedClues.splice(index, 0, clue);
                }
            }

            // 4. Phase 2: Try to remove remaining clues (cells with exactly
            //    one clue) until no more can be removed without losing
            //    unique solvability.  Some cells may end up with 0 clues.
            let progress = true;
            while (progress) {
                progress = false;
                const shuffledPhase2 = retainedClues.slice().sort(() => Math.random() - 0.5);
                for (const clue of shuffledPhase2) {
                    const key = `${clue.row},${clue.col}`;
                    if ((cluesPerCell.get(key) ?? 0) === 0) continue;

                    const index = retainedClues.indexOf(clue);
                    if (index === -1) continue;
                    retainedClues.splice(index, 1);

                    if (this.satHasUniqueSolution(retainedClues)) {
                        cluesPerCell.set(key, (cluesPerCell.get(key) ?? 0) - 1);
                        progress = true;
                    } else {
                        retainedClues.splice(index, 0, clue);
                    }
                }
            }

            this.clues = retainedClues;
            console.log(this.clues);
        } else {
            console.log("Unrecognized Difficulty Option");
        }
    }

    generateBoardShape() {
        const totalCells = this.BOARD_HEIGHT * this.BOARD_WIDTH;
        const targetCount = Math.max(1, Math.round(this.BOARD_FRACTION * totalCells));

        const startRow = Math.floor(this.BOARD_HEIGHT / 2);
        const startCol = Math.floor(this.BOARD_WIDTH / 2);
        const startCell = this.getCell(startRow, startCol)!!;
        startCell.included = true;

        const frontier = new Set<NMosaicCell>();
        const addNeighborsToFrontier = (cell: NMosaicCell) => {
            for (let dRow = -1; dRow <= 1; dRow++) {
                for (let dCol = -1; dCol <= 1; dCol++) {
                    if (dRow === 0 && dCol === 0) continue;
                    if (Math.abs(dRow) === Math.abs(dCol)) continue;
                    const neighbor = this.getCell(cell.row + dRow, cell.col + dCol);
                    if (neighbor !== null && !neighbor.included && !frontier.has(neighbor)) {
                        frontier.add(neighbor);
                    }
                }
            }
        };

        addNeighborsToFrontier(startCell);

        while (this.cells.filter(it => it.included).length < targetCount && frontier.size > 0) {
            const frontierArray = Array.from(frontier);
            const nextCell = frontierArray[Math.floor(Math.random() * frontierArray.length)];
            frontier.delete(nextCell);
            nextCell.included = true;
            addNeighborsToFrontier(nextCell);
        }

        for (const cell of this.cells) {
            if (!cell.included) continue;
            for (let dRow = -1; dRow <= 1; dRow++) {
                for (let dCol = -1; dCol <= 1; dCol++) {
                    const neighbor = this.getCell(cell.row + dRow, cell.col + dCol);
                    if (neighbor !== null && neighbor.included) {
                        cell.neighbors.push(neighbor);
                    }
                }
            }
        }
    }

    getCell(row: number, col: number): NMosaicCell | null {
        if (row < 0 || row >= this.BOARD_HEIGHT || col < 0 || col >= this.BOARD_WIDTH) return null;
        return this.cells[row * this.BOARD_WIDTH + col];
    }

    // ─── SAT encoding & solving ─────────────────────────────────────────

    /** Maps (row, col, color) to a 1-based SAT variable id. */
    private varId(row: number, col: number, color: number): number {
        return row * this.BOARD_WIDTH * this.BOARD_COLORS + col * this.BOARD_COLORS + color + 1;
    }

    /**
     * Encodes the puzzle (each included cell has exactly one color; every
     * clue counts the correct number of same-coloured neighbours) as CNF and
     * checks that the intended solution is the unique satisfying assignment.
     */
    satHasUniqueSolution(clues: NMosaicClue[]): boolean {
        const totalUserVars = this.BOARD_HEIGHT * this.BOARD_WIDTH * this.BOARD_COLORS;
        const varCache = new VarCache(totalUserVars);
        const clauses: number[][] = [];

        // Each included cell must have exactly one color.
        for (const cell of this.cells) {
            if (!cell.included) continue;
            const vars: number[] = [];
            for (let k = 0; k < this.BOARD_COLORS; k++) {
                vars.push(this.varId(cell.row, cell.col, k));
            }
            clauses.push(...exactlyOne(vars));
        }

        // Clue: exactly `count` of the clue cell's neighbours are colour `color`.
        for (const clue of clues) {
            const clueCell = this.getCell(clue.row, clue.col)!!;
            const neighborVars = clueCell.neighbors
                .filter((neighbor) => neighbor.included)
                .map((neighbor) => this.varId(neighbor.row, neighbor.col, clue.color));

            if (clue.count === 0) {
                // exactlyK() does not handle k = 0; force every literal false.
                for (const v of neighborVars) {
                    clauses.push([-v]);
                }
            } else {
                clauses.push(...exactlyK(neighborVars, clue.count, varCache));
            }
        }

        // The intended solution must satisfy the puzzle.
        const totalVars = varCache.last;
        if (!satSolve(totalVars, clauses)) return false;

        // Negate the intended solution; UNSAT means it is the unique one.
        const blockingClause: number[] = [];
        for (const cell of this.cells) {
            if (!cell.included || cell.solutionColor === null) continue;
            blockingClause.push(-this.varId(cell.row, cell.col, cell.solutionColor));
        }
        clauses.push(blockingClause);

        return !satSolve(totalVars, clauses);
    }

    drawBackground() {
        this.ctx.fillStyle = "#808080";
        this.ctx.fillRect(0, 0, this.WIDTH, this.HEIGHT);
        const squareWidth = this.WIDTH / this.BOARD_WIDTH;
        const squareHeight = this.HEIGHT / this.BOARD_HEIGHT;

        this.ctx.strokeStyle = "#000000";
        this.ctx.lineWidth = 1;

        for (let row = 0; row <= this.BOARD_HEIGHT; row++) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, row * squareHeight);
            this.ctx.lineTo(this.WIDTH, row * squareHeight);
            this.ctx.stroke();
        }

        for (let col = 0; col <= this.BOARD_WIDTH; col++) {
            this.ctx.beginPath();
            this.ctx.moveTo(col * squareWidth, 0);
            this.ctx.lineTo(col * squareWidth, this.HEIGHT);
            this.ctx.stroke();
        }
    }

    drawPalette() {
        this.paletteCtx.fillStyle = "#808080";
        this.paletteCtx.fillRect(0, 0, this.PALETTE_WIDTH, this.PALETTE_HEIGHT);

        const swatchSize = 44;
        const gap = 10;
        const spacing = swatchSize + gap;
        const totalHeight = this.BOARD_COLORS * spacing - gap;
        const startX = (this.PALETTE_WIDTH - swatchSize) / 2;
        const startY = (this.PALETTE_HEIGHT - totalHeight) / 2;

        for (let i = 0; i < this.BOARD_COLORS; i++) {
            const x = startX;
            const y = startY + i * spacing;

            this.paletteCtx.fillStyle = this.PALETTE[i];
            this.paletteCtx.fillRect(x, y, swatchSize, swatchSize);

            if (i === this.selectedColor) {
                this.paletteCtx.strokeStyle = "#ffffff";
                this.paletteCtx.lineWidth = 3;
                this.paletteCtx.strokeRect(x, y, swatchSize, swatchSize);
            } else {
                // this.paletteCtx.strokeStyle = "#ffffff";
                // this.paletteCtx.lineWidth = 3;
            }
        }
    }

    drawBoard() {
        const squareWidth = this.WIDTH / this.BOARD_WIDTH;
        const squareHeight = this.HEIGHT / this.BOARD_HEIGHT;
        const fontSize = Math.max(10, Math.min(squareWidth, squareHeight) * 0.6);

        for (const cell of this.cells) {
            if (!cell.included) {
                this.ctx.fillStyle = "#000000"
                this.ctx.fillRect(
                    cell.col * squareWidth + 1,
                    cell.row * squareHeight + 1,
                    squareWidth - 2,
                    squareHeight - 2
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
                    squareHeight - 2
                );
            }
        }

        this.ctx.font = `bold ${fontSize}px "Roboto Mono", monospace`;
        this.ctx.textAlign = "center";
        this.ctx.textBaseline = "middle";

        // Group clues by cell so we can render multi-clue cells properly.
        const cluesByCell = new Map<string, NMosaicClue[]>();
        for (const clue of this.clues) {
            if (clue.color === null) continue;
            const key = `${clue.row},${clue.col}`;
            if (!cluesByCell.has(key)) cluesByCell.set(key, []);
            cluesByCell.get(key)!!.push(clue);
        }

        for (const [cellKey, cellClues] of cluesByCell) {
            const clue = cellClues[0];
            const clueCell = this.getCell(clue.row, clue.col)!!;

            // Validate every clue on this cell; draw a red X if any is wrong.
            let anyInvalid = false;
            for (const c of cellClues) {
                let positiveGuessCount = 0;
                let negativeGuessCount = 0;
                let totalSpaces = 0;
                for (const neighbor of clueCell.neighbors) {
                    totalSpaces += 1;
                    if (neighbor.color === c.color) positiveGuessCount += 1;
                    if (neighbor.color !== null && neighbor.color !== c.color) negativeGuessCount += 1;
                }
                if (positiveGuessCount > c.count || (totalSpaces - negativeGuessCount) < c.count) {
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
                const parts: { text: string; color: string | null }[] = [];
                for (let i = 0; i < cellClues.length; i++) {
                    if (i > 0) parts.push({ text: ",", color: null });
                    parts.push({ text: cellClues[i].count.toString(), color: this.PALETTE[cellClues[i].color] });
                }

                const baseFontSize = fontSize + 2;
                this.ctx.font = `bold ${baseFontSize}px "Roboto Mono", monospace`;
                const maxWidth = squareWidth - 6;
                let totalWidth = parts.reduce(
                    (acc, p) => acc + this.ctx.measureText(p.text).width,
                    0
                );
                const drawFontSize = totalWidth > maxWidth
                    ? Math.max(8, Math.floor(baseFontSize * maxWidth / totalWidth))
                    : baseFontSize;
                this.ctx.font = `bold ${drawFontSize}px "Roboto Mono", monospace`;

                totalWidth = parts.reduce(
                    (acc, p) => acc + this.ctx.measureText(p.text).width,
                    0
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

        if (this.puzzleComplete) {
            this.ctx.font = `bold 96px "Roboto Mono", monospace`;
            this.ctx.fillStyle = "#ffffff";
            this.ctx.fillText("YOU WIN", this.WIDTH / 2, this.HEIGHT / 2, this.WIDTH);
            this.ctx.strokeStyle = "#000000";
            this.ctx.lineWidth = 1;
            this.ctx.strokeText("YOU WIN", this.WIDTH / 2, this.HEIGHT / 2, this.WIDTH);
        }
    }
}

function nMosaicMain() {
    const regenerateButton = document.getElementById("n_mosaic_regenerate")!! as HTMLButtonElement;
    const revealSolutionButton = document.getElementById("n_mosaic_reveal_solution")!! as HTMLButtonElement;
    const heightInput = document.getElementById("n_mosaic_height")!! as HTMLInputElement;
    const widthInput = document.getElementById("n_mosaic_width")!! as HTMLInputElement;
    const colorsInput = document.getElementById("n_mosaic_colors")!! as HTMLInputElement;
    const canvas = document.getElementById("n_mosaic_board")!! as HTMLCanvasElement;
    const paletteCanvas = document.getElementById("n_mosaic_palette")!! as HTMLCanvasElement;
    const shapeFractionInput = document.getElementById("n_mosaic_shape_fraction")!! as HTMLInputElement;
    const difficultyInput = document.getElementById("n_mosaic_difficulty")!! as HTMLSelectElement;
    const nMosaic: NMosaic = new NMosaic(parseInt(heightInput.value), parseInt(widthInput.value), parseInt(colorsInput.value), parseFloat(shapeFractionInput.value), difficultyInput.value, canvas, paletteCanvas);

    function handlePaletteClick(e: MouseEvent) {
        const rect = paletteCanvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        const swatchSize = 44;
        const gap = 10;
        const spacing = swatchSize + gap;
        const totalHeight = nMosaic.BOARD_COLORS * spacing - gap;
        const startX = (nMosaic.PALETTE_WIDTH - swatchSize) / 2;
        const startY = (nMosaic.PALETTE_HEIGHT - totalHeight) / 2;

        if (x < startX - 5 || x > startX + swatchSize + 5) return;

        const relativeY = y - startY;
        const index = Math.floor(relativeY / spacing);
        const offsetInSwatch = relativeY - index * spacing;
        if (index < 0 || index >= nMosaic.BOARD_COLORS || offsetInSwatch < -5 || offsetInSwatch > swatchSize + 5) return;

        nMosaic.selectedColor = index;
    }

    function changeSelectedColor(direction: number) {
        nMosaic.selectedColor = (nMosaic.selectedColor + direction + nMosaic.BOARD_COLORS) % nMosaic.BOARD_COLORS;
    }

    function selectColorByNumber(num: number) {
        if (num >= 1 && num <= nMosaic.BOARD_COLORS) {
            nMosaic.selectedColor = num - 1;
        }
    }

    function handleKeyDown(e: KeyboardEvent) {
        if (e.key >= "1" && e.key <= "9") {
            selectColorByNumber(parseInt(e.key, 10));
        }
    }

    window.addEventListener("keydown", handleKeyDown);

    function handleWheel(e: WheelEvent) {
        e.preventDefault();
        if (e.deltaY > 0) {
            changeSelectedColor(1);
        } else {
            changeSelectedColor(-1);
        }
    }

    let isPainting = false;
    let paintButton: number = 0;

    function paintAt(x: number, y: number) {
        if (nMosaic.puzzleComplete) return;
        const squareWidth = nMosaic.WIDTH / nMosaic.BOARD_WIDTH;
        const squareHeight = nMosaic.HEIGHT / nMosaic.BOARD_HEIGHT;

        const col = Math.floor(x / squareWidth);
        const row = Math.floor(y / squareHeight);

        const cell = nMosaic.getCell(row, col);
        if (cell !== null && cell.included) {
            if (paintButton === 2) {
                cell.color = null;
            } else if (paintButton === 0) {
                cell.color = nMosaic.selectedColor;
            }

            const allCluesValid = nMosaic.clues.every((clue) => {
                const clueCell = nMosaic.getCell(clue.row, clue.col);
                if (!clueCell) return false;
                const guessCount = clueCell.neighbors.filter((neighbor) => neighbor.color === clue.color).length;
                return guessCount === clue.count;
            });
            if (nMosaic.cells.every((cell) => !cell.included || cell.color !== null) && allCluesValid) {
                nMosaic.puzzleComplete = true;
            }
        }
    }

    function startPaint(e: MouseEvent) {
        isPainting = true;
        paintButton = e.button;
        const rect = canvas.getBoundingClientRect();
        paintAt(e.clientX - rect.left, e.clientY - rect.top);
    }

    function continuePaint(e: MouseEvent) {
        if (!isPainting) return;
        const rect = canvas.getBoundingClientRect();
        paintAt(e.clientX - rect.left, e.clientY - rect.top);
    }

    function endPaint() {
        isPainting = false;
    }

    canvas.addEventListener("mousedown", startPaint);
    canvas.addEventListener("mousemove", continuePaint);
    window.addEventListener("mouseup", endPaint);

    paletteCanvas.addEventListener("mousedown", handlePaletteClick);

    canvas.addEventListener("contextmenu", (e) => e.preventDefault());
    paletteCanvas.addEventListener("contextmenu", (e) => e.preventDefault());

    canvas.addEventListener("wheel", handleWheel, { passive: false });
    paletteCanvas.addEventListener("wheel", handleWheel, { passive: false });

    function regenerate() {
        nMosaic.regenerate(parseInt(heightInput.value), parseInt(widthInput.value), parseInt(colorsInput.value), parseFloat(shapeFractionInput.value), difficultyInput.value);
    }

    regenerateButton.onclick = regenerate;
    revealSolutionButton.onclick = (() => {
        nMosaic.showSolution = !nMosaic.showSolution;
        if (nMosaic.showSolution) {
            revealSolutionButton.textContent = "HideSolution()";
        } else {
            revealSolutionButton.textContent = "ShowSolution()";
        }
    });

    function gameLoop() {
        nMosaic.drawBackground();
        nMosaic.drawBoard();
        nMosaic.drawPalette();

        requestAnimationFrame(gameLoop);
    }

    requestAnimationFrame(gameLoop);
}

nMosaicMain();
