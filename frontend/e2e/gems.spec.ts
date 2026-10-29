import {test,expect} from '@playwright/test';
import {mkdirSync} from 'node:fs';
import design from '../src/data/catalog.json' with {type:'json'};
import slots from '../src/data/presentation.json' with {type:'json'};
const slug=slots.find(s=>s.slot===design.products[0].id)!.slug;
test('live three-game catalog, pagination, URL, saved items, quick view and reload',async({page})=>{
 for(const game of ['cs2','rust','tf2']){
  await page.goto(`/catalog?game=${game}`);await expect(page.locator('.product-card')).toHaveCount(24);await expect(page.locator('.product-card').first()).toHaveAttribute('data-game',game);
  await page.getByRole('button',{name:'Показать ещё'}).click();await expect.poll(()=>page.locator('.product-card').count()).toBeGreaterThan(24);
  await page.locator('.favorite-button').first().click();await page.getByRole('button',{name:'Избранное',exact:true}).click();await expect(page.locator('.product-card')).toHaveCount(1);await page.reload();await expect(page.locator('.product-card')).toHaveCount(1);
  const quick=page.locator('.product-image-button').first();await quick.click();const dialog=page.getByRole('dialog');await expect(dialog).toBeVisible();await expect(dialog).not.toContainText('СБП');await expect(dialog).not.toContainText('Карта');await page.keyboard.press('Escape');await expect(dialog).toHaveCount(0);await expect(quick).toBeFocused();
 }
});
test('category, price, name sorting and filters use server results',async({page})=>{
 await page.goto('/catalog?game=rust');await page.getByRole('button',{name:'Armor 15',exact:true}).click();await expect(page.locator('.product-card')).toHaveCount(15);await expect(page).toHaveURL(/category=rust%3AArmor/);
 await page.getByLabel('Цена до, Gems').fill('105');await expect(page.locator('.product-card')).toHaveCount(3);
 await page.getByLabel('Сортировка').selectOption('name-desc');await expect(page.locator('.product-card h3').first()).toContainText('rust item 5');
});
test('guest cart persists without preview login and migrates once with live revisions',async({page})=>{
 let authenticated=false,version=0;const products=new Map<string,unknown>();let adds=0;
 await page.route('**/api/session/me',r=>r.fulfill({status:authenticated?200:401,json:authenticated?{id:'owner',steam:{connected:true,steamId64:'76561198000000000'}}:{}}));
 await page.route('**/api/auth/steam/start*',r=>{authenticated=true;return r.fulfill({status:302,headers:{location:'/cart'}});});
 await page.route('**/api/session/csrf',r=>r.fulfill({json:{token:'csrf'}}));
 await page.route('**/api/me/steam-trade-url/status',r=>r.fulfill({json:{configured:true}}));
 const cart=()=>({version,items:[...products.values()].map(product=>({product,quantity:1})),totalCoinMinor:10000,canCheckout:true});
 await page.route('**/api/cart',r=>r.fulfill({json:cart()}));
 await page.route('**/api/cart/items/*',async r=>{const id=new URL(r.request().url()).pathname.split('/').at(-1)!;expect(r.request().postDataJSON().expectedCartVersion).toBe(version);expect(r.request().headers()['idempotency-key']).toBeTruthy();if(r.request().method()==='PUT'){adds++;products.set(id,await (await page.request.get(`/api/catalog/${id}`)).json());}else products.delete(id);version++;await r.fulfill({json:cart()});});
 await page.goto('/catalog?game=rust');await page.locator('.add-button').first().click();await expect(page.getByText('Добавлено в корзину',{exact:true})).toBeVisible();await page.goto('/cart');await expect(page.locator('.cart-item')).toHaveCount(1);await page.reload();await expect(page.locator('.cart-item')).toHaveCount(1);
 await page.getByRole('button',{name:'Войти',exact:true}).last().click();await page.getByRole('link',{name:'Войти через Steam',exact:true}).click();await expect.poll(()=>adds).toBe(1);await expect(page.locator('.cart-item')).toHaveCount(1);await page.reload();await expect(page.locator('.cart-item')).toHaveCount(1);expect(adds).toBe(1);
 await page.locator('.remove-button').click();await expect(page.locator('.cart-item')).toHaveCount(0);await page.reload();await expect(page.locator('.cart-item')).toHaveCount(0);
});
test('VV-164 text, payment controls and legacy links',async({page})=>{
 await page.goto('/');await expect(page.locator('header').getByRole('link',{name:'Каталог',exact:true})).toBeVisible();await expect(page.locator('#steam')).not.toContainText('Комиссия 5% включена');await expect(page.locator('#balance')).toContainText('Банковская карта или СБП');await expect(page.locator('#balance input[type=radio]')).toHaveCount(0);await expect(page.locator('#steam').getByLabel('Логин Steam')).toBeVisible();await expect(page.locator('#steam').getByLabel('Почта для чека')).toBeVisible();await expect(page.locator('.help-questions button')).toHaveCount(6);await page.getByRole('button',{name:'Как связаться с поддержкой?'}).click();await expect(page.locator('.help-answer')).toContainText('support@getsgems.com');
 await page.goto(`/catalog/${design.products[0].id}`);await expect(page.locator('.product-detail')).toBeVisible();await expect(page.locator('.product-detail .payment-row')).toHaveCount(0);await expect(page.locator('.product-detail')).not.toContainText('СБП');
 expect(slug).toBeTruthy();
});
for(const width of [1440,768,390,320])test(`designer surfaces and overflow ${width}`,async({page})=>{
 await page.setViewportSize({width,height:900});mkdirSync('../.local/gems-acceptance',{recursive:true});
 for(const [name,url] of [['home','/'],['catalog-cs2','/catalog?game=cs2'],['catalog-rust','/catalog?game=rust'],['catalog-tf2','/catalog?game=tf2'],['product',`/catalog/${slug}`],['cart','/cart'],['account','/account']]){
  await page.goto(url);await page.evaluate(()=>document.fonts.ready);if(name.startsWith('catalog'))await expect(page.locator('.product-card').first()).toBeVisible();
  await expect.poll(()=>page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth,overflow:[...document.querySelectorAll('main *')].filter(el=>el.getBoundingClientRect().right>innerWidth+1).slice(0,12).map(el=>({tag:el.tagName,cls:el.className,width:el.getBoundingClientRect().width,text:el.textContent?.slice(0,60)}))}))).toMatchObject({width,scroll:width});
  await page.locator('img').evaluateAll(async images=>{await Promise.all(images.map(async img=>{if(!(img instanceof HTMLImageElement))return;img.loading='eager';try{await img.decode();}catch{}}));});
  await page.screenshot({path:`../.local/gems-acceptance/${name}-${width}.png`,fullPage:true});
 }
 await page.goto('/');await page.getByRole('button',{name:/Открыть находку/}).last().click();await expect(page.getByRole('dialog')).toBeVisible();await page.getByRole('dialog').locator('img').evaluateAll(async images=>{await Promise.all(images.map(async img=>{if(img instanceof HTMLImageElement){img.loading='eager';try{await img.decode();}catch{}}}));});await page.screenshot({path:`../.local/gems-acceptance/quick-view-${width}.png`,fullPage:true});
});
test('unknown current price never falls back to a designer purchase price',async({page})=>{
 await page.route('**/api/catalog*',r=>r.fulfill({status:503,json:{message:'Unavailable'}}));await page.goto('/catalog?game=tf2');await expect(page.getByText('Не удалось загрузить каталог. Попробуйте ещё раз.')).toBeVisible();await expect(page.locator('.product-card')).toHaveCount(0);
});
