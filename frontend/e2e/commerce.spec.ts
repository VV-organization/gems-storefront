import {test,expect,type Locator,type Page} from '@playwright/test';
import {mkdirSync} from 'node:fs';
async function settled(target:Locator){await target.scrollIntoViewIfNeeded();await expect.poll(()=>target.evaluate(el=>{let node:Element|null=el;while(node){if(node.getAnimations().some(a=>a.id.startsWith('gems-enter:')))return false;node=node.parentElement;}return true;})).toBe(true);await target.click();}
const sessionId='11111111-1111-4111-8111-111111111111';
const product={id:'knife',slug:'knife',kind:'skins',category:'Ножи',categoryId:'knife',game:'cs2',productType:'Нож',title:'Huntsman Knife | Damascus Steel',description:'',condition:'FN',weapon:'Huntsman Knife',stattrak:false,marketHashName:'knife',priceRevision:'r1',pricingSettingId:'p1',price:{currency:'COINS',amountMinor:25001,scale:2,display:'250,01'},availability:'available',fulfillmentMode:'steam-trade',createdAt:new Date().toISOString(),popularity:1,meta:[],keywords:[],details:{specifications:[],fulfillment:{title:'Steam',description:'',requirements:[]}}};
async function fixture(page:Page){
 const state={present:true,failCheckout:false,checkoutKeys:[] as string[],checkoutBodies:[] as unknown[],brokenSession:false,available:10000,held:90000,trade:true,fulfillment:'pending',checkoutCalls:0,paymentCalls:0,failSession:false,keys:[] as string[],bodies:[] as unknown[]};
 await page.route('**/api/**',async route=>{
  const path=new URL(route.request().url()).pathname.replace(/^\/api/,'');const body=()=>route.request().postDataJSON();const send=(data:unknown,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(data)});
  if(path==='/session/me')return send({id:'owner',steam:{connected:true,steamId64:'76561198000000000'},email:{address:'owner@example.test',verified:true}});
  if(path==='/session/csrf')return send({token:'csrf'});
  if(path==='/storefront/config')return send({paymentMethods:['sbp'],capabilities:{checkoutEnabled:true,walletTopUpEnabled:true,steamRefillEnabled:true}});
  if(path==='/wallet/me')return send({postedCoinMinor:state.available+state.held,availableCoinMinor:state.available,heldCoinMinor:state.held});
  if(path==='/me/steam-trade-url/status')return send({configured:state.trade});
  if(path==='/me/steam-trade-url'){state.trade=true;return send({configured:true});}
  if(path==='/cart')return send({version:1,items:state.present?[{product,quantity:1,availability:'available'}]:[],totalCoinMinor:25001,canCheckout:true});
  if(path==='/checkout/quotes')return send({id:'checkout-quote',expiresAt:new Date(Date.now()+60000).toISOString(),cartVersion:1,items:[product],totalCoinMinor:25001,totalRubMinor:12501,recipient:{steamId64:'76561198000000000',partner:'1'}});
  if(path==='/checkout/cart'){state.checkoutCalls++;state.checkoutKeys.push(route.request().headers()['idempotency-key']);state.checkoutBodies.push(body());state.present=false;if(state.failCheckout)return route.abort('failed');return send({id:'order'});}
  if(path==='/orders/me')return send({orders:[]});
  if(path==='/wallet/me/transactions')return send({transactions:[]});
  if(path==='/payments/me/history')return send({payments:[]});
  if(path==='/payments/top-up/quotes')return send({quoteId:crypto.randomUUID(),purpose:'wallet_topup',coinAmountMinor:body().coinAmountMinor,fiatAmountMinor:Math.ceil(body().coinAmountMinor/2),currency:'RUB',termsVersion:'v1',expiresAt:new Date(Date.now()+60000).toISOString()});
  if(path==='/payments/top-up/sessions'){state.paymentCalls++;state.keys.push(route.request().headers()['idempotency-key']);state.bodies.push(body());if(state.failSession)return route.abort('failed');if(state.brokenSession)return route.fulfill({status:200,body:'{broken'});return send({id:sessionId,checkoutUrl:null});}
  if(path===`/payments/sessions/${sessionId}`||path===`/payments/sessions/${sessionId}/check`)return send({id:sessionId,canPay:false,purpose:'steam_refill',paymentStatus:'paid',fulfillmentStatus:state.fulfillment,fiatAmountMinor:105000,steamLogin:'player',checkoutUrl:null,refundStatus:null});
  return send({},404);
 });return state;
}
for(const width of [1440,390])test(`available balance shortfall and explicit purchase ${width}`,async({page})=>{
 await page.setViewportSize({width,height:900});const state=await fixture(page);await page.goto('http://127.0.0.1:5203/cart');
 await expect(page.locator('.order-summary')).toContainText('100');await expect(page.getByRole('button',{name:/Не хватает 150,01 Gems/})).toBeDisabled();
 await expect(page.getByRole('radio')).toHaveCount(0);await expect(page.locator('.cart-page')).not.toContainText('СБП');
 await settled(page.getByRole('link',{name:'Пополнить баланс',exact:true}));await expect(page).toHaveURL(/amount=151/);
 await expect(page.getByLabel('Сколько Gems зачислить')).toHaveValue('151');expect(state.checkoutCalls).toBe(0);
 state.available=30000;await settled(page.getByRole('link',{name:'Продолжить покупку',exact:true}));await expect(page.getByRole('button',{name:'Оплатить Gems',exact:true})).toBeEnabled();expect(state.checkoutCalls).toBe(0);
 await settled(page.getByRole('button',{name:'Оплатить Gems',exact:true}));await expect(page).toHaveURL(/tab=orders/);expect(state.checkoutCalls).toBe(1);
});
test('unknown payment creation survives reload with exact original command',async({page})=>{
 const state=await fixture(page);state.failSession=true;await page.goto('http://127.0.0.1:5203/account?tab=balance&amount=151');
 await settled(page.locator('form').getByRole('button',{name:'Пополнить баланс',exact:true}));await expect(page.getByText(/Результат запроса пока неизвестен/)).toBeVisible();
 await page.reload();state.failSession=false;await settled(page.getByRole('button',{name:'Проверить результат запроса',exact:true}));await expect(page).toHaveURL(/payments\/return/);
 expect(state.paymentCalls).toBe(2);expect(state.keys[0]).toBe(state.keys[1]);expect(state.bodies[0]).toEqual(state.bodies[1]);
 await page.goto('http://127.0.0.1:5203/account?tab=balance');await settled(page.locator('form').getByRole('button',{name:'Пополнить баланс',exact:true}));await expect(page).toHaveURL(/payments\/return/);expect(state.paymentCalls).toBe(3);expect(state.keys[2]).not.toBe(state.keys[1]);
});
test('paid Steam is pending; callback query cannot declare delivery',async({page})=>{
 const state=await fixture(page);await page.goto(`http://127.0.0.1:5203/payments/return?session=${sessionId}&payment=success`);
 await expect(page.getByRole('heading',{name:'Оплата получена. Пополнение Steam выполняется.'})).toBeVisible();expect(state.paymentCalls).toBe(0);
 state.fulfillment='delivered';await settled(page.getByRole('button',{name:'Обновить статус'}));await expect(page.getByRole('heading',{name:'Баланс Steam пополнен'})).toBeVisible();expect(state.paymentCalls).toBe(0);
});
test('trade URL saves and returns to the preserved cart',async({page})=>{
 const state=await fixture(page);state.trade=false;await page.goto('http://127.0.0.1:5203/cart');await settled(page.getByRole('link',{name:'Добавить trade-URL'}));
 await page.getByLabel('Ссылка на обмен Steam').fill('https://steamcommunity.com/tradeoffer/new/?partner=39734272&token=abcdefgh');await settled(page.getByRole('button',{name:'Сохранить',exact:true}));
 await settled(page.getByRole('link',{name:'Продолжить покупку',exact:true}));await expect(page).toHaveURL(/\/cart$/);await expect(page.getByText('Trade-URL сохранён. Его можно изменить в кабинете.')).toBeVisible();
});
test('guest Steam needs contact email, no sign-in or OTP; unknown creation survives reload',async({page})=>{
 await fixture(page);let walletReads=0,authCalls=0,fail=true;const keys:string[]=[],bodies:unknown[]=[];
 await page.route('**/api/session/me',route=>route.fulfill({status:401,body:'{}'}));
 await page.route('**/api/storefront/config',route=>route.fulfill({json:{capabilities:{guestSteamRefillEnabled:true,steamRefillEnabled:true,walletTopUpEnabled:true}}}));
 await page.route('**/api/wallet/me',route=>{walletReads++;return route.fulfill({status:401,body:'{}'});});
 await page.route('**/api/auth/email/**',route=>{authCalls++;return route.fulfill({status:400,body:'{}'});});
 await page.route('**/api/payments/guest/context',route=>route.fulfill({status:201,json:{id:'guest-context',csrfToken:'guest-csrf'}}));
 await page.route('**/api/payments/guest/steam-refill/quotes',route=>{expect(route.request().headers()['x-csrf-token']).toBe('guest-csrf');expect(route.request().postDataJSON()).toEqual({steamLogin:'receiver-login',amountRub:500,email:'buyer@example.test'});return route.fulfill({json:{quoteId:'steam-quote',expiresAt:new Date(Date.now()+60000).toISOString(),fiatAmountMinor:52500,feeRubMinor:2500,steamLogin:'receiver-login'}});});
 await page.route('**/api/payments/guest/steam-refill/sessions',route=>{keys.push(route.request().headers()['idempotency-key']);bodies.push(route.request().postDataJSON());return fail?route.abort('failed'):route.fulfill({json:{id:sessionId,checkoutUrl:null}});});
 await page.route(`**/api/payments/sessions/${sessionId}`,route=>route.fulfill({status:401,body:'{}'}));
 await page.route(`**/api/payments/guest/steam-refill/sessions/${sessionId}`,route=>route.fulfill({json:{id:sessionId,canPay:false,purpose:'steam_refill',paymentStatus:'paid',fulfillmentStatus:'pending',fiatAmountMinor:52500,steamLogin:'receiver-login',checkoutUrl:null,refundStatus:null}}));
 await page.goto('http://127.0.0.1:5203/#steam');const panel=page.locator('#steam');await panel.getByLabel('Логин Steam').fill('receiver-login');await panel.getByLabel('На баланс Steam').fill('500');await panel.getByLabel('Почта для чека').fill('buyer@example.test');
 await settled(panel.getByRole('button',{name:'Пополнить Steam'}));await expect(panel.getByText(/Результат запроса пока неизвестен/)).toBeVisible();
 await page.reload();fail=false;await expect(panel.getByLabel('Логин Steam')).toHaveValue('receiver-login');await expect(panel.getByLabel('Почта для чека')).toHaveValue('buyer@example.test');await settled(panel.getByRole('button',{name:'Проверить результат запроса'}));
 await expect(page).toHaveURL(/payments\/return/);await expect(page.getByRole('heading',{name:'Оплата получена. Пополнение Steam выполняется.'})).toBeVisible();
 expect(authCalls).toBe(0);expect(walletReads).toBe(0);expect(keys).toHaveLength(2);expect(keys[0]).toBe(keys[1]);expect(bodies[0]).toEqual(bodies[1]);
 await page.goto('/#steam');await settled(page.locator('#steam').getByRole('button',{name:'Пополнить Steam'}));await expect(page).toHaveURL(/payments\/return/);
 expect(keys).toHaveLength(3);expect(keys[2]).not.toBe(keys[1]);
});
test('Steam-only login and contact confirmation lives outside trade URL',async({page})=>{
 await fixture(page);await page.goto('/account');await expect(page.locator('.trade-panel').getByText('Подтвердить почту')).toHaveCount(0);await expect(page.locator('.contact-panel')).toContainText('owner@example.test');
 await page.route('**/api/session/me',route=>route.fulfill({status:401,body:'{}'}));await page.reload();await settled(page.getByRole('button',{name:'Открыть кабинет',exact:true}));await expect(page.getByRole('dialog').getByRole('link',{name:'Войти через Steam'})).toBeVisible();await expect(page.getByText('Войти по почте',{exact:true})).toBeVisible();
});
test('wrong payment owner gets no details and cannot create another session from return page',async({page})=>{
 const state=await fixture(page);await page.route(`**/api/payments/sessions/${sessionId}`,route=>route.fulfill({status:404,body:'{}'}));await page.goto(`http://127.0.0.1:5203/payments/return?session=${sessionId}&payment=success`);await expect(page.getByText('Платёж не найден или принадлежит другому аккаунту.')).toBeVisible();expect(state.paymentCalls).toBe(0);
});

