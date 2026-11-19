// proxy-client.js - The one place the GAS proxy URL lives.
//
// Every client module imports PROXY_URL from here. If the GAS deployment URL
// changes, this is the only line to update. Zero imports, so auth.js and the
// founder intake page can both depend on it without a cycle.

export const PROXY_URL = 'https://script.google.com/macros/s/AKfycbzt7wElvzQv0CNs-icg7QWpxjf4E5FGqWa6KpCY4zSa_thccGNWhw-THLTpnn8GJa2W/exec';

/**
 * POST a JSON payload to the proxy and return its JSON reply.
 *
 * The body is sent as text/plain with no custom headers, which keeps this a
 * CORS "simple request" (no preflight). GAS answers through a redirect whose
 * final response is readable cross-origin, so we get the JSON back. Use this
 * for anything with free text or secrets — it keeps them out of the URL.
 *
 * Throws on network failure or a non-JSON reply; callers decide how to retry.
 */
export async function postJSON(data, { timeoutMs = 30000 } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(PROXY_URL, {
      method: 'POST',
      body: JSON.stringify(data),
      redirect: 'follow',
      signal: controller.signal
    });
    if (!response.ok) throw new Error('HTTP ' + response.status);
    return await response.json();
  } finally {
    clearTimeout(timer);
  }
}
