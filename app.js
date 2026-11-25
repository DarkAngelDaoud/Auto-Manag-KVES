'use strict';
/* Auto Manag KVES · signé KVES · logique de l'application (chiffrement et stockage : securite.js ; constantes et règles : donnees.js) */
let vault=null,dek=null,db=null,lockTimer=null;
const $=s=>document.querySelector(s),app=$('#app');
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const uid=()=>(crypto.randomUUID?crypto.randomUUID():Date.now().toString(36)+Math.random().toString(36).slice(2)).slice(0,8);
const nowIso=()=>new Date().toISOString();


/* ---- Données et règles légales (modifiables). Montants des opérations en CENTIMES (entiers) ; règles légales en DH. ---- */
const defaultDb=()=>({v:2,params:JSON.parse(JSON.stringify(DONNEES.params)),
 activites:[],clients:[],taches:[],documents:[],entreprise:{nom:'',adresse:'',ice:'',idae:'',tel:'',mail:'',iban:'',tva:t('fac.tva.def'),cond:t('fac.cond.def')},encaissements:[],depenses:[],catDep:['mat','log','trans','tel','cot','four','form','autre'].map(k=>({id:k,nom:t('dep.c.'+k)})),declarations:[],journal:[{d:nowIso(),e:t('log.create')}],lastBackup:null});
function norm(d){const D=defaultDb();d.v=2;for(const k of Object.keys(D))if(d[k]===undefined)d[k]=D[k];for(const k of Object.keys(D.params))if(d.params[k]===undefined)d.params[k]=D.params[k];return d}
const log=e=>db.journal.push({d:nowIso(),e});
async function persist(){const run=async()=>{const cur=await kvGet('vault');if(cur){let u;try{u=JSON.parse(cur).updated}catch{}if(u!==vault.updated){viewConflict();throw new Error('conflict')}}   // une autre fenêtre a écrit entre-temps : on n'écrase jamais
 vault.data=await seal(dek,enc.encode(JSON.stringify(db)));vault.updated=nowIso();if(cur)await kvSet('vault.bak',cur);await kvSet('vault',JSON.stringify(vault))};
 return navigator.locks?navigator.locks.request('amk-vault',run):run()}
addEventListener('unhandledrejection',e=>{if(e.reason&&e.reason.message==='conflict')e.preventDefault()});
async function setup(pw){if(await getVault())throw new Error('exists');const raw=crypto.getRandomValues(new Uint8Array(32)),rk=newRk();vault={v:1,app:'KVES',pw:await wrap(pw,PW_ITER,raw),rk:await wrap(normRk(rk),RK_ITER,raw)};dek=await importDek(raw);db=defaultDb();await persist();return rk}
async function load(v,raw){vault=v;dek=await importDek(raw);db=norm(JSON.parse(dec.decode(await open(dek,v.data))));}
async function unlock(pw){const v=JSON.parse(await getVault());await load(v,await unwrap(pw,v.pw))}
async function recover(rk,npw){const v=JSON.parse(await getVault()),raw=await unwrap(normRk(rk),v.rk);await load(v,raw);vault.pw=await wrap(npw,PW_ITER,raw);log(t('log.pwr'));await persist()}
async function changePw(old,npw){const raw=await unwrap(old,vault.pw);vault.pw=await wrap(npw,PW_ITER,raw);log(t('log.pw'));await persist()}
function lock(){dek=null;db=null;vault=null;clearTimeout(lockTimer);route.tab='home';route.sub=null;route.arg=null;boot()}
function arm(){clearTimeout(lockTimer);if(db)lockTimer=setTimeout(lock,AUTOLOCK_MS)}
['pointerdown','keydown','scroll'].forEach(e=>addEventListener(e,arm,{passive:true}));

