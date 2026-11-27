// Tests V1.5.2 : réinitialiser tout. Lancés par run.js
const {chromium}=require('playwright');const BASE=process.env.BASE_LOCAL;let ok=0,ko=0;const T=(n,c)=>{console.log(c?'OK  ':'FAIL',n);c?ok++:ko++};
const PW='Phrase-test-2026!';
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:390,height:844},timezoneId:'Africa/Casablanca'});const A=await ctx.newPage();const errs=[];A.on('pageerror',e=>errs.push(e.message));
const create=async p=>{await p.goto(BASE+'index.html');await p.waitForSelector('#pw');await p.fill('#pw',PW);await p.fill('#pw2',PW);await p.click('#go');await p.waitForSelector('#rk');await p.check('#ok');await p.click('#next');await p.waitForSelector('nav')};
await create(A);
await A.evaluate(async()=>{db.clients.push({id:'c1',nom:'Client à effacer',cree:nowIso()});await persist()});
// 1. depuis l'application déverrouillée
await A.evaluate(()=>nav('more','sec'));await A.waitForSelector('#rsm');await A.click('#rsm');await A.waitForSelector('#rsgo');
await A.fill('#rsw','pas bon');await A.click('#rsgo');T('mot de confirmation incorrect refusé',(await A.textContent('#err')).includes('incorrect'));
await A.fill('#rsw','effacer');await A.fill('#rspw','mauvais mot de passe 1');await A.click('#rsgo');await A.waitForTimeout(1500);
T('mauvais mot de passe refusé, rien effacé',await A.evaluate(async()=>!!(await kvGet('vault'))));
await A.fill('#rspw',PW);await A.click('#rsgo');await A.waitForSelector('#pw',{timeout:15000});
T('coffre et copie effacés',await A.evaluate(async()=>!(await kvGet('vault'))&&!(await kvGet('vault.bak'))));
T('retour à l\'écran de création',(await A.textContent('body')).length>0&&!!(await A.$('#pw2')));
// 2. refus d'écraser après effacement (autre fenêtre ouverte)
const B=await ctx.newPage();B.on('pageerror',e=>errs.push(e.message));await create(B);
await B.evaluate(async()=>{db.clients.push({id:'cB',nom:'Données B',cree:nowIso()});await persist()});
const C=await ctx.newPage();C.on('pageerror',e=>errs.push(e.message));await C.goto(BASE+'index.html');await C.waitForSelector('#upw');await C.fill('#upw',PW);await C.click('#ugo');await C.waitForSelector('nav');
await B.evaluate(async()=>{await wipeAll(true)});await B.waitForSelector('#pw2');
const r=await C.evaluate(async()=>{db.clients.push({id:'cC',nom:'Fantôme',cree:nowIso()});try{await persist();return'ecrit'}catch(e){return e.message}});
T('une fenêtre restée ouverte ne recrée pas un coffre effacé',r==='conflict');
T('le coffre reste vide',await B.evaluate(async()=>!(await kvGet('vault'))));
// 3. depuis l'écran de connexion
await create(B);await B.evaluate(()=>lock());await B.waitForSelector('#upw');
T('lien « Effacer et recommencer » visible par défaut',!!(await B.$('#wipe')));
await B.click('#wipe');await B.waitForSelector('#rsgo');T('sans mot de passe sur l\'écran de connexion',!(await B.$('#rspw')));
await B.fill('#rsw','EFFACER');await B.uncheck('#rsk');await B.click('#rsgo');await B.waitForSelector('#pw2',{timeout:15000});
T('effacement depuis l\'écran de connexion',await B.evaluate(async()=>!(await kvGet('vault'))));
// 4. masquer le lien
await create(B);await B.click('nav button[data-tab="more"]');await B.evaluate(()=>nav('more','sec'));await B.waitForSelector('#rsl');await B.uncheck('#rsl');
await B.evaluate(()=>lock());await B.waitForSelector('#upw');T('lien masqué après réglage',!(await B.$('#wipe')));
// 5. conserver thème et langue
await B.evaluate(()=>{localStorage.setItem('amk.lang','en')});await B.reload();await B.waitForSelector('#upw');
await B.evaluate(async()=>{await wipeAll(true)});await B.waitForSelector('#pw2');
T('langue conservée si demandé',await B.evaluate(()=>localStorage.getItem('amk.lang')==='en'));
await B.evaluate(async()=>{await wipeAll(false)});await B.waitForSelector('#pw2');
T('langue réinitialisée sinon',await B.evaluate(()=>localStorage.getItem('amk.lang')===null));
T('aucune erreur JS',errs.filter(e=>e!=='conflict').length===0);
console.log(ok+' OK, '+ko+' échecs');await b.close();process.exit(ko?1:0)})();
