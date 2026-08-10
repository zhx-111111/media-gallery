/**
 * Media Gallery — Cloudflare Workers + D1 + KV
 * 参考 cloudmail 架构：db / kv / cache 绑定名固定
 *
 * ─── 零配置部署（5 步，全程网页）──────────────────────
 *  1. CF 控制台 → Workers & Pages → 连接 GitHub → 选本仓库
 *  2. CF 控制台 → 存储和数据库 → D1 → 创建 media_gallery_db
 *  3. CF 控制台 → 存储和数据库 → KV → 创建 media_kv + media_cache
 *  4. Worker → Settings → Bindings → db→D1, kv→KV, cache→KV
 *  5. Settings → Variables → INIT_SECRET=随机串 → 访问 /api/init/密钥
 *───────────────────────────────────────────────────────
 */
'use strict';
export default { async fetch(r,env){try{return await handle(r,env);}catch(e){return new Response('Error: '+e.message,{status:500,headers:{'Content-Type':'text/plain;charset=utf-8'}});}} };

// ─── 工具函数 ──────────────────────────────────────────────
const sha256=async t=>{const e=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(t));return[...new Uint8Array(e)].map(b=>b.toString(16).padStart(2,'0')).join('');};
const esc=s=>!s?'':String(s).replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const slugify=s=>!s?'':String(s).toLowerCase().replace(/[^a-z0-9\u4e00-\u9fa5]+/g,'-').replace(/^[-]+|[-]+$/g,'').substring(0,80);
const nowISO=()=>new Date().toISOString();
const jParse=(s,d)=>{try{return JSON.parse(s||'null')||d;}catch(e){return d;}};
const enc=encodeURIComponent;
const rand=k=>{let s='';const c='abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';for(let i=0;i<k;i++)s+=c[Math.floor(Math.random()*c.length)];return s;};
const visible=i=>{const n=new Date();if(i.is_hidden)return false;if(i.publish_at&&new Date(i.publish_at)>n)return false;if(i.expire_at&&new Date(i.expire_at)<n)return false;return true;};
const jR=d=>new Response(JSON.stringify(d),{headers:{'Content-Type':'application/json'}});
const htmlR=h=>new Response(h,{'Content-Type':'text/html;charset=utf-8'});
const errR=(e,st=500)=>new Response('Error: '+e.message,{status:st,headers:{'Content-Type':'text/plain;charset=utf-8'}});

