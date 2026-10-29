import {expect,it} from 'vitest';
import {resolveCatalogAlias} from './catalog-aliases';
import aliases from '../../data/catalog-aliases.json';
it('resolves verified legacy identities without treating inherited object names as aliases',()=>{
 const [legacy,canonical]=Object.entries(aliases)[0]??[];
 if(!legacy)throw new Error('Missing identity mapping');
 expect(resolveCatalogAlias(legacy)).toBe(canonical);
 expect(resolveCatalogAlias('constructor')).toBe('constructor');
 expect(resolveCatalogAlias('__proto__')).toBe('__proto__');
 expect(resolveCatalogAlias('unknown-sku')).toBe('unknown-sku');
});
