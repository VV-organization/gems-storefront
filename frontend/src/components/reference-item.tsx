"use client";
import Link from 'next/link';
import {useSearchParams} from 'next/navigation';
import {gameId,games} from '@/lib/games';
import {useRemote} from '@/lib/use-remote';
import {mapProduct,type CatalogApiProduct} from '@/lib/catalog-adapter';
import {ProductDetails} from './products';
export function ReferenceItem(){
 const params=useSearchParams();const game=gameId(params.get('game'));const result=useRemote<CatalogApiProduct>(`/catalog/ref-${game}-${encodeURIComponent(params.get('id')??'')}`,null);const {error,reload:retry,loading}=result;
 const product=result.data?mapProduct(result.data):null;
 return <div className="page-container"><Link className="text-link item-back" href={`/catalog?game=${game}`}>← Каталог {games.find(g=>g.id===game)!.name}</Link>{loading||error?<div className="empty-state" role="status"><p>{error??'Загружаем предмет…'}</p>{error&&<button className="button primary" onClick={retry}>Повторить</button>}</div>:product?<ProductDetails product={product}/>:<div className="empty-state"><h1>Предмет не найден</h1><p>Выберите другой предмет в каталоге.</p></div>}</div>;
}
