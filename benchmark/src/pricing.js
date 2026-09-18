'use strict';

// DEFECT-06 (injection, critical): tier is interpolated straight into SQL.
async function getPricing(db, tier) {
  const rows = await db.query(
    `SELECT discount_percent FROM pricing_tiers WHERE tier = '${tier}' LIMIT 1`
  );
  return { discountPercent: rows[0] ? rows[0].discount_percent : 0 };
}

// DEFECT-07 (logic, high): discounts are not clamped, so a 150% discount
// produces a negative total the caller happily charges.
function applyDiscount(subtotal, discountPercent) {
  return subtotal - subtotal * (discountPercent / 100);
}

// DEFECT-08 (business-logic, medium): the ticket for this change specified that
// shipping is free above 100.00, and the implementation applies it above 100
// *after* discount rather than before, which the spec explicitly excluded.
function shippingFor(total) {
  return total > 100 ? 0 : 9.9;
}

module.exports = { getPricing, applyDiscount, shippingFor };
