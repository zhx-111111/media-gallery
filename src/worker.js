/**
 * Media Gallery — Cloudflare Workers + D1 + KV
 * 参考 cloudmail 架构：db / kv / cache 绑定名固定
 *
 * ─── 零配置部署（5 步，全程网页）──────────────────────
 *
 *  1. CF 控制台 → Workers & Pages → 连接 GitHub → 选本仓库
 *     → 构建命令留空 → 保存并部署
 *
 *  2. CF 控制台 → 存储和数据库 → D1 → 创建数据库
 *     → 名称：media_gallery_db → 记下 database_id
 *
 *  3. CF 控制台 → 存储和数据库 → KV → 创建命名空间 ×2
 *     → 名称：media_kv   → 记下 ID
 *     → 名称：media_cache → 记下 ID
 *
 *  4. Worker → Settings → Bindings → 添加：
 *     D1  → 变量名 db    → 选 media_gallery_db
 *     KV  → 变量名 kv    → 选 media_kv
 *     KV  → 变量名 cache  → 选 media_cache
 *
 *  5. Worker → Settings → Variables → 添加环境变量：
 *     INIT_SECRET = 任意随机字符串（必填！这是初始化密钥）
 *     ADMIN_PASSWORD = 后台密码（可选，默认等于 INIT_SECRET）
 *     → 保存后访问：https://你的域名/api/init/你的INIT_SECRET
 *     → 看到 {"ok":true,"msg":"initialized"} 即全部完成 ✅
 *
 *  6.（可选）Settings → Custom Domains → 添加你的域名
 *
 * ─── 绑定名约定（不可改，代码写死了）──────────────────
 *   env.db     → D1 数据库
 *   env.kv     → KV 存储（图片/文件）
 *   env.cache  → KV 缓存（站点设置缓存）
 *   env.INIT_SECRET     → 初始化密钥（控制台设置）
 *   env.ADMIN_PASSWORD  → 后台密码（控制台设置，可选）
 *   env.PAGE_SIZE       → 每页条数（默认 24）
 *   env.MAX_FILE_SIZE   → 最大上传字节（默认 24MB）
 *   env.DEFAULT_BRAND  → 默认品牌名（默认 Gallery）
 *───────────────────────────────────────────────────────
 */
'use strict';
export default { async fetch(r,env){try{return await handle(r,env);}catch(e){return errR(e);}} };

// ─── 工具函数 ──────────────────────────────────────────────
const errR=(e,st=500)=>new Response('Error: '+e.message,{status:st,headers:{'Content-Type':'text/plain;charset=utf-8'}});
const jR=d=>new Response(JSON.stringify(d),{headers:{'Content-Type':'application/json'}});
const htmlR=h=>new Response(h,{'Content-Type':'text/html;charset=utf-8'});
const sha256=async t=>{const e=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(t));return[...new Uint8Array(e)].map(b=>b.toString(16).padStart(2,'0')).join('');};
const esc=s=>!s?'':String(s).replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const slugify=s=>!s?'':String(s).toLowerCase().replace(/[^a-z0-9\u4e00-\u9fa5]+/g,'-').replace(/^[-]+|[-]+$/g,'').substring(0,80);
const nowISO=()=>new Date().toISOString();
const parseBool=v=>v===1||v==='1'||v===true||v==='true';
const jParse=(s,d)=>{try{return JSON.parse(s||'null')||d;}catch(e){return d;}};
const fmtDate=s=>!s?'':new Date(s).toLocaleDateString('zh-CN',{year:'numeric',month:'short',day:'numeric'});
const enc=encodeURIComponent;
const visible=i=>{const n=new Date();if(i.is_hidden)return false;if(i.publish_at&&new Date(i.publish_at)>n)return false;if(i.expire_at&&new Date(i.expire_at)<n)return false;return true;};
const rand=k=>{let s='';const c='abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';for(let i=0;i<k;i++)s+=c[Math.floor(Math.random()*c.length)];return s;};

// ─── 设计令牌 CSS（Apple 静奢风 + 深度毛玻璃）──────────────
const CSS=[
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
  ].join('');

