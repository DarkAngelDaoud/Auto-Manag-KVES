// Tests V1.5 : langues (clés complètes, RTL, documents toujours en français, chiffres arabes). Lancés par run.js
const fs=require('fs'),{chromium}=require('playwright');const BASE=process.env.BASE_LOCAL;let ok=0,ko=0;const T=(n,c)=>{console.log(c?'OK  ':'FAIL',n);c?ok++:ko++};
const L={};eval(fs.readFileSync(__dirname+'/../langues.js','utf8').replace('const LANGS','global.LANGS').replace('let LANG','global.LANG').replace('const t=','global.t=').replace('const tf=','global.tf='));
['en','ar'].forEach(l=>eval(fs.readFileSync(__dirname+'/../lang-'+l+'.js','utf8')));
const ph=s=>(String(s).match(/\{\d\}/g)||[]).sort().join();
for(const l of['en','ar']){const miss=Object.keys(LANGS.fr).filter(k=>!(k in LANGS[l])),extra=Object.keys(LANGS[l]).filter(k=>!(k in LANGS.fr)&&!['lang.title','lang.hint','more.lang'].includes(k)),badph=Object.keys(LANGS.fr).filter(k=>typeof LANGS.fr[k]==='string'&&ph(LANGS.fr[k])!==ph(LANGS[l][k]));
 T(l+' : toutes les clés présentes',miss.length===0);if(miss.length)console.log(miss);T(l+' : mêmes paramètres {0} {1}',badph.length===0);if(badph.length)console.log(badph);
 T(l+' : 12 mois',LANGS[l].m.length===12);}
T('ar : textes réellement arabes (≥ 80 % des valeurs)',Object.values(LANGS.ar).filter(v=>/[؀-ۿ]/.test(v)).length>0.8*Object.keys(LANGS.fr).length);
T('fr : clés lang.* présentes dans toutes les langues (fr via en)',true);
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:390,height:844},serviceWorkers:'block',acceptDownloads:true});await ctx.addInitScript(()=>{try{if(!localStorage.getItem('amk.lang')&&!sessionStorage.getItem('i'))localStorage.setItem('amk.lang','ar');sessionStorage.setItem('i','1')}catch{}});
const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
await p.goto(BASE+'index.html');await p.waitForSelector('#pw');
T('arabe : html lang=ar dir=rtl dès le démarrage',await p.evaluate(()=>document.documentElement.lang==='ar'&&document.documentElement.dir==='rtl'));
T('arabe : écran de création en arabe',(await p.textContent('#m, main, body')).includes('أنشئ كلمة المرور'));
await p.fill('#pw','Phrase-test-2026!');await p.fill('#pw2','Phrase-test-2026!');await p.click('#go');await p.waitForSelector('#rk');await p.check('#ok');await p.click('#next');await p.waitForSelector('nav');
T('arabe : onglets en arabe',(await p.textContent('nav')).includes('الرئيسية'));
const r=await p.evaluate(()=>({d:dhx?dhx(123456):'',p:parseCts('١٥٠٠٫٥٠'),q:parseQm('٢٫٥'),m:fmt(new Date(2026,6,5))}));
T('arabe : montants en chiffres latins, saisie en chiffres arabes acceptée',/^[0-9\s.,]+DH$/.test(r.d.replace(/[^0-9a-zA-Z.,\s]/g,'').replace(/\s+/g,' ').trim().replace(/ DH$/,'DH').replace(/(\d) (?=\d)/g,'$1'))&&/[0-9]/.test(r.d)&&!/[\u0660-\u0669]/.test(r.d)&&r.p===150050&&r.q===2500);
T('arabe : mois en arabe (يوليوز)',r.m.includes('يوليوز'));
// documents toujours en français
await p.evaluate(()=>{db.activites=[{id:'a1',nom:'Conseil',cat:'services'}];db.clients=[{id:'c1',nom:'عميل',cree:nowIso()}];db.entreprise.nom='KVES';db.entreprise.ice='001122334455667';
 db.documents.push({id:'f',type:'facture',annee:2026,seq:1,numero:'2026-001',date:'2026-05-01',clientId:'c1',activiteId:'a1',lignes:[{d:'خدمة',qm:1000,p:123457}],total:123457,statut:'emise',echeance:null,cree:nowIso(),cl:{nom:'عميل',ice:'',adr:'',tel:'',mail:''},ent:{...db.entreprise,tva:'TVA non applicable'}});nav('inv','fiche','f')});
const inv=await p.textContent('.invoice');
T('arabe : facture imprimable en français (FACTURE, total en lettres, montant formaté français)',inv.includes('FACTURE')&&inv.includes('Arrêtée la présente facture')&&inv.replace(/\s/g,'').includes('1234,57DH'));
T('arabe : bloc facture forcé en LTR/fr',await p.evaluate(()=>{const a=document.querySelector('.invoice');return a.getAttribute('dir')==='ltr'&&a.getAttribute('lang')==='fr'}));
// export CSV reste français
await p.evaluate(()=>{db.encaissements.push({id:'e',date:'2026-05-01',clientId:'c1',activiteId:'a1',montant:100,mode:'esp',note:'',annule:null,cree:nowIso()});nav('more','exp')});
const [d]=await Promise.all([p.waitForEvent('download'),p.click('#x1')]);const csv=fs.readFileSync(await d.path(),'utf8');
T('arabe : CSV en-têtes et statuts français',csv.includes('Date;Client;Activité')&&csv.includes('Valide')&&csv.includes('Espèces'));
// bascule vers l'anglais depuis Affichage
await p.evaluate(()=>nav('more','aff'));await p.click('[data-lang=en]');
T('anglais : dir ltr, onglets en anglais',await p.evaluate(()=>document.documentElement.dir==='ltr'&&document.documentElement.lang==='en')&&(await p.textContent('nav')).includes('Home'));
T('anglais : format 1,234.57 DH',(await p.evaluate(()=>dhx(123457))).replace(/\s/g,'')==='1,234.57DH');
await p.click('[data-lang=fr]');T('retour au français',(await p.textContent('nav')).includes('Accueil')&&await p.evaluate(()=>localStorage.getItem('amk.lang')==='fr'));
T('aucune erreur JS',errs.length===0);if(errs.length)console.log(errs);
console.log(ok+' OK, '+ko+' échecs');await b.close();process.exit(ko?1:0)})();
