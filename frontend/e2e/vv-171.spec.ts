import {test,expect} from '@playwright/test';

test.afterEach(async({request})=>{await request.post('http://127.0.0.1:5204/__test/catalog-mode',{data:{mode:'normal'}});});

test('comparison recovers from an empty server catalog with a scoped request and truthful loading',async({page,request})=>{
 const data=await (await request.get('http://127.0.0.1:5204/catalog?game=cs2&weapon=AK-47&limit=60')).json();
 expect(data.items.length).toBeGreaterThanOrEqual(2);
 await request.post('http://127.0.0.1:5204/__test/catalog-mode',{data:{mode:'empty'}});
 let release!:()=>void;const gate=new Promise<void>(resolve=>{release=resolve;});let weapon:string|null=null;
 await page.route('**/api/catalog**',async route=>{
  const url=new URL(route.request().url());if(!url.searchParams.has('weapon'))return route.continue();
  weapon=url.searchParams.get('weapon');await gate;await route.fulfill({json:{items:data.items}});
 });
 await page.goto('/');const compare=page.locator('#compare');
 try{await expect.poll(()=>weapon).toBe('AK-47');await expect(compare).toContainText('Загружаем варианты');await expect(compare).not.toContainText('Недостаточно');}finally{release();}
 await expect(compare.getByRole('table')).toBeVisible();
 await expect(compare.getByLabel('Первый скин')).not.toHaveValue(await compare.getByLabel('Второй скин').inputValue());
});

test('comparison error is retryable without discarding an existing pair',async({page})=>{
 let fail=true;
 await page.route('**/api/catalog**',route=>new URL(route.request().url()).searchParams.has('weapon')&&fail?route.fulfill({status:503,json:{}}):route.continue());
 await page.goto('/');const compare=page.locator('#compare');
 await expect(compare.getByRole('table')).toBeVisible();await expect(compare.getByRole('button',{name:'Повторить'})).toBeVisible();
 fail=false;await compare.getByRole('button',{name:'Повторить'}).click();await expect(compare.getByRole('button',{name:'Повторить'})).toHaveCount(0);await expect(compare.getByRole('table')).toBeVisible();
});

test('budget uses filtered item-only requests, retries errors and never exceeds the RUB ceiling',async({page})=>{
 const requests:URL[]=[];let fail=true;
 await page.route('**/api/catalog**',route=>{const url=new URL(route.request().url());if(!url.searchParams.has('max'))return route.continue();requests.push(url);return fail?route.fulfill({status:503,json:{}}):route.continue();});
 await page.goto('/');const budget=page.locator('#budget');
 await expect(budget.getByRole('button',{name:'Повторить'})).toBeVisible();
 fail=false;await budget.getByRole('button',{name:'Повторить'}).click();await expect(budget.locator('.product-card').first()).toBeVisible();
 await budget.getByRole('button',{name:'Пистолеты',exact:true}).click();await budget.getByLabel('Мой предел').fill('5000');
 await expect.poll(()=>requests.at(-1)?.searchParams.get('max')).toBe('10000');
 await expect.poll(()=>requests.at(-1)?.searchParams.get('categoryId')).toBe('pistol');
 expect(requests.every(url=>url.pathname==='/api/catalog/preview')).toBe(true);
 await expect(budget.locator('.product-card').first()).toBeVisible();
 const amounts=await budget.locator('.price-main').allTextContents();expect(amounts.length).toBeGreaterThan(0);
 for(const amount of amounts)expect(Number(amount.replace(/[^\d,]/g,'').replace(',','.'))).toBeLessThanOrEqual(10000);
 await budget.getByLabel('Мой предел').fill('');await expect(budget).toContainText('Введи бюджет');await expect(budget.locator('.product-card')).toHaveCount(0);
});

