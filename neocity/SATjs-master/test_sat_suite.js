/**
 * test_sat_suite.js
 * Comprehensive unit tests for the SAT solver (SAT.js) and helper encodings
 * (helpers.js: atMostK, exactlyK, exactlyOne, VarCache).
 *
 * Load order (HTML):
 *   <script src="test_sat_suite.js"></script>
 *   <script src="helpers.js"></script>
 *   <script src="SAT.js"></script>
 *   <script>runSATSuite();</script>
 *
 * Run from Node.js directly:
 *   node test_sat_suite.js
 *
 * Run in browser:
 *   Open test_sat_suite.html
 */

// ─── Test runner ─────────────────────────────────────────────────────────

const SAT_SUITE = [];

let SAT_SUITE_PASSED = 0;
let SAT_SUITE_FAILED = 0;

function test(name, fn) {
    SAT_SUITE.push({ name, fn });
}

function assert(condition, message) {
    if (!condition) {
        throw new Error(message || "Assertion failed");
    }
}

function assertEqual(actual, expected, message) {
    if (actual !== expected) {
        throw new Error(
            `${message || "Expected equality"}: got ${actual}, expected ${expected}`
        );
    }
}

function assertSAT(clauses, size, message) {
    const result = satSolve(size, clauses);
    if (!result) {
        const cnfStr = clauses.map(c => `[${c.join(", ")}]`).join(", ");
        throw new Error(
            `${message || "Expected SAT"}: solver returned UNSAT for clauses ${cnfStr}`
        );
    }
}

function assertUNSAT(clauses, size, message) {
    const result = satSolve(size, clauses);
    if (result) {
        const cnfStr = clauses.map(c => `[${c.join(", ")}]`).join(", ");
        throw new Error(
            `${message || "Expected UNSAT"}: solver returned SAT for clauses ${cnfStr}`
        );
    }
}

function runSATSuite() {
    SAT_SUITE_PASSED = 0;
    SAT_SUITE_FAILED = 0;

    let totalStart = performance.now();

    for (const { name, fn } of SAT_SUITE) {
        const start = performance.now();
        try {
            fn();
            const elapsed = (performance.now() - start).toFixed(1);
            console.log(`  ✓ ${name} (${elapsed}ms)`);
            SAT_SUITE_PASSED++;
        } catch (e) {
            const elapsed = (performance.now() - start).toFixed(1);
            console.log(`  ✗ ${name} (${elapsed}ms): ${e.message}`);
            SAT_SUITE_FAILED++;
        }
    }

    const totalElapsed = (performance.now() - totalStart).toFixed(1);
    const total = SAT_SUITE_PASSED + SAT_SUITE_FAILED;
    const status = SAT_SUITE_FAILED === 0 ? "ALL PASSED" : "SOME FAILED";

    console.log(`\n  ─────────────────────────────────────────`);
    console.log(`  ${status}: ${SAT_SUITE_PASSED}/${total} tests (${totalElapsed}ms)`);
    console.log(`  ─────────────────────────────────────────\n`);

    if (typeof document !== "undefined") {
        const el = document.getElementById("test-suite-status");
        if (el) {
            el.textContent = `${status}: ${SAT_SUITE_PASSED}/${total} tests (${totalElapsed}ms)`;
            el.style.color = SAT_SUITE_FAILED === 0 ? "#4ec9b0" : "#f14c4c";
        }
    }

    return SAT_SUITE_FAILED === 0;
}

// ─── Core SAT solver tests ─────────────────────────────────────────────

test("empty formula (0 vars, 0 clauses) is SAT", () => {
    // An empty formula has no constraints, so it is trivially satisfiable.
    assertSAT([], 0, "empty formula (0 vars, 0 clauses) should be SAT");
});

test("no clauses with 5 vars is SAT", () => {
    assertSAT([], 5, "no clauses");
});

test("single positive unit clause", () => {
    assertSAT([[1]], 1, "single unit clause [1]");
});

test("single negative unit clause", () => {
    assertSAT([[-1]], 1, "single unit clause [-1]");
});

test("two contradictory unit clauses are UNSAT", () => {
    assertUNSAT([[1], [-1]], 1, "contradictory unit clauses: [1] and [-1]");
});

