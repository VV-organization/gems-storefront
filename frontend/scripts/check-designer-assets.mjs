import {readFileSync} from 'node:fs';import {createHash} from 'node:crypto';
const baseline=JSON.parse(readFileSync(new URL('../../docs/testing/gems-designer-baseline.json',import.meta.url)));
let count=0;for(const [file,hash] of Object.entries(baseline.files)){if(!file.startsWith('public/')&&!file.endsWith('.css'))continue;const current=createHash('sha256').update(readFileSync(new URL('../'+file,import.meta.url))).digest('hex');if(hash!==current)throw new Error(`Designer asset changed: ${file}`);count++;}
console.log(`${count} original styles, fonts and assets unchanged`);
