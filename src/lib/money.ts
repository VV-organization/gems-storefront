/** Minor units are hundredths; preview rounding is half-up, not a live payment contract. */
export const GEMS_PER_RUBLE = 2;
export const STEAM_FEE_PERCENT = 5;
const MAX_MINOR = 999_999_999;

export function parseAmount(value: string): number | null {
  const clean = value.trim().replace(/[ \u00a0\u202f]/g, "").replace(",", ".");
  if (!/^\d{1,7}(?:\.\d{1,2})?$/.test(clean)) return null;
  const [whole, fraction = ""] = clean.split(".");
  const minor = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
  return Number.isSafeInteger(minor) && minor <= MAX_MINOR ? minor : null;
}
function validMinor(value: number) {
  if (!Number.isSafeInteger(value) || value < 0 || value > MAX_MINOR) throw new RangeError("Invalid money amount");
}
export function gemsToRub(gemsMinor: number) {
  validMinor(gemsMinor);
  return Number((BigInt(gemsMinor) + 1n) / 2n);
}
export function rubToGems(rubMinor: number) {
  validMinor(rubMinor);
  return Number(BigInt(rubMinor) * 2n);
}
export function steamQuote(amount: number) {
  validMinor(amount);
  const fee = Number((BigInt(amount) * 5n + 50n) / 100n);
  return { amount, fee, total: amount + fee };
}
export function sumPrices(prices: readonly number[]) {
  const gems=prices.reduce((sum,price)=>{validMinor(price);return sum+price;},0);
  if(!Number.isSafeInteger(gems))throw new RangeError("Invalid total");
  return {gems,rub:Number((BigInt(gems)+1n)/2n)};
}
export function formatMinor(minor: number, digits = 2) {
  return (minor / 100).toLocaleString("ru-RU", { minimumFractionDigits:0, maximumFractionDigits:digits });
}
export function inputAmount(minor: number) {
  return (minor / 100).toFixed(2).replace(/\.00$/, "").replace(".", ",");
}
