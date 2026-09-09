Types of subset restriction

- Whole Clue
  Useful when the neighbourhood of the clue is a subset of another clue's neighbourhood

- Partial Clue
  Occurs when a clue's neighbourhood is fully determined except for some subset

- Propagation
  Occurs when a clue's neighbourhood contains a subset restriction that doesn't cause a simple remainder in the rest of the neighbourhood - the rest of the neighbourhood becomes a new subset restriction that could be consumed by another clue. Propagation can occur across an arbitrary distance

- Total Neighbourhood Sum/Excluded Difference
  These techniques always produce at least one subset restriction (at least in 2 clues). TNS produces two because each clue color has a separate subset restriction with the same area.

Types of Subset Consumption

- Consumption by Superset
  When a subset restriction fully contains the consumed one

- Subsets as Candidate Restrictions
  If multiple subset restrictions have the same neighbourhood and different colors and they sum to the size of the subset


        | Same Color | Different Color
---------------------------------------
Subset  |            | Simple TNS
Overlap | ED         | 

Solver Techniques can operate on candidates, cells, or subsets, (or arbitrary logic???)

I say go wide on solver techniques because I can always narrow them down once they exist

~Simple Remainder~
- INPUT: One Clue
- WHEN: Remaining empty neighbourhood size === Necessary remaining cells to satisfy clue
- OUTPUT: Empty Neighbourhood => Clue Color

~Last Candidate~
- INPUT: One Cell & Effective Clue Candidate Board
- WHEN: Cell has only one candidate color
- OUTPUT: Cell => Candidate Color

~Candidate Simple Remainder~
- INPUT: One Clue & Effective Clue Candidate Board
- WHEN: Cells in neighbourhood w/ clue candidate === Necessary remaining cells to satisfy clue
- OUTPUT: Cells in neighbourhood w/ clue candidate => Clue Color

Subset Simple Remainder
- INPUT: One Clue & Effective Clue Subset Board
- WHEN: Cells in neighbourhood w/ clue candidate === Necessary remaining cells to satisfy clue
- OUTPUT: Cells not in subset restriction => Clue Color
