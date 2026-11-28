#!/usr/bin/env node
'use strict';
/* Auto Manag KVES · signé KVES · prépare la liste des empreintes (SIGNATURE-KVES.txt) à signer. Aucune clé ici.
   Usage : node outils/manifeste.js   — à lancer après toute modification des fichiers ; la signature (.sig) est alors vidée : il faut la refaire avec l'outil privé SIGNER-KVES-AutoManag.html. */
const fs=require('fs'),path=require('path'),C=require('./commun');
const text=C.buildManifest(new Date().toISOString().slice(0,10));
fs.writeFileSync(path.join(C.repo,'SIGNATURE-KVES.txt'),text);fs.writeFileSync(path.join(C.repo,'SIGNATURE-KVES.sig'),'');
console.log('Liste des empreintes écrite : version '+C.version()+', '+C.listFiles().length+' fichiers. Il reste à la signer (outil privé).');
