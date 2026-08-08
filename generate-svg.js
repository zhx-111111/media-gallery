// Generate SVG preview images (no native deps needed)
const fs = require('fs');

// ============ FRONTEND PREVIEW SVG ============
const frontendSVG = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1400" height="900" viewBox="0 0 1400 900">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#E8EAF5"/>
      <stop offset="35%" style="stop-color:#DFE3F5"/>
      <stop offset="70%" style="stop-color:#E2DFF5"/>
      <stop offset="100%" style="stop-color:#DCE5F0"/>
    </linearGradient>
    <radialGradient id="orb1" cx="15%" cy="20%">
      <stop offset="0%" style="stop-color:rgb(99,102,241);stop-opacity:0.20"/>
      <stop offset="70%" style="stop-color:rgb(99,102,241);stop-opacity:0"/>
    </radialGradient>
    <radialGradient id="orb2" cx="85%" cy="30%">
      <stop offset="0%" style="stop-color:rgb(168,85,247);stop-opacity:0.16"/>
      <stop offset="70%" style="stop-color:rgb(168,85,247);stop-opacity:0"/>
    </radialGradient>
    <radialGradient id="orb3" cx="50%" cy="80%">
      <stop offset="0%" style="stop-color:rgb(56,189,248);stop-opacity:0.18"/>
      <stop offset="70%" style="stop-color:rgb(56,189,248);stop-opacity:0"/>
    </radialGradient>
    <radialGradient id="orb4" cx="75%" cy="75%">
      <stop offset="0%" style="stop-color:rgb(52,211,153);stop-opacity:0.14"/>
      <stop offset="70%" style="stop-color:rgb(52,211,153);stop-opacity:0"/>
    </radialGradient>
    <radialGradient id="mousGlow" cx="65%" cy="45%">
      <stop offset="0%" style="stop-color:rgb(255,255,255);stop-opacity:0.40"/>
      <stop offset="70%" style="stop-color:rgb(255,255,255);stop-opacity:0"/>
    </radialGradient>
    <linearGradient id="brandGrad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" style="stop-color:#0071E3"/>
      <stop offset="100%" style="stop-color:#5E5CE6"/>
    </linearGradient>
    <linearGradient id="heroGrad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" style="stop-color:#0071E3"/>
      <stop offset="50%" style="stop-color:#5E5CE6"/>
      <stop offset="100%" style="stop-color:#BF5AF2"/>
    </linearGradient>
    <linearGradient id="cardGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#0071E3"/>
      <stop offset="100%" style="stop-color:#5E5CE6"/>
    </linearGradient>
    <linearGradient id="cardGrad2" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#FF2D55"/>
      <stop offset="100%" style="stop-color:#FF375F"/>
    </linearGradient>
    <linearGradient id="cardGrad3" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#4FACFE"/>
      <stop offset="100%" style="stop-color:#00F2FE"/>
    </linearGradient>
    <linearGradient id="cardGrad4" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#5E5CE6"/>
      <stop offset="100%" style="stop-color:#BF5AF2"/>
    </linearGradient>
    <linearGradient id="cardGrad5" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#FF9500"/>
      <stop offset="100%" style="stop-color:#FF6B35"/>
    </linearGradient>
    <linearGradient id="cardGrad6" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#34C759"/>
      <stop offset="100%" style="stop-color:#30D158"/>
    </linearGradient>
    <linearGradient id="fabGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#0071E3"/>
      <stop offset="100%" style="stop-color:#5E5CE6"/>
    </linearGradient>
    <linearGradient id="btnGrad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" style="stop-color:#0071E3;stop-opacity:0.88"/>
      <stop offset="100%" style="stop-color:#5E5CE6;stop-opacity:0.84"/>
    </linearGradient>
    <filter id="glass" x="-10%" y="-10%" width="120%" height="120%">
      <feGaussianBlur in="SourceGraphic" stdDeviation="0.5"/>
    </filter>
    <filter id="shadow1" x="-5%" y="-5%" width="110%" height="115%">
      <feDropShadow dx="0" dy="1" stdDeviation="2" flood-color="#000" flood-opacity="0.04"/>
    </filter>
    <filter id="shadow4" x="-5%" y="-5%" width="110%" height="115%">
      <feDropShadow dx="0" dy="8" stdDeviation="20" flood-color="#000" flood-opacity="0.08"/>
    </filter>
    <filter id="shadowFab" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="6" stdDeviation="12" flood-color="#0071E3" flood-opacity="0.35"/>
    </filter>
    <filter id="textGlow" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="1" stdDeviation="4" flood-color="#0071E3" flood-opacity="0.15"/>
    </filter>
  </defs>

  <!-- Background -->
  <rect width="1400" height="900" fill="url(#bg)"/>
  <rect width="1400" height="900" fill="url(#orb1)" opacity="0.6"/>
  <rect width="1400" height="900" fill="url(#orb2)" opacity="0.6"/>
  <rect width="1400" height="900" fill="url(#orb3)" opacity="0.6"/>
  <rect width="1400" height="900" fill="url(#orb4)" opacity="0.6"/>
  <rect width="1400" height="900" fill="url(#mousGlow)" opacity="0.5"/>

  <!-- ═══ NAV BAR (glass) ═══ -->
  <rect x="20" y="10" width="1360" height="56" rx="14" fill="rgba(255,255,255,0.42)" stroke="rgba(255,255,255,0.55)" stroke-width="1" filter="url(#shadow1)"/>
  <line x1="20" y1="66" x2="1380" y2="66" stroke="rgba(255,255,255,0.45)" stroke-width="1"/>

  <!-- Brand -->
  <text x="50" y="45" font-family="-apple-system,sans-serif" font-size="20" font-weight="800" fill="url(#brandGrad)" filter="url(#textGlow)">✨ 精选作品</text>

  <!-- Nav chips -->
  <rect x="350" y="22" width="56" height="30" rx="15" fill="url(#btnGrad)"/>
  <text x="364" y="41" font-family="-apple-system,sans-serif" font-size="12" font-weight="600" fill="#fff">全部</text>

  <rect x="420" y="22" width="56" height="30" rx="15" fill="rgba(255,255,255,0.45)" stroke="rgba(255,255,255,0.50)" stroke-width="1"/>
  <text x="434" y="41" font-family="-apple-system,sans-serif" font-size="12" font-weight="500" fill="#5A5A62">摄影</text>

  <rect x="490" y="22" width="56" height="30" rx="15" fill="rgba(255,255,255,0.45)" stroke="rgba(255,255,255,0.50)" stroke-width="1"/>
  <text x="504" y="41" font-family="-apple-system,sans-serif" font-size="12" font-weight="500" fill="#5A5A62">设计</text>

  <rect x="560" y="22" width="56" height="30" rx="15" fill="rgba(255,255,255,0.45)" stroke="rgba(255,255,255,0.50)" stroke-width="1"/>
  <text x="574" y="41" font-family="-apple-system,sans-serif" font-size="12" font-weight="500" fill="#5A5A62">视频</text>

  <rect x="630" y="22" width="56" height="30" rx="15" fill="rgba(255,255,255,0.45)" stroke="rgba(255,255,255,0.50)" stroke-width="1"/>
  <text x="644" y="41" font-family="-apple-system,sans-serif" font-size="12" font-weight="500" fill="#5A5A62">随笔</text>

  <!-- ═══ HERO ═══ -->
  <text x="700" y="155" font-family="-apple-system,sans-serif" font-size="56" font-weight="900" fill="url(#heroGrad)" text-anchor="middle" filter="url(#textGlow)">精选作品</text>
  <text x="700" y="195" font-family="-apple-system,sans-serif" font-size="17" font-weight="400" fill="#5A5A62" text-anchor="middle">图片 · 视频 · 文字 — 一切精彩，尽收眼底</text>

  <!-- Search bar (glass) -->
  <rect x="420" y="225" width="560" height="44" rx="14" fill="rgba(255,255,255,0.72)" stroke="rgba(255,255,255,0.55)" stroke-width="1" filter="url(#shadow1)"/>
  <text x="442" y="253" font-family="-apple-system,sans-serif" font-size="14" fill="#9A9AA2">🔍  搜索标题或描述…</text>

  <!-- ═══ BENTO CARDS ═══ -->
  <!-- Card 1: Image -->
  <rect x="60" y="300" width="320" height="260" rx="22" fill="rgba(255,255,255,0.72)" stroke="rgba(255,255,255,0.55)" stroke-width="1.5" filter="url(#shadow4)"/>
  <rect x="70" y="310" width="300" height="140" rx="16" fill="url(#cardGrad1)"/>
  <text x="220" y="385" font-size="44" text-anchor="middle" filter="url(#shadow1)">🖼</text>
  <rect x="70" y="430" width="300" height="50" rx="0" fill="url(#cardGrad1)" opacity="0.18"/>
  <rect x="80" y="318" width="52" height="22" rx="6" fill="url(#cardGrad1)" opacity="0.88"/>
  <text x="90" y="334" font-family="-apple-system,sans-serif" font-size="10" font-weight="700" fill="#fff">图片</text>
  <text x="80" y="475" font-family="-apple-system,sans-serif" font-size="15" font-weight="600" fill="#1C1C1E">山间晨雾</text>
  <text x="80" y="495" font-family="-apple-system,sans-serif" font-size="12" fill="#5A5A62">清晨五点的山间，雾气缭绕如仙境</text>

  <!-- Card 2: Video -->
  <rect x="400" y="300" width="320" height="260" rx="22" fill="rgba(255,255,255,0.72)" stroke="rgba(255,255,255,0.55)" stroke-width="1.5" filter="url(#shadow4)"/>
  <rect x="410" y="310" width="300" height="140" rx="16" fill="url(#cardGrad2)"/>
  <text x="560" y="385" font-size="44" text-anchor="middle" filter="url(#shadow1)">🎬</text>
  <rect x="410" y="430" width="300" height="50" rx="0" fill="url(#cardGrad2)" opacity="0.18"/>
  <rect x="420" y="318" width="52" height="22" rx="6" fill="url(#cardGrad2)" opacity="0.88"/>
  <text x="430" y="334" font-family="-apple-system,sans-serif" font-size="10" font-weight="700" fill="#fff">视频</text>
  <text x="420" y="475" font-family="-apple-system,sans-serif" font-size="15" font-weight="600" fill="#1C1C1E">城市延时摄影</text>
  <text x="420" y="495" font-family="-apple-system,sans-serif" font-size="12" fill="#5A5A62">48小时不间断拍摄，浓缩成3分钟</text>

  <!-- Card 3: Text -->
  <rect x="740" y="300" width="320" height="260" rx="22" fill="rgba(255,255,255,0.72)" stroke="rgba(255,255,255,0.55)" stroke-width="1.5" filter="url(#shadow4)"/>
  <rect x="750" y="310" width="300" height="140" rx="16" fill="url(#cardGrad3)"/>
  <text x="900" y="385" font-size="44" text-anchor="middle" filter="url(#shadow1)">📝</text>
  <rect x="750" y="430" width="300" height="50" rx="0" fill="url(#cardGrad3)" opacity="0.18"/>
  <rect x="760" y="318" width="52" height="22" rx="6" fill="url(#cardGrad3)" opacity="0.88"/>
  <text x="770" y="334" font-family="-apple-system,sans-serif" font-size="10" font-weight="700" fill="#fff">文字</text>
  <text x="760" y="475" font-family="-apple-system,sans-serif" font-size="15" font-weight="600" fill="#1C1C1E">关于创作的思考</text>
  <text x="760" y="495" font-family="-apple-system,sans-serif" font-size="12" fill="#5A5A62">艺术不是复制现实，而是重新诠释</text>

  <!-- Card 4: Image - Purple -->
  <rect x="1080" y="300" width="280" height="260" rx="22" fill="rgba(255,255,255,0.72)" stroke="rgba(255,255,255,0.55)" stroke-width="1.5" filter="url(#shadow4)"/>
  <rect x="1090" y="310" width="260" height="140" rx="16" fill="url(#cardGrad4)"/>
  <text x="1220" y="385" font-size="44" text-anchor="middle" filter="url(#shadow1)">🖼</text>
  <rect x="1090" y="430" width="260" height="50" rx="0" fill="url(#cardGrad4)" opacity="0.18"/>
  <rect x="1100" y="318" width="52" height="22" rx="6" fill="url(#cardGrad4)" opacity="0.88"/>
  <text x="1110" y="334" font-family="-apple-system,sans-serif" font-size="10" font-weight="700" fill="#fff">图片</text>
  <text x="1100" y="475" font-family="-apple-system,sans-serif" font-size="15" font-weight="600" fill="#1C1C1E">极简建筑</text>
  <text x="1100" y="495" font-family="-apple-system,sans-serif" font-size="12" fill="#5A5A62">线条、光影、几何的建筑之美</text>

  <!-- Card 5: Video - Orange -->
  <rect x="60" y="590" width="320" height="220" rx="22" fill="rgba(255,255,255,0.72)" stroke="rgba(255,255,255,0.55)" stroke-width="1.5" filter="url(#shadow4)"/>
  <rect x="70" y="600" width="300" height="120" rx="16" fill="url(#cardGrad5)"/>
  <text x="220" y="665" font-size="40" text-anchor="middle" filter="url(#shadow1)">🎬</text>
  <rect x="70" y="710" width="300" height="40" rx="0" fill="url(#cardGrad5)" opacity="0.18"/>
  <rect x="80" y="608" width="52" height="20" rx="6" fill="url(#cardGrad5)" opacity="0.88"/>
  <text x="90" y="623" font-family="-apple-system,sans-serif" font-size="10" font-weight="700" fill="#fff">视频</text>
  <text x="80" y="755" font-family="-apple-system,sans-serif" font-size="15" font-weight="600" fill="#1C1C1E">海浪慢动作</text>
  <text x="80" y="775" font-family="-apple-system,sans-serif" font-size="12" fill="#5A5A62">240fps 捕捉浪花破碎的瞬间</text>

  <!-- Card 6: Text - Green -->
  <rect x="400" y="590" width="320"-height="220" rx="22" fill="rgba(255,255,255,0.72)" stroke="rgba(255,255,255,0.55)" stroke-width="1.5" filter="url(#shadow4)"/>
  <rect x="410" y="600" width="300" height="120" rx="16" fill="url(#cardGrad6)"/>
  <text x="560" y="665" font-size="40" text-anchor="middle" filter="url(#shadow1)">📝</text>
  <rect x="410" y="710" width="300" height="40" rx="0" fill="url(#cardGrad6)" opacity="0.18"/>
  <rect x="420" y="608" width="52" height="20" rx="6" fill="url(#cardGrad6)" opacity="0.88"/>
  <text x="430" y="623" font-family="-apple-system,sans-serif" font-size="10" font-weight="700" fill="#fff">文字</text>
  <text x="420" y="755" font-family="-apple-system,sans-serif" font-size="15" font-weight="600" fill="#1C1C1E">旅行的意义</text>
  <text x="420" y="775" font-family="-apple-system,sans-serif" font-size="12" fill="#5A5A62">不是去看风景，而是去成为那个人</text>

  <!-- FAB -->
  <circle cx="1335" cy="835" r="28" fill="url(#fabGrad)" filter="url(#shadowFab)"/>
  <text x="1335" y="844" font-size="20" text-anchor="middle" fill="#fff">⚙</text>

  <!-- Pagination -->
  <rect x="450" y="830" width="500" height="40" rx="12" fill="rgba(255,255,255,0.55)" stroke="rgba(255,255,255,0.50)" stroke-width="1"/>
  <text x="700" y="855" font-family="-apple-system,sans-serif" font-size="13" fill="#5A5A62" text-anchor="middle">← 上一页    第 1 / 3 页    下一页 →</text>