/* ---- Calculs (échéances, plafonds, clients) ---- */
const MOIS=t('m');
const fmt=d=>d.getDate()+' '+MOIS[d.getMonth()]+' '+d.getFullYear();
const nf=new Intl.NumberFormat(t('locale'));
const dh=c=>nf.format(Math.round(c/100))+' DH';   // centimes -> DH
const dhp=d=>nf.format(Math.round(d))+' DH';       // DH (règles)
const yr=()=>new Date().getFullYear();
const pd=s=>{const m=/^(\d{4})-(\d\d)-(\d\d)/.exec(s);return m?new Date(+m[1],+m[2]-1,+m[3]):new Date(s)};   // date locale (évite les décalages de fuseau)
const yearOf=e=>pd(e.date).getFullYear(),qOf=d=>Math.floor(pd(d).getMonth()/3)+1;
const localIso=()=>{const d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')};
const nf2=new Intl.NumberFormat(t('locale'),{minimumFractionDigits:2,maximumFractionDigits:2});
const dhx=c=>nf2.format(c/100)+' DH';   // centimes -> DH avec décimales
function parseCts(s){s=String(s).replace(/[\s\u00a0\u202f]/g,'').replace(',','.');if(!/^\d{1,8}(\.\d{1,2})?$/.test(s))return null;const[a,b='']=s.split('.');const c=parseInt(a,10)*100+parseInt((b+'00').slice(0,2),10);return c>0?c:null}
const encPeriode=(y,q)=>db.encaissements.filter(e=>!e.annule&&yearOf(e)===y&&(!q||qOf(e.date)===q));
function taxe(list){const ca={services:0,commerce:0},p=db.params;list.forEach(e=>{ca[catOf(e)]+=e.montant});const imp={services:Math.round(ca.services*p.taux/100),commerce:Math.round(ca.commerce*p.tauxCommerce/100)};return{ca,imp,caTotal:ca.services+ca.commerce,total:imp.services+imp.commerce}}
const cn=id=>(db.clients.find(c=>c.id===id)||{}).nom,an=id=>(db.activites.find(a=>a.id===id)||{}).nom;
function alertDate(d,jours){const a=new Date(d);a.setDate(a.getDate()-jours);while(a.getDay()===0||a.getDay()===6)a.setDate(a.getDate()-1);return a}
const decl=(y,q)=>db.declarations.find(d=>d.annee===y&&d.t===q);
const dueDate=(y,q)=>{const e=db.params.echeances.find(x=>x.t===q),[m,d]=e.md.split('-').map(Number);return new Date(q==='T4'?y+1:y,m-1,d)};
function nextDeadline(now=new Date()){const t0=new Date(now.getFullYear(),now.getMonth(),now.getDate()),L=[];
 for(let y=t0.getFullYear()-1;y<=t0.getFullYear()+1;y++)for(const e of db.params.echeances){const[m,d]=e.md.split('-').map(Number);L.push({date:new Date(y,m-1,d),t:e.t,l:e.l,annee:e.t==='T4'?y-1:y})}
 L.sort((x,y)=>x.date-y.date);const best=L.find(x=>x.date>=t0&&!decl(x.annee,x.t))||L.find(x=>x.date>=t0);
 best.jours=Math.round((best.date-t0)/DAY);best.alerte=alertDate(best.date,db.params.alerteJours);best.actif=t0>=best.alerte;return best}
function todoDecl(now=new Date()){const t0=new Date(now.getFullYear(),now.getMonth(),now.getDate()),o=[];
 for(let y=t0.getFullYear()-1;y<=t0.getFullYear();y++)for(const e of db.params.echeances){const q=+e.t.slice(1),due=dueDate(y,e.t),r=decl(y,e.t);
  if(!r){if(due<t0&&t0-due<400*DAY&&taxe(encPeriode(y,q)).caTotal>0)o.push({k:'late',annee:y,t:e.t})}else if(r.statut==='declare')o.push({k:'pay',annee:y,t:e.t})}
 return o}
const catOf=e=>(db.activites.find(a=>a.id===e.activiteId)||{}).cat||'services';
const caCat=cat=>db.encaissements.filter(e=>!e.annule&&yearOf(e)===yr()&&catOf(e)===cat).reduce((a,e)=>a+e.montant,0);
const encClient=id=>db.encaissements.filter(e=>!e.annule&&e.clientId===id&&yearOf(e)===yr()).reduce((a,e)=>a+e.montant,0);
function clState(c){const s=encClient(c.id),S=db.params.seuilClient*100,pct=S?s/S*100:0;return{s,pct,over:s>S,alert:pct>=db.params.alerte}}
const paye=f=>db.encaissements.filter(e=>!e.annule&&e.factureId===f.id).reduce((s,e)=>s+e.montant,0);
const reste=f=>f.statut==='annulee'?0:Math.max(0,f.total-paye(f));
const unpaid=(key,id)=>db.documents.filter(d=>d[key]===id&&d.type==='facture'&&d.statut!=='annulee'&&reste(d)>0);
const parseQm=s=>{s=String(s).replace(/[\s  ]/g,'').replace(',','.');if(!/^\d{1,6}(\.\d{1,3})?$/.test(s))return null;const q=Math.round(parseFloat(s)*1000);return q>0?q:null};
const lineCts=(qm,p)=>Math.round(qm*p/1000);
const qShow=qm=>String(qm/1000).replace('.',',');
const addDays=(iso,n)=>{const d=pd(iso);d.setDate(d.getDate()+n);return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')};
const NU=['zéro','un','deux','trois','quatre','cinq','six','sept','huit','neuf','dix','onze','douze','treize','quatorze','quinze','seize'];
function w99(n,fin){if(n<17)return NU[n];if(n<20)return 'dix-'+NU[n-10];
 if(n<70){const d=Math.floor(n/10),u=n%10,T=['','','vingt','trente','quarante','cinquante','soixante'][d];return u===0?T:u===1?T+' et un':T+'-'+NU[u]}
 if(n<80){const u=n-60;return u===11?'soixante et onze':'soixante-'+w99(u)}
 if(n===80)return fin?'quatre-vingts':'quatre-vingt';return 'quatre-vingt-'+w99(n-80)}
function w999(n,fin){const c=Math.floor(n/100),r=n%100;let s='';if(c)s=(c>1?NU[c]+' ':'')+'cent'+(c>1&&r===0&&fin?'s':'');if(r)s+=(s?' ':'')+w99(r,fin);return s}
function words(n){const m=Math.floor(n/1e6),k=Math.floor(n%1e6/1e3),r=n%1e3,o=[];if(m)o.push(m===1?'un million':w999(m,false)+' millions');if(k)o.push(k===1?'mille':w999(k,false)+' mille');if(r||!o.length)o.push(r?w999(r,true):'zéro');return o.join(' ')}
function lettres(cts){const d=Math.floor(cts/100),c=cts%100,big=d>=1e6&&d%1e6===0;let s='';if(d||!c)s=words(d)+(big?' de':'')+' dirham'+(d>=2?'s':'');if(c)s+=(s?' et ':'')+words(c)+' centime'+(c>=2?'s':'');return s}
const facSorted=()=>db.documents.filter(d=>d.type==='facture').sort((x,y)=>y.annee-x.annee||y.seq-x.seq);
const task=txt=>db.taches.push({id:uid(),texte:txt,date:nowIso(),fait:false});

/* ---- Interface ---- */
const logo=n=>`<img class="mk" src="logo-kves-mark.png" height="${n}" alt="Logo KVES">`;
const brand=n=>`<div class="brand">${logo(n)}<div><b>Auto Manag</b><small>KVES</small></div></div>`;
const bigBrand=()=>`<div class="logobox" style="margin-top:8px"><img src="logo-kves.png" alt="KVES Services & Tech"></div><div><h1>Auto Manag KVES</h1><small class="mute" style="letter-spacing:.12em;font-weight:600">${t('tagline')}</small></div>`;
function ring(p,al){const r=40,c=2*Math.PI*r,a=(al/100*360-90)*Math.PI/180,P=Math.min(p,100);return`<svg width="104" height="104" viewBox="0 0 104 104" role="img" aria-label="${t('hero.aria',Math.round(p))}" style="flex:none"><circle cx="52" cy="52" r="${r}" fill="none" stroke="rgba(255,255,255,.2)" stroke-width="10"/>${P>0?`<circle cx="52" cy="52" r="${r}" fill="none" stroke="#fff" stroke-width="10" stroke-linecap="round" stroke-dasharray="${c*P/100} ${c}" transform="rotate(-90 52 52)"/>`:''}<line x1="${52+33*Math.cos(a)}" y1="${52+33*Math.sin(a)}" x2="${52+47*Math.cos(a)}" y2="${52+47*Math.sin(a)}" stroke="#18B169" stroke-width="4" stroke-linecap="round"/><text x="52" y="58" text-anchor="middle" fill="#fff" font-size="20" font-weight="700">${Math.round(p)} %</text></svg>`}
const route={tab:'home',sub:null,arg:null,f:'all',q:''};
const ic={home:'<path d="M3 11l9-8 9 8v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',clients:'<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6"/>',inv:'<path d="M6 3h8l4 4v14H6z"/><path d="M14 3v4h4M9 12h6M9 16h6"/>',ech:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',more:'<circle cx="5" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/>'};
const theme=()=>localStorage.getItem('amk.theme')||'auto';
function applyTheme(){const x=theme();if(x==='auto')delete document.documentElement.dataset.theme;else document.documentElement.dataset.theme=x}
const show=h=>{app.innerHTML=h};
const EYE='<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>';
const pwScore=p=>{let pool=0;if(/[a-z]/.test(p))pool+=26;if(/[A-Z]/.test(p))pool+=26;if(/\d/.test(p))pool+=10;if(/[^A-Za-z0-9]/.test(p))pool+=32;return Math.min(100,Math.round(p.length*Math.log2(Math.max(pool,2))/80*100))};
const PW_COMMON=/azerty|qwerty|password|motdepasse|123456|654321|abcdef|admin|0000|1111|iloveyou|bonjour|kves/i;
const pwCheck=p=>p.length<12?'err.pw8':new Set(p).size<5||PW_COMMON.test(p)?'err.pwweak':null;
const pwLevel=p=>{const s=pwScore(p);return p.length<12||s<40||PW_COMMON.test(p)?['weak',Math.min(s,30)]:s<70?['mid',s]:['good',s]};
function meter(id){const i=$('#'+id),w=i.closest('label'),d=document.createElement('div');d.className='pwm';d.innerHTML='<b class="pwt"><i></i></b><span class="mute"></span>';w.insertAdjacentElement('afterend',d);
 const up=()=>{const[l,s]=pwLevel(i.value);d.dataset.l=l;d.querySelector('i').style.width=(i.value?Math.max(8,s):0)+'%';d.querySelector('span').textContent=i.value?t('pw.'+l):t('pw.hint')};i.addEventListener('input',up);up()}
function eyes(){document.querySelectorAll('input[type=password]:not([data-eye])').forEach(i=>{i.dataset.eye=1;const w=document.createElement('span');w.className='pwwrap';i.parentNode.insertBefore(w,i);w.appendChild(i);const b=document.createElement('button');b.type='button';b.className='eye';b.setAttribute('aria-label',t('eye.show'));b.setAttribute('aria-pressed','false');b.innerHTML=EYE;b.onclick=()=>{const x=i.type==='password';i.type=x?'text':'password';b.setAttribute('aria-pressed',x);b.setAttribute('aria-label',t(x?'eye.hide':'eye.show'))};w.appendChild(b)})}
new MutationObserver(eyes).observe(app,{childList:true,subtree:true});
const err=m=>{const e=$('#err');e.textContent=m;e.hidden=false};
const busy=(b,on)=>{b.disabled=on;b.dataset.t=b.dataset.t||b.textContent;b.textContent=on?t('busy'):b.dataset.t};
function nav(tab,sub=null,arg=null){route.tab=tab;route.sub=sub;route.arg=arg;viewApp();scrollTo(0,0)}
function confirmBox(m,msg,okLabel,onOk){const old=$('#cfb');if(old)old.remove();const d=document.createElement('div');d.id='cfb';d.className='card';d.innerHTML=`<div class="note">${esc(msg)}</div><button class="danger" id="cfok">${esc(okLabel)}</button><button class="sec" id="cfno">${t('cancel')}</button>`;m.appendChild(d);d.scrollIntoView({block:'center'});$('#cfno').onclick=()=>d.remove();$('#cfok').onclick=async()=>{d.remove();await onOk()}}
const backBtn=(label,fn)=>`<button class="link" id="bk" style="justify-content:flex-start">${esc(label)}</button>`;
const wireBack=fn=>{$('#bk').onclick=fn};

async function boot(){applyTheme();navigator.storage&&navigator.storage.persist&&navigator.storage.persist();let v=null;try{v=await getVault()}catch{return viewStorageError()}if(v)return viewLocked();let bak=null;try{bak=await kvGet('vault.bak')}catch{}bak?viewRestoreBak(bak):viewSetup()}
function viewConflict(){clearTimeout(lockTimer);dek=null;db=null;vault=null;show(`<main style="gap:16px">${bigBrand()}<div class="card"><b>${t('cf2.title')}</b><p>${t('cf2.text')}</p><button id="cfreload">${t('cf2.btn')}</button></div></main>`);$('#cfreload').onclick=boot}
function viewStorageError(){show(`<main style="gap:16px">${bigBrand()}<div class="card"><b>${t('se.title')}</b><p>${t('se.text')}</p><button id="retry">${t('upd.retry')}</button></div></main>`);$('#retry').onclick=boot}
function viewRestoreBak(bak){show(`<main style="gap:16px">${bigBrand()}<div class="card"><b>${t('rb.title')}</b><p>${t('rb.text')}</p><button id="rbok">${t('rb.yes')}</button><button class="sec" id="rbno">${t('rb.no')}</button></div></main>`);$('#rbok').onclick=async()=>{await kvSet('vault',bak);boot()};$('#rbno').onclick=viewSetup}
function viewSetup(){show(`<main style="gap:16px">${bigBrand()}<p class="mute">${t('intro')}</p>
<div class="card"><b>${t('setup.title')}</b><label>${t('setup.pw')}<input id="pw" type="password" autocomplete="new-password"></label><label>${t('setup.pw2')}<input id="pw2" type="password" autocomplete="new-password"></label>
<div id="err" class="note bad" role="alert" hidden></div><button id="go">${t('setup.go')}</button></div>
<div class="note">${t('setup.warn')}</div><button class="link" id="have">${t('setup.have')}</button></main>`);$('#have').onclick=viewImportStart;
 meter('pw');$('#go').onclick=async e=>{const pw=$('#pw').value;{const k=pwCheck(pw);if(k)return err(t(k))}if(pw!==$('#pw2').value)return err(t('err.pwdiff'));busy(e.target,true);try{const rk=await setup(pw);viewRecovery(rk)}catch{busy(e.target,false);err(t('setup.exists'))}}}
const okBackup=x=>{try{const v=JSON.parse(x);return v.app==='KVES'&&v.v===1&&!!v.pw&&!!v.rk&&!!v.data}catch{return false}};
function viewImportStart(){show(`<main style="gap:16px">${bigBrand()}<div class="card"><b>${t('rs.title')}</b><p class="mute">${t('rs.t')}</p><input type="file" id="impfile" accept=".kves,application/json,text/plain"><textarea id="imptxt" placeholder="${t('sav.ph')}" aria-label="${t('sav.ph')}"></textarea><div id="err" class="note bad" role="alert" hidden></div><button id="imp">${t('sav.restore')}</button><button class="link" id="back">${t('back')}</button></div></main>`);
 $('#back').onclick=viewSetup;$('#imp').onclick=async()=>{const f=$('#impfile').files[0];let x=$('#imptxt').value.trim();if(!x&&f)x=(await f.text()).trim();if(!x)return err(t('sav.none'));if(!okBackup(x))return err(t('sav.invalid'));
  try{if(await getVault())return err(t('setup.exists'));await kvSet('vault',x);boot()}catch{err(t('se.title'))}}}
function viewRecovery(rk){show(`<main><h1>${t('rk.title')}</h1><p>${t('rk.text')}</p>
<div class="key" id="rk">${rk}</div><button class="sec noprint" id="print">${t('rk.copy')}</button>
<label style="flex-direction:row;align-items:center;gap:10px" class="noprint"><input type="checkbox" id="ok" style="width:22px;height:22px"> ${t('rk.ok')}</label><button id="next" class="noprint" disabled>${t('continue')}</button></main>`);
 $('#ok').onchange=e=>$('#next').disabled=!e.target.checked;$('#print').onclick=async e=>{try{await navigator.clipboard.writeText(rk);e.target.textContent=t('rk.copied')}catch{const r=document.createRange();r.selectNodeContents($('#rk'));getSelection().removeAllRanges();getSelection().addRange(r);e.target.textContent=t('rk.sel')}};$('#next').onclick=()=>{arm();viewApp()}}
function viewLocked(){show(`<main style="gap:16px">${bigBrand()}<div class="card"><b>${t('lock.title')}</b><label>${t('lock.pw')}<input id="upw" type="password" autocomplete="current-password"></label>
<div id="err" class="note bad" role="alert" hidden></div><button id="ugo">${t('lock.title')}</button><button class="link" id="lost">${t('lock.lost')}</button></div></main>`);
 const go=async()=>{const b=$('#ugo');busy(b,true);try{await unlock($('#upw').value);arm();viewApp()}catch{busy(b,false);const f=$('#upw');f.value='';f.focus();err(t('lock.bad'))}};$('#ugo').onclick=go;$('#upw').onkeydown=e=>{if(e.key==='Enter')go()};
 $('#lost').onclick=()=>{show(`<main><h1>${t('rec.title')}</h1><div class="card"><label>${t('rec.key')}<input id="rkin" type="text" autocapitalize="characters" autocomplete="off"></label><label>${t('rec.new')}<input id="npw" type="password" autocomplete="new-password"></label><label>${t('rec.confirm')}<input id="npw2" type="password" autocomplete="new-password"></label>
<div id="err" class="note bad" role="alert" hidden></div><button id="rgo">${t('rec.go')}</button><button class="link" id="back">${t('back')}</button></div></main>`);
  meter('npw');$('#back').onclick=viewLocked;$('#rgo').onclick=async e=>{const n=$('#npw').value;{const k=pwCheck(n);if(k)return err(t(k))}if(n!==$('#npw2').value)return err(t('err.pwdiff'));busy(e.target,true);try{await recover($('#rkin').value,n);arm();viewApp()}catch{busy(e.target,false);err(t('rec.bad'))}}}}

function viewApp(){const tabs=['home','clients','inv','ech','more'];
 show(`<main id="m"></main><nav aria-label="Navigation principale">${tabs.map(k=>`<button data-tab="${k}" ${route.tab===k?'aria-current="page"':''}><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ic[k]}</svg>${t('tab.'+k)}</button>`).join('')}</nav>`);
 document.querySelectorAll('nav button').forEach(b=>b.onclick=()=>nav(b.dataset.tab));
 const m=$('#m');({home,clients:clientsView,ech,more,inv:invView})[route.tab](m)}
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
function invBody(f,draft){const e=f.ent,c=f.cl,ln=(k,v)=>v?`<div>${t(k)} : ${esc(v)}</div>`:'',ann=f.statut==='annulee';
 return `<article class="card invoice"><div class="inv-h"><div><b>${esc(e.nom)}</b><div>${esc(e.adresse)}</div>${ln('fac.ice',e.ice)}${ln('fac.idae',e.idae)}${ln('fac.tel',e.tel)}${ln('fac.mail',e.mail)}</div><div class="inv-n"><b class="inv-t1">${t(draft?'fac.draft':'fac.title')}</b><div>${draft?t('fac.draft.n'):t('fac.no',esc(f.numero))}</div><div>${fmt(pd(f.date))}</div>${f.echeance===undefined?'':`<div>${t('fac.ech.l')} : ${f.echeance?fmt(pd(f.echeance)):t('fac.ech.0')}</div>`}</div></div>
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
 wireBack(()=>nav('inv'));$('#fp').onclick=()=>window.print();
 if($('#fe'))$('#fe').onclick=()=>{route.ret={tab:'inv',sub:'fiche',arg:f.id};route.pre={factureId:f.id,clientId:f.clientId,activiteId:f.activiteId,montant:r,numero:f.numero};nav('more','encform')};
 if($('#fx'))$('#fx').onclick=()=>{if(p>0)return err(t('fac.e.paid'));confirmBox(m,t('fac.cancel.c'),t('fac.cancel.yes'),async()=>{f.statut='annulee';f.annule=nowIso();log(t('log.fac.cancel',f.numero));await persist();viewApp()})}}

function bar(pct,cls){return`<div class="bar" role="img" aria-label="${Math.round(pct)} %"><i style="width:${Math.min(Math.max(pct,0),100)}%"></i></div>`}
function home(m){const n=nextDeadline(),p=db.params,ca=caCat('services'),pct=ca/(p.plafond*100)*100,days=db.lastBackup?Math.floor((Date.now()-new Date(db.lastBackup))/DAY):null;
 const actives=db.activites.filter(a=>!a.archive),hasC=actives.some(a=>a.cat==='commerce'),caC=caCat('commerce'),pctC=caC/(p.plafondCommerce*100)*100,open=db.taches.filter(x=>!x.fait),demo=db.clients.some(c=>c.demo);
 const tx=taxe(encPeriode(n.annee,+n.t.slice(1)));
 const chip=n.jours===0?t('today'):n.jours===1?t('in1'):t('inN',n.jours);
 m.innerHTML=`<div class="top">${brand(44)}<button class="iconbtn" id="hl" aria-label="${t('lock.now')}"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg></button></div>
<div class="hero">${ring(pct,p.alerte)}<div style="display:flex;flex-direction:column;gap:4px;min-width:0"><span class="mute">${t('hero.cap')}</span><span class="big">${dh(ca)}</span><span class="mute">${t('hero.sur',dhp(p.plafond),dhp(Math.max(p.plafond-ca/100,0)))}</span><span class="mute">${t('hero.alert',p.alerte,dhp(p.plafond*p.alerte/100))}</span></div></div>
<button id="qe">${t('enc.quick')}</button>
${hasC?`<div class="card"><div class="l1"><span>${t('hero.cap2')}</span><b>${dh(caC)}</b></div>${bar(pctC)}<div class="l2"><span>${t('hero.sur',dhp(p.plafondCommerce),dhp(Math.max(p.plafondCommerce-caC/100,0)))}</span><span>${Math.round(pctC)} %</span></div></div>`:''}
<div class="card"><div class="top"><span class="mute">${t('next')}</span><span class="chip ${n.actif?'warn':''}">${chip}</span></div><b style="font-size:18px">${t('decl',n.t,n.annee)}</b><span>${fmt(n.date)} · ${n.l}</span><span class="mute">${n.actif?t('alert.on'):t('alert.at',fmt(n.alerte))} ${t('alert.zero',p.penalite)}</span></div>
<div class="card"><b>${t('tx.title',n.t,n.annee)}</b><div class="row"><span>${t('tx.ca')}</span><b>${dhx(tx.caTotal)}</b></div><div class="row"><span>${t('tx.tax')}</span><b>${dhx(tx.total)}</b></div>${tx.caTotal?'':`<span class="mute">${t('tx.none')}</span>`}</div>
${todoDecl().map(x=>`<div class="note ${x.k==='late'?'bad':''}">${t(x.k==='late'?'dc.late':'dc.topay',x.t,x.annee)}</div>`).join('')}
${(()=>{const dp=db.depenses.filter(d=>!d.annule&&yearOf(d)===yr());if(!dp.length)return'';const ca=taxe(encPeriode(yr(),0)).caTotal,ds=dp.reduce((s,d)=>s+d.montant,0);return `<div class="card"><b>${t('dep.res',yr())}</b><div class="row"><span>${t('dep.in')}</span><b>${dhx(ca)}</b></div><div class="row"><span>${t('dep.out')}</span><b>${dhx(ds)}</b></div><div class="row"><b>${t('dep.net')}</b><b>${dhx(ca-ds)}</b></div></div>`})()}
${(()=>{const L=facSorted().filter(f=>reste(f)>0);return L.length?`<div class="card"><div class="row"><b>${t('fac.home',L.length)}</b><b>${dhx(L.reduce((s,f)=>s+reste(f),0))}</b></div></div>`:''})()}
${days===null?`<div class="note">${t('bk.none')}</div>`:days>=7?`<div class="note">${t('bk.old',days)}</div>`:''}
${demo?`<div class="note ok">${t('demo.on')}</div>`:''}
${open.length?`<div class="card"><b>${t('todo')}</b>${open.slice(0,3).map(x=>`<div class="row"><span>${esc(x.texte)}</span><button class="sec" data-tk="${x.id}" style="min-height:40px">${t('done')}</button></div>`).join('')}${open.length>3?`<span class="mute">${t('more_n',open.length-3)}</span>`:''}</div>`:''}
<div class="card"><b>${t('steps')}</b><ul class="steps">${[[1,t('st.vault')],[1,t('st.key')],[!!db.lastBackup,t('st.bk')],[actives.length>0,t('st.act')],[db.clients.some(c=>!c.archive),t('st.cl')],[0,t('st.next')]].map(([d,l],i)=>`<li class="${d?'done':''}"><i>${d?'✓':i+1}</i><span>${l}</span></li>`).join('')}</ul></div>`;
 $('#hl').onclick=lock;$('#qe').onclick=()=>{route.ret={tab:'home'};route.pre=null;nav('more','encform')};m.querySelectorAll('[data-tk]').forEach(b=>b.onclick=async()=>{db.taches.find(y=>y.id===b.dataset.tk).fait=true;await persist();viewApp()})}
function ech(m){const rows=db.params.echeances.map(e=>{const[mm,d]=e.md.split('-').map(Number);return`<div class="row"><span>${e.t} · ${e.l}</span><b>${d} ${MOIS[mm-1]}</b></div>`}).join('');m.innerHTML=`<h1>${t('ech.title')}</h1><p class="mute">${t('ech.sub',db.params.alerteJours)}</p><div class="card">${rows}</div><button id="gd">${t('dc.open')}</button>`;$('#gd').onclick=()=>nav('more','decl')}

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
const saveFile=(name,mime,text)=>{const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([text],{type:mime}));a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),4000)};
const csvFile=(name,head,rows)=>saveFile(name,'text/csv;charset=utf-8','﻿'+[head,...rows].map(r=>r.map(csvCell).join(';')).join('\r\n'));
const inPer=(date,Y,Q)=>yearOf({date})===Y&&(!Q||qOf(date)===Q);
const subs={
decl(m){const Y=route.xy||yr(),ys=[...new Set([yr(),yr()-1,...db.encaissements.map(yearOf),...db.declarations.map(d=>d.annee)])].sort((x,y)=>y-x),today=new Date();
 const card=q=>{const T='T'+q,tx=taxe(encPeriode(Y,q)),r=decl(Y,T),due=dueDate(Y,T),e=db.params.echeances.find(x=>x.t===T),late=!r&&due<today&&tx.caTotal>0,
  chip=!r?`<span class="chip ${late?'bad':'gray'}">${t(late?'dc.s.late':'dc.s.todo')}</span>`:r.statut==='paye'?`<span class="chip">${t('dc.s.paid')}</span>`:`<span class="chip warn">${t('dc.s.decl')}</span>`;
  return `<div class="card"><div class="top"><b>${T} ${Y} · ${esc(e.l)}</b>${chip}</div><div class="row"><span>${t('dc.due')}</span><span>${fmt(due)}</span></div><div class="row"><span>${t('tx.ca')}</span><b>${dhx(tx.caTotal)}</b></div><div class="row"><span>${t('dc.calc')}</span><b>${dhx(tx.total)}</b></div>
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
declfiche(m){const a=route.arg||{},Y=a.annee,T=a.t,q=+String(T).slice(1);if(!Y||!T)return nav('more','decl');
 const L=encPeriode(Y,q).sort((x,y)=>pd(x.date)-pd(y.date)),tx=taxe(L),r=decl(Y,T),e=db.entreprise,p=db.params,per=db.params.echeances.find(x=>x.t===T).l;
 m.innerHTML=`<div class="noprint">${backBtn(t('back'))}</div><article class="card invoice"><div class="inv-h"><div><b>${esc(e.nom||'')}</b>${e.ice?`<div>${t('fac.ice')} : ${esc(e.ice)}</div>`:''}${e.idae?`<div>${t('fac.idae')} : ${esc(e.idae)}</div>`:''}</div><div class="inv-n"><b class="inv-t1">${t('dc.recap')}</b><div>${T} ${Y} · ${esc(per)}</div></div></div>
<div class="row"><span>${t('enc.catline',t('cat.services'),dhx(tx.ca.services),p.taux)}</span><b>${dhx(tx.imp.services)}</b></div><div class="row"><span>${t('enc.catline',t('cat.commerce'),dhx(tx.ca.commerce),p.tauxCommerce)}</span><b>${dhx(tx.imp.commerce)}</b></div>
<div class="row"><b>${t('tx.ca')}</b><b>${dhx(tx.caTotal)}</b></div><div class="row"><b>${t('enc.tax')}</b><b>${dhx(tx.total)}</b></div>
<p>${r?t('dc.declon')+' : '+fmt(pd(r.dateDecl))+(r.statut==='paye'?' · '+t('dc.paidon',fmt(pd(r.datePaie)))+' : '+dhx(r.montant):' · '+t('dc.s.decl')):t('dc.s.todo')}${r&&r.ref?' · '+esc(r.ref):''}</p>
<table class="inv-t"><thead><tr><th>${t('enc.date')}</th><th>${t('enc.client')}</th><th>${t('fac.tl')}</th></tr></thead><tbody>${L.map(x=>`<tr><td>${fmt(pd(x.date))}</td><td>${esc(cn(x.clientId)||t('enc.sans'))}</td><td class="num">${dhx(x.montant)}</td></tr>`).join('')||`<tr><td colspan="3">${t('enc.empty')}</td></tr>`}</tbody></table><p class="mute">${t('dc.disc')}</p></article>
<button id="fp" class="sec noprint">${t('fac.print')}</button>`;
 wireBack(()=>nav('more','decl'));$('#fp').onclick=()=>window.print()},
exp(m){const Y=route.xy||yr(),Q=route.xq||0,ys=[...new Set([yr(),...db.encaissements.map(yearOf),...db.depenses.map(yearOf),...db.documents.map(d=>d.annee)])].sort((x,y)=>y-x),sfx=Y+(Q?'-T'+Q:'');
 m.innerHTML=`${backBtn(t('back'))}<h1>${t('more.exp')}</h1><p class="mute">${t('ex.hint')}</p><div class="filters">${ys.map(y=>`<button data-y="${y}" aria-pressed="${y===Y}">${y}</button>`).join('')}</div><div class="filters">${[0,1,2,3,4].map(q=>`<button data-q="${q}" aria-pressed="${q===Q}">${q?'T'+q:t('enc.f.all')}</button>`).join('')}</div>
<div class="card"><button id="x1">${t('ex.enc')}</button><button id="x2" class="sec">${t('ex.fac')}</button><button id="x3" class="sec">${t('ex.dep')}</button></div>
<div class="card"><b>${t('ex.json')}</b><p class="mute">${t('ex.json.w')}</p><button id="x4" class="sec">${t('ex.json.b')}</button></div>`;
 wireBack(toPlus);m.querySelectorAll('[data-y]').forEach(b=>b.onclick=()=>{route.xy=+b.dataset.y;viewApp()});m.querySelectorAll('[data-q]').forEach(b=>b.onclick=()=>{route.xq=+b.dataset.q;viewApp()});
 const st=x=>t(x.annule?'enc.cancelled':'ex.valid'),act=id=>an(id)||'',catT=id=>{const c=(db.activites.find(x=>x.id===id)||{}).cat;return c?t('cat.'+c):''};
 $('#x1').onclick=()=>csvFile('encaissements-'+sfx+'.csv',['Date','Client','Activité','Catégorie','Montant (DH)','Mode','Facture','Note','Statut'],db.encaissements.filter(e=>inPer(e.date,Y,Q)).sort((x,y)=>pd(x.date)-pd(y.date)).map(e=>[e.date.slice(0,10),cn(e.clientId)||'',act(e.activiteId),catT(e.activiteId),csvDh(e.montant),t('mode.'+e.mode),(db.documents.find(d=>d.id===e.factureId)||{}).numero||'',e.note||'',st(e)]));
 $('#x2').onclick=()=>csvFile('factures-'+sfx+'.csv',['Numéro','Date','Client','ICE client','Activité','Total (DH)','Encaissé (DH)','Reste (DH)','Statut'],db.documents.filter(d=>d.type==='facture'&&inPer(d.date,Y,Q)).sort((x,y)=>x.annee-y.annee||x.seq-y.seq).map(f=>[f.numero,f.date,f.cl.nom,f.cl.ice,act(f.activiteId),csvDh(f.total),csvDh(paye(f)),csvDh(reste(f)),t(f.statut==='annulee'?'fac.s.annulee':reste(f)===0?'fac.s.payee':'ex.open')]));
 $('#x3').onclick=()=>csvFile('depenses-'+sfx+'.csv',['Date','Catégorie','Fournisseur','Activité','Montant (DH)','Mode','Note','Statut'],db.depenses.filter(d=>inPer(d.date,Y,Q)).sort((x,y)=>pd(x.date)-pd(y.date)).map(d=>[d.date.slice(0,10),(db.catDep.find(c=>c.id===d.cat)||{}).nom||'',d.fournisseur||'',act(d.activiteId),csvDh(d.montant),t('mode.'+d.mode),d.note||'',st(d)]));
 $('#x4').onclick=()=>confirmBox(m,t('ex.json.c'),t('ex.json.y'),()=>{saveFile('auto-manag-kves-donnees-'+localIso()+'.json','application/json',JSON.stringify(db,null,1));viewApp()})},
dep(m){const Y=route.dy||yr(),Q=route.dq||0,all=db.depenses.filter(d=>yearOf(d)===Y&&(!Q||qOf(d.date)===Q)).sort((x,y)=>pd(y.date)-pd(x.date)||String(y.cree||'').localeCompare(String(x.cree||''))),ok=all.filter(d=>!d.annule);
 const ds=ok.reduce((s,d)=>s+d.montant,0),ca=taxe(encPeriode(Y,Q)).caTotal,ys=[...new Set([yr(),...db.depenses.map(yearOf),...db.encaissements.map(yearOf)])].sort((x,y)=>y-x),cn2=id=>(db.catDep.find(c=>c.id===id)||{}).nom||t('dep.c.autre'),an2=id=>id?(db.activites.find(x=>x.id===id)||{}).nom:null;
 const byCat=[...new Set(ok.map(d=>d.cat))].map(k=>[cn2(k),ok.filter(d=>d.cat===k).reduce((s,d)=>s+d.montant,0)]).sort((x,y)=>y[1]-x[1]);
 m.innerHTML=`${backBtn(t('back'))}<div class="top"><h1>${t('dep.title')}</h1><button id="da" style="border-radius:22px">${t('dep.add')}</button></div>
<div class="filters">${ys.map(y=>`<button data-y="${y}" aria-pressed="${y===Y}">${y}</button>`).join('')}</div>
<div class="filters">${[0,1,2,3,4].map(q=>`<button data-q="${q}" aria-pressed="${q===Q}">${q?'T'+q:t('enc.f.all')}</button>`).join('')}</div>
<div class="card"><b>${t('dep.sum')}</b><div class="row"><span>${t('dep.in')}</span><b>${dhx(ca)}</b></div><div class="row"><span>${t('dep.out')}</span><b>${dhx(ds)}</b></div><div class="row"><b>${t('dep.net')}</b><b>${dhx(ca-ds)}</b></div>${byCat.map(([n,v])=>`<div class="row"><span class="mute">${esc(n)}</span><span>${dhx(v)}</span></div>`).join('')}<span class="mute">${t('dep.note')}</span></div>
<button class="sec" id="dc">${t('dep.cats')}</button><ul class="list">${all.length?all.map(d=>`<li class="card ${d.annule?'cancelled':''}"><div class="l1"><span>${esc(d.fournisseur||cn2(d.cat))}</span><b class="amt">${dhx(d.montant)}</b></div><div class="l2"><span>${fmt(pd(d.date))} · ${esc(cn2(d.cat))}${an2(d.activiteId)?' · '+esc(an2(d.activiteId)):''}</span><span>${t('mode.'+d.mode)}</span></div>${d.note?`<span class="mute">${esc(d.note)}</span>`:''}${d.annule?`<span class="chip bad" style="align-self:flex-start">${t('enc.cancelled')}</span>`:''}<button class="${d.annule?'':'sec'}" data-d="${d.id}" style="min-height:44px">${t(d.annule?'enc.restore':'enc.cancel')}</button></li>`).join(''):`<li class="card"><b>${t('dep.empty')}</b></li>`}</ul>`;
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
 m.innerHTML=`${backBtn(t('back'))}<h1>${t('dep.cats')}</h1><div class="card">${db.catDep.map(c=>`<div class="row"><span>${esc(c.nom)}</span>${used(c.id)?`<span class="mute">${t('dep.used')}</span>`:`<button class="sec" data-r="${esc(c.id)}" style="min-height:40px">${t('dep.rm')}</button>`}</div>`).join('')}</div>
<div class="card"><label>${t('dep.newcat')}<input id="c_n" type="text" maxlength="40"></label><div id="err" class="note bad" role="alert" hidden></div><button id="sv">${t('dep.addcat')}</button></div>`;
 wireBack(()=>nav('more','dep'));
 m.querySelectorAll('[data-r]').forEach(b=>b.onclick=async()=>{db.catDep=db.catDep.filter(c=>c.id!==b.dataset.r);await persist();viewApp()});
 $('#sv').onclick=async()=>{const n=$('#c_n').value.trim();if(!n)return err(t('dep.e.cat'));if(db.catDep.some(c=>c.nom.toLowerCase()===n.toLowerCase()))return err(t('dep.e.dup'));db.catDep.push({id:uid(),nom:n});log(t('log.dep.cat',n));await persist();viewApp()}},
ent(m){const e=db.entreprise,F=[['nom','fac.f.nom',200],['adresse','fac.f.adr',300],['ice','fac.ice',15],['idae','fac.idae',60],['tel','fac.tel',30],['mail','fac.mail',120],['iban','fac.iban',40]];
 m.innerHTML=`${backBtn(t('back'))}<h1>${t('more.ent')}</h1><div class="card"><p class="mute">${t('ent.hint')}</p>${F.map(([k,l,n])=>`<label>${t(l)}<input id="n_${k}" type="text" maxlength="${n}" value="${esc(e[k])}"></label>`).join('')}
<label>${t('fac.f.tva')}<input id="n_tva" type="text" maxlength="200" value="${esc(e.tva)}"></label><label>${t('fac.f.cond')}<textarea id="n_cond" maxlength="500">${esc(e.cond)}</textarea></label><div id="err" class="note bad" role="alert" hidden></div><button id="sv">${t('save')}</button></div>`;
 wireBack(toPlus);$('#sv').onclick=async()=>{const v={};F.forEach(([k])=>v[k]=$('#n_'+k).value.trim());v.tva=$('#n_tva').value.trim();v.cond=$('#n_cond').value.trim();
  if(v.ice&&!/^\d{15}$/.test(v.ice))return err(t('cl.ice'));if(v.mail&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.mail))return err(t('cl.mail'));
  db.entreprise=v;log(t('log.ent'));await persist();nav('more')}},
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
  log(t('log.enc.add',dhx(c)));await persist();retGo()}},
