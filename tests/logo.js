// Tests V1.6.2 : logo, couleur, modèle de facture. Lancés par run.js
const {chromium}=require('playwright');const fs=require('fs'),os=require('os'),path=require('path'),cp=require('child_process');const BASE=process.env.BASE_LOCAL;let ok=0,ko=0;const T=(n,c)=>{console.log(c?'OK  ':'FAIL',n);c?ok++:ko++};
const PW='Phrase-test-2026!';const OUT=process.env.PDF_OUT||os.tmpdir();
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:390,height:844},timezoneId:'Africa/Casablanca',acceptDownloads:true});const P=await ctx.newPage();const errs=[];P.on('pageerror',e=>errs.push(e.message));
await P.goto(BASE+'index.html');await P.fill('#pw',PW);await P.fill('#pw2',PW);await P.click('#go');await P.waitForSelector('#rk');await P.check('#ok');await P.click('#next');await P.waitForSelector('nav');
const png=async(w,h,col)=>Buffer.from((await P.evaluate(([w,h,col])=>{const c=document.createElement('canvas');c.width=w;c.height=h;const g=c.getContext('2d');g.fillStyle=col;g.fillRect(0,0,w,h);g.fillStyle='#fff';g.fillRect(w/4,h/4,w/2,h/2);return c.toDataURL('image/png')},[w,h,col])).split(',')[1],'base64');
await P.evaluate(()=>{db.entreprise={...db.entreprise,nom:'Ernest Vondo',adresse:'Casablanca',ice:'001234567000089',idae:'AE1',tel:'0600000000',mail:'e@x.ma'};nav('more','ent')});await P.waitForSelector('#lgf');
// logo trop grand : réduit
await P.setInputFiles('#lgf',{name:'logo.png',mimeType:'image/png',buffer:await png(1600,800,'#c0392b')});await P.waitForSelector('#lgx');
const lg1=await P.evaluate(()=>{const e=db.entreprise,l=db.logos[e.logoId];return{id:e.logoId,w:l.w,h:l.h,jpeg:l.u.startsWith('data:image/jpeg'),kb:l.u.length/1024}});
T('logo enregistré, réduit à 480 px max et converti en JPEG',lg1.id&&lg1.w===480&&lg1.h===240&&lg1.jpeg&&lg1.kb<100);
T('les champs de l\'entreprise sont conservés',await P.evaluate(()=>db.entreprise.nom==='Ernest Vondo'));
// enregistrer le formulaire ne perd pas le logo ni la couleur
await P.click('.sw[data-c="vert"]');await P.waitForSelector('.sw[data-c="vert"][aria-pressed="true"]');
await P.click('#sv');await P.waitForFunction(()=>!document.querySelector('#sv'));T('enregistrer « Mon entreprise » conserve logo et couleur',await P.evaluate(()=>!!db.entreprise.logoId&&db.entreprise.couleur==='vert'));
// fichier invalide
await P.evaluate(()=>nav('more','ent'));await P.waitForSelector('#lgf');await P.setInputFiles('#lgf',{name:'x.png',mimeType:'image/png',buffer:Buffer.from('pas une image')});await P.waitForSelector('#lgerr:not([hidden])');T('fichier non image refusé',await P.evaluate(()=>!!db.entreprise.logoId));
// factures émises : f1 (logo + vert), f2 annulée ; puis changement de logo
const mk=()=>P.evaluate(()=>{const base=(id,num,st)=>({id,type:'facture',numero:num,date:'2026-11-20',echeance:'2026-12-20',clientId:'c1',activiteId:'a1',statut:st,total:50000,ent:{...db.entreprise,tva:'TVA non applicable',cond:'Paiement à réception.'},cl:{nom:'Client',adr:'Rabat',ice:''},lignes:[{d:'Conseil',qm:1000,p:50000}]});db.documents.push(base('f1','2026-001','emise'),base('f2','2026-002','annulee'))});
await mk();const old=await P.evaluate(()=>db.entreprise.logoId);
await P.evaluate(()=>nav('inv','fiche','f1'));await P.waitForSelector('.inv2');
T('aperçu : logo, couleur d\'accent, cachet, pied de page',await P.evaluate(()=>{const a=document.querySelector('.inv2');return !!a.querySelector('img.inv-logo')&&a.style.getPropertyValue('--ac')==='#1E7B4F'&&!!a.querySelector('.inv-sig')&&a.querySelector('.inv-foot').textContent.includes('001234567000089')}));
T('aperçu : pas de filigrane sur une facture émise',await P.evaluate(()=>!document.querySelector('.inv-wm')));
await P.evaluate(()=>nav('inv','fiche','f2'));await P.waitForSelector('.inv2');T('facture annulée : filigrane ANNULÉE',await P.evaluate(()=>/ANNUL/.test(document.querySelector('.inv-wm').textContent)));
// PDF avec logo
await P.evaluate(()=>nav('inv','fiche','f1'));await P.waitForSelector('#fpdf');const [dl]=await Promise.all([P.waitForEvent('download'),P.click('#fpdf')]);const f1=path.join(OUT,'facture-logo.pdf');await dl.saveAs(f1);
const raw=fs.readFileSync(f1,'latin1');T('PDF : image du logo (DCTDecode) embarquée',raw.includes('/DCTDecode')&&raw.includes('/Im1 Do'));
T('PDF : qpdf valide',cp.spawnSync('qpdf',['--check',f1]).status===0);
const txt=cp.spawnSync('pdftotext',['-layout',f1,'-']).stdout.toString();T('PDF : cachet et signature, pied de page',txt.includes('Cachet et signature')&&txt.includes('001234567000089'));
const imgs=cp.spawnSync('pdfimages',['-list',f1]).stdout.toString();T('PDF : pdfimages reconnaît le logo 480x240',/480\s+240/.test(imgs));
// PDF annulée : filigrane
await P.evaluate(()=>nav('inv','fiche','f2'));await P.waitForSelector('#fpdf');const [d2]=await Promise.all([P.waitForEvent('download'),P.click('#fpdf')]);const f2=path.join(OUT,'facture-annulee.pdf');await d2.saveAs(f2);
T('PDF annulée : mention ANNULÉE',cp.spawnSync('pdftotext',[f2,'-']).stdout.toString().includes('ANNUL'));
// changer de logo : la facture émise garde l'ancien
await P.evaluate(()=>nav('more','ent'));await P.waitForSelector('#lgf');await P.setInputFiles('#lgf',{name:'l2.png',mimeType:'image/png',buffer:await png(200,100,'#2c3e50')});await P.waitForFunction(id=>db.entreprise.logoId!==id,old);
T('l\'ancien logo reste disponible pour la facture émise',await P.evaluate(([o])=>!!db.logos[o]&&db.documents.find(d=>d.id==='f1').ent.logoId===o,[old]));
T('le nouveau logo (petit) n\'est pas agrandi',await P.evaluate(()=>{const l=db.logos[db.entreprise.logoId];return l.w===200&&l.h===100}));
// retirer le logo : l'ancien, utilisé par f1, est conservé ; le nouveau, non utilisé, est supprimé
const nw=await P.evaluate(()=>db.entreprise.logoId);await P.click('#lgx');await P.waitForFunction(()=>!db.entreprise.logoId);
T('retrait : logo inutilisé supprimé, logo d\'une facture émise conservé',await P.evaluate(([o,n])=>!db.logos[n]&&!!db.logos[o],[old,nw]));
// persistance chiffrée : recharger et déverrouiller
await P.reload();await P.waitForSelector('#upw');await P.fill('#upw',PW);await P.click('#ugo');await P.waitForSelector('nav');
T('logos persistants après rechargement',await P.evaluate(([o])=>!!db.logos[o],[old]));
T('aucune erreur JS',errs.length===0);
console.log(ok+' OK, '+ko+' échecs');await b.close();process.exit(ko?1:0)})();
