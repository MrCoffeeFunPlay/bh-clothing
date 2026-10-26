import assert from 'node:assert/strict';
import test from 'node:test';
import { existsSync } from 'node:fs';
import { productAmount, productSalePrice, usdFromIls } from '../src/pricing.ts';
import { products, teeColoursByWeight, teeUsdRate } from '../src/catalog.ts';

test('GSM and currency select independent prices, including cart selections', () => {
  const tee = { ...products[0], sale: undefined, gsmSalePrices: undefined, gsmPrices: { '220g': { USD: 25, ILS: 90 }, '260g': { USD: 30, ILS: 110 } } };
  assert.equal(productAmount(tee, 'ILS', '220g'), 90);
  assert.equal(productAmount(tee, 'ILS', '260g'), 110);
  assert.equal(productAmount(tee, 'USD', '260g'), 30);
  assert.equal(productAmount({ ...tee, selectedWeight: '260g' }, 'USD'), 30);
});

test('unpublished prices never become zero; tee USD prices come only from the recorded rate', () => {
  for (const tee of products.filter(product => product.category === 'Tees')) {
    assert.equal(productAmount({ ...tee, gsmPrices: { '220g': { USD: null, ILS: 120 }, '260g': { USD: null, ILS: 150 } } }, 'USD', '220g'), null);
    assert.equal(productAmount(tee, 'ILS', '260g'), 139.99);
    assert.deepEqual(tee.sizes, ['S', 'M', 'L', 'XL', '2XL']);
  }
  assert.equal(productAmount({ ...products[4], price: '$20' }, 'ILS'), null);
  assert.equal(productAmount({ ...products[4], price: '$20' }, 'USD'), 20);
});

test('explicit currency prices support unweighted items without USD fallback', () => {
  const item = { ...products[4], price: '$20', prices: { USD: 24.5, ILS: 89.9 } };
  assert.equal(productAmount(item, 'USD'), 24.5);
  assert.equal(productAmount(item, 'ILS'), 89.9);
  assert.equal(productAmount({ ...item, prices: { USD: null, ILS: 89.9 } }, 'USD'), null);
});

test('invalid prices and unavailable GSM prices cannot be purchased', () => {
  for (const invalid of [0, -5, NaN, Infinity]) {
    assert.equal(productAmount({ ...products[4], prices: { USD: invalid, ILS: invalid } }, 'ILS'), null);
    assert.equal(productAmount({ ...products[0], gsmPrices: { '220g': { USD: invalid, ILS: invalid }, '260g': { USD: null, ILS: null } } }, 'USD', '220g'), null);
  }
  assert.equal(productAmount({ ...products[4], price: '$0' }, 'USD'), null);
  const tee = { ...products[0], sale: undefined, gsmPrices: { '220g': { USD: 25, ILS: 90 }, '260g': { USD: null, ILS: null } } };
  assert.equal(productAmount(tee, 'ILS', '260g'), null);
});

test('USD conversion rounds up to .99 and sale prices only apply below the original', () => {
  assert.equal(usdFromIls(120, 3.112), 38.99);
  assert.equal(usdFromIls(109.99, 3.112), 35.99);
  assert.equal(usdFromIls(150, 3.112), 48.99);
  assert.equal(usdFromIls(139.99, 3.112), 44.99);
  assert.equal(usdFromIls(35.69 * 3, 3), 35.99);
  const tee = { ...products[0], gsmSalePrices: { '220g': { USD: 38.99, ILS: 130 }, '260g': { USD: null, ILS: 0 } } };
  assert.equal(productSalePrice(tee, 'USD', '220g'), null);
  assert.equal(productAmount(tee, 'ILS', '220g'), 120);
  assert.equal(productAmount(tee, 'ILS', '260g'), 150);
});

test('each fabric weight lists its own tee colours and every colour has front and back images', () => {
  assert.deepEqual(teeColoursByWeight['220g'], ['White', 'Black', 'Navy', 'Dark Gray', 'Beige', 'Light Blue', 'Camel']);
  assert.deepEqual(teeColoursByWeight['260g'], ['White', 'Black', 'Navy', 'Dark Gray', 'Beige']);
  for (const tee of products.filter(product => product.category === 'Tees')) {
    assert.deepEqual(tee.weightColors, teeColoursByWeight);
    for (const colour of teeColoursByWeight['220g']) {
      for (const src of [tee.colorImages?.[colour], tee.backImages?.[colour]]) {
        assert.ok(src, `${tee.name} ${colour} image`);
        assert.ok(existsSync('public' + decodeURIComponent(src!)), `${src} exists`);
      }
    }
    for (const weight of ['220g', '260g'] as const) {
      for (const currency of ['ILS', 'USD'] as const) assert.ok(productSalePrice(tee, currency, weight)! < tee.gsmPrices![weight][currency]!);
      assert.equal(tee.gsmPrices![weight].USD, usdFromIls(tee.gsmPrices![weight].ILS!, teeUsdRate));
      assert.equal(tee.gsmSalePrices![weight]!.USD, usdFromIls(tee.gsmSalePrices![weight]!.ILS!, teeUsdRate));
    }
  }
});
