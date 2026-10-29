import type {Product} from "./types.ts";
import {gemsToRub,parseAmount} from "./money.ts";

export function pickWithinBudget(products:Product[],budgetRub:string,category="all",limit=6) {
  const budget=parseAmount(budgetRub);
  if(budget===null)return {budget:null,count:0,items:[] as Product[],invalidBudget:budgetRub.trim().length>0};
  const matching=products
    .filter(product=>category==="all"||product.categoryId===category)
    .filter(product=>gemsToRub(product.priceMinor)<=budget)
    .sort((a,b)=>gemsToRub(b.priceMinor)-gemsToRub(a.priceMinor)||a.name.localeCompare(b.name,"ru"));
  return {budget,count:matching.length,items:matching.slice(0,Math.max(0,limit)),invalidBudget:false};
}
