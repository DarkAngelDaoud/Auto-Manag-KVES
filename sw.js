// Auto Manag KVES · signé KVES · cache hors ligne (change le numéro de version à chaque mise à jour)
// Le stockage du navigateur est partagé par toutes les applications du même site : on ne supprime JAMAIS que nos propres caches (préfixe amk-v).
// La nouvelle version s'installe en arrière-plan mais ne sert ses fichiers qu'après acceptation (message 'accept').
const V='amk-v1.5.4',FILES=['./','./index.html','./styles.css','./theme-init.js','./langues.js','./lang-en.js','./lang-ar.js','./donnees.js','./securite.js','./app-noyau.js','./app-vues.js','./app-factures.js','./app-declarations.js','./app-depenses.js','./app-encaissements.js','./app-reglages.js','./app-maj.js','./manifest.webmanifest','./icon-192.png','./icon-512.png','./logo-kves.png','./logo-kves-mark.png'],M='amk-meta';
const getP=async()=>{const r=await(await caches.open(M)).match('ptr');return r?r.text():null};
const setP=async v=>(await caches.open(M)).put('ptr',new Response(v));
self.addEventListener('install',e=>e.waitUntil((async()=>{{const c=await caches.open(V);await Promise.all(FILES.map(async f=>{const r=await fetch(f,{cache:'reload'});if(!r.ok)throw new Error('fichier '+f);await c.put(f,r)}))}if(!await getP())await setP(V);self.skipWaiting()})()));
self.addEventListener('activate',e=>e.waitUntil((async()=>{const p=await getP();for(const k of await caches.keys())if(k.startsWith('amk-v')&&![p,V].includes(k))await caches.delete(k);await self.clients.claim()})()));
self.addEventListener('fetch',e=>{if(e.request.method!=='GET')return;if(/\/version\.json$/.test(new URL(e.request.url).pathname))return;
 e.respondWith((async()=>{const p=await getP()||V;const c=await caches.open(p);return(await c.match(e.request,{ignoreSearch:true}))||fetch(e.request)})())});
self.addEventListener('message',e=>{if(e.data==='accept')e.waitUntil(setP(V).then(async()=>{for(const k of await caches.keys())if(k.startsWith('amk-v')&&k!==V)await caches.delete(k);e.source&&e.source.postMessage(V)}))});
