/* ============================================================
   SELA — Roulette ide
   Daftar ide tersimpan di Firestore dan tersinkron berdua.
   ============================================================ */

import { db } from './firebase.js';
import { onUser } from './auth.js';
import {
  arrayRemove,
  arrayUnion,
  doc,
  onSnapshot,
  runTransaction,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'https://www.gstatic.com/firebasejs/13.3.0/firebase-firestore.js';

const MAX_OPTIONS = 100;
const ROULETTE_REF = doc(db, 'roulette', 'main');

const DEFAULT_OPTIONS = [
  'Nonton bareng lewat video call',
  'Masak menu yang sama, lalu makan bareng',
  'Deep talk 30 menit tanpa HP',
  'Main game online berdua',
  'Jalan sore sambil video call',
  'Baca buku bareng dalam diam',
  'Kirim voice note panjang',
  'Bikin playlist untuk satu sama lain',
  'Telepon sampai ketiduran',
  'Tukar foto langit hari ini',
  'Rencanakan pertemuan berikutnya',
  'Karaoke lewat video call',
];

const display = document.getElementById('rouletteDisplay');
const spinBtn = document.getElementById('spinBtn');
const list = document.getElementById('optionsList');
const count = document.getElementById('optionsCount');
const form = document.getElementById('addForm');
const input = document.getElementById('newOption');
const addBtn = form ? form.querySelector('button[type="submit"]') : null;
const resetBtn = document.getElementById('resetOptions');
const statusEl = document.getElementById('rouletteStatus');

let options = [];
let currentUser = null;
let unsubscribe = null;
let isReady = false;
let isLoading = false;
let isSeeding = false;
let isSpinning = false;
let lastResult = '';
let resultTimer = null;
let storeError = '';

function friendlyStoreError(error) {
  const code = (error && error.code) || '';
  console.error('Sela Firestore:', error);

  if (code.includes('permission-denied')) {
    return 'Belum bisa membuka data. Aturan Firestore mungkin belum dipasang.';
  }
  if (code.includes('unavailable') || code.includes('network')) {
    return 'Koneksi ke data online bermasalah. Cek internet.';
  }
  if (code.includes('failed-precondition')) {
    return 'Database belum siap. Coba lagi sebentar.';
  }

  return 'Data online belum bisa diakses. Coba muat ulang.';
}

function setStatus(message, isError = false) {
  if (!statusEl) return;
  statusEl.textContent = message;
  statusEl.classList.toggle('is-error', isError);
}

function setDisplay(text, idle = false) {
  display.textContent = '';

  if (idle) {
    const span = document.createElement('span');
    span.className = 'wheel-idle';
    span.textContent = text;
    display.append(span);
  } else {
    display.textContent = text;
  }
}

function addListNote(text, isError = false) {
  const note = document.createElement('li');
  note.className = 'stage-note list-note' + (isError ? ' is-error' : '');
  note.textContent = text;
  list.append(note);
}

function canEdit() {
  return Boolean(currentUser) && isReady && !storeError && !isSpinning;
}

function syncControls() {
  if (!spinBtn || !input) return;

  const editable = canEdit();

  spinBtn.disabled = !isReady || options.length === 0 || isSpinning;
  input.disabled = !editable;
  if (addBtn) addBtn.disabled = !editable;
  if (resetBtn) resetBtn.disabled = !editable;
}

function renderOptions() {
  if (!list || !count || !spinBtn || !input) return;

  list.textContent = '';

  if (isLoading) {
    addListNote('Memuat ide…');
  } else if (storeError) {
    addListNote(storeError, true);
  } else if (options.length === 0) {
    addListNote('Belum ada ide. Tambahkan satu di bawah.');
  } else {
    options.forEach((text) => {
      const item = document.createElement('li');
      item.className = 'option-item';

      const label = document.createElement('span');
      label.textContent = text;

      const remove = document.createElement('button');
      remove.type = 'button';
      remove.className = 'option-remove';
      remove.dataset.text = text;
      remove.setAttribute('aria-label', `Hapus ide "${text}"`);
      remove.textContent = '\u00D7';

      item.append(label, remove);
      list.append(item);
    });
  }

  count.textContent = isLoading || storeError ? '—' : String(options.length);
  list.setAttribute('aria-busy', String(isLoading));

  syncControls();

  if (isSpinning) return;

  if (lastResult && !options.includes(lastResult)) {
    lastResult = '';
  }

  if (isLoading) {
    setDisplay('Memuat ide…', true);
    setStatus('Menyambungkan ke ruang kalian…');
  } else if (storeError) {
    setDisplay('Belum tersambung', true);
    setStatus(storeError, true);
  } else if (options.length === 0) {
    setDisplay('Tambahkan ide dulu');
    setStatus('Daftar ini tersinkron berdua.');
  } else if (!lastResult) {
    setDisplay('Siap diputar', true);
    setStatus('Daftar ini tersinkron berdua.');
  } else {
    setStatus('Daftar ini tersinkron berdua.');
  }
}

function stopSync({ silent = false } = {}) {
  if (unsubscribe) {
    unsubscribe();
    unsubscribe = null;
  }

  if (resultTimer) {
    window.clearTimeout(resultTimer);
    resultTimer = null;
  }

  currentUser = null;
  options = [];
  isLoading = false;
  isReady = false;
  isSeeding = false;
  isSpinning = false;
  storeError = '';
  lastResult = '';

  display.classList.remove('is-spinning', 'is-result');
  if (spinBtn) spinBtn.textContent = 'Putar';

  if (!silent) {
    renderOptions();
    setDisplay('Siap diputar', true);
  }
}

function ensureSeeded(user) {
  if (isSeeding) return;
  isSeeding = true;

  runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(ROULETTE_REF);

    if (!snapshot.exists()) {
      transaction.set(ROULETTE_REF, {
        options: DEFAULT_OPTIONS.slice(),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        updatedBy: user.uid,
      });
    }
  })
    .catch((error) => {
      if (currentUser && currentUser.uid === user.uid) {
        isLoading = false;
        storeError = friendlyStoreError(error);
        renderOptions();
      }
    })
    .finally(() => {
      isSeeding = false;
    });
}

