// https://www.cs.ru.nl/bachelors-theses/2023/Thijs_de_Jong___1015438___Mosaic_as_a_SAT_problem.pdf
// https://www.carstensinz.de/papers/CP-2005.pdf
// https://users.aalto.fi/~tjunttil/2020-DP-AUT/notes-sat/cdcl.html
// https://www.comp.nus.edu.sg/~gregory/sat/

// TODO
// 1. Explore Solving Techniques and using SAT Solver to measure difficulty
// 2. Puzzle Seeds
// 3. Make all Puzzle Generation Async and add a loading bar
//    Inefficiencies:
//      Removing Clues one at a time (especially at the beginning)
//      Erasing solver progress for each removed clue
//      Rebuilding candidate board for each relevant technique call
//      *SSR + TNS clues^2 search
//      *Neighbours as array instead of Set
//      Reevaluating full CNF for each removed clue (SAT only)
// 4. Define Proper Difficulty Settings
//    Beginner: SR
//    Intermediate: LC, SCR
//    Advanced: SSR
//    Expert: Full TNS
//    Grandmaster: Implied Clues
//    Deep Blue: SAT
// 5. Hint System
// 6. THAT'S IT. ONCE THOSE ARE DONE THIS PROJECT IS OFFICIALLY IN "1.0"

// SAT solver globals (loaded from ../SATjs-master/SAT.js and helpers.js)
declare function satSolveAsync(
  size: number,
  clauses: number[][],
): Promise<{ SAT: boolean; stats: Stats }>;
declare function exactlyOne(vars: number[]): number[][];
declare function exactlyK(
  vars: number[],
  k: number,
  varCache: VarCache,
): number[][];
declare class VarCache {
  last: number;
  constructor(max: number);
  getVar(): number;
}
declare class Stats {
  maxPropagationDepth: number;
  maxDecisionLevel: number;
  totalPropagations: number;
  totalDecisions: number;
  totalConflicts: number;
  totalLearnts: number;
}

class NMosaicCell {
  row: number;
  col: number;
  color: number | null;
  solutionColor: number | null;
  neighbors: Set<NMosaicCell>;
  included: boolean;
  pencilMarks: Set<number>;

  constructor(row: number, col: number) {
    this.row = row;
    this.col = col;
    this.color = null;
    this.solutionColor = null;
    this.neighbors = new Set();
    this.included = false;
    this.pencilMarks = new Set();
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

type Recipe = {
  toColor: Array<{ cell: NMosaicCell; color: number }>;
  toClue: Array<NMosaicClue>;
  weight: number;
};

function binomial(n: number, k: number): number {
  if (k < 0 || k > n) return 0;
  if (k === 0 || k === n) return 1;
  k = Math.min(k, n - k);
  let result = 1;
  for (let i = 1; i <= k; i++) {
    result = (result * (n - k + i)) / i;
  }
  return result;
}

/**
 * Seedable randomness comes from ../helpers/seedrandom.js (David Bau, MIT),
 * loaded by the page before n_mosaic.js. It only mounts itself as
 * Math.seedrandom, and invoking that AS a Math method would replace
 * Math.random page-wide instead of returning a PRNG — so grab the reference
 * and call it bare: seedrandom(seed) returns an independent, deterministic
 * PRNG closure whose call() draws a double in [0, 1).
 */
type SeedPRNG = {
  (): number; // double in [0, 1) with a full 52-bit mantissa
  int32(): number; // signed 32-bit integer
  quick(): number; // double in [0, 1) from 32 bits
};

const seedrandom: (seed: number | string) => SeedPRNG = (Math as any)
  .seedrandom;

/** In-place Fisher–Yates shuffle driven by a seedable PRNG. */
function shuffleInPlace<T>(items: T[], rng: () => number): void {
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = items[i];
    items[i] = items[j];
    items[j] = tmp;
  }
}

class NMosaic {
  cells: Array<NMosaicCell>;
  clueMap: Map<NMosaicCell, NMosaicClue[]>;
  BOARD_HEIGHT: number;
  BOARD_WIDTH: number;
  BOARD_COLORS: number;
  BOARD_FRACTION: number;
  BOARD_DIFFICULTY: string;
  /** Seed that produced this puzzle; pass it back in to reproduce it. */
  SEED: number;
  private random: SeedPRNG;
  puzzleComplete: boolean = false;
  selectedColor: number = 0;
  pencilMode: boolean = false;

