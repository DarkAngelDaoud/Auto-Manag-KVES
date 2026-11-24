// Tests : encaissements, annulation avec trace, impôt par trimestre. Lancés par run.js
const {chromium}=require('playwright');const BASE=process.env.BASE_LOCAL;let ok=0,ko=0;const T=(n,c)=>{console.log(c?'OK  ':'FAIL',n);c?ok++:ko++};
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:390,height:844},serviceWorkers:'block'});const p=await ctx.newPage();
const errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('console',m=>{if(m.type()==='error')errs.push(m.text())});
await p.goto(BASE+'index.html');
await p.fill('#pw','motdepasse1');await p.fill('#pw2','motdepasse1');await p.click('#go');await p.waitForSelector('#rk');await p.check('#ok');await p.click('#next');await p.waitForSelector('nav');
const Y=new Date().getFullYear();
// calculs purs
const r=await p.evaluate(Y=>{const A='a1',C='c1';db.activites=[{id:A,nom:'Conseil',cat:'services'},{id:C,nom:'Vente',cat:'commerce'}];
 const L=[{montant:123457,activiteId:A,date:Y+'-02-10'},{montant:100001,activiteId:C,date:Y+'-02-11'}];const x=taxe(L);
 return{ci:x.imp.services,cc:x.imp.commerce,tot:x.total,q:[qOf(Y+'-03-31'),qOf(Y+'-04-01'),qOf(Y+'-12-31')],p:[parseCts('1500'),parseCts('1 500,50'),parseCts('12,345'),parseCts('0'),parseCts('-5'),parseCts('abc')]}},Y);
T('impôt services 1 % au centime (1234,57 → 12,35)',r.ci===1235);
T('impôt commerce 0,5 % au centime (1000,01 → 5,00)',r.cc===500);
T('total impôt',r.tot===1735);
T('trimestres (31/03→T1, 01/04→T2, 31/12→T4)',r.q.join()==='1,2,4');
T('saisie montant : 1500, 1 500,50 ok ; 3 décimales, 0, négatif, texte refusés',r.p.join()==='150000,150050,,,,');
// saisie par l'interface
await p.click('nav [data-tab=more]');await p.click('[data-s=enc]');await p.waitForSelector('#ea');
await p.evaluate(()=>{db.activites=[{id:'a1',nom:'Conseil',cat:'services'}];db.clients=[{id:'c1',nom:'Alpha',cree:nowIso()}]});
await p.click('#ea');await p.fill('#e_m','abc');await p.click('#sv');T('montant invalide refusé',await p.isVisible('#err'));
await p.fill('#e_m','10000');await p.click('#sv');await p.waitForSelector('#ea');
await p.click('#ea');await p.selectOption('#e_cl','c1');await p.fill('#e_m','2500,50');await p.click('#sv');await p.waitForSelector('#ea');
const s=await p.evaluate(()=>({n:db.encaissements.length,sans:db.encaissements.filter(e=>!e.clientId).length,ca:caCat('services'),cl:encClient('c1')}));
T('2 encaissements dont 1 sans client',s.n===2&&s.sans===1);
T('CA annuel = 12 500,50 DH ; client = 2 500,50 DH (sans client hors seuil client)',s.ca===1250050&&s.cl===250050);
// annulation avec trace
await p.click('[data-e]');await p.click('#cfok');await p.waitForSelector('.cancelled');
const a=await p.evaluate(()=>({n:db.encaissements.length,an:db.encaissements.filter(e=>e.annule).length,ca:caCat('services')}));
T('annulation : trace conservée, exclue du CA',a.n===2&&a.an===1&&a.ca<1250050);
// persistance
await p.reload();await p.fill('#upw','motdepasse1');await p.click('#ugo');await p.waitForSelector('nav');
T('encaissements persistants, annulation incluse',await p.evaluate(()=>db.encaissements.length===2&&db.encaissements.filter(e=>e.annule).length===1));
T('accueil : carte « À déclarer »',(await p.textContent('body')).includes('À déclarer'));
T('aucune erreur JS/CSP',errs.length===0);if(errs.length)console.log(errs);
console.log(ok+' OK, '+ko+' échecs');await b.close();process.exit(ko?1:0)})();
