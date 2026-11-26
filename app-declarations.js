'use strict';
/* Auto Manag KVES · signé KVES · déclarations et exports */
Object.assign(subs,{
decl(m){const Y=route.xy||yr(),ys=[...new Set([yr(),yr()-1,...db.encaissements.map(yearOf),...db.declarations.map(d=>d.annee)])].sort((x,y)=>y-x),today=new Date();
 const card=q=>{const T='T'+q,tx=taxe(encPeriode(Y,q)),r=decl(Y,T),due=dueDate(Y,T),e=db.params.echeances.find(x=>x.t===T),late=!r&&due<today&&tx.caTotal>0,
  chip=!r?`<span class="chip ${late?'bad':'gray'}">${t(late?'dc.s.late':'dc.s.todo')}</span>`:r.statut==='paye'?`<span class="chip">${t('dc.s.paid')}</span>`:`<span class="chip warn">${t('dc.s.decl')}</span>`;
  return `<div class="card"><div class="top"><b>${T} ${Y} · ${t('ql.'+T)}</b>${chip}</div><div class="row"><span>${t('dc.due')}</span><span>${fmt(due)}</span></div><div class="row"><span>${t('tx.ca')}</span><b>${dhx(tx.caTotal)}</b></div><div class="row"><span>${t('dc.calc')}</span><b>${dhx(tx.total)}</b></div>
${r?`<div class="row"><span>${t('dc.declon')}</span><span>${fmt(pd(r.dateDecl))}</span></div>`:''}${r&&r.statut==='paye'?`<div class="row"><span>${t('dc.paidon',fmt(pd(r.datePaie)))}</span><b>${dhx(r.montant)}</b></div>${r.montant!==tx.total?`<span class="mute">${t('dc.diff',dhx(tx.total))}</span>`:''}`:''}${r&&r.ref?`<span class="mute">${esc(r.ref)}</span>`:''}
${!r?`<button data-a="declare" data-q="${q}">${t('dc.b.decl')}</button>`:r.statut==='declare'?`<button data-a="paye" data-q="${q}">${t('dc.b.pay')}</button>`:''}<button class="sec" data-a="fiche" data-q="${q}">${t('dc.b.recap')}</button>${r?`<button class="sec" data-a="undo" data-q="${q}">${t('dc.b.undo')}</button>`:''}</div>`};
 m.innerHTML=`${backBtn(t('back'))}<h1>${t('more.decl')}</h1><p class="mute">${t('dc.hint')}</p><div class="filters">${ys.map(y=>`<button data-y="${y}" aria-pressed="${y===Y}">${y}</button>`).join('')}</div>${[1,2,3,4].map(card).join('')}`;
 wireBack(toPlus);m.querySelectorAll('[data-y]').forEach(b=>b.onclick=()=>{route.xy=+b.dataset.y;viewApp()});
 m.querySelectorAll('[data-a]').forEach(b=>b.onclick=()=>{const T='T'+b.dataset.q,act=b.dataset.a;
  if(act==='declare'||act==='paye')return nav('more','declform',{annee:Y,t:T,step:act});if(act==='fiche')return nav('more','declfiche',{annee:Y,t:T});
  const r=decl(Y,T);confirmBox(m,t('dc.undo.c'),t('dc.undo.y'),async()=>{if(r.statut==='paye'&&!r.auto){r.statut='declare';r.datePaie=null;r.montant=null}else db.declarations=db.declarations.filter(x=>x!==r);log(t('log.dc.undo',T,Y));await persist();viewApp()})})},
declform(m){const a=route.arg||{},Y=a.annee,T=a.t,q=+String(T).slice(1),tx=taxe(encPeriode(Y,q)),today=localIso(),r=decl(Y,T);if(!Y||!T)return nav('more','decl');
 const pay=a.step==='paye';m.innerHTML=`${backBtn(t('back'))}<h1>${t(pay?'dc.f.pay':'dc.f.decl',T,Y)}</h1><div class="card"><div class="row"><span>${t('dc.calc')}</span><b>${dhx(tx.total)}</b></div>
<label>${t(pay?'dc.f.datep':'dc.f.dated')}<input id="x_d" type="date" value="${today}" max="${today}"></label>
${pay?`<label>${t('dc.f.amount')}<input id="x_m" type="text" inputmode="decimal" value="${(tx.total/100).toFixed(2).replace('.',',')}"></label>`:''}
<label>${t('dc.f.ref')}<input id="x_r" type="text" maxlength="100" value="${esc(pay&&r?r.ref||'':'')}"></label>${pay?'':`<span class="mute">${t('dc.f.zero')}</span>`}
<div id="err" class="note bad" role="alert" hidden></div><button id="sv">${t('save')}</button></div>`;
 wireBack(()=>nav('more','decl'));
 $('#sv').onclick=async()=>{const d=$('#x_d').value,end=new Date(Y,q*3,0);if(!/^\d{4}-\d\d-\d\d$/.test(d)||d>today||isNaN(pd(d)))return err(t('enc.e.date'));if(pd(d)<=end)return err(t('dc.e.early',fmt(end)));
  const ref=$('#x_r').value.trim();
  if(!pay){const free=tx.total===0;db.declarations.push({id:uid(),annee:Y,t:T,statut:free?'paye':'declare',auto:free||undefined,dateDecl:d,datePaie:free?d:null,montant:free?0:null,ref,cree:nowIso()})}
  else{if(r.dateDecl&&d<r.dateDecl)return err(t('dc.e.order'));const c=parseCts($('#x_m').value);if(!c)return err(t('enc.e.montant'));Object.assign(r,{statut:'paye',datePaie:d,montant:c,ref:ref||r.ref})}
  log(t(pay?'log.dc.pay':'log.dc.decl',T,Y));await persist();nav('more','decl')}},
declfiche(m){const t=tf,dhx=dhxFr,fmt=fmtFr;const a=route.arg||{},Y=a.annee,T=a.t,q=+String(T).slice(1);if(!Y||!T)return nav('more','decl');
 const L=encPeriode(Y,q).sort((x,y)=>pd(x.date)-pd(y.date)),tx=taxe(L),r=decl(Y,T),e=db.entreprise,p=db.params,per=tf('ql.'+T);
 m.innerHTML=`<div class="noprint">${backBtn(t('back'))}</div><article class="card invoice" dir="ltr" lang="fr"><div class="inv-h"><div><b>${esc(e.nom||'')}</b>${e.ice?`<div>${t('fac.ice')} : ${esc(e.ice)}</div>`:''}${e.idae?`<div>${t('fac.idae')} : ${esc(e.idae)}</div>`:''}</div><div class="inv-n"><b class="inv-t1">${t('dc.recap')}</b><div>${T} ${Y} · ${esc(per)}</div></div></div>
<div class="row"><span>${t('enc.catline',t('cat.services'),dhx(tx.ca.services),p.taux)}</span><b>${dhx(tx.imp.services)}</b></div><div class="row"><span>${t('enc.catline',t('cat.commerce'),dhx(tx.ca.commerce),p.tauxCommerce)}</span><b>${dhx(tx.imp.commerce)}</b></div>
<div class="row"><b>${t('tx.ca')}</b><b>${dhx(tx.caTotal)}</b></div><div class="row"><b>${t('enc.tax')}</b><b>${dhx(tx.total)}</b></div>
<p>${r?t('dc.declon')+' : '+fmt(pd(r.dateDecl))+(r.statut==='paye'?' · '+t('dc.paidon',fmt(pd(r.datePaie)))+' : '+dhx(r.montant):' · '+t('dc.s.decl')):t('dc.s.todo')}${r&&r.ref?' · '+esc(r.ref):''}</p>
<table class="inv-t"><thead><tr><th>${t('enc.date')}</th><th>${t('enc.client')}</th><th>${t('fac.tl')}</th></tr></thead><tbody>${L.map(x=>`<tr><td>${fmt(pd(x.date))}</td><td>${esc(cn(x.clientId)||t('enc.sans'))}</td><td class="num">${dhx(x.montant)}</td></tr>`).join('')||`<tr><td colspan="3">${t('enc.empty')}</td></tr>`}</tbody></table><p class="mute">${t('dc.disc')}</p></article>
<button id="fp" class="sec noprint">${t('fac.print')}</button>`;
 wireBack(()=>nav('more','decl'));$('#fp').onclick=()=>{holdLock();window.print()}},
exp(m){const Y=route.xy||yr(),Q=route.xq||0,ys=[...new Set([yr(),...db.encaissements.map(yearOf),...db.depenses.map(yearOf),...db.documents.map(d=>d.annee)])].sort((x,y)=>y-x),sfx=Y+(Q?'-T'+Q:'');
 m.innerHTML=`${backBtn(t('back'))}<h1>${t('more.exp')}</h1><p class="mute">${t('ex.hint')}</p><div class="filters">${ys.map(y=>`<button data-y="${y}" aria-pressed="${y===Y}">${y}</button>`).join('')}</div><div class="filters">${[0,1,2,3,4].map(q=>`<button data-q="${q}" aria-pressed="${q===Q}">${q?'T'+q:t('enc.f.all')}</button>`).join('')}</div>
<div class="card"><button id="x1">${t('ex.enc')}</button><button id="x2" class="sec">${t('ex.fac')}</button><button id="x3" class="sec">${t('ex.dep')}</button></div>
<div class="card"><b>${t('ex.json')}</b><p class="mute">${t('ex.json.w')}</p><button id="x4" class="sec">${t('ex.json.b')}</button></div>`;
 wireBack(toPlus);m.querySelectorAll('[data-y]').forEach(b=>b.onclick=()=>{route.xy=+b.dataset.y;viewApp()});m.querySelectorAll('[data-q]').forEach(b=>b.onclick=()=>{route.xq=+b.dataset.q;viewApp()});
 const st=x=>tf(x.annule?'enc.cancelled':'ex.valid'),act=id=>an(id)||'',catT=id=>{const c=(db.activites.find(x=>x.id===id)||{}).cat;return c?tf('cat.'+c):''};
 $('#x1').onclick=()=>csvFile('encaissements-'+sfx+'.csv',['Date','Client','Activité','Catégorie','Montant (DH)','Mode','Facture','Note','Statut'],db.encaissements.filter(e=>inPer(e.date,Y,Q)).sort((x,y)=>pd(x.date)-pd(y.date)).map(e=>[e.date.slice(0,10),cn(e.clientId)||'',act(e.activiteId),catT(e.activiteId),csvDh(e.montant),tf('mode.'+e.mode),(db.documents.find(d=>d.id===e.factureId)||{}).numero||'',e.note||'',st(e)]));
 $('#x2').onclick=()=>csvFile('factures-'+sfx+'.csv',['Numéro','Date','Client','ICE client','Activité','Total (DH)','Encaissé (DH)','Reste (DH)','Statut'],db.documents.filter(d=>d.type==='facture'&&inPer(d.date,Y,Q)).sort((x,y)=>x.annee-y.annee||x.seq-y.seq).map(f=>[f.numero,f.date,f.cl.nom,f.cl.ice,act(f.activiteId),csvDh(f.total),csvDh(paye(f)),csvDh(reste(f)),tf(f.statut==='annulee'?'fac.s.annulee':reste(f)===0?'fac.s.payee':'ex.open')]));
 $('#x3').onclick=()=>csvFile('depenses-'+sfx+'.csv',['Date','Catégorie','Fournisseur','Activité','Montant (DH)','Mode','Note','Statut'],db.depenses.filter(d=>inPer(d.date,Y,Q)).sort((x,y)=>pd(x.date)-pd(y.date)).map(d=>[d.date.slice(0,10),(db.catDep.find(c=>c.id===d.cat)||{}).nom||'',d.fournisseur||'',act(d.activiteId),csvDh(d.montant),tf('mode.'+d.mode),d.note||'',st(d)]));
 $('#x4').onclick=()=>confirmBox(m,t('ex.json.c'),t('ex.json.y'),()=>{saveFile('auto-manag-kves-donnees-'+localIso()+'.json','application/json',JSON.stringify(db,null,1));viewApp()})}
});
