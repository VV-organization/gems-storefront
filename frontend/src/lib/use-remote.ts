'use client';
import {useCallback,useEffect,useState} from 'react';
import {api,catalogApi,ApiError,type ApiClient} from './api';
export function useRemote<T>(path:string|null,owner:string|null,clientOverride:Pick<ApiClient,'get'>|undefined=undefined,keepPreviousData=false){
 const client=clientOverride??(path?.startsWith('/catalog')?catalogApi:api);
 const [revision,setRevision]=useState(0),[result,setResult]=useState<{key:string;scope:string;data:T|null;error:string;status:number}>({key:'',scope:'',data:null,error:'',status:0});
 const scope=JSON.stringify([path,owner]);
 const key=JSON.stringify([path,owner,revision]);
 const reload=useCallback(()=>setRevision(n=>n+1),[]);
 useEffect(()=>{
  if(!path)return;const controller=new AbortController();
  void client.get<T>(path,{signal:controller.signal}).then(data=>{if(!controller.signal.aborted)setResult({key,scope,data,error:'',status:200});}).catch(error=>{if(!controller.signal.aborted&&!(error instanceof DOMException&&error.name==='AbortError'))setResult({key,scope,data:null,error:'Не удалось загрузить данные. Попробуйте ещё раз.',status:error instanceof ApiError?error.status:0});});
  return()=>controller.abort();
 },[key,path,scope,client]);
 useEffect(()=>{if(!path||owner!==null)return;window.addEventListener('focus',reload);return()=>window.removeEventListener('focus',reload);},[path,owner,reload]);
 const current=result.key===key;
 return {data:current||keepPreviousData&&result.scope===scope?result.data:null,error:current?result.error:'',status:current?result.status:0,loading:!!path&&!current,reload};
}
