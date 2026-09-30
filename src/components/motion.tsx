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
  '.site-header > *','.hero-find','.hero-landscape','.hero-fog','.hero-scroll','.marquee',
  '.collection-details','.collection-object','.collection-choices > button','.category-preview-art','.category-preview-caption','.category-index > button','.help-questions > button','.help-answer > div',
  '.product-card','.topup-title','.topup-form-body > *','.topup-total','.topup-form-action',
  '.compare-row','.compare-note','.dossier > button','.dossier-body',
  '.arsenal-tabs','.arsenal-scene','.arsenal-current','.arsenal-receipt li','.arsenal-total','.budget-status',
  '.gift-art','.gift-summary','.converter-fields > *','.converter-rate',
  '.footer-baseline > *','.catalog-category-tabs > *','.catalog-toolbar > *','.filter-heading','.results-count','.filter-chips',
  '.inspection','.detail-visual','.eyebrow','.skin-specs','.float-block','.detail-price-block','.payment-row',
  '.cart-stage-label','.cart-item','.summary-line','.order-total','.receipt-tear','.empty-basket-art',
  '.profile-avatar','.account-section-label','.account-balance','.history-empty','.panel-index',
  '.cart-notice','.money-input','.price',
];
const leaves='h1,h2,h3,h4,p,a,button,label,fieldset,select,input,summary,img';
const selector=[...groups,leaves].join(',');
const ignored='.sr-only,.skip-link,[aria-hidden="true"],.motion-word';
type Kind='calm'|'mist'|'words'|'cut'|'scene'|'photo'|'deck';
function kindFor(element:HTMLElement,home:boolean):Kind {
  if(!home||element.closest('dialog'))return 'calm';
  if(element.matches('[data-motion-heading]'))return 'words';
  if(element.matches('.hero-find'))return 'deck';
  if(element.matches('.hero-landscape,.hero-fog'))return 'scene';
  if(element.matches('.gift-art,.arsenal-scene,.inspection,.collection-object,.category-preview-art'))return 'photo';
  if(element.matches('.product-card,.dossier > button,.compare-row,.marquee,.category-index > button,.help-questions > button')||element.matches('.faq-list summary'))return 'cut';
  return 'mist';
}
function framesFor(kind:Kind):Keyframe[] {
  switch(kind){
    case 'deck':return [{opacity:0,translate:'45px 90px',rotate:'-14deg',scale:.88},{opacity:1,translate:'0 0',rotate:'0deg',scale:1}];
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
    let queued=0;
    let disposed=false;
    function finish(element:HTMLElement){
      const entry=entries.get(element);if(!entry||disposed)return;
      observer.unobserve(element);
      entry.started=true;
      entry.animations.forEach(animation=>animation.cancel());entry.animations=[];
    }
    function start(element:HTMLElement,delay=0){
      const entry=entries.get(element);if(!entry||entry.started)return;
      entry.started=true;observer.unobserve(element);
      if(reduced.matches||element.contains(document.activeElement)){finish(element);return;}
      const kind=kindFor(element,home);
      const targets=kind==='words'?[...element.querySelectorAll<HTMLElement>('.motion-word')]:[element];
      const duration=kind==='calm'?380:kind==='scene'?1250:kind==='deck'?1050:820;
      try{
        entry.animations=targets.map((target,index)=>target.animate(framesFor(kind),{
          duration,delay:delay+(kind==='words'?Math.min(index,10)*42:0),
          easing:kind==='calm'?'cubic-bezier(.2,.65,.25,1)':'cubic-bezier(.16,1,.3,1)',fill:'backwards',
        }));
        Promise.all(entry.animations.map(animation=>animation.finished)).then(()=>finish(element)).catch(()=>{});
      }catch{finish(element);}
    }
    const observer=new IntersectionObserver(batch=>{
      const visible=batch.filter(item=>item.isIntersecting).sort((a,b)=>a.boundingClientRect.top-b.boundingClientRect.top||a.boundingClientRect.left-b.boundingClientRect.left);
      visible.forEach((item,index)=>start(item.target as HTMLElement,Math.min(index*(home?55:30),home?330:150)));
    },{threshold:.06,rootMargin:'0px 0px -24px 0px'});
    function register(){
      queued=0;
      // Drop removed products/dialogs promptly; don't retain a growing catalog history.
      entries.forEach((entry,element)=>{if(!element.isConnected){entry.animations.forEach(a=>a.cancel());observer.unobserve(element);entries.delete(element);}});
      document.querySelectorAll<HTMLElement>(selector).forEach(element=>{
        if(!element.closest('#main,.site-header,.site-footer,dialog,.cart-notice'))return;
        if(entries.has(element)||element.matches(ignored)||element.closest('[data-motion-ignore]'))return;
        if(element.parentElement?.closest(selector))return;
        entries.set(element,{started:false,animations:[]});
        // No DOM attributes/styles are written before Suspense hydrates.
        // WAAPI does not mutate React-owned markup; waiting content stays visible.
        if(reduced.matches)finish(element);else observer.observe(element);
      });
    }
    function schedule(){if(!queued)queued=requestAnimationFrame(register);}
    const changes=new MutationObserver(schedule);
    register();changes.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['hidden','open']});
    function onInteraction(event:Event){entries.forEach((_,element)=>{if(event.target instanceof Node&&element.contains(event.target))finish(element);});}
    function onPreference(){if(reduced.matches)entries.forEach((_,element)=>finish(element));}
    document.addEventListener('focusin',onInteraction);document.addEventListener('pointerover',onInteraction,{passive:true});document.addEventListener('pointerdown',onInteraction,{passive:true});reduced.addEventListener('change',onPreference);
    return ()=>{
      disposed=true;changes.disconnect();observer.disconnect();cancelAnimationFrame(queued);
      document.removeEventListener('focusin',onInteraction);document.removeEventListener('pointerover',onInteraction);document.removeEventListener('pointerdown',onInteraction);reduced.removeEventListener('change',onPreference);
      entries.forEach(entry=>{entry.animations.forEach(a=>a.cancel());});
    };
  },[pathname]);
  return null;
}
