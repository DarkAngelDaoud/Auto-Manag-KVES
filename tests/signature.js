// Tests V2.0.0 : signature cryptographique (outils, vérification dans l'appli, refus de mise à jour)
const {chromium}=require('playwright');const fs=require('fs'),os=require('os'),path=require('path'),http=require('http'),cp=require('child_process');
const SRC=path.resolve(__dirname,'..');let ok=0,ko=0;const T=(n,c)=>{console.log(c?'OK  ':'FAIL',n);c?ok++:ko++};const PW='Phrase-test-2026!';
const copy=()=>{const d=fs.mkdtempSync(path.join(os.tmpdir(),'kves-sig-'));fs.cpSync(SRC,d,{recursive:true,filter:s=>!/[\\/](tests|node_modules|\.git)([\\/]|$)/.test(s.slice(SRC.length))});return d};
const node=(d,args,env)=>{try{const o=cp.execFileSync('node',[path.join(d,'outils',args[0]),...args.slice(1)],{cwd:d,env:{...process.env,...env},stdio:['ignore','pipe','pipe']});return{code:0,out:String(o)}}catch(e){return{code:e.status,out:String(e.stdout)+String(e.stderr)}}};
const MIME={'.js':'text/javascript','.html':'text/html','.css':'text/css','.png':'image/png','.json':'application/json','.webmanifest':'application/manifest+json','.txt':'text/plain'};
const serve=d=>new Promise(r=>{const s=http.createServer((q,res)=>{let p=decodeURIComponent(q.url.split('?')[0]);if(p.endsWith('/'))p+='index.html';const f=path.join(d,p);if(!f.startsWith(d)||!fs.existsSync(f)||fs.statSync(f).isDirectory()){res.writeHead(404);return res.end()}res.writeHead(200,{'content-type':MIME[path.extname(f)]||'application/octet-stream'});res.end(fs.readFileSync(f))});s.listen(0,()=>r({url:'http://localhost:'+s.address().port+'/',close:()=>s.close()}))});
(async()=>{
// --- outils
const A=copy(),keyDir=fs.mkdtempSync(path.join(os.tmpdir(),'kves-key-'));
T('clé privée refusée dans le dépôt',node(A,['generer-cles.js',path.join(A,'cle')]).code!==0&&!fs.existsSync(path.join(A,'cle')));
const g=node(A,['generer-cles.js',keyDir]);T('génération des clés (clé privée hors dépôt, empreinte affichée)',g.code===0&&fs.existsSync(path.join(keyDir,'kves-cle-privee.pem'))&&/Empreinte/.test(g.out)&&!fs.readFileSync(path.join(A,'cle-publique.js'),'utf8').includes('PRIVATE')&&!/"d":/.test(fs.readFileSync(path.join(A,'cle-publique.js'),'utf8')));
T('pas de remplacement accidentel de la clé privée',node(A,['generer-cles.js',keyDir]).code!==0);
T('vérification : échoue tant que non signé',node(A,['verifier.js']).code!==0);
const s=node(A,['signer.js',keyDir]);T('signature des fichiers',s.code===0&&fs.existsSync(path.join(A,'SIGNATURE-KVES.sig')));
T('vérification en ligne de commande : valide',node(A,['verifier.js']).code===0);
const man=fs.readFileSync(path.join(A,'SIGNATURE-KVES.txt'),'utf8');const sw=fs.readFileSync(path.join(A,'sw.js'),'utf8');
T('chaque fichier signé est dans le cache hors ligne (sw.js)',man.split('\n').filter(l=>/^[0-9a-f]{64}  /.test(l)).map(l=>l.slice(66)).every(f=>sw.includes("'./"+f+"'")));
T('index.html charge la clé publique et la vérification',/cle-publique\.js[\s\S]*signature\.js[\s\S]*app-noyau\.js/.test(fs.readFileSync(path.join(A,'index.html'),'utf8')));
const O=fs.mkdtempSync(path.join(os.tmpdir(),'kves-key2-'));const B=copy();node(B,['generer-cles.js',O]);const bad=node(A,['signer.js',O]);
T("mauvaise clé privée : refusée, rien n'est écrit",bad.code!==0&&node(A,['verifier.js']).code===0);
// --- application : signée valide / modifiée / non signée
const b=await chromium.launch();
const setup=async P=>{await P.goto(P.__u+'index.html');await P.fill('#pw',PW);await P.fill('#pw2',PW);await P.click('#go');await P.waitForSelector('#rk');await P.check('#ok');await P.click('#next');await P.waitForSelector('nav')};
const errs=[];
{const srv=await serve(A);const P=await(await b.newContext({viewport:{width:390,height:844}})).newPage();P.__u=srv.url;P.on('pageerror',e=>errs.push(e.message));await setup(P);
 await P.evaluate(()=>nav('more','sgn'));await P.waitForFunction(()=>/Signature valide/.test(document.querySelector('#sgs')?.textContent||''),null,{timeout:15000}).catch(()=>{});
 const t1=await P.textContent('#sgs');T('app signée : « Signature valide »',/Signature valide/.test(t1));
 {const d=await P.evaluate(()=>[...document.querySelectorAll('#sgl .row')].map(r=>r.textContent));console.log('  fichiers vérifiés :',d.length,d.filter(x=>x.includes('✗')));T('tous les fichiers cochés ✓',d.length>=25&&d.every(x=>x.endsWith('✓')))}
 T("l'empreinte de la clé est affichée",/Empreinte de la clé : [0-9a-f]{4} /.test(await P.textContent('#sgf')));
 T("pas d'alerte sur l'accueil",(await (async()=>{await P.evaluate(()=>nav('home'));await P.waitForTimeout(300);return P.textContent('#m')})()).includes('Contrôle de signature')===false);
 // refus de mise à jour
 const r=await P.evaluate(async()=>{const man=await(await fetch('SIGNATURE-KVES.txt')).text();const files=['SIGNATURE-KVES.txt','SIGNATURE-KVES.sig',...man.split('\n').filter(l=>/^[0-9a-f]{64}  /.test(l)).map(l=>l.slice(66))];const v=man.match(/version: (.*)/)[1];
  const mk=async(name,alter)=>{await caches.delete(name);const c=await caches.open(name);for(const f of files){let b=await(await fetch(f,{cache:'no-store'})).arrayBuffer();if(alter&&f===alter)b=new TextEncoder().encode('// altéré\n'+new TextDecoder().decode(b)).buffer;await c.put('./'+f,new Response(b))}};
  await mk('amk-test-ok');const good=await updVerify(v,'amk-test-ok');
  await mk('amk-test-bad','app-vues.js');const bad=await updVerify(v,'amk-test-bad');const gone=!(await caches.has('amk-test-bad'));
  await mk('amk-test-ver');const wrongV=await updVerify('9.9.9','amk-test-ver');
  await mk('amk-test-sig');const c=await caches.open('amk-test-sig');await c.put('./SIGNATURE-KVES.txt',new Response(man.replace(/version: .*/,'version: 7.7.7')));const forged=await updVerify(v,'amk-test-sig');
  await caches.delete('amk-test-ok');return{good,bad,gone,wrongV,forged}});
 T('mise à jour correctement signée : acceptée',r.good===true);T('mise à jour avec un fichier altéré : refusée et supprimée',r.bad===false&&r.gone===true);
 T("mise à jour au mauvais numéro de version : refusée",r.wrongV===false);T('manifeste falsifié : refusé',r.forged===false);
 srv.close()}
{const C=copy();fs.cpSync(A,C,{recursive:true,filter:s=>!/tests/.test(s)});fs.appendFileSync(path.join(C,'app-vues.js'),'\n// modifié après signature\n');const srv=await serve(C);const P=await(await b.newContext({viewport:{width:390,height:844}})).newPage();P.__u=srv.url;P.on('pageerror',e=>errs.push(e.message));await setup(P);
 await P.waitForTimeout(1500);await P.evaluate(()=>nav('home'));await P.waitForTimeout(400);T("fichier modifié : alerte sur l'accueil",(await P.textContent('#m')).includes('Contrôle de signature'));
 await P.evaluate(()=>nav('more','sgn'));await P.waitForFunction(()=>/ne correspondent pas/.test(document.querySelector('#sgs')?.textContent||''),null,{timeout:15000}).catch(()=>{});
 T('fichier modifié : détecté et nommé (✗ app-vues.js)',await P.evaluate(()=>[...document.querySelectorAll('#sgl .row')].some(r=>r.textContent.includes('app-vues.js')&&r.textContent.includes('✗'))&&/1 fichier/.test(document.querySelector('#sgs').textContent)));
 T('verifier.js détecte aussi la modification',node(C,['verifier.js']).code!==0);srv.close()}
{const D=copy();const srv=await serve(D);const P=await(await b.newContext({viewport:{width:390,height:844}})).newPage();P.__u=srv.url;P.on('pageerror',e=>errs.push(e.message));await setup(P);
 await P.evaluate(()=>nav('more','sgn'));await P.waitForFunction(()=>/non configurée/.test(document.querySelector('#sgs')?.textContent||''),null,{timeout:10000}).catch(()=>{});
 T('sans clé : « Signature non configurée », aucune alerte',/non configurée/.test(await P.textContent('#sgs')));
 T('sans clé : les mises à jour restent possibles',await P.evaluate(()=>updVerify('9.9.9','amk-x')));
 T('verifier.js ignore proprement',node(D,['verifier.js']).code===0);srv.close()}
T('aucune erreur JS',errs.length===0);if(errs.length)console.log(errs);
console.log(ok+' OK, '+ko+' échecs');await b.close();process.exit(ko?1:0)})();
