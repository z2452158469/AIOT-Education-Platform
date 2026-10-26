// Routed community spaces; all content stays in the existing local demo store.
let achievementFilter='全部成果';
function spaceHeading(title,description,glyph){return `<section class="space-heading"><div class="eyebrow">MAKER CLUB / ${title==='个人档案'?'MY PROFILE':'EXPLORE & CREATE'}</div><h1>${icon(glyph)}${title}</h1>${description?`<p>${description}</p>`:''}</section>`}
function spacePage(r){
  if(r.section==='profile')return profilePage();
  if(r.section==='lab')return `${spaceHeading('虚拟实验室','','lab')}<section class="panel laboratory-canvas" aria-label="虚拟实验室内容区"></section>`;
  return r.id?achievementDetail(r.id):achievementPage();
}
function achievementPage(){
  const list=[...data.achievements].filter(a=>achievementFilter!=='我的成果'||a.owner===user()).sort((a,b)=>b.updated.localeCompare(a.updated));
  return `${spaceHeading('成果展示','记录完成的作品，分享探索过程与实践收获。','award')}<section class="panel achievement-panel"><div class="panel-head"><div class="section-title">${icon('award')}社团成果<small>${list.length} 项成果</small></div><button class="primary" data-action="new-achievement">${icon('plus')}发布成果</button></div><div class="tabs">${['全部成果','我的成果'].map(f=>`<button class="tab ${f===achievementFilter?'active':''}" data-action="achievement-filter" data-id="${f}">${f}</button>`).join('')}</div><div class="achievement-grid">${list.map(a=>`<article class="achievement-card"><div class="achievement-symbol">${icon('award')}</div><a class="achievement-title" href="#/achievements/${encodeURIComponent(a.id)}" data-action="achievement" data-id="${esc(a.id)}">${esc(a.title)}</a><p>${esc(a.body.slice(0,150))}${a.body.length>150?'…':''}</p><div class="achievement-meta"><span>${esc(a.author)}</span><span>${fmt(a.updated)} 更新</span><span>${a.files?.length||0} 个附件</span></div><a class="secondary" href="#/achievements/${encodeURIComponent(a.id)}" data-action="achievement" data-id="${esc(a.id)}">查看成果 →</a></article>`).join('')||'<div class="workspace-empty"><h3>让每一次实践，都留下成果</h3><p>发布标题、介绍和附件，与社团伙伴分享你的作品。</p><button class="secondary" data-action="new-achievement">发布第一项成果</button></div>'}</div></section>`;
}
function achievementDetail(id){
  const a=data.achievements.find(a=>a.id===id);
  document.title=(a?a.title:'成果不存在')+' · 创客社团';
  return `<div class="detail-page achievement-detail"><a class="detail-back" href="#/achievements" data-action="detail-back">← 返回成果展示</a><section class="panel detail-panel"><div class="detail-label">成果展示</div>${a?`<h1 id="detail-heading" tabindex="-1">${esc(a.title)}</h1><div class="muted">${esc(a.author)} · 发布于 ${fmt(a.created)} · 更新于 ${fmt(a.updated)}</div>${a.owner===user()?`<div class="form-actions"><button class="secondary" data-action="edit-achievement" data-id="${esc(a.id)}">编辑成果</button><button class="secondary danger" data-action="delete-achievement" data-id="${esc(a.id)}">删除成果</button></div>`:''}<h3>成果介绍</h3><p>${esc(a.body)}</p><h3>成果附件</h3>${a.files?.length?fileHTML(a.files):'<p class="muted">暂无附件</p>'}`:'<h1 id="detail-heading" tabindex="-1">成果不存在</h1><p>该成果可能已被删除，请返回成果展示。</p>'}</section></div>`;
}
function achievementForm(id){
  const a=data.achievements.find(a=>a.id===id&&a.owner===user());if(id&&!a)return;
  modal(a?'编辑成果':'发布成果',`<form id="achievement-form" data-id="${a?esc(a.id):''}"><label>成果标题<input name="title" required maxlength="100" value="${esc(a?.title||'')}" placeholder="为你的作品起个名字"></label><label>成果介绍<textarea name="body" required maxlength="5000" placeholder="介绍作品的功能、制作过程和实践收获…">${esc(a?.body||'')}</textarea></label><label>成果附件<input type="file" name="files" multiple></label><p class="muted">最多 3 个附件，每个不超过 500 KB。</p>${a?.files?.length?`<div class="info-box">已有 ${a.files.length} 个附件；选择新附件将替换原附件，不选择则保留。<label class="inline-check"><input type="checkbox" name="removeFiles">移除已有附件</label></div>`:''}<div class="form-actions"><button type="button" class="secondary" data-action="close">取消</button><button type="submit" class="primary">${a?'保存成果':'发布成果'}</button></div></form>`);
}
function profilePage(){
  const p=profile(),teacher=isTeacher(),projects=myProjects(),posts=data.posts.filter(a=>a.user===user()),achievements=data.achievements.filter(a=>a.owner===user()),completed=data.tasks.filter(t=>status(t)==='已完成').length;
  return `${spaceHeading('个人档案','记录你的创作、交流与成长。','person')}<div class="personal-record"><section class="panel record-identity"><div class="avatar record-avatar">${esc(p.name[0])}</div><h2>${esc(p.name)}</h2><span class="tag">${teacher?'指导教师':'社团成员'}</span><p>${esc(p.className||'暂未填写社团信息')}</p><button class="primary" data-action="profile-edit">编辑个人资料</button><div class="record-bio"><h3>个人简介</h3><p>${esc(p.bio||'还没有填写个人简介。')}</p></div></section><div class="record-main"><section class="record-stats" aria-label="学习与创作统计">${[[projects.length,'参与项目'],[teacher?data.tasks.length:completed,teacher?'发布任务':'完成任务'],[posts.length,'社区帖子'],[achievements.length,'发布成果']].map(([count,label])=>`<div class="panel"><strong>${count}</strong><span>${label}</span></div>`).join('')}</section><section class="panel"><div class="panel-head"><div class="section-title">${icon('book')}我的项目</div><button class="text-button" data-action="nav" data-id="home">返回个人空间 →</button></div><div class="record-list">${projects.slice(0,5).map(a=>`<a href="#/projects/${encodeURIComponent(a.id)}" data-action="project" data-id="${esc(a.id)}"><span>${esc(a.title)}</span><span class="tag">${esc(a.type)}</span></a>`).join('')||'<div class="empty">暂未创建或加入项目</div>'}</div></section><section class="panel"><div class="panel-head"><div class="section-title">${icon('award')}我的成果</div><button class="text-button" data-action="nav" data-id="achievements">进入成果展示 →</button></div><div class="record-list">${achievements.slice(0,5).map(a=>`<a href="#/achievements/${encodeURIComponent(a.id)}" data-action="achievement" data-id="${esc(a.id)}"><span>${esc(a.title)}</span><small>${fmt(a.updated)}</small></a>`).join('')||'<div class="empty">暂未发布成果</div>'}</div></section></div></div>`;
}
function spaceAction(action,id,event){
  if(!['new-achievement','edit-achievement','achievement','achievement-filter','delete-achievement','confirm-achievement-delete'].includes(action))return false;
  if(!role)return true;
  if(action==='new-achievement')achievementForm();
  if(action==='edit-achievement')achievementForm(id);
  if(action==='achievement'){
    if(event.ctrlKey||event.metaKey||event.shiftKey||event.altKey)return true;
    event.preventDefault();navigate('achievements/'+encodeURIComponent(id));
  }
  if(action==='achievement-filter'&&['全部成果','我的成果'].includes(id)){achievementFilter=id;render()}
  if(action==='delete-achievement'&&data.achievements.some(a=>a.id===id&&a.owner===user()))confirmDelete('这项成果','confirm-achievement-delete',id);
  if(action==='confirm-achievement-delete'){
    const a=data.achievements.find(a=>a.id===id&&a.owner===user());if(!a)return true;
    const before=data.achievements;data.achievements=data.achievements.filter(a=>a.id!==id);
    if(!save()){data.achievements=before;return true}
    navigate('achievements',true);toast('成果已删除');
  }
  return true;
}
async function spaceSubmit(form,values){
  if(form.id!=='achievement-form')return false;
  if(!role)throw Error('请先选择身份');
  const id=form.dataset.id,a=data.achievements.find(a=>a.id===id&&a.owner===user());
  if(id&&!a)throw Error('只能编辑自己发布的成果');
  const title=values.title?.trim(),body=values.body?.trim();
  if(!title||title.length>100)throw Error('请填写 100 字以内的成果标题');
  if(!body||body.length>5000)throw Error('请填写 5000 字以内的成果介绍');
  const files=await readFiles(form.elements.files),now=new Date().toISOString();
  const changes={title,body,files:files.length?files:values.removeFiles==='on'?[]:a?.files||[],updated:now};
  if(a)Object.assign(a,changes);else data.achievements.unshift({id:uid(),owner:user(),author:profile().name,created:now,...changes});
  if(!save())throw Error('成果未保存，请释放浏览器存储空间后重试');
  closeModal();navigate('achievements/'+encodeURIComponent(a?.id||data.achievements[0].id));toast('成果已保存');return true;
}
