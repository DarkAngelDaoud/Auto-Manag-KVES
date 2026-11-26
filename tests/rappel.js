// Tests V1.5.4 : rappel de sauvegarde renforcé. Lancés par run.js
const {chromium}=require('playwright');const BASE=process.env.BASE_LOCAL;let ok=0,ko=0;const T=(n,c)=>{console.log(c?'OK  ':'FAIL',n);c?ok++:ko++};
const PW='Phrase-test-2026!';
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:390,height:844},timezoneId:'Africa/Casablanca'});const P=await ctx.newPage();const errs=[];P.on('pageerror',e=>errs.push(e.message));
await P.goto(BASE+'index.html');await P.fill('#pw',PW);await P.fill('#pw2',PW);await P.click('#go');await P.waitForSelector('#rk');await P.check('#ok');await P.click('#next');await P.waitForSelector('nav');
const setAge=async(days,withBackup)=>{await P.evaluate(async([d,w])=>{const iso=new Date(Date.now()-d*864e5).toISOString();if(w){db.lastBackup=iso}else{db.lastBackup=null;db.journal=[{d:iso,e:'x'}]}await persist();nav('home')},[days,withBackup])};
const note=()=>P.evaluate(()=>{const n=document.querySelector('#m .note.warn,#m .note.bad');return n?{cls:n.className,txt:n.textContent,btn:!!document.querySelector('#bkgo')}:null});
await setAge(1,true);T('1 jour : pas de rappel',(await note())===null);
await setAge(3,true);let n=await note();T('3 jours : rappel orange',n&&n.cls.includes('warn')&&n.txt.includes('3 jours'));
await setAge(7,true);n=await note();T('7 jours : rappel rouge',n&&n.cls.includes('bad')&&n.txt.includes('7 jours'));
T('bouton « Sauvegarder maintenant » présent',n&&n.btn);
await P.click('#bkgo');await P.waitForSelector('#ex');T('le bouton mène à l\'écran Sauvegarde',true);
await setAge(5,false);n=await note();T('jamais sauvegardé : message dédié depuis le début d\'utilisation',n&&n.cls.includes('warn')&&n.txt.includes('5 jours'));
// écran de connexion
await P.evaluate(()=>lock());await P.waitForSelector('#upw');T('rappel visible sur l\'écran de connexion',(await P.textContent('body')).includes('5 jours'));
// après une sauvegarde, le rappel disparaît
await P.fill('#upw',PW);await P.click('#ugo');await P.waitForSelector('nav');
await P.evaluate(async()=>{db.lastBackup=nowIso();await persist();nav('home')});T('après sauvegarde : plus de rappel',(await note())===null);
await P.evaluate(()=>lock());await P.waitForSelector('#upw');T('connexion : plus de rappel',!(await P.textContent('body')).includes('jours sans')&&!(await P.textContent('body')).includes('Dernière sauvegarde'));
T('aucune erreur JS',errs.length===0);
console.log(ok+' OK, '+ko+' échecs');await b.close();process.exit(ko?1:0)})();
