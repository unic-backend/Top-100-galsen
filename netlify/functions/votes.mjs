// API votes du public : GET = compteurs du mois, POST {artist} = +1 vote
import { createHash } from 'node:crypto';
import { getStore } from '@netlify/blobs';
import data from '../../data.json' with { type: 'json' };

const ARTISTS = new Set(data.artists.map(a => a.name));
// shortcut: cap per IP (operators share IPs via CGNAT, so not 1); upgrade to phone/OTP login if fraud appears
const MAX_PER_IP_DAY = 20;
const json = (body, status = 200, extra = {}) => Response.json(body, { status, headers: extra });
const month = () => new Date().toISOString().slice(0, 7);

// atomic +1 with optimistic locking; false if limit reached
export async function incr(store, key, max = Infinity) {
  for (let i = 0; i < 8; i++) {
    const cur = await store.getWithMetadata(key, { type: 'json', consistency: 'strong' });
    const n = cur?.data ?? 0;
    if (n >= max) return false;
    const r = await store.setJSON(key, n + 1, cur ? { onlyIfMatch: cur.etag } : { onlyIfNew: true });
    if (r.modified) return true;
  }
  throw new Error('conflit, réessaie');
}

export default async (req, context) => {
  const store = getStore({ name: 'votes', consistency: 'strong' });
  const m = month();
  if (req.method === 'GET') {
    const counts = {};
    const { blobs } = await store.list({ prefix: `count/${m}/` });
    await Promise.all(blobs.map(async b => { counts[decodeURIComponent(b.key.split('/')[2])] = await store.get(b.key, { type: 'json' }); }));
    return json({ month: m, counts }, 200, { 'Cache-Control': 'public, max-age=0, must-revalidate', 'Netlify-CDN-Cache-Control': 'public, s-maxage=30' });
  }
  if (req.method !== 'POST') return json({ error: 'méthode' }, 405);

  let artist;
  try { ({ artist } = await req.json()); } catch { return json({ error: 'JSON invalide' }, 400); }
  if (!ARTISTS.has(artist)) return json({ error: 'artiste inconnu' }, 400);

  const day = new Date().toISOString().slice(0, 10);
  const ip = createHash('sha256').update((process.env.VOTE_SALT || 'top100galsen') + context.ip).digest('hex').slice(0, 32);
  const a = encodeURIComponent(artist);
  if (!(await incr(store, `ip/${day}/${ip}/${a}`, MAX_PER_IP_DAY))) return json({ error: 'limite de votes atteinte aujourd’hui' }, 429);
  await incr(store, `count/${m}/${a}`);
  return json({ ok: true });
};

export const config = { path: '/api/votes' };
