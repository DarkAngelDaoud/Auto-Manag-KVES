'use strict';
/* Auto Manag KVES · signé KVES · générateur de PDF sans bibliothèque (hors ligne) : factures en fichier PDF, police Helvetica standard */
const HW_R=[278,278,355,556,556,889,667,191,333,333,389,584,278,333,278,278,556,556,556,556,556,556,556,556,556,556,278,278,584,584,584,556,1015,667,667,722,722,667,611,778,722,278,500,667,556,833,722,778,667,778,722,667,611,722,667,944,667,667,611,278,278,278,469,556,333,556,556,500,556,556,278,556,556,222,222,500,222,833,556,556,556,556,333,500,278,556,500,722,500,500,500,334,260,334,584];
const HW_B=[278,333,474,556,556,889,722,238,333,333,389,584,278,333,278,278,556,556,556,556,556,556,556,556,556,556,333,333,584,584,584,611,975,722,722,722,722,667,611,778,722,278,556,722,611,833,722,778,667,778,722,667,611,722,667,944,667,667,611,333,278,333,584,556,333,556,611,556,611,556,333,611,611,278,278,556,278,889,611,611,611,611,389,556,333,611,556,778,556,556,500,389,280,389,584];
// Texte -> octets WinAnsi (Latin-1 + quelques signes). Les caractères hors Latin-1 (arabe…) deviennent « ? » et sont signalés.
function pdfEnc(s){let o='',lossy=false;s=String(s==null?'':s).replace(/[   ]/g,' ').replace(/[‘’]/g,"'").replace(/[“”]/g,'"').replace(/[–—]/g,'-').replace(/…/g,'...');
 for(const ch of s){const c=ch.codePointAt(0);if(c===0x153)o+='\x9c';else if(c===0x152)o+='\x8c';else if(c===0x20ac)o+='\x80';else if(c===10)o+='\n';else if((c>=32&&c<=126)||(c>=160&&c<=255))o+=ch;else{o+='?';lossy=true}}
 return{o,lossy}}
function pdfW(o,bold,sz){let w=0;const T=bold?HW_B:HW_R;for(const ch of o){const b=ch.normalize('NFD')[0],c=b.charCodeAt(0);w+=(c>=32&&c<=126)?T[c-32]:556}return w*sz/1000}
function pdfDoc(){const pages=[];let cur=null,lossy=false;
 const D={
  page(){cur=[];pages.push(cur)},
  text(x,y,s,sz,b,al){const e=pdfEnc(s);if(e.lossy)lossy=true;const X=al==='r'?x-pdfW(e.o,b,sz):al==='c'?x-pdfW(e.o,b,sz)/2:x;cur.push(`BT /F${b?2:1} ${sz} Tf ${X.toFixed(2)} ${y.toFixed(2)} Td (${e.o.replace(/[\\()]/g,'\\$&')}) Tj ET`)},
  rect(x,y,w,h,g){cur.push(`${g} g ${x.toFixed(2)} ${y.toFixed(2)} ${w.toFixed(2)} ${h.toFixed(2)} re f 0 g`)},
  line(x1,y1,x2,y2,wd){cur.push(`${wd||0.5} w ${x1.toFixed(2)} ${y1.toFixed(2)} m ${x2.toFixed(2)} ${y2.toFixed(2)} l S`)},
  wrap(s,b,sz,maxW){const out=[];for(const para of String(s==null?'':s).split('\n')){let line='';for(let word of para.split(/\s+/).filter(Boolean)){while(pdfW(pdfEnc(word).o,b,sz)>maxW&&word.length>1){let k=word.length-1;while(k>1&&pdfW(pdfEnc(word.slice(0,k)).o,b,sz)>maxW)k--;if(line){out.push(line);line=''}out.push(word.slice(0,k));word=word.slice(k)}
    const tryL=line?line+' '+word:word;if(line&&pdfW(pdfEnc(tryL).o,b,sz)>maxW){out.push(line);line=word}else line=tryL}out.push(line)}return out},
  count(){return pages.length},
  build(title){const n=pages.length;if(n>1)pages.forEach((p,i)=>{cur=p;D.text(297.64,28,'Page '+(i+1)+'/'+n,8,false,'c')});
   const objs=[];objs[1]='<< /Type /Catalog /Pages 2 0 R >>';objs[3]='<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>';objs[4]='<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>';
   objs[5]='<< /Title ('+pdfEnc(title).o.replace(/[\\()]/g,'\\$&')+') /Creator (Auto Manag KVES) >>';const kids=[];
   pages.forEach((p,i)=>{const c=6+2*i,g=7+2*i,st=p.join('\n');objs[c]=`<< /Length ${st.length} >>\nstream\n${st}\nendstream`;objs[g]=`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595.28 841.89] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${c} 0 R >>`;kids.push(g+' 0 R')});
   objs[2]=`<< /Type /Pages /Kids [${kids.join(' ')}] /Count ${n} >>`;
   let out='%PDF-1.4\n%\xE2\xE3\xCF\xD3\n';const off=[];for(let k=1;k<objs.length;k++){off[k]=out.length;out+=`${k} 0 obj\n${objs[k]}\nendobj\n`}
   const xr=out.length;out+=`xref\n0 ${objs.length}\n0000000000 65535 f \n`+off.slice(1).map(o=>String(o).padStart(10,'0')+' 00000 n \n').join('')+`trailer\n<< /Size ${objs.length} /Root 1 0 R /Info 5 0 R >>\nstartxref\n${xr}\n%%EOF`;
   const u=new Uint8Array(out.length);for(let i=0;i<out.length;i++)u[i]=out.charCodeAt(i)&255;return{bytes:u,lossy}}};
 return D}
