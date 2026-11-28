#!/usr/bin/env node
'use strict';
/* Auto Manag KVES · signé KVES · vérifie que les fichiers du dépôt correspondent à la signature (utilisé aussi par la vérification automatique GitHub).
   Code de sortie 0 = bon (ou signature non configurée), 1 = fichier modifié / signature invalide / fichier non signé. */
const fs=require('fs'),path=require('path'),C=require('./commun');
const pub=C.readPub();if(!pub){console.log('Signature non configurée (kves-automanag-cle-publique.txt pas encore généré) : vérification ignorée.');process.exit(0)}
const rd=f=>{try{return fs.readFileSync(path.join(C.repo,f),'utf8')}catch{return null}};
const txt=rd('SIGNATURE-KVES.txt'),sig=rd('SIGNATURE-KVES.sig');
if(!txt||!sig||!sig.trim()){console.error('ÉCHEC : SIGNATURE-KVES.txt ou .sig manquant ou vide. Signe la version avec SIGNER-KVES-AutoManag.html.');process.exit(1)}
let ok=false;try{ok=C.verifySig(pub,txt,sig)}catch{}
if(!ok){console.error('ÉCHEC : la signature ne correspond pas à la clé publique.');process.exit(1)}
const F=C.parse(txt);let bad=0;
for(const f of F){let h=null;try{h=C.sha(fs.readFileSync(path.join(C.repo,f.p)))}catch{}if(h!==f.h){console.error('MODIFIÉ ou absent : '+f.p);bad++}}
for(const f of C.listFiles())if(!F.some(x=>x.p===f)){console.error('NON SIGNÉ : '+f);bad++}
if(bad){console.error('ÉCHEC : '+bad+' problème(s). Refais la liste (node outils/manifeste.js) puis signe-la de nouveau.');process.exit(1)}
console.log('Signature valide : '+F.length+' fichiers, clé '+C.fingerprint(pub));
