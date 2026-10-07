'use client';

import {Children,cloneElement,isValidElement,useEffect,type ReactNode,type HTMLAttributes} from 'react';
import {usePathname} from 'next/navigation';

// Keep text in React's tree: no DOM splitting, duplicate accessible labels or layout shifts.
function words(children:ReactNode):ReactNode {
  return Children.map(children,(child)=>{
    if(typeof child==='string')return child.split(/(\s+)/).map((word,index)=>/^\s+$/.test(word)?word:<span className="motion-word" key={index}>{word}</span>);
    if(isValidElement<{children?:ReactNode}>(child)&&child.props.children)return cloneElement(child,{},words(child.props.children));
    return child;
  });
}
export function MotionHeading({as='h2',children,...props}:HTMLAttributes<HTMLHeadingElement>&{as?:'h1'|'h2';children:ReactNode}) {
  const Tag=as;
  return <Tag {...props} data-motion-heading="">{words(children)}</Tag>;
}
export function RevealText({text}:{text:string}){return <span>{text}</span>;}

// Animate content units, not entire tall sections. Controls inside a card/form row
// travel with that unit, so nested animations never fight or delay interaction.
const groups=[
  '.site-header .wordmark','.site-header nav > *','.header-actions > *','.hero-find','.hero-landscape','.hero-fog','.marquee',
  '.collection-object','.collection-choices > button','.category-preview-art','.category-preview-caption','.category-index > button','.help-questions > button',
  '.product-card','.topup-title','.topup-form-body > *','.topup-total','.topup-form-action',
  '.compare-row:not(.compare-selection)','.compare-note','.dossier > button','.dossier-body',
  '.budget-controls > *','.budget-results-head','.budget-results .product-card','.budget-empty',
  '.converter-fields > *','.converter-rate',
  '.footer-baseline > *','.catalog-category-tabs > *','.catalog-toolbar > *','.filter-heading','.results-count','.filter-chips',
  '.inspection','.detail-visual','.eyebrow','.skin-specs','.float-block','.detail-price-block','.payment-row',
  '.cart-stage-label','.cart-item','.summary-line','.order-total','.receipt-tear','.empty-basket-art',
  '.profile-avatar','.account-section-label','.account-balance','.history-empty','.panel-index',
  '.cart-notice','.money-input','.price',
];
const leaves='h1,h2,h3,h4,h5,h6,p,a,button,label,legend,select,input,textarea,summary,img,svg,dt,dd,output,blockquote,li,span,small,strong,abbr,[role=rowheader]';
const selector=[...groups,leaves].join(',');
const ignored='.sr-only,.skip-link,.motion-word,option,input[type=hidden]';
type Kind='calm'|'mist'|'words'|'cut'|'scene'|'photo'|'deck'|'line';
function kindFor(element:HTMLElement,home:boolean):Kind {
  if(!home||element.closest('dialog'))return 'calm';
  if(element.matches('.cart-notice'))return 'calm';
  if(element.matches('.topup-title,.topup-total,.budget-results-head'))return 'line';
  if(element.matches('[data-motion-heading]'))return 'words';
  if(element.matches('.hero-find'))return 'deck';
  if(element.matches('.hero-landscape,.hero-fog'))return 'scene';
  if(element.matches('.inspection,.collection-object,.category-preview-art,.compare-image'))return 'photo';
  if(element.matches('.product-card,.dossier > button,.compare-row,.marquee,.category-index > button,.help-questions > button')||element.matches('.faq-list summary'))return 'cut';
  return 'mist';
}
function framesFor(kind:Kind):Keyframe[] {
  switch(kind){
    case 'deck':return [{opacity:0,translate:'45px 90px',rotate:'-14deg',scale:.88},{opacity:1,translate:'0 0',rotate:'0deg',scale:1}];
    case 'line':return [{opacity:.15,clipPath:'inset(0 100% 0 0)'},{opacity:1,clipPath:'inset(0 0% 0 0)'}];
    case 'scene':return [{opacity:0,scale:1.035},{opacity:1,scale:1}];
    case 'photo':return [{opacity:0,clipPath:'inset(18% 0 18% 0)',scale:1.06},{opacity:1,clipPath:'inset(0% 0 0% 0)',scale:1}];
    case 'cut':return [
      {opacity:.1,clipPath:'polygon(0 0,0 0,0 25%,0 25%,0 50%,0 50%,0 75%,0 75%,0 100%,0 100%)',translate:'-12px 0'},
      {opacity:1,clipPath:'polygon(0 0,100% 0,100% 25%,75% 25%,75% 50%,50% 50%,50% 75%,25% 75%,25% 100%,0 100%)',translate:'0 0',offset:.55},
      {opacity:1,clipPath:'polygon(0 0,100% 0,100% 25%,100% 25%,100% 50%,100% 50%,100% 75%,100% 75%,100% 100%,0 100%)',translate:'0 0'},
    ];
    case 'words':return [{opacity:.12,filter:'blur(5px)',translate:'0 .55em',rotate:'2deg'},{opacity:1,filter:'blur(0px)',translate:'0 0',rotate:'0deg'}];
    case 'mist':return [{opacity:0,filter:'blur(7px)',translate:'0 24px'},{opacity:1,filter:'blur(0px)',translate:'0 0'}];
    default:return [{opacity:0,translate:'0 12px'},{opacity:1,translate:'0 0'}];
  }
}

