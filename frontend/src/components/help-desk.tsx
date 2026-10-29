'use client';
import {useId,useState} from 'react';
import Link from 'next/link';
import {MotionHeading} from './motion';
import {Icon} from './icon';
const answers=[
  {
    "question": "Что такое Gems?",
    "answer": "Gems — внутренняя валюта магазина. 1 ₽ = 2 Gems: 1 000 Gems стоят 500 ₽. Рядом с ценой предмета указана примерная стоимость в рублях.",
    "link": "/#balance",
    "action": "К балансу Gems"
  },
  {
    "question": "Как пополнить баланс Gems?",
    "answer": "На главной или в кабинете укажите количество Gems и нажмите «Пополнить баланс». Оплатите банковской картой или через СБП. После подтверждения оплаты Gems появятся на балансе.",
    "link": "/account?tab=balance",
    "action": "Пополнить баланс"
  },
  {
    "question": "Как купить скин?",
    "answer": "Выберите предметы и добавьте в корзину. Войдите через Steam, сохраните trade-URL и пополните баланс, если Gems не хватает. Проверьте сумму и нажмите «Оплатить Gems».",
    "link": "/catalog",
    "action": "Открыть каталог"
  },
  {
    "question": "Как получить выбранный скин?",
    "answer": "Подключите Steam и сохраните свою ссылку на обмен в кабинете. Профиль и инвентарь должны быть открыты. После покупки примите обмен в Steam; статус каждого предмета доступен в кабинете.",
    "link": "/account?tab=orders",
    "action": "Мои покупки"
  },
  {
    "question": "Как пополнить Steam?",
    "answer": "В форме пополнения укажите логин для входа в Steam, email и сумму в рублях. Проверьте сумму с комиссией 5% и нажмите «Пополнить Steam». После оплаты средства зачисляются на Steam отдельно от Gems.",
    "link": "/#steam",
    "action": "Пополнить Steam"
  },
  {
    "question": "Как связаться с поддержкой?",
    "answer": "Напишите на support@getsgems.com. Укажите номер заказа и Steam ID, чтобы мы быстрее разобрались в ситуации.",
    "link": "mailto:support@getsgems.com",
    "action": "Написать в поддержку"
  }
];
export function HelpDesk(){const [active,setActive]=useState(0),id=useId();const answer=answers[active];return <section className="help-desk section" id="faq" aria-labelledby={`${id}-title`}><div className="section-heading"><MotionHeading id={`${id}-title`}>Вопросы</MotionHeading><p>Выбери вопрос.<br/>Сразу перейди к делу.</p></div><div className="help-workspace"><div className="help-questions" role="group" aria-label="Вопросы о магазине">{answers.map((item,i)=><button key={item.question} aria-pressed={active===i} aria-controls={`${id}-answer`} onClick={()=>setActive(i)}>{item.question}<Icon name={active===i?'arrow':'plus'} size={20}/></button>)}</div><div className="help-answer" id={`${id}-answer`} aria-live="polite" aria-atomic="true"><div key={active}><h3>{answer.question}</h3><p>{answer.answer}</p><Link className="text-link" href={answer.link}>{answer.action}<Icon name="diagonal"/></Link></div></div></div></section>;}