act(m){const a=db.activites,on=a.filter(x=>!x.archive),off=a.filter(x=>x.archive),row=(x,arch)=>`<li class="card"><div class="l1"><span>${esc(x.nom)}</span><span class="chip ${arch?'gray':''}">${t('cat.'+x.cat)}</span></div><button class="${arch?'':'sec'}" data-a="${x.id}" style="min-height:44px">${t(arch?'ac.rest.b':'ac.arch.b')}</button></li>`;
 m.innerHTML=`${backBtn(t('back'))}<div class="top"><h1>${t('ac.title')}</h1><button id="aa" style="border-radius:22px">${t('ac.add')}</button></div><div class="note">${t('ac.info')}</div><div id="err" class="note bad" role="alert" hidden></div>
<ul class="list">${on.length?on.map(x=>row(x,0)).join(''):`<li class="card"><b>${t('ac.empty')}</b></li>`}</ul>${off.length?`<h2>${t('ac.archived')}</h2><ul class="list">${off.map(x=>row(x,1)).join('')}</ul>`:''}`;
 wireBack(toPlus);$('#aa').onclick=()=>nav('more','actform');
 m.querySelectorAll('[data-a]').forEach(b=>b.onclick=()=>{const x=a.find(y=>y.id===b.dataset.a);
  if(x.archive){x.archive=null;task(t('tk.add',x.nom));log(t('log.ac.rest',x.nom));return persist().then(viewApp)}
  const u=unpaid('activiteId',x.id);if(u.length)return err(t('ac.block',u.length));
  confirmBox(m,t('ac.arch.c'),t('ac.arch.yes'),async()=>{x.archive=nowIso();task(t('tk.del',x.nom));log(t('log.ac.arch',x.nom));await persist();viewApp()})})},