  // Instrumentation for the test dashboard (n_mosaic_test.html).
  satStats: Array<{
    phase: string;
    SAT: boolean;
    stats: Record<string, number>;
  }> = [];
  techniqueCounts: Record<string, number> = {};
  randomPuzzleTries: number = 0;
  randomPatternFound: boolean = false;
  recipesApplied: number = 0;

  constructor(
    height: number = 10,
    width: number = 10,
    colors: number = 3,
    fraction: number = 0.8,
    difficulty: string = "random",
    seed: number = NMosaic.randomSeed(),
  ) {
    this.BOARD_HEIGHT = height;
    this.BOARD_WIDTH = width;
    this.BOARD_COLORS = colors;
    this.BOARD_FRACTION = fraction;
    this.BOARD_DIFFICULTY = difficulty;
    this.SEED = seed;

    this.cells = [];
    this.clueMap = new Map();
  }

  /** A fresh random seed, used whenever the caller doesn't supply one. */
  static randomSeed(): number {
    if (typeof crypto !== "undefined" && crypto.getRandomValues !== undefined) {
      return crypto.getRandomValues(new Uint32Array(1))[0];
    }
    return Math.floor(Math.random() * 4294967296);
  }

  async regenerate(
    height: number = 9,
    width: number = 9,
    colors: number = 2,
    fraction: number = 0.5,
    difficulty: string = "random",
    seed: number = NMosaic.randomSeed(),
  ) {
    this.BOARD_HEIGHT = height;
    this.BOARD_WIDTH = width;
    this.BOARD_COLORS = colors;
    this.BOARD_FRACTION = fraction;
    this.BOARD_DIFFICULTY = difficulty;
    // No seed passed means "fresh random puzzle" (keeps the test dashboard's
    // batch loop producing independent boards). A seed passed again always
    // reproduces the exact same board, shape, solution and clues.
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
    this.clueMap = new Map();
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

  applyRecipe(recipe: Recipe): void {
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

  getSimpleRemainderRecipes(): Recipe[] {
    const recipes: Recipe[] = [];

    this.clueMap.forEach((value, key) => {
      value.forEach((clue) => {});
    });

    for (const cell of this.cells) {
      if (!cell.included) continue;
      if ((this.clueMap.get(cell)?.length ?? 0) > 0) continue;
      const emptyNeighbors = [...cell.neighbors].filter(
        (n) => n.solutionColor === null,
      );
      if (emptyNeighbors.length === 0) continue;

      for (let color = 0; color < this.BOARD_COLORS; color++) {
        const weight = 100 / Math.pow(this.BOARD_COLORS, emptyNeighbors.length);
        const toColor: Array<{ cell: NMosaicCell; color: number }> =
          emptyNeighbors.map((n) => ({ cell: n, color }));
        const count = [...cell.neighbors].filter(
          (n) => n.solutionColor === color || emptyNeighbors.includes(n),
        ).length;
        const clue = new NMosaicClue(cell.row, cell.col, color, count);
        recipes.push({ toColor, toClue: [clue], weight });
      }
    }
    return recipes;
  }

  solveSimpleRemainder(nMosaic: NMosaic): number {
    let applicationSet: {cells: NMosaicCell[], color: number}[] = [];

    nMosaic.clueMap.forEach((clues, cell) => {
      clues.forEach((clue) => {
        const neighbourhood = cell.neighbors ?? new Set();
        const adjustedClue =
          clue.count -
          [...neighbourhood].filter((cell) => cell.color === clue.color).length;
        const emptyCells = [...neighbourhood].filter(
          (cell) => cell.color === null,
        );
        if (emptyCells.length > 0 && adjustedClue === emptyCells.length) {
          applicationSet.push({ cells: emptyCells, color: clue.color });
        }
      });
    });

    applicationSet.forEach((application) => {
      application.cells.forEach((cell) => cell.color = application.color);
    });

    // console.log("Simple Remainder:", applied);
    nMosaic.techniqueCounts["SimpleRemainder"] =
      (nMosaic.techniqueCounts["SimpleRemainder"] ?? 0) + applicationSet.length;
    return applicationSet.length;
  }

  buildCandidateBoard(nMosaic: NMosaic): Set<number>[][] {
    const candidateBoard: Set<number>[][] = [];
    for (let row = 0; row < nMosaic.BOARD_HEIGHT; row++) {
      candidateBoard.push([]);
      for (let col = 0; col < nMosaic.BOARD_WIDTH; col++) {
        const candidates = new Set<number>();
        for (let color = 0; color < nMosaic.BOARD_COLORS; color++) {
          candidates.add(color);
        }
        candidateBoard[row].push(candidates);
      }
    }

    nMosaic.clueMap.forEach((clues, cell) => {
      clues.forEach((clue) => {
        [...cell.neighbors]
          .filter((cell) => cell.color !== null)
          .forEach((cell) => candidateBoard[cell.row][cell.col].clear());

        if (
          clue.count ===
          [...cell.neighbors].filter((cell) => cell.color === clue.color).length
        ) {
          [...cell.neighbors]
            .filter((cell) => cell.color === null)
            .forEach((cell) =>
              candidateBoard[cell.row][cell.col].delete(clue.color),
            );
        }
      });
    });

    return candidateBoard;
  }

  solveLastCandidate(nMosaic: NMosaic): number {
    let applied: number = 0;
    const candidateBoard = this.buildCandidateBoard(nMosaic);

    nMosaic.cells.forEach((cell) => {
      if (candidateBoard[cell.row][cell.col].size !== 1) return;

      cell.color = [...candidateBoard[cell.row][cell.col]][0];
      applied++;
    });

    // console.log("Last Candidate:", applied);
    nMosaic.techniqueCounts["LastCandidate"] =
      (nMosaic.techniqueCounts["LastCandidate"] ?? 0) + applied;
    return applied;
  }

  solveSimpleCandidateRemainder(nMosaic: NMosaic): number {
    const candidateBoard = this.buildCandidateBoard(nMosaic);

    let applicationSet: {cells: NMosaicCell[], color: number}[] = [];

    nMosaic.clueMap.forEach((clues, cell) => {
      clues.forEach((clue) => {
        const adjustedClue =
          clue.count -
          [...cell.neighbors].filter((cell) => cell.color === clue.color)
            .length;
        const candidateCells = [...cell.neighbors].filter((cell) =>
          candidateBoard[cell.row][cell.col].has(clue.color),
        );
        if (
          candidateCells.length > 0 &&
          adjustedClue === candidateCells.length
        ) {
          applicationSet.push({ cells: candidateCells, color: clue.color });
        }
      });
    });

    applicationSet.forEach((application) => {
      application.cells.forEach((cell) => cell.color = application.color);
    });

    // console.log("Simple Candidate Remainder:", applied);
    nMosaic.techniqueCounts["SimpleCandidateRemainder"] =
      (nMosaic.techniqueCounts["SimpleCandidateRemainder"] ?? 0) + applicationSet.length;
    return applicationSet.length;
  }

  solveSimpleSubsetRemainder(nMosaic: NMosaic): number {
    let applicationSet: {cells: NMosaicCell[], color: number}[] = [];

    nMosaic.clueMap.forEach((clues, cell) => {
      clues.forEach((clue) => {
        for (let dRow = -2; dRow <= 2; dRow++) {
          for (let dCol = -2; dCol <= 2; dCol++) {
            if (dRow === 0 && dCol === 0) continue;
            const otherCell = this.getCell(cell.row + dRow, cell.col + dCol);

            if (!otherCell) continue;
            const subClues = nMosaic.clueMap.get(otherCell);

            subClues?.forEach((subClue) => {
              const clueArea =
                [...cell.neighbors].filter(
                  (neighbour) => neighbour.color === null,
                ) ?? [];
              const subClueArea =
                [...otherCell.neighbors].filter(
                  (neighbour) => neighbour.color === null,
                ) ?? [];
              if (!subClueArea.every((cell) => clueArea.includes(cell))) return;

              const effectiveClueValue =
                clue.count -
                ([...cell.neighbors].filter(
                  (neighbour) => neighbour.color === clue.color,
                )?.length ?? 0);
              const effectiveSubClueValue =
                subClue.count -
                ([...otherCell.neighbors].filter(
                  (neighbour) => neighbour.color === subClue.color,
                )?.length ?? 0);

              const clueExclusiveArea = clueArea.filter(
                (cell) => !subClueArea.includes(cell),
              );
              // TODO: include candidate removal case
              if (clue.color === subClue.color) {
                if (
                  clueExclusiveArea.length > 0 &&
                  effectiveClueValue - effectiveSubClueValue ===
                    clueExclusiveArea.length
                ) {
                  applicationSet.push({ cells: clueExclusiveArea, color: clue.color });
                }
              } else {
                if (
                  clueExclusiveArea.length > 0 &&
                  effectiveClueValue -
                    (subClueArea.length - effectiveSubClueValue) ===
                    clueExclusiveArea.length
                ) {
                  applicationSet.push({ cells: clueExclusiveArea, color: clue.color });
                }
              }
            });
          }
        }
      });
    });

    applicationSet.forEach((application) => {
      application.cells.forEach((cell) => cell.color = application.color);
    });

    // console.log("Simple Subset Remainder:", applied);
    nMosaic.techniqueCounts["SimpleSubsetRemainder"] =
      (nMosaic.techniqueCounts["SimpleSubsetRemainder"] ?? 0) + applicationSet.length;
    return applicationSet.length;
  }

  // This technique only searches for TNS occurences in n or fewer clues (where n is the number of colors in the puzzle)
  //  and only finds minimal TNS sets
  solveTotalNeighbourhoodSum(nMosaic: NMosaic): number {
    let applied = 0;

    // depth-first search
    //  base case: TNS satisfied for this set, save the set for application later
    //  for each clue in a strict order (Map does maintain a consistent order)
    //   call depth-first search for all clues after this one in the strict ordering which...
    //    are not zero
    //    intersect the current union
    //    is a new color for the current union (for TNS chaining use a more complex rule)

    const allClues = [...nMosaic.clueMap.entries()].flatMap((entry) => entry[1]);
    const clueSet: Set<NMosaicClue> = new Set();
    function depthFirstSearch(lastIndex: number, union: Set<NMosaicCell>, count: number) {
      if (union.size > 0 && union.size === count) {
        // TODO: record application
      }

      for (let i = lastIndex; i < allClues.length; i++) {
        const nextClue = allClues[i];
        const clueCell = nMosaic.getCell(nextClue.row, nextClue.col);
        if (!clueCell) continue;
        const effectiveClueValue = nextClue.count - [...clueCell.neighbors].filter((cell) => cell.color === nextClue.color).length;

        if (effectiveClueValue <= 0) continue;
        if ([...clueCell.neighbors.intersection(union)].filter((cell) => cell.color === null).length === 0) continue;
        if ([...clueSet].some((clue) => clue.color === nextClue.color)) continue;

        clueSet.add(nextClue);
        depthFirstSearch(i + 1, union.union(clueCell.neighbors), count + effectiveClueValue)
        clueSet.delete(nextClue);
      }
    }

    nMosaic.techniqueCounts["TotalNeighbourhoodSum"] =
      (nMosaic.techniqueCounts["TotalNeighbourhoodSum"] ?? 0) + applied;
    return applied;
  }

  async generateRecipePuzzle(
    recipeGenerators: (() => Recipe[])[],
  ): Promise<void> {
    while (true) {
      const allRecipes: Recipe[] = [];
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

        // Save state before applying
        const savedClues = structuredClone(this.clueMap);
        const savedColors = new Map<NMosaicCell, number | null>();
        for (const item of recipe.toColor) {
          savedColors.set(item.cell, item.cell.solutionColor);
        }

        this.applyRecipe(recipe);

        // Verify consistency with SAT solver
        if (
          await this.satIsConsistent(this.clueMap)
        ) {
          applied = true;
          this.recipesApplied += recipe.toClue.length;
          break;
        }

        // Revert — clues would conflict
        this.clueMap = savedClues;
        for (const [cell, color] of savedColors) {
          cell.solutionColor = color;
        }
      }

      if (!applied) break;
    }
  }

  async techniqueSolve(
    techniqueSolvers: ((nMosaic: NMosaic) => number)[],
  ): Promise<boolean> {
    let done = false;
    while (!done) {
      done = true;
      techniqueSolvers.forEach((solver) => {
        while (solver(this) > 0) {
          done = false;
        }
      });
    }

    let cluesSatisfied = true;
    this.clueMap.forEach((clues, cell) => {
      clues.forEach((clue) => {
        const clueSatisfied =
          [...cell.neighbors].filter((cell) => cell.color === clue.color)
            .length === clue.count;
        if (!clueSatisfied) cluesSatisfied = false;
      });
    });

    const solved =
      this.cells.every((cell) => cell.color !== null || !cell.included) &&
      cluesSatisfied;

    this.cells.forEach((cell) => {
      cell.color = null;
    });

    return solved;
  }

  async backwardPuzzleGenerator(solve: () => Promise<boolean>): Promise<void> {
    let tries = 0;
    let solvable = false;
    while (!solvable) {
      this.generateRandomPuzzle();
      solvable = await solve();

      tries++;
      // usually only takes a dozen or so attempts, even for the weakest technique it almost never takes more than 20k attempts
      if (tries > 100000) break;
    }

    if (tries <= 100000) {
      console.log(`Found a solvable random pattern in ${tries} attempts`);
    } else {
      console.log(
        `Failed to find a solvable random pattern in ${tries} attempts`,
      );
    }

    this.randomPuzzleTries = tries;
    this.randomPatternFound = solvable;

    // Seeded Fisher–Yates instead of a random comparator: the sort-based
    // shuffle's result is implementation dependent, Fisher–Yates is portable.
    let clueMapDuplicate = structuredClone(this.clueMap);
    let clueList = [...this.clueMap.entries()].flatMap((entry) => entry[1]);
    shuffleInPlace(clueList, this.random);

    clueList.forEach(async (removedClue) => {
      const removedClueCell = this.getCell(removedClue.row, removedClue.col);
      if (!removedClueCell) throw new Error("Clue Cell Not Found");

      this.clueMap.set(
        removedClueCell,
        this.clueMap
          .get(removedClueCell)
          ?.filter((clue) => clue.color === removedClue.color) ?? [],
      );

      const solved = await solve();

      if (!solved) {
        this.clueMap.set(
          removedClueCell,
          this.clueMap.get(removedClueCell)?.concat(removedClue) ?? [
            removedClue,
          ],
        );
      }
    });
  }

  async puzzleGeneratorFactory(): Promise<void> {
    switch (this.BOARD_DIFFICULTY) {
      case "beginner":
        // IDEA: use recipes to generate the solution and then the SR solving technique to carve it down
        // avoids SR random generation potentially taking forever and SR recipe generation being over-determined
        await this.generateRecipePuzzle([
          () => this.getSimpleRemainderRecipes(),
        ]);
        break;
      case "intermediate":
        await this.backwardPuzzleGenerator(() =>
          this.techniqueSolve([
            (nMosaic) => this.solveLastCandidate(nMosaic),
            (nMosaic) => this.solveSimpleCandidateRemainder(nMosaic),
          ]),
        );
        break;
      case "advanced":
        await this.backwardPuzzleGenerator(() =>
          this.techniqueSolve([
            (nMosaic) => this.solveLastCandidate(nMosaic),
            (nMosaic) => this.solveSimpleCandidateRemainder(nMosaic),
            (nMosaic) => this.solveSimpleSubsetRemainder(nMosaic),
          ]),
        );
        break;
      case "expert":
        await this.backwardPuzzleGenerator(() =>
          this.techniqueSolve([
            (nMosaic) => this.solveSimpleRemainder(nMosaic),
            (nMosaic) => this.solveLastCandidate(nMosaic),
            (nMosaic) => this.solveSimpleCandidateRemainder(nMosaic),
            (nMosaic) => this.solveSimpleSubsetRemainder(nMosaic),
            (nMosaic) => this.solveTotalNeighbourhoodSum(nMosaic),
          ]),
        );
        break;
      case "grandmaster":
      case "sat":
        await this.backwardPuzzleGenerator(() =>
          this.satHasUniqueSolution(this.clueMap),
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
          this.clueMap.set(cell, clues.filter((clue) => clue.color === worstClue.color));
        });
        break;
      default:
        break;
    }
  }

