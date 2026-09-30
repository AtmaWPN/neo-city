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
  const seedrandom = Math.seedrandom;
  function shuffleInPlace(items, rng) {
    for (let i = items.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      const tmp = items[i];
      items[i] = items[j];
      items[j] = tmp;
    }
  }
  function popcountMask(mask) {
    let count = 0;
    while (mask) {
      mask &= mask - 1n;
      count++;
    }
    return count;
  }
  function lowestSetBitIndex(mask) {
    let index = 0;
    while ((mask & 1n) === 0n) {
      mask >>= 1n;
      index++;
    }
    return index;
  }
  class NMosaic {
    cells;
    clueMap;
    candidates = null;
    BOARD_HEIGHT;
    BOARD_WIDTH;
    BOARD_COLORS;
    BOARD_FRACTION;
    BOARD_DIFFICULTY;
    /** Seed that produced this puzzle; pass it back in to reproduce it. */
    SEED;
    random;
    puzzleComplete = false;
    /** True while a puzzle is being generated; the board shows a loading overlay. */
    generating = false;
    selectedColor = 0;
    pencilMode = false;
    performanceTracker;
    // Instrumentation for the test dashboard (n_mosaic_test.html).
    satStats = [];
    techniqueCounts = {};
    randomPuzzleTries = 0;
    randomPatternFound = false;
    recipesApplied = 0;
    constructor(height = 10, width = 10, colors = 3, fraction = 0.8, difficulty = "random", seed = NMosaic.randomSeed()) {
      this.BOARD_HEIGHT = height;
      this.BOARD_WIDTH = width;
      this.BOARD_COLORS = colors;
      this.BOARD_FRACTION = fraction;
      this.BOARD_DIFFICULTY = difficulty;
      this.SEED = seed;
      this.cells = [];
      this.clueMap = /* @__PURE__ */ new Map();
    }
    /** A fresh random seed, used whenever the caller doesn't supply one. */
    static randomSeed() {
      if (typeof crypto !== "undefined" && crypto.getRandomValues !== void 0) {
        return crypto.getRandomValues(new Uint32Array(1))[0];
      }
      return Math.floor(Math.random() * 4294967296);
    }
    async regenerate(height = 10, width = 10, colors = 3, fraction = 0.8, difficulty = "random", seed = NMosaic.randomSeed()) {
      this.generating = true;
      this.BOARD_HEIGHT = height;
      this.BOARD_WIDTH = width;
      this.BOARD_COLORS = colors;
      this.BOARD_FRACTION = fraction;
      this.BOARD_DIFFICULTY = difficulty;
      this.SEED = seed;
      this.random = seedrandom(this.SEED);
      this.selectedColor = 0;
      this.pencilMode = false;
      this.satStats = [];
      this.techniqueCounts = {};
      this.randomPuzzleTries = 0;
      this.randomPatternFound = false;
      this.recipesApplied = 0;
      this.cells = [];
      this.clueMap = /* @__PURE__ */ new Map();
      this.puzzleComplete = false;
      for (let row = 0; row < this.BOARD_HEIGHT; row++) {
        for (let col = 0; col < this.BOARD_WIDTH; col++) {
          const cell = new NMosaicCell(row, col);
          this.cells.push(cell);
        }
      }
      this.generateBoardShape();
      try {
        await this.puzzleGeneratorFactory();
      } finally {
        this.generating = false;
      }
    }
    applyRecipe(recipe) {
      for (const item of recipe.toColor) {
        item.cell.solutionColor = item.color;
      }
      for (const clue of recipe.toClue) {
        const clueCell = this.getCell(clue.row, clue.col);
        if (!clueCell) continue;
        const cellClues = this.clueMap.get(clueCell);
        this.clueMap.set(clueCell, cellClues?.concat(clue) ?? [clue]);
      }
    }
    getSimpleRemainderRecipes() {
      const recipes = [];
      for (const cell of this.cells) {
        if (!cell.included) continue;
        if ((this.clueMap.get(cell)?.length ?? 0) > 0) continue;
        const cellNeighbours = [...cell.neighbors];
        const emptyNeighbors = cellNeighbours.filter(
          (n) => n.solutionColor === null
        );
        if (emptyNeighbors.length === 0) continue;
        for (let color = 0; color < this.BOARD_COLORS; color++) {
          const weight = 100 / Math.pow(this.BOARD_COLORS, emptyNeighbors.length);
          const toColor = emptyNeighbors.map((n) => ({ cell: n, color }));
          const count = cellNeighbours.filter(
            (n) => n.solutionColor === color || emptyNeighbors.includes(n)
          ).length;
          const clue = new NMosaicClue(cell.row, cell.col, color, count);
          recipes.push({ toColor, toClue: [clue], weight });
        }
      }
      return recipes;
    }
    solveSimpleRemainder(nMosaic, hint = false) {
      let applicationSet = [];
      for (const entry of nMosaic.clueMap) {
        const cell = entry[0];
        const clues = entry[1];
        const neighbourhood = cell.neighbors;
        for (const clue of clues) {
          const adjustedClue = clue.count - neighbourhood.filter((cell2) => cell2.color === clue.color).length;
          const emptyCells = neighbourhood.filter((cell2) => cell2.color === null);
          if (emptyCells.length > 0 && adjustedClue === emptyCells.length) {
            if (hint) return { applications: 0, hintClues: [cell] };
            applicationSet.push({ cells: emptyCells, color: clue.color });
          }
        }
      }
      applicationSet.forEach((application) => {
        application.cells.forEach((cell) => cell.color = application.color);
      });
      nMosaic.techniqueCounts["SimpleRemainder"] = (nMosaic.techniqueCounts["SimpleRemainder"] ?? 0) + applicationSet.length;
      return { applications: applicationSet.length };
    }
    buildCandidateBoard() {
      const candidateBoard = [];
      for (let row = 0; row < this.BOARD_HEIGHT; row++) {
        candidateBoard.push([]);
        for (let col = 0; col < this.BOARD_WIDTH; col++) {
          const candidates = /* @__PURE__ */ new Set();
          for (let color = 0; color < this.BOARD_COLORS; color++) {
            candidates.add(color);
          }
          candidateBoard[row].push(candidates);
        }
      }
      this.clueMap.forEach((clues, cell) => {
        const neighbourhood = cell.neighbors;
        clues.forEach((clue) => {
          neighbourhood.filter((cell2) => cell2.color !== null).forEach((cell2) => candidateBoard[cell2.row][cell2.col].clear());
          if (clue.count === neighbourhood.filter((cell2) => cell2.color === clue.color).length) {
            neighbourhood.filter((cell2) => cell2.color === null).forEach(
              (cell2) => candidateBoard[cell2.row][cell2.col].delete(clue.color)
            );
          }
        });
      });
      this.candidates = candidateBoard;
    }
    updateCandidateBoard(cell) {
      for (let dRow = -1; dRow <= 1; dRow++) {
        for (let dCol = -1; dCol <= 1; dCol++) {
          if (dRow === 0 && dCol === 0)
            this.candidates[cell.row][cell.col].clear();
          const clueCell = this.getCell(cell.row + dRow, cell.col + dCol);
          this.clueMap.get(clueCell)?.forEach((clue) => {
            if (clue.count === clueCell.neighbors.filter((cell2) => cell2.color === clue.color).length) {
              clueCell.neighbors.filter((cell2) => cell2.color === null).forEach(
                (cell2) => this.candidates[cell2.row][cell2.col].delete(clue.color)
              );
            }
          });
        }
      }
    }
    solveLastCandidate(nMosaic, hint = false) {
      if (nMosaic.candidates === null) nMosaic.buildCandidateBoard();
      let applicationSet = [];
      for (const cell of nMosaic.cells) {
        if (nMosaic.candidates[cell.row][cell.col].size !== 1) continue;
        if (hint) return { applications: 0, hintClues: [cell] };
        applicationSet.push({
          cell,
          color: [...nMosaic.candidates[cell.row][cell.col]][0]
        });
      }
      applicationSet.forEach((application) => {
        application.cell.color = application.color;
        nMosaic.updateCandidateBoard(application.cell);
      });
      nMosaic.techniqueCounts["LastCandidate"] = (nMosaic.techniqueCounts["LastCandidate"] ?? 0) + applicationSet.length;
      return { applications: applicationSet.length };
    }
    solveSimpleCandidateRemainder(nMosaic, hint = false) {
      if (nMosaic.candidates === null) nMosaic.buildCandidateBoard();
      let applicationSet = [];
      for (const entry of nMosaic.clueMap) {
        const cell = entry[0];
        const clues = entry[1];
        const neighbourhood = cell.neighbors;
        for (const clue of clues) {
          const adjustedClue = clue.count - neighbourhood.filter((cell2) => cell2.color === clue.color).length;
          const candidateCells = neighbourhood.filter(
            (cell2) => nMosaic.candidates[cell2.row][cell2.col].has(clue.color)
          );
          if (candidateCells.length > 0 && adjustedClue === candidateCells.length) {
            if (hint) return { applications: 0, hintClues: [cell] };
            applicationSet.push({ cells: candidateCells, color: clue.color });
          }
        }
      }
      applicationSet.forEach((application) => {
        application.cells.forEach((cell) => {
          cell.color = application.color;
          nMosaic.updateCandidateBoard(cell);
        });
      });
      nMosaic.techniqueCounts["SimpleCandidateRemainder"] = (nMosaic.techniqueCounts["SimpleCandidateRemainder"] ?? 0) + applicationSet.length;
      return { applications: applicationSet.length };
    }
    solveSimpleSubsetRemainder(nMosaic, hint = false) {
      if (nMosaic.candidates === null) nMosaic.buildCandidateBoard();
      const cells = nMosaic.cells;
      const boardWidth = nMosaic.BOARD_WIDTH;
      const slotBit = (cell) => 1n << BigInt(cell.row * boardWidth + cell.col);
      const emptyMaskOf = /* @__PURE__ */ new Map();
      const coloredOf = /* @__PURE__ */ new Map();
      const emptySizeOf = /* @__PURE__ */ new Map();
      nMosaic.clueMap.forEach((clues, clueCell) => {
        clues.forEach((clue) => {
          let emptyMask = 0n;
          let colored = 0;
          let emptySize = 0;
          for (const neighbour of clueCell.neighbors) {
            if (neighbour.color === null) {
              emptyMask |= slotBit(neighbour);
              emptySize++;
            } else if (neighbour.color === clue.color) {
              colored++;
            }
          }
          emptyMaskOf.set(clue, emptyMask);
          coloredOf.set(clue, colored);
          emptySizeOf.set(clue, emptySize);
        });
      });
      const hasColorCandidate = (mask, color) => {
        while (mask) {
          const bit = mask & -mask;
          const cell = cells[lowestSetBitIndex(bit)];
          if (nMosaic.candidates[cell.row][cell.col].has(color)) return true;
          mask &= mask - 1n;
        }
        return false;
      };
      let applicationSet = [];
      for (const entry of nMosaic.clueMap) {
        const clueCell = entry[0];
        const clues = entry[1];
        for (const clue of clues) {
          const emptyArea = emptyMaskOf.get(clue);
          const effectiveClueValue = clue.count - coloredOf.get(clue);
          for (let dRow = -2; dRow <= 2; dRow++) {
            for (let dCol = -2; dCol <= 2; dCol++) {
              if (dRow === 0 && dCol === 0 || dRow + dCol < 0) continue;
              const otherCell = this.getCell(
                clueCell.row + dRow,
                clueCell.col + dCol
              );
              if (!otherCell) continue;
              const subClues = nMosaic.clueMap.get(otherCell);
              if (!subClues) continue;
              for (const subClue of subClues) {
                const subEmptyArea = emptyMaskOf.get(subClue);
                if ((subEmptyArea & ~emptyArea) !== 0n) continue;
                const effectiveSubClueValue = subClue.count - coloredOf.get(subClue);
                const exclusiveArea = emptyArea & ~subEmptyArea;
                const exclusiveSize = popcountMask(exclusiveArea);
                if (exclusiveSize === 0) continue;
                if (clue.color === subClue.color) {
                  if (effectiveClueValue - effectiveSubClueValue === exclusiveSize) {
                    if (hint)
                      return {
                        applications: 0,
                        hintClues: [clueCell, otherCell]
                      };
                    applicationSet.push({
                      mask: exclusiveArea,
                      color: clue.color
                    });
                  } else if (effectiveClueValue - effectiveSubClueValue === 0 && hasColorCandidate(exclusiveArea, clue.color)) {
                    if (hint)
                      return {
                        applications: 0,
                        hintClues: [clueCell, otherCell]
                      };
                    applicationSet.push({
                      mask: exclusiveArea,
                      color: clue.color,
                      inverted: true
                    });
                  }
                } else if (effectiveClueValue - (emptySizeOf.get(subClue) - effectiveSubClueValue) === exclusiveSize) {
                  if (hint)
                    return { applications: 0, hintClues: [clueCell, otherCell] };
                  applicationSet.push({
                    mask: exclusiveArea,
                    color: clue.color
                  });
                }
              }
            }
          }
        }
      }
      let applied = 0;
      applicationSet.forEach((application) => {
        let mask = application.mask;
        while (mask) {
          const bit = mask & -mask;
          const cell = cells[lowestSetBitIndex(bit)];
          if (!application.inverted) {
            if (cell.color === null) {
              cell.color = application.color;
              nMosaic.updateCandidateBoard(cell);
              applied++;
            }
          } else if (nMosaic.candidates[cell.row][cell.col].delete(application.color)) {
            applied++;
          }
          mask &= mask - 1n;
        }
      });
      nMosaic.techniqueCounts["SimpleSubsetRemainder"] = (nMosaic.techniqueCounts["SimpleSubsetRemainder"] ?? 0) + applied;
      return { applications: applied };
    }
    // This technique only searches for TNS occurences in n or fewer clues (where n is the number of colors in the puzzle)
    //  and only finds minimal TNS sets
    solveTotalNeighbourhoodSum(nMosaic, hint = false) {
      const allClues = [...nMosaic.clueMap.entries()].flatMap(
        (entry) => entry[1]
      );
      if (allClues.length === 0) return { applications: 0 };
      const cells = nMosaic.cells;
      const boardWidth = nMosaic.BOARD_WIDTH;
      const cellBit = (cell) => 1n << BigInt(cell.row * boardWidth + cell.col);
      const clueCellOf = new Array(allClues.length);
      const emptyMaskOf = new Array(allClues.length);
      const coloredOf = new Array(allClues.length);
      for (let i = 0; i < allClues.length; i++) {
        const clue = allClues[i];
        const clueCell = nMosaic.getCell(clue.row, clue.col);
        clueCellOf[i] = clueCell;
        let emptyMask = 0n;
        let colored = 0;
        for (const neighbour of clueCell.neighbors) {
          if (neighbour.color === null) {
            emptyMask |= cellBit(neighbour);
          } else if (neighbour.color === clue.color) {
            colored++;
          }
        }
        emptyMaskOf[i] = emptyMask;
        coloredOf[i] = colored;
      }
      const applicationSets = [];
      const currentSet = [];
      const colorInSet = new Array(nMosaic.BOARD_COLORS).fill(false);
      function depthFirstSearch(lastIndex, unionMask, unionSize, count) {
        if (unionSize > 0 && unionSize === count) {
          applicationSets.push([...currentSet]);
        }
        for (let i = lastIndex; i < allClues.length; i++) {
          const clue = allClues[i];
          const effectiveClueValue = clue.count - coloredOf[i];
          if (effectiveClueValue <= 0) continue;
          const emptyMask = emptyMaskOf[i];
          if (unionSize > 0 && (emptyMask & unionMask) === 0n) continue;
          if (colorInSet[clue.color]) continue;
          colorInSet[clue.color] = true;
          currentSet.push(i);
          depthFirstSearch(
            i + 1,
            unionMask | emptyMask,
            unionSize + popcountMask(emptyMask & ~unionMask),
            count + effectiveClueValue
          );
          currentSet.pop();
          colorInSet[clue.color] = false;
        }
      }
      depthFirstSearch(0, 0n, 0, 0);
      if (hint) {
        if (applicationSets.length <= 0) return { applications: 0 };
        const application = applicationSets[0];
        return {
          applications: 0,
          hintClues: application.map((clueIdx) => clueCellOf[clueIdx])
        };
      }
      let applied = 0;
      applicationSets.forEach((application) => {
        application.forEach((clueIdx) => {
          const clue = allClues[clueIdx];
          const clueCell = clueCellOf[clueIdx];
          let affected = 0n;
          for (const neighbour of clueCell.neighbors) {
            if (neighbour.color === null) affected |= cellBit(neighbour);
          }
          for (const otherIdx of application) {
            if (otherIdx === clueIdx) continue;
            for (const neighbour of clueCellOf[otherIdx].neighbors) {
              if (neighbour.color === null) {
                affected &= ~cellBit(neighbour);
              }
            }
          }
          while (affected) {
            const bit = affected & -affected;
            const cell = cells[lowestSetBitIndex(bit)];
            cell.color = clue.color;
            nMosaic.updateCandidateBoard(cell);
            applied++;
            affected &= affected - 1n;
          }
        });
      });
      nMosaic.techniqueCounts["TotalNeighbourhoodSum"] = (nMosaic.techniqueCounts["TotalNeighbourhoodSum"] ?? 0) + applied;
      return { applications: applied };
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
          let rng = this.random() * totalWeight;
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
          const savedClues = new Map(this.clueMap);
          const savedColors = /* @__PURE__ */ new Map();
          for (const item of recipe.toColor) {
            savedColors.set(item.cell, item.cell.solutionColor);
          }
          this.applyRecipe(recipe);
          if (await this.satIsConsistent(this.clueMap)) {
            applied = true;
            this.recipesApplied += recipe.toClue.length;
            break;
          }
          this.clueMap = savedClues;
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
          while (solver(this).applications > 0) {
            done = false;
          }
        });
      }
      const solved = this.solved();
      this.cells.forEach((cell) => {
        cell.color = null;
      });
      this.candidates = null;
      await new Promise((resolve) => setTimeout(resolve, 0));
      return solved;
    }
    solved() {
      let cluesSatisfied = true;
      this.clueMap.forEach((clues, cell) => {
        const neighbourhood = cell.neighbors;
        clues.forEach((clue) => {
          const clueSatisfied = neighbourhood.filter((cell2) => cell2.color === clue.color).length === clue.count;
          if (!clueSatisfied) cluesSatisfied = false;
        });
      });
      return this.cells.every((cell) => cell.color !== null || !cell.included) && cluesSatisfied;
    }
    async backwardPuzzleGenerator(solve) {
      let tries = 0;
      let solvable = false;
      while (!solvable) {
        this.generateRandomPuzzle();
        solvable = await solve();
        tries++;
        if (tries > 1e3) break;
      }
      if (tries <= 1e3) {
      } else {
        console.log(
          `Failed to find a solvable random pattern in ${tries} attempts`
        );
      }
      this.randomPuzzleTries = tries;
      this.randomPatternFound = solvable;
      let clueList = [...this.clueMap.values()].flat();
      shuffleInPlace(clueList, this.random);
      let carveSize = Math.floor(2 * clueList.length / 3);
      while (carveSize > this.BOARD_COLORS) {
        const backupClueMap = new Map(this.clueMap);
        this.clueMap = /* @__PURE__ */ new Map();
        clueList.slice(carveSize).forEach((clue) => {
          const clueCell = this.getCell(clue.row, clue.col);
          this.clueMap.set(
            clueCell,
            this.clueMap.get(clueCell)?.concat(clue) ?? [clue]
          );
        });
        const solved = await solve();
        if (!solved) {
          this.clueMap = backupClueMap;
          shuffleInPlace(clueList, this.random);
          carveSize = Math.floor(2 * carveSize / 3);
        } else {
          clueList = clueList.slice(carveSize);
          carveSize = Math.floor(2 * clueList.length / 3);
        }
      }
      for (const removedClue of clueList) {
        const removedClueCell = this.getCell(removedClue.row, removedClue.col);
        if (!removedClueCell) throw new Error("Clue Cell Not Found");
        const newClueList = this.clueMap.get(removedClueCell)?.filter((clue) => clue.color !== removedClue.color) ?? [];
        if (newClueList.length > 0) {
          this.clueMap.set(removedClueCell, newClueList);
        } else {
          this.clueMap.delete(removedClueCell);
        }
        const solved = await solve();
        if (!solved) {
          this.clueMap.set(
            removedClueCell,
            this.clueMap.get(removedClueCell)?.concat(removedClue) ?? [
              removedClue
            ]
          );
        }
      }
    }
    getHint() {
      const techniques = [
        this.solveSimpleRemainder,
        this.solveLastCandidate,
        this.solveSimpleCandidateRemainder,
        this.solveSimpleSubsetRemainder,
        this.solveTotalNeighbourhoodSum
      ];
      let hint = [];
      for (const technique of techniques) {
        const techniqueHint = technique(this, true).hintClues;
        if ((techniqueHint?.length ?? 0) > 0) {
          hint = techniqueHint;
          break;
        }
      }
      return hint;
    }
    async puzzleGeneratorFactory() {
      switch (this.BOARD_DIFFICULTY) {
        case "beginner":
          await this.generateRecipePuzzle([
            () => this.getSimpleRemainderRecipes()
          ]);
          break;
        case "intermediate":
          await this.backwardPuzzleGenerator(
            () => this.techniqueSolve([
              (nMosaic) => this.solveLastCandidate(nMosaic),
              (nMosaic) => this.solveSimpleCandidateRemainder(nMosaic)
            ])
          );
          break;
        case "advanced":
          await this.backwardPuzzleGenerator(
            () => this.techniqueSolve([
              (nMosaic) => this.solveLastCandidate(nMosaic),
              (nMosaic) => this.solveSimpleCandidateRemainder(nMosaic),
              (nMosaic) => this.solveSimpleSubsetRemainder(nMosaic)
            ])
          );
          break;
        case "expert":
          await this.backwardPuzzleGenerator(
            () => this.techniqueSolve([
              (nMosaic) => this.solveLastCandidate(nMosaic),
              (nMosaic) => this.solveSimpleCandidateRemainder(nMosaic),
              (nMosaic) => this.solveSimpleSubsetRemainder(nMosaic),
              (nMosaic) => this.solveTotalNeighbourhoodSum(nMosaic)
            ])
          );
          break;
        case "grandmaster":
        case "sat":
          await this.backwardPuzzleGenerator(
            () => this.satHasUniqueSolution(this.clueMap)
          );
          break;
        case "random":
          this.generateRandomPuzzle();
          this.clueMap.forEach((clues, cell) => {
            if (clues.length === 0) return;
            let worstClue = clues[0];
            clues.forEach((clue) => {
              if (Math.abs(clue.count - 5) < Math.abs(worstClue.count - 5)) {
                worstClue = clue;
              }
            });
            this.clueMap.set(
              cell,
              clues.filter((clue) => clue.color !== worstClue.color)
            );
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
        cell.solutionColor = Math.floor(this.random() * this.BOARD_COLORS);
      });
      this.clueMap = /* @__PURE__ */ new Map();
      for (const cell of this.cells) {
        if (!cell.included) continue;
        const neighbourhood = cell.neighbors;
        for (let c = 0; c < this.BOARD_COLORS; c++) {
          let clueCount = neighbourhood.filter(
            (it) => it.solutionColor === c
          ).length;
          const clue = new NMosaicClue(cell.row, cell.col, c, clueCount);
          this.clueMap.set(cell, this.clueMap.get(cell)?.concat(clue) ?? [clue]);
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
        const nextCell = frontierArray[Math.floor(this.random() * frontierArray.length)];
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
    async satIsConsistent(clueMap) {
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
      clueMap.forEach((clues, cell) => {
        const neighbourhood = cell.neighbors;
        clues.forEach((clue) => {
          const neighborVars = neighbourhood.filter((neighbor) => neighbor.included).map(
            (neighbor) => this.varId(neighbor.row, neighbor.col, clue.color)
          );
          if (clue.count === 0) {
            for (const v of neighborVars) clauses.push([-v]);
          } else {
            clauses.push(...exactlyK(neighborVars, clue.count, varCache));
          }
        });
      });
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
    async satHasUniqueSolution(clueMap) {
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
      clueMap.forEach((clues, cell) => {
        const neighbourhood = cell.neighbors;
        clues.forEach((clue) => {
          const neighborVars = neighbourhood.filter((neighbor) => neighbor.included).map(
            (neighbor) => this.varId(neighbor.row, neighbor.col, clue.color)
          );
          if (clue.count === 0) {
            for (const v of neighborVars) {
              clauses.push([-v]);
            }
          } else {
            clauses.push(...exactlyK(neighborVars, clue.count, varCache));
          }
        });
      });
      const totalVars = varCache.last;
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
