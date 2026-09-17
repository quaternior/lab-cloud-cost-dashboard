'use strict';
const $=s=>document.querySelector(s), esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money=v=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:2}).format(v);
const number=v=>new Intl.NumberFormat('ko-KR',{maximumFractionDigits:2}).format(v);
const stamp=v=>new Date(v).toISOString().slice(0,16).replace('T',' ')+' UTC';
const label=s=>({running:'실행 중',stopped:'중지',terminated:'종료'}[s]||s);
let data;
function usage(run,month){
 const [year,m]=month.split('-').map(Number),start=Date.UTC(year,m-1,1),end=Date.UTC(year,m,1),snapshot=Date.parse(data.snapshot_at);
 const hours=run.sessions.reduce((sum,s)=>sum+Math.max(0,Math.min(Date.parse(s.end||data.snapshot_at),end,snapshot)-Math.max(Date.parse(s.start),start))/3600000,0);
 const spec=data.specs[run.type];return {hours,cost:hours*spec.rate,gpuHours:hours*spec.gpu};
}
function sum(runs,month,key){return runs.reduce((n,r)=>n+usage(r,month)[key],0);}
function render(){
 const month=$('#month').value,owner=$('#owner').value,scoped=data.runs.filter(r=>!owner||r.owner===owner),rows=scoped.filter(r=>usage(r,month).hours>0);
 $('#cost').textContent=money(sum(scoped,month,'cost'));$('#hours').textContent=number(sum(scoped,month,'hours'))+' h';$('#gpuHours').textContent=number(sum(scoped,month,'gpuHours'))+' GPU·h';
 const active=scoped.filter(r=>r.state==='running');$('#active').textContent=active.length+'대';$('#activeNote').textContent='스냅샷 기준 L40S '+active.reduce((n,r)=>n+data.specs[r.type].gpu,0)+'개';
 $('#scope').textContent=`${owner||'연구실 전체'} · ${month} · ${month===data.months[0]?'월중 예시 (1~16일)':'전체 월 예시'} · EC2 컴퓨팅만 포함`;
 $('#costBasis').textContent='보고용 가상 단가 · 실제 청구액 아님';
 const months=[...data.months].reverse().map(m=>({month:m,cost:sum(scoped,m,'cost')})),max=Math.max(1,...months.map(m=>m.cost));
 $('#monthly').innerHTML=months.map(m=>`<div class="bar-row"><button data-month="${m.month}" aria-pressed="${m.month===month}">${m.month}</button><div class="bar-track"><div class="bar-fill ${m.month===month?'selected':''}" style="width:${m.cost/max*100}%"></div></div><span class="amount">${money(m.cost)}</span></div>`).join('');
 const total=sum(data.runs,month,'cost');
 $('#users').innerHTML=data.users.map(u=>({name:u,runs:data.runs.filter(r=>r.owner===u)})).map(u=>({...u,cost:sum(u.runs,month,'cost'),hours:sum(u.runs,month,'hours')})).sort((a,b)=>b.cost-a.cost).map(u=>`<button class="user-row ${u.name===owner?'active':''}" data-owner="${esc(u.name)}" aria-pressed="${u.name===owner}"><span>${esc(u.name)}<small>${number(u.hours)} h · ${u.runs.filter(r=>usage(r,month).hours>0).length}개 run</small></span><b>${money(u.cost)}<span class="share">연구실 합계의 ${number(total?u.cost/total*100:0)}%</span></b></button>`).join('');
 const query=$('#search').value.trim().toLowerCase(),state=$('#status').value;
 const visible=rows.filter(r=>(!state||r.state===state)&&`${r.name} ${r.owner} ${r.id} ${r.type}`.toLowerCase().includes(query)).sort((a,b)=>b.created_at.localeCompare(a.created_at));
 $('#runs').innerHTML=visible.map(r=>{const v=usage(r,month),spec=data.specs[r.type];return `<tr><td><button data-run="${r.id}">${esc(r.name)}</button><small>${r.id}</small></td><td>${esc(r.owner)}</td><td>${r.type}<small>L40S × ${spec.gpu} · ${r.region}</small></td><td><span class="badge ${r.state==='running'?'running':''}">${label(r.state)}</span></td><td class="amount">${number(v.hours)} h</td><td class="amount">${money(v.cost)}</td><td>${r.created_at.slice(0,10)}</td></tr>`;}).join('')||'<tr><td colspan="7" class="empty">선택 조건에 맞는 예시 기록이 없습니다.</td></tr>';
 $('#recordNote').textContent='선택 월에 사용한 인스턴스만 표시합니다. 상태는 고정 스냅샷 기준입니다.';
 $('#count').textContent=`${visible.length} / ${rows.length}개 표시 · 상태·검색 필터는 목록에만 적용됩니다. 요약은 선택 월·사용자 기준입니다.`;
}
function detail(id){
 const r=data.runs.find(r=>r.id===id),s=data.specs[r.type],v=usage(r,$('#month').value);
 $('#detailTitle').textContent=r.name;
 $('#detailMeta').textContent=`가상 예시 · ${r.id}\n${r.type} · L40S × ${s.gpu} · ${s.vcpu} vCPU · ${s.memory_gib} GiB RAM\n선택 월 ${number(v.hours)} h × 가상 $${s.rate}/h = ${money(v.cost)}`;
 const events=[];r.sessions.forEach((session,i)=>{events.push({at:session.start,title:i?'재시작':'실행 시작'});events.push({at:session.end||data.snapshot_at,title:session.end?(r.state==='terminated'&&i===r.sessions.length-1?'종료':'중지'):'스냅샷 시점까지 실행 중'});});
 $('#timeline').innerHTML=events.map(e=>`<div class="event">${e.title}<small>${stamp(e.at)}</small></div>`).join('');$('#detail').showModal();
}
async function init(){
 try{const r=await fetch('./data.json');if(!r.ok)throw Error();data=await r.json();if(data.demo!==true)throw Error();
 $('#month').innerHTML=data.months.map(m=>`<option>${m}</option>`).join('');$('#owner').innerHTML='<option value="">연구실 전체</option>'+data.users.map(u=>`<option>${esc(u)}</option>`).join('');
 $('#snapshot').textContent='가상 스냅샷 '+stamp(data.snapshot_at)+' · 자동 갱신 없음';render();
 }catch{$('#scope').textContent='데모 데이터를 불러오지 못했습니다. 새로고침해 주세요.';}
}
$('#month').onchange=render;$('#owner').onchange=render;$('#status').onchange=render;$('#search').oninput=render;
$('#reset').onclick=()=>{$('#owner').value='';$('#status').value='';$('#search').value='';render();};$('#print').onclick=()=>window.print();$('#close').onclick=()=>$('#detail').close();
document.addEventListener('click',e=>{const m=e.target.closest('[data-month]');if(m){$('#month').value=m.dataset.month;render();}const u=e.target.closest('[data-owner]');if(u){$('#owner').value=u.dataset.owner;render();}const r=e.target.closest('[data-run]');if(r)detail(r.dataset.run);});
init();
