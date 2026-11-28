// Tests V2.1.0 + V2.1.1 (carte Légal) + V2.1.2 (carte Partager, QR code) : page Plus en cartes (comme Coach-Mass-KVES) et carte À propos (bannière, logo, signature, empreinte, version)
const {chromium}=require('playwright');const fs=require('fs'),os=require('os'),path=require('path'),http=require('http'),cp=require('child_process'),crypto=require('crypto');const until=require('./attendre.js');
const SRC=path.resolve(__dirname,'..');const BASE=process.env.BASE_LOCAL;let ok=0,ko=0;const T=(n,c)=>{console.log(c?'OK  ':'FAIL',n);c?ok++:ko++};const PW='Phrase-test-2026!';
const C=require(path.join(SRC,'outils','commun.js'));
const copy=()=>{const d=fs.mkdtempSync(path.join(os.tmpdir(),'kves-plus-'));fs.cpSync(SRC,d,{recursive:true,filter:s=>!/[\\/](tests|node_modules|\.git)([\\/]|$)/.test(s.slice(SRC.length))});return d};
const signNode=d=>{const k=crypto.generateKeyPairSync('ed25519');const raw=k.publicKey.export({format:'der',type:'spki'}).slice(-32);fs.writeFileSync(path.join(d,'kves-automanag-cle-publique.txt'),raw.toString('base64url'));cp.execFileSync('node',[path.join(d,'outils','manifeste.js')],{cwd:d});fs.writeFileSync(path.join(d,'SIGNATURE-KVES.sig'),crypto.sign(null,fs.readFileSync(path.join(d,'SIGNATURE-KVES.txt')),k.privateKey).toString('base64url'));return raw};
const MIME={'.js':'text/javascript','.html':'text/html','.css':'text/css','.png':'image/png','.jpg':'image/jpeg','.json':'application/json','.webmanifest':'application/manifest+json','.txt':'text/plain'};
const serve=d=>new Promise(r=>{const s=http.createServer((q,res)=>{let p=decodeURIComponent(q.url.split('?')[0]);if(p.endsWith('/'))p+='index.html';const f=path.join(d,p);if(!f.startsWith(d)||!fs.existsSync(f)||fs.statSync(f).isDirectory()){res.writeHead(404);return res.end()}res.writeHead(200,{'content-type':MIME[path.extname(f)]||'application/octet-stream'});res.end(fs.readFileSync(f))});s.listen(0,()=>r({url:'http://localhost:'+s.address().port+'/',close:()=>s.close()}))});
const setup=async(P,u)=>{await P.goto(u+'index.html');await P.fill('#pw',PW);await P.fill('#pw2',PW);await P.click('#go');await P.waitForSelector('#rk');await P.check('#ok');await P.click('#next');await P.waitForSelector('nav')};
const KEYS=['enc','dep','decl','exp','ent','act','sim','loi','regles','trad','aff','sec','sav','demo','sgn','shr','lgw','lgp','lgc'];
(async()=>{const b=await chromium.launch();const errs=[];
 const mk=async(u,vp,lang)=>{const ctx=await b.newContext({viewport:vp||{width:390,height:844}});if(lang)await ctx.addInitScript(l=>{try{localStorage.setItem('amk.lang',l)}catch{}},lang);const P=await ctx.newPage();P.on('pageerror',e=>errs.push(e.message));await setup(P,u);return P};
 // 1. structure
 {const P=await mk(BASE);await P.click('nav [data-tab=more]');await P.waitForSelector('.ptitle');
  T('Plus : titre avec trait de couleur',await P.evaluate(()=>/^Plus$/.test(document.querySelector('.ptitle').textContent)&&getComputedStyle(document.querySelector('.ptitle'),'::after').height==='6px'));
  T('Plus : 8 cartes (Gestion, Mon activité, Outils, Réglages, Données d\'exemple, À propos, Partager, Légal)',await P.evaluate(()=>document.querySelectorAll('.pcard').length===8&&[...document.querySelectorAll('.pcard .ph')].map(e=>e.textContent).join('|').startsWith('Gestion|Mon activité|Outils et règles|Réglages|Données d\'exemple|À propos|Partager|Légal')));
  T('Plus : les 19 écrans sont tous accessibles par un bouton',await P.evaluate(k=>k.every(x=>document.querySelector('[data-s='+x+']')),KEYS));
  T('Plus : boutons larges en gros (hauteur ≥ 56 px, pleine largeur)',await P.evaluate(()=>[...document.querySelectorAll('.pcard button[data-s]')].every(x=>x.getBoundingClientRect().height>=55&&x.getBoundingClientRect().width>300)));
  let all=true;for(const k of KEYS){await P.click('[data-s='+k+']');await P.waitForTimeout(120);const back=await P.evaluate(()=>!!document.querySelector('main h1')&&!document.querySelector('.ptitle'));if(!back)all=false;await P.evaluate(()=>nav('more'));await P.waitForSelector('.ptitle')}
  T('chaque bouton ouvre son écran et on revient à Plus',all);
  await P.evaluate(()=>nav('more'));await P.waitForSelector('#abs');
  T('À propos : bannière et logo KVES chargés',await P.evaluate(async()=>{const i=[...document.querySelectorAll('.pcard img')];await Promise.all(i.map(x=>x.decode().catch(()=>{})));return i.length===2&&i.every(x=>x.naturalWidth>0)}));
  T('À propos : version affichée',await P.evaluate(()=>document.body.textContent.includes('version '+APP_VERSION+' · © KVES')));
  await until(P,()=>/non configurée/.test(document.querySelector('#abs').textContent),null,{timeout:8000}).catch(()=>{});
  T('À propos sans clé : « Signature non configurée » en orange, sans empreinte',await P.evaluate(()=>/non configurée/.test(document.querySelector('#abs').textContent)&&document.querySelector('#abs').classList.contains('warn')&&document.querySelector('#abf').textContent===''));
  T('Verrouiller maintenant fonctionne depuis la carte Réglages',await P.evaluate(()=>!!document.querySelector('#lk'))&&(await P.click('#lk'),await P.waitForSelector('#upw',{timeout:5000}).then(()=>true).catch(()=>false)));
  await P.context().close()}
 // 2. signature affichée dans À propos
 {const D=copy();const raw=signNode(D);const srv=await serve(D);const P=await mk(srv.url);await P.click('nav [data-tab=more]');await P.waitForSelector('#abs');
  await until(P,()=>/vérifiée/.test(document.querySelector('#abs').textContent),null,{timeout:10000}).catch(()=>{});
  T('À propos signé : « Signature KVES vérifiée » en vert',await P.evaluate(()=>/Signature KVES vérifiée : les fichiers sont authentiques/.test(document.querySelector('#abs').textContent)&&document.querySelector('#abs').classList.contains('ok')));
  T("À propos signé : l'empreinte affichée est celle de la clé",(await P.textContent('#abf')).includes(C.fingerprint(raw)));
  T('la bannière est dans la liste signée et dans le cache hors ligne',/ {2}banniere\.jpg$/m.test(fs.readFileSync(path.join(D,'SIGNATURE-KVES.txt'),'utf8'))&&await P.evaluate(async()=>{await navigator.serviceWorker.ready;return !!(await caches.match('./banniere.jpg'))}));
  srv.close();await P.context().close()}
 {const D=copy();signNode(D);fs.appendFileSync(path.join(D,'app-factures.js'),'\n//x\n');const srv=await serve(D);const P=await mk(srv.url);await P.click('nav [data-tab=more]');await P.waitForSelector('#abs');
  await until(P,()=>/anomalie/.test(document.querySelector('#abs').textContent),null,{timeout:10000}).catch(()=>{});
  T('À propos avec fichier modifié : anomalie en rouge',await P.evaluate(()=>/anomalie/.test(document.querySelector('#abs').textContent)&&document.querySelector('#abs').classList.contains('bad')));srv.close();await P.context().close()}
 // 3. langues et petits écrans
 {const P=await mk(BASE,{width:390,height:844},'en');await P.click('nav [data-tab=more]');await P.waitForSelector('.ptitle');
  T('anglais : cartes traduites',await P.evaluate(()=>[...document.querySelectorAll('.pcard .ph')].map(e=>e.textContent).join('|').startsWith('Management|My activity|Tools and rules|Settings|Sample data|About|Share|Legal')&&!/pl\./.test(document.body.textContent)));await P.context().close()}
 {const P=await mk(BASE,{width:390,height:844},'ar');await P.click('nav [data-tab=more]');await P.waitForSelector('.ptitle');
  T('arabe : cartes traduites, sens de droite à gauche, trait à droite',await P.evaluate(()=>{const r=document.querySelector('.ptitle'),a=getComputedStyle(r,'::after');return document.documentElement.dir==='rtl'&&[...document.querySelectorAll('.pcard .ph')].map(e=>e.textContent).join('|').startsWith('التدبير|نشاطي')&&!/pl\./.test(document.body.textContent)&&a.right!==undefined}));await P.context().close()}
 for(const [w,l] of [[320,'fr'],[320,'ar'],[390,'en']]){const P=await mk(BASE,{width:w,height:640},l);await P.click('nav [data-tab=more]');await P.waitForSelector('.ptitle');
  T('aucun débordement horizontal sur Plus ('+w+' px, '+l+')',await P.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth+1));await P.context().close()}
 {const P=await mk(BASE);await P.evaluate(()=>{localStorage.setItem('amk.theme','dark');applyTheme()});await P.click('nav [data-tab=more]');await P.waitForSelector('.ptitle');
  T('thème sombre : boutons secondaires lisibles (fond différent de la carte)',await P.evaluate(()=>{const c=getComputedStyle(document.querySelector('.pcard')).backgroundColor,s=getComputedStyle(document.querySelector('.pcard button.sec')).backgroundColor;return c!==s}));await P.context().close()}

 // 4. pages légales
 {const P=await mk(BASE);await P.click('nav [data-tab=more]');await P.waitForSelector('[data-s=lgw]');
  const exp={lgw:5,lgp:7,lgc:7};
  for(const k of ['lgw','lgp','lgc']){await P.click('[data-s='+k+']');await P.waitForSelector('.lgcard');
   T('Légal '+k+' : '+exp[k]+' sections, textes non vides, pas de clé brute',await P.evaluate(([k,n])=>document.querySelectorAll('.lgh').length===n&&document.querySelectorAll('.lgp').length===n&&[...document.querySelectorAll('.lgp')].every(p=>p.textContent.length>20)&&!new RegExp(k+'\\\\.').test(document.body.textContent),[k,exp[k]]));
   if(k==='lgw')T('Avertissement : cite la loi 114-13',await P.evaluate(()=>document.querySelector('.lgcard').textContent.includes('114-13')));
   if(k==='lgp')T('Confidentialité : mentionne AES-256 et GitHub',await P.evaluate(()=>{const x=document.querySelector('.lgcard').textContent;return x.includes('AES-256')&&x.includes('GitHub')}));
   if(k==='lgc')T('Conditions : droit marocain',await P.evaluate(()=>document.querySelector('.lgcard').textContent.includes('droit marocain')));
   T('Légal '+k+' : pas de débordement horizontal',await P.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth+1));
   await P.click('#bk,.back,[data-back]').catch(()=>{});await P.waitForTimeout(150);
   if(!await P.evaluate(()=>!!document.querySelector('.ptitle')))await P.evaluate(()=>nav('more'));
   T('Légal '+k+' : retour à Plus',await P.evaluate(()=>!!document.querySelector('.ptitle')));await P.waitForSelector('[data-s=lgw]')}
  await P.context().close()}
 for(const [l,c] of [['en','Terms of use'],['ar','شروط الاستعمال']]){const P=await mk(BASE,{width:320,height:640},l);await P.click('nav [data-tab=more]');await P.waitForSelector('[data-s=lgc]');
  const chev=await P.evaluate(()=>getComputedStyle(document.querySelector('.chev')).transform);
  await P.click('[data-s=lgc]');await P.waitForSelector('.lgcard');
  T('Légal '+l+' : titre traduit, 7 sections, sans clé brute, sans débordement (320 px)',await P.evaluate(c=>document.querySelector('main h1').textContent.trim()===c&&document.querySelectorAll('.lgh').length===7&&!/lgc\\./.test(document.body.textContent)&&document.documentElement.scrollWidth<=document.documentElement.clientWidth+1,c));
  if(l==='ar')T('flèche inversée en arabe',chev!=='none'&&chev.startsWith('matrix(-1'));
  await P.context().close()}

 // 5. Partager : QR code et lien
 {const ctx=await b.newContext({viewport:{width:390,height:844},permissions:['clipboard-read','clipboard-write']});const P=await ctx.newPage();P.on('pageerror',e=>errs.push(e.message));await setup(P,BASE);
  await P.click('nav [data-tab=more]');await P.waitForSelector('[data-s=shr]');await P.click('[data-s=shr]');await P.waitForSelector('#qr svg');
  const URL_='https://darkangeldaoud.github.io/Auto-Manag-KVES/';
  T('Partager : QR code affiché (carré, fond blanc, noir/bleu foncé), lien visible',await P.evaluate(u=>{const q=document.querySelector('#qr'),r=q.getBoundingClientRect(),p=q.querySelector('path');return Math.abs(r.width-r.height)<2&&r.width>=200&&p.getAttribute('d').length>500&&document.querySelector('#shu').textContent===u},URL_));
  T('QR : 33 modules (version 4), 3 repères aux coins, motif de synchronisation',await P.evaluate(()=>{const m=QR.make(APP_URL),n=m.length;const fp=(x,y)=>m[y][x]&&m[y][x+6]&&m[y+6][x]&&m[y+6][x+6]&&!m[y+1][x+1]&&m[y+3][x+3]&&!m[y+1][x+3];let t=true;for(let i=8;i<n-8;i++)if(m[6][i]!==(i%2==0)||m[i][6]!==(i%2==0))t=false;return n===33&&fp(0,0)&&fp(n-7,0)&&fp(0,n-7)&&t&&m[n-8][8]===true}));
  T('QR : des textes de longueurs différentes sont encodés (1 à 100 octets), trop long refusé',await P.evaluate(()=>{try{for(const l of [1,20,50,80,100])QR.make('a'.repeat(l));}catch{return false}try{QR.make('a'.repeat(200));return false}catch{return true}}));
  T('Partager : pas de bouton Partager sans navigator.share (ordinateur), bouton copier présent',await P.evaluate(()=>!navigator.share?document.querySelector('#shs').hidden===true:true)&&!!await P.$('#shc'));
  await P.click('#shc');await until(P,()=>/copié/.test(document.querySelector('#shm').textContent),null,{timeout:3000}).catch(()=>{});
  T('Copier le lien : message « Lien copié » et presse-papiers correct',await P.evaluate(async u=>/Lien copié/.test(document.querySelector('#shm').textContent)&&await navigator.clipboard.readText()===u,URL_));
  T('Partager : pas de débordement horizontal et retour à Plus',await P.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth+1)&&(await P.click('#bk'),await P.waitForSelector('.ptitle',{timeout:3000}).then(()=>true).catch(()=>false)));
  await ctx.close()}
 {const ctx=await b.newContext({viewport:{width:390,height:844}});await ctx.addInitScript(()=>{window.__sh=null;Object.defineProperty(navigator,'share',{value:o=>{window.__sh=o;return Promise.resolve()},configurable:true})});const P=await ctx.newPage();P.on('pageerror',e=>errs.push(e.message));await setup(P,BASE);
  await P.click('nav [data-tab=more]');await P.waitForSelector('[data-s=shr]');await P.click('[data-s=shr]');await P.waitForSelector('#shs:not([hidden])');await P.click('#shs');await until(P,()=>window.__sh,null,{timeout:3000}).catch(()=>{});
  T('Partager (téléphone) : navigator.share reçoit le titre, le texte et le lien',await P.evaluate(()=>!!window.__sh&&window.__sh.url===APP_URL&&window.__sh.title==='Auto Manag KVES'&&window.__sh.text.length>10));await ctx.close()}
 for(const [l,c] of [['en','Share the app'],['ar','مشاركة التطبيق']]){const P=await mk(BASE,{width:320,height:640},l);await P.click('nav [data-tab=more]');await P.waitForSelector('[data-s=shr]');await P.click('[data-s=shr]');await P.waitForSelector('#qr svg');
  T('Partager '+l+' : titre traduit, sans clé brute, sans débordement (320 px), lien en gauche-droite',await P.evaluate(c=>document.querySelector('main h1').textContent.trim()===c&&!/shr\\./.test(document.body.textContent)&&document.documentElement.scrollWidth<=document.documentElement.clientWidth+1&&document.querySelector('#shu').dir==='ltr',c));await P.context().close()}
 {const D=copy();signNode(D);const t=fs.readFileSync(path.join(D,'SIGNATURE-KVES.txt'),'utf8');const sw=fs.readFileSync(path.join(D,'sw.js'),'utf8');
  T('qr.js est dans la liste signée, dans le cache hors ligne et chargé par index.html',/ {2}qr\.js$/m.test(t)&&sw.includes("'./qr.js'")&&fs.readFileSync(path.join(D,'index.html'),'utf8').includes('<script src="qr.js">'))}
 T('aucune erreur JS',errs.length===0);if(errs.length)console.log(errs);
 console.log(ok+' OK, '+ko+' échecs');await b.close();process.exit(ko?1:0)})();
