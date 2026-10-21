// intake-api.js - Venture intake calls to the GAS proxy.
//
// Everything goes by POST (proxy-client.postJSON) so answers, files, emails,
// and return codes never travel in a URL. Each call carries the founder token.

import { postJSON } from '../proxy-client.js';
import { IntakeAuth } from './intake-auth.js';
import { INTAKE_CONFIG } from './intake-config.js';

/**
 * A random submission ID. The proxy treats a repeated ID as the same
 * submission, so a retry after a dropped connection never creates a second row.
 */
export function newSubmissionId() {
  if (crypto.randomUUID) return 'fi_' + crypto.randomUUID().replace(/-/g, '');
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return 'fi_' + Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
}

async function call(action, payload, opts) {
  const result = await postJSON({ action, token: IntakeAuth.getToken(), ...payload }, opts);
  if (result && result.error === 'unauthorized') {
    IntakeAuth.clear();
    const err = new Error('Your session expired. Please enter the access code again.');
    err.unauthorized = true;
    throw err;
  }
  return result;
}

/**
 * Create the submission row (answers, record.json, brief, QM summary). Returns
 * { success, submissionId, rowId, returnCode, intakeNumber, emailSent, uploadToken, error? }.
 */
export function submitIntake({ submissionId, previousSubmissionId, record, answers, briefHtml, qmInput, uploads, hp }) {
  return call('intake_submit', { submissionId, previousSubmissionId, record, answers, briefHtml, qmInput, uploads, hp }, { timeoutMs: 60000 });
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).replace(/^data:[^,]*,/, ''));
    reader.onerror = () => reject(new Error('Could not read the file from your computer.'));
    reader.readAsDataURL(file);
  });
}

/**
 * Upload one file to the submission row. Returns { success, error? }.
 * Large files are slow over a home connection, hence the long timeout.
 */
export async function uploadIntakeFile({ uploadToken, slot, index, file }) {
  const dataBase64 = await fileToBase64(file);
  return call('intake_upload', { uploadToken, slot, index, name: file.name, mimeType: file.type || '', dataBase64 }, { timeoutMs: 300000 });
}

/**
 * Error text for a file the intake won't accept, or null. The proxy checks
 * the same rules (INTAKE_UPLOAD in Code.gs).
 */
export function checkFile(file) {
  const u = INTAKE_CONFIG.uploads;
  const ext = (String(file.name).toLowerCase().match(/\.([a-z0-9]+)$/) || [])[1] || '';
  const allowed = u.types[ext];
  const mb = Math.round(u.maxBytes / 1048576);
  if (!allowed) return 'Use a PDF, PPTX, DOCX, XLSX, PNG, JPG, or MP4 file, or share a link instead.';
  if (file.type && file.type !== 'application/octet-stream' && !allowed.includes(file.type)) return 'This file\'s type doesn\'t match its .' + ext + ' extension.';
  if (!file.size) return 'This file is empty.';
  if (file.size > u.maxBytes) return 'This file is larger than ' + mb + ' MB. Share a link (Box, Google Drive, OneDrive) instead.';
  return null;
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
