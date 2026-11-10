import {test,expect} from '@playwright/test';

test('analytics initializes once and tracks client-side page transitions',async({page})=>{
 // Keep the real bootstrap and navigation; do not send test traffic to providers.
 await page.route('https://www.googletagmanager.com/**',route=>route.fulfill({body:'',contentType:'application/javascript'}));
 await page.route('https://mc.yandex.ru/**',route=>route.fulfill({body:'',contentType:'application/javascript'}));
 const calls=()=>page.evaluate(()=>{
  const analytics=window as unknown as {ym?:{a?:IArguments[]};dataLayer?:IArguments[]};
  return {yandex:(analytics.ym?.a??[]).map(call=>Array.from(call)),google:(analytics.dataLayer??[]).map(call=>Array.from(call))};
 });
 await page.goto('/');
 await expect.poll(async()=>(await calls()).yandex.filter(call=>call[1]==='init').length).toBe(1);
 expect((await calls()).yandex[0]).toEqual([114162303,'init',expect.objectContaining({ssr:true,webvisor:true,clickmap:true,ecommerce:'dataLayer',accurateTrackBounce:true,trackLinks:true})]);
 await expect(page.locator('script[src="https://www.googletagmanager.com/gtm.js?id=GTM-T4NHTDWX"]')).toHaveCount(1);
 await page.locator('footer').getByRole('link',{name:'Политика конфиденциальности',exact:true}).click();
 await expect(page).toHaveURL(/\/privacy$/);
 await expect.poll(async()=>(await calls()).yandex.filter(call=>call[1]==='hit').length).toBe(1);
 expect((await calls()).yandex.find(call=>call[1]==='hit')?.[2]).toBe('http://127.0.0.1:5203/privacy');
 await page.locator('footer').getByRole('link',{name:'Пользовательское соглашение',exact:true}).click();
 await expect(page).toHaveURL(/\/terms$/);
 await expect.poll(async()=>(await calls()).yandex.filter(call=>call[1]==='hit').length).toBe(2);
 expect((await calls()).yandex.filter(call=>call[1]==='init')).toHaveLength(1);
 expect((await calls()).google.filter(call=>call[0]==='js')).toHaveLength(1);
 await page.goBack();
 await expect(page).toHaveURL(/\/privacy$/);
 await expect.poll(async()=>(await calls()).yandex.filter(call=>call[1]==='hit').length).toBe(3);
});
