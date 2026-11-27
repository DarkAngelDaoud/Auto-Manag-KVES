// Tests V1.7.5 : simulateur impôt + droit complémentaire
const {chromium}=require('playwright');const BASE=process.env.BASE_LOCAL;let ok=0,ko=0;const T=(n,c)=>{console.log(c?'OK  ':'FAIL',n);c?ok++:ko++};
(async()=>{const b=await chromium.launch();const P=await (await b.newContext({viewport:{width:390,height:844}})).newPage();const errs=[];P.on('pageerror',e=>errs.push(e.message));
await P.goto(BASE+'index.html');await P.fill('#pw','Phrase-test-2026!');await P.fill('#pw2','Phrase-test-2026!');await P.click('#go');await P.waitForSelector('#rk');await P.check('#ok');await P.click('#next');await P.waitForSelector('nav');
const r=await P.evaluate(()=>({d:[dcOf(100),dcOf(499),dcOf(500),dcOf(1000),dcOf(1001),dcOf(2500),dcOf(2501),dcOf(5000),dcOf(10000),dcOf(10001),dcOf(25000),dcOf(25001),dcOf(50000),dcOf(50001)],c:simCalc(10000,'services'),m:simMin(8000,'services'),mc:simMin(8000,'commerce'),k:simCalc(simMin(8000,'services'),'services').net,s:simSteps('services').length,f:simSteps('services')[1].from}));
T('grille : toutes les tranches du CGI',JSON.stringify(r.d)===JSON.stringify([300,300,390,390,570,570,720,720,1050,1500,1500,2250,2250,3600]));
T('10 000 DH services : impôt 100, droit 300, total 400, net 9 600',r.c.imp===100&&r.c.dc===300&&r.c.tot===400&&r.c.net===9600);
T('prix minimum : le net voulu est atteint',r.k>=8000&&r.m>=8000&&r.m<9000);T('prix minimum commerce plus bas que services',r.mc<=r.m);
T('8 lignes de comparaison, 2e tranche à partir de 12 500 DH (services)',r.s===8&&r.f===12500);
await P.evaluate(()=>nav('more','sim'));await P.waitForSelector('#sca');
T('bandeau estimation affiché',(await P.textContent('#m')).includes('Estimation'));
await P.fill('#sca','10000');T('saisie : total 400 DH',(await P.textContent('#so')).replace(/\s| | /g,'').includes('400DH'));
await P.fill('#sn','8000');T('prix minimum affiché',(await P.textContent('#sp')).includes('au minimum'));
await P.selectOption('#sc','commerce');await P.fill('#sca','10000');T('commerce : impôt 50, droit 300',(await P.textContent('#so')).replace(/\s| | /g,'').includes('350DH')||(await P.textContent('#so')).includes('50'));
await P.fill('#sca','abc');T('saisie invalide : message, pas de plantage',(await P.textContent('#so')).includes('Saisis'));
T('rien enregistré',await P.evaluate(()=>db.encaissements.length===0));T('aucune erreur JS',errs.length===0);if(errs.length)console.log(errs);
console.log(ok+' OK, '+ko+' échecs');await b.close();process.exit(ko?1:0)})();
