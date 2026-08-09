#!/usr/bin/env python3
"""
Clean rebuild: create ONE commit with correct tree including .github/workflows/.
Uses git tree API (not Contents API) so .github paths work.
Excludes scripts that contain tokens.
"""
import os, json, base64, hashlib
from pathlib import Path
from collections import defaultdict, OrderedDict
import urllib.request, urllib.error

TOKEN = os.environ["GITHUB_TOKEN"]
OWNER, REPO, BRANCH = "zhx-111111", "media-gallery", "main"
BASE = f"https://api.github.com/repos/{OWNER}/{REPO}"
H = {"Authorization": f"token {TOKEN}", "Accept": "application/vnd.github+json"}

ROOT = Path("/data/workspace/media-gallery")

SKIP_NAMES = {
    "api_push.py","full_push.py","full_push2.py","push_api.py",
    "push_final.py","push_v7.py","git_push.sh","gen_v7.py","safe_push.py",
    "fix_workflow.py",
}
SKIP_DIRS = {".git",".wrangler","__pycache__","node_modules"}
SKIP_EXT = {".png",".zip",".jpg",".gif",".ico"}

def req(method, path, **kw):
    url = f"{BASE}/{path}" if not path.startswith("http") else path
    body = json.dumps(kw["json"]).encode() if "json" in kw else None
    r = urllib.request.Request(url, data=body, method=method, headers=H)
    try:
        with urllib.request.urlopen(r) as resp:
            return json.loads(resp.read().decode() or "{}")
    except urllib.error.HTTPError as e:
        print(f"  !! HTTP {e.code} {method} {url}"); print(f"     {e.read().decode()[:200]}")
        raise

# ---------- collect ----------
files = []
for p in sorted(ROOT.rglob("*")):
    if not p.is_file(): continue
    rel = p.relative_to(ROOT)
    if rel.name in SKIP_NAMES: continue
    if any(part in SKIP_DIRS for part in rel.parts): continue
    if rel.suffix in SKIP_EXT: continue
    files.append(p)

print(f"Files ({len(files)}):")
for f in files: print(f"  {f.relative_to(ROOT)}")

# ---------- base ----------
ref = req("GET", f"git/refs/heads/{BRANCH}")
base_sha = ref["object"]["sha"]
print(f"\nBase commit: {base_sha}")

# ---------- blobs ----------
blob = {}
for f in files:
    rel = str(f.relative_to(ROOT)).replace("\\","/")
    enc = base64.b64encode(f.read_bytes()).decode()
    r = req("POST","git/blobs", json={"content":enc,"encoding":"base64"})
    blob[rel] = r["sha"]
    print(f"  blob {r['sha'][:10]}  {rel}")

# ---------- group by parent dir ----------
# Use OrderedDict keyed by dir path. Root = ""
dir_of = defaultdict(list)  # dir_path -> [(name, rel_str)]
for f in files:
    rel = f.relative_to(ROOT)
    rel_s = str(rel).replace("\\","/")
    parent = str(rel.parent).replace("\\","/")
    if parent == ".": parent = ""
    dir_of[parent].append((rel.name, rel_s))

# depth
def depth(d): return d.count("/") + (1 if d else 0)
max_d = max(depth(d) for d in dir_of) if dir_of else 0

# bottom-up order: deepest first
order = sorted(dir_of.keys(), key=lambda d: -depth(d))
print(f"\nBuilding trees (bottom-up, max depth={max_d}):")

tree_sha = {}
for d in order:
    entries = []
    # files in this dir
    for name, rel_s in dir_of[d]:
        entries.append({"path":name,"mode":"100644","type":"blob","sha":blob[rel_s]})
    # subdirs already built (their name has no slash relative to us)
    prefix = d + "/" if d else ""
    for sub in dir_of:
        if sub == d: continue
        if not sub.startswith(prefix): continue
        rem = sub[len(prefix):]
        if "/" in rem: continue
        if sub in tree_sha:
            entries.append({"path":rem,"mode":"040000","type":"tree","sha":tree_sha[sub]})
    r = req("POST","git/trees", json={"tree":entries})
    tree_sha[d] = r["sha"]
    print(f"  {r['sha'][:10]}  '{d or '/'}'  ({len(entries)} entries)")

root_tree = tree_sha.get("", list(tree_sha.values())[-1])
print(f"\nRoot tree: {root_tree}")

# ---------- commit ----------
r = req("POST","git/commits", json={
    "message": "v7.0: 零配置 5 步网页部署\n\n参考 cloudmail 架构重构\nCF 控制台拉 git → 建库 → 绑库 → 自定义域 → 初始化 → 完成",
    "tree": root_tree, "parents": [base_sha]})
commit = r["sha"]
print(f"Commit: {commit}")

# ---------- update ref ----------
req("PATCH", f"git/refs/heads/{BRANCH}", json={"sha":commit,"force":False})
print(f"✅ Pushed! https://github.com/{OWNER}/{REPO}/tree/{BRANCH}")

# ---------- verify ----------
print("\n=== Verify recursive tree ===")
r = req("GET", f"git/trees/{commit}?recursive=1")
for t in r.get("tree",[]):
    if t["type"]=="blob":
        print(f"  {t['path']:45s} {t['size']:>8}  sha={t['sha'][:10]}")
print(f"Total blobs: {sum(1 for t in r.get('tree',[]) if t['type']=='blob')}")
