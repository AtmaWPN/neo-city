# Subset-restriction creation — complete mechanism taxonomy

> Revision in response to: *"general logic is 2 clues where one neighborhood is a subset of the
> other — what are the OTHER cases where a subset restriction is created?"*

**A subset restriction** `R(T, x)` = "exactly `x` of the cells in set `T` (|T| = y) are color `z`",
nontrivial when `0 < x < y`. The user-facing payoff is that other clues can *consume* an `R(T,x)`
to make progress; this document is only about **how `R(T,x)` comes into existence**.

## 0. One operator generates every creation

Everything reduces to subtracting known information out of a clue's count. Fix clue `(C, z, k)`.
If `S ⊆ N(C)` and the number of `z`-cells in `S` is already known to be `s`, then

> **`R(N(C) \ S, k − s)`** — the rest of the neighborhood must supply the remaining `k − s`.

This is a subset restriction iff `0 < k − s < |N(C) \ S|`.

The *types* are exactly the different ways `S` becomes a known count `s`:

| # | type of source S                | canonical geometry                    |
|---|---------------------------------|---------------------------------------|
| 1 | nothing resolved (`S = ∅`)      | native full neighborhood              |
| 2 | a *nested clue's* neighborhood  | a "band" outside a contained clue     |
| 3 | resolved *overlap* of 2 clues   | "wings" of partially-overlapped clues |
| 4 | resolved *wings* of 2 clues     | the **intersection** of the two       |
| 5 | an already-known subset         | chain / propagation                   |
| 6 | scattered resolved cells (pins) | residual shape                        |

Only type 2 is the nesting you identified. The rest are genuinely different situation
types (different geometry, different precondition), and types 2–4 all fall out of the same
Venn decomposition of two clue-neighborhoods. Details below.

---

## 1. Type 1 — Native (single clue, nothing resolved)

A clue `(C, z, k)` with **strict interior value** `0 < k < |N(C)|` is itself a subset
restriction `R(N(C), k)`.

- corner clue: neighborhood is 2×2 → `0 < k < 4`
- edge clue: neighborhood is 2×3 → `0 < k < 6`
- interior clue: neighborhood is 3×3 → `0 < k < 9`

