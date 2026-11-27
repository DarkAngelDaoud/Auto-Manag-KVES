// Tests V1.8.3 : CSP stricte, aucun style en ligne, styles dynamiques appliqués
const {chromium}=require('playwright');const BASE=process.env.BASE_LOCAL;let ok=0,ko=0;const T=(n,c)=>{console.log(c?'OK  ':'FAIL',n);c?ok++:ko++};const PW='Phrase-test-2026!';
(async()=>{const b=await chromium.launch();const P=await (await b.newContext({viewport:{width:390,height:844}})).newPage();const errs=[],viol=[];P.on('pageerror',e=>errs.push(e.message));P.on('console',m=>{if(/Content Security Policy|Refused to apply inline style/i.test(m.text()))viol.push(m.text())});
await P.addInitScript(()=>{window.__v=[];document.addEventListener('securitypolicyviolation',e=>window.__v.push(e.violatedDirective+' '+e.blockedURI))});
await P.goto(BASE+'index.html');
T("la CSP n'autorise plus unsafe-inline",await P.evaluate(()=>{const c=document.querySelector('meta[http-equiv="Content-Security-Policy"]').content;return /style-src 'self';/.test(c)&&!/unsafe-inline/.test(c)&&!/unsafe-eval/.test(c)}));
await P.fill('#pw',PW);await P.fill('#pw2',PW);await P.click('#go');await P.waitForSelector('#rk');await P.check('#ok');await P.click('#next');await P.waitForSelector('nav');
const scr=[];const cnt=async n=>{await P.waitForTimeout(120);scr.push([n,await P.evaluate(()=>[...document.querySelectorAll('[style]')].filter(e=>!e.matches('[data-w],[data-bg],[data-ac],.pwt i')).map(e=>e.tagName+'.'+e.className+'#'+e.id).join(','))])};
await cnt('home');
await P.evaluate(()=>{db.clients.push({id:'c1',nom:'Client A',cree:nowIso()});db.encaissements.push({id:'e1',date:localIso(),montant:150000,mode:'esp',clientId:'c1',activiteId:(db.activites[0]||{}).id});db.depenses.push({id:'d1',date:localIso(),montant:5000,cat:'autre',mode:'esp'});db.taches.push({id:'t1',titre:'x',fait:false})});
for(const t of ['clients','inv','ech','home'])await P.evaluate(x=>nav(x),t).then(()=>cnt(t));
for(const s of ['enc','dep','decl','exp','ent','act','aff','loi','sim','trad','regles','sec','sav','demo'])await P.evaluate(x=>nav('more',x),s).then(()=>cnt('more.'+s));
T('aucun style en ligne écrit dans le HTML (hors styles posés par le script) dans tous les écrans ('+scr.length+' vérifiés)',scr.every(x=>x[1]===''));if(!scr.every(x=>x[1]===''))console.log(scr.filter(x=>x[1]!==''));
// styles dynamiques
await P.evaluate(()=>nav('home'));await P.waitForTimeout(200);
T('barre de progression : largeur appliquée par le script',await P.evaluate(()=>{const i=document.querySelector('.bar i');return !i||i.style.width!==''}));
await P.evaluate(()=>{const d=document.createElement('div');d.innerHTML='<i class="bar-t" data-w="42"></i><b data-bg="#123456"></b><u data-ac="#abcdef"></u>';document.body.appendChild(d)});await P.waitForTimeout(100);
T('largeur, fond et couleur dynamiques appliqués',await P.evaluate(()=>{const d=document.body.lastChild;return d.querySelector('i').style.width==='42%'&&d.querySelector('b').style.background!==''&&d.querySelector('u').style.getPropertyValue('--ac')==='#abcdef'}));
await P.evaluate(()=>nav('more','ent'));await P.waitForTimeout(300);T('pastilles de couleur colorées',await P.evaluate(()=>{const s=document.querySelector('button.sw');return !s||getComputedStyle(s).backgroundColor!=='rgba(0, 0, 0, 0)'}));
await P.evaluate(()=>nav('more','sav'));await P.waitForTimeout(300);T('blocs masqués restent masqués (#out, #cf)',await P.evaluate(()=>['#out','#cf'].every(s=>{const e=document.querySelector(s);return !e||getComputedStyle(e).display==='none'})));
const v=await P.evaluate(()=>window.__v);T('aucune violation de la CSP',v.length===0&&viol.length===0);if(v.length||viol.length)console.log(v,viol);
T('aucune erreur JS',errs.length===0);if(errs.length)console.log(errs);
console.log(ok+' OK, '+ko+' échecs');await b.close();process.exit(ko?1:0)})();
