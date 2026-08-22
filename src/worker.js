// media-gallery v42.0 - 非破坏性DB初始化+微信验证+Apple UI增强
// ES Module format for Cloudflare Workers
// NO backtick template literals, NO let/const, NO arrow functions, NO spread, NO node: imports

var H = {};
function dt(env) { H = env || {}; }

function X(key, def) {
  if (!H) return def;
  if (H[key] !== undefined && H[key] !== "") return H[key];
  var upper = key.toUpperCase();
  if (H[upper] !== undefined && H[upper] !== "") return H[upper];
  return def;
}

function d(s) {
  if (s == null) return "";
  return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;");
}

async function genHashId(seed) {
  var input = (seed || "") + "|" + Date.now() + "|" + Math.random().toString(36);
  var enc = new TextEncoder();
  var buf = await crypto.subtle.digest("SHA-256", enc.encode(input));
  var arr = new Uint8Array(buf);
  var out = "";
  for (var i = 0; i < arr.length; i++) {
    var h = arr[i].toString(16);
    out += h.length === 1 ? "0" + h : h;
  }
  return out.slice(0, 12);
}

function nowTs() { return new Date().toISOString().replace("T"," ").slice(0,19); }

function q(s, def) { try { return JSON.parse(s || "null") || def; } catch(e) { return def; } }

function h(body, status, extra) {
  var hdrs = {"Content-Type":"application/json; charset=utf-8"};
  if (extra) { var keys = Object.keys(extra); for (var i = 0; i < keys.length; i++) hdrs[keys[i]] = extra[keys[i]]; }
  return new Response(JSON.stringify(body), {status: status || 200, headers: hdrs});
}

function G(html) { return new Response(html, {status:200, headers:{"Content-Type":"text/html; charset=utf-8"}}); }

function getCookie(req, name) {
  var c = req.headers.get("Cookie") || "";
  var m = c.match(new RegExp(name + "=([^;]+)"));
  return m ? m[1] : null;
}

function slugify(s) {
  var t = (s || "").toString().trim();
  var slug = t.replace(/[^a-zA-Z0-9]+/g,"-").replace(/^-|-$/g,"").toLowerCase().slice(0,40);
  if (slug.length >= 2) return slug + "-" + Date.now().toString(36).slice(-4);
  return "item-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2,6);
}

// ===== 绑定检测 =====
function hasDB(env) { return !!(env && env.DB); }
function hasKV(env) { return !!(env && env.kv); }
function hasCache(env) { return !!(env && env.cache); }

async function getSetting(db, key, def) {
  try { var r = await db.prepare("SELECT v FROM site_settings WHERE k = ?").bind(key).first(); return r ? r.v : def; }
  catch(e) { return def; }
}

async function setSetting(db, key, val) {
  try { await db.prepare("DELETE FROM site_settings WHERE k = ?").bind(key).run(); } catch(e) {}
  await db.prepare("INSERT INTO site_settings (k, v) VALUES (?, ?)").bind(key, val).run();
}

// ===== ICONS (纯SVG) =====
var ISUN = '<svg class="ic" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/></svg>';
var IMOON = '<svg class="ic" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>';
var IPLAY = '<svg class="ic" viewBox="0 0 24 24" width="36" height="36" fill="currentColor"><polygon points="6,4 20,12 6,20"/></svg>';
var IDOC = '<svg class="ic" viewBox="0 0 24 24" width="36" height="36" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="8" y1="13" x2="16" y2="13"/><line x1="8" y1="17" x2="14" y2="17"/></svg>';
var IIMG = '<svg class="ic" viewBox="0 0 24 24" width="36" height="36" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>';
var IBACK = '<svg class="ic" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>';
var IFWD = '<svg class="ic" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>';
var IUP = '<svg class="ic" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>';
var IEYE = '<svg class="ic" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>';
var ICL = '<svg class="ic" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>';
var ICR = '<svg class="ic" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>';
var ITRASH = '<svg class="ic" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>';
var IDL = '<svg class="ic" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>';
var IPLUS = '<svg class="ic" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>';
var ILINK = '<svg class="ic" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/><line x1="8" y1="8" x2="16" y2="16"/></svg>';
var IGRID = '<svg class="ic" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>';
var IVID = '<svg class="ic" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><polygon points="10,9 15,12 10,15" fill="currentColor"/></svg>';
var IFILE = '<svg class="ic" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>';
var IEDIT = '<svg class="ic" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4z"/></svg>';
var ICOPY = '<svg class="ic" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>';
var IOK = '<svg class="ic" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>';
var IERR = '<svg class="ic" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>';
var ICHK = '<svg class="ic" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>';
var IWARN = '<svg class="ic" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>';

