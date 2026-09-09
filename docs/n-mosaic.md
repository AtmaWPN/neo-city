## Techniques

~Simple Remainder~
- INPUT: Single Clue
- WHEN: Number of remaining empty cells in neighbourhood equals the effective clue value (clue value minus cells in the neighbourhood that already match the clue)
- OUTPUT: Those empty cells are marked with the clue color

~Last Candidate~
- INPUT: Single Cell and all other clues that include that cell in their neighbourhood
- WHEN: The Cell is empty and has only one candidate color (candidates are calculated using satisfied clues to rule out the clue color in all empty cells in that neighbourhood)
- OUTPUT: The cell is marked with the candidate color

~Simple Remainder Candidates~
- INPUT: Single Clue and all other clues with neighbourhoods that overlap with that clue's neighbourhood
- WHEN: Number of cells with the clue color as a candidate in clue neighbourhood equals the effective clue value
- OUTPUT: Those cells are marked with the clue color

Subset Simple Remainder
- INPUT: Single Clue and all other same color clues with neighbourhoods that are contained by that clue's neighbourhood
- WHEN: The neighbourhood of this clue (A) fully contains the neighbourhood of another clue (B) and effective value of A minus the effective value of B is equal to the number of empty cells in A's neighbourhood but not B's
- OUTPUT: Those empty cells are marked with the clue color

Subset Simple Remainder for differently colored clues
- INPUT: Single Clue and all other differently colored clues with neighbourhoods that are contained by that clue's neighbourhood
- WHEN: The neighbourhood of this clue (A) fully contains the neighbourhood of another clue (B) and effective value of A minus the effective neighbourhood of B plus the effective value of B is equal to the number of empty cells in A's neighbourhood but not B's
- OUTPUT: Those empty cells are marked with the clue color

Subset Propagation
Forcing Chains
Total Neighbourhood Sum
Excluded Difference

Subset Resolution Cases
- Simple Remainder - subset number equals subset size
- Non-intersecting - Useless without additional information
- Identical Areas - Restricts candidates if the subset restrictions sum to the total area 
- Contained (Subset A is a subset of Subset B) - Extersection => Subset C, either Subset C is a simple remainder or a propagated subset
- Overlapping - This can be either TNS or ED depending on whether the subsets are the same color or different
