import {test} from 'node:test';
import assert from 'node:assert/strict';
import {requestCatalog,CatalogRequestError} from '../src/lib/catalog-request.ts';

test('catalog recovers a transient failure with one retry',async()=>{
 let calls=0;
 const fetcher=(async()=>++calls===1?new Response('',{status:503}):Response.json({items:[]})) as typeof fetch;
 assert.deepEqual(await requestCatalog('http://fixture','/catalog/lookup',{slugs:['knife']},fetcher),{items:[]});
 assert.equal(calls,2);
});
test('network failures retry once and remain errors rather than missing products',async()=>{
 let calls=0;
 await assert.rejects(requestCatalog('http://fixture','/catalog/knife',undefined,(async()=>{calls++;throw new TypeError('fetch failed');}) as typeof fetch),/fetch failed/);
 assert.equal(calls,2);
});
test('an authoritative 404 is not retried',async()=>{
 let calls=0;
 await assert.rejects(requestCatalog('http://fixture','/catalog/missing',undefined,(async()=>{calls++;return new Response('',{status:404});}) as typeof fetch),e=>e instanceof CatalogRequestError&&e.status===404);
 assert.equal(calls,1);
});