actform(m){m.innerHTML=`${backBtn(t('ac.back'))}<h1>${t('ac.new')}</h1><div class="card"><label>${t('ac.nom')}<input id="a_nom" type="text" maxlength="80"></label><b style="font-size:13px">${t('ac.cat')}</b><div class="seg" id="a_cat">${['services','commerce'].map((k,i)=>`<button type="button" data-c="${k}" aria-pressed="${i===0}">${t('cat.'+k)}</button>`).join('')}</div>
<div id="cum" class="note" hidden>${t('ac.cum',dhp(db.params.plafond),dhp(db.params.plafondCommerce))}</div><div id="err" class="note bad" role="alert" hidden></div><button id="sv">${t('save')}</button></div>`;
 let cat='services';wireBack(()=>nav('more','act'));
 m.querySelectorAll('[data-c]').forEach(b=>b.onclick=()=>{cat=b.dataset.c;m.querySelectorAll('[data-c]').forEach(x=>x.setAttribute('aria-pressed',x===b));$('#cum').hidden=cat!=='commerce'});
 $('#sv').onclick=async()=>{const nom=$('#a_nom').value.trim();if(!nom)return err(t('ac.req'));if(db.activites.some(x=>x.nom.toLowerCase()===nom.toLowerCase()&&!x.archive))return err(t('ac.dup'));
  db.activites.push({id:uid(),nom,cat,ajoutee:nowIso(),archive:null});task(t('tk.add',nom));log(t('log.ac.add',nom));await persist();nav('more','act')}},
