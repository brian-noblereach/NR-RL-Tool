// auth.js - Access control for pilot distribution
// Verifies password against Google Apps Script proxy, stores signed token in localStorage.
// Token is tied to a password version — rotating the password invalidates all sessions.

const STORAGE_KEY = 'noblereach_access_token';
const PROXY_URL = 'https://script.google.com/macros/s/AKfycbzt7wElvzQv0CNs-icg7QWpxjf4E5FGqWa6KpCY4zSa_thccGNWhw-THLTpnn8GJa2W/exec';

export const Auth = {
  /**
   * Check if user has valid access. Called before app init.
   * Returns true if authenticated, false if login needed.
   */
  async checkAccess() {
    const token = localStorage.getItem(STORAGE_KEY);
    if (!token) return false;

    try {
      const result = await this.verifyToken(token);
      if (result.valid) return true;

      // Token invalid — clear it
      localStorage.removeItem(STORAGE_KEY);
      return false;
    } catch (e) {
      // Network error — allow access if token exists (offline grace)
      console.warn('[Auth] Verify failed, allowing cached access:', e.message);
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
        localStorage.setItem(STORAGE_KEY, data.token);
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
    this.showLoginOverlay();
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
