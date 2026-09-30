import test from "node:test";
import assert from "node:assert/strict";
import { parseAmount, gemsToRub, rubToGems, steamQuote, sumPrices } from "../src/lib/money.ts";

test("парсер: десятичный ввод без потери копеек", () => {
  assert.equal(parseAmount("1 000,50"), 100050);
  assert.equal(parseAmount("0.01"), 1);
  for (const value of ["", "-1", "NaN", "Infinity", "1e8", "1.001", "9".repeat(30)]) assert.equal(parseAmount(value), null);
});
test("курс 1 рубль = 2 Gems в обе стороны", () => {
  assert.equal(gemsToRub(200), 100);
  assert.equal(gemsToRub(100000), 50000);
  assert.equal(rubToGems(100000), 200000);
  assert.equal(gemsToRub(1), 1);
});
test("Steam 5% сверху, округление справочной котировки половина вверх", () => {
  assert.deepEqual(steamQuote(100000), { amount:100000, fee:5000, total:105000 });
  assert.deepEqual(steamQuote(250000), { amount:250000, fee:12500, total:262500 });
  assert.deepEqual(steamQuote(10), { amount:10, fee:1, total:11 });
  assert.throws(() => steamQuote(-1));
});
test("итог переводит общую сумму Gems с единственным округлением", () => {
  assert.deepEqual(sumPrices([1,1]), { gems:2, rub:1 });
  assert.deepEqual(sumPrices([100,200]), { gems:300, rub:150 });
});

test("fractional conversion rounds half up and rejects invalid money",()=>{assert.equal(gemsToRub(4),2);assert.equal(rubToGems(1),2);assert.equal(gemsToRub(200001),100001);assert.throws(()=>gemsToRub(-1));assert.throws(()=>rubToGems(NaN));});
