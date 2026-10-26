import assert from 'node:assert/strict';
import test from 'node:test';
import { products } from '../src/catalog.ts';
import { emptySale, productAmount, productOriginalAmount, saleActive, cartTotals, type Sale } from '../src/pricing.ts';
const now = Date.parse('2026-10-26T12:00:00Z');
const campaign = (extra: Partial<Sale> = {}): Sale => ({ ...emptySale(), enabled: true, startsAt: '2026-10-26T00:00:00Z', endsAt: '2026-11-09T00:00:00Z', ...extra });

test('all four tees show the exact requested regular and sale prices', () => {
  for (const tee of products.filter(item => item.category === 'Tees')) {
    assert.equal(productOriginalAmount(tee, 'ILS', '220g'), 120);
    assert.equal(productAmount(tee, 'ILS', '220g', now), 109.99);
    assert.equal(productOriginalAmount(tee, 'ILS', '260g'), 150);
    assert.equal(productAmount(tee, 'ILS', '260g', now), 139.99);
    assert.equal(productOriginalAmount(tee, 'USD', '220g'), 38.99);
    assert.equal(productAmount(tee, 'USD', '220g', now), 35.99);
    assert.equal(productOriginalAmount(tee, 'USD', '260g'), 48.99);
    assert.equal(productAmount(tee, 'USD', '260g', now), 44.99);
  }
});
test('product discounts start and end exactly on schedule; original price returns', () => {
  const tee = { ...products[0], gsmSalePrices: undefined, sale: campaign({ kind: 'percent', value: 15 }) };
  assert.equal(productAmount(tee, 'ILS', '220g', Date.parse(tee.sale.startsAt) - 1), 120);
  assert.equal(productAmount(tee, 'ILS', '220g', Date.parse(tee.sale.startsAt)), 102);
  assert.equal(productAmount(tee, 'ILS', '220g', Date.parse(tee.sale.endsAt)), 120);
  assert.equal(productAmount({ ...tee, sale: { ...tee.sale, enabled: false } }, 'ILS', '220g', now), 120);
});
test('15% store campaign applies once after product discounts with cent rounding', () => {
  const bag = [{ ...products[0], selectedWeight: '220g' as const }, { ...products[1], selectedWeight: '260g' as const }];
  assert.deepEqual(cartTotals(bag, 'ILS', campaign(), now), { subtotal: 249.98, discount: 37.5, total: 212.48 });
});
test('fixed store discount applies once to the bag, only in its currency, and never below zero', () => {
  const bag = [products[0], products[1]];
  assert.deepEqual(cartTotals(bag, 'ILS', campaign({ kind: 'amount', value: 50 }), now), { subtotal: 219.98, discount: 50, total: 169.98 });
  assert.equal(cartTotals(bag, 'ILS', campaign({ kind: 'amount', value: 500 }), now).total, 0);
  assert.equal(saleActive(campaign({ kind: 'amount', value: 50 }), 'USD', now), false);
  assert.deepEqual(cartTotals(bag, 'USD', campaign({ kind: 'amount', value: 50 }), now), { subtotal: 71.98, discount: 0, total: 71.98 });
  assert.deepEqual(cartTotals(bag, 'USD', campaign(), now), { subtotal: 71.98, discount: 10.8, total: 61.18 });
});
test('expired, invalid and stopped campaigns do not change totals', () => {
  for (const sale of [campaign({ enabled: false }), campaign({ value: -10 }), campaign({ value: 101 }), campaign({ startsAt: 'invalid' }), campaign({ endsAt: '2026-10-25T00:00:00Z' })]) {
    assert.equal(saleActive(sale, 'ILS', now), false);
    assert.equal(cartTotals([products[0]], 'ILS', sale, now).total, 109.99);
  }
  assert.deepEqual(cartTotals([], 'ILS', campaign({ kind: 'amount', value: 50 }), now), { subtotal: 0, discount: 0, total: 0 });
});

test('an active product sale temporarily replaces the fixed tee sale price, then the fixed price returns', () => {
  const start = Date.parse('2026-11-01T00:00:00Z'), end = Date.parse('2026-11-08T00:00:00Z');
  const tee = { ...products[0], sale: campaign({ kind: 'percent', value: 15, startsAt: '2026-11-01T00:00:00Z', endsAt: '2026-11-08T00:00:00Z' }) };
  // before the start: fixed sale price in both currencies
  assert.equal(productAmount(tee, 'ILS', '220g', start - 1), 109.99);
  assert.equal(productAmount(tee, 'USD', '260g', start - 1), 44.99);
  // from the start: 15% off the original price, not off the fixed sale price
  assert.equal(productAmount(tee, 'ILS', '220g', start), 102);
  assert.equal(productAmount(tee, 'ILS', '260g', start), 127.5);
  assert.equal(productAmount(tee, 'USD', '220g', start), 33.14);
  assert.equal(productAmount(tee, 'USD', '260g', start), 41.64);
  assert.equal(productOriginalAmount(tee, 'ILS', '220g'), 120);
  // at the end, and when stopped: back to the fixed sale price
  assert.equal(productAmount(tee, 'ILS', '220g', end), 109.99);
  assert.equal(productAmount(tee, 'USD', '220g', end), 35.99);
  assert.equal(productAmount({ ...tee, sale: { ...tee.sale, enabled: false } }, 'ILS', '220g', start), 109.99);
  assert.equal(productAmount({ ...tee, sale: { ...tee.sale, enabled: false } }, 'USD', '260g', start), 44.99);
});
test('a fixed-amount product sale applies only in its own currency; other currencies keep the fixed sale price', () => {
  const tee = { ...products[0], sale: campaign({ kind: 'amount', value: 20, currency: 'ILS' }) };
  assert.equal(productAmount(tee, 'ILS', '220g', now), 100);
  assert.equal(productAmount(tee, 'ILS', '260g', now), 130);
  assert.equal(productAmount(tee, 'USD', '220g', now), 35.99);
  const usdTee = { ...products[0], sale: campaign({ kind: 'amount', value: 5, currency: 'USD' }) };
  assert.equal(productAmount(usdTee, 'USD', '220g', now), 33.99);
  assert.equal(productAmount(usdTee, 'ILS', '220g', now), 109.99);
});
test('a store-wide sale applies once on top, never stacking two product discounts', () => {
  const tee = { ...products[0], selectedWeight: '220g' as const, sale: campaign({ kind: 'percent', value: 15 }) };
  // product: 120 -> 102 (fixed 109.99 is not applied as well); store 10%: 102 -> 91.8
  assert.deepEqual(cartTotals([tee], 'ILS', campaign({ kind: 'percent', value: 10 }), now), { subtotal: 102, discount: 10.2, total: 91.8 });
  // without the product sale the fixed sale price is the base for the store sale
  assert.deepEqual(cartTotals([{ ...tee, sale: undefined }], 'ILS', campaign({ kind: 'percent', value: 10 }), now), { subtotal: 109.99, discount: 11, total: 98.99 });
  assert.deepEqual(cartTotals([tee], 'USD', campaign({ kind: 'amount', value: 50, currency: 'ILS' }), now), { subtotal: 33.14, discount: 0, total: 33.14 });
});
