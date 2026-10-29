import { expect, it } from 'vitest';
import { rubToGemsMinor, gemsToRubReferenceMinor, topUpFiatMinor, sumGemsMinor } from './gems';
it('converts RUB and Gems with half-up integer rounding', () => {
  expect(rubToGemsMinor(100000)).toBe(200000);
  expect(gemsToRubReferenceMinor(1540006)).toBe(770003);
  expect(rubToGemsMinor(1)).toBe(2);
  expect(gemsToRubReferenceMinor(4)).toBe(2);
  expect(gemsToRubReferenceMinor(sumGemsMinor([101,102]))).toBe(102);
});
it('charges only whole Gems top-ups inside limits', () => {
  expect(topUpFiatMinor(100000)).toBe(50000);
  expect(topUpFiatMinor(10100)).toBe(5050);
  for (const n of [10001,9999,10000100,-1,NaN,Infinity]) expect(() => topUpFiatMinor(n)).toThrow();
});
it('rejects unsafe amounts and totals', () => {
  for (const n of [-1,NaN,Infinity,0.1,Number.MAX_SAFE_INTEGER+1]) {
    expect(() => rubToGemsMinor(n)).toThrow();
    expect(() => gemsToRubReferenceMinor(n)).toThrow();
  }
  expect(() => rubToGemsMinor(Number.MAX_SAFE_INTEGER)).toThrow();
  expect(() => sumGemsMinor([Number.MAX_SAFE_INTEGER,1])).toThrow();
});
