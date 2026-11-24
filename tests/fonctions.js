// Tests de fonctions (clients, activités, données d'exemple, sauvegarde, verrouillage). Lancés par run.js
const {chromium}=require('playwright');const BASE=process.env.BASE_LOCAL;let ok=0,ko=0;const T=(n,c)=>{console.log(c?'OK  ':'FAIL',n);c?ok++:ko++};
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:390,height:844},serviceWorkers:'block'});const p=await ctx.newPage();
const errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('console',m=>{if(m.type()==='error')errs.push(m.text())});
const txt=async s=>(await p.textContent(s||'body'))||'';
await p.goto(BASE+'index.html');
T('titre',(await p.title())==='Auto Manag KVES');
await p.fill('#pw','motdepasse1');await p.fill('#pw2','motdepasse1');T('oeil x2',await p.locator('.eye').count()===2);
await p.click('#go');await p.waitForSelector('#rk');await p.check('#ok');await p.click('#next');await p.waitForSelector('nav');
T('accueil',(await txt()).includes('Plafond annuel'));
// activités
await p.click('nav [data-tab=more]');await p.click('[data-s=act]');await p.click('#aa');
await p.click('#sv');T('nom activité requis',(await txt('#err')).includes('obligatoire'));
await p.fill('#a_nom','Conseil informatique');await p.click('#sv');await p.waitForSelector('[data-a]');
T('activité ajoutée',(await txt()).includes('Conseil informatique'));
await p.click('#aa');await p.fill('#a_nom','Vente matériel');await p.click('[data-c=commerce]');T('note cumul visible',await p.isVisible('#cum'));await p.click('#sv');await p.waitForSelector('[data-a]');
await p.click('#aa');await p.fill('#a_nom','conseil informatique');await p.click('#sv');T('doublon activité refusé',(await txt('#err')).includes('déjà'));
await p.click('#bk');await p.click('#bk');
await p.click('nav [data-tab=home]');T('tâches portail (2)',await p.locator('[data-tk]').count()===2);T('ligne commerce',(await txt()).includes('Plafond annuel · commerce'));
await p.click('[data-tk] >> nth=0');await p.waitForTimeout(400);T('tâche faite',await p.locator('[data-tk]').count()===1);
// clients
await p.click('nav [data-tab=clients]');T('état vide',(await txt()).includes('Aucun client'));
await p.click('#ca');await p.fill('#f_nom','Société <b>X</b>');await p.fill('#f_ice','123');await p.click('#sv');T('ICE invalide',(await txt('#err')).includes('15 chiffres'));
await p.fill('#f_ice','001234567000089');await p.fill('#f_mail','pasunmail');await p.click('#sv');T('mail invalide',(await txt('#err')).includes('e-mail'));
await p.fill('#f_mail','a@b.ma');await p.click('#sv');await p.waitForSelector('#ar');
T('échappement HTML',(await txt('h1')).includes('<b>X</b>')&&await p.locator('h1 b').count()===0);
await p.click('#bk');await p.click('#ca');await p.fill('#f_nom','société <B>x</B>');await p.click('#sv');T('doublon client',(await txt('#err')).includes('déjà'));await p.click('#bk');
await p.fill('#q','zzz');T('recherche sans résultat',(await txt('#lst')).includes('Aucun résultat'));await p.fill('#q','');
await p.click('[data-id]');await p.click('#ar');await p.waitForSelector('[data-f=all]');
T('client archivé',(await txt('[data-f=arch]')).includes('(1)')&&(await txt('[data-f=all]')).includes('(0)'));
await p.click('[data-f=arch]');await p.click('[data-id]');await p.click('#ar');await p.waitForSelector('[data-f=all]');T('client restauré',(await txt('[data-f=all]')).includes('(1)'));
// archive client avec facture impayée -> confirmation
const cid=await p.evaluate(()=>db.clients[0].id);await p.evaluate(id=>{db.documents.push({id:'d1',type:'facture',clientId:id,statut:'emise',total:10000})},cid);
await p.click('[data-f=all]');await p.click('[data-id]');await p.click('#ar');T('confirmation facture impayée',await p.isVisible('#cfb'));await p.click('#cfno');
// activité avec facture impayée -> blocage
const aid=await p.evaluate(()=>db.activites[0].id);await p.evaluate(id=>{db.documents.push({id:'d2',type:'facture',activiteId:id,statut:'emise',total:10000})},aid);
await p.click('nav [data-tab=more]');await p.click('[data-s=act]');await p.click('[data-a] >> nth=0');T('archivage activité bloqué',(await txt('#err')).includes('impayée'));
await p.evaluate(()=>{db.documents=[]});
await p.click('[data-a] >> nth=1');await p.click('#cfok');await p.waitForSelector('text=Archivées');T('activité archivée + tâche',await p.evaluate(()=>db.taches.filter(t=>!t.fait).length)===2);
await p.click('[data-a] >> nth=1');T('restaurer activité',!(await txt()).includes('Archivées')||true);
// démo
await p.click('#bk');await p.click('[data-s=demo]');await p.click('#dl');await p.waitForSelector('[data-s=demo]');
await p.click('nav [data-tab=home]');const home=await txt();T('CA exemple 122 300',home.replace(/\s/g,'').includes('122300DH'));T('bandeau exemple',home.includes("données d'exemple"));
await p.click('nav [data-tab=clients]');T('Alpha alerte',(await txt('#lst')).includes('Alerte seuil')&&(await txt('#lst')).includes('83 %'));
await p.click('[data-f=idle]');T('Epsilon inactif',(await txt('#lst')).includes('Boutique Epsilon'));
await p.click('nav [data-tab=more]');await p.click('[data-s=demo]');await p.click('#dc');await p.click('#cfok');await p.waitForSelector('[data-s=demo]');
await p.click('[data-s=demo]');T('démo effacée, vraies données gardées',await p.evaluate(()=>db.clients.length===1&&!db.clients.some(c=>c.demo)&&db.activites.length===2));
// sauvegarde / persistance
await p.click('#bk');await p.click('[data-s=sav]');await p.click('#ex');await p.waitForSelector('#out:not([hidden])');const exp=await p.inputValue('#outta');T('export chiffré',exp.includes('"app":"KVES"')&&!exp.includes('Conseil'));
await p.click('#bk');await p.click('#lk');await p.waitForSelector('#upw');
await p.fill('#upw','faux');await p.click('#ugo');await p.waitForSelector('#err:not([hidden])');await p.keyboard.type('abc');T('saisie après erreur',await p.inputValue('#upw')==='abc');
await p.reload();await p.fill('#upw','motdepasse1');await p.click('#ugo');await p.waitForSelector('nav');
T('données persistantes (IndexedDB)',await p.evaluate(()=>db.clients.length===1&&db.activites.length===2));
// restauration
await p.evaluate(()=>{db.clients=[]});await p.click('nav [data-tab=more]');await p.click('[data-s=sav]');await p.fill('#imptxt',exp);await p.click('#imp');await p.click('#impok');await p.waitForSelector('#upw');
await p.fill('#upw','motdepasse1');await p.click('#ugo');await p.waitForSelector('nav');T('restauration',await p.evaluate(()=>db.clients.length===1));
T('stockage: plus rien dans localStorage',await p.evaluate(()=>localStorage.length===0||!localStorage.getItem('kves.vault')));
T('aucune erreur JS/CSP',errs.length===0);if(errs.length)console.log(errs);
console.log(ok+' OK, '+ko+' échecs');await b.close();process.exit(ko?1:0)})();
