// Tests V1.8.1 : délai après échecs, anti-cadre, rappel iPhone
const {chromium}=require('playwright');const BASE=process.env.BASE_LOCAL;let ok=0,ko=0;const T=(n,c)=>{console.log(c?'OK  ':'FAIL',n);c?ok++:ko++};const PW='Phrase-test-2026!';const until=require('./attendre.js');
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:390,height:844}});const P=await ctx.newPage();const errs=[];P.on('pageerror',e=>errs.push(e.message));
await P.goto(BASE+'index.html');await P.fill('#pw',PW);await P.fill('#pw2',PW);await P.click('#go');await P.waitForSelector('#rk');await P.check('#ok');await P.click('#next');await P.waitForSelector('nav');
await P.reload();await P.waitForSelector('#upw');
for(let i=0;i<5;i++){await P.fill('#upw','mauvais-mot-de-passe-'+i);await P.click('#ugo');await until(P,()=>!document.querySelector('#ugo')||!document.querySelector('#ugo').disabled);await P.waitForTimeout(150)}
T('5 échecs enregistrés',await P.evaluate(()=>JSON.parse(localStorage.getItem('amk.fail')).n===5));
T('délai posé après 5 échecs',await P.evaluate(()=>failWait()>0&&failWait()<=30));
await P.fill('#upw',PW);await P.click('#ugo');await P.waitForTimeout(600);
T('le bon mot de passe est refusé pendant le délai',(await P.textContent('body')).includes('Trop d\'essais'));
T('toujours verrouillé',await P.evaluate(()=>!db));
await P.evaluate(()=>{const o=JSON.parse(localStorage.getItem('amk.fail'));o.u=Date.now()-1;localStorage.setItem('amk.fail',JSON.stringify(o))});
await P.fill('#upw',PW);await P.click('#ugo');await P.waitForSelector('nav',{timeout:20000});
T('après le délai, le bon mot de passe ouvre le coffre',await P.evaluate(()=>!!db));T('compteur remis à zéro',await P.evaluate(()=>localStorage.getItem('amk.fail')===null));
T('délai croissant (6e échec > 5e)',await P.evaluate(()=>{localStorage.removeItem('amk.fail');for(let i=0;i<5;i++)failAdd();const a=failWait();failAdd();return failWait()>a}));
await P.evaluate(()=>localStorage.removeItem('amk.fail'));
// anti-cadre
const F=await (await b.newContext()).newPage();await F.route('**/cadre-test.html',r=>r.fulfill({contentType:'text/html',body:'<iframe src="'+BASE+'index.html"></iframe>'}));
await F.goto(BASE+'cadre-test.html');await F.waitForTimeout(1500);
T("l'appli sort d'un cadre",F.url().includes('index.html')&&F.frames().length===1);
// iPhone non installé
const C2=await b.newContext({viewport:{width:390,height:844},userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'});
const I=await C2.newPage();await I.goto(BASE+'index.html');await I.fill('#pw',PW);await I.fill('#pw2',PW);await I.click('#go');await I.waitForSelector('#rk');await I.check('#ok');await I.click('#next');await I.waitForSelector('nav');await I.waitForTimeout(300);
T("rappel d'installation sur iPhone",(await I.textContent('#m')).includes('écran d\'accueil'));
T("pas de rappel sur ordinateur",!(await P.textContent('#m')).includes('Safari peut effacer'));
T('aucune erreur JS',errs.length===0);if(errs.length)console.log(errs);
console.log(ok+' OK, '+ko+' échecs');await b.close();process.exit(ko?1:0)})();
