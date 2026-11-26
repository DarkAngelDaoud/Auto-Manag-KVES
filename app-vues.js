'use strict';
/* Auto Manag KVES · signé KVES · accueil, clients, plus, aides d'export (dépend de app-noyau.js) */
function bar(pct,cls){return`<div class="bar" role="img" aria-label="${Math.round(pct)} %"><i style="width:${Math.min(Math.max(pct,0),100)}%"></i></div>`}
function home(m){const n=nextDeadline(),p=db.params,ca=caCat('services'),pct=ca/(p.plafond*100)*100,days=db.lastBackup?Math.floor((Date.now()-new Date(db.lastBackup))/DAY):null;
 const actives=db.activites.filter(a=>!a.archive),hasC=actives.some(a=>a.cat==='commerce'),caC=caCat('commerce'),pctC=caC/(p.plafondCommerce*100)*100,open=db.taches.filter(x=>!x.fait),demo=db.clients.some(c=>c.demo);
 const tx=taxe(encPeriode(n.annee,+n.t.slice(1)));
 const chip=n.jours===0?t('today'):n.jours===1?t('in1'):t('inN',n.jours);
 m.innerHTML=`<div class="top">${brand(44)}<button class="iconbtn" id="hl" aria-label="${t('lock.now')}"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg></button></div>
<div class="hero">${ring(pct,p.alerte)}<div style="display:flex;flex-direction:column;gap:4px;min-width:0"><span class="mute">${t('hero.cap')}</span><span class="big">${dh(ca)}</span><span class="mute">${t('hero.sur',dhp(p.plafond),dhp(Math.max(p.plafond-ca/100,0)))}</span><span class="mute">${t('hero.alert',p.alerte,dhp(p.plafond*p.alerte/100))}</span></div></div>
<button id="qe">${t('enc.quick')}</button>
${hasC?`<div class="card"><div class="l1"><span>${t('hero.cap2')}</span><b>${dh(caC)}</b></div>${bar(pctC)}<div class="l2"><span>${t('hero.sur',dhp(p.plafondCommerce),dhp(Math.max(p.plafondCommerce-caC/100,0)))}</span><span>${Math.round(pctC)} %</span></div></div>`:''}
<div class="card"><div class="top"><span class="mute">${t('next')}</span><span class="chip ${n.actif?'warn':''}">${chip}</span></div><b style="font-size:18px">${t('decl',n.t,n.annee)}</b><span>${fmt(n.date)} · ${t('ql.'+n.t)}</span><span class="mute">${n.actif?t('alert.on'):t('alert.at',fmt(n.alerte))} ${t('alert.zero',p.penalite)}</span></div>
<div class="card"><b>${t('tx.title',n.t,n.annee)}</b><div class="row"><span>${t('tx.ca')}</span><b>${dhx(tx.caTotal)}</b></div><div class="row"><span>${t('tx.tax')}</span><b>${dhx(tx.total)}</b></div>${tx.caTotal?'':`<span class="mute">${t('tx.none')}</span>`}</div>
${todoDecl().map(x=>`<div class="note ${x.k==='late'?'bad':''}">${t(x.k==='late'?'dc.late':'dc.topay',x.t,x.annee)}</div>`).join('')}
${(()=>{const dp=db.depenses.filter(d=>!d.annule&&yearOf(d)===yr());if(!dp.length)return'';const ca=taxe(encPeriode(yr(),0)).caTotal,ds=dp.reduce((s,d)=>s+d.montant,0);return `<div class="card"><b>${t('dep.res',yr())}</b><div class="row"><span>${t('dep.in')}</span><b>${dhx(ca)}</b></div><div class="row"><span>${t('dep.out')}</span><b>${dhx(ds)}</b></div><div class="row"><b>${t('dep.net')}</b><b>${dhx(ca-ds)}</b></div></div>`})()}
${(()=>{const L=facSorted().filter(f=>reste(f)>0);return L.length?`<div class="card"><div class="row"><b>${t('fac.home',L.length)}</b><b>${dhx(L.reduce((s,f)=>s+reste(f),0))}</b></div></div>`:''})()}
${days===null?`<div class="note">${t('bk.none')}</div>`:days>=7?`<div class="note">${t('bk.old',days)}</div>`:''}
${demo?`<div class="note ok">${t('demo.on')}</div>`:''}
${open.length?`<div class="card"><b>${t('todo')}</b>${open.slice(0,3).map(x=>`<div class="row"><span>${esc(x.texte)}</span><button class="sec" data-tk="${x.id}" style="min-height:40px">${t('done')}</button></div>`).join('')}${open.length>3?`<span class="mute">${t('more_n',open.length-3)}</span>`:''}</div>`:''}
<div class="card"><b>${t('steps')}</b><ul class="steps">${[[1,t('st.vault')],[1,t('st.key')],[!!db.lastBackup,t('st.bk')],[actives.length>0,t('st.act')],[db.clients.some(c=>!c.archive),t('st.cl')],[0,t('st.next')]].map(([d,l],i)=>`<li class="${d?'done':''}"><i>${d?'✓':i+1}</i><span>${l}</span></li>`).join('')}</ul></div>`;
 $('#hl').onclick=lock;$('#qe').onclick=()=>{route.ret={tab:'home'};route.pre=null;nav('more','encform')};m.querySelectorAll('[data-tk]').forEach(b=>b.onclick=async()=>{db.taches.find(y=>y.id===b.dataset.tk).fait=true;await persist();viewApp()})}
