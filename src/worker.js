/**
 * Media Gallery — Cloudflare Workers + D1 + KV
 *  UI: Apple 静奢风 设计系统 v5 — 16 项自定义全开
 *  ─────────────────────────────────────────────
 *  1 自定义 Slug   2 SEO 字段      3 发布时间
 *  7 隐藏/仅链接   8 多图画廊    10 自定义 CSS 类
 *  11 Logo/Favicon 13 暗色模式    14 Hero 自定义
 *  15 页脚(HTML)  16 导航链接   17 关于页(HTML)
 *  18 公告(HTML)   19 品牌名     27 懒加载占位
 *  28 复制链接     + RSS          + Sitemap
 */
export default { async fetch(r,e){return handleRequest(r,e);} };
// ===================== 工具函数 =====================
async function sha256(t){const e=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(t));return[...new Uint8Array(e)].map(b=>b.toString(16).padStart(2,'0')).join('');}
function randStr(l){l=l||16;let s='';const c='abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';for(let i=0;i<l;i++)s+=c[Math.floor(Math.random()*c.length)];return s;}
function esc(s){if(!s)return'';return String(s).replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));}
function escAttr(s){return esc(s);}
function pinyinSlug(s){if(!s)return'';return String(s).toLowerCase().replace(/[^a-z0-9\u4e00-\u9fa5]+/g,'-').replace(/^[-]+|[-]+$/g,'').substring(0,80);}
function nowISO(){return new Date().toISOString();}
function parseBool(v){return v===1||v==='1'||v===true||v==='true';}
function safeJSON(s,def){try{return JSON.parse(s||'null')||def;}catch(e){return def;}}
function isVisible(item){const now=new Date();if(item.is_hidden)return false;if(item.publish_at&&new Date(item.publish_at)>now)return false;if(item.expire_at&&new Date(item.expire_at)<now)return false;return true;}

function encURI(s){return encodeURIComponent(String(s||''));}
function formatDate(s){if(!s)return'';try{return new Date(s).toLocaleDateString('zh-CN',{year:'numeric',month:'short',day:'numeric'});}catch(e){return s;}}

// ===================== 设计令牌（内联） =====================
const DESIGN_TOKENS=`:root{
  /* ── 1. 色彩系统 ─────────────────────────────── */
  --bg-base:        #ECEEF6;
  --bg-elevated:    rgba(255,255,255,0.70);
  --bg-subtle:      rgba(255,255,255,0.50);
  --bg-muted:       rgba(240,240,248,0.55);

  --text-primary:    #1C1C1E;
  --text-secondary:  #5A5A62;
  --text-tertiary:   #9A9AA2;
  --text-disabled:   #C7C7CC;

  --accent:          #0071E3;
  --accent-hover:    #0077ED;
  --accent-pressed:  #0066CC;
  --accent-soft:     rgba(0,113,227,0.10);
  --accent-ring:     rgba(0,113,227,0.22);

  --danger:          #FF3B30;
  --danger-soft:     rgba(255,59,48,0.10);
  --success:         #34C759;
  --success-soft:    rgba(52,199,89,0.10);
  --warning:         #FF9500;
  --warning-soft:    rgba(255,149,0,0.10);

  /* 渐变组合 */
  --grad-blue:       linear-gradient(135deg,#0071E3 0%,#5E5CE6 100%);
  --grad-purple:     linear-gradient(135deg,#5E5CE6 0%,#BF5AF2 100%);
  --grad-pink:      linear-gradient(135deg,#FF2D55 0%,#FF375F 100%);
  --grad-teal:      linear-gradient(135deg,#30B0C7 0%,#00C7BE 100%);
  --grad-orange:    linear-gradient(135deg,#FF9500 0%,#FF6B35 100%);
  --grad-green:     linear-gradient(135deg,#34C759 0%,#30D158 100%);
  --grad-warm:      linear-gradient(135deg,#FF6B35 0%,#FFB800 100%);
  --grad-cool:      linear-gradient(135deg,#4FACFE 0%,#00F2FE 100%);
  --grad-aurora:    linear-gradient(135deg,rgba(99,102,241,0.30) 0%,rgba(168,85,247,0.22) 30%,rgba(56,189,248,0.26) 60%,rgba(52,211,153,0.18) 100%);

  /* 毛玻璃边框 */
  --border-hairline: rgba(255,255,255,0.50);
  --border-default:  rgba(255,255,255,0.35);
  --border-strong:   rgba(0,0,0,0.08);
  --border-accent:   rgba(0,113,227,0.30);
  --border-glass:    rgba(255,255,255,0.60);

  /* ── 阴影系统（毛玻璃专属） ── */
  --shadow-1:        0 1px 3px  rgba(0,0,0,0.04), inset 0 1px 0 rgba(255,255,255,0.55);
  --shadow-2:        0 2px 14px rgba(0,0,0,0.05), inset 0 1px 0 rgba(255,255,255,0.50);
  --shadow-3:        0 4px 22px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.45);
  --shadow-4:        0 8px 38px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.40);
  --shadow-5:        0 20px 60px rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,0.30);
  --shadow-inset:    inset 0 1px 0 rgba(255,255,255,0.65), inset 0 -1px 0 rgba(0,0,0,0.03);
  --shadow-glow-blue:   0 0 28px rgba(0,113,227,0.28);
  --shadow-glow-purple: 0 0 32px rgba(94,92,230,0.24);

  /* ── 圆角系统 ── */
  --radius-xs:       8px;
  --radius-sm:       12px;
  --radius-md:       16px;
  --radius-lg:       22px;
  --radius-xl:       30px;
  --radius-pill:     999px;

  /* ── 2. 字体系统 ── */
  --font-sans: -apple-system,BlinkMacSystemFont,'SF Pro Display','SF Pro Text',
               'PingFang SC','Helvetica Neue','WenQuanYi Micro Hei',sans-serif;
  --font-mono: 'SF Mono','JetBrains Mono','Fira Code',monospace;

  --fs-display: clamp(2.2rem, 6vw, 3.8rem);
  --fs-h1:      clamp(1.6rem, 3.8vw, 2.2rem);
  --fs-h2:      1.3rem;
  --fs-h3:      1.1rem;
  --fs-body:    0.95rem;
  --fs-body-lg: 1.05rem;
  --fs-caption: 0.82rem;
  --fs-micro:   0.72rem;

  --fw-regular:  400;
  --fw-medium:   500;
  --fw-semibold: 600;
  --fw-bold:     700;
  --fw-black:    800;

  --lh-tight:    1.12;
  --lh-snug:     1.35;
  --lh-normal:    1.55;
  --lh-relaxed:  1.7;

  --tracking-tight:  -0.035em;
  --tracking-normal: -0.01em;
  --tracking-wide:    0.02em;

  /* ── 3. 动效规范 ── */
  --ease-standard: cubic-bezier(0.4, 0, 0.2, 1);
  --ease-decel:    cubic-bezier(0.16, 1, 0.3, 1);
  --ease-accel:    cubic-bezier(0.7, 0, 0.84, 0);
  --ease-spring:   cubic-bezier(0.34, 1.56, 0.64, 1);

  --dur-instant:  100ms;
  --dur-fast:     220ms;
  --dur-base:     360ms;
  --dur-slow:     520ms;

  /* ── 4. 布局 ── */
  --space-1:  4px;  --space-2:  8px;  --space-3:  12px;
  --space-4:  16px; --space-5:  24px; --space-6:  32px;
  --space-7:  48px; --space-8:  64px; --space-9:  96px;

  --content-narrow:  720px;
  --content-base:    960px;
  --content-wide:    1200px;

  /* ── 5. 毛玻璃通用 ── */
  --glass-bg:        rgba(255,255,255,0.55);
  --glass-bg-strong: rgba(255,255,255,0.72);
  --glass-bg-weak:   rgba(255,255,255,0.35);
  --glass-blur:      blur(28px) saturate(200%);
  --glass-blur-lg:   blur(44px) saturate(220%);
  --glass-border:    1px solid rgba(255,255,255,0.55);
  --glass-inner-glow:inset 0 1px 0 rgba(255,255,255,0.65), inset 0 -1px 0 rgba(0,0,0,0.04);
}`;

