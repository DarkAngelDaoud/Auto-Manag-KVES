// Attend qu'une condition devienne vraie en l'interrogeant depuis le test (page.evaluate).
// Remplace page.waitForFunction, qui échoue sous la politique de sécurité stricte de l'appli (script-src 'self') avec certaines versions de Playwright.
module.exports=async(P,fn,arg,o)=>{const end=Date.now()+((o&&o.timeout)||30000);for(;;){let v=false;try{v=await P.evaluate(fn,arg)}catch{}if(v)return v;if(Date.now()>end)throw new Error('délai dépassé');await new Promise(r=>setTimeout(r,100))}};