// ===== CSS (v39.0) =====
var CSS = ":root{--accent:#0071e3;--accent2:#5b9bff;--accent-light:rgba(0,113,227,.08);--bg:#f5f5f7;--surface:#fff;--text:#1d1d1f;--sec:#6e6e73;--ter:#a0a0a5;--border:#e5e5ea;--shadow:0 2px 20px rgba(0,0,0,.06);--radius:14px;--rs:8px;--success:#34c759;--danger:#e63946;--warning:#f5a623}*,*::before,*::after{box-sizing:border-box}body{margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'PingFang SC','Microsoft YaHei',sans-serif;background:var(--bg);color:var(--text);line-height:1.6;-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale;color-scheme:light dark}a{color:var(--accent);text-decoration:none}a:hover{color:#0058b0}img{max-width:100%;display:block}.c{max-width:1200px;margin:0 auto;padding:0 1.5rem}.tb{position:sticky;top:0;z-index:100;background:rgba(255,255,255,.88);backdrop-filter:blur(20px) saturate(180%);-webkit-backdrop-filter:blur(20px) saturate(180%);border-bottom:1px solid var(--border)}.tbi{display:flex;align-items:center;justify-content:space-between;height:56px}.brand{font-weight:700;font-size:1.15rem;color:var(--accent);display:flex;align-items:center;gap:.5rem;text-decoration:none}.logo-icon{width:34px;height:34px;flex-shrink:0;border-radius:8px;box-shadow:0 2px 8px rgba(0,113,227,.2)}.nl{display:flex;align-items:center;gap:.25rem}.nl a{margin:0 .4rem;color:var(--text);font-size:.88rem;padding:.35rem .6rem;border-radius:var(--rs);transition:.2s}.nl a:hover{background:var(--accent-light);color:var(--accent)}.ta{display:flex;align-items:center;gap:.4rem}.ib{width:36px;height:36px;border:none;background:transparent;cursor:pointer;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;color:var(--sec);transition:.2s}.ib:hover{background:var(--accent-light);color:var(--accent)}.ic{display:block}.btn{display:inline-flex;align-items:center;gap:.4rem;padding:.6rem 1.4rem;background:linear-gradient(135deg,var(--accent),var(--accent2));color:#fff;border:none;border-radius:var(--radius);font-size:.92rem;cursor:pointer;text-decoration:none;font-weight:500;transition:.25s;box-shadow:0 2px 12px rgba(0,113,227,.3)}.btn:hover{transform:translateY(-2px);box-shadow:0 4px 20px rgba(0,113,227,.4)}.btng{display:inline-flex;align-items:center;gap:.35rem;padding:.5rem 1rem;background:transparent;color:var(--accent);border:1.5px solid var(--accent);border-radius:var(--radius);text-decoration:none;font-size:.85rem;cursor:pointer;transition:.2s}.btng:hover{background:var(--accent-light)}.btnd{display:inline-flex;align-items:center;gap:.3rem;padding:.4rem .7rem;background:transparent;color:var(--danger);border:1px solid var(--danger);border-radius:var(--rs);font-size:.78rem;cursor:pointer;transition:.2s}.btnd:hover{background:var(--danger);color:#fff}.btns{display:inline-flex;align-items:center;gap:.3rem;padding:.4rem .7rem;background:transparent;color:var(--success);border:1px solid var(--success);border-radius:var(--rs);font-size:.78rem;cursor:pointer;transition:.2s}.btns:hover{background:var(--success);color:#fff}.hero{padding:4rem 0 3rem;text-align:center;background:linear-gradient(135deg,#eef2ff,#f0f9ff,#fdf2f8);position:relative;overflow:hidden}.hero::before{content:'';position:absolute;top:-50%;left:-30%;width:160%;height:160%;background:radial-gradient(ellipse at 30% 50%,rgba(0,113,227,.06),transparent 50%);animation:float 20s ease-in-out infinite}@keyframes float{0%,100%{transform:translate(0,0)}50%{transform:translate(15px,-15px)}}.hero h1{font-size:clamp(1.8rem,4.5vw,3rem);font-weight:800;letter-spacing:-.02em;margin:0 0 .8rem;position:relative;background:linear-gradient(135deg,#1d1d1f,#0071e3);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}.hero p{font-size:1.05rem;color:var(--sec);max-width:540px;margin:0 auto 1.5rem;position:relative}.ha{display:flex;gap:.8rem;justify-content:center;flex-wrap:wrap;position:relative}.fl{display:flex;gap:.5rem;flex-wrap:wrap;margin:1.5rem 0 1rem}.fc{display:inline-flex;align-items:center;padding:.45rem 1.1rem;border-radius:999px;background:var(--surface);border:1px solid var(--border);color:var(--text);text-decoration:none;font-size:.82rem;cursor:pointer;transition:.25s;box-shadow:0 1px 3px rgba(0,0,0,.04)}.fc:hover{border-color:var(--accent);color:var(--accent);transform:translateY(-1px)}.fc.on{background:var(--accent);color:#fff;border-color:var(--accent);box-shadow:0 2px 10px rgba(0,113,227,.3)}.g{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:1.4rem}.cd{display:block;background:var(--surface);border-radius:var(--radius);overflow:hidden;text-decoration:none;color:inherit;box-shadow:var(--shadow);transition:all .35s cubic-bezier(.4,0,.2,1);border:1px solid transparent;content-visibility:auto;contain-intrinsic-size:auto 340px}.cd:hover{transform:translateY(-6px);box-shadow:0 12px 40px rgba(0,0,0,.12);border-color:rgba(0,113,227,.2)}.cc{position:relative;aspect-ratio:16/10;background:linear-gradient(135deg,#e8e8ed,#f0f0f3);display:flex;align-items:center;justify-content:center;overflow:hidden}.cc img{width:100%;height:100%;object-fit:cover;transition:transform .5s}.cd:hover .cc img{transform:scale(1.05)}.cc .play-overlay{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.3);opacity:0;transition:opacity .3s}.cd:hover .play-overlay{opacity:1}.cc .play-overlay svg{width:52px;height:52px;color:#fff;filter:drop-shadow(0 4px 12px rgba(0,0,0,.4))}.cb{padding:1.1rem}.ct{margin:0 0 .3rem;font-size:1rem;font-weight:600;line-height:1.4;display:flex;align-items:center;gap:.3rem}.cd2{margin:0 0 .5rem;font-size:.82rem;color:var(--sec);overflow:hidden;text-overflow:ellipsis;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical}.cm{display:flex;gap:.8rem;font-size:.75rem;color:var(--ter);align-items:center}.cb2{display:flex;gap:.3rem;margin-top:.5rem;flex-wrap:wrap}.ctg{font-size:.68rem;padding:.2rem .55rem;background:var(--accent-light);color:var(--accent);border-radius:4px;font-weight:500}.ctg-video{background:rgba(230,57,70,.08);color:#e63946}.ctg-text{background:rgba(52,199,89,.08);color:#2a8a3e}.ctg-link{background:rgba(245,166,35,.1);color:#b8780a}.pg{display:flex;gap:.4rem;justify-content:center;margin:2rem 0;flex-wrap:wrap;align-items:center}.pg a{display:inline-flex;align-items:center;gap:.3rem;padding:.45rem .9rem;border-radius:var(--rs);border:1px solid var(--border);text-decoration:none;color:var(--text);font-size:.82rem;transition:.2s}.pg a:hover{border-color:var(--accent);color:var(--accent)}.pg a.cur{background:var(--accent);color:#fff;border-color:var(--accent)}.mt{text-align:center;padding:4rem 0;color:var(--sec)}.item-actions{display:flex;gap:.6rem;flex-wrap:wrap;margin:1.2rem 0}.vid-c{position:relative;width:100%;aspect-ratio:16/9;background:#000;border-radius:12px;overflow:hidden;margin:1rem 0;box-shadow:0 4px 20px rgba(0,0,0,.15)}.vid-c video{width:100%;height:100%;object-fit:contain}.gal{position:relative;margin:1rem 0;border-radius:12px;overflow:hidden;background:#000;box-shadow:0 4px 20px rgba(0,0,0,.1)}.gal-main img{content-visibility:auto;contain-intrinsic-size:auto 400px}.gal-main{position:relative;aspect-ratio:16/10;display:flex;align-items:center;justify-content:center;background:#111}.gal-main img{width:100%;height:100%;object-fit:contain;transition:opacity .3s}.gal-btn{position:absolute;top:50%;transform:translateY(-50%);width:42px;height:42px;border:none;background:rgba(0,0,0,.55);color:#fff;border-radius:50%;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:1.2rem;z-index:2;transition:.2s;backdrop-filter:blur(4px)}.gal-btn:hover{background:rgba(0,0,0,.8)}.gal-prev{left:12px}.gal-next{right:12px}.gal-dots{display:flex;gap:.35rem;justify-content:center;padding:.7rem;background:#f8f8fa}.gal-dot{width:9px;height:9px;border-radius:50%;border:none;background:#d2d2d7;cursor:pointer;padding:0;transition:.2s}.gal-dot.on{background:var(--accent);transform:scale(1.4)}.gal-counter{position:absolute;top:10px;right:10px;background:rgba(0,0,0,.6);color:#fff;padding:.25rem .7rem;border-radius:4px;font-size:.75rem;z-index:2}.hs{width:100%;border:1px solid var(--border);border-radius:12px;margin:1rem 0;background:#fff;overflow:hidden}.hs iframe{width:100%;min-height:200px;border:none;display:block}.atb{background:rgba(255,255,255,.92);backdrop-filter:blur(12px);border-bottom:1px solid #d2d2d7;position:sticky;top:0;z-index:100;box-shadow:0 1px 6px rgba(0,0,0,.04)}.atbi{display:flex;align-items:center;justify-content:space-between;height:52px}.sr{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:.8rem;margin:1.2rem 0}.sc{background:#fff;border-radius:12px;padding:1.2rem;text-align:center;box-shadow:0 1px 8px rgba(0,0,0,.05);border:1px solid #f0f0f3;transition:.25s}.sc:hover{box-shadow:0 4px 16px rgba(0,0,0,.08);transform:translateY(-2px)}.sn{font-size:2rem;font-weight:800;color:var(--accent)}.sl{font-size:.75rem;color:var(--sec);margin-top:.3rem}.tb2{display:flex;gap:.4rem;margin:1.2rem 0;border-bottom:2px solid #e8e8ed;padding-bottom:-2px;flex-wrap:wrap}.tb2 button{padding:.55rem 1.1rem;border:none;background:transparent;font-size:.85rem;cursor:pointer;border-bottom:2px solid transparent;margin-bottom:-2px;color:var(--sec);transition:.2s;border-radius:6px 6px 0 0}.tb2 button:hover{color:var(--accent);background:var(--accent-light)}.tb2 button.on{color:var(--accent);border-bottom-color:var(--accent);font-weight:600}.pn{display:none;padding:.8rem 0}.pn.on{display:block}.dt{width:100%;border-collapse:collapse;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 8px rgba(0,0,0,.04);font-size:.82rem}.dt th{background:linear-gradient(135deg,#f0f0f3,#e8e8ed);text-align:left;padding:.7rem .8rem;font-size:.72rem;color:var(--sec);text-transform:uppercase;letter-spacing:.05em;font-weight:600}.dt td{padding:.7rem .8rem;border-bottom:1px solid #f5f5f7}.dt tr:last-child td{border-bottom:none}.dt tr:hover td{background:#fafbfc}.dt tr{content-visibility:auto;contain-intrinsic-size:auto 48px}.dt .row-actions{display:flex;gap:.3rem;flex-wrap:wrap}.lw{display:flex;align-items:center;justify-content:center;min-height:100vh;padding:1rem;background:linear-gradient(135deg,#eef2ff,#fdf2f8)}.lcd{background:#fff;border-radius:16px;padding:2.2rem;box-shadow:0 8px 40px rgba(0,0,0,.1);width:100%;max-width:380px}.lcd h1{margin:0 0 .4rem;font-size:1.4rem;color:var(--accent);display:flex;align-items:center;gap:.4rem}.lcd .sub{color:var(--sec);font-size:.82rem;margin-bottom:1.5rem}.lcd input{width:100%;padding:.75rem .9rem;border:1.5px solid #d2d2d7;border-radius:10px;font-size:.95rem;margin-bottom:.8rem;outline:none;transition:.2s}.lcd input:focus{border-color:var(--accent);box-shadow:0 0 0 3px rgba(0,113,227,.1)}.lcd button{width:100%;padding:.75rem;background:linear-gradient(135deg,var(--accent),var(--accent2));color:#fff;border:none;border-radius:10px;font-size:.95rem;cursor:pointer;font-weight:500;transition:.25s;box-shadow:0 2px 12px rgba(0,113,227,.3)}.lcd button:hover{transform:translateY(-1px);box-shadow:0 4px 20px rgba(0,113,227,.4)}.lcd #msg{margin-top:.8rem;color:var(--danger);font-size:.8rem;text-align:center}input,select,textarea{width:100%;padding:.6rem .8rem;border:1.5px solid #d2d2d7;border-radius:8px;font-size:.88rem;margin-bottom:.6rem;outline:none;font-family:inherit;transition:.2s;background:#fff}input:focus,select:focus,textarea:focus{border-color:var(--accent);box-shadow:0 0 0 3px rgba(0,113,227,.08)}textarea{min-height:80px;resize:vertical}.fr{display:flex;gap:.8rem;flex-wrap:wrap}.fr>div{flex:1;min-width:180px}.st{font-size:.92rem;font-weight:600;margin:1.2rem 0 .5rem;color:var(--text);display:flex;align-items:center;gap:.35rem;padding-bottom:.4rem;border-bottom:1px solid #f0f0f3}.uz{border:2px dashed #d2d2d7;border-radius:12px;padding:1.2rem;text-align:center;cursor:pointer;transition:.25s;margin-bottom:.5rem;position:relative;background:#fafafa}.uz:hover,.uz.ov{border-color:var(--accent);background:rgba(0,113,227,.04)}.uz.uploading{border-color:var(--accent);background:rgba(0,113,227,.04)}.uz input[type=file]{position:absolute;inset:0;opacity:0;cursor:pointer}.ui{margin-bottom:.3rem;color:#a0a0a5;font-size:.9rem}.ut{font-size:.8rem;color:var(--sec)}.uh{font-size:.7rem;color:var(--ter);margin-top:.2rem}.ui2{display:flex;align-items:center;gap:.4rem;padding:.45rem .7rem;border-radius:8px;margin-top:.4rem;font-size:.78rem;color:#0058b0}.ui2.ok{background:#e8f8ef;border:1px solid #86efac}.ui2.err{background:#fef2f2;border:1px solid #fca5a5;color:#b91c1c}.ui2 .x{cursor:pointer;color:var(--danger);margin-left:auto;font-weight:700;padding:2px 6px;border-radius:4px;background:rgba(230,57,70,.1)}.ui2 .x:hover{background:rgba(230,57,70,.2)}.pb{height:4px;background:#e8e8ed;border-radius:2px;margin-top:.5rem;overflow:hidden;display:none}.pbf{height:100%;background:linear-gradient(90deg,var(--accent),var(--accent2));width:0%;transition:width .3s;border-radius:2px}.toast{position:fixed;bottom:1.5rem;left:50%;transform:translateX(-50%) translateY(16px);padding:.6rem 1.3rem;background:#1d1d1f;color:#fff;border-radius:var(--radius);font-size:.85rem;opacity:0;transition:all .3s;z-index:9999;pointer-events:none;display:flex;align-items:center;gap:.35rem;box-shadow:0 4px 20px rgba(0,0,0,.2)}.toast.on{opacity:1;transform:translateX(-50%) translateY(0)}.toast.ok{background:var(--success)}.toast.err{background:var(--danger)}img.ld{opacity:0;transition:opacity .5s}img.ld.loaded{opacity:1}.ft{text-align:center;padding:2rem 0;color:var(--ter);font-size:.78rem;border-top:1px solid var(--border);margin-top:2rem}.up-prev{display:flex;gap:.5rem;margin-top:.5rem;flex-wrap:wrap}.up-prev-item{position:relative;width:64px;height:64px;border-radius:8px;overflow:hidden;border:1px solid var(--border);box-shadow:0 1px 4px rgba(0,0,0,.06)}.up-prev-item img{width:100%;height:100%;object-fit:cover}.up-prev-item .rm{position:absolute;top:0;right:0;width:20px;height:20px;background:rgba(230,57,70,.9);color:#fff;border:none;cursor:pointer;font-size:12px;display:flex;align-items:center;justify-content:center;border-radius:0 0 0 6px}.link-preview{display:flex;align-items:center;gap:.4rem;padding:.45rem .7rem;border-radius:8px;margin-top:.4rem;font-size:.78rem}.link-preview.ok{background:#e8f8ef;border:1px solid #86efac;color:#166534}.link-preview.ext{background:#fff8e1;border:1px solid #f5d442;color:#7a5b00}.badge{display:inline-block;padding:.2rem .55rem;border-radius:4px;font-size:.68rem;font-weight:500}.badge-pub{background:rgba(52,199,89,.1);color:#1a7a2e}.badge-draft{background:rgba(245,166,35,.12);color:#b8780a}.empty-state{text-align:center;padding:3rem 1rem;color:var(--sec)}.empty-state svg{width:48px;height:48px;margin-bottom:1rem;opacity:.3}.uz-icon{font-size:2rem;margin-bottom:.4rem;opacity:.3}.skeleton{background:linear-gradient(90deg,#e8e8ed 25%,#f0f0f3 50%,#e8e8ed 75%);background-size:200% 100%;animation:shimmer 1.5s infinite;border-radius:8px}.sk-card{height:200px;margin-bottom:1rem}@keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}@media(max-width:600px){.g{grid-template-columns:repeat(auto-fill,minmax(200px,1fr))}.hero{padding:2.5rem 0 2rem}.nl{display:none}.dt{font-size:.75rem}.dt th,.dt td{padding:.4rem .5rem}.lcd{padding:1.5rem}}";

// ===== LOGO (精美渐变+相框+山峦) =====
var LOGO = '<svg class="logo-icon" viewBox="0 0 34 34" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="lg" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" style="stop-color:#0071e3"/><stop offset="50%" style="stop-color:#5b9bff"/><stop offset="100%" style="stop-color:#00c6ff"/></linearGradient><linearGradient id="lg2" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" style="stop-color:#fff;stop-opacity:.95"/><stop offset="100%" style="stop-color:#fff;stop-opacity:.55"/></linearGradient></defs><rect width="34" height="34" rx="9" fill="url(#lg)"/><rect x="5" y="7" width="24" height="20" rx="3" fill="none" stroke="url(#lg2)" stroke-width="1.8"/><circle cx="11" cy="12" r="2.2" fill="url(#lg2)"/><path d="M29,24 L21,14 L14,20 L8,15" fill="none" stroke="url(#lg2)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><polygon points="23,5 25,9 29,9 26,12 27,16 23,13 19,16 20,12 17,9 21,9" fill="#fff" opacity=".9"/></svg>';

