import {Home} from "@/components/home";
import {getCatalog,getHomeProducts} from "@/lib/catalog";
export default async function Page(){const [catalog,products]=await Promise.all([getCatalog(),getHomeProducts()]);return <Home catalog={catalog} products={products}/>;}
