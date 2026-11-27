/* Auto Manag KVES · signé KVES · applique le thème choisi avant l'affichage (évite le clignotement). */
try{var x=localStorage.getItem('amk.theme');if(x==='light'||x==='dark')document.documentElement.dataset.theme=x}catch(e){}
try{var l=localStorage.getItem('amk.lang');if(l==='en'||l==='ar'){document.documentElement.lang=l;if(l==='ar')document.documentElement.dir='rtl'}}catch(e){}
/* V1.8.1 : refuse de s'afficher dans un cadre (anti-détournement de clic) */
try{if(window.top!==window.self){document.documentElement.hidden=true;window.top.location=window.self.location}}catch(e){document.documentElement.hidden=true}
/* V1.8.3 : styles dynamiques appliqués par le script (la CSP interdit les styles en ligne) */
(function(){var A=function(e){try{if(e.dataset.w!==undefined)e.style.width=e.dataset.w+'%';if(e.dataset.bg)e.style.background=e.dataset.bg;if(e.dataset.ac)e.style.setProperty('--ac',e.dataset.ac)}catch(x){}},
 S='[data-w],[data-bg],[data-ac]',run=function(n){if(n.nodeType!==1)return;if(n.matches(S))A(n);var l=n.querySelectorAll(S);for(var i=0;i<l.length;i++)A(l[i])};
 new MutationObserver(function(ms){for(var i=0;i<ms.length;i++)for(var j=0;j<ms[i].addedNodes.length;j++)run(ms[i].addedNodes[j])}).observe(document.documentElement,{childList:true,subtree:true})})();
