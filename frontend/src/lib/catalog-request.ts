export class CatalogRequestError extends Error {
 readonly status:number;
 constructor(status:number){super(`Catalog unavailable: ${status}`);this.status=status;}
}

/** Catalog calls are read-only, including POST lookup. Retry transient failures once. */
export async function requestCatalog<T>(origin:string,path:string,body?:unknown,fetcher:typeof fetch=fetch):Promise<T>{
 for(let attempt=0;;attempt++){
  try{
   const response=await fetcher(`${origin}${path}`,{cache:'no-store',signal:AbortSignal.timeout(5000),...(body===undefined?{}:{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)})});
   if(!response.ok)throw new CatalogRequestError(response.status);
   return await response.json() as T;
  }catch(error){
   if(attempt===1||(error instanceof CatalogRequestError&&error.status<500))throw error;
  }
 }
}
