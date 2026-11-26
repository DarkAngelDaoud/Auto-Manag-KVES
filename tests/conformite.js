// Tests V1.7.0 : alertes de radiation et références légales. Lancés par run.js
const {chromium}=require('playwright');const BASE=process.env.BASE_LOCAL;let ok=0,ko=0;const T=(n,c)=>{console.log(c?'OK  ':'FAIL',n);c?ok++:ko++};
const PW='Phrase-test-2026!';
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:390,height:844},timezoneId:'Africa/Casablanca'});const P=await ctx.newPage();const errs=[];P.on('pageerror',e=>errs.push(e.message));
await P.clock.setFixedTime(new Date('2026-12-10T10:00:00'));
await P.goto(BASE+'index.html');await P.fill('#pw',PW);await P.fill('#pw2',PW);await P.click('#go');await P.waitForSelector('#rk');await P.check('#ok');await P.click('#next');await P.waitForSelector('nav');
const A=(d,fn)=>P.evaluate(([d,fn])=>{const r=eval('('+fn+')');return legalAlerts(new Date(d)).map(x=>x.k+':'+x.cls)},[d,fn||'0']);
const reset=()=>P.evaluate(()=>{db.encaissements=[];db.params.anneeInscription=null});
const enc=(y,cts,extra)=>P.evaluate(([y,c,x])=>{db.encaissements.push({id:uid(),date:y+'-06-15',montant:c,activiteId:(db.activites[0]||{}).id,...(x||{})})},[y,cts,extra]);
// 1. année sans CA
await reset();T('année d\'inscription inconnue : pas d\'alerte (on ne devine pas)',(await A('2026-12-10')).length===0);
await P.evaluate(()=>{db.params.anneeInscription=2025});
T('octobre : alerte orange année sans CA',(await A('2026-10-05')).join()==='lg.nil:warn');
T('décembre : alerte rouge',(await A('2026-12-10')).join()==='lg.nil:bad');
T('septembre : pas encore d\'alerte',(await A('2026-09-20')).length===0);
await enc(2026,10000,{annule:'2026-07-01'});T('un encaissement annulé ne compte pas',(await A('2026-12-10')).join()==='lg.nil:bad');
await enc(2026,10000);T('avec un encaissement valide : plus d\'alerte',(await A('2026-12-10')).length===0);
await reset();await P.evaluate(()=>{db.params.anneeInscription=2026});T('année d\'inscription exclue',(await A('2026-12-10')).length===0);
// 2. plafond
await reset();await P.evaluate(()=>{db.params.anneeInscription=2020});
await enc(2026,20100000);let r=await A('2026-12-10');T('plafond dépassé une fois : alerte rouge cap1',r.join()==='lg.cap1:bad');
await enc(2025,20100000);r=await A('2026-12-10');T('deux années de suite : alerte rouge cap2',r.join()==='lg.cap2:bad');
await reset();await P.evaluate(()=>{db.params.anneeInscription=2020});await enc(2025,20100000);await enc(2026,17000000);
T('année précédente dépassée et 85 % cette année : avertissement capw',(await A('2026-12-10')).join()==='lg.capw:warn');
await reset();await P.evaluate(()=>{db.params.anneeInscription=2020});await enc(2025,20100000);await enc(2026,5000000);
T('année précédente dépassée mais 25 % cette année : rien',(await A('2026-12-10')).length===0);
await reset();await enc(2026,19900000);T('juste sous le plafond : pas de dépassement',!(await A('2026-12-10')).some(x=>x.startsWith('lg.cap')));
// 3. affichage sur l'accueil (date fixée au 10 décembre 2026)
await reset();await P.evaluate(()=>{db.params.anneeInscription=2025;db.lastBackup=nowIso();nav('home')});await P.waitForSelector('#m .note.bad');
T('l\'accueil affiche l\'alerte avec sa référence',(await P.textContent('#m')).includes('loi 114-13, art. 8'));
// 4. écran Références légales
await P.evaluate(()=>nav('more','regles'));await P.waitForSelector('#ai');
const nOk=await P.evaluate(()=>REGLES.filter(r=>r.ok).length),nChk=await P.evaluate(()=>REGLES.filter(r=>!r.ok).length);
T('toutes les règles sont affichées',(await P.locator('#m .card').count())===nOk+nChk+1);
T('cases « Je l\'ai vérifié » seulement sur les règles à vérifier',(await P.locator('[data-r]').count())===nChk);
await P.locator('[data-r]').first().check();await P.waitForFunction(()=>Object.values(db.verifie).some(Boolean));
T('vérification enregistrée avec la date',await P.evaluate(()=>/^2026-12-10/.test(Object.values(db.verifie).find(Boolean))));
await P.waitForSelector('[data-r]:checked');await P.locator('[data-r]:checked').first().uncheck();await P.waitForFunction(()=>!Object.values(db.verifie).some(Boolean));T('case décochable',true);
await P.fill('#ai','2024');await P.dispatchEvent('#ai','change');await P.waitForFunction(()=>db.params.anneeInscription===2024);T('année d\'inscription enregistrée',true);
T('valeurs de l\'appli affichées (plafond 200 000 DH)',(await P.textContent('#m')).replace(/\s/g,' ').match(/200\D?000 DH/)!==null);
// 5. ancien coffre : verifie ajouté par norm
T('coffre ancien : clé verifie présente par défaut',await P.evaluate(()=>typeof norm({v:2,params:db.params}).verifie==='object'));
T('aucune erreur JS',errs.length===0);
console.log(ok+' OK, '+ko+' échecs');await b.close();process.exit(ko?1:0)})();
