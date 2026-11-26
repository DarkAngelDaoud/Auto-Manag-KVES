'use strict';
/* Auto Manag KVES · signé KVES · chiffrement (AES-256-GCM, PBKDF2) et stockage local (IndexedDB). Aucune donnée ne quitte l'appareil. */
const enc=new TextEncoder(),dec=new TextDecoder();
const b64=a=>{const u=new Uint8Array(a);let s='';for(let i=0;i<u.length;i+=8192)s+=String.fromCharCode(...u.subarray(i,i+8192));return btoa(s)};
const unb64=s=>Uint8Array.from(atob(s),c=>c.charCodeAt(0));
/* ---- Stockage local : IndexedDB (le coffre est déjà chiffré) ---- */
const DBN='amk-v1-db';   // nom propre à cette application (évite tout conflit avec une autre application du même site)
const openDb=name=>new Promise((res,rej)=>{const r=indexedDB.open(name,1);r.onupgradeneeded=()=>{if(!r.result.objectStoreNames.contains('kv'))r.result.createObjectStore('kv')};r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error);r.onblocked=()=>rej(new Error('blocked'))});
const idb=()=>openDb(DBN);
const kvGet=async(k,name)=>{const d=await(name?openDb(name):idb());try{return await new Promise((res,rej)=>{const q=d.transaction('kv').objectStore('kv').get(k);q.onsuccess=()=>res(q.result);q.onerror=()=>rej(q.error)})}finally{d.close()}};
const kvSet=async(k,v)=>{const d=await idb();try{return await new Promise((res,rej)=>{const x=d.transaction('kv','readwrite');x.objectStore('kv').put(v,k);x.oncomplete=()=>res();x.onerror=()=>rej(x.error)})}finally{d.close()}};
const kvClear=async()=>{const d=await idb();try{return await new Promise((res,rej)=>{const x=d.transaction('kv','readwrite'),o=x.objectStore('kv');o.delete('vault');o.delete('vault.bak');x.oncomplete=()=>res();x.onerror=()=>rej(x.error);x.onabort=()=>rej(x.error)})}finally{d.close()}};
async function getVault(){let s=await kvGet('vault');if(!s&&await kvGet('vault.bak'))return null;return s}

/* ---- Chiffrement : mot de passe -> clé qui protège la clé des données (AES-256-GCM) ---- */
async function kek(secret,salt,iter){const base=await crypto.subtle.importKey('raw',enc.encode(secret),'PBKDF2',false,['deriveKey']);return crypto.subtle.deriveKey({name:'PBKDF2',salt,iterations:iter,hash:'SHA-256'},base,{name:'AES-GCM',length:256},false,['encrypt','decrypt'])}
async function seal(key,bytes){const iv=crypto.getRandomValues(new Uint8Array(12));return{iv:b64(iv),ct:b64(await crypto.subtle.encrypt({name:'AES-GCM',iv},key,bytes))}}
async function open(key,o){return new Uint8Array(await crypto.subtle.decrypt({name:'AES-GCM',iv:unb64(o.iv)},key,unb64(o.ct)))}
async function wrap(secret,iter,raw){const salt=crypto.getRandomValues(new Uint8Array(16));return{salt:b64(salt),iter,...await seal(await kek(secret,salt,iter),raw)}}
async function unwrap(secret,w){return open(await kek(secret,unb64(w.salt),w.iter),w)}
const importDek=raw=>crypto.subtle.importKey('raw',raw,'AES-GCM',true,['encrypt','decrypt']);
const normRk=s=>s.toUpperCase().replace(/[^A-Z2-7]/g,'');
function newRk(){const a=crypto.getRandomValues(new Uint8Array(20)),al='ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';let bits='',o='';for(const b of a)bits+=b.toString(2).padStart(8,'0');for(let i=0;i<160;i+=5)o+=al[parseInt(bits.substr(i,5),2)];return o.match(/.{4}/g).join('-')}

