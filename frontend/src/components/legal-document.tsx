import Link from 'next/link';

type Document = {
 title:string;
 edition:string;
 blocks:({type:string;text?:string;items?:string[]})[];
};

function LegalText({text}:{text:string}) {
 return text.split(/(support@getsgems\.com)/).map((part,index)=>part==='support@getsgems.com'
  ? <a key={index} href="mailto:support@getsgems.com">{part}</a>
  : part);
}

export function LegalDocument({document}:{document:Document}) {
 return <div className="page-container legal-page">
  <Link href="/" className="text-link">← На главную</Link>
  <article className="legal-document">
   <header><h1>{document.title}</h1><p>{document.edition}</p></header>
   {document.blocks.map((block,index)=>block.type==='heading'
    ? <h2 key={index}>{block.text}</h2>
    : block.type==='list'
     ? <ul key={index}>{block.items?.map((text,item)=><li key={item}><LegalText text={text}/></li>)}</ul>
     : <p key={index}><LegalText text={block.text??''}/></p>)}
  </article>
 </div>;
}
