import type {Metadata} from 'next';
import localFont from 'next/font/local';
import {getCatalog} from '@/lib/catalog';
import {ShopProvider} from '@/components/shop-provider';
import {Header,Footer} from '@/components/shell';
import {QuickView} from '@/components/products';
import {PageMotion} from '@/components/motion';
import './globals.css';
import './home-scenes.css';
const sans=localFont({src:'../../public/fonts/Manrope.ttf',variable:'--font-sans',display:'swap',weight:'200 800'});
export const metadata:Metadata={title:{default:'Gems — характер в деталях',template:'%s — Gems'},description:'Найди свой скин CS2. Собери арсенал, сравни предметы, пополни Steam. 1 ₽ = 2 Gems.',icons:{icon:`${process.env.NEXT_PUBLIC_BASE_PATH??''}/favicon.svg`}};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="ru" data-scroll-behavior="smooth" className={sans.variable}><body><ShopProvider catalog={getCatalog()}><PageMotion/><Header/><main id="main">{children}</main><Footer/><QuickView/></ShopProvider></body></html>;}
