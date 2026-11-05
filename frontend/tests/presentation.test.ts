import {test} from 'node:test';
import assert from 'node:assert/strict';
import {presentationProducts} from '../src/lib/presentation.ts';
import type {Product} from '../src/lib/types.ts';
import design from '../src/data/catalog.json' with {type:'json'};
import slots from '../src/data/presentation.json' with {type:'json'};

const ids=['swap-35d1bd8ccb42','swap-f552ddd674fb','swap-ba19f94fd9cd'];
const live=ids.map(id=>{
 const reference=design.products.find(p=>p.id===id)!;
 const slot=slots.find(s=>s.slot===id)!;
 return {...reference,id:slot.slug,game:'cs2',marketHashName:slot.marketHashName,availability:'available',priceMinor:12345,priceRevision:'server-revision',imageUrl:'/server-image.webp'} as Product;
});

test('empty catalog never creates designer products',()=>{
 assert.deepEqual(presentationProducts(ids,[]),[]);
});
test('preferred live products preserve server identity, price and image without mutating input',()=>{
 const before=structuredClone(live);
 assert.deepEqual(presentationProducts(ids,live),live);
 assert.deepEqual(live,before);
});
test('missing preferred items use distinct available products of the same category',()=>{
 const replacements=live.map((p,i)=>({...p,id:`replacement-${i}`,marketHashName:`replacement-${i}`}));
 assert.deepEqual(presentationProducts(ids,replacements),replacements);
 assert.deepEqual(presentationProducts([...ids,ids[0]],replacements),replacements);
});
test('unavailable preferred product is replaced and never supplies its artwork',()=>{
 const replacement={...live[0],id:'other-knife',marketHashName:'other knife',imageUrl:'/other-knife.webp'};
 assert.deepEqual(presentationProducts(ids,[{...live[0],availability:'unavailable'},replacement]),[replacement]);
});
test('exclude wrong game, unknown availability, unusable prices and missing artwork',()=>{
 const invalid:Partial<Product>[]=[{game:'rust'},{game:'tf2'},{availability:undefined},{availability:'unavailable'},{priceMinor:0},{priceMinor:-1},{priceMinor:NaN},{priceMinor:Infinity},{priceMinor:1.5},{priceMinor:Number.MAX_SAFE_INTEGER+1},{imageUrl:''},{imageUrl:'/favicon.svg'}];
 for(const patch of invalid)assert.deepEqual(presentationProducts(ids,[{...live[0],...patch}]),[],JSON.stringify(patch));
});
test('partial catalog stays partial, unknown slots do not invent items',()=>{
 assert.deepEqual(presentationProducts(ids,[live[1]]),[live[1]]);
 assert.deepEqual(presentationProducts(['unknown'],live),[]);
});
