// ===================== 设计系统 v3: 深度毛玻璃 =====================
// Frosted Glass Extreme — Apple 静奢风
// 全站 Aurora 动态渐变背景 + 多层光晕
// 导航/卡片/模态框/按钮/标签 全部 glass morphism
// =====================================================================
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

const BASE_CSS=`${DESIGN_TOKENS}
/* ── Reset ────────────────────────────────────── */
*,*::before,*::after{margin:0;padding:0;box-sizing:border-box;}
html{scroll-behavior:smooth;-webkit-text-size-adjust:100%;}
body{
  font-family:var(--font-sans);
  font-size:var(--fs-body);
  line-height:var(--lh-normal);
  color:var(--text-primary);
  background:var(--bg-base);
  min-height:100vh;
  -webkit-font-smoothing:antialiased;
  -moz-osx-font-smoothing:grayscale;
  letter-spacing:var(--tracking-normal);
  position:relative;overflow-x:hidden;
}

/* ════════ Aurora 动态背景 ════════ */
body::before{
  content:'';position:fixed;inset:-20%;z-index:-2;
  background:
    radial-gradient(ellipse 55% 45% at 12% 18%,rgba(99,102,241,0.20),transparent 70%),
    radial-gradient(ellipse 48% 55% at 88% 28%,rgba(168,85,247,0.16),transparent 70%),
    radial-gradient(ellipse 52% 42% at 50% 82%,rgba(56,189,248,0.18),transparent 70%),
    radial-gradient(ellipse 38% 48% at 78% 78%,rgba(52,211,153,0.14),transparent 70%),
    radial-gradient(ellipse 42% 52% at 22% 68%,rgba(236,72,153,0.11),transparent 70%),
    linear-gradient(165deg,#E8EAF5 0%,#DFE3F5 30%,#E2DFF5 60%,#DCE5F0 100%);
  animation:aurora 28s ease-in-out infinite;
  will-change:transform;
}
/* 鼠标跟随光晕 */
body::after{
  content:'';position:fixed;inset:0;z-index:-1;pointer-events:none;
  background:radial-gradient(circle 280px at var(--mx,50%) var(--my,30%),rgba(255,255,255,0.45),transparent 70%);
  transition:opacity var(--dur-base) var(--ease-standard);
}
@keyframes aurora{
  0%,100%{transform:translate(0,0) rotate(0deg) scale(1);}
  20%{transform:translate(-2%,1.5%) rotate(0.8deg) scale(1.02);}
  40%{transform:translate(1.5%,-1%) rotate(-0.5deg) scale(1.01);}
  60%{right:translate(-1%,2%) rotate(0.5deg) scale(1.03);}
  80%{transform:translate(2%,-1.5%) rotate(-0.3deg) scale(1.01);}
}

a{color:var(--accent);text-decoration:none;transition:color var(--dur-fast) var(--ease-standard);}
a:hover{color:var(--accent-hover);}
button{font-family:inherit;cursor:pointer;border:none;background:none;}
img,video{max-width:100%;display:block;}
input,textarea,select{font-family:inherit;font-size:inherit;color:inherit;}

/* ── 减少动效偏好 ────────────────────────────── */
@media (prefers-reduced-motion: reduce){
  *,*::before,*::after{
    animation-duration:0.01ms!important;
    animation-iteration-count:1!important;
    transition-duration:0.01ms!important;
    scroll-behavior:auto!important;
  }
  body::before{animation:none;}
}

/* ════════ 5.1 导航栏（深度毛玻璃） ════════ */
.nav{
  position:sticky;top:0;z-index:100;
  background:rgba(255,255,255,0.42);
  backdrop-filter:blur(36px) saturate(220%);
  -webkit-backdrop-filter:blur(36px) saturate(220%);
  border-bottom:var(--glass-border);
  box-shadow:var(--glass-inner-glow),0 4px 28px rgba(0,0,0,0.04);
  transition:background var(--dur-base) var(--ease-standard),
             box-shadow var(--dur-base) var(--ease-standard);
}
.nav.scrolled{
  background:rgba(255,255,255,0.58);
  box-shadow:var(--glass-inner-glow),0 8px 36px rgba(0,0,0,0.06);
}
.nav-inner{
  max-width:var(--content-wide);
  margin:0 auto;
  padding:var(--space-3) var(--space-5);
  display:flex;align-items:center;justify-content:space-between;
  gap:var(--space-4);
}
.brand{
  font-size:1.18rem;font-weight:var(--fw-black);
  letter-spacing:var(--tracking-tight);
  background:var(--grad-blue);
  background-size:200% 200%;
  -webkit-background-clip:text;-webkit-text-fill-color:transparent;
  animation:brandShine 8s ease infinite;
  filter:drop-shadow(0 1px 10px rgba(0,113,227,0.18));
}
@keyframes brandShine{0%,100%{background-position:0% 50%}50%{background-position:100% 50%}}

/* ════════ 5.2 媒体卡片（玻璃拟物） ════════ */
.card{
  background:var(--glass-bg-strong);
  border:var(--glass-border);
  border-radius:var(--radius-lg);
  overflow:hidden;
  box-shadow:var(--shadow-2);
  backdrop-filter:var(--glass-blur);
  -webkit-backdrop-filter:var(--glass-blur);
  transition:transform var(--dur-base) var(--ease-spring),
             box-shadow var(--dur-base) var(--ease-standard),
             border-color var(--dur-base) var(--ease-standard);
  position:relative;
}
.card::before{
  content:'';position:absolute;inset:0;
  border-radius:inherit;pointer-events:none;z-index:1;
  background:linear-gradient(135deg,rgba(255,255,255,0.45) 0%,transparent 50%);
  opacity:0;transition:opacity var(--dur-base) var(--ease-standard);
}
.card:hover{
  transform:translateY(-6px) scale(1.012);
  box-shadow:var(--shadow-4),var(--shadow-glow-blue);
  border-color:rgba(255,255,255,0.75);
}
.card:hover::before{opacity:1;}
.card-media{
  aspect-ratio:4/3;width:100%;
  display:flex;align-items:center;justify-content:center;
  color:rgba(255,255,255,0.95);font-size:2.2rem;
  position:relative;overflow:hidden;
}
.card-media::after{
  content:'';position:absolute;inset:0;
  background:linear-gradient(180deg,transparent 40%,rgba(0,0,0,0.24) 100%);
}
.card-body{padding:var(--space-4) var(--space-5) var(--space-5);position:relative;z-index:2;}
.card-title{
  font-size:var(--fs-h3);font-weight:var(--fw-semibold);
  letter-spacing:var(--tracking-tight);line-height:var(--lh-snug);
  margin-bottom:var(--space-1);
  display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;
  overflow:hidden;
}
.card-desc{
  font-size:var(--fs-caption);color:var(--text-secondary);
  line-height:var(--lh-snug);
  display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;
  overflow:hidden;
}

/* ════════ 5.3 类型徽章（玻璃质感） ════════ */
.badge{
  display:inline-flex;align-items:center;gap:var(--space-1);
  padding:3px var(--space-2);
  border-radius:var(--radius-xs);
  font-size:var(--fs-micro);font-weight:var(--fw-semibold);
  color:#fff;letter-spacing:var(--tracking-wide);
  backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);
  border:1px solid rgba(255,255,255,0.30);
  box-shadow:0 2px 10px rgba(0,0,0,0.10),inset 0 1px 0 rgba(255,255,255,0.25);
}
.badge-image{background:linear-gradient(135deg,rgba(0,113,227,0.88),rgba(94,92,230,0.85));}
.badge-video{background:linear-gradient(135deg,rgba(255,45,85,0.88),rgba(255,55,95,0.85));}
.badge-text {background:linear-gradient(135deg,rgba(79,172,254,0.88),rgba(0,242,254,0.85));}

/* ════════ 5.4 分类标签（毛玻璃胶囊） ════════ */
.chip{
  display:inline-flex;align-items:center;
  padding:var(--space-1) var(--space-3);
  border-radius:var(--radius-pill);
  font-size:var(--fs-micro);font-weight:var(--fw-medium);
  background:var(--glass-bg);color:var(--text-secondary);
  border:var(--glass-border);
  backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);
  transition:all var(--dur-fast) var(--ease-standard);
  box-shadow:var(--shadow-1);
}
.chip:hover{background:var(--glass-bg-strong);color:var(--text-primary);transform:translateY(-1px);box-shadow:var(--shadow-2);}
.chip-active{
  background:rgba(0,113,227,0.12);color:var(--accent);
  border-color:rgba(0,113,227,0.35);
  box-shadow:0 0 14px rgba(0,113,227,0.12),inset 0 1px 0 rgba(255,255,255,0.35);
}
.chip-accent{
  background:rgba(0,113,227,0.10);color:var(--accent);
  border-color:rgba(0,113,227,0.28);
}

/* ════════ 5.5 按钮（玻璃拟物） ════════ */
.btn{
  display:inline-flex;align-items:center;justify-content:center;gap:var(--space-2);
  padding:var(--space-2) var(--space-5);
  font-size:var(--fs-body);font-weight:var(--fw-medium);
  border-radius:var(--radius-sm);
  transition:all var(--dur-fast) var(--ease-standard);
  letter-spacing:var(--tracking-normal);
  white-space:nowrap;
  border:var(--glass-border);
  backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);
}
.btn-primary{
  background:linear-gradient(135deg,rgba(0,113,227,0.88),rgba(94,92,230,0.84));
  color:#fff;
  box-shadow:0 2px 14px rgba(0,113,227,0.32),inset 0 1px 0 rgba(255,255,255,0.22);
  border-color:rgba(255,255,255,0.35);
}
.btn-primary:hover{
  background:linear-gradient(135deg,rgba(0,119,237,0.92),rgba(105,103,240,0.88));
  transform:translateY(-2px);
  box-shadow:0 6px 24px rgba(0,113,227,0.38),inset 0 1px 0 rgba(255,255,255,0.28);
}
.btn-primary:active{transform:translateY(0);}
.btn-ghost{
  background:var(--glass-bg);color:var(--text-secondary);
  border:var(--glass-border);
}
.btn-ghost:hover{background:var(--glass-bg-strong);color:var(--text-primary);transform:translateY(-1px);box-shadow:var(--shadow-2);}
.btn-danger{color:var(--danger);border:1px solid rgba(255,59,48,0.18);background:rgba(255,59,48,0.05);}
.btn-danger:hover{background:var(--danger-soft);box-shadow:0 0 14px rgba(255,59,48,0.10);}

/* ════════ 反模式清单 ════════ */
/* ✗ 纯黑/纯白文字 ✗ 过强阴影 ✗ 无 blur 的"假玻璃" ✗ 超 600ms 动效 */
`;