// ===== THEME JS =====
var TJS = 'var tb=document.getElementById("themeBtn");var cur=localStorage.getItem("theme")||"auto";function applyTheme(t){if(t==="dark"||(t==="auto"&&matchMedia("(prefers-color-scheme: dark)").matches)){document.documentElement.style.setProperty("--bg","#0a0a0c");document.documentElement.style.setProperty("--surface","#141418");document.documentElement.style.setProperty("--text","#e8e8ec");document.documentElement.style.setProperty("--sec","#a0a0a8");document.documentElement.style.setProperty("--ter","#6e6e73");document.documentElement.style.setProperty("--border","#26262e");document.documentElement.style.setProperty("--accent","#4d9eff");tb.innerHTML=\'<svg class="ic" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/></svg>\';}else{document.documentElement.style.setProperty("--bg","#f5f5f7");document.documentElement.style.setProperty("--surface","#fff");document.documentElement.style.setProperty("--text","#1d1d1f");document.documentElement.style.setProperty("--sec","#6e6e73");document.documentElement.style.setProperty("--ter","#a0a0a5");document.documentElement.style.setProperty("--border","#e5e5ea");document.documentElement.style.setProperty("--accent","#0071e3");tb.innerHTML=\'<svg class="ic" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>\';}}applyTheme(cur);tb.addEventListener("click",function(){cur=cur==="dark"?"light":"dark";localStorage.setItem("theme",cur);applyTheme(cur);});';

// ===== DB INIT (v42.0: non-destructive + column migration) =====
async function initDB(db) {
  if (!db) return {error:"数据库未绑定，请先在 CF 控制台绑定 D1 数据库", detail:"DB_NOT_BOUND"};
  try {
    // Non-destructive: CREATE TABLE IF NOT EXISTS (preserves existing data)
    await db.exec(
      "CREATE TABLE IF NOT EXISTS media_items (" +
        "id TEXT PRIMARY KEY," +
        "slug TEXT UNIQUE," +
        "title TEXT NOT NULL DEFAULT ''," +
        "description TEXT DEFAULT ''," +
        "type TEXT DEFAULT 'mixed'," +
        "content_key TEXT," +
        "content_text TEXT DEFAULT ''," +
        "cover_key TEXT," +
        "gallery_keys TEXT DEFAULT '[]'," +
        "attachment_key TEXT," +
        "attachment_name TEXT DEFAULT ''," +
        "category TEXT DEFAULT 'default'," +
        "tags TEXT DEFAULT '[]'," +
        "status TEXT DEFAULT 'published'," +
        "password TEXT," +
        "published_at TEXT," +
        "expires_at TEXT," +
        "weight INTEGER DEFAULT 0," +
        "views INTEGER DEFAULT 0," +
        "featured INTEGER DEFAULT 0," +
        "meta_description TEXT DEFAULT ''," +
        "meta_keywords TEXT DEFAULT ''," +
        "custom_css_class TEXT DEFAULT ''," +
        "custom_link TEXT DEFAULT ''," +
        "link_target TEXT DEFAULT '_self'," +
        "created_at TEXT," +
        "updated_at TEXT" +
      ");"
    );

    await db.exec("CREATE TABLE IF NOT EXISTS admins (id INTEGER PRIMARY KEY AUTOINCREMENT,username TEXT UNIQUE NOT NULL,password TEXT NOT NULL,created_at TEXT);");
    await db.exec("CREATE TABLE IF NOT EXISTS site_settings (k TEXT PRIMARY KEY,v TEXT);");

    // Add missing columns (migration for older schemas)
    var alterCols = [
      "ALTER TABLE media_items ADD COLUMN meta_description TEXT DEFAULT ''",
      "ALTER TABLE media_items ADD COLUMN meta_keywords TEXT DEFAULT ''",
      "ALTER TABLE media_items ADD COLUMN custom_css_class TEXT DEFAULT ''",
      "ALTER TABLE media_items ADD COLUMN custom_link TEXT DEFAULT ''",
      "ALTER TABLE media_items ADD COLUMN link_target TEXT DEFAULT '_self'",
      "ALTER TABLE media_items ADD COLUMN featured INTEGER DEFAULT 0",
    ];
    for (var ai = 0; ai < alterCols.length; ai++) {
      try { await db.exec(alterCols[ai]); } catch(e) { /* column already exists */ }
    }

    await db.exec("CREATE INDEX IF NOT EXISTS idx_status ON media_items(status);");
    await db.exec("CREATE INDEX IF NOT EXISTS idx_category ON media_items(category);");
    await db.exec("CREATE INDEX IF NOT EXISTS idx_slug ON media_items(slug);");
    await db.exec("CREATE INDEX IF NOT EXISTS idx_custom_link ON media_items(custom_link);");

    // Only create default admin if no admin exists
    var adminCheck = await db.prepare("SELECT COUNT(*) as c FROM admins").first();
    if (!adminCheck || adminCheck.c === 0) {
      var adminPwd = X("ADMIN_PASSWORD", "admin123");
      var ts = nowTs();
      await db.prepare("INSERT INTO admins (username,password,created_at) VALUES (?,?,?)").bind("admin", adminPwd, ts).run();
    }
    await db.prepare("INSERT INTO admins (username,password,created_at) VALUES (?,?,?)").bind("admin", adminPwd, ts).run();

    var brand = X("DEFAULT_BRAND", "Gallery");
    var defaults = {
      brand_name: brand,
      theme_color: X("THEME_COLOR","#0071e3"),
      theme_mode: "auto",
      hero_style: "gradient",
      footer_html: "",
      about_html: "<h1>关于我们</h1><p>欢迎来到 " + brand + "。</p>",
      announcement_html: "",
      copy_link_text: "链接已复制",
      page_size: X("PAGE_SIZE","24"),
      rss_enabled: "true",
      sitemap_enabled: "true",
      lazy_load_enabled: "true",
      site_description: "",
      site_keywords: "",
      nav_links: "[]",
      categories: "[]"
    };
    var keys = Object.keys(defaults);
    for (var di = 0; di < keys.length; di++) { await setSetting(db, keys[di], defaults[keys[di]]); }

    return {ok:true, message:"数据库初始化完成 (v40.0)", version:"v40.0"};
  } catch(e) {
    return {error:"初始化失败: " + e.message, detail: e.message};
  }
}

// ===== UPLOAD (v39.0: 检查 KV 绑定 + FormData) =====
async function handleUpload(req, env) {
  if (!hasKV(env)) { console.error("[upload] KV未绑定"); return h({error:"服务器未配置文件存储(KV)，请到 CF 控制台绑定"}, 500); }
  try {
    console.log("[upload] === 开始上传处理 ===");
    console.log("[upload] method: " + req.method);

    var ctHeader = req.headers.get("content-type") || "";
    console.log("[upload] content-type: " + ctHeader);

    if (ctHeader.indexOf("multipart/form-data") === 0) {
      console.log("[upload] 使用 FormData 解析");
      var fd = await req.formData();

      var file = fd.get("file");
      if (!file) {
        var fields = [];
        fd.forEach(function(value, key) { fields.push(key + "=" + (value instanceof File ? "[File:"+value.name+",size="+value.size+"]" : String(value).substring(0,50))); });
        console.error("[upload] 未找到file字段. 已有: " + fields.join(", "));
        return h({error:"未选择文件. 已有字段: " + fields.join(", ")}, 400);
      }

      console.log("[upload] 文件: name=" + file.name + " size=" + file.size + " type=" + file.type);
      if (!file.size || file.size === 0) return h({error:"文件为空"}, 400);

      var maxSize = parseInt(X("MAX_FILE_SIZE","25165824"), 10);
      if (file.size > maxSize) return h({error:"文件过大 ("+(file.size/1048576).toFixed(1)+"MB > "+(maxSize/1048576)+"MB)"}, 413);

      var ab = await file.arrayBuffer();
      if (!ab || ab.byteLength === 0) return h({error:"读取文件内容失败 (0 bytes)"}, 500);
      console.log("[upload] arrayBuffer成功: " + ab.byteLength + " bytes");

      var result = await storeFile(env, ab, file.name || "upload", file.type || "application/octet-stream");
      return h(result);
    }

    if (ctHeader.indexOf("application/octet-stream") === 0 || ctHeader === "" || ctHeader.indexOf("image/") === 0 || ctHeader.indexOf("video/") === 0) {
      console.log("[upload] 使用 raw binary 解析");
      var rawAb = await req.arrayBuffer();
      if (!rawAb || rawAb.byteLength === 0) return h({error:"请求体为空"}, 400);
      console.log("[upload] raw bytes: " + rawAb.byteLength);

      var rawName = req.headers.get("X-File-Name") || "upload.bin";
      var rawType = ctHeader || "application/octet-stream";
      var result2 = await storeFile(env, rawAb, rawName, rawType);
      return h(result2);
    }

    return h({error:"不支持的Content-Type: " + ctHeader}, 400);
  } catch(e) {
    console.error("[upload] 异常: " + e.message + " | stack: " + (e.stack||""));
    return h({error:"上传失败: " + e.message}, 500);
  }
}

// ===== STORE FILE (KV存储 + 哈希去重) =====
async function storeFile(env, ab, name, ct) {
  var prefix = "f";
  if (ct.indexOf("image/") === 0) prefix = "img";
  else if (ct.indexOf("video/") === 0) prefix = "vid";
  else if (ct.indexOf("audio/") === 0) prefix = "aud";

  var hashBuf = await crypto.subtle.digest("SHA-256", ab);
  var hashArr = new Uint8Array(hashBuf);
  var hashStr = "";
  for (var hi = 0; hi < hashArr.length; hi++) {
    var hs = hashArr[hi].toString(16);
    hashStr += hs.length === 1 ? "0" + hs : hs;
  }
  var key = prefix + "_" + hashStr.slice(0, 16);

  console.log("[upload] 存储到KV: key=" + key + " ct=" + ct + " size=" + ab.byteLength);

  await env.kv.put(key, ab, {
    metadata: {
      contentType: ct,
      fileName: name || "upload",
      uploadedAt: new Date().toISOString()
    }
  });

  console.log("[upload] 上传成功: " + key);

  return {
    ok: true,
    key: key,
    url: "/file/" + key,
    size: ab.byteLength,
    type: ct,
    name: name || key
  };
}

// ===== FILE SERVE =====
async function serveFile(key, env) {
  if (!hasKV(env)) return new Response("KV未配置", {status:500});
  try {
    var r = await env.kv.getWithMetadata(key, {type:"arrayBuffer"});
    if (!r || !r.value) return new Response("未找到: "+key, {status:404, headers:{"Content-Type":"text/plain"}});
    var ct = (r.metadata && r.metadata.contentType) || "application/octet-stream";
    return new Response(r.value, {
      headers: {
        "Content-Type": ct,
        "Content-Length": String(r.value.byteLength || 0),
        "Cache-Control": "public, max-age=86400",
        "Accept-Ranges": "bytes"
      }
    });
  } catch(e) {
    return new Response("错误: "+e.message, {status:500, headers:{"Content-Type":"text/plain"}});
  }
}

// ===== AUTH (检查 cache 绑定) =====
async function checkAuth(req, env) {
  var sid = getCookie(req, "session");
  if (!sid) return false;
  if (!hasCache(env)) return false;
  try { var val = await env.cache.get("session_" + sid); return val != null; } catch(e) { return false; }
}

