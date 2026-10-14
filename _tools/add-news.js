// Usage: node _tools/add-news.js _content/news/<file>.json
// Merges new items into news.json (newest first). Items need: date, category,
// title_ru, title_en, body_ru, body_en, source_name, source_url.
// Skips items that already exist (same source_url or same title_ru).
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const file = process.argv[2];
if (!file) { console.error('usage: node _tools/add-news.js <items.json>'); process.exit(1); }

const read = (p) => fs.readFileSync(p, 'utf8').replace(/^﻿/, '');
const nPath = path.join(root, 'news.json');
const items = JSON.parse(read(path.resolve(file)));
let news = fs.existsSync(nPath) ? JSON.parse(read(nPath)) : [];

let nextId = news.reduce((m, n) => Math.max(m, n.id || 0), 0) + 1;
let added = 0;
for (const it of items) {
  for (const k of ['date', 'category', 'title_ru', 'title_en', 'body_ru', 'body_en', 'source_name', 'source_url']) {
    if (!it[k]) throw new Error(`Missing "${k}" in item: ${it.title_ru || JSON.stringify(it)}`);
  }
  const dup = news.some((n) => n.source_url === it.source_url || n.title_ru === it.title_ru);
  if (dup) { console.log('skip (already there): ' + it.title_ru); continue; }
  news.push({ id: nextId++, title_zh: '', body_zh: '', ...it });
  added++;
}
news.sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id);
fs.writeFileSync(nPath, JSON.stringify(news, null, 2) + '\n', 'utf8');

// keep the sitemap's /news lastmod in step with the newest item
const sPath = path.join(root, 'sitemap.xml');
const sm = read(sPath).replace(/(<loc>https:\/\/xpat4\.org\/news<\/loc><lastmod>)([^<]*)/, (_, a, cur) => a + (cur > news[0].date ? cur : news[0].date));
fs.writeFileSync(sPath, sm, 'utf8');

console.log(`Added ${added} item(s); news.json now has ${news.length}.`);