const BASE_CSS=DESIGN_TOKENS+`
/* ── Reset ────────────────────────────────────── */
*,*::before,*::after{margin:0;padding:0;box-sizing:border-box;}
html{scroll-behavior:smooth;-webkit-text-size-adjust:100%;}
body{
  font-family:var(--font-sans);font-size:var(--fs-body);line-height:var(--lh-normal);
  color:var(--text-primary);background:var(--bg-base);min-height:100vh;
  -webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale;
  letter-spacing:var(--tracking-normal);position:relative;overflow-x:hidden;
  transition:background var(--dur-slow) var(--ease-standard),color var(--dur-slow) var(--ease-standard);
}
body::before{
  content:'';position:fixed;inset:-20%;z-index:-2;
  background:
    radial-gradient(ellipse 55% 45% at 12% 18%,rgba(99,102,241,0.20),transparent 70%),
    radial-gradient(ellipse 48% 55% at 88% 28%,rgba(168,85,247,0.16),transparent 70%),
    radial-gradient(ellipse 52% 42% at 50% 82%,rgba(56,189,248,0.18),transparent 70%),
    radial-gradient(ellipse 38% 48% at 78% 78%,rgba(52,211,153,0.14),transparent 70%),
    radial-gradient(ellipse 42% 52% at 22% 68%,rgba(236,72,153,0.11),transparent 70%),
    linear-gradient(165deg,#E8EAF5 0%,#DFE3F5 30%,#E2DFF5 60%,#DCE5F0 100%);
  animation:aurora 28s ease-in-out infinite;will-change:transform;
}
body::after{
  content:'';position:fixed;inset:0;z-index:-1;pointer-events:none;
  background:radial-gradient(circle 280px at var(--mx,50%) var(--my,30%),rgba(255,255,255,0.45),transparent 70%);
  transition:opacity var(--dur-base) var(--ease-standard);
}
@keyframes aurora{
  0%,100%{transform:translate(0,0) rotate(0deg) scale(1);}
  20%{transform:translate(-2%,1.5%) rotate(0.8deg) scale(1.02);}
  40%{transform:translate(1.5%,-1%) rotate(-0.5deg) scale(1.01);}
  60%{transform:translate(-1%,2%) rotate(0.5deg) scale(1.03);}
  80%{transform:translate(2%,-1.5%) rotate(-0.3deg) scale(1.01);}
}
a{color:var(--accent);text-decoration:none;transition:color var(--dur-fast) var(--ease-standard);}
a:hover{color:var(--accent-hover);}
button{font-family:inherit;cursor:pointer;border:none;background:none;}
img,video{max-width:100%;display:block;}
input,textarea,select{font-family:inherit;font-size:inherit;color:inherit;}

/* ── 减少动效偏好 ────────────────────────────── */
@media (prefers-reduced-motion: reduce){
  *,*::before,*::after{animation-duration:0.01ms!important;animation-iteration-count:1!important;transition-duration:0.01ms!important;scroll-behavior:auto!important;}
  body::before{animation:none;}
}

/* ════════ 导航栏（深度毛玻璃） ════════ */
.nav{
  position:sticky;top:0;z-index:100;
  background:rgba(255,255,255,0.42);backdrop-filter:blur(36px) saturate(220%);-webkit-backdrop-filter:blur(36px) saturate(220%);
  border-bottom:var(--glass-border);box-shadow:var(--glass-inner-glow),0 4px 28px rgba(0,0,0,0.04);
  transition:background var(--dur-base) var(--ease-standard),box-shadow var(--dur-base) var(--ease-standard);
}
.nav.scrolled{background:rgba(255,255,255,0.58);box-shadow:var(--glass-inner-glow),0 8px 36px rgba(0,0,0,0.06);}
.nav-inner{max-width:var(--content-wide);margin:0 auto;padding:var(--space-3) var(--space-5);display:flex;align-items:center;justify-content:space-between;gap:var(--space-4);}
.brand{font-size:1.18rem;font-weight:var(--fw-black);letter-spacing:var(--tracking-tight);background:var(--grad-blue);background-size:200% 200%;-webkit-background-clip:text;-webkit-text-fill-color:transparent;animation:brandShine 8s ease infinite;filter:drop-shadow(0 1px 10px rgba(0,113,227,0.18));}
@keyframes brandShine{0%,100%{background-position:0% 50%}50%{background-position:100% 50%}}
.nav-links{display:flex;align-items:center;gap:var(--space-2);flex-wrap:wrap;}
.nav-link{display:inline-flex;align-items:center;gap:4px;padding:6px var(--space-3);border-radius:var(--radius-pill);font-size:var(--fs-caption);color:var(--text-secondary);transition:all var(--dur-fast) var(--ease-standard);}
.nav-link:hover{background:var(--glass-bg);color:var(--text-primary);transform:translateY(-1px);}
.nav-link.active{background:rgba(0,113,227,0.10);color:var(--accent);}
.nav-actions{display:flex;align-items:center;gap:var(--space-2);}

/* ════════ Hero 区域 ════════ */
.hero{
  position:relative;padding:var(--space-8) var(--space-5);text-align:center;
  max-width:var(--content-wide);margin:0 auto;
}
.hero-bg{position:absolute;inset:0;z-index:-1;border-radius:var(--radius-xl);overflow:hidden;}
.hero-bg video,.hero-bg img{width:100%;height:100%;object-fit:cover;}
.hero-bg::after{content:'';position:absolute;inset:0;background:rgba(255,255,255,0.35);backdrop-filter:blur(12px);}
.hero-title{
  font-size:var(--fs-display);font-weight:var(--fw-black);
  letter-spacing:var(--tracking-tight);line-height:var(--lh-tight);
  background:var(--grad-blue);background-size:200% 200%;
  -webkit-background-clip:text;-webkit-text-fill-color:transparent;
  animation:brandShine 10s ease infinite;margin-bottom:var(--space-3);
}
.hero-subtitle{font-size:var(--fs-body-lg);color:var(--text-secondary);max-width:640px;margin:0 auto var(--space-5);line-height:var(--lh-relaxed);}
.hero-actions{display:flex;gap:var(--space-3);justify-content:center;flex-wrap:wrap;}

/* ════════ 筛选标签 ════════ */
.filter-bar{display:flex;gap:var(--space-2);justify-content:center;flex-wrap:wrap;padding:var(--space-4) var(--space-5);max-width:var(--content-wide);margin:0 auto;}
.chip{display:inline-flex;align-items:center;padding:var(--space-1) var(--space-3);border-radius:var(--radius-pill);font-size:var(--fs-micro);font-weight:var(--fw-medium);background:var(--glass-bg);color:var(--text-secondary);border:var(--glass-border);backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);transition:all var(--dur-fast) var(--ease-standard);box-shadow:var(--shadow-1);cursor:pointer;}
.chip:hover{background:var(--glass-bg-strong);color:var(--text-primary);transform:translateY(-1px);box-shadow:var(--shadow-2);}
.chip-active{background:rgba(0,113,227,0.12);color:var(--accent);border-color:rgba(0,113,227,0.35);box-shadow:0 0 14px rgba(0,113,227,0.12),inset 0 1px 0 rgba(255,255,255,0.35);}

/* ════════ 卡片网格 ════════ */
.gallery-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:var(--space-5);padding:var(--space-4) var(--space-5) var(--space-7);max-width:var(--content-wide);margin:0 auto;}

/* ════════ 媒体卡片 ════════ */
.card{
  background:var(--glass-bg-strong);border:var(--glass-border);border-radius:var(--radius-lg);
  overflow:hidden;box-shadow:var(--shadow-2);backdrop-filter:var(--glass-blur);-webkit-backdrop-filter:var(--glass-blur);
  transition:transform var(--dur-base) var(--ease-spring),box-shadow var(--dur-base) var(--ease-standard),border-color var(--dur-base) var(--ease-standard);
  position:relative;cursor:pointer;
}
.card::before{content:'';position:absolute;inset:0;border-radius:inherit;pointer-events:none;z-index:1;background:linear-gradient(135deg,rgba(255,255,255,0.45) 0%,transparent 50%);opacity:0;transition:opacity var(--dur-base) var(--ease-standard);}
.card:hover{transform:translateY(-6px) scale(1.012);box-shadow:var(--shadow-4),var(--shadow-glow-blue);border-color:rgba(255,255,255,0.75);}
.card:hover::before{opacity:1;}
.card-media{aspect-ratio:4/3;width:100%;display:flex;align-items:center;justify-content:center;color:rgba(255,255,255,0.95);font-size:2.2rem;position:relative;overflow:hidden;background:#ddd;}
.card-media img,.card-media video{width:100%;height:100%;object-fit:cover;transition:transform var(--dur-slow) var(--ease-standard);}
.card:hover .card-media img,.card:hover .card-media video{transform:scale(1.04);}
.card-media::after{content:'';position:absolute;inset:0;background:linear-gradient(180deg,transparent 40%,rgba(0,0,0,0.24) 100%);pointer-events:none;}
.card-body{padding:var(--space-4) var(--space-5) var(--space-5);position:relative;z-index:2;}
.card-title{font-size:var(--fs-h3);font-weight:var(--fw-semibold);letter-spacing:var(--tracking-tight);line-height:var(--lh-snug);margin-bottom:var(--space-1);display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;}
.card-desc{font-size:var(--fs-caption);color:var(--text-secondary);line-height:var(--lh-snug);display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;}
.card-meta{display:flex;align-items:center;gap:var(--space-2);margin-top:var(--space-3);flex-wrap:wrap;}

/* ════════ 懒加载占位 ════════ */
.lazy-img{filter:blur(10px);transition:filter var(--dur-slow) var(--ease-standard);}
.lazy-img.loaded{filter:blur(0);}
.skeleton{background:linear-gradient(90deg,rgba(255,255,255,0.4) 0%,rgba(255,255,255,0.7) 50%,rgba(255,255,255,0.4) 100%);background-size:200% 100%;animation:skeletonShine 1.5s ease infinite;}
@keyframes skeletonShine{0%{background-position:200% 0}100%{background-position:-200% 0}}

/* ════════ 类型徽章 ════════ */
.badge{display:inline-flex;align-items:center;gap:var(--space-1);padding:3px var(--space-2);border-radius:var(--radius-xs);font-size:var(--fs-micro);font-weight:var(--fw-semibold);color:#fff;letter-spacing:var(--tracking-wide);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);border:1px solid rgba(255,255,255,0.30);box-shadow:0 2px 10px rgba(0,0,0,0.10),inset 0 1px 0 rgba(255,255,255,0.25);}
.badge-image{background:linear-gradient(135deg,rgba(0,113,227,0.88),rgba(94,92,230,0.85));}
.badge-video{background:linear-gradient(135deg,rgba(255,45,85,0.88),rgba(255,55,95,0.85));}
.badge-text{background:linear-gradient(135deg,rgba(79,172,254,0.88),rgba(0,242,254,0.85));}

/* ════════ 按钮 ════════ */
.btn{display:inline-flex;align-items:center;justify-content:center;gap:var(--space-2);padding:var(--space-2) var(--space-5);font-size:var(--fs-body);font-weight:var(--fw-medium);border-radius:var(--radius-sm);transition:all var(--dur-fast) var(--ease-standard);letter-spacing:var(--tracking-normal);white-space:nowrap;border:var(--glass-border);backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);cursor:pointer;}
.btn-primary{background:linear-gradient(135deg,rgba(0,113,227,0.88),rgba(94,92,230,0.84));color:#fff;box-shadow:0 2px 14px rgba(0,113,227,0.32),inset 0 1px 0 rgba(255,255,255,0.22);border-color:rgba(255,255,255,0.35);}
.btn-primary:hover{background:linear-gradient(135deg,rgba(0,119,237,0.92),rgba(105,103,240,0.88));transform:translateY(-2px);box-shadow:0 6px 24px rgba(0,113,227,0.38),inset 0 1px 0 rgba(255,255,255,0.28);}
.btn-primary:active{transform:translateY(0);}
.btn-ghost{background:var(--glass-bg);color:var(--text-secondary);border:var(--glass-border);}
.btn-ghost:hover{background:var(--glass-bg-strong);color:var(--text-primary);transform:translateY(-1px);box-shadow:var(--shadow-2);}
.btn-danger{color:var(--danger);border:1px solid rgba(255,59,48,0.18);background:rgba(255,59,48,0.05);}
.btn-danger:hover{background:var(--danger-soft);box-shadow:0 0 14px rgba(255,59,48,0.10);}
.btn-sm{padding:4px var(--space-3);font-size:var(--fs-caption);}

/* ════════ 详情页 ════════ */
.detail-hero{position:relative;max-width:var(--content-base);margin:var(--space-6) auto;padding:0 var(--space-5);}
.detail-hero img,.detail-hero video{width:100%;border-radius:var(--radius-lg);box-shadow:var(--shadow-4);}
.detail-body{max-width:var(--content-narrow);margin:0 auto;padding:var(--space-5);}
.detail-title{font-size:var(--fs-h1);font-weight:var(--fw-bold);letter-spacing:var(--tracking-tight);line-height:var(--lh-snug);margin-bottom:var(--space-3);}
.detail-desc{font-size:var(--fs-body-lg);color:var(--text-secondary);line-height:var(--lh-relaxed);margin-bottom:var(--space-5);}
.detail-meta{display:flex;gap:var(--space-3);align-items:center;flex-wrap:wrap;margin-bottom:var(--space-5);padding:var(--space-3) 0;border-top:1px solid var(--border-default);border-bottom:1px solid var(--border-default);}
.detail-content{font-size:var(--fs-body-lg);line-height:var(--lh-relaxed);color:var(--text-primary);}
.detail-content p{margin-bottom:var(--space-4);}
.detail-actions{display:flex;gap:var(--space-3);margin-top:var(--space-5);flex-wrap:wrap;}

/* ════════ 多图画廊（竖向滑动） ════════ */
.gallery-scroll{display:flex;flex-direction:column;gap:var(--space-4);max-width:var(--content-base);margin:0 auto;padding:var(--space-4) var(--space-5);}
.gallery-scroll .gallery-item{position:relative;border-radius:var(--radius-md);overflow:hidden;box-shadow:var(--shadow-3);background:var(--glass-bg);}
.gallery-scroll .gallery-item img,.gallery-scroll .gallery-item video{width:100%;display:block;transition:transform var(--dur-slow) var(--ease-standard);}
.gallery-scroll .gallery-item:hover img,.gallery-scroll .gallery-item:hover video{transform:scale(1.02);}

/* ════════ 公告横幅 ════════ */
.announcement{
  position:relative;max-width:var(--content-wide);margin:var(--space-4) auto 0;padding:var(--space-3) var(--space-5);
  background:var(--glass-bg-strong);border:var(--glass-border);border-radius:var(--radius-md);
  backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);box-shadow:var(--shadow-2);
  font-size:var(--fs-body);color:var(--text-primary);line-height:var(--lh-normal);
}
.announcement .close-btn{position:absolute;top:8px;right:12px;background:none;border:none;font-size:1.2rem;cursor:pointer;color:var(--text-tertiary);padding:4px 8px;border-radius:var(--radius-xs);}
.announcement .close-btn:hover{background:var(--glass-bg);color:var(--text-primary);}

/* ════════ 页脚 ════════ */
.site-footer{margin-top:var(--space-8);padding:var(--space-6) var(--space-5);text-align:center;font-size:var(--fs-caption);color:var(--text-tertiary);border-top:1px solid var(--border-default);max-width:var(--content-wide);margin-left:auto;margin-right:auto;}
.site-footer a{color:var(--text-secondary);margin:0 var(--space-2);}

/* ════════ 模态框 ════════ */
.modal-overlay{position:fixed;inset:0;z-index:200;background:rgba(0,0,0,0.35);backdrop-filter:blur(6px);display:flex;align-items:center;justify-content:center;padding:var(--space-4);}
.modal{background:var(--glass-bg-strong);border:var(--glass-border);border-radius:var(--radius-lg);box-shadow:var(--shadow-5);backdrop-filter:var(--glass-blur-lg);-webkit-backdrop-filter:var(--glass-blur-lg);max-width:680px;width:100%;max-height:90vh;overflow-y:auto;padding:var(--space-6);}
.modal h2{font-size:var(--fs-h2);font-weight:var(--fw-bold);margin-bottom:var(--space-4);}
.modal-close{position:absolute;top:var(--space-3);right:var(--space-3);background:none;border:none;font-size:1.4rem;cursor:pointer;color:var(--text-tertiary);padding:8px;border-radius:var(--radius-xs);}
.modal-close:hover{background:var(--glass-bg);color:var(--text-primary);}

/* ════════ 表单 ════════ */
.form-group{margin-bottom:var(--space-4);}
.form-label{display:block;font-size:var(--fs-caption);font-weight:var(--fw-medium);color:var(--text-secondary);margin-bottom:6px;}
.form-input,.form-textarea,.form-select{width:100%;padding:var(--space-2) var(--space-3);border:1px solid var(--border-default);border-radius:var(--radius-sm);background:var(--glass-bg);color:var(--text-primary);font-size:var(--fs-body);transition:border-color var(--dur-fast) var(--ease-standard),box-shadow var(--dur-fast) var(--ease-standard);}
.form-input:focus,.form-textarea:focus,.form-select:focus{outline:none;border-color:var(--accent);box-shadow:0 0 0 3px var(--accent-ring);}
.form-textarea{min-height:100px;resize:vertical;}

/* ════════ Toast ════════ */
.toast{position:fixed;bottom:var(--space-5);left:50%;transform:translateX(-50%) translateY(20px);padding:var(--space-3) var(--space-5);border-radius:var(--radius-md);font-size:var(--fs-body);font-weight:var(--fw-medium);box-shadow:var(--shadow-4);backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);opacity:0;transition:all var(--dur-base) var(--ease-standard);z-index:300;pointer-events:none;}
.toast.show{opacity:1;transform:translateX(-50%) translateY(0);}
.toast-success{background:rgba(52,199,89,0.92);color:#fff;}
.toast-error{background:rgba(255,59,48,0.92);color:#fff;}
.toast-info{background:rgba(0,113,227,0.92);color:#fff;}

/* ════════ FAB ════════ */
.fab{position:fixed;bottom:var(--space-5);right:var(--space-5);width:56px;height:56px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:1.5rem;background:linear-gradient(135deg,rgba(0,113,227,0.88),rgba(94,92,230,0.84));color:#fff;box-shadow:0 6px 28px rgba(0,113,227,0.35),inset 0 1px 0 rgba(255,255,255,0.25);border:1px solid rgba(255,255,255,0.35);backdrop-filter:blur(14px);cursor:pointer;z-index:150;transition:all var(--dur-fast) var(--ease-standard);}
.fab:hover{transform:scale(1.08);box-shadow:0 10px 36px rgba(0,113,227,0.42);}

/* ════════ 分页 ════════ */
.pagination{display:flex;gap:var(--space-2);justify-content:center;padding:var(--space-5);max-width:var(--content-wide);margin:0 auto;}
.page-btn{padding:var(--space-2) var(--space-4);border-radius:var(--radius-pill);font-size:var(--fs-caption);background:var(--glass-bg);color:var(--text-secondary);border:var(--glass-border);backdrop-filter:blur(10px);cursor:pointer;transition:all var(--dur-fast) var(--ease-standard);}
.page-btn:hover{background:var(--glass-bg-strong);color:var(--text-primary);}
.page-btn.active{background:var(--accent);color:#fff;box-shadow:0 0 14px rgba(0,113,227,0.30);}

/* ════════ 后台表格 ════════ */
.admin-table{width:100%;border-collapse:collapse;font-size:var(--fs-caption);}
.admin-table th{text-align:left;padding:var(--space-3);font-weight:var(--fw-semibold);color:var(--text-secondary);border-bottom:2px solid var(--border-default);background:var(--glass-bg);position:sticky;top:0;z-index:10;}
.admin-table td{padding:var(--space-3);border-bottom:1px solid var(--border-default);vertical-align:middle;}
.admin-table tr:hover td{background:rgba(255,255,255,0.30);}
.status-dot{display:inline-block;width:8px;height:8px;border-radius:50%;margin-right:4px;}
.status-published{background:var(--success);box-shadow:0 0 8px rgba(52,199,89,0.40);}
.status-draft{background:var(--warning);box-shadow:0 0 8px rgba(255,149,0,0.40);}
.status-hidden{background:var(--text-tertiary);}

/* ════════ 统计卡片 ════════ */
.stat-card{background:var(--glass-bg-strong);border:var(--glass-border);border-radius:var(--radius-md);padding:var(--space-4);box-shadow:var(--shadow-2);backdrop-filter:blur(20px);position:relative;overflow:hidden;}
.stat-card::before{content:'';position:absolute;left:0;top:0;bottom:0;width:3px;border-radius:var(--radius-md) 0 0 var(--radius-md);}
.stat-card.blue::before{background:var(--grad-blue);}
.stat-card.green::before{background:var(--grad-green);}
.stat-card.orange::before{background:var(--grad-orange);}
.stat-card.purple::before{background:var(--grad-purple);}
.stat-num{font-size:1.8rem;font-weight:var(--fw-black);letter-spacing:var(--tracking-tight);}
.stat-label{font-size:var(--fs-micro);color:var(--text-secondary);margin-top:4px;}

/* ════════ 暗色模式 ════════ */
body.dark-mode{--bg-base:#0D0D0F;--bg-elevated:rgba(28,28,30,0.85);--bg-subtle:rgba(40,40,44,0.60);--text-primary:#F5F5F7;--text-secondary:#A1A1A6;--text-tertiary:#6E6E73;--border-default:rgba(255,255,255,0.08);--glass-bg:rgba(28,28,30,0.55);--glass-bg-strong:rgba(40,40,44,0.72);--glass-bg-weak:rgba(28,28,30,0.35);}
body.dark-mode::before{filter:brightness(0.6) saturate(1.2);}
body.dark-mode .nav{background:rgba(20,20,22,0.55);}
body.dark-mode .card{background:rgba(40,40,44,0.65);}
body.dark-mode .modal{background:rgba(35,35,38,0.85);}
body.dark-mode .form-input,.body.dark-mode .form-textarea,.body.dark-mode .form-select{background:rgba(50,50,54,0.60);color:#F5F5F7;border-color:rgba(255,255,255,0.10);}

/* ════════ 相关推荐 ════════ */
.related-section{max-width:var(--content-wide);margin:var(--space-7) auto;padding:0 var(--space-5);}
.related-title{font-size:var(--fs-h2);font-weight:var(--fw-bold);margin-bottom:var(--space-4);}
.related-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:var(--space-4);}

/* ════════ 复制链接按钮 ════════ */
.copy-link-btn{display:inline-flex;align-items:center;gap:6px;padding:var(--space-2) var(--space-4);border-radius:var(--radius-pill);font-size:var(--fs-caption);background:var(--glass-bg);color:var(--text-secondary);border:var(--glass-border);backdrop-filter:blur(10px);cursor:pointer;transition:all var(--dur-fast) var(--ease-standard);}
.copy-link-btn:hover{background:var(--accent-soft);color:var(--accent);transform:translateY(-1px);}

/* ════════ 附件下载 ════════ */
.attach-btn{display:inline-flex;align-items:center;gap:6px;padding:var(--space-2) var(--space-4);border-radius:var(--radius-sm);font-size:var(--fs-caption);background:var(--accent-soft);color:var(--accent);border:1px solid rgba(0,113,227,0.20);transition:all var(--dur-fast) var(--ease-standard);}
.attach-btn:hover{background:rgba(0,113,227,0.16);transform:translateY(-1px);}

/* ════════ 反模式清单 ════════ */
/* ✗ 纯黑/纯白文字 ✗ 过强阴影 ✗ 无 blur 的"假玻璃" ✗ 超 600ms 动效 ✗ 阴影透明度 > 0.12 */
`;