test('collection favorite appears in saved catalog and persists across reload',async({page})=>{
 await page.goto('/');const favorite=page.locator('.collection-save');await expect(favorite).toHaveAttribute('aria-pressed','false');
 const productHref=await page.locator('.collection-details').getByRole('link',{name:'Подробнее о скине'}).getAttribute('href');
 await favorite.click();await expect(favorite).toHaveAttribute('aria-pressed','true');
 await page.locator('header').getByRole('link',{name:'Избранное',exact:true}).click();await expect(page.locator('.product-card')).toHaveCount(1);
 await expect(page.locator('.product-card h3 a')).toHaveAttribute('href',productHref!);await page.reload();await expect(page.locator('.product-card')).toHaveCount(1);
 await page.locator('.favorite-button').click();await expect(page.locator('.product-card')).toHaveCount(0);await page.reload();await expect(page.locator('.product-card')).toHaveCount(0);
});

for(const width of [1440,768,390,320])test(`VV-171 converter, Steam-only login and empty cart ${width}`,async({page})=>{
 await page.setViewportSize({width,height:900});await page.goto('/');
 await expect.soft(page.locator('.convert-icon svg')).toHaveCSS('color','rgb(0, 0, 0)');
 await page.locator('header').getByRole('button',{name:'Войти',exact:true}).click();const dialog=page.getByRole('dialog');
 await expect(dialog.getByRole('link',{name:'Войти через Steam'})).toBeVisible();await expect.soft(dialog.getByRole('button',{name:'Войти по почте'})).toHaveCount(0);
 await page.screenshot({path:`../.local/vv171-login-${width}.png`});await page.keyboard.press('Escape');
 await page.goto('/cart');await expect.soft(page.locator('.empty-basket').getByRole('link',{name:'Каталог',exact:true})).toBeVisible();await expect(page.locator('.empty-basket')).not.toContainText('Каталог CS2');
});

for(const width of [1440,390])test(`email confirmation separates input and submit ${width}`,async({page})=>{
 await page.setViewportSize({width,height:900});
 await page.route('**/api/session/me',r=>r.fulfill({json:{id:'owner',steam:{connected:true,steamId64:'76561198000000000'},email:{address:'owner@example.test',verified:false}}}));
 await page.route('**/api/me/steam-trade-url/status',r=>r.fulfill({json:{configured:true}}));
 await page.route('**/api/cart',r=>r.fulfill({json:{version:0,items:[],totalCoinMinor:0,canCheckout:false}}));
 await page.goto('/account');await page.locator('.contact-panel').getByRole('button',{name:/Подтвердить почту/}).click();
 const dialog=page.getByRole('dialog');await expect(dialog.getByRole('heading',{name:'Подтверждение почты'})).toBeVisible();
 const input=await dialog.getByLabel('Электронная почта').boundingBox(),button=await dialog.getByRole('button',{name:'Получить код'}).boundingBox();
 expect(button!.y-(input!.y+input!.height)).toBeGreaterThanOrEqual(16);
 await page.screenshot({path:`../.local/vv171-email-${width}.png`});
});

test('disabled Steam payment does not claim preparation is in progress',async({page})=>{
 await page.route('**/api/storefront/config',r=>r.fulfill({json:{capabilities:{guestSteamRefillEnabled:false,steamRefillEnabled:false,walletTopUpEnabled:false,checkoutEnabled:false}}}));
 await page.goto('/');await expect(page.locator('#steam').getByRole('button',{name:'Пополнение недоступно',exact:true})).toBeDisabled();
 await expect(page.locator('#steam')).not.toContainText('Подготовка оплаты');
});

test('comparison keeps weapon selection when the selected weapon has too few skins',async({page})=>{
 await page.route('**/api/catalog/preview?**',route=>new URL(route.request().url()).searchParams.get('weapon')==='Glock-18'?route.fulfill({json:{items:[]}}):route.continue());
 await page.goto('/');const compare=page.locator('#compare');
 await expect(compare.getByRole('table')).toBeVisible();await compare.getByLabel('Оружие',{exact:true}).selectOption('Glock-18');
 await expect(compare).toContainText('Недостаточно предметов');
 await expect(compare.getByLabel('Оружие',{exact:true})).toBeVisible();
 await compare.getByLabel('Оружие',{exact:true}).selectOption('AK-47');await expect(compare.getByRole('table')).toBeVisible();
});