function startSync(user) {
  if (unsubscribe && currentUser && currentUser.uid === user.uid) return;

  stopSync({ silent: true });

  currentUser = user;
  isLoading = true;
  isReady = false;
  storeError = '';
  options = [];

  renderOptions();
  setDisplay('Memuat ide…', true);

  unsubscribe = onSnapshot(
    ROULETTE_REF,
    (snapshot) => {
      if (!snapshot.exists()) {
        options = [];
        isLoading = true;
        isReady = false;
        renderOptions();
        ensureSeeded(user);
        return;
      }

      const data = snapshot.data() || {};
      options = Array.isArray(data.options)
        ? data.options
            .filter((item) => typeof item === 'string')
            .map((item) => item.trim())
            .filter(Boolean)
            .slice(0, MAX_OPTIONS)
        : [];

      isLoading = false;
      isReady = true;
      storeError = '';
      renderOptions();
    },
    (error) => {
      isLoading = false;
      isReady = false;
      storeError = friendlyStoreError(error);
      renderOptions();
    }
  );
}

/* ---------- putar ---------- */

function pickIndex() {
  if (options.length <= 1) return 0;

  let index = Math.floor(Math.random() * options.length);
  let guard = 0;

  while (options[index] === lastResult && guard < 12) {
    index = Math.floor(Math.random() * options.length);
    guard += 1;
  }

  return index;
}

function finishSpin(result) {
  lastResult = result;

  display.classList.remove('is-spinning', 'is-result');
  setDisplay(result);
  void display.offsetWidth;
  display.classList.add('is-result');

  isSpinning = false;
  spinBtn.textContent = 'Putar lagi';
  syncControls();

  if (resultTimer) window.clearTimeout(resultTimer);
  resultTimer = window.setTimeout(() => {
    display.classList.remove('is-result');
    resultTimer = null;
  }, 700);
}

