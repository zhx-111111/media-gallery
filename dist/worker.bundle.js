// src/worker.js
var worker_default = { async fetch(r, env) {
  try {
    return await handle(r, env);
  } catch (e) {
    return errR(e);
  }
} };
var errR = (e, st = 500) => new Response("Error: " + e.message, { status: st, headers: { "Content-Type": "text/plain;charset=utf-8" } });
var jR = (d) => new Response(JSON.stringify(d), { headers: { "Content-Type": "application/json" } });
var htmlR = (h) => new Response(h, { "Content-Type": "text/html;charset=utf-8" });
var sha256 = async (t) => {
  const e = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(t));
  return [...new Uint8Array(e)].map((b) => b.toString(16).padStart(2, "0")).join("");
};
var esc = (s) => !s ? "" : String(s).replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch]);
var slugify = (s) => !s ? "" : String(s).toLowerCase().replace(/[^a-z0-9\u4e00-\u9fa5]+/g, "-").replace(/^[-]+|[-]+$/g, "").substring(0, 80);
var jParse = (s, d) => {
  try {
    return JSON.parse(s || "null") || d;
  } catch (e) {
    return d;
  }
};
var fmtDate = (s) => !s ? "" : new Date(s).toLocaleDateString("zh-CN", { year: "numeric", month: "short", day: "numeric" });
var enc = encodeURIComponent;
var rand = (k) => {
  let s = "";
  const c = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  for (let i = 0; i < k; i++) s += c[Math.floor(Math.random() * c.length)];
  return s;
};
var CSS = [
  `:root{
  --bg-base:#ECEEF6;--bg-elev:rgba(255,255,255,.70);
  --text-1:#1C1C1E;--text-2:#5A5A62;--text-3:#9A9AA2;
  --accent:#0071E3;--accent-h:#0077ED;--accent-soft:rgba(0,113,227,.10);--accent-ring:rgba(0,113,227,.22);
  --danger:#FF3B30;--success:#34C759;--warn:#FF9500;
  --g-blue:linear-gradient(135deg,#0071E3,#5E5CE6);--g-purple:linear-gradient(135deg,#5E5CE6,#BF5AF2);
  --g-pink:linear-gradient(135deg,#FF2D55,#FF375F);--g-teal:linear-gradient(135deg,#30B0C7,#00C7BE);
  --g-orange:linear-gradient(135deg,#FF9500,#FF6B35);--g-green:linear-gradient(135deg,#34C759,#30D158);
  --glass:rgba(255,255,255,.55);--glass-s:rgba(255,255,255,.72);--glass-w:rgba(255,255,255,.35);
  --blur:blur(28px) saturate(200%);--blur-lg:blur(44px) saturate(220%);
  --gb:1px solid rgba(255,255,255,.55);
  --glow:inset 0 1px 0 rgba(255,255,255,.65),inset 0 -1px 0 rgba(0,0,0,.04);
  --s1:0 1px 3px rgba(0,0,0,.04),inset 0 1px 0 rgba(255,255,255,.55);
  --s2:0 2px 14px rgba(0,0,0,.05),inset 0 1px 0 rgba(255,255,255,.50);
  --s3:0 4px 22px rgba(0,0,0,.06),inset 0 1px 0 rgba(255,255,255,.45);
  --s4:0 8px 38px rgba(0,0,0,.08),inset 0 1px 0 rgba(255,255,255,.40);
  --sg:0 0 28px rgba(0,113,227,.28);
  --r1:8px;--r2:12px;--r3:16px;--r4:22px;--r5:30px;--pill:999px;
  --font:-apple-system,BlinkMacSystemFont,'SF Pro Display','PingFang SC','Helvetica Neue',sans-serif;
  --fs-d:clamp(2.2rem,6vw,3.8rem);--fs-h1:clamp(1.6rem,3.8vw,2.2rem);--fs-h2:1.3rem;--fs-h3:1.1rem;
`,
  `  --fs-b:0.95rem;--fs-bl:1.05rem;--fs-c:0.82rem;--fs-m:0.72rem;
  --fw-r:400;--fw-m:500;--fw-s:600;--fw-b:700;--fw-x:800;
  --lh-t:1.12;--lh-s:1.35;--lh-n:1.55;--lh-r:1.7;
  --tk:-0.035em;--tn:-0.01em;
  --ease:cubic-bezier(.4,0,.2,1);--spring:cubic-bezier(.34,1.56,.64,1);
  --t-f:220ms;--t-b:360ms;--t-s:520ms;
  --sp1:4px;--sp2:8px;--sp3:12px;--sp4:16px;--sp5:24px;--sp6:32px;--sp7:48px;--sp8:64px;
  --w-n:720px;--w-b:960px;--w-w:1200px;
  --bd:rgba(0,0,0,.08);
}
*,*::before,*::after{margin:0;padding:0;box-sizing:border-box;}
html{scroll-behavior:smooth;-webkit-text-size-adjust:100%;}
body{font-family:var(--font);font-size:var(--fs-b);line-height:var(--lh-n);color:var(--text-1);background:var(--bg-base);min-height:100vh;-webkit-font-smoothing:antialiased;letter-spacing:var(--tn);position:relative;overflow-x:hidden;transition:background var(--t-s) var(--ease),color var(--t-s) var(--ease);}
body::before{content:'';position:fixed;inset:-20%;z-index:-2;background:radial-gradient(ellipse 55% 45% at 12% 18%,rgba(99,102,241,.20),transparent 70%),radial-gradient(ellipse 48% 55% at 88% 28%,rgba(168,85,247,.16),transparent 70%),radial-gradient(ellipse 52% 42% at 50% 82%,rgba(56,189,248,.18),transparent 70%),radial-gradient(ellipse 38% 48% at 78% 78%,rgba(52,211,153,.14),transparent 70%),radial-gradient(ellipse 42% 52% at 22% 68%,rgba(236,72,153,.11),transparent 70%),linear-gradient(165deg,#E8EAF5,#DFE3F5 30%,#E2DFF5 60%,#DCE5F0);animation:aurora 28s ease-in-out infinite;`,
  `will-change:transform;}
body::after{content:'';position:fixed;inset:0;z-index:-1;pointer-events:none;background:radial-gradient(circle 280px at var(--mx,50%) var(--my,30%),rgba(255,255,255,.45),transparent 70%);}
@keyframes aurora{0%,100%{transform:translate(0,0) rotate(0) scale(1);}20%{transform:translate(-2%,1.5%) rotate(.8deg) scale(1.02);}40%{transform:translate(1.5%,-1%) rotate(-.5deg) scale(1.01);}60%{transform:translate(-1%,2%) rotate(.5deg) scale(1.03);}80%{transform:translate(2%,-1.5%) rotate(-.3deg) scale(1.01);}}
a{color:var(--accent);text-decoration:none;transition:color var(--t-f) var(--ease);}a:hover{color:var(--accent-h);}
button{font-family:inherit;cursor:pointer;border:none;background:none;}
img,video{max-width:100%;display:block;}
input,textarea,select{font-family:inherit;font-size:inherit;color:inherit;}
@media (prefers-reduced-motion:reduce){*,*::before,*::after{animation-duration:.01ms!important;animation-iteration-count:1!important;transition-duration:.01ms!important;scroll-behavior:auto!important;}body::before{animation:none;}}

/* Nav */
.nav{position:sticky;top:0;z-index:100;background:rgba(255,255,255,.42);backdrop-filter:blur(36px) saturate(220%);-webkit-backdrop-filter:blur(36px) saturate(220%);border-bottom:var(--gb);box-shadow:var(--glow),0 4px 28px rgba(0,0,0,.04);}
.nav-in{max-width:var(--w-w);margin:0 auto;padding:var(--sp3) var(--sp5);display:flex;align-items:center;justify-content:space-between;gap:var(--sp4);}
`,
  `.brand{font-size:1.18rem;font-weight:var(--fw-x);letter-spacing:var(--tk);background:var(--g-blue);background-size:200% 200%;-webkit-background-clip:text;-webkit-text-fill-color:transparent;animation:bs 8s ease infinite;filter:drop-shadow(0 1px 10px rgba(0,113,227,.18));}
@keyframes bs{0%,100%{background-position:0% 50%}50%{background-position:100% 50%}}
.nav-l{display:flex;align-items:center;gap:var(--sp2);flex-wrap:wrap;}
.nav-a{display:inline-flex;align-items:center;padding:6px var(--sp3);border-radius:var(--pill);font-size:var(--fs-c);color:var(--text-2);transition:all var(--t-f) var(--ease);}
.nav-a:hover{background:var(--glass);color:var(--text-1);transform:translateY(-1px);}
.nav-a.act{background:rgba(0,113,227,.10);color:var(--accent);}
.nav-r{display:flex;align-items:center;gap:var(--sp2);}

/* Hero */
.hero{position:relative;padding:var(--sp8) var(--sp5);text-align:center;max-width:var(--w-w);margin:0 auto;}
.hero-bg{position:absolute;inset:0;z-index:-1;border-radius:var(--r5);overflow:hidden;}
.hero-bg video,.hero-bg img{width:100%;height:100%;object-fit:cover;}
.hero-bg::after{content:'';position:absolute;inset:0;background:rgba(255,255,255,.35);backdrop-filter:blur(12px);}
.ht{font-size:var(--fs-d);font-weight:var(--fw-x);letter-spacing:var(--tk);line-height:var(--lh-t);background:var(--g-blue);background-size:200% 200%;-webkit-background-clip:text;-webkit-text-fill-color:transparent;animation:bs 10s ease infinite;margin-bottom:var(--sp3);}
`,
  `.hs{font-size:var(--fs-bl);color:var(--text-2);max-width:640px;margin:0 auto var(--sp5);line-height:var(--lh-r);}
.ha{display:flex;gap:var(--sp3);justify-content:center;flex-wrap:wrap;}

/* Filter chips */
.fbar{display:flex;gap:var(--sp2);justify-content:center;flex-wrap:wrap;padding:var(--sp4) var(--sp5);max-width:var(--w-w);margin:0 auto;}
.chip{display:inline-flex;align-items:center;padding:var(--sp1) var(--sp3);border-radius:var(--pill);font-size:var(--fs-m);font-weight:var(--fw-m);background:var(--glass);color:var(--text-2);border:var(--gb);backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);transition:all var(--t-f) var(--ease);box-shadow:var(--s1);cursor:pointer;text-decoration:none;}
.chip:hover{background:var(--glass-s);color:var(--text-1);transform:translateY(-1px);box-shadow:var(--s2);}
.chip.act{background:rgba(0,113,227,.12);color:var(--accent);border-color:rgba(0,113,227,.35);box-shadow:0 0 14px rgba(0,113,227,.12),inset 0 1px 0 rgba(255,255,255,.35);}

/* Grid + Cards */
.gg{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:var(--sp5);padding:var(--sp4) var(--sp5) var(--sp7);max-width:var(--w-w);margin:0 auto;}
`,
  `.card{background:var(--glass-s);border:var(--gb);border-radius:var(--r4);overflow:hidden;box-shadow:var(--s2);backdrop-filter:var(--blur);-webkit-backdrop-filter:var(--blur);transition:transform var(--t-b) var(--spring),box-shadow var(--t-b) var(--ease),border-color var(--t-b) var(--ease);position:relative;cursor:pointer;text-decoration:none;color:inherit;}
.card::before{content:'';position:absolute;inset:0;border-radius:inherit;pointer-events:none;z-index:1;background:linear-gradient(135deg,rgba(255,255,255,.45) 0%,transparent 50%);opacity:0;transition:opacity var(--t-b) var(--ease);}
.card:hover{transform:translateY(-6px) scale(1.012);box-shadow:var(--s4),var(--sg);border-color:rgba(255,255,255,.75);}
.card:hover::before{opacity:1;}
.cm{aspect-ratio:4/3;width:100%;display:flex;align-items:center;justify-content:center;color:rgba(255,255,255,.95);font-size:2.2rem;position:relative;overflow:hidden;background:#ddd;}
.cm img,.cm video{width:100%;height:100%;object-fit:cover;transition:transform var(--t-s) var(--ease);}
.card:hover .cm img,.card:hover .cm video{transform:scale(1.04);}
.cm::after{content:'';position:absolute;inset:0;background:linear-gradient(180deg,transparent 40%,rgba(0,0,0,.24) 100%);pointer-events:none;}
.cb{padding:var(--sp4) var(--sp5) var(--sp5);position:relative;z-index:2;}
`,
  `.ct{font-size:var(--fs-h3);font-weight:var(--fw-s);letter-spacing:var(--tk);line-height:var(--lh-s);margin-bottom:var(--sp1);display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;}
.cd{font-size:var(--fs-c);color:var(--text-2);line-height:var(--lh-s);display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;}
.cm2{display:flex;align-items:center;gap:var(--sp2);margin-top:var(--sp3);flex-wrap:wrap;}

/* Lazy + Skeleton */
.li{filter:blur(10px);transition:filter var(--t-s) var(--ease);}.li.loaded{filter:blur(0);}
.sk{background:linear-gradient(90deg,rgba(255,255,255,.4),rgba(255,255,255,.7),rgba(255,255,255,.4));background-size:200% 100%;animation:ss 1.5s ease infinite;}
@keyframes ss{0%{background-position:200% 0}100%{background-position:-200% 0}}

/* Badge */
.badge{display:inline-flex;align-items:center;gap:var(--sp1);padding:3px var(--sp2);border-radius:var(--r1);font-size:var(--fs-m);font-weight:var(--fw-s);color:#fff;backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);border:1px solid rgba(255,255,255,.30);box-shadow:0 2px 10px rgba(0,0,0,.10),inset 0 1px 0 rgba(255,255,255,.25);}
.bi{background:linear-gradient(135deg,rgba(0,113,227,.88),rgba(94,92,230,.85));}
.bv{background:linear-gradient(135deg,rgba(255,45,85,.88),rgba(255,55,95,.85));}
.bt{background:linear-gradient(135deg,rgba(79,172,254,.88),rgba(0,242,254,.85));}

/* Buttons */
`,
  `.btn{display:inline-flex;align-items:center;justify-content:center;gap:var(--sp2);padding:var(--sp2) var(--sp5);font-size:var(--fs-b);font-weight:var(--fw-m);border-radius:var(--r2);transition:all var(--t-f) var(--ease);letter-spacing:var(--tn);white-space:nowrap;border:var(--gb);backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);cursor:pointer;text-decoration:none;}
.bp{background:linear-gradient(135deg,rgba(0,113,227,.88),rgba(94,92,230,.84));color:#fff;box-shadow:0 2px 14px rgba(0,113,227,.32),inset 0 1px 0 rgba(255,255,255,.22);border-color:rgba(255,255,255,.35);}
.bp:hover{background:linear-gradient(135deg,rgba(0,119,237,.92),rgba(105,103,240,.88));transform:translateY(-2px);box-shadow:0 6px 24px rgba(0,113,227,.38),inset 0 1px 0 rgba(255,255,255,.28);color:#fff;}
.bg{background:var(--glass);color:var(--text-2);border:var(--gb);}
.bg:hover{background:var(--glass-s);color:var(--text-1);transform:translateY(-1px);box-shadow:var(--s2);}
.bd{color:var(--danger);border:1px solid rgba(255,59,48,.18);background:rgba(255,59,48,.05);}
.bd:hover{background:rgba(255,59,48,.10);box-shadow:0 0 14px rgba(255,59,48,.10);}
.bs{padding:4px var(--sp3);font-size:var(--fs-c);}

/* Detail */
.dh{position:relative;max-width:var(--w-b);margin:var(--sp6) auto;padding:0 var(--sp5);}
.dh img,.dh video{width:100%;border-radius:var(--r4);box-shadow:var(--s4);}
.db{max-width:var(--w-n);margin:0 auto;padding:var(--sp5);}
`,
  `.dt{font-size:var(--fs-h1);font-weight:var(--fw-b);letter-spacing:var(--tk);line-height:var(--lh-s);margin-bottom:var(--sp3);}
.dd{font-size:var(--fs-bl);color:var(--text-2);line-height:var(--lh-r);margin-bottom:var(--sp5);}
.dm{display:flex;gap:var(--sp3);align-items:center;flex-wrap:wrap;margin-bottom:var(--sp5);padding:var(--sp3) 0;border-top:1px solid var(--bd);border-bottom:1px solid var(--bd);}
.dc{font-size:var(--fs-b);line-height:var(--lh-r);color:var(--text-1);}
.dc p{margin-bottom:var(--sp4);}
.da{display:flex;gap:var(--sp3);margin-top:var(--sp5);flex-wrap:wrap;}

/* Vertical gallery */
.gs{display:flex;flex-direction:column;gap:var(--sp4);max-width:var(--w-b);margin:0 auto;padding:var(--sp4) var(--sp5);}
.gs .gi{position:relative;border-radius:var(--r3);overflow:hidden;box-shadow:var(--s3);background:var(--glass);}
.gs .gi img,.gs .gi video{width:100%;display:block;transition:transform var(--t-s) var(--ease);}
.gs .gi:hover img,.gs .gi:hover video{transform:scale(1.02);}

/* Announcement */
.ann{position:relative;max-width:var(--w-w);margin:var(--sp4) auto 0;padding:var(--sp3) var(--sp5);background:var(--glass-s);border:var(--gb);border-radius:var(--r3);backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);box-shadow:var(--s2);font-size:var(--fs-b);color:var(--text-1);line-height:var(--lh-n);}
`,
  `.ann .x{position:absolute;top:8px;right:12px;background:none;border:none;font-size:1.2rem;cursor:pointer;color:var(--text-3);padding:4px 8px;border-radius:var(--r1);}
.ann .x:hover{background:var(--glass);color:var(--text-1);}

/* Footer */
.ft{margin-top:var(--sp8);padding:var(--sp6) var(--sp5);text-align:center;font-size:var(--fs-c);color:var(--text-3);border-top:1px solid var(--bd);max-width:var(--w-w);margin-left:auto;margin-right:auto;}
.ft a{color:var(--text-2);margin:0 var(--sp2);}

/* Modal */
.mo{position:fixed;inset:0;z-index:200;background:rgba(0,0,0,.35);backdrop-filter:blur(6px);display:flex;align-items:center;justify-content:center;padding:var(--sp4);}
.md{background:var(--glass-s);border:var(--gb);border-radius:var(--r4);box-shadow:var(--s5);backdrop-filter:var(--blur-lg);-webkit-backdrop-filter:var(--blur-lg);max-width:720px;width:100%;max-height:90vh;overflow-y:auto;padding:var(--sp6);position:relative;}
.md h2{font-size:var(--fs-h2);font-weight:var(--fw-b);margin-bottom:var(--sp4);}
.mx{position:absolute;top:var(--sp3);right:var(--sp3);background:none;border:none;font-size:1.4rem;cursor:pointer;color:var(--text-3);padding:8px;border-radius:var(--r1);}
.mx:hover{background:var(--glass);color:var(--text-1);}

/* Form */
.fg{margin-bottom:var(--sp4);}
.fl{display:block;font-size:var(--fs-c);font-weight:var(--fw-m);color:var(--text-2);margin-bottom:6px;}
`,
  `.fi,.fta,.fs{width:100%;padding:var(--sp2) var(--sp3);border:1px solid var(--bd);border-radius:var(--r2);background:var(--glass);color:var(--text-1);font-size:var(--fs-b);transition:border-color var(--t-f) var(--ease),box-shadow var(--t-f) var(--ease);}
.fi:focus,.fta:focus,.fs:focus{outline:none;border-color:var(--accent);box-shadow:0 0 0 3px var(--accent-ring);}
.fta{min-height:100px;resize:vertical;}

/* Toast */
.to{position:fixed;bottom:var(--sp5);left:50%;transform:translateX(-50%) translateY(20px);padding:var(--sp3) var(--sp5);border-radius:var(--r3);font-size:var(--fs-b);font-weight:var(--fw-m);box-shadow:var(--s4);backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);opacity:0;transition:all var(--t-b) var(--ease);z-index:300;pointer-events:none;}
.to.show{opacity:1;transform:translateX(-50%) translateY(0);}
.ts{background:rgba(52,199,89,.92);color:#fff;}
.te{background:rgba(255,59,48,.92);color:#fff;}
.ti{background:rgba(0,113,227,.92);color:#fff;}

/* FAB */
.fab{position:fixed;bottom:var(--sp5);right:var(--sp5);width:56px;height:56px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:1.5rem;background:linear-gradient(135deg,rgba(0,113,227,.88),rgba(94,92,230,.84));color:#fff;box-shadow:0 6px 28px rgba(0,113,227,.35),inset 0 1px 0 rgba(255,255,255,.25);border:1px solid rgba(255,255,255,.35);backdrop-filter:blur(14px);cursor:pointer;z-index:150;transition:all var(--t-f) var(--ease);}
`,
  `.fab:hover{transform:scale(1.08);box-shadow:0 10px 36px rgba(0,113,227,.42);}

/* Pagination */
.pg{display:flex;gap:var(--sp2);justify-content:center;padding:var(--sp5);max-width:var(--w-w);margin:0 auto;}
.pb{padding:var(--sp2) var(--sp4);border-radius:var(--pill);font-size:var(--fs-c);background:var(--glass);color:var(--text-2);border:var(--gb);backdrop-filter:blur(10px);cursor:pointer;transition:all var(--t-f) var(--ease);}
.pb:hover{background:var(--glass-s);color:var(--text-1);}
.pb.act{background:var(--accent);color:#fff;box-shadow:0 0 14px rgba(0,113,227,.30);}

/* Admin Table */
.at{width:100%;border-collapse:collapse;font-size:var(--fs-c);}
.at th{text-align:left;padding:var(--sp3);font-weight:var(--fw-s);color:var(--text-2);border-bottom:2px solid var(--bd);background:var(--glass);position:sticky;top:0;z-index:10;}
.at td{padding:var(--sp3);border-bottom:1px solid var(--bd);vertical-align:middle;}
.at tr:hover td{background:rgba(255,255,255,.30);}

/* Status dots */
.sd{display:inline-block;width:8px;height:8px;border-radius:50%;margin-right:4px;}
.sp{background:var(--success);box-shadow:0 0 8px rgba(52,199,89,.40);}
.sd2{background:var(--warn);box-shadow:0 0 8px rgba(255,149,0,.40);}
.sh{background:var(--text-3);}

/* Stat cards */
.sc{background:var(--glass-s);border:var(--gb);border-radius:var(--r3);padding:var(--sp4);box-shadow:var(--s2);backdrop-filter:blur(20px);position:relative;overflow:hidden;}
`,
  `.sc::before{content:'';position:absolute;left:0;top:0;bottom:0;width:3px;border-radius:var(--r3) 0 0 var(--r3);}
.sc.b::before{background:var(--g-blue);}.sc.g::before{background:var(--g-green);}.sc.o::before{background:var(--g-orange);}.sc.p::before{background:var(--g-purple);}
.scn{font-size:1.8rem;font-weight:var(--fw-x);letter-spacing:var(--tk);}
.scl{font-size:var(--fs-m);color:var(--text-2);margin-top:4px;}

/* Dark mode */
body.dark{--bg-base:#0D0D0F;--bg-elev:rgba(28,28,30,.85);--text-1:#F5F5F7;--text-2:#A1A1A6;--text-3:#6E6E73;--bd:rgba(255,255,255,.08);--glass:rgba(28,28,30,.55);--glass-s:rgba(40,40,44,.72);--glass-w:rgba(28,28,30,.35);}
body.dark::before{filter:brightness(.6) saturate(1.2);}
body.dark .nav{background:rgba(20,20,22,.55);}
body.dark .card{background:rgba(40,40,44,.65);}
body.dark .md{background:rgba(35,35,38,.85);}
body.dark .fi,body.dark .fta,body.dark .fs{background:rgba(50,50,54,.60);color:#F5F5F7;border-color:rgba(255,255,255,.10);}

/* Related */
.rr{max-width:var(--w-w);margin:var(--sp7) auto;padding:0 var(--sp5);}
.rt{font-size:var(--fs-h2);font-weight:var(--fw-b);margin-bottom:var(--sp4);}
.rg{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:var(--sp4);}

/* Copy + Attach */
`,
  `.cl{display:inline-flex;align-items:center;gap:6px;padding:var(--sp2) var(--sp4);border-radius:var(--pill);font-size:var(--fs-c);background:var(--glass);color:var(--text-2);border:var(--gb);backdrop-filter:blur(10px);cursor:pointer;transition:all var(--t-f) var(--ease);}
.cl:hover{background:var(--accent-soft);color:var(--accent);transform:translateY(-1px);}
.ab{display:inline-flex;align-items:center;gap:6px;padding:var(--sp2) var(--sp4);border-radius:var(--r2);font-size:var(--fs-c);background:var(--accent-soft);color:var(--accent);border:1px solid rgba(0,113,227,.20);transition:all var(--t-f) var(--ease);}
.ab:hover{background:rgba(0,113,227,.16);transform:translateY(-1px);}

/* Theme toggle */
.th{display:inline-flex;align-items:center;justify-content:center;width:40px;height:40px;border-radius:50%;background:var(--glass);border:var(--gb);backdrop-filter:blur(10px);cursor:pointer;font-size:1.2rem;transition:all var(--t-f) var(--ease);}
.th:hover{background:var(--glass-s);transform:scale(1.1);}

/* Init page */
.init-box{max-width:520px;margin:var(--sp8) auto;padding:var(--sp7) var(--sp6);background:var(--glass-s);border:var(--gb);border-radius:var(--r4);box-shadow:var(--s4);backdrop-filter:var(--blur-lg);-webkit-backdrop-filter:var(--blur-lg);text-align:center;}
.init-box h1{font-size:var(--fs-h1);font-weight:var(--fw-b);margin-bottom:var(--sp4);background:var(--g-blue);-webkit-background-clip:text;-webkit-text-fill-color:transparent;}
`,
  `.init-box p{color:var(--text-2);line-height:var(--lh-r);margin-bottom:var(--sp4);}
.init-box .steps{text-align:left;background:rgba(255,255,255,.30);border-radius:var(--r3);padding:var(--sp4) var(--sp5);margin-bottom:var(--sp5);}
.init-box .steps ol{margin-left:var(--sp5);line-height:var(--lh-n);color:var(--text-1);}
.init-box .steps li{margin-bottom:var(--sp2);}
`
].join("");
var _dbReady = false;
async function initDB(env) {
  if (_dbReady) return;
  try {
    const t = await env.db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='media_items'").first();
    if (t) {
      _dbReady = true;
      return;
    }
  } catch (e) {
  }
  const stmts = [
    "CREATE TABLE IF NOT EXISTS media_items(id INTEGER PRIMARY KEY AUTOINCREMENT,type TEXT NOT NULL,title TEXT NOT NULL,description TEXT DEFAULT '',content TEXT NOT NULL,thumbnail_key TEXT DEFAULT NULL,tags TEXT DEFAULT '',sort_order INTEGER DEFAULT 0,is_public INTEGER DEFAULT 0,created_at TEXT DEFAULT(datetime('now')),updated_at TEXT DEFAULT(datetime('now')),slug TEXT UNIQUE,custom_slug TEXT DEFAULT NULL,cover_key TEXT DEFAULT NULL,category TEXT DEFAULT '',seo_description TEXT DEFAULT '',seo_keywords TEXT DEFAULT '',publish_at TEXT DEFAULT NULL,expire_at TEXT DEFAULT NULL,sort_weight INTEGER DEFAULT 0,is_hidden INTEGER DEFAULT 0,gallery_keys TEXT DEFAULT '[]',attachment_key TEXT DEFAULT NULL,attachment_name TEXT DEFAULT '',custom_css_class TEXT DEFAULT '',views INTEGER DEFAULT 0)",
    "CREATE INDEX IF NOT EXISTS idx_type ON media_items(type)",
    "CREATE INDEX IF NOT EXISTS idx_public ON media_items(is_public)",
    "CREATE INDEX IF NOT EXISTS idx_cslug ON media_items(custom_slug)",
    "CREATE TABLE IF NOT EXISTS admins(id INTEGER PRIMARY KEY AUTOINCREMENT,username TEXT UNIQUE NOT NULL,password_hash TEXT NOT NULL,created_at TEXT DEFAULT(datetime('now')))",
    "CREATE TABLE IF NOT EXISTS site_settings(k TEXT PRIMARY KEY,v TEXT NOT NULL,updated_at TEXT DEFAULT(datetime('now')))"
  ];
  for (const s of stmts) {
    try {
      await env.db.prepare(s).run();
    } catch (e) {
      console.error("init SQL error:", e.message, "stmt:", s.substring(0, 60));
    }
  }
  const pwd = env.ADMIN_PASSWORD || env.INIT_SECRET || "admin123";
  await env.db.prepare("INSERT OR IGNORE INTO admins(username,password_hash) VALUES(?,?)").bind("admin", await sha256(pwd)).run();
  const brand = env.DEFAULT_BRAND || "Gallery";
  const defs = [
    ["site_title", "\u7CBE\u9009\u4F5C\u54C1"],
    ["site_subtitle", "\u56FE\u7247 \xB7 \u89C6\u9891 \xB7 \u6587\u5B57 \u2014 \u4E00\u5207\u7CBE\u5F69\uFF0C\u5C3D\u6536\u773C\u5E95"],
    ["brand_name", brand],
    ["theme_accent", "#0071E3"],
    ["theme_dark_mode", "off"],
    ["hero_bg_type", "gradient"],
    ["hero_gradient", ""],
    ["hero_image_key", ""],
    ["hero_video_url", ""],
    ["footer_html", ""],
    ["announcement_html", ""],
    ["nav_links", "[]"],
    ["about_html", ""],
    ["copy_link_text", "\u590D\u5236\u94FE\u63A5"],
    ["lazy_placeholder", ""],
    ["rss_enabled", "1"],
    ["sitemap_enabled", "1"],
    ["site_description", ""],
    ["site_keywords", ""],
    ["favicon_key", ""],
    ["brand_logo_key", ""],
    ["categories", '[{"name":"\u6444\u5F71","color":"#FF6B6B"},{"name":"\u8BBE\u8BA1","color":"#A29BFE"},{"name":"\u89C6\u9891","color":"#00B894"},{"name":"\u968F\u7B14","color":"#FDCB6E"}]']
  ];
  for (const [k, v] of defs) await env.db.prepare("INSERT OR IGNORE INTO site_settings(k,v) VALUES(?,?)").bind(k, v).run();
  _dbReady = true;
}
async function getSettings(env) {
  const c = await env.cache.get("site_settings");
  if (c) return JSON.parse(c);
  const rows = await env.db.prepare("SELECT k,v FROM site_settings").all();
  const m = {};
  for (const r of rows) m[r.k] = r.v;
  await env.cache.put("site_settings", JSON.stringify(m), { expirationTtl: 300 });
  return m;
}
async function setSetting(env, k, v) {
  await env.db.prepare("INSERT OR REPLACE INTO site_settings(k,v,updated_at) VALUES(?,?,datetime('now'))").bind(k, v).run();
  await env.cache.delete("site_settings");
}
async function checkAuth(r, env) {
  const c = r.headers.get("cookie") || "";
  const m = c.match(/mg_session=([^;]+)/);
  if (!m) return false;
  const [user, hash] = decodeURIComponent(m[1]).split(":");
  if (!user || !hash) return false;
  const a = await env.db.prepare("SELECT password_hash FROM admins WHERE username=?").bind(user).first();
  return a && a.password_hash === hash;
}
async function getCurUser(r, env) {
  const c = r.headers.get("cookie") || "";
  const m = c.match(/mg_session=([^;]+)/);
  if (!m) return null;
  const [user] = decodeURIComponent(m[1]).split(":");
  return user || null;
}
async function handle(r, env) {
  const u = new URL(r.url);
  const p = u.pathname;
  if (p === "/favicon.ico") return serveFavicon(r, env);
  if (p.startsWith("/file/")) return serveFile(r, env, p.slice(6));
  if (p.startsWith("/api/")) return handleAPI(r, env, u);
  await initDB(env);
  if (p === "/" || p === "/index.html") return htmlR(await renderHome(r, env, u));
  if (p === "/admin") return htmlR(await renderAdmin(r, env));
  if (p === "/about") return htmlR(await renderAbout(r, env));
  if (p.startsWith("/item/")) return htmlR(await renderDetail(r, env, u, p.slice(6)));
  if (p === "/rss.xml") return serveRSS(r, env);
  if (p === "/sitemap.xml") return serveSitemap(r, env);
  return errR(new Error("Not Found"), 404);
}
async function handleAPI(r, env, u) {
  const p = u.pathname;
  const initMatch = p.match(/^\/api\/init\/([\w-]+)$/);
  if (initMatch) {
    const secret = initMatch[1];
    const expected = env.INIT_SECRET || "";
    if (!expected || secret !== expected) return jR({ ok: false, msg: "invalid or missing INIT_SECRET" });
    await initDB(env);
    const pwd = env.ADMIN_PASSWORD || expected;
    await env.db.prepare("INSERT OR IGNORE INTO admins(username,password_hash) VALUES(?,?)").bind("admin", await sha256(pwd)).run();
    await env.db.prepare("UPDATE admins SET password_hash=? WHERE username=?").bind(await sha256(pwd), "admin").run();
    return jR({ ok: true, msg: "initialized", login: "/admin", username: "admin", password: pwd });
  }
  if (p === "/api/login" && r.method === "POST") {
    const f = await r.json().catch(() => ({}));
    const a = await env.db.prepare("SELECT password_hash FROM admins WHERE username=?").bind(f.username || "").first();
    if (!a || a.password_hash !== await sha256(f.password || "")) return jR({ ok: false, msg: "\u7528\u6237\u540D\u6216\u5BC6\u7801\u9519\u8BEF" });
    const enc2 = encodeURIComponent(f.username + ":" + a.password_hash);
    return new Response(JSON.stringify({ ok: true }), { headers: { "Content-Type": "application/json", "Set-Cookie": "mg_session=" + enc2 + "; Path=/; Max-Age=86400; SameSite=Lax" } });
  }
  if (p === "/api/logout") return new Response(JSON.stringify({ ok: true }), { headers: { "Content-Type": "application/json", "Set-Cookie": "mg_session=; Path=/; Max-Age=0" } });
  const auth = await checkAuth(r, env);
  if (!auth) return jR({ ok: false, msg: "unauthorized" }, 401);
  if (p === "/api/items" && r.method === "GET") {
    const rows = await env.db.prepare("SELECT * FROM media_items ORDER BY COALESCE(sort_weight,0) DESC,updated_at DESC").all();
    return jR({ ok: true, items: rows.results || rows });
  }
  if (p === "/api/items" && r.method === "POST") {
    const f = await r.json().catch(() => ({}));
    const slug = f.custom_slug || slugify(f.title) || rand(8);
    const r2 = await env.db.prepare(`INSERT INTO media_items(type,title,description,content,thumbnail_key,tags,sort_order,is_public,slug,custom_slug,cover_key,category,seo_description,seo_keywords,publish_at,expire_at,sort_weight,is_hidden,gallery_keys,attachment_key,attachment_name,custom_css_class) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).bind(f.type || "text", f.title || "\u65E0\u6807\u9898", f.description || "", f.content || "", f.thumbnail_key || null, f.tags || "", f.sort_order || 0, f.is_public ? 1 : 0, slug, f.custom_slug || null, f.cover_key || null, f.category || "", f.seo_description || "", f.seo_keywords || "", f.publish_at || null, f.expire_at || null, f.sort_weight || 0, f.is_hidden ? 1 : 0, JSON.stringify(f.gallery_keys || []), f.attachment_key || null, f.attachment_name || "", f.custom_css_class || "").run();
    await env.cache.delete("public_items");
    return jR({ ok: true, id: r2.meta && r2.meta.last_row_id });
  }
  if (p.startsWith("/api/items/") && r.method === "PUT") {
    const id = p.split("/")[3];
    const f = await r.json().catch(() => ({}));
    const allowed = ["type", "title", "description", "content", "thumbnail_key", "tags", "sort_order", "is_public", "custom_slug", "cover_key", "category", "seo_description", "seo_keywords", "publish_at", "expire_at", "sort_weight", "is_hidden", "gallery_keys", "attachment_key", "attachment_name", "custom_css_class"];
    const sets = [];
    const binds = [];
    for (const k of allowed) if (k in f) {
      sets.push(k + "=?");
      binds.push(k === "gallery_keys" ? JSON.stringify(f[k]) : f[k]);
    }
    sets.push("updated_at=datetime('now')");
    binds.push(id);
    await env.db.prepare(`UPDATE media_items SET ${sets.join(",")} WHERE id=?`).bind(...binds).run();
    await env.cache.delete("public_items");
    return jR({ ok: true });
  }
  if (p.startsWith("/api/items/") && r.method === "DELETE") {
    const id = p.split("/")[3];
    const item = await env.db.prepare("SELECT * FROM media_items WHERE id=?").bind(id).first();
    if (item) {
      if (item.thumbnail_key) await env.kv.delete(item.thumbnail_key).catch(() => {
      });
      if (item.cover_key) await env.kv.delete(item.cover_key).catch(() => {
      });
      if (item.attachment_key) await env.kv.delete(item.attachment_key).catch(() => {
      });
      const gk = jParse(item.gallery_keys, []);
      for (const k of gk) await env.kv.delete(k).catch(() => {
      });
    }
    await env.db.prepare("DELETE FROM media_items WHERE id=?").bind(id).run();
    await env.cache.delete("public_items");
    return jR({ ok: true });
  }
  if (p === "/api/items/batch" && r.method === "DELETE") {
    const f = await r.json().catch(() => ({}));
    for (const id of f.ids || []) {
      const item = await env.db.prepare("SELECT * FROM media_items WHERE id=?").bind(id).first();
      if (item) {
        if (item.thumbnail_key) await env.kv.delete(item.thumbnail_key).catch(() => {
        });
        if (item.cover_key) await env.kv.delete(item.cover_key).catch(() => {
        });
        if (item.attachment_key) await env.kv.delete(item.attachment_key).catch(() => {
        });
      }
    }
    if ((f.ids || []).length) {
      await env.db.prepare(`DELETE FROM media_items WHERE id IN (${"?,".repeat((f.ids || []).length).slice(0, -1)})[
    `).bind(...f.ids || []).run();
    }
    await env.cache.delete("public_items");
    return jR({ ok: true });
  }
  if (p === "/api/upload" && r.method === "POST") {
    const fd = await r.formData().catch(() => null);
    if (!fd) return jR({ ok: false, msg: "invalid form" });
    const file = fd.get("file");
    if (!file) return jR({ ok: false, msg: "no file" });
    const max = parseInt(env.MAX_FILE_SIZE || "25165824", 10);
    if (file.size > max) return jR({ ok: false, msg: "file too large" });
    const key = rand(16) + "_" + file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    await env.kv.put(key, await file.arrayBuffer(), { metadata: { type: file.type || "application/octet-stream", name: file.name } });
    return jR({ ok: true, key, name: file.name, url: "/file/" + encodeURIComponent(key) });
  }
  if (p.startsWith("/api/file/") && r.method === "DELETE") {
    const key = decodeURIComponent(p.slice(10));
    await env.kv.delete(key).catch(() => {
    });
    return jR({ ok: true });
  }
  if (p === "/api/settings" && r.method === "GET") return jR({ ok: true, settings: await getSettings(env) });
  if (p === "/api/settings" && r.method === "PUT") {
    const f = await r.json().catch(() => ({}));
    for (const [k, v] of Object.entries(f)) await setSetting(env, k, typeof v === "string" ? v : JSON.stringify(v));
    return jR({ ok: true });
  }
  if (p === "/api/stats" && r.method === "GET") {
    const all = await env.db.prepare("SELECT type,is_public FROM media_items").all();
    const items = all.results || all;
    const s = { total: items.length, image: 0, video: 0, text: 0, public: 0, draft: 0 };
    for (const i of items) {
      if (i.type === "image") s.image++;
      else if (i.type === "video") s.video++;
      else s.text++;
      if (i.is_public) s.public++;
      else s.draft++;
    }
    return jR({ ok: true, stats: s });
  }
  if (p === "/api/change-password" && r.method === "POST") {
    const f = await r.json().catch(() => ({}));
    const u2 = await getCurUser(r, env);
    const a = await env.db.prepare("SELECT password_hash FROM admins WHERE username=?").bind(u2).first();
    if (!a || a.password_hash !== await sha256(f.old || "")) return jR({ ok: false, msg: "\u539F\u5BC6\u7801\u9519\u8BEF" });
    await env.db.prepare("UPDATE admins SET password_hash=? WHERE username=?").bind(await sha256(f.new || ""), u2).run();
    return jR({ ok: true });
  }
  return jR({ ok: false, msg: "unknown api" }, 404);
}
async function serveFile(r, env, key) {
  const data = await env.kv.get(key, { type: "arrayBuffer" }).catch(() => null);
  if (!data) return errR(new Error("Not Found"), 404);
  const meta = await env.kv.getWithMetadata(key).catch(() => ({}));
  const t = meta && meta.metadata && meta.metadata.type || "application/octet-stream";
  return new Response(data, { headers: { "Content-Type": t, "Cache-Control": "public, max-age=31536000" } });
}
async function serveFavicon(r, env) {
  const cfg = await getSettings(env);
  if (cfg.favicon_key) {
    return serveFile(r, env, cfg.favicon_key);
  }
  const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="8" fill="#0071E3"/><text x="16" y="22" text-anchor="middle" font-size="18" fill="#fff" font-family="sans-serif">G</text></svg>';
  return new Response(svg, { headers: { "Content-Type": "image/svg+xml", "Cache-Control": "public, max-age=86400" } });
}
async function serveRSS(r, env) {
  const cfg = await getSettings(env);
  if (cfg.rss_enabled !== "1") return errR(new Error("RSS disabled"), 404);
  const items = await getPublicItems(env);
  const base = new URL(r.url).origin;
  let xml = '<?xml version="1.0" encoding="UTF-8"?>\\n<rss version="2.0"><channel><title>' + esc(cfg.site_title || "Gallery") + "</title><link>" + base + "</link><description>" + esc(cfg.site_description || "") + "</description>\\n";
  for (const i of items) {
    xml += "<item><title>" + esc(i.title) + "</title><link>" + base + "/item/" + enc(i.slug || i.id) + "</link><description>" + esc(i.description || "") + "</description><pubDate>" + (i.created_at || "") + "</pubDate></item>\\n";
  }
  xml += "</channel></rss>";
  return new Response(xml, { headers: { "Content-Type": "application/rss+xml;charset=utf-8" } });
}
async function serveSitemap(r, env) {
  const cfg = await getSettings(env);
  if (cfg.sitemap_enabled !== "1") return errR(new Error("Sitemap disabled"), 404);
  const items = await getPublicItems(env);
  const base = new URL(r.url).origin;
  let xml = '<?xml version="1.0" encoding="UTF-8"?>\\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\\n';
  xml += "<url><loc>" + base + "/</loc></url>\\n";
  if (cfg.about_html) {
    xml += "<url><loc>" + base + "/about</loc></url>\\n";
  }
  for (const i of items) {
    xml += "<url><loc>" + base + "/item/" + enc(i.slug || i.id) + "</loc></url>\\n";
  }
  xml += "</urlset>";
  return new Response(xml, { headers: { "Content-Type": "application/xml;charset=utf-8" } });
}
async function getPublicItems(env) {
  const c = await env.cache.get("public_items");
  if (c) return JSON.parse(c);
  const all = await env.db.prepare("SELECT * FROM media_items WHERE is_public=1 AND is_hidden=0 ORDER BY COALESCE(sort_weight,0) DESC,updated_at DESC").all();
  const items = all.results || all;
  await env.cache.put("public_items", JSON.stringify(items), { expirationTtl: 120 });
  return items;
}
async function renderHome(r, env, u) {
  await initDB(env);
  const cfg = await getSettings(env);
  const items = await getPublicItems(env);
  const cats = jParse(cfg.categories, [{ name: "\u5168\u90E8", color: "#0071E3" }]);
  const catParam = u.searchParams.get("cat") || "";
  const filtered = catParam ? items.filter((i) => i.category === catParam) : items;
  const page = parseInt(u.searchParams.get("page") || "1", 10);
  const ps = parseInt(env.PAGE_SIZE || "24", 10);
  const total = filtered.length;
  const pages = Math.max(1, Math.ceil(total / ps));
  const start = (page - 1) * ps;
  const slice = filtered.slice(start, start + ps);
  let navExtra = "";
  try {
    const nl = jParse(cfg.nav_links, []);
    for (const l of nl) navExtra += `<a class="nav-a" href="${esc(l.url)}" target="_blank" rel="noopener">${esc(l.label)}</a>`;
  } catch (e) {
  }
  if (cfg.about_html) navExtra += `<a class="nav-a" href="/about">\u5173\u4E8E</a>`;
  let ann = "";
  if (cfg.announcement_html) ann = `<div class="ann" id="ann">${cfg.announcement_html}<button class="x" onclick="document.getElementById('ann').style.display='none'">\xD7</button></div>`;
  let heroBg = "";
  if (cfg.hero_bg_type === "image" && cfg.hero_image_key) heroBg = `<div class="hero-bg"><img src="/file/${enc(cfg.hero_image_key)}" alt=""></div>`;
  else if (cfg.hero_bg_type === "video" && cfg.hero_video_url) heroBg = `<div class="hero-bg"><video src="${esc(cfg.hero_video_url)}" autoplay muted loop playsinline></video></div>`;
  let chips = `<a class="chip${!catParam ? " act" : ""}" href="/">\u5168\u90E8</a>`;
  for (const c of cats) {
    if (c.name === "\u5168\u90E8") continue;
    chips += `<a class="chip${catParam === c.name ? " act" : ""}" href="/?cat=${enc(c.name)}" style="border-color:${esc(c.color || "")}33">${esc(c.name)}</a>`;
  }
  let cards = "";
  for (const i of slice) {
    const isVid = i.type === "video", isTxt = i.type === "text";
    const badge = isVid ? '<span class="badge bv">\u25B6 \u89C6\u9891</span>' : isTxt ? '<span class="badge bt">\u{1F4DD} \u6587\u5B57</span>' : '<span class="badge bi">\u{1F5BC} \u56FE\u7247</span>';
    let mediaHtml = "";
    const cover = i.cover_key;
    if (cover) mediaHtml = `<img class="li" data-src="/file/${enc(cover)}" alt="${esc(i.title)}" onload="this.classList.add('loaded')">`;
    else if (!isTxt && i.thumbnail_key) mediaHtml = `<img class="li" data-src="/file/${enc(i.thumbnail_key)}" alt="${esc(i.title)}" onload="this.classList.add('loaded')">`;
    else if (isVid) mediaHtml = `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg,#1a1a2e,#16213e);font-size:3rem;">\u25B6</div>`;
    else mediaHtml = `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg,${esc((cats.find((c) => c.name === i.category) || {}).color || "#0071E3")}33,${esc((cats.find((c) => c.name === i.category) || {}).color || "#5E5CE6")}22);font-size:2rem;font-weight:700;color:${esc((cats.find((c) => c.name === i.category) || {}).color || "#0071E3")};">${esc(i.title.charAt(0))}</div>`;
    cards += `<a class="card" href="/item/${enc(i.slug || i.id)}" data-cat="${esc(i.category || "")}"><div class="cm">${mediaHtml}</div><div class="cb"><div class="ct">${esc(i.title)}</div><div class="cd">${esc(i.description || "")}</div><div class="cm2">${badge}${i.category ? `<span class="chip act" style="cursor:default">${esc(i.category)}</span>` : ""}</div></div></a>`;
  }
  if (!cards) cards = '<p style="grid-column:1/-1;text-align:center;color:var(--text-3);padding:var(--sp7);">\u6682\u65E0\u5185\u5BB9\uFF0C\u7BA1\u7406\u5458\u5FEB\u53BB\u4E0A\u4F20\u5427 \u2728</p>';
  let pg = "";
  if (pages > 1) {
    pg += '<div class="pg">';
    if (page > 1) pg += `<a class="pb" href="/?page=${page - 1}${catParam ? "&cat=" + enc(catParam) : ""}">\u2190 \u4E0A\u4E00\u9875</a>`;
    for (let p = 1; p <= pages; p++) pg += `<a class="pb${p === page ? " act" : ""}" href="/?page=${p}${catParam ? "&cat=" + enc(catParam) : ""}">${p}</a>`;
    if (page < pages) pg += `<a class="pb" href="/?page=${page + 1}${catParam ? "&cat=" + enc(catParam) : ""}">\u4E0B\u4E00\u9875 \u2192</a>`;
    pg += "</div>";
  }
  const dm = cfg.theme_dark_mode || "off";
  const dmScript = dm === "on" ? `document.body.classList.add('dark');` : dm === "auto" ? `if(matchMedia('(prefers-color-scheme: dark)').matches)document.body.classList.add('dark');` : "";
  const logo = cfg.brand_logo_key ? `<img src="/file/${enc(cfg.brand_logo_key)}" style="height:28px;width:auto;vertical-align:middle;margin-right:8px;border-radius:6px;">` : "";
  return `<!DOCTYPE html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(cfg.site_title || "Gallery")} \u2014 ${esc(cfg.brand_name || "")}</title>
<meta name="description" content="${esc(cfg.site_description || cfg.site_subtitle || "")}">
<meta name="keywords" content="${esc(cfg.site_keywords || "")}">
<meta property="og:title" content="${esc(cfg.site_title || "")}">
<meta property="og:description" content="${esc(cfg.site_description || "")}">
<link rel="icon" href="/favicon.ico">
<style>${CSS}</style></head><body>
<nav class="nav"><div class="nav-in">
  <a class="brand" href="/">${logo}${esc(cfg.brand_name || "Gallery")}</a>
  <div class="nav-l">${chips}</div>
  <div class="nav-r">${navExtra}<button class="th" onclick="toggleDark()" title="\u5207\u6362\u6697\u8272">\u{1F319}</button><a class="btn bp" href="/admin">\u{1F512} \u540E\u53F0</a></div>
</div></nav>
${heroBg ? heroBg : ""}
<section class="hero"><h1 class="ht">${esc(cfg.site_title || "\u7CBE\u9009\u4F5C\u54C1")}</h1><p class="hs">${esc(cfg.site_subtitle || "")}</p></section>
${ann}
<div class="fbar">${chips}</div>
<main class="gg">${cards}</main>
${pg}
<footer class="ft">${cfg.footer_html ? cfg.footer_html : `\xA9 ${(/* @__PURE__ */ new Date()).getFullYear()} ${esc(cfg.brand_name || "Gallery")} \xB7 \u57FA\u4E8E Cloudflare Workers \u6784\u5EFA`}${cfg.about_html ? ` \xB7 <a href="/about">\u5173\u4E8E</a>` : ""}</footer>
<button class="fab" onclick="location.href='/admin'" title="\u540E\u53F0\u7BA1\u7406">\u2699</button>
<script>
${dmScript}
function toggleDark(){document.body.classList.toggle('dark');localStorage.setItem('dark',document.body.classList.contains('dark'));}
if(localStorage.getItem('dark')==='true')document.body.classList.add('dark');
const io=new IntersectionObserver(es=>{es.forEach(e=>{if(e.isIntersecting){const img=e.target;if(img.dataset.src){img.src=img.dataset.src;}}});},{rootMargin:'200px'});
document.querySelectorAll('img.li').forEach(img=>io.observe(img));
document.addEventListener('mousemove',e=>{document.body.style.setProperty('--mx',e.clientX/window.innerWidth*100+'%');document.body.style.setProperty('--my',e.clientY/window.innerHeight*100+'%');});
<\/script></body></html>`;
}
async function renderDetail(r, env, u, slug) {
  await initDB(env);
  const cfg = await getSettings(env);
  const items = await getPublicItems(env);
  const item = items.find((i) => i.slug === slug) || items.find((i) => String(i.id) === slug);
  if (!item) return '<!DOCTYPE html><meta charset="utf-8"><title>404</title><body style="font-family:sans-serif;padding:40px;text-align:center;"><h1>404</h1><p>\u5185\u5BB9\u4E0D\u5B58\u5728\u6216\u5DF2\u9690\u85CF</p><a href="/">\u2190 \u8FD4\u56DE\u9996\u9875</a></body>';
  await env.db.prepare("UPDATE media_items SET views=COALESCE(views,0)+1 WHERE id=?").bind(item.id).run();
  const desc = item.seo_description || item.description || "";
  const kws = item.seo_keywords || "";
  let media = "";
  const cover = item.cover_key;
  if (item.type === "video") {
    if (cover) media = `<img src="/file/${enc(cover)}" alt="${esc(item.title)}" style="width:100%;border-radius:var(--r4);box-shadow:var(--s4);">`;
    else if (item.content.startsWith("http")) media = `<video src="${esc(item.content)}" controls poster="" style="width:100%;border-radius:var(--r4);box-shadow:var(--s4);"></video>`;
  } else if (item.type === "image") {
    if (cover) media = `<img src="/file/${enc(cover)}" alt="${esc(item.title)}" style="width:100%;border-radius:var(--r4);box-shadow:var(--s4);">`;
    else if (item.content.startsWith("http") || item.content.startsWith("/file/")) media = `<img src="${item.content.startsWith("/") ? item.content : "/file/" + enc(item.content)}" alt="${esc(item.title)}" style="width:100%;border-radius:var(--r4);box-shadow:var(--s4);">`;
  }
  let gallery = "";
  const gk = jParse(item.gallery_keys, []);
  if (gk.length) {
    gallery = '<div class="gs">';
    for (const k of gk) gallery += `<div class="gi"><img src="/file/${enc(k)}" alt="" loading="lazy"></div>`;
    gallery += "</div>";
  }
  let attach = "";
  if (item.attachment_key) attach = `<a class="ab" href="/file/${enc(item.attachment_key)}" download="${esc(item.attachment_name || "download")}">\u{1F4CE} \u4E0B\u8F7D\u9644\u4EF6\uFF1A${esc(item.attachment_name || "\u6587\u4EF6")}</a>`;
  let rel = "";
  const sameCat = items.filter((i) => i.id !== item.id && i.category === item.category).slice(0, 3);
  if (sameCat.length) {
    rel = '<section class="rr"><h2 class="rt">\u76F8\u5173\u63A8\u8350</h2><div class="rg">';
    for (const i of sameCat) {
      rel += `<a class="card" href="/item/${enc(i.slug || i.id)}"><div class="cm">${i.cover_key ? `<img src="/file/${enc(i.cover_key)}" alt="">` : i.thumbnail_key ? `<img src="/file/${enc(i.thumbnail_key)}" alt="">` : ""}</div><div class="cb"><div class="ct">${esc(i.title)}</div></div></a>`;
    }
    rel += "</div></section>";
  }
  const copyText = cfg.copy_link_text || "\u590D\u5236\u94FE\u63A5";
  const dmScript = cfg.theme_dark_mode === "on" ? `document.body.classList.add('dark');` : cfg.theme_dark_mode === "auto" ? `if(matchMedia('(prefers-color-scheme: dark)').matches)document.body.classList.add('dark');` : "";
  return `<!DOCTYPE html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(item.title)} \u2014 ${esc(cfg.brand_name || "")}</title>
<meta name="description" content="${esc(desc)}"><meta name="keywords" content="${esc(kws)}">
<meta property="og:title" content="${esc(item.title)}"><meta property="og:description" content="${esc(desc)}">${cover ? `<meta property="og:image" content="${new URL(r.url).origin}/file/${enc(cover)}">` : ""}
<link rel="icon" href="/favicon.ico"><style>${CSS}</style></head><body class="${item.custom_css_class || ""}">
<nav class="nav"><div class="nav-in">
  <a class="brand" href="/">${esc(cfg.brand_name || "Gallery")}</a>
  <div class="nav-l"></div>
  <div class="nav-r"><button class="th" onclick="toggleDark()">\u{1F319}</button><a class="btn bg" href="/">\u2190 \u8FD4\u56DE</a></div>
</div></nav>
<article class="dh">${media}</article>
<section class="db">
  <h1 class="dt">${esc(item.title)}</h1>
  <div class="dm">
    <span class="badge ${item.type === "video" ? "bv" : item.type === "text" ? "bt" : "bi"}">${item.type === "video" ? "\u89C6\u9891" : item.type === "text" ? "\u6587\u5B57" : "\u56FE\u7247"}</span>
    ${item.category ? `<span class="chip act" style="cursor:default">${esc(item.category)}</span>` : ""}
    <span style="font-size:var(--fs-m);color:var(--text-3);">\u{1F441} ${item.views || 0}</span>
    <span style="font-size:var(--fs-m);color:var(--text-3);">${fmtDate(item.created_at)}</span>
  </div>
  <div class="dd">${esc(item.description || "")}</div>
  <div class="dc">${item.content.startsWith("<") ? item.content : esc(item.content).replace(/\\n/g, "<br>")}</div>
  <div class="da">${attach}<button class="cl" onclick="copyLink()">\u{1F517} ${esc(copyText)}</button></div>
</section>
${gallery}${rel}
<footer class="ft">${cfg.footer_html ? cfg.footer_html : `\xA9 ${(/* @__PURE__ */ new Date()).getFullYear()} ${esc(cfg.brand_name || "Gallery")}`}</footer>
<script>
${dmScript}
function toggleDark(){document.body.classList.toggle('dark');localStorage.setItem('dark',document.body.classList.contains('dark'));}
if(localStorage.getItem('dark')==='true')document.body.classList.add('dark');
async function copyLink(){try{await navigator.clipboard.writeText(location.href);showToast('\u94FE\u63A5\u5DF2\u590D\u5236','s');}catch(e){showToast('\u590D\u5236\u5931\u8D25','e');}}
function showToast(t,type){const d=document.createElement('div');d.className='to '+type;d.textContent=t;document.body.appendChild(d);requestAnimationFrame(()=>d.classList.add('show'));setTimeout(()=>{d.classList.remove('show');setTimeout(()=>d.remove(),400);},2000);}
<\/script></body></html>`;
}
async function renderAbout(r, env) {
  const cfg = await getSettings(env);
  if (!cfg.about_html) return '<!DOCTYPE html><meta charset="utf-8"><title>\u5173\u4E8E</title><body style="font-family:sans-serif;padding:40px;text-align:center;"><h1>\u5173\u4E8E</h1><p>\u6682\u65E0\u5185\u5BB9</p><a href="/">\u2190 \u8FD4\u56DE</a></body>';
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>\u5173\u4E8E \u2014 ${esc(cfg.brand_name || "")}</title><link rel="icon" href="/favicon.ico"><style>${CSS}</style></head><body><nav class="nav"><div class="nav-in"><a class="brand" href="/">${esc(cfg.brand_name || "Gallery")}</a><div class="nav-r"><a class="btn bg" href="/">\u2190 \u8FD4\u56DE</a></div></div></nav><main class="db" style="max-width:var(--w-b);margin:var(--sp6) auto;">${cfg.about_html}</main></body></html>`;
}
async function renderAdmin(r, env) {
  await initDB(env);
  const cfg = await getSettings(env);
  const cats = jParse(cfg.categories, [{ name: "\u6444\u5F71", color: "#FF6B6B" }]);
  const catsJson = esc(JSON.stringify(cats));
  const dmScript = cfg.theme_dark_mode === "on" ? `document.body.classList.add('dark');` : "";
  return `<!DOCTYPE html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>\u540E\u53F0\u7BA1\u7406 \u2014 ${esc(cfg.brand_name || "Gallery")}</title>
<link rel="icon" href="/favicon.ico"><style>${CSS}
/* Admin extras */
.tab{display:inline-flex;padding:var(--sp2) var(--sp4);border-radius:var(--pill);font-size:var(--fs-c);cursor:pointer;color:var(--text-2);border:var(--gb);background:var(--glass);margin-right:var(--sp2);transition:all var(--t-f) var(--ease);}
.tab.act{background:var(--accent);color:#fff;}
.tabbar{display:flex;gap:var(--sp2);padding:var(--sp4) var(--sp5);max-width:var(--w-w);margin:0 auto;flex-wrap:wrap;}
.panels{max-width:var(--w-w);margin:0 auto;padding:var(--sp4) var(--sp5);}
.panel{display:none;}.panel.act{display:block;}
.up{display:flex;gap:var(--sp3);align-items:center;margin-bottom:var(--sp3);flex-wrap:wrap;}
.up label{font-size:var(--fs-c);color:var(--text-2);}
.bar{display:flex;gap:var(--sp2);align-items:center;margin-bottom:var(--sp4);flex-wrap:wrap;}
.sm{display:flex;gap:var(--sp2);align-items:center;}
.cat-item{display:flex;gap:var(--sp2);align-items:center;margin-bottom:var(--sp2);padding:var(--sp2);background:var(--glass);border-radius:var(--r2);}
.cat-color{width:32px;height:32px;border-radius:var(--r1);border:var(--gb);cursor:pointer;}
.preview-box{margin-top:var(--sp3);padding:var(--sp4);background:var(--glass);border-radius:var(--r3);border:var(--gb);}
</style></head><body>
<nav class="nav"><div class="nav-in">
  <a class="brand" href="/">${esc(cfg.brand_name || "Gallery")} \u540E\u53F0</a>
  <div class="nav-r"><button class="th" onclick="toggleDark()">\u{1F319}</button><a class="btn bg" href="/" target="_blank">\u{1F52D} \u9884\u89C8\u524D\u53F0</a><button class="btn bd" onclick="logout()">\u9000\u51FA</button></div>
</div></nav>

<div class="tabbar">
  <button class="tab act" data-tab="items">\u{1F4E6} \u6240\u6709\u5185\u5BB9</button>
  <button class="tab" data-tab="upload">\u2B06\uFE0F \u4E0A\u4F20</button>
  <button class="tab" data-tab="cats">\u{1F3F7}\uFE0F \u5206\u7C7B\u7BA1\u7406</button>
  <button class="tab" data-tab="site">\u2699\uFE0F \u7AD9\u70B9\u8BBE\u7F6E</button>
  <button class="tab" data-tab="pwd">\u{1F511} \u4FEE\u6539\u5BC6\u7801</button>
</div>

<div class="panels">
  <!-- \u5185\u5BB9\u5217\u8868 -->
  <div class="panel act" id="p-items">
    <div class="bar">
      <button class="btn bp" onclick="showCreate()">\uFF0B \u65B0\u5EFA</button>
      <button class="btn bd" onclick="batchDelete()">\u{1F5D1} \u6279\u91CF\u5220\u9664</button>
      <input class="fi bs" id="searchInput" placeholder="\u{1F50D} \u641C\u7D22\u6807\u9898..." oninput="renderTable()" style="max-width:220px;">
      <select class="fs bs" id="filterType" onchange="renderTable()" style="max-width:140px;"><option value="">\u5168\u90E8\u7C7B\u578B</option><option value="image">\u56FE\u7247</option><option value="video">\u89C6\u9891</option><option value="text">\u6587\u5B57</option></select>
      <select class="fs bs" id="filterStatus" onchange="renderTable()" style="max-width:140px;"><option value="">\u5168\u90E8\u72B6\u6001</option><option value="1">\u5DF2\u53D1\u5E03</option><option value="0">\u8349\u7A3F</option></select>
    </div>
    <div id="statsBar" style="display:flex;gap:var(--sp3);margin-bottom:var(--sp4);flex-wrap:wrap;"></div>
    <div style="overflow-x:auto;"><table class="at" id="itemsTable"><thead><tr><th><input type="checkbox" id="checkAll" onchange="toggleAll(this)"></th><th>\u5C01\u9762</th><th>\u6807\u9898 / URL</th><th>\u7C7B\u578B</th><th>\u5206\u7C7B</th><th>\u72B6\u6001</th><th>\u65E5\u671F</th><th>\u64CD\u4F5C</th></tr></thead><tbody id="itemsBody"></tbody></table></div>
    <div class="pg" id="adminPager"></div>
  </div>

  <!-- \u4E0A\u4F20 -->
  <div class="panel" id="p-upload">
    <h2 style="margin-bottom:var(--sp4);">\u4E0A\u4F20\u6587\u4EF6\u5230 KV \u5B58\u50A8</h2>
    <div class="up">
      <input type="file" id="fileInput" accept="image/*,video/*,.pdf,.zip,.psd" style="display:none;" onchange="doUpload()">
      <button class="btn bp" onclick="document.getElementById('fileInput').click()">\u{1F4C1} \u9009\u62E9\u6587\u4EF6</button>
      <span id="uploadStatus" style="font-size:var(--fs-c);color:var(--text-2);"></span>
    </div>
    <div id="uploadResult" style="margin-top:var(--sp4);"></div>
    <h3 style="margin:var(--sp5) 0 var(--sp3);font-size:var(--fs-h3);">\u5DF2\u5B58\u50A8\u6587\u4EF6</h3>
    <div id="kvList" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:var(--sp3);"></div>
  </div>

  <!-- \u5206\u7C7B\u7BA1\u7406 -->
  <div class="panel" id="p-cats">
    <h2 style="margin-bottom:var(--sp4);">\u5206\u7C7B\u7BA1\u7406</h2>
    <div id="catList"></div>
    <button class="btn bp" onclick="addCat()">\uFF0B \u6DFB\u52A0\u5206\u7C7B</button>
    <div style="margin-top:var(--sp5);padding:var(--sp4);background:var(--glass);border-radius:var(--r3);border:var(--gb);">
      <h3 style="margin-bottom:var(--sp3);font-size:var(--fs-h3);">\u5F53\u524D\u5206\u7C7B JSON\uFF08\u53EF\u76F4\u63A5\u7F16\u8F91\uFF09</h3>
      <textarea class="fta" id="catsJson" style="font-family:monospace;font-size:var(--fs-c);">${catsJson}</textarea>
      <button class="btn bp" style="margin-top:var(--sp3);" onclick="saveCatsJson()">\u{1F4BE} \u4FDD\u5B58 JSON</button>
    </div>
  </div>

  <!-- \u7AD9\u70B9\u8BBE\u7F6E -->
  <div class="panel" id="p-site">
    <h2 style="margin-bottom:var(--sp4);">\u7AD9\u70B9\u8BBE\u7F6E</h2>
    <div style="display:grid;gap:var(--sp4);max-width:680px;">
      <div class="fg"><label class="fl">\u54C1\u724C\u540D\u79F0</label><input class="fi" id="s_brand_name" value="${esc(cfg.brand_name || "Gallery")}"></div>
      <div class="fg"><label class="fl">\u7AD9\u70B9\u5927\u6807\u9898</label><input class="fi" id="s_site_title" value="${esc(cfg.site_title || "\u7CBE\u9009\u4F5C\u54C1")}"></div>
      <div class="fg"><label class="fl">\u7AD9\u70B9\u526F\u6807\u9898</label><input class="fi" id="s_site_subtitle" value="${esc(cfg.site_subtitle || "")}"></div>
      <div class="fg"><label class="fl">SEO \u63CF\u8FF0</label><input class="fi" id="s_site_description" value="${esc(cfg.site_description || "")}"></div>
      <div class="fg"><label class="fl">SEO \u5173\u952E\u8BCD\uFF08\u9017\u53F7\u5206\u9694\uFF09</label><input class="fi" id="s_site_keywords" value="${esc(cfg.site_keywords || "")}"></div>
      <div class="fg"><label class="fl">\u6697\u8272\u6A21\u5F0F</label><select class="fs" id="s_theme_dark_mode"><option value="off"${cfg.theme_dark_mode === "off" ? " selected" : ""}>\u5173\u95ED</option><option value="on"${cfg.theme_dark_mode === "on" ? " selected" : ""}>\u5F00\u542F</option><option value="auto"${cfg.theme_dark_mode === "auto" ? " selected" : ""}>\u8DDF\u968F\u7CFB\u7EDF</option></select></div>
      <div class="fg"><label class="fl">Hero \u80CC\u666F\u7C7B\u578B</label><select class="fs" id="s_hero_bg_type"><option value="gradient"${cfg.hero_bg_type === "gradient" ? " selected" : ""}>\u6E10\u53D8</option><option value="image"${cfg.hero_bg_type === "image" ? " selected" : ""}>\u56FE\u7247</option><option value="video"${cfg.hero_bg_type === "video" ? " selected" : ""}>\u89C6\u9891</option><option value="none"${cfg.hero_bg_type === "none" ? " selected" : ""}>\u65E0</option></select></div>
      <div class="fg"><label class="fl">\u9875\u811A HTML\uFF08\u652F\u6301 HTML\uFF09</label><textarea class="fta" id="s_footer_html">${esc(cfg.footer_html || "")}</textarea></div>
      <div class="fg"><label class="fl">\u516C\u544A HTML\uFF08\u652F\u6301 HTML\uFF0C\u7559\u7A7A\u4E0D\u663E\u793A\uFF09</label><textarea class="fta" id="s_announcement_html">${esc(cfg.announcement_html || "")}</textarea></div>
      <div class="fg"><label class="fl">\u5173\u4E8E\u9875 HTML\uFF08\u652F\u6301 HTML\uFF0C\u7559\u7A7A\u5219\u9690\u85CF\uFF09</label><textarea class="fta" id="s_about_html">${esc(cfg.about_html || "")}</textarea></div>
      <div class="fg"><label class="fl">\u5BFC\u822A\u94FE\u63A5 JSON\uFF08[{label,url}]\uFF09</label><textarea class="fta" id="s_nav_links" style="font-family:monospace;font-size:var(--fs-c);">${esc(cfg.nav_links || "[]")}</textarea></div>
      <div class="fg"><label class="fl">\u590D\u5236\u94FE\u63A5\u6309\u94AE\u6587\u5B57</label><input class="fi" id="s_copy_link_text" value="${esc(cfg.copy_link_text || "\u590D\u5236\u94FE\u63A5")}"></div>
      <div class="fg"><label class="fl">RSS \u8BA2\u9605</label><select class="fs" id="s_rss_enabled"><option value="1"${cfg.rss_enabled === "1" ? " selected" : ""}>\u5F00\u542F</option><option value="0"${cfg.rss_enabled === "0" ? " selected" : ""}>\u5173\u95ED</option></select></div>
      <div class="fg"><label class="fl">Sitemap</label><select class="fs" id="s_sitemap_enabled"><option value="1"${cfg.sitemap_enabled === "1" ? " selected" : ""}>\u5F00\u542F</option><option value="0"${cfg.sitemap_enabled === "0" ? " selected" : ""}>\u5173\u95ED</option></select></div>
      <button class="btn bp" onclick="saveSite()">\u{1F4BE} \u4FDD\u5B58\u7AD9\u70B9\u8BBE\u7F6E</button>
    </div>
    <div class="preview-box" style="margin-top:var(--sp5);">
      <h3 style="margin-bottom:var(--sp3);font-size:var(--fs-h3);">\u{1F4CA} \u6570\u636E\u7EDF\u8BA1</h3>
      <div id="statsBox" style="display:flex;gap:var(--sp4);flex-wrap:wrap;"></div>
    </div>
  </div>

  <!-- \u4FEE\u6539\u5BC6\u7801 -->
  <div class="panel" id="p-pwd">
    <h2 style="margin-bottom:var(--sp4);">\u4FEE\u6539\u5BC6\u7801</h2>
    <div style="max-width:400px;display:grid;gap:var(--sp3);">
      <div class="fg"><label class="fl">\u539F\u5BC6\u7801</label><input class="fi" type="password" id="oldPwd"></div>
      <div class="fg"><label class="fl">\u65B0\u5BC6\u7801</label><input class="fi" type="password" id="newPwd"></div>
      <button class="btn bp" onclick="changePwd()">\u{1F511} \u4FEE\u6539\u5BC6\u7801</button>
    </div>
  </div>
</div>

<!-- \u7F16\u8F91\u6A21\u6001\u6846 -->
<div class="mo" id="editModal" style="display:none;">
  <div class="md">
    <button class="mx" onclick="closeModal()">\xD7</button>
    <h2 id="modalTitle">\u65B0\u5EFA\u5185\u5BB9</h2>
    <div style="display:grid;gap:var(--sp3);">
      <div class="fg"><label class="fl">\u6807\u9898 *</label><input class="fi" id="f_title"></div>
      <div class="fg"><label class="fl">\u63CF\u8FF0</label><input class="fi" id="f_description"></div>
      <div class="fg"><label class="fl">\u7C7B\u578B</label><select class="fs" id="f_type" onchange="onTypeChange()"><option value="image">\u56FE\u7247</option><option value="video">\u89C6\u9891</option><option value="text">\u6587\u5B57</option></select></div>
      <div class="fg"><label class="fl">\u5206\u7C7B</label><input class="fi" id="f_category" placeholder="\u5982\uFF1A\u6444\u5F71"></div>
      <div class="fg"><label class="fl">\u81EA\u5B9A\u4E49 Slug\uFF08URL \u522B\u540D\uFF0C\u7559\u7A7A\u81EA\u52A8\u751F\u6210\uFF09</label><input class="fi" id="f_custom_slug"></div>
      <div class="fg"><label class="fl">\u6807\u7B7E\uFF08\u9017\u53F7\u5206\u9694\uFF09</label><input class="fi" id="f_tags"></div>
      <div class="fg"><label class="fl">\u5185\u5BB9 / \u89C6\u9891\u5916\u94FE / \u6587\u5B57\u6B63\u6587</label><textarea class="fta" id="f_content"></textarea></div>
      <div class="fg"><label class="fl">\u53D1\u5E03\u65F6\u95F4\uFF08\u7559\u7A7A=\u7ACB\u5373\uFF09</label><input class="fi" type="datetime-local" id="f_publish_at"></div>
      <div class="fg"><label class="fl">\u8FC7\u671F\u65F6\u95F4\uFF08\u7559\u7A7A=\u4E0D\u8FC7\u671F\uFF09</label><input class="fi" type="datetime-local" id="f_expire_at"></div>
      <div class="fg"><label class="fl">\u6392\u5E8F\u6743\u91CD\uFF08\u5927\u9760\u524D\uFF09</label><input class="fi" type="number" id="f_sort_weight" value="0"></div>
      <div class="fg"><label class="fl">SEO \u63CF\u8FF0</label><input class="fi" id="f_seo_description"></div>
      <div class="fg"><label class="fl">SEO \u5173\u952E\u8BCD</label><input class="fi" id="f_seo_keywords"></div>
      <div class="fg"><label class="fl">\u81EA\u5B9A\u4E49 CSS \u7C7B</label><input class="fi" id="f_custom_css_class" placeholder="\u9AD8\u7EA7\uFF1A\u7ED9\u5361\u7247\u52A0\u989D\u5916\u6837\u5F0F"></div>
      <div class="sm" style="gap:var(--sp3);flex-wrap:wrap;">
        <label><input type="checkbox" id="f_is_public"> \u{1F680} \u53D1\u5E03\uFF08\u52FE\u9009\u540E\u524D\u53F0\u53EF\u89C1\uFF09</label>
        <label><input type="checkbox" id="f_is_hidden"> \u{1F648} \u9690\u85CF\uFF08\u4EC5\u94FE\u63A5\u53EF\u8BBF\u95EE\uFF09</label>
      </div>
      <div style="border:1px dashed var(--bd);border-radius:var(--r3);padding:var(--sp4);margin-top:var(--sp3);">
        <strong style="font-size:var(--fs-c);color:var(--text-2);">\u{1F5BC} \u5C01\u9762\u56FE\uFF08\u72EC\u7ACB\uFF09</strong>
        <div class="up" style="margin-top:var(--sp3);"><input type="file" id="coverInput" accept="image/*" style="display:none;" onchange="uploadCover()"><button class="btn bg" onclick="document.getElementById('coverInput').click()">\u9009\u62E9\u5C01\u9762</button><span id="coverStatus" style="font-size:var(--fs-c);color:var(--text-2);"></span></div>
        <div id="coverPreview" style="margin-top:var(--sp3);"></div>
      </div>
      <div style="border:1px dashed var(--bd);border-radius:var(--r3);padding:var(--sp4);">
        <strong style="font-size:var(--fs-c);color:var(--text-2);">\u{1F4CE} \u9644\u4EF6\uFF08\u53EF\u9009\uFF0C\u524D\u53F0\u663E\u793A\u4E0B\u8F7D\u6309\u94AE\uFF09</strong>
        <div class="up" style="margin-top:var(--sp3);"><input type="file" id="attachInput" style="display:none;" onchange="uploadAttach()"><button class="btn bg" onclick="document.getElementById('attachInput').click()">\u9009\u62E9\u6587\u4EF6</button><span id="attachStatus" style="font-size:var(--fs-c);color:var(--text-2);"></span></div>
        <div id="attachPreview" style="margin-top:var(--sp3);"></div>
      </div>
    </div>
    <div style="display:flex;gap:var(--sp3);margin-top:var(--sp5);flex-wrap:wrap;">
      <button class="btn bp" id="btnSave" onclick="saveItem()">\u{1F4BE} \u4FDD\u5B58</button>
      <button class="btn bg" onclick="previewItem()">\u{1F441} \u9884\u89C8</button>
      <button class="btn bd" onclick="closeModal()">\u53D6\u6D88</button>
    </div>
    <div id="previewArea" style="margin-top:var(--sp4);padding:var(--sp4);background:var(--glass);border-radius:var(--r3);display:none;"></div>
  </div>
</div>

<button class="fab" onclick="showCreate()" title="\u65B0\u5EFA">\uFF0B</button>

<script>
${dmScript}
let allItems=[],cats=${catsJson},editId=null,coverKey=null,attachKey=null,attachName='';
const API='/api';

// Tabs
document.querySelectorAll('.tab').forEach(t=>t.addEventListener('click',()=>{document.querySelectorAll('.tab').forEach(x=>x.classList.remove('act'));document.querySelectorAll('.panel').forEach(x=>x.classList.remove('act'));t.classList.add('act');document.getElementById('p-'+t.dataset.tab).classList.add('act');if(t.dataset.tab==='cats')renderCats();if(t.dataset.tab==='upload')loadKV();if(t.dataset.tab==='site')loadStats();}));
function toggleDark(){document.body.classList.toggle('dark');localStorage.setItem('dark',document.body.classList.contains('dark'));}
if(localStorage.getItem('dark')==='true')document.body.classList.add('dark');

// Toast
function toast(t,type='s'){const d=document.createElement('div');d.className='to '+type;d.textContent=t;document.body.appendChild(d);requestAnimationFrame(()=>d.classList.add('show'));setTimeout(()=>{d.classList.remove('show');setTimeout(()=>d.remove(),400);},2200);}

// API helper
async function api(path,opts={}){const r=await fetch(API+path,opts);const j=await r.json().catch(()=>({}));if(!r.ok||!j.ok)toast(j.msg||'\u64CD\u4F5C\u5931\u8D25','e');return j;}
async function apiRaw(path,opts={}){return await fetch(API+path,opts);}

// Load items
async function loadItems(){const j=await api('/items');if(j.ok)allItems=j.items||[];renderTable();renderStats();}
function renderStats(){const s={total:allItems.length,img:0,vid:0,txt:0,pub:0,drf:0};allItems.forEach(i=>{if(i.type==='image')s.img++;else if(i.type==='video')s.vid++;else s.txt++;if(i.is_public)s.pub++;else s.drf++;});document.getElementById('statsBar').innerHTML='<div class="sc b" style="min-width:120px;"><div class="scn">'+s.total+'</div><div class="scl">\u603B\u5185\u5BB9</div></div><div class="sc g" style="min-width:100px;"><div class="scn">'+s.img+'</div><div class="scl">\u56FE\u7247</div></div><div class="sc p" style="min-width:100px;"><div class="scn">'+s.vid+'</div><div class="scl">\u89C6\u9891</div></div><div class="sc o" style="min-width:100px;"><div class="scn">'+s.txt+'</div><div class="scl">\u6587\u5B57</div></div><div class="sc g" style="min-width:100px;"><div class="scn">'+s.pub+'</div><div class="scl">\u5DF2\u53D1\u5E03</div></div><div class="sc o" style="min-width:100px;"><div class="scn">'+s.drf+'</div><div class="scl">\u8349\u7A3F</div></div>';}
function renderTable(){const q=(document.getElementById('searchInput').value||'').toLowerCase();const ft=document.getElementById('filterType').value;const fs=document.getElementById('filterStatus').value;let arr=allItems.slice();if(q)arr=arr.filter(i=>(i.title||'').toLowerCase().includes(q));if(ft)arr=arr.filter(i=>i.type===ft);if(fs!=='')arr=arr.filter(i=>String(i.is_public)===fs);arr.sort((a,b)=>(b.sort_weight||0)-(a.sort_weight||0)||(b.updated_at||'').localeCompare(a.updated_at||''));document.getElementById('itemsBody').innerHTML=arr.map(i=>{const st=i.is_public?('<span class="sd sp"></span>\u5DF2\u53D1\u5E03'):('<span class="sd sd2"></span>\u8349\u7A3F');const hid=i.is_hidden?(' <span class="sd sh"></span>\u9690\u85CF'):'';const cov=i.cover_key?('<img src="/file/'+encodeURIComponent(i.cover_key)+'" style="width:48px;height:36px;object-fit:cover;border-radius:6px;">'):'<span style="color:var(--text-3);font-size:var(--fs-m);">\u65E0</span>';return '<tr><td><input type="checkbox" class="rowChk" value="'+i.id+'"></td><td>'+cov+'</td><td><a href="/item/'+encodeURIComponent(i.slug||i.id)+'" target="_blank" style="color:var(--accent);font-weight:500;">'+esc(i.title||'\u65E0\u6807\u9898')+'</a><br><span style="font-size:var(--fs-m);color:var(--text-3);">/item/'+esc(i.slug||i.id)+'</span></td><td><span class="badge '+(i.type==='video'?'bv':i.type==='text'?'bt':'bi')+'">'+(i.type==='video'?'\u89C6\u9891':i.type==='text'?'\u6587\u5B57':'\u56FE\u7247')+'</span></td><td>'+(i.category||'-')+'</td><td>'+st+hid+'</td><td style="font-size:var(--fs-m);color:var(--text-3);">'+fmtDate(i.created_at)+'</td><td><button class="btn bs" onclick="editItem('+i.id+')">\u7F16\u8F91</button> <button class="btn bs bd" onclick="delItem('+i.id+')">\u5220\u9664</button></td></tr>';}).join('');}

// Edit modal
function showCreate(){editId=null;coverKey=null;attachKey=null;attachName='';document.getElementById('modalTitle').textContent='\u65B0\u5EFA\u5185\u5BB9';document.getElementById('editModal').style.display='flex';document.getElementById('previewArea').style.display='none';['f_title','f_description','f_type','f_category','f_custom_slug','f_tags','f_content','f_seo_description','f_seo_keywords','f_custom_css_class'].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});document.getElementById('f_type').value='image';document.getElementById('f_is_public').checked=false;document.getElementById('f_is_hidden').checked=false;document.getElementById('f_sort_weight').value='0';document.getElementById('f_publish_at').value='';document.getElementById('f_expire_at').value='';document.getElementById('coverPreview').innerHTML='';document.getElementById('attachPreview').innerHTML='';onTypeChange();}
function closeModal(){document.getElementById('editModal').style.display='none';}
async function editItem(id){const j=await api('/items');const item=(j.items||[]).find(x=>x.id===id);if(!item)return;editId=id;coverKey=item.cover_key||null;attachKey=item.attachment_key||null;attachName=item.attachment_name||'';document.getElementById('modalTitle').textContent='\u7F16\u8F91\uFF1A'+item.title;document.getElementById('editModal').style.display='flex';document.getElementById('previewArea').style.display='none';document.getElementById('f_title').value=item.title||'';document.getElementById('f_description').value=item.description||'';document.getElementById('f_type').value=item.type||'text';document.getElementById('f_category').value=item.category||'';document.getElementById('f_custom_slug').value=item.custom_slug||'';document.getElementById('f_tags').value=item.tags||'';document.getElementById('f_content').value=item.content||'';document.getElementById('f_seo_description').value=item.seo_description||'';document.getElementById('f_seo_keywords').value=item.seo_keywords||'';document.getElementById('f_custom_css_class').value=item.custom_css_class||'';document.getElementById('f_is_public').checked=!!item.is_public;document.getElementById('f_is_hidden').checked=!!item.is_hidden;document.getElementById('f_sort_weight').value=item.sort_weight||0;document.getElementById('f_publish_at').value=item.publish_at?item.publish_at.slice(0,16):'';document.getElementById('f_expire_at').value=item.expire_at?item.expire_at.slice(0,16):'';document.getElementById('coverPreview').innerHTML=coverKey?('<img src="/file/'+encodeURIComponent(coverKey)+'" style="max-width:160px;border-radius:8px;"> <button class="btn bs bd" onclick="coverKey=null;document.getElementById('coverPreview').innerHTML=''">\u6E05\u9664</button>'):'';document.getElementById('attachPreview').innerHTML=attachKey?('<span>\u{1F4CE} '+esc(attachName)+'</span> <button class="btn bs bd" onclick="attachKey=null;attachName='';document.getElementById('attachPreview').innerHTML=''">\u6E05\u9664</button>'):'';onTypeChange();}
function onTypeChange(){const t=document.getElementById('f_type').value;const c=document.getElementById('f_content');c.placeholder=t==='video'?'\u586B\u89C6\u9891 URL\uFF08mp4/webm\uFF09':t==='text'?'\u586B\u6587\u5B57\u6B63\u6587\uFF0C\u652F\u6301 HTML':'(\u5C01\u9762\u56FE\u72EC\u7ACB\u4E0A\u4F20\uFF0C\u6B64\u5904\u53EF\u586B\u6B63\u6587\u6216\u7559\u7A7A)';}

// Save
async function saveItem(){const data={title:document.getElementById('f_title').value.trim(),description:document.getElementById('f_description').value.trim(),type:document.getElementById('f_type').value,category:document.getElementById('f_category').value.trim(),custom_slug:document.getElementById('f_custom_slug').value.trim()||null,tags:document.getElementById('f_tags').value.trim(),content:document.getElementById('f_content').value,seo_description:document.getElementById('f_seo_description').value.trim(),seo_keywords:document.getElementById('f_seo_keywords').value.trim(),custom_css_class:document.getElementById('f_custom_css_class').value.trim(),is_public:document.getElementById('f_is_public').checked?1:0,is_hidden:document.getElementById('f_is_hidden').checked?1:0,sort_weight:parseInt(document.getElementById('f_sort_weight').value)||0,publish_at:document.getElementById('f_publish_at').value||null,expire_at:document.getElementById('f_expire_at').value||null,cover_key:coverKey,gallery_keys:[],attachment_key:attachKey,attachment_name:attachName};if(!data.title){toast('\u6807\u9898\u4E0D\u80FD\u4E3A\u7A7A','e');return;}const j=editId?await api('/items/'+editId,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)}):await api('/items',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});if(j.ok){toast(editId?'\u5DF2\u66F4\u65B0 \u2705':'\u5DF2\u521B\u5EFA \u2705');closeModal();loadItems();}}
async function delItem(id){if(!confirm('\u786E\u5B9A\u5220\u9664\uFF1F'))return;const j=await api('/items/'+id,{method:'DELETE'});if(j.ok){toast('\u5DF2\u5220\u9664 \u2705');loadItems();}}
function toggleAll(c){document.querySelectorAll('.rowChk').forEach(x=>x.checked=c.checked);}
async function batchDelete(){const ids=[...document.querySelectorAll('.rowChk:checked')].map(x=>parseInt(x.value));if(!ids.length){toast('\u8BF7\u5148\u9009\u62E9','e');return;}if(!confirm('\u786E\u5B9A\u5220\u9664 '+ids.length+' \u6761\uFF1F'))return;const j=await api('/items/batch',{method:'DELETE',headers:{'Content-Type':'application/json'},body:JSON.stringify({ids})});if(j.ok){toast('\u5DF2\u5220\u9664 \u2705');loadItems();}}