// ===== HOME =====
async function serveHome(req, env) {
  if (!hasDB(env)) {
    return G('<div style="text-align:center;padding:4rem 1rem"><h1>Gallery</h1><p>数据库尚未绑定，请到 Cloudflare 控制台绑定 D1 数据库后访问 /api/init/你的密钥 完成初始化。</p></div>');
  }
  var url = new URL(req.url);
  var page = parseInt(url.searchParams.get("page") || "1", 10);
  var cat = url.searchParams.get("cat") || "";
  var pageSize = parseInt(X("PAGE_SIZE","24"), 10);
  var conds = ["status='published'"];
  var binds = [];
  if (cat) { conds.push("category=?"); binds.push(cat); }
  var where = "WHERE " + conds.join(" AND ");

  var countSql = "SELECT COUNT(*) as c FROM media_items WHERE status='published'";
  var itemsSql = "SELECT * FROM media_items " + where + " ORDER BY COALESCE(weight,0) DESC, COALESCE(published_at,created_at) DESC LIMIT ? OFFSET ?";

  var countR;
  var itemsR;
  if (cat) {
    countR = await env.DB.prepare(countSql + " AND category=?").bind(cat).first();
    itemsR = await env.DB.prepare(itemsSql).bind(cat, pageSize, (page-1)*pageSize).all();
  } else {
    countR = await env.DB.prepare(countSql).first();
    itemsR = await env.DB.prepare(itemsSql).bind(pageSize, (page-1)*pageSize).all();
  }

  var total = countR ? countR.c : 0;
  var totalPages = Math.ceil(total / pageSize);
  var items = (itemsR && itemsR.results) || [];
  var brand = await getSetting(env.DB, "brand_name", "Gallery");

  var cardsHtml = "";
  if (items.length === 0) {
    cardsHtml = '<div class="empty-state"><svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg><h3>暂无内容</h3><p>管理员可以添加新内容</p></div>';
  } else {
    cardsHtml = '<div class="g">';
    for (var ci = 0; ci < items.length; ci++) {
      var item = items[ci];
      var cardHref = "/item/" + (item.slug || item.id);
      if (item.custom_link && item.custom_link.length > 0) cardHref = item.custom_link;

      var coverImg = "";
      if (item.cover_key) {
        coverImg = '<img src="/file/'+d(item.cover_key)+'" alt="'+d(item.title)+'" class="ld" loading="lazy" onload="this.classList.add(\'loaded\')" />';
      } else {
        try {
          var gk0 = JSON.parse(item.gallery_keys||"[]");
          if (gk0.length > 0) coverImg = '<img src="/file/'+d(gk0[0])+'" alt="'+d(item.title)+'" class="ld" loading="lazy" onload="this.classList.add(\'loaded\')" />';
        } catch(e) {}
      }

      var badges = "";
      var hasGal = false;
      try { hasGal = JSON.parse(item.gallery_keys||"[]").length > 0; } catch(e) {}
      if (item.cover_key || hasGal) badges += '<span class="ctg">图片</span>';
      if (item.content_key) badges += '<span class="ctg ctg-video">视频</span>';
      if (item.content_text) badges += '<span class="ctg ctg-text">文字</span>';
      if (item.custom_link) badges += '<span class="ctg ctg-link">链接</span>';

      var playO = item.content_key ? '<div class="play-overlay">'+IPLAY+'</div>' : '';
      cardsHtml += '<a class="cd" href="'+d(cardHref)+'"><div class="cc">'+coverImg+playO+'</div><div class="cb"><div class="ct">'+d(item.title)+'</div><p class="cd2">'+d(item.description||"")+'</p><div class="cm">'+IEYE+' <span>'+(item.views||0)+' 次浏览</span></div><div class="cb2">'+badges+'</div></div></a>';
    }
    cardsHtml += '</div>';
  }

  var pgHtml = "";
  if (totalPages > 1) {
    pgHtml = '<div class="pg">';
    if (page > 1) pgHtml += '<a href="?page='+(page-1)+(cat?'&cat='+encodeURIComponent(cat):'')+'">'+ICL+' 上一页</a>';
    pgHtml += '<span style="color:var(--ter);font-size:.82rem;align-self:center">第 '+page+' / '+totalPages+' 页</span>';
    if (page < totalPages) pgHtml += '<a href="?page='+(page+1)+(cat?'&cat='+encodeURIComponent(cat):'')+'">下一页 '+ICR+'</a>';
    pgHtml += '</div>';
  }

  var catsHtml = '<a class="fc'+(!cat?' on':'')+'" href="/">全部</a>';
  try {
    var catsList = JSON.parse(await getSetting(env.DB, "categories", "[]"));
    for (var cti = 0; cti < catsList.length; cti++) {
      var cn = typeof catsList[cti]==="string" ? catsList[cti] : catsList[cti].name;
      catsHtml += '<a class="fc'+(cat===cn?' on':'')+'" href="?cat='+encodeURIComponent(cn)+'">'+d(cn)+'</a>';
    }
  } catch(e) {}

  var html = '<!DOCTYPE html><html lang="zh"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>'+d(brand)+'</title><style>'+CSS+'</style></head><body><header class="tb"><div class="c tbi"><a class="brand" href="/">'+LOGO+' '+d(brand)+'</a><nav class="nl"><a href="/">首页</a><a href="/about">关于</a></nav><div class="ta"><button class="ib" id="themeBtn" title="切换主题">'+IMoon+'</button></div></div></header><section class="hero"><div class="c"><h1>'+d(brand)+'</h1><p>浏览内容 · 探索精彩</p><div class="ha"><a class="btn" href="#content">'+IGRID+' 浏览作品</a><a class="btng" href="/about">'+IFWD+' 关于我们</a></div></div></section><main class="c" id="content"><div class="fl">'+catsHtml+'</div>'+cardsHtml+pgHtml+'</main><footer class="ft"><div class="c">© '+new Date().getFullYear()+' '+d(brand)+'</div></footer><script>'+TJS+'</script></body></html>';
  return G(html);
}

// ===== ITEM DETAIL =====
async function serveItem(req, env, identifier) {
  if (!hasDB(env)) return G('<div style="text-align:center;padding:4rem 1rem"><h1>数据库未绑定</h1><p>请到 CF 控制台绑定 D1 数据库</p></div>');

  var item = await env.DB.prepare("SELECT * FROM media_items WHERE slug=? AND status='published'").bind(identifier).first();
  if (!item) item = await env.DB.prepare("SELECT * FROM media_items WHERE id=? AND status='published'").bind(identifier).first();
  if (!item) {
    try { var decoded = decodeURIComponent(identifier); item = await env.DB.prepare("SELECT * FROM media_items WHERE slug=? AND status='published'").bind(decoded).first(); } catch(e) {}
  }
  if (!item) {
    var likeId = identifier.length > 8 ? identifier.slice(-8) : identifier;
    item = await env.DB.prepare("SELECT * FROM media_items WHERE slug LIKE ? AND status='published'").bind("%"+likeId).first();
  }
  if (!item) return G('<div style="text-align:center;padding:4rem 1rem"><h1>404</h1><p>内容不存在</p><a href="/">返回首页</a></div>');

  try { await env.DB.prepare("UPDATE media_items SET views=COALESCE(views,0)+1 WHERE id=?").bind(item.id).run(); } catch(e) {}

  var brand = await getSetting(env.DB, "brand_name", "Gallery");
  var galKeys = [];
  try { galKeys = JSON.parse(item.gallery_keys || "[]"); } catch(e) { galKeys = []; }

  var galHtml = "";
  if (galKeys.length > 0) {
    galHtml = '<div class="gal" id="gal"><div class="gal-main"><img id="galImg" src="/file/'+d(galKeys[0])+'" alt="'+d(item.title)+'" /><span class="gal-counter" id="galCnt">1/'+galKeys.length+'</span><button class="gal-btn gal-prev" id="galPrev">'+ICL+'</button><button class="gal-btn gal-next" id="galNext">'+ICR+'</button></div><div class="gal-dots" id="galDots">';
    for (var gi = 0; gi < galKeys.length; gi++) { galHtml += '<button class="gal-dot'+(gi===0?' on':'')+'" data-i="'+gi+'"></button>'; }
    galHtml += '</div></div>';
  }

  var vidHtml = item.content_key ? '<div class="vid-c"><video controls preload="metadata" src="/file/'+d(item.content_key)+'"></video></div>' : '';

  var coverHtml = "";
  if (item.cover_key) {
    var inGal = false;
    for (var cgi = 0; cgi < galKeys.length; cgi++) { if (galKeys[cgi] === item.cover_key) { inGal = true; break; } }
    if (!inGal) coverHtml = '<div style="margin:1rem 0;border-radius:12px;overflow:hidden;box-shadow:var(--shadow)"><img src="/file/'+d(item.cover_key)+'" alt="'+d(item.title)+'" style="width:100%" /></div>';
  }

  var attHtml = item.attachment_key ? '<a class="btng" href="/file/'+d(item.attachment_key)+'" download="'+d(item.attachment_name||"download")+'">'+IDL+' 下载附件 ('+d(item.attachment_name||"")+')</a>' : '';
  var linkHtml = item.custom_link ? '<a class="btn" href="'+d(item.custom_link)+'" target="'+d(item.link_target||"_self")+'" rel="noopener">'+ILINK+' 访问链接</a>' : '';

  var htmlContent = "";
  if (item.content_text && item.content_text.length > 0) {
    var b64 = btoa(unescape(encodeURIComponent(item.content_text)));
    htmlContent = '<div class="hs"><iframe src="data:text/html;charset=utf-8;base64,'+b64+'" sandbox="allow-same-origin" loading="lazy"></iframe></div>';
  }

  var backBtn = '<a class="btng" href="/">'+IBACK+' 返回首页</a>';
  var copyBtn = '<button class="btng" id="copyLink">'+ICOPY+' 复制链接</button>';

  var galJS = "";
  if (galKeys.length > 1) {
    galJS = '<script>var galKeys='+JSON.stringify(galKeys)+';var gi=0,img=document.getElementById("galImg"),cnt=document.getElementById("galCnt"),dots=document.querySelectorAll(".gal-dot"),prev=document.getElementById("galPrev"),next=document.getElementById("galNext");function show(i){gi=(i+galKeys.length)%galKeys.length;img.src="/file/"+galKeys[gi];cnt.textContent=(gi+1)+"/"+galKeys.length;for(var d=0;d<dots.length;d++)dots[d].className=dots[d].className.replace(" on","");if(dots[gi])dots[gi].className+=" on";}prev.addEventListener("click",function(){show(gi-1);});next.addEventListener("click",function(){show(gi+1);});for(var di=0;di<dots.length;di++)dots[di].addEventListener("click",function(){show(parseInt(this.dataset.i));});document.addEventListener("keydown",function(e){if(e.key==="ArrowLeft")show(gi-1);if(e.key==="ArrowRight")show(gi+1);});</script>';
  }

  var html = '<!DOCTYPE html><html lang="zh"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>'+d(item.title)+' - '+d(brand)+'</title><meta name="description" content="'+d(item.description||"")+'" /><style>'+CSS+'</style></head><body><header class="tb"><div class="c tbi"><a class="brand" href="/">'+LOGO+' '+d(brand)+'</a><nav class="nl"><a href="/">首页</a><a href="/about">关于</a></nav><div class="ta"><button class="ib" id="themeBtn" title="切换主题">'+IMoon+'</button></div></div></header><main class="c" style="padding:2rem 1.5rem;max-width:900px"><div class="item-actions">'+backBtn+copyBtn+linkHtml+'</div><h1 style="margin:.5rem 0">'+d(item.title)+'</h1><p style="color:var(--sec);margin-bottom:1rem">'+d(item.description||"")+'</p>'+galHtml+coverHtml+vidHtml+htmlContent+attHtml+'<div style="margin-top:2rem;color:var(--ter);font-size:.78rem">'+IEYE+' '+((item.views||0)+1)+' 次浏览</div></main><footer class="ft"><div class="c">© '+new Date().getFullYear()+' '+d(brand)+'</div></footer><script>'+TJS+'</script>'+galJS+'<script>document.getElementById("copyLink").addEventListener("click",function(){var u=location.href;if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(u).then(function(){var t=document.getElementById("toast");if(t){t.textContent="链接已复制";t.className="toast on ok";setTimeout(function(){t.className="toast";},2000);}else{alert("链接已复制");}});}else{var ta=document.createElement("textarea");ta.value=u;document.body.appendChild(ta);ta.select();document.execCommand("copy");document.body.removeChild(ta);alert("链接已复制");}});</script></body></html>';
  return G(html);
}