function spin() {
  if (isSpinning || !isReady || options.length === 0) return;

  isSpinning = true;
  spinBtn.disabled = true;
  spinBtn.textContent = 'Memutar…';
  syncControls();

  display.classList.remove('is-result');
  display.classList.add('is-spinning');

  const finalIndex = pickIndex();
  const result = options[finalIndex];
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (reduceMotion) {
    finishSpin(result);
    return;
  }

  const duration = 1700;
  const start = performance.now();
  let lastSwap = 0;

  function frame(now) {
    if (!isSpinning) return;

    const elapsed = now - start;
    const progress = Math.min(elapsed / duration, 1);
    const interval = 55 + progress * 170;

    if (elapsed - lastSwap >= interval) {
      lastSwap = elapsed;
      const random = options[Math.floor(Math.random() * options.length)];
      setDisplay(random);
    }

    if (progress < 1) {
      window.requestAnimationFrame(frame);
    } else {
      finishSpin(result);
    }
  }

  window.requestAnimationFrame(frame);
}

/* ---------- tambah, hapus, reset ---------- */

function flashPlaceholder(text) {
  input.value = '';
  input.placeholder = text;
  input.focus();
  window.setTimeout(() => {
    input.placeholder = 'Tambah ide baru…';
  }, 1800);
}

function flashStatus(text) {
  setStatus(text, true);
  window.setTimeout(() => {
    if (!storeError) setStatus('Daftar ini tersinkron berdua.');
  }, 2400);
}

function init() {
  if (!display || !spinBtn || !list || !count || !form || !input) return;

  renderOptions();

  onUser((user) => {
    if (user) startSync(user);
    else stopSync();
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!canEdit()) return;

    const user = currentUser;
    if (!user) return;

    const value = input.value.trim();

    if (!value) {
      input.focus();
      return;
    }

    if (options.some((item) => item.toLowerCase() === value.toLowerCase())) {
      flashPlaceholder('Ide itu sudah ada');
      return;
    }

    if (options.length >= MAX_OPTIONS) {
      flashPlaceholder('Daftar sudah penuh');
      return;
    }

    input.disabled = true;
    if (addBtn) addBtn.disabled = true;

    try {
      await setDoc(
        ROULETTE_REF,
        {
          options: arrayUnion(value),
          updatedAt: serverTimestamp(),
          updatedBy: user.uid,
        },
        { merge: true }
      );

      input.value = '';
    } catch (error) {
      flashStatus(friendlyStoreError(error));
    } finally {
      if (currentUser) {
        input.disabled = false;
        if (addBtn) addBtn.disabled = false;
        input.focus();
      }
    }
  });

  list.addEventListener('click', async (event) => {
    if (isSpinning || !canEdit()) return;

    const button = event.target.closest('.option-remove');
    if (!button) return;

    const user = currentUser;
    const text = button.dataset.text;
    if (!user || !text) return;

    button.disabled = true;

    try {
      await updateDoc(ROULETTE_REF, {
        options: arrayRemove(text),
        updatedAt: serverTimestamp(),
        updatedBy: user.uid,
      });
    } catch (error) {
      button.disabled = false;
      flashStatus(friendlyStoreError(error));
    }
  });

  resetBtn?.addEventListener('click', async () => {
    if (!canEdit()) return;

    const user = currentUser;
    if (!user) return;

    const confirmed = window.confirm('Kembalikan daftar ide ke bawaan awal?');
    if (!confirmed) return;

    resetBtn.disabled = true;

    try {
      await updateDoc(ROULETTE_REF, {
        options: DEFAULT_OPTIONS.slice(),
        updatedAt: serverTimestamp(),
        updatedBy: user.uid,
      });

      lastResult = '';
      setDisplay('Siap diputar', true);
    } catch (error) {
      flashStatus(friendlyStoreError(error));
    } finally {
      if (currentUser) resetBtn.disabled = false;
    }
  });

  spinBtn.addEventListener('click', spin);
}

init();