// Preview
async function previewItem(){const data={title:document.getElementById('f_title').value.trim()||'\u9884\u89C8\u6807\u9898',description:document.getElementById('f_description').value.trim(),type:document.getElementById('f_type').value,content:document.getElementById('f_content').value||'\u9884\u89C8\u5185\u5BB9...',category:document.getElementById('f_category').value.trim(),tags:document.getElementById('f_tags').value.trim(),cover_key:coverKey,is_public:1};const area=document.getElementById('previewArea');area.style.display='block';const cov=data.cover_key?('<img src="/file/'+encodeURIComponent(data.cover_key)+'" style="max-width:100%;border-radius:12px;margin-bottom:12px;">'):'';area.innerHTML=cov+'<h3 style="font-size:1.3rem;font-weight:700;margin-bottom:8px;">'+esc(data.title)+'</h3><p style="color:var(--text-2);margin-bottom:12px;">'+esc(data.description)+'</p><div style="padding:12px;background:var(--glass);border-radius:8px;">'+(data.content||'').replace(/\\n/g,'<br>')+'</div>';}

// Upload
async function doUpload(){const f=document.getElementById('fileInput').files[0];if(!f)return;const fd=new FormData();fd.append('file',f);document.getElementById('uploadStatus').textContent='\u4E0A\u4F20\u4E2D...';const r=await apiRaw('/upload',{method:'POST',body:fd});const j=await r.json().catch(()=>({}));if(j.ok){document.getElementById('uploadStatus').textContent='\u2705 '+j.name;document.getElementById('uploadResult').innerHTML='<div style="padding:var(--sp3);background:var(--glass);border-radius:var(--r2);"><p style="font-size:var(--fs-c);color:var(--text-2);margin-bottom:6px;">\u6700\u8FD1\u4E0A\u4F20\uFF1A</p><a href="'+j.url+'" target="_blank"><img src="'+j.url+'" style="max-width:200px;border-radius:8px;"></a><p style="margin-top:6px;font-size:var(--fs-m);color:var(--text-3);">'+j.key+'</p><div style="margin-top:8px;display:flex;gap:8px;"><button class="btn bs bp" onclick="useAsCover(''+j.key+'')">\u7528\u4F5C\u5C01\u9762</button><button class="btn bs bg" onclick="useAsContent(''+j.key+'')">\u7528\u4F5C\u5185\u5BB9</button><button class="btn bs bd" onclick="delFile(''+j.key+'')">\u5220\u9664</button></div></div>';loadKV();}else{document.getElementById('uploadStatus').textContent='\u274C \u5931\u8D25';}}
function useAsCover(k){coverKey=k;document.getElementById('coverPreview').innerHTML='<img src="/file/'+encodeURIComponent(k)+'" style="max-width:160px;border-radius:8px;">';toast('\u5DF2\u8BBE\u4E3A\u5C01\u9762');}
function useAsContent(k){document.getElementById('f_content').value='/file/'+k;toast('\u5DF2\u586B\u5165\u5185\u5BB9');}
async function delFile(k){if(!confirm('\u5220\u9664\u6587\u4EF6\uFF1F'))return;const j=await api('/file/'+encodeURIComponent(k),{method:'DELETE'});if(j.ok){toast('\u5DF2\u5220\u9664');loadKV();}}
async function uploadCover(){const f=document.getElementById('coverInput').files[0];if(!f)return;const fd=new FormData();fd.append('file',f);document.getElementById('coverStatus').textContent='\u4E0A\u4F20\u4E2D...';const r=await apiRaw('/upload',{method:'POST',body:fd});const j=await r.json().catch(()=>({}));if(j.ok){coverKey=j.key;document.getElementById('coverStatus').textContent='\u2705';document.getElementById('coverPreview').innerHTML='<img src="'+j.url+'" style="max-width:160px;border-radius:8px;">';}}
async function uploadAttach(){const f=document.getElementById('attachInput').files[0];if(!f)return;const fd=new FormData();fd.append('file',f);document.getElementById('attachStatus').textContent='\u4E0A\u4F20\u4E2D...';const r=await apiRaw('/upload',{method:'POST',body:fd});const j=await r.json().catch(()=>({}));if(j.ok){attachKey=j.key;attachName=j.name;document.getElementById('attachStatus').textContent='\u2705';document.getElementById('attachPreview').innerHTML='<span>\u{1F4CE} '+j.name+'</span>';}}

