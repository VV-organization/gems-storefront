/** Steam's fixed canvas adds transparent padding without enlarging the item.
 * Use the original image so CSS contain fits the actual source proportions. */
export function catalogImageSrc(src:string):string {
  return src.includes('/economy/image/')?src.replace(/\/1024fx768f$/, ''):src;
}
