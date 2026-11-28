// Tests V2.0.1 : signature Ed25519 comme Coach-Mass-KVES (outils de contrôle, outil privé HTML, vérification dans l'appli, refus de mise à jour)
// L'outil privé SIGNER-KVES-AutoManag.html n'est pas dans le dépôt : indiquer son chemin avec KVES_OUTIL (sinon ces tests-là sont ignorés).
const {chromium}=require('playwright');const fs=require('fs'),os=require('os'),path=require('path'),http=require('http'),cp=require('child_process'),crypto=require('crypto');const until=require('./attendre.js');
const SRC=path.resolve(__dirname,'..');let ok=0,ko=0;const T=(n,c)=>{console.log(c?'OK  ':'FAIL',n);c?ok++:ko++};const PW='Phrase-test-2026!';
const TOOL=process.env.KVES_OUTIL||path.resolve(SRC,'..','OUTIL-PRIVE','SIGNER-KVES-AutoManag.html');const hasTool=fs.existsSync(TOOL);
const C=require(path.join(SRC,'outils','commun.js'));
const copy=()=>{const d=fs.mkdtempSync(path.join(os.tmpdir(),'kves-sig-'));fs.cpSync(SRC,d,{recursive:true,filter:s=>!/[\\/](tests|node_modules|\.git)([\\/]|$)/.test(s.slice(SRC.length))});return d};
const node=(d,script,args)=>{try{const o=cp.execFileSync('node',[path.join(d,'outils',script),...(args||[])],{cwd:d,stdio:['ignore','pipe','pipe']});return{code:0,out:String(o)}}catch(e){return{code:e.status,out:String(e.stdout)+String(e.stderr)}}};
const rd=(d,f)=>fs.readFileSync(path.join(d,f),'utf8');
const newKey=()=>{const k=crypto.generateKeyPairSync('ed25519');return{priv:k.privateKey,raw:k.publicKey.export({format:'der',type:'spki'}).slice(-32)}};
const signNode=(d,k)=>{fs.writeFileSync(path.join(d,'kves-automanag-cle-publique.txt'),k.raw.toString('base64url'));node(d,'manifeste.js');fs.writeFileSync(path.join(d,'SIGNATURE-KVES.sig'),crypto.sign(null,fs.readFileSync(path.join(d,'SIGNATURE-KVES.txt')),k.priv).toString('base64url'))};
const MIME={'.js':'text/javascript','.html':'text/html','.css':'text/css','.png':'image/png','.json':'application/json','.webmanifest':'application/manifest+json','.txt':'text/plain'};
const serve=d=>new Promise(r=>{const s=http.createServer((q,res)=>{let p=decodeURIComponent(q.url.split('?')[0]);if(p.endsWith('/'))p+='index.html';const f=path.join(d,p);if(!f.startsWith(d)||!fs.existsSync(f)||fs.statSync(f).isDirectory()){res.writeHead(404);return res.end()}res.writeHead(200,{'content-type':MIME[path.extname(f)]||'application/octet-stream'});res.end(fs.readFileSync(f))});s.listen(0,()=>r({url:'http://localhost:'+s.address().port+'/',close:()=>s.close()}))});
(async()=>{
// --- 1. fichiers livrés et outils de contrôle
const A=copy();
T('plus de cle-publique.js ni d\'ancien outil de clés privées dans le dépôt',!fs.existsSync(path.join(A,'cle-publique.js'))&&!fs.existsSync(path.join(A,'outils','generer-cles.js'))&&!fs.existsSync(path.join(A,'outils','signer.js')));
T('clé publique : fichier présent (« A-GENERER ») et sans effet',rd(A,'kves-automanag-cle-publique.txt')==='A-GENERER'&&C.readPub()===null);
T('verifier.js ignore proprement tant que la clé n\'existe pas',node(A,'verifier.js').code===0);
const m=node(A,'manifeste.js');const man=rd(A,'SIGNATURE-KVES.txt');const files=man.split('\n').filter(l=>/^[0-9a-f]{64}  /.test(l)).map(l=>l.slice(66));
T('manifeste.js : liste des empreintes écrite, signature vidée',m.code===0&&files.length>=24&&rd(A,'SIGNATURE-KVES.sig')===''&&/^application: Auto Manag KVES$/m.test(man));
T('la clé publique et les fichiers de signature ne sont pas dans la liste (on peut donc ajouter la clé après coup)',!files.some(f=>/kves-automanag|SIGNATURE/.test(f)));
const sw=rd(A,'sw.js');
T('chaque fichier signé, la clé publique et les fichiers de signature sont dans le cache hors ligne (sw.js)',files.every(f=>sw.includes("'./"+f+"'"))&&["'./kves-automanag-cle-publique.txt'","'./SIGNATURE-KVES.txt'","'./SIGNATURE-KVES.sig'"].every(x=>sw.includes(x)));
T('index.html charge signature.js et plus cle-publique.js',/signature\.js/.test(rd(A,'index.html'))&&!/cle-publique\.js/.test(rd(A,'index.html')));
const K1=newKey();signNode(A,K1);
T('vérification en ligne de commande : valide avec une signature Ed25519',node(A,'verifier.js').code===0&&node(A,'verifier.js').out.includes(C.fingerprint(K1.raw)));
T("l'empreinte a le format de Coach-Mass (4 groupes de 4 caractères en majuscules)",/^([0-9A-F]{4} ){3}[0-9A-F]{4}$/.test(C.fingerprint(K1.raw)));
{const X=copy();signNode(X,K1);fs.appendFileSync(path.join(X,'app-vues.js'),'\n// modifié\n');T('fichier modifié après signature : détecté',node(X,'verifier.js').code!==0)}
{const X=copy();signNode(X,K1);fs.writeFileSync(path.join(X,'SIGNATURE-KVES.sig'),'');T('clé en ligne mais signature vide : refusé',node(X,'verifier.js').code!==0)}
{const X=copy();signNode(X,K1);fs.writeFileSync(path.join(X,'kves-automanag-cle-publique.txt'),newKey().raw.toString('base64url'));T('signature d\'une autre clé : refusée',node(X,'verifier.js').code!==0)}
{const X=copy();signNode(X,K1);fs.writeFileSync(path.join(X,'nouveau.js'),'//');T('fichier ajouté mais non signé : détecté',node(X,'verifier.js').code!==0)}

// --- 2. l'outil privé HTML, de bout en bout (comme Coach-Mass)
const b=await chromium.launch();let D=A;
if(hasTool){
 const B=copy();node(B,'manifeste.js');const dir=fs.mkdtempSync(path.join(os.tmpdir(),'kves-dl-'));
 const ctx=await b.newContext({acceptDownloads:true});const P=await ctx.newPage();const got=[];P.on('download',async d=>{const f=path.join(dir,d.suggestedFilename());await d.saveAs(f);got.push(d.suggestedFilename())});
 await P.goto('file://'+TOOL);
 await P.fill('#p1','court');await P.fill('#p2','court');await P.click('#gen');T('outil : phrase trop courte refusée',/10 caract/.test(await P.textContent('#mg')));
 await P.fill('#p1','Phrase-secrete-A1');await P.fill('#p2','autre-phrase-xx');await P.click('#gen');T('outil : deux phrases différentes refusées',/ne correspondent pas/.test(await P.textContent('#mg'))&&got.length===0);
 await P.fill('#p2','Phrase-secrete-A1');await P.click('#gen');await until(P,()=>/Empreinte/.test(document.querySelector('#mg').textContent),null,{timeout:20000});await P.waitForTimeout(900);
 const kjson=path.join(dir,'KVES-AutoManag-cle-privee-CHIFFREE.json'),kpub=path.join(dir,'kves-automanag-cle-publique.txt');
 T('outil : crée la clé privée chiffrée et la clé publique, avec des noms propres à Auto Manag',got.includes('KVES-AutoManag-cle-privee-CHIFFREE.json')&&got.includes('kves-automanag-cle-publique.txt'));
 const kobj=JSON.parse(fs.readFileSync(kjson,'utf8'));
 T('outil : la clé privée est chiffrée et marquée « auto-manag »',kobj.app==='auto-manag'&&kobj.it===250000&&!/PRIVATE/.test(JSON.stringify(kobj))&&Buffer.from(kobj.ct,'base64url').length>32);
 const pubTxt=fs.readFileSync(kpub,'utf8');T('outil : clé publique = 32 octets en base64url (43 caractères)',/^[A-Za-z0-9_-]{43}$/.test(pubTxt));
 const shownFp=(await P.textContent('#mg')).split(': ').pop().trim();T("outil : l'empreinte affichée est celle que calculent le dépôt et l'appli",shownFp===C.fingerprint(Buffer.from(pubTxt,'base64url')));
 fs.writeFileSync(path.join(B,'kves-automanag-cle-publique.txt'),pubTxt);
 const tx=path.join(B,'SIGNATURE-KVES.txt');
 await P.setInputFiles('#kf',kjson);await P.setInputFiles('#tf',tx);
 got.length=0;await P.fill('#sp','mauvaise-phrase-xx');await P.click('#sig');await until(P,()=>document.querySelector('#ms').textContent.length>0,null,{timeout:20000});await P.waitForTimeout(500);
 T('outil : mauvaise phrase secrète refusée, aucun fichier créé',/Échec/.test(await P.textContent('#ms'))&&got.length===0);
 await P.fill('#sp','Phrase-secrete-A1');await P.click('#sig');await until(P,()=>/Signature créée/.test(document.querySelector('#ms').textContent),null,{timeout:20000});await P.waitForTimeout(600);
 T('outil : signe la liste de la version et indique le numéro de version',got.includes('SIGNATURE-KVES.sig')&&new RegExp('version '+C.version().replace(/\./g,'\\.')).test(await P.textContent('#ms')));
 fs.copyFileSync(path.join(dir,'SIGNATURE-KVES.sig'),path.join(B,'SIGNATURE-KVES.sig'));
 T("la signature faite par l'outil est acceptée par verifier.js (Node)",node(B,'verifier.js').code===0);
 // garde-fous
 const bad1=JSON.parse(JSON.stringify(kobj));delete bad1.app;fs.writeFileSync(path.join(dir,'coach.json'),JSON.stringify(bad1));
 got.length=0;await P.setInputFiles('#kf',path.join(dir,'coach.json'));await P.fill('#sp','Phrase-secrete-A1');await P.click('#sig');await until(P,()=>/pas la clé/.test(document.querySelector('#ms').textContent),null,{timeout:20000});T("outil : refuse la clé d'une autre application (Coach-Mass)",got.length===0);
 fs.writeFileSync(path.join(dir,'autre.txt'),man.replace('Auto Manag KVES','Coach-Mass-KVES'));await P.setInputFiles('#kf',kjson);await P.setInputFiles('#tf',path.join(dir,'autre.txt'));await P.click('#sig');await until(P,()=>/pas le SIGNATURE/.test(document.querySelector('#ms').textContent),null,{timeout:20000});T("outil : refuse la liste d'une autre application",got.length===0);
 await ctx.close();D=B;
}else console.log('SKIP outil privé HTML introuvable (KVES_OUTIL) : 14 contrôles ignorés ; la signature de test est faite avec Node');
// --- 3. l'application
const keyApp=hasTool?null:K1;if(!hasTool)D=A;
const setup=async P=>{await P.goto(P.__u+'index.html');await P.fill('#pw',PW);await P.fill('#pw2',PW);await P.click('#go');await P.waitForSelector('#rk');await P.check('#ok');await P.click('#next');await P.waitForSelector('nav')};
const errs=[];
{const srv=await serve(D);const P=await(await b.newContext({viewport:{width:390,height:844}})).newPage();P.__u=srv.url;P.on('pageerror',e=>errs.push(e.message));await setup(P);
 await P.evaluate(()=>nav('more','sgn'));await until(P,()=>/Signature valide/.test(document.querySelector('#sgs')?.textContent||''),null,{timeout:15000}).catch(()=>{});
 T('app signée : « Signature valide »',/Signature valide/.test(await P.textContent('#sgs')));
 {const d=await P.evaluate(()=>[...document.querySelectorAll('#sgl .row')].map(r=>r.textContent));console.log('  fichiers vérifiés :',d.length,d.filter(x=>x.includes('✗')));T('tous les fichiers cochés ✓',d.length>=24&&d.every(x=>x.endsWith('✓')))}
 const fpTxt=await P.textContent('#sgf');T("l'empreinte affichée dans l'appli est celle de la clé publique en ligne",fpTxt.includes(C.fingerprint(Buffer.from(rd(D,'kves-automanag-cle-publique.txt'),'base64url'))));
 await P.evaluate(()=>nav('home'));await P.waitForTimeout(300);T("pas d'alerte sur l'accueil",!(await P.textContent('#m')).includes('Contrôle de signature'));
 const man2=rd(D,'SIGNATURE-KVES.txt'),ver=man2.match(/version: (.*)/)[1],pubTxt=rd(D,'kves-automanag-cle-publique.txt'),sigTxt=rd(D,'SIGNATURE-KVES.sig');
 const KO=newKey();const sigOther=crypto.sign(null,Buffer.from(man2),KO.priv).toString('base64url');
 const r=await P.evaluate(async([ver,other])=>{const man=await(await fetch('SIGNATURE-KVES.txt')).text();const files=['SIGNATURE-KVES.txt','SIGNATURE-KVES.sig','kves-automanag-cle-publique.txt',...man.split('\n').filter(l=>/^[0-9a-f]{64}  /.test(l)).map(l=>l.slice(66))];
  const mk=async(name,alter)=>{await caches.delete(name);const c=await caches.open(name);for(const f of files){let b=await(await fetch(f,{cache:'no-store'})).arrayBuffer();if(alter&&f===alter)b=new TextEncoder().encode('// altéré\n'+new TextDecoder().decode(b)).buffer;await c.put('./'+f,new Response(b))}return c};
  const out={};
  await mk('amk-test-ok');out.good=await updVerify(ver,'amk-test-ok');
  await mk('amk-test-bad','app-vues.js');out.bad=await updVerify(ver,'amk-test-bad');out.gone=!(await caches.has('amk-test-bad'));
  await mk('amk-test-ver');out.wrongV=await updVerify('9.9.9','amk-test-ver');
  {const c=await mk('amk-test-sig');await c.put('./SIGNATURE-KVES.txt',new Response(man.replace(/version: .*/,'version: 7.7.7')));out.forged=await updVerify(ver,'amk-test-sig')}
  {const c=await mk('amk-test-key');await c.put('./kves-automanag-cle-publique.txt',new Response(other.pub));await c.put('./SIGNATURE-KVES.sig',new Response(other.sig));out.otherKey=await updVerify(ver,'amk-test-key')}
  {const c=await mk('amk-test-nokey');await c.delete('./kves-automanag-cle-publique.txt');out.noKey=await updVerify(ver,'amk-test-nokey')}
  // navigateur trop ancien pour Ed25519 : vérification impossible, mais on ne bloque pas
  const o=crypto.subtle.importKey.bind(crypto.subtle);crypto.subtle.importKey=(f,k,a,...x)=>a&&a.name==='Ed25519'?Promise.reject(new Error('non supporté')):o(f,k,a,...x);
  try{out.oldState=(await sigCheck(sigLocal)).state;await mk('amk-test-old','app-vues.js');out.oldUpd=await updVerify(ver,'amk-test-old')}finally{crypto.subtle.importKey=o}
  for(const n of ['amk-test-ok','amk-test-ver','amk-test-sig','amk-test-key','amk-test-nokey','amk-test-old'])await caches.delete(n);return out},[ver,{pub:Buffer.from(KO.raw).toString('base64url'),sig:sigOther}]);
 T('mise à jour correctement signée : acceptée',r.good===true);T('mise à jour avec un fichier altéré : refusée et supprimée',r.bad===false&&r.gone===true);
 T('mise à jour au mauvais numéro de version : refusée',r.wrongV===false);T('liste falsifiée : refusée',r.forged===false);
 T('mise à jour signée par une AUTRE clé (clé publique remplacée) : refusée',r.otherKey===false);T('mise à jour sans clé publique : refusée',r.noKey===false);
 T('navigateur trop ancien : « vérification impossible » et mise à jour non bloquée',r.oldState==='unsupported'&&r.oldUpd===true);
 // message d'écran pour un navigateur trop ancien
 await P.evaluate(()=>{const o=crypto.subtle.importKey.bind(crypto.subtle);window.__o=o;crypto.subtle.importKey=(f,k,a,...x)=>a&&a.name==='Ed25519'?Promise.reject(new Error('x')):o(f,k,a,...x);nav('more','sgn')});await until(P,()=>/trop ancien/.test(document.querySelector('#sgs')?.textContent||''),null,{timeout:15000}).catch(()=>{});
 T('écran Vérifier l\'application : message « trop ancien » (pas d\'alarme rouge)',/trop ancien/.test(await P.textContent('#sgs'))&&/warn/.test(await P.getAttribute('#sgs','class')));
 srv.close()}
{const X=copy();fs.cpSync(D,X,{recursive:true,filter:s=>!/tests/.test(s)});fs.appendFileSync(path.join(X,'app-vues.js'),'\n// modifié après signature\n');const srv=await serve(X);const P=await(await b.newContext({viewport:{width:390,height:844}})).newPage();P.__u=srv.url;P.on('pageerror',e=>errs.push(e.message));await setup(P);
 await P.waitForTimeout(1500);await P.evaluate(()=>nav('home'));await P.waitForTimeout(400);T("fichier modifié : alerte sur l'accueil",(await P.textContent('#m')).includes('Contrôle de signature'));
 await P.evaluate(()=>nav('more','sgn'));await until(P,()=>/ne correspondent pas/.test(document.querySelector('#sgs')?.textContent||''),null,{timeout:15000}).catch(()=>{});
 T('fichier modifié : détecté et nommé (✗ app-vues.js)',await P.evaluate(()=>[...document.querySelectorAll('#sgl .row')].some(r=>r.textContent.includes('app-vues.js')&&r.textContent.includes('✗'))&&/1 fichier/.test(document.querySelector('#sgs').textContent)));
 T('verifier.js détecte aussi la modification',node(X,'verifier.js').code!==0);srv.close()}
{const X=copy();signNode(X,newKey());fs.writeFileSync(path.join(X,'kves-automanag-cle-publique.txt'),rd(D,'kves-automanag-cle-publique.txt'));const srv=await serve(X);const P=await(await b.newContext({viewport:{width:390,height:844}})).newPage();P.__u=srv.url;P.on('pageerror',e=>errs.push(e.message));await setup(P);
 await P.waitForTimeout(1500);await P.evaluate(()=>nav('more','sgn'));await until(P,()=>/INVALIDE/.test(document.querySelector('#sgs')?.textContent||''),null,{timeout:15000}).catch(()=>{});
 T('signature faite par une autre clé : « Signature INVALIDE »',/INVALIDE/.test(await P.textContent('#sgs')));srv.close()}
{const X=copy();const srv=await serve(X);const P=await(await b.newContext({viewport:{width:390,height:844}})).newPage();P.__u=srv.url;P.on('pageerror',e=>errs.push(e.message));await setup(P);
 await P.evaluate(()=>nav('more','sgn'));await until(P,()=>/non configurée/.test(document.querySelector('#sgs')?.textContent||''),null,{timeout:10000}).catch(()=>{});
 T('sans clé (A-GENERER) : « Signature non configurée », aucune alerte',/non configurée/.test(await P.textContent('#sgs')));
 T('sans clé : les mises à jour restent possibles',await P.evaluate(()=>updVerify('9.9.9','amk-x')));srv.close()}
T('aucune erreur JS',errs.length===0);if(errs.length)console.log(errs);
console.log(ok+' OK, '+ko+' échecs');await b.close();process.exit(ko?1:0)})();
