/* ============================================================
   SELA — login & sesi
   ============================================================ */

import { auth } from './firebase.js';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
} from 'https://www.gstatic.com/firebasejs/13.3.0/firebase-auth.js';

const bootScreen = document.getElementById('bootScreen');
const authScreen = document.getElementById('authScreen');
const appScreen = document.getElementById('appScreen');
const loginForm = document.getElementById('loginForm');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const loginBtn = document.getElementById('loginBtn');
const authError = document.getElementById('authError');
const logoutBtn = document.getElementById('logoutBtn');

let initialized = false;
let currentUser = null;
let isBusy = false;
let hasSignedIn = false;
const userListeners = new Set();

function notifyUser() {
  userListeners.forEach((listener) => {
    try {
      listener(currentUser);
    } catch (error) {
      console.error('Sela auth listener:', error);
    }
  });
}

/**
 * Ikut perubahan status login. Callback langsung dipanggil kalau
 * statusnya sudah diketahui.
 */
export function onUser(callback) {
  userListeners.add(callback);

  if (initialized) {
    queueMicrotask(() => {
      if (userListeners.has(callback)) callback(currentUser);
    });
  }

  return () => userListeners.delete(callback);
}

function showApp(user) {
  if (bootScreen) bootScreen.hidden = true;
  if (authScreen) authScreen.hidden = true;
  if (appScreen) appScreen.hidden = false;

  document.body.classList.add('is-authed');

  if (logoutBtn) {
    logoutBtn.disabled = false;
    logoutBtn.setAttribute(
      'aria-label',
      user && user.email ? `Keluar dari akun ${user.email}` : 'Keluar dari akun'
    );
  }
}

function showLogin({ reset = false } = {}) {
  if (bootScreen) bootScreen.hidden = true;
  if (appScreen) appScreen.hidden = true;
  if (authScreen) authScreen.hidden = false;

  document.body.classList.remove('is-authed');

  if (reset && loginForm) {
    loginForm.reset();
    hideError();
  }

  setBusy(false);
}

function showError(message) {
  if (!authError) return;
  authError.textContent = message;
  authError.hidden = false;
}

function hideError() {
  if (!authError) return;
  authError.textContent = '';
  authError.hidden = true;
}

function setBusy(busy) {
  isBusy = busy;

  if (loginBtn) {
    loginBtn.disabled = busy;
    loginBtn.textContent = busy ? 'Memeriksa…' : 'Masuk';
  }

  if (loginForm) {
    loginForm.setAttribute('aria-busy', String(busy));
  }
}

function messageFor(error) {
  const code = (error && error.code) || '';

  if (code === 'auth/invalid-email') return 'Format email belum benar.';
  if (code === 'auth/user-disabled') return 'Akun ini sedang dinonaktifkan.';
  if (code === 'auth/too-many-requests') {
    return 'Terlalu banyak percobaan. Coba lagi beberapa saat.';
  }
  if (code === 'auth/network-request-failed') {
    return 'Koneksi bermasalah. Cek internet lalu coba lagi.';
  }

  if (
    code.includes('invalid-credential') ||
    code.includes('wrong-password') ||
    code.includes('user-not-found')
  ) {
    return 'Email atau password salah.';
  }

  return 'Belum bisa masuk. Coba lagi ya.';
}

if (loginForm && emailInput && passwordInput) {
  loginForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (isBusy) return;

    const email = emailInput.value.trim();
    const password = passwordInput.value;

    hideError();

    if (!email || !password) {
      showError('Isi email dan password dulu ya.');
      (email ? passwordInput : emailInput).focus();
      return;
    }

    setBusy(true);

    try {
      await signInWithEmailAndPassword(auth, email, password);
      passwordInput.value = '';
    } catch (error) {
      showError(messageFor(error));
      passwordInput.select();
    } finally {
      setBusy(false);
    }
  });
}

if (logoutBtn) {
  logoutBtn.addEventListener('click', async () => {
    logoutBtn.disabled = true;

    try {
      await signOut(auth);
    } catch (error) {
      console.error('Sela logout:', error);
      logoutBtn.disabled = false;
    }
  });
}

onAuthStateChanged(
  auth,
  (user) => {
    const previous = currentUser;
    currentUser = user || null;
    initialized = true;

    if (currentUser) {
      hasSignedIn = true;
      showApp(currentUser);
    } else {
      showLogin({ reset: hasSignedIn && Boolean(previous) });
      hasSignedIn = false;
    }

    notifyUser();
  },
  (error) => {
    console.error('Sela auth state:', error);
    initialized = true;
    showLogin();
    showError('Tidak bisa memeriksa sesi. Cek internet lalu muat ulang.');
    notifyUser();
  }
);
