const assert = require('assert');
const { score, matches } = require('./collect');
const [big, tiny, mid] = score([
  { views: 5e6, likes: 8e4, comments: 4e3 },
  { views: 50, likes: 40, comments: 10 },   // taux énorme, audience nulle
  { views: 2e5, likes: 2e4, comments: 3e3 }, // forte communauté
]);
assert(big.score > tiny.score && mid.score > tiny.score, 'petite vidéo ne doit pas gagner');
assert(big.score <= 100 && tiny.score >= 0);
assert(matches({ title: 'Youssou N’Dour - 7 Seconds', channelTitle: 'x' }, "Youssou N'Dour"));
assert(matches({ title: 'Clip', channelTitle: 'AÏDA SAMB' }, 'Aïda Samb'));
assert(matches({ title: 'Simon - Freestyle', channelTitle: '' }, 'Simon (Bisbi Clan)'));
assert(!matches({ title: 'Booba - DKR', channelTitle: 'Booba' }, 'Nix'));
console.log('bot OK', big.score, mid.score, tiny.score);
