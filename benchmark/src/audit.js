'use strict';

// DEFECT-12 (data-exposure, high): the audit log writes the whole payload,
// including the payment token, to stdout where it lands in log aggregation.
async function audit(event, payload) {
  console.log(JSON.stringify({ event, at: new Date().toISOString(), ...payload }));
}

module.exports = { audit };
