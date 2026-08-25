
function runAtMostKTest()
{
    for (let n = 2; n <= 9; n++) {
        testAtMostK(n);
    }
}

function runExactlyKTest()
{
    for (let n = 2; n <= 9; n++) {
        testExactlyK(n);
    }
}

// tests the at most K clause generator for a given number of variables
function testAtMostK(n)
{
    for (let k = 1; k <= n; k++) {
        for (let i = 0; i < Math.pow(2, n); i++) {
            let atMostVarCache = new VarCache(n);
            let atMostKTest = atMostK(Array.from({ length: n }, (v, i) => i + 1), k, null, atMostVarCache);
            let clauses = [];
            let trueCount = 0;
            for (let p = 0; p < n; p++) {
                const varState = Math.trunc((i % Math.pow(2, p + 1)) / Math.pow(2, p));
                if (varState === 1) {
                    trueCount++;
                }
                atMostKTest.push([varState === 1 ? p + 1 : -(p + 1)]);
            }
            const atMostSAT = satSolve(atMostVarCache.last, atMostKTest);
            console.log(atMostKTest, k, trueCount, atMostSAT);
            if (atMostSAT !== (k >= trueCount)) {
                throw new Error("AT MOST K TEST FAILED");
            }
        }
    }
}

// tests the exactly K clause generator for a given number of variables
function testExactlyK(n)
{
    for (let k = 1; k <= n; k++) {
        for (let i = 0; i < Math.pow(2, n); i++) {
            let exactlyVarCache = new VarCache(n);
            let exactlyKTest = exactlyK(Array.from({ length: n }, (v, i) => i + 1), k, exactlyVarCache);
            let clauses = [];
            let trueCount = 0;
            for (let p = 0; p < n; p++) {
                const varState = Math.trunc((i % Math.pow(2, p + 1)) / Math.pow(2, p));
                if (varState === 1) {
                    trueCount++;
                }
                exactlyKTest.push([varState === 1 ? p + 1 : -(p + 1)]);
            }
            const exactlySAT = satSolve(exactlyVarCache.last, exactlyKTest);
            console.log(exactlyKTest, k, trueCount, exactlySAT);
            if (exactlySAT !== (k === trueCount)) {
                throw new Error("EXACTLY K TEST FAILED");
            }
        }
    }
}
