"use client";
import {createContext,useContext,useEffect,useEffectEvent,useMemo,useRef,useState,useSyncExternalStore,type ReactNode} from "react";
import Link from "next/link";
import {useRouter} from "next/navigation";
import type {Catalog,Product} from "@/lib/types";
import {createSafeStorage} from "@/lib/browser-storage";
import {api,catalogApi,ApiError,errorMessage} from "@/lib/api";
import {guestCartIds,canMigrateGuestItem} from "@/lib/guest-cart";
import {unavailableProduct} from "@/lib/catalog-adapter";
import {mapProduct,type CatalogApiProduct} from "@/lib/catalog-adapter";
import type {ApiResponses} from "@/generated/api-types";
import {useRemote} from "@/lib/use-remote";

import {Modal} from "./modal";
import {Icon} from "./icon";

const safeStorage=createSafeStorage(()=>localStorage);
// Browser state is isolated to Gems.
const readStored=(key:string,fallback:string)=>safeStorage.read(key,fallback);
function subscribe(callback:()=>void) {
  const external=(event:StorageEvent)=>{safeStorage.invalidate(event.key);callback();};
  window.addEventListener("storage",external); window.addEventListener("gems-store",callback);
  return ()=>{window.removeEventListener("storage",external);window.removeEventListener("gems-store",callback);};
}
function useStored(key:string, fallback:string) {
  const raw=useSyncExternalStore(subscribe,()=>readStored(key,fallback),()=>fallback);
  function set(value:string){safeStorage.write(key,value);window.dispatchEvent(new Event("gems-store"));}
  return [raw,set] as const;
}
export type SessionUser={id:string;steam:{connected:boolean;steamId64?:string};email?:{address:string;verified:boolean}};
type CartResponse=ApiResponses["/cart"]["get"];
type Shop = Catalog & {wallet:ApiResponses["/wallet/me"]["get"]|null;walletLoading:boolean;walletError:string;refreshWallet:()=>void;config:ApiResponses["/storefront/config"]["get"]|null;cartVersion:number;cartLoading:boolean;cartError:string;refreshCart:()=>Promise<void>;user:SessionUser|null;sessionLoading:boolean;sessionError:string;refreshSession:()=>Promise<void>;tradeConfigured:boolean;cart:Product[];notice:{label:string;count:number}|null;dismissNotice:()=>void;add:(product:Product)=>void;addMany:(products:Product[])=>void;favorites:string[];toggleFavorite:(id:string)=>void;remove:(id:string)=>void;loggedIn:boolean;login:(mode?:"steam"|"email")=>void;logout:()=>void;tradeUrl:string;saveTradeUrl:(url:string)=>Promise<void>;previewProduct:Product|null;setPreviewProduct:(p:Product|null)=>void};
const ShopContext=createContext<Shop|null>(null);
export function useShop(){const value=useContext(ShopContext);if(!value)throw new Error("Missing shop");return value;}
export function ShopProvider({catalog,children}:{catalog:Catalog;children:ReactNode}) {
  const router=useRouter();
  const [notice,setNotice]=useState<{label:string;count:number}|null>(null);
  const [user,setUser]=useState<SessionUser|null>(null);
  const [loginDialog,setLoginDialog]=useState(false);
  const [loginMode,setLoginMode]=useState<"steam"|"email">("steam");
  const [email,setEmail]=useState("");const [code,setCode]=useState("");const [challenge,setChallenge]=useState<string|null>(null);
  const [authError,setAuthError]=useState("");const [authBusy,setAuthBusy]=useState(false);

  const owner=useRef<string|null>(null);
  const wallet=useRemote<ApiResponses["/wallet/me"]["get"]>(user?.steam.connected?"/wallet/me":null,user?.id??null);
  const config=useRemote<ApiResponses["/storefront/config"]["get"]>("/storefront/config",user?.id??null);
  const [sessionLoading,setSessionLoading]=useState(true);
  const [sessionError,setSessionError]=useState("");
  const [tradeUrl,setTradeUrl]=useState("");
  const [tradeConfigured,setTradeConfigured]=useState(false);
  const [cart,setCart]=useState<Product[]>([]);
  const [cartVersion,setCartVersion]=useState(0);
  const version=useRef(0);
  const [cartLoading,setCartLoading]=useState(false);
  const [cartError,setCartError]=useState("");
  const [resumeProducts,setResumeProducts]=useState<Product[]|null>(null);
  const [guestRaw,setGuestRaw]=useStored('gems:cart','[]');
  const [,setSnapshotRaw]=useStored('gems:cart-products','[]');
  const [guestProducts,setGuestProducts]=useState<Product[]>([]);
  const resolvedGuest=useRef(new Map<string,string>());
  function forgetGuest(slug:string){const ids=guestCartIds(readStored('gems:cart','[]')).filter(id=>id!==slug&&resolvedGuest.current.get(id)!==slug);setGuestRaw(JSON.stringify(ids));}
  useEffect(()=>{let active=true;const ids=guestCartIds(guestRaw);void Promise.all(ids.map(async id=>{try{const p=mapProduct(await catalogApi.get<CatalogApiProduct>(`/catalog/${encodeURIComponent(id)}`));resolvedGuest.current.set(id,p.id);return p;}catch{return unavailableProduct(id);}})).then(items=>{if(active)setGuestProducts(items);});return()=>{active=false;};},[guestRaw]);
  const resuming=useRef(false);
  const cartQueue=useRef(Promise.resolve());
  function acceptCart(result:CartResponse){
    if(result.version<version.current)return;
    version.current=result.version;setCartVersion(result.version);setCart(result.items.map(item=>mapProduct(item.product)));
  }
  function resetCart(){version.current=0;setCartVersion(0);setCart([]);setCartError("");setResumeProducts(null);}
  async function refreshCart(){setCartLoading(true);try{acceptCart(await api.get<CartResponse>("/cart"));setCartError("");}finally{setCartLoading(false);}}
  function queueCart(work:()=>Promise<void>){
    const intendedOwner=owner.current;
    cartQueue.current=cartQueue.current.catch(()=>{}).then(async()=>{
      if(!intendedOwner||intendedOwner!==owner.current)return;
      setCartLoading(true);setCartError("");
      try{await work();}catch(error){
        if(error instanceof DOMException&&error.name==="AbortError")return;
        setCartError(error instanceof ApiError&&error.status===409?"Корзина изменилась. Проверьте её и повторите действие.":"Не удалось обновить корзину. Повторите действие.");
        if(error instanceof ApiError&&error.status===409)try{acceptCart(await api.get<CartResponse>("/cart"));}catch{}
      }finally{setCartLoading(false);}
    });
  }
  async function addSingle(product:Product){
    const result=await api.command<CartResponse>(`cart:add:${product.id}`,"PUT",`/cart/items/${encodeURIComponent(product.id)}`,{quantity:1,expectedCartVersion:version.current});
    acceptCart(result);setNotice({label:product.name,count:1});
  }
  async function resumeIntent(){
    if(resuming.current)return;
    resuming.current=true;const intendedOwner=owner.current;
    try{
      const ids=guestCartIds(readStored('gems:cart','[]'));
      let snapshots:Product[]=[];try{const parsed=JSON.parse(readStored('gems:cart-products','[]'));if(Array.isArray(parsed))snapshots=parsed;}catch{}
      const review:Product[]=[];
      for(const id of ids){
        if(owner.current!==intendedOwner)return;
        let product:Product;try{product=mapProduct(await catalogApi.get<CatalogApiProduct>(`/catalog/${encodeURIComponent(id)}`));resolvedGuest.current.set(id,product.id);}catch{review.push(unavailableProduct(id));continue;}
        const previous=snapshots.find(p=>p.id===id)??{};
        if(canMigrateGuestItem(previous,product)){await addSingle(product);forgetGuest(product.id);}else review.push(product);
      }
      if(owner.current===intendedOwner)setResumeProducts(review.length?review:null);
    }catch{setCartError('Не удалось перенести корзину. Выбранные предметы сохранены; повторите вход или обновите страницу.');}
    finally{resuming.current=false;}
  }
  const sessionGeneration=useRef(0);
  const sessionChannel=useRef<BroadcastChannel|null>(null);
  async function refreshSession(){
    const generation=++sessionGeneration.current;
    if(owner.current)api.reset();
    setSessionLoading(true);setUser(null);setSessionError("");
    try {
      const next=await api.get<SessionUser>("/session/me");
      if(generation!==sessionGeneration.current)return;
      if(owner.current&&owner.current!==next.id){resetCart();setTradeUrl("");setLoginDialog(false);setChallenge(null);setCode("");setEmail("");}
      api.setOwner(next.id);owner.current=next.id;setUser(next);setSessionError("");
      if(next.steam.connected){
        const status=await api.get<{configured:boolean}>("/me/steam-trade-url/status");setTradeConfigured(status.configured);
        await refreshCart();queueCart(resumeIntent);
      }else{setTradeConfigured(false);resetCart();}
    } catch(error) {
      if(generation!==sessionGeneration.current||error instanceof DOMException&&error.name==="AbortError")return;
      if(error instanceof ApiError&&error.status===401){if(owner.current)api.setOwner(null);owner.current=null;setUser(null);resetCart();setTradeConfigured(false);setTradeUrl("");}
      else setSessionError(errorMessage(error));
    } finally {if(generation===sessionGeneration.current)setSessionLoading(false);}
  }
  const loadSession=useEffectEvent(()=>refreshSession());
  // Private views are hidden while the cookie owner is revalidated.
  useEffect(()=>{
    const generationRef=sessionGeneration;
    const refresh=()=>{void loadSession();};
    const visible=()=>{if(document.visibilityState==='visible')refresh();};
    const channel=typeof BroadcastChannel==='undefined'?null:new BroadcastChannel('gems-session');sessionChannel.current=channel;
    if(channel){channel.onmessage=refresh;channel.postMessage('changed');}
    window.addEventListener('focus',refresh);document.addEventListener('visibilitychange',visible);
    refresh();
    return()=>{generationRef.current++;api.reset();channel?.close();sessionChannel.current=null;window.removeEventListener('focus',refresh);document.removeEventListener('visibilitychange',visible);};
  },[]);
  async function saveTradeUrl(url:string){await api.put("/me/steam-trade-url",{tradeUrl:url});setTradeConfigured(true);setTradeUrl(url);}

  const [favoriteRaw,setFavoriteRaw]=useStored("gems:favorites","[]");
  const favorites=useMemo(()=>{try{const v:unknown=JSON.parse(favoriteRaw);return Array.isArray(v)?v.filter((id):id is string=>typeof id==="string"):[];}catch{return [];}},[favoriteRaw]);
  function toggleFavorite(id:string){setFavoriteRaw(JSON.stringify(favorites.includes(id)?favorites.filter(x=>x!==id):[...favorites,id]));}
  async function submitEmail(){
    const intendedOwner=owner.current;
    setAuthBusy(true);setAuthError("");
    try {
      if(challenge){await api.post(`/auth/email/challenges/${challenge}/verify`,{code},{anonymous:!user});if(owner.current!==intendedOwner)return;api.reset();await refreshSession();sessionChannel.current?.postMessage("changed");setLoginDialog(false);setChallenge(null);setCode("");}
      else {const result=await api.post<{id:string}>("/auth/email/challenges",{email,purpose:user?.steam.connected?"link_email":"sign_in"},{anonymous:!user});if(owner.current!==intendedOwner)return;setChallenge(result.id);}
    } catch(error){if(owner.current===intendedOwner)setAuthError(errorMessage(error));}finally{setAuthBusy(false);}
  }

  const [logoutDialog,setLogoutDialog]=useState(false);
  const [previewProduct,setPreviewProduct]=useState<Product|null>(null);
  function saveGuest(products:Product[],removed?:string){
    const work=()=>{
      const ids=guestCartIds(readStored('gems:cart','[]')).filter(id=>id!==removed&&resolvedGuest.current.get(id)!==removed);
      let previous:Product[]=[];try{const value=JSON.parse(readStored('gems:cart-products','[]'));if(Array.isArray(value))previous=value;}catch{}
      const next=[...new Set([...ids,...products.map(p=>p.id)])].slice(0,50);
      setSnapshotRaw(JSON.stringify([...new Map([...previous,...products].map(p=>[p.id,p])).values()].filter(p=>next.includes(p.id))));setGuestRaw(JSON.stringify(next));
    };
    if(navigator.locks)void navigator.locks.request('gems-cart',work);else work();
  }
  function add(product:Product){if(product.availability!=='available')return;if(!user?.steam.connected){saveGuest([product]);setNotice({label:product.name,count:1});return;}queueCart(()=>addSingle(product));}
  function addMany(products:Product[]){if(!user?.steam.connected){saveGuest(products.filter(p=>p.availability==='available'));return;}queueCart(async()=>{for(const product of products)if(product.availability==='available')await addSingle(product);});}
  function remove(id:string){if(!user?.steam.connected){saveGuest([],id);return;}queueCart(async()=>{acceptCart(await api.command<CartResponse>(`cart:remove:${id}`,"DELETE",`/cart/items/${encodeURIComponent(id)}`,{expectedCartVersion:version.current}));});}
  return <ShopContext.Provider value={{...catalog,wallet:wallet.data,walletLoading:wallet.loading,walletError:wallet.error,refreshWallet:wallet.reload,config:config.data,cart:user?.steam.connected?cart:guestProducts,cartVersion,cartLoading,cartError,refreshCart,notice,dismissNotice:()=>setNotice(null),add,addMany,favorites,toggleFavorite,remove,user,sessionLoading,sessionError,refreshSession,tradeConfigured,loggedIn:!!user,login:(mode="steam")=>{setLoginMode(mode);setChallenge(null);setCode("");setEmail(user?.email?.address??"");setAuthError("");setLoginDialog(true);},logout:()=>setLogoutDialog(true),tradeUrl,saveTradeUrl,previewProduct,setPreviewProduct}}>
    {children}
    {cartError&&<Modal title="Корзина" onClose={()=>setCartError("")}><h2>Корзина</h2><p className="form-message" role="alert">{cartError}</p><button className="button primary full" onClick={()=>setCartError("")}>Понятно</button></Modal>}
    {resumeProducts&&<Modal title="Проверьте выбор" onClose={()=>setResumeProducts(null)}><h2>Проверьте выбор</h2><p className="muted">Цена или наличие выбранных предметов изменились. Проверьте актуальные условия.</p>{resumeProducts.map(product=><p key={product.id}>{product.name} — {product.availability==='available'?`${product.priceMinor/100} Gems`:'Недоступен'}</p>)}<button className="button primary full" disabled={cartLoading||!resumeProducts.some(p=>p.availability==='available')} onClick={()=>queueCart(async()=>{for(const p of resumeProducts.filter(p=>p.availability==='available')){await addSingle(p);forgetGuest(p.id);}setResumeProducts(null);})}>Добавить доступные предметы</button><button className="button secondary full" onClick={()=>{for(const p of resumeProducts)forgetGuest(p.id);setResumeProducts(null);}}>Убрать из гостевой корзины</button></Modal>}
    {!previewProduct&&<CartNotice/>}
    {loginDialog&&<Modal title={loginMode==="email"&&user?"Подтверждение почты":"Личный кабинет"} onClose={()=>setLoginDialog(false)}><div className="dialog-symbol"><Icon name="steam" size={32}/></div><h2>{loginMode==="email"&&user?"Подтверждение почты":"Личный кабинет"}</h2><p className="muted">{loginMode==="email"&&user?"Подтвердите почту, указанную при оплате Steam, чтобы добавить прошлые пополнения в историю.":"Сохраните ссылку на обмен и управляйте покупками в личном кабинете."}</p>{loginMode==="steam"?<><a className="button primary full" href={`/api/auth/steam/start?returnTo=${encodeURIComponent(window.location.pathname+window.location.search)}`}>Войти через Steam <Icon name="arrow"/></a><button className="button secondary full" onClick={()=>setLoginMode("email")}>Войти по почте</button></>:<form className="email-confirmation-form ym-hide-content" onSubmit={e=>{e.preventDefault();void submitEmail();}}><label className="field-label" htmlFor="auth-email">Электронная почта</label><input className="text-input ym-disable-keys" id="auth-email" type="email" value={email} required disabled={!!challenge||authBusy} onChange={e=>setEmail(e.target.value)}/>{challenge&&<><button type="button" className="text-link" onClick={()=>{setChallenge(null);setCode("");setAuthError("");}}>Изменить почту или получить новый код</button><label className="field-label" htmlFor="auth-code">Код из письма</label><input className="text-input ym-disable-keys" id="auth-code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} value={code} onChange={e=>setCode(e.target.value)} required/></>}<button className="button primary full" disabled={authBusy}>{authBusy?"Подождите…":challenge?"Подтвердить":"Получить код"} <Icon name="arrow"/></button></form>}{authError&&<p className="form-message" role="alert">{authError}</p>}</Modal>}
    {logoutDialog&&<Modal title="Выйти из аккаунта?" onClose={()=>setLogoutDialog(false)}><h2>Выйти из аккаунта?</h2><p className="muted">Выбранные скины останутся в корзине.</p><div className="dialog-actions"><button className="button primary" autoFocus onClick={()=>setLogoutDialog(false)}>Остаться</button><button className="button secondary" onClick={()=>{void api.post("/session/logout",{}).then(()=>{api.reset();api.setOwner(null);owner.current=null;setUser(null);resetCart();setTradeUrl("");setTradeConfigured(false);setLogoutDialog(false);sessionChannel.current?.postMessage("changed");router.refresh();}).catch(error=>setSessionError(errorMessage(error)));}}>Выйти</button></div></Modal>}
  </ShopContext.Provider>;
}

export function CartNotice(){
 const shop=useShop();
 if(!shop.notice)return null;
 return <div className="cart-notice" role="status" aria-live="polite"><span className="notice-check"><Icon name="check"/></span><div><strong>{shop.notice.count>1?"Комплект добавлен в корзину":"Добавлено в корзину"}</strong><span>{shop.notice.label}</span></div><Link href="/cart" onClick={()=>{shop.dismissNotice();shop.setPreviewProduct(null);}}>В корзину <Icon name="arrow" size={16}/></Link><button className="icon-button" aria-label="Закрыть уведомление" onClick={shop.dismissNotice}><Icon name="close" size={18}/></button></div>;
}
