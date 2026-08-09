from PIL import Image, ImageDraw, ImageFont
import os

W, H = 1400, 900

def hex_to_rgb(h):
    h = h.lstrip('#')
    return tuple(int(h[i:i+2], 16) for i in (0, 2, 4))

def try_load_font(size, bold=False):
    paths = [
        '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',
        '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',
        '/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf',
        '/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf',
    ]
    for p in paths:
        if os.path.exists(p):
            try:
                return ImageFont.truetype(p, size)
            except:
                pass
    return ImageFont.load_default()

def draw_radial_glow(img, cx, cy, r, color_rgb, alpha):
    overlay = Image.new('RGBA', img.size, (0, 0, 0, 0))
    od = ImageDraw.Draw(overlay)
    steps = 50
    for i in range(steps, 0, -1):
        ri = r * i / steps
        a = int(alpha * (1 - i / steps) ** 2)
        od.ellipse([cx - ri, cy - ri, cx + ri, cy + ri], fill=(*color_rgb, a))
    return Image.alpha_composite(img, overlay)

def gradient_bar(img, x, y, w, h, c1, c2):
    overlay = Image.new('RGBA', img.size, (0, 0, 0, 0))
    od = ImageDraw.Draw(overlay)
    for i in range(h):
        t = i / max(h - 1, 1)
        r = int(c1[0] + (c2[0] - c1[0]) * t)
        g = int(c1[1] + (c2[1] - c1[1]) * t)
        b = int(c1[2] + (c2[2] - c1[2]) * t)
        od.line([(x, y + i), (x + w - 1, y + i)], fill=(r, g, b, 255))
    return Image.alpha_composite(img, overlay)