test('committed checkout with lost response recovers from empty cart and clears old command',async({page})=>{
 const state=await fixture(page);state.available=30000;state.failCheckout=true;
 await page.goto('http://127.0.0.1:5203/cart');await settled(page.getByRole('button',{name:'Оплатить Gems',exact:true}));await expect(page.getByText(/Не удалось получить результат покупки/)).toBeVisible();
 await page.reload();state.failCheckout=false;await settled(page.getByRole('button',{name:'Проверить результат покупки',exact:true}));await expect(page).toHaveURL(/tab=orders/);
 expect(state.checkoutKeys[0]).toBe(state.checkoutKeys[1]);expect(state.checkoutBodies[0]).toEqual(state.checkoutBodies[1]);
 state.present=true;await page.goto('http://127.0.0.1:5203/cart');await settled(page.getByRole('button',{name:'Оплатить Gems',exact:true}));await expect(page).toHaveURL(/tab=orders/);expect(state.checkoutKeys[2]).not.toBe(state.checkoutKeys[0]);
});
test('unreadable successful payment response survives reload with original command',async({page})=>{
 const state=await fixture(page);state.brokenSession=true;await page.goto('http://127.0.0.1:5203/account?tab=balance&amount=151');
 await settled(page.locator('form').getByRole('button',{name:'Пополнить баланс',exact:true}));await expect(page.getByText(/Результат запроса пока неизвестен/)).toBeVisible();
 await page.reload();state.brokenSession=false;await settled(page.getByRole('button',{name:'Проверить результат запроса',exact:true}));await expect(page).toHaveURL(/payments\/return/);expect(state.keys[0]).toBe(state.keys[1]);expect(state.bodies[0]).toEqual(state.bodies[1]);
});
test('same Steam owner linking email refreshes csrf before immediate Steam quote',async({page})=>{
 await fixture(page);let verified=false;let quotes=0;
 await page.route('**/api/session/me',route=>route.fulfill({json:{id:'owner',steam:{connected:true,steamId64:'76561198000000000'},email:verified?{address:'buyer@example.test',verified:true}:null}}));
 await page.route('**/api/session/csrf',route=>route.fulfill({json:{token:verified?'rotated':'original'}}));
 await page.route('**/api/auth/email/challenges',route=>{expect(route.request().headers()['x-csrf-token']).toBe('original');return route.fulfill({status:202,json:{id:'link'}});});
 await page.route('**/api/auth/email/challenges/link/verify',route=>{expect(route.request().headers()['x-csrf-token']).toBe('original');verified=true;return route.fulfill({json:{userId:'owner'},headers:{'Set-Cookie':'gems_session=rotated; Path=/; HttpOnly; SameSite=Lax'}});});
 await page.route('**/api/payments/steam-refill/quotes',route=>{expect(route.request().headers()['x-csrf-token']).toBe('rotated');quotes++;return route.fulfill({json:{quoteId:'steam',expiresAt:new Date(Date.now()+60000).toISOString(),fiatAmountMinor:52500,feeRubMinor:2500,steamLogin:'player'}});});
 await page.goto('/account');await settled(page.locator('.contact-panel').getByRole('button',{name:'Подтвердить почту'}));
 mkdirSync('../.local/gems-acceptance/ui-polish',{recursive:true});await page.emulateMedia({reducedMotion:'reduce'});
 for(const width of [1440,390,320]){await page.setViewportSize({width,height:1000});await page.getByRole('dialog').screenshot({path:`../.local/gems-acceptance/ui-polish/email-${width}.png`});}
 await page.setViewportSize({width:1280,height:720});
 const dialog=page.getByRole('dialog');await dialog.getByLabel('Электронная почта').fill('buyer@example.test');await dialog.getByRole('button',{name:'Получить код',exact:true}).click();await dialog.getByLabel('Код из письма').fill('123456');await dialog.getByRole('button',{name:'Подтвердить',exact:true}).click();await expect(dialog).toHaveCount(0);await expect(page.locator('.contact-panel')).toContainText('buyer@example.test');await settled(page.locator('header .wordmark'));const panel=page.locator('#steam');await panel.getByLabel('Логин Steam').fill('player');await panel.getByLabel('На баланс Steam').fill('500');await expect(panel.getByRole('button',{name:'Пополнить Steam'})).toBeEnabled();expect(quotes).toBeGreaterThan(0);
});