aff(m){m.innerHTML=`${backBtn(t('back'))}<h1>${t('more.aff')}</h1><div class="card"><b>${t('aff.theme')}</b><div class="seg">${['auto','light','dark'].map(k=>`<button data-t="${k}" aria-pressed="${theme()===k}">${t('aff.'+k)}</button>`).join('')}</div><p class="mute">${t('aff.hint')}</p></div>`;wireBack(toPlus);m.querySelectorAll('[data-t]').forEach(b=>b.onclick=()=>{localStorage.setItem('amk.theme',b.dataset.t);applyTheme();viewApp()})},
loi(m){const p=db.params,f=['taux','plafond','tauxC','plafondC','alerte','seuil','retenue','pen','jours'],K={taux:'taux',plafond:'plafond',tauxC:'tauxCommerce',plafondC:'plafondCommerce',alerte:'alerte',seuil:'seuilClient',retenue:'retenue',pen:'penalite',jours:'alerteJours'};
 m.innerHTML=`${backBtn(t('back'))}<h1>${t('more.loi')}</h1><p class="mute">${t('loi.hint')}</p><div class="card">${f.map(k=>`<div class="row"><label style="flex-direction:row;justify-content:space-between;align-items:center;width:100%;font-weight:400">${t('loi.'+k)}<input type="number" step="any" min="0" id="p_${k}" value="${p[K[k]]}"></label></div>`).join('')}</div><div id="err" class="note bad" hidden></div><button id="ps">${t('save')}</button>`;wireBack(toPlus);
 $('#ps').onclick=async()=>{const n={};for(const k of f){const v=parseFloat($('#p_'+k).value);if(!(v>=0))return err(t('loi.bad',t('loi.'+k)));n[K[k]]=v}Object.assign(db.params,n);log(t('log.loi'));await persist();nav('more')}},
