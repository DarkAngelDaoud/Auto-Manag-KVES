'use strict';
/* Auto Manag KVES · signé KVES · logique de l'application (chiffrement et stockage : securite.js ; constantes et règles : donnees.js) */
let vault=null,dek=null,db=null,lockTimer=null;
const $=s=>document.querySelector(s),app=$('#app');
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const uid=()=>(crypto.randomUUID?crypto.randomUUID():Date.now().toString(36)+Math.random().toString(36).slice(2)).slice(0,8);
const nowIso=()=>new Date().toISOString();


/* ---- Données et règles légales (modifiables). Montants des opérations en CENTIMES (entiers) ; règles légales en DH. ---- */
const defaultDb=()=>({v:2,params:JSON.parse(JSON.stringify(DONNEES.params)),
 activites:[],clients:[],taches:[],documents:[],entreprise:{nom:'',adresse:'',ice:'',idae:'',tel:'',mail:'',iban:'',tva:tf('fac.tva.def'),cond:tf('fac.cond.def')},logos:{},verifie:{},encaissements:[],depenses:[],catDep:['mat','log','trans','tel','cot','four','form','autre'].map(k=>({id:k,nom:t('dep.c.'+k)})),declarations:[],journal:[{d:nowIso(),e:t('log.create')}],lastBackup:null});
function norm(d){const D=defaultDb();d.v=2;for(const k of Object.keys(D))if(d[k]===undefined)d[k]=D[k];for(const k of Object.keys(D.params))if(d.params[k]===undefined)d.params[k]=D.params[k];return d}
const log=e=>db.journal.push({d:nowIso(),e});
async function persist(creating){const run=async()=>{const cur=await kvGet('vault');if(!cur&&!creating){viewConflict();throw new Error('conflict')}if(cur){let u;try{u=JSON.parse(cur).updated}catch{}if(u!==vault.updated){viewConflict();throw new Error('conflict')}}   // une autre fenêtre a écrit entre-temps : on n'écrase jamais
 vault.data=await seal(dek,enc.encode(JSON.stringify(db)));vault.updated=nowIso();if(cur)await kvSet('vault.bak',cur);const str=JSON.stringify(vault);await kvSet('vault',str);vaultBytes=str.length};
 return navigator.locks?navigator.locks.request('amk-vault',run):run()}
addEventListener('unhandledrejection',e=>{if(e.reason&&e.reason.message==='conflict')e.preventDefault()});
async function setup(pw){if(await getVault())throw new Error('exists');const raw=crypto.getRandomValues(new Uint8Array(32)),rk=newRk();vault={v:1,app:'KVES',pw:await wrap(pw,PW_ITER,raw),rk:await wrap(normRk(rk),RK_ITER,raw)};dek=await importDek(raw);db=defaultDb();await persist(true);return rk}
async function load(v,raw){vault=v;dek=await importDek(raw);db=norm(JSON.parse(dec.decode(await open(dek,v.data))));}
// V1.8.1 : délai croissant après 5 échecs (protection contre l'essai à la main ; le coût PBKDF2 reste la vraie barrière)
const FAIL_KEY='amk.fail',failGet=()=>{try{const o=JSON.parse(localStorage.getItem(FAIL_KEY));return o&&o.n>=0?o:{n:0,u:0}}catch{return{n:0,u:0}}},failWait=()=>Math.max(0,Math.ceil((failGet().u-Date.now())/1000)),
 failAdd=()=>{const o=failGet();o.n++;o.u=o.n>=5?Date.now()+Math.min(900,30*2**(o.n-5))*1000:0;try{localStorage.setItem(FAIL_KEY,JSON.stringify(o))}catch{}},failClr=()=>{try{localStorage.removeItem(FAIL_KEY)}catch{}};