for(const width of [1440,768,390,320])test(`Gems exact/short/surplus wallet at ${width}`,async({page})=>{
 await page.setViewportSize({width,height:1000});const state=await fixture(page);
 for(const available of [0,10000,25001,30000]){state.available=available;await page.goto('/cart');if(available>=25001)await expect(page.getByRole('button',{name:'Оплатить Gems',exact:true})).toBeEnabled();else await expect(page.getByRole('button',{name:/Не хватает .* Gems/})).toBeDisabled();await expect(page.locator('.cart-page')).not.toContainText('СБП');expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);}
});
for(const entry of ['create','resume'])test(`Arco hosted ${entry} posts return URLs to Paidlayer`,async({page})=>{
 await fixture(page);
 const checkoutUrl='https://payment.paidlayer.com/provider-order';
 await page.route('**/api/payments/top-up/sessions',route=>route.fulfill({json:{id:sessionId,checkoutUrl}}));
 await page.route(`**/api/payments/sessions/${sessionId}`,route=>route.fulfill({json:{id:sessionId,purpose:'wallet_topup',paymentStatus:'checkout_pending',fulfillmentStatus:null,fiatAmountMinor:10000,checkoutUrl,refundStatus:null}}));
 let checked=false;
 await page.route(`**/api/payments/sessions/${sessionId}/check`,route=>{checked=true;expect(route.request().method()).toBe('POST');return route.fulfill({json:{id:sessionId,purpose:'wallet_topup',paymentStatus:'checkout_pending',fulfillmentStatus:'not_applicable',fiatAmountMinor:10000,checkoutUrl,canPay:true,expiresAt:new Date(Date.now()+60000).toISOString(),failureReason:null,refundStatus:null}});});
 await page.route('https://payment.paidlayer.com/**',async route=>{
  if(entry==='resume')expect(checked).toBe(true);
  expect(route.request().method()).toBe('POST');
  const fields=new URLSearchParams(route.request().postData()??'');
  for(const key of ['successUrl','failUrl']){
   const url=new URL(fields.get(key)!);
   expect(url.origin).toBe('http://127.0.0.1:5203');
   expect(url.pathname).toBe('/payments/return');
   expect(url.searchParams.get('session')).toBe(sessionId);
  }
  await route.fulfill({contentType:'text/html',body:'<h1>Payment provider fixture</h1>'});
 });
 if(entry==='resume'){
  await page.goto(`/payments/return?session=${sessionId}`);
  await page.getByRole('button',{name:'Оплатить',exact:true}).click();
 }else{
  await page.goto('/#balance');
  await settled(page.getByRole('button',{name:/Пополнить баланс/}));
 }
 await expect(page.getByRole('heading',{name:'Payment provider fixture'})).toBeVisible();
});