// ─── CSS (Apple 静奢风 + 深度毛玻璃) ─────────────────────
const CSS = `:root{
  --bg-base:#ECEEF6;--bg-elev:rgba(255,255,255,.70);
  --text-1:#1C1C1E;--text-2:#5A5A62;--text-3:#9A9AA2;
  --accent:#0071E3;--accent-h:#0077ED;--accent-soft:rgba(0,113,227,.10);
  --danger:#FF3B30;--success:#34C759;--warn:#FF9500;
  --g-blue:linear-gradient(135deg,#0071E3,#5E5CE6);
  --glass:rgba(255,255,255,.55);--glass-s:rgba(255,255,255,.72);
  --blur:blur(28px) saturate(200%);--blur-lg:blur(44px) saturate(220%);
  --gb:1px solid rgba(255,255,255,.55);
  --glow:inset 0 1px 0 rgba(255,255,255,.65),inset 0 -1px 0 rgba(0,0,0,.04);
  --s1:0 1px 3px rgba(0,0,0,.04),inset 0 1px 0 rgba(255,255,255,.55);
  --s2:0 2px 14px rgba(0,0,0,.05),inset 0 1px 0 rgba(255,255,255,.50);
  --s3:0 4px 22px rgba(0,0,0,.06),inset 0 1px 0 rgba(255,255,255,.45);
  --s4:0 8px 38px rgba(0,0,0,.08),inset 0 1px 0 rgba(255,255,255,.40);
  --sg:0 0 28px rgba(0,113,227,.28);
  --r1:8px;--r2:12px;--r3:16px;--r4:22px;--r5:30px;--pill:999px;
  --font:-apple-system,BlinkMacSystemFont,'SF Pro Display','PingFang SC',sans-serif;
  --fs-d:clamp(2.2rem,6vw,3.8rem);--fs-h1:clamp(1.6rem,3.8vw,2.2rem);
  --fs-b:0.95rem;--fs-c:0.82rem;--fs-m:0.72rem;
  --fw-r:400;--fw-m:500;--fw-s:600;--fw-b:700;--fw-x:800;
  --lh-t:1.12;--lh-s:1.35;--lh-n:1.55;
  --tk:-0.035em;--tn:-0.01em;
  --ease:cubic-bezier(.4,0,.2,1);--spring:cubic-bezier(.34,1.56,.64,1);
  --t-f:220ms;--t-b:360ms;--t-s:520ms;
  --sp1:4px;--sp2:8px;--sp3:12px;--sp4:16px;--sp5:24px;--sp6:32px;--sp7:48px;--sp8:64px;
  --w-n:720px;--w-b:960px;--w-w:1200px;
}
*,*::before,*::after{margin:0;padding:0;box-sizing:border-box;}
html{scroll-behavior:smooth;-webkit-text-size-adjust:100%;}
body{font-family:var(--font);font-size:var(--fs-b);line-height:var(--lh-n);color:var(--text-1);background:var(--bg-base);min-height:100vh;-webkit-font-smoothing:antialiased;letter-spacing:var(--tn);position:relative;overflow-x:hidden;transition:background var(--t-s) var(--ease),color var(--t-s) var(--ease);}
body::before{content:'';position:fixed;inset:-20%;z-index:-2;background:radial-gradient(ellipse 55% 45% at 12% 18%,rgba(99,102,241,.20),transparent 70%),radial-gradient(ellipse 48% 55% at 88% 28%,rgba(168,85,247,.16),transparent 70%),radial-gradient(ellipse 52% 42% at 50% 82%,rgba(56,189,248,.18),transparent 70%),radial-gradient(ellipse 38% 48% at 78% 78%,rgba(52,211,153,.14),transparent 70%),radial-gradient(ellipse 42% 52% at 22% 68%,rgba(236,72,153,.11),transparent 70%),linear-gradient(165deg,#E8EAF5,#DFE3F5 30%,#E2DFF5 60%,#DCE5F0);animation:aurora 28s ease-in-out infinite;will-change:transform;}
body::after{content:'';position:fixed;inset:0;z-index:-1;pointer-events:none;background:radial-gradient(circle 280px at var(--mx,50%) var(--my,30%),rgba(255,255,255,.45),transparent 70%);}
@keyframes aurora{0%,100%{transform:translate(0,0) rotate(0) scale(1);}20%{transform:translate(-2%,1.5%) rotate(.8deg) scale(1.02);}40%{transform:translate(1.5%,-1%) rotate(-.5deg) scale(1.01);}60%{transform:translate(-1%,2%) rotate(.5deg) scale(1.03);}80%{transform:translate(2%,-1.5%) rotate(-.3deg) scale(1.01);}}
a{color:var(--accent);text-decoration:none;transition:color var(--t-f) var(--ease);}
a:hover{color:var(--accent-h);}
button{font-family:inherit;cursor:pointer;border:none;background:none;}
img,video{max-width:100%;display:block;}
input,textarea,select{font-family:inherit;font-size:inherit;color:inherit;}
@media (prefers-reduced-motion:reduce){*,*::before,*::after{animation-duration:.01ms!important;animation-iteration-count:1!important;transition-duration:.01ms!important;scroll-behavior:auto!important;}body::before{animation:none;}}

/* Nav */
.nav{position:sticky;top:0;z-index:100;background:rgba(255,255,255,.42);backdrop-filter:blur(36px) saturate(220%);-webkit-backdrop-filter:blur(36px) saturate(220%);border-bottom:var(--gb);box-shadow:var(--glow),0 4px 28px rgba(0,0,0,.04);}
.nav-in{max-width:var(--w-w);margin:0 auto;padding:var(--sp3) var(--sp5);display:flex;align-items:center;justify-content:space-between;gap:var(--sp4);}
.brand{font-size:1.18rem;font-weight:var(--fw-x);letter-spacing:var(--tk);background:var(--g-blue);background-size:200% 200%;-webkit-background-clip:text;-webkit-text-fill-color:transparent;animation:bs 8s ease infinite;filter:drop-shadow(0 1px 10px rgba(0,113,227,.18));}
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
.hs{font-size:var(--fs-bl,1.05rem);color:var(--text-2);max-width:640px;margin:0 auto var(--sp5);line-height:1.7;}
.ha{display:flex;gap:var(--sp3);justify-content:center;flex-wrap:wrap;}

/* Filter chips */
.fbar{display:flex;gap:var(--sp2);justify-content:center;flex-wrap:wrap;padding:var(--sp4) var(--sp5);max-width:var(--w-w);margin:0 auto;}
.chip{display:inline-flex;align-items:center;padding:var(--sp1) var(--sp3);border-radius:var(--pill);font-size:var(--fs-m);font-weight:var(--fw-m);background:var(--glass);color:var(--text-2);border:var(--gb);backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);transition:all var(--t-f) var(--ease);box-shadow:var(--s1);cursor:pointer;text-decoration:none;}
.chip:hover{background:var(--glass-s);color:var(--text-1);transform:translateY(-1px);box-shadow:var(--s2);}
.chip.act{background:rgba(0,113,227,.10);color:var(--accent);border-color:rgba(0,113,227,.25);}

/* Grid & Cards */
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:var(--sp5);max-width:var(--w-w);margin:0 auto;padding:0 var(--sp5) var(--sp7);}
.card{background:var(--glass);backdrop-filter:var(--blur);-webkit-backdrop-filter:var(--blur);border:var(--gb);border-radius:var(--r4);box-shadow:var(--s2),var(--glow);overflow:hidden;transition:all var(--t-b) var(--spring);display:flex;flex-direction:column;}
.card:hover{transform:translateY(-6px);box-shadow:var(--s4),var(--sg),var(--glow);}
.card-media{position:relative;aspect-ratio:4/3;overflow:hidden;background:rgba(0,0,0,.04);}
.card-media img,.card-media video{width:100%;height:100%;object-fit:cover;transition:transform var(--t-s) var(--ease);}
.card:hover .card-media img,.card:hover .card-media video{transform:scale(1.03);}
.card-body{padding:var(--sp4);display:flex;flex-direction:column;gap:var(--sp2);flex:1;}
.card-title{font-size:1.05rem;font-weight:var(--fw-s);color:var(--text-1);line-height:var(--lh-s);}
.card-desc{font-size:var(--fs-c);color:var(--text-2);line-height:var(--lh-n);flex:1;}
.card-meta{display:flex;align-items:center;gap:var(--sp2);font-size:var(--fs-m);color:var(--text-3);}

/* Badge */
.badge{display:inline-flex;align-items:center;padding:2px 10px;border-radius:var(--pill);font-size:0.7rem;font-weight:var(--fw-s);color:#fff;box-shadow:0 1px 4px rgba(0,0,0,.08);}
.badge-img{background:var(--g-blue);}
.badge-vid{background:linear-gradient(135deg,#FF2D55,#FF375F);}
.badge-txt{background:linear-gradient(135deg,#30B0C7,#00C7BE);}

/* Buttons */
.btn{display:inline-flex;align-items:center;gap:6px;padding:10px 22px;border-radius:var(--pill);font-size:var(--fs-c);font-weight:var(--fw-m);transition:all var(--t-f) var(--ease);text-decoration:none;}
.btn-pri{background:var(--g-blue);color:#fff;box-shadow:var(--s2),0 0 20px rgba(0,113,227,.15);}
.btn-pri:hover{transform:translateY(-2px);box-shadow:var(--s3),0 0 32px rgba(0,113,227,.25);color:#fff;}
.btn-ghost{background:var(--glass);color:var(--text-1);border:var(--gb);backdrop-filter:blur(14px);}
.btn-ghost:hover{background:var(--glass-s);transform:translateY(-1px);}

/* Pagination */
.pagi{display:flex;justify-content:center;gap:var(--sp2);padding:var(--sp5);}
.pagi a,.pagi span{padding:8px 16px;border-radius:var(--r2);font-size:var(--fs-c);}
.pagi a{background:var(--glass);color:var(--text-1);text-decoration:none;transition:all var(--t-f) var(--ease);}
.pagi a:hover{background:var(--glass-s);}
.pagi .cur{background:var(--accent);color:#fff;}

/* Search */
.search{display:flex;justify-content:center;padding:var(--sp3) var(--sp5);}
.search input{flex:1;max-width:480px;padding:10px 20px;border-radius:var(--pill);border:var(--gb);background:var(--glass);backdrop-filter:blur(14px);font-size:var(--fs-c);outline:none;transition:all var(--t-f) var(--ease);}
.search input:focus{border-color:rgba(0,113,227,.4);box-shadow:0 0 0 3px rgba(0,113,227,.1);}

/* Announcement */
.ann{margin:var(--sp4) auto 0;max-width:var(--w-w);padding:0 var(--sp5);}
.ann-in{background:var(--glass);backdrop-filter:blur(20px);border:var(--gb);border-radius:var(--r3);padding:var(--sp3) var(--sp4);font-size:var(--fs-c);color:var(--text-2);box-shadow:var(--s1);}

/* Footer */
.footer{text-align:center;padding:var(--sp6) var(--sp5);font-size:var(--fs-m);color:var(--text-3);}

/* Detail */
.detail{max-width:var(--w-b);margin:var(--sp6) auto;padding:0 var(--sp5);}
.detail-card{background:var(--glass);backdrop-filter:var(--blur);border:var(--gb);border-radius:var(--r4);box-shadow:var(--s3),var(--glow);overflow:hidden;}
.detail-media{aspect-ratio:16/9;background:rgba(0,0,0,.04);}
.detail-media img,.detail-media video{width:100%;height:100%;object-fit:contain;}
.detail-body{padding:var(--sp5);}
.detail-title{font-size:var(--fs-h1);font-weight:var(--fw-b);margin-bottom:var(--sp3);}
.detail-desc{font-size:var(--fs-b);color:var(--text-2);line-height:1.7;margin-bottom:var(--sp4);}
.detail-actions{display:flex;gap:var(--sp3);flex-wrap:wrap;}

/* Toast */
.toast{position:fixed;bottom:32px;left:50%;transform:translateX(-50%) translateY(20px);padding:12px 28px;border-radius:var(--pill);font-size:var(--fs-c);font-weight:var(--fw-m);color:#fff;background:rgba(0,0,0,.78);backdrop-filter:blur(16px);opacity:0;transition:all var(--t-b) var(--spring);z-index:999;pointer-events:none;}
.toast.show{opacity:1;transform:translateX(-50%) translateY(0);}
.toast-success{background:rgba(52,199,89,.92);}
.toast-error{background:rgba(255,59,48,.92);}

/* FAB */
.fab{position:fixed;bottom:28px;right:28px;width:56px;height:56px;border-radius:50%;background:var(--g-blue);color:#fff;font-size:1.4rem;display:flex;align-items:center;justify-content:center;box-shadow:var(--s3),0 0 32px rgba(0,113,227,.3);transition:all var(--t-f) var(--ease);z-index:90;}
.fab:hover{transform:scale(1.08);box-shadow:var(--s4),0 0 44px rgba(0,113,227,.4);}

/* Admin */
.admin-wrap{max-width:var(--w-w);margin:var(--sp5) auto;padding:0 var(--sp5);}
.admin-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:var(--sp5);}
.stat-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:var(--sp4);margin-bottom:var(--sp5);}
.stat-card{background:var(--glass);backdrop-filter:var(--blur);border:var(--gb);border-radius:var(--r3);padding:var(--sp4);box-shadow:var(--s2),var(--glow);position:relative;overflow:hidden;}
.stat-card::before{content:'';position:absolute;left:0;top:0;bottom:0;width:3px;border-radius:var(--r3) 0 0 var(--r3);}
.stat-card.s1::before{background:var(--g-blue);}
.stat-card.s2::before{background:linear-gradient(135deg,#34C759,#30D158);}
.stat-card.s3::before{background:linear-gradient(135deg,#FF9500,#FF6B35);}
.stat-card.s4::before{background:linear-gradient(135deg,#5E5CE6,#BF5AF2);}
.stat-num{font-size:2rem;font-weight:var(--fw-x);}
.stat-lbl{font-size:var(--fs-m);color:var(--text-3);}

/* Table */
.tbl{width:100%;border-collapse:collapse;background:var(--glass);backdrop-filter:var(--blur);border:var(--gb);border-radius:var(--r3);overflow:hidden;box-shadow:var(--s2);}
.tbl th,.tbl td{padding:12px 14px;text-align:left;font-size:var(--fs-c);border-bottom:1px solid rgba(0,0,0,.04);}
.tbl th{background:rgba(255,255,255,.5);font-weight:var(--fw-s);color:var(--text-2);}
.tbl tr:hover td{background:rgba(255,255,255,.35);}
.status-dot{width:8px;height:8px;border-radius:50%;display:inline-block;margin-right:6px;}
.status-pub{background:var(--success);box-shadow:0 0 8px rgba(52,199,89,.4);}
.status-draft{background:var(--warn);box-shadow:0 0 8px rgba(255,149,0,.4);}

/* Modal */
.modal-bg{position:fixed;inset:0;background:rgba(0,0,0,.4);backdrop-filter:var(--blur-lg);-webkit-backdrop-filter:var(--blur-lg);z-index:200;display:flex;align-items:center;justify-content:center;padding:var(--sp4);}
.modal{background:rgba(255,255,255,.85);backdrop-filter:var(--blur-lg);border:var(--gb);border-radius:var(--r4);box-shadow:var(--s4),var(--glow);max-width:640px;width:100%;max-height:85vh;overflow-y:auto;padding:var(--sp5);}
.modal h2{font-size:1.3rem;font-weight:var(--fw-b);margin-bottom:var(--sp4);}
.form-row{margin-bottom:var(--sp3);}
.form-row label{display:block;font-size:var(--fs-m);font-weight:var(--fw-m);color:var(--text-2);margin-bottom:4px;}
.form-row input,.form-row textarea,.form-row select{width:100%;padding:10px 14px;border-radius:var(--r2);border:1px solid rgba(0,0,0,.1);background:rgba(255,255,255,.7);font-size:var(--fs-c);outline:none;transition:border var(--t-f);}
.form-row input:focus,.form-row textarea:focus,.form-row select:focus{border-color:var(--accent);box-shadow:0 0 0 3px rgba(0,113,227,.1);}

/* Dark Mode */
.dark-mode{--bg-base:#0D0D0F;--text-1:#F5F5F7;--text-2:#A1A1A6;--text-3:#6E6E73;--glass:rgba(255,255,255,.06);--glass-s:rgba(255,255,255,.10);--gb:1px solid rgba(255,255,255,.10);--glow:inset 0 1px 0 rgba(255,255,255,.06);}
.dark-mode body{background:#0D0D0F;}
.dark-mode .card,.dark-mode .stat-card,.dark-mode .tbl,.dark-mode .modal,.dark-mode .chip,.dark-mode .nav,.dark-mode .ann-in,.dark-mode .search input{background:rgba(255,255,255,.05);}
.dark-mode .form-row input,.dark-mode .form-row textarea,.dark-mode .form-row select{background:rgba(255,255,255,.06);color:#fff;border-color:rgba(255,255,255,.1);}

/* Lazy */
.lazy{opacity:0;transition:opacity var(--t-s) var(--ease);}
.lazy.loaded{opacity:1;}

/* Copy btn */
.copy-btn{display:inline-flex;align-items:center;gap:4px;padding:6px 14px;border-radius:var(--pill);font-size:var(--fs-m);background:var(--accent-soft);color:var(--accent);border:1px solid rgba(0,113,227,.15);cursor:pointer;transition:all var(--t-f);}
.copy-btn:hover{background:rgba(0,113,227,.15);}

/* Gallery stack */
.gallery-stack{display:flex;flex-direction:column;gap:var(--sp4);}
.gallery-item{border-radius:var(--r3);overflow:hidden;box-shadow:var(--s2);}
.gallery-item img{width:100%;height:auto;display:block;}

/* Responsive */
@media(max-width:720px){
  .grid{grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:var(--sp3);}
  .nav-in{flex-wrap:wrap;}
  .hero{padding:var(--sp6) var(--sp4);}
  .detail-media{aspect-ratio:4/3;}
}`;

