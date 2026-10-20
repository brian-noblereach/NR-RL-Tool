// intake-auth.js - Founder login for the intake page (intake.html).
//
// Founders get their own token under their own localStorage key. This module
// never reads or writes the advisor keys (noblereach_access_token /
// noblereach_user_role), so a founder session on a shared computer cannot
// replace an advisor's session in the RL Tool or the Qualification Tool.
//
// The proxy only issues a 'founder' token when the login says app=intake, and
// the advisor login (src/auth.js) rejects founder tokens.

import { PROXY_URL } from '../proxy-client.js';

const TOKEN_KEY = 'nr_founder_access_token';
const ROLE_KEY = 'nr_founder_role';

// The founder password, or the internal password for staff testing.
const INTAKE_ROLES = ['founder', 'internal'];

export const IntakeAuth = {
  getToken() {
    try { return localStorage.getItem(TOKEN_KEY) || ''; } catch (e) { return ''; }
  },

  clear() {
    try {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(ROLE_KEY);
    } catch (e) { /* storage unavailable */ }
  },

  /**
   * True when a valid founder (or staff) session exists.
   * Offline grace: if the proxy can't be reached, a stored token is accepted.
   */
  async checkAccess() {
    const token = this.getToken();
    if (!token) return false;
    try {
      const resp = await fetch(`${PROXY_URL}?action=verify&token=${encodeURIComponent(token)}`);
      const result = await resp.json();
      if (result.valid && INTAKE_ROLES.includes(result.role)) return true;
      this.clear();
      return false;
    } catch (e) {
      console.warn('[Intake] Verify failed, allowing cached access:', e.message);
      try { return INTAKE_ROLES.includes(localStorage.getItem(ROLE_KEY)); } catch (err) { return false; }
    }
  },

  /**
   * Returns { success, error? }.
   */
  async login(password) {
    try {
      const resp = await fetch(`${PROXY_URL}?action=auth&app=intake&password=${encodeURIComponent(password)}`);
      const data = await resp.json();
      if (data.success && data.token && INTAKE_ROLES.includes(data.role)) {
        localStorage.setItem(TOKEN_KEY, data.token);
        localStorage.setItem(ROLE_KEY, data.role);
        return { success: true };
      }
      return { success: false, error: data.error || 'Invalid access code' };
    } catch (e) {
      return { success: false, error: 'Unable to connect. Please try again.' };
    }
  }
};
