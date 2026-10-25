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