for(const width of [1440,390])test(`new top-up ignores saved payment and uses current amount ${width}`,async({page})=>{
 await page.setViewportSize({width,height:900});const state=await fixture(page);
 await page.goto('/account?tab=balance');
 await settled(page.locator('form').getByRole('button',{name:'Пополнить баланс',exact:true}));await expect(page).toHaveURL(/payments\/return/);
 await page.evaluate(id=>sessionStorage.setItem('gems:draft:payment-session:owner:top-up',id),sessionId);
 await page.goto('/account?tab=balance');await page.getByLabel('Сколько Gems зачислить').fill('2000');
 await settled(page.locator('form').getByRole('button',{name:'Пополнить баланс',exact:true}));await expect(page).toHaveURL(/payments\/return/);
 expect(state.paymentCalls).toBe(2);expect(state.keys[0]).not.toBe(state.keys[1]);
 expect(state.bodies[1]).toMatchObject({acceptedFiatMinor:100000});
});

for(const outcome of ['expired','paid','error'])test(`history payment checks ${outcome} before opening provider`,async({page})=>{
 const width=outcome==='paid'?1440:390;
 await page.setViewportSize({width,height:844});await page.emulateMedia({reducedMotion:'reduce'});
 await fixture(page);let checks=0,providerPosts=0,checked=false;
 const payment={id:sessionId,kind:'coins_top_up',status:'checkout_pending',amountMinor:10000,currency:'RUB',orderId:null,fulfillmentStatus:null,createdAt:new Date().toISOString(),expiresAt:new Date(Date.now()+60000).toISOString(),failureReason:null,canPay:true};
 await page.route('**/api/payments/me/history',r=>r.fulfill({json:{payments:[{...payment,...(checked&&outcome!=='error'?{status:outcome==='expired'?'failed':'paid',failureReason:outcome==='expired'?'expired':null,canPay:false}:{})}]}}));
 await page.route(`**/api/payments/sessions/${sessionId}/check`,r=>{
  checks++;checked=true;
  return r.fulfill(outcome==='error'?{status:503,json:{message:'Status unavailable'}}:{json:{id:sessionId,purpose:'wallet_topup',paymentStatus:outcome==='expired'?'failed':'paid',fulfillmentStatus:'not_applicable',fiatAmountMinor:10000,checkoutUrl:null,canPay:false,failureReason:outcome==='expired'?'expired':null,expiresAt:payment.expiresAt,refundStatus:null}});
 });
 await page.route('https://payment.paidlayer.com/**',r=>{providerPosts++;return r.abort();});
 await page.goto('/account?tab=transactions');await expect(page.getByRole('button',{name:'Оплатить',exact:true})).toBeVisible();
 mkdirSync('../.local/gems-acceptance/payment-lifecycle',{recursive:true});
 await page.locator('.account-tab-transactions').screenshot({path:`../.local/gems-acceptance/payment-lifecycle/history-unpaid-${width}.png`});
 await settled(page.getByRole('button',{name:'Оплатить',exact:true}));
 await expect(page.getByText(outcome==='expired'?'Срок оплаты истёк':outcome==='paid'?'Баланс Gems пополнен':/Не удалось проверить платёж/).first()).toBeVisible();
 expect(checks).toBe(1);expect(providerPosts).toBe(0);await expect(page).toHaveURL(/account/);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.locator('.account-tab-transactions').screenshot({path:`../.local/gems-acceptance/payment-lifecycle/history-${outcome}-${width}.png`});
});

