"use client";
import {useState} from "react";
import {usePathname,useSearchParams} from "next/navigation";
import {invalidPriceRange,type Filters} from "@/lib/filters";
import {gameId} from "@/lib/games";
import {useGameCatalog} from "./use-game-catalog";
import {useShop} from "./shop-provider";
import {ProductCard} from "./products";
import {Icon} from "./icon";
import {GameSelector} from "./game-selector";
export function CatalogView(){
 const shop=useShop();const params=useSearchParams();const pathname=(process.env.NEXT_PUBLIC_BASE_PATH??"")+usePathname();
 const game=gameId(params.get('game'));
 const [showFilters,setShowFilters]=useState(false);const [categoryQuery,setCategoryQuery]=useState('');
 const [pagination,setPagination]=useState({key:'',count:24});
 const categoryParam=params.get('category')??'all';
 const filters:Filters={query:params.get('q')??'',category:categoryParam,condition:game==='cs2'?(params.get('condition')??''):'',min:params.get('min')??'',max:params.get('max')??'',sort:params.get('sort')??'price-asc',stattrak:game==='cs2'&&params.get('stattrak')==='1'};
 const saved=params.get('saved')==='1';
 function change(values:Record<string,string|boolean>){const next=new URLSearchParams(window.location.search);for(const [key,value] of Object.entries(values)){if(value===false||value===''||value==='all')next.delete(key);else next.set(key,value===true?'1':String(value));}window.history.replaceState(null,'',`${pathname}?${next}`);}
 function reset(){window.history.replaceState(null,'',`${pathname}?game=${game}`);setCategoryQuery('');}
 const pageKey=params.toString();const visibleCount=pagination.key===pageKey?pagination.count:24;
 const requestParams=new URLSearchParams(params);requestParams.delete('saved');
 const {catalog,error,retry,total,counts:serverCounts,loading}=useGameCatalog(game,requestParams.toString(),visibleCount-24,saved?shop.favorites:undefined);
 const products=catalog?.products??[];const counts=new Map(Object.entries(serverCounts?.byCategory??{}));
 const categories=(catalog?.categories??[]).filter(c=>c.name.toLocaleLowerCase().includes(categoryQuery.toLocaleLowerCase()));
 const invalid=invalidPriceRange(filters.min,filters.max);
 return <div className="page-container catalog-page multi-game-catalog">
  <div className="page-heading"><div><h1>Каталог</h1><p className="muted">Три игры. Тысячи деталей. Найди свои.</p></div></div>
  <GameSelector value={game} onChange={id=>{change({game:id,category:'',condition:'',stattrak:false});setCategoryQuery('');}}/>
  <div className="catalog-toolbar"><button className={`saved-filter ${saved?'active':''}`} aria-pressed={saved} onClick={()=>change({saved:!saved})}><Icon name="heart" size={17}/>Избранное</button><label className="search-input"><Icon name="search"/><input aria-label="Поиск по предметам" placeholder="Название предмета или оружия" maxLength={1024} value={filters.query} onChange={e=>change({q:e.target.value})}/>{filters.query&&<button aria-label="Очистить поиск" onClick={()=>change({q:''})}><Icon name="close" size={16}/></button>}</label><button className="button secondary filter-toggle" aria-expanded={showFilters} onClick={()=>setShowFilters(!showFilters)}><Icon name="filter"/>Фильтры</button><label className="sort-control"><span className="sr-only">Сортировка</span><select value={filters.sort} onChange={e=>change({sort:e.target.value})}><option value="price-asc">Сначала дешевле</option><option value="price-desc">Сначала дороже</option><option value="name-asc">Название: А–Я</option><option value="name-desc">Название: Я–А</option></select><Icon name="chevron" size={16}/></label></div>
  <div className="catalog-layout"><aside className={`catalog-filters ${showFilters?'filters-open':''}`} aria-label="Фильтры каталога"><div className="filter-heading"><strong>Фильтры</strong><button className="subtle-button" onClick={reset}>Сбросить</button></div>
  <fieldset className="category-fieldset"><legend>Категория</legend><input className="category-search" aria-label="Найти категорию" placeholder="Найти категорию" value={categoryQuery} onChange={e=>setCategoryQuery(e.target.value)}/><div className="category-options"><button className={filters.category==='all'?'active':''} aria-pressed={filters.category==='all'} onClick={()=>change({category:'all'})}><span>Все предметы</span><small>{serverCounts?.all??'—'}</small></button>{categories.map(c=><button key={c.id} className={filters.category===c.id?'active':''} aria-pressed={filters.category===c.id} onClick={()=>change({category:c.id})}><span>{c.name}</span><small>{counts.get(c.id)??0}</small></button>)}</div></fieldset>
  <fieldset><legend>Цена в Gems</legend><div className="price-range"><input aria-label="Цена от, Gems" placeholder="От" inputMode="decimal" value={filters.min} onChange={e=>change({min:e.target.value})}/><span>—</span><input aria-label="Цена до, Gems" placeholder="До" inputMode="decimal" value={filters.max} onChange={e=>change({max:e.target.value})}/></div><p className="fine-print">1 ₽ = 2 Gems</p>{invalid&&<p role="alert" className="form-message">Проверьте диапазон цен.</p>}</fieldset>
  {game==='cs2'&&<><fieldset><legend>Состояние</legend>{[['','Любое'],['FN','Прямо с завода'],['MW','Немного поношенное'],['FT','После полевых испытаний'],['WW','Поношенное'],['BS','Закалённое в боях']].map(([code,name])=><label className="filter-option" key={code}><input type="radio" name="condition" checked={filters.condition===code} onChange={()=>change({condition:code})}/><span>{name}</span>{code&&<small>{code}</small>}</label>)}</fieldset><label className="filter-option stattrak-filter"><input type="checkbox" checked={filters.stattrak} onChange={e=>change({stattrak:e.target.checked})}/><span>Только StatTrak™</span></label></>}
  </aside><section className="catalog-results" aria-label="Результаты поиска" aria-busy={!catalog&&!error}>
  {!catalog?(<div className="empty-state" role="status"><p>{error??'Загружаем предметы…'}</p>{error&&<button className="button primary" onClick={retry}>Попробовать ещё раз</button>}</div>):<><div className="results-count" role="status"><span>{total.toLocaleString('ru-RU')}</span> предметов найдено <span className="results-line"/></div>{filters.category!=='all'&&<div className="filter-chips"><button onClick={()=>change({category:'all'})}>{catalog.categories.find(c=>c.id===filters.category)?.name??filters.category} <Icon name="close" size={12}/></button></div>}{products.length?<><div className="product-grid">{products.map(p=><ProductCard key={p.id} product={p}/>)}</div><div className="catalog-pagination"><span>Показано {products.length} из {total.toLocaleString('ru-RU')}</span>{products.length<total&&<button className="button secondary" disabled={loading} onClick={()=>setPagination({key:pageKey,count:visibleCount+24})}>Показать ещё <Icon name="plus"/></button>}</div></>:<div className="empty-state"><Icon name="search" size={34}/><h2>Ничего не нашлось</h2><p>{saved?'В этой игре пока нет подходящих избранных предметов.':'Попробуйте изменить запрос или фильтры.'}</p><button className="button primary" onClick={reset}>Сбросить фильтры</button></div>}</>}
  </section></div>
 </div>;
}