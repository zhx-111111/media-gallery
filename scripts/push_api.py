#!/usr/bin/env python3
"""通过 GitHub REST API 推送当前 commit（规避 git+token 403 问题）"""
import base64, json, os, subprocess, sys

import os
TOKEN=os.environ.get("GH_TOKEN","")
REPO="zhx-111111/media-gallery"
BRANCH="main"
API="https://api.github.com/repos/"+REPO

def gh(method,path,data=None,ct="application/json"):
    import urllib.request, urllib.error
    req=urllib.request.Request(API+path,method=method,
        headers={"Authorization":f"Bearer {TOKEN}","Accept":"application/vnd.github+json",
                 "X-GitHub-Api-Version":"2022-11-28",
                 "Content-Type":ct})
    if data is not None: req.data=json.dumps(data).encode() if isinstance(data,dict) else data
    try:
        with urllib.request.urlopen(req) as r: return json.loads(r.read().decode())
    except urllib.error.HTTPError as e:
        body=e.read().decode()
        print(f"❌ {method} {path} → {e.code}: {body[:500]}"); sys.exit(1)

# Get current commit SHA
r=gh("GET",f"/git/ref/heads/{BRANCH}")
cur_sha=r["object"]["sha"]
print(f"📌 current HEAD: {cur_sha[:8]}")

# Get current tree
c=gh("GET",f"/git/commits/{cur_sha}")
cur_tree=c["tree"]["sha"]
print(f"📌 current tree: {cur_tree[:8]}")

# Collect files to update (git diff)
def collect():
    out=subprocess.run(["git","ls-files","-m","-d","-o","--exclude-standard"],capture_output=True,text=True).stdout.strip().split("\n")
    files=[]
    for f in out:
        f=f.strip()
        if not f: continue
        if os.path.isfile(f):
            with open(f,"rb") as fh: content=fh.read()
            files.append((f,base64.b64encode(content).decode()))
        else:
            files.append((f,None))  # deleted
    # also include staged new files
    out2=subprocess.run(["git","diff","--name-only","HEAD"],capture_output=True,text=True).stdout.strip().split("\n")
    for f in out2:
        f=f.strip()
        if not f or f in [x[0] for x in files]: continue
        if os.path.isfile(f):
            with open(f,"rb") as fh: content=fh.read()
            files.append((f,base64.b64encode(content).decode()))
    return files

files=collect()
if not files:
    print("✅ nothing to push"); sys.exit(0)

print(f"📦 {len(files)} files to process")

# Build tree: for each file, create blob then add to tree
tree_items=[]
for path,content in files:
    if content is None:
        # deleted
        tree_items.append({"path":path,"mode":"100644","type":"blob","sha":None})
    else:
        blob=gh("POST","/git/blobs",{"content":content,"encoding":"base64"})
        tree_items.append({"path":path,"mode":"100644","type":"blob","sha":blob["sha"]})

# Create new tree
new_tree=gh("POST","/git/trees",{"base_tree":cur_tree,"tree":tree_items})
print(f"🌳 new tree: {new_tree['sha'][:8]}")

# Create commit
msg="v7.0: 参考 cloudmail 架构重构 — 5 步极简部署"
new_commit=gh("POST","/git/commits",{"message":msg,"tree":new_tree["sha"],"parents":[cur_sha]})
print(f"📝 new commit: {new_commit['sha'][:8]}")

# Update ref
gh("PATCH",f"/git/refs/heads/{BRANCH}",{"sha":new_commit["sha"]})
print(f"✅ pushed to {BRANCH} → {new_commit['sha'][:8]}")
