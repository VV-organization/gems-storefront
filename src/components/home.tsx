import type {Catalog} from '@/lib/types';
import {Hero} from './hero';
import {Topups} from './topups';
import {CollectionStage} from './collection-stage';
import {HelpDesk} from './help-desk';
import {SkinCompare} from './skin-compare';
import {CategoryDossiers} from './category-dossiers';
import {ArsenalBuilder} from './arsenal-builder';
import {GiftCards} from './gift-cards';
import {Converter} from './converter';
export function Home({catalog}:{catalog:Catalog}){const selected=['swap-35d1bd8ccb42','swap-f552ddd674fb','swap-ba19f94fd9cd'].flatMap(id=>catalog.products.filter(p=>p.id===id));return <div className="home"><Hero products={[selected[2],selected[1],selected[0]].filter(Boolean)}/><div className="marquee" aria-hidden="true"><div>{[0,1,2,3].map(n=><span key={n}>ХАРАКТЕР В ДЕТАЛЯХ <b>✳</b> GEMS COLLECTION <b>✳</b> НАХОДИ СВОЁ <b>✳</b></span>)}</div></div><Topups/><CollectionStage products={selected}/><SkinCompare products={catalog.products}/><CategoryDossiers catalog={catalog}/><ArsenalBuilder products={catalog.products}/><GiftCards/><Converter/><HelpDesk/></div>;}