// KV list
async function loadKV(){const j=await api('/items');const all=j.items||[];const keys=new Set();all.forEach(i=>{if(i.thumbnail_key)keys.add(i.thumbnail_key);if(i.cover_key)keys.add(i.cover_key);if(i.attachment_key)keys.add(i.attachment_key);});const arr=[...keys];document.getElementById('kvList').innerHTML=!arr.length?'<p style="color:var(--text-3);font-size:var(--fs-c);">\u6682\u65E0\u6587\u4EF6</p>':arr.map(k=>'<div style="padding:var(--sp2);background:var(--glass);border-radius:var(--r2);font-size:var(--fs-m);display:flex;align-items:center;gap:6px;"><a href="/file/'+encodeURIComponent(k)+'" target="_blank" style="color:var(--accent);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">'+esc(k)+'</a><button class="btn bs bd" style="margin-left:auto;" onclick="delFile(''+k+'')">\xD7</button></div>').join('');}

// Categories
function renderCats(){document.getElementById('catList').innerHTML=cats.map((c,i)=>'<div class="cat-item"><input class="cat-color" type="color" value="'+esc(c.color||'#0071E3')+'" onchange="cats['+i+'].color=this.value;renderCats()"><input class="fi" style="flex:1;" value="'+esc(c.name)+'" onchange="cats['+i+'].name=this.value"><button class="btn bs bd" onclick="cats.splice('+i+',1);renderCats()">\u5220\u9664</button></div>').join('');}
function addCat(){cats.push({name:'\u65B0\u5206\u7C7B',color:'#'+Math.floor(Math.random()*16777215).toString(16).padStart(6,'0')});renderCats();}
async function saveCatsJson(){try{const arr=JSON.parse(document.getElementById('catsJson').value);cats=arr;const j=await api('/settings',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({categories:JSON.stringify(cats)})});if(j.ok)toast('\u5206\u7C7B\u5DF2\u4FDD\u5B58 \u2705');}catch(e){toast('JSON \u683C\u5F0F\u9519\u8BEF','e');}}

