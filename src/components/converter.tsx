"use client";
import {MotionHeading} from './motion';
import {useId,useState} from "react";
import {parseAmount,gemsToRub,rubToGems,inputAmount} from "@/lib/money";
import {Icon} from "./icon";
export function Converter(){
  const id=useId();const [rub,setRub]=useState("1 000");const [gems,setGems]=useState("2 000");const [error,setError]=useState(false);
  function change(value:string,type:"rub"|"gems"){
    const update=type==="rub"?setRub:setGems; const other=type==="rub"?setGems:setRub;
    update(value);if(!value){other("");setError(false);return;}const amount=parseAmount(value);
    setError(amount===null);other(amount===null?"":inputAmount(type==="rub"?rubToGems(amount):gemsToRub(amount)));
  }
  return <section className="converter" aria-labelledby={id}><div className="converter-heading"><MotionHeading as="h2" id={id}>В рублях. В Gems.</MotionHeading></div><div className="converter-fields"><label><span className="sr-only">Рубли</span><input aria-label="Рубли" value={rub} inputMode="decimal" maxLength={12} onChange={e=>change(e.target.value,"rub")} aria-invalid={error}/><span>₽</span></label><span className="convert-icon"><Icon name="swap"/></span><label><span className="sr-only">Gems</span><input aria-label="Gems" value={gems} inputMode="decimal" maxLength={12} onChange={e=>change(e.target.value,"gems")} aria-invalid={error}/><span>Gems</span></label></div><div className="converter-rate"><strong>1 ₽ = 2 Gems</strong><span>{error?"Введите корректную сумму":"Можно изменить любую сумму"}</span></div>{error&&<p className="converter-error" role="status">Введите корректную сумму: до двух знаков после запятой.</p>}</section>;
}
