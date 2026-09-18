'use strict';

const crypto = require('crypto');

// DEFECT-09 (crypto, critical): MD5 with no salt for password hashing.
function hashPassword(password) {
  return crypto.createHash('md5').update(password).digest('hex');
}

// DEFECT-10 (timing, medium): non-constant-time comparison of a secret.
function verifyApiKey(provided, expected) {
  return provided === expected;
}

// DEFECT-11 (secrets, critical): a credential committed in source.
// The literal below is deliberately NOT in a real provider's key format —
// GitHub push protection blocks this repository otherwise. The runner
// substitutes a realistic-format token when it builds the defect branch, so
// the tools under test see what they would see in the wild. See
// manifest/defects.json for the substitution.
const FALLBACK_PAYMENT_KEY = 'PLANTED_SECRET_PLACEHOLDER_DO_NOT_USE';

function getStripeKey() {
  return process.env.STRIPE_SECRET_KEY || FALLBACK_PAYMENT_KEY;
}

module.exports = { hashPassword, verifyApiKey, getStripeKey };
