import {chromium} from '@playwright/test';
import {mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
const output=resolve('../.local/designer-baseline');mkdirSync(output,{recursive:true});
const catalog=JSON.parse(readFileSync('src/data/catalog.json','utf8'));
const product=catalog.products[0];
const browser=await chromium.launch({channel:'chrome'});
try{
 for(const [width,height] of [[1440,900],[768,1024],[390,844],[320,780]]){
  const page=await browser.newPage({viewport:{width,height},reducedMotion:'reduce'});
  await page.addInitScript(({id})=>{localStorage.setItem('gems:cart',JSON.stringify([id]));localStorage.setItem('gems:preview-login','1');},{id:product.id});
  for(const [name,path] of [['home','/'],['cs2','/catalog?game=cs2'],['rust','/catalog?game=rust'],['tf2','/catalog?game=tf2'],['product','/catalog/'+product.id],['cart','/cart'],['account','/account']]){
   await page.goto('http://127.0.0.1:5201'+path,{waitUntil:'networkidle'});
   await page.evaluate(()=>document.fonts.ready);
   await page.screenshot({path:resolve(output,`${name}-${width}.png`),fullPage:true});
  }
  await page.goto('http://127.0.0.1:5201/');
  await page.getByRole('button',{name:/Открыть находку/}).last().click();
  await page.screenshot({path:resolve(output,`quick-view-${width}.png`),fullPage:true});
  await page.close();
 }
 writeFileSync(resolve(output,'provenance.json'),JSON.stringify({source:'2164d29 before commerce',platform:process.platform,browser:browser.version()},null,2));
 console.log('Captured 32 designer baseline screenshots');
}finally{await browser.close();}
