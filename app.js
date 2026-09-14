'use strict';
const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let envelope, data, selectedOwner = '';
const money = (v,c) => c==='CREDIT' ? Number(v).toLocaleString('ko-KR',{maximumFractionDigits:2})+' credits' : c==='UNKNOWN' ? Number(v).toLocaleString('ko-KR')+' (단위 미확인)' : new Intl.NumberFormat('ko-KR',{style:'currency',currency:c,maximumFractionDigits:2}).format(Number(v));
const date = s => s ? new Date(s).toLocaleString('ko-KR',{timeZone:'UTC',hour12:false})+' UTC' : '기록 없음';
const user = x => x === 'unallocated' ? '미분류' : x;
const status = x => ({running:'실행 중',stopped:'중지',terminated:'종료',pending:'대기 / 준비 중',queued:'대기열',initializing:'초기화 중',stopping:'중지 중',waitToBeKilled:'종료 대기','shutting-down':'종료 중',unknown:'확인 필요'}[x] || x);
const empty = msg => `<div class="empty">${esc(msg)}</div>`;
const isGPU = () => $('#platform').value==='gpu-first';
const staleRun = i => i.state_stale || !i.last_seen || Date.now()-Date.parse(i.last_seen)>3*3600000;
function selectProvider(){
  data=envelope.providers[$('#platform').value];
  const prior=$('#month').value, current=new Date().toISOString().slice(0,7);
  const months=[...new Set([current,...data.months.map(x=>x.month),...data.instances.flatMap(x=>[...(x.created_at?[x.created_at.slice(0,7)]:[]),...Object.keys(x.runtime_hours||{})])])].sort().reverse();
  $('#month').innerHTML=months.map(x=>`<option>${esc(x)}</option>`).join('');$('#month').value=months.includes(prior)?prior:months[0];
  const currencies=[...new Set(data.months.flatMap(x=>Object.keys(x.totals)))];if(!currencies.length)currencies.push(isGPU()?'CREDIT':'USD');
  $('#currency').innerHTML=currencies.map(x=>`<option>${esc(x)}</option>`).join('');
  const owners=[...new Set([...(data.watched_users||[]),...data.instances.map(x=>x.owner),...data.months.flatMap(x=>x.rows.map(r=>r.owner))])].sort();
  if(!owners.includes(selectedOwner))selectedOwner='';
  $('#owner').innerHTML='<option value="">전체 사용자</option>'+owners.map(x=>`<option value="${esc(x)}">${esc(user(x))}</option>`).join('');$('#owner').value=selectedOwner;
  render();
}
function render(){
  const month=$('#month').value, m=data.months.find(x=>x.month===month), cur=$('#currency').value;
  const rows=(m?.rows||[]).filter(x=>x.currency===cur), known=!!m&&Object.hasOwn(m.totals,cur);
  $('#total').textContent=known?money(m.totals[cur],cur):'—';
  $('#unallocated').textContent=known?money(rows.filter(x=>x.owner==='unallocated').reduce((a,x)=>a+Number(x.cost),0),cur):'—';
  $('#basis').textContent=m?(m.provisional?'잠정 비용 · 이후 정정될 수 있음':'청구 ID 확인 · 이후 정정 가능'):'해당 월 비용 미확인';
  $('#instanceCount').textContent=data.instances.length;
  $('#runningCount').textContent=data.instances.filter(x=>x.state==='running'&&!staleRun(x)).length;
  $('#updated').textContent=data.label+' · 마지막 수집 '+date(data.generated_at);
  const stale=!data.generated_at||Date.now()-Date.parse(data.generated_at)>3*3600000, issues=(data.errors||[]).length;
  $('#notice').className='notice'+(!m||stale||issues?' warn':'');
  $('#notice').textContent=m?'비용 사용내역 기준 '+date(m.usage_through)+' · 보고서 갱신 '+date(m.delivered_at):'비용 보고서를 기다리고 있습니다. run 기록은 먼저 확인할 수 있습니다.';
  if(isGPU()){
    if(data.cost_status==='permission_required')$('#notice').textContent='VESSL이 사용량 CSV 다운로드를 거절했습니다(403/401). 비용은 미확인이며, 조회 가능한 run 기록만 표시합니다.';
    else if(data.cost_status==='schema_unverified')$('#notice').textContent='사용량 CSV의 비용 단위와 날짜 기준을 확인 중입니다. 검증 전에는 비용을 표시하지 않습니다.';
    if(data.status==='auth_required')$('#notice').textContent='VESSL 수집 인증이 설정되지 않았습니다. 이전에 저장한 기록을 표시합니다.';
    $('#notice').textContent+=' · 공개 범위: '+(data.watched_users||[]).join(', ');
  }
  if(stale)$('#notice').textContent+=' · 마지막 수집 후 3시간 이상 지났습니다.';
  if(issues&&!isGPU())$('#notice').textContent+=' · 일부 수집 항목을 확인해야 합니다.';
  if(isGPU()&&(data.errors||[]).some(e=>/runs|projects/.test(e.scope)))$('#notice').textContent+=' · 일부 프로젝트 조회 실패: 저장된 이력 포함.';
  $('#chartCurrency').textContent=cur;
  const available=data.months.filter(x=>Object.hasOwn(x.totals,cur));
  const max=Math.max(0.01,...available.map(x=>Math.abs(Number(x.totals[cur]))));
  $('#monthly').innerHTML=available.length?available.map(x=>`<div class="bar-row"><button data-month="${esc(x.month)}">${esc(x.month)}</button><div class="bar-track"><div class="bar-fill ${x.month===m?.month?'selected':''} ${Number(x.totals[cur])<0?'negative':''}" style="width:${Math.abs(Number(x.totals[cur]))/max*100}%"></div></div><span class="amount">${esc(money(x.totals[cur],cur))}</span></div>`).join(''):empty('아직 수집된 비용 보고서가 없습니다.');
  const sums={};for(const r of rows)sums[r.owner]=(sums[r.owner]||0)+Number(r.cost);
  const owners=[...new Set([...Object.keys(sums),...(data.watched_users||[]),...data.instances.map(x=>x.owner)])];
  $('#users').innerHTML=owners.length?owners.sort((a,b)=>(sums[b]||0)-(sums[a]||0)||a.localeCompare(b)).map(u=>{const count=data.instances.filter(i=>i.owner===u).length;return `<button class="user-row ${selectedOwner===u?'active':''}" data-user="${esc(u)}"><span>${esc(user(u))}<small>${count?count+'개 기록':'조회 범위 내 기록 미발견'}</small></span><b>${known?esc(money(sums[u]||0,cur)):'비용 미확인'}</b></button>`;}).join(''):empty('아직 사용자 기록이 없습니다.');
  const q=$('#search').value.toLowerCase(), state=$('#status').value;
  const costs={};for(const r of rows){if(!r.resource)continue;const c=costs[r.resource]||{cost:0,hours:0};c.cost+=Number(r.cost);c.hours+=Number(r.hours||0);costs[r.resource]=c;}
  const all=[...data.instances], ids=new Set(all.map(i=>i.id));
  for(const r of rows)if(/^i-[a-f0-9]+$/.test(r.resource)&&!ids.has(r.resource)){all.push({id:r.resource,name:r.name,owner:r.owner,type:'—',region:'—',state:'unknown',state_stale:true,events:[]});ids.add(r.resource);}
  const visible=all.filter(i=>(!selectedOwner||i.owner===selectedOwner)&&(!state||i.state===state)&&`${i.id} ${i.name} ${i.owner} ${i.project||''}`.toLowerCase().includes(q));
  $('#runs').innerHTML=visible.length?visible.map(i=>{
    const c=costs[i.id], hours=isGPU()?(i.runtime_hours?.[month]??(i.events?.length?0:null)):(c?.hours??null);
    return `<tr><td><button data-instance="${esc(i.id)}" data-region="${esc(i.region)}">${esc(i.name||'(이름 없음)')}</button><small>${esc(i.id)}</small></td><td>${esc(user(i.owner))}</td><td>${esc(i.type||'—')}${i.gpu_count!=null?' · GPU '+esc(i.gpu_count):''}<small>${esc(i.region)}</small></td><td><span class="badge ${i.state==='running'&&!staleRun(i)?'running':''}">${esc(status(i.state))}${staleRun(i)?' · 과거 관측':''}</span></td><td class="amount">${c?esc(money(c.cost,cur)):'—'}</td><td class="amount">${hours!=null?Number(hours).toLocaleString('ko-KR',{maximumFractionDigits:2})+' h':'—'}</td><td>${esc(date(i.created_at||i.first_seen))}</td></tr>`;
  }).join(''):'<tr><td colspan="7" class="empty">조회 범위 내 조건에 맞는 기록이 없습니다.</td></tr>';
  $('#runCount').textContent=`${visible.length}개 표시 · 기록 목록은 전체 기간, 비용·사용 시간은 선택 월 기준. ‘—’는 미확인.`;
  $('#recordsTitle').textContent=selectedOwner?user(selectedOwner)+'의 run 기록':'전체 run 기록';
  $('#runtimeNote').textContent=isGPU()?'VESSL running 상태 구간만 합산합니다. 대기 시간은 제외하며 청구 시간과 다를 수 있습니다.':'EC2 인스턴스 하나를 run 하나로 표시합니다. 사용 시간은 CUR의 EC2 컴퓨팅 사용량입니다.';
  $('#costNote').textContent=data.cost_basis||'비용 데이터 미연결';$('#historyNote').textContent=data.history_note||'이력 데이터 미연결';
}
function showDetail(id,region){
  const i=data.instances.find(x=>x.id===id&&x.region===region);
  $('#detailTitle').textContent=i?.name||id;
  $('#detailMeta').textContent=`${id} · ${region} · ${i?user(i.owner):'비용 보고서에서 발견'} · ${isGPU()?'VESSL 상태 이력':'API 요청 시각 기준'}`;
  $('#timeline').innerHTML=i?.events?.length?i.events.map(e=>`<div class="event">${esc(e.source==='vessl'?status(e.action):({start:'시작 요청',stop:'중지 요청',terminate:'종료 요청'}[e.action]||e.action))}<small>${esc(date(e.at))}</small></div>`).join(''):empty('보존된 실행 이벤트가 없습니다.');$('#detail').showModal();
}
async function load(){
  $('#refresh').disabled=true;
  try{
    const response=await fetch('./data/dashboard.json',{cache:'no-store'});if(!response.ok)throw Error('HTTP '+response.status);
    const next=await response.json();
    envelope=next.schema_version===1?{providers:{aws:{...next,label:'AWS'}}}:next;
    if(!envelope.providers||!Object.values(envelope.providers).every(p=>Array.isArray(p.months)&&Array.isArray(p.instances)))throw Error('Invalid data');
    const prior=$('#platform').value, keys=Object.keys(envelope.providers);
    $('#platform').innerHTML=keys.map(k=>`<option value="${esc(k)}">${esc(envelope.providers[k].label||k)}</option>`).join('');
    $('#platform').value=keys.includes(prior)?prior:(keys.includes('gpu-first')?'gpu-first':keys[0]);selectProvider();
  }catch(e){$('#notice').className='notice warn';$('#notice').textContent='데이터를 불러오지 못했습니다. 잠시 후 새로고침하세요.';}finally{$('#refresh').disabled=false;}
}
$('#refresh').onclick=load;$('#platform').onchange=()=>{selectedOwner='';$('#search').value='';$('#status').value='';selectProvider();};
$('#month').onchange=render;$('#currency').onchange=render;$('#status').onchange=render;$('#search').oninput=render;
$('#owner').onchange=()=>{selectedOwner=$('#owner').value;render();};$('#reset').onclick=()=>{selectedOwner='';$('#owner').value='';render();};$('#close').onclick=()=>$('#detail').close();
document.addEventListener('click',e=>{const u=e.target.closest('[data-user]');if(u){selectedOwner=u.dataset.user;$('#owner').value=selectedOwner;render();}const m=e.target.closest('[data-month]');if(m){$('#month').value=m.dataset.month;render();}const i=e.target.closest('[data-instance]');if(i)showDetail(i.dataset.instance,i.dataset.region);});
load();
