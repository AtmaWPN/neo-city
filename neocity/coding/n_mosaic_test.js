(() => {
  const $ = (id) => document.getElementById(id);
  function readParams() {
    const num = (id, dflt) => {
      const v = parseInt($(id).value, 10);
      return Number.isFinite(v) ? v : dflt;
    };
    return {
      w: num("nmt_width", 10),
      h: num("nmt_height", 10),
      colors: num("nmt_colors", 3),
      fraction: parseFloat($("nmt_fraction").value) || 0.75
    };
  }
  const tick = () => new Promise((r) => setTimeout(r, 0));
  const TECHNIQUES = [
    { key: "SimpleRemainder", label: "Simple Remainder", fn: (m) => m.solveSimpleRemainder(m) },
    { key: "LastCandidate", label: "Last Candidate", fn: (m) => m.solveLastCandidate(m) },
    { key: "SimpleCandidateRemainder", label: "Simple Candidates Remainder", fn: (m) => m.solveSimpleCandidateRemainder(m) },
    { key: "SimpleSubsetRemainder", label: "Simple Subset Remainder", fn: (m) => m.solveSimpleSubsetRemainder(m) },
    { key: "TotalNeighbourhoodSum", label: "Total Neighbourhood Sum", fn: (m) => m.solveTotalNeighbourhoodSum(m) }
  ];
  const findTech = (key) => TECHNIQUES.find((t) => t.key === key);
  const chosenTechniques = () =>
    TECHNIQUES.filter((t) => $("nmt_tech_" + t.key).checked);
  function techCount(n, key) {
    return n.techniqueCounts[key] ?? 0;
  }
  function summarizeSat(n) {
    let calls = 0;
    let decisions = 0;
    let conflicts = 0;
    let propagations = 0;
    let learnts = 0;
    let maxDecisionLevel = 0;
    const byPhase = {};
    for (const rec of n.satStats) {
      calls++;
      byPhase[rec.phase] = (byPhase[rec.phase] ?? 0) + 1;
      decisions += rec.stats.totalDecisions ?? 0;
      conflicts += rec.stats.totalConflicts ?? 0;
      propagations += rec.stats.totalPropagations ?? 0;
      learnts += rec.stats.totalLearnts ?? 0;
      maxDecisionLevel = Math.max(
        maxDecisionLevel,
        rec.stats.maxDecisionLevel ?? 0
      );
    }
    return { calls, byPhase, decisions, conflicts, propagations, learnts, maxDecisionLevel };
  }
  const batchRows = [];
  let batchId = 0;
  let batchRunning = false;
  let batchCancelled = false;
  function collectRow(n, difficulty, idx, ms, verify) {
    const sat = summarizeSat(n);
    const row = {
      batch: batchId,
      idx,
      difficulty,
      seed: n.seed,
      w: n.BOARD_WIDTH,
      h: n.BOARD_HEIGHT,
      colors: n.BOARD_COLORS,
      fraction: n.BOARD_FRACTION,
      included: n.cells.filter((c) => c.included).length,
      clues: n.clues.length,
      ms: Math.round(ms),
      randomTries: n.randomPuzzleTries,
      randomPatternFound: n.randomPatternFound ? "true" : "false",
      recipesApplied: n.recipesApplied,
      satCalls: sat.calls,
      satConsistency: sat.byPhase["isConsistent"] ?? 0,
      satValid: sat.byPhase["validSolution"] ?? 0,
      satUnique: sat.byPhase["uniqueSolution"] ?? 0,
      satDecisions: sat.decisions,
      satConflicts: sat.conflicts,
      satPropagations: sat.propagations,
      satLearnts: sat.learnts,
      tSimpleRemainder: techCount(n, "SimpleRemainder"),
      tLastCandidate: techCount(n, "LastCandidate"),
      tCandidateRemainder: techCount(n, "SimpleCandidateRemainder"),
      tSubsetRemainder: techCount(n, "SimpleSubsetRemainder"),
      tTNS: techCount(n, "TotalNeighbourhoodSum"),
      verifySolved: "",
      vSimpleRemainder: 0,
      vLastCandidate: 0,
      vCandidateRemainder: 0,
      vSubsetRemainder: 0,
      vTNS: 0
    };
    if (verify) {
      n.cells.forEach((c) => c.color = null);
      const before = { ...n.techniqueCounts };
      const solvePromise = n.techniqueSolve(TECHNIQUES.map((t) => t.fn));
      solvePromise.then((solved) => {
        row.verifySolved = solved ? "true" : "false";
        row.vSimpleRemainder = techCount(n, "SimpleRemainder") - (before["SimpleRemainder"] ?? 0);
        row.vLastCandidate = techCount(n, "LastCandidate") - (before["LastCandidate"] ?? 0);
        row.vCandidateRemainder = techCount(n, "SimpleCandidateRemainder") - (before["SimpleCandidateRemainder"] ?? 0);
        row.vSubsetRemainder = techCount(n, "SimpleSubsetRemainder") - (before["SimpleSubsetRemainder"] ?? 0);
        row.vTNS = techCount(n, "TotalNeighbourhoodSum") - (before["TotalNeighbourhoodSum"] ?? 0);
        renderTable();
      });
    }
    return row;
  }
  async function runBatch() {
    if (batchRunning) return;
    batchRunning = true;
    batchCancelled = false;
    batchId++;
    const { w, h, colors, fraction } = readParams();
    const useSat = $("nmt_method_sat").checked;
    const techniques = useSat ? [] : chosenTechniques();
    if (!useSat && techniques.length === 0) {
      $("nmt_methodwarn").textContent =
        "select at least one technique (or switch to SAT)";
      batchRunning = false;
      return;
    }
    $("nmt_methodwarn").textContent = "";
    const solverLabel = useSat
      ? "sat backward"
      : "backward[" + techniques.map((t) => t.key).join("+") + "]";
    const count = parseInt($("nmt_count").value, 10) || 1;
    const verify = $("nmt_verify").checked;
    $("nmt_start").disabled = true;
    const statusEl = $("nmt_batchstatus");
    const progressEl = $("nmt_progress");
    statusEl.textContent = "starting\u2026";
    for (let i = 0; i < count && !batchCancelled; i++) {
      const t0 = performance.now();
      const n = new window.NMosaic(1, 1, 2, 1, "random");
      // Set up the board shape first ("random" is the cheapest way), then
      // generate backward with exactly the chosen solver set.
      await n.regenerate(w, h, colors, fraction, "random");
      if (useSat) {
        await n.backwardPuzzleGenerator(() => n.satHasUniqueSolution(n.clues));
      } else {
        await n.backwardPuzzleGenerator(() =>
          n.techniqueSolve(techniques.map((t) => t.fn)),
        );
      }
      const ms = performance.now() - t0;
      const row = collectRow(n, solverLabel, i + 1, ms, verify);
      batchRows.push(row);
      progressEl.textContent = `${i + 1}/${count}`;
      statusEl.textContent = `#${i + 1}: ${solverLabel} \u2014 ${n.clues.length} clues, ${n.cells.filter((c) => c.included).length} cells`;
      renderTable();
      await tick();
    }
    $("nmt_start").disabled = false;
    batchRunning = false;
    if (batchCancelled) {
      statusEl.textContent = `cancelled after ${batchRows.length} puzzle(s)`;
    } else {
      statusEl.textContent = `done: ${batchRows.length} puzzle(s) in batch #${batchId}`;
    }
  }
  const TABLE_COLUMNS = [
    { key: "idx", label: "#", num: true },
    { key: "difficulty", label: "difficulty", left: true },
    { key: "seed", label: "seed", num: true },
    { key: "w", label: "w", num: true },
    { key: "h", label: "h", num: true },
    { key: "colors", label: "colors", num: true },
    { key: "fraction", label: "fraction" },
    { key: "included", label: "cells", num: true },
    { key: "clues", label: "clues", num: true },
    { key: "ms", label: "ms", num: true },
    { key: "randomTries", label: "randTries", num: true },
    { key: "recipesApplied", label: "recipes", num: true },
    { key: "satCalls", label: "satCalls", num: true },
    { key: "satDecisions", label: "satDec", num: true },
    { key: "satConflicts", label: "satConf", num: true },
    { key: "tSimpleRemainder", label: "SR", num: true },
    { key: "tLastCandidate", label: "LC", num: true },
    { key: "tCandidateRemainder", label: "SCR", num: true },
    { key: "tSubsetRemainder", label: "SSR", num: true },
    { key: "tTNS", label: "TNS", num: true },
    { key: "verifySolved", label: "verify" }
  ];
  function renderTable() {
    const table = $("nmt_table");
    const head = `<tr>${TABLE_COLUMNS.map((c) => `<th class="${c.left ? "l" : ""}">${c.label}</th>`).join("")}</tr>`;
    const body = batchRows.map(
      (r) => `<tr>${TABLE_COLUMNS.map((c) => `<td class="${c.left ? "l" : ""}">${r[c.key]}</td>`).join("")}</tr>`
    ).join("");
    const totals = {};
    for (const c of TABLE_COLUMNS) {
      if (!c.num) {
        totals[c.key] = "";
        continue;
      }
      const sum = batchRows.reduce((s, r) => s + r[c.key], 0);
      totals[c.key] = c.key === "ms" ? `${Math.round(sum / Math.max(1, batchRows.length))}` : `${sum}`;
    }
    const totalRow = `<tr class="total"><td class="l" colspan="${TABLE_COLUMNS.length}">totals/avg: ${totals.ms} ms avg</td></tr>`;
    table.innerHTML = batchRows.length === 0 ? "" : `<thead>${head}</thead><tbody>${body}${totalRow}</tbody>`;
  }
  const CSV_COLUMNS = [
    { key: "batch", label: "batch" },
    { key: "idx", label: "idx" },
    { key: "difficulty", label: "difficulty" },
    { key: "seed", label: "seed" },
    { key: "w", label: "width" },
    { key: "h", label: "height" },
    { key: "colors", label: "colors" },
    { key: "fraction", label: "fraction" },
    { key: "included", label: "included_cells" },
    { key: "clues", label: "clue_count" },
    { key: "ms", label: "generation_ms" },
    { key: "randomTries", label: "random_puzzles_tried" },
    { key: "randomPatternFound", label: "random_pattern_found" },
    { key: "recipesApplied", label: "recipes_applied" },
    { key: "satCalls", label: "sat_calls" },
    { key: "satConsistency", label: "sat_consistency_calls" },
    { key: "satValid", label: "sat_valid_calls" },
    { key: "satUnique", label: "sat_unique_calls" },
    { key: "satDecisions", label: "sat_decisions" },
    { key: "satConflicts", label: "sat_conflicts" },
    { key: "satPropagations", label: "sat_propagations" },
    { key: "satLearnts", label: "sat_learnts" },
    { key: "tSimpleRemainder", label: "tech_simple_remainder" },
    { key: "tLastCandidate", label: "tech_last_candidate" },
    { key: "tCandidateRemainder", label: "tech_simple_candidates_remainder" },
    { key: "tSubsetRemainder", label: "tech_simple_subset_remainder" },
    { key: "tTNS", label: "tech_total_neighbourhood_sum" },
    { key: "verifySolved", label: "verify_solved" },
    { key: "vSimpleRemainder", label: "verify_simple_remainder" },
    { key: "vLastCandidate", label: "verify_last_candidate" },
    { key: "vCandidateRemainder", label: "verify_simple_candidates_remainder" },
    { key: "vSubsetRemainder", label: "verify_simple_subset_remainder" },
    { key: "vTNS", label: "verify_total_neighbourhood_sum" }
  ];
  function downloadCsv() {
    if (batchRows.length === 0) return;
    const esc = (v) => {
      const s = String(v ?? "");
      return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const lines = [CSV_COLUMNS.map((c) => esc(c.label)).join(",")];
    for (const row of batchRows) {
      lines.push(CSV_COLUMNS.map((c) => esc(row[c.key])).join(","));
    }
    const csv = "\uFEFF" + lines.join("\r\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    const stamp = (/* @__PURE__ */ new Date()).toISOString().replace(/[:.]/g, "-");
    a.href = URL.createObjectURL(blob);
    a.download = `n-mosaic-batch-${stamp}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }
  const manualCanvas = $("nmt_board");
  const manualPalette = $("nmt_palette");
  // Drawing lives in SquareGridNMosaicRenderer (n_mosaic_game.js); NMosaic
  // itself is pure logic since the merge.
  const manual = new window.NMosaic(9, 9, 2, 0.75, "random");
  const manualRenderer = new SquareGridNMosaicRenderer(manualCanvas, manualPalette);
  const logEl = $("nmt_log");
  function logLine(msg) {
    logEl.textContent = (logEl.textContent + "\n" + msg).trimStart();
    logEl.scrollTop = logEl.scrollHeight;
  }
  function manualSolved() {
    const allFilled = manual.cells.every((c) => !c.included || c.color !== null);
    const cluesOk = manual.clues.every((cl) => {
      const cell = manual.getCell(cl.row, cl.col);
      if (!cell) return false;
      return cell.neighbors.filter((n) => n.color === cl.color).length === cl.count;
    });
    return allFilled && cluesOk;
  }
  function updateManualStatus() {
    const included = manual.cells.filter((c) => c.included).length;
    const filled = manual.cells.filter((c) => c.included && c.color !== null).length;
    let badClues = 0;
    for (const cl of manual.clues) {
      const cell = manual.getCell(cl.row, cl.col);
      if (!cell) continue;
      const count = cell.neighbors.filter((n) => n.color === cl.color).length;
      if (count !== cl.count) badClues++;
    }
    const sat = summarizeSat(manual);
    const tries = manual.randomPuzzleTries > 0 ? ` randomTries=${manual.randomPuzzleTries}` : "";
    const status = `cells=${filled}/${included} clues=${manual.clues.length} unsatisfiedClues=${badClues} solved=${manualSolved() ? "YES" : "no"}${tries} satCalls=${sat.calls}`;
    $("nmt_manualstatus").textContent = status;
  }
  async function manualGenerate() {
    const { w, h, colors, fraction } = readParams();
    const difficulty = $("nmt_manual_difficulty").value;
    logEl.textContent = "";
    logLine(`generating ${difficulty} ${w}x${h} ${colors} colors\u2026`);
    await manual.regenerate(w, h, colors, fraction, difficulty);
    manualRenderer.showSolution = false;
    logLine(`done: ${manual.clues.length} clues, ${manual.cells.filter((c) => c.included).length} cells` + (manual.randomPuzzleTries > 0 ? `, solvable random pattern found in ${manual.randomPuzzleTries} tries` : ""));
    updateManualStatus();
  }
  function applyOnce(key) {
    const t = findTech(key);
    const before = manual.cells.reduce((s, c) => s + (c.color !== null ? 1 : 0), 0);
    const applied = t.fn(manual);
    logLine(`${t.label}: applied ${applied}`);
    updateManualStatus();
    void before;
  }
  function solveAll() {
    let grandTotal = 0;
    let passes = 0;
    let done = false;
    while (!done) {
      done = true;
      passes++;
      for (const t of TECHNIQUES) {
        let c = 0;
        while ((c = t.fn(manual)) > 0) {
          done = false;
          grandTotal += c;
        }
      }
    }
    logLine(`solve-all finished: ${passes} full passes, ${grandTotal} total cell applications`);
    logLine(
      "counts: " + TECHNIQUES.map((t) => `${t.label}=${techCount(manual, t.key)}`).join(", ")
    );
    updateManualStatus();
  }
  function resetGuesses() {
    manual.cells.forEach((c) => {
      c.color = null;
      c.pencilMarks.clear();
    });
    logLine("guesses cleared");
    updateManualStatus();
  }
  $("nmt_start").onclick = () => {
    void runBatch();
  };
  $("nmt_cancel").onclick = () => {
    batchCancelled = true;
  };
  $("nmt_csv").onclick = downloadCsv;
  $("nmt_manual_generate").onclick = () => {
    void manualGenerate();
  };
  $("nmt_reset").onclick = resetGuesses;
  $("nmt_solution").onclick = () => {
    manualRenderer.showSolution = !manualRenderer.showSolution;
    $("nmt_solution").textContent = manualRenderer.showSolution ? "Hide Solution()" : "Show Solution()";
    logLine(manualRenderer.showSolution ? "solution shown" : "solution hidden");
  };
  document.querySelectorAll("button[data-tech]").forEach((btn) => {
    btn.onclick = () => applyOnce(btn.dataset["tech"]);
  });
  $("nmt_solveall").onclick = solveAll;
  const syncMethodUI = () => {
    const useSat = $("nmt_method_sat").checked;
    TECHNIQUES.forEach((t) => {
      $("nmt_tech_" + t.key).disabled = useSat;
    });
    $("nmt_methodwarn").textContent = "";
  };
  $("nmt_method_techniques").onclick = syncMethodUI;
  $("nmt_method_sat").onclick = syncMethodUI;
  syncMethodUI();
  function loop() {
    manualRenderer.drawBackground(manual);
    manualRenderer.drawBoard(manual);
    manualRenderer.drawPalette(manual);
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
  updateManualStatus();
  logLine("ready \u2014 pick techniques (or SAT) and Run Batch().");
})();
