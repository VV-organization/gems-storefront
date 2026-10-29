import test from 'node:test';
import assert from 'node:assert/strict';
import {mergeCartIds} from '../src/lib/cart.ts';

test('cart merge preserves existing items, deduplicates and removes stale IDs',()=>{
  assert.deepEqual(mergeCartIds(['a','a','stale'],['a','b','b'],['a','b','c']),['a','b']);
});
