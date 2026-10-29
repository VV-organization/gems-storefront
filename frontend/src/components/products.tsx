"use client";
import {useEffect,useState} from "react";
import Link from "next/link";
import type {Product} from "@/lib/types";
import {conditionCode} from "@/lib/filters";
import {gameName,hasWear,productHref,games} from "@/lib/games";
import {loadDescription} from "@/lib/reference-catalog";
import {catalogImageSrc} from "@/lib/catalog-image";
import {CartNotice,useShop} from "./shop-provider";
import {ProductImage} from "./product-image";
import {Icon} from "./icon";
import {Price} from "./price";
import {Modal} from "./modal";
import {SkinInspection} from "./skin-inspection";
export function ProductCard({product}:{product:Product}){
 const shop=useShop();const added=shop.cart.some(p=>p.id===product.id);
 return <article className={`product-card rarity-${product.categoryId}`} data-game={product.game??'cs2'}>
  <div className="product-meta"><span>{product.stattrak?"STATTRAK™":games.find(g=>g.id===(product.game??"cs2"))!.name}</span><abbr title={product.condition}>{hasWear(product)?conditionCode(product.condition):""}</abbr><button className="favorite-button" aria-label={`${shop.favorites.includes(product.id)?"Убрать из избранного":"В избранное"}: ${product.name}`} aria-pressed={shop.favorites.includes(product.id)} onClick={()=>shop.toggleFavorite(product.id)}><Icon name="heart" size={17}/></button></div>
  <button className="product-image-button" aria-label={`Быстрый просмотр: ${product.name}`} onClick={()=>shop.setPreviewProduct(product)}><ProductImage src={catalogImageSrc(product.imageUrl)} alt={product.name} width={400} height={300}/><span className="quick-label"><Icon name="eye" size={15}/> Быстрый просмотр</span></button>
  <div className="product-info"><span className="weapon-name">{product.weapon}</span><h3><Link href={productHref(product)}>{product.finish}</Link></h3><p className="card-float">{hasWear(product)?`Float · ${product.float===null?"Не указан":product.float.toFixed(6)}`:product.rarity??""}</p><div className="product-bottom"><Price unpriced={product.priceMinor<=0} minor={product.priceMinor}/><CartAction product={product} compact added={added}/></div></div>
 </article>;
}
export function ProductDetails({product,quick=false}:{product:Product;quick?:boolean}){
 const shop=useShop();const category=product.categoryName??shop.categories.find(c=>c.id===product.categoryId)?.name;
 const [description,setDescription]=useState({id:"",text:"",error:false});
 useEffect(()=>{let active=true;if(product.referenceId)loadDescription(product).then(text=>{if(active)setDescription({id:product.id,text,error:false});}).catch(()=>{if(active)setDescription({id:product.id,text:"",error:true});});return()=>{active=false;};},[product]);
 return <div className={`product-detail ${quick?"quick-detail":"full-detail"}`}>
  {!quick&&hasWear(product)?<SkinInspection product={product}/>:<div className="detail-visual"><span className="eyebrow">{gameName(product)}{hasWear(product)?` / ${conditionCode(product.condition)}`:""}</span><ProductImage src={product.imageUrl} alt={product.name} width={900} height={700} loading="eager"/><span className="detail-image-note">{product.weapon}<span>↗</span></span></div>}
  <div className="detail-content"><span className="eyebrow pink">{category}{product.stattrak?" / STATTRAK™":""}</span>{quick?<h2>{product.weapon}<span>{product.finish}</span></h2>:<h1>{product.weapon}<span>{product.finish}</span></h1>}<p className="muted">{product.condition}</p>
  {!quick&&<div className="skin-specs"><div><span>Категория</span><strong>{category}</strong></div><div><span>Игра</span><strong>{gameName(product)}</strong></div>{product.rarity&&<div><span>Качество</span><strong>{product.rarity}</strong></div>}</div>}
  {hasWear(product)&&<div className="float-block"><div><span>Степень износа / Float</span><strong>{product.float===null?"Не указан":product.float.toFixed(6)}</strong></div><div className="float-track">{product.float!==null&&<span style={{left:`${Math.min(100,product.float*100)}%`}}/>}</div><div className="float-labels"><span>FN</span><span>MW</span><span>FT</span><span>WW</span><span>BS</span></div></div>}
  <div className="detail-price-block"><span className="eyebrow">СТОИМОСТЬ</span><Price unpriced={product.priceMinor<=0} minor={product.priceMinor} large/></div><CartAction product={product} added={shop.cart.some(p=>p.id===product.id)}/>
  {quick&&<Link className="text-link" href={productHref(product)} onClick={()=>shop.setPreviewProduct(null)}>Подробнее о предмете <Icon name="diagonal" size={16}/></Link>}
  <p className="product-description">{product.referenceId?(description.id===product.id?(description.error?"Описание не загрузилось. Обновите страницу, чтобы повторить.":description.text):"Загружаем описание…"):product.description}</p>
  </div>
 </div>;
}
export function QuickView(){const shop=useShop();return shop.previewProduct?<Modal wide title={shop.previewProduct.name} onClose={()=>shop.setPreviewProduct(null)}><ProductDetails product={shop.previewProduct} quick/><CartNotice/></Modal>:null;}
export function CartAction({product,added,compact=false}:{product:Product;added:boolean;compact?:boolean}){
 const shop=useShop();const className=compact?`add-button ${added?"added":""}`:"button primary full";
 return added?<Link className={className} href="/cart" aria-label={compact?`Перейти в корзину: ${product.name}`:undefined} onClick={()=>{shop.setPreviewProduct(null);shop.dismissNotice();}}>{compact?<span>Перейти<br/>в корзину</span>:<><Icon name="cart"/>Перейти в корзину<Icon name="arrow"/></>}</Link>:<button disabled={product.availability!=="available"||shop.cartLoading} className={className} onClick={()=>shop.add(product)} aria-label={compact?`В корзину: ${product.name}`:undefined}><Icon name={compact?"plus":"cart"}/>{!compact&&<>{product.availability!=="available"?"Недоступен":"В корзину"}<Icon name="arrow"/></>}</button>;
}