test('guest continuation after reload uses existing guest CSRF and never creates a context',async({page})=>{
 await fixture(page);let contextCreates=0,checks=0;
 await page.route('**/api/session/me',r=>r.fulfill({status:401,json:{}}));
 await page.route('**/api/session/csrf',r=>r.fulfill({status:401,json:{}}));
 await page.route(`**/api/payments/sessions/${sessionId}`,r=>r.fulfill({status:401,json:{}}));
 const session={id:sessionId,purpose:'steam_refill',paymentStatus:'checkout_pending',fulfillmentStatus:'not_started',fiatAmountMinor:52500,checkoutUrl:'https://payment.paidlayer.com/guest-order',canPay:true,failureReason:null,expiresAt:new Date(Date.now()+60000).toISOString(),refundStatus:null};
 const expired={...session,paymentStatus:'failed',failureReason:'expired',canPay:false,checkoutUrl:null};
 await page.route(`**/api/payments/guest/steam-refill/sessions/${sessionId}`,r=>r.fulfill({json:checks?expired:session}));
 await page.route('**/api/payments/guest/context',r=>{if(r.request().method()==='POST')contextCreates++;return r.fulfill({json:{id:'returning-guest',csrfToken:'restored-guest-csrf'}});});
 await page.route(`**/api/payments/guest/steam-refill/sessions/${sessionId}/check`,r=>{
  checks++;expect(r.request().headers()['x-csrf-token']).toBe('restored-guest-csrf');
  return r.fulfill({json:expired});
 });
 await page.goto(`/payments/return?session=${sessionId}`);await page.reload();
 await page.getByRole('button',{name:'Оплатить',exact:true}).click();
 await expect(page.getByText('Срок оплаты истёк').first()).toBeVisible();
 expect(checks).toBe(1);expect(contextCreates).toBe(0);
});

