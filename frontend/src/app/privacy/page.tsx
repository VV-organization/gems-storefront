import {LegalDocument} from '@/components/legal-document';
import document from '@/data/privacy.json';

export const metadata={title:'Политика конфиденциальности'};
export default function Page(){return <LegalDocument document={document}/>;}