function ech(m){const rows=db.params.echeances.map(e=>{const[mm,d]=e.md.split('-').map(Number);return`<div class="row"><span>${e.t} · ${t('ql.'+e.t)}</span><b>${d} ${MOIS[mm-1]}</b></div>`}).join('');m.innerHTML=`<h1>${t('ech.title')}</h1><p class="mute">${t('ech.sub',db.params.alerteJours)}</p><div class="card">${rows}</div><button id="gd">${t('dc.open')}</button>`;$('#gd').onclick=()=>nav('more','decl')}

/* ---- Clients ---- */
function clientsView(m){if(route.sub==='form')return clientForm(m);if(route.sub==='fiche')return clientFiche(m);
 const act=db.clients.filter(c=>!c.archive),arch=db.clients.filter(c=>c.archive),sets={all:act,watch:act.filter(c=>clState(c).alert),idle:act.filter(c=>clState(c).s===0),arch};
 m.innerHTML=`<div class="top"><h1>${t('cl.title')}</h1><button id="ca" style="border-radius:22px">${t('cl.add')}</button></div>
<input type="search" id="q" aria-label="${t('cl.search')}" placeholder="${t('cl.search')}" value="${esc(route.q)}">
<div class="filters">${['all','watch','idle','arch'].map(k=>`<button data-f="${k}" aria-pressed="${route.f===k}">${t('cl.f.'+k,sets[k].length)}</button>`).join('')}</div>
<ul class="list" id="lst"></ul><span class="mute">${t('cl.note',dhp(db.params.seuilClient*db.params.alerte/100),dhp(db.params.seuilClient),db.params.retenue)}</span>`;
 const fill=()=>{const q=route.q.trim().toLowerCase(),l=sets[route.f].filter(c=>!q||c.nom.toLowerCase().includes(q));
  $('#lst').innerHTML=!l.length?`<li class="card"><b>${db.clients.length?t('cl.nores'):t('cl.empty')}</b>${db.clients.length?'':`<p class="mute">${t('cl.empty.t')}</p>`}</li>`:l.map(c=>{const s=clState(c),cls=c.archive?'':s.over?'over':s.alert?'warnc':'';
   return`<li><button class="item ${cls}" data-id="${c.id}"><div class="l1"><span>${esc(c.nom)}</span>${c.archive?`<span class="chip gray">${t('cl.archived')}</span>`:s.over?`<span class="chip bad">${t('cl.overc')}</span>`:s.alert?`<span class="chip warn">${t('cl.alertc')}</span>`:s.s===0?`<span class="chip gray">${t('cl.idle')}</span>`:''}</div>${s.s?`${bar(s.pct)}<div class="l2"><span>${t('cl.sur',dh(s.s),dhp(db.params.seuilClient))}</span><b>${Math.round(s.pct)} %</b></div>`:`<span class="mute">${t('cl.noenc',yr())}</span>`}</button></li>`}).join('');
  $('#lst').querySelectorAll('[data-id]').forEach(b=>b.onclick=()=>nav('clients','fiche',b.dataset.id))};
 fill();$('#q').oninput=e=>{route.q=e.target.value;fill()};
 m.querySelectorAll('[data-f]').forEach(b=>b.onclick=()=>{route.f=b.dataset.f;viewApp()});$('#ca').onclick=()=>nav('clients','form')}
function clientForm(m){const c=db.clients.find(x=>x.id===route.arg)||{};
 m.innerHTML=`${backBtn(t('back'))}<h1>${c.id?t('cl.edit'):t('cl.new')}</h1><div class="card">
<label>${t('f.nom')}<input id="f_nom" type="text" maxlength="80" value="${esc(c.nom||'')}"></label>
<label>${t('f.ice')}<input id="f_ice" type="text" inputmode="numeric" maxlength="15" value="${esc(c.ice||'')}"></label>
<label>${t('f.tel')}<input id="f_tel" type="tel" maxlength="30" value="${esc(c.tel||'')}"></label>
<label>${t('f.mail')}<input id="f_mail" type="email" maxlength="80" value="${esc(c.mail||'')}"></label>
<label>${t('f.adr')}<input id="f_adr" type="text" maxlength="120" value="${esc(c.adr||'')}"></label>
<label>${t('f.note')}<input id="f_note" type="text" maxlength="200" value="${esc(c.note||'')}"></label>
<div id="err" class="note bad" role="alert" hidden></div><button id="sv">${t('save')}</button></div>`;
 wireBack(()=>c.id?nav('clients','fiche',c.id):nav('clients'));
 $('#sv').onclick=async()=>{const v=k=>$('#f_'+k).value.trim(),nom=v('nom');if(!nom)return err(t('cl.req'));
  if(db.clients.some(x=>x.id!==c.id&&x.nom.toLowerCase()===nom.toLowerCase()))return err(t('cl.dup'));
  if(v('ice')&&!/^\d{15}$/.test(v('ice')))return err(t('cl.ice'));if(v('mail')&&!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v('mail')))return err(t('cl.mail'));
  const o=c.id?c:{id:uid(),cree:nowIso(),archive:null};Object.assign(o,{nom,ice:v('ice'),tel:v('tel'),mail:v('mail'),adr:v('adr'),note:v('note')});if(!c.id)db.clients.push(o);
  log(t(c.id?'log.cl.edit':'log.cl.add',nom));await persist();nav('clients','fiche',o.id)}}