</svg>`;

// ============ ADMIN PREVIEW SVG ============
const adminSVG = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1400" height="900" viewBox="0 0 1400 900">
  <defs>
    <linearGradient id="bg2" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#E8EAF5"/>
      <stop offset="35%" style="stop-color:#DFE3F5"/>
      <stop offset="70%" style="stop-color:#E2DFF5"/>
      <stop offset="100%" style="stop-color:#DCE5F0"/>
    </linearGradient>
    <radialGradient id="orbA" cx="12%" cy="15%">
      <stop offset="0%" style="stop-color:rgb(99,102,241);stop-opacity:0.18"/>
      <stop offset="70%" style="stop-color:rgb(99,102,241);stop-opacity:0"/>
    </radialGradient>
    <radialGradient id="orbB" cx="88%" cy="25%">
      <stop offset="0%" style="stop-color:rgb(168,85,247);stop-opacity:0.14"/>
      <stop offset="70%" style="stop-color:rgb(168,85,247);stop-opacity:0"/>
    </radialGradient>
    <radialGradient id="orbC" cx="50%" cy="85%">
      <stop offset="0%" style="stop-color:rgb(56,189,248);stop-opacity:0.16"/>
      <stop offset="70%" style="stop-color:rgb(56,189,248);stop-opacity:0"/>
    </radialGradient>
    <linearGradient id="brandG2" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" style="stop-color:#0071E3"/>
      <stop offset="100%" style="stop-color:#5E5CE6"/>
    </linearGradient>
    <linearGradient id="btnG2" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" style="stop-color:#0071E3;stop-opacity:0.88"/>
      <stop offset="100%" style="stop-color:#5E5CE6;stop-opacity:0.84"/>
    </linearGradient>
    <linearGradient id="greenG" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" style="stop-color:#34C759"/>
      <stop offset="100%" style="stop-color:#34C759;stop-opacity:0.5"/>
    </linearGradient>
    <linearGradient id="warmG" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" style="stop-color:#FF9500"/>
      <stop offset="100%" style="stop-color:#FF9500;stop-opacity:0.5"/>
    </linearGradient>
    <linearGradient id="purpleG" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" style="stop-color:#5E5CE6"/>
      <stop offset="100%" style="stop-color:#BF5AF2"/>
    </linearGradient>
    <linearGradient id="toastG" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" style="stop-color:#34C759;stop-opacity:0.90"/>
      <stop offset="100%" style="stop-color:#30D158;stop-opacity:0.86"/>
    </linearGradient>
    <filter id="shadowA" x="-5%" y="-5%" width="110%" height="115%">
      <feDropShadow dx="0" dy="2" stdDeviation="8" flood-color="#000" flood-opacity="0.05"/>
    </filter>
    <filter id="shadowB" x="-5%" y="-5%" width="110%" height="115%">
      <feDropShadow dx="0" dy="4" stdDeviation="14" flood-color="#000" flood-opacity="0.06"/>
    </filter>
    <filter id="shadowC" x="-5%" y="-5%" width="110%" height="115%">
      <feDropShadow dx="0" dy="8" stdDeviation="24" flood-color="#000" flood-opacity="0.08"/>
    </filter>
    <filter id="glowGreen" x="-50%" y="-50%" width="200%" height="200%">
      <feDropShadow dx="0" dy="0" stdDeviation="6" flood-color="#34C759" flood-opacity="0.4"/>
    </filter>
    <filter id="glowWarm" x="-50%" y="-50%" width="200%" height="200%">
      <feDropShadow dx="0" dy="0" stdDeviation="6" flood-color="#FF9500" flood-opacity="0.35"/>
    </filter>
    <filter id="glowPurple" x="-50%" y="-50%" width="200%" height="200%">
      <feDropShadow dx="0" dy="0" stdDeviation="6" flood-color="#5E5CE6" flood-opacity="0.35"/>
    </filter>
  </defs>

  <!-- Background -->
  <rect width="1400" height="900" fill="url(#bg2)"/>
  <rect width="1400" height="900" fill="url(#orbA)" opacity="0.6"/>
  <rect width="1400" height="900" fill="url(#orbB)" opacity="0.6"/>
  <rect width="1400" height="900" fill="url(#orbC)" opacity="0.6"/>

  <!-- ═══ ADMIN NAV (glass) ═══ -->
  <rect x="20" y="10" width="1360" height="52" rx="14" fill="rgba(255,255,255,0.45)" stroke="rgba(255,255,255,0.55)" stroke-width="1" filter="url(#shadowA)"/>
  <line x1="20" y1="62" x2="1380" y2="62" stroke="rgba(255,255,255,0.45)" stroke-width="1"/>
  <text x="50" y="43" font-family="-apple-system,sans-serif" font-size="18" font-weight="700" fill="url(#brandG2)">⚙ Gallery 后台</text>

  <!-- Tabs -->
  <rect x="380" y="20" width="100" height="30" rx="10" fill="rgba(0,113,227,0.10)" stroke="rgba(0,113,227,0.28)" stroke-width="1"/>
  <text x="390" y="40" font-family="-apple-system,sans-serif" font-size="12" font-weight="600" fill="#0071E3">📚 内容</text>

  <rect x="490" y="20" width="80" height="30" rx="10" fill="rgba(255,255,255,0.40)" stroke="rgba(255,255,255,0.50)" stroke-width="1"/>
  <text x="500" y="40" font-family="-apple-system,sans-serif" font-size="12" font-weight="500" fill="#5A5A62">⬆ 上传</text>

  <rect x="580" y="20" width="80" height="30" rx="10" fill="rgba(255,255,255,0.40)" stroke="rgba(255,255,255,0.50)" stroke-width="1"/>
  <text x="590" y="40" font-family="-apple-system,sans-serif" font-size="12" font-weight="500" fill="#5A5A62">⚙ 设置</text>

  <!-- ═══ STAT CARDS ═══ -->
  <!-- Stat 1: Total -->
  <rect x="60" y="85" width="310" height="80" rx="16" fill="rgba(255,255,255,0.72)" stroke="rgba(255,255,255,0.55)" stroke-width="1.5" filter="url(#shadowB)"/>
  <rect x="60" y="85" width="3" height="80" rx="1.5" fill="url(#brandG2)" filter="url(#glowPurple)"/>
  <text x="80" y="108" font-family="-apple-system,sans-serif" font-size="10" font-weight="600" fill="#9A9AA2" letter-spacing="1">总内容</text>
  <text x="80" y="140" font-family="-apple-system,sans-serif" font-size="28" font-weight="700" fill="#1C1C1E">42</text>

  <!-- Stat 2: Published -->
  <rect x="385" y="85" width="310" height="80" rx="16" fill="rgba(255,255,255,0.72)" stroke="rgba(255,255,255,0.55)" stroke-width="1.5" filter="url(#shadowB)"/>
  <rect x="385" y="85" width="3" height="80" rx="1.5" fill="url(#greenG)" filter="url(#glowGreen)"/>
  <text x="405" y="108" font-family="-apple-system,sans-serif" font-size="10" font-weight="600" fill="#9A9AA2" letter-spacing="1">已发布</text>
  <text x="405" y="140" font-family="-apple-system,sans-serif" font-size="28" font-weight="700" fill="#1C1C1E">38</text>

  <!-- Stat 3: Drafts -->
  <rect x="710" y="85" width="310" height="80" rx="16" fill="rgba(255,255,255,0.72)" stroke="rgba(255,255,255,0.55)" stroke-width="1.5" filter="url(#shadowB)"/>
  <rect x="710" y="85" width="3" height="80" rx="1.5" fill="url(#warmG)" filter="url(#glowWarm)"/>
  <text x="730" y="108" font-family="-apple-system,sans-serif" font-size="10" font-weight="600" fill="#9A9AA2" letter-spacing="1">草稿</text>
  <text x="730" y="140" font-family="-apple-system,sans-serif" font-size="28" font-weight="700" fill="#1C1C1E">4</text>

  <!-- Stat 4: Images -->
  <rect x="1035" y="85" width="310" height="80" rx="16" fill="rgba(255,255,255,0.72)" stroke="rgba(255,255,255,0.55)" stroke-width="1.5" filter="url(#shadowB)"/>
  <rect x="1035" y="85" width="3" height="80" rx="1.5" fill="url(#purpleG)" filter="url(#glowPurple)"/>
  <text x="1055" y="108" font-family="-apple-system,sans-serif" font-size="10" font-weight="600" fill="#9A9AA2" letter-spacing="1">图片</text>
  <text x="1055" y="140" font-family="-apple-system,sans-serif" font-size="28" font-weight="700" fill="#1C1C1E">28</text>

  <!-- ═══ TOOLBAR ═══ -->
  <rect x="80" y="190" width="155" height="36" rx="10" fill="url(#btnG2)" filter="url(#shadowA)"/>
  <text x="100" y="213" font-family="-apple-system,sans-serif" font-size="13" font-weight="600" fill="#fff">＋ 新建内容</text>

  <rect x="700" y="190" width="220" height="36" rx="10" fill="rgba(255,255,255,0.55)" stroke="rgba(255,255,255,0.50)" stroke-width="1"/>
  <text x="715" y="213" font-family="-apple-system,sans-serif" font-size="13" fill="#9A9AA2">🔍 搜索标题…</text>

  <!-- ═══ TABLE (glass) ═══ -->
  <rect x="60" y="250" width="1280" height="420" rx="20" fill="rgba(255,255,255,0.72)" stroke="rgba(255,255,255,0.55)" stroke-width="1.5" filter="url(#shadowB)"/>

  <!-- Table header -->
  <rect x="75" y="260" width="1250" height="36" rx="10" fill="rgba(255,255,255,0.35)"/>
  <text x="100" y="283" font-family="-apple-system,sans-serif" font-size="10" font-weight="700" fill="#9A9AA2" letter-spacing="1">☐</text>
  <text x="140" y="283" font-family="-apple-system,sans-serif" font-size="10" font-weight="700" fill="#9A9AA2" letter-spacing="1">标题 / URL</text>
  <text x="600" y="283" font-family="-apple-system,sans-serif" font-size="10" font-weight="700" fill="#9A9AA2" letter-spacing="1">类型</text>
  <text x="730" y="283" font-family="-apple-system,sans-serif" font-size="10" font-weight="700" fill="#9A9AA2" letter-spacing="1">分类</text>
  <text x="870" y="283" font-family="-apple-system,sans-serif" font-size="10" font-weight="700" fill="#9A9AA2" letter-spacing="1">状态</text>
  <text x="1000" y="283" font-family="-apple-system,sans-serif" font-size="10" font-weight="700" fill="#9A9AA2" letter-spacing="1">浏览</text>
  <text x="1100" y="283" font-family="-apple-system,sans-serif" font-size="10" font-weight="700" fill="#9A9AA2" letter-spacing="1">日期</text>

  <!-- Row 1 -->
  <rect x="80" y="304" width="1250" height="48" rx="0" fill="rgba(255,255,255,0.20)"/>
  <circle cx="105" cy="328" r="6" fill="none" stroke="rgba(0,0,0,0.15)" stroke-width="1.5"/>
  <text x="140" y="332" font-family="-apple-system,sans-serif" font-size="13" font-weight="500" fill="#0071E3">山间晨雾 — 摄影集</text>
  <text x="140" y="348" font-family="-apple-system,sans-serif" font-size="10" fill="#9A9AA2">/item/shan-jian-chen-wu</text>
  <text x="600" y="332" font-family="-apple-system,sans-serif" font-size="13" fill="#1C1C1E">🖼 图片</text>
  <rect x="730" y="320" width="56" height="20" rx="10" fill="url(#brandG2)"/>
  <text x="740" y="335" font-family="-apple-system,sans-serif" font-size="10" font-weight="600" fill="#fff">摄影</text>
  <circle cx="885" cy="328" r="5" fill="#34C759" filter="url(#glowGreen)"/>
  <text x="898" y="332" font-family="-apple-system,sans-serif" font-size="12" fill="#34C759">已发布</text>
  <text x="1000" y="332" font-family="-apple-system,sans-serif" font-size="13" fill="#1C1C1E">156</text>
  <text x="1100" y="332" font-family="-apple-system,sans-serif" font-size="12" fill="#9A9AA2">2026-07-28</text>
  <text x="1220" y="332" font-family="-apple-system,sans-serif" font-size="14" fill="#5A5A62">✏️ 🗑</text>

  <!-- Row 2 -->
  <text x="140" y="380" font-family="-apple-system,sans-serif" font-size="13" font-weight="500" fill="#0071E3">城市延时摄影</text>
  <text x="600" y="380" font-family="-apple-system,sans-serif" font-size="13" fill="#1C1C1E">🎬 视频</text>
  <rect x="730" y="368" width="56" height="20" rx="10" fill="url(#brandG2)"/>
  <text x="740" y="383" font-family="-apple-system,sans-serif" font-size="10" font-weight="600" fill="#fff">视频</text>
  <circle cx="885" cy="376" r="5" fill="#34C759" filter="url(#glowGreen)"/>
  <text x="898" y="380" font-family="-apple-system,sans-serif" font-size="12" fill="#34C759">已发布</text>
  <text x="1000" y="380" font-family="-apple-system,sans-serif" font-size="13" fill="#1C1C1E">89</text>
  <text x="1100" y="380" font-family="-apple-system,sans-serif" font-size="12" fill="#9A9AA2">2026-07-25</text>
  <text x="1220" y="380" font-family="-apple-system,sans-serif" font-size="14" fill="#5A5A62">✏️ 🗑</text>

  <!-- Row 3 (draft) -->
  <rect x="80" y="400" width="1250" height="48" rx="0" fill="rgba(255,255,255,0.20)"/>
  <text x="140" y="428" font-family="-apple-system,sans-serif" font-size="13" font-weight="500" fill="#0071E3">关于创作的思考</text>
  <text x="600" y="428" font-family="-apple-system,sans-serif" font-size="13" fill="#1C1C1E">📝 文字</text>
  <rect x="730" y="416" width="56" height="20" rx="10" fill="url(#purpleG)"/>
  <text x="740" y="431" font-family="-apple-system,sans-serif" font-size="10" font-weight="600" fill="#fff">随笔</text>
  <circle cx="885" cy="424" r="5" fill="#FF9500" filter="url(#glowWarm)"/>
  <text x="898" y="428" font-family="-apple-system,sans-serif" font-size="12" fill="#FF9500">草稿</text>
  <text x="1000" y="428" font-family="-apple-system,sans-serif" font-size="13" fill="#1C1C1E">0</text>
  <text x="1100" y="428" font-family="-apple-system,sans-serif" font-size="12" fill="#9A9AA2">2026-07-20</text>
  <text x="1220" y="428" font-family="-apple-system,sans-serif" font-size="14" fill="#5A5A62">✏️ 🚀 🗑</text>

  <!-- Row 4 -->
  <text x="140" y="476" font-family="-apple-system,sans-serif" font-size="13" font-weight="500" fill="#0071E3">极简建筑</text>
  <text x="600" y="476" font-family="-apple-system,sans-serif" font-size="13" fill="#1C1C1E">🖼 图片</text>
  <rect x="730" y="464" width="56" height="20" rx="10" fill="url(#purpleG)"/>
  <text x="740" y="479" font-family="-apple-system,sans-serif" font-size="10" font-weight="600" fill="#fff">设计</text>
  <circle cx="885" cy="472" r="5" fill="#34C759" filter="url(#glowGreen)"/>
  <text x="898" y="476" font-family="-apple-system,sans-serif" font-size="12" fill="#34C759">已发布</text>
  <text x="1000" y="476" font-family="-apple-system,sans-serif" font-size="13" fill="#1C1C1E">234</text>
  <text x="1100" y="476" font-family="-apple-system,sans-serif" font-size="12" fill="#9A9AA2">2026-07-15</text>
  <text x="1220" y="476" font-family="-apple-system,sans-serif" font-size="14" fill="#5A5A62">✏️ 🗑</text>

  <!-- Row 5 -->
  <rect x="80" y="496" width="1250" height="48" rx="0" fill="rgba(255,255,255,0.15)"/>
  <text x="140" y="524" font-family="-apple-system,sans-serif" font-size="13" font-weight="500" fill="#0071E3">海浪慢动作</text>
  <text x="600" y="524" font-family="-apple-system,sans-serif" font-size="13" fill="#1C1C1E">🎬 视频</text>
  <rect x="730" y="512" width="56" height="20" rx="10" fill="url(#brandG2)"/>
  <text x="740" y="527" font-family="-apple-system,sans-serif" font-size="10" font-weight="600" fill="#fff">摄影</text>
  <circle cx="885" cy="520" r="5" fill="#34C759" filter="url(#glowGreen)"/>
  <text x="898" y="524" font-family="-apple-system,sans-serif" font-size="12" fill="#34C759">已发布</text>
  <text x="1000" y="524" font-family="-apple-system,sans-serif" font-size="13" fill="#1C1C1E">67</text>
  <text x="1100" y="524" font-family="-apple-system,sans-serif" font-size="12" fill="#9A9AA2">2026-07-10</text>
  <text x="1220" y="524" font-family="-apple-system,sans-serif" font-size="14" fill="#5A5A62">✏️ 🗑</text>

  <!-- Row 6 -->
  <text x="140" y="572" font-family="-apple-system,sans-serif" font-size="13" font-weight="500" fill="#0071E3">旅行的意义</text>
  <text x="600" y="572" font-family="-apple-system,sans-serif" font-size="13" fill="#1C1C1E">📝 文字</text>
  <rect x="730" y="560" width="56" height="20" rx="10" fill="url(#purpleG)"/>
  <text x="740" y="575" font-family="-apple-system,sans-serif" font-size="10" font-weight="600" fill="#fff">随笔</text>
  <circle cx="885" cy="568" r="5" fill="#FF9500" filter="url(#glowWarm)"/>
  <text x="898" y="572" font-family="-apple-system,sans-serif" font-size="12" fill="#FF9500">草稿</text>
  <text x="1000" y="572" font-family="-apple-system,sans-serif" font-size="13" fill="#1C1C1E">0</text>
  <text x="1100" y="572" font-family="-apple-system,sans-serif" font-size="12" fill="#9A9AA2">2026-07-05</text>
  <text x="1220" y="572" font-family="-apple-system,sans-serif" font-size="14" fill="#5A5A62">✏️ 🚀 🗑</text>

  <!-- ═══ PAGINATION ═══ -->
  <rect x="450" y="700" width="500" height="40" rx="12" fill="rgba(255,255,255,0.55)" stroke="rgba(255,255,255,0.50)" stroke-width="1"/>
  <text x="700" y="725" font-family="-apple-system,sans-serif" font-size="13" fill="#5A5A62" text-anchor="middle">← 上一页    第 1 / 2 页    下一页 →</text>

  <!-- ═══ MODAL (glass) ═══ -->
  <rect x="420" y="300" width="560" height="340" rx="28" fill="rgba(255,255,255,0.78)" stroke="rgba(255,255,255,0.60)" stroke-width="1.5" filter="url(#shadowC)"/>
  <!-- Modal top sheen -->
  <rect x="420" y="300" width="560" height="80" rx="28" fill="rgba(255,255,255,0.35)"/>
  <text x="450" y="335" font-family="-apple-system,sans-serif" font-size="18" font-weight="600" fill="#1C1C1E">编辑内容</text>

  <!-- Modal fields -->
  <text x="450" y="380" font-family="-apple-system,sans-serif" font-size="11" font-weight="600" fill="#5A5A62">标题</text>
  <rect x="450" y="388" width="500" height="32" rx="8" fill="rgba(255,255,255,0.60)" stroke="rgba(255,255,255,0.50)" stroke-width="1"/>
  <text x="460" y="408" font-family="-apple-system,sans-serif" font-size="13" fill="#1C1C1E">山间晨雾 — 摄影集</text>

  <text x="450" y="435" font-family="-apple-system,sans-serif" font-size="11" font-weight="600" fill="#5A5A62">描述</text>
  <rect x="450" y="443" width="500" height="50" rx="8" fill="rgba(255,255,255,0.60)" stroke="rgba(255,255,255,0.50)" stroke-width="1"/>
  <text x="460" y="465" font-family="-apple-system,sans-serif" font-size="12" fill="#5A5A62">清晨五点的山间，雾气缭绕如仙境，光线穿透云层</text>

  <text x="450" y="510" font-family="-apple-system,sans-serif" font-size="11" font-weight="600" fill="#5A5A62">类型</text>
  <rect x="450" y="518" width="120" height="28" rx="8" fill="rgba(255,255,255,0.60)" stroke="rgba(255,255,255,0.50)" stroke-width="1"/>
  <text x="460" y="536" font-family="-apple-system,sans-serif" font-size="12" fill="#1C1C1E">🖼 图片</text>

  <!-- Preview panel inside modal -->
  <rect x="450" y="560" width="500" height="60" rx="12" fill="rgba(255,255,255,0.50)" stroke="rgba(255,255,255,0.45)" stroke-width="1"/>
  <text x="460" y="580" font-family="-apple-system,sans-serif" font-size="10" font-weight="700" fill="#9A9AA2" letter-spacing="1">👁 预览</text>
  <text x="460" y="600" font-family="-apple-system,sans-serif" font-size="12" fill="#1C1C1E">🖼 山间晨雾 — 摄影集</text>

  <!-- Modal buttons -->
  <rect x="580" y="630" width="80" height="32" rx="8" fill="rgba(255,255,255,0.55)" stroke="rgba(255,255,255,0.50)" stroke-width="1"/>
  <text x="590" y="650" font-family="-apple-system,sans-serif" font-size="12" fill="#5A5A62">取消</text>
  <rect x="680" y="630" width="100" height="32" rx="8" fill="url(#btnG2)" filter="url(#shadowA)"/>
  <text x="690" y="650" font-family="-apple-system,sans-serif" font-size="12" font-weight="600" fill="#fff">🚀 发布</text>

  <!-- ═══ TOAST ═══ -->
  <rect x="500" y="800" width="400" height="40" rx="12" fill="url(#toastG)" filter="url(#shadowA)"/>
  <text x="700" y="825" font-family="-apple-system,sans-serif" font-size="14" font-weight="500" fill="#fff" text-anchor="middle">✅ 已发布成功</text>

</svg>`;

fs.writeFileSync('./frontend_v3_glass.svg', frontendSVG);
fs.writeFileSync('./admin_v3_glass.svg', adminSVG);
console.log('✅ Frontend SVG: ./frontend_v3_glass.svg');
console.log('✅ Admin SVG: ./admin_v3_glass.svg');
console.log('   Convert to PNG with: rsvg-convert or Inkscape');