async function handleRequest(request, env){
  const url=new URL(request.url);
  const path=url.pathname;

  // 静态文件服务（KV 中的图片/附件）
  if(path.startsWith('/file/')){return handleFile(request,env,path.slice(6));}
  if(path.startsWith('/favicon')){return handleFavicon(request,env);}

  // RSS
  if(path==='/rss.xml'){return handleRSS(request,env);}
  // Sitemap
  if(path==='/sitemap.xml'){return handleSitemap(request,env);}

  // 后台
  if(path.startsWith('/admin')){return handleAdmin(request,env,url);}

  // API
  if(path.startsWith('/api')){return handleAPI(request,env,url);}

  // 详情页
  if(path.startsWith('/item/')){return handleItemDetail(request,env,path.slice(6));}

  // 关于页
  if(path==='/about'){return handleAboutPage(request,env);}

  // 前台首页
  return handleFrontend(request,env,url);
}

// ── 鼠标跟踪（Aurora 交互） ──
const MOUSE_TRACKER=`<script>
document.addEventListener('mousemove',e=>{
  document.documentElement.style.setProperty('--mx',(e.clientX/window.innerWidth*100)+'%');
  document.documentElement.style.setProperty('--my',(e.clientY/window.innerHeight*100)+'%');
});
// 暗色模式初始化
const dm=localStorage.getItem('darkMode');
if(dm==='on'||(dm==='auto'&&window.matchMedia('(prefers-color-scheme: dark)').matches)){document.body.classList.add('dark-mode');}
</script>`;

