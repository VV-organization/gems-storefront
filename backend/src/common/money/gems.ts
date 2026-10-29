/** Canonical Gems money. All inputs/outputs are integer hundredths. */
function minor(value: number): bigint {
  if (!Number.isSafeInteger(value) || value < 0) throw new RangeError('MONEY_AMOUNT_INVALID');
  return BigInt(value);
}
function safe(value: bigint): number {
  if (value > BigInt(Number.MAX_SAFE_INTEGER)) throw new RangeError('MONEY_AMOUNT_OVERFLOW');
  return Number(value);
}
export function rubToGemsMinor(rubMinor: number): number {
  return safe(minor(rubMinor) * 2n);
}
export function gemsToRubReferenceMinor(gemsMinor: number): number {
  return safe((minor(gemsMinor) + 1n) / 2n);
}
export function topUpFiatMinor(gemsMinor: number): number {
  const amount = minor(gemsMinor);
  if (amount < 10_000n || amount > 10_000_000n || amount % 100n !== 0n) throw new RangeError('TOP_UP_AMOUNT_INVALID');
  return safe(amount / 2n);
}
export function sumGemsMinor(amounts: readonly number[]): number {
  return safe(amounts.reduce((total, value) => total + minor(value), 0n));
}
