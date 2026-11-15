const FLAG = { SN: '🇸🇳', FR: '🇫🇷', US: '🇺🇸' };
const list = document.getElementById('list');
const empty = document.getElementById('empty');
const form = document.getElementById('filters');
let data, tab = 'artists';

const esc = s => String(s).replace(/[&<>"']/g, c => `&#${c.charCodeAt(0)};`);
const yt = q => 'https://www.youtube.com/results?search_query=' + encodeURIComponent(q + ' clip officiel');
const byArtist = Object.create(null);

function row(item, i) {
  const tags = `${FLAG[item.country] || ''}<span class="tag">${esc(item.genre)}</span>`;
  if (tab === 'artists')
    return `<li><span class="rk">${i + 1}</span><div class="info"><div class="t">${esc(item.name)}</div><div class="s">${tags}</div></div></li>`;
  const sub = `${esc(item.artist)}${item.year ? ' · ' + item.year : ''} ${tags}`;
  const clip = tab === 'songs' ? `<a class="clip" href="${yt(item.artist + ' ' + item.title)}" target="_blank" rel="noopener">▶ Clip</a>` : '';
  return `<li><span class="rk">${i + 1}</span><div class="info"><div class="t">${esc(item.title)}</div><div class="s">${sub}</div></div>${clip}</li>`;
}

function render() {
  const f = Object.fromEntries(new FormData(form));
  const q = f.q.trim().toLowerCase();
  const items = data[tab].filter(it =>
    (!f.country || it.country === f.country) &&
    (!f.genre || it.genre === f.genre) &&
    // albums/sons: gender comes from the artist entry
    (!f.gender || (it.gender || byArtist[it.artist]) === f.gender) &&
    (!q || [it.name, it.title, it.artist].some(v => v && v.toLowerCase().includes(q)))
  );
  // shortcut: rank is per country+genre; mixed view orders by rank then country, upgrade to a global score when real data exists
  items.sort((a, b) => a.rank - b.rank || a.country.localeCompare(b.country));
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

fetch('data.json').then(r => r.json()).then(d => {
  data = d;
  d.artists.forEach(a => byArtist[a.name] = a.gender);
  render();
}).catch(() => { empty.hidden = false; empty.textContent = 'Erreur de chargement des données.'; });