// ===== LOGIN =====
function serveLogin() {
  var html = '<!DOCTYPE html><html lang="zh"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>登录 - Gallery</title><style>'+CSS+'</style></head><body><div class="lw"><div class="lcd"><h1>'+LOGO+' 管理登录</h1><p class="sub">请输入管理员密码</p><input id="u" placeholder="用户名" value="admin" /><input id="p" type="password" placeholder="密码" /><button onclick="doLogin()">登 录</button><div id="msg"></div></div></div><script>async function doLogin(){var u=document.getElementById("u").value.trim();var p=document.getElementById("p").value;var m=document.getElementById("msg");m.textContent="登录中...";try{var r=await fetch("/api/login",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({username:u,password:p}),credentials:"include"});var d=await r.json();if(d.ok){window.location.href="/admin";}else{m.textContent=d.error||"登录失败";}}catch(e){m.textContent="网络错误: "+e.message;}}document.getElementById("p").addEventListener("keydown",function(e){if(e.key==="Enter")doLogin();});</script></body></html>';
  return G(html);
}

// ===== ADMIN PANEL (v39.0) =====
async function serveAdmin(req, env) {
  if (!hasDB(env)) {
    return G('<div style="text-align:center;padding:4rem 1rem"><h1>Gallery 管理</h1><p>数据库尚未绑定。</p><p>请到 Cloudflare 控制台 → Workers & Pages → media-gallery → Settings → Variables and Secrets → Add binding</p><p>添加 D1 数据库绑定：Variable name = <code>DB</code></p><p>添加后访问 <code>/api/init/你的密钥</code> 完成初始化。</p></div>');
  }

  var authed = await checkAuth(req, env);
  if (!authed) return serveLogin();

  var brand = await getSetting(env.DB, "brand_name", "Gallery");

  var s1 = await env.DB.prepare("SELECT COUNT(*) as c FROM media_items").first();
  var s2 = await env.DB.prepare("SELECT COUNT(*) as c FROM media_items WHERE status='published'").first();
  var s3 = await env.DB.prepare("SELECT COUNT(*) as c FROM media_items WHERE status='draft'").first();
  var s4 = await env.DB.prepare("SELECT COALESCE(SUM(views),0) as s FROM media_items").first();
  var allItems = await env.DB.prepare("SELECT * FROM media_items ORDER BY COALESCE(weight,0) DESC, COALESCE(published_at,created_at) DESC").all();
  var items = allItems.results || [];

  var rowsHtml = "";
  if (items.length === 0) {
    rowsHtml = '<tr><td colspan="6" style="text-align:center;padding:2rem;color:var(--ter)">暂无内容，点击下方"新建内容"创建</td></tr>';
  } else {
    for (var ri = 0; ri < items.length; ri++) {
      var r = items[ri];
      var tl = [];
      var hasGal = false;
      try { hasGal = JSON.parse(r.gallery_keys||"[]").length > 0; } catch(e) {}
      if (r.cover_key || hasGal) tl.push('<span class="ctg">图</span>');
      if (r.content_key) tl.push('<span class="ctg ctg-video">视</span>');
      if (r.content_text) tl.push('<span class="ctg ctg-text">文</span>');
      if (r.custom_link) tl.push('<span class="ctg ctg-link">链</span>');

      var sb = r.status==='published' ? '<span class="badge badge-pub">已发布</span>' : '<span class="badge badge-draft">草稿</span>';
      rowsHtml += '<tr><td><strong>'+d(r.title)+'</strong><br><small style="color:var(--ter)">'+d(r.slug||r.id)+'</small></td><td>'+tl.join(" ")+'</td><td>'+sb+'</td><td>'+(r.views||0)+'</td><td>'+d(r.category||"default")+'</td><td class="row-actions"><button class="btns" onclick="editItem(\''+d(r.id)+'\')">'+IEDIT+' 编辑</button><button class="btnd" onclick="delItem(\''+d(r.id)+'\',\''+d(r.title)+'\')">'+ITRASH+' 删除</button></td></tr>';
    }
  }

  var s_brand = await getSetting(env.DB, "brand_name", "Gallery");
  var s_color = await getSetting(env.DB, "theme_color", "#0071e3");
  var s_ps = await getSetting(env.DB, "page_size", "24");
  var s_about = await getSetting(env.DB, "about_html", "");
  var s_wx_name = await getSetting(env.DB, "wechat_verify_name", "");
  var s_wx_content = await getSetting(env.DB, "wechat_verify_content", "");

  // ===== 后台 JS =====
  var AJ = [
    "var galleryKeysArr=[];",
    "function toast(m,t){var x=document.getElementById('toast');if(!x)return;x.textContent=m;x.className='toast on'+(t?' '+t:'');setTimeout(function(){x.className='toast';},3000);}",
    "function showTab(n,b){var ts=document.querySelectorAll('.pn');for(var i=0;i<ts.length;i++)ts[i].className='pn';var tab=document.getElementById('tab-'+n);if(tab)tab.className='pn on';var bs=document.querySelectorAll('.tb2 button');for(var j=0;j<bs.length;j++)bs[j].className='';if(b)b.className='on';}",
    "function doLogout(){fetch('/api/logout',{method:'POST',credentials:'include'}).then(function(){location.href='/admin';});}",

    "function uploadFile(inp,type,cb){",
    "  var f=inp.files&&inp.files[0];",
    "  if(!f){toast('请先选择文件','err');return;}",
    "  console.log('[upload] start type='+type+' name='+f.name+' size='+f.size);",
    "  var fd=new FormData();",
    "  fd.append('file',f,f.name);",
    "  var xhr=new XMLHttpRequest();",
    "  xhr.open('POST','/api/upload',true);",
    "  xhr.withCredentials=true;",
    "  var pb=document.getElementById(type+'_pb');",
    "  var pbf=document.getElementById(type+'_pbf');",
    "  if(pb){pb.style.display='block';pbf.style.width='0%';}",
    "  xhr.upload.onprogress=function(e){if(e.lengthComputable){var pct=Math.round(e.loaded/e.total*100);if(pbf)pbf.style.width=pct+'%';console.log('[upload] progress: '+pct+'%');}};",
    "  xhr.onload=function(){console.log('[upload] status='+xhr.status+' resp='+xhr.responseText.substring(0,200));if(pbf)pbf.style.width='100%';setTimeout(function(){if(pb)pb.style.display='none';if(pbf)pbf.style.width='0%';},600);try{var d=JSON.parse(xhr.responseText);if(d.ok){cb(d);toast('上传成功: '+d.name,'ok');}else{toast('上传失败: '+(d.error||xhr.status),'err');}}catch(e2){toast('解析响应失败: '+xhr.responseText.substring(0,100),'err');}};",
    "  xhr.onerror=function(){console.error('[upload] network error');toast('网络错误: 无法连接服务器','err');};",
    "  xhr.send(fd);",
    "}",

    "document.getElementById('f_cover_file').addEventListener('change',function(){uploadFile(this,'cover',function(d){document.getElementById('f_cover_url').value='';var i=document.getElementById('cover_info');i.style.display='flex';i.className='ui2 ok';i.innerHTML=d.name+' ('+Math.round(d.size/1024)+'KB) <span class=x onclick=\"this.parentNode.style.display=\\'none\\';document.getElementById(\\'f_cover_url\\').value=\\'\\';this.parentNode.className=\\'ui2\\';\\\">×</span><input type=hidden id=f_cover_key value='+d.key+' />';});});",

    "document.getElementById('f_video_file').addEventListener('change',function(){uploadFile(this,'video',function(d){document.getElementById('f_video_url').value='';var i=document.getElementById('video_info');i.style.display='flex';i.className='ui2 ok';i.innerHTML=d.name+' ('+Math.round(d.size/1024)+'KB) <span class=x onclick=\"this.parentNode.style.display=\\'none\\';document.getElementById(\\'f_video_url\\').value=\\'\\';this.parentNode.className=\\'ui2\\';\\\">×</span><input type=hidden id=f_video_key value='+d.key+' />';});});",

    "document.getElementById('f_attach_file').addEventListener('change',function(){var files=this.files;if(!files||files.length===0)return;var pb=document.getElementById('attach_pb');var pbf=document.getElementById('attach_pbf');if(pb)pb.style.display='block';var done=0,total=files.length;for(var fi=0;fi<files.length;fi++){(function(file,idx){var fd2=new FormData();fd2.append('file',file,file.name);var xhr2=new XMLHttpRequest();xhr2.open('POST','/api/upload',true);xhr2.withCredentials=true;xhr2.upload.onprogress=function(e){if(e.lengthComputable){var pct=Math.round((done*100+e.loaded/file.size*100)/total);if(pbf)pbf.style.width=pct+'%';}};xhr2.onload=function(){done++;try{var d=JSON.parse(xhr2.responseText);if(d.ok){if(idx===0){var i=document.getElementById('attach_info');if(i){i.style.display='flex';i.className='ui2 ok';i.innerHTML=d.name+' ('+Math.round(d.size/1024)+'KB)<input type=hidden id=f_attach_key value='+d.key+' /><input type=hidden id=f_attach_name value=\"'+d.name+'\" />';}}addAttachPreview(d.key,d.name,d.size);toast('附件上传成功: '+d.name,'ok');}else{toast('上传失败: '+(d.error||''),'err');}}catch(e){toast('解析失败','err');}if(done===total){if(pbf)pbf.style.width='100%';setTimeout(function(){if(pb)pb.style.display='none';if(pbf)pbf.style.width='0%';},600);}};xhr2.onerror=function(){done++;toast('网络错误','err');};xhr2.send(fd2);})(files[fi],fi);}});",

    "function addAttachPreview(key,name,size){var w=document.getElementById('attach_preview');if(!w)return;var div=document.createElement('div');div.className='up-prev-item';div.style.width='auto';div.style.height='auto';div.style.padding='4px 8px';div.innerHTML='<span style=\"font-size:11px;white-space:nowrap\">'+name+' ('+Math.round(size/1024)+'KB)</span>';w.appendChild(div);}",


    "document.getElementById('f_gallery_files').addEventListener('change',function(){var files=this.files;if(!files||files.length===0)return;var pb=document.getElementById('gal_pb');var pbf=document.getElementById('gal_pbf');if(pb)pb.style.display='block';if(pbf)pbf.style.width='0%';var done=0,total=files.length;for(var fi=0;fi<files.length;fi++){(function(file,idx){var fd2=new FormData();fd2.append('file',file,file.name);var xhr2=new XMLHttpRequest();xhr2.open('POST','/api/upload',true);xhr2.withCredentials=true;xhr2.upload.onprogress=function(e){if(e.lengthComputable){var pct=Math.round((done*100+e.loaded/file.size*100)/(total));if(pbf)pbf.style.width=pct+'%';}};xhr2.onload=function(){done++;console.log('[upload] gal '+idx+' done: '+xhr2.status);try{var d=JSON.parse(xhr2.responseText);if(d.ok){galleryKeysArr.push(d.key);document.getElementById('f_gallery_keys').value=JSON.stringify(galleryKeysArr);addGalPreview(d.key,d.name,d.size);toast('上传成功: '+d.name,'ok');}else{toast('上传失败: '+(d.error||''),'err');}}catch(e){toast('解析失败','err');}if(done===total){if(pbf)pbf.style.width='100%';setTimeout(function(){if(pb)pb.style.display='none';if(pbf)pbf.style.width='0%';},600);}};xhr2.onerror=function(){done++;toast('网络错误','err');};xhr2.send(fd2);})(files[fi],fi);}});",

    "function addGalPreview(key,name,size){var w=document.getElementById('gallery_preview');if(!w)return;var div=document.createElement('div');div.className='up-prev-item';div.innerHTML='<img src=\"/file/'+key+'\" alt=\"\"><button class=\"rm\" onclick=\"removeGalKey(\\''+key+'\\',this)\">×</button>';w.appendChild(div);}",

    "function removeGalKey(key,btn){var idx=galleryKeysArr.indexOf(key);if(idx>-1)galleryKeysArr.splice(idx,1);document.getElementById('f_gallery_keys').value=JSON.stringify(galleryKeysArr);btn.parentNode.remove();}",

    "document.getElementById('f_cover_url').addEventListener('input',function(){if(this.value){var i=document.getElementById('cover_info');if(i){i.style.display='none';i.className='ui2';}}});",
    "document.getElementById('f_video_url').addEventListener('input',function(){if(this.value){var i=document.getElementById('video_info');if(i){i.style.display='none';i.className='ui2';}}});",

    "function saveItem(){",
    "  var title=document.getElementById('f_title').value.trim();",
    "  if(!title){toast('标题不能为空','err');return;}",
    "  var ck='',cu='',vk='',vu='',ak='',an='',gk='[]',text='',cl='',lt='_self';",
    "  var el=document.getElementById('f_cover_key');if(el)ck=el.value;",
    "  el=document.getElementById('f_cover_url');if(el)cu=el.value;",
    "  el=document.getElementById('f_video_key');if(el)vk=el.value;",
    "  el=document.getElementById('f_video_url');if(el)vu=el.value;",
    "  el=document.getElementById('f_attach_key');if(el)ak=el.value;",
    "  el=document.getElementById('f_attach_name');if(el)an=el.value;",
    "  el=document.getElementById('f_gallery_keys');if(el)gk=el.value||'[]';",
    "  el=document.getElementById('f_text');if(el)text=el.value;",
    "  el=document.getElementById('f_custom_link');if(el)cl=el.value.trim();",
    "  el=document.getElementById('f_link_target');if(el)lt=el.value;",
    "  if(!ck&&cu)ck=cu;",
    "  if(!vk&&vu)vk=vu;",
    "  var tagsVal='';el=document.getElementById('f_tags');if(el)tagsVal=el.value;",
    "  var tagsArr=tagsVal.split(',').map(function(s){return s.trim()}).filter(function(s){return s;});",
    "  var payload={title:title,description:'',cover_key:ck||null,content_key:vk||null,content_text:text||'',gallery_keys:JSON.parse(gk||'[]'),attachment_key:ak||null,attachment_name:an||'',category:'',tags:tagsArr,status:'published',weight:0,custom_link:cl,link_target:lt};",
    "  el=document.getElementById('f_desc');if(el)payload.description=el.value;",
    "  el=document.getElementById('f_category');if(el)payload.category=el.value||'default';",
    "  el=document.getElementById('f_status');if(el)payload.status=el.value||'published';",
    "  el=document.getElementById('f_weight');if(el)payload.weight=parseInt(el.value||'0',10)||0;",
    "  var eid='';el=document.getElementById('f_edit_id');if(el)eid=el.value;",
    "  var method=eid?'PUT':'POST';",
    "  var url=eid?'/api/items/'+encodeURIComponent(eid):'/api/items';",
    "  console.log('[save] method='+method+' url='+url);",
    "  fetch(url,{method:method,headers:{'Content-Type':'application/json'},body:JSON.stringify(payload),credentials:'include'})",
    "    .then(function(r){console.log('[save] status='+r.status);return r.json();})",
    "    .then(function(d){console.log('[save] response=',d);if(d.ok){toast(eid?'更新成功':'创建成功','ok');resetForm();setTimeout(function(){location.reload();},1000);}else{toast('保存失败: '+(d.error||JSON.stringify(d)),'err');}})",
    "    .catch(function(e){toast('网络错误: '+e.message,'err');});",
    "}",

    "function resetForm(){",
    "  var ids=['f_title','f_desc','f_cover_url','f_video_url','f_text','f_category','f_tags','f_custom_link'];",
    "  for(var ri=0;ri<ids.length;ri++){var el=document.getElementById(ids[ri]);if(el)el.value='';}",
    "  var el=document.getElementById('f_status');if(el)el.value='published';",
    "  el=document.getElementById('f_weight');if(el)el.value='';",
    "  el=document.getElementById('f_link_target');if(el)el.value='_self';",
    "  el=document.getElementById('f_edit_id');if(el)el.value='';",
    "  el=document.getElementById('cover_info');if(el){el.style.display='none';el.className='ui2';}",
    "  el=document.getElementById('video_info');if(el){el.style.display='none';el.className='ui2';}",
    "  el=document.getElementById('attach_info');if(el)el.style.display='none';",
    "  el=document.getElementById('gallery_preview');if(el)el.innerHTML='';",
    "  galleryKeysArr=[];",
    "  el=document.getElementById('save_btn_text');if(el)el.textContent='创建内容';",
    "}",

    "function editItem(id){",
    "  console.log('[edit] id='+id);",
    "  fetch('/api/items',{credentials:'include'}).then(function(r){return r.json();}).then(function(d){",
    "    var items=d.items||[];var item=null;for(var i=0;i<items.length;i++)if(items[i].id===id)item=items[i];",
    "    if(!item){toast('未找到内容','err');return;}",
    "    showTab('new',document.querySelectorAll('.tb2 button')[1]);",
    "    document.getElementById('f_edit_id').value=item.id||'';",
    "    document.getElementById('f_title').value=item.title||'';",
    "    document.getElementById('f_desc').value=item.description||'';",
    "    document.getElementById('f_text').value=item.content_text||'';",
    "    document.getElementById('f_category').value=item.category||'';",
    "    document.getElementById('f_status').value=item.status||'published';",
    "    document.getElementById('f_weight').value=item.weight||0;",
    "    document.getElementById('f_custom_link').value=item.custom_link||'';",
    "    document.getElementById('f_link_target').value=item.link_target||'_self';",
    "    if(item.cover_key){var ci=document.getElementById('cover_info');ci.style.display='flex';ci.className='ui2 ok';ci.innerHTML='已上传封面 <span class=x onclick=\"this.parentNode.style.display=\\'none\\';this.parentNode.className=\\'ui2\\';\\\">×</span><input type=hidden id=f_cover_key value='+item.cover_key+' />';}",
    "    if(item.content_key){var vi=document.getElementById('video_info');vi.style.display='flex';vi.className='ui2 ok';vi.innerHTML='已上传视频 <span class=x onclick=\"this.parentNode.style.display=\\'none\\';this.parentNode.className=\\'ui2\\';\\\">×</span><input type=hidden id=f_video_key value='+item.content_key+' />';}",
    "    if(item.attachment_key){var ai=document.getElementById('attach_info');ai.style.display='flex';ai.innerHTML='已上传附件 <span class=x onclick=\"this.parentNode.style.display=\\'none\\';\\\">×</span><input type=hidden id=f_attach_key value='+item.attachment_key+' /><input type=hidden id=f_attach_name value=\"'+(item.attachment_name||'')+'\" />';}",
    "    var gk=[];try{gk=JSON.parse(item.gallery_keys||'[]');}catch(e){}",
    "    galleryKeysArr=gk;var prev=document.getElementById('gallery_preview');prev.innerHTML='';for(var gi=0;gi<gk.length;gi++)addGalPreview(gk[gi],'image',0);",
    "    document.getElementById('save_btn_text').textContent='更新内容';",
    "  });",
    "}",

    "function delItem(id,name){",
    "  if(!confirm('确定删除「'+name+'」？此操作不可恢复！'))return;",
    "  console.log('[delete] id='+id);",
    "  fetch('/api/items/'+encodeURIComponent(id),{method:'DELETE',credentials:'include'})",
    "    .then(function(r){console.log('[delete] status='+r.status);return r.json();})",
    "    .then(function(d){console.log('[delete] response=',d);if(d.ok){toast('已删除: '+name,'ok');setTimeout(function(){location.reload();},800);}else{toast('删除失败: '+(d.error||JSON.stringify(d)),'err');}})",
    "    .catch(function(e){toast('删除失败: '+e.message,'err');});",
    "}",

    "function saveSettings(){",
    "  var b=document.getElementById('s_brand').value;",
    "  var c=document.getElementById('s_color').value;",
    "  var ps=document.getElementById('s_pagesize').value;",
    "  var a=document.getElementById('s_about').value;",
    "  var wxn=document.getElementById('s_wx_name').value;",
    "  var wxc=document.getElementById('s_wx_content').value;",
    "  var hexEl=document.getElementById('s_color_hex');if(hexEl)hexEl.textContent=c;",
    "  document.documentElement.style.setProperty('--accent',c);",
    "  fetch('/api/settings',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({brand_name:b,theme_color:c,page_size:ps,about_html:a,wechat_verify_name:wxn,wechat_verify_content:wxc}),credentials:'include'})",
    "    .then(function(r){return r.json();})",
    "    .then(function(d){if(d.ok)toast('设置已保存','ok');else toast('保存失败','err');})",
    "    .catch(function(e){toast('网络错误','err');});",
    "}",

    "function setupDragDrop(zoneId,inputId){",
    "  var z=document.getElementById(zoneId);if(!z)return;",
    "  z.addEventListener('dragover',function(e){e.preventDefault();z.className=z.className.replace(' ov','')+' ov';});",
    "  z.addEventListener('dragleave',function(e){z.className=z.className.replace(' ov','');});",
    "  z.addEventListener('drop',function(e){e.preventDefault();z.className=z.className.replace(' ov','');if(e.dataTransfer&&e.dataTransfer.files&&e.dataTransfer.files.length>0){document.getElementById(inputId).files=e.dataTransfer.files;var ev=new Event('change');document.getElementById(inputId).dispatchEvent(ev);}});",
    "}",
    "setupDragDrop('uz_cover','f_cover_file');",
    "setupDragDrop('uz_gallery','f_gallery_files');",
    "setupDragDrop('uz_video','f_video_file');",
    "setupDragDrop('uz_attach','f_attach_file');",

    "var colorInp=document.getElementById('s_color');",
    "if(colorInp){colorInp.addEventListener('input',function(){",
    "  var c=this.value;var hexEl=document.getElementById('s_color_hex');",
    "  if(hexEl)hexEl.textContent=c;",
    "  document.documentElement.style.setProperty('--accent',c);",
    "});}",
  ].join("");

  var html = '<!DOCTYPE html><html lang="zh"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>管理后台 - '+d(brand)+'</title><style>'+CSS+'</style></head><body><header class="atb"><div class="c atbi"><a class="brand" href="/admin">'+LOGO+' '+d(brand)+' 管理</a><div class="ta"><a class="btng" href="/">'+IFWD+' 前台</a><button class="btnd" onclick="doLogout()">'+ITRASH+' 退出</button></div></div></header><main class="c" style="padding:1.5rem"><div class="sr"><div class="sc"><div class="sn">'+(s1?s1.c:0)+'</div><div class="sl">全部内容</div></div><div class="sc"><div class="sn" style="color:var(--success)">'+(s2?s2.c:0)+'</div><div class="sl">已发布</div></div><div class="sc"><div class="sn" style="color:var(--warning)">'+(s3?s3.c:0)+'</div><div class="sl">草稿</div></div><div class="sc"><div class="sn" style="color:var(--accent)">'+(s4?s4.s:0)+'</div><div class="sl">总浏览量</div></div></div><div class="tb2"><button class="on" onclick="showTab(\'list\',this)">内容列表</button><button onclick="showTab(\'new\',this)">新建内容</button><button onclick="showTab(\'settings\',this)">站点设置</button></div><div class="pn on" id="tab-list"><table class="dt"><thead><tr><th>标题</th><th>类型</th><th>状态</th><th>浏览</th><th>分类</th><th>操作</th></tr></thead><tbody>'+rowsHtml+'</tbody></table></div><div class="pn" id="tab-new"><div class="fr"><div><label>标题 *</label><input id="f_title" placeholder="内容标题" /></div><div><label>分类</label><input id="f_category" placeholder="默认: default" /></div></div><label>描述</label><textarea id="f_desc" placeholder="简短描述"></textarea><div class="st">'+IIMG+' 封面图</div><div class="uz" id="uz_cover"><input type="file" accept="image/*" id="f_cover_file" /><div class="uz-icon">📷</div><div class="ui">'+IUP+' 点击或拖拽上传封面图</div><div class="ut">JPG/PNG/WebP/GIF，最大24MB</div><div class="uh">或填写外部图片URL:</div></div><input id="f_cover_url" placeholder="外部图片URL（可选）" /><div id="cover_info" class="ui2" style="display:none"></div><div class="pb" id="cover_pb"><div class="pbf" id="cover_pbf"></div></div><div class="st">'+IGRID+' 图集（多张图片）</div><div class="uz" id="uz_gallery"><input type="file" accept="image/*" id="f_gallery_files" multiple /><div class="uz-icon">🖼️</div><div class="ui">'+IUP+' 点击或拖拽上传多张图片</div><div class="ut">支持多选，JPG/PNG/WebP</div></div><div class="up-prev" id="gallery_preview"></div><div class="pb" id="gal_pb"><div class="pbf" id="gal_pbf"></div></div><div class="st">'+IVID+' 视频文件</div><div class="uz" id="uz_video"><input type="file" accept="video/*" id="f_video_file" /><div class="uz-icon">🎬</div><div class="ui">'+IUP+' 点击或拖拽上传视频</div><div class="ut">MP4/WebM/MOV，最大24MB</div><div class="uh">或填写外部视频URL:</div></div><input id="f_video_url" placeholder="外部视频URL（可选）" /><div id="video_info" class="ui2" style="display:none"></div><div class="pb" id="video_pb"><div class="pbf" id="video_pbf"></div></div><div class="st">'+IFILE+' 附件（支持多文件）</div><div class="uz" id="uz_attach"><input type="file" id="f_attach_file" multiple /><div class="uz-icon">📎</div><div class="ui">'+IUP+' 点击或拖拽上传附件</div><div class="ut">任意文件类型，单文件最大24MB，支持多选</div></div><div id="attach_info" class="ui2" style="display:none"></div><div class="pb" id="attach_pb"><div class="pbf" id="attach_pbf"></div></div><div class="up-prev" id="attach_preview"></div><div class="st">'+IDOC+' 文字内容（支持HTML）</div><textarea id="f_text" placeholder="输入文字内容，支持HTML标签如 <b>加粗</b> <a href=...>链接</a>"></textarea><div class="st">'+ILINK+' 自定义详情页链接</div><input id="f_custom_link" placeholder="留空使用默认详情页，填写则点击卡片跳转此链接" /><div style="display:flex;gap:.5rem;align-items:center;margin-top:.5rem"><label style="font-size:.82rem;color:var(--sec)">打开方式:</label><select id="f_link_target" style="width:auto;margin:0"><option value="_self">当前窗口</option><option value="_blank">新窗口</option></select></div><div class="st">其他设置</div><div class="fr"><div><label>状态</label><select id="f_status" style="margin-bottom:.6rem"><option value="published">已发布</option><option value="draft">草稿</option></select></div><div><label>权重（越大越靠前）</label><input id="f_weight" type="number" placeholder="0" /></div></div><input id="f_tags" placeholder="标签（逗号分隔）" style="margin-bottom:1rem" /><input id="f_edit_id" type="hidden" /><input id="f_gallery_keys" type="hidden" value="[]" /><button class="btn" onclick="saveItem()">'+IPLUS+' <span id="save_btn_text">创建内容</span></button><button class="btng" onclick="resetForm()" style="margin-left:.5rem">重置</button></div><div class="pn" id="tab-settings"><div class="fr"><div><label>站点名称</label><input id="s_brand" value="'+d(s_brand)+'" /></div><div><label>主题色（点击下方色块选择）</label><div style="display:flex;align-items:center;gap:8px"><input id="s_color" type="color" value="'+d(s_color)+'" style="width:60px;height:40px;border-radius:8px;cursor:pointer;margin:0" /><span id="s_color_hex" style="font-size:13px;color:var(--sec);font-family:monospace">'+d(s_color)+'</span></div></div></div><label>每页数量</label><input id="s_pagesize" value="'+d(s_ps)+'" /><label>关于页面 HTML</label><textarea id="s_about">'+d(s_about)+'</textarea><div class="st">'+ISHIELD+' 微信验证文件</div><p style="font-size:.78rem;color:var(--sec);margin-bottom:.5rem">用于微信公众域名验证。填写文件名和内容后，该文件将在站点根路径可直接访问。</p><label>文件名</label><input id="s_wx_name" placeholder="MP_verify_xxxxxx.txt" value="'+d(s_wx_name)+'" /><label>文件内容</label><textarea id="s_wx_content" rows="2" placeholder="验证内容">'+d(s_wx_content)+'</textarea><button class="btn" onclick="saveSettings()">保存设置</button></div></main><div class="toast" id="toast"></div><footer class="ft"><div class="c">© '+new Date().getFullYear()+' '+d(brand)+' · v42.0</div></footer><script>'+AJ+'</script></body></html>';
  return G(html);
}

