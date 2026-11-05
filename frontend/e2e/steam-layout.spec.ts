import {test,expect} from '@playwright/test';

for(const width of [1440,768,390,320])test(`Steam email field does not overlap its label or hint at ${width}px`,async({page})=>{
 await page.setViewportSize({width,height:1000});
 await page.goto('/#steam');
 const panel=page.locator('#steam');
 const email=panel.getByLabel('Почта для чека');
 const label=panel.locator('label').filter({hasText:'Почта для чека'});
 const hint=panel.getByText('Подтвердите эту почту', {exact:false});
 await expect(email).toBeVisible();
 await email.fill('buyer@example.test');
 const inputBox=await email.boundingBox(),labelBox=await label.boundingBox(),hintBox=await hint.boundingBox();
 expect(inputBox!.y).toBeGreaterThanOrEqual(labelBox!.y+labelBox!.height);
 expect(hintBox!.y).toBeGreaterThanOrEqual(inputBox!.y+inputBox!.height);
 const total=await panel.locator('.topup-total').boundingBox();
 expect(total!.y).toBeGreaterThanOrEqual(hintBox!.y+hintBox!.height);
 expect(await email.evaluate(el=>getComputedStyle(el).backgroundColor)).toBe('rgba(0, 0, 0, 0)');
 await expect(email).toHaveValue('buyer@example.test');
 await panel.screenshot({path:`../.local/steam-layout-${width}.png`});
});
