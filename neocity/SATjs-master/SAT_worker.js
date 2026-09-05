/**
 * The deployment CSP only permits workers from blob: URLs (`worker-src blob:`),
 * so we can't construct a Worker directly from the script URL. Instead we fetch
 * the solver source and wrap it in a Blob. If anything fails (fetch blocked,
 * worker-src not satisfied, etc.) we fall back to synchronous solving, which
 * still works because SAT.js is also loaded as a normal <script>.
 *
 * @type {Promise<Worker | null>}
 */
const workerPromise = (async () => {
    if (!window.Worker) {
        // Workers unsupported: solve synchronously on this thread.
        return null;
    }
    try {
        const response = await fetch(
            new URL("../SATjs-master/SAT.js", document.baseURI).href,
        );
        if (!response.ok) {
            throw new Error(
                `Failed to fetch SAT.js: ${response.status} ${response.statusText}`,
            );
        }
        const source = await response.text();
        const blob = new Blob([source], { type: "application/javascript" });
        return new Worker(URL.createObjectURL(blob));
    } catch (/** @type {any} */ error) {
        console.warn(
            "Could not start SAT worker, falling back to synchronous solving.",
            error,
        );
        return null;
    }
})();

/**
 * Handles spinning up a web worker for sat solving
 * @param {number} size
 * @param {Clause[]} clauses
 * @returns {Promise<{SAT: boolean, stats: Stats}>}
 */
async function satSolveAsync(size, clauses) {
    const worker = await workerPromise;
    if (worker) {
        return new Promise((resolve, reject) => {
            const channel = new MessageChannel();

            worker.postMessage([size, clauses], [channel.port2]);

            channel.port1.onmessage = (e) => {
                if (e.data.error) {
                    reject(new Error(e.data.error));
                } else {
                    resolve(e.data.result);
                }
            };
        });
    }
    // No worker available: solve synchronously on this thread.
    return satSolve(size, clauses);
}