const levenshtein = (a, b) => {
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

const d = levenshtein("2470", "2740");
console.log(`Dist('2470', '2740') = ${d}`);

const d2 = levenshtein("ohigins", "ohiggins");
console.log(`Dist('ohigins', 'ohiggins') = ${d2}`);

const d3 = levenshtein("ohigins", "o'higgins"); // Plain string
console.log(`Dist('ohigins', 'o'higgins') = ${d3}`);
