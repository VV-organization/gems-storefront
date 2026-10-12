import type {Catalog,Product} from './types.ts';
import type {GameId} from './games.ts';
// Compact tuples keep the full searchable inventory out of the root React bundle.
export type CatalogRow = [id:string,name:string,category:string,image:string,quoteMinor:number,weapon:string,rarity:string,marketHashName:string];
export type ReferenceSnapshot = {game:GameId;capturedAt:string;totalCount?:number;sourceReportedCount?:number;categories:{id:string;name:string}[];rows:CatalogRow[]};
export function referencePrice(quoteMinor:number){
  if(!Number.isSafeInteger(quoteMinor)||quoteMinor<0||quoteMinor>Number.MAX_SAFE_INTEGER/4)throw new RangeError('Invalid reference price');
  const rubMinor=Number((BigInt(quoteMinor)*17n+5n)/10n);
  return {rubMinor,gemsMinor:rubMinor*2};
}
const wearNames:Record<string,string>={'Factory New':'Прямо с завода','Minimal Wear':'Немного поношенное','Field-Tested':'После полевых испытаний','Well-Worn':'Поношенное','Battle-Scarred':'Закалённое в боях'};
const wearPattern=/\s*\((Прямо с завода|Немного поношенное|После полевых испытаний|Поношенное|Закал[её]нное в боях|Factory New|Minimal Wear|Field-Tested|Well-Worn|Battle-Scarred)\)/;
export function expandSnapshot(snapshot:ReferenceSnapshot):Catalog{
  const categories=snapshot.categories.map(c=>({...c,description:''}));
  const names=new Map(categories.map(c=>[c.id,c.name]));
  const products=snapshot.rows.map(([id,name,categoryId,imageUrl,quote,weapon,rarity,marketHashName]):Product=>{
    const matched=snapshot.game==='cs2'?(name.match(wearPattern)?.[1]??marketHashName.match(wearPattern)?.[1]??''):'';
    const condition=wearNames[matched]??matched;
    const clean=snapshot.game==='cs2'?name.replace(wearPattern,''):name;
    const split=clean.split(' | ');
    return {id:`ref-${snapshot.game}-${id}`,referenceId:id,game:snapshot.game,name,categoryId,categoryName:names.get(categoryId)??'',imageUrl,
      condition,float:null,priceMinor:referencePrice(quote).gemsMinor,weapon:weapon||(split.length>1?split[0]:names.get(categoryId)??''),finish:split.length>1?split.slice(1).join(' | '):clean,
      rarity,stattrak:snapshot.game==='cs2'&&/StatTrak/i.test(name),marketHashName,description:'',
      source:{name:'shop-skin.com',url:`https://shop-skin.com/catalog/${id}`,capturedAt:snapshot.capturedAt,price:quote/100,currency:'Creeps',rublesPerUnit:1.7}};
  });
  return {mode:'preview',categories,products,capturedAt:snapshot.capturedAt};
}
const catalogs=new Map<GameId,Promise<Catalog>>();
export function loadGameCatalog(game:GameId):Promise<Catalog>{
  if(!catalogs.has(game)){
    const promise=fetch(`${process.env.NEXT_PUBLIC_BASE_PATH??''}/catalog-data/${game}.json`).then(async r=>{if(!r.ok)throw new Error('Каталог не загрузился');return expandSnapshot(await r.json());}).catch(error=>{catalogs.delete(game);throw error;});
    catalogs.set(game,promise);
  }
  return catalogs.get(game)!;
}
export async function loadDescription(product:Product):Promise<string>{
  if(!product.referenceId)return product.description;
  const response=await fetch(`${process.env.NEXT_PUBLIC_BASE_PATH??''}/catalog-data/details/${product.game}/${product.referenceId.slice(0,2)}.json`);
  if(!response.ok)throw new Error('Описание не загрузилось');
  const descriptions:Record<string,string>=await response.json();return descriptions[product.referenceId]??'';
}
