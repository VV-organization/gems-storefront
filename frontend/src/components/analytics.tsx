'use client';

import Script from 'next/script';
import {usePathname,useSearchParams} from 'next/navigation';
import {Suspense,useEffect,useRef} from 'react';

declare global {
 interface Window {
  ym?: (counter:number,action:string,url:string,options:{referer:string})=>void;
 }
}

function MetrikaPageViews() {
 const pathname=usePathname(),search=useSearchParams();
 const previousUrl=useRef<string|null>(null);
 useEffect(()=>{
  const url=window.location.href;
  // The supplied init snippet records the initial view. Layouts persist on navigation.
  if(previousUrl.current&&previousUrl.current!==url) {
   window.ym?.(114162303,'hit',url,{referer:previousUrl.current});
  }
  previousUrl.current=url;
 },[pathname,search]);
 return null;
}

export function Analytics() {
 return <>
  <Script src="https://www.googletagmanager.com/gtm.js?id=GTM-T4NHTDWX" strategy="afterInteractive"/>
  <Script id="yandex-metrika" strategy="afterInteractive">{`
   (function(m,e,t,r,i,k,a){
    m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};
    m[i].l=1*new Date();
    for (var j = 0; j < document.scripts.length; j++) {if (document.scripts[j].src === r) { return; }}
    k=e.createElement(t),a=e.getElementsByTagName(t)[0],k.async=1,k.src=r,a.parentNode.insertBefore(k,a)
   })(window, document,'script','https://mc.yandex.ru/metrika/tag.js?id=114162303', 'ym');
   ym(114162303, 'init', {ssr:true, webvisor:true, clickmap:true, ecommerce:"dataLayer", referrer: document.referrer, url: location.href, accurateTrackBounce:true, trackLinks:true});
  `}</Script>
  {/* The no-JavaScript tracking pixel must load directly from Metrika. */}
  {/* eslint-disable-next-line @next/next/no-img-element */}
  <noscript><div><img src="https://mc.yandex.ru/watch/114162303" width="1" height="1" style={{position:'absolute',left:'-9999px'}} alt=""/></div></noscript>
  <Suspense fallback={null}><MetrikaPageViews/></Suspense>
 </>;
}
