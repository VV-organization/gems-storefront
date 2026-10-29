import aliases from '../../data/catalog-aliases.json';
/** Legacy URLs resolve identity only; live catalog supplies price and availability. */
export function resolveCatalogAlias(slug:string):string {
 return Object.hasOwn(aliases,slug)?(aliases as Record<string,string>)[slug]??slug:slug;
}
