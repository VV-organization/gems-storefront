"use client";
import Image, {type ImageProps} from 'next/image';
import {useState} from 'react';
export function ProductImage(props:ImageProps){
 const [failed,setFailed]=useState<string|null>(null);
 if(!props.src||failed===String(props.src))return <span className="product-image-fallback" role="img" aria-label={`${props.alt}: изображение недоступно`}>Изображение недоступно</span>;
 return <Image {...props} alt={props.alt} onError={()=>setFailed(String(props.src))}/>;
}
