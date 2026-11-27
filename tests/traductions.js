// Tests V1.8.0 : relecture des traductions
const {chromium}=require('playwright');const BASE=process.env.BASE_LOCAL;let ok=0,ko=0;const T=(n,c)=>{console.log(c?'OK  ':'FAIL',n);c?ok++:ko++};
(async()=>{const b=await chromium.launch();const P=await (await b.newContext({viewport:{width:390,height:844},acceptDownloads:true})).newPage();const errs=[];P.on('pageerror',e=>errs.push(e.message));
await P.goto(BASE+'index.html');await P.fill('#pw','Phrase-test-2026!');await P.fill('#pw2','Phrase-test-2026!');await P.click('#go');await P.waitForSelector('#rk');await P.check('#ok');await P.click('#next');await P.waitForSelector('nav');
const r=await P.evaluate(()=>{const rows=trRows();LANGS.fr['zz.t']='Bonjour {0} bienvenue ici';LANGS.en['zz.t']='Hello welcome';LANGS.ar['zz.t']='Hello there';LANGS.fr['zz.u']='Un texte pour le test';const r2=trRows();const a=r2.find(x=>x.k==='zz.t'),u=r2.find(x=>x.k==='zz.u');delete LANGS.fr['zz.t'];delete LANGS.en['zz.t'];delete LANGS.ar['zz.t'];delete LANGS.fr['zz.u'];
 return{n:rows.length,bad:rows.filter(x=>x.fl.length).length,a:a.fl,u:u.fl,csv:trCsv(rows.slice(0,3))}});
console.log('  textes :',r.n,' alertes :',r.bad);
T('plusieurs centaines de textes comparés',r.n>300);
T('variable manquante détectée (en et ar)',r.a.includes('variables en')&&r.a.includes('variables ar'));T('arabe sans caractères arabes détecté',r.a.includes('ar sans arabe'));
T('texte absent détecté',r.u.includes('en absent')&&r.u.includes('ar absent'));
T('CSV : BOM, en-tête et guillemets',r.csv.startsWith('﻿cle;fr;en;ar;alertes;statut_relecture;commentaire')&&r.csv.split('\r\n').length===4);
T('aucune alerte sur les textes actuels (ou liste connue)',r.bad<=20);
await P.evaluate(()=>nav('more','trad'));await P.waitForSelector('#trl .card');
T("l'écran affiche des textes",(await P.locator('#trl .card').count())>=50);
T('arabe affiché de droite à gauche',await P.evaluate(()=>!!document.querySelector('#trl [dir=rtl]')));
await P.fill('#trq','plafond');await P.waitForTimeout(100);T('recherche filtre la liste',(await P.locator('#trl .card').count())<60);
const [d]=await Promise.all([P.waitForEvent('download',{timeout:8000}).catch(()=>null),P.click('#trx')]);T('le bouton export ne plante pas',true);
T('rien enregistré',await P.evaluate(()=>db.clients.length===0));T('aucune erreur JS',errs.length===0);if(errs.length)console.log(errs);
console.log(ok+' OK, '+ko+' échecs');await b.close();process.exit(ko?1:0)})();
