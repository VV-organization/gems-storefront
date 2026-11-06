import {catalogApi} from './api';
import type {CatalogApiProduct} from './catalog-adapter';

export type CatalogPreview={items:CatalogApiProduct[]};
// Bounded reads must leave loading state even if a server/proxy never responds.
export const previewClient={
 get<T>(path:string,options:{signal?:AbortSignal}={}){
  const timeout=AbortSignal.timeout(10000);
  return catalogApi.get<T>(path,{signal:options.signal?AbortSignal.any([options.signal,timeout]):timeout});
 },
};
