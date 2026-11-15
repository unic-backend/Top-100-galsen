// Bot quotidien : récupère vues, likes, commentaires YouTube des artistes de data.json → stats.json
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const API = 'https://www.googleapis.com/youtube/v3/';
const PER_ARTIST = 5;
const SMOOTH = 10000; // vues fictives ajoutées : une vidéo à 50 vues ne peut pas gagner sur son taux d'engagement

async function yt(endpoint, params) {
  const r = await fetch(API + endpoint + '?' + new URLSearchParams({ ...params, key: process.env.YT_API_KEY }));
  if (!r.ok) throw new Error(`${endpoint} ${r.status}: ${await r.text()}`);
  return r.json();
}

const key = s => s.normalize('NFD').replace(/\(.*?\)/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');
// shortcut: simple name match on title/channel, may keep homonyms; upgrade to official channel IDs per artist
const matches = (snippet, artist) => key(snippet.title + snippet.channelTitle).includes(key(artist));

// commentaires comptent double : signal plus fort qu'un like
const engagement = v => (v.likes + 2 * v.comments) / (v.views + SMOOTH);

function score(items) {
  const lv = v => Math.log10(v.views + 1);
  const maxL = Math.max(...items.map(lv), 1e-9), maxE = Math.max(...items.map(engagement), 1e-9);
  for (const v of items) v.score = Math.round(100 * (0.6 * lv(v) / maxL + 0.4 * engagement(v) / maxE));
  return items;
}

async function main() {
  if (!process.env.YT_API_KEY) throw new Error('YT_API_KEY manquant');
  const data = JSON.parse(fs.readFileSync(path.join(ROOT, 'data.json'), 'utf8'));
  const songs = new Map(), artists = {};
  for (const a of data.artists) {
    const s = await yt('search', { part: 'snippet', q: a.name, type: 'video', regionCode: 'SN', order: 'viewCount', maxResults: 15 });
    const ids = s.items.filter(i => matches(i.snippet, a.name)).slice(0, PER_ARTIST).map(i => i.id.videoId);
    if (!ids.length) { console.warn('aucune vidéo :', a.name); continue; }
    const v = await yt('videos', { part: 'statistics,snippet', id: ids.join(',') });
    const vids = v.items.map(i => ({
      title: i.snippet.title, artist: a.name, genre: a.genre, videoId: i.id,
      views: +i.statistics.viewCount || 0, likes: +i.statistics.likeCount || 0, comments: +i.statistics.commentCount || 0,
    }));
    vids.forEach(x => songs.has(x.videoId) || songs.set(x.videoId, x));
    artists[a.name] = vids.reduce((t, x) => ({ views: t.views + x.views, likes: t.likes + x.likes, comments: t.comments + x.comments }), { views: 0, likes: 0, comments: 0 });
  }
  score(Object.values(artists));
  const top = score([...songs.values()]).sort((a, b) => b.score - a.score).slice(0, 100);
  const out = { updated: new Date().toISOString(), source: 'YouTube', artists, songs: top };
  fs.writeFileSync(path.join(ROOT, 'stats.json'), JSON.stringify(out, null, 1) + '\n');
  console.log(`stats.json : ${Object.keys(artists).length} artistes, ${top.length} sons`);
}

module.exports = { score, matches, engagement };
if (require.main === module) main().catch(e => { console.error(e.message); process.exit(1); });
