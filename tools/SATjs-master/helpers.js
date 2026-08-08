
function cnfSolve(cnf)
{
    cnf.style.backgroundColor = "#FFFFBB";

    // (1) Parse the CNF file:
    var lines = cnf.value.split(/\r\n|\r|\n/);

    var num_vars = null, num_clauses;
    var i;
    for (i = 0; i < lines.length; i++)
    {
        var toks = lines[i].split(/\s+/);
        if (toks.length == 0)
            continue;
        if (toks[0] == '')
            toks.shift();
        if (!toks[0] || toks[0] == 'c')
            continue;
        if (toks[0] == 'p')
        {
            if (toks.length != 4 || toks[1] != 'cnf')
                return 'Line ' + i + ': CNF parse error: bad header';
            num_vars = Number(toks[2]);
            num_clauses = Number(toks[3]);
            break;
        }
        return 'Line ' + i + ': CNF parse error: unexpected token ' + toks[0];
    }

    if (num_vars == null)
        return 'Line ' + i + ': CNF parse error: missing header';

    var clauses = [];
    var clause = [];
    var redundant = false;
    i++;
    for (var j = 0; j < num_clauses && i < lines.length; i++)
    {
        var toks = lines[i].split(/\s+/);
        if (toks.length == 0)
            continue;
        if (toks[0] == '')
            toks.shift();
        if (toks[0] == 'c')
            continue;
        for (var k = 0; k < toks.length; k++)
        {
            var literal = Number(toks[k]);
            var idx = (literal < 0? -literal: literal);
            if (idx == 0 && k == toks.length-1)
            {
                if (!redundant)
                    clauses.push(clause);
                clause = [];
                redundant = false;
                j++;
                break;
            }
            if (redundant)
                continue;
            var repeat = false;
            for (var l = 0; l < clause.length; l++)
            {
                if (clause[l] == literal)
                {
                    repeat = true;
                    break;
                }
                if (clause[l] == -literal)
                {
                    redundant = true;
                    break;
                }
            }
            if (idx == 0 || idx > num_vars)
                return 'Line ' + i + ': CNF parse error: literal ' + literal +
                    ' out-of-range';
            if (!repeat)
                clause.push(literal);
        }
    }

    if (j < num_clauses)
        return 'Line ' + i + ': CNF parse error: input is truncated';

    // (2) Invoke the SAT solver:
    if (satSolve(num_vars, clauses))
    {
        cnf.style.backgroundColor = "#BBFFBB";
        return 'SAT';
    }
    else
    {
        cnf.style.backgroundColor = "#FFBBBB";
        return 'UNSAT';
    }
}

class VarCache {
    last;

    constructor(max) {
        this.last = max;
    }

    getVar() {
        this.last++;
        return this.last;
    }
}

// constructs the cnf clauses for at most k variables in vars to be true
// vars is an array of positive integers
// k is an integer > 0
// returns clauses
function atMostK(vars, k, auxVars = null, varCache = null)
{
    if (varCache === null) {
        varCache = new VarCache(Math.max(...vars));
    }

    if (auxVars === null) {
        for (let i = 0; i < vars.length; i++) {
            let counter = [];
            for (let j = 0; j < k; j++) {
                counter.push(varCache.getVar());
            }
            auxVars.push(counter);
        }
    } else if (auxVars.flat().length !== vars.length * k) {
        throw new Error("Wrong number of auxiliary variables, expected", vars.length * k, "but got", auxVars.flat().length);
    }

    let clauses = [];
    // x_1 -> s_1,1
    clauses.push([-vars[0], auxVars[0][0]]);
    // x_n -> !s_n-1,k
    clauses.push([-vars[vars.length - 1], -auxVars[vars.length - 2][k]]);
    // !s_1,j
    for (let j = 1; j < vars.length; i++) {
        clauses.push([-vars[i], -auxVars[i - 1][k]]);
    }

    // x_i -> !s_i-1,k
    for (let i = 1; i < vars.length; i++) {
        clauses.push([-vars[i], -auxVars[i - 1][k]]);
    }

    return [];
}

// constructs the cnf clauses for exactly k variables in vars to be true
// vars is an array of positive integers
// k is an integer > 0
// returns clauses
function exactlyK(vars, k, varCache = null)
{
    if (k === 1) {
        return exactlyOne(vars);
    }

    if (varCache === null) {
        varCache = new VarCache(Math.max(...vars));
    }

    let clauses = [];
    let auxVars = [];

    for (let i = 0; i < vars.length; i++) {
        let counter = [];
        for (let j = 0; j < k; j++) {
            counter.push(varCache.getVar());
        }
        auxVars.push(counter);
    }

    clauses.push([])

    return atMostK(vars, k, auxVars, varCache).push(...clauses);
}

// constructs the cnf clauses for exactly 1 variable in vars to be true
// vars is an array of positive integers
function exactlyOne(vars)
{
    let clauses = [vars]

    for (let v1 = 0; v1 < vars.length - 1; v1++) {
        for (let v2 = v1 + 1; v2 < vars.length; v2++) {
            clauses.push([-vars[v1], -vars[v2]]);
        }
    }

    return clauses;
}

function testAtMostK(n, k)
{

}

function testExactlyK(n, k)
{
    exactlyK([1, 2, 3], 2);

    let oneAndNoneTest = exactlyK([1, 2, 3, 4, 5], 1).concat([[-1], [-2], [-3], [-4], [-5]]);
    console.log(oneAndNoneTest, satSolve(5, oneAndNoneTest));
    let oneAndOneTest = exactlyK([1, 2, 3, 4, 5], 1).concat([[5]]);
    console.log(oneAndOneTest, satSolve(5, oneAndOneTest));
    let oneAndTwoTest = exactlyK([1, 2, 3, 4, 5], 1).concat([[3], [2]]);
    console.log(oneAndTwoTest, satSolve(5, oneAndTwoTest));
    let oneAndFourTest = exactlyK([1, 2, 3, 4, 5], 1).concat([[1], [5], [3], [4]]);
    console.log(oneAndFourTest, satSolve(5, oneAndFourTest));
}
