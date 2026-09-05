(() => {
  class NMosaicCell {
    row;
    col;
    color;
    solutionColor;
    neighbors;
    included;
    pencilMarks;
    constructor(row, col) {
      this.row = row;
      this.col = col;
      this.color = null;
      this.solutionColor = null;
      this.neighbors = [];
      this.included = false;
      this.pencilMarks = /* @__PURE__ */ new Set();
    }
  }
  class NMosaicClue {
    row;
    col;
    color;
    count;
    constructor(row, col, color, count) {
      this.row = row;
      this.col = col;
      this.color = color;
      this.count = count;
    }
  }
  function binomial(n, k) {
    if (k < 0 || k > n) return 0;
    if (k === 0 || k === n) return 1;
    k = Math.min(k, n - k);
    let result = 1;
    for (let i = 1; i <= k; i++) {
      result = result * (n - k + i) / i;
    }
    return result;
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
    ctx;
    paletteCtx;
    cells;
    clues;
    HEIGHT;
    WIDTH;
    PALETTE_HEIGHT;
    PALETTE_WIDTH;
    BOARD_HEIGHT;
    BOARD_WIDTH;
    BOARD_COLORS;
    BOARD_FRACTION;
    BOARD_DIFFICULTY;
    showSolution = false;
    puzzleComplete = false;
    selectedColor = 0;
    pencilMode = false;
    constructor(height = 9, width = 9, colors = 2, fraction = 1, difficulty = "random", canvas, paletteCanvas) {
      this.ctx = canvas.getContext("2d");
      this.paletteCtx = paletteCanvas.getContext("2d");
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
      this.regenerate(
        this.BOARD_HEIGHT,
        this.BOARD_WIDTH,
        this.BOARD_COLORS,
        this.BOARD_FRACTION,
        this.BOARD_DIFFICULTY
      );
    }
    regenerate(height = 9, width = 9, colors = 2, fraction = 0.5, difficulty = "random") {
      this.BOARD_HEIGHT = height;
      this.BOARD_WIDTH = width;
      this.BOARD_COLORS = colors;
      this.BOARD_FRACTION = fraction;
      this.BOARD_DIFFICULTY = difficulty;
      this.selectedColor = 0;
      this.pencilMode = false;
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
      if (this.BOARD_DIFFICULTY === "random") {
        this.generateRandomPuzzle();
      } else {
        this.generateRecipePuzzle();
      }
    }
    applyRecipe(recipe) {
      for (const item of recipe.toColor) {
        item.cell.solutionColor = item.color;
      }
      for (const clue of recipe.toClue) {
        this.clues.push(clue);
      }
    }
    getSimpleRemainderRecipes() {
      const recipes = [];
      for (const cell of this.cells) {
        if (!cell.included) continue;
        if (this.clues.some((c) => c.row === cell.row && c.col === cell.col))
          continue;
        const emptyNeighbors = cell.neighbors.filter(
          (n) => n.solutionColor === null
        );
        if (emptyNeighbors.length === 0) continue;
        for (let color = 0; color < this.BOARD_COLORS; color++) {
          const weight = 100 / Math.pow(this.BOARD_COLORS, emptyNeighbors.length);
          const toColor = emptyNeighbors.map((n) => ({ cell: n, color }));
          const count = cell.neighbors.filter(
            (n) => n.solutionColor === color || emptyNeighbors.includes(n)
          ).length;
          const clue = new NMosaicClue(cell.row, cell.col, color, count);
          recipes.push({ toColor, toClue: [clue], weight });
        }
      }
      return recipes;
    }
    getTotalNeighbourhoodSumRecipes() {
      const recipes = [];
      const unclued = this.cells.filter(
        (c) => c.included && !this.clues.some((cl) => cl.row === c.row && cl.col === c.col)
      );
      for (let i = 0; i < unclued.length; i++) {
        for (let j = i + 1; j < unclued.length; j++) {
          const A = unclued[i], B = unclued[j];
          const nA = A.neighbors, nB = B.neighbors;
          const inter = nA.filter((n) => nB.includes(n));
          if (inter.length === 0) continue;
          const excA = nA.filter((n) => !nB.includes(n));
          const excB = nB.filter((n) => !nA.includes(n));
          const emptyExcA = excA.filter((n) => n.solutionColor === null);
          const emptyExcB = excB.filter((n) => n.solutionColor === null);
          if (emptyExcA.length === 0 && emptyExcB.length === 0) continue;
          const emptyInter = inter.filter((n) => n.solutionColor === null);
          const emptyI = emptyInter.length;
          const union = Array.from(/* @__PURE__ */ new Set([...nA, ...nB]));
          const emptyT = union.filter((n) => n.solutionColor === null).length;
          for (let cA = 0; cA < this.BOARD_COLORS; cA++) {
            for (let cB = 0; cB < this.BOARD_COLORS; cB++) {
              if (cA === cB) continue;
              if (excA.some(
                (n) => n.solutionColor !== null && n.solutionColor !== cA
              ))
                continue;
              if (excB.some(
                (n) => n.solutionColor !== null && n.solutionColor !== cB
              ))
                continue;
              if (inter.some(
                (n) => n.solutionColor !== null && n.solutionColor !== cA && n.solutionColor !== cB
              ))
                continue;
              const preCAinA = nA.filter((n) => n.solutionColor === cA).length;
              const preCBinB = nB.filter((n) => n.solutionColor === cB).length;
              for (let X = 0; X <= emptyI; X++) {
                const toColor = [];
                for (const n of emptyExcA) toColor.push({ cell: n, color: cA });
                for (const n of emptyExcB) toColor.push({ cell: n, color: cB });
                const countA = preCAinA + emptyExcA.length + X;
                const countB = preCBinB + emptyExcB.length + (emptyI - X);
                const clueA = new NMosaicClue(A.row, A.col, cA, countA);
                const clueB = new NMosaicClue(B.row, B.col, cB, countB);
                recipes.push({
                  toColor,
                  toClue: [clueA, clueB],
                  weight: 100 * binomial(emptyI, X) / Math.pow(this.BOARD_COLORS, emptyT)
                });
              }
            }
          }
        }
      }
      return recipes;
    }
    getExcludedDifferenceRecipes() {
      const recipes = [];
      const unclued = this.cells.filter(
        (c) => c.included && !this.clues.some((cl) => cl.row === c.row && cl.col === c.col)
      );
      for (let i = 0; i < unclued.length; i++) {
        for (let j = i + 1; j < unclued.length; j++) {
          const A = unclued[i], B = unclued[j];
          const nA = A.neighbors, nB = B.neighbors;
          const inter = nA.filter((n) => nB.includes(n));
          if (inter.length === 0) continue;
          const excA = nA.filter((n) => !nB.includes(n));
          const excB = nB.filter((n) => !nA.includes(n));
          const emptyExcA = excA.filter((n) => n.solutionColor === null);
          const emptyExcB = excB.filter((n) => n.solutionColor === null);
          if (emptyExcA.length === 0 && emptyExcB.length === 0) continue;
          const emptyInter = inter.filter((n) => n.solutionColor === null);
          const emptyI = emptyInter.length;
          const union = Array.from(/* @__PURE__ */ new Set([...nA, ...nB]));
          const emptyT = union.filter((n) => n.solutionColor === null).length;
          for (let c = 0; c < this.BOARD_COLORS; c++) {
            for (let d = 0; d < this.BOARD_COLORS; d++) {
              if (c === d) continue;
              if (excA.some(
                (n) => n.solutionColor !== null && n.solutionColor !== d
              ))
                continue;
              if (excB.some(
                (n) => n.solutionColor !== null && n.solutionColor !== c
              ))
                continue;
              if (inter.some(
                (n) => n.solutionColor !== null && n.solutionColor !== c && n.solutionColor !== d
              ))
                continue;
              const preCAinA = nA.filter((n) => n.solutionColor === c).length;
              const preCBinB = nB.filter((n) => n.solutionColor === c).length;
              for (let X = 0; X <= emptyI; X++) {
                const toColor = [];
                for (const n of emptyExcA) toColor.push({ cell: n, color: d });
                for (const n of emptyExcB) toColor.push({ cell: n, color: c });
                const countA = preCAinA + X;
                const countB = preCBinB + emptyExcB.length + (emptyI - X);
                const clueA = new NMosaicClue(A.row, A.col, c, countA);
                const clueB = new NMosaicClue(B.row, B.col, c, countB);
                recipes.push({
                  toColor,
                  toClue: [clueA, clueB],
                  weight: 100 * binomial(emptyI, X) / Math.pow(this.BOARD_COLORS, emptyT)
                });
              }
            }
          }
        }
      }
      return recipes;
    }
    async generateRecipePuzzle() {
      const recipeGenerators = [];
      if (this.BOARD_DIFFICULTY === "easy") {
        recipeGenerators.push(() => this.getSimpleRemainderRecipes());
      } else if (this.BOARD_DIFFICULTY === "medium") {
        recipeGenerators.push(() => this.getSimpleRemainderRecipes());
        recipeGenerators.push(() => this.getTotalNeighbourhoodSumRecipes());
        recipeGenerators.push(() => this.getExcludedDifferenceRecipes());
      } else if (this.BOARD_DIFFICULTY === "sat") {
        const maxAttempts = 10;
        let allClues = [];
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
              const count = cell.neighbors.filter(
                (neighbor) => neighbor.solutionColor === k
              ).length;
              allClues.push(new NMosaicClue(cell.row, cell.col, k, count));
            }
          }
          attempts++;
        } while (!await this.satHasUniqueSolution(allClues) && attempts < maxAttempts);
        if (attempts >= maxAttempts) {
          console.warn(
            "SAT difficulty: no unique solution after",
            maxAttempts,
            "attempts. Try more colors or a larger board."
          );
        }
        const retainedClues = allClues.slice();
        const cluesPerCell = /* @__PURE__ */ new Map();
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
          if (await this.satHasUniqueSolution(retainedClues)) {
            cluesPerCell.set(key, (cluesPerCell.get(key) ?? 0) - 1);
          } else {
            retainedClues.splice(index, 0, clue);
          }
        }
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
            if (await this.satHasUniqueSolution(retainedClues)) {
              cluesPerCell.set(key, (cluesPerCell.get(key) ?? 0) - 1);
              progress = true;
            } else {
              retainedClues.splice(index, 0, clue);
            }
          }
        }
        this.clues = retainedClues;
        return;
      } else {
        console.log("Unrecognized Difficulty Option");
        return;
      }
      while (true) {
        const allRecipes = [];
        for (const gen of recipeGenerators) {
          allRecipes.push(...gen());
        }
        if (allRecipes.length === 0) break;
        let applied = false;
        while (allRecipes.length > 0 && !applied) {
          const totalWeight = allRecipes.reduce((sum, r) => sum + r.weight, 0);
          let rng = Math.random() * totalWeight;
          let selectedIndex = -1;
          for (let i = 0; i < allRecipes.length; i++) {
            rng -= allRecipes[i].weight;
            if (rng < 0) {
              selectedIndex = i;
              break;
            }
          }
          if (selectedIndex < 0) break;
          const recipe = allRecipes[selectedIndex];
          allRecipes.splice(selectedIndex, 1);
          const savedClues = this.clues.slice();
          const savedColors = /* @__PURE__ */ new Map();
          for (const item of recipe.toColor) {
            savedColors.set(item.cell, item.cell.solutionColor);
          }
          this.applyRecipe(recipe);
          if (await this.satIsConsistent(this.clues)) {
            applied = true;
            break;
          }
          this.clues = savedClues;
          for (const [cell, color] of savedColors) {
            cell.solutionColor = color;
          }
        }
        if (!applied) break;
      }
    }
    generateRandomPuzzle() {
      for (const cell of this.cells) {
        if (!cell.included) continue;
        cell.solutionColor = Math.floor(Math.random() * this.BOARD_COLORS);
      }
      for (const cell of this.cells) {
        if (!cell.included) continue;
        let worstClueColor = 0;
        let worstClueCount = cell.neighbors.filter(
          (it) => it.solutionColor === 0
        ).length;
        for (let i = 1; i < this.BOARD_COLORS; i++) {
          let nextClueCount = cell.neighbors.filter(
            (it) => it.solutionColor === i
          ).length;
          if (nextClueCount < worstClueCount) {
            worstClueColor = i;
            worstClueCount = nextClueCount;
          }
        }
        for (let c = 0; c < this.BOARD_COLORS; c++) {
          if (c === worstClueColor) continue;
          let clueCount = cell.neighbors.filter(
            (it) => it.solutionColor === c
          ).length;
          const clue = new NMosaicClue(cell.row, cell.col, c, clueCount);
          this.clues.push(clue);
        }
      }
      console.log(this.clues);
    }
    generateBoardShape() {
      const totalCells = this.BOARD_HEIGHT * this.BOARD_WIDTH;
      const targetCount = Math.max(
        1,
        Math.round(this.BOARD_FRACTION * totalCells)
      );
      const startRow = Math.floor(this.BOARD_HEIGHT / 2);
      const startCol = Math.floor(this.BOARD_WIDTH / 2);
      const startCell = this.getCell(startRow, startCol);
      startCell.included = true;
      const frontier = /* @__PURE__ */ new Set();
      const addNeighborsToFrontier = (cell) => {
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
      while (this.cells.filter((it) => it.included).length < targetCount && frontier.size > 0) {
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
    getCell(row, col) {
      if (row < 0 || row >= this.BOARD_HEIGHT || col < 0 || col >= this.BOARD_WIDTH)
        return null;
      return this.cells[row * this.BOARD_WIDTH + col];
    }
    /**
     * Checks whether the current clues and already-assigned solution colors
     * are consistent (i.e. there exists at least one full assignment of all
     * cells that satisfies every clue and respects every already-colored cell).
     */
    async satIsConsistent(clues) {
      const totalUserVars = this.BOARD_HEIGHT * this.BOARD_WIDTH * this.BOARD_COLORS;
      const varCache = new VarCache(totalUserVars);
      const clauses = [];
      for (const cell of this.cells) {
        if (!cell.included) continue;
        const vars = [];
        for (let k = 0; k < this.BOARD_COLORS; k++) {
          vars.push(this.varId(cell.row, cell.col, k));
        }
        clauses.push(...exactlyOne(vars));
      }
      for (const clue of clues) {
        const clueCell = this.getCell(clue.row, clue.col);
        const neighborVars = clueCell.neighbors.filter((neighbor) => neighbor.included).map((neighbor) => this.varId(neighbor.row, neighbor.col, clue.color));
        if (clue.count === 0) {
          for (const v of neighborVars) clauses.push([-v]);
        } else {
          clauses.push(...exactlyK(neighborVars, clue.count, varCache));
        }
      }
      for (const cell of this.cells) {
        if (!cell.included || cell.solutionColor === null) continue;
        clauses.push([this.varId(cell.row, cell.col, cell.solutionColor)]);
      }
      const totalVars = varCache.last;
      const result = await satSolveAsync(totalVars, clauses);
      console.log(result);
      return result.SAT;
    }
    // ─── SAT encoding & solving ─────────────────────────────────────────
    /** Maps (row, col, color) to a 1-based SAT variable id. */
    varId(row, col, color) {
      return row * this.BOARD_WIDTH * this.BOARD_COLORS + col * this.BOARD_COLORS + color + 1;
    }
    /**
     * Encodes the puzzle (each included cell has exactly one color; every
     * clue counts the correct number of same-coloured neighbours) as CNF and
     * checks that the intended solution is the unique satisfying assignment.
     */
    async satHasUniqueSolution(clues) {
      const totalUserVars = this.BOARD_HEIGHT * this.BOARD_WIDTH * this.BOARD_COLORS;
      const varCache = new VarCache(totalUserVars);
      const clauses = [];
      for (const cell of this.cells) {
        if (!cell.included) continue;
        const vars = [];
        for (let k = 0; k < this.BOARD_COLORS; k++) {
          vars.push(this.varId(cell.row, cell.col, k));
        }
        clauses.push(...exactlyOne(vars));
      }
      for (const clue of clues) {
        const clueCell = this.getCell(clue.row, clue.col);
        const neighborVars = clueCell.neighbors.filter((neighbor) => neighbor.included).map((neighbor) => this.varId(neighbor.row, neighbor.col, clue.color));
        if (clue.count === 0) {
          for (const v of neighborVars) {
            clauses.push([-v]);
          }
        } else {
          clauses.push(...exactlyK(neighborVars, clue.count, varCache));
        }
      }
      const totalVars = varCache.last;
      const validSolution = await satSolveAsync(totalVars, clauses);
      console.log(validSolution);
      if (!validSolution.SAT) return false;
      const blockingClause = [];
      for (const cell of this.cells) {
        if (!cell.included || cell.solutionColor === null) continue;
        blockingClause.push(-this.varId(cell.row, cell.col, cell.solutionColor));
      }
      clauses.push(blockingClause);
      const uniqueSolution = await satSolveAsync(totalVars, clauses);
      console.log(uniqueSolution);
      return !uniqueSolution.SAT;
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
        }
      }
      const buttonSize = 44;
      const bx = (this.PALETTE_WIDTH - buttonSize) / 2;
      const by = this.PALETTE_HEIGHT - buttonSize - 15;
      this.drawPencilButton(bx, by, buttonSize);
    }
    drawPencilButton(x, y, size) {
      const g = this.paletteCtx;
      g.fillStyle = "#606060";
      g.fillRect(x, y, size, size);
      g.strokeStyle = "#000000";
      g.lineWidth = 2;
      g.strokeRect(x, y, size, size);
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
      g.fillStyle = "#f2d8a7";
      g.beginPath();
      g.moveTo(0, tip);
      g.lineTo(-half, tip + tipLen);
      g.lineTo(half, tip + tipLen);
      g.closePath();
      g.fill();
      g.stroke();
      g.fillStyle = "#333333";
      g.beginPath();
      g.moveTo(0, tip);
      g.lineTo(-half * 0.55, tip + tipLen * 0.5);
      g.lineTo(half * 0.55, tip + tipLen * 0.5);
      g.closePath();
      g.fill();
      g.stroke();
      g.fillStyle = this.PALETTE[this.selectedColor];
      g.fillRect(-half, tip + tipLen, 2 * half, bodyLen);
      g.strokeRect(-half, tip + tipLen, 2 * half, bodyLen);
      g.fillStyle = "#c8a4c8";
      g.fillRect(-half, tip + tipLen + bodyLen - 2, 2 * half, s * 0.1);
      g.strokeRect(-half, tip + tipLen + bodyLen - 2, 2 * half, s * 0.1);
      g.restore();
      if (this.pencilMode) {
        g.strokeStyle = "#ffffff";
        g.lineWidth = 3;
        g.strokeRect(x, y, size, size);
      }
    }
    drawBoard() {
      const squareWidth = this.WIDTH / this.BOARD_WIDTH;
      const squareHeight = this.HEIGHT / this.BOARD_HEIGHT;
      const fontSize = Math.max(10, Math.min(squareWidth, squareHeight) * 0.6);
      for (const cell of this.cells) {
        if (!cell.included) {
          this.ctx.fillStyle = "#000000";
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
      if (!this.showSolution) {
        const cols = this.BOARD_COLORS <= 4 ? 2 : this.BOARD_COLORS <= 6 ? 3 : 4;
        const rows = Math.ceil(this.BOARD_COLORS / cols);
        const subW = squareWidth / cols;
        const subH = squareHeight / rows;
        const dotR = Math.max(2, Math.min(subW, subH) * 0.28);
        for (const cell of this.cells) {
          if (!cell.included || cell.color !== null || cell.pencilMarks.size === 0)
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
      const cluesByCell = /* @__PURE__ */ new Map();
      for (const clue of this.clues) {
        if (clue.color === null) continue;
        const key = `${clue.row},${clue.col}`;
        if (!cluesByCell.has(key)) cluesByCell.set(key, []);
        cluesByCell.get(key).push(clue);
      }
      for (const [cellKey, cellClues] of cluesByCell) {
        const clue = cellClues[0];
        const clueCell = this.getCell(clue.row, clue.col);
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
          if (positiveGuessCount > c.count || totalSpaces - negativeGuessCount < c.count) {
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
          this.ctx.fillStyle = this.PALETTE[clue.color];
          this.ctx.fillText(clue.count.toString(), cx, cy);
          this.ctx.strokeStyle = "#000000";
          this.ctx.lineWidth = 1;
          this.ctx.strokeText(clue.count.toString(), cx, cy);
        } else {
          const parts = [];
          for (let i = 0; i < cellClues.length; i++) {
            if (i > 0) parts.push({ text: ",", color: null });
            parts.push({
              text: cellClues[i].count.toString(),
              color: this.PALETTE[cellClues[i].color]
            });
          }
          const baseFontSize = fontSize + 2;
          this.ctx.font = `bold ${baseFontSize}px "Roboto Mono", monospace`;
          const maxWidth = squareWidth - 6;
          let totalWidth = parts.reduce(
            (acc, p) => acc + this.ctx.measureText(p.text).width,
            0
          );
          const drawFontSize = totalWidth > maxWidth ? Math.max(8, Math.floor(baseFontSize * maxWidth / totalWidth)) : baseFontSize;
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
        this.ctx.strokeText(
          "YOU WIN",
          this.WIDTH / 2,
          this.HEIGHT / 2,
          this.WIDTH
        );
      }
    }
  }
  function nMosaicMain() {
    const regenerateButton = document.getElementById(
      "n_mosaic_regenerate"
    );
    const revealSolutionButton = document.getElementById(
      "n_mosaic_reveal_solution"
    );
    const heightInput = document.getElementById(
      "n_mosaic_height"
    );
    const widthInput = document.getElementById(
      "n_mosaic_width"
    );
    const colorsInput = document.getElementById(
      "n_mosaic_colors"
    );
    const canvas = document.getElementById(
      "n_mosaic_board"
    );
    const paletteCanvas = document.getElementById(
      "n_mosaic_palette"
    );
    const shapeFractionInput = document.getElementById(
      "n_mosaic_shape_fraction"
    );
    const difficultyInput = document.getElementById(
      "n_mosaic_difficulty"
    );
    const nMosaic = new NMosaic(
      parseInt(heightInput.value),
      parseInt(widthInput.value),
      parseInt(colorsInput.value),
      parseFloat(shapeFractionInput.value),
      difficultyInput.value,
      canvas,
      paletteCanvas
    );
    function handlePaletteClick(e) {
      const rect = paletteCanvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const swatchSize = 44;
      const gap = 10;
      const spacing = swatchSize + gap;
      const buttonSize = 44;
      const pencilX = (nMosaic.PALETTE_WIDTH - buttonSize) / 2;
      const pencilY = nMosaic.PALETTE_HEIGHT - buttonSize - 15;
      if (x >= pencilX - 5 && x <= pencilX + buttonSize + 5 && y >= pencilY - 5 && y <= pencilY + buttonSize + 5) {
        nMosaic.pencilMode = !nMosaic.pencilMode;
        return;
      }
      const totalHeight = nMosaic.BOARD_COLORS * spacing - gap;
      const startX = (nMosaic.PALETTE_WIDTH - swatchSize) / 2;
      const startY = (nMosaic.PALETTE_HEIGHT - totalHeight) / 2;
      if (x < startX - 5 || x > startX + swatchSize + 5) return;
      const relativeY = y - startY;
      const index = Math.floor(relativeY / spacing);
      const offsetInSwatch = relativeY - index * spacing;
      if (index < 0 || index >= nMosaic.BOARD_COLORS || offsetInSwatch < -5 || offsetInSwatch > swatchSize + 5)
        return;
      nMosaic.selectedColor = index;
    }
    function changeSelectedColor(direction) {
      nMosaic.selectedColor = (nMosaic.selectedColor + direction + nMosaic.BOARD_COLORS) % nMosaic.BOARD_COLORS;
    }
    function selectColorByNumber(num) {
      if (num >= 1 && num <= nMosaic.BOARD_COLORS) {
        nMosaic.selectedColor = num - 1;
      }
    }
    function handleKeyDown(e) {
      if (e.key >= "1" && e.key <= "9") {
        selectColorByNumber(parseInt(e.key, 10));
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    function handleWheel(e) {
      e.preventDefault();
      if (e.deltaY > 0) {
        changeSelectedColor(1);
      } else {
        changeSelectedColor(-1);
      }
    }
    let isPainting = false;
    let paintButton = 0;
    function paintAt(x, y) {
      if (nMosaic.puzzleComplete) return;
      const squareWidth = nMosaic.WIDTH / nMosaic.BOARD_WIDTH;
      const squareHeight = nMosaic.HEIGHT / nMosaic.BOARD_HEIGHT;
      const col = Math.floor(x / squareWidth);
      const row = Math.floor(y / squareHeight);
      const cell = nMosaic.getCell(row, col);
      if (cell !== null && cell.included) {
        if (nMosaic.pencilMode) {
          if (paintButton === 2) {
            cell.pencilMarks.delete(nMosaic.selectedColor);
          } else if (paintButton === 0) {
            cell.pencilMarks.add(nMosaic.selectedColor);
          }
          return;
        }
        if (paintButton === 2) {
          cell.color = null;
        } else if (paintButton === 0) {
          cell.color = nMosaic.selectedColor;
          cell.pencilMarks.clear();
        }
        const allCluesValid = nMosaic.clues.every((clue) => {
          const clueCell = nMosaic.getCell(clue.row, clue.col);
          if (!clueCell) return false;
          const guessCount = clueCell.neighbors.filter(
            (neighbor) => neighbor.color === clue.color
          ).length;
          return guessCount === clue.count;
        });
        if (nMosaic.cells.every((cell2) => !cell2.included || cell2.color !== null) && allCluesValid) {
          nMosaic.puzzleComplete = true;
        }
      }
    }
    function startPaint(e) {
      isPainting = true;
      paintButton = e.button;
      const rect = canvas.getBoundingClientRect();
      paintAt(e.clientX - rect.left, e.clientY - rect.top);
    }
    function continuePaint(e) {
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
      nMosaic.regenerate(
        parseInt(heightInput.value),
        parseInt(widthInput.value),
        parseInt(colorsInput.value),
        parseFloat(shapeFractionInput.value),
        difficultyInput.value
      );
    }
    regenerateButton.onclick = regenerate;
    revealSolutionButton.onclick = () => {
      nMosaic.showSolution = !nMosaic.showSolution;
      if (nMosaic.showSolution) {
        revealSolutionButton.textContent = "HideSolution()";
      } else {
        revealSolutionButton.textContent = "ShowSolution()";
      }
    };
    function gameLoop() {
      nMosaic.drawBackground();
      nMosaic.drawBoard();
      nMosaic.drawPalette();
      requestAnimationFrame(gameLoop);
    }
    requestAnimationFrame(gameLoop);
  }
  nMosaicMain();
})();
