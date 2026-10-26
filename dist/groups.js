// The fixed learning roster is maintained independently of project permissions.
let selectedGroup='',selectedClass='';
const presenceKey='zhixing-presence-v1',presenceSessionId=crypto.randomUUID();
const myGroups=()=>data.studyGroup&&(isTeacher()||data.studyGroup.members.includes(user()))?[data.studyGroup]:[];
const groupRoster=p=>[...new Set(p.members)];
const personName=id=>projectPeople().find(p=>p.id===id)?.name||id;
function ensureGroupData(){
  if(!Array.isArray(data.classSessions))data.classSessions=[];
  if(!Array.isArray(data.attendance))data.attendance=[];
  if(!data.studyGroup){
    const legacy=data.projects.filter(p=>p.type==='合作项目');
    const members=legacy.length?[...new Set(legacy.flatMap(p=>[p.owner,...(p.members||[])]))]:projectPeople().map(p=>p.id);
    data.studyGroup={id:'fixed-learning-group',title:'创客学习小组',members};
    // Keep lesson IDs and signatures, including separate lessons with the same title.
    const legacyIds=new Set(legacy.map(p=>p.id));
    for(const session of data.classSessions)if(legacyIds.has(session.groupId))session.groupId=data.studyGroup.id;
    for(const record of data.attendance)if(legacyIds.has(record.groupId))record.groupId=data.studyGroup.id;
    // Persist the one-time roster so subsequent project changes cannot alter it.
    try{localStorage.setItem('zhixing-v1',JSON.stringify(data))}catch{}
  }
  if(!Array.isArray(data.studyGroup.members))data.studyGroup.members=[];
}
function readPresence(){try{const value=JSON.parse(localStorage.getItem(presenceKey));return value&&typeof value==='object'&&!Array.isArray(value)?value:{}}catch{return {}}}
function memberOnline(id){return Object.values(readPresence()).some(s=>s?.user===id&&Number.isFinite(s.time)&&Date.now()-s.time>=0&&Date.now()-s.time<75000)}
function updatePresence(force=false){
  const sessions=readPresence(),now=Date.now(),previous=sessions[presenceSessionId];
  if(!role&&!previous)return;
  if(role&&previous?.user===user()&&!force&&now-previous.time<15000)return;
  for(const [key,s] of Object.entries(sessions))if(!s||!Number.isFinite(s.time)||now-s.time>=75000||s.time>now)delete sessions[key];
  if(role)sessions[presenceSessionId]={user:user(),time:now};else delete sessions[presenceSessionId];
  try{localStorage.setItem(presenceKey,JSON.stringify(sessions))}catch{}
}
function refreshGroupPanel(){const slot=$('#groups-slot');if(role&&slot)slot.innerHTML=groupsPanel()}
function groupClass(p){
  const sessions=data.classSessions.filter(s=>s.groupId===p.id&&s.date===dateISO(0));
  return sessions.find(s=>s.id===selectedClass)||sessions.at(-1);
}
function groupAttendanceRows(p,session){
  return groupRoster(p).map(id=>{
    const record=session?data.attendance.find(a=>a.sessionId===session.id&&a.memberId===id):null,online=memberOnline(id);
    const token=session?esc(JSON.stringify([p.id,session.id,id])):'';
    return `<li class="group-member"><div class="avatar">${esc(personName(id).slice(0,1))}</div><div class="group-member-info"><strong>${esc(personName(id))}${id===user()?'<small>（我）</small>':''}</strong><span class="member-presence ${online?'is-online':''}"><i></i>${online?'在线':'离线'}</span>${record?`<span class="attendance-detail">${new Date(record.time).toLocaleTimeString('zh-CN',{hour:'2-digit',minute:'2-digit'})} · ${record.signedBy===id?'本人签到':`${esc(record.signerName)} 代签`}</span>`:''}</div>${session?(record?'<span class="attendance-complete">已签到</span>':`<button class="secondary" data-action="group-sign" data-id="${token}">${id===user()?'签到':'为TA签到'}</button>`):'<span class="muted">待开启签到</span>'}</li>`;
  }).join('');
}
function groupsPanel(){
  ensureGroupData();
  const groups=myGroups(),p=groups.find(g=>g.id===selectedGroup)||groups[0];
  if(p)selectedGroup=p.id;
  const session=p?groupClass(p):null,sessions=p?data.classSessions.filter(s=>s.groupId===p.id&&s.date===dateISO(0)):[];
  const signed=session?groupRoster(p).filter(id=>data.attendance.some(a=>a.sessionId===session.id&&a.memberId===id)).length:0;
  return `<section class="panel groups-panel"><div class="panel-head"><div class="section-title">${icon('users')}我的小组<small>${p?groupRoster(p).length:0} 位成员</small></div>${isTeacher()?`<button class="secondary" data-action="group-members">管理成员</button>`:''}${p?`<button class="secondary" data-action="group-class" data-id="${esc(p.id)}">${icon('calendar')}课堂签到</button>`:''}</div>${p?`<div class="group-overview"><span>${esc(p.title)} · 固定成员</span></div><div class="group-class-summary">${session?`<div><strong>${esc(session.title)}</strong><span>${session.date} · 已签到 ${signed}/${groupRoster(p).length}</span></div>`:'<div><strong>今日课堂签到</strong><span>点击“课堂签到”开启本堂课的签到。</span></div>'}</div>${sessions.length>1?`<div class="class-tabs" aria-label="选择课堂">${sessions.map(s=>`<button class="group-tab ${s.id===session?.id?'active':''}" data-action="select-class" data-id="${esc(s.id)}" aria-pressed="${s.id===session?.id}">${esc(s.title)}</button>`).join('')}</div>`:''}<ul class="group-members">${groupAttendanceRows(p,session)}</ul><p class="group-presence-note">在线状态反映当前浏览器内打开的演示会话。</p>`:'<div class="empty">你尚未加入学习小组，请联系教师设置固定成员。</div>'}</section>`;
}
function groupsAction(action,id){
  if(!['group-members','select-group','select-class','group-class','group-sign'].includes(action))return false;
  if(!role)return true;
  ensureGroupData();
  if(action==='group-members'){
    if(!isTeacher())return true;
    const p=data.studyGroup,people=new Map(projectPeople().map(person=>[person.id,person]));
    for(const id of p.members)if(!people.has(id))people.set(id,{id,name:personName(id)});
    modal('管理固定小组成员',`<form id="group-members-form"><p>此名单独立于项目，项目成员变化不会影响这里。</p><label>小组名称<input name="title" required maxlength="100" value="${esc(p.title)}"></label><fieldset class="project-members"><legend>固定小组成员</legend>${[...people.values()].map(person=>`<label><input type="checkbox" name="member:${esc(person.id)}" ${p.members.includes(person.id)?'checked':''}>${esc(person.name)}</label>`).join('')}</fieldset><div class="form-actions"><button class="secondary" type="button" data-action="close">取消</button><button class="primary">保存成员</button></div></form>`);return true;
  }
  if(action==='select-group'){
    if(myGroups().some(p=>p.id===id)){selectedGroup=id;selectedClass='';render()}return true;
  }
  if(action==='select-class'){
    const session=data.classSessions.find(s=>s.id===id&&s.date===dateISO(0));
    if(session&&myGroups().some(p=>p.id===session.groupId)){selectedGroup=session.groupId;selectedClass=id;render()}return true;
  }
  if(action==='group-class'){
    const p=myGroups().find(p=>p.id===id);if(!p)return true;
    modal('课堂签到',`<form id="group-class-form" data-id="${esc(id)}"><p>为“${esc(p.title)}”开启今日课堂签到，同组成员可以为彼此签到。</p><label>课堂名称<input name="title" required maxlength="100" placeholder="例如：第 3 次智能硬件实践课"></label><div class="muted">签到日期：${dateISO(0)} · 每堂课单独记录，显示签到时间和代签人。</div><div class="form-actions"><button type="button" class="secondary" data-action="close">取消</button><button class="primary">开启签到</button></div></form>`);return true;
  }
  if(action==='group-sign'){
    let args;try{args=JSON.parse(id)}catch{return true}if(!Array.isArray(args)||args.length!==3)return true;
    const [groupId,sessionId,memberId]=args,p=myGroups().find(p=>p.id===groupId),session=data.classSessions.find(s=>s.id===sessionId&&s.groupId===groupId&&s.date===dateISO(0));
    if(!p||!session||(!isTeacher()&&!groupRoster(p).includes(user()))||!groupRoster(p).includes(memberId))return true;
    if(data.attendance.some(a=>a.sessionId===sessionId&&a.memberId===memberId)){toast('该成员已签到');return true}
    const record={id:uid(),groupId,sessionId,memberId,memberName:personName(memberId),signedBy:user(),signerName:profile().name,time:new Date().toISOString()};
    data.attendance.push(record);
    if(!save()){data.attendance.pop();return true}
    selectedGroup=groupId;selectedClass=sessionId;render();toast(`${personName(memberId)} 已签到`);return true;
  }
  return true;
}
function groupsSubmit(form,values){
  if(form.id==='group-members-form'){
    if(!role||!isTeacher())throw Error('仅教师可以管理固定小组成员');
    const title=values.title?.trim();if(!title||title.length>100)throw Error('请填写 100 字以内的小组名称');
    const known=new Set([...projectPeople().map(p=>p.id),...data.studyGroup.members]);
    const members=[...known].filter(id=>values['member:'+id]==='on');
    if(!members.length)throw Error('请至少选择一位小组成员');
    data.studyGroup.title=title;data.studyGroup.members=members;
    if(!save())throw Error('小组成员未保存，请重试');
    closeModal();render();toast('固定小组成员已更新');return true;
  }
  if(form.id!=='group-class-form')return false;
  ensureGroupData();
  const p=myGroups().find(p=>p.id===form.dataset.id);
  if(!role||!p)throw Error('只能为自己的小组开启签到');
  const title=values.title?.trim();if(!title||title.length>100)throw Error('请填写 100 字以内的课堂名称');
  let session=data.classSessions.find(s=>s.groupId===p.id&&s.date===dateISO(0)&&s.title===title);
  if(!session){session={id:uid(),groupId:p.id,title,date:dateISO(0),createdBy:user(),created:new Date().toISOString()};data.classSessions.push(session);if(!save())throw Error('课堂未保存，请重试')}
  selectedGroup=p.id;selectedClass=session.id;closeModal();render();toast('课堂签到已开启');return true;
}
function schedulePresenceRefresh(){setTimeout(()=>{updatePresence(true);refreshGroupPanel();schedulePresenceRefresh()},30000)}
schedulePresenceRefresh();
window.addEventListener('storage',event=>{if(event.key===presenceKey)refreshGroupPanel()});
window.addEventListener('pagehide',()=>{const sessions=readPresence();delete sessions[presenceSessionId];try{localStorage.setItem(presenceKey,JSON.stringify(sessions))}catch{}});
window.addEventListener('pageshow',()=>{updatePresence(true);refreshGroupPanel()});
