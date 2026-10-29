"use client";
import {useState,useEffect,useEffectEvent} from "react";
import {ProductImage} from "./product-image";
import {productHref,hasWear,gameName} from "@/lib/games";
import Link from "next/link";
import {sumPrices,formatMinor,gemsToRub} from "@/lib/money";
import {api,ApiError} from "@/lib/api";
import {useQuote} from "@/lib/use-quote";
import {skinShortfall} from "@/lib/commerce-status";
import type {ApiResponses} from "@/generated/api-types";
import {useRouter} from "next/navigation";
import {useShop} from "./shop-provider";
import {Price} from "./price";
import {Icon} from "./icon";
import {EmptyInventory} from "./empty-inventory";
export function CartView(){
  const shop=useShop(),router=useRouter();const [message,setMessage]=useState("");const [busy,setBusy]=useState(false);const totals=sumPrices(shop.cart.map(p=>p.priceMinor));
  const enter=useEffectEvent(()=>{if(shop.user?.steam.connected){shop.refreshWallet();void shop.refreshCart().catch(()=>setMessage('Не удалось обновить корзину. Перезагрузите страницу.'));}});
  useEffect(()=>{enter();},[shop.user?.id]);
  const pending=api.pendingCommand('checkout');
  const pricing=useQuote<ApiResponses["/checkout/quotes"]["post"]>("/checkout/quotes",{cartVersion:shop.cartVersion},shop.user?.id??null,!!shop.user?.steam.connected&&shop.tradeConfigured&&shop.cart.length>0&&!shop.cartLoading&&!!shop.config?.capabilities.checkoutEnabled);
  const total=pricing.quote?.totalCoinMinor??totals.gems;
  const shortfall=shop.wallet?skinShortfall(total,shop.wallet.availableCoinMinor):null;
  async function checkout(){
    if(!shop.user?.steam.connected){shop.login();return;}
    if(!pending&&(!pricing.quote||pricing.expired)){pricing.refresh();return;}
    setBusy(true);setMessage("");
    try{await api.command<{id:string}>('checkout','POST','/checkout/cart',pending?.body??{quoteId:pricing.quote!.id,cartVersion:shop.cartVersion},result=>typeof result?.id==='string'&&!!result.id);void shop.refreshCart().catch(()=>{});shop.refreshWallet();router.push('/account?tab=orders');}
    catch(error){if(error instanceof DOMException&&error.name==='AbortError')return;setMessage(error instanceof ApiError&&error.status===409?'Условия изменились. Обновите расчёт и проверьте корзину.':'Не удалось получить результат покупки. Повторите проверку — повторного списания не будет.');if(error instanceof ApiError&&error.status<500){pricing.refresh();void shop.refreshCart().catch(()=>{});shop.refreshWallet();}}
    finally{setBusy(false);}
  }
  return <div className="page-container cart-page"><div className="page-heading"><div><h1>Корзина<sup>{shop.cart.length.toString().padStart(2,"0")}</sup></h1></div><Link className="text-link" href="/catalog">Вернуться в каталог <Icon name="arrow"/></Link></div>{shop.sessionLoading?<p role="status">Загружаем корзину…</p>:!shop.cart.length?pending?<section className="account-panel"><p role="status">{message||"Проверяем ранее отправленную покупку"}</p><button className="button primary" disabled={busy} onClick={()=>void checkout()}>Проверить результат покупки</button></section>:<EmptyInventory/>:<div className="cart-layout"><div className="cart-items"><div className="cart-stage-label"><span>ПРЕДМЕТЫ</span><span>СОСТАВ КОРЗИНЫ</span></div>{shop.cart.map((product,index)=><article className="cart-item" key={product.id}><span className="cart-item-index">{String(index+1).padStart(2,"0")}</span><Link className="cart-image" href={productHref(product)}><ProductImage src={product.imageUrl} alt={product.name} width={240} height={180}/></Link><div className="cart-item-name"><span className="weapon-name">{product.weapon}</span><h2><Link href={productHref(product)}>{product.finish}</Link></h2><p>{gameName(product)}{product.condition?` · ${product.condition}`:""}</p>{hasWear(product)&&<span className="fine-print">Float {product.float?.toFixed(6)??"не указан"}</span>}</div><Price minor={product.priceMinor} unpriced={product.priceMinor<=0}/><button className="icon-button remove-button" aria-label={`Удалить ${product.name}`} onClick={()=>{shop.remove(product.id);setMessage("");}}><Icon name="trash"/></button></article>)}<div className="delivery-note"><Icon name="link"/><div><h3>Получение через Steam</h3><p>{shop.tradeConfigured?"Trade-URL сохранён. Его можно изменить в кабинете.":"Для получения предметов требуется ссылка на обмен Steam."}</p><Link href="/account?trade=1&returnTo=cart" className="text-link">{shop.tradeConfigured?"Изменить trade-URL":"Добавить trade-URL"} <Icon name="diagonal" size={16}/></Link></div></div></div><aside className="order-summary"><h2>Сумма заказа<span>↗</span></h2><div className="summary-line"><span>Скины</span><span>{shop.cart.length} шт.</span></div><div className="summary-line"><span>Баланс Gems</span><span>{shop.wallet?formatMinor(shop.wallet.availableCoinMinor):'—'}</span></div>{shop.walletError&&<p role="alert" className="form-message">{shop.walletError}</p>}<div className="receipt-tear" aria-hidden="true"/><div className="order-total"><span>Итого</span><strong>{formatMinor(total)} <small>Gems</small></strong><span>≈ {formatMinor(pricing.quote?.totalRubMinor??totals.rub)} ₽</span><small className="total-rounding">Рублёвый итог рассчитан по общей сумме Gems.</small></div><button className="button primary full" disabled={busy||(!pending&&!!shop.user?.steam.connected&&(!shop.tradeConfigured||!shop.config?.capabilities.checkoutEnabled||!shop.wallet||!!shortfall?.missing||pricing.loading||shop.cart.some(p=>p.availability!=='available')))} onClick={()=>void checkout()}>{busy?'Проверяем покупку…':pending?'Проверить результат покупки':!shop.user?.steam.connected?'Войти':shortfall?.missing?`Не хватает ${formatMinor(shortfall.missing)} Gems (≈ ${formatMinor(gemsToRub(shortfall.missing))} ₽)`:'Оплатить Gems'}<Icon name="arrow"/></button>{!!shop.user?.steam.connected&&<Link className="text-link" href={`/account?tab=balance&returnTo=cart${shortfall?.topUp?`&amount=${shortfall.topUp/100}`:''}`}>Пополнить баланс</Link>}{pricing.expired&&<p className="fine-print">Расчёт истёк. Нажмите кнопку, чтобы обновить условия.</p>}{!shop.config?.capabilities.checkoutEnabled&&<p className="form-message">Покупки временно недоступны.</p>}{(message||pricing.error||shop.cartError)&&<p className="form-message" role="status">{message||pricing.error||shop.cartError}</p>}</aside></div>}</div>;
}
