import assert from 'node:assert';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { BlobsServer } from '@netlify/blobs/server';

const server = new BlobsServer({ directory: mkdtempSync(join(tmpdir(), 'blobs-')), token: 't', port: 0 });
const { port } = await server.start();
const url = `http://localhost:${port}`;
process.env.NETLIFY_BLOBS_CONTEXT = Buffer.from(JSON.stringify({ siteID: 's', token: 't', edgeURL: url, uncachedEdgeURL: url })).toString('base64');
const { default: handler, incr } = await import('./votes.mjs');

// local BlobsServer is not atomic under concurrency, so test optimistic locking on an atomic in-memory store
const mem = new Map(); let v = 0;
const memStore = {
  async getWithMetadata(k) { await null; return mem.has(k) ? { data: mem.get(k).d, etag: mem.get(k).e } : null; },
  async setJSON(k, d, o) {
    await new Promise(r => setTimeout(r, Math.random() * 5));
    if ((o.onlyIfNew && mem.has(k)) || (o.onlyIfMatch && mem.get(k)?.e !== o.onlyIfMatch)) return { modified: false };
    mem.set(k, { d, e: String(++v) }); return { modified: true };
  },
};
const res = await Promise.allSettled(Array.from({ length: 6 }, () => incr(memStore, 'k')));
assert.equal(mem.get('k').d, res.filter(r => r.status === 'fulfilled').length, 'aucun vote perdu');

const post = (body, ip = '1.1.1.1') => handler(new Request('http://x/api/votes', { method: 'POST', body: typeof body === 'string' ? body : JSON.stringify(body) }), { ip });
const get = async () => (await (await handler(new Request('http://x/api/votes'), {})).json()).counts;

assert.equal((await post({ artist: 'Inconnu' })).status, 400);
assert.equal((await post('pas du json')).status, 400);
assert.equal((await handler(new Request('http://x', { method: 'PUT' }), {})).status, 405);
for (let i = 0; i < 10; i++) await post({ artist: 'Nix' }, '10.0.0.' + i);
await post({ artist: "Youssou N'Dour" });
assert.deepEqual(await get(), { Nix: 10, "Youssou N'Dour": 1 });
// limite par IP
for (let i = 0; i < 19; i++) assert.equal((await post({ artist: "Youssou N'Dour" })).status, 200);
assert.equal((await post({ artist: "Youssou N'Dour" })).status, 429);
assert.equal((await get())["Youssou N'Dour"], 20);
await server.stop();
console.log('votes OK');
