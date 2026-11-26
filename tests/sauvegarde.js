// Tests V1.6.0 : sauvegarde vérifiable. Lancés par run.js
const {chromium}=require('playwright');const fs=require('fs');const os=require('os');const path=require('path');const BASE=process.env.BASE_LOCAL;let ok=0,ko=0;const T=(n,c)=>{console.log(c?'OK  ':'FAIL',n);c?ok++:ko++};
const PW='Phrase-test-2026!';
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:390,height:844},timezoneId:'Africa/Casablanca'});const P=await ctx.newPage();const errs=[];P.on('pageerror',e=>errs.push(e.message));
await P.goto(BASE+'index.html');await P.fill('#pw',PW);await P.fill('#pw2',PW);await P.click('#go');await P.waitForSelector('#rk');const RK=(await P.textContent('#rk')).trim();await P.check('#ok');await P.click('#next');await P.waitForSelector('nav');
await P.evaluate(async()=>{db.clients.push({id:'c1',nom:'A',cree:nowIso()},{id:'c2',nom:'B',cree:nowIso()});await persist();nav('more','sav')});
await P.waitForSelector('#ex');await P.click('#ex');await P.waitForFunction(()=>document.querySelector('#outta').value.length>50);
const bk=await P.inputValue('#outta');const fname=await P.getAttribute('#dla','download');
T('nom de fichier clair AutoManagKVES_date_heure.kves',/^AutoManagKVES_\d{4}-\d{2}-\d{2}_\d{2}h\d{2}\.kves$/.test(fname));
T('rappel de tester la sauvegarde affiché',(await P.textContent('#out')).includes('Vérifier une sauvegarde'));
T('la sauvegarde est chiffrée (aucun nom de client en clair)',!bk.includes('"nom"')&&bk.includes('"data"'));
const f=path.join(os.tmpdir(),'t-bk.kves');fs.writeFileSync(f,bk);
// vérification : mauvais mot de passe puis bon
await P.setInputFiles('#vfile',f);await P.fill('#vpw','mauvais mot de passe');await P.click('#vgo');await P.waitForSelector('#verr:not([hidden])');T('mauvais mot de passe refusé',(await P.textContent('#verr')).includes('Impossible'));
await P.fill('#vpw',PW);await P.click('#vgo');await P.waitForSelector('#vres .note.ok');const txt=await P.textContent('#vres');T('bon mot de passe : contenu affiché (2 clients)',/Clients\s*2/.test(txt));
await P.fill('#vpw',RK);await P.click('#vgo');await P.waitForSelector('#vres .note.ok');T('la clé de récupération ouvre aussi la sauvegarde',true);
await P.setInputFiles('#vfile',{name:'x.kves',mimeType:'text/plain',buffer:Buffer.from('pas une sauvegarde')});await P.click('#vgo');await P.waitForSelector('#verr:not([hidden])');T('fichier invalide refusé',(await P.textContent('#verr')).length>0);
T('la vérification ne modifie rien',await P.evaluate(()=>db.clients.length===2));
// restauration : avertissement si plus ancienne
await P.evaluate(async()=>{db.clients.push({id:'c3',nom:'C',cree:nowIso()});await new Promise(r=>setTimeout(r,20));await persist();nav('more','sav')});await P.waitForSelector('#imp');
await P.fill('#imptxt',bk);await P.click('#imp');await P.waitForSelector('#imppw');await P.waitForTimeout(300);
T('restauration sans mot de passe refusée',(await P.textContent('#err')).includes('mot de passe'));
await P.fill('#imppw',PW);await P.click('#imp');await P.waitForSelector('#cf:not([hidden])');
const cf=await P.textContent('#cf');T('aperçu avant restauration',/Clients\s*2/.test(cf));T('avertissement : sauvegarde plus ancienne',cf.includes('plus ancienne'));
await P.click('#impok');await P.waitForSelector('#upw');await P.fill('#upw',PW);await P.click('#ugo');await P.waitForSelector('nav');
T('restauration effective (2 clients)',await P.evaluate(()=>db.clients.length===2));
T('aucune erreur JS',errs.length===0);
console.log(ok+' OK, '+ko+' échecs');await b.close();process.exit(ko?1:0)})();