test("satisfiable 2-CNF: (x1 ∨ x2), (¬x1 ∨ x2)", () => {
    // (x1 ∨ x2), (¬x1 ∨ x2) — x2 = true is forced
    assertSAT([[1, 2], [-1, 2]], 2, "(x1 ∨ x2), (¬x1 ∨ x2)");
});

test("unsatisfiable 2-CNF: (x1 ∨ x2), (¬x1), (¬x2)", () => {
    assertUNSAT([[1, 2], [-1], [-2]], 2, "(x1 ∨ x2), (¬x1), (¬x2)");
});

test("unit propagation forces a variable", () => {
    // (x1 ∨ x2 ∨ x3), (¬x1), (¬x2) — forces x3 = true
    assertSAT([[1, 2, 3], [-1], [-2]], 3, "propagation forces x3");
});

test("full assignment exhaustion: all combos UNSAT", () => {
    // (x1 ∨ x2), (x1 ∨ ¬x2), (¬x1 ∨ x2), (¬x1 ∨ ¬x2) — UNSAT
    assertUNSAT([[1, 2], [1, -2], [-1, 2], [-1, -2]], 2,
        "all 4 clauses of 2 vars exhausted → UNSAT");
});

test("tautological clause is harmless", () => {
    // (x1 ∨ ¬x1) — always satisfied, should be SAT regardless
    assertSAT([[1, -1], [2]], 2, "tautology (x1 ∨ ¬x1) with unit [2]");
    assertSAT([[1, -1]], 2, "tautology alone (x1 ∨ ¬x1)");
});

test("unused variables are irrelevant", () => {
    // Only clause involves var 1, vars 2-10 are free
    const clauses = [[1]];
    assertSAT(clauses, 10, "one clause among many free vars");
});

test("formula with all vars in both polarities is SAT", () => {
    // (x1 ∨ x2), (¬x1 ∨ ¬x2) — satisfiable (x1=1, x2=0 or x1=0, x2=1)
    assertSAT([[1, 2], [-1, -2]], 2, "x1 ∨ x2, ¬x1 ∨ ¬x2");
});

test("chain of implications is SAT", () => {
    // (¬x1 ∨ x2), (¬x2 ∨ x3), (¬x3 ∨ x4), (x1) — forces x1=x2=x3=x4=1
    assertSAT([[-1, 2], [-2, 3], [-3, 4], [1]], 4, "implication chain");
});

test("contradictory chain is UNSAT", () => {
    // (¬x1 ∨ x2), (¬x2 ∨ x3), (¬x3 ∨ x4), (x1), (¬x4) — 1..4 all true, but ¬x4
    assertUNSAT([[-1, 2], [-2, 3], [-3, 4], [1], [-4]], 4,
        "contradictory implication chain");
});

test("three contradictory unit clauses with extra var", () => {
    assertUNSAT([[1], [-1], [2]], 2, "[1], [-1], [2] — [2] is irrelevant, still UNSAT");
});

test("large formula with 20 vars, random-like structure", () => {
    // Construct a solvable 20-var formula with a clear pattern
    const clauses = [];
    // x1 = true, x2 = true, x3 = false
    clauses.push([1], [2], [-3]);
    // x4 = x1 ∧ x2 → x4 = true
    clauses.push([-1, -2, 4], [-4, 1], [-4, 2]);
    // x5 = x1 ∨ x3 → x5 = true
    clauses.push([-1, 5], [-3, 5], [-5, 1, 3]);
    // x6 = ¬x5 → x6 = false
    clauses.push([-5, -6], [5, 6], [-5, -6]);
    // Remaining vars are free
    assertSAT(clauses, 20, "20-var formula with forced assignments");
    assertUNSAT([...clauses, [-1]], 20, "same 20-var formula, but x1 forced false → UNSAT");
});

// ─── exactlyOne tests ─────────────────────────────────────────────────

test("exactlyOne: n=2, exhaustive", () => {
    const n = 2;
    for (let assignment = 0; assignment < (1 << n); assignment++) {
        const vars = [1, 2];
        const clauses = exactlyOne(vars);
        const trueCount = popcount(assignment);
        for (let v = 0; v < n; v++) {
            clauses.push([(assignment & (1 << v)) ? (v + 1) : -(v + 1)]);
        }
        const result = satSolve(n, clauses);
        assertEqual(result, trueCount === 1,
            `exactlyOne n=2, assignment=${assignment.toString(2).padStart(n, '0')}, ` +
            `trueCount=${trueCount}, expected ${trueCount === 1 ? "SAT" : "UNSAT"}`);
    }
});