(If `k = 0` or `k = |N(C)|` it's the already-solvable *Simple Remainder*, not a subset.)

## 2. Type 2 — Containment / nesting  ← the case you already have

Two adjacent **same-`z`** clues `A(a), B(b)` with `N(A) ⊂ N(B)`: the contained clue fixes the
count over `N(A)`, so the **band** `N(B)\N(A)` is a subset `R(N(B)\N(A), b−a)`.

Up to rotation there are **exactly three** band shapes (verified by exhaustive enumeration over
corner/edge/interior; a rectangular board has only three neighborhood shapes, 2×2/2×3/3×3):

| name | placement            | band        | subset            |
|------|----------------------|-------------|-------------------|
| F2   | corner + edge cell   | 2-strip     | "1 of 2" (b−a=1)  |
| F3   | edge + interior cell | 3-strip     | "1 of 3"/"2 of 3" |
| F5   | corner + diagonal   | 5-cell L    | "1..4 of 5"       |

Requires the contained clue to be the smaller/outer-boundary one, so it always sits near an
edge. **Chain:** `A ⊂ B ⊂ C` yields stacked bands `B\A` and `C\B` independently (still type 2).

## 3. Type 3 — Wings from a *resolved overlap* (crossing, no nesting)

**This is the main "other case."** Two **same-`z`** clues `A(a), B(b)` whose neighborhoods
**partially overlap** (neither contains the other — call it *crossing*). Their exclusive
parts are the **wings** `A' = N(A)\N(B)` and `B' = N(B)\N(A)`, and `I = N(A)∩N(B)`.

The counts satisfy `z(A') + z(I) = a` and `z(B') + z(I) = b`. Whenever `z(I)` is **already
known** (the overlap is resolved by pins or other constraints), *both* wings become clean
subsets at once:

> `R(A', a − z(I))`  and  `R(B', b − z(I))`

Because `z(I)` is shared, three concrete arrangements occur:

- **equal resolved overlap** → both wings are subsets with *different* targets but same source.
- if one wing has `a − z(I)` equal to `|A'|` or `0` it collapses to a pin; the *interesting* case
  is `0 < a−z(I) < |A'|` giving a real wing subset.
- the wings can be tiny (2 cells → "1 of 2" on a *wing*), which is the closest cousin of F2 but
  produced by **crossing** instead of nesting.

### Canonical wing-subset boards (resolved overlap)
```
A=(0,1), B=(0,2)          A=(0,0), B=(2,2)        A=(0,1), B=(0,3)
   0  1  2  3                 0  1  2  3              0  1  2  3  4
0  A  I  I  B             0  A  A   .   .          0  A  A  I  B  B
1  A  I  I  B             1  A  I  B   B           1  A  A  I  B  B
                          2     B  B   B
overlap|I|=4, wings 2+2   3     B  B   B           overlap|I|=2, wings 4+4
→ two "x of 2" subsets     |I|=1, wings 3+8        → two "x of 4" subsets
```

## 4. Type 4 — Intersection subset from *resolved wings*

The mirror image of type 3: resolve the **wings** (not the overlap), leaving the **overlap** as
the subset. With `z(A')` known, `z(I) = a − z(A')`:

> `R(I, a − z(A'))` (and symmetrically via `B`)

- if both wings are fully *non-`z`* (`z(A')=z(B')=0`), then `z(I) = a = b`, so equal counts are
  required and the strip becomes `R(I, a)`.

### Canonical intersection-subset board (resolved wings)
```
A=(0,1), B=(2,1)   (two edge clues)
   0  1  2
0  A  A  A        wings A',B' (columns 0 and 2) fully resolved non-z
1  I  I  I        → strip I = {(0,1),(1,1),(2,1)}, 3 cells
2  B  B  B        with equal clues a=b → R(I, a): "a of 3" on the strip
3  B  B  B
```

## 5. Type 5 — Propagation (an existing subset as source S)

If `C`'s neighborhood **contains an already-existing subset** `R(S, s)` with `S ⊂ N(C)`, then
subtract it (type 0 with `S` = that subset, `s` known):

> `R(N(C) \ S, k − s)`

This is what the solver TODO calls "subset restrictions can be propagated across an arbitrary
number of clues": the remainder of `C` is a *newer, smaller* subset. Re-apply to the next clue
that sees it, indefinitely.

## 6. Type 6 — Residuals from scattered pins

General runtime case (subsumes 2–4 as special shapes): `S` = *any* already-resolved cells inside
`N(C)`. `R(N(C)\S, k − s)` is a subset whose shape is whatever is left. This is the same operator,
just with no nice geometric name — included so a solver implementation needs only **one** routine:
"subtract known cells, emit a subset if the remainder is interior."

---

## 7. Companion constraints (not single-region subsets, but siblings)

Two same-`z` crossing clues satisfy `z(B') − z(A') = b − a` (from type 3's equations). This
global balance is not itself a clean `R(T,x)`, but:

- **Coupled wings (equal counts, `a=b`):** `z(A') = z(B')` — the two wings always have the *same*
  count. Weak alone, but a third clue that sees both wings (or both bands) can break the symmetry.
- **Imbalance (Excluded Difference, `a≠b`):** predicts how the wing counts differ — useful combined
  with an inequality or a pin, and it's the same-color instance of the code's Excluded-Difference.

These are *constraints*, not created subsets; they feed the mechanism in section 0.

---

## Checklist — every distinct *creation* type

- [ ] **T1 native** — interior clue value → `R(N(C), k)`
- [ ] **T2 containment band** — nested clues (F2 / F3 / F5, plus F-chains)
- [ ] **T3 wings (resolved overlap)** — crossing clues → `R(A',…)`, `R(B',…)`
- [ ] **T4 intersection (resolved wings)** — crossing clues → `R(I, …)`
- [ ] **T5 propagation** — existing subset → smaller remainder subset
- [ ] **T6 residual** — any resolved cells → remainder subset
- [ ] (weaker siblings) coupled wings / imbalance constraints

The "2 clues, one neighborhood ⊆ the other" you already had is **exactly T2**. The distinct
*non-nested* creation situations are **T1 (single clue), T3 (wing), T4 (intersection)**, with
**T5/T6** being the general/iterative forms and the coupling/imbalance pair the weaker allies.