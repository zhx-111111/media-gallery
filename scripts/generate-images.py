#!/usr/bin/env python3
"""
Generate placeholder preview images for the media gallery (frontend + admin).
Uses only the standard library so it runs anywhere with Python 3.
"""
import json, math, os, random, zlib

# --- shared helpers ---------------------------------------------------------
def chunk(data, size=1):
    return [data[i:i+size] for i in range(0, len(data), size)]

def write_png(path, width, height, rgb_fn):
    """Write a minimal valid PNG."""
    def png_chunk(tag, data):
        return (len(data)).to_bytes(4,"big") + tag + data + zlib.crc32(tag+data).to_bytes(4,"big")

    sig = b"\x89PNG\r\n\x1a\n"
    ihdr = width.to_bytes(4,"big") + height.to_bytes(4,"big") + b"\x08\x02\x00\x00\x00"
    raw = b""
    for y in range(height):
        raw += b"\x00" + b"".join(bytes(rgb_fn(x,y)) for x in range(width))
    idat = zlib.compress(raw, 9)
    with open(path,"wb") as f:
        f.write(sig + png_chunk(b"IHDR", ihdr) + png_chunk(b"IDAT", idat) + png_chunk(b"IEND", b""))

# --- gradient backgrounds ----------------------------------------------------
def gradient_aurora(x, y, w, h):
    """Soft multi-color aurora gradient."""
    t = y / h
    u = x / w
    r = int(180 + 60*math.sin(t*3.1 + u*2) + 40*math.sin(u*1.7))
    g = int(150 + 50*math.sin(t*2.3 - u*1.3))
    b = int(220 + 30*math.sin(t*1.7 + u*2.5))
    return [min(255,max(0,c)) for c in (r,g,b)]

def gradient_cool(x, y, w, h):
    t = y/h
    return [int(245-30*t), int(247-20*t), int(252-10*t)]

def gradient_warm(x, y, w, h):
    t = y/h
    return [int(255-15*t), int(248-25*t), int(240-35*t)]

# --- card mock drawing -------------------------------------------------------
def draw_card(width, height, bg, accent, title, subtitle="", kind="image"):
    """Return pixel list for a rounded card preview."""
    px = [[None]*width for _ in range(height)]
    for y in range(height):
        for x in range(width):
            # background
            if bg == "aurora":
                px[y][x] = gradient_aurora(x,y,width,height)
            elif bg == "cool":
                px[y][x] = gradient_cool(x,y,width,height)
            else:
                px[y][x] = gradient_warm(x,y,width,height)
    # glass nav strip on top
    for y in range(0, 56):
        for x in range(width):
            a = 180 + int(40*math.sin(x/40))
            b = px[y][x]
            px[y][x] = [min(255,(b[0]*a)//255 + 40), min(255,(b[1]*a)//255 + 40), min(255,(b[2]*a)//255 + 60)]
    # media area
    mtop, mbot = 72, height-100
    for y in range(mtop, mbot):
        for x in range(24, width-24):
            ty = (y-mtop)/(mbot-mtop)
            r = int(accent[0]*(1-ty*0.4))
            g = int(accent[1]*(1-ty*0.4))
            b = int(accent[2]*(1-ty*0.3))
            px[y][x] = [r,g,b]
    # title bar
    for y in range(height-90, height-50):
        for x in range(36, width-36):
            px[y][x] = [60,60,67]
    return px

def pixels_to_rgb(px):
    for row in px:
        for c in row:
            yield from c

# --- generators --------------------------------------------------------------
def make_frontend(path):
    W, H = 1400, 900
    px = [[None]*W for _ in range(H)]
    for y in range(H):
        for x in range(W):
            px[y][x] = gradient_aurora(x,y,W,H)
    # top nav glass
    for y in range(0,68):
        for x in range(W):
            b = px[y][x]
            a = 200
            px[y][x] = [min(255,(b[0]*a)//255+30), min(255,(b[1]*a)//255+30), min(255,(b[2]*a)//255+50)]
    # big title area
    for y in range(100,220):
        for x in range(80,700):
            px[y][x] = [29,29,31]
    # 3 columns of cards
    cols = [(120,460),(500,840),(880,1220)]
    accents = [(0,113,227),(175,82,222),(255,59,48)]
    for ci,(x0,x1) in enumerate(cols):
        for y in range(260,760):
            for x in range(x0,x1):
                t = (y-260)/500
                a = accents[ci]
                px[y][x] = [int(a[0]*(1-t*0.5)), int(a[1]*(1-t*0.5)), int(a[2]*(1-t*0.3))]
        # card title
        for y in range(780,820):
            for x in range(x0+16,x1-16):
                px[y][x] = [50,50,55]
    write_png(path, W, H, lambda x,y: px[y][x])
    print(f"  → {path}")

def make_admin(path):
    W, H = 1400, 900
    px = [[None]*W for _ in range(H)]
    for y in range(H):
        for x in range(W):
            px[y][x] = gradient_cool(x,y,W,H)
    # top nav
    for y in range(0,64):
        for x in range(W):
            b = px[y][x]
            px[y][x] = [min(255,b[0]+20), min(255,b[1]+20), min(255,b[2]+30)]
    # sidebar-ish stats row
    for y in range(90,180):
        for x in range(60,W-60):
            px[y][x] = [255,255,255]
    # table area
    for y in range(210,840):
        for x in range(60,W-60):
            if y%100 < 96:
                px[y][x] = [250,250,253]
            else:
                px[y][x] = [230,230,235]
    # colored bars on stat cards
    for cx in [80, 400, 720, 1040]:
        for y in range(95,175):
            for x in range(cx,cx+10):
                px[y][x] = [0,113,227]
    write_png(path, W, H, lambda x,y: px[y][x])
    print(f"  → {path}")

if __name__ == "__main__":
    here = os.path.dirname(os.path.abspath(__file__))
    root = os.path.dirname(here)
    make_frontend(os.path.join(root, "frontend_v3_glass.png"))
    make_admin(os.path.join(root, "admin_v3_glass.png"))
    print("done")
