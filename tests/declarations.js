// Tests V1.3 : déclarations (statuts, rappels), récapitulatif, exports CSV/JSON. Lancés par run.js
const {chromium}=require('playwright');const BASE=process.env.BASE_LOCAL;let ok=0,ko=0;const T=(n,c)=>{console.log(c?'OK  ':'FAIL',n);c?ok++:ko++};
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:390,height:844},acceptDownloads:true,serviceWorkers:'block'});const p=await ctx.newPage();
const errs=[];p.on('pageerror',e=>errs.push(e.message));
await p.goto(BASE+'index.html');
await p.fill('#pw','motdepasse1');await p.fill('#pw2','motdepasse1');await p.click('#go');await p.waitForSelector('#rk');await p.check('#ok');await p.click('#next');await p.waitForSelector('nav');
const Y=new Date().getFullYear()-1;
await p.evaluate(Y=>{db.activites=[{id:'a1',nom:'Conseil',cat:'services'}];db.clients=[{id:'c1',nom:'=HYPERLINK("http://x")',cree:nowIso()}];
 db.encaissements.push({id:'e1',date:Y+'-02-10',clientId:'c1',activiteId:'a1',montant:123457,mode:'vir',note:'T1',annule:null,cree:nowIso()});db.entreprise.nom='KVES';
 db.depenses.push({id:'d1',date:Y+'-02-11',montant:5000,cat:'trans',fournisseur:'Taxi',activiteId:null,mode:'esp',note:'',annule:null,cree:nowIso()})},Y);
// échéance suivante tient compte du statut
const r=await p.evaluate(()=>{const a=nextDeadline(new Date(2026,3,1));db.declarations.push({id:'x',annee:2026,t:'T1',statut:'declare',dateDecl:'2026-04-05',cree:nowIso()});const b2=nextDeadline(new Date(2026,3,1));db.declarations=[];return[a.t+a.annee,b2.t+b2.annee]});
T('avant déclaration, prochaine échéance = T1 2026',r[0]==='T12026');T('T1 déclaré : l\'échéance passe à T2 2026',r[1]==='T22026');
// rappel de retard sur l'accueil
T('rappel « en retard » pour un trimestre passé avec CA non déclaré',await p.evaluate(y=>todoDecl(new Date(y,4,15)).some(x=>x.k==='late'&&x.t==='T1'&&x.annee===y),Y));
// parcours : déclarer puis payer
await p.click('nav [data-tab=more]');await p.click('[data-s=decl]');await p.waitForSelector('[data-y]');
await p.click(`[data-y="${Y}"]`);
await p.click('[data-a=declare][data-q="1"]');await p.waitForSelector('#x_d');
await p.evaluate(y=>{document.querySelector('#x_d').value=y+'-02-01'},Y);await p.click('#sv');T('déclaration avant la fin du trimestre refusée',await p.isVisible('#err'));
await p.evaluate(y=>{document.querySelector('#x_d').value=y+'-04-10'},Y);await p.fill('#x_r','REF-1');await p.click('#sv');await p.waitForSelector('[data-a=paye]');
T('T1 passe à « déclaré »',await p.evaluate(()=>decl(new Date().getFullYear()-1,'T1').statut==='declare'));
await p.click('[data-a=paye][data-q="1"]');await p.waitForSelector('#x_m');T('montant payé prérempli = impôt calculé (12,35)',(await p.inputValue('#x_m'))==='12,35');
await p.evaluate(y=>{document.querySelector('#x_d').value=y+'-04-05'},Y);await p.click('#sv');T('paiement avant la déclaration refusé',await p.isVisible('#err'));
await p.evaluate(y=>{document.querySelector('#x_d').value=y+'-04-12'},Y);await p.fill('#x_m','12,40');await p.click('#sv');await p.waitForSelector('.chip');
T('T1 payé 12,40 (différent du calculé, accepté)',await p.evaluate(()=>{const d=decl(new Date().getFullYear()-1,'T1');return d.statut==='paye'&&d.montant===1240}));
T('mention de différence affichée',(await p.textContent('#m')).includes('diffère'));
// trimestre sans CA : déclaré = payé à 0
await p.click('[data-a=declare][data-q="2"]');await p.waitForSelector('#x_d');await p.evaluate(y=>{document.querySelector('#x_d').value=y+'-07-10'},Y);await p.click('#sv');await p.waitForSelector('.chip');
T('trimestre à 0 DH : directement payé',await p.evaluate(()=>{const d=decl(new Date().getFullYear()-1,'T2');return d.statut==='paye'&&d.montant===0}));
// annuler le dernier statut
await p.click('[data-a=undo][data-q="1"]');await p.click('#cfok');await p.waitForSelector('[data-a=paye]');
T('annulation : T1 revient à « déclaré »',await p.evaluate(()=>decl(new Date().getFullYear()-1,'T1').statut==='declare'));
// récapitulatif
await p.click('[data-a=fiche][data-q="1"]');await p.waitForSelector('.invoice');const rc=await p.textContent('.invoice');
T('récapitulatif : CA 1234,57, impôt 12,35, ref',rc.replace(/\s/g,'').includes('1234,57DH')&&rc.replace(/\s/g,'').includes('12,35DH')&&rc.includes('REF-1'));
// exports
await p.evaluate(()=>nav('more','exp'));await p.click(`[data-y="${Y}"]`);
const dl=async sel=>{const [d]=await Promise.all([p.waitForEvent('download'),p.click(sel)]);return{n:d.suggestedFilename(),c:require('fs').readFileSync(await d.path(),'utf8')}};
const e1=await dl('#x1');T('CSV encaissements : BOM, séparateur ;, virgule décimale',e1.c.startsWith('﻿')&&e1.c.includes(';1234,57;')&&e1.n.startsWith('encaissements-'));
T('CSV : formule neutralisée (injection)',e1.c.includes("'=HYPERLINK")&&!/;=HYPERLINK/.test(e1.c));
const e3=await dl('#x3');T('CSV dépenses',e3.c.includes('Taxi')&&e3.c.includes(';50,00;'));
await p.evaluate(()=>{db.documents.push({id:'f',type:'facture',annee:new Date().getFullYear()-1,seq:1,numero:'X-001',date:(new Date().getFullYear()-1)+'-03-01',clientId:'c1',activiteId:'a1',lignes:[],total:1000,statut:'emise',cree:nowIso(),cl:{nom:'C',ice:'',adr:'',tel:'',mail:''},ent:{}})});await p.evaluate(()=>viewApp());
const e2=await dl('#x2');T('CSV factures',e2.c.includes('X-001')&&e2.c.includes(';10,00;'));
await p.click('#x4');await p.waitForSelector('#cfok');T('JSON : confirmation demandée avant export non chiffré',true&&await p.isVisible('#cfok'));
const [dj]=await Promise.all([p.waitForEvent('download'),p.click('#cfok')]);const js=JSON.parse(require('fs').readFileSync(await dj.path(),'utf8'));
T('JSON lisible contenant les données',js.clients.length===1&&js.encaissements.length===1&&dj.suggestedFilename().endsWith('.json'));
T('aucune erreur JS',errs.length===0);if(errs.length)console.log(errs);
console.log(ok+' OK, '+ko+' échecs');await b.close();process.exit(ko?1:0)})();
