// Pre-renders the specialist cards and filter buttons into catalog.html from specialists.json,
// so search engines and AI crawlers see the catalog without running JavaScript.
// The script on the page still re-renders from specialists.json (filters, fresh data).
// Text carries data-ru / data-en / data-zh, so build-lang.js turns it into /en/catalog.
// Usage: node _tools/build-catalog.js   (runs build-lang.js afterwards)
const fs = require('fs'), path = require('path'), { execFileSync } = require('child_process');
const ROOT = path.join(__dirname, '..');
const FILE = path.join(ROOT, 'catalog.html');

const FILTERS = {
  all: { ru: 'Все', en: 'All', zh: '全部' },
  visa: { ru: 'Виза', en: 'Visa', zh: '签证' },
  residence: { ru: 'ВНЖ', en: 'Residence', zh: '居留' },
  work: { ru: 'Работа', en: 'Work', zh: '工作' },
  business: { ru: 'Бизнес', en: 'Business', zh: '商业' },
  living: { ru: 'Жильё', en: 'Housing', zh: '住房' }
};
const L = {
  email: { ru: 'Email', en: 'Email', zh: '邮件' },
  online: { ru: 'Онлайн', en: 'Online', zh: '在线' },
  nocontact: { ru: 'Уточнить контакты', en: 'Request contacts', zh: '询问联系方式' }
};

const esc = s => String(s ?? '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
// element with text in three languages (ru shown by default)
function t(tag, cls, o, extra = '') {
  const ru = o.ru || o.en || '', en = o.en || o.ru || '', zh = o.zh || '';
  return '<' + tag + (cls ? ' class="' + cls + '"' : '') + extra + ' data-ru="' + esc(ru) + '" data-en="' + esc(en) + '"' +
    (zh ? ' data-zh="' + esc(zh) + '"' : '') + '>' + esc(ru) + '</' + tag + '>';
}
const f3 = (s, k) => ({ ru: s[k + '_ru'], en: s[k + '_en'], zh: s[k + '_zh'] });

function card(s) {
  const contacts = [];
  if (s.phone) contacts.push('<a class="contact-link" href="https://wa.me/' + s.phone.replace(/\D/g, '') + '" target="_blank" rel="noopener">WhatsApp</a>');
  if (s.telegram) contacts.push('<a class="contact-link" href="https://t.me/' + esc(s.telegram) + '" target="_blank" rel="noopener">Telegram</a>');
  if (s.email) contacts.push(t('a', 'contact-link', L.email, ' href="mailto:' + esc(s.email) + '"'));
  if (!contacts.length) contacts.push(t('a', 'contact-link', L.nocontact, ' href="/contact"'));
  const verified = s.verified && (!s.badge_expires || new Date(s.badge_expires) > new Date());
  const name = s.name_ru || s.name_en;
  const avatar = s.photo
    ? '<img src="' + esc(s.photo) + '" alt="' + esc(name) + '" width="56" height="56" loading="lazy" style="width:100%;height:100%;border-radius:50%;object-fit:cover;display:block">'
    : esc(s.initials);
  return '<div class="specialist-card' + (verified ? ' is-verified' : '') + '" id="specialist-' + s.id + '">' +
    (verified ? '<span class="verified-badge">' + esc(s.badge || 'Verified by xpat4') + '</span>' : '') +
    '<div class="card-top"><div class="avatar">' + avatar + '</div><div class="card-meta">' +
    t('div', 's-role', f3(s, 'role')) + t('div', 's-name', f3(s, 'name')) + '</div></div>' +
    t('p', 's-desc', f3(s, 'desc')) +
    '<div class="card-bottom"><span class="s-city">' + t('span', '', f3(s, 'city')) +
    (s.online ? ' · ' + t('span', 'online-badge', L.online) : '') + '</span>' +
    '<div class="s-contacts">' + contacts.join('') + '</div></div></div>';
}

function replaceBetween(html, name, body) {
  const a = '<!-- ' + name + ':start -->', b = '<!-- ' + name + ':end -->';
  const i = html.indexOf(a), j = html.indexOf(b);
  if (i < 0 || j < i) throw new Error('markers ' + name + ' not found in catalog.html');
  return html.slice(0, i + a.length) + '\n' + body + '\n' + html.slice(j);
}

const data = JSON.parse(fs.readFileSync(path.join(ROOT, 'specialists.json'), 'utf8'));
const raw = fs.readFileSync(FILE, 'utf8');
const crlf = raw.includes('\r\n');
let html = raw.replace(/\r\n/g, '\n');
const filters = Object.entries(FILTERS).map(([k, o]) =>
  t('button', 'filter-btn' + (k === 'all' ? ' active' : ''), o, ' type="button" onclick="setFilter(\'' + k + '\')"')).join('\n');
html = replaceBetween(html, 'filters', filters);
html = replaceBetween(html, 'cards', data.map(card).join('\n'));
fs.writeFileSync(FILE, crlf ? html.replace(/\n/g, '\r\n') : html);
console.log('catalog.html: ' + data.length + ' cards');
execFileSync(process.execPath, [path.join(__dirname, 'build-lang.js')], { stdio: 'inherit' });