function getCSS(){return CSS;}

// ─── DB 初始化（幂等）────────────────────────────────────
let _dbReady=false;
async function initDB(env){
  if(_dbReady)return;
  try{
    const t=await env.db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='media_items'").first();
    if(t){_dbReady=true;return;}
  }catch(e){}
  const stmts=[
    "CREATE TABLE IF NOT EXISTS media_items(id INTEGER PRIMARY KEY AUTOINCREMENT,type TEXT NOT NULL,title TEXT NOT NULL,description TEXT DEFAULT '',content TEXT NOT NULL,thumbnail_key TEXT DEFAULT NULL,tags TEXT DEFAULT '',sort_order INTEGER DEFAULT 0,is_public INTEGER DEFAULT 0,created_at TEXT DEFAULT(datetime('now')),updated_at TEXT DEFAULT(datetime('now')),slug TEXT UNIQUE,custom_slug TEXT DEFAULT NULL,cover_key TEXT DEFAULT NULL,category TEXT DEFAULT '',seo_description TEXT DEFAULT '',seo_keywords TEXT DEFAULT '',publish_at TEXT DEFAULT NULL,expire_at TEXT DEFAULT NULL,sort_weight INTEGER DEFAULT 0,is_hidden INTEGER DEFAULT 0,gallery_keys TEXT DEFAULT '[]',attachment_key TEXT DEFAULT NULL,attachment_name TEXT DEFAULT '',custom_css_class TEXT DEFAULT '',views INTEGER DEFAULT 0)",
    "CREATE INDEX IF NOT EXISTS idx_type ON media_items(type)",
    "CREATE INDEX IF NOT EXISTS idx_public ON media_items(is_public)",
    "CREATE INDEX IF NOT EXISTS idx_cslug ON media_items(custom_slug)",
    "CREATE TABLE IF NOT EXISTS admins(id INTEGER PRIMARY KEY AUTOINCREMENT,username TEXT UNIQUE NOT NULL,password_hash TEXT NOT NULL,created_at TEXT DEFAULT(datetime('now')))",
    "CREATE TABLE IF NOT EXISTS site_settings(k TEXT PRIMARY KEY,v TEXT NOT NULL,updated_at TEXT DEFAULT(datetime('now')))"
  ];
  for(const s of stmts){
    try{await env.db.prepare(s).run();}
    catch(e){console.error('init SQL error:',e.message);}
  }
  const pwd=env.ADMIN_PASSWORD||env.INIT_SECRET||'admin123';
  await env.db.prepare('INSERT OR IGNORE INTO admins(username,password_hash) VALUES(?,?)').bind('admin',await sha256(pwd)).run();
  const brand=env.DEFAULT_BRAND||'Gallery';
  const defs=[
    ['site_title','精选作品'],
    ['site_subtitle','图片 · 视频 · 文字 — 一切精彩，尽收眼底'],
    ['brand_name',brand],
    ['theme_accent','#0071E3'],
    ['theme_dark_mode','off'],
    ['hero_bg_type','gradient'],
    ['hero_gradient',''],
    ['hero_image_key',''],
    ['hero_video_url',''],
    ['footer_html',''],
    ['announcement_html',''],
    ['nav_links','[]'],
    ['about_html',''],
    ['copy_link_text','复制链接'],
    ['lazy_placeholder',''],
    ['rss_enabled','1'],
    ['sitemap_enabled','1'],
    ['site_description',''],
    ['site_keywords',''],
    ['favicon_key',''],
    ['brand_logo_key',''],
    ['categories','[{"name":"摄影","color":"#FF6B6B"},{"name":"设计","color":"#A29BFE"},{"name":"视频","color":"#00B894"},{"name":"随笔","color":"#FDCB6E"}]']
  ];
  for(const[k,v]of defs)await env.db.prepare('INSERT OR IGNORE INTO site_settings(k,v) VALUES(?,?)').bind(k,v).run();
  _dbReady=true;
}

// ─── 设置缓存 ─────────────────────────────────────────────
async function getSettings(env){
  const c=await env.cache.get('site_settings');
  if(c)return JSON.parse(c);
  const rows=await env.db.prepare('SELECT k,v FROM site_settings').all();
  const m={};for(const r of rows)m[r.k]=r.v;
  await env.cache.put('site_settings',JSON.stringify(m),{expirationTtl:300});
  return m;
}
async function setSetting(env,k,v){
  await env.db.prepare("INSERT OR REPLACE INTO site_settings(k,v,updated_at) VALUES(?,?,datetime('now'))").bind(k,v).run();
  await env.cache.delete('site_settings');
}
async function getPublicItems(env){
  const c=await env.cache.get('public_items');
  if(c)return JSON.parse(c);
  const rows=await env.db.prepare('SELECT * FROM media_items WHERE is_public=1 AND is_hidden=0 ORDER BY sort_weight DESC, COALESCE(publish_at,created_at) DESC').all();
  const items=rows.results||rows;
  await env.cache.put('public_items',JSON.stringify(items),{expirationTtl:120});
  return items;
}

// ─── 鉴权 ──────────────────────────────────────────────────
async function checkAuth(r,env){
  const c=r.headers.get('cookie')||'';
  const m=c.match(/mg_session=([^;]+)/);
  if(!m)return false;
  const [user,hash]=decodeURIComponent(m[1]).split(':');
  if(!user||!hash)return false;
  const a=await env.db.prepare('SELECT password_hash FROM admins WHERE username=?').bind(user).first();
  return a&&a.password_hash===hash;
}
async function getCurUser(r,env){
  const c=r.headers.get('cookie')||'';
  const m=c.match(/mg_session=([^;]+)/);
  if(!m)return null;
  const [user]=decodeURIComponent(m[1]).split(':');
  return user||null;
}

// ─── 路由入口 ──────────────────────────────────────────────
async function handle(r,env){
  const u=new URL(r.url);
  const p=u.pathname;

  if(p==='/favicon.ico')return serveFavicon(r,env);
  if(p.startsWith('/file/'))return serveFile(r,env,p.slice(6));
  if(p.startsWith('/api/'))return handleAPI(r,env,u);
  await initDB(env);

  if(p==='/'||p==='/index.html')return htmlR(await renderHome(r,env,u));
  if(p==='/admin')return htmlR(await renderAdmin(r,env));
  if(p==='/about')return htmlR(await renderAbout(r,env));
  if(p.startsWith('/item/'))return htmlR(await renderDetail(r,env,u,p.slice(6)));
  if(p==='/rss.xml')return serveRSS(r,env);
  if(p==='/sitemap.xml')return serveSitemap(r,env);

  return errR(new Error('Not Found'),404);
}

