// Tests V1.6.1 : factures en PDF. Lancés par run.js
const {chromium}=require('playwright');const fs=require('fs'),os=require('os'),path=require('path'),cp=require('child_process');const BASE=process.env.BASE_LOCAL;let ok=0,ko=0;const T=(n,c)=>{console.log(c?'OK  ':'FAIL',n);c?ok++:ko++};
const PW='Phrase-test-2026!';const OUT=process.env.PDF_OUT||os.tmpdir();
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:390,height:844},timezoneId:'Africa/Casablanca',acceptDownloads:true});const P=await ctx.newPage();const errs=[];P.on('pageerror',e=>errs.push(e.message));
await P.goto(BASE+'index.html');await P.fill('#pw',PW);await P.fill('#pw2',PW);await P.click('#go');await P.waitForSelector('#rk');await P.check('#ok');await P.click('#next');await P.waitForSelector('nav');
T('tables de largeurs complètes (95 caractères)',await P.evaluate(()=>HW_R.length===95&&HW_B.length===95));
const mk=(id,num,nom,nl)=>({id,type:'facture',numero:num,date:'2026-11-20',echeance:'2026-12-20',clientId:'c1',activiteId:'a1',statut:'emise',total:123456,
 ent:{nom:'Ernest Stéphane Vondo — Conseil',adresse:'12 rue des Écoles, Casablanca',ice:'001234567000089',idae:'AE123456',tel:'0600000000',mail:'e@exemple.ma',iban:'MA64 0000 0000 0000 0000 0000',tva:'TVA non applicable',cond:'Paiement à réception de la facture. Tout retard de paiement entraîne des pénalités de retard.'},
 cl:{nom,adr:'Avenue Hassan II, Rabat',ice:'009876543000012'},lignes:Array.from({length:nl},(_,i)=>({d:'Prestation numéro '+(i+1)+' : conseil informatique et développement, très longue désignation pour tester le retour à la ligne automatique',qm:1000*(i+1),p:1000}))});
await P.evaluate(([a,b2,c])=>{db.documents.push(a,b2,c)},[mk('f1','2026-001','Société Alpha',2),mk('f2','2026-002','شركة الاختبار',1),mk('f3','2026-003','Gros client SARL',45)]);
// bouton sur la fiche + téléchargement réel
await P.evaluate(()=>nav('inv','fiche','f1'));await P.waitForSelector('#fpdf');
const [dl]=await Promise.all([P.waitForEvent('download'),P.click('#fpdf')]);const name=dl.suggestedFilename();const f1=path.join(OUT,'facture-test-1.pdf');await dl.saveAs(f1);
T('nom de fichier clair',name==='Facture_2026-001_Societe-Alpha.pdf');
const buf=fs.readFileSync(f1);T('en-tête et fin PDF',buf.slice(0,5).toString()==='%PDF-'&&buf.slice(-5).toString()==='%%EOF');
T('qpdf valide la structure',cp.spawnSync('qpdf',['--check',f1]).status===0);
const txt=cp.spawnSync('pdftotext',['-layout',f1,'-']).stdout.toString();
T('texte : FACTURE, n°, client, accents',txt.includes('FACTURE')&&txt.includes('2026-001')&&txt.includes('Société Alpha')&&txt.includes('Stéphane')&&txt.includes('Écoles'));
T('texte : total et total en lettres',/1\s?234,56\s?DH/.test(txt)&&txt.toLowerCase().includes('mille'));
T('texte : TVA, conditions, IBAN, ICE',txt.includes('TVA non applicable')&&txt.includes('pénalités')&&txt.includes('MA64')&&txt.includes('001234567000089'));
// caractères arabes : remplacés et signalés
await P.evaluate(()=>nav('inv','fiche','f2'));await P.waitForSelector('#fpdf');const [d2]=await Promise.all([P.waitForEvent('download'),P.click('#fpdf')]);
T('nom de fichier si nom arabe',d2.suggestedFilename()==='Facture_2026-002_client.pdf');
T('avertissement caractères non latins',(await P.textContent('#err')).includes('non latins'));
// multi-pages
await P.evaluate(()=>nav('inv','fiche','f3'));await P.waitForSelector('#fpdf');const [d3]=await Promise.all([P.waitForEvent('download'),P.click('#fpdf')]);const f3=path.join(OUT,'facture-test-3.pdf');await d3.saveAs(f3);
T('facture longue : qpdf valide',cp.spawnSync('qpdf',['--check',f3]).status===0);
const info=cp.spawnSync('pdfinfo',[f3]).stdout.toString();const pages=+(info.match(/Pages:\s+(\d+)/)||[])[1];T('facture longue : plusieurs pages ('+pages+')',pages>=2);
const t3=cp.spawnSync('pdftotext',['-layout',f3,'-']).stdout.toString();T('pagination « Page 1/'+pages+' » et total en dernière page',t3.includes('Page 1/'+pages)&&/DH/.test(t3.split('\f').slice(-2).join('')));
T('facture longue : toutes les lignes présentes',(t3.match(/Prestation numéro/g)||[]).length===45);
T('aucune erreur JS',errs.length===0);
console.log(ok+' OK, '+ko+' échecs');await b.close();process.exit(ko?1:0)})();
