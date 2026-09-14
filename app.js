'use strict';
const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let data, selectedOwner = '';
const money = (v,c) => new Intl.NumberFormat('ko-KR',{style:'currency',currency:c === 'UNKNOWN' ? 'USD' : c,maximumFractionDigits:2}).format(Number(v));
const date = s => s ? new Date(s).toLocaleString('ko-KR',{timeZone:'UTC',hour12:false})+' UTC' : '기록 없음';
const user = x => x === 'unallocated' ? '미분류' : x;
const status = x => ({running:'실행 중',stopped:'중지',terminated:'종료',pending:'시작 중',stopping:'중지 중','shutting-down':'종료 중',unknown:'확인 필요'}[x] || x);
const empty = msg => `<div class="empty">${esc(msg)}</div>`;
function render(){
  const m = data.months.find(x=>x.month === $('#month').value), cur=$('#currency').value || 'USD';
  const rows=(m?.rows || []).filter(x=>x.currency===cur), known=!!m && Object.hasOwn(m.totals,cur);
  $('#total').textContent=known ? money(m.totals[cur],cur) : '—';
  $('#unallocated').textContent=known ? money(rows.filter(x=>x.owner==='unallocated').reduce((a,x)=>a+Number(x.cost),0),cur) : '—';
  $('#basis').textContent=m ? (m.provisional ? '잠정 비용 · 이후 정정될 수 있음' : '청구 ID 확인 · 이후 정정 가능') : '해당 월 비용 데이터 대기';
  $('#instanceCount').textContent=data.instances.length;
  $('#runningCount').textContent=data.instances.filter(x=>x.state==='running'&&!x.state_stale).length;
  $('#updated').textContent='마지막 수집 '+date(data.generated_at);
  const stale=Date.now()-Date.parse(data.generated_at)>3*3600000;
  const issues=(data.errors||[]).length;
  $('#notice').className='notice'+(!m||stale||issues?' warn':'');
  $('#notice').textContent=!m ? '비용 보고서를 기다리고 있습니다. 인스턴스 기록은 먼저 확인할 수 있습니다.' : '비용 사용내역 기준 '+date(m.usage_through)+' · 보고서 갱신 '+date(m.delivered_at);
  if(stale) $('#notice').textContent+=' · 수집이 3시간 이상 지연되었습니다.';
  if(issues) $('#notice').textContent+=' · 일부 수집 항목을 확인해야 합니다.';
  $('#chartCurrency').textContent=cur;
  const available=data.months.filter(x=>Object.hasOwn(x.totals,cur));
  const max=Math.max(0.01,...available.map(x=>Math.abs(Number(x.totals[cur]))));
  $('#monthly').innerHTML=available.length ? available.map(x=>`<div class="bar-row"><button data-month="${esc(x.month)}">${esc(x.month)}</button><div class="bar-track"><div class="bar-fill ${x.month===m?.month?'selected':''} ${Number(x.totals[cur])<0?'negative':''}" style="width:${Math.abs(Number(x.totals[cur]))/max*100}%"></div></div><span class="amount">${esc(money(x.totals[cur],cur))}</span></div>`).join('') : empty('아직 수집된 비용 보고서가 없습니다.');
  const sums={}; for(const r of rows)sums[r.owner]=(sums[r.owner]||0)+Number(r.cost);
  $('#users').innerHTML=Object.keys(sums).length ? Object.entries(sums).sort((a,b)=>b[1]-a[1]).map(([u,v])=>`<button class="user-row ${selectedOwner===u?'active':''}" data-user="${esc(u)}"><span>${esc(user(u))}</span><b>${esc(money(v,cur))}</b></button>`).join('') : empty('비용 데이터가 도착하면 사용자별로 집계합니다.');
  const q=$('#search').value.toLowerCase(), state=$('#status').value;
  const costs={};for(const r of rows){if(!r.resource)continue; const c=costs[r.resource]||{cost:0,hours:0};c.cost+=Number(r.cost);c.hours+=Number(r.hours);costs[r.resource]=c;}
  // Billing can retain an instance after the EC2/CloudTrail retention window.
  const all=[...data.instances]; const ids=new Set(all.map(i=>i.id));
  for(const r of rows)if(/^i-[a-f0-9]+$/.test(r.resource)&&!ids.has(r.resource)){all.push({id:r.resource,name:r.name,owner:r.owner,type:'—',region:'—',state:'unknown',state_stale:true,events:[]});ids.add(r.resource);}
  const visible=all.filter(i=>(!selectedOwner||i.owner===selectedOwner)&&(!state||i.state===state)&&`${i.id} ${i.name} ${i.owner}`.toLowerCase().includes(q));
  $('#runs').innerHTML=visible.length ? visible.map(i=>{const c=costs[i.id];return `<tr><td><button data-instance="${esc(i.id)}" data-region="${esc(i.region)}">${esc(i.name||'(이름 없음)')}</button><small>${esc(i.id)}</small></td><td>${esc(user(i.owner))}</td><td>${esc(i.type||'—')}<small>${esc(i.region)}</small></td><td><span class="badge ${i.state==='running'&&!i.state_stale?'running':''}">${esc(status(i.state))}${i.state_stale?' · 과거 관측':''}</span></td><td class="amount">${c?esc(money(c.cost,cur)):'—'}</td><td class="amount">${c?c.hours.toLocaleString('ko-KR',{maximumFractionDigits:2})+' h':'—'}</td><td>${esc(date(i.created_at||i.first_seen))}</td></tr>`;}).join('') : '<tr><td colspan="7" class="empty">조건에 맞는 인스턴스 기록이 없습니다.</td></tr>';
  $('#runCount').textContent=`${visible.length}개 표시 · 인스턴스 목록은 전체 기간, 비용·사용 시간은 선택 월 기준. ‘—’는 비용 기록 없음.`;
  $('#recordsTitle').textContent=selectedOwner ? user(selectedOwner)+'의 run 기록':'전체 run 기록';
  $('#costNote').textContent=data.cost_basis;
  $('#historyNote').textContent=data.history_note;
}
function showDetail(id,region){
 const i=data.instances.find(x=>x.id===id&&x.region===region);
 $('#detailTitle').textContent=i?.name||id;
 $('#detailMeta').textContent=`${id} · ${region} · ${i ? user(i.owner) : '비용 보고서에서 발견'} · API 요청 시각 기준`;
 $('#timeline').innerHTML=i?.events.length ? i.events.map(e=>`<div class="event">${esc({start:'시작 요청',stop:'중지 요청',terminate:'종료 요청'}[e.action]||e.action)}<small>${esc(date(e.at))}</small></div>`).join('') : empty('보존된 실행 이벤트가 없습니다.');
 $('#detail').showModal();
}
async function load(){
 $('#refresh').disabled=true;
 try{
  const response=await fetch('./data/dashboard.json',{cache:'no-store'});if(!response.ok)throw Error('HTTP '+response.status);
  const next=await response.json();if(next.schema_version!==1||!Array.isArray(next.months)||!Array.isArray(next.instances))throw Error('Invalid data');data=next;
  const prior=$('#month').value, current=new Date().toISOString().slice(0,7);
  const months=[...new Set([current,...data.months.map(x=>x.month)])].sort().reverse();
  $('#month').innerHTML=months.map(x=>`<option>${esc(x)}</option>`).join('');$('#month').value=months.includes(prior)?prior:months[0];
  const prevCurrency=$('#currency').value, currencies=[...new Set(data.months.flatMap(x=>Object.keys(x.totals)))];if(!currencies.length)currencies.push('USD');
  $('#currency').innerHTML=currencies.map(x=>`<option>${esc(x)}</option>`).join('');if(currencies.includes(prevCurrency))$('#currency').value=prevCurrency;
  const owners=[...new Set([...data.instances.map(x=>x.owner),...data.months.flatMap(x=>x.rows.map(r=>r.owner))])].sort();
  $('#owner').innerHTML='<option value="">전체 사용자</option>'+owners.map(x=>`<option value="${esc(x)}">${esc(user(x))}</option>`).join('');$('#owner').value=selectedOwner;
  render();
 }catch(e){$('#notice').className='notice warn';$('#notice').textContent='데이터를 불러오지 못했습니다. 잠시 후 새로고침하세요.';}finally{$('#refresh').disabled=false;}
}
$('#refresh').onclick=load;$('#month').onchange=render;$('#currency').onchange=render;$('#status').onchange=render;$('#search').oninput=render;
$('#owner').onchange=()=>{selectedOwner=$('#owner').value;render();};$('#reset').onclick=()=>{selectedOwner='';$('#owner').value='';render();};$('#close').onclick=()=>$('#detail').close();
document.addEventListener('click',e=>{const u=e.target.closest('[data-user]');if(u){selectedOwner=u.dataset.user;$('#owner').value=selectedOwner;render();}const m=e.target.closest('[data-month]');if(m){$('#month').value=m.dataset.month;render();}const i=e.target.closest('[data-instance]');if(i)showDetail(i.dataset.instance,i.dataset.region);});
load();