// ─── API ──────────────────────────────────────────────────
async function handleAPI(r,env,u){
  const p=u.pathname;

  // INIT
  const initMatch=p.match(/^\/api\/init\/([\w-]+)$/);
  if(initMatch){
    const secret=initMatch[1];
    const expected=env.INIT_SECRET||'';
    if(!expected||secret!==expected)return jR({ok:false,msg:'invalid or missing INIT_SECRET'});
    await initDB(env);
    const pwd=env.ADMIN_PASSWORD||expected;
    await env.db.prepare('INSERT OR IGNORE INTO admins(username,password_hash) VALUES(?,?)').bind('admin',await sha256(pwd)).run();
    await env.db.prepare('UPDATE admins SET password_hash=? WHERE username=?').bind(await sha256(pwd),'admin').run();
    return jR({ok:true,msg:'initialized',login:'/admin',username:'admin',password:pwd});
  }

  // Login
  if(p==='/api/login'&&r.method==='POST'){
    const f=await r.json().catch(()=>({}));
    const a=await env.db.prepare('SELECT password_hash FROM admins WHERE username=?').bind(f.username||'').first();
    if(!a||a.password_hash!==await sha256(f.password||''))return jR({ok:false,msg:'用户名或密码错误'});
    const en=encodeURIComponent(f.username+':'+a.password_hash);
    return new Response(JSON.stringify({ok:true}),{headers:{'Content-Type':'application/json','Set-Cookie':'mg_session='+en+'; Path=/; Max-Age=86400; SameSite=Lax'}});
  }
  if(p==='/api/logout')return new Response(JSON.stringify({ok:true}),{headers:{'Content-Type':'application/json','Set-Cookie':'mg_session=; Path=/; Max-Age=0'}});

  const auth=await checkAuth(r,env);
  if(!auth)return jR({ok:false,msg:'unauthorized'},401);

  // List
  if(p==='/api/items'&&r.method==='GET'){
    const rows=await env.db.prepare('SELECT * FROM media_items ORDER BY COALESCE(sort_weight,0) DESC,updated_at DESC').all();
    return jR({ok:true,items:rows.results||rows});
  }
  // Create
  if(p==='/api/items'&&r.method==='POST'){
    const f=await r.json().catch(()=>({}));
    const slug=f.custom_slug||slugify(f.title)||rand(8);
    const r2=await env.db.prepare('INSERT INTO media_items(type,title,description,content,thumbnail_key,tags,sort_order,is_public,slug,custom_slug,cover_key,category,seo_description,seo_keywords,publish_at,expire_at,sort_weight,is_hidden,gallery_keys,attachment_key,attachment_name,custom_css_class) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)')
      .bind(f.type||'text',f.title||'无标题',f.description||'',f.content||'',f.thumbnail_key||null,f.tags||'',f.sort_order||0,f.is_public?1:0,slug,f.custom_slug||null,f.cover_key||null,f.category||'',f.seo_description||'',f.seo_keywords||'',f.publish_at||null,f.expire_at||null,f.sort_weight||0,f.is_hidden?1:0,JSON.stringify(f.gallery_keys||[]),f.attachment_key||null,f.attachment_name||'',f.custom_css_class||'').run();
    await env.cache.delete('public_items');
    return jR({ok:true,id:r2.meta&&r2.meta.last_row_id});
  }
  // Update
  if(p.startsWith('/api/items/')&&r.method==='PUT'){
    const id=p.split('/')[3];
    const f=await r.json().catch(()=>({}));
    const allowed=['type','title','description','content','thumbnail_key','tags','sort_order','is_public','custom_slug','cover_key','category','seo_description','seo_keywords','publish_at','expire_at','sort_weight','is_hidden','gallery_keys','attachment_key','attachment_name','custom_css_class'];
    const sets=[];const binds=[];
    for(const k of allowed)if(k in f){sets.push(k+'=?');binds.push(k==='gallery_keys'?JSON.stringify(f[k]):f[k]);}
    sets.push("updated_at=datetime('now')");
    binds.push(id);
    await env.db.prepare('UPDATE media_items SET '+sets.join(',')+' WHERE id=?').bind(...binds).run();
    await env.cache.delete('public_items');
    return jR({ok:true});
  }
  // Delete
  if(p.startsWith('/api/items/')&&r.method==='DELETE'){
    const id=p.split('/')[3];
    const item=await env.db.prepare('SELECT * FROM media_items WHERE id=?').bind(id).first();
    if(item){
      if(item.thumbnail_key)await env.kv.delete(item.thumbnail_key).catch(()=>{});
      if(item.cover_key)await env.kv.delete(item.cover_key).catch(()=>{});
      if(item.attachment_key)await env.kv.delete(item.attachment_key).catch(()=>{});
      const gk=jParse(item.gallery_keys,[]);
      for(const k of gk)await env.kv.delete(k).catch(()=>{});
    }
    await env.db.prepare('DELETE FROM media_items WHERE id=?').bind(id).run();
    await env.cache.delete('public_items');
    return jR({ok:true});
  }
  // Batch delete
  if(p==='/api/items/batch'&&r.method==='DELETE'){
    const f=await r.json().catch(()=>({}));
    const ids=f.ids||[];
    for(const id of ids){const item=await env.db.prepare('SELECT * FROM media_items WHERE id=?').bind(id).first();if(item){if(item.thumbnail_key)await env.kv.delete(item.thumbnail_key).catch(()=>{});if(item.cover_key)await env.kv.delete(item.cover_key).catch(()=>{});if(item.attachment_key)await env.kv.delete(item.attachment_key).catch(()=>{});}}
    if(ids.length){const ph=ids.map(()=>'?').join(',');await env.db.prepare('DELETE FROM media_items WHERE id IN ('+ph+')').bind(...ids).run();}
    await env.cache.delete('public_items');
    return jR({ok:true});
  }
  // Upload
  if(p==='/api/upload'&&r.method==='POST'){
    const fd=await r.formData().catch(()=>null);
    if(!fd)return jR({ok:false,msg:'invalid form'});
    const file=fd.get('file');
    if(!file)return jR({ok:false,msg:'no file'});
    const max=parseInt(env.MAX_FILE_SIZE||'25165824',10);
    if(file.size>max)return jR({ok:false,msg:'file too large'});
    const key=rand(16)+'_'+file.name.replace(/[^a-zA-Z0-9._-]/g,'_');
    await env.kv.put(key,await file.arrayBuffer(),{metadata:{type:file.type||'application/octet-stream',name:file.name}});
    return jR({ok:true,key:key,name:file.name,url:'/file/'+encodeURIComponent(key)});
  }
  // Delete file
  if(p.startsWith('/api/file/')&&r.method==='DELETE'){
    const key=decodeURIComponent(p.slice(10));
    await env.kv.delete(key).catch(()=>{});
    return jR({ok:true});
  }
  // Settings
  if(p==='/api/settings'&&r.method==='GET')return jR({ok:true,settings:await getSettings(env)});
  if(p==='/api/settings'&&r.method==='PUT'){
    const f=await r.json().catch(()=>({}));
    for(const[k,v]of Object.entries(f))await setSetting(env,k,typeof v==='string'?v:JSON.stringify(v));
    return jR({ok:true});
  }
  // Stats
  if(p==='/api/stats'&&r.method==='GET'){
    const all=await env.db.prepare('SELECT type,is_public FROM media_items').all();
    const items=all.results||all;
    const s={total:items.length,image:0,video:0,text:0,public:0,draft:0,views:0};
    for(const i of items){if(i.type==='image')s.image++;else if(i.type==='video')s.video++;else s.text++;if(i.is_public)s.public++;else s.draft++;s.views+=(i.views||0);}
    return jR({ok:true,stats:s});
  }
  // Change password
  if(p==='/api/change-password'&&r.method==='POST'){
    const f=await r.json().catch(()=>({}));
    const u=await getCurUser(r,env);
    const a=await env.db.prepare('SELECT password_hash FROM admins WHERE username=?').bind(u).first();
    if(!a||a.password_hash!==await sha256(f.old||''))return jR({ok:false,msg:'原密码错误'});
    await env.db.prepare('UPDATE admins SET password_hash=? WHERE username=?').bind(await sha256(f.new||''),u).run();
    return jR({ok:true});
  }

  return jR({ok:false,msg:'unknown api'},404);
}

// ─── 文件服务 ──────────────────────────────────────────────
async function serveFile(r,env,key){
  const data=await env.kv.get(key,{type:'arrayBuffer'}).catch(()=>null);
  if(!data)return errR(new Error('Not Found'),404);
  const meta=await env.kv.getWithMetadata(key).catch(()=>({}));
  const t=(meta&&meta.metadata&&meta.metadata.type)||'application/octet-stream';
  return new Response(data,{headers:{'Content-Type':t,'Cache-Control':'public, max-age=31536000'}});
}
async function serveFavicon(r,env){
  const cfg=await getSettings(env);
  if(cfg.favicon_key){return serveFile(r,env,cfg.favicon_key);}
  const svg='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="8" fill="#0071E3"/><text x="16" y="22" text-anchor="middle" font-size="18" fill="#fff" font-family="sans-serif">G</text></svg>';
  return new Response(svg,{headers:{'Content-Type':'image/svg+xml','Cache-Control':'public, max-age=86400'}});
}

// ─── RSS / Sitemap ─────────────────────────────────────────
async function serveRSS(r,env){
  const cfg=await getSettings(env);
  if(cfg.rss_enabled!=='1')return errR(new Error('RSS disabled'),404);
  const items=await getPublicItems(env);
  const base=new URL(r.url).origin;
  let xml='<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0"><channel><title>'+esc(cfg.site_title||'Gallery')+'</title><link>'+base+'</link><description>'+esc(cfg.site_description||'')+'</description>\n';
  for(const i of items){xml+='<item><title>'+esc(i.title)+'</title><link>'+base+'/item/'+enc(i.slug||i.id)+'</link><description>'+esc(i.description||'')+'</description><pubDate>'+(i.created_at||'')+'</pubDate></item>\n';}
  xml+='</channel></rss>';
  return new Response(xml,{headers:{'Content-Type':'application/rss+xml;charset=utf-8'}});
}
async function serveSitemap(r,env){
  const cfg=await getSettings(env);
  if(cfg.sitemap_enabled!=='1')return errR(new Error('Sitemap disabled'),404);
  const items=await getPublicItems(env);
  const base=new URL(r.url).origin;
  let xml='<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';
  xml+='<url><loc>'+base+'/</loc></url>\n';
  xml+='<url><loc>'+base+'/about</loc></url>\n';
  for(const i of items){xml+='<url><loc>'+base+'/item/'+enc(i.slug||i.id)+'</loc></url>\n';}
  xml+='</urlset>';
  return new Response(xml,{headers:{'Content-Type':'application/xml;charset=utf-8'}});
}

