"use client";
import {MotionHeading} from './motion';
import {useEffect,useState} from "react";
import Image from "next/image";
import Link from "next/link";
import {mapProduct} from '@/lib/catalog-adapter';
import {previewClient,type CatalogPreview} from '@/lib/catalog-preview';
import {useRemote} from '@/lib/use-remote';
import type {Product} from "@/lib/types";
import {gemsToRub,formatMinor} from "@/lib/money";
import {Price} from "./price";
import {useShop} from "./shop-provider";

export function SkinCompare({products}:{products:Product[]}){
 const shop=useShop();
 const available=products.filter(p=>p.game==='cs2'&&p.availability==='available'&&p.priceMinor>0&&p.weapon);
 const weaponList=useRemote<{weapons:string[]}>('/catalog/comparison-weapons',null,previewClient,true);
 const [weapon,setWeapon]=useState('AK-47');
 const weapons=[...new Set(['AK-47',weapon,...available.map(p=>p.weapon),...(weaponList.data?.weapons??[])])];
 const [attempt,retry]=useState(0);
 const [options,setOptions]=useState<{weapon:string;attempt:number;items:Product[];error:boolean;done:boolean}>();
 useEffect(()=>{
  const controller=new AbortController();const items:Product[]=[];
  void (async()=>{
   for(let offset=0;;offset+=60){
    const page=await previewClient.get<CatalogPreview>(`/catalog/preview?game=cs2&status=available&weapon=${encodeURIComponent(weapon)}&limit=60&offset=${offset}`,{signal:controller.signal});
    if(controller.signal.aborted)return;
    const known=new Set(items.map(p=>p.id));
    items.push(...page.items.map(mapProduct).filter(p=>p.game==='cs2'&&p.weapon===weapon&&p.availability==='available'&&p.priceMinor>0&&!known.has(p.id)));
    const done=page.items.length<60||items.length===known.size;
    setOptions({weapon,attempt,items:[...items],error:false,done});
    if(done)break;
   }
  })().catch(()=>{if(!controller.signal.aborted)setOptions(previous=>({weapon,attempt,items:items.length?[...items]:previous?.weapon===weapon?previous.items:[],error:true,done:true}));});
  return()=>controller.abort();
 },[weapon,attempt]);
 const retained=options?.weapon===weapon?options:undefined;
 const current=retained?.attempt===attempt?retained:undefined;
 const seed=available.filter(p=>p.weapon===weapon);
 const pool=retained&&(!retained.error||retained.items.length)?retained.items:seed;
 const loading=!current||!current.done;
 const retryButton=<button className="button secondary" onClick={()=>{retry(n=>n+1);if(weaponList.error)weaponList.reload();}}>Повторить</button>;
 const [ids,setIds]=useState<[string,string]>(["",""]);
 const left=pool.find(p=>p.id===ids[0])??pool[0];
 const right=pool.find(p=>p.id===ids[1]&&p.id!==left?.id)??pool.find(p=>p.id!==left?.id);
 const header=(<header><div><MotionHeading as="h2" id="compare-title">Сравнение</MotionHeading><p>Выберите оружие и два покрытия. Сопоставьте цену, состояние и float.</p></div><label className="compare-weapon">Оружие<span className="compare-select-wrap"><select aria-label="Оружие" value={weapon} onChange={event=>{setWeapon(event.target.value);setIds(["",""]);}}>{weapons.map(item=><option key={item}>{item}</option>)}</select><span className="compare-chevron" aria-hidden="true"/></span></label></header>);
 if(!left||!right)return <section className="skin-compare" id="compare" aria-labelledby="compare-title">{header}<p role="status">{(current?.error||weaponList.error)?"Не удалось загрузить варианты.":loading?"Загружаем варианты для сравнения…":"Недостаточно предметов для сравнения."}</p>{!loading&&retryButton}</section>;
 const pair=[left,right];
 const difference=Math.abs(left.priceMinor-right.priceMinor);
 const rubDifference=Math.abs(gemsToRub(left.priceMinor)-gemsToRub(right.priceMinor));
 const cheaper=left.priceMinor<right.priceMinor?left:right;
 function select(index:number,id:string){
  const other=pair[1-index];
  const alternate=other.id===id?pair[index].id:other.id;
  setIds(index===0?[id,alternate]:[alternate,id]);
 }
 return <section className="skin-compare" id="compare" aria-labelledby="compare-title">
  {header}
  {(current?.error||weaponList.error)&&<div className="compare-load-status"><p role="status">Не удалось обновить все варианты. Показаны уже загруженные предметы.</p>{retryButton}</div>}
  <div className="compare-table" role="table" aria-label="Сравнение выбранных скинов">
   <div className="compare-row compare-selection" role="row"><span role="columnheader">Предмет</span>{pair.map((p,i)=><div role="columnheader" key={i}><label className="sr-only" htmlFor={`compare-${i}`}>{i===0?"Первый скин":"Второй скин"}</label><span className="compare-select-wrap"><select id={`compare-${i}`} value={p.id} onChange={event=>select(i,event.target.value)}>{pool.map(item=><option key={item.id} value={item.id}>{item.finish} · {item.condition}{item.stattrak?" · StatTrak":""}</option>)}</select><span className="compare-chevron" aria-hidden="true"/></span><button key={p.id} className="compare-image" aria-label={`Рассмотреть для сравнения: ${p.name}`} onClick={()=>shop.setPreviewProduct(p)}><Image key={p.id} src={p.imageUrl} alt={p.name} width={600} height={350}/><span>↗</span></button><h3>{p.finish}</h3></div>)}</div>
   <div className="compare-row" role="row"><span role="rowheader">Цена</span>{pair.map(p=><div role="cell" key={p.id}><Price minor={p.priceMinor}/></div>)}</div>
   <div className="compare-row" role="row"><span role="rowheader">Состояние</span>{pair.map(p=><span role="cell" key={p.id}>{p.condition}</span>)}</div>
   <div className="compare-row" role="row"><span role="rowheader">Float</span>{pair.map(p=><span role="cell" key={p.id}>{p.float===null?"Не указан":p.float.toFixed(6)}</span>)}</div>
   <div className="compare-row" role="row"><span role="rowheader">StatTrak™</span>{pair.map(p=><span role="cell" key={p.id}>{p.stattrak?"Есть":"Нет"}</span>)}</div>
   <div className="compare-row compare-actions" role="row"><span role="rowheader">Подробнее</span>{pair.map(p=><div role="cell" key={p.id}><Link href={`/catalog/${p.id}`}>Открыть скин <span aria-hidden="true">↗</span></Link></div>)}</div>
  </div>
  <div className="compare-verdict" role="status" aria-atomic="true">{difference>0?<><span>{cheaper.finish} дешевле на</span><strong>{formatMinor(difference)} Gems <small>≈ {formatMinor(rubDifference)} ₽</small></strong></>:<strong>Оба предмета стоят одинаково</strong>}<span className="compare-note">Float описывает износ, но сам по себе не определяет стоимость скина.</span></div>
 </section>;
}