// ─── 数据库初始化（幂等，参考 cloudmail 的 init 思路） ───────
let _dbReady=false;
async function initDB(env){
  if(_dbReady)return;
  try{
    const t=await env.db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='media_items'").first();
    if(t){_dbReady=true;return;}
  }catch(e){}
  // 建表（和 cloudmail 一样，表不存在就建，存在就跳过）
  await env.db.exec(`
    CREATE TABLE IF NOT EXISTS media_items(
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL CHECK(type IN('image','video','text')),
      title TEXT NOT NULL,
      description TEXT DEFAULT '',
      content TEXT NOT NULL,
      thumbnail_key TEXT DEFAULT NULL,
      tags TEXT DEFAULT '',
      sort_order INTEGER DEFAULT 0,
      is_public INTEGER DEFAULT 0,
      created_at TEXT DEFAULT(datetime('now')),
      updated_at TEXT DEFAULT(datetime('now')),
      slug TEXT UNIQUE,
      custom_slug TEXT DEFAULT NULL,
      cover_key TEXT DEFAULT NULL,
      category TEXT DEFAULT '',
      seo_description TEXT DEFAULT '',
      seo_keywords TEXT DEFAULT '',
      publish_at TEXT DEFAULT NULL,
      expire_at TEXT DEFAULT NULL,
      sort_weight INTEGER DEFAULT 0,
      is_hidden INTEGER DEFAULT 0,
      gallery_keys TEXT DEFAULT '[]',
      attachment_key TEXT DEFAULT NULL,
      attachment_name TEXT DEFAULT '',
      custom_css_class TEXT DEFAULT '',
      views INTEGER DEFAULT 0
    );
    CREATE INDEX IF NOT EXISTS idx_type ON media_items(type);
    CREATE INDEX IF NOT EXISTS idx_public ON media_items(is_public);
    CREATE INDEX IF NOT EXISTS idx_cslug ON media_items(custom_slug);
    CREATE TABLE IF NOT EXISTS admins(
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at TEXT DEFAULT(datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS site_settings(
      k TEXT PRIMARY KEY,
      v TEXT NOT NULL,
      updated_at TEXT DEFAULT(datetime('now'))
    );
  `);
  // 默认管理员：密码优先用 ADMIN_PASSWORD，其次 INIT_SECRET
  const pwd = env.ADMIN_PASSWORD || env.INIT_SECRET || 'admin123';
  await env.db.prepare('INSERT OR IGNORE INTO admins(username,password_hash) VALUES(?,?)')
    .bind('admin',await sha256(pwd)).run();
  // 默认站点设置
  const brand = env.DEFAULT_BRAND || 'Gallery';
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

// 获取站点设置（带缓存）
async function getSettings(env){
  const c=await env.cache.get('site_settings');
  if(c)return JSON.parse(c);
  const rows=await env.db.prepare('SELECT k,v FROM site_settings').all();
  const m={};for(const r of rows)m[r.k]=r.v;
  await env.cache.put('site_settings',JSON.stringify(m),{expirationTtl:300});
  return m;
}
async function setSetting(env,k,v){
  await env.db.prepare('INSERT OR REPLACE INTO site_settings(k,v,updated_at) VALUES(?,?,datetime(\'now\'))').bind(k,v).run();
  await env.cache.delete('site_settings');
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

  // 静态资源
  if(p==='/favicon.ico')return serveFavicon(r,env);
  if(p.startsWith('/file/'))return serveFile(r,env,p.slice(6));

  // API 路由
  if(p.startsWith('/api/'))return handleAPI(r,env,u);

  // 确保 DB 就绪（幂等，和 cloudmail 一样）
  await initDB(env);

  // 页面路由
  if(p==='/'||p==='/index.html')return htmlR(await renderHome(r,env,u));
  if(p==='/admin')return htmlR(await renderAdmin(r,env));
  if(p==='/about')return htmlR(await renderAbout(r,env));
  if(p.startsWith('/item/'))return htmlR(await renderDetail(r,env,u,p.slice(6)));
  if(p==='/rss.xml')return serveRSS(r,env);
  if(p==='/sitemap.xml')return serveSitemap(r,env);

  return errR(new Error('Not Found'),404);
}

// ─── API 路由 ──────────────────────────────────────────────
async function handleAPI(r,env,u){
  const p=u.pathname;

  // ★ 初始化接口（核心！参考 cloudmail 的 /api/init/SECRET）
  // GET /api/init/:secret → 建表 + 建管理员 → 返回 ok
  // 部署后只需访问一次：https://域名/api/init/你的INIT_SECRET
  const initMatch=p.match(/^\/api\/init\/([\w-]+)$/);
  if(initMatch){
    const secret=initMatch[1];
    const expected=env.INIT_SECRET||'';
    if(!expected||secret!==expected)return jR({ok:false,msg:'invalid or missing INIT_SECRET'});
    await initDB(env);
    // 确保管理员密码正确（每次 init 都同步）
    const pwd=env.ADMIN_PASSWORD||expected;
    await env.db.prepare('INSERT OR IGNORE INTO admins(username,password_hash) VALUES(?,?)')
      .bind('admin',await sha256(pwd)).run();
    await env.db.prepare('UPDATE admins SET password_hash=? WHERE username=?')
      .bind(await sha256(pwd),'admin').run();
    return jR({ok:true,msg:'initialized',login:'/admin',username:'admin',password:pwd});
  }

  // 登录
  if(p==='/api/login'&&r.method==='POST'){
    const f=await r.json().catch(()=>({}));
    const a=await env.db.prepare('SELECT password_hash FROM admins WHERE username=?').bind(f.username||'').first();
    if(!a||a.password_hash!==await sha256(f.password||''))return jR({ok:false,msg:'用户名或密码错误'});
    const enc=encodeURIComponent(f.username+':'+a.password_hash);
    return new Response(JSON.stringify({ok:true}),{headers:{'Content-Type':'application/json','Set-Cookie':`mg_session=${enc}; Path=/; Max-Age=86400; SameSite=Lax'}});
  }
  if(p==='/api/logout')return new Response(JSON.stringify({ok:true}),{headers:{'Content-Type':'application/json','Set-Cookie':'mg_session=; Path=/; Max-Age=0'}});

  // 以下内容需登录
  const auth=await checkAuth(r,env);
  if(!auth)return jR({ok:false,msg:'unauthorized'},401);

  // 列表
  if(p==='/api/items'&&r.method==='GET'){
    const rows=await env.db.prepare('SELECT * FROM media_items ORDER BY COALESCE(sort_weight,0) DESC,updated_at DESC').all();
    return jR({ok:true,items:rows.results||rows});
  }
  // 创建
  if(p==='/api/items'&&r.method==='POST'){
    const f=await r.json().catch(()=>({}));
    const slug=f.custom_slug||slugify(f.title)||rand(8);
    const r2=await env.db.prepare(`INSERT INTO media_items(type,title,description,content,thumbnail_key,tags,sort_order,is_public,slug,custom_slug,cover_key,category,seo_description,seo_keywords,publish_at,expire_at,sort_weight,is_hidden,gallery_keys,attachment_key,attachment_name,custom_css_class) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`)
      .bind(f.type||'text',f.title||'无标题',f.description||'',f.content||'',f.thumbnail_key||null,f.tags||'',f.sort_order||0,f.is_public?1:0,slug,f.custom_slug||null,f.cover_key||null,f.category||'',f.seo_description||'',f.seo_keywords||'',f.publish_at||null,f.expire_at||null,f.sort_weight||0,f.is_hidden?1:0,JSON.stringify(f.gallery_keys||[]),f.attachment_key||null,f.attachment_name||'',f.custom_css_class||'').run();
    await env.cache.delete('public_items');
    return jR({ok:true,id:r2.meta&&r2.meta.last_row_id});
  }
  // 更新
  if(p.startsWith('/api/items/')&&r.method==='PUT'){
    const id=p.split('/')[3];
    const f=await r.json().catch(()=>({}));
    const allowed=['type','title','description','content','thumbnail_key','tags','sort_order','is_public','custom_slug','cover_key','category','seo_description','seo_keywords','publish_at','expire_at','sort_weight','is_hidden','gallery_keys','attachment_key','attachment_name','custom_css_class'];
    const sets=[];const binds=[];
    for(const k of allowed)if(k in f){sets.push(k+'=?');binds.push(k==='gallery_keys'?JSON.stringify(f[k]):f[k]);}
    sets.push("updated_at=datetime('now')");
    binds.push(id);
    await env.db.prepare(`UPDATE media_items SET ${sets.join(',')} WHERE id=?`).bind(...binds).run();
    await env.cache.delete('public_items');
    return jR({ok:true});
  }
  // 删除
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
  // 批量删除
  if(p==='/api/items/batch'&&r.method==='DELETE'){
    const f=await r.json().catch(()=>({}));
    for(const id of(f.ids||[])){const item=await env.db.prepare('SELECT * FROM media_items WHERE id=?').bind(id).first();if(item){if(item.thumbnail_key)await env.kv.delete(item.thumbnail_key).catch(()=>{});if(item.cover_key)await env.kv.delete(item.cover_key).catch(()=>{});if(item.attachment_key)await env.kv.delete(item.attachment_key).catch(()=>{});}}
    if((f.ids||[]).length){await env.db.prepare(`DELETE FROM media_items WHERE id IN (${'?,'.repeat((f.ids||[]).length).slice(0,-1)})[
    `).bind(...(f.ids||[])).run();}
    await env.cache.delete('public_items');
    return jR({ok:true});
  }
  // 上传
  if(p==='/api/upload'&&r.method==='POST'){
    const fd=await r.formData().catch(()=>null);
    if(!fd)return jR({ok:false,msg:'invalid form'});
    const file=fd.get('file');
    if(!file)return jR({ok:false,msg:'no file'});
    const max=parseInt(env.MAX_FILE_SIZE||'25165824',10);
    if(file.size>max)return jR({ok:false,msg:'file too large'});
    const key=rand(16)+'_'+file.name.replace(/[^a-zA-Z0-9._-]/g,'_');
    await env.kv.put(key,await file.arrayBuffer(),{metadata:{type:file.type||'application/octet-stream',name:file.name}});
    return jR({ok:true,key,name:file.name,url:'/file/'+encodeURIComponent(key)});
  }
  // 删除文件
  if(p.startsWith('/api/file/')&&r.method==='DELETE'){
    const key=decodeURIComponent(p.slice(10));
    await env.kv.delete(key).catch(()=>{});
    return jR({ok:true});
  }
  // 站点设置
  if(p==='/api/settings'&&r.method==='GET')return jR({ok:true,settings:await getSettings(env)});
  if(p==='/api/settings'&&r.method==='PUT'){
    const f=await r.json().catch(()=>({}));
    for(const[k,v]of Object.entries(f))await setSetting(env,k,typeof v==='string'?v:JSON.stringify(v));
    return jR({ok:true});
  }
  // 统计
  if(p==='/api/stats'&&r.method==='GET'){
    const all=await env.db.prepare('SELECT type,is_public FROM media_items').all();
    const items=all.results||all;
    const s={total:items.length,image:0,video:0,text:0,public:0,draft:0};
`,
    `    for(const i of items){if(i.type==='image')s.image++;else if(i.type==='video')s.video++;else s.text++;if(i.is_public)s.public++;else s.draft++;}
    return jR({ok:true,stats:s});
  }
  // 修改密码
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
`,
    `  const svg='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="8" fill="#0071E3"/><text x="16" y="22" text-anchor="middle" font-size="18" fill="#fff" font-family="sans-serif">G</text></svg>';
  return new Response(svg,{headers:{'Content-Type':'image/svg+xml','Cache-Control':'public, max-age=86400'}});
}

// ─── RSS / Sitemap ─────────────────────────────────────────
async function serveRSS(r,env){
  const cfg=await getSettings(env);
  if(cfg.rss_enabled!=='1')return errR(new Error('RSS disabled'),404);
  const items=await getPublicItems(env);
  const base=new URL(r.url).origin;
  let xml='<?xml version="1.0" encoding="UTF-8"?>\\n<rss version="2.0"><channel><title>'+esc(cfg.site_title||'Gallery')+'</title><link>'+base+'</link><description>'+esc(cfg.site_description||'')+'</description>\\n';
  for(const i of items){xml+='<item><title>'+esc(i.title)+'</title><link>'+base+'/item/'+enc(i.slug||i.id)+'</link><description>'+esc(i.description||'')+'</description><pubDate>'+(i.created_at||'')+'</pubDate></item>\\n';}
  xml+='</channel></rss>';
  return new Response(xml,{headers:{'Content-Type':'application/rss+xml;charset=utf-8'}});
}
async function serveSitemap(r,env){
  const cfg=await getSettings(env);
  if(cfg.sitemap_enabled!=='1')return errR(new Error('Sitemap disabled'),404);
  const items=await getPublicItems(env);
  const base=new URL(r.url).origin;
`,
    `  let xml='<?xml version="1.0" encoding="UTF-8"?>\\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\\n';
  xml+='<url><loc>'+base+'/</loc></url>\\n';
  if(cfg.about_html){xml+='<url><loc>'+base+'/about</loc></url>\\n';}
  for(const i of items){xml+='<url><loc>'+base+'/item/'+enc(i.slug||i.id)+'</loc></url>\\n';}
  xml+='</urlset>';
  return new Response(xml,{headers:{'Content-Type':'application/xml;charset=utf-8'}});
}

// ─── 公共列表缓存 ──────────────────────────────────────────
async function getPublicItems(env){
  const c=await env.cache.get('public_items');
  if(c)return JSON.parse(c);
  const all=await env.db.prepare('SELECT * FROM media_items WHERE is_public=1 AND is_hidden=0 ORDER BY COALESCE(sort_weight,0) DESC,updated_at DESC').all();
  const items=all.results||all;
  await env.cache.put('public_items',JSON.stringify(items),{expirationTtl:120});
  return items;
}

// ─── 渲染：前台首页 ────────────────────────────────────────
async function renderHome(r,env,u){
  await initDB(env);
  const cfg=await getSettings(env);
  const items=await getPublicItems(env);
  const cats=jParse(cfg.categories,[{name:'全部',color:'#0071E3'}]);
  const catParam=u.searchParams.get('cat')||'';
  const filtered=catParam?items.filter(i=>i.category===catParam):items;
  const page=parseInt(u.searchParams.get('page')||'1',10);
  const ps=parseInt(env.PAGE_SIZE||'24',10);
  const total=filtered.length;
  const pages=Math.max(1,Math.ceil(total/ps));
  const start=(page-1)*ps;
`,
    `  const slice=filtered.slice(start,start+ps);

  // 导航链接
  let navExtra='';
  try{const nl=jParse(cfg.nav_links,[]);for(const l of nl)navExtra+=`
  ].join('')<a class="nav-a" href="${esc(l.url)}" target="_blank" rel="noopener">${esc(l.label)}</a>`;}catch(e){}
  if(cfg.about_html)navExtra+=`<a class="nav-a" href="/about">关于</a>`;

  // 公告
  let ann='';
  if(cfg.announcement_html)ann=`<div class="ann" id="ann">${cfg.announcement_html}<button class="x" onclick="document.getElementById('ann').style.display='none'">×</button></div>`;

  // Hero
  let heroBg='';
  if(cfg.hero_bg_type==='image'&&cfg.hero_image_key)heroBg=`<div class="hero-bg"><img src="/file/${enc(cfg.hero_image_key)}" alt=""></div>`;
  else if(cfg.hero_bg_type==='video'&&cfg.hero_video_url)heroBg=`<div class="hero-bg"><video src="${esc(cfg.hero_video_url)}" autoplay muted loop playsinline></video></div>`;

  // 分类 chips
  let chips=`<a class="chip${!catParam?' act':''}" href="/">全部</a>`;
  for(const c of cats){if(c.name==='全部')continue;chips+=`<a class="chip${catParam===c.name?' act':''}" href="/?cat=${enc(c.name)}" style="border-color:${esc(c.color||'')}33">${esc(c.name)}</a>`;}

  // 卡片
  let cards='';
  for(const i of slice){
    const isVid=i.type==='video',isTxt=i.type==='text';
    const badge=isVid?'<span class="badge bv">▶ 视频</span>':isTxt?'<span class="badge bt">📝 文字</span>':'<span class="badge bi">🖼 图片</span>';
    let mediaHtml='';
    const cover=i.cover_key;
    if(cover)mediaHtml=`<img class="li" data-src="/file/${enc(cover)}" alt="${esc(i.title)}" onload="this.classList.add('loaded')">`;
    else if(!isTxt&&i.thumbnail_key)mediaHtml=`<img class="li" data-src="/file/${enc(i.thumbnail_key)}" alt="${esc(i.title)}" onload="this.classList.add('loaded')">`;
    else if(isVid)mediaHtml=`<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg,#1a1a2e,#16213e);font-size:3rem;">▶</div>`;
    else mediaHtml=`<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg,${esc((cats.find(c=>c.name===i.category)||{}).color||'#0071E3')}33,${esc((cats.find(c=>c.name===i.category)||{}).color||'#5E5CE6')}22);font-size:2rem;font-weight:700;color:${esc((cats.find(c=>c.name===i.category)||{}).color||'#0071E3')};">${esc(i.title.charAt(0))}</div>`;
    cards+=`<a class="card" href="/item/${enc(i.slug||i.id)}" data-cat="${esc(i.category||'')}"><div class="cm">${mediaHtml}</div><div class="cb"><div class="ct">${esc(i.title)}</div><div class="cd">${esc(i.description||'')}</div><div class="cm2">${badge}${i.category?`<span class="chip act" style="cursor:default">${esc(i.category)}</span>`:''}</div></div></a>`;
  }
  if(!cards)cards='<p style="grid-column:1/-1;text-align:center;color:var(--text-3);padding:var(--sp7);">暂无内容，管理员快去上传吧 ✨</p>';

  // 分页
  let pg='';
  if(pages>1){pg+='<div class="pg">';if(page>1)pg+=`<a class="pb" href="/?page=${page-1}${catParam?'&cat='+enc(catParam):''}">← 上一页</a>`;for(let p=1;p<=pages;p++)pg+=`<a class="pb${p===page?' act':''}" href="/?page=${p}${catParam?'&cat='+enc(catParam):''}">${p}</a>`;if(page<pages)pg+=`<a class="pb" href="/?page=${page+1}${catParam?'&cat='+enc(catParam):''}">下一页 →</a>`;pg+='</div>';}

  // 暗色模式
  const dm=cfg.theme_dark_mode||'off';
  const dmScript=dm==='on'?`document.body.classList.add('dark');`:dm==='auto'?`if(matchMedia('(prefers-color-scheme: dark)').matches)document.body.classList.add('dark');`:'';

  // Logo
  const logo=cfg.brand_logo_key?`<img src="/file/${enc(cfg.brand_logo_key)}" style="height:28px;width:auto;vertical-align:middle;margin-right:8px;border-radius:6px;">`:'';

  return `<!DOCTYPE html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(cfg.site_title||'Gallery')} — ${esc(cfg.brand_name||'')}</title>
<meta name="description" content="${esc(cfg.site_description||cfg.site_subtitle||'')}">
<meta name="keywords" content="${esc(cfg.site_keywords||'')}">
<meta property="og:title" content="${esc(cfg.site_title||'')}">
<meta property="og:description" content="${esc(cfg.site_description||'')}">
<link rel="icon" href="/favicon.ico">
<style>${CSS}</style></head><body>
<nav class="nav"><div class="nav-in">
  <a class="brand" href="/">${logo}${esc(cfg.brand_name||'Gallery')}</a>
  <div class="nav-l">${chips}</div>
  <div class="nav-r">${navExtra}<button class="th" onclick="toggleDark()" title="切换暗色">🌙</button><a class="btn bp" href="/admin">🔒 后台</a></div>
</div></nav>
${heroBg?heroBg:''}
<section class="hero"><h1 class="ht">${esc(cfg.site_title||'精选作品')}</h1><p class="hs">${esc(cfg.site_subtitle||'')}</p></section>
${ann}
<div class="fbar">${chips}</div>
<main class="gg">${cards}</main>
${pg}
<footer class="ft">${cfg.footer_html?cfg.footer_html:`© ${new Date().getFullYear()} ${esc(cfg.brand_name||'Gallery')} · 基于 Cloudflare Workers 构建`}${cfg.about_html?` · <a href="/about">关于</a>`:''}</footer>
<button class="fab" onclick="location.href='/admin'" title="后台管理">⚙</button>
<script>
${dmScript}
function toggleDark(){document.body.classList.toggle('dark');localStorage.setItem('dark',document.body.classList.contains('dark'));}
if(localStorage.getItem('dark')==='true')document.body.classList.add('dark');
const io=new IntersectionObserver(es=>{es.forEach(e=>{if(e.isIntersecting){const img=e.target;if(img.dataset.src){img.src=img.dataset.src;}}});},{rootMargin:'200px'});
document.querySelectorAll('img.li').forEach(img=>io.observe(img));
document.addEventListener('mousemove',e=>{document.body.style.setProperty('--mx',e.clientX/window.innerWidth*100+'%');document.body.style.setProperty('--my',e.clientY/window.innerHeight*100+'%');});
</script></body></html>`;
}

// ─── 渲染：详情页 ──────────────────────────────────────────
async function renderDetail(r,env,u,slug){
  await initDB(env);
  const cfg=await getSettings(env);
  const items=await getPublicItems(env);
  const item=items.find(i=>i.slug===slug)||items.find(i=>String(i.id)===slug);
  if(!item)return '<!DOCTYPE html><meta charset="utf-8"><title>404</title><body style="font-family:sans-serif;padding:40px;text-align:center;"><h1>404</h1><p>内容不存在或已隐藏</p><a href="/">← 返回首页</a></body>';

  await env.db.prepare('UPDATE media_items SET views=COALESCE(views,0)+1 WHERE id=?').bind(item.id).run();

  const desc=item.seo_description||item.description||'';
  const kws=item.seo_keywords||'';

  let media='';
  const cover=item.cover_key;
  if(item.type==='video'){
    if(cover)media=`<img src="/file/${enc(cover)}" alt="${esc(item.title)}" style="width:100%;border-radius:var(--r4);box-shadow:var(--s4);">`;
    else if(item.content.startsWith('http'))media=`<video src="${esc(item.content)}" controls poster="" style="width:100%;border-radius:var(--r4);box-shadow:var(--s4);"></video>`;
  } else if(item.type==='image'){
    if(cover)media=`<img src="/file/${enc(cover)}" alt="${esc(item.title)}" style="width:100%;border-radius:var(--r4);box-shadow:var(--s4);">`;
    else if(item.content.startsWith('http')||item.content.startsWith('/file/'))media=`<img src="${item.content.startsWith('/')?item.content:'/file/'+enc(item.content)}" alt="${esc(item.title)}" style="width:100%;border-radius:var(--r4);box-shadow:var(--s4);">`;
  }

  // 多图画廊（竖向滑动）
  let gallery='';
  const gk=jParse(item.gallery_keys,[]);
  if(gk.length){gallery='<div class="gs">';for(const k of gk)gallery+=`<div class="gi"><img src="/file/${enc(k)}" alt="" loading="lazy"></div>`;gallery+='</div>';}

  // 附件
  let attach='';
  if(item.attachment_key)attach=`<a class="ab" href="/file/${enc(item.attachment_key)}" download="${esc(item.attachment_name||'download')}">📎 下载附件：${esc(item.attachment_name||'文件')}</a>`;

  // 相关推荐
  let rel='';
  const sameCat=items.filter(i=>i.id!==item.id&&i.category===item.category).slice(0,3);
  if(sameCat.length){
    rel='<section class="rr"><h2 class="rt">相关推荐</h2><div class="rg">';
    for(const i of sameCat){rel+=`<a class="card" href="/item/${enc(i.slug||i.id)}"><div class="cm">${i.cover_key?`<img src="/file/${enc(i.cover_key)}" alt="">`:i.thumbnail_key?`<img src="/file/${enc(i.thumbnail_key)}" alt="">`:''}</div><div class="cb"><div class="ct">${esc(i.title)}</div></div></a>`;}
    rel+='</div></section>';
  }

  const copyText=cfg.copy_link_text||'复制链接';
  const dmScript=cfg.theme_dark_mode==='on'?`document.body.classList.add('dark');`:cfg.theme_dark_mode==='auto'?`if(matchMedia('(prefers-color-scheme: dark)').matches)document.body.classList.add('dark');`:'';

  return `<!DOCTYPE html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(item.title)} — ${esc(cfg.brand_name||'')}</title>
<meta name="description" content="${esc(desc)}"><meta name="keywords" content="${esc(kws)}">
<meta property="og:title" content="${esc(item.title)}"><meta property="og:description" content="${esc(desc)}">${cover?`<meta property="og:image" content="${new URL(r.url).origin}/file/${enc(cover)}">`:''}
<link rel="icon" href="/favicon.ico"><style>${CSS}</style></head><body class="${item.custom_css_class||''}">
<nav class="nav"><div class="nav-in">
  <a class="brand" href="/">${esc(cfg.brand_name||'Gallery')}</a>
  <div class="nav-l"></div>
  <div class="nav-r"><button class="th" onclick="toggleDark()">🌙</button><a class="btn bg" href="/">← 返回</a></div>
</div></nav>
<article class="dh">${media}</article>
<section class="db">
  <h1 class="dt">${esc(item.title)}</h1>
  <div class="dm">
    <span class="badge ${item.type==='video'?'bv':item.type==='text'?'bt':'bi'}">${item.type==='video'?'视频':item.type==='text'?'文字':'图片'}</span>
    ${item.category?`<span class="chip act" style="cursor:default">${esc(item.category)}</span>`:''}
    <span style="font-size:var(--fs-m);color:var(--text-3);">👁 ${item.views||0}</span>
    <span style="font-size:var(--fs-m);color:var(--text-3);">${fmtDate(item.created_at)}</span>
  </div>
  <div class="dd">${esc(item.description||'')}</div>
  <div class="dc">${item.content.startsWith('<')?item.content:esc(item.content).replace(/\\n/g,'<br>')}</div>
  <div class="da">${attach}<button class="cl" onclick="copyLink()">🔗 ${esc(copyText)}</button></div>
</section>
${gallery}${rel}
<footer class="ft">${cfg.footer_html?cfg.footer_html:`© ${new Date().getFullYear()} ${esc(cfg.brand_name||'Gallery')}`}</footer>
<script>
${dmScript}
function toggleDark(){document.body.classList.toggle('dark');localStorage.setItem('dark',document.body.classList.contains('dark'));}
if(localStorage.getItem('dark')==='true')document.body.classList.add('dark');
async function copyLink(){try{await navigator.clipboard.writeText(location.href);showToast('链接已复制','s');}catch(e){showToast('复制失败','e');}}
function showToast(t,type){const d=document.createElement('div');d.className='to '+type;d.textContent=t;document.body.appendChild(d);requestAnimationFrame(()=>d.classList.add('show'));setTimeout(()=>{d.classList.remove('show');setTimeout(()=>d.remove(),400);},2000);}
</script></body></html>`;
}

// ─── 渲染：关于页 ──────────────────────────────────────────
async function renderAbout(r,env){
  const cfg=await getSettings(env);
  if(!cfg.about_html)return '<!DOCTYPE html><meta charset="utf-8"><title>关于</title><body style="font-family:sans-serif;padding:40px;text-align:center;"><h1>关于</h1><p>暂无内容</p><a href="/">← 返回</a></body>';
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>关于 — ${esc(cfg.brand_name||'')}</title><link rel="icon" href="/favicon.ico"><style>${CSS}</style></head><body><nav class="nav"><div class="nav-in"><a class="brand" href="/">${esc(cfg.brand_name||'Gallery')}</a><div class="nav-r"><a class="btn bg" href="/">← 返回</a></div></div></nav><main class="db" style="max-width:var(--w-b);margin:var(--sp6) auto;">${cfg.about_html}</main></body></html>`;
}

// ─── 渲染：后台 ────────────────────────────────────────────
async function renderAdmin(r,env){
  await initDB(env);
  const cfg=await getSettings(env);
  const cats=jParse(cfg.categories,[{name:'摄影',color:'#FF6B6B'}]);
  const catsJson=esc(JSON.stringify(cats));
  const dmScript=cfg.theme_dark_mode==='on'?`document.body.classList.add('dark');`:'';

  return `<!DOCTYPE html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>后台管理 — ${esc(cfg.brand_name||'Gallery')}</title>
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
  <a class="brand" href="/">${esc(cfg.brand_name||'Gallery')} 后台</a>
  <div class="nav-r"><button class="th" onclick="toggleDark()">🌙</button><a class="btn bg" href="/" target="_blank">🔭 预览前台</a><button class="btn bd" onclick="logout()">退出</button></div>
</div></nav>

<div class="tabbar">
  <button class="tab act" data-tab="items">📦 所有内容</button>
  <button class="tab" data-tab="upload">⬆️ 上传</button>
  <button class="tab" data-tab="cats">🏷️ 分类管理</button>
  <button class="tab" data-tab="site">⚙️ 站点设置</button>
  <button class="tab" data-tab="pwd">🔑 修改密码</button>
</div>

<div class="panels">
  <!-- 内容列表 -->
  <div class="panel act" id="p-items">
    <div class="bar">
      <button class="btn bp" onclick="showCreate()">＋ 新建</button>
      <button class="btn bd" onclick="batchDelete()">🗑 批量删除</button>
      <input class="fi bs" id="searchInput" placeholder="🔍 搜索标题..." oninput="renderTable()" style="max-width:220px;">
      <select class="fs bs" id="filterType" onchange="renderTable()" style="max-width:140px;"><option value="">全部类型</option><option value="image">图片</option><option value="video">视频</option><option value="text">文字</option></select>
      <select class="fs bs" id="filterStatus" onchange="renderTable()" style="max-width:140px;"><option value="">全部状态</option><option value="1">已发布</option><option value="0">草稿</option></select>
    </div>
    <div id="statsBar" style="display:flex;gap:var(--sp3);margin-bottom:var(--sp4);flex-wrap:wrap;"></div>
    <div style="overflow-x:auto;"><table class="at" id="itemsTable"><thead><tr><th><input type="checkbox" id="checkAll" onchange="toggleAll(this)"></th><th>封面</th><th>标题 / URL</th><th>类型</th><th>分类</th><th>状态</th><th>日期</th><th>操作</th></tr></thead><tbody id="itemsBody"></tbody></table></div>
    <div class="pg" id="adminPager"></div>
  </div>

  <!-- 上传 -->
  <div class="panel" id="p-upload">
    <h2 style="margin-bottom:var(--sp4);">上传文件到 KV 存储</h2>
    <div class="up">
      <input type="file" id="fileInput" accept="image/*,video/*,.pdf,.zip,.psd" style="display:none;" onchange="doUpload()">
      <button class="btn bp" onclick="document.getElementById('fileInput').click()">📁 选择文件</button>
      <span id="uploadStatus" style="font-size:var(--fs-c);color:var(--text-2);"></span>
    </div>
    <div id="uploadResult" style="margin-top:var(--sp4);"></div>
    <h3 style="margin:var(--sp5) 0 var(--sp3);font-size:var(--fs-h3);">已存储文件</h3>
    <div id="kvList" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:var(--sp3);"></div>
  </div>

  <!-- 分类管理 -->
  <div class="panel" id="p-cats">
    <h2 style="margin-bottom:var(--sp4);">分类管理</h2>
    <div id="catList"></div>
    <button class="btn bp" onclick="addCat()">＋ 添加分类</button>
    <div style="margin-top:var(--sp5);padding:var(--sp4);background:var(--glass);border-radius:var(--r3);border:var(--gb);">
      <h3 style="margin-bottom:var(--sp3);font-size:var(--fs-h3);">当前分类 JSON（可直接编辑）</h3>
      <textarea class="fta" id="catsJson" style="font-family:monospace;font-size:var(--fs-c);">${catsJson}</textarea>
      <button class="btn bp" style="margin-top:var(--sp3);" onclick="saveCatsJson()">💾 保存 JSON</button>
    </div>
  </div>

  <!-- 站点设置 -->
  <div class="panel" id="p-site">
    <h2 style="margin-bottom:var(--sp4);">站点设置</h2>
    <div style="display:grid;gap:var(--sp4);max-width:680px;">
      <div class="fg"><label class="fl">品牌名称</label><input class="fi" id="s_brand_name" value="${esc(cfg.brand_name||'Gallery')}"></div>
      <div class="fg"><label class="fl">站点大标题</label><input class="fi" id="s_site_title" value="${esc(cfg.site_title||'精选作品')}"></div>
      <div class="fg"><label class="fl">站点副标题</label><input class="fi" id="s_site_subtitle" value="${esc(cfg.site_subtitle||'')}"></div>
      <div class="fg"><label class="fl">SEO 描述</label><input class="fi" id="s_site_description" value="${esc(cfg.site_description||'')}"></div>
      <div class="fg"><label class="fl">SEO 关键词（逗号分隔）</label><input class="fi" id="s_site_keywords" value="${esc(cfg.site_keywords||'')}"></div>
      <div class="fg"><label class="fl">暗色模式</label><select class="fs" id="s_theme_dark_mode"><option value="off"${cfg.theme_dark_mode==='off'?' selected':''}>关闭</option><option value="on"${cfg.theme_dark_mode==='on'?' selected':''}>开启</option><option value="auto"${cfg.theme_dark_mode==='auto'?' selected':''}>跟随系统</option></select></div>
      <div class="fg"><label class="fl">Hero 背景类型</label><select class="fs" id="s_hero_bg_type"><option value="gradient"${cfg.hero_bg_type==='gradient'?' selected':''}>渐变</option><option value="image"${cfg.hero_bg_type==='image'?' selected':''}>图片</option><option value="video"${cfg.hero_bg_type==='video'?' selected':''}>视频</option><option value="none"${cfg.hero_bg_type==='none'?' selected':''}>无</option></select></div>
      <div class="fg"><label class="fl">页脚 HTML（支持 HTML）</label><textarea class="fta" id="s_footer_html">${esc(cfg.footer_html||'')}</textarea></div>
      <div class="fg"><label class="fl">公告 HTML（支持 HTML，留空不显示）</label><textarea class="fta" id="s_announcement_html">${esc(cfg.announcement_html||'')}</textarea></div>
      <div class="fg"><label class="fl">关于页 HTML（支持 HTML，留空则隐藏）</label><textarea class="fta" id="s_about_html">${esc(cfg.about_html||'')}</textarea></div>
      <div class="fg"><label class="fl">导航链接 JSON（[{label,url}]）</label><textarea class="fta" id="s_nav_links" style="font-family:monospace;font-size:var(--fs-c);">${esc(cfg.nav_links||'[]')}</textarea></div>
      <div class="fg"><label class="fl">复制链接按钮文字</label><input class="fi" id="s_copy_link_text" value="${esc(cfg.copy_link_text||'复制链接')}"></div>
      <div class="fg"><label class="fl">RSS 订阅</label><select class="fs" id="s_rss_enabled"><option value="1"${cfg.rss_enabled==='1'?' selected':''}>开启</option><option value="0"${cfg.rss_enabled==='0'?' selected':''}>关闭</option></select></div>
      <div class="fg"><label class="fl">Sitemap</label><select class="fs" id="s_sitemap_enabled"><option value="1"${cfg.sitemap_enabled==='1'?' selected':''}>开启</option><option value="0"${cfg.sitemap_enabled==='0'?' selected':''}>关闭</option></select></div>
      <button class="btn bp" onclick="saveSite()">💾 保存站点设置</button>
    </div>
    <div class="preview-box" style="margin-top:var(--sp5);">
      <h3 style="margin-bottom:var(--sp3);font-size:var(--fs-h3);">📊 数据统计</h3>
      <div id="statsBox" style="display:flex;gap:var(--sp4);flex-wrap:wrap;"></div>
    </div>
  </div>

  <!-- 修改密码 -->
  <div class="panel" id="p-pwd">
    <h2 style="margin-bottom:var(--sp4);">修改密码</h2>
    <div style="max-width:400px;display:grid;gap:var(--sp3);">
      <div class="fg"><label class="fl">原密码</label><input class="fi" type="password" id="oldPwd"></div>
      <div class="fg"><label class="fl">新密码</label><input class="fi" type="password" id="newPwd"></div>
      <button class="btn bp" onclick="changePwd()">🔑 修改密码</button>
    </div>
  </div>
</div>

<!-- 编辑模态框 -->
<div class="mo" id="editModal" style="display:none;">
  <div class="md">
    <button class="mx" onclick="closeModal()">×</button>
    <h2 id="modalTitle">新建内容</h2>
    <div style="display:grid;gap:var(--sp3);">
      <div class="fg"><label class="fl">标题 *</label><input class="fi" id="f_title"></div>
      <div class="fg"><label class="fl">描述</label><input class="fi" id="f_description"></div>
      <div class="fg"><label class="fl">类型</label><select class="fs" id="f_type" onchange="onTypeChange()"><option value="image">图片</option><option value="video">视频</option><option value="text">文字</option></select></div>
      <div class="fg"><label class="fl">分类</label><input class="fi" id="f_category" placeholder="如：摄影"></div>
      <div class="fg"><label class="fl">自定义 Slug（URL 别名，留空自动生成）</label><input class="fi" id="f_custom_slug"></div>
      <div class="fg"><label class="fl">标签（逗号分隔）</label><input class="fi" id="f_tags"></div>
      <div class="fg"><label class="fl">内容 / 视频外链 / 文字正文</label><textarea class="fta" id="f_content"></textarea></div>
      <div class="fg"><label class="fl">发布时间（留空=立即）</label><input class="fi" type="datetime-local" id="f_publish_at"></div>
      <div class="fg"><label class="fl">过期时间（留空=不过期）</label><input class="fi" type="datetime-local" id="f_expire_at"></div>
      <div class="fg"><label class="fl">排序权重（大靠前）</label><input class="fi" type="number" id="f_sort_weight" value="0"></div>
      <div class="fg"><label class="fl">SEO 描述</label><input class="fi" id="f_seo_description"></div>
      <div class="fg"><label class="fl">SEO 关键词</label><input class="fi" id="f_seo_keywords"></div>
      <div class="fg"><label class="fl">自定义 CSS 类</label><input class="fi" id="f_custom_css_class" placeholder="高级：给卡片加额外样式"></div>
      <div class="sm" style="gap:var(--sp3);flex-wrap:wrap;">
        <label><input type="checkbox" id="f_is_public"> 🚀 发布（勾选后前台可见）</label>
        <label><input type="checkbox" id="f_is_hidden"> 🙈 隐藏（仅链接可访问）</label>
      </div>
      <div style="border:1px dashed var(--bd);border-radius:var(--r3);padding:var(--sp4);margin-top:var(--sp3);">
        <strong style="font-size:var(--fs-c);color:var(--text-2);">🖼 封面图（独立）</strong>
        <div class="up" style="margin-top:var(--sp3);"><input type="file" id="coverInput" accept="image/*" style="display:none;" onchange="uploadCover()"><button class="btn bg" onclick="document.getElementById('coverInput').click()">选择封面</button><span id="coverStatus" style="font-size:var(--fs-c);color:var(--text-2);"></span></div>
        <div id="coverPreview" style="margin-top:var(--sp3);"></div>
      </div>
      <div style="border:1px dashed var(--bd);border-radius:var(--r3);padding:var(--sp4);">
        <strong style="font-size:var(--fs-c);color:var(--text-2);">📎 附件（可选，前台显示下载按钮）</strong>
        <div class="up" style="margin-top:var(--sp3);"><input type="file" id="attachInput" style="display:none;" onchange="uploadAttach()"><button class="btn bg" onclick="document.getElementById('attachInput').click()">选择文件</button><span id="attachStatus" style="font-size:var(--fs-c);color:var(--text-2);"></span></div>
        <div id="attachPreview" style="margin-top:var(--sp3);"></div>
      </div>
    </div>
    <div style="display:flex;gap:var(--sp3);margin-top:var(--sp5);flex-wrap:wrap;">
      <button class="btn bp" id="btnSave" onclick="saveItem()">💾 保存</button>
      <button class="btn bg" onclick="previewItem()">👁 预览</button>
      <button class="btn bd" onclick="closeModal()">取消</button>
    </div>
    <div id="previewArea" style="margin-top:var(--sp4);padding:var(--sp4);background:var(--glass);border-radius:var(--r3);display:none;"></div>
  </div>
</div>

<button class="fab" onclick="showCreate()" title="新建">＋</button>

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
async function api(path,opts={}){const r=await fetch(API+path,opts);const j=await r.json().catch(()=>({}));if(!r.ok||!j.ok)toast(j.msg||'操作失败','e');return j;}
async function apiRaw(path,opts={}){return await fetch(API+path,opts);}

// Load items
async function loadItems(){const j=await api('/items');if(j.ok)allItems=j.items||[];renderTable();renderStats();}
function renderStats(){const s={total:allItems.length,img:0,vid:0,txt:0,pub:0,drf:0};allItems.forEach(i=>{if(i.type==='image')s.img++;else if(i.type==='video')s.vid++;else s.txt++;if(i.is_public)s.pub++;else s.drf++;});document.getElementById('statsBar').innerHTML=`<div class="sc b" style="min-width:120px;"><div class="scn">${s.total}</div><div class="scl">总内容</div></div><div class="sc g" style="min-width:100px;"><div class="scn">${s.img}</div><div class="scl">图片</div></div><div class="sc p" style="min-width:100px;"><div class="scn">${s.vid}</div><div class="scl">视频</div></div><div class="sc o" style="min-width:100px;"><div class="scn">${s.txt}</div><div class="scl">文字</div></div><div class="sc g" style="min-width:100px;"><div class="scn">${s.pub}</div><div class="scl">已发布</div></div><div class="sc o" style="min-width:100px;"><div class="scn">${s.drf}</div><div class="scl">草稿</div></div>`;}
function renderTable(){const q=(document.getElementById('searchInput').value||'').toLowerCase();const ft=document.getElementById('filterType').value;const fs=document.getElementById('filterStatus').value;let arr=allItems.slice();if(q)arr=arr.filter(i=>(i.title||'').toLowerCase().includes(q));if(ft)arr=arr.filter(i=>i.type===ft);if(fs!=='')arr=arr.filter(i=>String(i.is_public)===fs);arr.sort((a,b)=>(b.sort_weight||0)-(a.sort_weight||0)||(b.updated_at||'').localeCompare(a.updated_at||''));document.getElementById('itemsBody').innerHTML=arr.map(i=>{const st=i.is_public?('<span class="sd sp"></span>已发布'):('<span class="sd sd2"></span>草稿');const hid=i.is_hidden?(' <span class="sd sh"></span>隐藏'):'';const cov=i.cover_key?('<img src="/file/'+encodeURIComponent(i.cover_key)+'" style="width:48px;height:36px;object-fit:cover;border-radius:6px;">'):'<span style="color:var(--text-3);font-size:var(--fs-m);">无</span>';return '<tr><td><input type="checkbox" class="rowChk" value="'+i.id+'"></td><td>'+cov+'</td><td><a href="/item/'+encodeURIComponent(i.slug||i.id)+'" target="_blank" style="color:var(--accent);font-weight:500;">'+esc(i.title||'无标题')+'</a><br><span style="font-size:var(--fs-m);color:var(--text-3);">/item/'+esc(i.slug||i.id)+'</span></td><td><span class="badge '+(i.type==='video'?'bv':i.type==='text'?'bt':'bi')+'">'+(i.type==='video'?'视频':i.type==='text'?'文字':'图片')+'</span></td><td>'+(i.category||'-')+'</td><td>'+st+hid+'</td><td style="font-size:var(--fs-m);color:var(--text-3);">'+fmtDate(i.created_at)+'</td><td><button class="btn bs" onclick="editItem('+i.id+')">编辑</button> <button class="btn bs bd" onclick="delItem('+i.id+')">删除</button></td></tr>';}).join('');}

// Edit modal
function showCreate(){editId=null;coverKey=null;attachKey=null;attachName='';document.getElementById('modalTitle').textContent='新建内容';document.getElementById('editModal').style.display='flex';document.getElementById('previewArea').style.display='none';['f_title','f_description','f_type','f_category','f_custom_slug','f_tags','f_content','f_seo_description','f_seo_keywords','f_custom_css_class'].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});document.getElementById('f_type').value='image';document.getElementById('f_is_public').checked=false;document.getElementById('f_is_hidden').checked=false;document.getElementById('f_sort_weight').value='0';document.getElementById('f_publish_at').value='';document.getElementById('f_expire_at').value='';document.getElementById('coverPreview').innerHTML='';document.getElementById('attachPreview').innerHTML='';onTypeChange();}
function closeModal(){document.getElementById('editModal').style.display='none';}
async function editItem(id){const j=await api('/items');const item=(j.items||[]).find(x=>x.id===id);if(!item)return;editId=id;coverKey=item.cover_key||null;attachKey=item.attachment_key||null;attachName=item.attachment_name||'';document.getElementById('modalTitle').textContent='编辑：'+item.title;document.getElementById('editModal').style.display='flex';document.getElementById('previewArea').style.display='none';document.getElementById('f_title').value=item.title||'';document.getElementById('f_description').value=item.description||'';document.getElementById('f_type').value=item.type||'text';document.getElementById('f_category').value=item.category||'';document.getElementById('f_custom_slug').value=item.custom_slug||'';document.getElementById('f_tags').value=item.tags||'';document.getElementById('f_content').value=item.content||'';document.getElementById('f_seo_description').value=item.seo_description||'';document.getElementById('f_seo_keywords').value=item.seo_keywords||'';document.getElementById('f_custom_css_class').value=item.custom_css_class||'';document.getElementById('f_is_public').checked=!!item.is_public;document.getElementById('f_is_hidden').checked=!!item.is_hidden;document.getElementById('f_sort_weight').value=item.sort_weight||0;document.getElementById('f_publish_at').value=item.publish_at?item.publish_at.slice(0,16):'';document.getElementById('f_expire_at').value=item.expire_at?item.expire_at.slice(0,16):'';document.getElementById('coverPreview').innerHTML=coverKey?('<img src="/file/'+encodeURIComponent(coverKey)+'" style="max-width:160px;border-radius:8px;"> <button class="btn bs bd" onclick="coverKey=null;document.getElementById(\'coverPreview\').innerHTML=\'\'">清除</button>'):'';document.getElementById('attachPreview').innerHTML=attachKey?('<span>📎 '+esc(attachName)+'</span> <button class="btn bs bd" onclick="attachKey=null;attachName=\'\';document.getElementById(\'attachPreview\').innerHTML=\'\'">清除</button>'):'';onTypeChange();}
function onTypeChange(){const t=document.getElementById('f_type').value;const c=document.getElementById('f_content');c.placeholder=t==='video'?'填视频 URL（mp4/webm）':t==='text'?'填文字正文，支持 HTML':'(封面图独立上传，此处可填正文或留空)';}

// Save
async function saveItem(){const data={title:document.getElementById('f_title').value.trim(),description:document.getElementById('f_description').value.trim(),type:document.getElementById('f_type').value,category:document.getElementById('f_category').value.trim(),custom_slug:document.getElementById('f_custom_slug').value.trim()||null,tags:document.getElementById('f_tags').value.trim(),content:document.getElementById('f_content').value,seo_description:document.getElementById('f_seo_description').value.trim(),seo_keywords:document.getElementById('f_seo_keywords').value.trim(),custom_css_class:document.getElementById('f_custom_css_class').value.trim(),is_public:document.getElementById('f_is_public').checked?1:0,is_hidden:document.getElementById('f_is_hidden').checked?1:0,sort_weight:parseInt(document.getElementById('f_sort_weight').value)||0,publish_at:document.getElementById('f_publish_at').value||null,expire_at:document.getElementById('f_expire_at').value||null,cover_key:coverKey,gallery_keys:[],attachment_key:attachKey,attachment_name:attachName};if(!data.title){toast('标题不能为空','e');return;}const j=editId?await api('/items/'+editId,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)}):await api('/items',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});if(j.ok){toast(editId?'已更新 ✅':'已创建 ✅');closeModal();loadItems();}}
async function delItem(id){if(!confirm('确定删除？'))return;const j=await api('/items/'+id,{method:'DELETE'});if(j.ok){toast('已删除 ✅');loadItems();}}
function toggleAll(c){document.querySelectorAll('.rowChk').forEach(x=>x.checked=c.checked);}
async function batchDelete(){const ids=[...document.querySelectorAll('.rowChk:checked')].map(x=>parseInt(x.value));if(!ids.length){toast('请先选择','e');return;}if(!confirm('确定删除 '+ids.length+' 条？'))return;const j=await api('/items/batch',{method:'DELETE',headers:{'Content-Type':'application/json'},body:JSON.stringify({ids})});if(j.ok){toast('已删除 ✅');loadItems();}}