// ─── 前台首页 ──────────────────────────────────────────────
async function renderHome(r,env,u){
  const cfg=await getSettings(env);
  const items=await getPublicItems(env);
  const page=parseInt(u.searchParams.get('page')||'1');
  const cat=u.searchParams.get('cat')||'';
  const search=u.searchParams.get('q')||'';
  const pageSize=parseInt(env.PAGE_SIZE||'24');
  let list=items.filter(visible);
  if(cat)list=list.filter(i=>i.category===cat);
  if(search){const q=search.toLowerCase();list=list.filter(i=>(i.title||'').toLowerCase().includes(q)||(i.description||'').toLowerCase().includes(q));}
  const total=list.length;
  const totalPages=Math.max(1,Math.ceil(total/pageSize));
  const cur=Math.min(Math.max(1,page),totalPages);
  const start=(cur-1)*pageSize;
  const pageItems=list.slice(start,start+pageSize);
  const cats=jParse(cfg.categories,'[]');
  const navLinks=jParse(cfg.nav_links,'[]');
  let annHtml='';
  if(cfg.announcement_html){annHtml='<div class="ann"><div class="ann-in">'+cfg.announcement_html+'</div></div>';}
  let heroInner='';
  if(cfg.hero_bg_type==='image'&&cfg.hero_image_key){heroInner='<div class="hero-bg"><img src="/file/'+enc(cfg.hero_image_key)+'" alt=""></div>';}
  else if(cfg.hero_bg_type==='video'&&cfg.hero_video_url){heroInner='<div class="hero-bg"><video src="'+esc(cfg.hero_video_url)+'" autoplay muted loop playsinline></video></div>';}
  const heroTitle=cfg.site_title||'精选作品';
  const heroSub=cfg.site_subtitle||'图片 · 视频 · 文字';
  let brandHtml='<span class="brand">'+(cfg.brand_name||'Gallery')+'</span>';
  if(cfg.brand_logo_key){brandHtml='<a href="/" class="brand"><img src="/file/'+enc(cfg.brand_logo_key)+'" style="height:32px;width:auto;border-radius:8px;"></a>';}
  let navHtml='';
  for(const l of navLinks){navHtml+='<a href="'+esc(l.url||'#')+'" class="nav-a" target="_blank" rel="noopener">'+(l.label||'Link')+'</a>';}
  let chipHtml='<a href="/" class="chip'+(!cat?' act':'')+'">全部</a>';
  for(const c of cats){chipHtml+='<a href="/?cat='+enc(c.name)+'" class="chip'+(cat===c.name?' act':'')+'">'+esc(c.name)+'</a>';}
  let cards='';
  for(const it of pageItems){
    const cover=it.cover_key?'/file/'+enc(it.cover_key):(it.thumbnail_key?'/file/'+enc(it.thumbnail_key):'');
    const badgeCls=it.type==='image'?'badge-img':it.type==='video'?'badge-vid':'badge-txt';
    const badgeTxt=it.type==='image'?'图片':it.type==='video'?'视频':'文字';
    const lazyAttr=cover?'loading="lazy" data-src="'+cover+'" class="lazy"':'';
    cards+='<article class="card"><a href="/item/'+enc(it.slug||it.id)+'" style="text-decoration:none;color:inherit;display:block;"><div class="card-media">'+(cover?'<img '+lazyAttr+' alt="'+esc(it.title)+'">':'<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:'+esc(getCatGrad(it.category,cats))+';color:#fff;font-size:2rem;font-weight:700;">'+esc((it.title||'?').charAt(0))+'</div>')+'</div></a><div class="card-body"><div class="card-meta"><span class="badge '+badgeCls+'">'+badgeTxt+'</span></div><h3 class="card-title">'+esc(it.title)+'</h3><p class="card-desc">'+(it.description||'').substring(0,120)+'</p></div><div class="card-actions" style="display:flex;gap:8px;padding:0 16px 16px;"><a href="/item/'+enc(it.slug||it.id)+'" class="btn btn-pri">查看详情 →</a><button class="copy-btn" onclick="copyLink(\''+esc(it.slug||String(it.id))+'\')">'+(cfg.copy_link_text||'复制链接')+'</button></div></article>';
  }
  if(!cards)cards='<p style="text-align:center;color:var(--text-3);grid-column:1/-1;padding:48px 0;">暂无内容，去后台发布吧 ✨</p>';
  let pagi='';
  if(totalPages>1){
    pagi='<div class="pagi">';
    if(cur>1)pagi+='<a href="/?page='+(cur-1)+(cat?'&cat='+enc(cat):'')+'">← 上一页</a>';
    pagi+='<span class="cur">'+cur+' / '+totalPages+'</span>';
    if(cur<totalPages)pagi+='<a href="/?page='+(cur+1)+(cat?'&cat='+enc(cat):'')+'">下一页 →</a>';
    pagi+='</div>';
  }
  const searchHtml='<div class="search"><input type="search" placeholder="🔍 搜索作品..." value="'+esc(search)+'" onchange="location.href=\'/search?q=\'+encodeURIComponent(this.value)"></div>';
  const dm=cfg.theme_dark_mode||'off';
  const dmBtn=dm==='off'?'🌙':'☀️';
  const seoDesc=cfg.site_description||cfg.site_subtitle||'';
  const seoKw=cfg.site_keywords||'';

  const html='<!DOCTYPE html>\n<html lang="zh-CN">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width,initial-scale=1">\n<title>'+esc(heroTitle)+'</title>\n<meta name="description" content="'+esc(seoDesc)+'">\n'+(seoKw?'<meta name="keywords" content="'+esc(seoKw)+'">\n':'')+'<meta property="og:title" content="'+esc(heroTitle)+'">\n<meta property="og:description" content="'+esc(seoDesc)+'">\n<style>\n'+getCSS()+'\n</style>\n</head>\n<body data-dm="'+esc(dm)+'">\n<nav class="nav"><div class="nav-in">\n'+brandHtml+'\n<div class="nav-l"><a href="/" class="nav-a act">首页</a><a href="/about" class="nav-a">关于</a>'+navHtml+'</div>\n<div class="nav-r"><button class="nav-a" onclick="toggleDark()" title="切换暗色模式">'+dmBtn+'</button><a href="/admin" class="nav-a">后台</a></div>\n</div></nav>\n<header class="hero">\n'+heroInner+'\n<h1 class="ht">'+esc(heroTitle)+'</h1>\n<p class="hs">'+esc(heroSub)+'</p>\n<div class="ha"><a href="/admin" class="btn btn-pri">✏️ 开始创作</a><a href="/rss.xml" class="btn btn-ghost">📡 RSS</a></div>\n</header>\n'+annHtml+'\n<div class="fbar">'+chipHtml+'</div>\n'+searchHtml+'\n<main class="grid">\n'+cards+'</main>\n'+pagi+'\n<footer class="footer">'+(cfg.footer_html||'© '+new Date().getFullYear()+' '+(cfg.brand_name||'Gallery'))+'</footer>\n<button class="fab" onclick="window.scrollTo({top:0,behavior:\'smooth\'})">↑</button>\n<script>\nfunction toggleDark(){document.body.classList.toggle(\'dark-mode\');const on=document.body.classList.contains(\'dark-mode\');localStorage.setItem(\'darkMode\',on?\'on\':\'off\');document.querySelector(\'.nav-r button\').textContent=on?\'☀️\':\'🌙\';}\nconst dm=localStorage.getItem(\'darkMode\');const cfg=document.body.dataset.dm;if(dm===\'on\'||(dm===\'auto\'&&window.matchMedia(\'(prefers-color-scheme: dark)\').matches)||(cfg===\'on\'&&!dm))document.body.classList.add(\'dark-mode\');\nfunction copyLink(slug){const u=location.origin+\'/item/\'+slug;navigator.clipboard.writeText(u).then(()=>{const t=document.createElement(\'div\');t.className=\'toast toast-success show\';t.textContent=\'✅ 链接已复制\';document.body.appendChild(t);setTimeout(()=>{t.classList.remove(\'show\');setTimeout(()=>t.remove(),300);},2000);});}\nconst lazyImgs=document.querySelectorAll(\'img.lazy\');const io=new IntersectionObserver(es=>{es.forEach(e=>{if(e.isIntersecting){const img=e.target;img.src=img.dataset.src;img.classList.remove(\'lazy\');img.classList.add(\'loaded\');io.unobserve(img);}});},{rootMargin:\'100px\'});lazyImgs.forEach(img=>io.observe(img));\ndocument.addEventListener(\'mousemove\',e=>{document.documentElement.style.setProperty(\'--mx\',(e.clientX/window.innerWidth*100)+\'%\');document.documentElement.style.setProperty(\'--my\',(e.clientY/window.innerHeight*100)+\'%\');});\n</script>\n</body>\n</html>';
  return html;
}

