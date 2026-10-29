export type Category = { id:string; name:string; description:string };
export type Product = {
  id:string; name:string; description:string; imageUrl:string; categoryId:string;
  game?:"cs2"|"rust"|"tf2"; referenceId?:string; categoryName?:string; marketHashName?:string;
  availability?:"available"|"unavailable"; priceRevision?:string; pricingSettingId?:string; condition:string; float:number | null; priceMinor:number;
  weapon:string; finish:string; rarity:string; stattrak:boolean;
  source: { name:string; url:string; capturedAt:string; price:number; currency:string; rublesPerUnit:number };
};
export type Catalog = { mode:"preview" | "live" | "unavailable"; products:Product[]; categories:Category[]; capturedAt:string };
export type IntegrationState = { available:boolean; reason:string };
