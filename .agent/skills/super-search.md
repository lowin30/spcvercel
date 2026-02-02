---
name: super-search-logic
description: Logic for 4-Layer Intelligent Search (Exact > Address > BagOfWords > Fuzzy Levenshtein).
---

# Super Intelligent Search Strategy (Level 4)

This search strategy is designed to find entities (like Buildings) even with typos, partial terms, or address mismatches. It operates in 4 consecutive layers, stopping when results are found.

## Layer 1: Exact & Partial (DB)
Standard SQL `ilike` search on primary fields (e.g., `nombre`, `direccion`).
```sql
WHERE nombre ILIKE '%term%' OR direccion ILIKE '%term%'
```

## Layer 2: Address Numeric Fallback (DB)
If Layer 1 fails, extracting numbers from the query (e.g., "2740" from "Ohigins 2470") and searching solely by address number.
- Use case: User types wrong name but correct number.

## Layer 3: Bag of Words (DB)
Splits the query into words (>2 chars) and searches for ANY match.
- Use case: "Edificio Centro" matches "Centro Empresarial".
- Logic: `nombre ILIKE '%word1%' OR nombre ILIKE '%word2%' ...`

## Layer 4: Client-Side Fuzzy (Levenshtein) - The "Smart" Layer
If DB searches fail, fetch a candidate pool (e.g., limit 50) and apply JavaScript scoring.

### Scoring Algorithm:
1.  **Normalization:** Lowercase, remove accents (`normalize("NFD")`).
2.  **Numeric Match Bonus:** If numbers match exactly, +5 points.
3.  **Word Matching:**
    - Split target and source into tokens.
    - Calculate Levenshtein distance between every token pair.
    - If distance <= 2 (e.g., "Ohigins" vs "O'Higgins"), +5 points.
    - If partial inclusion, +3 points.

### Reference Implementation (TypeScript)

```typescript
// Levenshtein Implementation
const levenshtein = (a: string, b: string): number => {
    const matrix = [];
    for (let i = 0; i <= b.length; i++) { matrix[i] = [i]; }
    for (let j = 0; j <= a.length; j++) { matrix[0][j] = j; }
    for (let i = 1; i <= b.length; i++) {
        for (let j = 1; j <= a.length; j++) {
            if (b.charAt(i - 1) == a.charAt(j - 1)) {
                matrix[i][j] = matrix[i - 1][j - 1];
            } else {
                matrix[i][j] = Math.min(matrix[i - 1][j - 1] + 1, Math.min(matrix[i][j - 1] + 1, matrix[i - 1][j] + 1));
            }
        }
    }
    return matrix[b.length][a.length];
};

// Main Helper
export function calculateRelevanceScore(itemText: string, query: string): number {
    const normalize = (s: string) => s ? s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "") : "";
    
    const targetNorm = normalize(query);
    const sourceNorm = normalize(itemText);
    
    // Exact Number Match
    const targetNums = targetNorm.match(/\d+/g) || [];
    const sourceNums = sourceNorm.match(/\d+/g) || [];
    const numMatch = targetNums.some(n => sourceNums.includes(n));
    
    // Fuzzy Word Match
    const targetWords = targetNorm.split(/\W+/).filter(w => w.length > 3);
    const sourceWords = sourceNorm.split(/\W+/).filter(w => w.length > 2);
    
    let score = 0;
    
    targetWords.forEach(tw => {
        let bestDist = 99;
        sourceWords.forEach(sw => {
            const dist = levenshtein(tw, sw);
            if (dist < bestDist) bestDist = dist;
        });
        if (bestDist <= 2) score += 5; // Typos handled here
        else if (sourceWords.some(sw => sw.includes(tw) || tw.includes(sw))) score += 3;
    });
    
    if (numMatch) score += 5;
    
    return score;
}
```

## Usage
Use this logic in:
1.  AI Tools (`lib/ai/tools.ts`)
2.  Global Search Bars (`components/ui/search-bar.tsx`)
3.  Command Palettes (`components/command-menu.tsx`)
