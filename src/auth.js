// auth.js - Access control for pilot distribution
// Verifies password against Google Apps Script proxy, stores signed token in localStorage.
// Token is tied to a password version — rotating the password invalidates all sessions.
// The proxy checks this token on every data action (see proxy-update/Code.gs ACTION_ROLES).

import { PROXY_URL } from './proxy-client.js';

const STORAGE_KEY = 'noblereach_access_token';
const ROLE_KEY = 'noblereach_user_role';

// Only these roles may use the advisor tool. Founder tokens belong to the
// intake page (intake.html) and are never accepted here.
const ADVISOR_ROLES = ['internal', 'external'];

export const Auth = {
  role: null,

  /**
   * Returns true if the user is in external mode.
   */
  isExternal() {
    if (this.role) return this.role === 'external';
    return localStorage.getItem(ROLE_KEY) === 'external';
  },

  /**
   * The stored token, sent with every proxy data action.
   */
  getToken() {
    return localStorage.getItem(STORAGE_KEY) || '';
  },

  /**
   * Check if user has valid access. Called before app init.
   * Returns true if authenticated, false if login needed.
   */
  async checkAccess() {
    const token = localStorage.getItem(STORAGE_KEY);
    if (!token) return false;

    try {
      const result = await this.verifyToken(token);
      if (result.valid && ADVISOR_ROLES.includes(result.role)) {
        this.role = result.role;
        localStorage.setItem(ROLE_KEY, this.role);
        return true;
      }

      // Token invalid — clear it and role
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(ROLE_KEY);
      this.role = null;
      return false;
    } catch (e) {
      // Network error — allow access if token exists (offline grace)
      console.warn('[Auth] Verify failed, allowing cached access:', e.message);
      const cachedRole = localStorage.getItem(ROLE_KEY);
      if (!ADVISOR_ROLES.includes(cachedRole)) return false;
      this.role = cachedRole;
      return true;
    }
  },

  /**
   * Attempt login with password.
   * Returns { success, error? }
   */
  async login(password) {
    try {
      const url = `${PROXY_URL}?action=auth&password=${encodeURIComponent(password)}`;
      const response = await fetch(url);
      const data = await response.json();

      if (data.success && data.token) {
        if (!ADVISOR_ROLES.includes(data.role)) {
          return { success: false, error: 'Invalid password' };
        }
        localStorage.setItem(STORAGE_KEY, data.token);
        this.role = data.role;
        localStorage.setItem(ROLE_KEY, this.role);
        return { success: true };
      }

      return { success: false, error: data.error || 'Invalid password' };
    } catch (e) {
      return { success: false, error: 'Unable to connect. Please try again.' };
    }
  },

  /**
   * Verify token with server.
   */
  async verifyToken(token) {
    const url = `${PROXY_URL}?action=verify&token=${encodeURIComponent(token)}`;
    const response = await fetch(url);
    return await response.json();
  },

  /**
   * Logout — clear stored token and show login.
   */
  logout() {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(ROLE_KEY);
    this.role = null;
    this.showLoginOverlay();
  },

  /**
   * The proxy rejected the token (expired, rotated, or missing). Ask the user
   * to log in again. Local work is already in localStorage, so nothing is lost;
   * main.js boots only once, so logging back in just closes the overlay.
   */
  handleUnauthorized() {
    console.warn('[Auth] Proxy rejected the session token; asking user to log in again');
    this.logout();
    const errorEl = document.getElementById('auth-error');
    if (errorEl) errorEl.textContent = 'Your session expired. Please log in again. Your work is saved in this browser.';
  },

  /**
   * Show the login overlay.
   */
  showLoginOverlay() {
    const overlay = document.getElementById('auth-overlay');
    if (overlay) overlay.classList.add('active');

    const input = document.getElementById('auth-password');
    if (input) {
      input.value = '';
      setTimeout(() => input.focus(), 100);
    }

    const errorEl = document.getElementById('auth-error');
    if (errorEl) errorEl.textContent = '';
  },

  /**
   * Hide the login overlay.
   */
  hideLoginOverlay() {
    const overlay = document.getElementById('auth-overlay');
    if (overlay) overlay.classList.remove('active');
  },

  /**
   * Setup login form handler.
   * @param {Function} onSuccess - Callback to run after successful login (e.g., boot the app)
   */
  initLoginForm(onSuccess) {
    const form = document.getElementById('auth-form');
    const input = document.getElementById('auth-password');
    const btn = document.getElementById('auth-submit');
    const errorEl = document.getElementById('auth-error');

    if (!form) return;

    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      const password = input.value.trim();
      if (!password) return;

      btn.disabled = true;
      btn.textContent = 'Verifying...';
      errorEl.textContent = '';

      const result = await this.login(password);

      if (result.success) {
        this.hideLoginOverlay();
        if (onSuccess) onSuccess();
      } else {
        errorEl.textContent = result.error;
        btn.disabled = false;
        btn.textContent = 'Enter';
        input.select();
      }
    });
  }
};