async function getSiteSettings(env){
  const rows=await env.DB.prepare('SELECT key,value FROM site_settings').all();
  const s={brand_name:'Gallery',theme_accent:'#0071E3',theme_dark_mode:'off',hero_bg_type:'gradient',hero_gradient:'',hero_image_key:'',hero_video_url:'',footer_html:'',announcement_html:'',nav_links:'[]',about_html:'',copy_link_text:'复制链接',lazy_placeholder:'',rss_enabled:'1',sitemap_enabled:'1',site_description:'',site_keywords:''};
  for(const r of (rows.results||[])){s[r.key]=r.value;}
  return s;
}

async function handleFrontend(request,env,url){
  const settings=await getSiteSettings(env);
  const page=parseInt(url.searchParams.get('page')||'1');
  const cat=url.searchParams.get('cat')||'';
  const search=url.searchParams.get('q')||'';
  const pageSize=parseInt(env.PAGE_SIZE||'24');
  const offset=(page-1)*pageSize;

  let where='is_public=1 AND is_hidden=0';
  const params=[];
  const nowISO=new Date().toISOString();
  where+=" AND (publish_at IS NULL OR publish_at<='"+nowISO+"') AND (expire_at IS NULL OR expire_at>'"+nowISO+"')";
  if(cat){where+=' AND category=?';params.push(cat);}
  if(search){where+=' AND (title LIKE ? OR description LIKE ?)';params.push('%'+search+'%','%'+search+'%');}

  const orderBy='sort_weight DESC, COALESCE(publish_at,created_at) DESC';

  const total=await env.DB.prepare('SELECT COUNT(*) as c FROM media_items WHERE '+where).bind(...params).first();
  const items=await env.DB.prepare('SELECT * FROM media_items WHERE '+where+' ORDER BY '+orderBy+' LIMIT ? OFFSET ?').bind(...params,pageSize,offset).all();

  // 分类列表
  const catsRow=await env.DB.prepare("SELECT value FROM site_settings WHERE key='categories'").first();
  const categories=safeJSON(catsRow?catsRow.value:'[]',[]);

  // 公告
  const annHTML=settings.announcement_html?`<div class="announcement" id="announcement">${settings.announcement_html}<button class="close-btn" onclick="document.getElementById('announcement').style.display='none'">×</button></div>`:'';

  // Hero
  let heroHTML=`<div class="hero">`;
  if(settings.hero_bg_type==='image'&&settings.hero_image_key){
    heroHTML=`<div class="hero"><div class="hero-bg"><img src="/file/${settings.hero_image_key}" alt=""></div>`;
  } else if(settings.hero_bg_type==='video'&&settings.hero_video_url){
    heroHTML=`<div class="hero"><div class="hero-bg"><video src="${escAttr(settings.hero_video_url)}" autoplay muted loop playsinline></video></div>`;
  }
  heroHTML+=`<h1 class="hero-title">${esc(settings.brand_name||'精选作品')}</h1>`;
  if(settings.site_description)heroHTML+=`<p class="hero-subtitle">${esc(settings.site_description)}</p>`;
  heroHTML+=`<div class="hero-actions"><a href="#gallery" class="btn btn-primary">浏览作品</a>${settings.about_html?('<a href="/about" class="btn btn-ghost">关于</a>'):''}</div></div>`;

  // 导航链接
  const navLinks=safeJSON(settings.nav_links,'[]');
  let extraNav='';
  for(const nl of navLinks){extraNav+=`<a class="nav-link" href="${escAttr(nl.url)}" ${nl.external?'target="_blank" rel="noopener"':''}>${esc(nl.label)}</a>`;}

  // 筛选栏
  let filterHTML=`<div class="filter-bar">`;
  filterHTML+=`<a class="chip ${!cat?'chip-active':''}" href="?">全部</a>`;
  for(const c of categories){filterHTML+=`<a class="chip ${cat===c.name?'chip-active':''}" href="?cat=${encURI(c.name)}" style="${cat===c.name?'':''}">${esc(c.name)}</a>`;}
  filterHTML+=`</div>`;

  // 卡片
  let cardsHTML='';
  const list=(items.results||[]);
  for(const item of list){
    const coverImg=item.cover_key?`/file/${item.cover_key}`:'';
    const gradientClass=item.category?item.category:'';
    const cats=safeJSON(item.category,'[]');
    const catName=Array.isArray(cats)?(cats[0]||''):(cats||'');
    const catCfg=categories.find(c=>c.name===catName);
    const catColor=catCfg?catCfg.color:'#0071E3';
    const slug=item.custom_slug||item.slug||item.id;
    const lazyAttr=settings.lazy_placeholder?`loading="lazy"`:'';

    cardsHTML+=`<a class="card" href="/item/${encURI(slug)}" style="text-decoration:none;">`;
    cardsHTML+=`<div class="card-media" style="${coverImg?'':'background:'+escAttr((catCfg&&catCfg.gradient)||'var(--grad-blue)')}">`;
    if(coverImg)cardsHTML+=`<img src="${coverImg}" alt="${esc(item.title)}" ${lazyAttr} class="lazy-img" onload="this.classList.add('loaded')">`;
    else if(item.type==='video')cardsHTML+=`▶`;
    else if(item.type==='text')cardsHTML+=`📝`;
    else cardsHTML+=`🖼`;
    // 类型徽章
    const badgeCls=item.type==='image'?'badge-image':item.type==='video'?'badge-video':'badge-text';
    const badgeTxt=item.type==='image'?'图片':item.type==='video'?'视频':'文字';
    cardsHTML+=`<span class="badge ${badgeCls}" style="position:absolute;top:12px;left:12px;">${badgeTxt}</span>`;
    cardsHTML+=`</div><div class="card-body">`;
    cardsHTML+=`<div class="card-title">${esc(item.title)}</div>`;
    if(item.description)cardsHTML+=`<div class="card-desc">${esc(item.description)}</div>`;
    cardsHTML+=`<div class="card-meta"><span class="chip chip-accent" style="border-color:${escAttr(catColor)}33;color:${escAttr(catColor)}">${esc(catName)}</span>`;
    cardsHTML+=`<span style="font-size:var(--fs-micro);color:var(--text-tertiary);">${formatDate(item.publish_at||item.created_at)}</span></div></div></a>`;
  }

  // 分页
  const totalPages=Math.ceil((total.c||0)/pageSize);
  let pageHTML=`<div class="pagination">`;
  if(page>1)pageHTML+=`<a class="page-btn" href="?page=${page-1}${cat?'&cat='+encURI(cat):''}">← 上一页</a>`;
  for(let i=1;i<=Math.min(totalPages,7);i++){pageHTML+=`<a class="page-btn ${i===page?'active':''}" href="?page=${i}${cat?'&cat='+encURI(cat):''}">${i}</a>`;}
  if(page<totalPages)pageHTML+=`<a class="page-btn" href="?page=${page+1}${cat?'&cat='+encURI(cat):''}">下一页 →</a>`;
  pageHTML+=`</div>`;

  // 页脚
  const footerHTML=settings.footer_html?`<div class="site-footer">${settings.footer_html}</div>`:`<div class="site-footer">© ${new Date().getFullYear()} ${esc(settings.brand_name)}</div>`;

  const customCSS=settings.theme_accent&&settings.theme_accent!=='#0071E3'?`<style>:root{--accent:${escAttr(settings.theme_accent)};}</style>`:'';

  const html=`<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(settings.brand_name)}</title>
  ${settings.site_description?('<meta name="description" content="'+escAttr(settings.site_description)+'">'):''}
  ${settings.site_keywords?('<meta name="keywords" content="'+escAttr(settings.site_keywords)+'">'):''}
<link rel="alternate" type="application/rss+xml" title="${esc(settings.brand_name)}" href="/rss.xml">
${customCSS}
<style>${BASE_CSS}</style>
</head>
<body>
<nav class="nav"><div class="nav-inner">
  <a class="brand" href="/">${esc(settings.brand_name)}</a>
  <div class="nav-links"><a class="nav-link" href="/">首页</a>${extraNav}</div>
  <div class="nav-actions">
    <button class="btn btn-ghost btn-sm" onclick="toggleDarkMode()" title="切换暗色模式">🌙</button>
    <a class="btn btn-primary btn-sm" href="/admin">后台</a>
  </div>
</div></nav>
${annHTML}
${heroHTML}
${filterHTML}
<div class="gallery-grid" id="gallery">${cardsHTML||'<p style="grid-column:1/-1;text-align:center;color:var(--text-tertiary);padding:var(--space-7);">暂无内容</p>'}</div>
${pageHTML}
${footerHTML}
<a class="fab" href="/admin" title="后台管理">⚙</a>
${MOUSE_TRACKER}
<script>
function toggleDarkMode(){document.body.classList.toggle('dark-mode');localStorage.setItem('darkMode',document.body.classList.contains('dark-mode')?'on':'off');}
// IntersectionObserver 懒加载
const lazyImgs=document.querySelectorAll('.lazy-img');
const io=new IntersectionObserver(entries=>{entries.forEach(e=>{if(e.isIntersecting){e.target.src=e.target.src;e.target.classList.add('loaded');io.unobserve(e.target);}});},{rootMargin:'100px'});
lazyImgs.forEach(img=>io.observe(img));
</script>
</body></html>`;

  return new Response(html,{'Content-Type':'text/html;charset=utf-8'});
}