test('a retained top-up form replaces its consumed quote before another payment',async({page})=>{
 await fixture(page);
 // Retain the mounted form as BFCache does; intercept only external navigation.
 await page.addInitScript(()=>{HTMLFormElement.prototype.submit=function(){};});
 const usedQuotes=new Set<string>();const keys:string[]=[];let attempts=0;
 await page.route('**/api/payments/top-up/sessions',r=>{
  attempts++;const {quoteId}=r.request().postDataJSON();
  if(usedQuotes.has(quoteId))return r.fulfill({status:409,json:{message:'QUOTE_ALREADY_CONSUMED'}});
  usedQuotes.add(quoteId);keys.push(r.request().headers()['idempotency-key']);
  return r.fulfill({json:{id:sessionId,checkoutUrl:'https://payment.paidlayer.com/retained-form'}});
 });
 await page.goto('/account?tab=balance');const button=page.locator('form').getByRole('button',{name:'Пополнить баланс',exact:true});
 await settled(button);await expect.poll(()=>attempts).toBe(1);await expect(button).toBeEnabled();
 await settled(button);await expect.poll(()=>attempts).toBe(2);
 expect(usedQuotes.size).toBe(2);expect(new Set(keys).size).toBe(2);
});

for(const surface of ['status','history'])test(`${surface} polling does not cancel a slow verification before checkout`,async({page})=>{
 await fixture(page);await page.emulateMedia({reducedMotion:'reduce'});await page.clock.install();
 const session={id:sessionId,purpose:'wallet_topup',paymentStatus:'checkout_pending',fulfillmentStatus:'not_applicable',fiatAmountMinor:10000,checkoutUrl:'https://payment.paidlayer.com/slow-check',canPay:true,failureReason:null,expiresAt:new Date(Date.now()+60000).toISOString(),refundStatus:null};
 let reads=0;
 await page.route(`**/api/payments/sessions/${sessionId}`,r=>{reads++;return r.fulfill({json:session});});
 await page.route('**/api/payments/me/history',r=>{reads++;return r.fulfill({json:{payments:[{id:sessionId,kind:'coins_top_up',status:'checkout_pending',amountMinor:10000,currency:'RUB',createdAt:new Date().toISOString(),expiresAt:session.expiresAt,canPay:true}]}});});
 let started=false;let finish!:()=>void;const pending=new Promise<void>(resolve=>{finish=resolve;});
 await page.route(`**/api/payments/sessions/${sessionId}/check`,async r=>{started=true;await pending;await r.fulfill({json:session}).catch(()=>undefined);});
 await page.route('https://payment.paidlayer.com/**',r=>r.fulfill({contentType:'text/html',body:'<h1>Verified checkout</h1>'}));
 await page.goto(surface==='status'?`/payments/return?session=${sessionId}`:'/account?tab=transactions');await page.getByRole('button',{name:'Оплатить',exact:true}).click();
 await expect.poll(()=>started).toBe(true);const initialReads=reads;
 await page.clock.fastForward(surface==='status'?2500:30500);await expect.poll(()=>reads).toBeGreaterThan(initialReads);finish();
 await expect(page.getByRole('heading',{name:'Verified checkout'})).toBeVisible();
});

