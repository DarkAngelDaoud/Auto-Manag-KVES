// Cohérence du dépôt : versions identiques, fichiers présents, syntaxe, clés de langue
const fs=require('fs'),path=require('path'),cp=require('child_process');const R=path.join(__dirname,'..');const rd=f=>fs.readFileSync(path.join(R,f),'utf8');let ko=0;
const T=(n,c)=>{console.log(c?'OK  ':'FAIL',n);if(!c)ko++};
const av=rd('donnees.js').match(/APP_VERSION='([^']+)'/)[1],vj=JSON.parse(rd('version.json')).v,sv=rd('sw.js').match(/amk-v([0-9.]+)'/)[1];
T('version identique (donnees.js '+av+', version.json '+vj+', sw.js '+sv+')',av===vj&&vj===sv);
T('MISE-A-JOUR.txt mentionne V'+av,rd('MISE-A-JOUR.txt').includes('V'+av));
const files=[...rd('sw.js').match(/FILES=\[(.*?)\]/)[1].matchAll(/'\.\/([^']*)'/g)].map(m=>m[1]).filter(Boolean);
T('fichiers du cache hors ligne présents',files.every(f=>fs.existsSync(path.join(R,f))));
const scripts=[...rd('index.html').matchAll(/(?:src|href)="([^"#]+)"/g)].map(m=>m[1]).filter(f=>!/^https?:/.test(f));
T('fichiers de index.html présents et mis en cache',scripts.every(f=>fs.existsSync(path.join(R,f))&&files.includes(f)));
T('aucun lien externe dans index.html',!/(?:src|href)="https?:/.test(rd('index.html')));
for(const f of ['app.js','securite.js','donnees.js','langues.js','sw.js','theme-init.js'])T('syntaxe '+f,cp.spawnSync(process.execPath,['--check',path.join(R,f)]).status===0);
const keys=new Set([...rd('langues.js').matchAll(/'([a-zA-Z0-9_.]+)':/g)].map(m=>m[1]));const miss=[...new Set([...rd('app.js').matchAll(/\bt\('([^']+)'/g)].map(m=>m[1]))].filter(k=>!keys.has(k)&&!/^(tab|cl\.f|cat|aff|loi|more|log\.cl|ac|mode|dep\.c|pw)\.?$/.test(k));
T('clés de langue présentes'+(miss.length?' (manque : '+miss.join(', ')+')':''),miss.length===0);
const dir=['.kves','.key','.pem'].some(e=>fs.readdirSync(R).some(f=>f.endsWith(e)));T('aucune sauvegarde ni clé privée dans le dépôt',!dir);
process.exit(ko?1:0);
