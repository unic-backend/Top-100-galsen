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
let data, tab = 'rappeurs';

function row(it) {
  const rk = `<span class="rk">${it.rank}</span>`;
  if (it.name) return `<li>${rk}<div class="info"><div class="t">${esc(it.name)}</div></div></li>`;
  const sub = `${esc(it.artist)}${it.year ? ' · ' + it.year : ''}<span class="tag">${esc(it.genre)}</span>`;
  const clip = tab === 'sons' ? `<a class="clip" href="${yt(it.artist + ' ' + it.title)}" target="_blank" rel="noopener" aria-label="Clip ${esc(it.title)} sur YouTube">▶ Clip</a>` : '';
  return `<li>${rk}<div class="info"><div class="t">${esc(it.title)}</div><div class="s">${sub}</div></div>${clip}</li>`;
}

function render() {
  const q = form.q.value.trim().toLowerCase();
  const [src, keep] = TABS[tab];
  const items = data[src]
    .filter(it => keep(it) && (!q || [it.name, it.title, it.artist].some(v => v && v.toLowerCase().includes(q))))
    .sort((a, b) => a.rank - b.rank);
  list.innerHTML = items.map(row).join('');
  empty.hidden = items.length > 0;
}

document.querySelectorAll('[role=tab]').forEach(b => b.addEventListener('click', () => {
  tab = b.dataset.tab;
  document.querySelectorAll('[role=tab]').forEach(x => x.setAttribute('aria-selected', x === b));
  render();
}));
form.addEventListener('input', render);
form.addEventListener('submit', e => e.preventDefault());

fetch('data.json').then(r => r.json()).then(d => { data = d; render(); })
  .catch(() => { empty.hidden = false; empty.textContent = 'Erreur de chargement des données.'; });
