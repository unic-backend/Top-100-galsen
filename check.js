// Validates data.json: run `node check.js`
const assert = require('assert');
const d = require('./data.json');
const sec = (k, it) => k === 'artists' ? it.genre + (it.genre === 'rap' ? it.gender : '') : k;
const seen = new Set();
for (const k of ['artists', 'albums', 'songs']) for (const it of d[k]) {
  assert(['rap', 'mbalax'].includes(it.genre), `${k}: bad genre ${JSON.stringify(it)}`);
  if (k === 'artists') assert(['H', 'F'].includes(it.gender), `bad gender ${it.name}`);
  const key = `${sec(k, it)}-${it.rank}`;
  assert(Number.isInteger(it.rank) && !seen.has(key), `${k}: bad/duplicate rank ${key}`);
  seen.add(key);
}
console.log('data.json OK');
