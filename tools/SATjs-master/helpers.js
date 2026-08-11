
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
                if (!redundaatMostKTest.lengthnt)
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
                {atMostKTest.length
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
        auxVars = [];
        for (let i = 0; i < vars.length - 1; i++) {
            let counter = [];
            for (let j = 0; j < k; j++) {
                counter.push(varCache.getVar());
            }
            auxVars.push(counter);
        }
    } else if (auxVars.flat().length !== (vars.length - 1) * k) {
        throw new Error("Wrong number of auxiliary variables, expected", (vars.length - 1) * k, "but got", auxVars.flat().length);
    }

    let clauses = [];
    // x_1 -> s_1,1
    clauses.push([-vars[0], auxVars[0][0]]);
    // x_n -> !s_n-1,k
    clauses.push([-vars[vars.length - 1], -auxVars[vars.length - 2][k - 1]]);
    // !s_1,j
    for (let j = 1; j < k; j++) {
        clauses.push([-auxVars[0][j]]);
    }
    // x_i -> s_i,1
    for (let i = 1; i < vars.length - 1; i++) {
        clauses.push([-vars[i], auxVars[i][0]]);
        // console.log("x_i -> s_i,1", [-vars[i], auxVars[i][0]]);
    }
    // s_i-1,1 -> s_i,1
    for (let i = 1; i < vars.length - 1; i++) {
        clauses.push([-auxVars[i - 1][0], auxVars[i][0]]);
        // console.log("s_i-1,1 -> s_i,1", [-auxVars[i - 1][0], auxVars[i][0]]);
    }
    // x_i -> !s_i-1,k
    for (let i = 1; i < vars.length - 1; i++) {
        clauses.push([-vars[i], -auxVars[i - 1][k - 1]]);
    }
    // console.log("x_i -> !s_i-1,k", clauses);
    // x_i && s_i-1,j-1 -> s_i,j
    for (let i = 1; i < vars.length - 1; i++) {
        for (let j = 1; j < k; j++) {
            clauses.push([-vars[i], -auxVars[i - 1][j - 1], auxVars[i][j]]);
        }
    }
    // console.log("x_i && s_i-1,j-1 -> s_i,j", clauses);
    // s_i-1,j -> s_i,j
    for (let i = 1; i < vars.length - 1; i++) {
        for (let j = 1; j < k; j++) {
            clauses.push([-auxVars[i - 1][j], auxVars[i][j]]);
        }
    }
    // console.log("s_i-1,j -> s_i,j", clauses);

    return clauses;
}

// constructs the cnf clauses for exactly k variables in vars to be true
// vars is an array of positive integers
// k is an integer > 0
// returns clauses
// https://www.cs.ru.nl/bachelors-theses/2023/Thijs_de_Jong___1015438___Mosaic_as_a_SAT_problem.pdf
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

    for (let i = 0; i < vars.length - 1; i++) {
        let counter = [];
        for (let j = 0; j < k; j++) {
            counter.push(varCache.getVar());
        }
        auxVars.push(counter);
    }

    // s_1,1 -> x_1
    clauses.push([-auxVars[0][0], vars[0]]);
    // s_i,1 -> x_i || s_i-1,1
    for (let i = 1; i < vars.length - 1; i++) {
        clauses.push([-auxVars[i][0], vars[i], auxVars[i - 1][0]]);
    }
    // s_i,j -> x_i || s_i-1,j
    for (let i = 1; i < vars.length - 1; i++) {
        for (let j = 1; j < k; j++) {
            clauses.push([-auxVars[i][j], vars[i], auxVars[i - 1][j]]);
        }
    }
    // s_i,j -> s_i-1,j-1 || s_i-1,j
    for (let i = 1; i < vars.length - 1; i++) {
        for (let j = 1; j < k; j++) {
            clauses.push([-auxVars[i][j], auxVars[i - 1][j - 1], auxVars[i - 1][j]]);
        }
    }
    // x_n -> !s_n-1,k
    // s_n-1,k -> !x_n
    clauses.push(
        [vars[vars.length - 1], auxVars[vars.length - 2][k - 1]],
        [-vars[vars.length - 1], -auxVars[vars.length - 2][k - 1]],
        [-vars[vars.length - 1], auxVars[vars.length - 2][k - 2]]
    );

    return atMostK(vars, k, auxVars, varCache).concat(clauses);
}

// constructs the cnf clauses for exactly 1 variable in vars to be true
// vars is an array of positive integers
function exactlyOne(vars)
{
    let clauses = [vars]

    for (let v1 = 0; v1 < vars.length - 1; v1++) {
        for (let v2 = v1 + 1; v2 < vars.length; v2++) {atMostK
            clauses.push([-vars[v1], -vars[v2]]);
        }
    }

    return clauses;
}