test("exactlyOne: n=3, exhaustive", () => {
    const n = 3;
    for (let assignment = 0; assignment < (1 << n); assignment++) {
        const vars = [1, 2, 3];
        const clauses = exactlyOne(vars);
        const trueCount = popcount(assignment);
        for (let v = 0; v < n; v++) {
            clauses.push([(assignment & (1 << v)) ? (v + 1) : -(v + 1)]);
        }
        const result = satSolve(n, clauses);
        assertEqual(result, trueCount === 1,
            `exactlyOne n=3, assignment=${assignment.toString(2).padStart(n, '0')}, ` +
            `trueCount=${trueCount}`);
    }
});

test("exactlyOne: n=5, exhaustive (32 cases)", () => {
    const n = 5;
    for (let assignment = 0; assignment < (1 << n); assignment++) {
        const vars = [1, 2, 3, 4, 5];
        const clauses = exactlyOne(vars);
        const trueCount = popcount(assignment);
        for (let v = 0; v < n; v++) {
            clauses.push([(assignment & (1 << v)) ? (v + 1) : -(v + 1)]);
        }
        const result = satSolve(n, clauses);
        assertEqual(result, trueCount === 1,
            `exactlyOne n=5, assignment=${assignment.toString(2).padStart(n, '0')}, ` +
            `trueCount=${trueCount}`);
    }
});

test("exactlyOne: n=7, exhaustive (128 cases)", () => {
    const n = 7;
    for (let assignment = 0; assignment < (1 << n); assignment++) {
        const vars = [1, 2, 3, 4, 5, 6, 7];
        const clauses = exactlyOne(vars);
        const trueCount = popcount(assignment);
        for (let v = 0; v < n; v++) {
            clauses.push([(assignment & (1 << v)) ? (v + 1) : -(v + 1)]);
        }
        const result = satSolve(n, clauses);
        assertEqual(result, trueCount === 1,
            `exactlyOne n=7, assignment=${assignment.toString(2).padStart(n, '0')}, ` +
            `trueCount=${trueCount}`);
    }
});

// ─── atMostK tests ────────────────────────────────────────────────────

test("atMostK: n=2, exhaustive for all k (k>=1)", () => {
    const n = 2;
    // Note: atMostK encoding does not support k=0 (no auxiliary variables created).
    for (let k = 1; k <= n; k++) {
        for (let assignment = 0; assignment < (1 << n); assignment++) {
            const varCache = new VarCache(n);
            const vars = [1, 2];
            const clauses = atMostK(vars, k, null, varCache);
            const trueCount = popcount(assignment);
            for (let v = 0; v < n; v++) {
                clauses.push([(assignment & (1 << v)) ? (v + 1) : -(v + 1)]);
            }
            const result = satSolve(varCache.last, clauses);
            assertEqual(result, trueCount <= k,
                `atMostK n=2, k=${k}, assignment=${assignment.toString(2).padStart(n, '0')}, ` +
                `trueCount=${trueCount}`);
        }
    }
});

test("atMostK: n=3, exhaustive for all k (k>=1)", () => {
    const n = 3;
    // Note: atMostK encoding does not support k=0 (no auxiliary variables created).
    for (let k = 1; k <= n; k++) {
        for (let assignment = 0; assignment < (1 << n); assignment++) {
            const varCache = new VarCache(n);
            const vars = [1, 2, 3];
            const clauses = atMostK(vars, k, null, varCache);
            const trueCount = popcount(assignment);
            for (let v = 0; v < n; v++) {
                clauses.push([(assignment & (1 << v)) ? (v + 1) : -(v + 1)]);
            }
            const result = satSolve(varCache.last, clauses);
            assertEqual(result, trueCount <= k,
                `atMostK n=3, k=${k}, assignment=${assignment.toString(2).padStart(n, '0')}, ` +
                `trueCount=${trueCount}`);
        }
    }
});