sec(m){m.innerHTML=`${backBtn(t('back'))}<h1>${t('more.sec')}</h1><div class="card"><b>${t('sec.change')}</b><label>${t('sec.cur')}<input id="o" type="password" autocomplete="current-password"></label><label>${t('sec.new')}<input id="n" type="password" autocomplete="new-password"></label><label>${t('rec.confirm')}<input id="n2" type="password" autocomplete="new-password"></label><div id="err" class="note bad" hidden></div><div id="okm" class="note ok" hidden>${t('sec.ok')}</div><button id="cp">${t('sec.mod')}</button></div><div class="note">${t('sec.note')}</div>`;wireBack(toPlus);
 meter('n');$('#cp').onclick=async e=>{const n=$('#n').value;{const k=pwCheck(n);if(k)return err(t(k))}if(n!==$('#n2').value)return err(t('err.pwdiff'));busy(e.target,true);try{await changePw($('#o').value,n);busy(e.target,false);$('#err').hidden=true;$('#okm').hidden=false;['o','n','n2'].forEach(i=>$('#'+i).value='')}catch{busy(e.target,false);err(t('sec.bad'))}}},
sav(m){const last=db.lastBackup?new Date(db.lastBackup).toLocaleString(t('locale')):t('sav.never');
 m.innerHTML=`${backBtn(t('back'))}<h1>${t('sav.title')}</h1><div class="note">${t('sav.warn')}</div><div id="pers" class="mute"></div>
<div class="card"><span>${t('sav.last',`<b>${last}</b>`)}</span><button id="ex">${t('sav.export')}</button>
<div id="out" hidden style="display:flex;flex-direction:column;gap:8px"><textarea id="outta" readonly aria-label="${t('sav.aria')}"></textarea><button class="sec" id="cp2">${t('sav.copy')}</button><a class="btn sec" id="dla" download>${t('sav.dl')}</a><span class="mute">${t('sav.paste')}</span></div></div>
<div class="card"><b>${t('sav.rest')}</b><p class="mute">${t('sav.rest.t')}</p><input type="file" id="impfile" accept=".kves,application/json,text/plain"><textarea id="imptxt" placeholder="${t('sav.ph')}" aria-label="${t('sav.ph')}"></textarea><div id="err" class="note bad" hidden></div>
<button class="danger" id="imp">${t('sav.restore')}</button><div id="cf" hidden style="display:flex;flex-direction:column;gap:8px"><div class="note">${t('sav.replace')}</div><button class="danger" id="impok">${t('sav.yes')}</button><button class="sec" id="impno">${t('cancel')}</button></div></div>
`;wireBack(toPlus);if(navigator.storage&&navigator.storage.persisted)navigator.storage.persisted().then(x=>{const e=$('#pers');if(e)e.textContent=t(x?'sav.pers.yes':'sav.pers.no')});
 $('#ex').onclick=async()=>{db.lastBackup=nowIso();log(t('log.bk'));await persist();const x=JSON.stringify(vault);$('#out').hidden=false;$('#outta').value=x;const a=$('#dla');a.href=URL.createObjectURL(new Blob([x],{type:'application/json'}));a.download='kves-sauvegarde-'+db.lastBackup.slice(0,10)+'.kves';$('#cp2').onclick=async e=>{try{await navigator.clipboard.writeText(x);e.target.textContent=t('sav.copied')}catch{$('#outta').select();e.target.textContent=t('sav.sel')}}};
 let pending=null;$('#imp').onclick=async()=>{const f=$('#impfile').files[0];let x=$('#imptxt').value.trim();if(!x&&f)x=(await f.text()).trim();if(!x)return err(t('sav.none'));try{const v=JSON.parse(x);if(v.app!=='KVES'||v.v!==1||!v.pw||!v.rk||!v.data)throw 0}catch{return err(t('sav.invalid'))}
  pending=x;$('#err').hidden=true;$('#imp').hidden=true;$('#cf').hidden=false};
 $('#impno').onclick=()=>{pending=null;$('#cf').hidden=true;$('#imp').hidden=false};$('#impok').onclick=async()=>{await kvSet('vault',pending);lock()};},
