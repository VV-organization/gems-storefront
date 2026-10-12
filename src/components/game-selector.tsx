"use client";
import Image from 'next/image';
import {games,type GameId} from '@/lib/games';
import {Icon} from './icon';
const artwork:Record<GameId,string>={cs2:'/catalog/25f84bd317542a44659c.avif',rust:'/game-select/rust.png',tf2:'/game-select/tf2.png'};
const titles:Record<GameId,string>={cs2:'CS2',rust:'RUST',tf2:'TF2'};
export function GameSelector({value,onChange}:{value:GameId;onChange:(game:GameId)=>void}){
 return <nav className="game-selector" data-selected={value} aria-label="Выбор игры">
  {games.map(game=><button type="button" key={game.id} data-game={game.id} className={value===game.id?'active':''} aria-label={game.fullName} aria-pressed={value===game.id} onClick={()=>onChange(game.id)}>
   <span className="game-selector-copy"><strong className="game-selector-title">{titles[game.id]}</strong><span className="game-selector-name">{game.fullName}</span><span className="game-selector-description">{game.description}</span></span>
   <span className="game-selector-art" aria-hidden="true"><Image src={`${process.env.NEXT_PUBLIC_BASE_PATH??''}${artwork[game.id]}`} alt="" width={340} height={280} loading="eager"/></span>
   <span className="game-selector-state" aria-hidden="true"><span>{value===game.id?'Выбрано':'Открыть'}</span><Icon name={value===game.id?'check':'diagonal'} size={16}/></span>
  </button>)}
 </nav>;
}