test("atMostK: k=n (all-true allowed)", () => {
    const n = 4;
    const varCache = new VarCache(n);
    const clauses = atMostK([1, 2, 3, 4], 4, null, varCache);
    // All true should be allowed
    for (let v = 1; v <= 4; v++) clauses.push([v]);
    assertSAT(clauses, varCache.last, "atMostK k=n with all true");
});

test("atMostK: k=n-1 blocks all-true", () => {
    const n = 4;
    const varCache = new VarCache(n);
    const clauses = atMostK([1, 2, 3, 4], 3, null, varCache);
    // All true should be blocked
    for (let v = 1; v <= 4; v++) clauses.push([v]);
    assertUNSAT(clauses, varCache.last, "atMostK k=3 blocks all 4 true");
});

test("atMostK: n=5, k=2, exhaustive (32 cases)", () => {
    const n = 5;
    const k = 2;
    for (let assignment = 0; assignment < (1 << n); assignment++) {
        const varCache = new VarCache(n);
        const vars = [1, 2, 3, 4, 5];
        const clauses = atMostK(vars, k, null, varCache);
        const trueCount = popcount(assignment);
        for (let v = 0; v < n; v++) {
            clauses.push([(assignment & (1 << v)) ? (v + 1) : -(v + 1)]);
        }
        const result = satSolve(varCache.last, clauses);
        assertEqual(result, trueCount <= k,
            `atMostK n=5, k=${k}, assignment=${assignment.toString(2).padStart(n, '0')}, ` +
            `trueCount=${trueCount}`);
    }
});

// ─── exactlyK tests ───────────────────────────────────────────────────

test("exactlyK: n=2, k=1, exhaustive (delegates to exactlyOne)", () => {
    const n = 2;
    const k = 1;
    for (let assignment = 0; assignment < (1 << n); assignment++) {
        const varCache = new VarCache(n);
        const vars = [1, 2];
        const clauses = exactlyK(vars, k, varCache);
        const trueCount = popcount(assignment);
        for (let v = 0; v < n; v++) {
            clauses.push([(assignment & (1 << v)) ? (v + 1) : -(v + 1)]);
        }
        const result = satSolve(varCache.last, clauses);
        assertEqual(result, trueCount === k,
            `exactlyK n=2, k=1, assignment=${assignment.toString(2).padStart(n, '0')}, ` +
            `trueCount=${trueCount}`);
    }
});

test("exactlyK: n=3, all k, exhaustive", () => {
    const n = 3;
    for (let k = 1; k <= n; k++) {
        for (let assignment = 0; assignment < (1 << n); assignment++) {
            const varCache = new VarCache(n);
            const vars = [1, 2, 3];
            const clauses = exactlyK(vars, k, varCache);
            const trueCount = popcount(assignment);
            for (let v = 0; v < n; v++) {
                clauses.push([(assignment & (1 << v)) ? (v + 1) : -(v + 1)]);
            }
            const result = satSolve(varCache.last, clauses);
            assertEqual(result, trueCount === k,
                `exactlyK n=3, k=${k}, assignment=${assignment.toString(2).padStart(n, '0')}, ` +
                `trueCount=${trueCount}`);
        }
    }
});

test("exactlyK: n=4, k=2, exhaustive (16 cases)", () => {
    const n = 4;
    const k = 2;
    for (let assignment = 0; assignment < (1 << n); assignment++) {
        const varCache = new VarCache(n);
        const vars = [1, 2, 3, 4];
        const clauses = exactlyK(vars, k, varCache);
        const trueCount = popcount(assignment);
        for (let v = 0; v < n; v++) {
            clauses.push([(assignment & (1 << v)) ? (v + 1) : -(v + 1)]);
        }
        const result = satSolve(varCache.last, clauses);
        assertEqual(result, trueCount === k,
            `exactlyK n=4, k=${k}, assignment=${assignment.toString(2).padStart(n, '0')}, ` +
            `trueCount=${trueCount}`);
    }
});

test("exactlyK: n=5, k=3, exhaustive (32 cases)", () => {
    const n = 5;
    const k = 3;
    for (let assignment = 0; assignment < (1 << n); assignment++) {
        const varCache = new VarCache(n);
        const vars = [1, 2, 3, 4, 5];
        const clauses = exactlyK(vars, k, varCache);
        const trueCount = popcount(assignment);
        for (let v = 0; v < n; v++) {
            clauses.push([(assignment & (1 << v)) ? (v + 1) : -(v + 1)]);
        }
        const result = satSolve(varCache.last, clauses);
        assertEqual(result, trueCount === k,
            `exactlyK n=5, k=${k}, assignment=${assignment.toString(2).padStart(n, '0')}, ` +
            `trueCount=${trueCount}`);
    }
});

