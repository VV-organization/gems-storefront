import Link from 'next/link';
import type {Catalog} from '@/lib/types';
import {Hero} from './hero';
import {Topups} from './topups';
import {ProductCard} from './products';
import {SkinCompare} from './skin-compare';
import {CategoryDossiers} from './category-dossiers';
import {ArsenalBuilder} from './arsenal-builder';
import {GiftCards} from './gift-cards';
import {Converter} from './converter';
import {Icon} from './icon';
import {MotionHeading} from './motion';
const faq=[['Что такое Gems?','Внутренняя валюта магазина. 1 рубль = 2 Gems, поэтому 1 000 Gems стоят 500 ₽. Рядом с ценой каждого предмета есть сумма в рублях.'],['Как получить выбранный скин?','Скины передаются обменом Steam. Добавьте ссылку trade-URL в кабинете и проверьте аккаунт, на который хотите получить предметы.'],['Пополнение Steam и Gems — одно и то же?','Нет. Steam пополняется рублями на отдельный аккаунт. Gems используются для расчёта стоимости предметов в этом магазине.'],['Какая комиссия у Steam?','5% от суммы зачисления. Например: на аккаунт 1 000 ₽, комиссия 50 ₽, итого к оплате 1 050 ₽.'],['Как работают комплекты?','Вы выбираете три конкретных предмета. Стоимость складывается из их цен. Повторно уже добавленный предмет в корзину не попадёт.'],['Как выбрать регион карты Apple?','Регион карты должен совпадать с регионом Apple Account. При смене страны нужно заново выбрать номинал и подтвердить совместимость.']];
export function Home({catalog}:{catalog:Catalog}){const selected=['swap-35d1bd8ccb42','swap-f552ddd674fb','swap-ba19f94fd9cd'].flatMap(id=>catalog.products.filter(p=>p.id===id));return <div className="home"><Hero products={[selected[2],selected[1],selected[0]].filter(Boolean)}/><div className="marquee" aria-hidden="true"><div>{[0,1,2,3].map(n=><span key={n}>ХАРАКТЕР В ДЕТАЛЯХ <b>✳</b> GEMS COLLECTION <b>✳</b> НАХОДИ СВОЁ <b>✳</b></span>)}</div></div><Topups/><section className="section selected-section"><div className="section-heading"><MotionHeading as="h2">СТОИТ<br/><em>присмотреться.</em></MotionHeading><Link className="text-link" href="/catalog">Вся коллекция <Icon name="diagonal"/></Link></div><div className="curated-grid">{selected.map(p=><ProductCard key={p.id} product={p}/>)}</div></section><SkinCompare products={catalog.products}/><CategoryDossiers catalog={catalog}/><ArsenalBuilder products={catalog.products}/><GiftCards/><Converter/><section className="section faq-section" id="faq"><div><MotionHeading as="h2">ОСТАЛИСЬ<br/><em>вопросы?</em></MotionHeading><p>Ответы уже здесь.</p></div><div className="faq-list">{faq.map(([q,a])=><details key={q}><summary>{q}<Icon name="plus"/></summary><p>{a}</p></details>)}</div></section></div>;}