async function unlock(pw){const w=failWait();if(w)throw{wait:w};const v=JSON.parse(await getVault());try{await load(v,await unwrap(pw,v.pw))}catch(e){failAdd();throw e}failClr()}
async function recover(rk,npw){const w=failWait();if(w)throw{wait:w};const v=JSON.parse(await getVault());let raw;try{raw=await unwrap(normRk(rk),v.rk);await load(v,raw)}catch(e){failAdd();throw e}failClr();vault.pw=await wrap(npw,PW_ITER,raw);log(t('log.pwr'));await persist()}
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
// V1.7.1 : périodes de déclaration : trimestrielle (T1..T4) ou mensuelle (M01..M12), selon l'option (CGI art. 82 bis)
const MOIS_FR=['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];
const periods=()=>db.params.periodicite==='M'?Array.from({length:12},(_,i)=>'M'+String(i+1).padStart(2,'0')):['T1','T2','T3','T4'];
const perMonths=T=>String(T)[0]==='M'?[+String(T).slice(1)-1,+String(T).slice(1)-1]:[(+String(T).slice(1)-1)*3,(+String(T).slice(1)-1)*3+2];
const encPer=(y,T)=>db.encaissements.filter(e=>{if(e.annule||yearOf(e)!==y)return false;if(!T)return true;const[a,b]=perMonths(T),mo=pd(e.date).getMonth();return mo>=a&&mo<=b});
const perEnd=(y,T)=>new Date(y,perMonths(T)[1]+1,0);
const monthName=(i,fr)=>{try{const s=new Intl.DateTimeFormat(fr?'fr-FR':t('locale'),{month:'long'}).format(new Date(2026,i,1));return s.charAt(0).toUpperCase()+s.slice(1)}catch{return MOIS_FR[i]}};
const perTag=(T,fr)=>String(T)[0]==='M'?monthName(+String(T).slice(1)-1,fr):T;
const perFull=(T,fr)=>String(T)[0]==='M'?'':(fr?tf:t)('ql.'+T);
const perTitle=(T,Y,fr)=>perTag(T,fr)+' '+Y+(perFull(T,fr)?' · '+perFull(T,fr):'');
// une période est « couverte » si l'autre option (mensuelle/trimestrielle) l'a déjà déclarée : évite les faux retards après un changement d'option
const declCov=(y,T)=>{const r=decl(y,T);if(r)return r;if(String(T)[0]==='M')return decl(y,'T'+Math.ceil(+String(T).slice(1)/3));const q=+String(T).slice(1);return[1,2,3].map(i=>decl(y,'M'+String((q-1)*3+i).padStart(2,'0'))).find(Boolean)};
const dueDate=(y,T)=>{if(String(T)[0]==='M')return new Date(y,+String(T).slice(1)+1,0);const e=db.params.echeances.find(x=>x.t===T),[m,d]=e.md.split('-').map(Number);return new Date(T==='T4'?y+1:y,m-1,d)};
function nextDeadline(now=new Date()){const t0=new Date(now.getFullYear(),now.getMonth(),now.getDate()),L=[];
 for(let y=t0.getFullYear()-2;y<=t0.getFullYear()+1;y++)for(const p of periods())L.push({date:dueDate(y,p),t:p,annee:y});
 L.sort((x,y)=>x.date-y.date);const best=L.find(x=>x.date>=t0&&!declCov(x.annee,x.t))||L.find(x=>x.date>=t0);
 best.jours=Math.round((best.date-t0)/DAY);best.alerte=alertDate(best.date,db.params.alerteJours);best.actif=t0>=best.alerte;return best}
function todoDecl(now=new Date()){const t0=new Date(now.getFullYear(),now.getMonth(),now.getDate()),o=[];
 for(let y=t0.getFullYear()-1;y<=t0.getFullYear();y++)for(const p of periods()){const due=dueDate(y,p),r=decl(y,p);
  if(!r){if(!declCov(y,p)&&due<t0&&t0-due<400*DAY&&taxe(encPer(y,p)).caTotal>0)o.push({k:'late',annee:y,t:p})}else if(r.statut==='declare')o.push({k:'pay',annee:y,t:p})}
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
const bigBrand=()=>`<div class="logobox u5"><img src="logo-kves.png" alt="KVES Services & Tech"></div><div><h1>Auto Manag KVES</h1><small class="mute u6">${t('tagline')}</small></div>${langBar()}`;
function ring(p,al){const r=40,c=2*Math.PI*r,a=(al/100*360-90)*Math.PI/180,P=Math.min(p,100);return`<svg class="u7" width="104" height="104" viewBox="0 0 104 104" role="img" aria-label="${t('hero.aria',Math.round(p))}"><circle cx="52" cy="52" r="${r}" fill="none" stroke="rgba(255,255,255,.2)" stroke-width="10"/>${P>0?`<circle cx="52" cy="52" r="${r}" fill="none" stroke="#fff" stroke-width="10" stroke-linecap="round" stroke-dasharray="${c*P/100} ${c}" transform="rotate(-90 52 52)"/>`:''}<line x1="${52+33*Math.cos(a)}" y1="${52+33*Math.sin(a)}" x2="${52+47*Math.cos(a)}" y2="${52+47*Math.sin(a)}" stroke="#18B169" stroke-width="4" stroke-linecap="round"/><text x="52" y="58" text-anchor="middle" fill="#fff" font-size="20" font-weight="700">${Math.round(p)} %</text></svg>`}
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
const backBtn=(label,fn)=>`<button class="link u8" id="bk">${esc(label)}</button>`;
const wireBack=fn=>{$('#bk').onclick=fn};

async function boot(){applyTheme();navigator.storage&&navigator.storage.persist&&navigator.storage.persist();let v=null;try{v=await getVault()}catch{return viewStorageError()}if(v)return viewLocked();let bak=null;try{bak=await kvGet('vault.bak')}catch{}bak?viewRestoreBak(bak):viewSetup()}
function viewConflict(){clearTimeout(lockTimer);dek=null;db=null;vault=null;show(`<main class="u9">${bigBrand()}<div class="card"><b>${t('cf2.title')}</b><p>${t('cf2.text')}</p><button id="cfreload">${t('cf2.btn')}</button></div></main>`);$('#cfreload').onclick=boot}
function viewStorageError(){show(`<main class="u9">${bigBrand()}<div class="card"><b>${t('se.title')}</b><p>${t('se.text')}</p><button id="retry">${t('upd.retry')}</button></div></main>`);$('#retry').onclick=boot}
function viewRestoreBak(bak){show(`<main class="u9">${bigBrand()}<div class="card"><b>${t('rb.title')}</b><p>${t('rb.text')}</p><button id="rbok">${t('rb.yes')}</button><button class="sec" id="rbno">${t('rb.no')}</button></div></main>`);$('#rbok').onclick=async()=>{await kvSet('vault',bak);boot()};$('#rbno').onclick=viewSetup}
function viewSetup(){show(`<main class="u9">${bigBrand()}<p class="mute">${t('intro')}</p>
<div class="card"><b>${t('setup.title')}</b><label>${t('setup.pw')}<input id="pw" type="password" autocomplete="new-password"></label><label>${t('setup.pw2')}<input id="pw2" type="password" autocomplete="new-password"></label>
<div id="err" class="note bad" role="alert" hidden></div><button id="go">${t('setup.go')}</button></div>
<div class="note">${t('setup.warn')}</div><button class="link" id="have">${t('setup.have')}</button></main>`);$('#have').onclick=viewImportStart;
 meter('pw');$('#go').onclick=async e=>{const pw=$('#pw').value;{const k=pwCheck(pw);if(k)return err(t(k))}if(pw!==$('#pw2').value)return err(t('err.pwdiff'));busy(e.target,true);try{const rk=await setup(pw);viewRecovery(rk)}catch{busy(e.target,false);err(t('setup.exists'))}}}
const okBackup=x=>{try{const v=JSON.parse(x);return v.app==='KVES'&&v.v===1&&!!v.pw&&!!v.rk&&!!v.data}catch{return false}};
function viewImportStart(){show(`<main class="u9">${bigBrand()}<div class="card"><b>${t('rs.title')}</b><p class="mute">${t('rs.t')}</p><input type="file" id="impfile" accept=".kves,application/json,text/plain"><textarea id="imptxt" placeholder="${t('sav.ph')}" aria-label="${t('sav.ph')}"></textarea><div id="err" class="note bad" role="alert" hidden></div><button id="imp">${t('sav.restore')}</button><button class="link" id="back">${t('back')}</button></div></main>`);
 $('#back').onclick=viewSetup;$('#imp').onclick=async()=>{const f=$('#impfile').files[0];let x=$('#imptxt').value.trim();if(!x&&f)x=(await f.text()).trim();if(!x)return err(t('sav.none'));if(!okBackup(x))return err(t('sav.invalid'));
  try{if(await getVault())return err(t('setup.exists'));await kvSet('vault',x);boot()}catch{err(t('se.title'))}}}
function viewRecovery(rk){show(`<main><h1>${t('rk.title')}</h1><p>${t('rk.text')}</p>
<div class="key" id="rk">${rk}</div><button class="sec noprint" id="print">${t('rk.copy')}</button>
<label class="noprint u10"><input class="u11" type="checkbox" id="ok"> ${t('rk.ok')}</label><button id="next" class="noprint" disabled>${t('continue')}</button></main>`);
 $('#ok').onchange=e=>$('#next').disabled=!e.target.checked;$('#print').onclick=async e=>{try{await navigator.clipboard.writeText(rk);e.target.textContent=t('rk.copied')}catch{const r=document.createRange();r.selectNodeContents($('#rk'));getSelection().removeAllRanges();getSelection().addRange(r);e.target.textContent=t('rk.sel')}};$('#next').onclick=()=>{arm();viewApp()}}
function viewLocked(){show(`<main class="u9">${bigBrand()}<div class="card"><b>${t('lock.title')}</b><label>${t('lock.pw')}<input id="upw" type="password" autocomplete="current-password"></label>
<div id="err" class="note bad" role="alert" hidden></div><button id="ugo">${t('lock.title')}</button><button class="link" id="lost">${t('lock.lost')}</button>${lockBk()}${rstLink()?`<button class="link" id="wipe">${t('rs.lost')}</button>`:''}</div></main>`);
 if(rstLink())$('#wipe').onclick=()=>viewWipe(viewLocked,false);
 const go=async()=>{const b=$('#ugo');busy(b,true);try{await unlock($('#upw').value);arm();viewApp()}catch(e){busy(b,false);const f=$('#upw');f.value='';f.focus();err(e&&e.wait?t('lock.wait',e.wait):t('lock.bad'))}};$('#ugo').onclick=go;$('#upw').onkeydown=e=>{if(e.key==='Enter')go()};
 $('#lost').onclick=()=>{show(`<main><h1>${t('rec.title')}</h1><div class="card"><label>${t('rec.key')}<input id="rkin" type="text" autocapitalize="characters" autocomplete="off"></label><label>${t('rec.new')}<input id="npw" type="password" autocomplete="new-password"></label><label>${t('rec.confirm')}<input id="npw2" type="password" autocomplete="new-password"></label>
<div id="err" class="note bad" role="alert" hidden></div><button id="rgo">${t('rec.go')}</button><button class="link" id="back">${t('back')}</button></div></main>`);
  meter('npw');$('#back').onclick=viewLocked;$('#rgo').onclick=async e=>{const n=$('#npw').value;{const k=pwCheck(n);if(k)return err(t(k))}if(n!==$('#npw2').value)return err(t('err.pwdiff'));busy(e.target,true);try{await recover($('#rkin').value,n);arm();viewApp()}catch(x){busy(e.target,false);err(x&&x.wait?t('lock.wait',x.wait):t('rec.bad'))}}}}

// V1.5.4 : ancienneté de la dernière sauvegarde (ou du début d'utilisation si aucune)
function bkInfo(){if(!db)return null;const ref=db.lastBackup||(db.journal&&db.journal[0]&&db.journal[0].d);if(!ref)return null;const days=Math.floor((Date.now()-new Date(ref))/DAY);return{days:Math.max(days,0),never:!db.lastBackup}}
function bkNote(i,btn){if(!i||i.days<3)return'';const crit=i.days>=7,txt=i.never?t('bk.nev',i.days):t(crit?'bk.crit':'bk.warn',i.days);return`<div class="note ${crit?'bad':'warn'}" role="${crit?'alert':'status'}">${txt}${btn?`<button class="sec u5" id="bkgo">${t('bk.now')}</button>`:''}</div>`}
function bkMirror(){try{const i=bkInfo();if(i)localStorage.setItem('amk.bkd',String(i.days>=0?Date.now()-i.days*DAY:Date.now()))}catch{}}

// V1.6.0 : ouvrir une sauvegarde sans rien modifier (mot de passe ou clé de récupération)
async function peekBackup(x,secret){const v=JSON.parse(x);let raw;try{raw=await unwrap(secret,v.pw)}catch{raw=await unwrap(normRk(secret),v.rk)}const k=await importDek(raw);return{upd:v.updated,d:norm(JSON.parse(dec.decode(await open(k,v.data))))}}
const bkSumRow=(l,a)=>`<div class="row"><span>${l}</span><b>${a}</b></div>`;
const bkSum=(d,upd)=>`<div class="note ok">${t('vf.ok',upd?new Date(upd).toLocaleString(t('locale')):'—')}</div>`+bkSumRow(t('vf.cl'),d.clients.length)+bkSumRow(t('vf.fa'),d.documents.length)+bkSumRow(t('vf.en'),d.encaissements.length)+bkSumRow(t('vf.de'),d.depenses.length);
const bkName=()=>{const n=new Date(),p=x=>String(x).padStart(2,'0');return 'AutoManagKVES_'+n.getFullYear()+'-'+p(n.getMonth()+1)+'-'+p(n.getDate())+'_'+p(n.getHours())+'h'+p(n.getMinutes())+'.kves'};

// V1.6.2 : logo et couleur de facture
const PALETTE={bleu:'#1F4E9C',vert:'#1E7B4F',rouge:'#B3322B',orange:'#C76A12',violet:'#6A3FA0',gris:'#3A424D'};
const invFoot=e=>[e.nom,e.ice&&'ICE '+e.ice,e.idae&&'IDAE '+e.idae,e.adresse,e.tel,e.mail].filter(Boolean).join(' · ');
async function logoFromFile(file){if(!file||!/^image\/(png|jpeg|webp)$/.test(file.type)||file.size>5e6)throw new Error('logo');const url=URL.createObjectURL(file);
 try{const img=await new Promise((res,rej)=>{const i=new Image();i.onload=()=>res(i);i.onerror=()=>rej(new Error('logo'));i.src=url});const nw=img.naturalWidth,nh=img.naturalHeight;if(!nw||!nh)throw new Error('logo');
  const sc=Math.min(1,480/nw,240/nh),w=Math.max(1,Math.round(nw*sc)),h=Math.max(1,Math.round(nh*sc)),c=document.createElement('canvas');c.width=w;c.height=h;const g=c.getContext('2d');g.fillStyle='#fff';g.fillRect(0,0,w,h);g.drawImage(img,0,0,w,h);
  const u=c.toDataURL('image/jpeg',0.88);if(!u.startsWith('data:image/jpeg'))throw new Error('logo');return{u,w,h}}finally{URL.revokeObjectURL(url)}}
function gcLogos(){const used=new Set([db.entreprise.logoId,...db.documents.map(d=>d.ent&&d.ent.logoId)].filter(Boolean));for(const k of Object.keys(db.logos))if(!used.has(k))delete db.logos[k]}

// V1.7.0 : alertes de radiation (loi 114-13, art. 8)
const plafOf=cat=>(cat==='commerce'?db.params.plafondCommerce:db.params.plafond)*100;
const caCatY=(cat,y)=>db.encaissements.filter(e=>!e.annule&&yearOf(e)===y&&catOf(e)===cat).reduce((a,e)=>a+e.montant,0);
function legalAlerts(now=new Date()){const Y=now.getFullYear(),o=[],p=db.params;
 const dates=(db.journal||[]).map(j=>new Date(j.d).getFullYear()).filter(y=>y>2000),start=p.anneeInscription||(dates.length?Math.min(...dates):Y);
 const total=db.encaissements.filter(e=>!e.annule&&yearOf(e)===Y).reduce((a,e)=>a+e.montant,0);
 if(Y>start&&now.getMonth()>=9&&total<=0)o.push({k:'lg.nil',cls:now.getMonth()>=11?'bad':'warn',a:[Y]});
 for(const cat of ['services','commerce']){const pl=plafOf(cat),ca=caCatY(cat,Y),pv=caCatY(cat,Y-1),nm=t('cat.'+cat);if(!pl)continue;
  if(ca>pl)o.push(pv>pl?{k:'lg.cap2',cls:'bad',a:[Y-1,Y,nm]}:{k:'lg.cap1',cls:'bad',a:[Y,nm,dh(ca),dh(pl)]});
  else if(pv>pl&&ca>0&&ca>=pl*p.alerte/100)o.push({k:'lg.capw',cls:'warn',a:[Y-1,nm,dh(ca),dh(pl)]})}
 return o}
const legalNotes=()=>legalAlerts().map(x=>`<div class="note ${x.cls}" role="${x.cls==='bad'?'alert':'status'}">${t(x.k,...x.a)}</div>`).join('');

// V1.8.0 : relecture des traductions (comparaison fr / en / ar, alertes automatiques, export CSV pour un relecteur)
const trRows=()=>{const F=LANGS.fr,E=LANGS.en||{},A=LANGS.ar||{},vars=s=>(String(s).match(/\{\d+\}/g)||[]).sort().join(),hasAr=s=>/[\u0600-\u06FF]/.test(s),hasLt=s=>/[A-Za-zÀ-ÿ]{3,}/.test(s),rows=[];
 for(const k of Object.keys(F)){const fr=F[k];if(typeof fr!=='string')continue;const en=E[k],ar=A[k],fl=[];
  if(typeof en!=='string')fl.push('en absent');if(typeof ar!=='string')fl.push('ar absent');
  if(typeof en==='string'){if(vars(en)!==vars(fr))fl.push('variables en');if(en===fr&&hasLt(fr)&&fr.length>12)fl.push('en identique au fr');if(fr.length>25&&(en.length>fr.length*2.2||en.length<fr.length*.3))fl.push('longueur en')}
  if(typeof ar==='string'){if(vars(ar)!==vars(fr))fl.push('variables ar');if(hasLt(fr)&&!hasAr(ar)&&fr.length>12)fl.push('ar sans arabe');if(fr.length>25&&(ar.length>fr.length*2.2||ar.length<fr.length*.3))fl.push('longueur ar')}
  rows.push({k,fr,en:en||'',ar:ar||'',fl})}
 return rows};
const trCsv=rows=>{const q=s=>'"'+String(s).replace(/"/g,'""')+'"';return '\ufeff'+['cle','fr','en','ar','alertes','statut_relecture','commentaire'].join(';')+'\r\n'+rows.map(r=>[q(r.k),q(r.fr),q(r.en),q(r.ar),q(r.fl.join(', ')),q(''),q('')].join(';')).join('\r\n')};

// V1.7.5 : simulateur impôt + droit complémentaire (CGI 73-II-B-6° ; décret 2-21-928). Estimation : tranche d'après l'impôt du trimestre x 4
const DC_GRID=[[499.99,300],[1000,390],[2500,570],[5000,720],[10000,1050],[25000,1500],[50000,2250],[Infinity,3600]];
const dcOf=annual=>{for(const[u,v]of DC_GRID)if(annual<=u)return v;return 3600};
const simRate=cat=>(cat==='commerce'?db.params.tauxCommerce:db.params.taux)/100;
const simCalc=(ca,cat)=>{const imp=Math.round(ca*simRate(cat)*100)/100,dc=dcOf(imp*4);return{imp,dc,tot:imp+dc,net:ca-imp-dc}};
const simMin=(net,cat)=>{if(!(net>0))return 0;const lim=Math.ceil(net*3+20000);for(let ca=Math.ceil(net);ca<=lim;ca++)if(simCalc(ca,cat).net>=net)return ca;return 0};
const simSteps=cat=>{const r=simRate(cat),out=[];let lo=0;DC_GRID.forEach(([u,v],i)=>{const from=i===0?0:Math.ceil(lo/4/r);out.push({from,dc:v});lo=u<1e9?(i===0?500:u):lo});return out};

// V1.7.2 : santé du coffre (taille, copie de secours, contrôle d'intégrité des données)
let vaultBytes=0,intKey='',intRes=[];
const SIZE_WARN=8*1048576,fmtBytes=n=>n<1048576?Math.max(1,Math.round(n/1024))+' '+t('u.ko'):(n/1048576).toFixed(1)+' '+t('u.mo');
function integrity(){const o=[],D=db,isD=x=>typeof x==='string'&&/^\d{4}-\d\d-\d\d/.test(x)&&!isNaN(pd(x));
 for(const k of ['clients','documents','encaissements','depenses','declarations','activites','taches']){if(!Array.isArray(D[k])){o.push({k:'ig.arr',a:[k]});continue}const ids=new Set();let dup=0;for(const x of D[k]){if(!x||typeof x!=='object'){dup++;continue}if(ids.has(x.id))dup++;ids.add(x.id)}if(dup)o.push({k:'ig.dupid',a:[k,dup]})}
 if(!Array.isArray(D.documents)||!Array.isArray(D.encaissements)||!Array.isArray(D.depenses)||!Array.isArray(D.declarations))return o;
 let badL=0,badA=0,badD=0;const nums=new Map(),docIds=new Set(D.documents.map(x=>x.id));
 for(const f of D.documents){if(f.type==='facture'){nums.set(f.numero,(nums.get(f.numero)||0)+1);const s=(f.lignes||[]).reduce((a,x)=>a+lineCts(x.qm,x.p),0);if(s!==f.total)o.push({k:'ig.tot',a:[f.numero]});if(!isD(f.date))badD++;if(f.ent&&f.ent.logoId&&!(D.logos||{})[f.ent.logoId])o.push({k:'ig.logo',a:[f.numero]})}}
 for(const[n,c]of nums)if(c>1)o.push({k:'ig.num',a:[n]});
 for(const e of D.encaissements){if(e.factureId&&!docIds.has(e.factureId))badL++;if(!Number.isSafeInteger(e.montant)||e.montant<=0)badA++;if(!isD(e.date))badD++}
 for(const e of D.depenses){if(!Number.isSafeInteger(e.montant)||e.montant<=0)badA++;if(!isD(e.date))badD++}
 if(badL)o.push({k:'ig.link',a:[badL]});if(badA)o.push({k:'ig.amt',a:[badA]});if(badD)o.push({k:'ig.date',a:[badD]});
 const dk=new Set();for(const r of D.declarations){const k=r.annee+'|'+r.t;if(dk.has(k))o.push({k:'ig.decl',a:[r.t+' '+r.annee]});dk.add(k)}
 if(D.entreprise&&D.entreprise.logoId&&!(D.logos||{})[D.entreprise.logoId])o.push({k:'ig.logo',a:['—']});
 return o}
const integ=()=>{if(intKey!==vault.updated){intRes=integrity();intKey=vault.updated}return intRes};
async function bakCheck(){try{const b=await kvGet('vault.bak');if(!b)return'hl.bak.none';const v=JSON.parse(b);await open(dek,v.data);return'hl.bak.ok'}catch{return'hl.bak.bad'}}
const iosWeb=()=>{try{return(/iPad|iPhone|iPod/.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1))&&!navigator.standalone&&!matchMedia('(display-mode: standalone)').matches}catch{return false}};
const healthNotes=()=>{const o=[],r=integ();if(iosWeb())o.push(`<div class="note warn" role="status">${t('ios.hint')}</div>`);if(r.length)o.push(`<div class="note warn" role="status">${t('hl.home',r.length)}</div>`);if(vaultBytes>SIZE_WARN)o.push(`<div class="note warn" role="status">${t('hl.big',fmtBytes(vaultBytes))}</div>`);return o.join('')};

async function wipeAll(keep){const run=async()=>{await kvClear();if(!keep)try{['amk.theme','amk.lang','amk.rstlink','amk.fail'].forEach(k=>localStorage.removeItem(k))}catch{}};
 if(navigator.locks)await navigator.locks.request('amk-vault',run);else await run();
 dek=null;db=null;vault=null;clearTimeout(lockTimer);location.reload()}
const lockBk=()=>{try{const v=+localStorage.getItem('amk.bkd');if(!v)return'';const d=Math.floor((Date.now()-v)/DAY);return bkNote({days:d,never:false},false)}catch{return''}};
const rstLink=()=>{try{return localStorage.getItem('amk.rstlink')!=='0'}catch{return true}};
function viewWipe(back,authed){show(`<main class="u9">${bigBrand()}<div class="card"><b>${t('rs.title')}</b><p>${t('rs.warn')}</p>${authed?`<button class="sec" id="rsb">${t('rs.bak')}</button><label>${t('rs.pw')}<input id="rspw" type="password" autocomplete="current-password"></label>`:''}<label>${t('rs.type',t('rs.word'))}<input id="rsw" type="text" autocomplete="off" autocapitalize="characters"></label><label class="u10"><input class="u11" type="checkbox" id="rsk" checked> ${t('rs.keep')}</label><div id="err" class="note bad" role="alert" hidden></div><button class="danger" id="rsgo">${t('rs.go')}</button><button class="link" id="rsno">${t('cancel')}</button></div></main>`);
 $('#rsno').onclick=back;if(authed)$('#rsb').onclick=()=>saveFile('auto-manag-kves-donnees-'+localIso()+'.json','application/json',JSON.stringify(db,null,1));
 $('#rsgo').onclick=async e=>{if($('#rsw').value.trim().toUpperCase()!==t('rs.word').toUpperCase())return err(t('rs.badw'));
  if(authed){try{await unwrap($('#rspw').value,vault.pw)}catch{return err(t('sec.bad'))}}
  busy(e.target,true);try{await wipeAll($('#rsk').checked)}catch{busy(e.target,false);err(t('se.title'))}}}

function viewApp(){bkMirror();kvGet('vault').then(x=>{vaultBytes=x?x.length:0}).catch(()=>{});const tabs=['home','clients','inv','ech','more'];
 show(`<main id="m"></main><nav aria-label="Navigation principale">${tabs.map(k=>`<button data-tab="${k}" ${route.tab===k?'aria-current="page"':''}><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ic[k]}</svg>${t('tab.'+k)}</button>`).join('')}</nav>`);
 document.querySelectorAll('nav button').forEach(b=>b.onclick=()=>nav(b.dataset.tab));
 const m=$('#m');({home,clients:clientsView,ech,more,inv:invView})[route.tab](m)}
const subs={};
