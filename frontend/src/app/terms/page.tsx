import {LegalDocument} from '@/components/legal-document';
import document from '@/data/terms.json';

export const metadata={title:'Пользовательское соглашение'};
export default function Page(){return <LegalDocument document={document}/>;}
