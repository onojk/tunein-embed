// Prints the size of dist/player.js and fails the build if it exceeds the 40 KB budget.
const fs = require('fs');
const zlib = require('zlib');
const buf = fs.readFileSync('dist/player.js');
const kb = (n) => (n / 1024).toFixed(1) + ' KB';
console.log(`dist/player.js  ${kb(buf.length)} minified, ${kb(zlib.gzipSync(buf).length)} gzipped`);
if (buf.length > 40 * 1024) {
  console.error('Over the 40 KB budget!');
  process.exit(1);
}