test('changing the session resets an aborted status action',async({page})=>{
 await fixture(page);const other='22222222-2222-4222-8222-222222222222';let started=false;
 const session={purpose:'wallet_topup',paymentStatus:'checkout_pending',fulfillmentStatus:'not_applicable',fiatAmountMinor:10000,checkoutUrl:null,canPay:false,refundStatus:null};
 for(const id of [sessionId,other])await page.route(`**/api/payments/sessions/${id}`,r=>r.fulfill({json:{...session,id}}));
 let finish!:()=>void;const pending=new Promise<void>(resolve=>{finish=resolve;});
 await page.route(`**/api/payments/sessions/${sessionId}/check`,async r=>{started=true;await pending;await r.fulfill({json:{...session,id:sessionId}}).catch(()=>undefined);});
 await page.goto(`/payments/return?session=${sessionId}`);await page.getByRole('button',{name:'Обновить статус',exact:true}).click();
 await expect.poll(()=>started).toBe(true);
 // Next's native History API updates search params without remounting the page.
 await page.evaluate(id=>window.history.pushState(null,'',`/payments/return?session=${id}`),other);
 await expect(page.getByRole('button',{name:'Обновить статус',exact:true})).toBeEnabled();finish();
});

test('replayed unknown payment opens current status rather than an expired hosted URL',async({page})=>{
 const state=await fixture(page);state.failSession=true;
 await page.goto('/account?tab=balance');await page.locator('form').getByRole('button',{name:'Пополнить баланс',exact:true}).click();await expect(page.getByText(/Результат запроса пока неизвестен/)).toBeVisible();
 await page.route('**/api/payments/top-up/sessions',r=>r.fulfill({json:{id:sessionId,checkoutUrl:'https://payment.paidlayer.com/expired-session'}}));
 await page.route(`**/api/payments/sessions/${sessionId}`,r=>r.fulfill({json:{id:sessionId,purpose:'wallet_topup',paymentStatus:'failed',failureReason:'expired',fulfillmentStatus:'not_applicable',fiatAmountMinor:50000,checkoutUrl:null,canPay:false}}));
 let hosted=0;await page.route('https://payment.paidlayer.com/**',r=>{hosted++;return r.fulfill({contentType:'text/html',body:'<h1>Expired hosted checkout</h1>'});});
 await page.getByRole('button',{name:'Проверить результат запроса',exact:true}).click();await expect(page.getByRole('heading',{name:'Срок оплаты истёк',exact:true})).toBeVisible();expect(hosted).toBe(0);expect(state.keys).toHaveLength(1);
});

