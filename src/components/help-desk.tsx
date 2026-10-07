'use client';
import {useId,useState} from 'react';
import Link from 'next/link';
import {MotionHeading} from './motion';
import {Icon} from './icon';
const answers=[
  {question:'Что такое Gems?',answer:'Внутренняя валюта магазина. 1 рубль = 2 Gems, поэтому 1 000 Gems стоят 500 ₽. Рядом с ценой каждого предмета есть сумма в рублях.',link:'/#balance',action:'К балансу Gems'},
  {question:'Как получить выбранный скин?',answer:'Для передачи скина нужен обмен Steam и ссылка trade-URL в кабинете. Сейчас выдача предметов ещё не подключена — покупка не создаёт фиктивный заказ.',link:'/account',action:'Открыть кабинет'},
  {question:'Steam и Gems — одно и то же?',answer:'Steam пополняется рублями на отдельный аккаунт. Gems используются для расчёта стоимости предметов в этом магазине. Для каждой операции предусмотрена своя форма.',link:'/#topups',action:'Выбрать пополнение'},
  {question:'Какая комиссия у Steam?',answer:'5% от суммы зачисления. Например: на аккаунт 1 000 ₽, комиссия 50 ₽, итого к оплате 1 050 ₽. Итог виден до проверки аккаунта.',link:'/#steam',action:'Рассчитать пополнение'},
  {question:'Как найти скин в пределах суммы?',answer:'Укажи бюджет в рублях и выбери категорию. В подборке останутся реальные товары из каталога, которые укладываются в лимит. Рядом с каждым скином показана цена в Gems и рублях.',link:'/#budget',action:'Подобрать скин'},
];
export function HelpDesk(){const [active,setActive]=useState(0),id=useId();const answer=answers[active];return <section className="help-desk section" id="faq" aria-labelledby={`${id}-title`}><div className="section-heading"><MotionHeading id={`${id}-title`}>Вопросы</MotionHeading><p>Выбери вопрос.<br/>Сразу перейди к делу.</p></div><div className="help-workspace"><div className="help-questions" role="group" aria-label="Вопросы о магазине">{answers.map((item,i)=><button key={item.question} aria-pressed={active===i} aria-controls={`${id}-answer`} onClick={()=>setActive(i)}>{item.question}<Icon name={active===i?'arrow':'plus'} size={20}/></button>)}</div><div className="help-answer" id={`${id}-answer`} aria-live="polite" aria-atomic="true"><div key={active}><h3>{answer.question}</h3><p>{answer.answer}</p><Link className="text-link" href={answer.link}>{answer.action}<Icon name="diagonal"/></Link></div></div></div></section>;}
