import {Suspense} from 'react';
import {ReferenceItem} from '@/components/reference-item';
export const metadata={title:'Предмет из каталога'};
export default function Page(){return <Suspense fallback={<div className="page-container empty-state">Загружаем предмет…</div>}><ReferenceItem/></Suspense>;}
