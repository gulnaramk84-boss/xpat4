// Usage: node _tools/build-calendar.js
// Reads _content/calendar.json and writes the dates into calendar.html as real HTML
// (data-ru / data-en / data-zh), then rebuilds the language versions.
// Dates before today go to "Already in force"; the page script moves dates that pass later.
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const read = (p) => fs.readFileSync(p, 'utf8').replace(/^﻿/, '');
const cal = JSON.parse(read(path.join(root, '_content', 'calendar.json')));
const escH = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const escA = (s) => escH(s).replace(/"/g, '&quot;');
const tri = (o) => `data-ru="${escA(o.ru)}" data-en="${escA(o.en || o.ru)}" data-zh="${escA(o.zh || o.en || o.ru)}"`;
const MON = {
  ru: ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'],
  en: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
};
const dateT = (iso) => { const [y, m, d] = iso.split('-').map(Number); return { ru: `${d} ${MON.ru[m - 1]} ${y}`, en: `${d} ${MON.en[m - 1]} ${y}`, zh: `${y}年${m}月${d}日` }; };
const KIND = {
  on: { ru: 'вступает в силу', en: 'takes effect', zh: '生效' },
  last: { ru: 'последний день', en: 'last day', zh: '最后一天' },
  deadline: { ru: 'крайний срок', en: 'deadline', zh: '截止日期' },
  before: { ru: 'подать до этой даты', en: 'file before this date', zh: '须在此日期前提交' },
};
const STATUS = {
  in_force: { ru: 'Действует', en: 'In force', zh: '已生效' },
  soon: { ru: 'Решение принято, даты нет', en: 'Decided, no date yet', zh: '已决定，尚无日期' },
  draft: { ru: 'Пока проект', en: 'Draft only', zh: '仅为草案' },
};
const CAT = {
  visa: { ru: 'Виза и въезд', en: 'Visa and entry', zh: '签证与入境' }, residence: { ru: 'Регистрация и ВНЖ', en: 'Registration and residence', zh: '登记与居留' },
  work: { ru: 'Работа', en: 'Work', zh: '工作' }, business: { ru: 'Бизнес', en: 'Business', zh: '商业' }, tax: { ru: 'Налоги', en: 'Taxes', zh: '税务' },
};
const MORE = { ru: 'Подробнее', en: 'Read more', zh: '详情' };
const SRC = { ru: 'Источник', en: 'Source', zh: '来源' };
const ICS = { ru: 'В календарь', en: 'Add to calendar', zh: '加入日历' };

function item(x, i, dated) {
  const id = dated ? 'd-' + x.date + '-' + i : 'p-' + i;
  const date = dated
    ? `<div class="cal-date"><time datetime="${x.date}" ${tri(dateT(x.date))}>${dateT(x.date).ru}</time><span class="cal-kind" ${tri(KIND[x.kind] || KIND.on)}>${(KIND[x.kind] || KIND.on).ru}</span></div>`
    : `<div class="cal-date"><span class="cal-kind" data-ru="дата не назначена" data-en="no date set" data-zh="日期未定">дата не назначена</span></div>`;
  const tags = `<div class="cal-tags"><span class="cal-tag st-${x.status}" ${tri(STATUS[x.status])}>${STATUS[x.status].ru}</span>${CAT[x.cat] ? `<span class="cal-tag" ${tri(CAT[x.cat])}>${CAT[x.cat].ru}</span>` : ''}</div>`;
  const links = [
    x.link ? `<a class="cal-more" href="${escA(x.link)}" ${tri(MORE)}>${MORE.ru}</a>` : '',
    x.source ? `<a href="${escA(x.source.url)}" target="_blank" rel="noopener"><span ${tri(SRC)}>${SRC.ru}</span>: ${escH(x.source.name)}</a>` : '',
    dated ? `<button class="cal-ics" type="button" ${tri(ICS)}>${ICS.ru}</button>` : '',
  ].filter(Boolean).join('');
  return `<article class="cal-item" id="${id}"${dated ? ` data-date="${x.date}"` : ''}>${date}<div class="cal-body">${tags}<h3 ${tri(x.title)}>${escH(x.title.ru)}</h3><p ${tri(x.body)}>${escH(x.body.ru)}</p><div class="cal-links">${links}</div></div></article>`;
}

for (const x of cal.dated) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(x.date)) throw new Error('bad date: ' + JSON.stringify(x.title));
  for (const k of ['title', 'body']) if (!x[k] || !x[k].ru || !x[k].en || !x[k].zh) throw new Error(`"${k}" needs ru, en and zh: ${x.date}`);
  if (!STATUS[x.status]) throw new Error('status must be in_force, soon or draft: ' + x.date);
}
for (const x of cal.pending) for (const k of ['title', 'body']) if (!x[k] || !x[k].zh) throw new Error(`"${k}" needs ru, en and zh in pending`);

const today = new Date().toISOString().slice(0, 10);
const dated = cal.dated.slice().sort((a, b) => a.date.localeCompare(b.date));
const upcoming = dated.filter((x) => x.date >= today);
const past = dated.filter((x) => x.date < today).reverse();
const fill = (html, name, inner) => html.replace(new RegExp(`<!--cal:${name}-->[\\s\\S]*?<!--/cal:${name}-->`), () => `<!--cal:${name}-->${inner}<!--/cal:${name}-->`);

const file = path.join(root, 'calendar.html');
let html = read(file);
html = fill(html, 'upcoming', upcoming.map((x, i) => item(x, i, true)).join(''));
html = fill(html, 'pending', cal.pending.map((x, i) => item(x, i, false)).join(''));
html = fill(html, 'past', past.map((x, i) => item(x, i, true)).join(''));
if (cal.checked) {
  const c = dateT(cal.checked);
  html = html.replace(/<p class="checked-line"[^>]*>[^<]*<\/p>/, () => `<p class="checked-line" data-ru="Проверено: ${c.ru}" data-en="Checked: ${c.en}" data-zh="核实日期：${c.zh}">Проверено: ${c.ru}</p>`);
}
fs.writeFileSync(file, html, 'utf8');
console.log(`Calendar: ${upcoming.length} upcoming, ${cal.pending.length} pending, ${past.length} past.`);

require('child_process').execFileSync(process.execPath, [path.join(__dirname, 'build-lang.js')], { stdio: 'inherit' });
