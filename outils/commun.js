'use strict';
/* Auto Manag KVES · signé KVES · outils de contrôle (V2.0.1) : fonctions communes. Node seulement, aucune dépendance, aucun secret. */
const fs=require('fs'),path=require('path'),crypto=require('crypto');
const repo=path.resolve(__dirname,'..');
const KEYFILE='kves-automanag-cle-publique.txt';
// fichiers livrés à l'utilisateur : ils sont tous couverts par la signature (la clé publique et les fichiers de signature n'y figurent pas)
const listFiles=()=>fs.readdirSync(repo).filter(f=>/^(index\.html|sw\.js|manifest\.webmanifest|[\w-]+\.(js|css|png|jpg))$/.test(f)&&fs.statSync(path.join(repo,f)).isFile()).sort();
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const version=()=>(fs.readFileSync(path.join(repo,'donnees.js'),'utf8').match(/APP_VERSION='([^']+)'/)||[])[1]||'?';
const buildManifest=date=>{const L=listFiles();return ['KVES-SIGNATURE-V1','application: Auto Manag KVES','version: '+version(),'date: '+date,'fichiers: '+L.length,'',...L.map(f=>sha(fs.readFileSync(path.join(repo,f)))+'  '+f)].join('\n')+'\n'};
const readPub=()=>{try{const s=fs.readFileSync(path.join(repo,KEYFILE),'utf8').trim();return /^[A-Za-z0-9_-]{43}$/.test(s)?Buffer.from(s,'base64url'):null}catch{return null}};
const fingerprint=raw=>sha(raw).slice(0,16).toUpperCase().replace(/(.{4})(?=.)/g,'$1 ');
const verifySig=(raw,text,sigStr)=>crypto.verify(null,Buffer.from(text),crypto.createPublicKey({key:Buffer.concat([Buffer.from('302a300506032b6570032100','hex'),raw]),format:'der',type:'spki'}),Buffer.from(sigStr.trim(),'base64url'));
const parse=txt=>{const L=txt.split('\n');const files=[];let i=0;while(i<L.length&&L[i]!=='')i++;for(i++;i<L.length;i++){const m=L[i].match(/^([0-9a-f]{64})  (\S.*)$/);if(m)files.push({h:m[1],p:m[2]})}return files};
module.exports={repo,KEYFILE,listFiles,sha,version,buildManifest,readPub,fingerprint,verifySig,parse};
