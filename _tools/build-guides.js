// Usage: node _tools/build-guides.js
// Builds guides.html (the guides hub) from the entries in articles.json that have a "guide" field.
// build-article.js runs this automatically after it builds a guide.
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const read = (p) => fs.readFileSync(p, 'utf8').replace(/^﻿/, '');
const list = JSON.parse(read(path.join(root, 'articles.json'))).filter((a) => a.guide);
if (!list.length) { console.log('No guides yet, nothing to build.'); process.exit(0); }
list.sort((a, b) => a.guide.num - b.guide.num);

const MONTHS_RU = ['января','февраля','марта','апреля','мая','июня','июля','августа','сентября','октября','ноября','декабря'];
const MONTHS_EN = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const fmt = (iso) => { const [y, m, d] = iso.split('-').map(Number); return { ru: `${d} ${MONTHS_RU[m - 1]} ${y}`, en: `${MONTHS_EN[m - 1]} ${d}, ${y}` }; };
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const GROUPS = [
  { id: 'stay', ru: 'Въезд и пребывание', en: 'Entry and stay' },
  { id: 'work', ru: 'Работа и бизнес', en: 'Work and business' },
  { id: 'life', ru: 'Жильё и жизнь', en: 'Housing and daily life' },
];
const STATUS = {
  in_force: { ru: 'Действует', en: 'In force' },
  soon: { ru: 'Скоро изменится', en: 'Changing soon' },
  draft: { ru: 'Пока проект', en: 'Draft only' },
};
const nSrc = (n, lang) => {
  if (!n) return '';
  if (lang === 'en') return `${n} source${n === 1 ? '' : 's'}`;
  const m10 = n % 10, m100 = n % 100;
  const w = m10 === 1 && m100 !== 11 ? 'источник' : (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) ? 'источника' : 'источников';
  return `${n} ${w}`;
};

const groups = GROUPS.map((g) => {
  const items = list.filter((a) => a.guide.group === g.id);
  if (!items.length) return '';
  const cards = items.map((a) => {
    const gd = a.guide, c = fmt(a.checked || a.date);
    const st = STATUS[gd.status];
    const metaRu = `Проверено ${c.ru}${a.sources ? ' · ' + nSrc(a.sources, 'ru') : ''}`;
    const metaEn = `Checked ${c.en}${a.sources ? ' · ' + nSrc(a.sources, 'en') : ''}`;
    return `    <a class="g-card" href="/${esc(a.slug)}">
      <div class="g-top"><span class="g-num">${String(gd.num).padStart(2, '0')}</span>${st ? `<span class="g-badge ${esc(gd.status)}" data-ru="${esc(st.ru)}" data-en="${esc(st.en)}">${esc(st.ru)}</span>` : ''}</div>
      <div class="g-title" data-ru="${esc(gd.situation.ru)}" data-en="${esc(gd.situation.en)}">${esc(gd.situation.ru)}</div>
      <p class="g-who" data-ru="${esc(gd.who.ru)}" data-en="${esc(gd.who.en)}">${esc(gd.who.ru)}</p>
      <div class="g-meta"><span data-ru="${esc(metaRu)}" data-en="${esc(metaEn)}">${esc(metaRu)}</span><span class="g-go">→</span></div>
    </a>`;
  }).join('\n');
  return `  <section class="g-group">
    <div class="g-group-head"><h2 data-ru="${esc(g.ru)}" data-en="${esc(g.en)}">${esc(g.ru)}</h2><span>${items.length}</span></div>
    <div class="g-grid">
${cards}
    </div>
  </section>`;
}).join('\n');

const html = read(path.join(__dirname, 'guides-template.html')).replace('{{GROUPS}}', groups);
fs.writeFileSync(path.join(root, 'guides.html'), html, 'utf8');

// sitemap + llms.txt
const newest = list.reduce((m, a) => ((a.checked || a.date) > m ? (a.checked || a.date) : m), '0000');
const sPath = path.join(root, 'sitemap.xml');
let sm = read(sPath);
const loc = '<loc>https://xpat4.org/guides</loc>';
if (sm.includes(loc)) {
  sm = sm.replace(/(<loc>https:\/\/xpat4\.org\/guides<\/loc><lastmod>)[^<]*/, `$1${newest}`);
} else {
  sm = sm.replace('</urlset>', `  <url>${loc}<lastmod>${newest}</lastmod><changefreq>weekly</changefreq><priority>0.8</priority></url>\n</urlset>`);
}
fs.writeFileSync(sPath, sm, 'utf8');
const lPath = path.join(root, 'llms.txt');
let llms = read(lPath);
if (!llms.includes('https://xpat4.org/guides)')) {
  llms = llms.replace(/\s*$/, '\n') + '- [Гайды по ситуациям — xpat4.org](https://xpat4.org/guides): что делать иностранцу в Кыргызстане в конкретной ситуации; у каждого гайда дата проверки и источники\n';
  fs.writeFileSync(lPath, llms, 'utf8');
}
console.log(`Built guides.html with ${list.length} guides.`);
