'use strict';
/* Auto Manag KVES · signé KVES · générateur de PDF sans bibliothèque (hors ligne) : factures en fichier PDF, police Helvetica standard */
const HW_R=[278,278,355,556,556,889,667,191,333,333,389,584,278,333,278,278,556,556,556,556,556,556,556,556,556,556,278,278,584,584,584,556,1015,667,667,722,722,667,611,778,722,278,500,667,556,833,722,778,667,778,722,667,611,722,667,944,667,667,611,278,278,278,469,556,333,556,556,500,556,556,278,556,556,222,222,500,222,833,556,556,556,556,333,500,278,556,500,722,500,500,500,334,260,334,584];
const HW_B=[278,333,474,556,556,889,722,238,333,333,389,584,278,333,278,278,556,556,556,556,556,556,556,556,556,556,333,333,584,584,584,611,975,722,722,722,722,667,611,778,722,278,556,722,611,833,722,778,667,778,722,667,611,722,667,944,667,667,611,333,278,333,584,556,333,556,611,556,611,556,333,611,611,278,278,556,278,889,611,611,611,611,389,556,333,611,556,778,556,556,500,389,280,389,584];
// Texte -> octets WinAnsi (Latin-1 + quelques signes). Les caractères hors Latin-1 (arabe…) deviennent « ? » et sont signalés.
function pdfEnc(s){let o='',lossy=false;s=String(s==null?'':s).replace(/[   ]/g,' ').replace(/[‘’]/g,"'").replace(/[“”]/g,'"').replace(/[–—]/g,'-').replace(/…/g,'...');
 for(const ch of s){const c=ch.codePointAt(0);if(c===0x153)o+='\x9c';else if(c===0x152)o+='\x8c';else if(c===0x20ac)o+='\x80';else if(c===10)o+='\n';else if((c>=32&&c<=126)||(c>=160&&c<=255))o+=ch;else{o+='?';lossy=true}}
 return{o,lossy}}
