import assert from 'node:assert/strict';
import test from 'node:test';
import { productAmount } from '../src/pricing.ts';
import { products } from '../src/catalog.ts';

test('GSM and currency select independent prices, including cart selections', () => {
  const tee = { ...products[0], gsmPrices: { '220g': { USD: 25, ILS: 90 }, '260g': { USD: 30, ILS: 110 } } };
  assert.equal(productAmount(tee, 'ILS', '220g'), 90);
  assert.equal(productAmount(tee, 'ILS', '260g'), 110);
  assert.equal(productAmount(tee, 'USD', '260g'), 30);
  assert.equal(productAmount({ ...tee, selectedWeight: '260g' }, 'USD'), 30);
});

test('unpublished prices never become zero or use an invented exchange rate', () => {
  for (const tee of products.filter(product => product.category === 'Tees')) {
    assert.equal(productAmount(tee, 'USD', '220g'), null);
    assert.equal(productAmount(tee, 'ILS', '260g'), null);
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
  const tee = { ...products[0], gsmPrices: { '220g': { USD: 25, ILS: 90 }, '260g': { USD: null, ILS: null } } };
  assert.equal(productAmount(tee, 'ILS', '260g'), null);
});
