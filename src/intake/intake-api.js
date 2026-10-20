// intake-api.js - Founder intake calls to the GAS proxy.
//
// Everything goes by POST (proxy-client.postJSON) so answers, emails, and
// return codes never travel in a URL. Each call carries the founder token.

import { postJSON } from '../proxy-client.js';
import { IntakeAuth } from './intake-auth.js';

/**
 * A random submission ID. The proxy treats a repeated ID as the same
 * submission, so a retry after a dropped connection never creates a second row.
 */
export function newSubmissionId() {
  if (crypto.randomUUID) return 'fi_' + crypto.randomUUID().replace(/-/g, '');
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return 'fi_' + Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
}

async function call(action, payload) {
  const result = await postJSON({ action, token: IntakeAuth.getToken(), ...payload });
  if (result && result.error === 'unauthorized') {
    IntakeAuth.clear();
    const err = new Error('Your session expired. Please enter the access code again.');
    err.unauthorized = true;
    throw err;
  }
  return result;
}

/**
 * Save an intake. Returns { success, returnCode, intakeNumber, emailSent, warning?, error? }.
 */
export function submitIntake({ submissionId, previousSubmissionId, record, answers }) {
  return call('intake_submit', { submissionId, previousSubmissionId, record, answers });
}

/**
 * Email + return code. Without submissionId: { submissions: [...] }.
 * With submissionId: { answers, submittedAt }.
 */
export function lookupIntake({ email, code, submissionId }) {
  return call('intake_lookup', { email, code, submissionId });
}

/**
 * Ask the proxy to email the return code to the address on file.
 */
export function resendCode(email) {
  return call('intake_resend_code', { email });
}
