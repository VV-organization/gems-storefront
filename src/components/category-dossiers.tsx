'use client';
import {MotionHeading} from './motion';
import {useState} from 'react';
import Link from 'next/link';
import Image from 'next/image';
import type {Catalog} from '@/lib/types';
import {Icon} from './icon';
export function CategoryDossiers({catalog}:{catalog:Catalog}){const [active,setActive]=useState('knife');return <section className="section dossiers" id="categories"><div className="dossier-layout"><div className="dossier-intro"><MotionHeading as="h2">ПО ДЕЛУ.<br/><em>По вкусу.</em></MotionHeading><p>От первого пистолетного<br/>до решающего раунда.</p></div><div className="dossier-rows">{catalog.categories.map((c,i)=>{const pool=catalog.products.filter(p=>p.categoryId===c.id),p=pool[0];return <article key={c.id} className={active===c.id?'dossier open':'dossier'}><button aria-expanded={active===c.id} aria-controls={`dossier-${c.id}`} onClick={()=>setActive(active===c.id?'':c.id)}><span>0{i+1}</span><h3>{c.name}</h3><Icon name={active===c.id?'close':'plus'}/></button><div id={`dossier-${c.id}`} className="dossier-body" hidden={active!==c.id}>{p&&<Image src={p.imageUrl} alt={p.name} width={360} height={240}/>}<div><p>{c.description}</p><Link href={`/catalog?category=${c.id}`} className="text-link">Смотреть {pool.length} предметов <Icon name="diagonal"/></Link></div></div></article>;})}</div></div></section>;}