export function PageMotion(){
  const pathname=usePathname();
  useEffect(()=>{
    const reduced=matchMedia('(prefers-reduced-motion: reduce)');
    const home=pathname==='/';
    const entries=new Map<HTMLElement,{started:boolean;animations:Animation[]}>();
    const keyframes=new WeakMap<Animation,Keyframe[]>();
    let queued=0;
    let disposed=false;
    function finish(element:HTMLElement){
      const entry=entries.get(element);if(!entry||disposed)return;
      observer.unobserve(element);
      entry.started=true;
      entry.animations.forEach(animation=>animation.cancel());entry.animations=[];
    }
    function prepare(element:HTMLElement){
      const kind=kindFor(element,home);
      const targets=kind==='words'?[...element.querySelectorAll<HTMLElement>('.motion-word')]:[element];
      const duration=kind==='calm'?380:kind==='scene'?1250:kind==='deck'?1050:820;
      return targets.map((target,index)=>{
        const frames=framesFor(kind);
        frames[frames.length-1]={...frames.at(-1),opacity:getComputedStyle(target).opacity};
        // Only opacity while waiting: a collapsed clip-path would also collapse
        // IntersectionObserver's visible area and could prevent its own reveal.
        const animation=target.animate([{opacity:0},{opacity:0}],{
          duration,delay:kind==='words'?Math.min(index,10)*48:0,
          easing:kind==='calm'?'cubic-bezier(.2,.65,.25,1)':'cubic-bezier(.16,1,.3,1)',fill:'both',
        });
        animation.id=`gems-entrance-${kind}`;
        keyframes.set(animation,frames);
        // Prepare outside the viewport: no flash of fully visible content before reveal.
        // WAAPI leaves React-owned attributes and inline styles untouched.
        animation.pause();animation.currentTime=0;
        return animation;
      });
    }
    function start(element:HTMLElement,delay=0){
      const entry=entries.get(element);if(!entry||entry.started)return;
      entry.started=true;observer.unobserve(element);
      if(reduced.matches||element.contains(document.activeElement)){finish(element);return;}
      entry.animations.forEach(animation=>{
        if(animation.effect instanceof KeyframeEffect)animation.effect.setKeyframes(keyframes.get(animation)??[]);
        const timing=animation.effect?.getTiming();
        animation.effect?.updateTiming({delay:(timing?.delay??0)+delay});
        animation.play();
      });
      Promise.all(entry.animations.map(animation=>animation.finished)).then(()=>finish(element)).catch(()=>{});
    }
    const observer=new IntersectionObserver(batch=>{
      const visible=batch.filter(item=>item.isIntersecting).sort((a,b)=>a.boundingClientRect.top-b.boundingClientRect.top||a.boundingClientRect.left-b.boundingClientRect.left);
      visible.forEach((item,index)=>start(item.target as HTMLElement,Math.min(index*(home?55:30),home?275:120)));
    },{threshold:0,rootMargin:'0px 0px -12px 0px'});
    function register(){
      queued=0;
      // Hidden tabs and closed disclosures get a fresh entrance when opened again.
      entries.forEach((entry,element)=>{
        if(!element.isConnected||!element.getClientRects().length||element.closest('[hidden],dialog:not([open])')){
          entry.animations.forEach(a=>a.cancel());observer.unobserve(element);entries.delete(element);
        }
      });
      document.querySelectorAll<HTMLElement>(selector).forEach(element=>{
        if(!element.closest('#main,.site-header,.site-footer,dialog,.cart-notice'))return;
        if(entries.has(element)||element.closest(`${ignored},[data-motion-ignore],[hidden],dialog:not([open])`))return;
        if(!element.getClientRects().length||getComputedStyle(element).visibility==='hidden')return;
        // Only real content units suppress descendants. A skipped/invisible ancestor
        // must not silently exclude its children. Tall sections reveal in smaller parts.
        let parent=element.parentElement;
        while(parent){if(entries.has(parent))return;parent=parent.parentElement;}
        if(element.getBoundingClientRect().height>Math.max(480,innerHeight*.8)&&!element.matches('img,.hero-fog,.marquee,.hero-find,.collection-object,.category-preview-art'))return;
        if(element.matches('span,strong,small,li')&&!Array.from(element.childNodes).some(node=>node.nodeType===Node.TEXT_NODE&&node.textContent?.trim())&&!element.matches(groups.join(',')))return;
        entries.set(element,{started:false,animations:[]});
        if(reduced.matches||element.contains(document.activeElement)){finish(element);return;}
        try{entries.get(element)!.animations=prepare(element);observer.observe(element);}catch{finish(element);}
      });
    }
    function schedule(){if(!queued)queued=requestAnimationFrame(register);}
    const changes=new MutationObserver(schedule);
    register();changes.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['hidden','open','class']});
    function onInteraction(event:Event){entries.forEach((_,element)=>{if(event.target instanceof Node&&element.contains(event.target))finish(element);});}
    function onPreference(){if(reduced.matches)entries.forEach((_,element)=>finish(element));}
    window.addEventListener('resize',schedule);document.addEventListener('toggle',schedule,true);document.addEventListener('focusin',onInteraction);document.addEventListener('pointerdown',onInteraction,{passive:true});reduced.addEventListener('change',onPreference);
    return ()=>{
      disposed=true;changes.disconnect();observer.disconnect();cancelAnimationFrame(queued);
      window.removeEventListener('resize',schedule);document.removeEventListener('toggle',schedule,true);document.removeEventListener('focusin',onInteraction);document.removeEventListener('pointerdown',onInteraction);reduced.removeEventListener('change',onPreference);
      entries.forEach(entry=>{entry.animations.forEach(a=>a.cancel());});
    };
  },[pathname]);
  return null;
}