function getCatGrad(name,cats){
  for(const c of cats){if(c.name===name)return c.gradient||'var(--g-blue)';}
  return 'var(--g-blue)';
}

// ─── 详情页 ────────────────────────────────────────────────
async function renderDetail(r,env,u,slug){
  await initDB(env);
  const cfg=await getSettings(env);
  let item=null;
  if(/^\d+$/.test(slug)){item=await env.db.prepare('SELECT * FROM media_items WHERE id=?').bind(parseInt(slug)).first();}
  else{item=await env.db.prepare('SELECT * FROM media_items WHERE slug=? OR custom_slug=?').bind(slug,slug).first();}
  if(!item||!visible(item))return errR(new Error('Not Found'),404);
  await env.db.prepare('UPDATE media_items SET views=COALESCE(views,0)+1 WHERE id=?').bind(item.id).run();
  const gkeys=jParse(item.gallery_keys,[]);
  let galleryHtml='';
  if(gkeys.length){galleryHtml='<div class="gallery-stack">';for(const k of gkeys){galleryHtml+='<div class="gallery-item"><img loading="lazy" src="/file/'+enc(k)+'" alt=""></div>';}galleryHtml+='</div>';}
  const cover=item.cover_key?'/file/'+enc(item.cover_key):(item.thumbnail_key?'/file/'+enc(item.thumbnail_key):'');
  let mediaHtml='';
  if(item.type==='image'&&cover){mediaHtml='<img src="'+cover+'" alt="'+esc(item.title)+'" loading="lazy">';}
  else if(item.type==='video'){
    if(cover)mediaHtml='<img src="'+cover+'" alt="" loading="lazy">';
    if(item.content)mediaHtml+='<video src="'+esc(item.content)+'" controls poster="'+(cover||'')+'" style="width:100%;max-height:500px;"></video>';
  }else{mediaHtml='<div style="padding:24px;font-size:1.05rem;line-height:1.8;color:var(--text-1);">'+esc(item.content||'').replace(/\n/g,'<br>')+'</div>';}
  const seoDesc=item.seo_description||item.description||'';
  const seoKw=item.seo_keywords||item.tags||'';
  const origin=new URL(r.url).origin;
  const html='<!DOCTYPE html>\n<html lang="zh-CN">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width,initial-scale=1">\n<title>'+esc(item.title)+'</title>\n<meta name="description" content="'+esc(seoDesc)+'">\n'+(seoKw?'<meta name="keywords" content="'+esc(seoKw)+'">\n':'')+'<meta property="og:title" content="'+esc(item.title)+'">\n<meta property="og:description" content="'+esc(seoDesc)+'">\n'+(cover?'<meta property="og:image" content="'+origin+cover+'">\n':'')+'<style>\n'+getCSS()+'\n</style>\n</head>\n<body>\n<nav class="nav"><div class="nav-in"><a href="/" class="brand">'+(cfg.brand_name||'Gallery')+'</a><div class="nav-l"><a href="/" class="nav-a act">← 返回</a></div><div class="nav-r"><button class="nav-a" onclick="toggleDark()">🌙</button></div></div></nav>\n<div class="detail"><div class="detail-card"><div class="detail-media">'+mediaHtml+'</div><div class="detail-body"><h1 class="detail-title">'+esc(item.title)+'</h1><p class="detail-desc">'+(item.description||'')+'</p><div class="detail-actions"><button class="copy-btn" onclick="copyLink(\''+esc(item.slug||String(item.id))+'\')">'+(cfg.copy_link_text||'复制链接')+'</button><span style="font-size:0.8rem;color:var(--text-3);">👁 '+(item.views||0)+' 次浏览</span></div></div></div>'+galleryHtml+'</div>\n<script>\nfunction toggleDark(){document.body.classList.toggle(\'dark-mode\');localStorage.setItem(\'darkMode\',document.body.classList.contains(\'dark-mode\')?\'on\':\'off\');}\nfunction copyLink(slug){const u=location.origin+\'/item/\'+slug;navigator.clipboard.writeText(u).then(()=>alert(\'✅ 链接已复制\'));}\nconst dm=localStorage.getItem(\'darkMode\');if(dm===\'on\'||(dm===\'auto\'&&window.matchMedia(\'(prefers-color-scheme: dark)\').matches))document.body.classList.add(\'dark-mode\');\ndocument.addEventListener(\'mousemove\',e=>{document.documentElement.style.setProperty(\'--mx\',(e.clientX/window.innerWidth*100)+\'%\');document.documentElement.style.setProperty(\'--my\',(e.clientY/window.innerHeight*100)+\'%\');});\n</script>\n</body>\n</html>';
  return html;
}

// ─── 关于页 ────────────────────────────────────────────────
async function renderAbout(r,env){
  await initDB(env);
  const cfg=await getSettings(env);
  const html='<!DOCTYPE html>\n<html lang="zh-CN"><head>\n<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">\n<title>关于 — '+(cfg.brand_name||'Gallery')+'</title>\n<style>\n'+getCSS()+'\n</style>\n</head>\n<body>\n<nav class="nav"><div class="nav-in"><a href="/" class="brand">'+(cfg.brand_name||'Gallery')+'</a><div class="nav-l"><a href="/" class="nav-a">首页</a><a href="/about" class="nav-a act">关于</a></div></div></nav>\n<div class="detail" style="padding-top:48px;"><div class="detail-card"><div class="detail-body" style="padding:48px 32px;line-height:1.8;font-size:1rem;color:var(--text-1);">'+(cfg.about_html||'<h2>关于本站</h2><p>这是一个基于 Cloudflare Workers + D1 + KV 构建的轻量作品集。</p>')+'</div></div></div>\n<script>const dm=localStorage.getItem(\'darkMode\');if(dm===\'on\')document.body.classList.add(\'dark-mode\');</script>\n</body></html>';
  return html;
}

