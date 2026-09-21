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
    cells;
    clues;
    BOARD_HEIGHT;
    BOARD_WIDTH;
    BOARD_COLORS;
    BOARD_FRACTION;
    BOARD_DIFFICULTY;
    puzzleComplete = false;
    selectedColor = 0;
    pencilMode = false;
    // Instrumentation for the test dashboard (n_mosaic_test.html).
    satStats = [];
    techniqueCounts = {};
    randomPuzzleTries = 0;
    randomPatternFound = false;
    recipesApplied = 0;
    constructor(height = 9, width = 9, colors = 2, fraction = 1, difficulty = "random") {
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
    async regenerate(height = 9, width = 9, colors = 2, fraction = 0.5, difficulty = "random") {
      this.BOARD_HEIGHT = height;
      this.BOARD_WIDTH = width;
      this.BOARD_COLORS = colors;
      this.BOARD_FRACTION = fraction;
      this.BOARD_DIFFICULTY = difficulty;
      this.selectedColor = 0;
      this.pencilMode = false;
      this.satStats = [];
      this.techniqueCounts = {};
      this.randomPuzzleTries = 0;
      this.randomPatternFound = false;
      this.recipesApplied = 0;
      this.cells = [];
      this.clues = [];
      this.puzzleComplete = false;
      for (let row = 0; row < this.BOARD_HEIGHT; row++) {
        for (let col = 0; col < this.BOARD_WIDTH; col++) {
          const cell = new NMosaicCell(row, col);
          this.cells.push(cell);
        }
      }
      this.generateBoardShape();
      await this.puzzleGeneratorFactory();
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
    solveSimpleRemainder(nMosaic) {
      let applied = 0;
      nMosaic.clues.forEach((clue) => {
        const neighbourhood = nMosaic.getCell(clue.row, clue.col)?.neighbors ?? [];
        const adjustedClue = clue.count - neighbourhood.filter((cell) => cell.color === clue.color).length;
        const emptyCells = neighbourhood.filter((cell) => cell.color === null);
        if (emptyCells.length > 0 && adjustedClue === emptyCells.length) {
          emptyCells.forEach((cell) => cell.color = clue.color);
          applied++;
        }
      });
      nMosaic.techniqueCounts["SimpleRemainder"] = (nMosaic.techniqueCounts["SimpleRemainder"] ?? 0) + applied;
      return applied;
    }
    buildCandidateBoard(nMosaic) {
      const candidateBoard = [];
      for (let row = 0; row < nMosaic.BOARD_HEIGHT; row++) {
        candidateBoard.push([]);
        for (let col = 0; col < nMosaic.BOARD_WIDTH; col++) {
          const candidates = /* @__PURE__ */ new Set();
          for (let color = 0; color < nMosaic.BOARD_COLORS; color++) {
            candidates.add(color);
          }
          candidateBoard[row].push(candidates);
        }
      }
      nMosaic.clues.forEach((clue) => {
        const neighbourhood = nMosaic.getCell(clue.row, clue.col)?.neighbors ?? [];
        neighbourhood.filter((cell) => cell.color !== null).forEach((cell) => candidateBoard[cell.row][cell.col].clear());
        if (clue.count === neighbourhood.filter((cell) => cell.color === clue.color).length) {
          neighbourhood.filter((cell) => cell.color === null).forEach(
            (cell) => candidateBoard[cell.row][cell.col].delete(clue.color)
          );
        }
      });
      return candidateBoard;
    }
    solveLastCandidate(nMosaic) {
      let applied = 0;
      const candidateBoard = this.buildCandidateBoard(nMosaic);
      for (let row = 0; row < nMosaic.BOARD_HEIGHT; row++) {
        for (let col = 0; col < nMosaic.BOARD_HEIGHT; col++) {
          if (candidateBoard[row][col].size !== 1) continue;
          const cell = nMosaic.getCell(row, col);
          if (!cell) continue;
          cell.color = [...candidateBoard[row][col]][0];
          applied++;
        }
      }
      nMosaic.techniqueCounts["LastCandidate"] = (nMosaic.techniqueCounts["LastCandidate"] ?? 0) + applied;
      return applied;
    }
    solveSimpleCandidateRemainder(nMosaic) {
      let applied = 0;
      const candidateBoard = this.buildCandidateBoard(nMosaic);
      nMosaic.clues.forEach((clue) => {
        const neighbourhood = nMosaic.getCell(clue.row, clue.col)?.neighbors ?? [];
        const adjustedClue = clue.count - neighbourhood.filter((cell) => cell.color === clue.color).length;
        const candidateCells = neighbourhood.filter(
          (cell) => candidateBoard[cell.row][cell.col].has(clue.color)
        );
        if (candidateCells.length > 0 && adjustedClue === candidateCells.length) {
          candidateCells.forEach((cell) => cell.color = clue.color);
          applied++;
        }
      });
      nMosaic.techniqueCounts["SimpleCandidateRemainder"] = (nMosaic.techniqueCounts["SimpleCandidateRemainder"] ?? 0) + applied;
      return applied;
    }
    solveSimpleSubsetRemainder(nMosaic) {
      let applied = 0;
      nMosaic.clues.forEach((clue) => {
        const clueCell = nMosaic.getCell(clue.row, clue.col);
        nMosaic.clues.filter(
          (subClue) => Math.abs(subClue.col - clue.col) <= 2 && Math.abs(subClue.row - clue.row) <= 2
        ).forEach((subClue) => {
          const clueArea = clueCell?.neighbors.filter(
            (neighbour) => neighbour.color === null
          ) ?? [];
          const subClueCell = nMosaic.getCell(subClue.row, subClue.col);
          const subClueArea = subClueCell?.neighbors.filter(
            (neighbour) => neighbour.color === null
          ) ?? [];
          if (!subClueArea.every((cell) => clueArea.includes(cell))) return;
          const effectiveClueValue = clue.count - (clueCell?.neighbors.filter(
            (neighbour) => neighbour.color === clue.color
          )?.length ?? 0);
          const effectiveSubClueValue = subClue.count - (subClueCell?.neighbors.filter(
            (neighbour) => neighbour.color === subClue.color
          )?.length ?? 0);
          const clueExclusiveArea = clueArea.filter(
            (cell) => !subClueArea.includes(cell)
          );
          if (clue.color === subClue.color) {
            if (clueExclusiveArea.length > 0 && effectiveClueValue - effectiveSubClueValue === clueExclusiveArea.length) {
              applied++;
              clueExclusiveArea.forEach((cell) => cell.color = clue.color);
            }
          } else {
            if (clueExclusiveArea.length > 0 && effectiveClueValue - (subClueArea.length - effectiveSubClueValue) === clueExclusiveArea.length) {
              applied++;
              clueExclusiveArea.forEach((cell) => cell.color = clue.color);
            }
          }
        });
      });
      nMosaic.techniqueCounts["SimpleSubsetRemainder"] = (nMosaic.techniqueCounts["SimpleSubsetRemainder"] ?? 0) + applied;
      return applied;
    }
    solveTotalNeighbourhoodSum(nMosaic) {
      let applied = 0;
      nMosaic.clues.forEach((clueA) => {
        nMosaic.clues.filter(
          (clueB) => Math.abs(clueB.col - clueA.col) <= 2 && Math.abs(clueB.row - clueA.row) <= 2
        ).forEach((clueB) => {
          const clueARegion = nMosaic.getCell(clueA.row, clueA.col)?.neighbors ?? [];
          const clueBRegion = nMosaic.getCell(clueB.row, clueB.col)?.neighbors ?? [];
          const clueAOpen = clueARegion.filter((cell) => cell.color === null);
          const clueBOpen = clueBRegion.filter((cell) => cell.color === null);
          const intersection = clueAOpen.filter(
            (cell) => clueBOpen.includes(cell)
          );
          const aMinusB = clueAOpen.filter((cell) => !clueBOpen.includes(cell));
          const bMinusA = clueBOpen.filter((cell) => !clueAOpen.includes(cell));
          if (!(intersection.length > 0 && aMinusB.length > 0 && bMinusA.length > 0))
            return;
          const effectiveClueA = clueA.count - clueARegion.filter((cell) => cell.color === clueA.color).length;
          const effectiveClueB = clueB.count - clueBRegion.filter((cell) => cell.color === clueB.color).length;
          if (clueA.color !== clueB.color && effectiveClueA + effectiveClueB === clueAOpen.length + bMinusA.length) {
            aMinusB.forEach((cell) => cell.color = clueA.color);
            bMinusA.forEach((cell) => cell.color = clueB.color);
            applied++;
          } else if (clueA.color === clueB.color) {
            if (effectiveClueA - aMinusB.length === effectiveClueB) {
              aMinusB.forEach((cell) => cell.color = clueA.color);
              applied++;
            } else if (effectiveClueB - bMinusA.length === effectiveClueA) {
              bMinusA.forEach((cell) => cell.color = clueB.color);
              applied++;
            }
          }
        });
      });
      nMosaic.techniqueCounts["TotalNeighbourhoodSum"] = (nMosaic.techniqueCounts["TotalNeighbourhoodSum"] ?? 0) + applied;
      return applied;
    }
    async generateRecipePuzzle(recipeGenerators) {
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
            this.recipesApplied += recipe.toClue.length;
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
    async techniqueSolve(techniqueSolvers) {
      let done = false;
      while (!done) {
        done = true;
        techniqueSolvers.forEach((solver) => {
          while (solver(this) > 0) {
            done = false;
          }
        });
      }
      const solved = this.cells.every((cell) => cell.color !== null || !cell.included) && this.clues.every((clue) => {
        const neighbourhood = this.getCell(clue.row, clue.col)?.neighbors ?? [];
        return neighbourhood.filter((cell) => cell.color === clue.color).length === clue.count;
      });
      this.cells.forEach((cell) => {
        cell.color = null;
      });
      return solved;
    }
    async backwardPuzzleGenerator(solve) {
      let tries = 0;
      let solvable = false;
      while (!solvable) {
        this.generateRandomPuzzle();
        solvable = await solve();
        tries++;
        if (tries > 1e5) break;
      }
      if (tries <= 1e5) {
        console.log(`Found a solvable random pattern in ${tries} attempts`);
      } else {
        console.log(
          `Failed to find a solvable random pattern in ${tries} attempts`
        );
      }
      this.randomPuzzleTries = tries;
      this.randomPatternFound = solvable;
      this.clues.sort(() => Math.random() - 0.5);
      const maxAttempts = this.clues.length;
      let counter = 0;
      while (counter <= maxAttempts) {
        const removedClue = this.clues.shift();
        if (!removedClue) throw new Error("clues is empty");
        counter++;
        const solved = await solve();
        if (!solved) {
          this.clues.push(removedClue);
        }
      }
    }
    async puzzleGeneratorFactory() {
      switch (this.BOARD_DIFFICULTY) {
        case "easy forward":
          await this.generateRecipePuzzle([() => this.getSimpleRemainderRecipes()]);
          break;
        case "hard forward":
          await this.generateRecipePuzzle([
            () => this.getSimpleRemainderRecipes(),
            () => this.getTotalNeighbourhoodSumRecipes(),
            () => this.getExcludedDifferenceRecipes()
          ]);
          break;
        case "easy backward":
          await this.backwardPuzzleGenerator(() => this.techniqueSolve([
            (nMosaic) => this.solveSimpleRemainder(nMosaic)
          ]));
          break;
        case "medium backward":
          await this.backwardPuzzleGenerator(() => this.techniqueSolve([
            (nMosaic) => this.solveSimpleRemainder(nMosaic),
            (nMosaic) => this.solveLastCandidate(nMosaic),
            (nMosaic) => this.solveSimpleCandidateRemainder(nMosaic)
          ]));
          break;
        case "hard backward":
          await this.backwardPuzzleGenerator(() => this.techniqueSolve([
            (nMosaic) => this.solveSimpleRemainder(nMosaic),
            (nMosaic) => this.solveLastCandidate(nMosaic),
            (nMosaic) => this.solveSimpleCandidateRemainder(nMosaic),
            (nMosaic) => this.solveSimpleSubsetRemainder(nMosaic),
            (nMosaic) => this.solveTotalNeighbourhoodSum(nMosaic)
          ]));
          break;
        case "sat backward":
          await this.backwardPuzzleGenerator(() => this.satHasUniqueSolution(this.clues));
          break;
        case "random":
          this.generateRandomPuzzle();
          this.cells.forEach((cell) => {
            const localClues = this.clues.filter(
              (clue) => clue.row === cell.row && clue.col === cell.col
            );
            if (localClues.length === 0) return;
            let worstClue = localClues[0];
            localClues.forEach((clue) => {
              if (Math.abs(clue.count - 5) < Math.abs(worstClue.count - 5)) {
                worstClue = clue;
              }
            });
            const worstClueIndex = this.clues.findIndex((clue) => clue === worstClue);
            this.clues.splice(worstClueIndex, 1);
          });
          break;
        default:
          break;
      }
    }
    generateRandomPuzzle() {
      this.cells.forEach((cell) => {
        cell.color = null;
        if (!cell.included) return;
        cell.solutionColor = Math.floor(Math.random() * this.BOARD_COLORS);
      });
      this.clues = [];
      for (const cell of this.cells) {
        if (!cell.included) continue;
        for (let c = 0; c < this.BOARD_COLORS; c++) {
          let clueCount = cell.neighbors.filter(
            (it) => it.solutionColor === c
          ).length;
          const clue = new NMosaicClue(cell.row, cell.col, c, clueCount);
          this.clues.push(clue);
        }
      }
    }
    // the neighbours in this function have nothing to do with a cell's neighbourhood
    // they are just for generating the board shape
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
      this.recordSatStats("isConsistent", result);
      return result.SAT;
    }
    recordSatStats(phase, result) {
      const stats = result.stats ? {
        totalDecisions: result.stats.totalDecisions,
        totalConflicts: result.stats.totalConflicts,
        totalPropagations: result.stats.totalPropagations,
        totalLearnts: result.stats.totalLearnts,
        maxDecisionLevel: result.stats.maxDecisionLevel,
        maxPropagationDepth: result.stats.maxPropagationDepth
      } : {};
      this.satStats.push({ phase, SAT: result.SAT, stats });
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
      this.recordSatStats("validSolution", validSolution);
      if (!validSolution.SAT) return false;
      const blockingClause = [];
      for (const cell of this.cells) {
        if (!cell.included || cell.solutionColor === null) continue;
        blockingClause.push(-this.varId(cell.row, cell.col, cell.solutionColor));
      }
      clauses.push(blockingClause);
      const uniqueSolution = await satSolveAsync(totalVars, clauses);
      this.recordSatStats("uniqueSolution", uniqueSolution);
      return !uniqueSolution.SAT;
    }
  }
  if (typeof window !== "undefined") {
    const exposed = window;
    exposed.NMosaic = NMosaic;
    exposed.NMosaicCell = NMosaicCell;
    exposed.NMosaicClue = NMosaicClue;
  }
})();
