import type {Product} from './types.ts';
// Display snapshots only: the checkout endpoint must establish its own quote.
export function readProductSnapshots(raw:string):Product[]{
  try{
    const value:unknown=JSON.parse(raw);
    if(!Array.isArray(value))return [];
    return value.filter((p):p is Product=>Boolean(p&&typeof p==='object'&&
      typeof p.id==='string'&&typeof p.referenceId==='string'&&
      ['cs2','rust','tf2'].includes(p.game)&&p.id===`ref-${p.game}-${p.referenceId}`&&
      ['name','weapon','finish','description','imageUrl','categoryId','condition'].every(k=>typeof p[k]==='string')&&
      (p.imageUrl===''||/^https:\/\//.test(p.imageUrl))&&Number.isSafeInteger(p.priceMinor)&&p.priceMinor>=0&&p.priceMinor<Number.MAX_SAFE_INTEGER/2&&
      (p.float===null||typeof p.float==='number')&&p.source&&typeof p.source.capturedAt==='string'));
  }catch{return [];}
}
