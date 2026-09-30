'use client';
import {MotionHeading} from './motion';
import {useRef,useState} from 'react';
import Link from 'next/link';
import Image from 'next/image';
import type {Catalog} from '@/lib/types';
import {Icon} from './icon';
export function CategoryDossiers({catalog}:{catalog:Catalog}){
 const [active,setActive]=useState('knife');
 const preview=useRef<HTMLDivElement>(null);
 function choose(id:string){setActive(id);if(matchMedia('(max-width:700px)').matches)preview.current?.scrollIntoView({block:'nearest',behavior:matchMedia('(prefers-reduced-motion:reduce)').matches?'instant':'smooth'});}
 const category=catalog.categories.find(c=>c.id===active)??catalog.categories[0];
 const pool=catalog.products.filter(p=>p.categoryId===category.id),product=pool[0];
 return <section className="section dossiers" id="categories"><div className="section-heading"><MotionHeading>ПО ДЕЛУ.<br/><em>По вкусу.</em></MotionHeading><p>От первого пистолетного<br/>до решающего раунда.</p></div><div className="category-atlas"><div className="category-preview" id="category-preview" ref={preview}><div className="category-preview-art" key={category.id}>{product&&<Image src={product.imageUrl} alt={product.name} width={900} height={700}/>}</div><div className="category-preview-caption"><p>{category.description}</p><Link href={`/catalog?category=${category.id}`} className="text-link">Смотреть {pool.length} предметов <Icon name="diagonal"/></Link></div></div><div className="category-index" role="group" aria-label="Категории скинов">{catalog.categories.map(c=><button key={c.id} aria-pressed={active===c.id} aria-controls="category-preview" onClick={()=>choose(c.id)}><h3>{c.name}</h3><Icon name={active===c.id?'diagonal':'plus'}/></button>)}</div></div></section>;
}
