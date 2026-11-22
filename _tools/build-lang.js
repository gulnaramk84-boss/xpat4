// Usage: node _tools/build-lang.js
// Builds language versions of the site as real pages with their own URLs:
//   /           Russian (source pages in the repo root)
//   /en/<page>  English, for every public page
//   /zh/<page>  Chinese, only for pages listed in ZH_PAGES (fully translated)
// The text comes from the data-en / data-zh attributes that every page already
// has. The script also tidies <head> of the source pages (one-language title and
// description, hreflang, structured data) and rebuilds sitemap.xml and the
// language sections of llms.txt. Safe to run again and again.
// It is run automatically at the end of build-article.js and add-news.js.
const fs = require('fs');
const path = require('path');
const cp = require('child_process');

const root = path.resolve(__dirname, '..');
const SITE = 'https://xpat4.org';
const SKIP = new Set(['admin.html']);
// Chinese is published only where the whole page is translated.
const ZH_PAGES = ['index', 'contact', 'kyrgyzstan-chinese-investors', 'relocate-kyrgyzstan-from-china',
  'open-osoo-foreigner-kyrgyzstan-2026', 'work-permit-foreigners-kyrgyzstan-2026', 'register-after-renting-bishkek-2026',
  'visa-free-and-registration-days-by-country-2026'];
const LOCALE = { ru: 'ru_RU', en: 'en_US', zh: 'zh_CN' };
const SUFFIX = ' | xpat4.org';
const HOME_TITLE = {
  ru: 'Переезд в Кыргызстан: визы, регистрация, ВНЖ и работа | xpat4.org',
  en: 'Moving to Kyrgyzstan: visas, registration, residence and work | xpat4.org',
  zh: '移居吉尔吉斯斯坦：签证、登记、居留与工作 | xpat4.org',
};
// Section pages get hand-written titles; articles and guides use their h1.
const TITLES = {
  news: { ru: 'Новости для иностранцев в Кыргызстане: визы, регистрация, работа', en: 'Kyrgyzstan news for foreigners: visas, registration, work' },
  guides: { ru: 'Гайды для иностранцев в Кыргызстане: что делать, если…', en: 'Guides for foreigners in Kyrgyzstan: what to do if…' },
  catalog: { ru: 'Специалисты для иностранцев в Бишкеке', en: 'Specialists for foreigners in Bishkek' },
  contact: { ru: 'Консультация по переезду в Кыргызстан', en: 'Kyrgyzstan relocation consultation', zh: '吉尔吉斯斯坦移居与签证咨询' },
  calculator: { ru: 'Калькулятор стоимости жизни в Бишкеке', en: 'Bishkek cost of living calculator' },
  checklist: { ru: 'Первые 30 дней в Кыргызстане: чеклист для иностранцев', en: 'First 30 days in Kyrgyzstan: checklist for foreigners' },
  visa: { ru: 'Въезд в Кыргызстан: безвиз, электронная виза, регистрация', en: 'Entering Kyrgyzstan: visa-free stay, e-Visa, registration' },
  residence: { ru: 'ВНЖ и регистрация в Кыргызстане для иностранцев', en: 'Residence permits and registration in Kyrgyzstan' },
  work: { ru: 'Работа и учёба в Кыргызстане для иностранцев', en: 'Working and studying in Kyrgyzstan as a foreigner' },
  living: { ru: 'Жизнь в Кыргызстане: практическая сторона', en: 'Living in Kyrgyzstan: the practical side' },
};
const CRUMBS = {
  'Главная': { en: 'Home', zh: '首页' }, 'Гайды': { en: 'Guides', zh: '指南' }, 'Статьи': { en: 'Articles', zh: '文章' },
  'Жизнь в КР': { en: 'Living in Kyrgyzstan', zh: '在吉生活' }, 'Виза и въезд': { en: 'Visa and entry', zh: '签证与入境' },
  'Бизнес': { en: 'Business', zh: '商业' }, 'Регистрация и ВНЖ': { en: 'Registration and residence', zh: '登记与居留' },
  'Работа и учёба': { en: 'Work and study', zh: '工作与学习' }, 'Новости': { en: 'News', zh: '新闻' }, 'Контакты': { en: 'Contacts', zh: '联系我们' },
};
const LABEL = { ru: 'RU', en: 'EN', zh: '中文' };
const LANG_NAME = { ru: 'Русский', en: 'English', zh: '中文' };

