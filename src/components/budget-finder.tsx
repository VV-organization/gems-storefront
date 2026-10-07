'use client';

import {useMemo,useState} from 'react';
import type {Category,Product} from '@/lib/types';
import {gemsToRub,formatMinor,parseAmount,rubToGems} from '@/lib/money';
import {pickWithinBudget} from '@/lib/budget-picks';
import {MotionHeading} from './motion';
import {ProductCard} from './products';

const budgetPresets=[5000,10000,25000,50000];
const rubles=(major:number)=>major*100;

export function BudgetFinder({products,categories}:{products:Product[];categories:Category[]}){
  const [amount,setAmount]=useState('10 000');
  const [category,setCategory]=useState('all');
  const parsedAmount=parseAmount(amount);
  const maxBudget=useMemo(()=>Math.max(rubles(50000),...products.map(product=>gemsToRub(product.priceMinor))),[products]);
  const sliderValue=Math.max(rubles(500),Math.min(maxBudget,parsedAmount??rubles(10000)));
  const result=pickWithinBudget(products,amount,category);
  const visibleCategories=categories.filter(item=>products.some(product=>product.categoryId===item.id));
  const status=result.invalidBudget?'Укажи сумму в рублях, например 10 000.':parsedAmount===null?'Введи бюджет, чтобы увидеть подходящие скины.':result.count===0?'В эту сумму пока ничего не попадает. Увеличь лимит или выбери другую категорию.':`${result.count>6?`Показаны 6 из ${result.count}`:`Найдено ${result.count}`} предметов в бюджете.`;

  return <section className="budget-finder section" id="budget" aria-labelledby="budget-title">
    <div className="section-heading">
      <MotionHeading id="budget-title">Под бюджет</MotionHeading>
      <p>Задай предел — посмотри, какие скины в него помещаются.</p>
    </div>
    <div className="budget-workspace">
      <aside className="budget-controls" aria-label="Настройки бюджета">
        <label className="budget-label" htmlFor="budget-amount">Мой предел</label>
        <div className="budget-money-field">
          <input id="budget-amount" value={amount} inputMode="decimal" maxLength={12} aria-invalid={result.invalidBudget} aria-describedby="budget-equivalent budget-status" onChange={event=>setAmount(event.target.value)}/>
          <span>₽</span>
        </div>
        <p className="budget-equivalent" id="budget-equivalent">{parsedAmount===null?'Введи сумму цифрами':`Это ${formatMinor(rubToGems(parsedAmount))} Gems`}</p>
        <label className="budget-range-label" htmlFor="budget-range">Настрой ползунком</label>
        <input id="budget-range" className="budget-range" type="range" min={rubles(500)} max={maxBudget} step={rubles(500)} value={sliderValue} aria-label="Лимит в рублях" onChange={event=>setAmount(formatMinor(Number(event.target.value)))}/>
        <div className="budget-presets" role="group" aria-label="Быстрые суммы">
          {budgetPresets.map(preset=><button key={preset} aria-pressed={parsedAmount===rubles(preset)} onClick={()=>setAmount(formatMinor(rubles(preset)))}>{formatMinor(rubles(preset))} ₽</button>)}
        </div>
        <div className="budget-category-block">
          <span>Покажи категорию</span>
          <div className="budget-categories" role="group" aria-label="Категории скинов">
            <button aria-pressed={category==='all'} onClick={()=>setCategory('all')}>Все скины</button>
            {visibleCategories.map(item=><button key={item.id} aria-pressed={category===item.id} onClick={()=>setCategory(item.id)}>{item.name}</button>)}
          </div>
        </div>
      </aside>
      <div className="budget-results">
        <div className="budget-results-head">
          <p id="budget-status" role={result.invalidBudget?'alert':'status'} aria-live="polite" aria-atomic="true">{status}</p>
          {parsedAmount!==null&&result.count>0&&<span>Ближе к твоему лимиту</span>}
        </div>
        {result.items.length>0?<div className="product-grid">{result.items.map(product=><ProductCard key={product.id} product={product}/>)}</div>:<div className="budget-empty"><span aria-hidden="true">↗</span><p>{products.length===0?'Каталог временно недоступен.':'Попробуй изменить сумму или категорию.'}</p></div>}
      </div>
    </div>
  </section>;
}
