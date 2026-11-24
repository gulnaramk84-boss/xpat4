// Local static server for previewing the site: node _tools/serve.js  ->  http://localhost:8765
const h = require("http"), f = require("fs"), p = require("path");
const r = p.join(__dirname, "..");
const T = { ".html": "text/html;charset=utf-8", ".json": "application/json;charset=utf-8", ".js": "text/javascript;charset=utf-8", ".css": "text/css;charset=utf-8", ".svg": "image/svg+xml", ".jpg": "image/jpeg", ".png": "image/png", ".webp": "image/webp", ".txt": "text/plain;charset=utf-8", ".xml": "application/xml" };
h.createServer((q, s) => {
  let u = decodeURIComponent(q.url.split("?")[0]);
  if (u.endsWith("/")) u += "index.html";
  let fp = p.join(r, u);
  if (!fp.startsWith(r)) { s.writeHead(403); return s.end("forbidden"); }
  if (!f.existsSync(fp) && f.existsSync(fp + ".html")) fp += ".html";
  if (!f.existsSync(fp) || f.statSync(fp).isDirectory()) { s.writeHead(404); return s.end("not found"); }
  s.writeHead(200, { "Content-Type": T[p.extname(fp)] || "application/octet-stream", "Cache-Control": "no-store" });
  s.end(f.readFileSync(fp));
}).listen(8765, () => console.log("http://localhost:8765"));
