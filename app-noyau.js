'use strict';
/* Auto Manag KVES · signé KVES · logique de l'application (chiffrement et stockage : securite.js ; constantes et règles : donnees.js) */
let vault=null,dek=null,db=null,lockTimer=null;
const $=s=>document.querySelector(s),app=$('#app');
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const uid=()=>(crypto.randomUUID?crypto.randomUUID():Date.now().toString(36)+Math.random().toString(36).slice(2)).slice(0,8);
const nowIso=()=>new Date().toISOString();


/* ---- Données et règles légales (modifiables). Montants des opérations en CENTIMES (entiers) ; règles légales en DH. ---- */
const defaultDb=()=>({v:2,params:JSON.parse(JSON.stringify(DONNEES.params)),
 activites:[],clients:[],taches:[],documents:[],entreprise:{nom:'',adresse:'',ice:'',idae:'',tel:'',mail:'',iban:'',tva:tf('fac.tva.def'),cond:tf('fac.cond.def')},encaissements:[],depenses:[],catDep:['mat','log','trans','tel','cot','four','form','autre'].map(k=>({id:k,nom:t('dep.c.'+k)})),declarations:[],journal:[{d:nowIso(),e:t('log.create')}],lastBackup:null});
function norm(d){const D=defaultDb();d.v=2;for(const k of Object.keys(D))if(d[k]===undefined)d[k]=D[k];for(const k of Object.keys(D.params))if(d.params[k]===undefined)d.params[k]=D.params[k];return d}
const log=e=>db.journal.push({d:nowIso(),e});
async function persist(creating){const run=async()=>{const cur=await kvGet('vault');if(!cur&&!creating){viewConflict();throw new Error('conflict')}if(cur){let u;try{u=JSON.parse(cur).updated}catch{}if(u!==vault.updated){viewConflict();throw new Error('conflict')}}   // une autre fenêtre a écrit entre-temps : on n'écrase jamais
 vault.data=await seal(dek,enc.encode(JSON.stringify(db)));vault.updated=nowIso();if(cur)await kvSet('vault.bak',cur);await kvSet('vault',JSON.stringify(vault))};
 return navigator.locks?navigator.locks.request('amk-vault',run):run()}
addEventListener('unhandledrejection',e=>{if(e.reason&&e.reason.message==='conflict')e.preventDefault()});
async function setup(pw){if(await getVault())throw new Error('exists');const raw=crypto.getRandomValues(new Uint8Array(32)),rk=newRk();vault={v:1,app:'KVES',pw:await wrap(pw,PW_ITER,raw),rk:await wrap(normRk(rk),RK_ITER,raw)};dek=await importDek(raw);db=defaultDb();await persist(true);return rk}
async function load(v,raw){vault=v;dek=await importDek(raw);db=norm(JSON.parse(dec.decode(await open(dek,v.data))));}
async function unlock(pw){const v=JSON.parse(await getVault());await load(v,await unwrap(pw,v.pw))}
async function recover(rk,npw){const v=JSON.parse(await getVault()),raw=await unwrap(normRk(rk),v.rk);await load(v,raw);vault.pw=await wrap(npw,PW_ITER,raw);log(t('log.pwr'));await persist()}
async function changePw(old,npw){const raw=await unwrap(old,vault.pw);vault.pw=await wrap(npw,PW_ITER,raw);log(t('log.pw'));await persist()}
function lock(){dek=null;db=null;vault=null;clearTimeout(lockTimer);route.tab='home';route.sub=null;route.arg=null;boot()}
function arm(){clearTimeout(lockTimer);if(db)lockTimer=setTimeout(lock,AUTOLOCK_MS)}
['pointerdown','keydown','scroll'].forEach(e=>addEventListener(e,arm,{passive:true}));
// V1.5.3 : verrouillage dès que l'appli passe en arrière-plan (réglable)
const lockBg=()=>{try{const s=localStorage.getItem('amk.lockbg');if(s===null)return 60000;const v=+s;return v===0||v===60000||v===300000?v:60000}catch{return 60000}};
let hideAt=0,hold=0,heldAtHide=false;const holdLock=()=>{hold=Date.now()+90000};
document.addEventListener('visibilitychange',()=>{if(!db)return;
 if(document.hidden){hideAt=Date.now();heldAtHide=Date.now()<hold;if(!heldAtHide&&lockBg()===0)lock()}
 else if(hideAt){const d=Date.now()-hideAt;hideAt=0;if(d>=(heldAtHide?AUTOLOCK_MS:lockBg()))lock()}});