demo(m){const has=db.clients.some(c=>c.demo)||db.activites.some(a=>a.demo);
 m.innerHTML=`${backBtn(t('back'))}<h1>${t('dm.title')}</h1><div class="card"><p>${t('dm.t')}</p><span class="chip ${has?'':'gray'}" style="align-self:flex-start">${has?t('dm.has'):t('dm.none')}</span>${has?'':`<button id="dl">${t('dm.load')}</button>`}${has?`<button class="danger" id="dc">${t('dm.clear')}</button>`:''}</div>`;wireBack(toPlus);
 if(!has)$('#dl').onclick=async()=>{const a={id:uid(),nom:t('dm.act'),cat:'services',ajoutee:nowIso(),archive:null,demo:1};db.activites.push(a);const Y=yr();
  [['Société Alpha',66200,[[1,20000],[3,18200],[6,28000]]],['Agence Beta',38900,[[2,15900],[5,23000]]],['Cabinet Gamma',12400,[[4,12400]]],['Atelier Delta',4800,[[7,4800]]],['Boutique Epsilon',0,[]]].forEach(([nom,,e])=>{const c={id:uid(),nom,cree:nowIso(),archive:null,demo:1};db.clients.push(c);e.forEach(([mo,v])=>db.encaissements.push({id:uid(),clientId:c.id,activiteId:a.id,date:Y+'-'+String(Math.min(mo,new Date().getMonth())+1).padStart(2,'0')+'-10',montant:v*100,demo:1}))});
  log(t('log.dm.load'));await persist();nav('more')};
 if(has)$('#dc').onclick=()=>confirmBox(m,t('dm.conf'),t('dm.yes'),async()=>{for(const k of['clients','activites','encaissements','taches'])db[k]=db[k].filter(x=>!x.demo);log(t('log.dm.clear'));await persist();nav('more')})}
};

