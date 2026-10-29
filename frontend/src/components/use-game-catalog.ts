"use client";
import {useEffect,useState} from 'react';
import {catalogApi as api} from '@/lib/api';
import {mapProduct,categoryLabel,type CatalogPage,type CatalogApiProduct,type CategoryCounts} from '@/lib/catalog-adapter';
import {filterProducts,type Filters} from '@/lib/filters';
import type {GameId} from '@/lib/games';
import type {Catalog,Product} from '@/lib/types';
export function useGameCatalog(game:GameId,query='',offset=0,savedIds?:string[]){
 const [attempt,retry]=useState(0);
 const saved=JSON.stringify(savedIds??null);const scope=JSON.stringify([game,query,saved,attempt]);
 const [state,setState]=useState<{scope:string;offset:number;catalog:Catalog;total:number;counts:CategoryCounts;error?:string}>();
 useEffect(()=>{
  const controller=new AbortController();
  async function read(){
   let products:Product[],total:number,counts:CategoryCounts;
   const search=new URLSearchParams(query);search.set('game',game);search.set('limit','24');search.set('offset',String(offset));
   if(saved!=='null'){
    const ids=JSON.parse(saved) as string[];products=[];
    for(let i=0;i<ids.length;i+=50){const result=await api.post<{items:CatalogApiProduct[]}>('/catalog/lookup',{slugs:ids.slice(i,i+50)},{anonymous:true,signal:controller.signal});products.push(...result.items.map(mapProduct));}
    const filters:Filters={category:search.get('category')??'all',query:search.get('q')??'',condition:search.get('condition')??'',min:search.get('min')??'',max:search.get('max')??'',stattrak:search.get('stattrak')==='1',sort:search.get('sort')??'price-asc'};
    products=filterProducts(products.filter(p=>p.game===game),{...filters,category:'all'});counts={all:products.length,byCategory:{}};for(const p of products)counts.byCategory[p.categoryId]=(counts.byCategory[p.categoryId]??0)+1;
    if(filters.category!=='all')products=products.filter(p=>p.categoryId===filters.category);total=products.length;products=products.slice(offset,offset+24);
   }else{if(search.has('category')){search.set('categoryId',search.get('category')!);search.delete('category');}const page=await api.get<CatalogPage>(`/catalog?${search}`,{signal:controller.signal});products=page.items.map(mapProduct);total=page.pagination.total;counts=page.categoryCounts;}
   if(controller.signal.aborted)return;
   setState(previous=>({scope,offset,total,counts,catalog:{mode:'live',capturedAt:'',products:offset>0&&previous?.scope===scope?[...new Map([...previous.catalog.products,...products].map(p=>[p.id,p])).values()]:products,categories:Object.keys(counts.byCategory).map(id=>({id,name:categoryLabel(id),description:''}))}}));
  }
  void read().catch(()=>{if(!controller.signal.aborted)setState({scope,offset,total:0,counts:{all:0,byCategory:{}},catalog:{mode:'unavailable',products:[],categories:[],capturedAt:''},error:'Не удалось загрузить каталог. Попробуйте ещё раз.'});});
  return()=>controller.abort();
 },[game,query,offset,saved,scope]);
 const current=state?.scope===scope?state:undefined;
 return {catalog:current?.error?undefined:current?.catalog,error:current?.error,total:current?.total??0,counts:current?.counts,loading:!current||current.offset!==offset,retry:()=>retry(n=>n+1)};
}
