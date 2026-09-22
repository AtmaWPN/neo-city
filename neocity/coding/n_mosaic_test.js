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
  const genTechniques = () =>
    TECHNIQUES.filter((t) => $("nmt_gtech_" + t.key).checked);
  const solveTechniques = () =>
    TECHNIQUES.filter((t) => $("nmt_stech_" + t.key).checked);
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
    let maxPropagationDepth = 0;
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
      maxPropagationDepth = Math.max(
        maxPropagationDepth,
        rec.stats.maxPropagationDepth ?? 0
      );
    }
    return { calls, byPhase, decisions, conflicts, propagations, learnts, maxDecisionLevel, maxPropagationDepth };
  }
  const batchRows = [];
  let batchId = 0;
  let batchRunning = false;
  let batchCancelled = false;
  function collectRow(n, difficulty, idx, ms, verify, genCounts, finalSat, finalTech) {
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
      satCalls: finalSat.calls,
      satConsistency: finalSat.byPhase["isConsistent"] ?? 0,
      satValid: finalSat.byPhase["validSolution"] ?? 0,
      satUnique: finalSat.byPhase["uniqueSolution"] ?? 0,
      satDecisions: finalSat.decisions,
      satConflicts: finalSat.conflicts,
      satPropagations: finalSat.propagations,
      satLearnts: finalSat.learnts,
      satMaxLevel: finalSat.maxDecisionLevel,
      satMaxDepth: finalSat.maxPropagationDepth,
      tSimpleRemainder: genCounts["SimpleRemainder"] ?? 0,
      tLastCandidate: genCounts["LastCandidate"] ?? 0,
      tCandidateRemainder: genCounts["SimpleCandidateRemainder"] ?? 0,
      tSubsetRemainder: genCounts["SimpleSubsetRemainder"] ?? 0,
      tTNS: genCounts["TotalNeighbourhoodSum"] ?? 0,
      sSimpleRemainder: finalTech["SimpleRemainder"] ?? 0,
      sLastCandidate: finalTech["LastCandidate"] ?? 0,
      sCandidateRemainder: finalTech["SimpleCandidateRemainder"] ?? 0,
      sSubsetRemainder: finalTech["SimpleSubsetRemainder"] ?? 0,
      sTNS: finalTech["TotalNeighbourhoodSum"] ?? 0,
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
    const genMethod = $("nmt_gen_techniques").checked
      ? "techniques"
      : $("nmt_gen_easyforward").checked
        ? "easy forward"
        : $("nmt_gen_hardforward").checked
          ? "hard forward"
          : "sat";
    const solveSat = $("nmt_solve_sat").checked;
    const genTechs = genTechniques();
    const solveTechs = solveTechniques();
    if (genMethod === "techniques" && genTechs.length === 0) {
      $("nmt_methodwarn").textContent =
        "select at least one generation technique (or choose forward / sat)";
      batchRunning = false;
      return;
    }
    if (!solveSat && solveTechs.length === 0) {
      $("nmt_methodwarn").textContent =
        "select at least one solve technique (or switch to SAT)";
      batchRunning = false;
      return;
    }
    $("nmt_methodwarn").textContent = "";
    const genLabel = genMethod === "techniques"
      ? "backward[" + genTechs.map((t) => t.key).join("+") + "]"
      : genMethod;
    const solveLabel = solveSat
      ? "sat"
      : "techniques[" + solveTechs.map((t) => t.key).join("+") + "]";
    const difficulty = `${genLabel} / ${solveLabel}`;
    const count = parseInt($("nmt_count").value, 10) || 1;
    const verify = $("nmt_verify").checked;
    $("nmt_start").disabled = true;
    const statusEl = $("nmt_batchstatus");
    const progressEl = $("nmt_progress");
    statusEl.textContent = "starting\u2026";
    for (let i = 0; i < count && !batchCancelled; i++) {
      const t0 = performance.now();
      const n = new window.NMosaic(1, 1, 2, 1, "random");
      if (genMethod === "easy forward" || genMethod === "hard forward") {
        // Forward generation builds the puzzle from an empty board, so let
        // regenerate() drive it directly rather than pre-filling the random
        // board shape (which would leave solution colors already assigned).
        await n.regenerate(w, h, colors, fraction, genMethod);
      } else {
        // Set up the board shape first ("random" is the cheapest way), then
        // run backward generation with exactly the chosen generation solver.
        await n.regenerate(w, h, colors, fraction, "random");
        if (genMethod === "sat") {
          await n.backwardPuzzleGenerator(() => n.satHasUniqueSolution(n.clues));
        } else {
          await n.backwardPuzzleGenerator(() =>
            n.techniqueSolve(genTechs.map((t) => t.fn)),
          );
        }
      }
      // Snapshot generation technique counts BEFORE resetting below.
      const genCounts = { ...n.techniqueCounts };
      const ms = performance.now() - t0;
      // Final solve for table stats: reset the instrumentation so the SAT
      // stats below come from a single solve of the finished puzzle rather
      // than being accumulated across every generation step.
      n.satStats = [];
      n.techniqueCounts = {};
      if (solveSat) {
        await n.satHasUniqueSolution(n.clues);
      } else {
        await n.techniqueSolve(solveTechs.map((t) => t.fn));
      }
      const finalSat = summarizeSat(n);
      const finalTech = { ...n.techniqueCounts };
      const row = collectRow(n, difficulty, i + 1, ms, verify, genCounts, finalSat, finalTech);
      batchRows.push(row);
      progressEl.textContent = `${i + 1}/${count}`;
      statusEl.textContent = `#${i + 1}: ${difficulty} \u2014 ${n.clues.length} clues, ${n.cells.filter((c) => c.included).length} cells`;
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
    { key: "satPropagations", label: "satProp", num: true },
    { key: "satLearnts", label: "satLearnt", num: true },
    { key: "satMaxLevel", label: "satLvl", num: true },
    { key: "satMaxDepth", label: "satDepth", num: true },
    { key: "tSimpleRemainder", label: "gSR", num: true },
    { key: "tLastCandidate", label: "gLC", num: true },
    { key: "tCandidateRemainder", label: "gSCR", num: true },
    { key: "tSubsetRemainder", label: "gSSR", num: true },
    { key: "tTNS", label: "gTNS", num: true },
    { key: "sSimpleRemainder", label: "sSR", num: true },
    { key: "sLastCandidate", label: "sLC", num: true },
    { key: "sCandidateRemainder", label: "sSCR", num: true },
    { key: "sSubsetRemainder", label: "sSSR", num: true },
    { key: "sTNS", label: "sTNS", num: true },
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
    { key: "satMaxLevel", label: "sat_max_decision_level" },
    { key: "satMaxDepth", label: "sat_max_propagation_depth" },
    { key: "tSimpleRemainder", label: "gen_tech_simple_remainder" },
    { key: "tLastCandidate", label: "gen_tech_last_candidate" },
    { key: "tCandidateRemainder", label: "gen_tech_simple_candidates_remainder" },
    { key: "tSubsetRemainder", label: "gen_tech_simple_subset_remainder" },
    { key: "tTNS", label: "gen_tech_total_neighbourhood_sum" },
    { key: "sSimpleRemainder", label: "solve_tech_simple_remainder" },
    { key: "sLastCandidate", label: "solve_tech_last_candidate" },
    { key: "sCandidateRemainder", label: "solve_tech_simple_candidates_remainder" },
    { key: "sSubsetRemainder", label: "solve_tech_simple_subset_remainder" },
    { key: "sTNS", label: "solve_tech_total_neighbourhood_sum" },
    { key: "verifySolved", label: "verify_solved" },
    { key: "vSimpleRemainder", label: "verify_simple_remainder" },
    { key: "vLastCandidate", label: "verify_last_candidate" },
    { key: "vCandidateRemainder", label: "verify_simple_candidates_remainder" },
    { key: "vSubsetRemainder", label: "verify_simple_subset_remainder" },
    { key: "vTNS", label: "verify_total_neighbourhood_sum" }
  ];
  function buildCsv() {
    const esc = (v) => {
      const s = String(v ?? "");
      return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const lines = [CSV_COLUMNS.map((c) => esc(c.label)).join(",")];
    for (const row of batchRows) {
      lines.push(CSV_COLUMNS.map((c) => esc(row[c.key])).join(","));
    }
    return "\uFEFF" + lines.join("\r\n");
  }
  function downloadCsv() {
    if (batchRows.length === 0) return;
    const csv = buildCsv();
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    const stamp = (/* @__PURE__ */ new Date()).toISOString().replace(/[:.]/g, "-");
    a.href = URL.createObjectURL(blob);
    a.download = `n-mosaic-batch-${stamp}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }
  function copyCsvToClipboard() {
    if (batchRows.length === 0) {
      $("nmt_progress").textContent = "nothing to copy yet";
      return;
    }
    let csv = buildCsv();
    if (csv.startsWith("\uFEFF")) csv = csv.slice(1); // strip BOM for paste
    const done = (ok) => {
      $("nmt_progress").textContent = ok
        ? `copied ${batchRows.length} row(s) to clipboard`
        : "copy failed \u2014 select and copy from console";
    };
    const fallback = () => {
      const ta = document.createElement("textarea");
      ta.value = csv;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.append(ta);
      ta.select();
      ta.setSelectionRange(0, csv.length);
      let ok = false;
      try {
        ok = document.execCommand("copy");
      } catch (e) {
        ok = false;
      }
      ta.remove();
      done(ok);
    };
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(csv).then(() => done(true)).catch(fallback);
    } else {
      fallback();
    }
  }
  const manualCanvas = $("nmt_board");
  const manualPalette = $("nmt_palette");
  // Drawing lives in SquareGridNMosaicRenderer (n_mosaic_game.js); NMosaic
  // itself is pure logic since the merge.
  const manual = new window.NMosaic(9, 9, 2, 0.75, "random");
  const manualRenderer = new SquareGridNMosaicRenderer(manualCanvas, manualPalette);
  // Make the sandbox board playable: same input handling as the main game
  // page (paint, erase, pencil marks, palette, wheel, number keys), with the
  // sandbox status line refreshed after each stroke.
  new NMosaicGameController(manualRenderer, manual, manualCanvas, manualPalette, updateManualStatus);
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
  const manualTechs = () =>
    TECHNIQUES.filter((t) => $("nmt_mtech_" + t.key).checked);
  const syncManualGenUI = () => {
    const custom = $("nmt_manual_genmethod").value === "custom techniques";
    $("nmt_manual_tech_row").style.opacity = custom ? "1" : "0.45";
    TECHNIQUES.forEach((t) => {
      $("nmt_mtech_" + t.key).disabled = !custom;
    });
  };
  async function manualGenerate() {
    const { w, h, colors, fraction } = readParams();
    const genMethod = $("nmt_manual_genmethod").value;
    const seedField = $("nmt_manual_seed");
    const parsedSeed = parseInt(seedField.value.trim(), 10);
    const seed = Number.isFinite(parsedSeed)
      ? Math.min(4294967295, Math.max(0, parsedSeed))
      : null;
    logEl.textContent = "";
    let difficulty = genMethod;
    let customTechs = null;
    let genLabel = genMethod;
    if (genMethod === "custom techniques") {
      customTechs = manualTechs();
      if (customTechs.length === 0) {
        logLine("select at least one generation technique");
        return;
      }
      difficulty = "random";
      genLabel = "custom[" + customTechs.map((t) => t.key).join("+") + "]";
    }
    logLine(
      `generating ${genLabel} ${w}x${h} ${colors} colors ` +
        (seed === null ? "seed=random" : `seed=${seed}`) +
        "\u2026",
    );
    await manual.regenerate(
      w,
      h,
      colors,
      fraction,
      difficulty,
      seed === null ? undefined : seed,
    );
    if (customTechs !== null) {
      await manual.backwardPuzzleGenerator(() =>
        manual.techniqueSolve(customTechs.map((t) => t.fn)),
      );
    }
    // Reflect the seed genuinely used so the board can be reproduced.
    seedField.value = String(manual.seed);
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
  $("nmt_csvcopy").onclick = copyCsvToClipboard;
  $("nmt_clear").onclick = () => {
    if (batchRunning) return;
    batchRows.length = 0;
    $("nmt_progress").textContent = "";
    $("nmt_batchstatus").textContent = "table cleared";
    renderTable();
  };
  $("nmt_manual_generate").onclick = () => {
    void manualGenerate();
  };
  $("nmt_manual_newseed").onclick = () => {
    $("nmt_manual_seed").value = String(window.NMosaic.randomSeed());
    void manualGenerate();
  };
  $("nmt_manual_genmethod").onchange = syncManualGenUI;
  syncManualGenUI();
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
  const manualBody = $("nmt_manual_body");
  $("nmt_toggle_manual").onclick = () => {
    const hidden = manualBody.style.display === "none";
    manualBody.style.display = hidden ? "" : "none";
    $("nmt_toggle_manual").textContent = hidden ? "Hide()" : "Show()";
  };
  const syncMethodUI = () => {
    const useSat = $("nmt_solve_sat").checked;
    const useGenTech = $("nmt_gen_techniques").checked;
    TECHNIQUES.forEach((t) => {
      $("nmt_gtech_" + t.key).disabled = !useGenTech;
      $("nmt_stech_" + t.key).disabled = useSat;
    });
    $("nmt_gentech_row").style.opacity = useGenTech ? "1" : "0.45";
    $("nmt_stech_row").style.opacity = useSat ? "0.45" : "1";
    $("nmt_methodwarn").textContent = "";
  };
  $("nmt_gen_techniques").onclick = syncMethodUI;
  $("nmt_gen_easyforward").onclick = syncMethodUI;
  $("nmt_gen_hardforward").onclick = syncMethodUI;
  $("nmt_gen_sat").onclick = syncMethodUI;
  $("nmt_solve_techniques").onclick = syncMethodUI;
  $("nmt_solve_sat").onclick = syncMethodUI;
  syncMethodUI();
  function loop() {
    if (manualBody.style.display !== "none") {
      manualRenderer.drawBackground(manual);
      manualRenderer.drawBoard(manual);
      manualRenderer.drawPalette(manual);
    }
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
  updateManualStatus();
  logLine("ready \u2014 pick a generation method and a solve method, then Run Batch().");
})();
