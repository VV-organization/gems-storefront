import {test} from "node:test";
import assert from "node:assert/strict";
import type {Product} from "../src/lib/types.ts";
import {pickWithinBudget} from "../src/lib/budget-picks.ts";

const products = [
  {id:"knife",name:"Knife",categoryId:"knife",priceMinor:199900},
  {id:"rifle",name:"Rifle",categoryId:"rifle",priceMinor:120000},
  {id:"pistol",name:"Pistol",categoryId:"pistol",priceMinor:50000},
  {id:"over",name:"Over",categoryId:"knife",priceMinor:250000},
] as Product[];

test("returns only items within the RUB ceiling, closest prices first",()=>{
  const result=pickWithinBudget(products,"1 000");
  assert.equal(result.count,3);
  assert.deepEqual(result.items.map(product=>product.id),["knife","rifle","pistol"]);
  assert.equal(result.invalidBudget,false);
});

test("category filter narrows the budget results",()=>{
  const result=pickWithinBudget(products,"1 000","knife");
  assert.equal(result.count,1);
  assert.deepEqual(result.items.map(product=>product.id),["knife"]);
});

test("invalid or empty budget never recommends products",()=>{
  assert.deepEqual(pickWithinBudget(products,"abc"),{budget:null,count:0,items:[],invalidBudget:true});
  assert.deepEqual(pickWithinBudget(products,""),{budget:null,count:0,items:[],invalidBudget:false});
});

test("count reports all matches while the result list is capped",()=>{
  const result=pickWithinBudget([...products,...products],"2 000","all",2);
  assert.equal(result.count,8);
  assert.equal(result.items.length,2);
});
