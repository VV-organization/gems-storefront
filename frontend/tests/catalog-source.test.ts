import {test} from 'node:test';
import assert from 'node:assert/strict';
import {loadCatalog,loadHomeProducts,loadProduct,type CatalogRequest} from '../src/lib/catalog-source.ts';
import {CatalogRequestError} from '../src/lib/catalog-request.ts';
import {mapProduct,type CatalogApiProduct} from '../src/lib/catalog-adapter.ts';
import {homeSlotIds,presentationProducts} from '../src/lib/presentation.ts';

function dto(categoryId:string):CatalogApiProduct {
 return {id:categoryId,slug:`live-${categoryId}`,game:'cs2',title:`${categoryId} | Live`,description:'Server description',image:`/live-${categoryId}.webp`,categoryId,condition:'FN',weapon:categoryId,stattrak:false,marketHashName:`live-${categoryId}`,priceRevision:'r1',pricingSettingId:'p1',price:{amountMinor:12345,currency:'COINS',scale:2,display:'123,45'},availability:'available',meta:[],kind:'skins',category:'Скины',productType:categoryId,fulfillmentMode:'steam-trade',createdAt:'2026-11-05T00:00:00Z',popularity:1,keywords:[],details:{specifications:[],fulfillment:{title:'Steam',description:'',requirements:[]}}};
}
const products=['knife','pistol','rifle'].map(category=>mapProduct(dto(category)));
function request(handler:(path:string,body?:unknown)=>unknown):CatalogRequest {
 return async<T>(path:string,body?:unknown)=>handler(path,body) as T;
}
test('lookup failure preserves first page',async()=>{
 const catalog=await loadCatalog(request(path=>{if(path==='/catalog/lookup')throw Error('503');return {items:[dto('knife')]};}));
 assert.equal(catalog.mode,'live');assert.deepEqual(catalog.products,[products[0]]);
});
test('product transport errors are not reported as missing products',async()=>{
 await assert.rejects(loadProduct('knife',request(()=>{throw new CatalogRequestError(503);})),/503/);
 await assert.rejects(loadProduct('knife',request(()=>{throw new TypeError('network');})),/network/);
 assert.equal(await loadProduct('missing',request(()=>{throw new CatalogRequestError(404);})),null);
 assert.deepEqual(await loadProduct('live-knife',request(()=>dto('knife'))),products[0]);
});
test('initial catalog and missing home categories use item-only previews',async()=>{
 const paths:string[]=[];
 const req=request(path=>{paths.push(path);return {items:[]};});
 await loadCatalog(req);await loadHomeProducts([],req);
 assert.ok(paths.includes('/catalog/preview?limit=60'));
 assert.ok(paths.filter(path=>path.includes('?')).every(path=>path.startsWith('/catalog/preview?')));
});
test('page failure preserves lookup, both failures mean unavailable',async()=>{
 const catalog=await loadCatalog(request(path=>{if(path!=='/catalog/lookup')throw Error('timeout');return {items:[dto('pistol')]};}));
 assert.equal(catalog.mode,'live');assert.deepEqual(catalog.products,[products[1]]);
 const unavailable=await loadCatalog(request(()=>{throw Error('offline');}));
 assert.equal(unavailable.mode,'unavailable');assert.deepEqual(unavailable.products,[]);
});
test('empty successful catalog is live and products merge by slug',async()=>{
 assert.equal((await loadCatalog(request(()=>({items:[]})))).mode,'live');
 assert.equal((await loadCatalog(request(()=>({items:[dto('knife')]})))).products.length,1);
});
test('complete selection makes no extra catalog requests',async()=>{
 assert.deepEqual(await loadHomeProducts(products,request(()=>{throw Error('Unexpected request');})),products);
});
test('missing categories are fetched independently beyond the first page',async()=>{
 const paths:string[]=[];
 const result=await loadHomeProducts([products[1]],request(path=>{
  paths.push(path);const url=new URL(path,'http://fixture');
  assert.equal(url.searchParams.get('game'),'cs2');assert.equal(url.searchParams.get('status'),'available');assert.equal(url.searchParams.get('limit'),'3');
  return {items:[dto(url.searchParams.get('categoryId')!)]};
 }));
 assert.equal(paths.length,2);assert.deepEqual(result,products);
});
test('one failed category does not hide successful ones or fabricate missing cards',async()=>{
 const result=await loadHomeProducts([],request(path=>{
  const category=new URL(path,'http://fixture').searchParams.get('categoryId')!;
  if(category==='knife')throw Error('timeout');return {items:[dto(category)]};
 }));
 assert.deepEqual(result,products.slice(1));
 assert.deepEqual(await loadHomeProducts([],request(()=>{throw Error('offline');})),[]);
});
test('unavailable and unpriced category responses cannot fill home slots',async()=>{
 const result=await loadHomeProducts([],request(()=>({items:[{...dto('knife'),availability:'unavailable'},{...dto('pistol'),price:{amountMinor:0}}]})));
 assert.deepEqual(result,[]);
 assert.deepEqual(presentationProducts(homeSlotIds,result),[]);
});