function clientFiche(m){const c=db.clients.find(x=>x.id===route.arg);if(!c)return nav('clients');const s=clState(c),cls=s.over?'over':s.alert?'warnc':'';
 const info=[['cl.icer',c.ice],['cl.tel',c.tel],['cl.mailr',c.mail],['cl.adrr',c.adr],['cl.noter',c.note]].filter(x=>x[1]).map(([k,v])=>`<div class="row"><span class="mute">${t(k)}</span><span>${esc(v)}</span></div>`).join('');
 m.innerHTML=`${backBtn(t('cl.back'))}<div class="top"><h1>${esc(c.nom)}</h1>${c.archive?`<span class="chip gray">${t('cl.archived')}</span>`:''}</div>
<div class="card item ${cls}" style="cursor:default"><div class="l1"><span>${t('cl.encyr',yr())}</span>${s.over?`<span class="chip bad">${t('cl.overc')}</span>`:s.alert?`<span class="chip warn">${t('cl.alertc')}</span>`:''}</div>${bar(s.pct)}<div class="l2"><span>${t('cl.sur',dh(s.s),dhp(db.params.seuilClient))}</span><b>${Math.round(s.pct)} %</b></div></div>
${info?`<div class="card">${info}</div>`:''}<button id="ne">${t('cl.enc')}</button><button id="ed" class="sec">${t('cl.edit.b')}</button><button id="ar" class="${c.archive?'':'sec'}">${c.archive?t('cl.rest.b'):t('cl.arch.b')}</button>`;
 wireBack(()=>nav('clients'));$('#ed').onclick=()=>nav('clients','form',c.id);$('#ne').onclick=()=>{route.ret={tab:'clients',sub:'fiche',arg:c.id};route.pre={clientId:c.id};nav('more','encform')};
 const doArch=async()=>{c.archive=c.archive?null:nowIso();log(t(c.archive?'log.cl.arch':'log.cl.rest',c.nom));await persist();nav('clients')};
 $('#ar').onclick=()=>{const u=c.archive?[]:unpaid('clientId',c.id);u.length?confirmBox(m,t('cl.arch.c',u.length),t('cl.arch.yes'),doArch):doArch()}}

/* ---- Plus ---- */
function more(m){if(route.sub)return subs[route.sub](m);
 m.innerHTML=`<h1>${t('tab.more')}</h1><div class="card">${['enc','dep','decl','exp','ent','act','aff','loi','sec','sav','demo'].map(k=>`<button class="link" style="justify-content:space-between;border-top:1px solid var(--line);border-radius:0;width:100%" data-s="${k}">${t('more.'+k)}<span>›</span></button>`).join('')}</div>${upd.p?`<button id="upl">${t('more.upd',upd.p.v)}</button>`:''}<button class="sec" id="lk">${t('lock.now2')}</button><p class="mute" style="text-align:center">${t('more.ver',APP_VERSION)}</p>`;
 if(upd.p)$('#upl').onclick=()=>updStep(2);m.querySelectorAll('[data-s]').forEach(b=>b.onclick=()=>nav('more',b.dataset.s));$('#lk').onclick=lock}
const toPlus=()=>nav('more');
const retGo=()=>{const r=route.ret||{tab:'more',sub:'enc'};route.ret=null;route.pre=null;nav(r.tab,r.sub,r.arg)};
const csvCell=v=>{let s=String(v==null?'':v);if(/^[=+\-@\t\r]/.test(s))s="'"+s;return/[;"\n\r]/.test(s)?'"'+s.replace(/"/g,'""')+'"':s};
const csvDh=c=>(c/100).toFixed(2).replace('.',',');
const saveFile=(name,mime,text)=>{holdLock();const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([text],{type:mime}));a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),4000)};
const csvFile=(name,head,rows)=>saveFile(name,'text/csv;charset=utf-8','﻿'+[head,...rows].map(r=>r.map(csvCell).join(';')).join('\r\n'));
const inPer=(date,Y,Q)=>yearOf({date})===Y&&(!Q||qOf(date)===Q);