/* ---- Calculs (échéances, plafonds, clients) ---- */
let MOIS=t('m');
const fmt=d=>d.getDate()+' '+MOIS[d.getMonth()]+' '+d.getFullYear();
let nf=new Intl.NumberFormat(t('locale'));
const dh=c=>nf.format(Math.round(c/100))+' DH';   // centimes -> DH
const dhp=d=>nf.format(Math.round(d))+' DH';       // DH (règles)
const yr=()=>new Date().getFullYear();
const pd=s=>{const m=/^(\d{4})-(\d\d)-(\d\d)/.exec(s);return m?new Date(+m[1],+m[2]-1,+m[3]):new Date(s)};   // date locale (évite les décalages de fuseau)
const yearOf=e=>pd(e.date).getFullYear(),qOf=d=>Math.floor(pd(d).getMonth()/3)+1;
const localIso=()=>{const d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')};
let nf2=new Intl.NumberFormat(t('locale'),{minimumFractionDigits:2,maximumFractionDigits:2});
const nfFr2=new Intl.NumberFormat('fr-FR',{minimumFractionDigits:2,maximumFractionDigits:2}),dhxFr=c=>nfFr2.format(c/100)+' DH',fmtFr=d=>d.getDate()+' '+LANGS.fr.m[d.getMonth()]+' '+d.getFullYear();   // documents : toujours en français
function applyLang(){document.documentElement.lang=LANG;document.documentElement.dir=LANG==='ar'?'rtl':'ltr';MOIS=t('m');nf=new Intl.NumberFormat(t('locale'));nf2=new Intl.NumberFormat(t('locale'),{minimumFractionDigits:2,maximumFractionDigits:2})}
function setLang(l){if(!LANGS[l])return;LANG=l;try{localStorage.setItem('amk.lang',l)}catch{}applyLang()}
const langBar=()=>`<div class="seg langbar" dir="ltr">${[['fr','Français'],['en','English'],['ar','العربية']].map(([k,n])=>`<button data-lang="${k}" aria-pressed="${LANG===k}" lang="${k}">${n}</button>`).join('')}</div>`;
document.addEventListener('click',e=>{const b=e.target.closest&&e.target.closest('[data-lang]');if(!b)return;setLang(b.dataset.lang);if(typeof db!=='undefined'&&db)viewApp();else location.reload()});
applyLang();
const dhx=c=>LANG==='ar'?'\u2066'+nf2.format(c/100)+' DH\u2069':nf2.format(c/100)+' DH';   // centimes -> DH avec décimales
const normNum=s=>String(s).replace(/[٠-٩]/g,d=>'٠١٢٣٤٥٦٧٨٩'.indexOf(d)).replace(/[۰-۹]/g,d=>'۰۱۲۳۴۵۶۷۸۹'.indexOf(d)).replace(/٫/g,'.').replace(/٬/g,'');
function parseCts(s){s=normNum(s).replace(/[\s\u00a0\u202f]/g,'').replace(',','.');if(!/^\d{1,8}(\.\d{1,2})?$/.test(s))return null;const[a,b='']=s.split('.');const c=parseInt(a,10)*100+parseInt((b+'00').slice(0,2),10);return c>0?c:null}
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
const parseQm=s=>{s=normNum(s).replace(/[\s  ]/g,'').replace(',','.');if(!/^\d{1,6}(\.\d{1,3})?$/.test(s))return null;const q=Math.round(parseFloat(s)*1000);return q>0?q:null};
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
const bigBrand=()=>`<div class="logobox" style="margin-top:8px"><img src="logo-kves.png" alt="KVES Services & Tech"></div><div><h1>Auto Manag KVES</h1><small class="mute" style="letter-spacing:.12em;font-weight:600">${t('tagline')}</small></div>${langBar()}`;
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
<div id="err" class="note bad" role="alert" hidden></div><button id="ugo">${t('lock.title')}</button><button class="link" id="lost">${t('lock.lost')}</button>${lockBk()}${rstLink()?`<button class="link" id="wipe">${t('rs.lost')}</button>`:''}</div></main>`);
 if(rstLink())$('#wipe').onclick=()=>viewWipe(viewLocked,false);
 const go=async()=>{const b=$('#ugo');busy(b,true);try{await unlock($('#upw').value);arm();viewApp()}catch{busy(b,false);const f=$('#upw');f.value='';f.focus();err(t('lock.bad'))}};$('#ugo').onclick=go;$('#upw').onkeydown=e=>{if(e.key==='Enter')go()};
 $('#lost').onclick=()=>{show(`<main><h1>${t('rec.title')}</h1><div class="card"><label>${t('rec.key')}<input id="rkin" type="text" autocapitalize="characters" autocomplete="off"></label><label>${t('rec.new')}<input id="npw" type="password" autocomplete="new-password"></label><label>${t('rec.confirm')}<input id="npw2" type="password" autocomplete="new-password"></label>
<div id="err" class="note bad" role="alert" hidden></div><button id="rgo">${t('rec.go')}</button><button class="link" id="back">${t('back')}</button></div></main>`);
  meter('npw');$('#back').onclick=viewLocked;$('#rgo').onclick=async e=>{const n=$('#npw').value;{const k=pwCheck(n);if(k)return err(t(k))}if(n!==$('#npw2').value)return err(t('err.pwdiff'));busy(e.target,true);try{await recover($('#rkin').value,n);arm();viewApp()}catch{busy(e.target,false);err(t('rec.bad'))}}}}

// V1.5.4 : ancienneté de la dernière sauvegarde (ou du début d'utilisation si aucune)
function bkInfo(){if(!db)return null;const ref=db.lastBackup||(db.journal&&db.journal[0]&&db.journal[0].d);if(!ref)return null;const days=Math.floor((Date.now()-new Date(ref))/DAY);return{days:Math.max(days,0),never:!db.lastBackup}}
function bkNote(i,btn){if(!i||i.days<3)return'';const crit=i.days>=7,txt=i.never?t('bk.nev',i.days):t(crit?'bk.crit':'bk.warn',i.days);return`<div class="note ${crit?'bad':'warn'}" role="${crit?'alert':'status'}">${txt}${btn?`<button class="sec" id="bkgo" style="margin-top:8px">${t('bk.now')}</button>`:''}</div>`}
function bkMirror(){try{const i=bkInfo();if(i)localStorage.setItem('amk.bkd',String(i.days>=0?Date.now()-i.days*DAY:Date.now()))}catch{}}

// V1.6.0 : ouvrir une sauvegarde sans rien modifier (mot de passe ou clé de récupération)
async function peekBackup(x,secret){const v=JSON.parse(x);let raw;try{raw=await unwrap(secret,v.pw)}catch{raw=await unwrap(normRk(secret),v.rk)}const k=await importDek(raw);return{upd:v.updated,d:norm(JSON.parse(dec.decode(await open(k,v.data))))}}
const bkSumRow=(l,a)=>`<div class="row"><span>${l}</span><b>${a}</b></div>`;
const bkSum=(d,upd)=>`<div class="note ok">${t('vf.ok',upd?new Date(upd).toLocaleString(t('locale')):'—')}</div>`+bkSumRow(t('vf.cl'),d.clients.length)+bkSumRow(t('vf.fa'),d.documents.length)+bkSumRow(t('vf.en'),d.encaissements.length)+bkSumRow(t('vf.de'),d.depenses.length);
const bkName=()=>{const n=new Date(),p=x=>String(x).padStart(2,'0');return 'AutoManagKVES_'+n.getFullYear()+'-'+p(n.getMonth()+1)+'-'+p(n.getDate())+'_'+p(n.getHours())+'h'+p(n.getMinutes())+'.kves'};

async function wipeAll(keep){const run=async()=>{await kvClear();if(!keep)try{['amk.theme','amk.lang','amk.rstlink'].forEach(k=>localStorage.removeItem(k))}catch{}};
 if(navigator.locks)await navigator.locks.request('amk-vault',run);else await run();
 dek=null;db=null;vault=null;clearTimeout(lockTimer);location.reload()}
const lockBk=()=>{try{const v=+localStorage.getItem('amk.bkd');if(!v)return'';const d=Math.floor((Date.now()-v)/DAY);return bkNote({days:d,never:false},false)}catch{return''}};
const rstLink=()=>{try{return localStorage.getItem('amk.rstlink')!=='0'}catch{return true}};
function viewWipe(back,authed){show(`<main style="gap:16px">${bigBrand()}<div class="card"><b>${t('rs.title')}</b><p>${t('rs.warn')}</p>${authed?`<button class="sec" id="rsb">${t('rs.bak')}</button><label>${t('rs.pw')}<input id="rspw" type="password" autocomplete="current-password"></label>`:''}<label>${t('rs.type',t('rs.word'))}<input id="rsw" type="text" autocomplete="off" autocapitalize="characters"></label><label style="flex-direction:row;align-items:center;gap:10px"><input type="checkbox" id="rsk" checked style="width:22px;height:22px"> ${t('rs.keep')}</label><div id="err" class="note bad" role="alert" hidden></div><button class="danger" id="rsgo">${t('rs.go')}</button><button class="link" id="rsno">${t('cancel')}</button></div></main>`);
 $('#rsno').onclick=back;if(authed)$('#rsb').onclick=()=>saveFile('auto-manag-kves-donnees-'+localIso()+'.json','application/json',JSON.stringify(db,null,1));
 $('#rsgo').onclick=async e=>{if($('#rsw').value.trim().toUpperCase()!==t('rs.word').toUpperCase())return err(t('rs.badw'));
  if(authed){try{await unwrap($('#rspw').value,vault.pw)}catch{return err(t('sec.bad'))}}
  busy(e.target,true);try{await wipeAll($('#rsk').checked)}catch{busy(e.target,false);err(t('se.title'))}}}

function viewApp(){bkMirror();const tabs=['home','clients','inv','ech','more'];
 show(`<main id="m"></main><nav aria-label="Navigation principale">${tabs.map(k=>`<button data-tab="${k}" ${route.tab===k?'aria-current="page"':''}><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ic[k]}</svg>${t('tab.'+k)}</button>`).join('')}</nav>`);
 document.querySelectorAll('nav button').forEach(b=>b.onclick=()=>nav(b.dataset.tab));
 const m=$('#m');({home,clients:clientsView,ech,more,inv:invView})[route.tab](m)}
const subs={};
