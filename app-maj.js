'use strict';
/* Auto Manag KVES · signé KVES · mises à jour et démarrage (chargé en dernier) */
/* ---- Mises à jour : nouveautés, puis choix ---- */
const upd={p:null,ign:false,reg:null};
const vnum=v=>String(v).split('.').map(Number);
const newer=(a,b)=>{const x=vnum(a),y=vnum(b);for(let i=0;i<3;i++){if((x[i]||0)!==(y[i]||0))return(x[i]||0)>(y[i]||0)}return false};
function updBox(h){let b=document.getElementById('upd');if(!b){b=document.createElement('div');b.id='upd';b.setAttribute('role','dialog');document.body.appendChild(b)}b.innerHTML=h;return b}
function updStep(n){const p=upd.p;if(!p)return;
 if(n===1){const b=updBox(`<b>${t('upd.news',esc(p.v))}</b><ul>${(p.notes||[]).map(x=>`<li>${esc(x)}</li>`).join('')||`<li>${t('upd.misc')}</li>`}</ul><button id="u1">${t('continue')}</button>`);b.querySelector('#u1').onclick=()=>updStep(2)}
 else{const b=updBox(`<b>${t('upd.install',esc(p.v))}</b><span class="mute">${t('upd.keep')}</span><div class="row2"><button id="u2">${t('upd.go')}</button><button class="sec" id="u3">${t('upd.ign',APP_VERSION)}</button></div>`);
  b.querySelector('#u3').onclick=()=>{upd.ign=true;b.remove()};
  b.querySelector('#u2').onclick=async e=>{e.target.disabled=true;e.target.textContent=t('upd.wait');try{await upd.reg.update()}catch{}
   const want='amk-v'+p.v;let k=0;const sw=navigator.serviceWorker;sw.onmessage=m=>{if(m.data===want)location.reload()};
   const ping=()=>{if(++k>25){e.target.disabled=false;e.target.textContent=t('upd.retry');return}(sw.controller||upd.reg.active).postMessage('accept');setTimeout(ping,1000)};ping()}}}
async function checkUpd(){try{const r=await fetch('version.json?'+Date.now(),{cache:'no-store'});const j=await r.json();
 if(j&&j.v&&newer(j.v,APP_VERSION)){upd.p=j;try{await upd.reg.update()}catch{}if(!upd.ign&&!document.getElementById('upd'))updStep(1)}}catch{}}
function swInit(){if(!('serviceWorker' in navigator))return;navigator.serviceWorker.register('sw.js').then(r=>{upd.reg=r;checkUpd()}).catch(()=>{})}
boot();swInit();
