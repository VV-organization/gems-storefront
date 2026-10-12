"use client";
import Link from 'next/link';
import {useSearchParams} from 'next/navigation';
import {gameId,games} from '@/lib/games';
import {useGameCatalog} from './use-game-catalog';
import {ProductDetails} from './products';
export function ReferenceItem(){
 const params=useSearchParams();const game=gameId(params.get('game'));const {catalog,error,retry}=useGameCatalog(game);
 const product=catalog?.products.find(p=>p.referenceId===params.get('id'));
 return <div className="page-container"><Link className="text-link item-back" href={`/catalog?game=${game}`}>← Каталог {games.find(g=>g.id===game)!.name}</Link>{!catalog?<div className="empty-state" role="status"><p>{error??'Загружаем предмет…'}</p>{error&&<button className="button primary" onClick={retry}>Повторить</button>}</div>:product?<ProductDetails product={product}/>:<div className="empty-state"><h1>Предмет не найден</h1><p>Выберите другой предмет в каталоге.</p></div>}</div>;
}
