// Tests V1.4.1 : mot de passe renforcé (12 caractères, indicateur, mots de passe existants valables). Lancés par run.js
const {chromium}=require('playwright');const BASE=process.env.BASE_LOCAL;let ok=0,ko=0;const T=(n,c)=>{console.log(c?'OK  ':'FAIL',n);c?ok++:ko++};
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:390,height:844},serviceWorkers:'block'});const p=await ctx.newPage();
const errs=[];p.on('pageerror',e=>errs.push(e.message));
await p.goto(BASE+'index.html');await p.waitForSelector('#pw');
await p.fill('#pw','court1234');await p.fill('#pw2','court1234');await p.click('#go');T('9 caractères refusés à la création',(await p.textContent('#err')).includes('12 caractères'));
await p.fill('#pw','aaaaaaaaaaaaaa');await p.fill('#pw2','aaaaaaaaaaaaaa');await p.click('#go');T('mot de passe répétitif refusé',(await p.textContent('#err')).includes('trop simple'));
await p.fill('#pw','azerty123456');T('indicateur : faible pour azerty123456',await p.evaluate(()=>document.querySelector('.pwm').dataset.l)!=='good');
await p.fill('#pw','Ma phrase secrète 2026!');T('indicateur : fort pour une phrase',await p.evaluate(()=>document.querySelector('.pwm').dataset.l)==='good');
await p.fill('#pw2','Ma phrase secrète 2026!');await p.click('#go');await p.waitForSelector('#rk');await p.check('#ok');await p.click('#next');await p.waitForSelector('nav');
// changement : refus du faible, acceptation du fort, reconnexion
await p.click('nav [data-tab=more]');await p.click('[data-s=sec]');await p.fill('#o','Ma phrase secrète 2026!');await p.fill('#n','court1234');await p.fill('#n2','court1234');await p.click('#cp');
T('changement : 9 caractères refusés',(await p.textContent('#err')).includes('12 caractères'));
await p.fill('#n','Nouvelle phrase 2027 ok');await p.fill('#n2','Nouvelle phrase 2027 ok');await p.click('#cp');await p.waitForSelector('#okm:not([hidden])');T('changement accepté avec un mot de passe fort',true);
await p.click('#hl').catch(()=>p.evaluate(()=>lock()));await p.waitForSelector('#upw');await p.fill('#upw','Nouvelle phrase 2027 ok');await p.click('#ugo');await p.waitForSelector('nav');T('reconnexion avec le nouveau mot de passe',true);
// mot de passe existant de 8 caractères : reste valable
const c2=await b.newContext({serviceWorkers:'block'});const q=await c2.newPage();await q.goto(BASE+'index.html');await q.waitForSelector('#pw');
await q.evaluate(async()=>{await setup('ancien88x');lock()});await q.waitForSelector('#upw');await q.fill('#upw','ancien88x');await q.click('#ugo');await q.waitForSelector('nav');T('ancien mot de passe de 9 caractères toujours valable',true);
T('aucune erreur JS',errs.length===0);if(errs.length)console.log(errs);
console.log(ok+' OK, '+ko+' échecs');await b.close();process.exit(ko?1:0)})();