async function handleItemDetail(request,env,slug){
  const settings=await getSiteSettings(env);
  // 查找：先 custom_slug，再 slug，再 id
  let item=await env.DB.prepare('SELECT * FROM media_items WHERE custom_slug=? AND is_public=1').bind(slug).first();
  if(!item)item=await env.DB.prepare('SELECT * FROM media_items WHERE slug=? AND is_public=1').bind(slug).first();
  if(!item)item=await env.DB.prepare('SELECT * FROM media_items WHERE id=? AND is_public=1').bind(parseInt(slug)||0).first();
  if(!item||!isVisible(item))return new Response('404 Not Found',{status:404});

  // 浏览计数
  await env.DB.prepare('UPDATE media_items SET views=COALESCE(views,0)+1 WHERE id=?').bind(item.id).run();

  const catsRow=await env.DB.prepare("SELECT value FROM site_settings WHERE key='categories'").first();
  const categories=safeJSON(catsRow?catsRow.value:'[]',[]);
  const cats=safeJSON(item.category,'[]');
  const catName=Array.isArray(cats)?(cats[0]||''):(cats||'');
  const catCfg=categories.find(c=>c.name===catName);
  const catColor=catCfg?catCfg.color:'#0071E3';

  // 多图
  const galleryKeys=safeJSON(item.gallery_keys||'[]',[]);
  let galleryHTML='';
  if(galleryKeys.length>0){
    galleryHTML=`<div class="gallery-scroll">`;
    for(const k of galleryKeys){galleryHTML+=`<div class="gallery-item"><img src="/file/${k}" alt="" loading="lazy" class="lazy-img" onload="this.classList.add('loaded')"></div>`;}
    galleryHTML+=`</div>`;
  }

  // 附件
  let attachHTML='';
  if(item.attachment_key){attachHTML=`<a class="attach-btn" href="/file/${item.attachment_key}" download="${escAttr(item.attachment_name||'download')}">📎 下载附件: ${esc(item.attachment_name||'文件')}</a>`;}

  // 相关推荐
  const related=await env.DB.prepare('SELECT * FROM media_items WHERE is_public=1 AND category=? AND id!=? ORDER BY RANDOM() LIMIT 3').bind(catName,item.id).all();
  let relatedHTML='';
  if((related.results||[]).length>0){
    relatedHTML=`<div class="related-section"><h2 class="related-title">相关推荐</h2><div class="related-grid">`;
    for(const r of related.results){
      const rSlug=r.custom_slug||r.slug||r.id;
      const rCover=r.cover_key?`/file/${r.cover_key}`:'';
      relatedHTML+=`<a class="card" href="/item/${encURI(rSlug)}" style="text-decoration:none;">`;
      relatedHTML+=`<div class="card-media" style="${rCover?'':'background:'+escAttr((catCfg&&catCfg.gradient)||'var(--grad-blue)')}">`;
      if(rCover)relatedHTML+=`<img src="${rCover}" alt="" loading="lazy" class="lazy-img" onload="this.classList.add('loaded')">`;
      relatedHTML+=`</div><div class="card-body"><div class="card-title">${esc(r.title)}</div></div></a>`;
    }
    relatedHTML+=`</div></div>`;
  }

  // SEO
  const seoDesc=item.seo_description||item.description||'';
  const seoKw=item.seo_keywords||'';
  const ogImg=item.cover_key?`/file/${item.cover_key}`:'';

  // 自定义 CSS 类
  const customClass=item.custom_css_class||'';

  const copyText=settings.copy_link_text||'复制链接';

  const html=`<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(item.title)} - ${esc(settings.brand_name)}</title>
  ${seoDesc?('<meta name="description" content="'+escAttr(seoDesc)+'">'):''}
  ${seoKw?('<meta name="keywords" content="'+escAttr(seoKw)+'">'):''}
  ${ogImg?('<meta property="og:image" content="'+escAttr(request.url.split('/').slice(0,3).join('/'))+ogImg+'">'):''}
<meta property="og:title" content="${escAttr(item.title)}">
<meta property="og:description" content="${escAttr(seoDesc)}">
<style>${BASE_CSS}</style>
</head>
<body>
<nav class="nav"><div class="nav-inner">
  <a class="brand" href="/">${esc(settings.brand_name)}</a>
  <div class="nav-links"><a class="nav-link" href="/">← 返回首页</a></div>
  <div class="nav-actions">
    <button class="btn btn-ghost btn-sm" onclick="toggleDarkMode()">🌙</button>
  </div>
</div></nav>

<div class="detail-hero ${escAttr(customClass)}">
  ${item.type==='video'&&item.content.startsWith('http')?('<video src="'+escAttr(item.content)+'" controls poster="'+(item.cover_key?'/file/'+item.cover_key:'')+'" style="width:100%;border-radius:var(--radius-lg);box-shadow:var(--shadow-4);>">'):''}
  ${item.type==='image'&&item.content?('<img src="/file/'+item.content+'" alt="'+esc(item.title)+'" style="width:100%;border-radius:var(--radius-lg);box-shadow:var(--shadow-4);" loading="lazy">'):''}
  ${item.type==='text'&&item.cover_key?('<img src="/file/'+item.cover_key+'" alt="" style="width:100%;border-radius:var(--radius-lg);box-shadow:var(--shadow-4);" loading="lazy">'):''}
</div>

<div class="detail-body">
  <h1 class="detail-title">${esc(item.title)}</h1>
  <div class="detail-meta">
    <span class="badge ${item.type==='image'?'badge-image':item.type==='video'?'badge-video':'badge-text'}">${item.type==='image'?'图片':item.type==='video'?'视频':'文字'}</span>
    <span class="chip chip-accent" style="border-color:${escAttr(catColor)}33;color:${escAttr(catColor)}">${esc(catName)}</span>
    <span style="font-size:var(--fs-micro);color:var(--text-tertiary);">👁 ${item.views||0} 次浏览</span>
    <span style="font-size:var(--fs-micro);color:var(--text-tertiary);">${formatDate(item.publish_at||item.created_at)}</span>
  </div>
  ${item.description?('<p class="detail-desc">'+esc(item.description)+'</p>'):''}
  ${item.type==='text'&&item.content?('<div class="detail-content">'+item.content+'</div>'):''}
  <div class="detail-actions">
    <button class="copy-link-btn" onclick="copyLink('${escAttr(item.title)}')">🔗 ${esc(copyText)}</button>
    ${attachHTML}
  </div>
</div>

${galleryHTML}
${relatedHTML}

${settings.footer_html?('<div class="site-footer">'+settings.footer_html+'</div>'):('<div class="site-footer">© '+new Date().getFullYear()+' '+esc(settings.brand_name)+'</div>')}
${MOUSE_TRACKER}
<script>
function copyLink(title){navigator.clipboard.writeText(location.href).then(()=>{showToast('✅ 链接已复制','success');},()=>{showToast('❌ 复制失败','error');});}
function showToast(msg,type){const t=document.createElement('div');t.className='toast toast-'+type+' show';t.textContent=msg;document.body.appendChild(t);setTimeout(()=>{t.classList.remove('show');setTimeout(()=>t.remove(),300);},2000);}
function toggleDarkMode(){document.body.classList.toggle('dark-mode');localStorage.setItem('darkMode',document.body.classList.contains('dark-mode')?'on':'off');}
</script>
</body></html>`;

  return new Response(html,{'Content-Type':'text/html;charset=utf-8'});
}

async function handleAboutPage(request,env){
  const settings=await getSiteSettings(env);
  const html=`<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>关于 - ${esc(settings.brand_name)}</title>
<style>${BASE_CSS}</style>
</head>
<body>
<nav class="nav"><div class="nav-inner">
  <a class="brand" href="/">${esc(settings.brand_name)}</a>
  <div class="nav-links"><a class="nav-link" href="/">← 返回首页</a></div>
</div></nav>
<div class="detail-body" style="max-width:var(--content-narrow);margin:var(--space-7) auto;">
  <h1 class="detail-title">关于</h1>
  <div class="detail-content">${settings.about_html||'<p>暂无内容</p>'}</div>
</div>
${settings.footer_html?('<div class="site-footer">'+settings.footer_html+'</div>'):''}
${MOUSE_TRACKER}
</body></html>`;
  return new Response(html,{'Content-Type':'text/html;charset=utf-8'});
}

async function handleRSS(request,env){
  const settings=await getSiteSettings(env);
  if(settings.rss_enabled!=='1')return new Response('RSS disabled',{status:404});
  const items=await env.DB.prepare('SELECT * FROM media_items WHERE is_public=1 ORDER BY COALESCE(publish_at,created_at) DESC LIMIT 30').all();
  const base=request.url.split('/').slice(0,3).join('/');
  let xml='<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel>';
  xml+=`<title>${esc(settings.brand_name)}</title><link>${base}</link>`;
  xml+=`<description>${esc(settings.site_description||'')}</description>`;
  for(const item of (items.results||[])){
    const slug=item.custom_slug||item.slug||item.id;
    xml+=`<item><title>${esc(item.title)}</title>`;
    xml+=`<link>${base}/item/${encURI(slug)}</link>`;
    xml+=`<guid>${base}/item/${encURI(slug)}</guid>`;
    xml+=`<pubDate>${new Date(item.publish_at||item.created_at).toUTCString()}</pubDate>`;
    if(item.description)xml+=`<description>${esc(item.description)}</description>`;
    xml+=`</item>`;
  }
  xml+='</channel></rss>';
  return new Response(xml,{'Content-Type':'application/rss+xml;charset=utf-8'});
}

async function handleSitemap(request,env){
  const settings=await getSiteSettings(env);
  if(settings.sitemap_enabled!=='1')return new Response('Sitemap disabled',{status:404});
  const items=await env.DB.prepare('SELECT custom_slug,slug,id FROM media_items WHERE is_public=1').all();
  const base=request.url.split('/').slice(0,3).join('/');
  let xml='<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">';
  xml+=`<url><loc>${base}/</loc></url>`;
  if(settings.about_html)xml+=`<url><loc>${base}/about</loc></url>`;
  for(const item of (items.results||[])){
    const slug=item.custom_slug||item.slug||item.id;
    xml+=`<url><loc>${base}/item/${encURI(slug)}</loc></url>`;
  }
  xml+='</urlset>';
  return new Response(xml,{'Content-Type':'application/xml;charset=utf-8'});
}

async function handleFile(request,env,key){
  const obj=await env.MEDIA_KV.get(key,{type:'arrayBuffer'});
  if(!obj)return new Response('404',{status:404});
  const meta=obj.metadata||{};
  const ct=meta.contentType||'application/octet-stream';
  return new Response(obj.value,{headers:{'Content-Type':ct,'Cache-Control':'public,max-age=31536000,immutable'}});
}

async function handleFavicon(request,env){
  const settings=await getSiteSettings(env);
  if(settings.favicon_key){return handleFile(request,env,settings.favicon_key);}
  // 返回内联 SVG favicon
  const svg='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="45" fill="%230071E3"/><text x="50" y="62" font-size="40" text-anchor="middle" fill="white" font-family="sans-serif">G</text></svg>';
  return new Response(svg,{headers:{'Content-Type':'image/svg+xml'}});
}

