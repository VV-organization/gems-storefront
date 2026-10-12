import type {Product} from './types.ts';
export const games = [
  {id:'cs2',name:'CS2',fullName:'Counter-Strike 2',description:'Оружие, ножи, наклейки и не только'},
  {id:'rust',name:'Rust',fullName:'Rust',description:'Оружие, одежда и мир вокруг тебя'},
  {id:'tf2',name:'Team Fortress 2',fullName:'Team Fortress 2',description:'Предметы для твоего класса'},
] as const;
export type GameId = typeof games[number]['id'];
export function gameId(value:string|null|undefined):GameId{return value==='rust'||value==='tf2'?value:'cs2';}
export function gameName(product:Product){return games.find(g=>g.id===(product.game??'cs2'))!.fullName;}
export function productHref(product:Product){return product.referenceId?`/item?game=${product.game}&id=${encodeURIComponent(product.referenceId)}`:`/catalog/${product.id}`;}
export function hasWear(product:Product){return (product.game??'cs2')==='cs2'&&Boolean(product.condition);}
