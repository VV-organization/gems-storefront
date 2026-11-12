import assert from 'node:assert/strict';
import {test} from 'node:test';
import {hostedCheckoutTarget} from '../src/lib/hosted-checkout.ts';
test('hosted checkout preserves return session and uses Clickit POST',()=>{
 const target=hostedCheckoutTarget('https://payment.clickit.team/order-1','local-1','https://gemsmarket.com');
 assert.equal(target.action,'https://payment.clickit.team/order-1');
 assert.equal(new URL(target.successUrl).pathname,'/payments/return');
 assert.equal(new URL(target.successUrl).searchParams.get('session'),'local-1');
 assert.equal(new URL(target.failUrl).searchParams.get('session'),'local-1');
});
test('rejects foreign and malformed checkout destinations',()=>{
 for(const url of ['https://evil.test/order','https://payment.clickit.team.evil.test/order','https://payment.clickit.team/order?next=evil','https://user@payment.clickit.team/order','http://payment.clickit.team/order']){
  assert.throws(()=>hostedCheckoutTarget(url,'local-1','https://gemsmarket.com'));
 }
});

test('saved Paidlayer sessions use Clickit with the same order and return URLs',()=>{
 const target=hostedCheckoutTarget('https://payment.paidlayer.com/existing-order','existing-session','https://getsgems.com');
 assert.equal(target.action,'https://payment.clickit.team/existing-order');
 assert.equal(target.successUrl,'https://getsgems.com/payments/return?session=existing-session&payment=success');
 assert.equal(target.failUrl,'https://getsgems.com/payments/return?session=existing-session&payment=failed');
 for(const url of ['https://payment.paidlayer.com.evil.test/order','https://payment.paidlayer.com/order?next=evil','https://user@payment.paidlayer.com/order','http://payment.paidlayer.com/order','https://payment.paidlayer.com/order#fragment']){
  assert.throws(()=>hostedCheckoutTarget(url,'local-1','https://getsgems.com'));
 }
});