async function handleAPI(request,env,url){
  const path=url.pathname;
  const method=request.method;

  // 公开 API：列表/详情
  if(path==='/api/items'&&method==='GET'){
    const items=await env.DB.prepare('SELECT id,title,description,type,category,cover_key,slug,custom_slug,views,publish_at,created_at FROM media_items WHERE is_public=1 ORDER BY COALESCE(publish_at,created_at) DESC LIMIT 50').all();
    return jsonResp(items.results||[]);
  }

  // 需要鉴权
  const auth=await checkAuth(request,env);
  if(!auth)return jsonResp({error:'Unauthorized'},401);

  // 上传文件到 KV
  if(path==='/api/upload'&&method==='POST'){
    const form=await request.formData();
    const file=form.get('file');
    if(!file)return jsonResp({error:'No file'},400);
    if(file.size>parseInt(env.MAX_FILE_SIZE||'25165824'))return jsonResp({error:'File too large'},400);
    const buf=await file.arrayBuffer();
    const key=randStr(20)+'_'+Date.now();
    const contentType=file.type||'application/octet-stream';
    await env.MEDIA_KV.put(key,buf,{metadata:{contentType}});
    return jsonResp({key,contentType,size:file.size});
  }

  // 删除 KV 文件
  if(path==='/api/file'&&method==='DELETE'){
    const {key}=await request.json();
    if(key)await env.MEDIA_KV.delete(key);
    return jsonResp({ok:true});
  }

  // 创建内容
  if(path==='/api/items'&&method==='POST'){
    const d=await request.json();
    const slug=await generateUniqueSlug(env,d.title||'item');
    const customSlug=d.custom_slug?await generateUniqueCustomSlug(env,d.custom_slug):null;
    const r=await env.DB.prepare(`INSERT INTO media_items (title,description,type,content,cover_key,category,tags,slug,custom_slug,seo_description,seo_keywords,publish_at,expire_at,sort_weight,is_hidden,gallery_keys,attachment_key,attachment_name,custom_css_class,is_public) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,0)`).bind(
      d.title||'',d.description||'',d.type||'image',d.content||'',d.cover_key||null,d.category||'',d.tags||'',slug,customSlug||null,
      d.seo_description||'',d.seo_keywords||'',d.publish_at||null,d.expire_at||null,parseInt(d.sort_weight||'0'),parseBool(d.is_hidden)?1:0,
      JSON.stringify(d.gallery_keys||[]),d.attachment_key||null,d.attachment_name||'',d.custom_css_class||''
    ).run();
    return jsonResp({id:r.meta.last_row_id,slug,custom_slug:customSlug});
  }

  // 更新内容
  if(path.startsWith('/api/items/')&&method==='PUT'){
    const id=path.split('/')[3];
    const d=await request.json();
    const allowed=['title','description','type','content','cover_key','category','tags','seo_description','seo_keywords','publish_at','expire_at','sort_weight','is_hidden','gallery_keys','attachment_key','attachment_name','custom_css_class','is_public'];
    const sets=[];const params=[];
    for(const k of allowed){if(d[k]!==undefined){sets.push(k+'=?');params.push(k==='gallery_keys'?JSON.stringify(d[k]||[]):d[k]);}}
    if(d.custom_slug!==undefined){const cs=await generateUniqueCustomSlug(env,d.custom_slug,id);sets.push('custom_slug=?');params.push(cs);}
    if(sets.length===0)return jsonResp({ok:true});
    params.push(parseInt(id));
    await env.DB.prepare('UPDATE media_items SET '+sets.join(',')+' WHERE id=?').bind(...params).run();
    return jsonResp({ok:true});
  }

  // 删除内容
  if(path.startsWith('/api/items/')&&method==='DELETE'){
    const id=path.split('/')[3];
    const item=await env.DB.prepare('SELECT * FROM media_items WHERE id=?').bind(parseInt(id)).first();
    if(item){
      if(item.content&&item.type==='image')try{await env.MEDIA_KV.delete(item.content);}catch(e){}
      if(item.cover_key)try{await env.MEDIA_KV.delete(item.cover_key);}catch(e){}
      if(item.attachment_key)try{await env.MEDIA_KV.delete(item.attachment_key);}catch(e){}
      const gk=safeJSON(item.gallery_keys||'[]',[]);
      for(const k of gk)try{await env.MEDIA_KV.delete(k);}catch(e){}
    }
    await env.DB.prepare('DELETE FROM media_items WHERE id=?').bind(parseInt(id)).run();
    return jsonResp({ok:true});
  }

  // 批量删除
  if(path==='/api/items/batch'&&method==='DELETE'){
    const {ids}=await request.json();
    for(const id of ids){const item=await env.DB.prepare('SELECT * FROM media_items WHERE id=?').bind(parseInt(id)).first();
      if(item){
        if(item.content&&item.type==='image')try{await env.MEDIA_KV.delete(item.content);}catch(e){}
        if(item.cover_key)try{await env.MEDIA_KV.delete(item.cover_key);}catch(e){}
        if(item.attachment_key)try{await env.MEDIA_KV.delete(item.attachment_key);}catch(e){}
        const gk=safeJSON(item.gallery_keys||'[]',[]);for(const k of gk)try{await env.MEDIA_KV.delete(k);}catch(e){}
      }
      await env.DB.prepare('DELETE FROM media_items WHERE id=?').bind(parseInt(id)).run();
    }
    return jsonResp({ok:true,deleted:ids.length});
  }

  // 站点设置
  if(path==='/api/settings'&&method==='GET'){const s=await getSiteSettings(env);return jsonResp(s);}
  if(path==='/api/settings'&&method==='PUT'){
    const d=await request.json();
    for(const [k,v] of Object.entries(d)){await env.DB.prepare('INSERT OR REPLACE INTO site_settings (key,value) VALUES (?,?)').bind(k,String(v)).run();}
    return jsonResp({ok:true});
  }

  // 登录/登出
  if(path==='/api/login'&&method==='POST'){
    const {password}=await request.json();
    if(password===env.ADMIN_PASSWORD){const sid=randStr(32);await env.CACHE.put('session:'+sid,'admin',{expirationTtl:86400});return jsonResp({token:sid,redirect:'/admin'});}
    return jsonResp({error:'密码错误'},401);
  }
  if(path==='/api/logout'&&method==='POST'){
    const cookie=request.headers.get('Cookie')||'';const m=cookie.match(/admin_session=([^;]+)/);
    if(m)await env.CACHE.delete('session:'+m[1]);
    return jsonResp({ok:true});
  }

  return jsonResp({error:'Not Found'},404);
}

function jsonResp(data,status){return new Response(JSON.stringify(data),{status:status||200,headers:{'Content-Type':'application/json'}});}

async function checkAuth(request,env){
  const cookie=request.headers.get('Cookie')||'';
  const m=cookie.match(/admin_session=([^;]+)/);
  if(!m)return false;
  const s=await env.CACHE.get('session:'+m[1]);
  return !!s;
}

async function generateUniqueSlug(env,title){
  let base=pinyinSlug(title)||'item';
  let slug=base;let i=2;
  while(await env.DB.prepare('SELECT id FROM media_items WHERE slug=?').bind(slug).first()){slug=base+'-'+i;i++;}
  return slug;
}
async function generateUniqueCustomSlug(env,slug,excludeId){
  let base=pinyinSlug(slug)||'item';
  let s=base;let i=2;
  while(true){const r=await env.DB.prepare('SELECT id FROM media_items WHERE custom_slug=? AND id!=?').bind(s,parseInt(excludeId)||0).first();if(!r)break;s=base+'-'+i;i++;}
  return s;
}

async function handleAdmin(request,env,url){
  const path=url.pathname;
  // 登录页
  if(path==='/admin/login')return renderLogin(env);
  // 鉴权
  const auth=await checkAuth(request,env);
  if(!auth)return renderLogin(env);
  // 登出
  if(path==='/admin/logout'){const cookie=request.headers.get('Cookie')||'';const m=cookie.match(/admin_session=([^;]+)/);if(m)await env.CACHE.delete('session:'+m[1]);return Response.redirect(url.origin+'/admin/login',302);}
  // 主后台
  return renderAdmin(env,url);
}

function renderLogin(env){
  const html=`<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>登录 - 后台管理</title>
<style>${BASE_CSS}</style>
</head>
<body>
<div style="min-height:100vh;display:flex;align-items:center;justify-content:center;padding:var(--space-5);">
<div class="modal" style="position:relative;max-width:420px;">
<h2 style="text-align:center;margin-bottom:var(--space-5);">🔒 后台登录</h2>
<form id="loginForm" onsubmit="return doLogin(event)">
<div class="form-group"><label class="form-label">管理员密码</label><input class="form-input" type="password" id="pwd" placeholder="输入密码" required></div>
<button class="btn btn-primary" style="width:100%;padding:var(--space-3);" type="submit">登 录</button>
</form>
<div id="msg" style="margin-top:var(--space-3);text-align:center;font-size:var(--fs-caption);color:var(--danger);"></div>
</div>
</div>
<script>
async function doLogin(e){e.preventDefault();const pwd=document.getElementById('pwd').value;const r=await fetch('/api/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({password:pwd})});const j=await r.json();if(r.ok){document.cookie='admin_session='+j.token+';path=/;max-age=86400;SameSite=Strict';location.href=j.redirect;}else{document.getElementById('msg').textContent=j.error||'登录失败';}}
</script>
</body></html>`;
  return new Response(html,{'Content-Type':'text/html;charset=utf-8'});
}

