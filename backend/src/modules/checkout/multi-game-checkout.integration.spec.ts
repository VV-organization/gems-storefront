import {afterAll,beforeAll,describe,expect,it} from 'vitest';
import {commerceFixture,type CommerceFixture} from '../../test-support/commerce-fixture';
import {CartService} from '../cart/cart.service';
import {UsersService} from '../users/users.service';
import {WalletService} from '../wallet/wallet.service';
import {CatalogService} from '../catalog/catalog.service';
import {QuotedCheckoutService} from './quoted-checkout.service';
import {FulfillmentOperationService} from '../fulfillment/fulfillment-operation.service';
const databaseUrl=process.env.GEMS_TEST_DATABASE_URL;
describe.skipIf(!databaseUrl)('multi-game checkout',()=>{
let f:CommerceFixture;
beforeAll(async()=>{f=await commerceFixture(databaseUrl??"");});
afterAll(async()=>{await f.close();});
it('quotes and delivers a mixed three-game cart with immutable game identities and one settlement',async()=>{
 const u=await f.identity('mixed-owner');
 await f.app.get(UsersService).saveSteamTradeCredential(u.userId,{partner:String(BigInt(u.steamId)-76561197960265728n),token:'fixtureTrade'});
 const wallet=f.app.get(WalletService),cart=f.app.get(CartService),catalog=f.app.get(CatalogService),checkout=f.app.get(QuotedCheckoutService),worker=f.app.get(FulfillmentOperationService);
 await wallet.creditUser({userId:u.userId,amountCoinMinor:1000000,idempotencyKey:'mixed-funds',reason:'test'});
 f.provider.getMinimumItem.mockImplementation(({marketHashName,game}:{marketHashName:string;game?:string})=>Promise.resolve({marketHashName,game:game??'cs2',availableQuantity:5,priceMicrousd:1000000n,imageUrl:null}));
 for(const game of ['cs2','rust','tf2']){
  const run=await f.pool.query<{id:string}>("INSERT INTO catalog_sync_runs(source,game,status,observed_at,finished_at,row_count) VALUES ('sih',$1,'promoted',now(),now(),1) RETURNING id",[game]);
  await f.pool.query("INSERT INTO supplier_listings(supplier,game,market_hash_name,active,available_quantity,price_microusd,last_seen_at,last_sync_run_id) VALUES ('sih',$1,'Shared item name',true,5,1000000,now(),$2)",[game,run.rows[0]?.id]);
  await f.pool.query(`INSERT INTO catalog_products(id,slug,kind,category,game,product_type,title,description,price_coin_minor,availability,fulfillment_mode,popularity,meta,keywords,details,supplier_provider,supplier_item_id,public_enabled,category_id,ever_published) VALUES ($1,$1,'skins','Items',$2,'Item','Shared item name','fixture',100,'available','steam-trade',1,'{}','{}','{"specifications":[],"fulfillment":{"title":"Steam","description":"Trade","requirements":[]}}','sih','Shared item name',true,$2||':items',true)`,['mixed-'+game,game]);
  const page=await catalog.list({game,limit:'24'});expect(page.items.some(p=>p.slug==='mixed-'+game)).toBe(true);expect(page.items.every(p=>p.game===game)).toBe(true);
  const current=await cart.getCart(u.userId);
  await cart.setItem({userId:u.userId,productSlug:'mixed-'+game,quantity:1,expectedCartVersion:current.version,idempotencyKey:'add-'+game});
 }
 const state=await cart.getCart(u.userId),quote=await checkout.createCheckoutQuote({userId:u.userId,cartVersion:state.version});
 expect(quote.items).toHaveLength(3);expect(quote.totalCoinMinor).toBe(quote.totalRubMinor*2);
 const command={userId:u.userId,quoteId:quote.id,cartVersion:state.version,idempotencyKey:'mixed-checkout'};
 const order=await checkout.checkoutFromServerCart(command);expect(await checkout.checkoutFromServerCart(command)).toEqual(order);
 const snapshots=await f.pool.query<{payload_snapshot:{game:string};provider_operation_id:string}>('SELECT payload_snapshot,provider_operation_id FROM fulfillment_commands WHERE order_id=$1',[order.id]);
 expect(snapshots.rows.map(r=>r.payload_snapshot.game).sort()).toEqual(['cs2','rust','tf2']);expect(new Set(snapshots.rows.map(r=>r.provider_operation_id)).size).toBe(3);
 for(let i=0;i<3;i++)expect((await worker.submitNext(true)).status).toBe('submitted');
 const calls=f.provider.createSkinOrder.mock.calls.map(([value])=>value as unknown as {game:string;customId:string});
 expect(calls.map(v=>v.game).sort()).toEqual(['cs2','rust','tf2']);
 await f.pool.query('UPDATE fulfillment_commands SET available_at=now()');
 for(let i=0;i<3;i++)expect((await worker.reconcileNext()).status).toBe('completed');
 expect(await wallet.getBalance(u.userId)).toEqual({postedCoinMinor:1000000-quote.totalCoinMinor,availableCoinMinor:1000000-quote.totalCoinMinor,heldCoinMinor:0});
 await worker.settleTerminalHolds();expect((await wallet.getBalance(u.userId)).heldCoinMinor).toBe(0);
 expect((await f.pool.query<{status:string}>('SELECT status FROM orders WHERE id=$1',[order.id])).rows[0]?.status).toBe('fulfilled');
});

});
