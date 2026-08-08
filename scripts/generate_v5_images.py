#!/usr/bin/env python3
"""Generate v5 preview images (frontend + admin) with all 16 features highlighted."""
from PIL import Image, ImageDraw, ImageFont, ImageFilter
import os, math, random

OUT = '/data/workspace/media-gallery'
W, H = 1500, 1000
FONT = '/usr/share/fonts/truetype/wqy/wqy-microhei.ttc'

def font(size):
    try: return ImageFont.truetype(FONT, size)
    except: return ImageFont.load_default()

def gradient_bg(w, h, colors):
    img = Image.new('RGB', (w, h))
    draw = ImageDraw.Draw(img)
    for y in range(h):
        t = y / h
        r = int(sum(c[0]*(1-abs(2*t-i) if i==0 else abs(2*t-i)) for i,c in enumerate(colors))/len(colors))
        # simpler: blend top→bottom through colors
        seg = t * (len(colors)-1)
        i = min(int(seg), len(colors)-2)
        f = seg - i
        r = int(colors[i][0]*(1-f) + colors[i+1][0]*f)
        g = int(colors[i][1]*(1-f) + colors[i+1][1]*f)
        b = int(colors[i][2]*(1-f) + colors[i+1][2]*f)
        draw.line([(0,y),(w,y)], fill=(r,g,b))
    return img

def draw_glass_rect(draw, xy, radius, fill, outline=None, shadow=None):
    x1,y1,x2,y2 = xy
    if shadow:
        for i in range(3,0,-1):
            o = i*2
            draw.rounded_rectangle((x1+o,y1+o,x2+o,y2+o), radius=radius, fill=shadow)
    draw.rounded_rectangle(xy, radius=radius, fill=fill, outline=outline)

def draw_aurora(img, w, h):
    """Simulate aurora background blobs."""
    overlay = Image.new('RGBA', (w,h), (0,0,0,0))
    od = ImageDraw.Draw(overlay)
    blobs = [
        (0.12, 0.18, 0.30, (99,102,241,40)),
        (0.88, 0.28, 0.26, (168,85,247,32)),
        (0.50, 0.82, 0.28, (56,189,248,36)),
        (0.78, 0.78, 0.22, (52,211,153,28)),
        (0.22, 0.68, 0.24, (236,72,153,24)),
    ]
    for bx,by,br,col in blobs:
        cx,bw=int(bx*w),int(br*w)
        cy,bh=int(by*h),int(br*h*0.8)
        od.ellipse((cx-bw,cy-bh,cx+bw,cy+bh), fill=col)
    overlay = overlay.filter(ImageFilter.GaussianBlur(60))
    img.paste(Image.alpha_composite(img.convert('RGBA'), overlay).convert('RGB'))

