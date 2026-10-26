// Personal learning workspace. Completion belongs to each learner, even for shared todos.
function ensureWorkspaceData(){
  if(!Array.isArray(data.projects))data.projects=[];
  if(!Array.isArray(data.todos))data.todos=[];
  if(!data.recentProjects||typeof data.recentProjects!=='object'||Array.isArray(data.recentProjects))data.recentProjects={};
  if(!Array.isArray(data.achievements))data.achievements=[];
  ensureGroupData();
  for(const p of data.projects){
    if(!['个人项目','合作项目'].includes(p.type))p.type='个人项目';
    if(!['练习项目','实践项目','工程项目'].includes(p.scale))p.scale='练习项目';
    if(typeof p.description!=='string')p.description=p.goal||p.body||'';
    if(!Array.isArray(p.members))p.members=[];
  }
}
let selectedDay='',calendarOffset=0,todoFilter='未完成';
const canAccessProject=p=>p.owner===user()||(p.type==='合作项目'&&p.members.includes(user()));
const myProjects=()=>data.projects.filter(canAccessProject);
function projectPeople(){
  const people=new Map(Object.entries(data.profiles).map(([id,p])=>[id,{id,name:p.name}]));
  for(const p of data.posts)if(!people.has(p.user))people.set(p.user,{id:p.user,name:p.author});
  for(const t of data.tasks)for(const s of t.submissions)if(!people.has(s.user))people.set(s.user,{id:s.user,name:s.name});
  return [...people.values()];
}
const projectMemberNames=p=>[...new Set([p.owner,...p.members])].map(id=>projectPeople().find(person=>person.id===id)?.name||id);
const visibleTodos=()=>data.todos.filter(t=>t.owner===user()||(t.scope==='all'&&t.creatorRole==='teacher'));
const todoDone=t=>(t.completedBy||[]).includes(user());
const todoOverdue=t=>!!t.due&&t.due<dateISO(0)&&!todoDone(t);
function todoRow(t){
  const done=todoDone(t),overdue=todoOverdue(t);
  return `<div class="todo-row ${done?'todo-done':''} ${overdue?'todo-overdue':''}"><label class="todo-check"><input type="checkbox" data-action="toggle-todo" data-id="${esc(t.id)}" ${done?'checked':''} aria-label="${done?'标为未完成':'完成'}：${esc(t.title)}"><span class="todo-copy"><strong>${esc(t.title)}</strong>${t.body?`<span class="todo-description">${esc(t.body)}</span>`:''}<span class="todo-meta">${t.scope==='all'?`<span class="teacher-tag">教师安排 · ${esc(t.author)}</span>`:'<span>个人待办</span>'}<span>${t.due?`${esc(t.due)} 截止`:'无截止日期'}</span>${overdue?'<span class="overdue-label">已逾期</span>':''}${done?'<span>已完成</span>':''}</span></span></label></div>`;
}
function todoPanel(){
  const all=visibleTodos(),remaining=all.filter(t=>!todoDone(t)).length;
  const list=all.filter(t=>todoFilter==='全部'||(todoFilter==='已完成'?todoDone(t):!todoDone(t))).sort((a,b)=>Number(todoDone(a))-Number(todoDone(b))||(a.due||'9999').localeCompare(b.due||'9999')||b.created.localeCompare(a.created));
  return `<section class="panel todos-panel"><div class="panel-head"><div class="section-title">${icon('task')}待办事项<small>${remaining} 项未完成</small></div><button class="primary" data-action="new-todo">${icon('plus')}添加待办</button></div><div class="tabs">${['未完成','已完成','全部'].map(f=>`<button class="tab ${todoFilter===f?'active':''}" data-action="todo-filter" data-id="${f}">${f}</button>`).join('')}</div><div class="todo-list">${list.map(todoRow).join('')||'<div class="empty">暂时没有事项，留一点空间给专注。</div>'}</div></section>`;
}
const projectColors={purple:'紫色',blue:'蓝色',teal:'青绿',orange:'橙色',rose:'玫红',violet:'堇紫',indigo:'靛蓝',navy:'藏蓝',sky:'天蓝',cyan:'湖青',emerald:'翠绿',forest:'森林绿',olive:'橄榄绿',ochre:'赭黄',amber:'琥珀',rust:'铁锈橙',red:'朱红',wine:'酒红',pink:'深粉',plum:'梅紫'};
const projectCardTone=p=>Object.hasOwn(projectColors,p.color)?p.color:projectTone(p.id);
// Existing projects keep their stable default until a color is selected.
function projectTone(id){
  let hash=0;
  for(const char of String(id))hash=(Math.imul(hash,31)+char.codePointAt(0))>>>0;
  return ['purple','blue','teal','orange','rose'][hash%5];
}
function rememberProjectVisit(next){
  if(!role||next.section!=='projects'||!next.id)return;
  const entering=renderedRoute.section!==next.section||renderedRoute.id!==next.id||renderedProjectUser!==user();
  if(!entering||!myProjects().some(p=>p.id===next.id)||data.recentProjects[user()]===next.id)return;
  data.recentProjects[user()]=next.id;
  save();
}
function projectPanel(selectedId){
  const projects=myProjects(),recent=!selectedId?projects.find(p=>p.id===data.recentProjects[user()]):null;
  const list=recent?[recent,...projects.filter(p=>p.id!==recent.id)]:projects;
  return `<section class="panel projects-panel"><div class="panel-head"><div class="section-title">${icon('book')}我的项目<small>${list.length} 个项目</small></div><button class="primary" data-action="new-project">${icon('plus')}创建项目</button></div><div class="project-grid">${list.map(p=>`<div class="project-tile${p===recent?' project-recent':''}"><a class="project-card ${p.id===selectedId?'selected-item':''}" data-tone="${projectCardTone(p)}" href="#/projects/${encodeURIComponent(p.id)}" data-action="project" data-id="${esc(p.id)}" ${p.id===selectedId?'aria-current="true"':''}><span class="project-card-heading"><span class="project-mark" role="img" aria-label="${esc(p.type)}">${icon(p.type==='合作项目'?'users':'person')}</span>${p===recent?'<span class="project-recent-label">最近项目</span>':''}</span><span class="project-card-title">${esc(p.title)}</span><span class="project-summary">${esc(p.description||'暂无描述')}</span><span class="project-card-meta"><span class="project-tags"><span class="tag">${esc(p.type)}</span><span class="tag">${esc(p.scale)}</span></span><span>${fmt(p.updated)} 更新</span></span></a><button class="project-color-button" data-action="project-color" data-id="${esc(p.id)}" aria-label="调整配色：${esc(p.title)}" title="调整卡片颜色">${icon('palette')}</button></div>`).join('')||`<div class="workspace-empty">${icon('leaf')}<h3>从一个想法开始</h3><p>创建属于自己的项目，记录目标与每一次进展。</p><button class="secondary" data-action="new-project">创建第一个项目</button></div>`}</div></section>`;
}
function personalWorkspace(){return `<div class="personal-workspace">${projectPanel()}<div class="workspace-actions">${todoPanel()}<div id="assistant-slot">${assistantPanel()}</div></div></div>`}
function projectColorForm(id){
  const p=myProjects().find(p=>p.id===id);if(!p)return;
  const selected=Object.hasOwn(projectColors,p.color)?p.color:'auto';
  modal('调整卡片颜色',`<form id="project-color-form" data-id="${esc(id)}"><p>为“${esc(p.title)}”选择卡片颜色。</p><fieldset class="project-color-options"><legend>卡片颜色</legend>${Object.entries({auto:'自动配色',...projectColors}).map(([value,label])=>`<label class="project-color-option"><input type="radio" name="color" value="${value}" ${value===selected?'checked':''}><span class="project-color-swatch" data-tone="${value==='auto'?projectTone(p.id):value}"></span><span>${label}</span></label>`).join('')}</fieldset><div class="form-actions"><button type="button" class="secondary" data-action="close">取消</button><button class="primary">保存配色</button></div></form>`);
}
function projectForm(id){
  const p=myProjects().find(p=>p.id===id);
  modal(p?'编辑项目':'创建项目',`<form id="project-form" data-id="${p?.id||''}"><label>标题<input name="title" required maxlength="100" value="${esc(p?.title||'')}" placeholder="为项目起一个名字"></label><label>简单描述<textarea name="description" required maxlength="1000" placeholder="简单介绍一下你想做什么…">${esc(p?.description||'')}</textarea></label><label>项目类型<select name="type" ${p&&p.owner!==user()?'disabled':''}>${['个人项目','合作项目'].map(type=>`<option ${p?.type===type?'selected':''}>${type}</option>`).join('')}</select></label><label>项目规模<select name="scale">${['练习项目','实践项目','工程项目'].map(scale=>`<option ${p?.scale===scale?'selected':''}>${scale}</option>`).join('')}</select></label><div class="muted">个人项目仅自己可见；合作项目创建后可设置项目成员。</div><div class="form-actions"><button type="button" class="secondary" data-action="close">取消</button><button class="primary">${p?'保存项目':'创建项目'}</button></div></form>`);
}
function projectMembersForm(id){
  const p=data.projects.find(p=>p.id===id&&p.owner===user()&&p.type==='合作项目');if(!p)return;
  const people=projectPeople().filter(person=>person.id!==p.owner);
  modal('设置项目成员',`<form id="project-members-form" data-id="${esc(id)}"><p>项目创建者自动加入小组。组内成员可以查看并编辑项目内容。</p><div class="info-box">创建者：${esc(projectPeople().find(person=>person.id===p.owner)?.name||p.owner)}</div><fieldset class="project-members"><legend>选择成员</legend>${people.map(person=>`<label><input type="checkbox" name="member:${esc(person.id)}" ${p.members.includes(person.id)?'checked':''}>${esc(person.name)}</label>`).join('')||'<p class="muted">暂无其他成员可选。</p>'}</fieldset><div class="form-actions"><button class="secondary" type="button" data-action="close">取消</button><button class="primary">保存成员</button></div></form>`);
}
function projectDetailPage(r){
  const p=myProjects().find(p=>p.id===r.id),entering=detailSection!=='projects';detailSection='projects';
  document.title=(p?p.title:'项目不存在')+' · 创客社团';
  const back=history.state?.returnTo==='profile'?'profile':'home';
  return `<div class="detail-page split-page${entering?' split-enter':''}"><a class="detail-back" href="#/${back}" data-action="detail-back">← 返回${back==='profile'?'个人档案':'个人空间'}</a><div class="split-layout"><aside class="detail-list" aria-label="我的项目列表">${projectPanel(r.id)}</aside><section class="panel detail-panel" aria-labelledby="detail-heading"><div class="detail-label">我的项目</div>${p?`<div class="project-tags"><span class="tag">${esc(p.type)}</span><span class="tag">${esc(p.scale)}</span></div><h1 id="detail-heading" tabindex="-1">${esc(p.title)}</h1><div class="muted">创建于 ${fmt(p.created)} · 更新于 ${fmt(p.updated)}</div><div class="form-actions">${p.type==='合作项目'&&p.owner===user()?`<button class="secondary" data-action="project-members" data-id="${esc(p.id)}">设置项目成员</button>`:''}<button class="secondary" data-action="edit-project" data-id="${esc(p.id)}">编辑项目</button></div><h3>项目描述</h3><p>${esc(p.description)}</p>${p.type==='合作项目'?`<h3>项目成员 · ${projectMemberNames(p).length} 人</h3><p>${projectMemberNames(p).map(esc).join('、')}</p>`:'<div class="info-box">个人项目 · 仅自己可见</div>'}${p.body?`<h3>已有项目记录</h3><p>${esc(p.body)}</p>`:''}`:'<h1 id="detail-heading" tabindex="-1">项目不存在</h1><p>请从左侧选择自己的项目，或创建一个新项目。</p>'}</section></div></div>`;
}
function todoForm(){
  modal('添加待办事项',`<form id="todo-form"><label>事项名称<input name="title" required maxlength="150" placeholder="下一件想完成的小事…"></label><label>补充说明<textarea name="description" maxlength="3000" placeholder="可以写下具体步骤或提醒…"></textarea></label><label>截止日期<input name="due" type="date" value="${dateISO(0)}"></label>${isTeacher()?'<label>安排给<select name="scope"><option value="personal">仅自己</option><option value="all">所有同学</option></select></label>':''}<div class="form-actions"><button type="button" class="secondary" data-action="close">取消</button><button class="primary">添加待办</button></div></form>`);
}
function learningCalendar(){
  const now=new Date(),view=new Date(now.getFullYear(),now.getMonth()+calendarOffset,1),year=view.getFullYear(),month=view.getMonth(),start=(view.getDay()+6)%7,days=new Date(year,month+1,0).getDate(),all=visibleTodos();
  const chosen=selectedDay||dateISO(0),dayList=all.filter(t=>t.due===chosen);
  return `<section class="panel right-panel learning-calendar"><div class="right-head"><div class="section-title">${icon('calendar')}学习日历</div><div class="calendar-controls"><button data-action="calendar-month" data-id="-1" aria-label="上个月">‹</button><span class="calendar-head">${year} 年 ${month+1} 月</span><button data-action="calendar-month" data-id="1" aria-label="下个月">›</button></div></div><div class="calendar-grid">${['一','二','三','四','五','六','日'].map(d=>`<span class="weekday">${d}</span>`).join('')}${'<span></span>'.repeat(start)}${Array.from({length:days},(_,i)=>{const date=`${year}-${String(month+1).padStart(2,'0')}-${String(i+1).padStart(2,'0')}`,count=all.filter(t=>t.due===date).length;return `<button class="calendar-day ${date===dateISO(0)?'today':''} ${count?'due':''} ${date===chosen?'selected-day':''}" data-action="calendar-day" data-id="${date}" aria-pressed="${date===chosen}" aria-label="${date}，${count} 项待办截止">${i+1}</button>`}).join('')}</div><div class="calendar-note"><i class="dot"></i>待办截止日期 · 点击日期查看</div><div class="calendar-agenda" aria-live="polite"><h4>${esc(chosen)} 截止事项 <small>${dayList.length} 项</small></h4>${dayList.map(todoRow).join('')||'<p class="muted">当天没有待办事项截止。</p>'}</div></section>`;
}
function workspaceAction(action,id,event){
  if(!role)return false;
  if(assistantAction(action,id))return true;
  if(groupsAction(action,id))return true;
  if(action==='project-color'){projectColorForm(id);return true}
  if(action==='new-project'){projectForm();return true}
  if(action==='edit-project'){if(myProjects().some(p=>p.id===id))projectForm(id);return true}
  if(action==='project-members'){projectMembersForm(id);return true}
  if(action==='project'){if(event.ctrlKey||event.metaKey||event.shiftKey||event.altKey)return true;event.preventDefault();navigate('projects/'+encodeURIComponent(id));return true}
  if(action==='new-todo'){todoForm();return true}
  if(action==='todo-filter'){if(['未完成','已完成','全部'].includes(id))todoFilter=id;render();return true}
  if(action==='calendar-day'){selectedDay=id;render();return true}
  if(action==='calendar-month'){calendarOffset+=Number(id);const now=new Date(),month=new Date(now.getFullYear(),now.getMonth()+calendarOffset,1);selectedDay=`${month.getFullYear()}-${String(month.getMonth()+1).padStart(2,'0')}-01`;render();return true}
  if(action==='toggle-todo'){
    const t=visibleTodos().find(t=>t.id===id);if(!t)return true;
    const previous=t.completedBy||[];t.completedBy=todoDone(t)?previous.filter(u=>u!==user()):[...previous,user()];
    if(!save())t.completedBy=previous;render();return true;
  }
  return false;
}
function workspaceSubmit(form,values){
  if(groupsSubmit(form,values))return true;
  if(!['project-form','project-color-form','project-members-form','todo-form'].includes(form.id))return false;
  if(!role)throw Error('请先选择身份');
  if(form.id==='project-color-form'){
    const p=myProjects().find(p=>p.id===form.dataset.id);
    if(!p)throw Error('无法调整此项目的配色');
    if(values.color!=='auto'&&!Object.hasOwn(projectColors,values.color))throw Error('请选择有效的卡片颜色');
    if(values.color==='auto')delete p.color;else p.color=values.color;
    if(!save())throw Error('配色未保存，请重试');
    closeModal();render();toast('卡片配色已更新');return true;
  }
  if(form.id==='project-members-form'){
    const p=data.projects.find(p=>p.id===form.dataset.id&&p.owner===user()&&p.type==='合作项目');
    if(!p)throw Error('仅项目创建者可以设置项目成员');
    p.members=projectPeople().filter(person=>person.id!==p.owner&&values['member:'+person.id]==='on').map(person=>person.id);
    p.updated=new Date().toISOString();
    if(!save())throw Error('项目成员未保存，请重试');
    closeModal();render();toast('项目成员已更新');return true;
  }
  if(!values.title?.trim())throw Error('请填写名称');
  const now=new Date().toISOString();
  if(form.id==='project-form'){
    const id=form.dataset.id,p=myProjects().find(p=>p.id===id);
    if(id&&!p)throw Error('无法编辑此项目');
    const type=values.type||p?.type;
    if(!['个人项目','合作项目'].includes(type))throw Error('请选择项目类型');
    if(!['练习项目','实践项目','工程项目'].includes(values.scale))throw Error('请选择项目规模');
    if(!values.description?.trim()||values.description.trim().length>1000)throw Error('请填写 1000 字以内的简单描述');
    if(values.title.trim().length>100)throw Error('标题不能超过 100 字');
    if(p&&p.owner!==user()&&type!==p.type)throw Error('仅项目创建者可以更改项目类型');
    const changes={title:values.title.trim(),description:values.description.trim(),type,scale:values.scale,updated:now};
    if(p){Object.assign(p,changes);if(type==='个人项目')p.members=[]}else data.projects.unshift({id:uid(),owner:user(),created:now,members:[],...changes});
    if(!save())throw Error('项目未保存，请释放浏览器存储空间后重试');
    const projectId=p?.id||data.projects[0].id;closeModal();navigate('projects/'+encodeURIComponent(projectId));toast('项目已保存');
  }else{
    if(values.due&&(!/^\d{4}-\d{2}-\d{2}$/.test(values.due)||Number.isNaN(new Date(values.due).getTime())))throw Error('请选择有效截止日期');
    if(values.scope==='all'&&!isTeacher())throw Error('仅教师可以为所有同学添加待办');
    data.todos.unshift({id:uid(),owner:user(),creatorRole:role,author:profile().name,scope:isTeacher()&&values.scope==='all'?'all':'personal',title:values.title.trim(),body:(values.description||'').trim(),due:values.due||'',created:now,completedBy:[]});
    if(!save())throw Error('待办未保存，请释放浏览器存储空间后重试');
    todoFilter='未完成';closeModal();render();toast(values.scope==='all'?'已为所有同学添加待办':'待办已添加');
  }
  return true;
}

// Keep deadline colors current if the workspace stays open across midnight.
function scheduleWorkspaceDayRefresh(){
  const now=new Date(),midnight=new Date(now.getFullYear(),now.getMonth(),now.getDate()+1);
  setTimeout(()=>{if(role)render();scheduleWorkspaceDayRefresh()},midnight-now+100);
}
scheduleWorkspaceDayRefresh();
