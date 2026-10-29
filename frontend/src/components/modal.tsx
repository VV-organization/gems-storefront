"use client";
import {useEffect,useRef,type ReactNode} from "react";
import {Icon} from "./icon";
export function Modal({title,onClose,children,wide=false}:{title:string;onClose:()=>void;children:ReactNode;wide?:boolean}) {
  const ref=useRef<HTMLDialogElement>(null);
  useEffect(()=>{
    const dialog=ref.current; const previous=document.activeElement as HTMLElement|null;
    const overflow=document.body.style.overflow;
    dialog?.showModal(); document.body.style.overflow="hidden";
    return ()=>{ dialog?.close(); document.body.style.overflow=overflow; previous?.focus(); };
  },[]);
  return <dialog ref={ref} className={`modal ${wide?"modal-wide":""}`} aria-label={title} onKeyDown={event=>{
    if(event.key!=="Tab")return;
    const controls=[...event.currentTarget.querySelectorAll<HTMLElement>('button:not([disabled]),a[href],input:not([disabled]),select:not([disabled]),textarea:not([disabled]),summary,[tabindex]:not([tabindex="-1"])')].filter(node=>node.getClientRects().length>0);
    const first=controls[0],last=controls.at(-1);
    if(!first){event.preventDefault();return;}
    if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus();}
    else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
  }} onCancel={onClose} onClick={e=>{if(e.target===e.currentTarget)onClose();}}>
    <div className="modal-inner"><button className="icon-button modal-close" aria-label="Закрыть" onClick={onClose}><Icon name="close"/></button>{children}</div>
  </dialog>;
}