test('two tabs revalidate session owner before showing a new accounts private data',async({page,context})=>{
 let owner='A';
 await context.route('**/api/**',async r=>{
  const path=new URL(r.request().url()).pathname;
  if(path==='/api/session/me')return r.fulfill({json:{id:owner,steam:{connected:true,steamId64:owner==='A'?'76561198000000001':'76561198000000002'}}});
  if(path==='/api/session/csrf')return r.fulfill({json:{token:owner+'-csrf'}});
  if(path==='/api/wallet/me')return r.fulfill({json:{postedCoinMinor:owner==='A'?10000:20000,availableCoinMinor:owner==='A'?10000:20000,heldCoinMinor:0}});
  if(path==='/api/storefront/config')return r.fulfill({json:{capabilities:{}}});
  if(path==='/api/me/steam-trade-url/status')return r.fulfill({json:{configured:true}});
  if(path==='/api/cart')return r.fulfill({json:{version:1,items:[]}});
  if(path==='/api/orders/me')return r.fulfill({json:{orders:[]}});
  if(path==='/api/payments/me/history')return r.fulfill({json:{payments:[]}});
  if(path==='/api/fulfillment/me/trades')return r.fulfill({json:{events:[]}});
  if(path==='/api/wallet/me/transactions')return r.fulfill({json:{transactions:[]}});
  return r.fulfill({status:404,json:{}});
 });
 await page.goto('/account');await expect(page.locator('.steam-id')).toHaveText('76561198000000001');
 const other=await context.newPage();await other.goto('/account');await expect(other.locator('.steam-id')).toHaveText('76561198000000001');
 owner='B';await other.reload();await expect(other.locator('.steam-id')).toHaveText('76561198000000002');
 await page.bringToFront();await page.evaluate(()=>window.dispatchEvent(new Event('focus')));await expect(page.locator('.steam-id')).toHaveText('76561198000000002');await expect(page.locator('.account-balance .price-main')).toContainText('200');await other.close();
});
