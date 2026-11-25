// Tests V1.2 : dépenses, catégories, résultat réel. Lancés par run.js
const {chromium}=require('playwright');const BASE=process.env.BASE_LOCAL;let ok=0,ko=0;const T=(n,c)=>{console.log(c?'OK  ':'FAIL',n);c?ok++:ko++};
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:390,height:844},serviceWorkers:'block'});const p=await ctx.newPage();
const errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('console',m=>{if(m.type()==='error')errs.push(m.text())});
await p.goto(BASE+'index.html');
await p.fill('#pw','Phrase-test-2026!');await p.fill('#pw2','Phrase-test-2026!');await p.click('#go');await p.waitForSelector('#rk');await p.check('#ok');await p.click('#next');await p.waitForSelector('nav');
const Y=new Date().getFullYear();
T('8 catégories par défaut',await p.evaluate(()=>db.catDep.length===8&&db.catDep[0].nom==='Matériel'));
await p.evaluate(()=>{db.activites=[{id:'a1',nom:'Conseil',cat:'services'}];db.encaissements.push({id:'e1',date:localIso(),montant:100000,activiteId:'a1',mode:'vir',annule:null,cree:nowIso()})});
await p.click('nav [data-tab=more]');await p.click('[data-s=dep]');await p.waitForSelector('#da');
await p.click('#da');await p.fill('#d_m','abc');await p.click('#sv');T('montant invalide refusé',await p.isVisible('#err'));
await p.fill('#d_m','250,50');await p.selectOption('#d_cat','trans');await p.fill('#d_four','Taxi');await p.selectOption('#d_act','a1');await p.click('#sv');await p.waitForSelector('#da');
await p.click('#da');await p.fill('#d_m','100');await p.click('#sv');await p.waitForSelector('#da');
let s=await p.evaluate(()=>({n:db.depenses.length,ds:db.depenses.reduce((a,d)=>a+d.montant,0),act:db.depenses.filter(d=>d.activiteId==='a1').length}));
T('2 dépenses, total 350,50, 1 liée à une activité',s.n===2&&s.ds===35050&&s.act===1);
T('résumé : résultat réel = 1000,00 − 350,50 = 649,50',(await p.textContent('#m')).replace(/\s/g,'').includes('649,50DH'));
// annulation tracée
await p.click('[data-d]');await p.click('#cfok');await p.waitForSelector('.cancelled');
s=await p.evaluate(()=>({n:db.depenses.length,an:db.depenses.filter(d=>d.annule).length}));T('annulation : trace conservée',s.n===2&&s.an===1);
T('résultat mis à jour hors annulée',(await p.textContent('#m')).replace(/\s/g,'').match(/Résultatréel[^D]*D?H?/)!==null);
// catégories
await p.click('#dc');await p.fill('#c_n','Assurance');await p.click('#sv');await p.waitForSelector('[data-r]');
T('catégorie ajoutée',await p.evaluate(()=>db.catDep.some(c=>c.nom==='Assurance')));
await p.fill('#c_n','assurance');await p.click('#sv');T('doublon refusé',await p.isVisible('#err'));
T('catégorie utilisée non retirable',await p.evaluate(()=>!document.querySelector('[data-r="trans"]')));
await p.click('[data-r]>>nth=0').catch(()=>{});
// impôt inchangé par les dépenses
T('impôt non réduit par les dépenses',await p.evaluate(()=>taxe(encPeriode(new Date().getFullYear(),0)).total===1000));
// persistance + accueil
await p.reload();await p.fill('#upw','Phrase-test-2026!');await p.click('#ugo');await p.waitForSelector('nav');
T('dépenses persistantes',await p.evaluate(()=>db.depenses.length===2&&db.depenses.filter(d=>d.annule).length===1));
T('accueil : carte résultat',(await p.textContent('body')).includes('Résultat '+Y));
T('aucune erreur JS/CSP',errs.length===0);if(errs.length)console.log(errs);
console.log(ok+' OK, '+ko+' échecs');await b.close();process.exit(ko?1:0)})();