function pdfW(o,bold,sz){let w=0;const T=bold?HW_B:HW_R;for(const ch of o){const b=ch.normalize('NFD')[0],c=b.charCodeAt(0);w+=(c>=32&&c<=126)?T[c-32]:556}return w*sz/1000}
const pdfRgb=h=>[1,3,5].map(i=>(parseInt(h.slice(i,i+2),16)/255).toFixed(3));
const pdfFill=c=>Array.isArray(c)?c.join(' ')+' rg':(c==null?0:c)+' g';
function pdfDoc(){const pages=[];let cur=null,lossy=false,logo=null,foot='',wm=null;
 const D={
  page(){cur=[];pages.push(cur)},
  text(x,y,s,sz,b,al,col){const e=pdfEnc(s);if(e.lossy)lossy=true;const w=pdfW(e.o,b,sz),X=al==='r'?x-w:al==='c'?x-w/2:x;cur.push(`${pdfFill(col)} BT /F${b?2:1} ${sz} Tf ${X.toFixed(2)} ${y.toFixed(2)} Td (${e.o.replace(/[\\()]/g,'\\$&')}) Tj ET 0 g`)},
  rect(x,y,w,h,col){cur.push(`${pdfFill(col)} ${x.toFixed(2)} ${y.toFixed(2)} ${w.toFixed(2)} ${h.toFixed(2)} re f 0 g`)},
  frame(x,y,w,h,col,lw){cur.push(`${Array.isArray(col)?col.join(' ')+' RG':col+' G'} ${lw||0.8} w ${x.toFixed(2)} ${y.toFixed(2)} ${w.toFixed(2)} ${h.toFixed(2)} re S 0 G`)},
  line(x1,y1,x2,y2,wd,col){cur.push(`${col==null?'0 G':(Array.isArray(col)?col.join(' ')+' RG':col+' G')} ${wd||0.5} w ${x1.toFixed(2)} ${y1.toFixed(2)} m ${x2.toFixed(2)} ${y2.toFixed(2)} l S 0 G`)},
  img(x,y,w,h){cur.push(`q ${w.toFixed(2)} 0 0 ${h.toFixed(2)} ${x.toFixed(2)} ${y.toFixed(2)} cm /Im1 Do Q`)},
  setLogo(l){logo=l},setFooter(s){foot=s},setWatermark(s){wm=s},
  wrap(s,b,sz,maxW){const out=[];for(const para of String(s==null?'':s).split('\n')){let line='';for(let word of para.split(/\s+/).filter(Boolean)){while(pdfW(pdfEnc(word).o,b,sz)>maxW&&word.length>1){let k=word.length-1;while(k>1&&pdfW(pdfEnc(word.slice(0,k)).o,b,sz)>maxW)k--;if(line){out.push(line);line=''}out.push(word.slice(0,k));word=word.slice(k)}
    const tryL=line?line+' '+word:word;if(line&&pdfW(pdfEnc(tryL).o,b,sz)>maxW){out.push(line);line=word}else line=tryL}out.push(line)}return out},
  count(){return pages.length},
  build(title){const n=pages.length;
   pages.forEach((p,i)=>{cur=p;
    if(wm){const e=pdfEnc(wm).o,sz=90,w=pdfW(e,true,sz),c=0.8660,s2=0.5,cx=297.64,cy=420;p.unshift(`0.9 0.78 0.77 rg BT /F2 ${sz} Tf ${c} ${s2} ${-s2} ${c} ${(cx-(w/2)*c).toFixed(2)} ${(cy-(w/2)*s2).toFixed(2)} Tm (${e.replace(/[\\()]/g,'\\$&')}) Tj ET 0 g`)}
    if(foot){D.line(50,58,545.28,58,0.4,0.75);let fy=47;for(const l of D.wrap(foot,false,7.5,495).slice(0,2)){D.text(297.64,fy,l,7.5,false,'c',0.35);fy-=10}}
    if(n>1)D.text(297.64,24,'Page '+(i+1)+'/'+n,8,false,'c',0.35)});
   const objs=[];objs[1]='<< /Type /Catalog /Pages 2 0 R >>';objs[3]='<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>';objs[4]='<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>';
   objs[5]='<< /Title ('+pdfEnc(title).o.replace(/[\\()]/g,'\\$&')+') /Creator (Auto Manag KVES) >>';
   objs[6]=logo?`<< /Type /XObject /Subtype /Image /Width ${logo.w} /Height ${logo.h} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${logo.b.length} >>\nstream\n${logo.b}\nendstream`:'<< >>';
   const kids=[];
   pages.forEach((p,i)=>{const c=7+2*i,g=8+2*i,st=p.join('\n');objs[c]=`<< /Length ${st.length} >>\nstream\n${st}\nendstream`;objs[g]=`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595.28 841.89] /Resources << /Font << /F1 3 0 R /F2 4 0 R >>${logo?' /XObject << /Im1 6 0 R >>':''} >> /Contents ${c} 0 R >>`;kids.push(g+' 0 R')});
   objs[2]=`<< /Type /Pages /Kids [${kids.join(' ')}] /Count ${n} >>`;
   let out='%PDF-1.4\n%\xE2\xE3\xCF\xD3\n';const off=[];for(let k=1;k<objs.length;k++){off[k]=out.length;out+=`${k} 0 obj\n${objs[k]}\nendobj\n`}
   const xr=out.length;out+=`xref\n0 ${objs.length}\n0000000000 65535 f \n`+off.slice(1).map(o=>String(o).padStart(10,'0')+' 00000 n \n').join('')+`trailer\n<< /Size ${objs.length} /Root 1 0 R /Info 5 0 R >>\nstartxref\n${xr}\n%%EOF`;
   const u=new Uint8Array(out.length);for(let i=0;i<out.length;i++)u[i]=out.charCodeAt(i)&255;return{bytes:u,lossy}}};
 return D}
