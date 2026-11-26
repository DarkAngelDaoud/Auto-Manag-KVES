// Tests V1.7.1 : déclaration mensuelle. Lancés par run.js
const {chromium}=require('playwright');const BASE=process.env.BASE_LOCAL;let ok=0,ko=0;const T=(n,c)=>{console.log(c?'OK  ':'FAIL',n);c?ok++:ko++};
const PW='Phrase-test-2026!';
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:390,height:844},timezoneId:'Africa/Casablanca'});const P=await ctx.newPage();const errs=[];P.on('pageerror',e=>errs.push(e.message));
await P.goto(BASE+'index.html');await P.fill('#pw',PW);await P.fill('#pw2',PW);await P.click('#go');await P.waitForSelector('#rk');await P.check('#ok');await P.click('#next');await P.waitForSelector('nav');
const E=(d,m)=>P.evaluate(([d,m])=>{db.encaissements.push({id:uid(),date:d,montant:m,activiteId:(db.activites[0]||{}).id})},[d,m]);
const set=M=>P.evaluate(M=>{db.params.periodicite=M},M);
T('par défaut : trimestrielle, 4 périodes',await P.evaluate(()=>db.params.periodicite==='T'&&periods().join()==='T1,T2,T3,T4'));
await set('M');T('mensuelle : 12 périodes',await P.evaluate(()=>periods().length===12&&periods()[0]==='M01'&&periods()[11]==='M12'));
// échéances : fin du mois suivant
const dd=await P.evaluate(()=>[dueDate(2026,'M01'),dueDate(2026,'M02'),dueDate(2026,'M11'),dueDate(2026,'M12')].map(d=>d.getFullYear()+'-'+(d.getMonth()+1)+'-'+d.getDate()));
T('échéances : janvier → 28 février (2026), nov → 31 déc, déc → 31 janvier suivant',dd.join()==='2026-2-28,2026-3-31,2026-12-31,2027-1-31'.replace('2026-3-31','2026-3-31'));
await set('T');T('trimestrielle inchangée (T1 → 30 avril, T4 → 31 janvier)',await P.evaluate(()=>[dueDate(2026,'T1'),dueDate(2026,'T4')].map(d=>d.getFullYear()+'-'+(d.getMonth()+1)+'-'+d.getDate()).join()==='2026-4-30,2027-1-31'));
// CA par mois
await E('2026-03-31',100000);await E('2026-04-01',200000);await E('2026-04-30',300000);await E('2026-05-02',400000);
T('CA du mois d\'avril (2 encaissements)',await P.evaluate(()=>encPer(2026,'M04').reduce((a,e)=>a+e.montant,0)===500000));
T('CA du T2 = avril + mai',await P.evaluate(()=>encPer(2026,'T2').reduce((a,e)=>a+e.montant,0)===900000));
T('un encaissement annulé est exclu',await P.evaluate(()=>{db.encaissements.push({id:'z',date:'2026-04-10',montant:999,annule:'2026-04-11'});return encPer(2026,'M04').reduce((a,e)=>a+e.montant,0)===500000}));
// prochaine échéance et retards en mensuel
await set('M');
const nx=await P.evaluate(()=>{const n=nextDeadline(new Date(2026,4,10));return n.t+'|'+n.annee+'|'+n.date.getMonth()+'/'+n.date.getDate()});T('mensuel : au 10 mai, prochaine échéance = avril (30 mai)',nx==='M04|2026|4/31'||nx==='M04|2026|4/31');
const late=await P.evaluate(()=>todoDecl(new Date(2026,4,10)).filter(x=>x.k==='late').map(x=>x.t).join());T('mensuel : mars (échu fin avril, CA > 0) signalé en retard',late==='M03');
await P.evaluate(()=>{db.declarations.push({id:'d1',annee:2026,t:'M03',statut:'paye',dateDecl:'2026-04-20',datePaie:'2026-04-20',montant:1000,auto:0})});
T('mars déclaré : plus de retard',await P.evaluate(()=>todoDecl(new Date(2026,4,10)).filter(x=>x.k==='late').length===0));
// changement d'option : pas de faux retards
await set('T');await P.evaluate(()=>{db.declarations.push({id:'d2',annee:2026,t:'T1',statut:'paye',dateDecl:'2026-04-20',datePaie:'2026-04-20',montant:1000,auto:0})});await set('M');
T('mois couvert par une déclaration trimestrielle : pas de faux retard',await P.evaluate(()=>!todoDecl(new Date(2026,4,10)).some(x=>x.t==='M03'||x.t==='M02'||x.t==='M01')));
T('les déclarations déjà enregistrées sont conservées',await P.evaluate(()=>db.declarations.length===2));
// écrans
await P.evaluate(()=>nav('more','decl'));await P.waitForSelector('[data-a]');
T('écran Déclarations : 12 cartes en mensuel',await P.evaluate(()=>document.querySelectorAll('#m .card').length>=12));
T('titre de carte = nom du mois et année',(await P.textContent('#m')).includes('Janvier 2026'));
await P.evaluate(()=>{route.xy=2026;nav('more','decl')});await P.waitForSelector('[data-a=declare][data-p="M04"]');await P.click('[data-a=declare][data-p="M04"]');await P.waitForSelector('#x_d');
T('formulaire de déclaration d\'avril : titre du mois et impôt 50,00 DH',await P.evaluate(()=>{const x=document.querySelector('#m').textContent.replace(/\s/g,' ');return x.includes('Avril 2026')&&/50,00/.test(x)}));
await P.evaluate(()=>{document.querySelector('#x_d').value='2026-04-29'});await P.click('#sv');
T('date avant la fin du mois refusée',await P.evaluate(()=>!decl(2026,'M04')));
await P.evaluate(()=>{document.querySelector('#x_d').value='2026-05-20'});await P.click('#sv');await P.waitForFunction(()=>decl(2026,'M04'));T('déclaration d\'avril enregistrée (M04)',true);
await P.waitForSelector('[data-a=fiche]');await P.evaluate(()=>nav('more','declfiche',{annee:2026,t:'M04'}));await P.waitForSelector('.invoice');const rc=await P.textContent('.invoice');
T('récapitulatif mensuel : mois en français et montants',rc.includes('Avril 2026')&&/5\D?000,00/.test(rc));
// accueil et échéances
await P.evaluate(()=>nav('home'));T('accueil sans erreur en mensuel',(await P.textContent('#m')).length>50);
await P.evaluate(()=>nav('more','loi'));await P.waitForSelector('#p_per');T('réglage visible et sur « Mensuelle »',(await P.inputValue('#p_per'))==='M');
await P.selectOption('#p_per','T');await P.click('#ps');await P.waitForFunction(()=>db.params.periodicite==='T');T('retour en trimestrielle enregistré',true);
await P.evaluate(()=>nav('ech'));T('écran Échéances en trimestriel : 4 lignes',await P.evaluate(()=>document.querySelectorAll('#m .card .row').length===4));
T('aucune erreur JS',errs.length===0);
console.log(ok+' OK, '+ko+' échecs');await b.close();process.exit(ko?1:0)})();