// ─── 后台管理页 ────────────────────────────────────────────
async function renderAdmin(r,env){
  await initDB(env);
  const cfg=await getSettings(env);
  const cats=jParse(cfg.categories,'[]');
  const statsHtml='<div class="stat-grid"><div class="stat-card s1"><div class="stat-num" id="st-total">-</div><div class="stat-lbl">全部内容</div></div><div class="stat-card s2"><div class="stat-num" id="st-public">-</div><div class="stat-lbl">已发布</div></div><div class="stat-card s3"><div class="stat-num" id="st-draft">-</div><div class="stat-lbl">草稿</div></div><div class="stat-card s4"><div class="stat-num" id="st-views">-</div><div class="stat-lbl">总浏览</div></div></div>';

  // The admin JS is loaded as a separate inline script
  const adminJS = `
const API="/api";
let _cats=${JSON.stringify(cats)};
async function api(path,opts={}){const r=await fetch(API+path,opts);return r.json();}
function escHtml(s){if(!s)return"";return String(s).replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));}
async function checkLogin(){const r=await fetch(API+"/items").catch(()=>({ok:false}));if(!r.ok||r.ok===false){location.href="/admin";}else{loadStats();loadItems();}}
function doLogout(){document.cookie="mg_session=;Path=/;Max-Age=0";location.href="/admin";}
async function loadStats(){const r=await api("/stats");if(r.ok){document.getElementById("st-total").textContent=r.stats.total;document.getElementById("st-public").textContent=r.stats.public;document.getElementById("st-draft").textContent=r.stats.draft;document.getElementById("st-views").textContent=r.stats.views;}}
async function loadItems(filter){const r=await api("/items");if(!r.ok)return;let items=r.items||[];if(filter)items=items.filter(i=>i.type===filter);let h="";for(const i of items){const cover=i.cover_key||i.thumbnail_key;const badge=i.type==="image"?"badge-img":i.type==="video"?"badge-vid":"badge-txt";const btxt=i.type==="image"?"图片":i.type==="video"?"视频":"文字";const stat=i.is_public?"status-pub":"status-draft";const slabel=i.is_public?"已发布":"草稿";const coverImg=cover?'<img src="/file/'+encodeURIComponent(cover)+'" style="width:48px;height:36px;object-fit:cover;border-radius:6px;">':'<div style="width:48px;height:36px;border-radius:6px;background:var(--g-blue);"></div>';h+='<div style="display:flex;align-items:center;gap:12px;padding:10px 14px;border-bottom:1px solid rgba(0,0,0,.04);"><span class="status-dot '+stat+'"></span>'+coverImg+'<div style="flex:1;min-width:0;"><div style="font-weight:600;font-size:0.9rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">'+escHtml(i.title)+'</div><div style="font-size:0.75rem;color:var(--text-3);">'+btxt+' · '+slabel+'</div></div><span class="badge '+badge+'">'+btxt+'</span><button class="btn btn-ghost" style="padding:4px 10px;font-size:0.75rem;" onclick="editItem('+i.id+')">编辑</button><button class="btn btn-ghost" style="padding:4px 10px;font-size:0.75rem;color:var(--danger);" onclick="delItem('+i.id+')">删除</button></div>';}document.getElementById("item-list").innerHTML=h||'<p style="color:var(--text-3);padding:24px;text-align:center;">暂无内容</p>';}
function openCreate(){const m=document.getElementById("modal-root");m.innerHTML='<div class="modal-bg" onclick="if(event.target===this)this.remove()"><div class="modal"><h2>✏️ 新建内容</h2><div class="form-row"><label>标题</label><input id="f_title" placeholder="输入标题"></div><div class="form-row"><label>描述</label><textarea id="f_desc" rows="2"></textarea></div><div class="form-row"><label>类型</label><select id="f_type" onchange="onTypeChange()"><option value="image">图片</option><option value="video">视频</option><option value="text">文字</option></select></div><div class="form-row"><label>内容/外链</label><textarea id="f_content" rows="3" placeholder="图片作品留空（用上传区），视频填URL，文字填正文"></textarea></div><div class="form-row"><label>分类</label><select id="f_cat"></select></div><div class="form-row"><label>标签（逗号分隔）</label><input id="f_tags" placeholder="摄影,风光"></div><div class="form-row"><label>自定义Slug</label><input id="f_slug" placeholder="留空自动生成"></div><div class="form-row"><label>发布时间（留空=立即）</label><input id="f_pub" type="datetime-local"></div><div class="form-row"><label>过期时间（留空=不过期）</label><input id="f_exp" type="datetime-local"></div><div class="form-row"><label>排序权重（越大越靠前）</label><input id="f_w" type="number" value="0"></div><div class="form-row"><label><input type="checkbox" id="f_hidden"> 隐藏（仅链接可访问）</label></div><div class="form-row"><label><input type="checkbox" id="f_pub_cb" checked> 立即发布</label></div><div class="form-row"><label>SEO描述</label><textarea id="f_seo" rows="2"></textarea></div><div class="form-row"><label>SEO关键词</label><input id="f_seok" placeholder="关键词1,关键词2"></div><div class="form-row"><label>自定义CSS类</label><input id="f_css" placeholder="可选"></div><hr style="margin:12px 0;border:none;border-top:1px solid rgba(0,0,0,.06);"><div style="font-weight:600;margin-bottom:8px;">📎 上传区</div><div class="form-row"><label>封面图（可选）</label><input type="file" id="f_cover" accept="image/*"><div id="cover_prev" style="margin-top:8px;"></div></div><div class="form-row"><label>内容文件（图片/视频/附件）</label><input type="file" id="f_file"><div id="file_prev" style="margin-top:8px;"></div></div><div class="form-row"><label>附件（可选）</label><input type="file" id="f_att"><div id="att_prev" style="margin-top:8px;"></div></div><div id="gal_preview" style="display:flex;flex-wrap:wrap;gap:8px;margin-top:8px;"></div><div style="display:flex;gap:8px;margin-top:16px;"><button class="btn btn-pri" onclick="saveItem()">🚀 发布</button><button class="btn btn-ghost" onclick="this.closest(\'.modal-bg\').remove()">取消</button></div></div></div>';fillCatSelect();bindUpload("f_cover","cover_prev","封面");bindUpload("f_file","file_prev","内容");bindUpload("f_att","att_prev","附件");}
function fillCatSelect(){const sel=document.getElementById("f_cat");if(!sel)return;sel.innerHTML=_cats.map(c=>'<option value="'+escHtml(c.name)+'">'+escHtml(c.name)+'</option>').join("");}
function bindUpload(inputId,prevId,label){const inp=document.getElementById(inputId);if(!inp)return;inp.onchange=async()=>{const f=inp.files[0];if(!f)return;const fd=new FormData();fd.append("file",f);const r=await fetch(API+"/upload",{method:"POST",body:fd});const j=await r.json();if(j.ok){const prev=document.getElementById(prevId);if(prev){if(f.type.startsWith("image/")){prev.innerHTML='<img src="/file/'+encodeURIComponent(j.key)+'" style="max-width:120px;border-radius:8px;">';}else{prev.innerHTML='<span style="font-size:0.8rem;color:var(--text-2);">'+escHtml(j.name)+'</span>';}prev.dataset.key=j.key;prev.dataset.name=j.name||"";}showToast("✅ "+label+"上传成功","success");}else{showToast("❌ 上传失败:"+j.msg,"error");}};}
function onTypeChange(){const t=document.getElementById("f_type").value;const c=document.getElementById("f_content");if(t==="video")c.placeholder="填视频URL";else if(t==="text")c.placeholder="填正文内容";else c.placeholder="图片作品留空（用上传区）";}
async function saveItem(){const fd={};fd.type=document.getElementById("f_type").value;fd.title=document.getElementById("f_title").value;fd.description=document.getElementById("f_desc").value;fd.content=document.getElementById("f_content").value;fd.category=document.getElementById("f_cat").value;fd.tags=document.getElementById("f_tags").value;fd.custom_slug=document.getElementById("f_slug").value;fd.publish_at=document.getElementById("f_pub").value?new Date(document.getElementById("f_pub").value).toISOString():null;fd.expire_at=document.getElementById("f_exp").value?new Date(document.getElementById("f_exp").value).toISOString():null;fd.sort_weight=parseInt(document.getElementById("f_w").value)||0;fd.is_hidden=document.getElementById("f_hidden").checked?1:0;fd.is_public=document.getElementById("f_pub_cb").checked?1:0;fd.seo_description=document.getElementById("f_seo").value;fd.seo_keywords=document.getElementById("f_seok").value;fd.custom_css_class=document.getElementById("f_css").value;const cp=document.getElementById("cover_prev");if(cp&&cp.dataset.key)fd.cover_key=cp.dataset.key;const fp=document.getElementById("file_prev");if(fp&&fp.dataset.key){if(fd.type==="image")fd.thumbnail_key=fp.dataset.key;else if(fd.type==="video")fd.content=fp.dataset.key;else{fd.attachment_key=fp.dataset.key;fd.attachment_name=fp.dataset.name||"";}}const r=await fetch(API+"/items",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(fd)});const j=await r.json();if(j.ok){showToast("✅ 已发布","success");document.querySelector(".modal-bg").remove();loadItems();loadStats();}else{showToast("❌ 失败:"+j.msg,"error");}}
async function editItem(id){const r=await api("/items");const item=(r.items||[]).find(i=>i.id==id);if(!item)return;openCreate();setTimeout(()=>{document.getElementById("f_title").value=item.title||"";document.getElementById("f_desc").value=item.description||"";document.getElementById("f_type").value=item.type||"text";document.getElementById("f_content").value=item.content||"";document.getElementById("f_tags").value=item.tags||"";document.getElementById("f_slug").value=item.custom_slug||"";document.getElementById("f_w").value=item.sort_weight||0;document.getElementById("f_hidden").checked=!!item.is_hidden;document.getElementById("f_pub_cb").checked=!!item.is_public;document.getElementById("f_seo").value=item.seo_description||"";document.getElementById("f_seok").value=item.seo_keywords||"";document.getElementById("f_css").value=item.custom_css_class||"";if(item.cover_key){const p=document.getElementById("cover_prev");if(p)p.dataset.key=item.cover_key,p.innerHTML='<img src="/file/'+encodeURIComponent(item.cover_key)+'" style="max-width:120px;border-radius:8px;">';}if(item.thumbnail_key){const p=document.getElementById("file_prev");if(p)p.dataset.key=item.thumbnail_key,p.innerHTML='<img src="/file/'+encodeURIComponent(item.thumbnail_key)+'" style="max-width:120px;border-radius:8px;">';}if(item.attachment_key){const p=document.getElementById("att_prev");if(p)p.dataset.key=item.attachment_key,p.innerHTML='<span style="font-size:0.8rem;">'+(item.attachment_name||"附件")+'</span>';}const btn=document.querySelector(".modal .btn-pri");if(btn)btn.textContent="💾 保存修改",btn.onclick=()=>doUpdate(id);},100);}
async function doUpdate(id){const fd={};fd.type=document.getElementById("f_type").value;fd.title=document.getElementById("f_title").value;fd.description=document.getElementById("f_desc").value;fd.content=document.getElementById("f_content").value;fd.category=document.getElementById("f_cat").value;fd.tags=document.getElementById("f_tags").value;fd.custom_slug=document.getElementById("f_slug").value;fd.publish_at=document.getElementById("f_pub").value?new Date(document.getElementById("f_pub").value).toISOString():null;fd.expire_at=document.getElementById("f_exp").value?new Date(document.getElementById("f_exp").value).toISOString():null;fd.sort_weight=parseInt(document.getElementById("f_w").value)||0;fd.is_hidden=document.getElementById("f_hidden").checked?1:0;fd.is_public=document.getElementById("f_pub_cb").checked?1:0;fd.seo_description=document.getElementById("f_seo").value;fd.seo_keywords=document.getElementById("f_seok").value;fd.custom_css_class=document.getElementById("f_css").value;const cp=document.getElementById("cover_prev");if(cp&&cp.dataset.key)fd.cover_key=cp.dataset.key;const fp=document.getElementById("file_prev");if(fp&&fp.dataset.key){if(fd.type==="image")fd.thumbnail_key=fp.dataset.key;else if(fd.type==="video")fd.content=fp.dataset.key;else{fd.attachment_key=fp.dataset.key;fd.attachment_name=fp.dataset.name||"";}}const r=await fetch(API+"/items/"+id,{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify(fd)});const j=await r.json();if(j.ok){showToast("✅ 已更新","success");document.querySelector(".modal-bg").remove();loadItems();}else{showToast("❌ 失败:"+j.msg,"error");}}
async function delItem(id){if(!confirm("确定删除？"))return;const r=await fetch(API+"/items/"+id,{method:"DELETE"});const j=await r.json();if(j.ok){showToast("🗑 已删除","success");loadItems();loadStats();}else{showToast("❌ 删除失败","error");}}
function openCatMgr(){api("/settings").then(r=>{if(!r.ok)return;_cats=JSON.parse(r.settings.categories||"[]");let h='<h2>🏷 分类管理</h2><div id="cat_list">'+_cats.map((c,i)=>'<div style="display:flex;gap:8px;align-items:center;margin-bottom:8px;"><input value="'+escHtml(c.name)+'" id="cn_'+i+'" style="padding:6px 10px;border-radius:6px;border:1px solid rgba(0,0,0,.1);"><input type="color" value="'+escHtml(c.color)+'" id="cc_'+i+'"><button onclick="document.getElementById(\'cn_'+i+'\').closest(\'div\').remove()" style="color:var(--danger);">删除</button></div>').join("")+'</div><button onclick="addCat()">+ 添加分类</button><hr style="margin:12px 0;"><button class="btn btn-pri" onclick="saveCats()">💾 保存</button>';const m=document.getElementById("modal-root");m.innerHTML='<div class="modal-bg" onclick="if(event.target===this)this.remove()"><div class="modal">'+h+'</div></div>';});}
function addCat(){const d=document.getElementById("cat_list");const i=document.querySelectorAll("#cat_list>div").length;d.insertAdjacentHTML("beforeend",'<div style="display:flex;gap:8px;align-items:center;margin-bottom:8px;"><input placeholder="分类名" id="cn_'+i+'" style="padding:6px 10px;border-radius:6px;border:1px solid rgba(0,0,0,.1);"><input type="color" value="#0071E3" id="cc_'+i+'"><button onclick="this.parentNode.remove()" style="color:var(--danger);">删除</button></div>');}
async function saveCats(){const arr=[];document.querySelectorAll("#cat_list>div").forEach(div=>{const inputs=div.querySelectorAll("input");if(inputs[0]&&inputs[0].value)arr.push({name:inputs[0].value,color:inputs[1].value});});const r=await fetch(API+"/settings",{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify({categories:JSON.stringify(arr)})});if(r.ok)showToast("✅ 分类已保存","success"),document.querySelector(".modal-bg").remove();}
function openSettings(){api("/settings").then(r=>{if(!r.ok)return;const s=r.settings;let h='<h2>⚙️ 站点设置</h2>';h+='<div class="form-row"><label>站点标题</label><input id="s_title" value="'+escHtml(s.site_title||"")+'"></div>';h+='<div class="form-row"><label>站点副标题</label><input id="s_sub" value="'+escHtml(s.site_subtitle||"")+'"></div>';h+='<div class="form-row"><label>品牌名</label><input id="s_brand" value="'+escHtml(s.brand_name||"")+'"></div>';h+='<div class="form-row"><label>主题色</label><input type="color" id="s_accent" value="'+escHtml(s.theme_accent||"#0071E3")+'"></div>';h+='<div class="form-row"><label>暗色模式</label><select id="s_dm"><option value="off"'+(s.theme_dark_mode==="off"?" selected":"")+'>关闭</option><option value="on"'+(s.theme_dark_mode==="on"?" selected":"")+'>开启</option><option value="auto"'+(s.theme_dark_mode==="auto"?" selected":"")+'>跟随系统</option></select></div>';h+='<div class="form-row"><label>Hero背景类型</label><select id="s_ht"><option value="gradient"'+(s.hero_bg_type==="gradient"?" selected":"")+'>渐变</option><option value="image"'+(s.hero_bg_type==="image"?" selected":"")+'>图片</option><option value="video"'+(s.hero_bg_type==="video"?" selected":"")+'>视频</option><option value="none"'+(s.hero_bg_type==="none"?" selected":"")+'>无</option></select></div>';h+='<div class="form-row"><label>Hero图片Key</label><input id="s_hik" value="'+escHtml(s.hero_image_key||"")+'" placeholder="上传后填key"></div>';h+='<div class="form-row"><label>Hero视频URL</label><input id="s_hvu" value="'+escHtml(s.hero_video_url||"")+'"></div>';h+='<div class="form-row"><label>页脚HTML（支持HTML）</label><textarea id="s_footer" rows="3">'+escHtml(s.footer_html||"")+'</textarea></div>';h+='<div class="form-row"><label>公告HTML（支持HTML，留空关闭）</label><textarea id="s_ann" rows="3">'+escHtml(s.announcement_html||"")+'</textarea></div>';h+='<div class="form-row"><label>关于页HTML（支持HTML）</label><textarea id="s_about" rows="4">'+escHtml(s.about_html||"")+'</textarea></div>';h+='<div class="form-row"><label>复制链接文本</label><input id="s_cpt" value="'+escHtml(s.copy_link_text||"复制链接")+'"></div>';h+='<div class="form-row"><label>SEO描述</label><textarea id="s_sd" rows="2">'+escHtml(s.site_description||"")+'</textarea></div>';h+='<div class="form-row"><label>SEO关键词</label><input id="s_sk" value="'+escHtml(s.site_keywords||"")+'"></div>';h+='<div class="form-row"><label><input type="checkbox" id="s_rss"'+(s.rss_enabled==="1"?" checked":"")+'> 启用RSS</label></div>';h+='<div class="form-row"><label><input type="checkbox" id="s_sm"'+(s.sitemap_enabled==="1"?" checked":"")+'> 启用Sitemap</label></div>';h+='<hr style="margin:12px 0;"><button class="btn btn-pri" onclick="saveSettings()">💾 保存设置</button>';const m=document.getElementById("modal-root");m.innerHTML='<div class="modal-bg" onclick="if(event.target===this)this.remove()"><div class="modal">'+h+'</div></div>';});}
async function saveSettings(){const d={site_title:document.getElementById("s_title").value,site_subtitle:document.getElementById("s_sub").value,brand_name:document.getElementById("s_brand").value,theme_accent:document.getElementById("s_accent").value,theme_dark_mode:document.getElementById("s_dm").value,hero_bg_type:document.getElementById("s_ht").value,hero_image_key:document.getElementById("s_hik").value,hero_video_url:document.getElementById("s_hvu").value,footer_html:document.getElementById("s_footer").value,announcement_html:document.getElementById("s_ann").value,about_html:document.getElementById("s_about").value,copy_link_text:document.getElementById("s_cpt").value,site_description:document.getElementById("s_sd").value,site_keywords:document.getElementById("s_sk").value,rss_enabled:document.getElementById("s_rss").checked?"1":"0",sitemap_enabled:document.getElementById("s_sm").checked?"1":"0"};const r=await fetch(API+"/settings",{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify(d)});if(r.ok)showToast("✅ 设置已保存","success"),document.querySelector(".modal-bg").remove();else showToast("❌ 保存失败","error");}
function openPwdChg(){const m=document.getElementById("modal-root");m.innerHTML='<div class="modal-bg" onclick="if(event.target===this)this.remove()"><div class="modal"><h2>🔒 修改密码</h2><div class="form-row"><label>原密码</label><input type="password" id="old_p"></div><div class="form-row"><label>新密码</label><input type="password" id="new_p"></div><button class="btn btn-pri" onclick="doPwdChg()">💾 修改</button></div></div>';}
async function doPwdChg(){const r=await fetch(API+"/change-password",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({old:document.getElementById("old_p").value,new:document.getElementById("new_p").value})});const j=await r.json();if(j.ok)showToast("✅ 密码已修改","success"),document.querySelector(".modal-bg").remove();else showToast("❌ "+j.msg,"error");}
function showToast(msg,type){const t=document.createElement("div");t.className="toast toast-"+type+" show";t.textContent=msg;document.body.appendChild(t);setTimeout(()=>{t.classList.remove("show");setTimeout(()=>t.remove(),300);},2000);}
checkLogin();
`;

  const html='<!DOCTYPE html>\n<html lang="zh-CN"><head>\n<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">\n<title>后台管理 — '+(cfg.brand_name||'Gallery')+'</title>\n<style>\n'+getCSS()+'\n</style>\n</head>\n<body>\n<nav class="nav"><div class="nav-in"><a href="/" class="brand">'+(cfg.brand_name||'Gallery')+' 后台</a><div class="nav-l"><a href="/" class="nav-a">← 前台</a></div><div class="nav-r"><button class="nav-a" onclick="doLogout()">退出</button></div></div></nav>\n<div class="admin-wrap">\n<div class="admin-head"><h1 style="font-size:1.4rem;font-weight:700;">📊 仪表盘</h1><button class="btn btn-pri" onclick="openCreate()">＋ 新建内容</button></div>\n'+statsHtml+'\n<div style="display:flex;gap:8px;margin-bottom:16px;flex-wrap:wrap;"><button class="chip act" onclick="loadItems()">全部</button><button class="chip" onclick="loadItems(\'image\')">图片</button><button class="chip" onclick="loadItems(\'video\')">视频</button><button class="chip" onclick="loadItems(\'text\')">文字</button><button class="chip" onclick="openCatMgr()">🏷 分类</button><button class="chip" onclick="openSettings()">⚙️ 设置</button><button class="chip" onclick="openPwdChg()">🔒 密码</button></div>\n<div id="item-list"></div>\n</div>\n<button class="fab" onclick="openCreate()">＋</button>\n<div id="modal-root"></div>\n<script>\n'+adminJS+'\n</script>\n</body>\n</html>';
  return html;
}
