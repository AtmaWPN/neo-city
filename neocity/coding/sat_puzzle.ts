
function mosaicLog(uniqueCount: number, rowCount: number) {
  const numbers = Array.from({ length: uniqueCount }, (_, i) => i + 1);
  let result = '';
  const seen = new Set<string>();
  for (let i = 0; i < rowCount; i++) {
    let line: string;
    let attempts = 0;
    do {
      const subsetSize = Math.floor(Math.random() * (uniqueCount - 1)) + 2;
      const shuffled = [...numbers].sort(() => Math.random() - 0.5);
      const selected = shuffled.slice(0, subsetSize).sort((a, b) => a - b);
      line = selected.map(num => {
        const prefix = Math.random() < 0.5 ? '-' : '';
        return prefix + num;
      }).join(' ') + ' 0';
      attempts++;
    } while (seen.has(line) && attempts < 1000);
    seen.add(line);
    result += line + '\n';
  }
  console.log(result);
  return result;
}