def draw_glass_card(img, x, y, w, h, radius=22, alpha=183, border_alpha=140):
    overlay = Image.new('RGBA', img.size, (0, 0, 0, 0))
    od = ImageDraw.Draw(overlay)
    od.rounded_rectangle([x, y, x+w, y+h], radius=radius, fill=(255, 255, 255, alpha))
    od.rounded_rectangle([x, y, x+w, y+h], radius=radius, outline=(255, 255, 255, border_alpha), width=2)
    # Top inner highlight
    hl = Image.new('RGBA', img.size, (0, 0, 0, 0))
    hd = ImageDraw.Draw(hl)
    hl_h = int(h * 0.35)
    hd.rounded_rectangle([x+1, y+1, x+w-1, y+hl_h], radius=radius//2, fill=(255, 255, 255, int(alpha * 0.3)))
    img = Image.alpha_composite(img, hl)
    return Image.alpha_composite(img, overlay)

def draw_glow_dot(img, cx, cy, r, color_rgb, alpha=80):
    overlay = Image.new('RGBA', img.size, (0, 0, 0, 0))
    od = ImageDraw.Draw(overlay)
    steps = 30
    for i in range(steps, 0, -1):
        ri = r * i / steps
        a = int(alpha * (1 - i / steps))
        od.ellipse([cx - ri, cy - ri, cx + ri, cy + ri], fill=(*color_rgb, a))
    return Image.alpha_composite(img, overlay)

# ============ FRONTEND PREVIEW ============
print("Generating frontend preview...")
img = Image.new('RGBA', (W, H), (232, 234, 245, 255))
draw = ImageDraw.Draw(img)

# Aurora orbs
img = draw_radial_glow(img, 200, 150, 350, (99, 102, 241), 46)
img = draw_radial_glow(img, 1150, 220, 320, (168, 85, 247), 36)
img = draw_radial_glow(img, 700, 700, 380, (56, 189, 248), 41)
img = draw_radial_glow(img, 1100, 650, 280, (52, 211, 153), 31)
img = draw_radial_glow(img, 300, 600, 260, (236, 72, 153), 26)
img = draw_radial_glow(img, 900, 400, 180, (255, 255, 255), 90)
draw = ImageDraw.Draw(img)

# NAV BAR
draw.rounded_rectangle([20, 10, W-20, 66], radius=14, fill=(255, 255, 255, 107), outline=(255, 255, 255, 140))
draw.line([(20, 66), (W-20, 66)], fill=(255, 255, 255, 115), width=1)

font_brand = try_load_font(22, bold=True)
draw.text((50, 25), "✦ 精选作品", fill=(0, 113, 227, 255), font=font_brand)

# Nav chips
chips = [('全部', True), ('摄影', False), ('设计', False), ('视频', False), ('随笔', False)]
chip_x = 350
for label, active in chips:
    f = try_load_font(13, bold=active)
    tw = draw.textlength(label, font=f) + 28
    if active:
        img = gradient_bar(img, chip_x, 22, tw, 30, (0,113,227), (94,92,230))
        draw.text((chip_x+14, 30), label, fill=(255,255,255,255), font=f)
    else:
        draw.rounded_rectangle([chip_x, 22, chip_x+tw, 52], radius=15, fill=(255,255,255,128), outline=(255,255,255,130))
        draw.text((chip_x+14, 30), label, fill=(90,90,98,255), font=f)
    chip_x += tw + 10

# HERO
font_hero = try_load_font(56, bold=True)
# Simulate gradient text with blue-purple
draw.text((460, 100), "精选作品", fill=(0, 113, 227, 255), font=font_hero)
draw.text((464, 100), "精选作品", fill=(94, 92, 230, 180), font=font_hero)  # overlay for gradient feel
font_sub = try_load_font(18)
draw.text((440, 165), "图片 · 视频 · 文字 — 一切精彩，尽收眼底", fill=(90, 90, 98, 255), font=font_sub)

# Search bar
draw.rounded_rectangle([400, 210, 960, 256], radius=14, fill=(255,255,255,166), outline=(255,255,255,140))
font_search = try_load_font(15)
draw.text((425, 226), "🔍  搜索标题或描述…", fill=(154,154,162,255), font=font_search)

# BENTO CARDS
cards = [
    {'x': 60, 'y': 300, 'c1': (0,113,227), 'c2': (94,92,230), 'icon': '🖼', 'title': '山间晨雾', 'desc': '清晨五点的山间，雾气缭绕如仙境', 'type': '图片'},
    {'x': 400, 'y': 300, 'c1': (255,45,85), 'c2': (255,55,95), 'icon': '🎬', 'title': '城市延时摄影', 'desc': '48小时不间断拍摄，浓缩成3分钟', 'type': '视频'},
    {'x': 740, 'y': 300, 'c1': (79,172,254), 'c2': (0,242,254), 'icon': '📝', 'title': '关于创作的思考', 'desc': '艺术不是复制现实，而是重新诠释', 'type': '文字'},
    {'x': 1080, 'y': 300, 'c1': (94,92,230), 'c2': (191,90,242), 'icon': '🖼', 'title': '极简建筑', 'desc': '线条、光影、几何的建筑之美', 'type': '图片'},
    {'x': 60, 'y': 590, 'c1': (255,149,0), 'c2': (255,107,53), 'icon': '🎬', 'title': '海浪慢动作', 'desc': '240fps 捕捉浪花破碎的瞬间', 'type': '视频'},
    {'x': 400, 'y': 590, 'c1': (52,199,89), 'c2': (48,209,88), 'icon': '📝', 'title': '旅行的意义', 'desc': '不是去看风景，而是去成为那个人', 'type': '文字'},
]

for c in cards:
    # Card glass body
    img = draw_glass_card(img, c['x'], c['y'], 320, 250, radius=22, alpha=183)
    # Media gradient area
    img = gradient_bar(img, c['x']+10, c['y']+10, 300, 140, c['c1'], c['c2'])
    # Bottom overlay on media
    overlay_m = Image.new('RGBA', img.size, (0,0,0,0))
    od_m = ImageDraw.Draw(overlay_m)
    for i in range(50):
        a = int(56 * (i / 49))
        od_m.line([(c['x']+10, c['y']+90+i), (c['x']+310, c['y']+90+i)], fill=(0,0,0,a))
    img = Image.alpha_composite(img, overlay_m)
    # Icon
    draw = ImageDraw.Draw(img)
    font_icon = try_load_font(40)
    draw.text((c['x']+135, c['y']+55), c['icon'], font=font_icon)
    # Badge
    img = gradient_bar(img, c['x']+22, c['y']+158, 56, 24, c['c1'], c['c2'])
    font_badge = try_load_font(11, bold=True)
    draw = ImageDraw.Draw(img)
    draw.text((c['x']+32, c['y']+165), c['type'], fill=(255,255,255,255), font=font_badge)
    # Title
    font_t = try_load_font(16, bold=True)
    draw.text((c['x']+22, c['y']+195), c['title'], fill=(28,28,30,255), font=font_t)
    # Desc
    font_d = try_load_font(12)
    draw.text((c['x']+22, c['y']+218), c['desc'], fill=(90,90,98,255), font=font_d)

# FAB
img = draw_glow_dot(img, W-65, H-65, 50, (0,113,227), 60)
draw = ImageDraw.Draw(img)
draw.ellipse([W-91, H-91, W-39, H-39], fill=(0,113,227,224), outline=(255,255,255,90))
font_fab = try_load_font(20)
draw.text((W-78, H-82), "⚙", fill=(255,255,255,255), font=font_fab)

# PAGINATION
img = draw_glass_card(img, 450, 810, 500, 44, radius=12, alpha=140)
font_pag = try_load_font(14)
draw = ImageDraw.Draw(img)
draw.text((530, 823), "← 上一页    第 1 / 3 页    下一页 →", fill=(90,90,98,255), font=font_pag)

img.save('/data/workspace/media-gallery/frontend_v3_glass.png')
print("✅ Frontend: frontend_v3_glass.png")

# ============ ADMIN PREVIEW ============
print("Generating admin preview...")
img2 = Image.new('RGBA', (W, H), (232, 234, 245, 255))
draw2 = ImageDraw.Draw(img2)

# Aurora
img2 = draw_radial_glow(img2, 200, 120, 320, (99,102,241), 41)
img2 = draw_radial_glow(img2, 1100, 180, 300, (168,85,247), 31)
img2 = draw_radial_glow(img2, 700, 650, 350, (56,189,248), 36)
draw2 = ImageDraw.Draw(img2)

# ADMIN NAV
draw2.rounded_rectangle([20, 10, W-20, 62], radius=14, fill=(255,255,255,115), outline=(255,255,255,140))
draw2.line([(20, 62), (W-20, 62)], fill=(255,255,255,115))
font_an = try_load_font(20, bold=True)
draw2.text((50, 25), "⚙ Gallery 后台", fill=(0,113,227,255), font=font_an)

# Tabs
tabs = [('📚 所有内容', True), ('⬆ 上传', False), ('⚙ 设置', False)]
tx = 380
for label, active in tabs:
    f = try_load_font(13, bold=active)
    tw = draw2.textlength(label, font=f) + 24
    if active:
        img2 = gradient_bar(img2, tx, 20, tw, 30, (0,113,227), (94,92,230))
        draw2.text((tx+12, 28), label, fill=(0,113,227,255), font=f)
    else:
        draw2.rounded_rectangle([tx, 20, tx+tw, 50], radius=10, fill=(255,255,255,102), outline=(255,255,255,128))
        draw2.text((tx+12, 28), label, fill=(90,90,98,255), font=f)
    tx += tw + 10

# STAT CARDS
stats = [
    {'label': '总内容', 'value': '42', 'c': (0,113,227)},
    {'label': '已发布', 'value': '38', 'c': (52,199,89)},
    {'label': '草稿', 'value': '4', 'c': (255,149,0)},
    {'label': '图片', 'value': '28', 'c': (94,92,230)},
]
for i, s in enumerate(stats):
    sx = 60 + i * 335
    img2 = draw_glow_dot(img2, sx+3, 130, 60, s['c'], 40)
    img2 = draw_glass_card(img2, sx, 90, 310, 80, radius=16, alpha=183)
    # Left accent bar
    c_half = (s['c'][0]//2, s['c'][1]//2, s['c'][2]//2)
    img2 = gradient_bar(img2, sx, 95, 3, 70, s['c'], c_half)
    draw2 = ImageDraw.Draw(img2)
    font_sl = try_load_font(11, bold=True)
    draw2.text((sx+18, 105), s['label'].upper(), fill=(154,154,162,255), font=font_sl)
    font_sv = try_load_font(30, bold=True)
    draw2.text((sx+18, 125), s['value'], fill=(28,28,30,255), font=font_sv)

# TOOLBAR
img2 = gradient_bar(img2, 80, 210, 155, 36, (0,113,227), (94,92,230))
draw2 = ImageDraw.Draw(img2)
font_btn = try_load_font(14, bold=True)
draw2.text((95, 222), "＋ 新建内容", fill=(255,255,255,255), font=font_btn)

# Search
img2 = draw_glass_card(img2, 700, 210, 280, 36, radius=10, alpha=153)
font_sr = try_load_font(13)
draw2 = ImageDraw.Draw(img2)
draw2.text((715, 222), "🔍 搜索标题…", fill=(154,154,162,255), font=font_sr)

# TABLE
img2 = draw_glass_card(img2, 60, 270, 1280, 420, radius=20, alpha=183)
draw2 = ImageDraw.Draw(img2)

# Header
draw2.rounded_rectangle([75, 280, 1325, 316], radius=14, fill=(255,255,255,90))
headers = ['☐', '标题 / URL', '类型', '分类', '状态', '浏览', '日期', '']
col_x = [80, 110, 550, 680, 800, 920, 1020, 1180]
font_th = try_load_font(11, bold=True)
for j, h in enumerate(headers):
    draw2.text((col_x[j], 290), h, fill=(154,154,162,255), font=font_th)

# Rows
rows = [
    {'title': '山间晨雾 — 摄影集', 'type': '🖼 图片', 'cat': '摄影', 'cat_c': (0,113,227), 'pub': True, 'views': '156', 'date': '2026-07-28'},
    {'title': '城市延时摄影', 'type': '🎬 视频', 'cat': '视频', 'cat_c': (255,45,85), 'pub': True, 'views': '89', 'date': '2026-07-25'},
    {'title': '关于创作的思考', 'type': '📝 文字', 'cat': '随笔', 'cat_c': (79,172,254), 'pub': False, 'views': '0', 'date': '2026-07-20'},
    {'title': '极简建筑', 'type': '🖼 图片', 'cat': '设计', 'cat_c': (94,92,230), 'pub': True, 'views': '234', 'date': '2026-07-15'},
    {'title': '海浪慢动作', 'type': '🎬 视频', 'cat': '摄影', 'cat_c': (0,113,227), 'pub': True, 'views': '67', 'date': '2026-07-10'},
    {'title': '旅行的意义', 'type': '📝 文字', 'cat': '随笔', 'cat_c': (79,172,254), 'pub': False, 'views': '0', 'date': '2026-07-05'},
]
font_rt = try_load_font(14)
font_rs = try_load_font(13)
font_rx = try_load_font(12)
for i, r in enumerate(rows):
    ry = 330 + i * 58
    if i % 2 == 0:
        draw2.rounded_rectangle([75, ry-8, 1325, ry+42], radius=4, fill=(255,255,255,64))
    # Checkbox
    draw2.rounded_rectangle([82, ry+2, 98, ry+18], radius=4, outline=(0,0,0,64))
    # Title
    draw2.text((110, ry+2), r['title'], fill=(0,113,227,255), font=font_rt)
    # Type
    draw2.text((550, ry+2), r['type'], fill=(28,28,30,255), font=font_rs)
    # Category chip
    img2 = gradient_bar(img2, 680, ry+4, 70, 22, r['cat_c'], (r['cat_c'][0]//2+128, r['cat_c'][1]//2+128, r['cat_c'][2]//2+128))
    draw2 = ImageDraw.Draw(img2)
    draw2.text((690, ry+9), r['cat'], fill=(255,255,255,255), font=font_rx)
    # Status
    if r['pub']:
        img2 = draw_glow_dot(img2, 815, ry+10, 20, (52,199,89), 80)
        draw2 = ImageDraw.Draw(img2)
        draw2.ellipse([810, ry+5, 820, ry+15], fill=(52,199,89,255))
        draw2.text((826, ry+2), '已发布', fill=(52,199,89,255), font=font_rx)
    else:
        img2 = draw_glow_dot(img2, 815, ry+10, 20, (255,149,0), 80)
        draw2 = ImageDraw.Draw(img2)
        draw2.ellipse([810, ry+5, 820, ry+15], fill=(255,149,0,255))
        draw2.text((826, ry+2), '草稿', fill=(255,149,0,255), font=font_rx)
    draw2.text((920, ry+2), r['views'], fill=(90,90,98,255), font=font_rs)
    draw2.text((1020, ry+2), r['date'], fill=(90,90,98,255), font=font_rx)
    draw2.text((1180, ry+2), '✏ 🗑', fill=(90,90,98,255), font=font_rx)

# PAGINATION
img2 = draw_glass_card(img2, 450, 720, 500, 40, radius=12, alpha=140)
font_p2 = try_load_font(13)
draw2 = ImageDraw.Draw(img2)
draw2.text((530, 733), "← 上一页    第 1 / 2 页    下一页 →", fill=(90,90,98,255), font=font_p2)

# MODAL
img2 = draw_glass_card(img2, 420, 300, 560, 340, radius=28, alpha=199)
# Top sheen
overlay_m = Image.new('RGBA', img2.size, (0,0,0,0))
od_m = ImageDraw.Draw(overlay_m)
od_m.rounded_rectangle([421, 301, 979, 380], radius=27, fill=(255,255,255,90))
img2 = Image.alpha_composite(img2, overlay_m)
draw2 = ImageDraw.Draw(img2)
font_mt = try_load_font(18, bold=True)
draw2.text((450, 320), "编辑内容", fill=(28,28,30,255), font=font_mt)

# Fields
font_lbl = try_load_font(11, bold=True)
font_fld = try_load_font(13)
draw2.text((450, 358), "标题", fill=(154,154,162,255), font=font_lbl)
draw2.rounded_rectangle([450, 366, 950, 396], radius=8, fill=(255,255,255,153), outline=(255,255,255,128))
draw2.text((460, 376), "山间晨雾 — 摄影集", fill=(28,28,30,255), font=font_fld)

draw2.text((450, 408), "描述", fill=(154,154,162,255), font=font_lbl)
draw2.rounded_rectangle([450, 416, 950, 466], radius=8, fill=(255,255,255,153), outline=(255,255,255,128))
draw2.text((460, 426), "清晨五点的山间，雾气缭绕如仙境", fill=(90,90,98,255), font=font_fld)

draw2.text((450, 478), "类型", fill=(154,154,162,255), font=font_lbl)
draw2.rounded_rectangle([450, 486, 570, 514], radius=8, fill=(255,255,255,153), outline=(255,255,255,128))
draw2.text((460, 496), "🖼 图片", fill=(28,28,30,255), font=font_fld)

# Preview panel
draw2.rounded_rectangle([450, 528, 950, 590], radius=12, fill=(255,255,255,128), outline=(255,255,255,115))
draw2.text((460, 538), "👁 预览", fill=(154,154,162,255), font=font_lbl)
draw2.text((460, 558), "🖼 山间晨雾 — 摄影集", fill=(28,28,30,255), font=font_fld)

# Buttons
draw2.rounded_rectangle([580, 630, 680, 662], radius=8, fill=(255,255,255,140), outline=(255,255,255,128))
draw2.text((595, 640), "取消", fill=(90,90,98,255), font=font_fld)
img2 = gradient_bar(img2, 700, 630, 120, 32, (0,113,227), (94,92,230))
draw2 = ImageDraw.Draw(img2)
draw2.text((718, 640), "🚀 发布", fill=(255,255,255,255), font=font_fld)

# TOAST
img2 = gradient_bar(img2, 500, 790, 400, 40, (52,199,89), (48,209,88))
draw2 = ImageDraw.Draw(img2)
font_toast = try_load_font(14, bold=True)
draw2.text((630, 802), "✅ 已发布成功", fill=(255,255,255,255), font=font_toast)

img2.save('/data/workspace/media-gallery/admin_v3_glass.png')
print("✅ Admin: admin_v3_glass.png")
print("\nDone! 🎉")