// Preview
async function previewItem(){const data={title:document.getElementById('f_title').value.trim()||'预览标题',description:document.getElementById('f_description').value.trim(),type:document.getElementById('f_type').value,content:document.getElementById('f_content').value||'预览内容...',category:document.getElementById('f_category').value.trim(),tags:document.getElementById('f_tags').value.trim(),cover_key:coverKey,is_public:1};const area=document.getElementById('previewArea');area.style.display='block';const cov=data.cover_key?('<img src="/file/'+encodeURIComponent(data.cover_key)+'" style="max-width:100%;border-radius:12px;margin-bottom:12px;">'):'';area.innerHTML=cov+'<h3 style="font-size:1.3rem;font-weight:700;margin-bottom:8px;">'+esc(data.title)+'</h3><p style="color:var(--text-2);margin-bottom:12px;">'+esc(data.description)+'</p><div style="padding:12px;background:var(--glass);border-radius:8px;">'+(data.content||'').replace(/\\n/g,'<br>')+'</div>';}

// Upload
async function doUpload(){const f=document.getElementById('fileInput').files[0];if(!f)return;const fd=new FormData();fd.append('file',f);document.getElementById('uploadStatus').textContent='上传中...';const r=await apiRaw('/upload',{method:'POST',body:fd});const j=await r.json().catch(()=>({}));if(j.ok){document.getElementById('uploadStatus').textContent='✅ '+j.name;document.getElementById('uploadResult').innerHTML='<div style="padding:var(--sp3);background:var(--glass);border-radius:var(--r2);"><p style="font-size:var(--fs-c);color:var(--text-2);margin-bottom:6px;">最近上传：</p><a href="'+j.url+'" target="_blank"><img src="'+j.url+'" style="max-width:200px;border-radius:8px;"></a><p style="margin-top:6px;font-size:var(--fs-m);color:var(--text-3);">'+j.key+'</p><div style="margin-top:8px;display:flex;gap:8px;"><button class="btn bs bp" onclick="useAsCover(\''+j.key+'\')">用作封面</button><button class="btn bs bg" onclick="useAsContent(\''+j.key+'\')">用作内容</button><button class="btn bs bd" onclick="delFile(\''+j.key+'\')">删除</button></div></div>';loadKV();}else{document.getElementById('uploadStatus').textContent='❌ 失败';}}
function useAsCover(k){coverKey=k;document.getElementById('coverPreview').innerHTML='<img src="/file/'+encodeURIComponent(k)+'" style="max-width:160px;border-radius:8px;">';toast('已设为封面');}
function useAsContent(k){document.getElementById('f_content').value='/file/'+k;toast('已填入内容');}
async function delFile(k){if(!confirm('删除文件？'))return;const j=await api('/file/'+encodeURIComponent(k),{method:'DELETE'});if(j.ok){toast('已删除');loadKV();}}
async function uploadCover(){const f=document.getElementById('coverInput').files[0];if(!f)return;const fd=new FormData();fd.append('file',f);document.getElementById('coverStatus').textContent='上传中...';const r=await apiRaw('/upload',{method:'POST',body:fd});const j=await r.json().catch(()=>({}));if(j.ok){coverKey=j.key;document.getElementById('coverStatus').textContent='✅';document.getElementById('coverPreview').innerHTML='<img src="'+j.url+'" style="max-width:160px;border-radius:8px;">';}}
async function uploadAttach(){const f=document.getElementById('attachInput').files[0];if(!f)return;const fd=new FormData();fd.append('file',f);document.getElementById('attachStatus').textContent='上传中...';const r=await apiRaw('/upload',{method:'POST',body:fd});const j=await r.json().catch(()=>({}));if(j.ok){attachKey=j.key;attachName=j.name;document.getElementById('attachStatus').textContent='✅';document.getElementById('attachPreview').innerHTML='<span>📎 '+j.name+'</span>';}}