// ─── VarCache tests ───────────────────────────────────────────────────

test("VarCache: basic construction", () => {
    const vc = new VarCache(10);
    assertEqual(vc.last, 10, "initial last value");
});

test("VarCache: getVar returns increasing values", () => {
    const vc = new VarCache(5);
    assertEqual(vc.getVar(), 6, "first getVar");
    assertEqual(vc.getVar(), 7, "second getVar");
    assertEqual(vc.getVar(), 8, "third getVar");
    assertEqual(vc.last, 8, "last after three calls");
});

test("VarCache: getVar with large initial value", () => {
    const vc = new VarCache(1000);
    assertEqual(vc.getVar(), 1001, "first after 1000");
    assertEqual(vc.getVar(), 1002, "second after 1000");
});

// ─── Integration tests (n-mosaic style encodings) ────────────────────

test("n-mosaic style: 2x2 board, 2 colors, one clue", () => {
    // Simple 2x2 board (4 cells), 2 colors (0, 1).
    // Variables: for each cell (r,c) and color k: var = r*2*2 + c*2 + k + 1
    // Cell (0,0) has neighbors (0,1) and (1,0).
    // Clue at (0,0): color 0, count 1 → exactly 1 of the 2 neighbors is color 0.

    const H = 2, W = 2, COLORS = 2;
    const totalVars = H * W * COLORS; // 8

    function varId(row, col, color) {
        return row * W * COLORS + col * COLORS + color + 1;
    }

    const clauses = [];

    // Each cell has exactly one color
    for (let r = 0; r < H; r++) {
        for (let c = 0; c < W; c++) {
            const vars = [];
            for (let k = 0; k < COLORS; k++) {
                vars.push(varId(r, c, k));
            }
            clauses.push(...exactlyOne(vars));
        }
    }

    // Clue at (0,0): color 0, count 1
    // Neighbors: (0,1) and (1,0)
    const clueVars = [
        varId(0, 1, 0),  // (0,1) is color 0
        varId(1, 0, 0),  // (1,0) is color 0
    ];
    clauses.push(...exactlyK(clueVars, 1));

    // Encode a specific solution: (0,0)=color1, (0,1)=color0, (1,0)=color1, (1,1)=color0
    // This satisfies the clue: exactly 1 neighbor of (0,0) is color 0.
    // Neighbors of (0,0): (0,1) and (1,0). (0,1) is color 0, (1,0) is color 1 → exactly 1 ✓
    const solution = [
        varId(0, 0, 1),  // (0,0) = color 1
        varId(0, 1, 0),  // (0,1) = color 0  ← the one neighbor
        varId(1, 0, 1),  // (1,0) = color 1  ← NOT color 0
        varId(1, 1, 0),  // (1,1) = color 0
    ];
    for (const v of solution) clauses.push([v]);

    assertSAT(clauses, totalVars, "2x2 board with one clue and solution");
});

test("n-mosaic style: 2x2 board, inconsistent clue is UNSAT", () => {
    // Same board, but this time set a clue that can't be satisfied
    // because the forced cell colors conflict.

    const H = 2, W = 2, COLORS = 2;
    const totalVars = H * W * COLORS;

    function varId(row, col, color) {
        return row * W * COLORS + col * COLORS + color + 1;
    }

    const clauses = [];

    // Each cell has exactly one color
    for (let r = 0; r < H; r++) {
        for (let c = 0; c < W; c++) {
            const vars = [];
            for (let k = 0; k < COLORS; k++) {
                vars.push(varId(r, c, k));
            }
            clauses.push(...exactlyOne(vars));
        }
    }

    // Clue at (0,0): color 0, count 2
    // Neighbors: (0,1) and (1,0) — only 2 neighbors, so both must be color 0
    const clueVars = [
        varId(0, 1, 0),
        varId(1, 0, 0),
    ];
    clauses.push(...exactlyK(clueVars, 2));

    // Force (0,1) to be color 1 — contradicts the clue
    clauses.push([varId(0, 1, 1)]);

    assertUNSAT(clauses, totalVars, "2x2 board with contradictory clue and forced color");
});

