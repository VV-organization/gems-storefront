import slots from '../data/presentation.json' with {type:'json'};
import design from '../data/catalog.json' with {type:'json'};
import type {Product} from './types.ts';
export const categories=design.categories;
export const presentationSlugs=slots.map(slot=>slot.slug);
export const homeSlotIds=['swap-35d1bd8ccb42','swap-f552ddd674fb','swap-ba19f94fd9cd'] as const;
/** Slots express editorial preferences; only live products can fill them. */
export function presentationProducts(slotIds:readonly string[],live:Product[]):Product[]{
 const available=live.filter(p=>p.game==='cs2'&&p.availability==='available'&&Number.isSafeInteger(p.priceMinor)&&p.priceMinor>0&&p.imageUrl&&p.imageUrl!=='/favicon.svg');
 const used=new Set<string>();
 return slotIds.flatMap(slotId=>{
  const slot=slots.find(s=>s.slot===slotId);const reference=design.products.find(p=>p.id===slotId);
  if(!reference)return [];
  const candidates=available.filter(p=>p.categoryId===reference.categoryId&&!used.has(p.id));
  const product=candidates.find(p=>p.marketHashName===slot?.marketHashName)??candidates[0];
  if(!product)return [];
  used.add(product.id);
  return [product];
 });
}
export function presentationArtwork(marketHashName:string):string|undefined {
 const slot=slots.find(s=>s.marketHashName===marketHashName);return slot?(process.env.NEXT_PUBLIC_BASE_PATH??'')+slot.art:undefined;
}

export function categoryArtwork(categoryId:string):string|undefined { const reference=design.products.find(p=>p.categoryId===categoryId);return reference?(process.env.NEXT_PUBLIC_BASE_PATH??"")+reference.imageUrl:undefined; }
