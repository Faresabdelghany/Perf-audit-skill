// Bundle Size Analysis Script
// Usage: node bundle-analysis.js <output-dir>
// Walks the build output directory and reports JS chunk sizes

const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  for (const item of fs.readdirSync(dir)) {
    const full = path.join(dir, item);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) results = results.concat(walk(full));
    else if (item.endsWith('.js')) results.push({ name: item, size: stat.size });
  }
  return results;
}

const outputDir = process.argv[2];
if (!outputDir) {
  console.error('Usage: node bundle-analysis.js <output-dir>');
  process.exit(1);
}

const files = walk(outputDir).sort((a, b) => b.size - a.size);
let total = 0;
files.forEach(f => total += f.size);

console.log('Top 10 chunks:');
files.slice(0, 10).forEach(f =>
  console.log(`  ${(f.size / 1024).toFixed(0)} kB  ${f.name}`)
);
console.log(`Total: ${(total / 1024).toFixed(0)} kB (${files.length} chunks)`);
