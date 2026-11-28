// KVES — encodeur de QR code hors ligne (mode octets, correction M, versions 1 à 6). Aucune bibliothèque externe.
const QR=(()=>{
 const EXP=new Uint8Array(512),LOG=new Uint8Array(256);
 {let x=1;for(let i=0;i<255;i++){EXP[i]=x;LOG[x]=i;x<<=1;if(x&256)x^=0x11d}for(let i=255;i<512;i++)EXP[i]=EXP[i-255]}
 const mul=(a,b)=>a&&b?EXP[LOG[a]+LOG[b]]:0;
 const gen=n=>{let g=[1];for(let i=0;i<n;i++){const h=new Array(g.length+1).fill(0);for(let j=0;j<g.length;j++){h[j]^=g[j];h[j+1]^=mul(g[j],EXP[i])}g=h}return g};
 const rs=(data,n)=>{const g=gen(n),r=new Array(n).fill(0);for(const d of data){const f=d^r[0];r.shift();r.push(0);for(let i=0;i<n;i++)r[i]^=mul(g[i+1],f)}return r};
 // version : [octets de correction par bloc, nombre de blocs, octets de données par bloc, positions d'alignement]
 const TAB={1:[10,1,16,[]],2:[16,1,28,[6,18]],3:[26,1,44,[6,22]],4:[18,2,32,[6,26]],5:[24,2,43,[6,30]],6:[16,4,27,[6,34]]};
 const MASKS=[(x,y)=>(x+y)%2==0,(x,y)=>y%2==0,(x,y)=>x%3==0,(x,y)=>(x+y)%3==0,(x,y)=>(Math.floor(x/3)+Math.floor(y/2))%2==0,(x,y)=>x*y%2+x*y%3==0,(x,y)=>(x*y%2+x*y%3)%2==0,(x,y)=>((x+y)%2+x*y%3)%2==0];
 const utf8=s=>Array.from(new TextEncoder().encode(s));
 function codewords(bytes){
  let v=0;for(let i=1;i<=6;i++)if(4+8+8*bytes.length<=TAB[i][1]*TAB[i][2]*8){v=i;break}
  if(!v)throw new Error('QR: texte trop long');
  const [ec,nb,dl]=TAB[v],cap=nb*dl,bits=[],put=(val,n)=>{for(let i=n-1;i>=0;i--)bits.push((val>>i)&1)};
  put(4,4);put(bytes.length,8);bytes.forEach(b=>put(b,8));
  for(let i=0;i<4&&bits.length<cap*8;i++)bits.push(0);
  while(bits.length%8)bits.push(0);
  const d=[];for(let i=0;i<bits.length;i+=8){let x=0;for(let j=0;j<8;j++)x=x*2+bits[i+j];d.push(x)}
  for(let p=0;d.length<cap;p++)d.push(p%2?0x11:0xEC);
  const blocks=[],ecs=[];for(let b=0;b<nb;b++){const part=d.slice(b*dl,(b+1)*dl);blocks.push(part);ecs.push(rs(part,ec))}
  const out=[];for(let i=0;i<dl;i++)blocks.forEach(b=>out.push(b[i]));for(let i=0;i<ec;i++)ecs.forEach(e=>out.push(e[i]));
  return {v,out};
 }
 function penalty(m){const n=m.length;let s=0;
  const runs=line=>{let r=0,i=0;while(i<n){let j=i;while(j<n&&line[j]===line[i])j++;if(j-i>=5)r+=3+(j-i-5);i=j}return r};
  for(let y=0;y<n;y++){s+=runs(m[y]);s+=runs(m.map(r=>r[y]))}
  for(let y=0;y<n-1;y++)for(let x=0;x<n-1;x++){const c=m[y][x];if(c===m[y][x+1]&&c===m[y+1][x]&&c===m[y+1][x+1])s+=3}
  const pa='10111010000',pb='00001011101';
  const pat=line=>{const t=line.map(c=>c?1:0).join('');let k=0;for(let i=0;i+11<=t.length;i++){const w=t.substr(i,11);if(w===pa||w===pb)k++}return k*40};
  for(let y=0;y<n;y++){s+=pat(m[y]);s+=pat(m.map(r=>r[y]))}
  let dark=0;m.forEach(r=>r.forEach(c=>{if(c)dark++}));const tot=n*n;s+=(Math.ceil(Math.abs(dark*20-tot*10)/tot)-1)*10;return s}
 function make(text){
  const {v,out}=codewords(utf8(text)),n=17+4*v;
  const m=Array.from({length:n},()=>new Array(n).fill(false)),f=Array.from({length:n},()=>new Array(n).fill(false));
  const setF=(x,y,val)=>{m[y][x]=val;f[y][x]=true};
  for(let i=0;i<n;i++){setF(6,i,i%2==0);setF(i,6,i%2==0)}
  const finder=(cx,cy)=>{for(let dy=-4;dy<=4;dy++)for(let dx=-4;dx<=4;dx++){const x=cx+dx,y=cy+dy;if(x<0||y<0||x>=n||y>=n)continue;const d=Math.max(Math.abs(dx),Math.abs(dy));setF(x,y,d!=2&&d!=4)}};
  finder(3,3);finder(n-4,3);finder(3,n-4);
  const ap=TAB[v][3],L=ap.length-1;
  ap.forEach((cy,i)=>ap.forEach((cx,j)=>{if((i==0&&j==0)||(i==0&&j==L)||(i==L&&j==0))return;for(let dy=-2;dy<=2;dy++)for(let dx=-2;dx<=2;dx++)setF(cx+dx,cy+dy,Math.max(Math.abs(dx),Math.abs(dy))!=1)}));
  for(let k=0;k<9;k++){f[k][8]=true;f[8][k]=true} // zones de format réservées (autour du motif en haut à gauche)
  for(let k=0;k<8;k++){f[8][n-1-k]=true;f[n-1-k][8]=true}f[n-8][8]=true;
  let i=0;const total=out.length*8;
  for(let right=n-1;right>=1;right-=2){if(right==6)right=5;for(let vert=0;vert<n;vert++)for(let j=0;j<2;j++){const x=right-j,up=((right+1)&2)==0,y=up?n-1-vert:vert;if(!f[y][x]&&i<total){m[y][x]=((out[i>>3]>>(7-(i&7)))&1)==1;i++}}}
  let best=null,bs=1e9;
  for(let k=0;k<8;k++){
   const c=m.map(r=>r.slice());
   for(let y=0;y<n;y++)for(let x=0;x<n;x++)if(!f[y][x]&&MASKS[k](x,y))c[y][x]=!c[y][x];
   const data=k;let rem=data;for(let b=0;b<10;b++)rem=(rem<<1)^((rem>>9)*0x537);const bits=((data<<10)|rem)^0x5412,bit=q=>((bits>>q)&1)==1;
   for(let b=0;b<6;b++)c[b][8]=bit(b);c[7][8]=bit(6);c[8][8]=bit(7);c[8][7]=bit(8);for(let b=9;b<15;b++)c[8][14-b]=bit(b);
   for(let b=0;b<8;b++)c[8][n-1-b]=bit(b);for(let b=8;b<15;b++)c[n-15+b][8]=bit(b);c[n-8][8]=true;
   const p=penalty(c);if(p<bs){bs=p;best=c}
  }
  return best}
 const svg=(text,dark)=>{const m=make(text),n=m.length,q=4;let d='';m.forEach((r,y)=>r.forEach((c,x)=>{if(c)d+=`M${x+q},${y+q}h1v1h-1z`}));
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${n+2*q} ${n+2*q}" shape-rendering="crispEdges" role="img"><rect width="100%" height="100%" fill="#fff"/><path d="${d}" fill="${dark||'#054571'}"/></svg>`};
 return {make,svg};
})();