// ===== ABOUT =====
async function serveAbout(env) {
  if (!hasDB(env)) return G('<div style="text-align:center;padding:4rem 1rem"><h1>关于</h1><p>数据库尚未绑定</p></div>');
  var brand = await getSetting(env.DB, "brand_name", "Gallery");
  var aboutHtml = await getSetting(env.DB, "about_html", "<h1>关于我们</h1><p>欢迎来到 "+brand+"。</p>");
  var html = '<!DOCTYPE html><html lang="zh"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>关于 - '+d(brand)+'</title><style>'+CSS+'</style></head><body><header class="tb"><div class="c tbi"><a class="brand" href="/">'+LOGO+' '+d(brand)+'</a><nav class="nl"><a href="/">首页</a><a href="/about">关于</a></nav><div class="ta"><button class="ib" id="themeBtn" title="切换主题">'+IMoon+'</button></div></div></header><main class="c" style="padding:2rem 1.5rem;max-width:700px">'+aboutHtml+'<p style="margin-top:2rem"><a class="btng" href="/">'+IBACK+' 返回首页</a></p></main><footer class="ft"><div class="c">© '+new Date().getFullYear()+' '+d(brand)+'</div></footer><script>'+TJS+'</script></body></html>';
  return G(html);
}

// ===== RSS =====
async function serveRSS(env) {
  if (!hasDB(env)) return new Response("<?xml version=\"1.0\"?><rss version=\"2.0\"><channel><title>Gallery</title></channel></rss>", {headers:{"Content-Type":"application/rss+xml"}});
  var itemsR = await env.DB.prepare("SELECT * FROM media_items WHERE status='published' ORDER BY COALESCE(published_at,created_at) DESC LIMIT 30").all();
  var items = itemsR.results || [];
  var brand = await getSetting(env.DB, "brand_name", "Gallery");
  var domain = X("DOMAIN", "example.com");
  var xml = '<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>'+d(brand)+'</title><link>https://'+domain+'</link><description>'+d(brand)+' RSS Feed</description>';
  for (var ri = 0; ri < items.length; ri++) {
    var lm = items[ri].published_at || items[ri].created_at || new Date().toISOString();
    xml += '<item><title>'+d(items[ri].title)+'</title><link>https://'+domain+'/item/'+d(items[ri].slug||items[ri].id)+'</link><description>'+d(items[ri].description||"")+'</description><pubDate>'+new Date(lm.replace(" ","T")+"Z").toUTCString()+'</pubDate></item>';
  }
  xml += '</channel></rss>';
  return new Response(xml, {headers:{"Content-Type":"application/rss+xml; charset=utf-8"}});
}

