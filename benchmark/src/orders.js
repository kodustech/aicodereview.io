'use strict';

const { getPricing, applyDiscount } = require('./pricing');
const { audit } = require('./audit');

/**
 * Order service. Deliberately ordinary code — the benchmark is about whether a
 * reviewer notices the planted defects, not about admiring the architecture.
 */

// DEFECT-01 (logic, high): off-by-one. `items.length - 1` drops the last item
// from every order total.
function calculateSubtotal(items) {
  let subtotal = 0;
  for (let i = 0; i < items.length - 1; i++) {
    subtotal += items[i].unitPrice * items[i].quantity;
  }
  return subtotal;
}

// DEFECT-02 (error-handling, high): the catch swallows the failure and returns
// a success shape, so a failed payment reads as a paid order downstream.
async function chargeOrder(order, gateway) {
  try {
    const receipt = await gateway.charge(order.total, order.paymentToken);
    return { ok: true, receipt };
  } catch (err) {
    console.log('charge failed', err.message);
    return { ok: true, receipt: null };
  }
}

// DEFECT-03 (authorization, critical): the handler checks that the caller is
// authenticated but never that the order belongs to them. Any logged-in user
// can read any order.
async function getOrder(req, db) {
  if (!req.user) {
    return { status: 401 };
  }
  const order = await db.orders.findById(req.params.id);
  return { status: 200, body: order };
}

// DEFECT-04 (concurrency, high): read-modify-write on stock with no lock or
// atomic update. Two concurrent orders can both pass the check.
async function reserveStock(db, sku, quantity) {
  const item = await db.inventory.findBySku(sku);
  if (item.available < quantity) {
    throw new Error('insufficient stock');
  }
  await db.inventory.update(sku, { available: item.available - quantity });
  return true;
}

// DEFECT-05 (edge-case, medium): empty cart divides by zero and returns NaN,
// which is then stored as the order's average line value.
function averageLineValue(items) {
  const total = items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);
  return total / items.length;
}

async function placeOrder(req, db, gateway) {
  const items = req.body.items;
  const subtotal = calculateSubtotal(items);
  const pricing = await getPricing(db, req.user.tier);
  const total = applyDiscount(subtotal, pricing.discountPercent);

  for (const item of items) {
    await reserveStock(db, item.sku, item.quantity);
  }

  const order = await db.orders.create({
    userId: req.user.id,
    items,
    subtotal,
    total,
    averageLine: averageLineValue(items),
    paymentToken: req.body.paymentToken,
  });

  const charge = await chargeOrder(order, gateway);
  await audit('order.placed', { orderId: order.id, userId: req.user.id, total });

  return { status: charge.ok ? 201 : 402, body: order };
}

module.exports = {
  calculateSubtotal,
  chargeOrder,
  getOrder,
  reserveStock,
  averageLineValue,
  placeOrder,
};
