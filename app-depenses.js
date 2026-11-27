'use strict';
/* Auto Manag KVES · signé KVES · dépenses */
Object.assign(subs,{
dep(m){const Y=route.dy||yr(),Q=route.dq||0,all=db.depenses.filter(d=>yearOf(d)===Y&&(!Q||qOf(d.date)===Q)).sort((x,y)=>pd(y.date)-pd(x.date)||String(y.cree||'').localeCompare(String(x.cree||''))),ok=all.filter(d=>!d.annule);
 const ds=ok.reduce((s,d)=>s+d.montant,0),ca=taxe(encPeriode(Y,Q)).caTotal,ys=[...new Set([yr(),...db.depenses.map(yearOf),...db.encaissements.map(yearOf)])].sort((x,y)=>y-x),cn2=id=>(db.catDep.find(c=>c.id===id)||{}).nom||t('dep.c.autre'),an2=id=>id?(db.activites.find(x=>x.id===id)||{}).nom:null;
 const byCat=[...new Set(ok.map(d=>d.cat))].map(k=>[cn2(k),ok.filter(d=>d.cat===k).reduce((s,d)=>s+d.montant,0)]).sort((x,y)=>y[1]-x[1]);
 m.innerHTML=`${backBtn(t('back'))}<div class="top"><h1>${t('dep.title')}</h1><button class="u1" id="da">${t('dep.add')}</button></div>
<div class="filters">${ys.map(y=>`<button data-y="${y}" aria-pressed="${y===Y}">${y}</button>`).join('')}</div>
<div class="filters">${[0,1,2,3,4].map(q=>`<button data-q="${q}" aria-pressed="${q===Q}">${q?'T'+q:t('enc.f.all')}</button>`).join('')}</div>
<div class="card"><b>${t('dep.sum')}</b><div class="row"><span>${t('dep.in')}</span><b>${dhx(ca)}</b></div><div class="row"><span>${t('dep.out')}</span><b>${dhx(ds)}</b></div><div class="row"><b>${t('dep.net')}</b><b>${dhx(ca-ds)}</b></div>${byCat.map(([n,v])=>`<div class="row"><span class="mute">${esc(n)}</span><span>${dhx(v)}</span></div>`).join('')}<span class="mute">${t('dep.note')}</span></div>
<button class="sec" id="dc">${t('dep.cats')}</button><ul class="list">${all.length?all.map(d=>`<li class="card ${d.annule?'cancelled':''}"><div class="l1"><span>${esc(d.fournisseur||cn2(d.cat))}</span><b class="amt">${dhx(d.montant)}</b></div><div class="l2"><span>${fmt(pd(d.date))} · ${esc(cn2(d.cat))}${an2(d.activiteId)?' · '+esc(an2(d.activiteId)):''}</span><span>${t('mode.'+d.mode)}</span></div>${d.note?`<span class="mute">${esc(d.note)}</span>`:''}${d.annule?`<span class="chip bad u2">${t('enc.cancelled')}</span>`:''}<button class="${d.annule?'':'sec'} u3" data-d="${d.id}">${t(d.annule?'enc.restore':'enc.cancel')}</button></li>`).join(''):`<li class="card"><b>${t('dep.empty')}</b></li>`}</ul>`;
 wireBack(toPlus);$('#da').onclick=()=>{route.ret={tab:'more',sub:'dep'};nav('more','depform')};$('#dc').onclick=()=>nav('more','depcat');
 m.querySelectorAll('[data-y]').forEach(b=>b.onclick=()=>{route.dy=+b.dataset.y;viewApp()});m.querySelectorAll('[data-q]').forEach(b=>b.onclick=()=>{route.dq=+b.dataset.q;viewApp()});
 m.querySelectorAll('[data-d]').forEach(b=>b.onclick=()=>{const d=db.depenses.find(x=>x.id===b.dataset.d);
  if(d.annule){d.annule=null;log(t('log.dep.restore',dhx(d.montant)));return persist().then(viewApp)}
  confirmBox(m,t('dep.cancel.c'),t('enc.cancel.yes'),async()=>{d.annule=nowIso();log(t('log.dep.cancel',dhx(d.montant)));await persist();viewApp()})})},
depform(m){const today=localIso(),opt=(v,l,s)=>`<option value="${esc(v)}" ${s?'selected':''}>${esc(l)}</option>`;
 m.innerHTML=`${backBtn(t('back'))}<h1>${t('dep.new')}</h1><div class="card">
<label>${t('dep.date')}<input id="d_date" type="date" value="${today}" max="${today}"></label>
<label>${t('dep.montant')}<input id="d_m" type="text" inputmode="decimal" autocomplete="off" placeholder="250,00"></label>
<label>${t('dep.cat')}<select id="d_cat">${db.catDep.map(c=>opt(c.id,c.nom)).join('')}</select></label>
<label>${t('dep.four')}<input id="d_four" type="text" maxlength="100"></label>
<label>${t('dep.act')}<select id="d_act">${opt('',t('dep.noact'))}${db.activites.filter(x=>!x.archive).map(x=>opt(x.id,x.nom)).join('')}</select></label>
<label>${t('enc.mode')}<select id="d_mode">${['esp','carte','vir'].map(k=>opt(k,t('mode.'+k))).join('')}</select></label>
<label>${t('enc.note')}<input id="d_note" type="text" maxlength="200"></label>
<div id="err" class="note bad" role="alert" hidden></div><button id="sv">${t('dep.save')}</button></div>`;
 wireBack(()=>{route.ret=null;nav('more','dep')});
 $('#sv').onclick=async()=>{const d=$('#d_date').value,c=parseCts($('#d_m').value);if(!/^\d{4}-\d\d-\d\d$/.test(d)||d>today||isNaN(pd(d)))return err(t('enc.e.date'));if(!c)return err(t('enc.e.montant'));
  db.depenses.push({id:uid(),date:d,montant:c,cat:$('#d_cat').value,fournisseur:$('#d_four').value.trim(),activiteId:$('#d_act').value||null,mode:$('#d_mode').value,note:$('#d_note').value.trim(),annule:null,cree:nowIso()});
  log(t('log.dep.add',dhx(c)));await persist();nav('more','dep')}},
depcat(m){const used=id=>db.depenses.some(d=>d.cat===id);
 m.innerHTML=`${backBtn(t('back'))}<h1>${t('dep.cats')}</h1><div class="card">${db.catDep.map(c=>`<div class="row"><span>${esc(c.nom)}</span>${used(c.id)?`<span class="mute">${t('dep.used')}</span>`:`<button class="sec u4" data-r="${esc(c.id)}">${t('dep.rm')}</button>`}</div>`).join('')}</div>
<div class="card"><label>${t('dep.newcat')}<input id="c_n" type="text" maxlength="40"></label><div id="err" class="note bad" role="alert" hidden></div><button id="sv">${t('dep.addcat')}</button></div>`;
 wireBack(()=>nav('more','dep'));
 m.querySelectorAll('[data-r]').forEach(b=>b.onclick=async()=>{db.catDep=db.catDep.filter(c=>c.id!==b.dataset.r);await persist();viewApp()});
 $('#sv').onclick=async()=>{const n=$('#c_n').value.trim();if(!n)return err(t('dep.e.cat'));if(db.catDep.some(c=>c.nom.toLowerCase()===n.toLowerCase()))return err(t('dep.e.dup'));db.catDep.push({id:uid(),nom:n});log(t('log.dep.cat',n));await persist();viewApp()}}
});