// ===== SITEMAP =====
async function serveSitemap(env) {
  if (!hasDB(env)) return new Response("<?xml version=\"1.0\"?><urlset xmlns=\"http://www.sitemaps.org/schemas/sitemap/0.9\"><url><loc>https://example.com/</loc></url></urlset>", {headers:{"Content-Type":"application/xml"}});
  var itemsR = await env.DB.prepare("SELECT slug,id,updated_at,published_at,created_at FROM media_items WHERE status='published'").all();
  var items = itemsR.results || [];
  var domain = X("DOMAIN", "example.com");
  var xml = '<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">';
  xml += '<url><loc>https://'+domain+'/</loc><changefreq>daily</changefreq></url>';
  xml += '<url><loc>https://'+domain+'/about</loc><changefreq>monthly</changefreq></url>';
  for (var si = 0; si < items.length; si++) {
    var lm = (items[si].updated_at||items[si].published_at||items[si].created_at||"").replace(" ","T")+"Z";
    xml += '<url><loc>https://'+domain+'/item/'+d(items[si].slug||items[si].id)+'</loc><lastmod>'+d(lm)+'</lastmod><changefreq>weekly</changefreq></url>';
  }
  xml += '</urlset>';
  return new Response(xml, {headers:{"Content-Type":"application/xml; charset=utf-8"}});
}

// ===== FAVICON =====
function serveFavicon() {
  var svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><defs><linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" style="stop-color:#0071e3"/><stop offset="100%" style="stop-color:#5b9bff"/></linearGradient></defs><rect width="32" height="32" rx="7" fill="url(#g)"/><rect x="6" y="8" width="20" height="16" rx="2" fill="none" stroke="#fff" stroke-width="2" opacity=".9"/><circle cx="11" cy="13" r="2" fill="#fff" opacity=".9"/><path d="M26,22 L20,14 L13,19 L8,15" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" opacity=".9"/></svg>';
  return new Response(svg, {headers:{"Content-Type":"image/svg+xml"}});
}

// ===== ROBOTS =====
function serveRobots(origin) { return new Response("User-agent: *\nAllow: /\nSitemap: "+origin+"/sitemap.xml\n", {headers:{"Content-Type":"text/plain"}}); }