// KV list
async function loadKV(){const j=await api('/items');const all=j.items||[];const keys=new Set();all.forEach(i=>{if(i.thumbnail_key)keys.add(i.thumbnail_key);if(i.cover_key)keys.add(i.cover_key);if(i.attachment_key)keys.add(i.attachment_key);});const arr=[...keys];document.getElementById('kvList').innerHTML=!arr.length?'<p style="color:var(--text-3);font-size:var(--fs-c);">暂无文件</p>':arr.map(k=>'<div style="padding:var(--sp2);background:var(--glass);border-radius:var(--r2);font-size:var(--fs-m);display:flex;align-items:center;gap:6px;"><a href="/file/'+encodeURIComponent(k)+'" target="_blank" style="color:var(--accent);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">'+esc(k)+'</a><button class="btn bs bd" style="margin-left:auto;" onclick="delFile(\''+k+'\')">×</button></div>').join('');}

// Categories
function renderCats(){document.getElementById('catList').innerHTML=cats.map((c,i)=>'<div class="cat-item"><input class="cat-color" type="color" value="'+esc(c.color||'#0071E3')+'" onchange="cats['+i+'].color=this.value;renderCats()"><input class="fi" style="flex:1;" value="'+esc(c.name)+'" onchange="cats['+i+'].name=this.value"><button class="btn bs bd" onclick="cats.splice('+i+',1);renderCats()">删除</button></div>').join('');}
function addCat(){cats.push({name:'新分类',color:'#'+Math.floor(Math.random()*16777215).toString(16).padStart(6,'0')});renderCats();}
async function saveCatsJson(){try{const arr=JSON.parse(document.getElementById('catsJson').value);cats=arr;const j=await api('/settings',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({categories:JSON.stringify(cats)})});if(j.ok)toast('分类已保存 ✅');}catch(e){toast('JSON 格式错误','e');}}

