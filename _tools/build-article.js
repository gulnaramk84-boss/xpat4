// Usage: node _tools/build-article.js <slug>
// Reads _content/articles/<slug>.json and writes <slug>.html, then updates
// articles.json, sitemap.xml and llms.txt. Folders starting with "_" are not
// published by GitHub Pages, so templates and sources stay private.
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const slug = process.argv[2];
if (!slug || !/^[a-z0-9-]+$/.test(slug)) {
  console.error('usage: node _tools/build-article.js <slug>   (slug: a-z, 0-9, dashes)');
  process.exit(1);
}

const read = (p) => fs.readFileSync(p, 'utf8').replace(/^﻿/, '');
const art = JSON.parse(read(path.join(root, '_content', 'articles', slug + '.json')));

const MONTHS_RU = ['января','февраля','марта','апреля','мая','июня','июля','августа','сентября','октября','ноября','декабря'];
const MONTHS_EN = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const fmt = (iso) => {
  const [y, m, d] = iso.split('-').map(Number);
  return { ru: `${d} ${MONTHS_RU[m - 1]} ${y}`, en: `${MONTHS_EN[m - 1]} ${d}, ${y}` };
};

const escHtml = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const escAttr = (s) => escHtml(s).replace(/"/g, '&quot;');

// [text](url) -> <a>. Everything else is escaped.
function toHtml(s) {
  const re = /\[([^\]]+)\]\((https?:\/\/[^)\s]+|\/[^)\s]*)\)/g;
  let out = '', last = 0, m;
  while ((m = re.exec(s))) {
    out += escHtml(s.slice(last, m.index));
    const ext = m[2].startsWith('http');
    out += `<a href="${escAttr(m[2])}"${ext ? ' target="_blank" rel="noopener"' : ''}>${escHtml(m[1])}</a>`;
    last = re.lastIndex;
  }
  return out + escHtml(s.slice(last));
}
const plain = (s) => s.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
const tr = (t) => ({ ru: t.ru, en: t.en || t.ru });
const attrs = (t) => `data-ru="${escAttr(toHtml(t.ru))}" data-en="${escAttr(toHtml(t.en || t.ru))}"`;
const el = (tag, t, cls) => `<${tag}${cls ? ` class="${cls}"` : ''} ${attrs(t)}>${toHtml(t.ru)}</${tag}>`;

const body = art.blocks.map((b) => {
  if (b.h2) return '    ' + el('h2', b.h2);
  if (b.p) return '    ' + el('p', b.p);
  if (b.note) return '    ' + el('div', b.note, 'note');
  if (b.ul || b.ol) {
    const tag = b.ul ? 'ul' : 'ol';
    return `    <${tag}>\n${(b.ul || b.ol).map((i) => '      ' + el('li', i)).join('\n')}\n    </${tag}>`;
  }
  throw new Error('Unknown block: ' + JSON.stringify(b));
}).join('\n');

const sources = (art.sources && art.sources.length)
  ? `  <div class="sources">
    <div class="sources-title" data-ru="Источники" data-en="Sources">Источники</div>
    <ul>
${art.sources.map((s) => `      <li><a href="${escAttr(s.url)}" target="_blank" rel="noopener">${escHtml(s.title)}</a>${s.note ? ' — ' + escHtml(s.note) : ''}</li>`).join('\n')}
    </ul>
  </div>`
  : '';

const published = fmt(art.date), checked = fmt(art.checked || art.date);
const title = tr(art.title), summary = tr(art.summary);

const jsonld = JSON.stringify({
  '@context': 'https://schema.org',
  '@type': 'Article',
  headline: plain(title.ru),
  description: plain(summary.ru),
  inLanguage: 'ru',
  datePublished: art.date,
  dateModified: art.checked || art.date,
  mainEntityOfPage: `https://xpat4.org/${slug}`,
  publisher: { '@type': 'Organization', name: 'xpat4.org', url: 'https://xpat4.org' },
}, null, 2);

const map = {
  SLUG: slug,
  TITLE_RU_TEXT: escHtml(plain(title.ru)),
  TITLE_RU_ATTR: escAttr(toHtml(title.ru)),
  TITLE_EN_ATTR: escAttr(toHtml(title.en)),
  TITLE_RU_HTML: toHtml(title.ru),
  DESC_RU_ATTR: escAttr(toHtml(summary.ru)),
  DESC_EN_ATTR: escAttr(toHtml(summary.en)),
  DESC_RU_HTML: toHtml(summary.ru),
  DATE_RU: published.ru, DATE_EN: published.en,
  CHECKED_RU: checked.ru, CHECKED_EN: checked.en,
  JSONLD: jsonld, BODY: body, SOURCES: sources,
};
let html = read(path.join(__dirname, 'article-template.html'));
html = html.replace(/\{\{([A-Z_]+)\}\}/g, (_, k) => {
  if (!(k in map)) throw new Error('Template placeholder without value: ' + k);
  return map[k];
});
fs.writeFileSync(path.join(root, slug + '.html'), html, 'utf8');

// articles.json (newest first)
const aPath = path.join(root, 'articles.json');
let list = fs.existsSync(aPath) ? JSON.parse(read(aPath)) : [];
list = list.filter((a) => a.slug !== slug);
list.push({
  slug, date: art.date, category: art.category || 'life',
  title_ru: plain(title.ru), title_en: plain(title.en),
  summary_ru: plain(summary.ru), summary_en: plain(summary.en),
});
list.sort((a, b) => b.date.localeCompare(a.date));
fs.writeFileSync(aPath, JSON.stringify(list, null, 2) + '\n', 'utf8');

// sitemap.xml
const sPath = path.join(root, 'sitemap.xml');
let sm = read(sPath);
const loc = `<loc>https://xpat4.org/${slug}</loc>`;
const entry = `  <url>${loc}<lastmod>${art.checked || art.date}</lastmod><changefreq>monthly</changefreq><priority>0.7</priority></url>\n`;
if (sm.includes(loc)) {
  sm = sm.replace(new RegExp(`(<url>${loc.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}<lastmod>)[^<]*`), `$1${art.checked || art.date}`);
} else {
  sm = sm.replace('</urlset>', entry + '</urlset>');
}
sm = sm.replace(/(<loc>https:\/\/xpat4\.org\/news<\/loc><lastmod>)[^<]*/, `$1${art.checked || art.date}`);
fs.writeFileSync(sPath, sm, 'utf8');

// llms.txt (appended to the end of the Guides list)
const lPath = path.join(root, 'llms.txt');
let llms = read(lPath);
if (!llms.includes(`https://xpat4.org/${slug})`)) {
  const line = `- [${plain(title.ru)} — xpat4.org](https://xpat4.org/${slug}): ${plain(summary.ru)}`;
  llms = llms.replace(/\s*$/, '\n') + line + '\n';
  fs.writeFileSync(lPath, llms, 'utf8');
}

console.log(`Built ${slug}.html, updated articles.json, sitemap.xml, llms.txt`);
