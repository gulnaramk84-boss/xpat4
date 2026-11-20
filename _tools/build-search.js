// Usage: node _tools/build-search.js
// Builds search-index.json for the site search (Ctrl+K) from the published pages and news.json.
// add-news.js and build-article.js run this automatically.
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const read = (p) => fs.readFileSync(p, 'utf8').replace(/^\uFEFF/, '');

const SKIP = new Set(['admin.html', 'privacy.html', 'terms.html']);
const SECTION = new Set(['index', 'guides', 'news', 'catalog', 'calculator', 'checklist', 'contact', 'join', 'visa', 'residence', 'work', 'living', 'how-we-check']);
const articles = fs.existsSync(path.join(root, 'articles.json')) ? JSON.parse(read(path.join(root, 'articles.json'))) : [];
const bySlug = new Map(articles.map((a) => [a.slug, a]));

// A tag, allowing ">" inside quoted attribute values (data-ru="...<br/>...")
const TAG = /<(?:[^>"']|"[^"]*"|'[^']*')*>/g;
const decode = (s) => s
  .replace(/&nbsp;/g, ' ').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'")
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&laquo;/g, '«').replace(/&raquo;/g, '»')
  .replace(/&mdash;/g, '—').replace(/&ndash;/g, '–').replace(/&amp;/g, '&');
const squash = (s) => s.replace(/\s+/g, ' ').trim();
const strip = (h) => squash(decode(h
  .replace(/<script[\s\S]*?<\/script>/gi, ' ')
  .replace(/<style[\s\S]*?<\/style>/gi, ' ')
  .replace(/<br\s*\/?>/gi, ' ')
  .replace(TAG, ' ')));
const attr = (tag, name) => {
  const m = tag.match(new RegExp('\\s' + name + '="([^"]*)"'));
  return m ? squash(decode(m[1]).replace(/<br\s*\/?>/gi, ' ').replace(/<[^>]+>/g, '')) : '';
};
const element = (html, tagName, all) => {
  const re = new RegExp('<' + tagName + '\\b((?:[^>"\']|"[^"]*"|\'[^\']*\')*)>([\\s\\S]*?)</' + tagName + '>', 'g');
  const out = [...html.matchAll(re)].map((m) => ({ open: '<' + tagName + m[1] + '>', inner: m[2], full: m[0] }));
  return all ? out : out[0];
};

const items = [];
for (const file of fs.readdirSync(root).filter((f) => f.endsWith('.html') && !SKIP.has(f))) {
  const html = read(path.join(root, file));
  const slug = file.replace(/\.html$/, '');
  const url = slug === 'index' ? '/' : '/' + slug;

  const titleTag = (html.match(/<title>([\s\S]*?)<\/title>/) || [, ''])[1];
  const main = (html.match(/<main[^>]*>([\s\S]*?)<\/main>/) || [, html])[1];
  const h1 = element(main, 'h1') || element(html, 'h1');
  const title = (h1 && (attr(h1.open, 'data-ru') || strip(h1.inner))) || squash(decode(titleTag).split(' — ')[0]);
  const titleEn = h1 ? attr(h1.open, 'data-en') : '';
  const desc = attr((html.match(/<meta name="description"[^>]*>/) || [''])[0], 'content');
  const heads = element(main, 'h2', true).map((h) => attr(h.open, 'data-ru') || strip(h.inner)).filter(Boolean).slice(0, 25);

  let rest = main.replace(/<nav[\s\S]*?<\/nav>/g, ' ');
  if (h1) rest = rest.replace(h1.full, ' ');
  const body = strip(rest)
    .replace(/Перейти к содержанию/g, '')
    .replace(/^Главная › \S+(?: \S+)?\s*/, '')
    .slice(0, 2200);

  const a = bySlug.get(slug);
  let type = 'article';
  if (SECTION.has(slug)) type = 'page';
  else if (a && a.guide) type = 'guide';
  const date = a ? (a.checked || a.date) : '';
  items.push({ u: url, t: title, te: titleEn, d: desc, h: heads.join(' · '), b: body, k: type, dt: date });
}

// News: one entry per item, linking to its anchor on /news
const news = fs.existsSync(path.join(root, 'news.json')) ? JSON.parse(read(path.join(root, 'news.json'))) : [];
for (const n of news) {
  items.push({
    u: '/news#n-' + n.id, t: n.title_ru || '', te: n.title_en || '', d: '', h: '',
    b: (n.body_ru || '').replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').slice(0, 1500),
    k: 'news', dt: n.date || '', s: n.status || ''
  });
}

fs.writeFileSync(path.join(root, 'search-index.json'), JSON.stringify(items) + '\n', 'utf8');
const kb = Math.round(fs.statSync(path.join(root, 'search-index.json')).size / 1024);
console.log(`Built search-index.json: ${items.length} entries, ${kb} KB.`);