// Site settings
async function saveSite(){const fd={};const ids=['brand_name','site_title','site_subtitle','site_description','site_keywords','theme_dark_mode','hero_bg_type','footer_html','announcement_html','about_html','nav_links','copy_link_text','rss_enabled','sitemap_enabled'];for(const id of ids){const el=document.getElementById('s_'+id);if(el)fd[id]=el.value;}try{fd.nav_links=JSON.stringify(JSON.parse(fd.nav_links));}catch(e){toast('导航链接 JSON 格式错误','e');return;}const j=await api('/settings',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(fd)});if(j.ok)toast('站点设置已保存 ✅');}
async function loadStats(){const j=await api('/stats');if(!j.ok)return;const s=j.stats;document.getElementById('statsBox').innerHTML='<div class="sc b" style="min-width:100px;"><div class="scn">'+s.total+'</div><div class="scl">总内容</div></div><div class="sc g" style="min-width:80px;"><div class="scn">'+s.image+'</div><div class="scl">图片</div></div><div class="sc p" style="min-width:80px;"><div class="scn">'+s.video+'</div><div class="scl">视频</div></div><div class="sc o" style="min-width:80px;"><div class="scn">'+s.text+'</div><div class="scl">文字</div></div><div class="sc g" style="min-width:80px;"><div class="scn">'+s.public+'</div><div class="scl">已发布</div></div><div class="sc o" style="min-width:80px;"><div class="scn">'+s.draft+'</div><div class="scl">草稿</div></div>';}

// Password
async function changePwd(){const o=document.getElementById('oldPwd').value;const n=document.getElementById('newPwd').value;if(!o||!n)return toast('请填完整','e');const j=await api('/change-password',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({old:o,new:n})});if(j.ok){toast('密码已修改 ✅');document.getElementById('oldPwd').value='';document.getElementById('newPwd').value='';}}

// Logout
async function logout(){await apiRaw('/logout');location.reload();}

// Init
(async()=>{await loadItems();})();
</script></body></html>`;
}