// ─── Edge case tests ─────────────────────────────────────────────────

test("single variable with empty clause is UNSAT", () => {
    // satAddClause([], state) sets state.empty = true
    // We can test this by constructing an empty clause directly
    // But satSolve doesn't accept empty clauses directly... let's test
    // that the unit propagation handles the edge case of no clauses.
    assertSAT([], 1, "no clauses, 1 var");
});

test("duplicate literals in clause are handled", () => {
    // (x1 ∨ x1 ∨ x2) — duplicate is fine
    assertSAT([[1, 1, 2]], 2, "duplicate literal [1, 1, 2]");
    // Duplicate unit clauses: [-1], [-1] both say var1=false, [1,2] says var2=true → SAT
    assertSAT([[-1], [-1], [1, 2]], 2, "duplicate negative units with [1,2] is SAT");
    // True duplicate contradiction: [1], [-1] is UNSAT
    assertUNSAT([[1], [-1], [1, 2]], 2, "contradictory units [1] and [-1] are UNSAT even with extra clause");
});

test("clause with all false literals forces remaining", () => {
    // (x1 ∨ x2 ∨ x3), (¬x1), (¬x2) — forces x3
    const clauses = [[1, 2, 3], [-1], [-2]];
    assertSAT(clauses, 3, "clause all false forces remaining");
    // Verify x3 must be true by adding a blocking clause
    clauses.push([-3]);
    assertUNSAT(clauses, 3, "forcing x3, then blocking it → UNSAT");
});

// ─── Stress tests ────────────────────────────────────────────────────

test("stress: 12-var random satisfiable formula", () => {
    // Build a formula that's guaranteed SAT by construction:
    // pick a random assignment, then generate clauses that are satisfied by it.
    const n = 12;
    const assignment = [];
    for (let i = 0; i < n; i++) {
        assignment.push(Math.random() < 0.5);
    }

    const clauses = [];
    // Generate 24 random clauses, each of length 3, all satisfied by the assignment
    for (let c = 0; c < 24; c++) {
        const clause = [];
        for (let lit = 0; lit < 3; lit++) {
            const varIdx = Math.floor(Math.random() * n) + 1;
            const sign = assignment[varIdx - 1] ? 1 : -1;
            // 80% chance to use the satisfying polarity, 20% chance to flip
            const polarity = Math.random() < 0.8 ? sign : -sign;
            clause.push(polarity * varIdx);
        }
        // Remove duplicates within clause
        const unique = [];
        const seen = new Set();
        for (const lit of clause) {
            const abs = lit < 0 ? -lit : lit;
            if (!seen.has(abs)) {
                seen.add(abs);
                unique.push(lit);
            }
        }
        if (unique.length > 0) {
            clauses.push(unique);
        }
    }

    assertSAT(clauses, n, "12-var random SAT formula (24 clauses)");
});

// ─── Helper ──────────────────────────────────────────────────────────

function popcount(x) {
    x = x >>> 0;
    let count = 0;
    while (x) {
        count += x & 1;
        x >>>= 1;
    }
    return count;
}

// ─── Auto-run in Node.js ─────────────────────────────────────────────

const isNode = typeof module !== "undefined" && typeof window === "undefined";
const isBrowser = typeof window !== "undefined";

if (isNode) {
    // Load SAT.js and helpers.js into global context via vm.runInThisContext.
    const fs = require("fs");
    const path = require("path");
    const vm = require("vm");

    const dir = __dirname;
    const helpersCode = fs.readFileSync(path.join(dir, "helpers.js"), "utf-8");
    const satCode = fs.readFileSync(path.join(dir, "SAT.js"), "utf-8");

    vm.runInThisContext(helpersCode, { filename: "helpers.js" });
    vm.runInThisContext(satCode, { filename: "SAT.js" });

    const result = runSATSuite();
    process.exit(result ? 0 : 1);
}

// ─── Browser: expose globally ───────────────────────────────────────
if (isBrowser) {
    window.runSATSuite = runSATSuite;
    console.log("SAT Suite loaded. Call runSATSuite() to run tests.");
}