  generateRandomPuzzle(): void {
    this.cells.forEach((cell) => {
      cell.color = null;
      if (!cell.included) return;
      cell.solutionColor = Math.floor(this.random() * this.BOARD_COLORS);
    });

    this.clueMap = new Map();
    for (const cell of this.cells) {
      if (!cell.included) continue;

      for (let c = 0; c < this.BOARD_COLORS; c++) {
        let clueCount = [...cell.neighbors].filter(
          (it) => it.solutionColor === c,
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
      Math.round(this.BOARD_FRACTION * totalCells),
    );

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
          if (
            neighbor !== null &&
            !neighbor.included &&
            !frontier.has(neighbor)
          ) {
            frontier.add(neighbor);
          }
        }
      }
    };

    addNeighborsToFrontier(startCell);

    while (
      this.cells.filter((it) => it.included).length < targetCount &&
      frontier.size > 0
    ) {
      const frontierArray = Array.from(frontier);
      const nextCell =
        frontierArray[Math.floor(this.random() * frontierArray.length)];
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
            cell.neighbors.add(neighbor);
          }
        }
      }
    }
  }

  getCell(row: number, col: number): NMosaicCell | null {
    if (
      row < 0 ||
      row >= this.BOARD_HEIGHT ||
      col < 0 ||
      col >= this.BOARD_WIDTH
    )
      return null;
    return this.cells[row * this.BOARD_WIDTH + col];
  }

  /**
   * Checks whether the current clues and already-assigned solution colors
   * are consistent (i.e. there exists at least one full assignment of all
   * cells that satisfies every clue and respects every already-colored cell).
   */
  async satIsConsistent(
    clueMap: Map<NMosaicCell, NMosaicClue[]>,
  ): Promise<boolean> {
    const totalUserVars =
      this.BOARD_HEIGHT * this.BOARD_WIDTH * this.BOARD_COLORS;
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

    // Clue constraints.
    clueMap.forEach((clues, cell) => {
      clues.forEach((clue) => {
        const neighborVars = [...cell.neighbors]
          .filter((neighbor) => neighbor.included)
          .map((neighbor) =>
            this.varId(neighbor.row, neighbor.col, clue.color),
          );

        if (clue.count === 0) {
          for (const v of neighborVars) clauses.push([-v]);
        } else {
          clauses.push(...exactlyK(neighborVars, clue.count, varCache));
        }
      });
    });

    // Force already-assigned cells to keep their current colour.
    for (const cell of this.cells) {
      if (!cell.included || cell.solutionColor === null) continue;
      clauses.push([this.varId(cell.row, cell.col, cell.solutionColor)]);
    }

    const totalVars = varCache.last;
    const result = await satSolveAsync(totalVars, clauses);
    this.recordSatStats("isConsistent", result);
    return result.SAT;
  }

  private recordSatStats(
    phase: string,
    result: { SAT: boolean; stats: Stats },
  ): void {
    const stats = result.stats
      ? {
          totalDecisions: result.stats.totalDecisions,
          totalConflicts: result.stats.totalConflicts,
          totalPropagations: result.stats.totalPropagations,
          totalLearnts: result.stats.totalLearnts,
          maxDecisionLevel: result.stats.maxDecisionLevel,
          maxPropagationDepth: result.stats.maxPropagationDepth,
        }
      : {};
    this.satStats.push({ phase, SAT: result.SAT, stats });
  }

  // ─── SAT encoding & solving ─────────────────────────────────────────

  /** Maps (row, col, color) to a 1-based SAT variable id. */
  private varId(row: number, col: number, color: number): number {
    return (
      row * this.BOARD_WIDTH * this.BOARD_COLORS +
      col * this.BOARD_COLORS +
      color +
      1
    );
  }

  /**
   * Encodes the puzzle (each included cell has exactly one color; every
   * clue counts the correct number of same-coloured neighbours) as CNF and
   * checks that the intended solution is the unique satisfying assignment.
   */
  async satHasUniqueSolution(
    clueMap: Map<NMosaicCell, NMosaicClue[]>,
  ): Promise<boolean> {
    const totalUserVars =
      this.BOARD_HEIGHT * this.BOARD_WIDTH * this.BOARD_COLORS;
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
    clueMap.forEach((clues, cell) => {
      clues.forEach((clue) => {
        const neighborVars = [...cell.neighbors]
          .filter((neighbor) => neighbor.included)
          .map((neighbor) =>
            this.varId(neighbor.row, neighbor.col, clue.color),
          );

        if (clue.count === 0) {
          // exactlyK() does not handle k = 0; force every literal false.
          for (const v of neighborVars) {
            clauses.push([-v]);
          }
        } else {
          clauses.push(...exactlyK(neighborVars, clue.count, varCache));
        }
      });
    });

    // The clues are generated from the solution so it's impossible for them to conflict with each other or the intended solution
    const totalVars = varCache.last;

    // Negate the intended solution; UNSAT means it is the unique one.
    const blockingClause: number[] = [];
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

// Expose the game classes so n_mosaic_game.js (game page) and the test
// dashboard (n_mosaic_test.html) can drive them directly.
if (typeof window !== "undefined") {
  const exposed = window as unknown as {
    NMosaic: typeof NMosaic;
    NMosaicCell: typeof NMosaicCell;
    NMosaicClue: typeof NMosaicClue;
  };
  exposed.NMosaic = NMosaic;
  exposed.NMosaicCell = NMosaicCell;
  exposed.NMosaicClue = NMosaicClue;
}
