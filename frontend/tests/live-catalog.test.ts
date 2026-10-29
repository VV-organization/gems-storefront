import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mapProduct,categoryLabel} from '../src/lib/catalog-adapter.ts';
test('live DTO preserves game, server price, description and unknown float',()=>{
 const product=mapProduct({id:'rust-id',slug:'rust-live',game:'rust',title:'Metal Facemask',description:'Actual description',image:null,categoryId:'rust:Armor',condition:'',weapon:'',stattrak:false,marketHashName:'Metal Facemask',priceRevision:'rev',pricingSettingId:'gems',price:{amountMinor:1540006},availability:'available',meta:[]} as never);
 assert.equal(product.game,'rust');assert.equal(product.id,'rust-live');assert.equal(product.priceMinor,1540006);assert.equal(product.float,null);assert.equal(product.description,'Actual description');assert.equal(product.categoryName,'Armor');
});
test('categories retain game-specific labels',()=>{assert.equal(categoryLabel('rifle'),'Винтовки');assert.equal(categoryLabel('tf2:Primary'),'Primary');});