// Facture -> PDF (toujours en français, comme l'aperçu)
function pdfFacture(f){const t=tf,dhx=dhxFr,fmt=fmtFr,e=f.ent,c=f.cl,D=pdfDoc(),W=595.28,H=841.89,M=50,R=W-M;let y;
 const head=()=>{D.page();y=H-M};head();
 let yl=y-10;for(const l of D.wrap(e.nom,true,13,250)){D.text(M,yl,l,13,true);yl-=16}
 const L=s=>{for(const l of D.wrap(s,false,9.5,250)){D.text(M,yl,l,9.5,false);yl-=12}};
 if(e.adresse)L(e.adresse);if(e.ice)L(t('fac.ice')+' : '+e.ice);if(e.idae)L(t('fac.idae')+' : '+e.idae);if(e.tel)L(t('fac.tel')+' : '+e.tel);if(e.mail)L(t('fac.mail')+' : '+e.mail);
 D.text(R,y-12,t('fac.title'),20,true,'r');let yr=y-32;const RR=(s,b)=>{D.text(R,yr,s,10,b,'r');yr-=14};
 RR(t('fac.no',f.numero),true);RR(fmt(pd(f.date)));if(f.echeance!==undefined)RR(t('fac.ech.l')+' : '+(f.echeance?fmt(pd(f.echeance)):t('fac.ech.0')));if(f.statut==='annulee')RR(t('fac.s.annulee').toUpperCase(),true);
 y=Math.min(yl,yr)-14;
 const box=[[t('fac.to'),false,8.5]];for(const l of D.wrap(c.nom,true,11,R-M-20))box.push([l,true,11]);if(c.adr)for(const l of D.wrap(c.adr,false,9.5,R-M-20))box.push([l,false,9.5]);if(c.ice)box.push([t('fac.ice')+' : '+c.ice,false,9.5]);
 const bh=box.length*14+12;D.rect(M,y-bh,R-M,bh,0.95);let by=y-18;for(const[s,b,z]of box){D.text(M+10,by,s,z,b);by-=14}y-=bh+18;
 const cQ=330,cP=420,cT=R-6,th=()=>{D.rect(M,y-20,R-M,20,0.88);D.text(M+6,y-14,t('fac.desc'),9.5,true);D.text(cQ,y-14,t('fac.qty.s'),9.5,true,'r');D.text(cP,y-14,t('fac.pu.s'),9.5,true,'r');D.text(cT,y-14,t('fac.tl'),9.5,true,'r');y-=20};th();
 for(const x of f.lignes){const ls=D.wrap(x.d,false,9.5,cQ-M-60-12),h=ls.length*12+8;if(y-h<110){head();th()}
  let ty=y-14;ls.forEach((l,i)=>{D.text(M+6,ty-i*12,l,9.5,false)});D.text(cQ,ty,qShow(x.qm),9.5,false,'r');D.text(cP,ty,dhx(x.p),9.5,false,'r');D.text(cT,ty,dhx(lineCts(x.qm,x.p)),9.5,false,'r');y-=h;D.line(M,y,R,y,0.4)}
 if(y<200){head()}y-=22;D.text(cP-60,y,t('fac.net'),11,true);D.text(cT,y,dhx(f.total),12,true,'r');y-=22;
 const P=(s,sz)=>{for(const l of D.wrap(s,false,sz||9.5,R-M)){if(y<60){head()}D.text(M,y,l,sz||9.5,false);y-=13}y-=4};
 P(t('fac.words',lettres(f.total)));if(e.tva)P(e.tva);if(e.cond)P(e.cond);if(e.iban)P(t('fac.iban')+' : '+e.iban);
 return D.build(t('fac.no',f.numero)+' - '+c.nom)}
const pdfName=f=>'Facture_'+String(f.numero).replace(/[^A-Za-z0-9_-]/g,'')+'_'+(String(f.cl.nom).normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^A-Za-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,30)||'client')+'.pdf';