test('budget loading and late responses never masquerade as an empty or current result',async({page,request})=>{
 const data=await(await request.get('http://127.0.0.1:5204/catalog?game=cs2&categoryId=pistol&status=available&limit=6')).json();
 let release!:()=>void;const gate=new Promise<void>(resolve=>{release=resolve;});let started=false;
 await page.route('**/api/catalog/preview?**',async route=>{const url=new URL(route.request().url());if(!url.searchParams.has('max'))return route.continue();if(url.searchParams.get('categoryId')==='pistol')return route.fulfill({json:{items:data.items}});started=true;await gate;await route.fulfill({json:{items:[]}});});
 await page.goto('/');const budget=page.locator('#budget');
 try{
  await expect.poll(()=>started).toBe(true);await expect(budget).toContainText('Ищем предметы');await expect.soft(budget).not.toContainText('Попробуй изменить сумму');
  await budget.getByRole('button',{name:'Пистолеты',exact:true}).click();await expect(budget.locator('.product-card').first()).toBeVisible();
 }finally{release();}
 await expect(budget.locator('.product-card')).toHaveCount(data.items.length);await expect(budget.getByRole('button',{name:'Пистолеты',exact:true})).toHaveAttribute('aria-pressed','true');
});

test('comparison renders its first page before the next page completes and includes later choices',async({page,request})=>{
 const data=await(await request.get('http://127.0.0.1:5204/catalog?game=cs2&weapon=AK-47&limit=60')).json();
 const items=Array.from({length:61},(_,i)=>({...data.items[0],id:`paged-${i}`,slug:`paged-${i}`,title:`AK-47 | Coverage ${i}`,marketHashName:`AK-47 | Coverage ${i}`}));
 let release!:()=>void;const gate=new Promise<void>(resolve=>{release=resolve;});let next=false;
 await page.route('**/api/catalog/preview?**',async route=>{const url=new URL(route.request().url());if(!url.searchParams.has('weapon'))return route.continue();const offset=Number(url.searchParams.get('offset'));if(offset){next=true;await gate;}await route.fulfill({json:{items:items.slice(offset,offset+60)}});});
 await page.goto('/');const compare=page.locator('#compare');
 try{await expect.poll(()=>next).toBe(true);await expect(compare.getByRole('table')).toBeVisible();await expect(compare.getByLabel('Первый скин').locator('option')).toHaveCount(60);}finally{release();}
 await expect(compare.getByLabel('Первый скин').locator('option')).toHaveCount(61);await compare.getByLabel('Первый скин').selectOption('paged-60');await expect(compare.getByLabel('Первый скин')).toHaveValue('paged-60');await expect(compare.getByLabel('Второй скин')).not.toHaveValue('paged-60');
});

test('budget presets and slider consistently convert RUB into Gems',async({page})=>{
 const maxima:string[]=[];await page.route('**/api/catalog/preview?**',route=>{const max=new URL(route.request().url()).searchParams.get('max');if(max)maxima.push(max);return route.continue();});
 await page.goto('/');const budget=page.locator('#budget');
 for(const rub of [5000,10000,25000,50000]){
  await budget.getByRole('group',{name:'Быстрые суммы'}).getByRole('button',{name:new RegExp('^'+String(rub/1000)+'\\s*000')}).click();
  await expect.poll(()=>maxima.at(-1)).toBe(String(rub*2));
 }
 await budget.getByLabel('Лимит в рублях').focus();await page.keyboard.press('Home');await expect.poll(()=>maxima.at(-1)).toBe('1000');
 await budget.getByLabel('Мой предел').fill('-1');await expect(budget.getByLabel('Мой предел')).toHaveAttribute('aria-invalid','true');await expect(budget.locator('.product-card')).toHaveCount(0);
});

