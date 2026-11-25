/* Auto Manag KVES · signé KVES · applique le thème choisi avant l'affichage (évite le clignotement). */
try{var x=localStorage.getItem('amk.theme');if(x==='light'||x==='dark')document.documentElement.dataset.theme=x}catch(e){}
try{var l=localStorage.getItem('amk.lang');if(l==='en'||l==='ar'){document.documentElement.lang=l;if(l==='ar')document.documentElement.dir='rtl'}}catch(e){}
