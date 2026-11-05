import type {Catalog,Product} from './types.ts';
import {mapProduct,type CatalogApiProduct} from './catalog-adapter.ts';
import {categories,homeSlotIds,presentationSlugs,presentationProducts} from './presentation.ts';
import {CatalogRequestError} from './catalog-request.ts';

export type CatalogRequest=<T>(path:string,body?:unknown)=>Promise<T>;

export async function loadProduct(slug:string,request:CatalogRequest):Promise<Product|null>{
 try{return mapProduct(await request<CatalogApiProduct>(`/catalog/${encodeURIComponent(slug)}`));}
 catch(error){if(error instanceof CatalogRequestError&&error.status===404)return null;throw error;}
}

export async function loadCatalog(request:CatalogRequest):Promise<Catalog> {
 const results=await Promise.allSettled([request<{items:CatalogApiProduct[]}>('/catalog/preview?limit=60'),request<{items:CatalogApiProduct[]}>('/catalog/lookup',{slugs:presentationSlugs.slice(0,50)})]);
 const successful=results.filter(result=>result.status==='fulfilled');
 const products=[...new Map(successful.flatMap(result=>result.value.items).map(dto=>[dto.slug,mapProduct(dto)])).values()];
 return {mode:successful.length?'live':'unavailable',products,categories,capturedAt:successful.length?new Date().toISOString():''};
}

export async function loadHomeProducts(live:Product[],request:CatalogRequest):Promise<Product[]> {
 const selected=presentationProducts(homeSlotIds,live);
 const missing=['knife','pistol','rifle'].filter(category=>!selected.some(p=>p.categoryId===category));
 const results=await Promise.allSettled(missing.map(category=>request<{items:CatalogApiProduct[]}>(`/catalog/preview?game=cs2&status=available&categoryId=${category}&limit=3`)));
 const replacements=results.flatMap(result=>result.status==='fulfilled'?result.value.items.map(mapProduct):[]);
 return presentationProducts(homeSlotIds,[...live,...replacements]);
}
