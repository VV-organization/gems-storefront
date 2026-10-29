import {formatMinor,gemsToRub} from "@/lib/money";
export function Price({minor,large=false,unpriced=false}:{minor:number;large?:boolean;unpriced?:boolean}) {
  return <div className={`price ${large?"price-large":""}`}><span className="price-main">{unpriced?"—":formatMinor(minor)} <small>Gems</small></span><small className="price-rub">{unpriced?"Недоступен":`≈ ${formatMinor(gemsToRub(minor))} ₽`}</small></div>;
}