const read = (p) => fs.readFileSync(p, 'utf8').replace(/^﻿/, '');
const decode = (s) => s.replace(/&quot;|&#34;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
const escAttr = (s) => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const stripTags = (s) => decode(String(s).replace(/<br\s*\/?>/gi, ' ').replace(/<(?:[^>"']|"[^"]*"|'[^']*')*>/g, '')).replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
const VOID = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'source', 'track', 'wbr']);

// ---------- page list ----------
const files = fs.readdirSync(root).filter((f) => f.endsWith('.html') && !SKIP.has(f)).sort();
const src = {};
for (const f of files) src[f.replace(/\.html$/, '')] = read(path.join(root, f));
const slugs = Object.keys(src);
const hasText = (t) => { const s = t.indexOf('<main'), e = t.indexOf('</main>'); return s >= 0 && /\sdata-ru="/.test(t.slice(s, e > s ? e : undefined)); };
const LANGS = {
  ru: new Set(slugs),
  en: new Set(slugs.filter((s) => hasText(src[s]))),
  zh: new Set(ZH_PAGES.filter((s) => src[s])),
};
const urlOf = (lang, slug) => SITE + (lang === 'ru' ? '' : '/' + lang) + (slug === 'index' ? '/' : '/' + slug);
const pathOf = (lang, slug) => (lang === 'ru' ? '' : '/' + lang) + (slug === 'index' ? '/' : '/' + slug);
const langsOf = (slug) => ['ru', 'en', 'zh'].filter((l) => LANGS[l].has(slug));

// ---------- helpers on HTML ----------
// Replace the inner HTML of every element that carries data-ru with its data-<lang> text.
function translateBody(html, lang, slug, missing) {
  // start tags, aware of quoted attribute values that contain ">" (data-ru="<em>…</em>")
  const re = /<([a-zA-Z][a-zA-Z0-9]*)((?:\s+[^\s=>\/]+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+))?)*)\s*\/?>/g;
  let out = '', pos = 0, m;
  while ((m = re.exec(html))) {
    const tag = m[1].toLowerCase(), attrs = m[2];
    if (!/\sdata-ru="/.test(attrs)) continue;
    const openEnd = m.index + m[0].length;
    if (VOID.has(tag) || /\/\s*$/.test(attrs)) continue;
    const want = (attrs.match(new RegExp('\\sdata-' + lang + '="([^"]*)"')) || [])[1];
    let val = want;
    if (val === undefined && lang === 'en') missing.push(stripTags(decode((attrs.match(/\sdata-ru="([^"]*)"/) || [])[1] || '')).slice(0, 70));
    if (val === undefined || (lang === 'zh' && !/[㐀-鿿]/.test(decode(val)) && /[A-Za-zА-Яа-я]{3}/.test(decode(val)))) {
      if (lang === 'zh') missing.push(stripTags(decode((attrs.match(/\sdata-ru="([^"]*)"/) || [])[1] || '')).slice(0, 70));
      val = (attrs.match(/\sdata-en="([^"]*)"/) || [])[1] ?? (attrs.match(/\sdata-ru="([^"]*)"/) || [])[1];
    }
    // find the matching close tag
    const tagRe = new RegExp('<(/?)' + tag + '\\b(?:[^>"\']|"[^"]*"|\'[^\']*\')*>', 'gi');
    tagRe.lastIndex = openEnd;
    let depth = 1, t, closeStart = -1, closeEnd = -1;
    while ((t = tagRe.exec(html))) {
      if (t[1]) { if (--depth === 0) { closeStart = t.index; closeEnd = tagRe.lastIndex; break; } }
      else if (!/\/>$/.test(t[0])) depth++;
    }
    if (closeStart < 0) continue;
    out += html.slice(pos, openEnd) + decode(val) + html.slice(closeStart, closeEnd);
    pos = closeEnd;
    re.lastIndex = closeEnd;
  }
  return out + html.slice(pos);
}

// Internal links to pages: /visa -> /en/visa (or /en/... when the page has no Chinese version)
function rewriteLinks(html, lang) {
  if (lang === 'ru') return html;
  return html.replace(/(href=)(&quot;|"|')?(\/(?!\/)[^"'&\s>#?]*)([#?][^"'&\s>]*)?/g, (all, h, q, p, rest) => {
    const slug = p === '/' ? 'index' : p.replace(/^\//, '').replace(/\.html$/, '');
    if (!src[slug]) return all;
    const target = LANGS[lang].has(slug) ? lang : LANGS.en.has(slug) ? 'en' : 'ru';
    return h + (q || '') + pathOf(target, slug) + (rest || '');
  });
}

function textOf(html, lang, cls) {
  const m = html.match(new RegExp('<[a-z0-9]+[^>]*class="[^"]*\\b' + cls + '\\b[^"]*"[^>]*\\sdata-' + lang + '="([^"]*)"'));
  return m ? stripTags(decode(m[1])) : '';
}
function h1Of(html, lang) {
  const m = html.match(/<h1\b(?:[^>"']|"[^"]*"|'[^']*')*>/);
  if (!m) return '';
  const a = m[0].match(new RegExp('\\sdata-' + lang + '="([^"]*)"')) || (lang !== 'ru' && m[0].match(/\sdata-en="([^"]*)"/));
  if (a) return stripTags(decode(a[1]));
  const i = html.indexOf(m[0]);
  const inner = html.slice(i + m[0].length, html.indexOf('</h1>', i));
  return stripTags(lang === 'ru' ? inner : translateBody(inner, lang, '', []));
}
const SCRIPT = { ru: /[А-Яа-яЁё]/, en: /^[^А-Яа-яЁё㐀-鿿]*[A-Za-z][^А-Яа-яЁё㐀-鿿]*$/, zh: /[㐀-鿿]/ };
function cut(s, n) {
  if (s.length <= n) return s;
  const c = s.slice(0, n - 1);
  return c.slice(0, Math.max(c.lastIndexOf(' '), n - 20)).replace(/[,;:\s—-]+$/, '') + '…';
}
function descOf(html, lang) {
  const tag = (html.match(/<meta name="description"[^>]*>/) || [''])[0];
  if (lang !== 'ru') { const saved = tag.match(new RegExp('\\sdata-' + lang + '="([^"]*)"')); if (saved && stripTags(decode(saved[1])).length > 30) return cut(stripTags(decode(saved[1])), 158); }
  const meta = stripTags(decode((tag.match(/content="([^"]*)"/) || [])[1] || ''));
  // sentences of the old mixed-language description that are in this language
  let parts = meta.split(/(?<=[.!?。])\s*/).filter((s) => s && SCRIPT[lang].test(s) && !(lang === 'en' && /[áéíóúñ]/.test(s)));
  let d = parts.join(' ').trim();
  if (lang === 'zh' && d.length < 15) d = '';
  if (d.length < 70) {
    for (const c of ['page-desc', 'hero-sub', 'lead', 'lede', 'subtitle']) { const x = textOf(html, lang, c); if (x && SCRIPT[lang].test(x)) { d = (d ? d + ' ' : '') + x; break; } }
  }
  if (d.length < 70) {
    const main = html.slice(Math.max(0, html.indexOf('<main')));
    const re = new RegExp('<(p|div)\\b[^>]*\\sdata-' + lang + '="([^"]*)"', 'g');
    let m;
    while (d.length < 120 && (m = re.exec(main))) { const x = stripTags(decode(m[2])); if (x.length > 40 && SCRIPT[lang].test(x) && !d.includes(x)) d = (d ? d + ' ' : '') + x; }
  }
  return cut(d, 158);
}
function titleOf(html, lang, slug) {
  if (slug === 'index') return HOME_TITLE[lang];
  const t = TITLES[slug] && (TITLES[slug][lang] || (lang === 'zh' && TITLES[slug].en));
  if (t) return t + SUFFIX;
  const h = h1Of(html, lang);
  if (h) {
    if ((h + SUFFIX).length <= 70) return h + SUFFIX;
    if (h.length <= 72) return h;
    const c = h.search(/[:：]/);
    return c >= 20 ? h.slice(0, c) + SUFFIX : cut(h, 72);
  }
  return decode((html.match(/<title>([^<]*)<\/title>/) || [])[1] || 'xpat4.org');
}

function setMeta(html, re, tag) { return re.test(html) ? html.replace(re, () => tag) : html.replace('</head>', () => '  ' + tag + '\n</head>'); }

function fixJsonLd(html, lang, slug, title, desc) {
  const url = urlOf(lang, slug);
  const org = { '@type': 'Organization', name: 'xpat4.org', url: SITE + '/', logo: { '@type': 'ImageObject', url: SITE + '/favicon.svg' } };
  const qa = [];
  const reQ = /<h2 class="qa-q"[^>]*>([\s\S]*?)<\/h2>\s*<p class="qa-a"[^>]*>([\s\S]*?)<\/p>/g;
  let m;
  while ((m = reQ.exec(html))) qa.push({ q: stripTags(m[1]), a: stripTags(m[2]) });
  const fixNode = (n) => {
    if (!n || typeof n !== 'object') return n;
    const type = n['@type'];
    if (type === 'FAQPage' && qa.length) {
      n.inLanguage = lang;
      n.mainEntity = qa.map((x) => ({ '@type': 'Question', name: x.q, acceptedAnswer: { '@type': 'Answer', text: x.a } }));
    }
    if (type === 'Article') {
      n.headline = title.replace(SUFFIX, '');
      n.description = desc;
      n.inLanguage = lang;
      n.mainEntityOfPage = url;
      n.url = url;
      n.author = { '@type': 'Organization', name: 'xpat4.org', url: SITE + '/' };
      n.publisher = org;
      n.image = n.image || SITE + '/og-image.jpg';
    }
    if (type === 'Organization') {
      if (n.logo) n.logo = SITE + '/favicon.svg';
      if (Array.isArray(n.sameAs)) n.sameAs = n.sameAs.map((s) => s.replace('t.me/xpat4kg', 't.me/expat4kg'));
    }
    if (type === 'WebSite') { delete n.potentialAction; n.inLanguage = [...langsOf('index')]; }
    if (n['@graph']) n['@graph'] = n['@graph'].map(fixNode);
    return n;
  };
  html = html.replace(/<script type="application\/ld\+json"(?! data-ld)>([\s\S]*?)<\/script>/g, (all, body) => {
    let j;
    try { j = JSON.parse(body); } catch (e) { return all; }
    j = Array.isArray(j) ? j.map(fixNode) : fixNode(j);
    return '<script type="application/ld+json">' + JSON.stringify(j, null, 2) + '</script>';
  });
  // breadcrumbs from the visible .breadcrumb
  html = html.replace(/\s*<script type="application\/ld\+json" data-ld="breadcrumb">[\s\S]*?<\/script>/, '');
  const bc = html.match(/<div class="breadcrumb">([\s\S]*?)<\/div>/);
  if (bc) {
    const items = [...bc[1].matchAll(/<a href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g)].map((a) => ({ href: a[1], name: stripTags(a[2]) }));
    items.push({ href: pathOf(lang, slug), name: title.replace(SUFFIX, '') });
    const list = { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: items.map((x, i) => ({ '@type': 'ListItem', position: i + 1, name: x.name, item: x.href.startsWith('http') ? x.href : SITE + x.href.replace(/#.*$/, '') })) };
    html = html.replace('</head>', () => '  <script type="application/ld+json" data-ld="breadcrumb">' + JSON.stringify(list) + '</script>\n</head>');
  }
  return html;
}

function langSwitch(html, lang, slug) {
  const avail = langsOf(slug);
  // rebuild the switch: one real link per published language
  const links = avail.map((l) => '<a class="lang-btn' + (l === lang ? ' active' : '') + '" data-lang="' + l + '" href="' + pathOf(l, slug) + '" hreflang="' + (l === 'zh' ? 'zh-Hans' : l) + '" lang="' + (l === 'zh' ? 'zh-Hans' : l) + '"' + (l === lang ? ' aria-current="true"' : '') + ' title="' + LANG_NAME[l] + '">' + LABEL[l] + '</a>');
  return html.replace(/(<div class="lang-switch"[^>]*>)[\s\S]*?(<\/div>)/g, (a, o, c) => o + '\n        ' + links.join('\n        ') + '\n      ' + c);
}

// ---------- news: render items as real HTML so crawlers that do not run JS see them ----------
const MONTHS = {
  ru: ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'],
  en: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
};
const fmtDate = (iso, lang) => { const [y, mo, d] = iso.split('-').map(Number); return lang === 'ru' ? `${d} ${MONTHS.ru[mo - 1]} ${y}` : `${d} ${MONTHS.en[mo - 1]} ${y}`; };
const CAT = { visa: ['Виза и въезд', 'Visa and entry'], residence: ['ВНЖ и регистрация', 'Residence and registration'], work: ['Работа', 'Work'], business: ['Бизнес', 'Business'], living: ['Жильё', 'Housing'], life: ['Жизнь в КР', 'Life in KG'] };
const STATUS = { in_force: ['Уже действует', 'In force'], soon: ['Скоро вступит в силу', 'Coming soon'], draft: ['Пока проект', 'Draft only'] };
const escH = (s) => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
function mdLinks(s, lang) {
  const re = /\[([^\]]+)\]\((https?:\/\/[^)\s]+|\/[^)\s]*)\)/g;
  let out = '', last = 0, m;
  while ((m = re.exec(s))) {
    out += escH(s.slice(last, m.index));
    const ext = m[2].startsWith('http');
    out += '<a href="' + escH(m[2]) + '"' + (ext ? ' target="_blank" rel="noopener"' : '') + '>' + escH(m[1]) + '</a>';
    last = re.lastIndex;
  }
  return rewriteLinks(out + escH(s.slice(last)), lang);
}
function newsHtml(html, lang) {
  const nPath = path.join(root, 'news.json');
  if (!fs.existsSync(nPath)) return html;
  const L = lang === 'ru' ? 0 : 1, k = lang === 'ru' ? 'ru' : 'en';
  const all = JSON.parse(read(nPath)).sort((a, b) => (b.date || '').localeCompare(a.date || '') || (b.id || 0) - (a.id || 0));
  const card = (n, i) => {
    const st = STATUS[n.status];
    return '<article id="n-' + escH(n.id) + '" class="news-item' + (i === 0 ? ' latest' : '') + '">' +
      '<div class="news-meta"><div class="news-source own-cat">' + escH(CAT[n.category] ? CAT[n.category][L] : '') + '</div>' + escH(fmtDate(n.date, k)) + '</div>' +
      '<div>' + (st ? '<div><span class="badge badge-' + escH(n.status) + '">' + escH(st[L]) + '</span></div>' : '') +
      '<h2 class="news-title-plain">' + escH(n['title_' + k] || n.title_ru) + '</h2><div class="own-body">' + mdLinks(n['body_' + k] || n.body_ru || '', lang) + '</div>' +
      (n.source_url ? '<a class="news-read" href="' + escH(n.source_url) + '" target="_blank" rel="noopener">' + (L ? 'Source: ' : 'Источник: ') + escH(n.source_name || '') + '</a>' : '') +
      '</div></article>';
  };
  const fill = (h, id, inner) => h.replace(new RegExp('(<div class="news-list" id="' + id + '">)(?:<!--pre-->[\\s\\S]*?<!--/pre-->)?'), (a, o) => o + '<!--pre-->' + inner + '<!--/pre-->');
  html = fill(html, 'own-news', all.map(card).join(''));
  const aPath = path.join(root, 'articles.json');
  if (fs.existsSync(aPath)) {
    const arts = JSON.parse(read(aPath)).filter((a) => a.kind !== 'page').sort((a, b) => (b.date || '').localeCompare(a.date || ''));
    const lst = arts.map((a) => {
      const url = pathOf(LANGS[lang].has(a.slug) ? lang : 'en', a.slug);
      return '<div class="news-item"><div class="news-meta"><div class="news-source own-cat">' + escH(CAT[a.category] ? CAT[a.category][L] : '') + '</div>' + escH(fmtDate(a.date, k)) + '</div>' +
        '<div><div class="news-title"><a href="' + url + '">' + escH(a['title_' + k] || a.title_ru) + '</a></div><div class="own-body">' + escH(a['summary_' + k] || a.summary_ru || '') + '</div></div></div>';
    }).join('');
    html = fill(html, 'articles-list', lst);
  }
  return html;
}

// ---------- build one version ----------
function build(slug, lang) {
  let html = src[slug];
  const missing = [];
  html = html.replace(/<html\b[^>]*>/, '<html lang="' + (lang === 'zh' ? 'zh-Hans' : lang) + '">');
  // relative data fetches would break under /en/ and /zh/
  html = html.replace(/(fetch\(|getJson\()'(?!\/|https?:)([a-z0-9-]+\.json)/g, "$1'/$2").replace(/url\('(?!\/|https?:|data:)([^')]+)'\)/g, "url('/$1')");
  if (slug === 'news') html = newsHtml(html, lang);
  if (lang !== 'ru') {
    const head = html.slice(0, html.indexOf('<body'));
    let body = translateBody(html.slice(head.length), lang, slug, missing);
    // section labels in breadcrumbs that have no data-* text
    body = body.replace(/(<div class="breadcrumb">)([\s\S]*?)(<\/div>)/, (a, o, inner, c) => o + inner.replace(/(<a\b[^>]*>)([^<]+)(<\/a>)/g, (x, ao, txt, ac) => {
      const t = CRUMBS[txt.trim()];
      return t ? ao + (t[lang] || t.en) + ac : x;
    }) + c);
    // dates in "What changed" and similar lists
    body = body.replace(/<time datetime="(\d{4})-(\d{2})-(\d{2})">[^<]*<\/time>/g, (x, y, mo, d) => '<time datetime="' + y + '-' + mo + '-' + d + '">' + (lang === 'zh' ? `${+y}年${+mo}月${+d}日` : `${MONTHS.en[mo - 1]} ${+d}, ${y}`) + '</time>');
    html = head + body;
  }
  const title = titleOf(src[slug], lang, slug);
  const desc = descOf(src[slug], lang);
  const url = urlOf(lang, slug);
  html = html.replace(/<title>[^<]*<\/title>/, () => '<title>' + escAttr(title) + '</title>');
  // the source page keeps the other languages' descriptions so later runs stay stable
  const keep = lang === 'ru' ? ['en', 'zh'].filter((l) => LANGS[l].has(slug)).map((l) => ' data-' + l + '="' + escAttr(descOf(src[slug], l)) + '"').join('') : '';
  html = setMeta(html, /<meta name="description"[^>]*>/, '<meta name="description" content="' + escAttr(desc) + '"' + keep + '>');
  html = setMeta(html, /<link rel="canonical" href="[^"]*"\s*\/?>/, '<link rel="canonical" href="' + url + '">');
  html = setMeta(html, /<meta property="og:title" content="[^"]*"\s*\/?>/, '<meta property="og:title" content="' + escAttr(title.replace(SUFFIX, '')) + '">');
  html = setMeta(html, /<meta property="og:description" content="[^"]*"\s*\/?>/, '<meta property="og:description" content="' + escAttr(desc) + '">');
  html = setMeta(html, /<meta property="og:url" content="[^"]*"\s*\/?>/, '<meta property="og:url" content="' + url + '">');
  html = setMeta(html, /<meta property="og:locale" content="[^"]*"\s*\/?>/, '<meta property="og:locale" content="' + LOCALE[lang] + '">');
  // hreflang + language map for xpat4.js
  html = html.replace(/\s*<!-- i18n -->[\s\S]*?<!-- \/i18n -->/, '');
  const alts = langsOf(slug).map((l) => '<link rel="alternate" hreflang="' + (l === 'zh' ? 'zh-Hans' : l) + '" href="' + urlOf(l, slug) + '">');
  if (LANGS.en.has(slug)) alts.push('<link rel="alternate" hreflang="x-default" href="' + urlOf('en', slug) + '">');
  const map = { zh: [...LANGS.zh], noen: slugs.filter((s) => !LANGS.en.has(s)) };
  html = html.replace(/(<link rel="canonical"[^>]*>)/, (c) => c + '\n  <!-- i18n -->\n  ' + alts.join('\n  ') + "\n  <meta name=\"xpat4-langs\" content='" + JSON.stringify(map) + "'>\n  <!-- /i18n -->");
  html = rewriteLinks(html, lang);
  html = fixJsonLd(html, lang, slug, title, desc);
  html = langSwitch(html, lang, slug);
  return { html, missing };
}

// ---------- run ----------
const report = [];
for (const lang of ['ru', 'en', 'zh']) {
  if (lang !== 'ru') fs.mkdirSync(path.join(root, lang), { recursive: true });
  for (const slug of LANGS[lang]) {
    const { html, missing } = build(slug, lang);
    const file = lang === 'ru' ? path.join(root, slug + '.html') : path.join(root, lang, slug + '.html');
    const old = fs.existsSync(file) ? read(file) : '';
    const out = old.includes('\r\n') || (lang === 'ru' && src[slug].includes('\r\n')) ? html.replace(/\r?\n/g, '\r\n') : html;
    if (old !== out) fs.writeFileSync(file, out, 'utf8');
    if (missing.length) report.push(`${lang}/${slug}: ${missing.length} без перевода — ${missing.slice(0, 3).join(' | ')}`);
  }
  // remove stale versions of pages that are no longer published in this language
  if (lang !== 'ru') for (const f of fs.readdirSync(path.join(root, lang))) if (f.endsWith('.html') && !LANGS[lang].has(f.slice(0, -5))) fs.unlinkSync(path.join(root, lang, f));
}

// ---------- sitemap.xml ----------
function lastmod(file) {
  try {
    const dirty = cp.execFileSync('git', ['status', '--porcelain', '--', file], { cwd: root, encoding: 'utf8' }).trim();
    if (!dirty) { const d = cp.execFileSync('git', ['log', '-1', '--format=%cs', '--', file], { cwd: root, encoding: 'utf8' }).trim(); if (d) return d; }
  } catch (e) { /* no git: fall through */ }
  return new Date().toISOString().slice(0, 10);
}
const sm = ['<?xml version="1.0" encoding="UTF-8"?>', '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">'];
for (const slug of slugs) {
  if (/noindex/.test((src[slug].match(/<meta name="robots" content="([^"]*)"/) || [])[1] || '')) continue;
  const lm = lastmod(slug + '.html');
  const ls = langsOf(slug);
  const alt = ls.length > 1 ? ls.map((l) => `    <xhtml:link rel="alternate" hreflang="${l === 'zh' ? 'zh-Hans' : l}" href="${urlOf(l, slug)}"/>`).concat(LANGS.en.has(slug) ? [`    <xhtml:link rel="alternate" hreflang="x-default" href="${urlOf('en', slug)}"/>`] : []) : [];
  for (const l of ls) sm.push('  <url>', `    <loc>${urlOf(l, slug)}</loc>`, `    <lastmod>${lm}</lastmod>`, ...alt, '  </url>');
}
sm.push('</urlset>', '');
fs.writeFileSync(path.join(root, 'sitemap.xml'), sm.join('\n'), 'utf8');

// ---------- llms.txt: English and Chinese sections ----------
const lPath = path.join(root, 'llms.txt');
if (fs.existsSync(lPath)) {
  let llms = read(lPath).replace(/\n*<!-- lang-sections -->[\s\S]*?<!-- \/lang-sections -->\n*/, '\n');
  const sec = (lang, head) => head + '\n' + [...LANGS[lang]].filter((s) => !['privacy', 'terms', 'join'].includes(s)).map((s) => {
    const { html } = { html: src[s] };
    return `- [${titleOf(html, lang, s).replace(SUFFIX, '')}](${urlOf(lang, s)}): ${descOf(html, lang)}`;
  }).join('\n');
  llms = llms.replace(/\s*$/, '\n\n') + '<!-- lang-sections -->\n' + sec('en', '## English version (same content, own URLs)') + '\n\n' + sec('zh', '## 中文版') + '\n<!-- /lang-sections -->\n';
  fs.writeFileSync(lPath, llms, 'utf8');
}

console.log(`Language pages: ru ${LANGS.ru.size}, en ${LANGS.en.size}, zh ${LANGS.zh.size}; sitemap ${sm.filter((x) => x === '  <url>').length} URLs.`);
if (report.length) console.log('Нет перевода:\n' + report.join('\n'));
