/**
 * app.js — TaskFlow shared utilities
 * Handles: dark mode toggle, toast notifications, password eye-toggle, helper functions
 */

// ── Dark Mode ────────────────────────────────────────────
(function initDarkMode() {
  const stored = localStorage.getItem('taskflow_dark');
  if (stored === 'true') {
    document.body.classList.add('dark');
  }

  // Wait for DOM, then wire up toggle button
  document.addEventListener('DOMContentLoaded', () => {
    const btn = document.getElementById('darkToggle');
    if (btn) {
      btn.addEventListener('click', toggleDarkMode);
      updateDarkIcon();
    }
  });
})();

function toggleDarkMode() {
  document.body.classList.toggle('dark');
  const isDark = document.body.classList.contains('dark');
  localStorage.setItem('taskflow_dark', isDark);
  updateDarkIcon();
}

function updateDarkIcon() {
  const isDark = document.body.classList.contains('dark');
  const icon = document.getElementById('sunIcon');
  if (!icon) return;
  if (isDark) {
    // Moon icon
    icon.innerHTML = `<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>`;
  } else {
    // Sun icon
    icon.innerHTML = `<circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>`;
  }
}

// ── Toast Notifications ──────────────────────────────────
function showToast(message, type = 'success', duration = 3000) {
  const container = document.getElementById('toastContainer');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <span>${type === 'success' ? '✓' : '✕'}</span>
    <span>${message}</span>
  `;
  container.appendChild(toast);

  // Auto-remove
  setTimeout(() => {
    toast.classList.add('out');
    toast.addEventListener('animationend', () => toast.remove());
  }, duration);
}

// ── Inline Notification Banner ───────────────────────────
function showNotification(id, message, type = 'error') {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = message;
  el.className = `notification ${type}`;
}

function hideNotification(id) {
  const el = document.getElementById(id);
  if (el) el.className = 'notification hidden';
}

// ── Password Show/Hide Toggle ────────────────────────────
function togglePassword(inputId, iconId) {
  const input = document.getElementById(inputId);
  const icon  = document.getElementById(iconId);
  if (!input) return;

  const isPassword = input.type === 'password';
  input.type = isPassword ? 'text' : 'password';

  if (icon) {
    if (isPassword) {
      // Eye-off icon
      icon.innerHTML = `<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/>`;
    } else {
      icon.innerHTML = `<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>`;
    }
  }
}

// ── Password Strength ────────────────────────────────────
function updatePasswordStrength(value) {
  const bar   = document.getElementById('strengthBar');
  const label = document.getElementById('strengthLabel');
  if (!bar || !label) return;

  let score = 0;
  if (value.length >= 8)          score++;
  if (/[A-Z]/.test(value))        score++;
  if (/[a-z]/.test(value))        score++;
  if (/[0-9]/.test(value))        score++;
  if (/[^A-Za-z0-9]/.test(value)) score++;

  const levels = [
    { pct: '0%',   color: 'transparent', text: '' },
    { pct: '20%',  color: '#e74c3c',     text: 'Weak' },
    { pct: '40%',  color: '#e67e22',     text: 'Fair' },
    { pct: '60%',  color: '#f1c40f',     text: 'Good' },
    { pct: '80%',  color: '#27ae60',     text: 'Strong' },
    { pct: '100%', color: '#1abc9c',     text: 'Excellent' },
  ];

  const lvl = levels[score] || levels[0];
  bar.style.width    = lvl.pct;
  bar.style.background = lvl.color;
  label.textContent  = lvl.text;
  label.style.color  = lvl.color;
}

function updatePasswordRules(value) {
  const rules = {
    'rule-length':  value.length >= 8,
    'rule-upper':   /[A-Z]/.test(value),
    'rule-lower':   /[a-z]/.test(value),
    'rule-number':  /[0-9]/.test(value),
    'rule-special': /[^A-Za-z0-9]/.test(value),
  };
  for (const [id, valid] of Object.entries(rules)) {
    const el = document.getElementById(id);
    if (el) el.classList.toggle('valid', valid);
  }
}

// ── Greeting helpers ─────────────────────────────────────
function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

function formatDateLong(date = new Date()) {
  return date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
}

// ── Form field error helpers ─────────────────────────────
function setFieldError(inputId, errorId, message) {
  const input = document.getElementById(inputId);
  const error = document.getElementById(errorId);
  if (input) input.classList.add('error');
  if (error) error.textContent = message;
}

function clearFieldError(inputId, errorId) {
  const input = document.getElementById(inputId);
  const error = document.getElementById(errorId);
  if (input) input.classList.remove('error');
  if (error) error.textContent = '';
}

function clearAllErrors(fields) {
  fields.forEach(({ inputId, errorId }) => clearFieldError(inputId, errorId));
}

// ── Generate unique ID ───────────────────────────────────
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}