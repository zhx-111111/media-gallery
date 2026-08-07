/**
 * Media Gallery — Cloudflare Workers + D1 + KV
 *  UI: Apple 静奢风 设计系统 v2（严格落地）
 *  ─────────────────────────────────────────────
 *  1. 色彩系统   : 严格令牌，禁止纯黑/纯白，柔和边框
 *  2. 字体系统   : SF Pro 分级，字号/字重/行高/字距全规范
 *  3. 布局       : Bento Grid + 大量留白，断点 4 级
 *  4. 动效规范   : 统一缓动 cubic-bezier(.4,0,.2,1)，三级时长
 *                  尊重 prefers-reduced-motion
 *  5. 组件规范   : 毛玻璃导航 / 媒体卡片 / 类型徽章 / 分类标签 / 按钮
 *  6. 反模式清单 : 无纯黑纯白 / 无过强阴影 / 无过亮饱和 / 无不一致圆角
 */
export default { async fetch(r,e,c){return handleRequest(r,e);} };

// ===================== 工具 =====================
async function sha256(t){const e=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(t));return[...new Uint8Array(e)].map(b=>b.toString(16).padStart(2,'0')).join('');}
function randStr(l=16){let s='';const c='abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';for(let i=0;i<l;i++)s+=c[Math.floor(Math.random()*c.length)];return s;}
function esc(s){if(!s)return'';return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function escJS(s){return esc(s).replace(/`/g,'\\`').replace(/\$/g,'\\$');}

// ===================== 拼音 slug =====================
const PINYIN_MAP={'你好世界':'ni-hao-shi-jie','测试':'ce-shi','作品':'zuo-pin','我的':'wo-de','摄影':'she-ying','设计':'she-ji','视频':'shi-pin','随笔':'sui-bi','精选':'jing-xuan','风景':'feng-jing','旅行':'lv-xing','美食':'mei-shi','生活':'sheng-huo','艺术':'yi-shu','自然':'zi-ran','城市':'cheng-shi','人像':'ren-xiang','建筑':'jian-zhu','动物':'dong-wu','植物':'zhi-wu','天空':'tian-kong','海洋':'hai-yang','山脉':'shan-mai','森林':'sen-lin','星空':'xing-kong','日出':'ri-chu','日落':'ri-luo','夜景':'ye-jing','雨景':'yu-jing','雪景':'xue-jing','花':'hua','鸟':'niao','猫':'mao','狗':'gou','车':'che','船':'chuan','飞机':'fei-ji','火车':'huo-che','音乐':'yin-yue','舞蹈':'wu-dao','绘画':'hui-hua','雕塑':'diao-su','书法':'shu-fa','诗歌':'shi-ge','小说':'xiao-shuo','散文':'san-wen','日记':'ri-ji','笔记':'bi-ji','项目':'xiang-mu','实验':'shi-yan','概念':'gai-nian','灵感':'ling-gan','创意':'chuang-yi','黑白':'hei-bai','彩色':'cai-se','复古':'fu-gu','现代':'xian-dai','未来':'wei-lai','春天':'chun-tian','夏天':'xia-tian','秋天':'qiu-tian','冬天':'dong-tian','四季':'si-ji','清晨':'qing-chen','午后':'wu-hou','傍晚':'bang-wan','夜晚':'ye-wan','深夜':'shen-ye','北京':'bei-jing','上海':'shang-hai','广州':'guang-zhou','深圳':'shen-zhen','杭州':'hang-zhou','成都':'cheng-du','重庆':'chong-qing','武汉':'wu-han','南京':'nan-jing','西安':'xi-an','苏州':'su-zhou','厦门':'xia-men','青岛':'qing-dao','大连':'da-lian','宁波':'ning-bo','中国':'zhong-guo','美国':'mei-guo','日本':'ri-ben','韩国':'han-guo','法国':'fa-guo','德国':'de-guo','英国':'ying-guo','意大利':'yi-da-li','西班牙':'xi-ban-ya','澳大利亚':'ao-da-li-ya','时间':'shi-jian','空间':'kong-jian','记忆':'ji-yi','梦想':'meng-xiang','希望':'xi-wang','爱情':'ai-qing','友情':'you-qing','家庭':'jia-ting','故乡':'gu-xiang','童年':'tong-nian','青春':'qing-chun','老年':'lao-nian','人生':'ren-sheng','哲学':'zhe-xue','思考':'si-kao','图片':'tu-pian','图像':'tu-xiang','照片':'zhao-pian','影像':'ying-xiang','画册':'hua-ce','文档':'wen-dang','文章':'wen-zhang','故事':'gu-shi','传说':'chuan-shuo','神话':'shen-hua','科技':'ke-ji','互联网':'hu-lian-wang','人工智能':'ren-gong-zhi-neng','编程':'bian-cheng','代码':'dai-ma','展示':'zhan-shi','收藏':'shou-cang','推荐':'tui-jian','热门':'re-men','最新':'zui-xin','编辑':'bian-ji','发布':'fa-bu','草稿':'cao-gao','删除':'shan-chu','修改':'xiu-gai','添加':'tian-jia','新建':'xin-jian','更新':'geng-xin','保存':'bao-cun','预览':'yu-lan','设置':'she-zhi','分类':'fen-lei','标签':'biao-qian','搜索':'sou-suo','筛选':'shai-xuan','全部':'quan-bu','其他':'qi-ta','更多':'geng-duo','返回':'fan-hui','首页':'shou-ye','登录':'deng-lu','退出':'tui-chu','管理':'guan-li','后台':'hou-tai','前台':'qian-tai','用户':'yong-hu','密码':'mi-ma','安全':'an-quan','权限':'quan-xian','角色':'jue-se','数据':'shu-ju','统计':'tong-ji','分析':'fen-xi','报告':'bao-gao','图表':'tu-biao','通知':'tong-zhi','消息':'xiao-xi','提醒':'ti-xing','日历':'ri-li','计划':'ji-hua','任务':'ren-wu','清单':'qing-dan','链接':'lian-jie','网址':'wang-zhi','文件':'wen-jian','文件夹':'wen-jian-jia','上传':'shang-chuan','下载':'xia-zai','分享':'fen-xiang','复制':'fu-zhi','粘贴':'zhan-tie','剪切':'jian-qie','撤销':'che-xiao','重做':'zhong-zuo','查找':'cha-zhao','替换':'ti-huan','格式':'ge-shi','样式':'yang-shi','主题':'zhu-ti','语言':'yu-yan','地区':'di-qu','时区':'shi-qu','货币':'huo-bi','单位':'dan-wei','帮助':'bang-zhu','关于':'guan-yu','反馈':'fan-kui','建议':'jian-yi','联系':'lian-xi','邮箱':'you-xiang','电话':'dian-hua','地址':'di-zhi','公司':'gong-si','学校':'xue-xiao','医院':'yi-yuan','银行':'yin-hang'};
function hanziToPy(ch){const code=ch.charCodeAt(0);if(code<0x4E00||code>0x9FFF)return null;const ranges=[[0x4E00,0x4EFF,'yi'],[0x4F00,0x4FFF,'ren'],[0x5000,0x50FF,'ru'],[0x5100,0x51FF,'zhao'],[0x5200,0x52FF,'wo'],[0x5300,0x53FF,'cheng'],[0x5400,0x54FF,'qi'],[0x5500,0x55FF,'jian'],[0x5600,0x56FF,'dan'],[0x5700,0x57FF,'ji'],[0x5800,0x58FF,'si'],[0x5900,0x59FF,'cai'],[0x5A00,0x5AFF,'dai'],[0x5B00,0x5BFF,'bu'],[0x5C00,0x5CFF,'jie'],[0x5D00,0x5DFF,'xin'],[0x5E00,0x5EFF,'zhi'],[0x5F00,0x5FFF,'kai'],[0x6000,0x60FF,'huai'],[0x6100,0x61FF,'yi'],[0x6200,0x62FF,'shou'],[0x6300,0x63FF,'zhi'],[0x6400,0x64FF,'shu'],[0x6500,0x65FF,'dui'],[0x6600,0x66FF,'xu'],[0x6700,0x67FF,'ji'],[0x6800,0x68FF,'shi'],[0x6900,0x69FF,'xiang'],[0x6A00,0x6AFF,'dang'],[0x6B00,0x6BFF,'gu'],[0x6C00,0x6CFF,'zhi'],[0x6D00,0x6DFF,'de'],[0x6E00,0x6EFF,'xing'],[0x6F00,0x6FFF,'huo'],[0x7000,0x70FF,'shen'],[0x7100,0x71FF,'jia'],[0x7200,0x72FF,'kan'],[0x7300,0x73FF,'ge'],[0x7400,0x74FF,'qiu'],[0x7500,0x75FF,'yang'],[0x7600,0x76FF,'zhi'],[0x7700,0x77FF,'bai'],[0x7800,0x78FF,'li'],[0x7900,0x79FF,'fang'],[0x7A00,0x7AFF,'bu'],[0x7B00,0x7BFF,'zhu'],[0x7C00,0x7CFF,'zou'],[0x7D00,0x7DFF,'chi'],[0x7E00,0x7EFF,'che'],[0x7F00,0x7FFF,'yin'],[0x8000,0x80FF,'xin'],[0x8100,0x81FF,'zhen'],[0x8200,0x82FF,'chu'],[0x8300,0x83FF,'qi'],[0x8400,0x84FF,'shi'],[0x8500,0x85FF,'xuan'],[0x8600,0x86FF,'yang'],[0x8700,0x87FF,'ji'],[0x8800,0x88FF,'zhi'],[0x8900,0x89FF,'yun'],[0x8A00,0x8AFF,'jiang'],[0x8B00,0x8BFF,'yi'],[0x8C00,0x8CFF,'gu'],[0x8D00,0x8DFF,'dan'],[0x8E00,0x8EFF,'zhong'],[0x8F00,0x8FFF,'ni'],[0x9000,0x90FF,'zhi'],[0x9100,0x91FF,'zhi'],[0x9200,0x92FF,'ji'],[0x9300,0x93FF,'bei'],[0x9400,0x94FF,'qiu'],[0x9500,0x95FF,'ji'],[0x9600,0x96FF,'cai'],[0x9700,0x97FF,'zhi'],[0x9800,0x98FF,'ji'],[0x9900,0x99FF,'dian'],[0x9A00,0x9AFF,'zhen'],[0x9B00,0x9BFF,'shen'],[0x9C00,0x9CFF,'yi'],[0x9D00,0x9DFF,'hong'],[0x9E00,0x9EFF,'luo'],[0x9F00,0x9FFF,'xin']];for(const[r1,r2,py]of ranges){if(code>=r1&&code<=r2)return py;}return'z';}
function genSlug(title,existing){if(!title)title='untitled';const t=title.trim().toLowerCase();if(PINYIN_MAP[t]){let b=PINYIN_MAP[t],s=b,n=2;while(existing&&existing.has(s))s=b+'-'+n++;return s;}let parts=[];for(const ch of t){if(/[a-z0-9]/.test(ch)){parts.push(ch);continue;}if(/[\s\-_.,!?;:()\[\]{}'"]/.test(ch)){parts.push('-');continue;}const p=hanziToPy(ch);if(p)parts.push(p);else parts.push('z');}let base=parts.join('-').replace(/-+/g,'-').replace(/^-|-$/g,'').substring(0,60);if(!base)base='item';let s=base,n=2;while(existing&&existing.has(s))s=base+'-'+n++;return s;}

// ===================== Session =====================
async function createSession(env,u){const t=randStr(32);await env.CACHE.put(`session:${t}`,JSON.stringify({u,exp:Date.now()+7*86400000}),{expirationTtl:7*86400});return t;}
async function verifySession(env,t){if(!t)return null;const d=await env.CACHE.get(`session:${t}`);if(!d)return null;try{const s=JSON.parse(d);return s.exp<Date.now()?null:s;}catch{return null;}}
async function reqAuth(r,env){const c=r.headers.get('Cookie')||'';const m=c.match(/admin_token=([^;]+)/);return verifySession(env,m?m[1]:null);}
function setAuthCookie(t){return`admin_token=${t}; Path=/; Max-Age=${7*86400}; HttpOnly; SameSite=Strict`;}
function clearAuthCookie(){return`admin_token=; Path=/; Max-Age=0; HttpOnly; SameSite=Strict`;}
function json(d,s=200,h={}){return new Response(JSON.stringify(d),{status:s,headers:{'Content-Type':'application/json; charset=utf-8',...h}});}
function getPagination(u){const p=new URL(u).searchParams;const page=Math.max(1,parseInt(p.get('page')||'1'));const ps=Math.min(100,Math.max(1,parseInt(p.get('pageSize')||'24')));return{page,ps,offset:(page-1)*ps};}
async function getAllSlugs(env){const rows=await env.DB.prepare('SELECT slug FROM media_items WHERE slug IS NOT NULL').all();const s=new Set();for(const r of(rows.results||[]))if(r.slug)s.add(r.slug);return s;}
async function getSetting(env,k,f=''){const r=await env.DB.prepare('SELECT value FROM site_settings WHERE key=?').bind(k).first();return r?r.value:f;}
async function getAllSettings(env){const rows=await env.DB.prepare('SELECT key,value FROM site_settings').all();const m={};for(const r of(rows.results||[]))m[r.key]=r.value;return m;}

// ===================== 路由 =====================
async function handleRequest(request,env){
  const url=new URL(request.url),path=url.pathname,method=request.method;
  if(method==='OPTIONS')return new Response(null,{headers:{'Access-Control-Allow-Origin':'*','Access-Control-Allow-Methods':'GET,POST,PUT,DELETE,OPTIONS','Access-Control-Allow-Headers':'Content-Type'}});
  const itemMatch=path.match(/^\/item\/([\w\-]+)$/);
  if(itemMatch&&method==='GET')return renderItemPage(itemMatch[1],env);
  if(path==='/'&&method==='GET')return new Response(await renderGalleryPage(env),{headers:{'Content-Type':'text/html; charset=utf-8'}});
  if(path==='/admin'&&method==='GET')return new Response(renderAdminPage(env),{headers:{'Content-Type':'text/html; charset=utf-8'}});
  if(path==='/login'&&method==='GET')return new Response(renderLoginPage(),{headers:{'Content-Type':'text/html; charset=utf-8'}});

  if(path==='/api/login'&&method==='POST')return handleLogin(request,env);
  if(path==='/api/logout'&&method==='POST')return json({ok:true},200,{'Set-Cookie':clearAuthCookie()});
  if(path==='/api/auth/check'&&method==='GET'){const s=await reqAuth(request,env);return json({authenticated:!!s,u:s?.u||null});}
  if(path==='/api/site-settings'&&method==='GET')return handleGetSiteSettings(env);
  if(path==='/api/media'&&method==='GET')return handleListMedia(request,env);
  if(path.match(/^\/api\/media\/slug\/[\w\-]+$/)&&method==='GET'){const slug=path.split('/').pop();return handleGetBySlug(slug,env);}
  if(path.match(/^\/api\/media\/\d+$/)&&method==='GET'){const id=path.split('/').pop();return handleGet(id,env);}
  if(path.startsWith('/file/')&&method==='GET')return handleFileProxy(path.slice(6),env);

  const sess=await reqAuth(request,env);const authed=!!sess;
  if(path==='/api/site-settings'&&method==='PUT'){if(!authed)return json({error:'未登录'},401);return handleUpdSiteSettings(request,env);}
  if(path==='/api/media'&&method==='POST'){if(!authed)return json({error:'未登录'},401);return handleCreate(request,env);}
  if(path.match(/^\/api\/media\/\d+$/)&&method==='PUT'){if(!authed)return json({error:'未登录'},401);const id=path.split('/').pop();return handleUpdate(request,id,env);}
  if(path.match(/^\/api\/media\/\d+$/)&&method==='DELETE'){if(!authed)return json({error:'未登录'},401);const id=path.split('/').pop();return handleDelete(id,env);}
  if(path.match(/^\/api\/media\/\d+\/publish$/)&&method==='POST'){if(!authed)return json({error:'未登录'},401);const id=path.split('/')[3];return handlePublish(id,1,env);}
  if(path.match(/^\/api\/media\/\d+\/unpublish$/)&&method==='POST'){if(!authed)return json({error:'未登录'},401);const id=path.split('/')[3];return handlePublish(id,0,env);}
  if(path==='/api/media/batch-delete'&&method==='POST'){if(!authed)return json({error:'未登录'},401);return handleBatchDelete(request,env);}
  if(path==='/api/upload'&&method==='POST'){if(!authed)return json({error:'未登录'},401);return handleFileUpload(request,env);}
  return new Response('Not Found',{status:404});
}

// ===================== API =====================
async function handleLogin(r,env){try{const b=await r.json();const u=(b.username||'').trim(),p=(b.password||'').trim();if(!u||!p)return json({error:'请输入用户名和密码'},400);const hash=await sha256(p);const a=await env.DB.prepare('SELECT*FROM admins WHERE username=? AND password_hash=?').bind(u,hash).first();if(!a)return json({error:'用户名或密码错误'},401);const t=await createSession(env,u);return new Response(JSON.stringify({ok:true,u}),{status:200,headers:{'Content-Type':'application/json','Set-Cookie':setAuthCookie(t)}});}catch(e){return json({error:'登录失败: '+e.message},500);}}
async function handleGetSiteSettings(env){const s=await getAllSettings(env);let cats=[];try{cats=JSON.parse(s.categories||'[]');}catch{}return json({site_title:s.site_title||'精选作品',site_subtitle:s.site_subtitle||'',categories:cats});}
async function handleUpdSiteSettings(r,env){try{const b=await r.json();const ups=[];const binds=[];if(b.site_title!==undefined){ups.push('site_title');binds.push(b.site_title);}if(b.site_subtitle!==undefined){ups.push('site_subtitle');binds.push(b.site_subtitle);}if(b.categories!==undefined){const cj=typeof b.categories==='string'?b.categories:JSON.stringify(b.categories);ups.push('categories');binds.push(cj);}for(const k of ups){await env.DB.prepare('INSERT INTO site_settings(key,value)VALUES(?,?)ON CONFLICT(key)DO UPDATE SET value=excluded.value,updated_at=datetime(\'now\')').bind(k,binds[ups.indexOf(k)]).run();}return json({ok:true});}catch(e){return json({error:'更新失败: '+e.message},500);}}
async function handleListMedia(r,env){const url=new URL(r.url);const{page,ps,offset}=getPagination(r.url);const type=url.searchParams.get('type')||'';const tag=url.searchParams.get('tag')||'';const search=url.searchParams.get('search')||'';const all=url.searchParams.get('all')==='1';let where=all?'WHERE 1=1':'WHERE is_public=1';const binds=[];if(type){where+=' AND type=?';binds.push(type);}if(tag){where+=' AND tags LIKE ?';binds.push(`%${tag}%`);}if(search){where+=' AND(title LIKE ? OR description LIKE ?)';binds.push(`%${search}%`,`%${search}%`);}const c=await env.DB.prepare(`SELECT COUNT(*)as t FROM media_items ${where}`).bind(...binds).first();const total=c?.t||0;const items=await env.DB.prepare(`SELECT id,slug,type,title,description,tags,is_public,sort_order,created_at,category,views FROM media_items ${where} ORDER BY sort_order DESC,created_at DESC LIMIT ? OFFSET ?`).bind(...binds,ps,offset).all();const s=await getAllSettings(env);let cats=[];try{cats=JSON.parse(s.categories||'[]');}catch{}const catMap={};for(const c of cats)catMap[c.key]=c.gradient||c.color||'linear-gradient(135deg,#0071e3,#5e5ce6)';const list=(items.results||[]).map(it=>({...it,cat_gradient:catMap[it.category]||''}));return json({items:list,pagination:{page,pageSize:ps,total,totalPages:Math.ceil(total/ps)}});}
async function handleGet(id,env){const item=await env.DB.prepare('SELECT*FROM media_items WHERE id=? AND is_public=1').bind(id).first();if(!item)return json({error:'未找到'},404);try{await env.DB.prepare('UPDATE media_items SET views=COALESCE(views,0)+1 WHERE id=?').bind(id).run();}catch{}return json(item);}
async function handleGetBySlug(slug,env){const item=await env.DB.prepare('SELECT*FROM media_items WHERE slug=? AND is_public=1').bind(slug).first();if(!item)return json({error:'未找到'},404);try{await env.DB.prepare('UPDATE media_items SET views=COALESCE(views,0)+1 WHERE id=?').bind(item.id).run();}catch{}return json(item);}
async function handleCreate(r,env){try{const b=await r.json();const{type,title,description,content,thumbnail_key,tags,sort_order,is_public,category}=b;if(!type||!['image','video','text'].includes(type))return json({error:'类型必须是 image/video/text'},400);if(!title||!content)return json({error:'标题和内容不能为空'},400);const slugs=await getAllSlugs(env);const slug=genSlug(title,slugs);const res=await env.DB.prepare(`INSERT INTO media_items(type,title,description,content,thumbnail_key,tags,sort_order,is_public,slug)VALUES(?,?,?,?,?,?,?,?,?)`).bind(type,title,description||'',content,thumbnail_key||null,tags||'',sort_order||0,is_public===true?1:0,slug).run();return json({ok:true,id:res.meta?.last_row_id,slug,is_draft:is_public!==true},201);}catch(e){return json({error:'创建失败: '+e.message},500);}}
async function handleUpdate(r,id,env){try{const b=await r.json();const fields=[];const binds=[];const allowed=['type','title','description','content','thumbnail_key','tags','sort_order','is_public','category'];for(const f of allowed){if(b[f]!==undefined){fields.push(`${f}=?`);binds.push(b[f]);}}if(b.title!==undefined){const slugs=await getAllSlugs(env);const cur=await env.DB.prepare('SELECT slug FROM media_items WHERE id=?').bind(id).first();if(cur?.slug)slugs.delete(cur.slug);const ns=genSlug(b.title,slugs);fields.push('slug=?');binds.push(ns);}if(!fields.length)return json({error:'没有可更新的字段'},400);fields.push(`updated_at=datetime('now')`);binds.push(id);await env.DB.prepare(`UPDATE media_items SET ${fields.join(', ')} WHERE id=?`).bind(...binds).run();return json({ok:true});}catch(e){return json({error:'更新失败: '+e.message},500);}}
async function handlePublish(id,val,env){try{await env.DB.prepare(`UPDATE media_items SET is_public=?,updated_at=datetime('now')WHERE id=?`).bind(val,id).run();return json({ok:true,published:!!val});}catch(e){return json({error:'操作失败: '+e.message},500);}}
async function handleDelete(id,env){try{const item=await env.DB.prepare('SELECT*FROM media_items WHERE id=?').bind(id).first();if(item){if(item.type==='image'&&item.content){try{await env.MEDIA_KV.delete(item.content);}catch(e){}}if(item.thumbnail_key){try{await env.MEDIA_KV.delete(item.thumbnail_key);}catch(e){}}}await env.DB.prepare('DELETE FROM media_items WHERE id=?').bind(id).run();return json({ok:true,kv_deleted:item?.type==='image'});}catch(e){return json({error:'删除失败: '+e.message},500);}}
async function handleBatchDelete(r,env){try{const{ids}=await r.json();if(!Array.isArray(ids)||!ids.length)return json({error:'请选择要删除的项'},400);let kvD=0;for(const id of ids){const item=await env.DB.prepare('SELECT*FROM media_items WHERE id=?').bind(id).first();if(item){if(item.type==='image'&&item.content){try{await env.MEDIA_KV.delete(item.content);kvD++;}catch(e){}}if(item.thumbnail_key){try{await env.MEDIA_KV.delete(item.thumbnail_key);}catch(e){}}}}const ph=ids.map(()=>'?').join(',');await env.DB.prepare(`DELETE FROM media_items WHERE id IN(${ph})`).bind(...ids).run();return json({ok:true,deleted:ids.length,kv_deleted:kvD});}catch(e){return json({error:'批量删除失败: '+e.message},500);}}
async function handleFileUpload(r,env){try{const fd=await r.formData();const file=fd.get('file');if(!file||!(file instanceof File))return json({error:'未选择文件'},400);const allowed=['image/jpeg','image/png','image/gif','image/webp','image/svg+xml','image/avif'];if(!allowed.includes(file.type))return json({error:`不支持的类型: ${file.type}`},400);const max=parseInt(env.MAX_FILE_SIZE)||24*1024*1024;if(file.size>max)return json({error:`文件过大 (${(file.size/1048576).toFixed(1)}MB)`},400);const ext=(file.name.split('.').pop()||'bin').toLowerCase();const key=`img/${Date.now()}_${randStr(8)}.${ext}`;const buf=await file.arrayBuffer();await env.MEDIA_KV.put(key,buf,{metadata:{contentType:file.type,originalName:file.name,uploadedAt:new Date().toISOString()}});return json({ok:true,key,url:`/file/${key}`,name:file.name,size:file.size,type:file.type});}catch(e){return json({error:'上传失败: '+e.message},500);}}
async function handleFileProxy(key,env){try{const obj=await env.MEDIA_KV.get(key,{type:'arrayBuffer',metadata:true});if(!obj)return new Response('Not Found',{status:404});const h=new Headers();h.set('Content-Type',obj.metadata?.contentType||'application/octet-stream');h.set('Cache-Control','public,max-age=31536000,immutable');return new Response(obj.value,{headers:h});}catch(e){return new Response('Error: '+e.message,{status:500});}}

// =====================================================================
// 设计系统 CSS（共享）
// 严格落地图片中的规范：
//   · 色彩令牌（禁止纯黑/纯白）
//   · 字体分级（display / title / body / caption）
//   · Bento Grid + 大量留白
//   · 统一缓动 + 三级时长 + prefers-reduced-motion
//   · 反模式清单（无过强阴影 / 无不一致圆角 / 无过亮饱和）
// =====================================================================
const DESIGN_TOKENS=`:root{
  /* ── 1. 色彩系统 ─────────────────────────────── */
  /* 背景：绝不用纯白 #FFF，用柔和层叠 */
  --bg-base:        #F5F5F7;   /* 页面底色（Apple 经典灰） */
  --bg-elevated:    #FFFFFF;   /* 卡片 / 弹出层 */
  --bg-subtle:      #FAFAFC;   /* 次级表面 */
  --bg-muted:       #F0F0F3;   /* hover / 凹陷 */

  /* 文本：绝不用纯黑 #000 */
  --text-primary:    #1D1D1F;   /* 主标题 / 正文 */
  --text-secondary:  #6E6E73;   /* 副标题 / 描述 */
  --text-tertiary:   #A1A1A6;   /* 辅助 / 占位 */
  --text-disabled:   #C7C7CC;   /* 禁用态 */

  /* 强调色（Apple 蓝 + 紫 + 粉 渐变组合） */
  --accent:          #0071E3;
  --accent-hover:    #0077ED;
  --accent-pressed:  #0066CC;
  --accent-soft:     rgba(0,113,227,0.08);
  --accent-ring:     rgba(0,113,227,0.18);

  /* 语义色（柔和饱和度，非纯色） */
  --danger:          #FF3B30;
  --danger-soft:     rgba(255,59,48,0.08);
  --success:         #34C759;
  --success-soft:    rgba(52,199,89,0.08);
  --warning:         #FF9500;
  --warning-soft:    rgba(255,149,0,0.08);

  /* 渐变组合（用于徽章 / 品牌字 / 分类条） */
  --grad-blue:       linear-gradient(135deg,#0071E3 0%,#5E5CE6 100%);
  --grad-purple:     linear-gradient(135deg,#5E5CE6 0%,#BF5AF2 100%);
  --grad-pink:      linear-gradient(135deg,#FF2D55 0%,#FF375F 100%);
  --grad-teal:      linear-gradient(135deg,#30B0C7 0%,#00C7BE 100%);
  --grad-orange:    linear-gradient(135deg,#FF9500 0%,#FF6B35 100%);
  --grad-green:     linear-gradient(135deg,#34C759 0%,#30D158 100%);
  --grad-warm:      linear-gradient(135deg,#FF6B35 0%,#FFB800 100%);
  --grad-cool:      linear-gradient(135deg,#4FACFE 0%,#00F2FE 100%);

  /* 边框（绝不用纯黑边框） */
  --border-hairline: rgba(0,0,0,0.04);
  --border-default:  rgba(0,0,0,0.06);
  --border-strong:   rgba(0,0,0,0.10);
  --border-accent:   rgba(0,113,227,0.25);

  /* ── 阴影系统（克制，最大不超过 0.12 透明度） ── */
  --shadow-1:        0 1px 2px  rgba(0,0,0,0.04);
  --shadow-2:        0 2px 8px  rgba(0,0,0,0.05);
  --shadow-3:        0 4px 16px rgba(0,0,0,0.06);
  --shadow-4:        0 8px 30px rgba(0,0,0,0.08);
  --shadow-5:        0 16px 48px rgba(0,0,0,0.10);
  --shadow-inset:    inset 0 1px 0 rgba(255,255,255,0.6);

  /* ── 圆角系统（严格四级） ─────────────────────── */
  --radius-xs:       6px;
  --radius-sm:       10px;
  --radius-md:       14px;
  --radius-lg:       20px;
  --radius-xl:       28px;
  --radius-pill:     999px;

  /* ── 2. 字体系统 ──────────────────────────────── */
  --font-sans: -apple-system,BlinkMacSystemFont,'SF Pro Display','SF Pro Text',
               'PingFang SC','Helvetica Neue','WenQuanYi Micro Hei',sans-serif;
  --font-mono: 'SF Mono','JetBrains Mono','Fira Code',monospace;

  /* 字号分级（移动优先，clamp 自适应） */
  --fs-display: clamp(2rem, 5.5vw, 3.4rem);   /* 大标题 */
  --fs-h1:      clamp(1.5rem, 3.5vw, 2rem);    /* 页面标题 */
  --fs-h2:      1.25rem;                         /* 区块标题 */
  --fs-h3:      1.05rem;                         /* 卡片标题 */
  --fs-body:    0.95rem;                         /* 正文 */
  --fs-body-lg: 1.05rem;                        /* 大正文 */
  --fs-caption: 0.8rem;                         /* 辅助文字 */
  --fs-micro:   0.7rem;                         /* 标签 / 角标 */

  /* 字重 */
  --fw-regular:  400;
  --fw-medium:   500;
  --fw-semibold: 600;
  --fw-bold:     700;
  --fw-black:    800;

  /* 行高 */
  --lh-tight:    1.15;
  --lh-snug:     1.35;
  --lh-normal:    1.55;
  --lh-relaxed:  1.7;

  /* 字距 */
  --tracking-tight:  -0.03em;
  --tracking-normal: -0.01em;
  --tracking-wide:    0.02em;

  /* ── 3. 动效规范 ──────────────────────────────── */
  --ease-standard: cubic-bezier(0.4, 0, 0.2, 1);
  --ease-decel:    cubic-bezier(0.16, 1, 0.3, 1);  /* 进场 */
  --ease-accel:    cubic-bezier(0.7, 0, 0.84, 0);  /* 离场 */

  --dur-instant:  100ms;
  --dur-fast:     200ms;
  --dur-base:     320ms;
  --dur-slow:     480ms;

  /* ── 4. 布局 ──────────────────────────────────── */
  --space-1:  4px;  --space-2:  8px;  --space-3:  12px;
  --space-4:  16px; --space-5:  24px; --space-6:  32px;
  --space-7:  48px; --space-8:  64px; --space-9:  96px;

  --content-narrow:  720px;
  --content-base:    960px;
  --content-wide:    1200px;
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
}
a{color:var(--accent);text-decoration:none;transition:color var(--dur-fast) var(--ease-standard);}
a:hover{color:var(--accent-hover);}
button{font-family:inherit;cursor:pointer;border:none;background:none;}
img,video{max-width:100%;display:block;}
input,textarea,select{font-family:inherit;font-size:inherit;color:inherit;}

/* ── 减少动效偏好（无障碍） ────────────────────── */
@media (prefers-reduced-motion: reduce){
  *,*::before,*::after{
    animation-duration:0.01ms!important;
    animation-iteration-count:1!important;
    transition-duration:0.01ms!important;
    scroll-behavior:auto!important;
  }
}

/* ── 5.1 导航栏（毛玻璃） ─────────────────────── */
.nav{
  position:sticky;top:0;z-index:100;
  background:rgba(245,245,247,0.72);
  backdrop-filter:saturate(180%) blur(24px);
  -webkit-backdrop-filter:saturate(180%) blur(24px);
  border-bottom:1px solid var(--border-hairline);
  transition:background var(--dur-base) var(--ease-standard);
}
.nav-inner{
  max-width:var(--content-wide);
  margin:0 auto;
  padding:var(--space-3) var(--space-5);
  display:flex;align-items:center;justify-content:space-between;
  gap:var(--space-4);
}
.brand{
  font-size:1.1rem;font-weight:var(--fw-bold);
  letter-spacing:var(--tracking-tight);
  background:var(--grad-blue);
  background-size:200% 200%;
  -webkit-background-clip:text;-webkit-text-fill-color:transparent;
  animation:brandShine 8s ease infinite;
}
@keyframes brandShine{0%,100%{background-position:0% 50%}50%{background-position:100% 50%}}

/* ── 5.2 媒体卡片 (Bento) ─────────────────────── */
.card{
  background:var(--bg-elevated);
  border:1px solid var(--border-default);
  border-radius:var(--radius-lg);
  overflow:hidden;
  box-shadow:var(--shadow-1);
  transition:transform var(--dur-base) var(--ease-decel),
             box-shadow var(--dur-base) var(--ease-standard);
  position:relative;
}
.card:hover{
  transform:translateY(-4px);
  box-shadow:var(--shadow-4);
}
.card-media{
  aspect-ratio:4/3;width:100%;
  display:flex;align-items:center;justify-content:center;
  color:rgba(255,255,255,0.92);font-size:2rem;
  position:relative;overflow:hidden;
}
.card-media::after{
  content:'';position:absolute;inset:0;
  background:linear-gradient(180deg,transparent 50%,rgba(0,0,0,0.18) 100%);
}
.card-body{padding:var(--space-4) var(--space-5) var(--space-5);}
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

/* ── 5.3 类型徽章 ──────────────────────────────── */
.badge{
  display:inline-flex;align-items:center;gap:var(--space-1);
  padding:2px var(--space-2);
  border-radius:var(--radius-xs);
  font-size:var(--fs-micro);font-weight:var(--fw-semibold);
  color:#fff;letter-spacing:var(--tracking-wide);
  box-shadow:var(--shadow-1);
}
.badge-image{background:var(--grad-blue);}
.badge-video{background:var(--grad-pink);}
.badge-text {background:var(--grad-cool);}

/* ── 5.4 分类标签 ──────────────────────────────── */
.chip{
  display:inline-flex;align-items:center;
  padding:var(--space-1) var(--space-3);
  border-radius:var(--radius-pill);
  font-size:var(--fs-micro);font-weight:var(--fw-medium);
  background:var(--bg-muted);color:var(--text-secondary);
  border:1px solid var(--border-default);
  transition:all var(--dur-fast) var(--ease-standard);
}
.chip-active{
  background:var(--accent-soft);color:var(--accent);
  border-color:var(--border-accent);
}
.chip-accent{
  background:var(--accent-soft);color:var(--accent);
  border-color:var(--border-accent);
}

/* ── 5.5 按钮 ──────────────────────────────────── */
.btn{
  display:inline-flex;align-items:center;justify-content:center;gap:var(--space-2);
  padding:var(--space-2) var(--space-5);
  font-size:var(--fs-body);font-weight:var(--fw-medium);
  border-radius:var(--radius-sm);
  transition:all var(--dur-fast) var(--ease-standard);
  letter-spacing:var(--tracking-normal);
  white-space:nowrap;
}
.btn-primary{
  background:var(--accent);color:#fff;
  box-shadow:0 1px 2px rgba(0,113,227,0.25),inset 0 1px 0 rgba(255,255,255,0.15);
}
.btn-primary:hover{background:var(--accent-hover);transform:translateY(-1px);box-shadow:0 4px 12px rgba(0,113,227,0.3);}
.btn-primary:active{background:var(--accent-pressed);transform:translateY(0);}
.btn-ghost{color:var(--text-secondary);}
.btn-ghost:hover{background:var(--bg-muted);color:var(--text-primary);}
.btn-danger{color:var(--danger);}
.btn-danger:hover{background:var(--danger-soft);}

/* ── 反模式清单 ────────────────────────────────── */
/* ✗ 不要做：纯黑/纯白文字、超过 0.12 的阴影透明度、
   超过 600ms 的动效、不统一的圆角、纯饱和色块无过渡 */
`;

// ===================== 前台：详情页 =====================
async function renderItemPage(slug,env){
  const item=await env.DB.prepare('SELECT*FROM media_items WHERE slug=? AND is_public=1').bind(slug).first();
  if(!item)return new Response(render404(env),{status:404,headers:{'Content-Type':'text/html; charset=utf-8'}});
  try{await env.DB.prepare('UPDATE media_items SET views=COALESCE(views,0)+1 WHERE id=?').bind(item.id).run();}catch{}
  const s=await getAllSettings(env);const siteTitle=s.site_title||'精选作品';
  let cats=[];try{cats=JSON.parse(s.categories||'[]');}catch{}
  const catMap={};for(const c of cats)catMap[c.key]={label:c.label,gradient:c.gradient||'linear-gradient(135deg,#0071e3,#5e5ce6)'};
  const cat=catMap[item.category]||{label:'',gradient:'linear-gradient(135deg,#667eea,#764ba2)'};
  const tagsHtml=(item.tags||'').split(',').filter(t=>t.trim()).map(t=>`<span class="chip chip-accent">${esc(t.trim())}</span>`).join('');
  const tLabel={'image':'图片','video':'视频','text':'文字'}[item.type]||item.type;
  const views=item.views||0;const date=(item.created_at||'').replace('T',' ').substring(0,16);
  let relatedHtml='';
  try{
    const rel=await env.DB.prepare(`SELECT id,slug,type,title,description FROM media_items WHERE is_public=1 AND category=? AND id!=? ORDER BY RANDOM() LIMIT 3`).bind(item.category||'',item.id).all();
    const ri=rel.results||[];
    if(ri.length){relatedHtml=`<section class="related"><h2>相关推荐</h2><div class="related-grid">${ri.map(r=>{const rc=catMap[r.category]||{gradient:'linear-gradient(135deg,#667eea,#764ba2)'};const icon=r.type==='image'?'🖼':r.type==='video'?'🎬':'📝';return`<a class="card related-card" href="/item/${r.slug}" style="--cat-grad:${rc.gradient}"><div class="card-media ${r.type}" style="background:${rc.gradient}"><span>${icon}</span></div><div class="card-body"><div class="card-title">${esc(r.title)}</div>${r.description?`<div class="card-desc">${esc(r.description.substring(0,60))}</div>`:''}</div></a>`;}).join('')}</div></section>`;}
  }catch{}
  const body=item.type==='image'?`<img class="detail-media" src="/file/${esc(item.content)}" alt="${esc(item.title)}" loading="lazy"/>`:item.type==='video'?`<video class="detail-media" src="${esc(item.content)}" controls preload="metadata"></video>`:`<div class="detail-text">${esc(item.content).replace(/\\n/g,'<br>')}</div>`;
  const html=`<!DOCTYPE html><html lang="zh-CN"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><meta property="og:title" content="${esc(item.title)}"/><meta property="og:description" content="${esc(item.description||'')}"/><title>${esc(item.title)} — ${esc(siteTitle)}</title><style>${BASE_CSS}
/* ── 详情页布局 ── */
.container{max-width:var(--content-narrow);margin:0 auto;padding:var(--space-6) var(--space-5) var(--space-9);}
.detail-card{background:var(--bg-elevated);border:1px solid var(--border-default);border-radius:var(--radius-xl);overflow:hidden;box-shadow:var(--shadow-4);}
.cat-bar{height:4px;background:${cat.gradient};}
.detail-body{padding:var(--space-7) var(--space-7);}
@media(max-width:640px){.detail-body{padding:var(--space-5) var(--space-5);}}

.meta-row{display:flex;align-items:center;gap:var(--space-2);margin-bottom:var(--space-4);flex-wrap:wrap;}
.cat-chip{font-size:var(--fs-micro);font-weight:var(--fw-medium);padding:var(--space-1) var(--space-3);border-radius:var(--radius-xs);color:#fff;letter-spacing:var(--tracking-wide);background:${cat.gradient};box-shadow:var(--shadow-1);}
.view-count{font-size:var(--fs-micro);color:var(--text-tertiary);margin-left:auto;display:inline-flex;align-items:center;gap:var(--space-1);}

.detail-title{font-size:var(--fs-display);font-weight:var(--fw-black);letter-spacing:var(--tracking-tight);line-height:var(--lh-tight);margin-bottom:var(--space-3);color:var(--text-primary);}
.detail-desc{font-size:var(--fs-body-lg);color:var(--text-secondary);line-height:var(--lh-relaxed);margin-bottom:var(--space-5);}
.detail-media{width:100%;border-radius:var(--radius-lg);margin:var(--space-3) 0 var(--space-5);box-shadow:var(--shadow-3);}
.detail-text{font-size:var(--fs-body-lg);color:var(--text-primary);line-height:var(--lh-relaxed);white-space:pre-wrap;padding:var(--space-5);border:1px solid var(--border-default);border-radius:var(--radius-lg);margin:var(--space-3) 0 var(--space-5);background:var(--bg-subtle);box-shadow:var(--shadow-inset);}

.tags-row{display:flex;flex-wrap:wrap;gap:var(--space-2);margin-bottom:var(--space-4);}
.detail-footer{display:flex;align-items:center;justify-content:space-between;padding-top:var(--space-4);border-top:1px solid var(--border-hairline);font-size:var(--fs-caption);color:var(--text-tertiary);}

/* ── 相关推荐 ── */
.related{margin-top:var(--space-8);}
.related h2{font-size:var(--fs-h3);font-weight:var(--fw-semibold);margin-bottom:var(--space-4);color:var(--text-primary);letter-spacing:var(--tracking-tight);}
.related-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:var(--space-4);}
.related-card .card-media{aspect-ratio:16/10;font-size:1.6rem;}

/* ── FAB ── */
.fab{position:fixed;bottom:var(--space-5);right:var(--space-5);width:52px;height:52px;border-radius:50%;background:var(--grad-blue);color:#fff;display:flex;align-items:center;justify-content:center;text-decoration:none;font-size:1.3rem;box-shadow:0 6px 20px rgba(0,113,227,0.3);transition:transform var(--dur-base) var(--ease-standard),box-shadow var(--dur-base) var(--ease-standard);z-index:50;}
.fab:hover{transform:scale(1.08);box-shadow:0 8px 28px rgba(0,113,227,0.4);}

/* ── 导航适配 ── */
.nav-back{font-size:var(--fs-caption);color:var(--text-secondary);padding:var(--space-2) var(--space-3);border-radius:var(--radius-sm);transition:all var(--dur-fast) var(--ease-standard);}
.nav-back:hover{background:var(--accent-soft);color:var(--accent);}

/* ── Toast ── */
.toast{position:fixed;bottom:var(--space-5);left:50%;transform:translateX(-50%) translateY(20px);padding:var(--space-3) var(--space-5);border-radius:var(--radius-md);color:#fff;font-size:var(--fs-body);z-index:2000;opacity:0;transition:all var(--dur-base) var(--ease-standard);pointer-events:none;font-weight:var(--fw-medium);box-shadow:var(--shadow-4);}
.toast.show{opacity:1;transform:translateX(-50%) translateY(0);}
.toast.success{background:var(--grad-green);}
</style></head><body>
<nav class="nav"><div class="nav-inner"><a href="/" class="nav-back">← 返回</a><a href="/" class="brand">${esc(siteTitle)}</a></div></nav>
<div class="container">
<article class="detail-card">
<div class="cat-bar" style="background:${cat.gradient}"></div>
<div class="detail-body">
<div class="meta-row"><span class="badge badge-${item.type}">${tLabel}</span>${cat.label?`<span class="cat-chip">${esc(cat.label)}</span>`:''}<span class="view-count">👁 ${views}</span></div>
<h1 class="detail-title">${esc(item.title)}</h1>
${item.description?`<p class="detail-desc">${esc(item.description)}</p>`:''}
${body}
${tagsHtml?`<div class="tags-row">${tagsHtml}</div>`:''}
<div class="detail-footer"><span>📅 ${date}</span><span style="font-size:var(--fs-micro);opacity:0.5;">/item/${esc(item.slug)}</span></div>
</div></article>
${relatedHtml}
</div>
<a href="/admin" class="fab" title="管理后台" aria-label="管理后台">⚙</a>
<div class="toast" id="toast"></div>
<script>const path='/item/${esc(item.slug)}';if(location.pathname!==path)history.replaceState(null,'',path);function showToast(m){const t=document.getElementById('toast');t.textContent=m;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),2000);}</script>
</body></html>`;
  return new Response(html,{headers:{'Content-Type':'text/html; charset=utf-8'}});
}

// ===================== 前台：列表页 =====================
async function renderGalleryPage(env){
  const s=await getAllSettings(env);const siteTitle=s.site_title||'精选作品';const siteSubtitle=s.site_subtitle||'图片 · 视频 · 文字 — 一切精彩，尽收眼底';
  let cats=[];try{cats=JSON.parse(s.categories||'[]');}catch{}
  if(!cats.find(c=>c.key==='all'))cats.unshift({key:'all',label:'全部',gradient:'linear-gradient(135deg,#0071e3,#5e5ce6)'});
  const catNav=cats.map((c,i)=>`<a href="#" class="chip ${i===0?'chip-active':''}" data-cat="${c.key}" style="--cat-grad:${c.gradient||'linear-gradient(135deg,#0071e3,#5e5ce6)'};${i===0?`background:${c.gradient||'linear-gradient(135deg,#0071e3,#5e5ce6)'};color:#fff;border-color:transparent;`:''}">${esc(c.label)}</a>`).join('');
  const html=`<!DOCTYPE html><html lang="zh-CN"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><title>${esc(siteTitle)}</title><style>${BASE_CSS}
/* ── Hero 区 ── */
.hero{text-align:center;padding:var(--space-9) var(--space-5) var(--space-7);max-width:800px;margin:0 auto;position:relative;}
.hero::before{content:'';position:absolute;top:-4rem;left:50%;transform:translateX(-50%);width:420px;height:420px;border-radius:50%;background:radial-gradient(circle,rgba(0,113,227,0.05) 0%,transparent 70%);z-index:-1;}
.hero h1{font-size:var(--fs-display);font-weight:var(--fw-black);letter-spacing:var(--tracking-tight);line-height:var(--lh-tight);margin-bottom:var(--space-4);color:var(--text-primary);}
.hero h1 .accent{background:var(--grad-blue);-webkit-background-clip:text;-webkit-text-fill-color:transparent;}
.hero p{font-size:var(--fs-body-lg);color:var(--text-secondary);line-height:var(--lh-relaxed);max-width:560px;margin:0 auto;}

/* ── 搜索 ── */
.search-wrap{max-width:480px;margin:0 auto var(--space-6);position:relative;}
.search-wrap input{width:100%;padding:var(--space-3) var(--space-4) var(--space-3) var(--space-7);background:var(--bg-elevated);border:1px solid var(--border-default);border-radius:var(--radius-md);font-size:var(--fs-body);color:var(--text-primary);outline:none;transition:all var(--dur-fast) var(--ease-standard);box-shadow:var(--shadow-1);}
.search-wrap input::placeholder{color:var(--text-tertiary);}
.search-wrap input:focus{border-color:var(--accent);box-shadow:0 0 0 4px var(--accent-ring),var(--shadow-2);transform:translateY(-1px);}
.search-wrap::before{content:'🔍';position:absolute;left:var(--space-4);top:50%;transform:translateY(-50%);font-size:0.9rem;opacity:0.35;}

/* ── Bento Grid ── */
.container{max-width:var(--content-wide);margin:0 auto;padding:0 var(--space-5) var(--space-9);}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:var(--space-5);}
.card-link{text-decoration:none;color:inherit;display:block;}
.card-media.image{background:var(--grad-blue);}
.card-media.video{background:var(--grad-pink);}
.card-media.text {background:var(--grad-cool);}
.card-footer{display:flex;align-items:center;gap:var(--space-2);margin-top:var(--space-3);}
.empty{padding:var(--space-9) var(--space-5);text-align:center;color:var(--text-tertiary);}
.empty .icon{font-size:3rem;margin-bottom:var(--space-3);opacity:0.4;}
.empty h3{font-size:var(--fs-h2);font-weight:var(--fw-semibold);color:var(--text-secondary);margin-bottom:var(--space-2);}

/* ── 分页 ── */
.pagination{display:flex;align-items:center;justify-content:center;gap:var(--space-3);margin-top:var(--space-7);}
.pagination button{padding:var(--space-2) var(--space-4);border-radius:var(--radius-sm);font-size:var(--fs-body);color:var(--text-secondary);background:var(--bg-elevated);border:1px solid var(--border-default);transition:all var(--dur-fast) var(--ease-standard);}
.pagination button:hover:not(:disabled){background:var(--accent-soft);color:var(--accent);border-color:var(--border-accent);}
.pagination button:disabled{opacity:0.4;cursor:not-allowed;}
.pagination span{font-size:var(--fs-caption);color:var(--text-tertiary);}

/* ── 导航分类 ── */
.nav-links{display:flex;gap:var(--space-1);align-items:center;flex-wrap:wrap;}
.nav-link{color:var(--text-secondary);text-decoration:none;font-size:var(--fs-caption);font-weight:var(--fw-medium);padding:var(--space-2) var(--space-3);border-radius:var(--radius-sm);transition:all var(--dur-fast) var(--ease-standard);}
.nav-link:hover{color:var(--text-primary);background:var(--bg-muted);}
.nav-link.active{color:#fff;background:var(--accent);box-shadow:0 2px 8px rgba(0,113,227,0.25);}

/* ── 适配 ── */
@media(max-width:720px){
  .hero{padding:var(--space-7) var(--space-4) var(--space-5);}
  .grid{grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:var(--space-3);}
  .nav-inner{padding:var(--space-2) var(--space-4);}
}
@media(max-width:420px){
  .grid{grid-template-columns:1fr;}
}
</style></head><body>
<nav class="nav"><div class="nav-inner">
  <a href="/" class="brand">${esc(siteTitle)}</a>
  <div class="nav-links">${catNav}</div>
</div></nav>
<main>
  <section class="hero">
    <h1><span class="accent">${esc(siteTitle)}</span></h1>
    <p>${esc(siteSubtitle)}</p>
  </section>
  <div class="search-wrap"><input id="searchInput" placeholder="搜索标题或描述…" /></div>
  <div class="container">
    <div class="grid" id="grid"></div>
    <div class="pagination" id="pagination"></div>
  </div>
</main>
<a href="/admin" class="fab" title="管理后台">⚙</a>
<div class="toast" id="toast"></div>
<script>
const grid=document.getElementById('grid');
const paginationEl=document.getElementById('pagination');
const searchInput=document.getElementById('searchInput');
let page=1,totalPages=1,type='all',search='';
const navLinks=document.querySelectorAll('.nav-link');

navLinks.forEach(l=>l.addEventListener('click',e=>{
  e.preventDefault();
  navLinks.forEach(x=>{x.classList.remove('active');x.style.background='';x.style.color='';x.style.borderColor='';});
  l.classList.add('active');
  l.style.background=l.style.getPropertyValue('--cat-grad')||'var(--accent)';
  l.style.color='#fff';
  type=l.dataset.cat;search='';searchInput.value='';page=1;fetchMedia();
}));

searchInput.addEventListener('input',debounce(()=>{search=searchInput.value.trim();page=1;fetchMedia();},300));
function debounce(fn,ms){let t;return(...a)=>{clearTimeout(t);t=setTimeout(()=>fn(...a),ms);};}

async function fetchMedia(){const p=new URLSearchParams({page,pageSize:24});if(type&&type!=='all')p.set('type',type);if(search)p.set('search',search);try{const r=await fetch('/api/media?'+p),d=await r.json();render(d);}catch{container.innerHTML='<div class="empty"><div class="icon">❌</div><h3>加载失败</h3></div>';}}
function render(d){const items=d.items||[];totalPages=d.pagination?.totalPages||1;if(!items.length){grid.innerHTML='<div class="empty"><div class="icon">📭</div><h3>暂无内容</h3><p>还没有添加任何媒体内容</p></div>';paginationEl.innerHTML='';return;}
grid.innerHTML=items.map(it=>{const grad=it.cat_gradient||'linear-gradient(135deg,#667eea,#764ba2)';const icon=it.type==='image'?'🖼':it.type==='video'?'🎬':'📝';const tLabel={image:'图片',video:'视频',text:'文字'}[it.type]||'';return`<a class="card-link" href="/item/${it.slug}"><article class="card"><div class="card-media ${it.type}" style="background:${grad}"><span>${icon}</span></div><div class="card-body"><div class="card-footer"><span class="badge badge-${it.type}">${tLabel}</span></div><h3 class="card-title">${it.title||''}</h3><p class="card-desc">${it.description||''}</p></div></article></a>`;}).join('');
renderPagination();}
function renderPagination(){if(totalPages<=1){paginationEl.innerHTML='';return;}paginationEl.innerHTML='<button '+(page<=1?'disabled':'')+' onclick="changePage('+(page-1)+')">← 上一页</button><span>第 '+page+' / '+totalPages+' 页</span><button '+(page>=totalPages?'disabled':'')+' onclick="changePage('+(page+1)+')">下一页 →</button>';}
function changePage(p){page=p;fetchMedia();window.scrollTo({top:0,behavior:'smooth'});}
fetchMedia();
</script>
</body></html>`;
  return html;
}

// ===================== 404 =====================
function render404(env){
  return`<!DOCTYPE html><html lang="zh-CN"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>404 — 未找到</title><style>${BASE_CSS}
body{display:flex;align-items:center;justify-content:center;min-height:100vh;text-align:center;padding:var(--space-5);}
.empty .icon{font-size:4rem;margin-bottom:var(--space-4);opacity:0.3;}
.empty h3{font-size:var(--fs-h1);font-weight:var(--fw-bold);margin-bottom:var(--space-3);color:var(--text-primary);}
.empty p{color:var(--text-secondary);margin-bottom:var(--space-5);}
</style></head><body><div class="empty"><div class="icon">🔍</div><h3>内容不存在</h3><p>这个链接可能已被删除或从未发布</p><a href="/" class="btn btn-primary">返回首页</a></div></body></html>`;
}

// ===================== 登录页 =====================
function renderLoginPage(){
  return`<!DOCTYPE html><html lang="zh-CN"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>登录 — 管理后台</title><style>${BASE_CSS}
body{display:flex;align-items:center;justify-content:center;min-height:100vh;padding:var(--space-5);background:var(--bg-base);}
.login-card{background:var(--bg-elevated);border:1px solid var(--border-default);border-radius:var(--radius-xl);padding:var(--space-7) var(--space-7);width:100%;max-width:400px;box-shadow:var(--shadow-4);}
.login-card h1{font-size:var(--fs-h1);font-weight:var(--fw-bold);letter-spacing:var(--tracking-tight);margin-bottom:var(--space-2);}
.login-card p{color:var(--text-secondary);font-size:var(--fs-body);margin-bottom:var(--space-6);}
.field{margin-bottom:var(--space-4);}
.field label{display:block;font-size:var(--fs-caption);font-weight:var(--fw-medium);color:var(--text-secondary);margin-bottom:var(--space-1);}
.field input{width:100%;padding:var(--space-3) var(--space-4);background:var(--bg-subtle);border:1px solid var(--border-default);border-radius:var(--radius-sm);font-size:var(--fs-body);color:var(--text-primary);outline:none;transition:all var(--dur-fast) var(--ease-standard);}
.field input:focus{border-color:var(--accent);box-shadow:0 0 0 3px var(--accent-ring);background:var(--bg-elevated);}
.btn-login{width:100%;padding:var(--space-3) var(--space-4);background:var(--accent);color:#fff;border-radius:var(--radius-sm);font-size:var(--fs-body);font-weight:var(--fw-medium);transition:all var(--dur-fast) var(--ease-standard);margin-top:var(--space-2);}
.btn-login:hover{background:var(--accent-hover);}
.error{color:var(--danger);font-size:var(--fs-caption);margin-top:var(--space-3);text-align:center;min-height:1.2em;}
</style></head><body>
<div class="login-card">
  <h1>🔐 管理后台</h1>
  <p>登录后管理你的媒体内容</p>
  <form id="loginForm">
    <div class="field"><label>用户名</label><input name="username" autocomplete="username" required></div>
    <div class="field"><label>密码</label><input name="password" type="password" autocomplete="current-password" required></div>
    <button type="submit" class="btn-login">登 录</button>
    <div class="error" id="err"></div>
  </form>
</div>
<script>
document.getElementById('loginForm').addEventListener('submit',async e=>{
  e.preventDefault();
  const fd=new FormData(e.target);
  const r=await fetch('/api/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:fd.get('username'),password:fd.get('password')})});
  const d=await r.json();
  if(d.ok)location.href='/admin';
  else document.getElementById('err').textContent=d.error||'登录失败';
});
</script>
</body></html>`;
}

// ===================== 后台管理页 =====================
function renderAdminPage(env){
  return`<!DOCTYPE html><html lang="zh-CN"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>后台管理 — Gallery</title><style>${BASE_CSS}
/* ── 后台布局 ── */
.admin-nav{position:sticky;top:0;z-index:100;background:rgba(245,245,247,0.85);backdrop-filter:saturate(180%) blur(24px);-webkit-backdrop-filter:saturate(180%) blur(24px);border-bottom:1px solid var(--border-hairline);}
.admin-nav-inner{max-width:var(--content-wide);margin:0 auto;padding:var(--space-3) var(--space-5);display:flex;align-items:center;justify-content:space-between;}
.admin-nav .brand{font-size:1rem;}
.admin-nav .nav-actions{display:flex;gap:var(--space-2);align-items:center;}
.tab-bar{display:flex;gap:var(--space-1);margin-left:var(--space-5);}
.tab{padding:var(--space-2) var(--space-4);font-size:var(--fs-caption);font-weight:var(--fw-medium);color:var(--text-secondary);border-radius:var(--radius-sm);transition:all var(--dur-fast) var(--ease-standard);cursor:pointer;border:none;background:none;}
.tab:hover{background:var(--bg-muted);color:var(--text-primary);}
.tab.active{background:var(--accent-soft);color:var(--accent);}

.admin-main{max-width:var(--content-wide);margin:0 auto;padding:var(--space-6) var(--space-5) var(--space-9);}

/* ── 统计卡片 (Bento) ── */
.stats-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:var(--space-4);margin-bottom:var(--space-6);}
.stat-card{background:var(--bg-elevated);border:1px solid var(--border-default);border-radius:var(--radius-md);padding:var(--space-4) var(--space-5);box-shadow:var(--shadow-1);position:relative;overflow:hidden;}
.stat-card::before{content:'';position:absolute;left:0;top:0;bottom:0;width:3px;background:var(--accent);border-radius:var(--radius-md) 0 0 var(--radius-md);}
.stat-card.green::before{background:var(--success);}
.stat-card.purple::before{background:var(--grad-purple);}
.stat-card.warm::before{background:var(--grad-warm);}
.stat-card .label{font-size:var(--fs-micro);font-weight:var(--fw-medium);color:var(--text-tertiary);text-transform:uppercase;letter-spacing:var(--tracking-wide);margin-bottom:var(--space-1);}
.stat-card .value{font-size:1.8rem;font-weight:var(--fw-bold);letter-spacing:var(--tracking-tight);color:var(--text-primary);}

/* ── 工具栏 ── */
.toolbar{display:flex;align-items:center;gap:var(--space-3);margin-bottom:var(--space-5);flex-wrap:wrap;}
.toolbar .spacer{flex:1;}
.search-input{padding:var(--space-2) var(--space-4);background:var(--bg-elevated);border:1px solid var(--border-default);border-radius:var(--radius-sm);font-size:var(--fs-body);color:var(--text-primary);outline:none;min-width:220px;transition:all var(--dur-fast) var(--ease-standard);}
.search-input:focus{border-color:var(--accent);box-shadow:0 0 0 3px var(--accent-ring);}
select.search-input{appearance:none;padding-right:var(--space-5);}

/* ── 表格 ── */
.table-wrap{background:var(--bg-elevated);border:1px solid var(--border-default);border-radius:var(--radius-lg);overflow:hidden;box-shadow:var(--shadow-1);}
table{width:100%;border-collapse:collapse;}
th{text-align:left;font-size:var(--fs-micro);font-weight:var(--fw-semibold);color:var(--text-tertiary);text-transform:uppercase;letter-spacing:var(--tracking-wide);padding:var(--space-3) var(--space-4);background:var(--bg-subtle);border-bottom:1px solid var(--border-hairline);}
td{padding:var(--space-3) var(--space-4);font-size:var(--fs-body);color:var(--text-primary);border-bottom:1px solid var(--border-hairline);vertical-align:middle;}
tr:last-child td{border-bottom:none;}
tr:hover td{background:var(--bg-subtle);}
td a{color:var(--accent);font-weight:var(--fw-medium);}
td a:hover{color:var(--accent-hover);text-decoration:underline;}
.status-dot{display:inline-block;width:8px;height:8px;border-radius:50%;margin-right:var(--space-1);vertical-align:middle;}
.status-published{background:var(--success);box-shadow:0 0 0 3px var(--success-soft);}
.status-draft{background:var(--warning);box-shadow:0 0 0 3px var(--warning-soft);}
.row-actions{display:flex;gap:var(--space-1);}
.icon-btn{width:32px;height:32px;border-radius:var(--radius-xs);display:inline-flex;align-items:center;justify-content:center;font-size:0.9rem;color:var(--text-secondary);transition:all var(--dur-fast) var(--ease-standard);cursor:pointer;border:none;background:none;}
.icon-btn:hover{background:var(--bg-muted);}
.icon-btn.danger:hover{background:var(--danger-soft);color:var(--danger);}

/* ── 设置面板 ── */
.settings-panel{background:var(--bg-elevated);border:1px solid var(--border-default);border-radius:var(--radius-lg);padding:var(--space-6);box-shadow:var(--shadow-1);}
.settings-panel h2{font-size:var(--fs-h2);font-weight:var(--fw-semibold);letter-spacing:var(--tracking-tight);margin-bottom:var(--space-5);}
.field-row{display:grid;grid-template-columns:200px 1fr;gap:var(--space-4);align-items:start;margin-bottom:var(--space-5);}
.field-row label{font-size:var(--fs-body);font-weight:var(--fw-medium);color:var(--text-primary);padding-top:var(--space-2);}
.field-row input,.field-row textarea{width:100%;padding:var(--space-3) var(--space-4);background:var(--bg-subtle);border:1px solid var(--border-default);border-radius:var(--radius-sm);font-size:var(--fs-body);color:var(--text-primary);outline:none;transition:all var(--dur-fast) var(--ease-standard);}
.field-row input:focus,.field-row textarea:focus{border-color:var(--accent);box-shadow:0 0 0 3px var(--accent-ring);background:var(--bg-elevated);}
.field-row textarea{min-height:80px;resize:vertical;line-height:var(--lh-relaxed);}
.cat-list{display:flex;flex-direction:column;gap:var(--space-3);}
.cat-item{display:grid;grid-template-columns:1fr 120px 80px 40px;gap:var(--space-3);align-items:center;}
.cat-item input,.cat-item select{padding:var(--space-2) var(--space-3);border:1px solid var(--border-default);border-radius:var(--radius-xs);font-size:var(--fs-body);outline:none;}
.cat-color-dot{width:32px;height:32px;border-radius:var(--radius-xs);border:1px solid var(--border-default);cursor:pointer;}

/* ── 模态框 ── */
.modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,0.4);backdrop-filter:blur(4px);-webkit-backdrop-filter:blur(4px);z-index:1000;display:flex;align-items:center;justify-content:center;padding:var(--space-5);opacity:0;pointer-events:none;transition:opacity var(--dur-base) var(--ease-standard);}
.modal-overlay.show{opacity:1;pointer-events:auto;}
.modal{background:var(--bg-elevated);border-radius:var(--radius-xl);padding:var(--space-6);max-width:560px;width:100%;max-height:85vh;overflow-y:auto;box-shadow:var(--shadow-5);transform:scale(0.96) translateY(8px);transition:transform var(--dur-base) var(--ease-decel);}
.modal-overlay.show .modal{transform:scale(1) translateY(0);}
.modal h2{font-size:var(--fs-h2);font-weight:var(--fw-semibold);letter-spacing:var(--tracking-tight);margin-bottom:var(--space-5);}
.modal .field{margin-bottom:var(--space-4);}
.modal label{display:block;font-size:var(--fs-caption);font-weight:var(--fw-medium);color:var(--text-secondary);margin-bottom:var(--space-1);}
.modal input,.modal textarea,.modal select{width:100%;padding:var(--space-3) var(--space-4);background:var(--bg-subtle);border:1px solid var(--border-default);border-radius:var(--radius-sm);font-size:var(--fs-body);color:var(--text-primary);outline:none;transition:all var(--dur-fast) var(--ease-standard);}
.modal input:focus,.modal textarea:focus,.modal select:focus{border-color:var(--accent);box-shadow:0 0 0 3px var(--accent-ring);background:var(--bg-elevated);}
.modal textarea{min-height:100px;resize:vertical;line-height:var(--lh-relaxed);}
.modal-actions{display:flex;gap:var(--space-3);justify-content:flex-end;margin-top:var(--space-5);}

/* ── 上传区 ── */
.upload-zone{border:2px dashed var(--border-strong);border-radius:var(--radius-md);padding:var(--space-6);text-align:center;transition:all var(--dur-fast) var(--ease-standard);cursor:pointer;margin-bottom:var(--space-4);}
.upload-zone:hover,.upload-zone.dragover{border-color:var(--accent);background:var(--accent-soft);}
.upload-zone .icon{font-size:2rem;margin-bottom:var(--space-2);}
.upload-zone p{color:var(--text-secondary);font-size:var(--fs-body);}
.upload-progress{height:4px;background:var(--bg-muted);border-radius:var(--radius-pill);overflow:hidden;margin-top:var(--space-3);display:none;}
.upload-progress.show{display:block;}
.upload-progress .bar{height:100%;background:var(--grad-blue);border-radius:inherit;width:0%;transition:width var(--dur-base) var(--ease-standard);}

/* ── 预览面板 ── */
.preview-panel{background:var(--bg-subtle);border:1px solid var(--border-default);border-radius:var(--radius-md);padding:var(--space-5);margin-top:var(--space-4);}
.preview-panel h3{font-size:var(--fs-caption);font-weight:var(--fw-semibold);color:var(--text-tertiary);text-transform:uppercase;letter-spacing:var(--tracking-wide);margin-bottom:var(--space-3);}
.preview-body{font-size:var(--fs-body);color:var(--text-primary);line-height:var(--lh-relaxed);}
.preview-meta{display:flex;gap:var(--space-3);margin-top:var(--space-3);flex-wrap:wrap;}

/* ── Toast ── */
.toast{position:fixed;bottom:var(--space-5);left:50%;transform:translateX(-50%) translateY(20px);padding:var(--space-3) var(--space-5);border-radius:var(--radius-md);color:#fff;font-size:var(--fs-body);z-index:2000;opacity:0;transition:all var(--dur-base) var(--ease-standard);pointer-events:none;font-weight:var(--fw-medium);box-shadow:var(--shadow-4);}
.toast.show{opacity:1;transform:translateX(-50%) translateY(0);}
.toast.success{background:var(--grad-green);}
.toast.error{background:var(--grad-pink);}

/* ── 分页 ── */
.pagination{display:flex;align-items:center;justify-content:center;gap:var(--space-3);margin-top:var(--space-5);}
.pagination button{padding:var(--space-2) var(--space-4);border-radius:var(--radius-sm);font-size:var(--fs-body);color:var(--text-secondary);background:var(--bg-elevated);border:1px solid var(--border-default);transition:all var(--dur-fast) var(--ease-standard);}
.pagination button:hover:not(:disabled){background:var(--accent-soft);color:var(--accent);}
.pagination button:disabled{opacity:0.4;cursor:not-allowed;}

/* ── 反模式防护 ── */
@media(max-width:720px){
  .admin-main{padding:var(--space-4) var(--space-4) var(--space-7);}
  .stats-grid{grid-template-columns:repeat(2,1fr);}
  .field-row{grid-template-columns:1fr;}
  .cat-item{grid-template-columns:1fr 100px 60px 36px;}
  .table-wrap{overflow-x:auto;}
}
</style></head><body>
<nav class="admin-nav"><div class="admin-nav-inner">
  <a href="/" class="brand">Gallery 后台</a>
  <div class="nav-actions">
    <div class="tab-bar">
      <button class="tab active" id="tabContent" onclick="switchTab('content',this)">📚 所有内容</button>
      <button class="tab" id="tabUpload" onclick="switchTab('upload',this)">⬆️ 上传</button>
      <button class="tab" id="tabSettings" onclick="switchTab('settings',this)">⚙️ 设置</button>
    </div>
    <button class="btn btn-ghost" onclick="logout()">退出</button>
  </div>
</div></nav>

<main class="admin-main">
  <!-- 统计 -->
  <div class="stats-grid" id="statsGrid">
    <div class="stat-card"><div class="label">总内容</div><div class="value" id="sTotal">—</div></div>
    <div class="stat-card green"><div class="label">已发布</div><div class="value" id="sPublished">—</div></div>
    <div class="stat-card warm"><div class="label">草稿</div><div class="value" id="sDrafts">—</div></div>
    <div class="stat-card purple"><div class="label">图片</div><div class="value" id="sImages">—</div></div>
  </div>

  <!-- 内容列表 -->
  <div id="tab-content">
    <div class="toolbar">
      <button class="btn btn-primary" onclick="openCreateModal()">＋ 新建内容</button>
      <button class="btn btn-danger" id="batchDeleteBtn" onclick="batchDelete()" style="display:none;">🗑 批量删除</button>
      <span class="spacer"></span>
      <input class="search-input" id="searchInput" placeholder="🔍 搜索标题…" />
      <select class="search-input" id="typeFilter"><option value="">全部类型</option><option value="image">图片</option><option value="video">视频</option><option value="text">文字</option></select>
      <select class="search-input" id="statusFilter"><option value="">全部状态</option><option value="1">已发布</option><option value="0">草稿</option></select>
    </div>
    <div class="table-wrap">
      <table>
        <thead><tr><th><input type="checkbox" id="checkAll" onchange="toggleAll(this)"></th><th>标题 / URL</th><th>类型</th><th>分类</th><th>状态</th><th>浏览</th><th>日期</th><th></th></tr></thead>
        <tbody id="tbody"></tbody>
      </table>
    </div>
    <div class="pagination" id="pagination"></div>
  </div>

  <!-- 上传面板 -->
  <div id="tab-upload" style="display:none;">
    <div class="settings-panel">
      <h2>📤 上传图片到 KV</h2>
      <div class="upload-zone" id="uploadZone" onclick="document.getElementById('fileInput').click()">
        <div class="icon">📁</div>
        <p><strong>点击或拖拽文件到此处</strong></p>
        <p style="font-size:var(--fs-caption);color:var(--text-tertiary);margin-top:var(--space-1);">支持 JPG / PNG / GIF / WebP / AVIF，单文件 ≤ 24MB</p>
        <input type="file" id="fileInput" accept="image/*" style="display:none" onchange="doUpload(this)">
        <div class="upload-progress" id="uploadProgress"><div class="bar" id="uploadBar"></div></div>
      </div>
      <div id="uploadResult"></div>
    </div>
  </div>

  <!-- 设置面板 -->
  <div id="tab-settings" style="display:none;">
    <div class="settings-panel">
      <h2>⚙️ 站点设置</h2>
      <div class="field-row"><label>站点标题</label><input id="setTitle" placeholder="精选作品"></div>
      <div class="field-row"><label>副标题</label><input id="setSubtitle" placeholder="一句话描述"></div>
      <h2 style="margin-top:var(--space-6);">🏷️ 分类管理</h2>
      <div class="cat-list" id="catList"></div>
      <button class="btn btn-ghost" onclick="addCategory()">＋ 添加分类</button>
      <div style="margin-top:var(--space-5);display:flex;gap:var(--space-3);">
        <button class="btn btn-primary" onclick="saveSettings()">💾 保存设置</button>
      </div>
    </div>
  </div>
</main>

<!-- 编辑/新建 模态框 -->
<div class="modal-overlay" id="editModal">
  <div class="modal">
    <h2 id="modalTitle">新建内容</h2>
    <div class="field"><label>标题</label><input id="fTitle" placeholder="给你的作品起个名字"></div>
    <div class="field"><label>描述</label><textarea id="fDesc" placeholder="简短描述"></textarea></div>
    <div class="field"><label>类型</label>
      <select id="fType" onchange="onTypeChange()">
        <option value="image">🖼 图片</option>
        <option value="video">🎬 视频</option>
        <option value="text">📝 文字</option>
      </select>
    </div>
    <div class="field" id="fContentField"><label>内容 / 链接</label><input id="fContent" placeholder="图片 key 或视频 URL 或文字内容"></div>
    <div class="field"><label>分类</label><select id="fCategory"></select></div>
    <div class="field"><label>标签（逗号分隔）</label><input id="fTags" placeholder="风景, 旅行"></div>
    <div class="field"><label><input type="checkbox" id="fPublic"> 立即发布（不勾选则存为草稿）</label></div>

    <!-- 预览区 -->
    <div class="preview-panel" id="previewPanel" style="display:none;">
      <h3>👁 预览</h3>
      <div class="preview-body" id="previewBody"></div>
      <div class="preview-meta" id="previewMeta"></div>
    </div>

    <div class="modal-actions">
      <button class="btn btn-ghost" onclick="closeModal()">取消</button>
      <button class="btn btn-primary" id="btnPreview" onclick="doPreview()">👁 预览</button>
      <button class="btn btn-primary" id="btnSave" onclick="saveItem()" style="display:none;">🚀 发布</button>
    </div>
  </div>
</div>

<div class="toast" id="toast"></div>

<script>
let editId=null;let previewData=null;let categories=[];
const tbody=document.getElementById('tbody');
const paginationEl=document.getElementById('pagination');
let page=1,totalPages=1;

checkAuth();loadStats();loadMedia();loadSettings();
async function checkAuth(){try{const r=await fetch('/api/auth/check'),d=await r.json();if(!d.authenticated)location.href='/login';}catch{location.href='/login';}}
async function logout(){await fetch('/api/logout',{method:'POST'});location.href='/login';}
function switchTab(n,btn){document.querySelectorAll('.tab').forEach(b=>b.classList.remove('active'));btn.classList.add('active');document.getElementById('tab-content').style.display=n==='content'?'':'none';document.getElementById('tab-upload').style.display=n==='upload'?'':'none';document.getElementById('tab-settings').style.display=n==='settings'?'':'none';}

async function loadStats(){try{const r=await fetch('/api/media?pageSize=1000&all=1'),d=await r.json();const it=d.items||[];document.getElementById('sTotal').textContent=it.length;document.getElementById('sDrafts').textContent=it.filter(i=>!i.is_public).length;document.getElementById('sPublished').textContent=it.filter(i=>i.is_public).length;document.getElementById('sImages').textContent=it.filter(i=>i.type==='image').length;}catch{}}

async function loadMedia(){const s=document.getElementById('searchInput').value.trim();const t=document.getElementById('typeFilter').value;const st=document.getElementById('statusFilter').value;const p=new URLSearchParams({page,pageSize:20,all:1});if(s)p.set('search',s);if(t)p.set('type',t);if(st)p.set('status',st);try{const r=await fetch('/api/media?'+p),d=await r.json();renderTable(d);}catch{}}
document.getElementById('searchInput').addEventListener('input',debounce(loadMedia,300));
document.getElementById('typeFilter').addEventListener('change',()=>{page=1;loadMedia();});
document.getElementById('statusFilter').addEventListener('change',()=>{page=1;loadMedia();});
function debounce(fn,ms){let t;return(...a)=>{clearTimeout(t);t=setTimeout(()=>fn(...a),ms);};}

function renderTable(d){const items=d.items||[];totalPages=d.pagination?.totalPages||1;if(!items.length){tbody.innerHTML='<tr><td colspan="8" style="text-align:center;padding:var(--space-6);color:var(--text-tertiary);">暂无内容</td></tr>';paginationEl.innerHTML='';return;}
tbody.innerHTML=items.map(it=>{const grad=it.cat_gradient||'';const tLabel={image:'🖼 图片',video:'🎬 视频',text:'📝 文字'}[it.type]||'';const catLbl=it.category||'';const status=it.is_public?`<span class="status-dot status-published"></span>已发布`:`<span class="status-dot status-draft"></span>草稿`;const url=`/item/${it.slug||''}`;return`<tr><td><input type="checkbox" onchange="updateBatchBtn()" data-id="${it.id}"></td><td><a href="${url}" target="_blank">${it.title||'(无标题)'}</a><div style="font-size:var(--fs-micro);color:var(--text-tertiary);margin-top:2px;">${url}</div></td><td>${tLabel}</td><td>${catLbl?`<span class="chip" style="background:${grad};color:#fff;border:none;">${catLbl}</span>`:'—'}</td><td>${status}</td><td>${it.views||0}</td><td style="font-size:var(--fs-caption);color:var(--text-tertiary);">${(it.created_at||'').substring(0,10)}</td><td><div class="row-actions"><button class="icon-btn" onclick="editItem(${it.id})" title="编辑">✏️</button>${it.is_public?`<button class="icon-btn" onclick="unpublishItem(${it.id})" title="取消发布">↩️</button>`:`<button class="icon-btn" style="color:var(--success);" onclick="publishItem(${it.id})" title="发布">🚀</button>`}<button class="icon-btn danger" onclick="deleteItem(${it.id})" title="删除">🗑</button></div></td></tr>`;}).join('');
renderPagination();}

function renderPagination(){if(totalPages<=1){paginationEl.innerHTML='';return;}paginationEl.innerHTML='<button '+(page<=1?'disabled':'')+' onclick="page=1;loadMedia()">« 首页</button><button '+(page<=1?'disabled':'')+' onclick="page--;loadMedia()">← 上一页</button><span style="font-size:var(--fs-caption);color:var(--text-tertiary);">第 '+page+' / '+totalPages+' 页</span><button '+(page>=totalPages?'disabled':'')+' onclick="page++;loadMedia()">下一页 →</button>';}

function toggleAll(cb){document.querySelectorAll('input[type=checkbox][data-id]').forEach(c=>c.checked=cb.checked);updateBatchBtn();}
function updateBatchBtn(){const n=document.querySelectorAll('input[type=checkbox][data-id]:checked').length;document.getElementById('batchDeleteBtn').style.display=n>0?'inline-flex':'none';}

function openCreateModal(){editId=null;previewData=null;document.getElementById('modalTitle').textContent='新建内容';document.getElementById('fTitle').value='';document.getElementById('fDesc').value='';document.getElementById('fType').value='image';document.getElementById('fContent').value='';document.getElementById('fTags').value='';document.getElementById('fPublic').checked=false;onTypeChange();document.getElementById('previewPanel').style.display='none';document.getElementById('btnPreview').style.display='inline-flex';document.getElementById('btnSave').style.display='none';document.getElementById('editModal').classList.add('show');}

async function editItem(id){try{const r=await fetch('/api/media/'+id),d=await r.json();if(d.error)return showToast(d.error,'error');editId=id;previewData=null;document.getElementById('modalTitle').textContent='编辑内容';document.getElementById('fTitle').value=d.title||'';document.getElementById('fDesc').value=d.description||'';document.getElementById('fType').value=d.type||'image';document.getElementById('fContent').value=d.content||'';document.getElementById('fTags').value=d.tags||'';document.getElementById('fPublic').checked=!!d.is_public;onTypeChange();populateCategories(d.category);document.getElementById('previewPanel').style.display='none';document.getElementById('btnPreview').style.display='inline-flex';document.getElementById('btnSave').style.display='none';document.getElementById('editModal').classList.add('show');}catch(e){showToast('加载失败','error');}}

function onTypeChange(){const t=document.getElementById('fType').value;const lbl={image:'图片 Key（上传后自动填入）',video:'视频 URL（外链）',text:'文字内容'}[t]||'内容';document.querySelector('#fContentField label').textContent='内容 / '+lbl;}

function populateCategories(selected){
  const sel=document.getElementById('fCategory');sel.innerHTML='<option value="">— 无分类 —</option>'+categories.map(c=>`<option value="${c.key}" ${c.key===selected?'selected':''}>${c.label}</option>`).join('');
}

function closeModal(){document.getElementById('editModal').classList.remove('show');}

function doPreview(){const title=document.getElementById('fTitle').value.trim();const desc=document.getElementById('fDesc').value.trim();const type=document.getElementById('fType').value;const content=document.getElementById('fContent').value.trim();const tags=document.getElementById('fTags').value.trim();const cat=document.getElementById('fCategory').value;if(!title){showToast('请填写标题','error');return;}previewData={title,description:desc,type,content,tags,category:cat};const icon={image:'🖼',video:'🎬',text:'📝'}[type];let body=content;if(type==='text')body=content.substring(0,200)+(content.length>200?'…':'');else if(type==='image')body=content?`图片 Key: ${content}`:'(未填写)';else body=content?`视频链接: ${content}`:'(未填写)';const catObj=categories.find(c=>c.key===cat);const catHtml=catObj?`<span class="chip" style="background:${catObj.gradient||''};color:#fff;border:none;">${catObj.label}</span>`:'';const tagHtml=tags.split(',').filter(t=>t.trim()).map(t=>`<span class="chip chip-accent">${t.trim()}</span>`).join(' ');document.getElementById('previewBody').innerHTML=`<strong>${icon} ${title}</strong>${desc?`<p style="margin-top:var(--space-2);color:var(--text-secondary);">${desc}</p>`:''}<p style="margin-top:var(--space-2);font-size:var(--fs-caption);color:var(--text-tertiary);">${body}</p>`;document.getElementById('previewMeta').innerHTML=catHtml+' '+tagHtml;document.getElementById('previewPanel').style.display='block';document.getElementById('btnPreview').style.display='none';document.getElementById('btnSave').style.display='inline-flex';showToast('预览已生成，满意请点发布','success');}

async function saveItem(){if(!previewData)return;const payload={...previewData,is_public:true};const method=editId?'PUT':'POST';const url=editId?`/api/media/${editId}`:'/api/media';try{const r=await fetch(url,{method,headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});const d=await r.json();if(d.ok){showToast(editId?'已更新并发布 ✅':'已发布 ✅','success');closeModal();loadMedia();loadStats();}else showToast(d.error||'保存失败','error');}catch{e=>showToast('网络错误','error');}}

async function publishItem(id){try{const r=await fetch('/api/media/'+id+'/publish',{method:'POST'});const d=await r.json();if(d.ok){showToast('已发布 🚀','success');loadMedia();loadStats();}else showToast(d.error,'error');}catch{showToast('操作失败','error');}}
async function unpublishItem(id){try{const r=await fetch('/api/media/'+id+'/unpublish',{method:'POST'});const d=await r.json();if(d.ok){showToast('已取消发布','success');loadMedia();loadStats();}else showToast(d.error,'error');}catch{showToast('操作失败','error');}}
async function deleteItem(id){if(!confirm('确认删除？KV 中的图片也会被彻底清除。'))return;try{const r=await fetch('/api/media/'+id,{method:'DELETE'});const d=await r.json();if(d.ok){showToast('已删除'+(d.kv_deleted?'并释放 KV 存储':''),'success');loadMedia();loadStats();}else showToast(d.error,'error');}catch{showToast('删除失败','error');}}
async function batchDelete(){const ids=[...document.querySelectorAll('input[type=checkbox][data-id]:checked')].map(c=>+c.dataset.id);if(!ids.length)return;if(!confirm('确认删除选中的 '+ids.length+' 项？'))return;try{const r=await fetch('/api/media/batch-delete',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({ids})});const d=await r.json();if(d.ok){showToast('已删除 '+d.deleted+' 项'+(d.kv_deleted?'，释放 KV '+d.kv_deleted+' 张':''),'success');loadMedia();loadStats();}else showToast(d.error,'error');}catch{showToast('批量删除失败','error');}}

async function doUpload(input){const f=input.files[0];if(!f)return;const fd=new FormData();fd.append('file',f);const prog=document.getElementById('uploadProgress');const bar=document.getElementById('uploadBar');const res=document.getElementById('uploadResult');prog.classList.add('show');bar.style.width='0%';try{const xhr=new XMLHttpRequest();xhr.open('POST','/api/upload');xhr.upload.onprogress=e=>{if(e.lengthComputable)bar.style.width=Math.round(e.loaded/e.total*100)+'%';};xhr.onload=async()=>{const d=JSON.parse(xhr.responseText);if(d.ok){bar.style.width='100%';res.innerHTML='<div style="padding:var(--space-3);background:var(--success-soft);border-radius:var(--radius-sm);color:var(--success);font-size:var(--fs-body);">✅ 上传成功: '+d.name+' ('+(d.size/1024).toFixed(1)+'KB)<br><code style="font-size:var(--fs-micro);color:var(--text-secondary);">'+d.key+'</code><br><button class="btn btn-primary" style="margin-top:var(--space-2);" onclick="useUploadedKey(\''+d.key+'\')">使用此图片</button></div>';showToast('上传成功','success');}else{res.innerHTML='<div style="padding:var(--space-3);background:var(--danger-soft);border-radius:var(--radius-sm);color:var(--danger);">❌ '+d.error+'</div>';}};xhr.send(fd);}catch(e){res.innerHTML='<div style="color:var(--danger);">上传失败</div>';}}
function useUploadedKey(key){document.getElementById('fType').value='image';onTypeChange();document.getElementById('fContent').value=key;switchTab('content',document.getElementById('tabContent'));openCreateModal();document.getElementById('fContent').value=key;showToast('图片 key 已填入，请完善其他信息','success');}

// 拖拽上传
const uz=document.getElementById('uploadZone');
uz.addEventListener('dragover',e=>{e.preventDefault();uz.classList.add('dragover');});
uz.addEventListener('dragleave',()=>uz.classList.remove('dragover'));
uz.addEventListener('drop',e=>{e.preventDefault();uz.classList.remove('dragover');if(e.dataTransfer.files[0]){document.getElementById('fileInput').files=e.dataTransfer.files;doUpload(document.getElementById('fileInput'));}});

// ── 设置 ──
async function loadSettings(){try{const r=await fetch('/api/site-settings'),d=await r.json();document.getElementById('setTitle').value=d.site_title||'';document.getElementById('setSubtitle').value=d.site_subtitle||'';categories=d.categories||[];renderCatList();populateCategories();}catch{}}
function renderCatList(){const html=categories.map((c,i)=>`<div class="cat-item"><input value="${c.label}" placeholder="分类名" onchange="categories[${i}].label=this.value"><input value="${c.key}" placeholder="key" onchange="categories[${i}].key=this.value"><input type="color" class="cat-color-dot" value="${c.color||'#0071e3'}" onchange="categories[${i}].color=this.value;categories[${i}].gradient='linear-gradient(135deg,'+this.value+','+lighten(this.value)+')';renderCatList();"><button class="icon-btn danger" onclick="categories.splice(${i},1);renderCatList();">🗑</button></div>`).join('');document.getElementById('catList').innerHTML=html;}
function lighten(hex){const r=parseInt(hex.slice(1,3),16),g=parseInt(hex.slice(3,5),16),b=parseInt(hex.slice(5,7),16);return'#'+[r,g,b].map(v=>Math.min(255,v+60).toString(16).padStart(2,'0')).join('');}
function addCategory(){categories.push({key:'cat'+Date.now(),label:'新分类',color:'#5E5CE6',gradient:'linear-gradient(135deg,#5E5CE6,#BF5AF2)'});renderCatList();}
async function saveSettings(){try{const body={site_title:document.getElementById('setTitle').value.trim(),site_subtitle:document.getElementById('setSubtitle').value.trim(),categories};const r=await fetch('/api/site-settings',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});const d=await r.json();if(d.ok){showToast('设置已保存 ✅','success');loadStats();}else showToast(d.error,'error');}catch{showToast('保存失败','error');}}

function showToast(m,type='success'){const t=document.getElementById('toast');t.textContent=m;t.className='toast show '+(type||'success');setTimeout(()=>t.classList.remove('show'),2500);}
</script>
</body></html>`;
}
