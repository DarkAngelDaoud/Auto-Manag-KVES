// Tests de protection des données : copie de sécurité, stockage inaccessible, conflit avec une autre base, restauration depuis l'écran de départ
const {chromium}=require('playwright');let ok=0,ko=0;const T=(n,c)=>{console.log(c?'OK  ':'FAIL',n);c?ok++:ko++};
const A=process.env.BASE_LOCAL,B=process.env.BASE_IP;
const mk=async(b,init)=>{const c=await b.newContext({viewport:{width:390,height:844},serviceWorkers:'block'});if(init)await c.addInitScript(init);const p=await c.newPage();p.errs=[];p.on('pageerror',e=>p.errs.push(e.message));return p};
const setup=async p=>{await p.fill('#pw','motdepasse1');await p.fill('#pw2','motdepasse1');await p.click('#go');await p.waitForSelector('#rk');await p.check('#ok');await p.click('#next');await p.waitForSelector('nav')};
(async()=>{const b=await chromium.launch();
let p=await mk(b);await p.goto(A+'index.html');await setup(p);
await p.evaluate(async()=>{db.params.plafond=150000;db.clients.push({id:'c1',nom:'Client Test',archive:null});await persist()});
await p.evaluate(async()=>{db.clients.push({id:'c2',nom:'Second',archive:null});await persist()});
T('copie de sécurité créée',await p.evaluate(()=>kvGet('vault.bak').then(x=>typeof x==='string')));
await p.evaluate(async()=>{const d=await idb();await new Promise(r=>{const x=d.transaction('kv','readwrite');x.objectStore('kv').delete('vault');x.oncomplete=r});d.close()});
await p.goto(A+'index.html');await p.waitForSelector('#rbok');T('restauration proposée (pas de création directe)',!(await p.$('#pw')));
await p.click('#rbok');await p.waitForSelector('#upw');await p.fill('#upw','motdepasse1');await p.click('#ugo');await p.waitForSelector('nav');
T('copie restaurée avec mot de passe et données',await p.evaluate(()=>db.clients.length>=1&&db.params.plafond===150000));
await p.click('nav [data-tab=more]');await p.click('[data-s=sav]');await p.waitForTimeout(300);T('indicateur de protection du stockage',(await p.textContent('#pers')).includes('Stockage protégé'));
await p.click('#ex');await p.waitForSelector('#out:not([hidden])');const exp=await p.inputValue('#outta');
let q=await mk(b,"indexedDB.open=()=>{throw new Error('indisponible')}");await q.goto(A+'index.html');await q.waitForSelector('#retry');
T('stockage inaccessible : message, pas de création de coffre',!(await q.$('#pw'))&&(await q.textContent('body')).includes('PAS effacées'));
let r=await mk(b,"if(!sessionStorage.__i){sessionStorage.__i=1;const q=indexedDB.open('amk',7);q.onupgradeneeded=()=>q.result.createObjectStore('autre')}");
await r.goto(A+'index.html');await r.waitForSelector('#pw');await setup(r);T('autre application sur « amk » : sans effet',await r.evaluate(()=>!!db));
// restauration d'une sauvegarde sur une autre adresse (origine différente)
let n=await mk(b);await n.goto(B+'index.html');await n.click('#have');await n.fill('#imptxt','pas une sauvegarde');await n.click('#imp');T('sauvegarde invalide refusée',(await n.textContent('#err')).includes('pas une sauvegarde KVES'));
await n.fill('#imptxt',exp);await n.click('#imp');await n.waitForSelector('#upw');await n.fill('#upw','motdepasse1');await n.click('#ugo');await n.waitForSelector('nav');
T('données restaurées sur la nouvelle adresse',await n.evaluate(()=>db.clients.length>=1&&db.params.plafond===150000));
await n.evaluate(()=>lock());await n.waitForSelector('#upw');T('bouton « sauvegarde » absent quand un coffre existe',!(await n.$('#have')));
T('aucune erreur JS',[p,q,r,n].every(x=>x.errs.length===0));
console.log(ok+' OK, '+ko+' échecs');await b.close();process.exit(ko?1:0)})();
