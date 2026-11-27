'use strict';
/* Auto Manag KVES · signé KVES · vérification de la signature (V2.0.1, Ed25519 comme Coach-Mass-KVES).
   La clé publique est dans kves-automanag-cle-publique.txt ; la clé privée reste chez le propriétaire, hors du dépôt. */
const SIG_KEY='kves-automanag-cle-publique.txt';
const sigHex=b=>[...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,'0')).join('');
const sigSha=async b=>sigHex(await crypto.subtle.digest('SHA-256',b));
const sigB64=s=>{s=s.trim().replace(/-/g,'+').replace(/_/g,'/');while(s.length%4)s+='=';const b=atob(s),u=new Uint8Array(b.length);for(let i=0;i<b.length;i++)u[i]=b.charCodeAt(i);return u};
const sigFp=async raw=>sigHex(await crypto.subtle.digest('SHA-256',raw)).slice(0,16).toUpperCase().replace(/(.{4})(?=.)/g,'$1 ');
function sigParse(txt){const L=txt.split('\n'),h={},files=[];let i=0;for(;i<L.length&&L[i]!=='';i++){const m=L[i].match(/^([a-z]+): (.*)$/);if(m)h[m[1]]=m[2]}for(i++;i<L.length;i++){const m=L[i].match(/^([0-9a-f]{64})  (\S.*)$/);if(m)files.push({h:m[1],p:m[2]})}return{h,files}}
/* Clé publique brute (32 octets) lue dans le fichier, ou null si absente ou pas encore générée. */
async function sigKeyFrom(get){let b;try{b=await get(SIG_KEY)}catch{}if(!b)return null;const s=new TextDecoder().decode(b).trim();if(!/^[A-Za-z0-9_-]{43}$/.test(s))return null;try{return sigB64(s)}catch{return null}}
/* get(chemin) -> Promise<ArrayBuffer|null>. État : none (pas de clé), missing, unsupported, badsig, tampered, ok. pin = clé déjà connue (mise à jour). */
async function sigCheck(get,pin){
 const out={state:'none',fp:'',v:'',date:'',items:[],bad:0};
 const raw=pin||await sigKeyFrom(get);
 if(!raw)return out;
 out.fp=await sigFp(raw);
 let mb,sb;try{mb=await get('SIGNATURE-KVES.txt');sb=await get('SIGNATURE-KVES.sig')}catch{}
 if(!mb||!sb||!sb.byteLength){out.state='missing';return out}
 let key;try{key=await crypto.subtle.importKey('raw',raw,{name:'Ed25519'},false,['verify'])}catch{out.state='unsupported';return out}
 try{if(!await crypto.subtle.verify({name:'Ed25519'},key,sigB64(new TextDecoder().decode(sb)),mb)){out.state='badsig';return out}}catch{out.state='badsig';return out}
 const man=sigParse(new TextDecoder().decode(mb));out.v=man.h.version||'';out.date=man.h.date||'';
 if(!man.files.length){out.state='badsig';return out}
 for(const f of man.files){let ok=false;try{const b=await get(f.p);ok=!!b&&await sigSha(b)===f.h}catch{}out.items.push({p:f.p,ok});if(!ok)out.bad++}
 out.state=out.bad?'tampered':'ok';return out}
const sigLocal=p=>fetch(p,{cache:'no-store'}).then(r=>r.ok?r.arrayBuffer():null);
let sigRes=null,sigPin;
/* Clé de la version qui tourne : lue une fois au démarrage, elle sert à juger les mises à jour. */
const sigPinGet=()=>sigPin!==undefined?Promise.resolve(sigPin):sigKeyFrom(sigLocal).then(k=>(sigPin=k),()=>(sigPin=null));
sigPinGet();
/* Mise à jour : la nouvelle version doit être signée par la même clé, et porter le numéro annoncé. Sans clé configurée, rien n'est exigé. Navigateur trop ancien pour Ed25519 : on ne bloque pas. */
async function updVerify(v,name){name=name||'amk-v'+v;const pin=await sigPinGet();if(!pin)return true;
 for(let k=0;k<20;k++){try{if(await caches.has(name)){const c=await caches.open(name);if(await c.match('./SIGNATURE-KVES.sig'))break}}catch{}await new Promise(r=>setTimeout(r,k<2?300:1000))}
 let r;try{const c=await caches.open(name),get=async p=>{const x=await c.match('./'+p);return x?x.arrayBuffer():null};r=await sigCheck(get,pin);const nk=await sigKeyFrom(get);if(r.state!=='unsupported'&&(!nk||sigHex(nk)!==sigHex(pin)))r={state:'badsig'}}catch{r={state:'badsig'}}
 if(r.state==='unsupported')return true;
 if(r.state==='ok'&&r.v===v)return true;try{await caches.delete(name)}catch{}return false}
