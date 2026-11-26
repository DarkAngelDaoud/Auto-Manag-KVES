'use strict';
/* Auto Manag KVES · signé KVES · factures (dépend de app-noyau.js) */
function invView(m){({list:invList,form:invForm,apercu:invApercu,fiche:invFiche})[route.sub||'list'](m)}
function invList(m){const L=facSorted(),due=L.reduce((s,f)=>s+reste(f),0);
 m.innerHTML=`<div class="top"><h1>${t('tab.inv')}</h1><button id="fa" style="border-radius:22px">${t('fac.add')}</button></div>
${L.length?`<div class="card"><div class="row"><span>${t('fac.due')}</span><b>${dhx(due)}</b></div></div>`:''}
<ul class="list">${L.length?L.map(f=>{const r=reste(f),ch=f.statut==='annulee'?`<span class="chip bad">${t('fac.s.annulee')}</span>`:r===0?`<span class="chip">${t('fac.s.payee')}</span>`:`<span class="chip ${f.echeance&&f.echeance<localIso()?'bad':'warn'}">${t(f.echeance&&f.echeance<localIso()?'fac.s.late':'fac.s.reste',dhx(r))}</span>`;
 return `<li class="card item ${f.statut==='annulee'?'cancelled':''}" data-f="${f.id}" role="button" tabindex="0"><div class="l1"><b>${esc(f.numero)}</b><b class="amt">${dhx(f.total)}</b></div><div class="l2"><span>${esc(f.cl.nom)} · ${fmt(pd(f.date))}</span>${ch}</div></li>`}).join(''):`<li class="card"><b>${t('fac.empty')}</b><p class="mute">${t('fac.empty.t')}</p></li>`}</ul>`;
 $('#fa').onclick=()=>{route.fd=null;nav('inv','form')};
 m.querySelectorAll('[data-f]').forEach(li=>{const go=()=>nav('inv','fiche',li.dataset.f);li.onclick=go;li.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();go()}}})}
function invForm(m){const act=db.activites.filter(x=>!x.archive),cls=db.clients.filter(c=>!c.archive),miss=[];
 if(!db.entreprise.nom)miss.push(['fac.m.ent',()=>nav('more','ent')]);if(!act.length)miss.push(['fac.m.act',()=>nav('more','actform')]);if(!cls.length)miss.push(['fac.m.cl',()=>nav('clients','form')]);
 if(miss.length){m.innerHTML=`${backBtn(t('back'))}<h1>${t('fac.new')}</h1><div class="card"><p>${t('fac.miss')}</p>${miss.map((x,i)=>`<button data-m="${i}">${t(x[0])}</button>`).join('')}</div>`;wireBack(()=>{route.fd=null;nav('inv')});m.querySelectorAll('[data-m]').forEach(b=>b.onclick=()=>miss[b.dataset.m][1]());return}
 const today=localIso(),F=route.fd||(route.fd={date:today,cl:cls[0].id,act:act[0].id,ech:'0',l:[{d:'',q:'1',p:''}]});
 const tot=()=>F.l.reduce((s,x)=>{const q=parseQm(x.q),p=parseCts(x.p);return s+(q&&p?lineCts(q,p):0)},0),opt=(v,l,s)=>`<option value="${esc(v)}" ${s?'selected':''}>${esc(l)}</option>`;
 m.innerHTML=`${backBtn(t('back'))}<h1>${t('fac.new')}</h1>${db.entreprise.ice?'':`<div class="note">${t('fac.warn.ice')}</div>`}<div class="card">
<label>${t('fac.date')}<input id="f_date" data-k="date" type="date" value="${esc(F.date)}" max="${today}"></label>
<label>${t('fac.client')}<select data-k="cl">${cls.map(c=>opt(c.id,c.nom,c.id===F.cl)).join('')}</select></label>
<label>${t('enc.act')}<select data-k="act">${act.map(x=>opt(x.id,x.nom+' · '+t('cat.'+x.cat),x.id===F.act)).join('')}</select></label>
<label>${t('fac.ech')}<select data-k="ech">${[0,15,30,45,60].map(n=>opt(String(n),t(n?'fac.ech.n':'fac.ech.0',n),String(n)===String(F.ech))).join('')}</select></label></div>
${F.l.map((x,i)=>`<div class="card"><b>${t('fac.line',i+1)}</b><label>${t('fac.desc')}<input data-i="${i}" data-l="d" type="text" maxlength="200" value="${esc(x.d)}"></label><label>${t('fac.qty')}<input data-i="${i}" data-l="q" type="text" inputmode="decimal" value="${esc(x.q)}"></label><label>${t('fac.pu')}<input data-i="${i}" data-l="p" type="text" inputmode="decimal" placeholder="1500,00" value="${esc(x.p)}"></label>${F.l.length>1?`<button class="sec" data-rm="${i}">${t('fac.rm')}</button>`:''}</div>`).join('')}
<button class="sec" id="fl">${t('fac.addline')}</button>
<div class="card"><div class="row"><b>${t('fac.total')}</b><b id="ftot">${dhx(tot())}</b></div><span class="mute">${t('fac.lock')}</span><div id="err" class="note bad" role="alert" hidden></div><button id="sv">${t('fac.preview')}</button></div>`;
 wireBack(()=>{route.fd=null;nav('inv')});
 m.querySelectorAll('[data-k]').forEach(el=>el.onchange=()=>{F[el.dataset.k]=el.value});
 m.querySelectorAll('[data-l]').forEach(el=>el.oninput=()=>{F.l[+el.dataset.i][el.dataset.l]=el.value;$('#ftot').textContent=dhx(tot())});
 m.querySelectorAll('[data-rm]').forEach(b=>b.onclick=()=>{F.l.splice(+b.dataset.rm,1);invForm(m)});
 $('#fl').onclick=()=>{if(F.l.length<30){F.l.push({d:'',q:'1',p:''});invForm(m)}};
  $('#sv').onclick=()=>{F.date=$('#f_date').value;const r=facDraft(F);if(r.e)return err(r.e);route.fdraft=r.f;nav('inv','apercu')}}