// ===== API ROUTER =====
async function handleAPI(req, env, path) {
  var method = req.method;
  var initSecret = X("INIT_SECRET", "");

  // INIT
  if (initSecret && path === "/api/init/" + initSecret) {
    if (!hasDB(env)) return h({error:"数据库未绑定，请到 CF 控制台绑定 D1 数据库后重试"}, 500);
    console.log("[init] 开始初始化数据库 (v39.0)");
    var r = await initDB(env.DB);
    console.log("[init] 结果: " + JSON.stringify(r));
    return h(r, r.error ? 500 : 200);
  }
  if (path === "/api/init") {
    if (!hasDB(env)) return h({error:"数据库未绑定"}, 500);
    try {
      var b = await req.json();
      if (!b || b.secret !== initSecret) return h({error:"无效密钥"}, 401);
      var r2 = await initDB(env.DB);
      return h(r2, r2.error ? 500 : 200);
    } catch(e) {
      return h({error:"请求格式错误: " + e.message}, 400);
    }
  }

  // DEBUG
  if (path === "/api/debug/env") {
    var ek = Object.keys(env || {});
    var ed = {};
    for (var ei = 0; ei < ek.length; ei++) {
      var k = ek[ei], v = env[k];
      if (typeof v === "string") ed[k] = {set:true, len:v.length};
      else if (typeof v === "object" && v !== null) ed[k] = {set:true, type:typeof v};
      else ed[k] = {set:true, type:typeof v};
    }
    return h({env_keys:ek, data:ed});
  }

  // PUBLIC SETTINGS
  if (path === "/api/public/settings" && method === "GET") {
    if (!hasDB(env)) return h({});
    var rows = await env.DB.prepare("SELECT k, v FROM site_settings").all();
    var st = {};
    var rs = rows.results || [];
    for (var si = 0; si < rs.length; si++) st[rs[si].k] = rs[si].v;
    return h(st);
  }

  // STATS
  if (path === "/api/stats" && method === "GET") {
    if (!hasDB(env)) return h({total:0,published:0,drafts:0,views:0});
    var t1 = await env.DB.prepare("SELECT COUNT(*) as c FROM media_items").first();
    var t2 = await env.DB.prepare("SELECT COUNT(*) as c FROM media_items WHERE status='published'").first();
    var t3 = await env.DB.prepare("SELECT COUNT(*) as c FROM media_items WHERE status='draft'").first();
    var t4 = await env.DB.prepare("SELECT COALESCE(SUM(views),0) as s FROM media_items").first();
    return h({total:t1?t1.c:0, published:t2?t2.c:0, drafts:t3?t3.c:0, views:t4?t4.s:0});
  }

  // LIST
  if (path === "/api/items" && method === "GET") {
    if (!hasDB(env)) return h({items:[],total:0,page:1,pageSize:24});
    var url = new URL(req.url);
    var page = parseInt(url.searchParams.get("page")||"1", 10);
    var status = url.searchParams.get("status")||"";
    var search = url.searchParams.get("search")||"";
    var ps = parseInt(X("PAGE_SIZE","24"), 10);
    var conds = [];
    var binds = [];
    if (status) { conds.push("status=?"); binds.push(status); }
    if (search) { conds.push("(title LIKE ? OR description LIKE ?)"); binds.push("%"+search+"%","%"+search+"%"); }
    var where = conds.length > 0 ? "WHERE " + conds.join(" AND ") : "";
    var cSql = "SELECT COUNT(*) as c FROM media_items " + where;
    var cR;
    if (binds.length === 0) cR = await env.DB.prepare(cSql).first();
    else if (binds.length === 1) cR = await env.DB.prepare(cSql).bind(binds[0]).first();
    else cR = await env.DB.prepare(cSql).bind(binds[0], binds[1]).first();
    var off = (page-1)*ps;
    var iSql = "SELECT * FROM media_items " + where + " ORDER BY COALESCE(weight,0) DESC, COALESCE(published_at,created_at) DESC LIMIT ? OFFSET ?";
    var iP = env.DB.prepare(iSql);
    var iA;
    if (binds.length === 0) iA = await iP.bind(ps, off).all();
    else if (binds.length === 1) iA = await iP.bind(binds[0], ps, off).all();
    else iA = await iP.bind(binds[0], binds[1], ps, off).all();
    return h({items:iA.results||[], total:cR?cR.c:0, page:page, pageSize:ps});
  }

  // AUTH CHECK
  var authed = await checkAuth(req, env);

  // LOGIN
  if (path === "/api/login" && method === "POST") {
    if (!hasDB(env)) return h({error:"数据库未绑定"}, 500);
    try {
      var lb = await req.json();
      var user = (lb.username||"admin").trim();
      var pass = lb.password || "";
      console.log("[login] attempt: " + user);
      var ur = await env.DB.prepare("SELECT * FROM admins WHERE username=? AND password=?").bind(user, pass).first();
      if (ur) {
        var sid = "";
        var enc = new TextEncoder();
        var sbuf = await crypto.subtle.digest("SHA-256", enc.encode(user + pass + Date.now()));
        var sa = new Uint8Array(sbuf);
        for (var si = 0; si < sa.length; si++) {
          var sh = sa[si].toString(36);
          sid += sh.length === 1 ? "0" + sh : sh;
        }
        sid = sid.slice(0, 16);
        if (hasCache(env)) await env.cache.put("session_" + sid, String(ur.id), {expirationTtl:86400});
        console.log("[login] success, sid=" + sid);
        return h({ok:true, sid:sid}, 200, {"Set-Cookie":"session="+sid+"; Path=/; HttpOnly; Max-Age=86400; SameSite=Lax"});
      }
      console.log("[login] failed: wrong password");
      return h({error:"用户名或密码错误"}, 401);
    } catch(e) {
      return h({error:"请求格式错误: " + e.message}, 400);
    }
  }

  // 未登录拦截
  if (!authed && path !== "/api/login") return h({error:"未授权"}, 401);

  // LOGOUT
  if (path === "/api/logout" && method === "POST") {
    var cs = getCookie(req, "session");
    if (cs && hasCache(env)) await env.cache.delete("session_"+cs).catch(function(){});
    return h({ok:true}, 200, {"Set-Cookie":"session=; Path=/; HttpOnly; Max-Age=0"});
  }

  // CREATE
  if (path === "/api/items" && method === "POST") {
    if (!hasDB(env)) return h({error:"数据库未绑定"}, 500);
    try {
      var j = await req.json();
      if (!j.title) return h({error:"标题不能为空"}, 400);
      var nid = await genHashId(j.title + (j.custom_link||""));
      var nslug = j.slug || slugify(j.title);
      var ts = nowTs();
      var gal = j.gallery_keys || [];
      if (typeof gal === "string") { try { gal = JSON.parse(gal); } catch(e) { gal = []; } }
      var tags = j.tags || [];
      if (typeof tags === "string") { try { tags = JSON.parse(tags); } catch(e) { tags = []; } }
      var hV = !!j.content_key, hI = !!j.cover_key, hT = !!(j.content_text && j.content_text.length > 0), hG = gal.length > 0;
      var iT = "mixed";
      if (hV && !hI && !hT && !hG) iT = "video";
      else if (hI && !hV && !hT && !hG) iT = "image";
      else if (hT && !hI && !hV && !hG) iT = "text";
      if (j.type) iT = j.type;
      await env.DB.prepare(
        "INSERT INTO media_items (id,slug,title,description,type,content_key,content_text,cover_key,gallery_keys,attachment_key,attachment_name,category,tags,status,password,published_at,expires_at,weight,meta_description,meta_keywords,custom_css_class,custom_link,link_target,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)"
      ).bind(
        nid, nslug, j.title||"", j.description||"", iT, j.content_key||null, j.content_text||"", j.cover_key||null, JSON.stringify(gal), j.attachment_key||null, j.attachment_name||"", j.category||"default", JSON.stringify(tags), j.status||"published", j.password||null, ts, null, j.weight||0, "", "", "", j.custom_link||"", j.link_target||"_self", ts, ts
      ).run();
      return h({ok:true, id:nid, slug:nslug, type:iT, message:"创建成功"});
    } catch(e) {
      console.error("[create] error: " + e.message);
      return h({error:"请求格式错误: " + e.message}, 400);
    }
  }

  // UPDATE
  if (path.indexOf("/api/items/") === 0 && method === "PUT") {
    if (!hasDB(env)) return h({error:"数据库未绑定"}, 500);
    try {
      var eid = path.substring(11).split("?")[0].split("/")[0].trim();
      if (!eid) return h({error:"无效ID"}, 400);
      console.log("[update] id=" + eid);
      var uj = await req.json();
      var uts = nowTs();
      var ugal = uj.gallery_keys || [];
      if (typeof ugal === "string") { try { ugal = JSON.parse(ugal); } catch(e) { ugal = []; } }
      var utags = uj.tags || [];
      if (typeof utags === "string") { try { utags = JSON.parse(utags); } catch(e) { utags = []; } }
      await env.DB.prepare(
        "UPDATE media_items SET title=?,description=?,type=?,content_key=?,content_text=?,cover_key=?,gallery_keys=?,attachment_key=?,attachment_name=?,category=?,tags=?,status=?,password=?,published_at=?,expires_at=?,weight=?,custom_link=?,link_target=?,updated_at=? WHERE id=?"
      ).bind(
        uj.title||"", uj.description||"", uj.type||"mixed", uj.content_key||null, uj.content_text||"", uj.cover_key||null, JSON.stringify(ugal), uj.attachment_key||null, uj.attachment_name||"", uj.category||"default", JSON.stringify(utags), uj.status||"published", uj.password||null, uj.published_at||null, null, uj.weight||0, uj.custom_link||"", uj.link_target||"_self", uts, eid
      ).run();
      return h({ok:true});
    } catch(e) {
      console.error("[update] error: " + e.message);
      return h({error:"请求格式错误: " + e.message}, 400);
    }
  }

  // DELETE
  if (path.indexOf("/api/items/") === 0 && method === "DELETE") {
    if (!hasDB(env)) return h({error:"数据库未绑定"}, 500);
    try {
      var delPath = path.substring(11);
      var delId = delPath.split("?")[0].split("/")[0].trim();
      console.log("[delete] raw path=" + path + " extracted id=" + delId);
      if (!delId) return h({error:"无效ID"}, 400);

      var existing = await env.DB.prepare("SELECT * FROM media_items WHERE id=?").bind(delId).first();
      if (!existing) existing = await env.DB.prepare("SELECT * FROM media_items WHERE slug=?").bind(delId).first();
      if (!existing) {
        var likeId = delId.length > 6 ? delId.slice(-6) : delId;
        existing = await env.DB.prepare("SELECT * FROM media_items WHERE id LIKE ? OR slug LIKE ?").bind("%"+likeId, "%"+likeId).first();
      }
      if (!existing) return h({error:"内容不存在: " + delId}, 404);

      console.log("[delete] found item: " + existing.id + " title=" + existing.title);

      await env.DB.prepare("DELETE FROM media_items WHERE id=?").bind(existing.id).run();

      var ktd = [];
      if (existing.cover_key) ktd.push(existing.cover_key);
      if (existing.content_key) ktd.push(existing.content_key);
      if (existing.attachment_key) ktd.push(existing.attachment_key);
      try {
        var dgal = JSON.parse(existing.gallery_keys||"[]");
        for (var dgi = 0; dgi < dgal.length; dgi++) ktd.push(dgal[dgi]);
      } catch(e) {}
      if (hasKV(env)) {
        for (var dki = 0; dki < ktd.length; dki++) {
          await env.kv.delete(ktd[dki]).catch(function(){});
        }
      }
      console.log("[delete] success, removed " + ktd.length + " files");
      return h({ok:true, message:"已删除"});
    } catch(e) {
      console.error("[delete] error: " + e.message);
      return h({error:"删除失败: " + e.message}, 500);
    }
  }

  // UPLOAD
  if (path === "/api/upload" && method === "POST") {
    return await handleUpload(req, env);
  }

  // SETTINGS
  if (path === "/api/settings" && method === "PUT") {
    if (!hasDB(env)) return h({error:"数据库未绑定"}, 500);
    try {
      var sb = await req.json();
      if (sb.brand_name) await setSetting(env.DB, "brand_name", sb.brand_name);
      if (sb.theme_color) await setSetting(env.DB, "theme_color", sb.theme_color);
      if (sb.page_size) await setSetting(env.DB, "page_size", String(sb.page_size));
      if (sb.about_html !== undefined) await setSetting(env.DB, "about_html", sb.about_html);
      if (sb.wechat_verify_name !== undefined) await setSetting(env.DB, "wechat_verify_name", sb.wechat_verify_name);
      if (sb.wechat_verify_content !== undefined) await setSetting(env.DB, "wechat_verify_content", sb.wechat_verify_content);
      return h({ok:true, message:"设置已保存"});
    } catch(e) {
      return h({error:"保存失败: " + e.message}, 400);
    }
  }

  return h({error:"未找到: " + path}, 404);
}

// ===== MAIN HANDLER =====
async function handleRequest(req, env) {
  dt(env);
  try {
    var url = new URL(req.url);
    var path = url.pathname;

    // WeChat verification file — served at root without auth
    if (hasDB(env) && path.length > 1 && !path.startsWith("/api/") && !path.startsWith("/file/") && path !== "/admin" && path !== "/about" && path !== "/rss.xml" && path !== "/sitemap.xml" && path !== "/robots.txt" && path !== "/favicon.ico" && !path.startsWith("/item/")) {
      var wxName = await getSetting(env.DB, "wechat_verify_name", "");
      if (wxName && path === "/" + wxName) {
        var wxContent = await getSetting(env.DB, "wechat_verify_content", "");
        return new Response(wxContent || "", { status: 200, headers: { "Content-Type": "text/plain; charset=utf-8" } });
      }
    }

    if (path.indexOf("/api/") === 0) return await handleAPI(req, env, path);
    if (path.indexOf("/file/") === 0) return await serveFile(path.substring(6), env);
    if (path === "/admin") return await serveAdmin(req, env);
    if (path === "/about") return await serveAbout(env);
    if (path === "/rss.xml") return await serveRSS(env);
    if (path === "/sitemap.xml") return await serveSitemap(env);
    if (path === "/robots.txt") return serveRobots(url.origin);
    if (path === "/favicon.ico") return serveFavicon();
    if (path.indexOf("/item/") === 0) return await serveItem(req, env, path.substring(6));

    return await serveHome(req, env);
  } catch(e) {
    console.error("[main] uncaught error: " + e.message + " | stack: " + (e.stack||""));
    return new Response(
      '<!DOCTYPE html><html><head><meta charset="utf-8"><title>500</title></head><body style="font-family:sans-serif;padding:2rem;text-align:center"><h1>500 服务器错误</h1><p>'+d(e.message||"未知错误")+'</p><p><a href="/">返回首页</a></p></body></html>',
      {status:500, headers:{"Content-Type":"text/html; charset=utf-8"}}
    );
  }
}

// ===== EXPORT =====
var worker = { fetch: handleRequest };
export default worker;
