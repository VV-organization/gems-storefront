"use client";
import {useEffect,useState} from 'react';
import {loadGameCatalog} from '@/lib/reference-catalog';
import type {GameId} from '@/lib/games';
import type {Catalog} from '@/lib/types';
export function useGameCatalog(game:GameId){
 const [attempt,retry]=useState(0);
 const [state,setState]=useState<{game:GameId;attempt:number;catalog?:Catalog;error?:string}>();
 useEffect(()=>{let active=true;loadGameCatalog(game).then(catalog=>{if(active)setState({game,attempt,catalog});}).catch(()=>{if(active)setState({game,attempt,error:'Не удалось загрузить каталог. Попробуйте ещё раз.'});});return()=>{active=false;};},[game,attempt]);
 const current=state?.game===game&&state.attempt===attempt?state:undefined;
 return {catalog:current?.catalog,error:current?.error,retry:()=>retry(n=>n+1)};
}
