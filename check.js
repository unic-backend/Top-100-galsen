// Validates data.json: run `node check.js`
const assert = require('assert');
const d = require('./data.json');
for (const k of ['artists', 'albums', 'songs']) {
  const seen = new Set();
  for (const it of d[k]) {
    assert(['SN', 'FR', 'US'].includes(it.country), `${k}: bad country ${JSON.stringify(it)}`);
    assert(['rap', 'mbalax'].includes(it.genre), `${k}: bad genre ${JSON.stringify(it)}`);
    const key = `${it.country}-${it.genre}-${it.rank}`;
    assert(!seen.has(key), `${k}: duplicate rank ${key}`);
    seen.add(key);
  }
}
console.log('data.json OK');
