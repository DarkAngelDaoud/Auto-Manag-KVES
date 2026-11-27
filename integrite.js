// Tests V1.7.2 : santé du coffre, contrôle d'intégrité, gros volume. Lancés par run.js
const {chromium}=require('playwright');const BASE=process.env.BASE_LOCAL;let ok=0,ko=0;const T=(n,c)=>{console.log(c?'OK  ':'FAIL',n);c?ok++:ko++};
const PW='Phrase-test-2026!';
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:390,height:844},timezoneId:'Africa/Casablanca'});const P=await ctx.newPage();const errs=[];P.on('pageerror',e=>errs.push(e.message));
await P.goto(BASE+'index.html');await P.fill('#pw',PW);await P.fill('#pw2',PW);await P.click('#go');await P.waitForSelector('#rk');await P.check('#ok');await P.click('#next');await P.waitForSelector('nav');
// 1. données saines
await P.evaluate(async()=>{db.clients.push({id:'c1',nom:'A',cree:nowIso()});await persist();nav('more','sav')});
await P.waitForSelector('#hl .note');await P.waitForTimeout(400);
let h=await P.textContent('#hl');T('carte Santé du coffre affichée',h.includes('Santé du coffre')&&/Ko/.test(h));
T('aucune anomalie sur données saines',h.includes('aucune anomalie'));
T('copie de secours lisible ou pas encore créée',/lisible|pas encore/.test(h));
// 2. anomalies
await P.evaluate(async()=>{const d=db;d.documents.push({id:'f1',type:'facture',numero:'F-1',date:'2026-01-05',lignes:[{qm:1000,p:5000}],total:999},{id:'f2',type:'facture',numero:'F-1',date:'2026-01-06',lignes:[],total:0});d.encaissements.push({id:'e1',factureId:'nope',montant:-5,date:'xx'});d.clients.push({id:'c1',nom:'dup'});await persist();nav('more','sav')});
await P.waitForSelector('#hl li');h=await P.textContent('#hl');
T('total incohérent détecté',h.includes('total ne correspond'));T('numéro en double détecté',h.includes('Numéro de facture en double'));
T('lien cassé détecté',h.includes('introuvable'));T('montant invalide détecté',h.includes('montant(s) invalide'));T('date invalide détectée',h.includes('date(s) invalide'));T('identifiant en double détecté',h.includes('Identifiants en double'));
await P.evaluate(()=>nav('home'));await P.waitForTimeout(300);
T("alerte d'anomalie sur l'accueil",(await P.textContent('#m')).includes('anomalie(s) détectée(s)'));
T('contrôle en lecture seule (rien modifié)',await P.evaluate(()=>db.documents.length===2&&db.encaissements.length===1));
// 3. gros volume
const r=await P.evaluate(async()=>{db.documents=[];db.encaissements=[];db.depenses=[];db.clients=[];
 for(let i=0;i<300;i++)db.clients.push({id:'c'+i,nom:'Client '+i,cree:nowIso()});
 for(let i=0;i<1500;i++){const p=1000+i;db.documents.push({id:'f'+i,type:'facture',numero:'F-'+i,date:'2026-03-10',cl:{nom:'Client '+(i%300)},statut:'emise',lignes:[{d:'Prestation '+i,qm:1000,p}],total:lineCts(1000,p)})}
 for(let i=0;i<5000;i++)db.encaissements.push({id:'e'+i,factureId:'f'+(i%1500),montant:100+i,date:'2026-03-12',mode:'esp'});
 for(let i=0;i<1500;i++)db.depenses.push({id:'d'+i,montant:500+i,date:'2026-03-15',cat:'autre'});
 let t0=performance.now();await persist();const tp=performance.now()-t0;t0=performance.now();intKey='';const an=integ().length;const ti=performance.now()-t0;
 const s=await kvGet('vault');return{tp,ti,an,size:s.length}});
console.log('  volume : persist '+Math.round(r.tp)+' ms, intégrité '+Math.round(r.ti)+' ms, coffre '+(r.size/1048576).toFixed(2)+' Mo');
T('5 000 encaissements : sauvegarde < 5 s',r.tp<5000);T('contrôle d\'intégrité < 1 s',r.ti<1000);T('aucune fausse anomalie sur gros volume',r.an===0);
await P.evaluate(()=>nav('more','sav'));await P.waitForSelector('#hl');await P.waitForTimeout(500);
T('écran Sauvegarde fonctionne en gros volume',(await P.textContent('#hl')).includes('aucune anomalie'));
for(const tab of ['home','clients','ech','inv']){const t0=Date.now();await P.evaluate(x=>nav(x),tab);await P.waitForTimeout(100);T('écran '+tab+' affiché < 3 s en gros volume',Date.now()-t0<3000)}
// 4. alerte coffre lourd
await P.evaluate(()=>{vaultBytes=9*1048576;nav('home')});await P.waitForTimeout(200);
T('alerte coffre lourd',(await P.textContent('#m')).includes('devient lourd'));
T('aucune erreur JS',errs.length===0);if(errs.length)console.log(errs);
console.log(ok+' OK, '+ko+' échecs');await b.close();process.exit(ko?1:0)})();