function facDraft(F){const d=F.date,today=localIso(),e=db.entreprise;if(!e.nom)return{e:t('fac.m.ent')};if(!e.ice)return{e:t('fac.e.ice')};
 if(!/^\d{4}-\d\d-\d\d$/.test(d)||d>today||isNaN(pd(d)))return{e:t('fac.e.date')};
 const y=+d.slice(0,4),last=db.documents.filter(x=>x.type==='facture'&&x.annee===y).reduce((s,x)=>x.date>s?x.date:s,'');if(d<last)return{e:t('fac.e.chrono',fmt(pd(last)))};
 const cl=db.clients.find(c=>c.id===F.cl),ac=db.activites.find(x=>x.id===F.act);if(!cl||!ac)return{e:t('fac.e.sel')};
 const lignes=[];for(const x of F.l){const q=parseQm(x.q),p=parseCts(x.p),dd=x.d.trim();if(!dd)return{e:t('fac.e.desc')};if(!q)return{e:t('fac.e.qty')};if(!p)return{e:t('enc.e.montant')};lignes.push({d:dd,qm:q,p})}
 const total=lignes.reduce((s,x)=>s+lineCts(x.qm,x.p),0);if(total<=0||total>99999999999)return{e:t('enc.e.montant')};
 return{f:{type:'facture',annee:y,date:d,clientId:cl.id,activiteId:ac.id,lignes,total,statut:'emise',annule:null,echeance:+F.ech?addDays(d,+F.ech):null,cl:{nom:cl.nom,ice:cl.ice||'',adr:cl.adr||'',tel:cl.tel||'',mail:cl.mail||''},ent:{...e}}}}
async function facEmit(dr){const same=db.documents.filter(x=>x.type==='facture'&&x.annee===dr.annee),last=same.reduce((s,x)=>x.date>s?x.date:s,'');if(dr.date<last)return t('fac.e.chrono',fmt(pd(last)));
 const seq=1+same.reduce((s,x)=>Math.max(s,x.seq),0),f={...dr,id:uid(),seq,numero:dr.annee+'-'+String(seq).padStart(3,'0'),cree:nowIso()};
 db.documents.push(f);log(t('log.fac.add',f.numero));await persist();route.fd=null;route.fdraft=null;nav('inv','fiche',f.id);return null}