test('comparison discovers other weapons independently of empty SSR',async({page,request})=>{
 const data=await(await request.get('http://127.0.0.1:5204/catalog?game=cs2&weapon=Glock-18&limit=60')).json();expect(data.items.length).toBeGreaterThanOrEqual(2);
 await request.post('http://127.0.0.1:5204/__test/catalog-mode',{data:{mode:'empty'}});
 await page.route('**/api/catalog/comparison-weapons',r=>r.fulfill({json:{weapons:['AK-47','Glock-18']}}));
 await page.route('**/api/catalog/preview?**',r=>new URL(r.request().url()).searchParams.get('weapon')==='Glock-18'?r.fulfill({json:{items:data.items}}):r.continue());
 await page.goto('/');const compare=page.locator('#compare');await expect(compare.getByLabel('Оружие',{exact:true}).locator('option',{hasText:'Glock-18'})).toHaveCount(1);
 await compare.getByLabel('Оружие',{exact:true}).selectOption('Glock-18');await expect(compare.getByRole('table')).toBeVisible();
 await page.route('**/api/catalog/comparison-weapons',r=>r.fulfill({status:503,json:{}}));await page.evaluate(()=>window.dispatchEvent(new Event('focus')));
 await expect(compare.getByRole('button',{name:'Повторить'})).toBeVisible();await expect(compare.getByLabel('Оружие',{exact:true})).toHaveValue('Glock-18');
});

test('comparison retry preserves a client-only pair even when the retry fails immediately',async({page,request})=>{
 const data=await(await request.get('http://127.0.0.1:5204/catalog?game=cs2&weapon=AK-47&limit=60')).json();
 const items=Array.from({length:60},(_,i)=>({...data.items[0],id:`retained-${i}`,slug:`retained-${i}`,title:`AK-47 | Retained ${i}`,marketHashName:`AK-47 | Retained ${i}`}));
 await request.post('http://127.0.0.1:5204/__test/catalog-mode',{data:{mode:'empty'}});let retry=false;
 await page.route('**/api/catalog/preview?**',r=>{const url=new URL(r.request().url());if(!url.searchParams.has('weapon'))return r.continue();return retry||Number(url.searchParams.get('offset'))>0?r.fulfill({status:503,json:{}}):r.fulfill({json:{items}});});
 await page.goto('/');const compare=page.locator('#compare');await expect(compare.getByRole('table')).toBeVisible();await compare.getByLabel('Первый скин').selectOption('retained-5');await expect(compare.getByRole('button',{name:'Повторить'})).toBeVisible();
 retry=true;await compare.getByRole('button',{name:'Повторить'}).click();await expect(compare.getByRole('table')).toBeVisible();await expect(compare.getByRole('button',{name:'Повторить'})).toBeVisible();await expect(compare.getByLabel('Первый скин')).toHaveValue('retained-5');
});

test('late previous weapon response cannot replace the current comparison',async({page,request})=>{
 const ak=await(await request.get('http://127.0.0.1:5204/catalog?game=cs2&weapon=AK-47&limit=60')).json();
 let release!:()=>void;const gate=new Promise<void>(resolve=>{release=resolve;});let started=false;
 await page.route('**/api/catalog/preview?**',async r=>{if(new URL(r.request().url()).searchParams.get('weapon')!=='AK-47')return r.continue();started=true;await gate;await r.fulfill({json:{items:ak.items}});});
 await page.goto('/');const compare=page.locator('#compare');
 try{await expect.poll(()=>started).toBe(true);await compare.getByLabel('Оружие',{exact:true}).selectOption('Glock-18');await expect(compare.getByRole('table')).toBeVisible();await expect(compare.getByLabel('Первый скин')).not.toHaveValue(ak.items[0].slug);}finally{release();}
 await expect(compare.getByLabel('Оружие',{exact:true})).toHaveValue('Glock-18');await expect(compare.getByLabel('Первый скин')).not.toHaveValue(ak.items[0].slug);
});

test('comparison timeout leaves loading and permits recovery',async({page,request})=>{
 const ak=await(await request.get('http://127.0.0.1:5204/catalog?game=cs2&weapon=AK-47&limit=60')).json();await request.post('http://127.0.0.1:5204/__test/catalog-mode',{data:{mode:'empty'}});
 let release!:()=>void;const gate=new Promise<void>(resolve=>{release=resolve;});let first=true;
 await page.route('**/api/catalog/preview?**',async r=>{if(!new URL(r.request().url()).searchParams.has('weapon'))return r.continue();if(first){first=false;await gate;}await r.fulfill({json:{items:ak.items}});});
 await page.goto('/');const compare=page.locator('#compare');
 try{await expect(compare).toContainText('Не удалось загрузить варианты',{timeout:15000});await compare.getByRole('button',{name:'Повторить'}).click();await expect(compare.getByRole('table')).toBeVisible();}finally{release();}
});
