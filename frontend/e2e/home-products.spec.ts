import {test,expect,type Page} from '@playwright/test';
import {mkdirSync} from 'node:fs';

test.afterEach(async({request})=>{await request.post('http://127.0.0.1:5204/__test/catalog-mode',{data:{mode:'normal'}});});

async function assertImages(page:Page){
 const images=page.locator('.hero-find img');
 await expect.poll(()=>images.evaluateAll(nodes=>nodes.every(node=>node instanceof HTMLImageElement&&node.complete&&node.naturalWidth>0))).toBe(true);
}

for(const width of [1440,768,390,320]){
 test(`collection replacements open the matching product ${width}`,async({page,request})=>{
  await request.post('http://127.0.0.1:5204/__test/catalog-mode',{data:{mode:'replacements'}});
  await page.setViewportSize({width,height:900});
  for(const [index,category] of ['knife','pistol','rifle'].entries()){
   await page.goto('/');const choice=page.locator('.collection-choices button').nth(index);
   await choice.click();await expect(choice).toHaveAttribute('aria-pressed','true');
   const details=page.locator('.collection-details');
   await expect(details.getByRole('link',{name:'Подробнее о скине'})).toHaveAttribute('href',`/catalog/replacement-${category}`);
   await page.locator('.collection-object').click();await expect(page.getByRole('dialog')).toBeVisible();
   await expect(page.getByRole('dialog').getByRole('link',{name:'Подробнее о предмете'})).toHaveAttribute('href',`/catalog/replacement-${category}`);
   await page.keyboard.press('Escape');await expect(page.locator('.collection-object')).toBeFocused();
   await details.getByRole('link',{name:'Подробнее о скине'}).click();await expect(page.locator('.product-detail')).toBeVisible();
  }
  await page.goto('/');await page.locator('.collection-details').getByRole('button',{name:'В корзину',exact:true}).click();
  await page.locator('.collection-details').getByRole('link',{name:'Перейти в корзину',exact:true}).click();
  await expect(page.locator('.cart-item')).toHaveCount(1);await page.reload();await expect(page.locator('.cart-item')).toHaveCount(1);
 });
 test(`home replacements navigate, add to cart and keep layout ${width}`,async({page,request})=>{
  await request.post('http://127.0.0.1:5204/__test/catalog-mode',{data:{mode:'replacements'}});
  await page.setViewportSize({width,height:900});
  for(const [index,category] of ['rifle','pistol','knife'].entries()){
   await page.goto('/');
   const cards=page.locator('.hero-find');await expect(cards).toHaveCount(3);
   await expect(page.locator('.hero-deck')).not.toContainText('Недоступен');
   await assertImages(page);
   // The deck intentionally overlaps; use its visible '+' affordance.
   const card=cards.nth(index);await card.locator('.find-label').click();
   const dialog=page.getByRole('dialog');await expect(dialog).toBeVisible();
   await expect(dialog.getByRole('link',{name:'Подробнее о предмете'})).toHaveAttribute('href',`/catalog/replacement-${category}`);
   await page.keyboard.press('Escape');await expect(dialog).toHaveCount(0);await expect(card).toBeFocused();
   await page.keyboard.press('Enter');await expect(dialog).toBeVisible();
   await dialog.getByRole('link',{name:'Подробнее о предмете'}).click();
   await expect(page).toHaveURL(new RegExp(`/catalog/replacement-${category}$`));
   await expect(page.locator('.product-detail')).toBeVisible();
  }
  await page.goto('/');await page.evaluate(()=>document.fonts.ready);await assertImages(page);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBe(width);
  mkdirSync('../.local/home-skins/after',{recursive:true});
  await page.screenshot({path:`../.local/home-skins/after/replacements-${width}.png`});
  await page.locator('.hero-find').last().click();
  await page.getByRole('dialog').getByRole('button',{name:'В корзину',exact:true}).click();
  await page.getByRole('dialog').getByRole('link',{name:'Перейти в корзину',exact:true}).click();
  await expect(page.locator('.cart-item')).toHaveCount(1);await page.reload();await expect(page.locator('.cart-item')).toHaveCount(1);
  await page.locator('.remove-button').click();await expect(page.locator('.cart-item')).toHaveCount(0);
 });
 for(const mode of ['partial','empty','offline'])test(`home ${mode} has no synthetic cards ${width}`,async({page,request})=>{
  await request.post('http://127.0.0.1:5204/__test/catalog-mode',{data:{mode}});
  await page.setViewportSize({width,height:900});await page.goto('/');
  await expect(page.locator('.hero-find')).toHaveCount(mode==='partial'?2:0);
  await expect(page.locator('.collection-choices button')).toHaveCount(mode==='partial'?2:0);
  await expect(page.getByRole('link',{name:'Исследовать коллекцию'})).toBeVisible();
  await expect(page.locator('.hero-deck')).not.toContainText('Недоступен');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBe(width);
  if(mode==='partial')await assertImages(page);
 });
}

for(const mode of ['normal','lookup-failure','page-failure','preferred-unavailable'])test(`home tolerates ${mode}`,async({page,request})=>{
 await request.post('http://127.0.0.1:5204/__test/catalog-mode',{data:{mode}});await page.goto('/');
 await expect(page.locator('.hero-find')).toHaveCount(3);await expect(page.locator('.hero-deck')).not.toContainText('Недоступен');
 await assertImages(page);
 await page.locator('.hero-find').last().click();
 await expect(page.getByRole('dialog').getByRole('button',{name:'В корзину',exact:true})).toBeEnabled();
 await page.getByRole('dialog').getByRole('link',{name:'Подробнее о предмете'}).click();
 await expect(page.locator('.product-detail')).toBeVisible();
});
