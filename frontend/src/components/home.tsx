import type {Catalog,Product} from '@/lib/types';
import {Hero} from './hero';
import {Topups} from './topups';
import {CollectionStage} from './collection-stage';
import {HelpDesk} from './help-desk';
import {SkinCompare} from './skin-compare';
import {CategoryDossiers} from './category-dossiers';
import {BudgetFinder} from './budget-finder';
import {Converter} from './converter';
export function Home({catalog,products}:{catalog:Catalog;products:Product[]}){return <div className="home"><Hero products={[...products].reverse()}/><div className="marquee" aria-hidden="true"><div>{[0,1,2,3].map(n=><span key={n}>ХАРАКТЕР В ДЕТАЛЯХ <b>✳</b> GEMS COLLECTION <b>✳</b> НАХОДИ СВОЁ <b>✳</b></span>)}</div></div><Topups/><CollectionStage products={products}/><SkinCompare products={catalog.products}/><CategoryDossiers catalog={catalog}/><BudgetFinder products={catalog.products} categories={catalog.categories}/><Converter/><HelpDesk/></div>;}