/* ---- Mises à jour : nouveautés, puis choix ---- */
const upd={p:null,ign:false,reg:null};
const vnum=v=>String(v).split('.').map(Number);
const newer=(a,b)=>{const x=vnum(a),y=vnum(b);for(let i=0;i<3;i++){if((x[i]||0)!==(y[i]||0))return(x[i]||0)>(y[i]||0)}return false};
function updBox(h){let b=document.getElementById('upd');if(!b){b=document.createElement('div');b.id='upd';b.setAttribute('role','dialog');document.body.appendChild(b)}b.innerHTML=h;return b}
function updStep(n){const p=upd.p;if(!p)return;
 if(n===1){const b=updBox(`<b>${t('upd.news',esc(p.v))}</b><ul>${(p.notes||[]).map(x=>`<li>${esc(x)}</li>`).join('')||`<li>${t('upd.misc')}</li>`}</ul><button id="u1">${t('continue')}</button>`);b.querySelector('#u1').onclick=()=>updStep(2)}
 else{const b=updBox(`<b>${t('upd.install',esc(p.v))}</b><span class="mute">${t('upd.keep')}</span><div class="row2"><button id="u2">${t('upd.go')}</button><button class="sec" id="u3">${t('upd.ign',APP_VERSION)}</button></div>`);
  b.querySelector('#u3').onclick=()=>{upd.ign=true;b.remove()};
  b.querySelector('#u2').onclick=async e=>{e.target.disabled=true;e.target.textContent=t('upd.wait');try{await upd.reg.update()}catch{}
   const want='amk-v'+p.v;let k=0;const sw=navigator.serviceWorker;sw.onmessage=m=>{if(m.data===want)location.reload()};
   const ping=()=>{if(++k>25){e.target.disabled=false;e.target.textContent=t('upd.retry');return}(sw.controller||upd.reg.active).postMessage('accept');setTimeout(ping,1000)};ping()}}}
async function checkUpd(){try{const r=await fetch('version.json?'+Date.now(),{cache:'no-store'});const j=await r.json();
 if(j&&j.v&&newer(j.v,APP_VERSION)){upd.p=j;try{await upd.reg.update()}catch{}if(!upd.ign&&!document.getElementById('upd'))updStep(1)}}catch{}}
function swInit(){if(!('serviceWorker' in navigator))return;navigator.serviceWorker.register('sw.js').then(r=>{upd.reg=r;checkUpd()}).catch(()=>{})}
boot();swInit();
