import {formatMinor,gemsToRub} from "@/lib/money";
export function Price({minor,large=false}:{minor:number;large?:boolean}) {
  return <div className={`price ${large?"price-large":""}`}><span className="price-main">{formatMinor(minor)} <small>Gems</small></span><small className="price-rub">≈ {formatMinor(gemsToRub(minor))} ₽</small></div>;
}
