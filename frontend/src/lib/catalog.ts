import {cache} from "react";
import type { Product } from './types';
import {presentationProducts} from './presentation';
import {loadCatalog,loadHomeProducts,loadProduct} from './catalog-source';
import {requestCatalog} from './catalog-request';
const origin=()=>process.env.GEMS_BACKEND_ORIGIN??'http://127.0.0.1:5202';
async function backend<T>(path:string,body?:unknown):Promise<T>{
 return requestCatalog<T>(origin(),path,body);
}
export const getCatalog=cache(()=>loadCatalog(backend));
export const getHomeProducts=cache(async()=>loadHomeProducts((await getCatalog()).products,backend));
export const getProduct=cache((slug:string)=>loadProduct(slug,backend));
export const featuredIds = ['swap-0282387e3432','swap-5c3715c0960b','baron-1a5f3d48-c150-4cf6-ad3a-9e5916c737c3','swap-6aa7ec4ed3fb','swap-a360a2cd8d9d','swap-8d1c7a992820','swap-ba19f94fd9cd','swap-64ba82db6655'];
export function featuredProducts(products:Product[]){return presentationProducts(featuredIds,products);}
