// Tests V1.2.1 : écritures croisées entre fenêtres, installation du service worker, dates d'exemple. Lancés par run.js
const {chromium}=require('playwright');const BASE=process.env.BASE_LOCAL;let ok=0,ko=0;const T=(n,c)=>{console.log(c?'OK  ':'FAIL',n);c?ok++:ko++};
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:390,height:844},timezoneId:'Africa/Casablanca'});const A=await ctx.newPage();const errs=[];A.on('pageerror',e=>errs.push(e.message));
await A.goto(BASE+'index.html');
await A.fill('#pw','Phrase-test-2026!');await A.fill('#pw2','Phrase-test-2026!');await A.click('#go');await A.waitForSelector('#rk');await A.check('#ok');await A.click('#next');await A.waitForSelector('nav');
// fenêtre B : même coffre
const B=await ctx.newPage();B.on('pageerror',e=>errs.push(e.message));await B.goto(BASE+'index.html');await B.waitForSelector('#upw');await B.fill('#upw','Phrase-test-2026!');await B.click('#ugo');await B.waitForSelector('nav');
await A.evaluate(async()=>{db.clients.push({id:'cA',nom:'Client de A',cree:nowIso()});await persist()});
const r=await B.evaluate(async()=>{db.clients.push({id:'cB',nom:'Client de B',cree:nowIso()});try{await persist();return'ecrit'}catch(e){return e.message}});
T('B refuse d\'écraser les données de A',r==='conflict');
T('écran d\'explication affiché dans B',(await B.textContent('body')).includes('autre fenêtre'));
await B.click('#cfreload');await B.waitForSelector('#upw');await B.fill('#upw','Phrase-test-2026!');await B.click('#ugo');await B.waitForSelector('nav');
T('après reconnexion, B voit le client de A et pas celui de B',await B.evaluate(()=>db.clients.some(c=>c.id==='cA')&&!db.clients.some(c=>c.id==='cB')));
await B.evaluate(async()=>{db.clients.push({id:'cB2',nom:'B2',cree:nowIso()});await persist()});
T('B écrit normalement une fois à jour',await B.evaluate(async()=>{const s=JSON.parse(await kvGet('vault'));return !!s.updated}));
// A est maintenant périmée : refus aussi
T('A (périmée) refuse à son tour',await A.evaluate(async()=>{try{await persist();return false}catch(e){return e.message==='conflict'}}));
// service worker : fichiers installés frais
const C=await b.newContext({viewport:{width:390,height:844}});const P=await C.newPage();await P.goto(BASE+'index.html');const count=()=>P.evaluate(async()=>{const k=(await caches.keys()).find(x=>x.startsWith('amk-v'));return k?(await(await caches.open(k)).keys()).length:0}).catch(()=>0);
for(let i=0;i<40&&(await count())<13;i++)await new Promise(r=>setTimeout(r,500));
T('cache hors ligne installé avec tous les fichiers',await P.evaluate(async()=>{const k=(await caches.keys()).find(x=>x.startsWith('amk-v'));return !!k&&(await(await caches.open(k)).keys()).length>=13}));
T('sw.js force le rechargement réseau',/cache:'reload'/.test(require('fs').readFileSync(__dirname+'/../sw.js','utf8')));
// dates d'exemple
await A.reload();await A.fill('#upw','Phrase-test-2026!');await A.click('#ugo');await A.waitForSelector('nav');await A.click('nav [data-tab=more]');await A.click('[data-s=demo]');await A.click('#dl');await A.waitForSelector('[data-s=demo]');
T('dates d\'exemple au jour 10 (pas de décalage de fuseau)',await A.evaluate(()=>{const d=db.encaissements.filter(e=>e.demo);return d.length>0&&d.every(e=>/^\d{4}-\d\d-10$/.test(e.date))}));
T('aucune erreur JS inattendue',errs.filter(m=>!/conflict/.test(m)).length===0);
console.log(ok+' OK, '+ko+' échecs');await b.close();process.exit(ko?1:0)})();
