export function mergeCartIds(current:readonly string[],incoming:readonly string[],valid:readonly string[]){
  const allowed=new Set(valid);
  return [...new Set([...current,...incoming])].filter(id=>allowed.has(id));
}
