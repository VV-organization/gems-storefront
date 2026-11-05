import {describe,expect,it} from "vitest";
import {CatalogSupplierSyncService} from "./catalog-supplier-sync.service";

describe("supplier sync query budget",()=>{
  it("stores a large supplier snapshot without one round trip per listing",async()=>{
    const queries:string[]=[];
    const tx={query:(sql:string)=>{queries.push(sql);return Promise.resolve({rows:sql.includes("INSERT INTO catalog_sync_runs")?[{id:"run"}]:[],rowCount:0});}};
    const database={transaction:<T>(run:(client:typeof tx)=>Promise<T>)=>run(tx)};
    const service=new CatalogSupplierSyncService(database as never,{catalog:{publicGames:["cs2"]}} as never);
    const items=Array.from({length:501},(_,i)=>({game:"cs2" as const,marketHashName:`AK-47 | Batch ${i} (Field-Tested)`,availableQuantity:1,priceMicrousd:1000000n,imageUrl:null}));
    await service.syncSihGame({game:"cs2",client:{getItems:()=>Promise.resolve(items)}});
    expect(queries.filter(sql=>sql.includes("INSERT INTO supplier_listings")).length).toBeLessThanOrEqual(2);
  });
});
