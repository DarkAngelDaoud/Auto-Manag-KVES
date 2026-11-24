// Tests V1.1 : factures (numérotation, verrouillage, encaissement lié, annulation). Lancés par run.js
const {chromium}=require('playwright');const BASE=process.env.BASE_LOCAL;let ok=0,ko=0;const T=(n,c)=>{console.log(c?'OK  ':'FAIL',n);c?ok++:ko++};
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:390,height:844},serviceWorkers:'block'});const p=await ctx.newPage();
const errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('console',m=>{if(m.type()==='error')errs.push(m.text())});
await p.goto(BASE+'index.html');
await p.fill('#pw','motdepasse1');await p.fill('#pw2','motdepasse1');await p.click('#go');await p.waitForSelector('#rk');await p.check('#ok');await p.click('#next');await p.waitForSelector('nav');
const Y=new Date().getFullYear();
const r=await p.evaluate(()=>({a:lineCts(2500,33333),b:lineCts(1000,150000),q:[parseQm('2,5'),parseQm('0'),parseQm('1.2345'),parseQm('abc'),parseQm('10')]}));
T('ligne 2,5 × 333,33 = 833,33 (arrondi au centime)',r.a===83333);T('ligne 1 × 1500 = 1500',r.b===150000);
T('quantités : 2,5 ok ; 0, 4 décimales, texte refusés',r.q.join()==='2500,,,,10000');
// prérequis manquants
await p.click('nav [data-tab=inv]');await p.click('#fa');T('facture bloquée sans entreprise/activité/client',(await p.textContent('#m')).includes('Renseigner'));
await p.evaluate(()=>{db.activites=[{id:'a1',nom:'Conseil',cat:'services'}];db.clients=[{id:'c1',nom:'Alpha',ice:'123456789012345',cree:nowIso()}];db.entreprise.nom='KVES Services';db.entreprise.ice='001122334455667'});
// entreprise via l'écran
await p.click('nav [data-tab=more]');await p.click('[data-s=ent]');await p.fill('#n_ice','123');await p.click('#sv');T('ICE invalide refusé',await p.isVisible('#err'));
await p.fill('#n_ice','001122334455667');await p.fill('#n_adresse','Casablanca');await p.click('#sv');await p.waitForSelector('[data-s=enc]');
const mk=async(desc,q,pu)=>{await p.click('nav [data-tab=inv]');await p.click('#fa');await p.fill('[data-l=d]',desc);await p.fill('[data-l=q]',q);await p.fill('[data-l=p]',pu);await p.click('#sv')};
await mk('Conseil informatique','2','1500');await p.waitForSelector('.invoice');
const t1=await p.textContent('.invoice');
T('facture 1 numérotée AAAA-001 avec ICE, TVA, client',t1.includes(Y+'-001')&&t1.includes('001122334455667')&&t1.includes('TVA non applicable')&&t1.includes('Alpha')&&t1.replace(/\s/g,'').includes('3000,00DH'));
await mk('Maintenance','1','500,50');await p.waitForSelector('.invoice');T('facture 2 numérotée AAAA-002',(await p.textContent('.invoice')).includes(Y+'-002'));
// date antérieure refusée
await p.click('nav [data-tab=inv]');await p.click('#fa');await p.fill('[data-l=d]','x');await p.fill('[data-l=p]','10');
await p.evaluate(()=>{document.querySelector('#f_date').value=(new Date().getFullYear())+'-01-01'});await p.click('#sv');
T('date antérieure à la dernière facture refusée',(await p.textContent('#err')).includes('chronologique')||(await p.isVisible('#err')));
// encaissement lié : acompte puis solde
await p.evaluate(()=>{route.fd=null});await p.click('nav [data-tab=inv]');await p.click('[data-f]');await p.waitForSelector('.invoice');
await p.click('#fe');await p.waitForSelector('#e_m');T('montant prérempli = reste (500,50)',(await p.inputValue('#e_m'))==='500,50');
await p.fill('#e_m','999');await p.click('#sv');T('dépassement du reste refusé',await p.isVisible('#err'));
await p.fill('#e_m','200');await p.click('#sv');await p.waitForSelector('.invoice');
let s=await p.evaluate(()=>{const f=facSorted()[0];return{r:reste(f),p:paye(f),ca:caCat('services'),n:db.encaissements.filter(e=>e.factureId===f.id).length}});
T('acompte 200 : reste 300,50, CA 200, 1 encaissement lié',s.r===30050&&s.p===20000&&s.ca===20000&&s.n===1);
await p.click('#fx');T('annulation bloquée si encaissement lié',(await p.textContent('#err')).includes('encaissements'));
await p.click('#fe');await p.click('#sv');await p.waitForSelector('.invoice');
s=await p.evaluate(()=>{const f=facSorted()[0];return{r:reste(f),ca:caCat('services')}});T('solde : reste 0, CA 500,50',s.r===0&&s.ca===50050);
// annulation facture 1 (sans paiement) : numéro non réutilisé
await p.click('nav [data-tab=inv]');await p.click('li[data-f]:last-child');await p.waitForSelector('.invoice');await p.click('#fx');await p.click('#cfok');await p.waitForSelector('.chip.bad');
await mk('Autre','1','100');await p.waitForSelector('.invoice');
const nums=await p.evaluate(()=>facSorted().map(f=>f.numero+':'+f.statut).join());
T('annulée gardée, numéro 003 sans réutilisation',nums.includes(Y+'-001:annulee')&&nums.includes(Y+'-003:emise'));
// instantané : modifier l'entreprise ne change pas une facture émise
await p.evaluate(()=>{db.entreprise.nom='Autre nom'});await p.click('nav [data-tab=inv]');await p.click('li[data-f]:last-child');await p.waitForSelector('.invoice');
T('facture émise garde les infos de son jour',(await p.textContent('.invoice')).includes('KVES Services'));
// persistance + accueil
await p.reload();await p.fill('#upw','motdepasse1');await p.click('#ugo');await p.waitForSelector('nav');
T('factures persistantes',await p.evaluate(()=>db.documents.length===3));
T('accueil : factures à encaisser',(await p.textContent('body')).includes('Factures à encaisser'));
T('aucune erreur JS/CSP',errs.length===0);if(errs.length)console.log(errs);
console.log(ok+' OK, '+ko+' échecs');await b.close();process.exit(ko?1:0)})();
