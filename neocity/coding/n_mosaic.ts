// https://www.cs.ru.nl/bachelors-theses/2023/Thijs_de_Jong___1015438___Mosaic_as_a_SAT_problem.pdf
// https://www.carstensinz.de/papers/CP-2005.pdf
// https://users.aalto.fi/~tjunttil/2020-DP-AUT/notes-sat/cdcl.html
// https://www.comp.nus.edu.sg/~gregory/sat/

// TODO
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
  neighbors: NMosaicCell[];
  included: boolean;
  pencilMarks: Set<number>;

  constructor(row: number, col: number) {
    this.row = row;
    this.col = col;
    this.color = null;
    this.solutionColor = null;
    this.neighbors = [];
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

/** Population count: number of set bits in a bitmask. */
function popcountMask(mask: bigint): number {
  let count = 0;
  while (mask) {
    mask &= mask - 1n;
    count++;
  }
  return count;
}

/** Index (number of trailing zeros) of the lowest set bit; mask must be nonzero. */
function lowestSetBitIndex(mask: bigint): number {
  let index = 0;
  while ((mask & 1n) === 0n) {
    mask >>= 1n;
    index++;
  }
  return index;
}

class NMosaic {
  cells: Array<NMosaicCell>;
  clueMap: Map<NMosaicCell, NMosaicClue[]>;
  candidates: Set<number>[][] | null = null;
  BOARD_HEIGHT: number;
  BOARD_WIDTH: number;
  BOARD_COLORS: number;
  BOARD_FRACTION: number;
  BOARD_DIFFICULTY: string;
  /** Seed that produced this puzzle; pass it back in to reproduce it. */
  SEED: number;
  private random: SeedPRNG;
  puzzleComplete: boolean = false;
  /** True while a puzzle is being generated; the board shows a loading overlay. */
  generating: boolean = false;
  selectedColor: number = 0;
  pencilMode: boolean = false;
  performanceTracker: Map<
    string,
    { stopwatch: DOMHighResTimeStamp; total: number }
  >;

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
    height: number = 10,
    width: number = 10,
    colors: number = 3,
    fraction: number = 0.8,
    difficulty: string = "random",
    seed: number = NMosaic.randomSeed(),
  ) {
    this.generating = true;
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

    try {
      await this.puzzleGeneratorFactory();
    } finally {
      // Generation finished (or failed); the board can be painted again.
      this.generating = false;
    }
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

    for (const cell of this.cells) {
      if (!cell.included) continue;
      if ((this.clueMap.get(cell)?.length ?? 0) > 0) continue;
      const cellNeighbours = [...cell.neighbors];
      const emptyNeighbors = cellNeighbours.filter(
        (n) => n.solutionColor === null,
      );
      if (emptyNeighbors.length === 0) continue;

      for (let color = 0; color < this.BOARD_COLORS; color++) {
        const weight = 100 / Math.pow(this.BOARD_COLORS, emptyNeighbors.length);
        const toColor: Array<{ cell: NMosaicCell; color: number }> =
          emptyNeighbors.map((n) => ({ cell: n, color }));
        const count = cellNeighbours.filter(
          (n) => n.solutionColor === color || emptyNeighbors.includes(n),
        ).length;
        const clue = new NMosaicClue(cell.row, cell.col, color, count);
        recipes.push({ toColor, toClue: [clue], weight });
      }
    }
    return recipes;
  }

  solveSimpleRemainder(
    nMosaic: NMosaic,
    hint: boolean = false,
  ): { applications: number; hintClues?: NMosaicCell[] } {
    let applicationSet: { cells: NMosaicCell[]; color: number }[] = [];

    for (const entry of nMosaic.clueMap) {
      const cell = entry[0];
      const clues = entry[1];
      const neighbourhood = cell.neighbors;
      for (const clue of clues) {
        const adjustedClue =
          clue.count -
          neighbourhood.filter((cell) => cell.color === clue.color).length;
        const emptyCells = neighbourhood.filter((cell) => cell.color === null);
        if (emptyCells.length > 0 && adjustedClue === emptyCells.length) {
          if (hint) return { applications: 0, hintClues: [cell] };

          applicationSet.push({ cells: emptyCells, color: clue.color });
        }
      }
    }

    applicationSet.forEach((application) => {
      application.cells.forEach((cell) => (cell.color = application.color));
    });

    nMosaic.techniqueCounts["SimpleRemainder"] =
      (nMosaic.techniqueCounts["SimpleRemainder"] ?? 0) + applicationSet.length;
    return { applications: applicationSet.length };
  }

  buildCandidateBoard() {
    const candidateBoard: Set<number>[][] = [];
    for (let row = 0; row < this.BOARD_HEIGHT; row++) {
      candidateBoard.push([]);
      for (let col = 0; col < this.BOARD_WIDTH; col++) {
        const candidates = new Set<number>();
        for (let color = 0; color < this.BOARD_COLORS; color++) {
          candidates.add(color);
        }
        candidateBoard[row].push(candidates);
      }
    }

    this.clueMap.forEach((clues, cell) => {
      const neighbourhood = cell.neighbors;
      clues.forEach((clue) => {
        neighbourhood
          .filter((cell) => cell.color !== null)
          .forEach((cell) => candidateBoard[cell.row][cell.col].clear());

        if (
          clue.count ===
          neighbourhood.filter((cell) => cell.color === clue.color).length
        ) {
          neighbourhood
            .filter((cell) => cell.color === null)
            .forEach((cell) =>
              candidateBoard[cell.row][cell.col].delete(clue.color),
            );
        }
      });
    });

    this.candidates = candidateBoard;
  }

  updateCandidateBoard(cell: NMosaicCell) {
    for (let dRow = -1; dRow <= 1; dRow++) {
      for (let dCol = -1; dCol <= 1; dCol++) {
        if (dRow === 0 && dCol === 0)
          this.candidates[cell.row][cell.col].clear();

        const clueCell = this.getCell(cell.row + dRow, cell.col + dCol);
        this.clueMap.get(clueCell)?.forEach((clue) => {
          if (
            clue.count ===
            clueCell.neighbors.filter((cell) => cell.color === clue.color)
              .length
          ) {
            clueCell.neighbors
              .filter((cell) => cell.color === null)
              .forEach((cell) =>
                this.candidates[cell.row][cell.col].delete(clue.color),
              );
          }
        });
      }
    }
  }

  solveLastCandidate(
    nMosaic: NMosaic,
    hint: boolean = false,
  ): { applications: number; hintClues?: NMosaicCell[] } {
    if (nMosaic.candidates === null) nMosaic.buildCandidateBoard();

    let applicationSet: { cell: NMosaicCell; color: number }[] = [];

    for (const cell of nMosaic.cells) {
      if (nMosaic.candidates[cell.row][cell.col].size !== 1) continue;

      if (hint) return { applications: 0, hintClues: [cell] };
      applicationSet.push({
        cell: cell,
        color: [...nMosaic.candidates[cell.row][cell.col]][0],
      });
    }

    applicationSet.forEach((application) => {
      application.cell.color = application.color;
      nMosaic.updateCandidateBoard(application.cell);
    });

    nMosaic.techniqueCounts["LastCandidate"] =
      (nMosaic.techniqueCounts["LastCandidate"] ?? 0) + applicationSet.length;
    return { applications: applicationSet.length };
  }

  solveSimpleCandidateRemainder(
    nMosaic: NMosaic,
    hint: boolean = false,
  ): { applications: number; hintClues?: NMosaicCell[] } {
    if (nMosaic.candidates === null) nMosaic.buildCandidateBoard();

    let applicationSet: { cells: NMosaicCell[]; color: number }[] = [];

    for (const entry of nMosaic.clueMap) {
      const cell = entry[0];
      const clues = entry[1];
      const neighbourhood = cell.neighbors;
      for (const clue of clues) {
        const adjustedClue =
          clue.count -
          neighbourhood.filter((cell) => cell.color === clue.color).length;
        const candidateCells = neighbourhood.filter((cell) =>
          nMosaic.candidates[cell.row][cell.col].has(clue.color),
        );
        if (
          candidateCells.length > 0 &&
          adjustedClue === candidateCells.length
        ) {
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

    nMosaic.techniqueCounts["SimpleCandidateRemainder"] =
      (nMosaic.techniqueCounts["SimpleCandidateRemainder"] ?? 0) +
      applicationSet.length;
    return { applications: applicationSet.length };
  }

  solveSimpleSubsetRemainder(
    nMosaic: NMosaic,
    hint: boolean = false,
  ): { applications: number; hintClues?: NMosaicCell[] } {
    if (nMosaic.candidates === null) nMosaic.buildCandidateBoard();

    const cells = nMosaic.cells;
    const boardWidth = nMosaic.BOARD_WIDTH;
    const slotBit = (cell: NMosaicCell): bigint =>
      1n << BigInt(cell.row * boardWidth + cell.col);

    // Bitmask of each clue's empty neighbourhood plus its already-coloured
    // count, keyed by clue object. Neighbourhoods are tiny (≤ 9 cells) so the
    // subset/exclusive-area checks that used to scan arrays are now O(1) mask
    // ops, turning the clues² window search into a cheap pass.
    const emptyMaskOf: Map<NMosaicClue, bigint> = new Map();
    const coloredOf: Map<NMosaicClue, number> = new Map();
    const emptySizeOf: Map<NMosaicClue, number> = new Map();
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

    const hasColorCandidate = (mask: bigint, color: number): boolean => {
      while (mask) {
        const bit = mask & -mask;
        const cell = cells[lowestSetBitIndex(bit)];
        if (nMosaic.candidates[cell.row][cell.col].has(color)) return true;
        mask &= mask - 1n;
      }
      return false;
    };

    let applicationSet: {
      mask: bigint;
      color: number;
      inverted?: boolean;
    }[] = [];

    for (const entry of nMosaic.clueMap) {
      const clueCell = entry[0];
      const clues = entry[1];
      for (const clue of clues) {
        const emptyArea = emptyMaskOf.get(clue)!;
        const effectiveClueValue = clue.count - coloredOf.get(clue)!;
        for (let dRow = -2; dRow <= 2; dRow++) {
          for (let dCol = -2; dCol <= 2; dCol++) {
            if ((dRow === 0 && dCol === 0) || dRow + dCol < 0) continue;
            const otherCell = this.getCell(
              clueCell.row + dRow,
              clueCell.col + dCol,
            );

            if (!otherCell) continue;
            const subClues = nMosaic.clueMap.get(otherCell);
            if (!subClues) continue;

            for (const subClue of subClues) {
              const subEmptyArea = emptyMaskOf.get(subClue)!;
              // every empty neighbour of the other cell must also be an empty
              // neighbour of this clue cell; O(1) subset check
              if ((subEmptyArea & ~emptyArea) !== 0n) continue;

              const effectiveSubClueValue =
                subClue.count - coloredOf.get(subClue)!;
              const exclusiveArea = emptyArea & ~subEmptyArea;
              const exclusiveSize = popcountMask(exclusiveArea);
              if (exclusiveSize === 0) continue;

              if (clue.color === subClue.color) {
                if (
                  effectiveClueValue - effectiveSubClueValue ===
                  exclusiveSize
                ) {
                  if (hint)
                    return {
                      applications: 0,
                      hintClues: [clueCell, otherCell],
                    };
                  applicationSet.push({
                    mask: exclusiveArea,
                    color: clue.color,
                  });
                } else if (
                  effectiveClueValue - effectiveSubClueValue === 0 &&
                  hasColorCandidate(exclusiveArea, clue.color)
                ) {
                  if (hint)
                    return {
                      applications: 0,
                      hintClues: [clueCell, otherCell],
                    };
                  applicationSet.push({
                    mask: exclusiveArea,
                    color: clue.color,
                    inverted: true,
                  });
                }
              } else if (
                effectiveClueValue -
                  (emptySizeOf.get(subClue)! - effectiveSubClueValue) ===
                exclusiveSize
              ) {
                if (hint)
                  return { applications: 0, hintClues: [clueCell, otherCell] };
                applicationSet.push({
                  mask: exclusiveArea,
                  color: clue.color,
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
        } else if (
          nMosaic.candidates[cell.row][cell.col].delete(application.color)
        ) {
          applied++;
        }
        mask &= mask - 1n;
      }
    });

    nMosaic.techniqueCounts["SimpleSubsetRemainder"] =
      (nMosaic.techniqueCounts["SimpleSubsetRemainder"] ?? 0) + applied;
    return { applications: applied };
  }

  // This technique only searches for TNS occurences in n or fewer clues (where n is the number of colors in the puzzle)
  //  and only finds minimal TNS sets
  solveTotalNeighbourhoodSum(
    nMosaic: NMosaic,
    hint: boolean = false,
  ): { applications: number; hintClues?: NMosaicCell[] } {
    // depth-first search
    //  base case: TNS satisfied for this set, save the set for application later
    //  for each clue in a strict order (Map does maintain a consistent order)
    //   call depth-first search for all clues after this one in the strict ordering which...
    //    are not zero
    //    intersect the current union
    //    is a new color for the current union (for TNS chaining use a more complex rule)
    //
    // The search state is bitmasks (one bit per board cell) instead of
    // Set<NMosaicCell> objects: union/overlap/size tests become O(1) integer
    // ops and the per-node Set allocations (and structuredClone of every
    // recorded set) disappear entirely.

    const allClues = [...nMosaic.clueMap.entries()].flatMap(
      (entry) => entry[1],
    );
    if (allClues.length === 0) return { applications: 0 };
    const cells = nMosaic.cells;
    const boardWidth = nMosaic.BOARD_WIDTH;
    const cellBit = (cell: NMosaicCell): bigint =>
      1n << BigInt(cell.row * boardWidth + cell.col);

    // Per-clue search state, precomputed once: the board never changes while
    // the search runs (colour assignments happen only in the application
    // phase), so the effective clue values are loop-invariant.
    const clueCellOf: NMosaicCell[] = new Array(allClues.length);
    const emptyMaskOf: bigint[] = new Array(allClues.length);
    const coloredOf: number[] = new Array(allClues.length);
    for (let i = 0; i < allClues.length; i++) {
      const clue = allClues[i];
      const clueCell = nMosaic.getCell(clue.row, clue.col)!;
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

    const applicationSets: number[][] = [];
    const currentSet: number[] = [];
    const colorInSet = new Array<boolean>(nMosaic.BOARD_COLORS).fill(false);

    function depthFirstSearch(
      lastIndex: number,
      unionMask: bigint,
      unionSize: number,
      count: number,
    ) {
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
          count + effectiveClueValue,
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
        hintClues: application.map((clueIdx) => clueCellOf[clueIdx]),
      };
    }

    let applied = 0;
    applicationSets.forEach((application) => {
      application.forEach((clueIdx) => {
        const clue = allClues[clueIdx];
        const clueCell = clueCellOf[clueIdx];
        // Empty neighbourhoods are recomputed from the current board state,
        // matching the reference implementation (earlier sets in this list may
        // already have coloured cells).
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

    nMosaic.techniqueCounts["TotalNeighbourhoodSum"] =
      (nMosaic.techniqueCounts["TotalNeighbourhoodSum"] ?? 0) + applied;
    return { applications: applied };
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
        const savedClues = new Map(this.clueMap);
        const savedColors = new Map<NMosaicCell, number | null>();
        for (const item of recipe.toColor) {
          savedColors.set(item.cell, item.cell.solutionColor);
        }

        this.applyRecipe(recipe);

        // Verify consistency with SAT solver
        if (await this.satIsConsistent(this.clueMap)) {
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
    techniqueSolvers: ((nMosaic: NMosaic) => { applications: number })[],
  ): Promise<boolean> {
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

  solved(): boolean {
    let cluesSatisfied = true;
    this.clueMap.forEach((clues, cell) => {
      const neighbourhood = cell.neighbors;
      clues.forEach((clue) => {
        const clueSatisfied =
          neighbourhood.filter((cell) => cell.color === clue.color).length ===
          clue.count;
        if (!clueSatisfied) cluesSatisfied = false;
      });
    });

    return (
      this.cells.every((cell) => cell.color !== null || !cell.included) &&
      cluesSatisfied
    );
  }

  async backwardPuzzleGenerator(solve: () => Promise<boolean>): Promise<void> {
    let tries = 0;
    let solvable = false;
    while (!solvable) {
      this.generateRandomPuzzle();
      solvable = await solve();

      tries++;
      if (tries > 1000) break;
    }

    if (tries <= 1000) {
      // console.log(`Found a solvable random pattern in ${tries} attempts`);
    } else {
      console.log(
        `Failed to find a solvable random pattern in ${tries} attempts`,
      );
    }

    this.randomPuzzleTries = tries;
    this.randomPatternFound = solvable;

    // Seeded Fisher–Yates instead of a random comparator: the sort-based
    // shuffle's result is implementation dependent, Fisher–Yates is portable.
    let clueList = [...this.clueMap.values()].flat();
    shuffleInPlace(clueList, this.random);
    let carveSize = Math.floor((2 * clueList.length) / 3);
    while (carveSize > this.BOARD_COLORS) {
      const backupClueMap = new Map(this.clueMap);

      this.clueMap = new Map();
      clueList.slice(carveSize).forEach((clue) => {
        const clueCell = this.getCell(clue.row, clue.col);

        this.clueMap.set(
          clueCell,
          this.clueMap.get(clueCell)?.concat(clue) ?? [clue],
        );
      });

      const solved = await solve();

      if (!solved) {
        this.clueMap = backupClueMap;
        shuffleInPlace(clueList, this.random);
        carveSize = Math.floor((2 * carveSize) / 3);
      } else {
        clueList = clueList.slice(carveSize);
        carveSize = Math.floor((2 * clueList.length) / 3);
      }
    }

    for (const removedClue of clueList) {
      const removedClueCell = this.getCell(removedClue.row, removedClue.col);
      if (!removedClueCell) throw new Error("Clue Cell Not Found");

      const newClueList =
        this.clueMap
          .get(removedClueCell)
          ?.filter((clue) => clue.color !== removedClue.color) ?? [];
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
            removedClue,
          ],
        );
      }
    }
  }

  getHint(): NMosaicCell[] {
    const techniques = [
      this.solveSimpleRemainder,
      this.solveLastCandidate,
      this.solveSimpleCandidateRemainder,
      this.solveSimpleSubsetRemainder,
      this.solveTotalNeighbourhoodSum,
    ];

    let hint: NMosaicCell[] = [];
    for (const technique of techniques) {
      const techniqueHint = technique(this, true).hintClues;
      if ((techniqueHint?.length ?? 0) > 0) {
        hint = techniqueHint;
        break;
      }
    }
    return hint;
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
          this.clueMap.set(
            cell,
            clues.filter((clue) => clue.color !== worstClue.color),
          );
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

      const neighbourhood = cell.neighbors;
      for (let c = 0; c < this.BOARD_COLORS; c++) {
        let clueCount = neighbourhood.filter(
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
            cell.neighbors.push(neighbor);
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
      const neighbourhood = cell.neighbors;
      clues.forEach((clue) => {
        const neighborVars = neighbourhood
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
      const neighbourhood = cell.neighbors;
      clues.forEach((clue) => {
        const neighborVars = neighbourhood
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
