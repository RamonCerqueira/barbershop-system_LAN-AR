const assert = require('node:assert/strict');
require('./register-ts.cjs');
const { PLAN_CODES, SUBSCRIPTION_PLANS, AVAILABLE_PLANS, quotePlan, subscriptionPeriodEnd, isAvailablePlan } = require('../src/lib/plans.ts');
assert.deepEqual(AVAILABLE_PLANS.map(p => p.price), [89.9, 485.46, 916.98, 129.9, 701.46, 1324.98, 159.9, 863.46, 1630.98]);
let cases = 0;
for (const current of [...PLAN_CODES, 'QUARTERLY']) {
  for (const target of PLAN_CODES) {
    for (const paid of [false, true]) {
      const from = SUBSCRIPTION_PLANS[current], to = SUBSCRIPTION_PLANS[target];
      const expected = paid && to.months >= 6 && (to.rank > from.rank || (to.rank === from.rank && to.months > from.months)) ? 0.9 : 1;
      const quote = quotePlan(current, target, paid);
      assert.equal(quote.price, Math.round(to.price * expected * 100) / 100, `${current} -> ${target} paid=${paid}`);
      assert.equal(quote.basePrice, to.price);
      cases++;
    }
  }
}
assert.equal(quotePlan('MONTHLY', 'SEMIANNUAL', true).price, 436.91);
assert.equal(quotePlan('MONTHLY', 'ANNUAL', true).price, 825.28);
assert.equal(quotePlan('MONTHLY', 'PRO_SEMIANNUAL', true).price, 631.31);
assert.equal(quotePlan('MONTHLY', 'PRO_ANNUAL', true).price, 1192.48);
assert.equal(quotePlan('MONTHLY', 'ELITE_SEMIANNUAL', true).price, 777.11);
assert.equal(quotePlan('MONTHLY', 'ELITE_ANNUAL', true).price, 1467.88);
assert.equal(isAvailablePlan('QUARTERLY'), false);
assert.equal(isAvailablePlan('toString'), false);
assert.equal(subscriptionPeriodEnd(new Date('2026-08-31T15:30:00Z'), 'SEMIANNUAL').toISOString(), '2027-02-28T15:30:00.000Z');
assert.equal(subscriptionPeriodEnd(new Date('2028-02-29T15:30:00Z'), 'ANNUAL').toISOString(), '2029-02-28T15:30:00.000Z');
console.log(`PASS: catalog, ${cases} pricing scenarios, upgrade totals and calendar periods`);
