'use strict';
/* Auto Manag KVES · signé KVES · encaissements */
Object.assign(subs,{
enc(m){const Y=route.ey||yr(),Q=route.eq||0,all=db.encaissements.filter(e=>yearOf(e)===Y&&(!Q||qOf(e.date)===Q)).sort((a,b)=>pd(b.date)-pd(a.date)||String(b.cree||'').localeCompare(String(a.cree||'')));
 const tx=taxe(all.filter(e=>!e.annule)),ys=[...new Set([yr(),...db.encaissements.map(yearOf)])].sort((a,b)=>b-a),p=db.params,hasC=tx.ca.commerce>0||db.activites.some(a=>a.cat==='commerce'&&!a.archive);
 const line=(k,lab,taux)=>`<div class="row"><span>${t('enc.catline',lab,dhx(tx.ca[k]),taux)}</span><b>${dhx(tx.imp[k])}</b></div>`;
 m.innerHTML=`${backBtn(t('back'))}<div class="top"><h1>${t('enc.title')}</h1><button id="ea" style="border-radius:22px">${t('enc.add')}</button></div>
<div class="filters">${ys.map(y=>`<button data-y="${y}" aria-pressed="${y===Y}">${y}</button>`).join('')}</div>
<div class="filters">${[0,1,2,3,4].map(q=>`<button data-q="${q}" aria-pressed="${q===Q}">${q?'T'+q:t('enc.f.all')}</button>`).join('')}</div>
<div class="card"><b>${t('enc.sum')}</b>${line('services',t('cat.services'),p.taux)}${hasC?line('commerce',t('cat.commerce'),p.tauxCommerce):''}<div class="row"><b>${t('enc.ca')}</b><b>${dhx(tx.caTotal)}</b></div><div class="row"><b>${t('enc.tax')}</b><b>${dhx(tx.total)}</b></div><span class="mute">${t('enc.round')}</span></div>
<div id="err" class="note bad" hidden></div><ul class="list">${all.length?all.map(e=>`<li class="card ${e.annule?'cancelled':''}"><div class="l1"><span>${esc(cn(e.clientId)||t('enc.sans'))}</span><b class="amt">${dhx(e.montant)}</b></div><div class="l2"><span>${fmt(pd(e.date))} · ${esc(an(e.activiteId)||'')}</span><span>${t('mode.'+e.mode)}</span></div>${e.note?`<span class="mute">${esc(e.note)}</span>`:''}${e.annule?`<span class="chip bad" style="align-self:flex-start">${t('enc.cancelled')}</span>`:''}<button class="${e.annule?'':'sec'}" data-e="${e.id}" style="min-height:44px">${t(e.annule?'enc.restore':'enc.cancel')}</button></li>`).join(''):`<li class="card"><b>${t('enc.empty')}</b></li>`}</ul>`;
 wireBack(toPlus);$('#ea').onclick=()=>{route.ret={tab:'more',sub:'enc'};route.pre=null;nav('more','encform')};
 m.querySelectorAll('[data-y]').forEach(b=>b.onclick=()=>{route.ey=+b.dataset.y;viewApp()});m.querySelectorAll('[data-q]').forEach(b=>b.onclick=()=>{route.eq=+b.dataset.q;viewApp()});
 m.querySelectorAll('[data-e]').forEach(b=>b.onclick=()=>{const e=db.encaissements.find(x=>x.id===b.dataset.e);
  if(e.annule){e.annule=null;log(t('log.enc.restore',dhx(e.montant)));return persist().then(viewApp)}
  confirmBox(m,t('enc.cancel.c'),t('enc.cancel.yes'),async()=>{e.annule=nowIso();log(t('log.enc.cancel',dhx(e.montant)));await persist();viewApp()})})},
encform(m){const act=db.activites.filter(a=>!a.archive),pre=route.pre||{};
 if(!act.length){m.innerHTML=`${backBtn(t('back'))}<h1>${t('enc.new')}</h1><div class="card"><p>${t('enc.noact')}</p><button id="goact">${t('enc.noact.b')}</button></div>`;wireBack(retGo);$('#goact').onclick=()=>nav('more','actform');return}
 const today=localIso(),opt=(v,l,s)=>`<option value="${esc(v)}" ${s?'selected':''}>${esc(l)}</option>`;
 m.innerHTML=`${backBtn(t('back'))}<h1>${t('enc.new')}</h1><div class="card">
<label>${t('enc.date')}<input id="e_date" type="date" value="${today}" max="${today}"></label>
<label>${t('enc.client')}<select id="e_cl">${opt('',t('enc.noclient'),!pre.clientId)}${db.clients.filter(c=>!c.archive).map(c=>opt(c.id,c.nom,c.id===pre.clientId)).join('')}</select></label>
<label>${t('enc.act')}<select id="e_act">${act.map(a=>opt(a.id,a.nom+' · '+t('cat.'+a.cat),a.id===pre.activiteId)).join('')}</select></label>
<label>${t('enc.montant')}<input id="e_m" type="text" inputmode="decimal" autocomplete="off" placeholder="1500,00" value="${pre.montant?(pre.montant/100).toFixed(2).replace('.',','):''}"></label>
<label>${t('enc.mode')}<select id="e_mode">${['cmd','liv','acompte','solde','vir'].map(k=>opt(k,t('mode.'+k))).join('')}</select></label>
<label>${t('enc.note')}<input id="e_note" type="text" maxlength="200" value="${pre.numero?esc(t('fac.note',pre.numero)):''}"></label>
<div id="err" class="note bad" role="alert" hidden></div><button id="sv">${t('enc.save')}</button></div>`;
 wireBack(retGo);
 $('#sv').onclick=async()=>{const d=$('#e_date').value,c=parseCts($('#e_m').value);if(!/^\d{4}-\d\d-\d\d$/.test(d)||d>today||isNaN(pd(d)))return err(t('enc.e.date'));if(!c)return err(t('enc.e.montant'));if(!$('#e_act').value)return err(t('enc.e.act'));let fid=null,fc=$('#e_cl').value||null,fa=$('#e_act').value;if(pre.factureId){const fx=db.documents.find(x=>x.id===pre.factureId);if(!fx||c>reste(fx))return err(t('fac.e.over',dhx(fx?reste(fx):0)));fid=fx.id;fc=fx.clientId;fa=fx.activiteId}
  db.encaissements.push({id:uid(),date:d,clientId:fc,activiteId:fa,factureId:fid,montant:c,mode:$('#e_mode').value,note:$('#e_note').value.trim(),annule:null,cree:nowIso()});
  log(t('log.enc.add',dhx(c)));await persist();retGo()}}
});
