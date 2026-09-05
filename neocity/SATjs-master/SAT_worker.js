
/** @type {Worker | null} */
let myWorker = window.Worker ? new Worker(new URL("../SATjs-master/SAT.js", document.baseURI).href) : null;

/**
 * Handles spinning up a web worker for sat solving
 * @param {number} size
 * @param {Clause[]} clauses
 * @returns {Promise<{SAT: boolean, stats: Stats}>}
 */
function satSolveAsync(size, clauses) {
  return new Promise((resolve, reject) => {
    if (myWorker) {
      const channel = new MessageChannel();

      myWorker.postMessage([size, clauses], [channel.port2]);

      channel.port1.onmessage = (e) => {
        if (e.data.error) {
          reject(new Error(e.data.error));
        } else {
          resolve(e.data.result);
        }
      };
    } else {
      // No worker available: solve synchronously on this thread.
      resolve(satSolve(size, clauses));
    }
  });
}
