'use client';
import {useRef,useState} from 'react';
import Image from 'next/image';
import Link from 'next/link';
import type {Product} from '@/lib/types';
import {MotionHeading} from './motion';
import {Price} from './price';
import {CartAction} from './products';
import {Icon} from './icon';
import {useShop} from './shop-provider';

// Haunted's story stage: a persistent scene, explicit chapter choices, no autoplay.
export function CollectionStage({products}:{products:Product[]}){
  const [active,setActive]=useState(0);
  const shop=useShop();
  const scene=useRef<HTMLDivElement>(null);
  function choose(index:number){setActive(index);if(matchMedia('(max-width:700px)').matches)scene.current?.scrollIntoView({block:'start',behavior:matchMedia('(prefers-reduced-motion:reduce)').matches?'instant':'smooth'});}
  const product=products[active];
  if(!product)return null;
  return <section className="collection-stage section" id="collection" aria-labelledby="collection-title">
    <div className="section-heading"><MotionHeading id="collection-title">СТОИТ<br/><em>присмотреться.</em></MotionHeading><Link href="/catalog" className="text-link">Вся коллекция <Icon name="diagonal"/></Link></div>
    <div className={`collection-scene collection-tone-${active}`} ref={scene}>
      <button className="collection-save icon-button" aria-pressed={shop.favorites.includes(product.id)} aria-label={`${shop.favorites.includes(product.id)?'Убрать из избранного':'В избранное'}: ${product.name}`} onClick={()=>shop.toggleFavorite(product.id)}><Icon name="heart"/></button>
      <div className="collection-details" key={`copy-${product.id}`}>
        <span className="weapon-name">{product.weapon}</span><h3>{product.finish}</h3>
        <p>{product.condition}<br/>Float {product.float===null?'не указан':product.float.toFixed(6)}</p>
        <Price minor={product.priceMinor} large/>
        <CartAction product={product} added={shop.cart.some(p=>p.id===product.id)}/>
        <Link href={`/catalog/${product.id}`} className="text-link">Подробнее о скине <Icon name="diagonal"/></Link>
      </div>
      <button className="collection-object" key={product.id} onClick={()=>shop.setPreviewProduct(product)} aria-label={`Рассмотреть скин: ${product.name}`}><Image src={product.imageUrl} alt={product.name} width={1000} height={700}/><span>Рассмотреть <Icon name="plus" size={18}/></span></button>
      <div className="collection-choices" role="group" aria-label="Предметы подборки">{products.map((p,i)=><button key={p.id} aria-pressed={active===i} onClick={()=>choose(i)}><Image src={p.imageUrl} alt="" width={120} height={80}/><span>{p.weapon}<strong>{p.finish}</strong></span><Icon name="diagonal" size={18}/></button>)}</div>
    </div>
  </section>;
}
