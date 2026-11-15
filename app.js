const list = document.getElementById('list');
const empty = document.getElementById('empty');
const form = document.getElementById('filters');
const yt = q => 'https://www.youtube.com/results?search_query=' + encodeURIComponent(q + ' clip officiel');
const esc = s => String(s).replace(/[&<>"']/g, c => `&#${c.charCodeAt(0)};`);
// each tab = a source list + which items belong to it
const TABS = {
  rappeurs: ['artists', a => a.genre === 'rap' && a.gender === 'H'],
  rappeuses: ['artists', a => a.genre === 'rap' && a.gender === 'F'],
  mbalax: ['artists', a => a.genre === 'mbalax'],
  albums: ['albums', () => true],
  sons: ['songs', () => true],
};
let data, stats, votes = {}, tab = 'rappeurs';
const fmt = new Intl.NumberFormat('fr', { notation: 'compact' });
// final = 70 % bot YouTube + 30 % votes du mois; -1 = no signal yet, falls back to editorial rank
const artistScore = it => {
  const yt = stats?.artists[it.name]?.score, v = votes[it.name] || 0;
  if (yt == null && !v) return -1;
  const maxV = Math.max(1, ...Object.values(votes));
  return 0.7 * (yt ?? 0) + 30 * v / maxV;
};
const today = () => new Date().toISOString().slice(0, 10);
const voted = name => { try { return localStorage.getItem('vote:' + name) === today(); } catch { return false; } };

function row(it, i) {
  const rk = `<span class="rk">${i + 1}</span>`;
  const st = it.name ? stats?.artists[it.name] : it;
  const views = st?.views ? ` · ${fmt.format(st.views)} vues · score ${st.score}` : '';
  if (it.name) {
    const n = votes[it.name] || 0, on = voted(it.name);
    const btn = `<button class="vote" data-artist="${esc(it.name)}" aria-pressed="${on}" ${on ? 'disabled' : ''} aria-label="Voter pour ${esc(it.name)}, ${n} votes">${on ? '✓' : '♥'} ${fmt.format(n)}</button>`;
    return `<li>${rk}<div class="info"><div class="t">${esc(it.name)}</div>${views ? `<div class="s">${views.slice(3)}</div>` : ''}</div>${btn}</li>`;
  }
  const sub = `${esc(it.artist)}${it.year ? ' · ' + it.year : ''}${views}<span class="tag">${esc(it.genre)}</span>`;
  const href = it.videoId ? 'https://www.youtube.com/watch?v=' + encodeURIComponent(it.videoId) : yt(it.artist + ' ' + it.title);
  const clip = tab === 'sons' ? `<a class="clip" href="${href}" target="_blank" rel="noopener" aria-label="Clip ${esc(it.title)} sur YouTube">▶ Clip</a>` : '';
  return `<li>${rk}<div class="info"><div class="t">${esc(it.title)}</div><div class="s">${sub}</div></div>${clip}</li>`;
}

function render() {
  const q = form.q.value.trim().toLowerCase();
  const [src, keep] = TABS[tab];
  const pool = src === 'songs' && stats ? stats.songs : data[src];
  const items = pool
    .filter(it => keep(it) && (!q || [it.name, it.title, it.artist].some(v => v && v.toLowerCase().includes(q))))
    // bot score first when available, editorial rank as fallback
    .sort((a, b) => src === 'artists' ? artistScore(b) - artistScore(a) || a.rank - b.rank : src === 'songs' && stats ? b.score - a.score : a.rank - b.rank);
  list.innerHTML = items.map(row).join('');
  empty.hidden = items.length > 0;
}

document.querySelectorAll('[role=tab]').forEach(b => b.addEventListener('click', () => {
  tab = b.dataset.tab;
  document.querySelectorAll('[role=tab]').forEach(x => x.setAttribute('aria-selected', x === b));
  render();
}));
form.addEventListener('input', render);

list.addEventListener('click', async e => {
  const b = e.target.closest('button.vote');
  if (!b || b.disabled) return;
  const artist = b.dataset.artist;
  b.disabled = true;
  try {
    const r = await fetch('/api/votes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ artist }) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(j.error || 'Vote impossible');
    votes[artist] = (votes[artist] || 0) + 1;
    try { localStorage.setItem('vote:' + artist, today()); } catch {}
    render();
  } catch (err) { b.disabled = false; alert(err.message); }
});
form.addEventListener('submit', e => e.preventDefault());

const get = u => fetch(u).then(r => { if (!r.ok) throw new Error(u); return r.json(); });
Promise.all([get('data.json'), get('stats.json').catch(() => null), get('/api/votes').catch(() => null)]).then(([d, s, v]) => {
  data = d; stats = s; votes = v?.counts || {};
  if (s) document.getElementById('updated').textContent = ` · Mis à jour le ${new Date(s.updated).toLocaleDateString('fr')} (${s.source})`;
  render();
})
  .catch(() => { empty.hidden = false; empty.textContent = 'Erreur de chargement des données.'; });
