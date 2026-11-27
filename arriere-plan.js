// Tests V1.5.3 : verrouillage en arrière-plan. Lancés par run.js
const {chromium}=require('playwright');const BASE=process.env.BASE_LOCAL;let ok=0,ko=0;const T=(n,c)=>{console.log(c?'OK  ':'FAIL',n);c?ok++:ko++};
const PW='Phrase-test-2026!';
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:390,height:844},timezoneId:'Africa/Casablanca'});const P=await ctx.newPage();const errs=[];P.on('pageerror',e=>errs.push(e.message));
await P.goto(BASE+'index.html');await P.fill('#pw',PW);await P.fill('#pw2',PW);await P.click('#go');await P.waitForSelector('#rk');await P.check('#ok');await P.click('#next');await P.waitForSelector('nav');
// simule la mise en arrière-plan : document.hidden + événement
const bg=(hide,ageMs)=>P.evaluate(([h,a])=>{if(h){window.__hid=true;Object.defineProperty(document,'hidden',{configurable:true,get:()=>true})}else{Object.defineProperty(document,'hidden',{configurable:true,get:()=>false});if(a)hideAt=Date.now()-a}document.dispatchEvent(new Event('visibilitychange'))},[hide,ageMs]);
const locked=()=>P.evaluate(()=>db===null);
const unlockUi=async()=>{await P.waitForSelector('#upw');await P.fill('#upw',PW);await P.click('#ugo');await P.waitForSelector('nav')};
T('réglage par défaut : 1 minute',await P.evaluate(()=>lockBg()===60000));
await bg(true);await bg(false,5000);T('retour après 5 s : reste déverrouillé',!(await locked()));
await bg(true);await bg(false,61000);T('retour après 61 s : verrouillé',await locked());
await unlockUi();
// réglage immédiat via l'interface
await P.evaluate(()=>nav('more','sec'));await P.waitForSelector('#lbg');await P.selectOption('#lbg','0');
T('réglage enregistré',await P.evaluate(()=>localStorage.getItem('amk.lockbg')==='0'&&lockBg()===0));
await bg(true);T('immédiat : verrouillé dès l\'arrière-plan',await locked());await bg(false);await unlockUi();
// maintien pendant l'impression / export
await P.evaluate(()=>holdLock());await bg(true);T('pendant un export : pas de verrouillage immédiat',!(await locked()));
await bg(false,10000);T('retour rapide après export : reste déverrouillé',!(await locked()));
await P.evaluate(()=>holdLock());await bg(true);await bg(false,301000);T('même avec maintien : verrouillé après 5 min',await locked());await unlockUi();
// 5 minutes
await P.evaluate(()=>{localStorage.setItem('amk.lockbg','300000')});
await bg(true);await bg(false,120000);T('5 min : retour après 2 min, déverrouillé',!(await locked()));
await bg(true);await bg(false,301000);T('5 min : retour après 5 min, verrouillé',await locked());
T('aucune erreur JS',errs.length===0);
console.log(ok+' OK, '+ko+' échecs');await b.close();process.exit(ko?1:0)})();
