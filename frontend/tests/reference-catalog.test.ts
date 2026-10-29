import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {expandSnapshot,referencePrice,type ReferenceSnapshot} from '../src/lib/reference-catalog.ts';
import {games,hasWear,productHref} from '../src/lib/games.ts';
import {emptyFilters,filterProducts,conditionCode} from '../src/lib/filters.ts';
import {gemsToRub,parseAmount,parseCatalogAmount,sumPrices,steamQuote} from '../src/lib/money.ts';
import {readProductSnapshots} from '../src/lib/product-storage.ts';
const snapshots=games.map(g=>JSON.parse(readFileSync(new URL(`../public/catalog-data/${g.id}.json`,import.meta.url),'utf8')) as ReferenceSnapshot);
const catalogs=snapshots.map(expandSnapshot);
test('all saved games contain unique products, real categories, descriptions and exact source prices',()=>{
 for(const [index,snapshot] of snapshots.entries()){
  const catalog=catalogs[index];assert.equal(catalog.products.length,snapshot.totalCount);assert.equal(snapshot.totalCount,snapshot.sourceReportedCount);
  assert.equal(new Set(catalog.products.map(p=>p.id)).size,snapshot.totalCount);
  const categoryIds=new Set(catalog.categories.map(c=>c.id));
  const details=new Map<string,Record<string,string>>();
  for(const [i,p] of catalog.products.entries()){
   assert.ok(categoryIds.has(p.categoryId));assert.ok(p.name);assert.ok(p.imageUrl===''||p.imageUrl.startsWith('https://'));assert.equal(p.game,snapshot.game);
   assert.equal(gemsToRub(p.priceMinor),referencePrice(snapshot.rows[i][4]).rubMinor);
   assert.ok(productHref(p).startsWith(`/item?game=${snapshot.game}&id=`));
   const prefix=p.referenceId!.slice(0,2);
   if(!details.has(prefix))details.set(prefix,JSON.parse(readFileSync(new URL(`../public/catalog-data/details/${snapshot.game}/${prefix}.json`,import.meta.url),'utf8')));
   assert.equal(typeof details.get(prefix)![p.referenceId!],'string');
   if(snapshot.game!=='cs2'){assert.equal(p.condition,'');assert.equal(p.float,null);assert.equal(hasWear(p),false);}
  }
 }
});
test('reference conversion preserves RUB kopeks before applying 1 RUB = 2 Gems',()=>{
 assert.deepEqual(referencePrice(504),{rubMinor:857,gemsMinor:1714});
 const price=referencePrice(1308781435);assert.equal(gemsToRub(price.gemsMinor),price.rubMinor);
 assert.deepEqual(sumPrices([price.gemsMinor,1714]),{gems:price.gemsMinor+1714,rub:price.rubMinor+857});
 assert.equal(parseCatalogAmount('44 498 568,80'),4449856880);assert.equal(parseAmount('44 498 568,80'),null);
 assert.throws(()=>steamQuote(4449856880));
});
test('game categories, search and four reference sorts work across full inventory',()=>{
 const rust=catalogs[1],tf2=catalogs[2];
 assert.equal(filterProducts(rust.products,{...emptyFilters,query:'hoodie'}).length,164);
 const weapons=rust.categories.find(c=>c.name==='Weapon')!;
 assert.equal(filterProducts(rust.products,{...emptyFilters,category:weapons.id}).length,1746);
 const rockets=tf2.categories.find(c=>c.name==='Rocket Launcher')!;
 assert.equal(filterProducts(tf2.products,{...emptyFilters,category:rockets.id}).length,17);
 for(const sort of ['price-asc','price-desc','name-asc','name-desc']){
  const result=filterProducts(tf2.products,{...emptyFilters,sort});
  for(let i=1;i<result.length;i++){
   const comparison=sort.startsWith('price')?result[i-1].priceMinor-result[i].priceMinor:result[i-1].name.localeCompare(result[i].name,'ru');
   assert.ok(sort.endsWith('asc')?comparison<=0:comparison>=0);
  }
 }
 const english=expandSnapshot({game:'cs2',capturedAt:'2026-10-12',categories:[],rows:[['test','AK-47 | AUTOEXEC (Battle-Scarred)','other','',100,'AK-47','','AK-47 | AUTOEXEC (Battle-Scarred)']]}).products[0];
 assert.equal(english.condition,'Закалённое в боях');assert.equal(english.finish,'AUTOEXEC');assert.equal(hasWear(english),true);
 assert.equal(conditionCode(''),'');assert.equal(conditionCode('Закалённое в боях'),'BS');
 assert.equal(hasWear(catalogs[0].products.find(p=>p.categoryId==='stickers')!),false);
});
test('imported items survive cart display snapshots; malformed storage cannot crash cart',()=>{
 const p=catalogs[1].products[0];assert.deepEqual(readProductSnapshots(JSON.stringify([p])),[p]);
 for(const data of ['null','{','{}',JSON.stringify([{...p,priceMinor:-1}]),JSON.stringify([{...p,id:'fake'}])])assert.deepEqual(readProductSnapshots(data),[]);
});