// Facture -> PDF (toujours en français, comme l'aperçu) : modèle moderne, couleur d'accent, logo, pied de page légal
function pdfFacture(f){const t=tf,dhx=dhxFr,fmt=fmtFr,e=f.ent,c=f.cl,D=pdfDoc(),W=595.28,H=841.89,M=50,R=W-M,AC=pdfRgb(PALETTE[e.couleur]||PALETTE.bleu),ann=f.statut==='annulee';let y;
 const lg=e.logoId&&db.logos&&db.logos[e.logoId];if(lg){const bin=atob(lg.u.split(',')[1]);D.setLogo({b:bin,w:lg.w,h:lg.h})}
 D.setFooter(invFoot(e));if(ann)D.setWatermark(t('fac.s.annulee').toUpperCase());
 const head=cont=>{D.page();y=H-M;if(cont){D.text(M,y-4,t('fac.title')+' '+t('fac.no',f.numero)+' (suite)',9,true,'l',AC);y-=22}};head();
 let yl=y-10;if(lg){const sc=Math.min(150/lg.w,60/lg.h),w=lg.w*sc,h=lg.h*sc;D.img(M,y-h+2,w,h);yl=y-h-18}
 for(const l of D.wrap(e.nom,true,13,250)){D.text(M,yl,l,13,true);yl-=16}
 const L=s=>{for(const l of D.wrap(s,false,9.5,250)){D.text(M,yl,l,9.5,false,'l',0.25);yl-=12}};
 if(e.adresse)L(e.adresse);if(e.ice)L(t('fac.ice')+' : '+e.ice);if(e.idae)L(t('fac.idae')+' : '+e.idae);if(e.tel)L(t('fac.tel')+' : '+e.tel);if(e.mail)L(t('fac.mail')+' : '+e.mail);
 D.text(R,y-14,t('fac.title'),26,true,'r',AC);let yr=y-38;const RR=(s,b,col)=>{D.text(R,yr,s,10,b,'r',col);yr-=14};
 RR(t('fac.no',f.numero),true);RR(fmt(pd(f.date)),false,0.25);if(f.echeance!==undefined)RR(t('fac.ech.l')+' : '+(f.echeance?fmt(pd(f.echeance)):t('fac.ech.0')),false,0.25);if(ann)RR(t('fac.s.annulee').toUpperCase(),true,[0.7,0.18,0.15]);
 y=Math.min(yl,yr)-8;D.rect(M,y-2.5,R-M,2.5,AC);y-=22;
 const box=[[t('fac.to'),false,8.5,0.45]];for(const l of D.wrap(c.nom,true,11,R-M-30))box.push([l,true,11,0]);if(c.adr)for(const l of D.wrap(c.adr,false,9.5,R-M-30))box.push([l,false,9.5,0.25]);if(c.ice)box.push([t('fac.ice')+' : '+c.ice,false,9.5,0.25]);
 const bh=box.length*14+12;D.rect(M,y-bh,R-M,bh,0.955);D.rect(M,y-bh,3.5,bh,AC);let by=y-18;for(const[s,b,z,col]of box){D.text(M+14,by,s,z,b,'l',col);by-=14}y-=bh+20;
 const cQ=330,cP=420,cT=R-8,th=()=>{D.rect(M,y-22,R-M,22,AC);D.text(M+8,y-15,t('fac.desc'),9.5,true,'l',1);D.text(cQ,y-15,t('fac.qty.s'),9.5,true,'r',1);D.text(cP,y-15,t('fac.pu.s'),9.5,true,'r',1);D.text(cT,y-15,t('fac.tl'),9.5,true,'r',1);y-=22};th();
 f.lignes.forEach((x,i)=>{const ls=D.wrap(x.d,false,9.5,cQ-M-60-14),h=ls.length*12+10;if(y-h<80){head(true);th()}
  if(i%2===1)D.rect(M,y-h,R-M,h,0.965);const ty=y-15;ls.forEach((l,k)=>D.text(M+8,ty-k*12,l,9.5,false));D.text(cQ,ty,qShow(x.qm),9.5,false,'r');D.text(cP,ty,dhx(x.p),9.5,false,'r');D.text(cT,ty,dhx(lineCts(x.qm,x.p)),9.5,false,'r');y-=h});
 D.line(M,y,R,y,0.6,AC);if(y<190){head(true)}y-=16;
 const bw=210;D.rect(R-bw,y-30,bw,30,AC);D.text(R-bw+12,y-19,t('fac.net'),10.5,true,'l',1);D.text(R-10,y-20,dhx(f.total),14,true,'r',1);y-=52;
 const P=(s,sz,col)=>{for(const l of D.wrap(s,false,sz||9.5,R-M)){if(y<80){head(true)}D.text(M,y,l,sz||9.5,false,'l',col==null?0.15:col);y-=13}y-=4};
 P(t('fac.words',lettres(f.total)));if(e.tva)P(e.tva);if(e.cond)P(e.cond);if(e.iban)P(t('fac.iban')+' : '+e.iban);
 if(y<150)head(true);y-=6;D.frame(R-200,y-72,200,72,0.6,0.7);D.text(R-190,y-13,t('fac.sig'),8.5,false,'l',0.45);
 return D.build(t('fac.no',f.numero)+' - '+c.nom)}
const pdfName=f=>'Facture_'+String(f.numero).replace(/[^A-Za-z0-9_-]/g,'')+'_'+(String(f.cl.nom).normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^A-Za-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,30)||'client')+'.pdf';
