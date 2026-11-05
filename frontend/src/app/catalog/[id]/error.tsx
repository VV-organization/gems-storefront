'use client';
import Link from 'next/link';

export default function ProductError({retry}:{retry:()=>void}){
 return <div className="page-container"><section className="empty-state" role="alert"><h1>Не удалось загрузить скин</h1><p>Попробуйте ещё раз.</p><button className="button primary" onClick={retry}>Повторить</button><Link className="text-link" href="/catalog">Вернуться в каталог</Link></section></div>;
}