function invBody(f,draft){const t=tf,dhx=dhxFr,fmt=fmtFr;const e=f.ent,c=f.cl,ln=(k,v)=>v?`<div>${t(k)} : ${esc(v)}</div>`:'',ann=f.statut==='annulee';
 return `<article class="card invoice" dir="ltr" lang="fr"><div class="inv-h"><div><b>${esc(e.nom)}</b><div>${esc(e.adresse)}</div>${ln('fac.ice',e.ice)}${ln('fac.idae',e.idae)}${ln('fac.tel',e.tel)}${ln('fac.mail',e.mail)}</div><div class="inv-n"><b class="inv-t1">${t(draft?'fac.draft':'fac.title')}</b><div>${draft?t('fac.draft.n'):t('fac.no',esc(f.numero))}</div><div>${fmt(pd(f.date))}</div>${f.echeance===undefined?'':`<div>${t('fac.ech.l')} : ${f.echeance?fmt(pd(f.echeance)):t('fac.ech.0')}</div>`}</div></div>
<div class="inv-c"><span class="mute">${t('fac.to')}</span><b>${esc(c.nom)}</b>${c.adr?`<div>${esc(c.adr)}</div>`:''}${ln('fac.ice',c.ice)}</div>
<table class="inv-t"><thead><tr><th>${t('fac.desc')}</th><th>${t('fac.qty.s')}</th><th>${t('fac.pu.s')}</th><th>${t('fac.tl')}</th></tr></thead><tbody>${f.lignes.map(x=>`<tr><td>${esc(x.d)}</td><td class="num">${qShow(x.qm)}</td><td class="num">${dhx(x.p)}</td><td class="num">${dhx(lineCts(x.qm,x.p))}</td></tr>`).join('')}</tbody></table>
<div class="row"><b>${t('fac.net')}</b><b>${dhx(f.total)}</b></div><p>${t('fac.words',esc(lettres(f.total)))}</p>
${e.tva?`<p>${esc(e.tva)}</p>`:''}${e.cond?`<p>${esc(e.cond)}</p>`:''}${e.iban?`<p>${t('fac.iban')} : ${esc(e.iban)}</p>`:''}${ann?`<p class="inv-t1">${t('fac.s.annulee').toUpperCase()}</p>`:''}</article>`}
function invApercu(m){const f=route.fdraft;if(!f)return nav('inv','form');
 m.innerHTML=`<div class="noprint">${backBtn(t('fac.modify'))}</div>${invBody(f,true)}<div id="err" class="note bad noprint" role="alert" hidden></div><button id="em" class="noprint">${t('fac.emit')}</button><span class="mute noprint">${t('fac.lock')}</span>`;
 wireBack(()=>nav('inv','form'));$('#em').onclick=async()=>{const x=await facEmit(f);if(x)err(x)}}
function invFiche(m){const f=db.documents.find(x=>x.id===route.arg&&x.type==='facture');if(!f)return nav('inv');const e=f.ent,c=f.cl,r=reste(f),p=paye(f),ann=f.statut==='annulee';
 const ln=(k,v)=>v?`<div>${t(k)} : ${esc(v)}</div>`:'';
 m.innerHTML=`<div class="noprint">${backBtn(t('fac.back'))}</div>
${invBody(f)}
<div class="card noprint"><div class="row"><span>${t('fac.paid')}</span><b>${dhx(p)}</b></div><div class="row"><span>${t('fac.rest')}</span><b>${dhx(r)}</b></div>${ann?`<span class="chip bad">${t('fac.s.annulee')}</span>`:r===0?`<span class="chip">${t('fac.s.payee')}</span>`:''}</div>
<div id="err" class="note bad noprint" role="alert" hidden></div>
${!ann&&r>0?`<button id="fe" class="noprint">${t('fac.enc')}</button>`:''}<button id="fp" class="sec noprint">${t('fac.print')}</button>${ann?'':`<button id="fx" class="sec noprint">${t('fac.cancel')}</button>`}`;
 wireBack(()=>nav('inv'));$('#fp').onclick=()=>{holdLock();window.print()};
 if($('#fe'))$('#fe').onclick=()=>{route.ret={tab:'inv',sub:'fiche',arg:f.id};route.pre={factureId:f.id,clientId:f.clientId,activiteId:f.activiteId,montant:r,numero:f.numero};nav('more','encform')};
 if($('#fx'))$('#fx').onclick=()=>{if(p>0)return err(t('fac.e.paid'));confirmBox(m,t('fac.cancel.c'),t('fac.cancel.yes'),async()=>{f.statut='annulee';f.annule=nowIso();log(t('log.fac.cancel',f.numero));await persist();viewApp()})}}

