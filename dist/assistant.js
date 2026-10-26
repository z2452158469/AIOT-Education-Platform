const assistantSessions=new Map();
let assistantConnection={state:'idle'};
function assistantState(){
  const owner=user();
  if(!assistantSessions.has(owner)){
    let messages=[];try{const stored=JSON.parse(sessionStorage.getItem('zhixing-ai-'+owner));if(Array.isArray(stored))messages=stored.filter(m=>m&&['user','assistant'].includes(m.role)&&typeof m.content==='string').slice(-20)}catch{}
    assistantSessions.set(owner,{messages,draft:'',projectId:'',busy:false,error:''});
  }
  return assistantSessions.get(owner);
}
function assistantPanel(){
  const state=assistantState(),projects=myProjects();
  if(!projects.some(p=>p.id===state.projectId))state.projectId='';
  return `<section class="panel assistant-panel"><div class="panel-head"><div class="section-title">${icon('leaf')}AI 学习助手<small>DeepSeek</small></div><button class="text-button" data-action="assistant-clear" ${state.busy?'disabled':''}>新对话</button></div><p class="assistant-intro">拆解难题、理清思路，让每一步探索更有方向。</p><div class="assistant-connection ${assistantConnection.state==='ready'?'ready':''}" role="status">${assistantConnection.state==='ready'?'DeepSeek 服务已配置':assistantConnection.state==='checking'?'正在检查连接…':'DeepSeek 尚未连接，请联系教师配置。'}<button data-action="assistant-connect" class="text-button">刷新状态</button></div><div class="assistant-messages" role="log" aria-label="学习指导对话" aria-live="polite">${state.messages.length?state.messages.map(m=>`<div class="assistant-message ${m.role}"><span>${m.role==='user'?'我':'AI 学习助手'}</span><p>${esc(m.content)}</p></div>`).join(''):'<div class="assistant-welcome"><strong>今天想解决什么问题？</strong><p>告诉我你的目标、已经尝试的方法，以及卡住的地方。</p></div>'}${state.busy?`<div class="assistant-message user"><span>我</span><p>${esc(state.pending||'')}</p></div><div class="assistant-thinking" role="status">正在整理指导思路…</div>`:''}</div><div class="assistant-prompts">${['帮我拆解项目步骤','带我排查代码问题','帮我理解一个知识点'].map((text,i)=>`<button class="assistant-prompt" data-action="assistant-prompt" data-id="${i}" ${state.busy?'disabled':''}>${text}</button>`).join('')}</div><form id="assistant-form"><label class="assistant-context" for="assistant-project">项目背景<select id="assistant-project" name="projectId" ${state.busy?'disabled':''}><option value="">不附带项目</option>${projects.map(p=>`<option value="${esc(p.id)}" ${p.id===state.projectId?'selected':''}>${esc(p.title)}</option>`).join('')}</select></label><label class="sr-only" for="assistant-question">你的学习问题</label><textarea id="assistant-question" name="question" required maxlength="2000" placeholder="描述你的问题，或贴上需要理解的代码…" ${state.busy?'disabled':''}>${esc(state.draft)}</textarea>${state.error?`<p class="assistant-error" role="alert">${esc(state.error)}</p>`:''}<div class="assistant-send"><span>仅发送对话及主动选择的项目描述；AI 建议请结合实践验证。</span><button type="submit" class="primary" ${state.busy?'disabled':''}>${state.busy?'思考中…':'发送问题'}</button></div></form></section>`;
}
function refreshAssistantPanel(){if(!role)return;const slot=$('#assistant-slot');if(slot){slot.innerHTML=assistantPanel();const log=$('.assistant-messages');if(log)log.scrollTop=log.scrollHeight}}
function assistantAction(action,id){
  if(!['assistant-clear','assistant-prompt','assistant-connect'].includes(action))return false;
  const state=assistantState();
  if(state.busy)return true;
  if(action==='assistant-clear'){state.messages=[];state.draft='';state.error='';state.projectId='';try{sessionStorage.removeItem('zhixing-ai-'+user())}catch{}refreshAssistantPanel()}
  if(action==='assistant-prompt'){state.draft=['请帮我把项目拆解成几个可以逐步完成的小步骤。','我在代码调试时遇到了问题，请先引导我整理现象和排查方向。','请用例子帮助我理解这个知识点：'][Number(id)]||'';refreshAssistantPanel();$('#assistant-question')?.focus()}
  if(action==='assistant-connect')checkAssistantConnection();
  return true;
}
function assistantInput(event){if(event.target.id!=='assistant-question')return false;assistantState().draft=event.target.value;return true}
async function assistantSubmit(form){
  if(!role)return;
  const owner=user(),values=Object.fromEntries(new FormData(form).entries()),state=assistantState();
  if(state.busy)return;
  const question=String(values.question||'').trim();state.draft=question;
  state.projectId=String(values.projectId||'');
  if(!question||question.length>2000){state.error='请输入 2000 字以内的问题。';refreshAssistantPanel();return}
  if(assistantConnection.state!=='ready'){state.error='AI 服务尚未就绪，请先检查连接或联系教师配置。';refreshAssistantPanel();return}
  const project=myProjects().find(p=>p.id===state.projectId);
  const context=project?`${project.title}\n${project.description||''}`.slice(0,2000):'';
  const history=state.messages.slice(-10);
  while(history.reduce((length,m)=>length+m.content.length,question.length+context.length)>16000&&history.length)history.splice(0,2);
  state.busy=true;state.error='';state.pending=question;state.draft='';refreshAssistantPanel();
  try{
    const response=await fetch('/api/ai/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({messages:[...history,{role:'user',content:question}],...(context?{context}:{})}),signal:AbortSignal.timeout(60000)});
    let result;try{result=await response.json()}catch{throw Error('AI 服务返回异常，请稍后重试。')}
    if(!response.ok)throw Error(result.error||'暂时无法获得指导，请稍后重试。');
    if(typeof result.reply!=='string'||!result.reply.trim())throw Error('AI 暂未返回有效指导，请重新提问。');
    state.messages=[...state.messages,{role:'user',content:question},{role:'assistant',content:result.reply.slice(0,12000)}].slice(-20);
    try{sessionStorage.setItem('zhixing-ai-'+owner,JSON.stringify(state.messages))}catch{}
  }catch(error){state.draft=question;state.error=error.name==='TimeoutError'||error.name==='AbortError'?'回复超时，问题已保留，请重试。':error.message==='Failed to fetch'?'网络连接失败，问题已保留，请重试。':String(error.message||'发送失败，请重试。').slice(0,300)}
  finally{state.busy=false;state.pending='';if(role&&user()===owner)refreshAssistantPanel()}
}
async function checkAssistantConnection(){
  if(assistantConnection.state==='checking')return;
  assistantConnection.state='checking';refreshAssistantPanel();
  try{
    if(typeof fetch!=='function')throw Error('offline');
    const response=await fetch('/api/ai/status',{cache:'no-store',signal:AbortSignal.timeout(10000)});
    if(!response.ok)throw Error('offline');
    const result=await response.json();assistantConnection.state=result.configured?'ready':'unconfigured';
  }catch{assistantConnection.state='unavailable'}
  refreshAssistantPanel();
}
function ensureAssistantConnection(){if(assistantConnection.state==='idle')checkAssistantConnection()}
document.addEventListener('change',event=>{if(event.target.id==='assistant-project'&&role)assistantState().projectId=event.target.value});