# ══════════════════════════════════════
# 前台效果图
# ═══════════════════════════════════════
def render_frontend():
    img = gradient_bg(W, H, [(232,234,245),(223,227,245),(226,223,245),(220,229,240)])
    draw_aurora(img, W, H)
    draw = ImageDraw.Draw(img)
    f = font(20)

    # ── 导航栏 (glass) ──
    draw_glass_rect(draw, (0,0,W,62), 0, fill=(255,255,255,108), outline=(255,255,255,140))
    draw.text((28,20), "✦ MyGallery", fill=(0,113,227), font=font(24))
    for i, t in enumerate(['首页','关于','GitHub','RSS']):
        draw.text((260+i*100,22), t, fill=(90,90,98), font=f)
    draw_glass_rect(draw, (W-170,16,W-90,46), 14, fill=(0,113,227,225), outline=(255,255,255,90))
    draw.text((W-155,22), "🌙 暗色", fill=(255,255,255), font=f)
    draw_glass_rect(draw, (W-80,16,W-20,46), 14, fill=(255,255,255,140), outline=(255,255,255,120))
    draw.text((W-70,22), "⚙", fill=(90,90,98), font=f)

    # ── Hero ──
    draw.text((W//2-200, 90), "精选作品", fill=(28,28,30), font=font(52))
    draw.text((W//2-260, 155), "一个支持 16 项自定义的 Apple 静奢风作品集", fill=(90,90,98), font=f)
    # Hero buttons
    draw_glass_rect(draw, (W//2-160,195,W//2+10,235), 12, fill=(0,113,227,225), outline=(255,255,255,90))
    draw.text((W//2-140,203), "🚀 浏览作品", fill=(255,255,255), font=f)
    draw_glass_rect(draw, (W//2+30,195,W//2+180,235), 12, fill=(255,255,255,160), outline=(255,255,255,120))
    draw.text((W//2+50,203), "📖 关于本站", fill=(90,90,98), font=f)

    # ── 公告横幅 ──
    draw_glass_rect(draw, (60,252,W-60,288), 12, fill=(255,248,230,200), outline=(255,213,0,120))
    draw.text((80,260), "📢 公告：本站已支持暗色模式、RSS 订阅、Sitemap 自动生成！", fill=(120,80,0), font=f)

    # ── 筛选标签 ──
    chips = [('全部',True),('摄影',False),('设计',False),('视频',False),('随笔',False),('旅行',False)]
    cx = 80
    for t, active in chips:
        w = len(t)*20+28
        if active:
            draw_glass_rect(draw, (cx,302,cx+w,332), 14, fill=(0,113,227,30), outline=(0,113,227,90))
            draw.text((cx+10,307), t, fill=(0,113,227), font=f)
        else:
            draw_glass_rect(draw, (cx,302,cx+w,332), 14, fill=(255,255,255,120), outline=(255,255,255,100))
            draw.text((cx+10,307), t, fill=(90,90,98), font=f)
        cx += w + 14

    # ── 卡片网格 3列 ──
    cards = [
        ('山间晨雾', '摄影 · 自然风光', 'image', (99,102,241)),
        ('品牌设计提案', '设计 · 商业作品', 'image', (236,72,153)),
        ('城市延时摄影', '视频 · 城市记录', 'video', (0,113,227)),
        ('关于极简主义', '文字 · 随笔', 'text', (52,199,89)),
        ('冬日咖啡馆', '摄影 · 生活', 'image', (255,149,0)),
        ('字体排印研究', '设计 · 文字', 'text', (168,85,247)),
    ]
    cw, ch = 420, 310
    gx, gy = 60, 358
    gap_x, gap_y = 30, 24
    for idx, (title, sub, typ, color) in enumerate(cards):
        col, row = idx % 3, idx // 3
        x1 = gx + col*(cw+gap_x)
        y1 = gy + row*(ch+gap_y)
        x2, y2 = x1+cw, y1+ch
        # Card glass
        draw_glass_rect(draw, (x1,y1,x2,y2), 20, fill=(255,255,255,178), outline=(255,255,255,140))
        # Media area (top 60%)
        mx1,my1,mx2,my2 = x1+2, y1+2, x2-2, y1+int(ch*0.58)
        # gradient media bg
        for yy in range(my1, my2):
            t = (yy-my1)/(my2-my1)
            r=int(color[0]*(1-t*0.4)); g=int(color[1]*(1-t*0.4)); b=int(color[2]*(1-t*0.4))
            draw.line([(mx1,yy),(mx2,yy)], fill=(r,g,b))
        # Type badge
        bw, bh = 52, 22
        draw.rounded_rectangle((mx1+10,my1+10,mx1+10+bw,my1+10+bh), radius=6, fill=(*color,220))
        draw.text((mx1+16,my1+13), typ.upper(), fill=(255,255,255), font=font(14))
        # Play icon for video
        if typ=='video':
            cx2,cy2 = (mx1+mx2)//2, (my1+my2)//2
            draw.ellipse((cx2-22,cy2-22,cx2+22,cy2+22), fill=(255,255,255,200))
            p = [(cx2-8,cy2-14),(cx2-8,cy2+14),(cx2+12,cy2)]
            draw.polygon(p, fill=(0,113,227))
        # Card body
        draw.text((x1+20,y1+int(ch*0.62)), title, fill=(28,28,30), font=font(22))
        draw.text((x1+20,y1+int(ch*0.62)+30), sub, fill=(140,140,148), font=f)
        # Tags
        draw.rounded_rectangle((x1+20,y2-36,x1+90,y2-12), radius=10, fill=(*color,25), outline=(*color,70))
        draw.text((x1+28,y2-32), f"#{sub.split('·')[0].strip()}", fill=color, font=f)
        # Views
        draw.text((x2-100,y2-32), f"👁 {random.randint(50,999)}", fill=(160,160,168), font=f)

    # ── 分页 ──
    px = W//2-120
    for i, t in enumerate(['←','1','2','3','→']):
        active = (i==1)
        w = 36 if t in '←→' else 30
        if active:
            draw.rounded_rectangle((px,gy+2*ch+gap_y+10,px+w,gy+2*ch+gap_y+40), radius=14, fill=(0,113,227))
            draw.text((px+8,gy+2*ch+gap_y+14), t, fill=(255,255,255), font=f)
        else:
            draw.rounded_rectangle((px,gy+2*ch+gap_y+10,px+w,gy+2*ch+gap_y+40), radius=14, fill=(255,255,255,140), outline=(255,255,255,100))
            draw.text((px+8,gy+2*ch+gap_y+14), t, fill=(90,90,98), font=f)
        px += w + 8

    # ── 页脚 ──
    draw.text((W//2-150, H-40), "© 2026 MyGallery · 关于 · RSS · Sitemap", fill=(160,160,168), font=f)

    # ── FAB ──
    draw.ellipse((W-76,H-76,W-24,H-24), fill=(0,113,227), outline=(255,255,255,120))
    draw.text((W-66,H-66), "⚙", fill=(255,255,255), font=font(22))

    img.save(f'{OUT}/frontend_v5_final.png', quality=95)
    print('✅ frontend_v5_final.png saved')

# ══════════════════════════════════════
# 后台效果图
# ═══════════════════════════════════════
def render_admin():
    img = gradient_bg(W, H, [(232,234,245),(223,227,245),(226,223,245),(220,229,240)])
    draw_aurora(img, W, H)
    draw = ImageDraw.Draw(img)
    f = font(20)

    # ── 导航 ──
    draw_glass_rect(draw, (0,0,W,60), 0, fill=(255,255,255,108), outline=(255,255,255,140))
    draw.text((28,18), "⚙ MyGallery 后台", fill=(0,113,227), font=font(22))
    for i, t in enumerate(['所有内容','+ 上传/新建','分类管理','⚙ 站点设置']):
        active = (i==1)
        if active:
            draw.rounded_rectangle((220+i*140,16,220+i*140+120,46), radius=12, fill=(0,113,227,25), outline=(0,113,227,80))
            draw.text((230+i*140,21), t, fill=(0,113,227), font=f)
        else:
            draw.text((230+i*140,21), t, fill=(90,90,98), font=f)
    draw.text((W-100,21), "退出", fill=(255,59,48), font=f)

    # ── 统计卡片 ──
    stats = [('12','全部内容','blue'),('8','已发布','green'),('3','草稿','orange'),('1','已隐藏','purple')]
    sx = 60
    for i,(num,label,clr) in enumerate(stats):
        cw2,ch2 = 320,90
        x1 = sx + i*(cw2+24)
        y1,y2 = 78,78+ch2
        fill_c = {'blue':(0,113,227),'green':(52,199,89),'orange':(255,149,0),'purple':(168,85,247)}[clr]
        draw_glass_rect(draw, (x1,y1,x1+cw2,y2), 16, fill=(255,255,255,170), outline=(255,255,255,130))
        # left accent bar
        draw.rounded_rectangle((x1,y1,x1+4,y2), radius=3, fill=fill_c)
        draw.text((x1+20,y1+14), num, fill=(28,28,30), font=font(40))
        draw.text((x1+20,y1+58), label, fill=(140,140,148), font=f)

    # ── 工具栏 ──
    ty = 190
    draw_glass_rect(draw, (60,ty,W-60,ty+44), 12, fill=(255,255,255,140), outline=(255,255,255,110))
    draw.rounded_rectangle((80,ty+8,200,ty+36), radius=8, fill=(255,59,48,20), outline=(255,59,48,60))
    draw.text((90,ty+12), "🗑 批量删除", fill=(255,59,48), font=f)
    draw.rounded_rectangle((220,ty+8,420,ty+36), radius=8, fill=(255,255,255,100), outline=(255,255,255,80))
    draw.text((230,ty+12), "🔍 搜索...", fill=(160,160,168), font=f)
    draw.rounded_rectangle((W-200,ty+8,W-80,ty+36), radius=8, fill=(255,255,255,100), outline=(255,255,255,80))
    draw.text((W-190,ty+12), "类型 ▾", fill=(90,90,98), font=f)

    # ── 数据表格 ──
    cols = ['☐','封面','标题/URL','类型','分类','状态','浏览','日期','操作']
    col_w = [40,70,280,70,90,90,70,110,180]
    tx, tty = 60, 250
    # header
    draw_glass_rect(draw, (tx,tty,tx+sum(col_w)+40,tty+36), 10, fill=(255,255,255,160), outline=(255,255,255,120))
    cx2 = tx+12
    for i,t in enumerate(cols):
        draw.text((cx2,tty+8), t, fill=(90,90,98), font=font(16))
        cx2 += col_w[i]

    rows = [
        ('🖼','山间晨雾','image','摄影',('green','发布'),342,'2026-08-05'),
        ('🖼','品牌设计提案','image','设计',('green','发布'),128,'2026-08-03'),
        ('▶','城市延时摄影','video','视频',('green','发布'),89,'2026-08-01'),
        ('📝','关于极简主义','text','随笔',('orange','草稿'),12,'2026-07-28'),
        ('🖼','冬日咖啡馆','image','摄影',('purple','隐藏'),56,'2026-07-20'),
        ('📝','字体排印研究','text','设计',('green','发布'),203,'2026-07-15'),
    ]
    for ri, (icon,title,typ,cat,st,views,date) in enumerate(rows):
        ry = tty + 40 + ri*52
        draw_glass_rect(draw, (tx,ry,tx+sum(col_w)+40,ry+46), 8, fill=(255,255,255,90 if ri%2==0 else 60), outline=(255,255,255,70))
        cx3 = tx+12
        # checkbox
        draw.rounded_rectangle((cx3,ry+14,cx3+16,ry+30), radius=3, outline=(160,160,168))
        cx3 += col_w[0]
        # cover thumb
        ccolor = {'image':(0,113,227),'video':(255,45,85),'text':(79,172,254)}[typ]
        draw.rounded_rectangle((cx3,ry+6,cx3+52,ry+38), radius=6, fill=(*ccolor,180))
        cx3 += col_w[1]
        # title + url
        draw.text((cx3,ry+6), f"{icon} {title}", fill=(28,28,30), font=f)
        draw.text((cx3,ry+28), f"/item/{title}", fill=(160,160,168), font=font(14))
        cx3 += col_w[2]
        # type badge
        draw.rounded_rectangle((cx3,ry+12,cx3+56,ry+34), radius=6, fill=(*ccolor,210))
        draw.text((cx3+6,ry+14), typ, fill=(255,255,255), font=font(14))
        cx3 += col_w[3]
        # category chip
        draw.rounded_rectangle((cx3,ry+12,cx3+76,ry+34), radius=10, fill=(*ccolor,25), outline=(*ccolor,70))
        draw.text((cx3+8,ry+14), cat, fill=ccolor, font=f)
        cx3 += col_w[4]
        # status dot
        sc = {'green':(52,199,89),'orange':(255,149,0),'purple':(168,85,247)}[st[0]]
        draw.ellipse((cx3+8,ry+16,cx3+22,ry+30), fill=sc)
        draw.text((cx3+28,ry+14), st[1], fill=(90,90,98), font=f)
        cx3 += col_w[5]
        # views
        draw.text((cx3,ry+14), str(views), fill=(90,90,98), font=f)
        cx3 += col_w[6]
        # date
        draw.text((cx3,ry+14), date, fill=(140,140,148), font=f)
        cx3 += col_w[7]
        # actions
        draw.text((cx3,ry+10), "✏ 编辑", fill=(0,113,227), font=f)
        draw.text((cx3+70,ry+10), "🗑 删除", fill=(255,59,48), font=f)

    # ── 右侧：上传/编辑面板预览 ──
    px2 = W-440
    py = 250
    pw, ph = 400, 700
    draw_glass_rect(draw, (px2,py,px2+pw,py+ph), 18, fill=(255,255,255,175), outline=(255,255,255,140))
    draw.text((px2+20,py+16), "✏ 编辑：山间晨雾", fill=(28,28,30), font=font(20))
    # form fields
    fields = [
        ('标题','山间晨雾'),
        ('自定义 Slug','shan-jian-chen-wu'),
        ('SEO 描述','山间晨雾摄影作品...'),
        ('SEO 关键词','摄影,风光,自然'),
        ('发布时间','2026-08-05 08:00'),
        ('过期时间','(空)'),
        ('置顶权重','10'),
        ('自定义CSS类','photo-hero'),
    ]
    fy = py + 50
    for label, val in fields:
        draw.text((px2+20,fy), label, fill=(140,140,148), font=font(14))
        draw.rounded_rectangle((px2+20,fy+18,px2+pw-20,fy+44), radius=8, fill=(255,255,255,140), outline=(255,255,255,100))
        draw.text((px2+30,fy+22), val, fill=(28,28,30), font=f)
        fy += 56

    # Cover image preview
    draw.text((px2+20,fy), "封面图", fill=(140,140,148), font=font(14))
    draw.rounded_rectangle((px2+20,fy+18,px2+160,fy+98), radius=10, fill=(99,102,241,180))
    draw.text((px2+50,fy+50), "🖼 封面", fill=(255,255,255), font=f)
    fy += 110

    # Action buttons
    draw.rounded_rectangle((px2+20,fy,px2+130,fy+38), radius=10, fill=(0,113,227,220))
    draw.text((px2+36,fy+8), "💾 保存草稿", fill=(255,255,255), font=f)
    draw.rounded_rectangle((px2+144,fy,px2+250,fy+38), radius=10, fill=(52,199,89,220))
    draw.text((px2+156,fy+8), "🚀 发布", fill=(255,255,255), font=f)
    draw.rounded_rectangle((px2+264,fy,px2+360,fy+38), radius=10, fill=(255,255,255,140), outline=(255,255,255,100))
    draw.text((px2+278,fy+8), "👁 预览", fill=(90,90,98), font=f)

    # ── 底部：功能标记 ──
    features = [
        '✅ 1.自定义Slug ✅ 2.SEO字段 ✅ 3.发布时间',
        '✅ 7.隐藏仅链接 ✅ 8.多图画廊 ✅ 10.CSS类',
        '✅ 11.Logo/Favicon ✅ 13.暗色模式 ✅ 14.Hero自定义',
        '✅ 15.页脚HTML ✅ 16.导航链接 ✅ 17.关于页HTML',
        '✅ 18.公告HTML ✅ 19.品牌名 ✅ 27.懒加载 ✅ 28.复制链接',
    ]
    for i, t in enumerate(features):
        draw.text((60, H-150+i*22), t, fill=(90,90,98), font=font(15))

    img.save(f'{OUT}/admin_v5_final.png', quality=95)
    print('✅ admin_v5_final.png saved')

render_frontend()
render_admin()
print('🎉 All v5 preview images generated!')
