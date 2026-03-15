/**
 * auth.js — TaskFlow Authentication
 * Handles signup, login, logout using localStorage
 * Users are stored as: taskflow_users = [{ id, name, email, password }]
 * Session:            taskflow_session = { userId, name, email }
 */

// ── Storage Keys ─────────────────────────────────────────
const USERS_KEY   = 'taskflow_users';
const SESSION_KEY = 'taskflow_session';

// ── User Store Helpers ───────────────────────────────────
function getUsers() {
  try {
    return JSON.parse(localStorage.getItem(USERS_KEY)) || [];
  } catch {
    return [];
  }
}

function saveUsers(users) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

function getUserByEmail(email) {
  return getUsers().find(u => u.email.toLowerCase() === email.toLowerCase());
}

// ── Session Helpers ──────────────────────────────────────
function getSession() {
  try {
    return JSON.parse(localStorage.getItem(SESSION_KEY));
  } catch {
    return null;
  }
}

function setSession(user) {
  const session = { userId: user.id, name: user.name, email: user.email };
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

function clearSession() {
  localStorage.removeItem(SESSION_KEY);
}

function requireAuth() {
  if (!getSession()) {
    window.location.href = 'login.html';
    return false;
  }
  return true;
}

// ── Validation ───────────────────────────────────────────
function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validatePassword(password) {
  const errors = [];
  if (password.length < 8)            errors.push('At least 8 characters');
  if (!/[A-Z]/.test(password))        errors.push('One uppercase letter');
  if (!/[a-z]/.test(password))        errors.push('One lowercase letter');
  if (!/[0-9]/.test(password))        errors.push('One number');
  if (!/[^A-Za-z0-9]/.test(password)) errors.push('One special character');
  return errors;
}

// ── Signup Handler ───────────────────────────────────────
function handleSignup(e) {
  e.preventDefault();
  hideNotification('notification');

  const name     = document.getElementById('name').value.trim();
  const email    = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;
  const confirm  = document.getElementById('confirmPassword').value;

  const fields = [
    { inputId: 'name',            errorId: 'nameError' },
    { inputId: 'email',           errorId: 'emailError' },
    { inputId: 'password',        errorId: 'passwordError' },
    { inputId: 'confirmPassword', errorId: 'confirmPasswordError' },
  ];
  clearAllErrors(fields);

  let hasError = false;

  // Name
  if (!name) {
    setFieldError('name', 'nameError', 'Name is required.');
    hasError = true;
  } else if (name.length < 2) {
    setFieldError('name', 'nameError', 'Name must be at least 2 characters.');
    hasError = true;
  }

  // Email
  if (!email) {
    setFieldError('email', 'emailError', 'Email is required.');
    hasError = true;
  } else if (!validateEmail(email)) {
    setFieldError('email', 'emailError', 'Please enter a valid email.');
    hasError = true;
  } else if (getUserByEmail(email)) {
    setFieldError('email', 'emailError', 'An account with this email already exists.');
    hasError = true;
  }

  // Password
  const pwErrors = validatePassword(password);
  if (!password) {
    setFieldError('password', 'passwordError', 'Password is required.');
    hasError = true;
  } else if (pwErrors.length > 0) {
    setFieldError('password', 'passwordError', 'Password does not meet requirements.');
    hasError = true;
  }

  // Confirm
  if (!confirm) {
    setFieldError('confirmPassword', 'confirmPasswordError', 'Please confirm your password.');
    hasError = true;
  } else if (password !== confirm) {
    setFieldError('confirmPassword', 'confirmPasswordError', 'Passwords do not match.');
    hasError = true;
  }

  if (hasError) return;

  // Create user
  const newUser = {
    id:        generateId(),
    name:      name,
    email:     email.toLowerCase(),
    password:  password, // NOTE: In a real app, passwords would be hashed
    createdAt: new Date().toISOString(),
  };

  const users = getUsers();
  users.push(newUser);
  saveUsers(users);

  // Auto-login
  setSession(newUser);

  // Show success then redirect
  showNotification('notification', '🎉 Account created! Redirecting…', 'success');
  setTimeout(() => { window.location.href = 'dashboard.html'; }, 1200);
}

// ── Login Handler ────────────────────────────────────────
function handleLogin(e) {
  e.preventDefault();
  hideNotification('notification');

  const email    = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;

  const fields = [
    { inputId: 'email',    errorId: 'emailError' },
    { inputId: 'password', errorId: 'passwordError' },
  ];
  clearAllErrors(fields);

  let hasError = false;

  if (!email) {
    setFieldError('email', 'emailError', 'Email is required.');
    hasError = true;
  } else if (!validateEmail(email)) {
    setFieldError('email', 'emailError', 'Please enter a valid email.');
    hasError = true;
  }

  if (!password) {
    setFieldError('password', 'passwordError', 'Password is required.');
    hasError = true;
  }

  if (hasError) return;

  // Simulate brief delay for better UX
  const btn = document.getElementById('submitBtn');
  if (btn) {
    btn.disabled = true;
    btn.querySelector('.btn-text').textContent = 'Signing in…';
  }

  setTimeout(() => {
    const user = getUserByEmail(email);
    if (!user || user.password !== password) {
      showNotification('notification', 'Invalid email or password. Please try again.', 'error');
      if (btn) {
        btn.disabled = false;
        btn.querySelector('.btn-text').textContent = 'Sign In';
      }
      return;
    }

    setSession(user);
    window.location.href = 'dashboard.html';
  }, 600);
}

// ── Logout ───────────────────────────────────────────────
function handleLogout() {
  clearSession();
  window.location.href = 'login.html';
}