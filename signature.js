'use strict';
/* Auto Manag KVES · signé KVES · vérification de la signature (V2.0.0).
   La clé publique est dans cle-publique.js ; la clé privée reste chez le propriétaire, hors du dépôt. */
const sigHex=b=>[...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,'0')).join('');
const sigSha=async b=>sigHex(await crypto.subtle.digest('SHA-256',b));
const sigFp=async()=>KVES_PUBKEY?(await sigSha(new TextEncoder().encode(KVES_PUBKEY.x+KVES_PUBKEY.y))).slice(0,32).replace(/(.{4})(?=.)/g,'$1 '):'';
const sigB64=s=>{const b=atob(s.trim()),u=new Uint8Array(b.length);for(let i=0;i<b.length;i++)u[i]=b.charCodeAt(i);return u};
function sigParse(txt){const L=txt.split('\n'),h={},files=[];let i=0;for(;i<L.length&&L[i]!=='';i++){const m=L[i].match(/^([a-z]+): (.*)$/);if(m)h[m[1]]=m[2]}for(i++;i<L.length;i++){const m=L[i].match(/^([0-9a-f]{64})  (\S.*)$/);if(m)files.push({h:m[1],p:m[2]})}return{h,files}}
/* get(chemin) -> Promise<ArrayBuffer|null>. État : none (pas de clé), missing, badsig, tampered, ok */
async function sigCheck(get){
 const out={state:'none',fp:'',v:'',date:'',items:[],bad:0};
 if(!KVES_PUBKEY)return out;
 out.fp=await sigFp();
 let mb,sb;try{mb=await get('SIGNATURE-KVES.txt');sb=await get('SIGNATURE-KVES.sig')}catch{}
 if(!mb||!sb||!sb.byteLength){out.state='missing';return out}
 try{const key=await crypto.subtle.importKey('jwk',KVES_PUBKEY,{name:'ECDSA',namedCurve:'P-256'},false,['verify']);
  if(!await crypto.subtle.verify({name:'ECDSA',hash:'SHA-256'},key,sigB64(new TextDecoder().decode(sb)),mb)){out.state='badsig';return out}}catch{out.state='badsig';return out}
 const man=sigParse(new TextDecoder().decode(mb));out.v=man.h.version||'';out.date=man.h.date||'';
 if(!man.files.length){out.state='badsig';return out}
 for(const f of man.files){let ok=false;try{const b=await get(f.p);ok=!!b&&await sigSha(b)===f.h}catch{}out.items.push({p:f.p,ok});if(!ok)out.bad++}
 out.state=out.bad?'tampered':'ok';return out}
const sigLocal=p=>fetch(p,{cache:'no-store'}).then(r=>r.ok?r.arrayBuffer():null);
let sigRes=null;
/* Mise à jour : la nouvelle version doit être signée par la même clé, et porter le numéro annoncé. Sans clé configurée, rien n'est exigé. */
async function updVerify(v,name){name=name||'amk-v'+v;if(!KVES_PUBKEY)return true;
 for(let k=0;k<20;k++){try{if(await caches.has(name)){const c=await caches.open(name);if(await c.match('./SIGNATURE-KVES.sig'))break}}catch{}await new Promise(r=>setTimeout(r,k<2?300:1000))}
 let r;try{const c=await caches.open(name);r=await sigCheck(async p=>{const x=await c.match('./'+p);return x?x.arrayBuffer():null})}catch{r={state:'badsig'}}
 if(r.state==='ok'&&r.v===v)return true;try{await caches.delete(name)}catch{}return false}