async function renderAdmin(env,url){
  const settings=await getSiteSettings(env);
  const tab=url.searchParams.get('tab')||'list';
  const items=await env.DB.prepare('SELECT * FROM media_items ORDER BY sort_weight DESC, COALESCE(publish_at,created_at) DESC').all();
  const catsRow=await env.DB.prepare("SELECT value FROM site_settings WHERE key='categories'").first();
  const categories=safeJSON(catsRow?catsRow.value:'[]',[]);
  const stats={
    total:(items.results||[]).length,
    published:((items.results||[]).filter(i=>i.is_public)).length,
    draft:((items.results||[]).filter(i=>!i.is_public)).length,
    hidden:((items.results||[]).filter(i=>i.is_hidden)).length,
  };

  // 统计卡片
  let statsHTML=`<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:var(--space-4);padding:var(--space-4) var(--space-5);max-width:var(--content-wide);margin:0 auto;">`;
  statsHTML+=`<div class="stat-card blue"><div class="stat-num">${stats.total}</div><div class="stat-label">全部内容</div></div>`;
  statsHTML+=`<div class="stat-card green"><div class="stat-num">${stats.published}</div><div class="stat-label">已发布</div></div>`;
  statsHTML+=`<div class="stat-card orange"><div class="stat-num">${stats.draft}</div><div class="stat-label">草稿</div></div>`;
  statsHTML+=`<div class="stat-card purple"><div class="stat-num">${stats.hidden}</div><div class="stat-label">已隐藏</div></div>`;
  statsHTML+=`</div>`;

  // Tab 导航
  let tabHTML=`<div style="display:flex;gap:var(--space-2);padding:var(--space-3) var(--space-5);max-width:var(--content-wide);margin:0 auto;flex-wrap:wrap;">`;
  const tabs=[['list','所有内容'],['upload','+ 上传/新建'],['categories','分类管理'],['settings','⚙ 站点设置']];
  for(const [k,v] of tabs){tabHTML+=`<a class="chip ${tab===k?'chip-active':''}" href="/admin?tab=${k}">${v}</a>`;}
  tabHTML+=`<a class="chip" href="/admin/logout" style="margin-left:auto;color:var(--danger);">退出</a></div>`;

  // 数据表格
  let tableHTML='';
  if(tab==='list'){
    tableHTML=`<div style="max-width:var(--content-wide);margin:0 auto;padding:var(--space-4) var(--space-5);overflow-x:auto;">
    <div style="display:flex;gap:var(--space-2);margin-bottom:var(--space-4);flex-wrap:wrap;">
      <button class="btn btn-danger btn-sm" onclick="batchDelete()">🗑 批量删除</button>
      <input class="form-input" style="max-width:240px;" placeholder="搜索..." oninput="filterTable(this.value)">
    </div>
    <table class="admin-table" id="dataTable">
    <thead><tr><th><input type="checkbox" id="chkAll" onchange="toggleAll(this)"></th><th>封面</th><th>标题/URL</th><th>类型</th><th>分类</th><th>状态</th><th>浏览</th><th>日期</th><th>操作</th></tr></thead><tbody>`;
    for(const item of (items.results||[])){
      const slug=item.custom_slug||item.slug||item.id;
      const cover=item.cover_key?`/file/${item.cover_key}`:'';
      const status=!item.is_public?'<span class="status-dot status-draft"></span>草稿':item.is_hidden?'<span class="status-dot status-hidden"></span>隐藏':'<span class="status-dot status-published"></span>发布';
      const cats=safeJSON(item.category,'[]');
      const catName=Array.isArray(cats)?(cats[0]||'-'):'-';
      tableHTML+=`<tr data-id="${item.id}">
        <td><input type="checkbox" class="rowChk" value="${item.id}"></td>
        <td>${cover?('<img src="'+cover+'" style="width:48px;height:36px;object-fit:cover;border-radius:6px;">'):('<span style="color:var(--text-tertiary);font-size:var(--fs-micro);">无</span>')}</td>
        <td><a href="/item/${encURI(slug)}" target="_blank" style="color:var(--accent);font-weight:var(--fw-medium);">${esc(item.title)}</a><div style="font-size:var(--fs-micro);color:var(--text-tertiary);">/${encURI(slug)}</div></td>
        <td><span class="badge ${item.type==='image'?'badge-image':item.type==='video'?'badge-video':'badge-text'}">${item.type}</span></td>
        <td>${esc(catName)}</td>
        <td>${status}</td>
        <td>${item.views||0}</td>
        <td>${formatDate(item.publish_at||item.created_at)}</td>
        <td><button class="btn btn-ghost btn-sm" onclick="editItem(${item.id})">编辑</button> <button class="btn btn-danger btn-sm" onclick="deleteItem(${item.id})">删除</button></td>
      </tr>`;
    }
    tableHTML+=`</tbody></table></div>`;
  }

  // 上传/新建 Tab
  let uploadHTML='';
  if(tab==='upload'){
    uploadHTML=`<div style="max-width:var(--content-base);margin:0 auto;padding:var(--space-5);">
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--space-5);">
    <div>
      <h2 style="margin-bottom:var(--space-4);">新建内容</h2>
      <div class="form-group"><label class="form-label">标题 *</label><input class="form-input" id="f_title" placeholder="作品标题"></div>
      <div class="form-group"><label class="form-label">自定义 URL Slug</label><input class="form-input" id="f_slug" placeholder="留空自动生成"></div>
      <div class="form-group"><label class="form-label">描述</label><textarea class="form-textarea" id="f_desc" placeholder="简短描述"></textarea></div>
      <div class="form-group"><label class="form-label">类型</label>
        <select class="form-select" id="f_type" onchange="onTypeChange()">
          <option value="image">图片</option><option value="video">视频</option><option value="text">文字</option>
        </select>
      </div>
      <div class="form-group"><label class="form-label">分类</label><select class="form-select" id="f_cat"></select></div>
      <div class="form-group"><label class="form-label">标签（逗号分隔）</label><input class="form-input" id="f_tags" placeholder="摄影,风景"></div>
      <div class="form-group"><label class="form-label">SEO 描述</label><textarea class="form-textarea" id="f_seo_desc" placeholder="搜索引擎描述"></textarea></div>
      <div class="form-group"><label class="form-label">SEO 关键词</label><input class="form-input" id="f_seo_kw" placeholder="关键词1,关键词2"></div>
      <div class="form-group"><label class="form-label">发布时间（留空=立即）</label><input class="form-input" id="f_publish" type="datetime-local"></div>
      <div class="form-group"><label class="form-label">过期时间（可选）</label><input class="form-input" id="f_expire" type="datetime-local"></div>
      <div class="form-group"><label class="form-label">置顶权重（越大越靠前）</label><input class="form-input" id="f_weight" type="number" value="0"></div>
      <div class="form-group"><label style="display:flex;align-items:center;gap:8px;"><input type="checkbox" id="f_hidden"> 隐藏（仅链接可访问）</label></div>
      <div class="form-group"><label class="form-label">自定义 CSS 类</label><input class="form-input" id="f_css_class" placeholder="my-special-style"></div>
    </div>
    <div>
      <h2 style="margin-bottom:var(--space-4);">🖼 封面图</h2>
      <div class="form-group"><input class="form-input" id="f_cover_key" placeholder="封面 KV key（上传后自动填入）" readonly></div>
      <div class="form-group"><input type="file" id="f_cover_file" accept="image/*" onchange="uploadFile(this,'cover')"></div>
      <div id="cover_preview" style="margin-bottom:var(--space-5);min-height:120px;background:var(--glass-bg);border-radius:var(--radius-md);display:flex;align-items:center;justify-content:center;color:var(--text-tertiary);">封面预览</div>

      <h2 style="margin-bottom:var(--space-4);">📎 正文内容</h2>
      <div class="form-group"><input class="form-input" id="f_content_key" placeholder="正文 KV key（图片/附件上传后填入）" readonly></div>
      <div class="form-group"><input type="file" id="f_content_file" accept="image/*,video/*,.pdf,.zip" onchange="uploadFile(this,'content')"></div>
      <div class="form-group"><label class="form-label">或填写视频/外链 URL</label><input class="form-input" id="f_content_url" placeholder="https://..."></div>

      <h2 style="margin-bottom:var(--space-4);">📎 附件（可选）</h2>
      <div class="form-group"><input class="form-input" id="f_attach_key" placeholder="附件 KV key" readonly></div>
      <div class="form-group"><input type="file" id="f_attach_file" onchange="uploadFile(this,'attach')"></div>

      <h2 style="margin-bottom:var(--space-4);">🖼 多图画廊（竖向滑动展示）</h2>
      <div id="gallery_list" style="margin-bottom:var(--space-3);"></div>
      <input type="file" id="f_gallery_file" accept="image/*" multiple onchange="uploadGallery(this)">
      <div id="gallery_preview" style="margin-top:var(--space-3);display:flex;flex-direction:column;gap:8px;"></div>

      <div style="display:flex;gap:var(--space-3);margin-top:var(--space-5);">
        <button class="btn btn-primary" onclick="saveItem('draft')">💾 保存草稿</button>
        <button class="btn btn-primary" onclick="saveItem('publish')">🚀 发布</button>
        <button class="btn btn-ghost" onclick="previewItem()">👁 预览</button>
      </div>
    </div></div></div>`;
  }

  // 分类管理 Tab
  let catHTML='';
  if(tab==='categories'){
    catHTML=`<div style="max-width:var(--content-base);margin:0 auto;padding:var(--space-5);">
    <h2 style="margin-bottom:var(--space-4);">分类管理</h2>
    <div id="catList" style="display:flex;flex-direction:column;gap:var(--space-3);margin-bottom:var(--space-4);"></div>
    <div style="display:flex;gap:var(--space-2);">
      <input class="form-input" id="newCatName" placeholder="新分类名称" style="max-width:200px;">
      <input class="form-input" id="newCatColor" type="color" value="#0071E3" style="width:60px;padding:4px;">
      <button class="btn btn-primary btn-sm" onclick="addCategory()">＋ 添加分类</button>
    </div></div>`;
  }

  // 站点设置 Tab
  let settingsHTML='';
  if(tab==='settings'){
    settingsHTML=`<div style="max-width:var(--content-base);margin:0 auto;padding:var(--space-5);">
    <h2 style="margin-bottom:var(--space-4);">⚙ 站点设置</h2>

    <h3 style="margin:var(--space-5) 0 var(--space-3);">品牌</h3>
    <div class="form-group"><label class="form-label">品牌名称</label><input class="form-input" id="s_brand" value="${esc(settings.brand_name)}"></div>
    <div class="form-group"><label class="form-label">主题色</label><input class="form-input" id="s_accent" type="color" value="${esc(settings.theme_accent||'#0071E3')}" style="width:60px;padding:4px;"></div>
    <div class="form-group"><label class="form-label">暗色模式</label><select class="form-select" id="s_dark"><option value="off" ${settings.theme_dark_mode==='off'?'selected':''}>关闭</option><option value="on" ${settings.theme_dark_mode==='on'?'selected':''}>开启</option><option value="auto" ${settings.theme_dark_mode==='auto'?'selected':''}>跟随系统</option></select></div>
    <div class="form-group"><label class="form-label">Logo KV Key</label><input class="form-input" id="s_logo" value="${esc(settings.brand_logo_key||'')}"><input type="file" id="s_logo_file" accept="image/*" onchange="uploadSimple(this,'s_logo')" style="margin-top:4px;"></div>
    <div class="form-group"><label class="form-label">Favicon KV Key</label><input class="form-input" id="s_favicon" value="${esc(settings.favicon_key||'')}"><input type="file" id="s_favicon_file" accept="image/*" onchange="uploadSimple(this,'s_favicon')" style="margin-top:4px;"></div>

    <h3 style="margin:var(--space-5) 0 var(--space-3);">Hero 区域</h3>
    <div class="form-group"><label class="form-label">背景类型</label><select class="form-select" id="s_hero_type"><option value="none" ${settings.hero_bg_type==='none'?'selected':''}>无</option><option value="gradient" ${settings.hero_bg_type==='gradient'?'selected':''}>渐变</option><option value="image" ${settings.hero_bg_type==='image'?'selected':''}>图片</option><option value="video" ${settings.hero_bg_type==='video'?'selected':''}>视频</option></select></div>
    <div class="form-group"><label class="form-label">自定义渐变 CSS</label><input class="form-input" id="s_hero_grad" value="${esc(settings.hero_gradient||'')}" placeholder="linear-gradient(...)"></div>
    <div class="form-group"><label class="form-label">背景图 KV Key</label><input class="form-input" id="s_hero_img" value="${esc(settings.hero_image_key||'')}"></div>
    <div class="form-group"><label class="form-label">背景视频 URL</label><input class="form-input" id="s_hero_video" value="${esc(settings.hero_video_url||'')}"></div>

    <h3 style="margin:var(--space-5) 0 var(--space-3);">内容</h3>
    <div class="form-group"><label class="form-label">站点描述（SEO）</label><textarea class="form-textarea" id="s_desc">${esc(settings.site_description||'')}</textarea></div>
    <div class="form-group"><label class="form-label">站点关键词</label><input class="form-input" id="s_kw" value="${esc(settings.site_keywords||'')}"></div>
    <div class="form-group"><label class="form-label">复制链接按钮文案</label><input class="form-input" id="s_copy" value="${esc(settings.copy_link_text||'复制链接')}"></div>

    <h3 style="margin:var(--space-5) 0 var(--space-3);">页脚（支持 HTML）</h3>
    <div class="form-group"><textarea class="form-textarea" id="s_footer" style="min-height:80px;">${esc(settings.footer_html||'')}</textarea></div>

    <h3 style="margin:var(--space-5) 0 var(--space-3);">公告（支持 HTML，留空关闭）</h3>
    <div class="form-group"><textarea class="form-textarea" id="s_ann" style="min-height:60px;">${esc(settings.announcement_html||'')}</textarea></div>

    <h3 style="margin:var(--space-5) 0 var(--space-3);">导航链接（JSON）</h3>
    <div class="form-group"><textarea class="form-textarea" id="s_nav">${esc(JSON.stringify(safeJSON(settings.nav_links,'[]'),null,0))}</textarea></div>

    <h3 style="margin:var(--space-5) 0 var(--space-3);">关于页（支持 HTML）</h3>
    <div class="form-group"><textarea class="form-textarea" id="s_about" style="min-height:120px;">${esc(settings.about_html||'')}</textarea></div>

    <h3 style="margin:var(--space-5) 0 var(--space-3);">懒加载占位图 KV Key</h3>
    <div class="form-group"><input class="form-input" id="s_lazy" value="${esc(settings.lazy_placeholder||'')}"></div>

    <h3 style="margin:var(--space-5) 0 var(--space-3);">功能开关</h3>
    <div class="form-group"><label style="display:flex;align-items:center;gap:8px;"><input type="checkbox" id="s_rss" ${settings.rss_enabled==='1'?'checked':''}> 启用 RSS</label></div>
    <div class="form-group"><label style="display:flex;align-items:center;gap:8px;"><input type="checkbox" id="s_sitemap" ${settings.sitemap_enabled==='1'?'checked':''}> 启用 Sitemap</label></div>

    <button class="btn btn-primary" style="margin-top:var(--space-5);" onclick="saveSettings()">💾 保存所有设置</button>
    </div>`;
  }

  const html=`<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>后台管理 - ${esc(settings.brand_name)}</title>
<style>${BASE_CSS}</style>
</head>
<body>
<nav class="nav"><div class="nav-inner">
  <a class="brand" href="/admin">⚙ ${esc(settings.brand_name)} 后台</a>
  <div class="nav-links"><a class="nav-link" href="/" target="_blank">↗ 前台</a></div>
  <div class="nav-actions">
    <button class="btn btn-ghost btn-sm" onclick="toggleDarkMode()">🌙</button>
  </div>
</div></nav>
${statsHTML}
${tabHTML}
${tableHTML}
${uploadHTML}
${catHTML}
${settingsHTML}
${MOUSE_TRACKER}
<script>
const CATS=${JSON.stringify(categories)};
const ITEMS=${JSON.stringify((items.results||[]).map(i=>({id:i.id,title:i.title,description:i.description,type:i.type,content:i.content,cover_key:i.cover_key||'',category:i.category||'',tags:i.tags||'',slug:i.slug||'',custom_slug:i.custom_slug||'',seo_description:i.seo_description||'',seo_keywords:i.seo_keywords||'',publish_at:i.publish_at||'',expire_at:i.expire_at||'',sort_weight:i.sort_weight||0,is_hidden:i.is_hidden||0,gallery_keys:safeJSON(i.gallery_keys||'[]',[]),attachment_key:i.attachment_key||'',attachment_name:i.attachment_name||'',custom_css_class:i.custom_css_class||'',is_public:i.is_public||0})))};
let editingId=null;let galleryKeys=[];

// 填充分类下拉
function fillCatSelect(){const sel=document.getElementById('f_cat');sel.innerHTML='<option value="">-- 无 --</option>'+CATS.map(c=>`<option value="${esc(c.name)}">${esc(c.name)}\x3c/option>`).join('');}

// 上传文件
async function uploadFile(input,target){if(!input.files[0])return;const fd=new FormData();fd.append('file',input.files[0]);showToast('上传中...','info');const r=await fetch('/api/upload',{method:'POST',body:fd});const j=await r.json();if(r.ok){if(target==='cover'){document.getElementById('f_cover_key').value=j.key;document.getElementById('cover_preview').innerHTML=`<img src="/file/${j.key}" style="max-width:100%;border-radius:12px;box-shadow:var(--shadow-3);">`;}else if(target==='content'){document.getElementById('f_content_key').value=j.key;document.getElementById('f_content_url').value='/file/'+j.key;}else if(target==='attach'){document.getElementById('f_attach_key').value=j.key;}}else{showToast(j.error||'上传失败','error');}}

// 上传简单（设置页）
async function uploadSimple(input,targetId){if(!input.files[0])return;const fd=new FormData();fd.append('file',input.files[0]);const r=await fetch('/api/upload',{method:'POST',body:fd});const j=await r.json();if(r.ok)document.getElementById(targetId).value=j.key;}

// 多图
async function uploadGallery(input){for(const f of input.files){const fd=new FormData();fd.append('file',f);const r=await fetch('/api/upload',{method:'POST',body:fd});const j=await r.json();if(r.ok){galleryKeys.push(j.key);renderGallery();}}}

function renderGallery(){const c=document.getElementById('gallery_preview');c.innerHTML=galleryKeys.map((k,i)=>`<div style="display:flex;align-items:center;gap:8px;"><img src="/file/${k}" style="width:80px;height:60px;object-fit:cover;border-radius:8px;"><button class="btn btn-danger btn-sm" onclick="removeGallery(${i})">移除</button></div>`).join('');}
function removeGallery(i){galleryKeys.splice(i,1);renderGallery();}

// 保存
async function saveItem(action){const data={title:document.getElementById('f_title').value,description:document.getElementById('f_desc').value,type:document.getElementById('f_type').value,category:document.getElementById('f_cat').value,tags:document.getElementById('f_tags').value,seo_description:document.getElementById('f_seo_desc').value,seo_keywords:document.getElementById('f_seo_kw').value,publish_at:document.getElementById('f_publish').value||null,expire_at:document.getElementById('f_expire').value||null,sort_weight:parseInt(document.getElementById('f_weight').value||'0'),is_hidden:document.getElementById('f_hidden').checked?1:0,gallery_keys:galleryKeys,attachment_key:document.getElementById('f_attach_key').value||null,attachment_name:'',custom_css_class:document.getElementById('f_css_class').value||''};
if(document.getElementById('f_content_key').value)data.content=document.getElementById('f_content_key').value;
else if(document.getElementById('f_content_url').value)data.content=document.getElementById('f_content_url').value;
if(document.getElementById('f_cover_key').value)data.cover_key=document.getElementById('f_cover_key').value;
if(document.getElementById('f_slug').value)data.custom_slug=document.getElementById('f_slug').value;
if(action==='publish')data.is_public=1;

let r;if(editingId){r=await fetch('/api/items/'+editingId,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});}else{r=await fetch('/api/items',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});}
if(r.ok){showToast(action==='publish'?'✅ 已发布':'💾 已保存草稿','success');setTimeout(()=>location.reload(),800);}else{const j=await r.json();showToast(j.error||'保存失败','error');}}

// 预览
function previewItem(){const slug=document.getElementById('f_slug').value||document.getElementById('f_title').value||'preview';window.open('/item/'+encodeURIComponent(slug),'_blank');}

// 编辑
function editItem(id){const item=ITEMS.find(i=>i.id===id);if(!item)return;editingId=id;fillCatSelect();document.getElementById('f_title').value=item.title;document.getElementById('f_slug').value=item.custom_slug||'';document.getElementById('f_desc').value=item.description;document.getElementById('f_type').value=item.type;document.getElementById('f_cat').value=item.category;document.getElementById('f_tags').value=item.tags;document.getElementById('f_seo_desc').value=item.seo_description;document.getElementById('f_seo_kw').value=item.seo_keywords;document.getElementById('f_publish').value=item.publish_at?item.publish_at.slice(0,16):'';document.getElementById('f_expire').value=item.expire_at?item.expire_at.slice(0,16):'';document.getElementById('f_weight').value=item.sort_weight||0;document.getElementById('f_hidden').checked=!!item.is_hidden;document.getElementById('f_css_class').value=item.custom_css_class||'';document.getElementById('f_cover_key').value=item.cover_key||'';if(item.cover_key)document.getElementById('cover_preview').innerHTML=`<img src="/file/${item.cover_key}" style="max-width:100%;border-radius:12px;">`;if(item.content&&item.content.startsWith('/file/'))document.getElementById('f_content_key').value=item.content.slice(6);else document.getElementById('f_content_url').value=item.content||'';galleryKeys=[...item.gallery_keys];renderGallery();document.getElementById('f_attach_key').value=item.attachment_key||'';location.hash='upload';window.scrollTo(0,0);}

// 删除
async function deleteItem(id){if(!confirm('确定删除？'))return;const r=await fetch('/api/items/'+id,{method:'DELETE'});if(r.ok){showToast('已删除','success');setTimeout(()=>location.reload(),500);}}

// 批量删除
async function batchDelete(){const ids=[...document.querySelectorAll('.rowChk:checked')].map(c=>c.value);if(ids.length===0)return showToast('请先选择','info');if(!confirm('删除 '+ids.length+' 条？'))return;const r=await fetch('/api/items/batch',{method:'DELETE',headers:{'Content-Type':'application/json'},body:JSON.stringify({ids})});if(r.ok){showToast('已删除 '+ids.length+' 条','success');setTimeout(()=>location.reload(),500);}}

function toggleAll(m){document.querySelectorAll('.rowChk').forEach(c=>c.checked=m.checked);}

function filterTable(q){q=q.toLowerCase();document.querySelectorAll('#dataTable tbody tr').forEach(r=>{r.style.display=r.textContent.toLowerCase().includes(q)?'':'none';});}

// 分类
function renderCats(){const c=document.getElementById('catList');if(!c)return;c.innerHTML=CATS.map((cat,i)=>`<div style="display:flex;gap:var(--space-2);align-items:center;padding:var(--space-2) var(--space-3);background:var(--glass-bg);border-radius:var(--radius-sm);"><input type="color" value="${esc(cat.color||'#0071E3')}" onchange="updateCatColor(${i},this.value)" style="width:40px;padding:2px;"><input class="form-input" value="${esc(cat.name)}" onchange="updateCatName(${i},this.value)" style="flex:1;"><button class="btn btn-danger btn-sm" onclick="delCat(${i})">删除</button></div>`).join('');}
function addCategory(){const n=document.getElementById('newCatName').value;const c=document.getElementById('newCatColor').value;if(!n)return;CATS.push({name:n,color:c});saveCats();}
function updateCatName(i,v){CATS[i].name=v;saveCats();}
function updateCatColor(i,v){CATS[i].color=v;saveCats();}
function delCat(i){CATS.splice(i,1);saveCats();}
async function saveCats(){const r=await fetch('/api/settings',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({categories:JSON.stringify(CATS)})});if(r.ok){renderCats();showToast('分类已保存','success');}}

// 站点设置
async function saveSettings(){const d={brand_name:document.getElementById('s_brand').value,theme_accent:document.getElementById('s_accent').value,theme_dark_mode:document.getElementById('s_dark').value,brand_logo_key:document.getElementById('s_logo').value,favicon_key:document.getElementById('s_favicon').value,hero_bg_type:document.getElementById('s_hero_type').value,hero_gradient:document.getElementById('s_hero_grad').value,hero_image_key:document.getElementById('s_hero_img').value,hero_video_url:document.getElementById('s_hero_video').value,site_description:document.getElementById('s_desc').value,site_keywords:document.getElementById('s_kw').value,copy_link_text:document.getElementById('s_copy').value,footer_html:document.getElementById('s_footer').value,announcement_html:document.getElementById('s_ann').value,nav_links:document.getElementById('s_nav').value,about_html:document.getElementById('s_about').value,lazy_placeholder:document.getElementById('s_lazy').value,rss_enabled:document.getElementById('s_rss').checked?'1':'0',sitemap_enabled:document.getElementById('s_sitemap').checked?'1':'0'};
const r=await fetch('/api/settings',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(d)});if(r.ok)showToast('✅ 设置已保存','success');else showToast('保存失败','error');}

// 类型切换
function onTypeChange(){const t=document.getElementById('f_type').value;document.getElementById('f_content_file').accept=t==='video'?'video/*':t==='image'?'image/*':'*';}

// Toast
function showToast(msg,type){const t=document.createElement('div');t.className='toast toast-'+type+' show';t.textContent=msg;document.body.appendChild(t);setTimeout(()=>{t.classList.remove('show');setTimeout(()=>t.remove(),300);},2000);}

// 暗色模式
function toggleDarkMode(){document.body.classList.toggle('dark-mode');localStorage.setItem('darkMode',document.body.classList.contains('dark-mode')?'on':'off');}

// 初始化
fillCatSelect();renderCats();
</script>
</body></html>`;

  return new Response(html,{'Content-Type':'text/html;charset=utf-8'});
}