// Site settings
async function saveSite(){const fd={};const ids=['brand_name','site_title','site_subtitle','site_description','site_keywords','theme_dark_mode','hero_bg_type','footer_html','announcement_html','about_html','nav_links','copy_link_text','rss_enabled','sitemap_enabled'];for(const id of ids){const el=document.getElementById('s_'+id);if(el)fd[id]=el.value;}try{fd.nav_links=JSON.stringify(JSON.parse(fd.nav_links));}catch(e){toast('\u5BFC\u822A\u94FE\u63A5 JSON \u683C\u5F0F\u9519\u8BEF','e');return;}const j=await api('/settings',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(fd)});if(j.ok)toast('\u7AD9\u70B9\u8BBE\u7F6E\u5DF2\u4FDD\u5B58 \u2705');}
async function loadStats(){const j=await api('/stats');if(!j.ok)return;const s=j.stats;document.getElementById('statsBox').innerHTML='<div class="sc b" style="min-width:100px;"><div class="scn">'+s.total+'</div><div class="scl">\u603B\u5185\u5BB9</div></div><div class="sc g" style="min-width:80px;"><div class="scn">'+s.image+'</div><div class="scl">\u56FE\u7247</div></div><div class="sc p" style="min-width:80px;"><div class="scn">'+s.video+'</div><div class="scl">\u89C6\u9891</div></div><div class="sc o" style="min-width:80px;"><div class="scn">'+s.text+'</div><div class="scl">\u6587\u5B57</div></div><div class="sc g" style="min-width:80px;"><div class="scn">'+s.public+'</div><div class="scl">\u5DF2\u53D1\u5E03</div></div><div class="sc o" style="min-width:80px;"><div class="scn">'+s.draft+'</div><div class="scl">\u8349\u7A3F</div></div>';}

// Password
async function changePwd(){const o=document.getElementById('oldPwd').value;const n=document.getElementById('newPwd').value;if(!o||!n)return toast('\u8BF7\u586B\u5B8C\u6574','e');const j=await api('/change-password',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({old:o,new:n})});if(j.ok){toast('\u5BC6\u7801\u5DF2\u4FEE\u6539 \u2705');document.getElementById('oldPwd').value='';document.getElementById('newPwd').value='';}}

// Logout
async function logout(){await apiRaw('/logout');location.reload();}

// Init
(async()=>{await loadItems();})();
<\/script></body></html>`;
}
export {
  worker_default as default
};
