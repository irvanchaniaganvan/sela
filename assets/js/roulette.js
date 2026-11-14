/* ============================================================
   SELA — Roulette ide
   Sementara tersimpan di perangkat. Nanti disinkronkan berdua.
   ============================================================ */

(() => {
  'use strict';

  const STORAGE_KEY = 'sela:roulette-options:v1';
  const MAX_OPTIONS = 100;

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
  const resetBtn = document.getElementById('resetOptions');

  if (!display || !spinBtn || !list || !form || !input) return;

  let options = loadOptions();
  let isSpinning = false;
  let lastResult = '';
  let resultTimer = null;

  /* ---------- penyimpanan ---------- */

  function loadOptions() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return DEFAULT_OPTIONS.slice();

      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return DEFAULT_OPTIONS.slice();

      return parsed
        .filter((item) => typeof item === 'string')
        .map((item) => item.trim())
        .filter(Boolean)
        .slice(0, MAX_OPTIONS);
    } catch (error) {
      return DEFAULT_OPTIONS.slice();
    }
  }

  function saveOptions() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(options));
    } catch (error) {
      /* penyimpanan penuh atau diblokir — daftar tetap jalan di sesi ini */
    }
  }

  /* ---------- tampilan ---------- */

  function renderOptions() {
    list.textContent = '';

    options.forEach((text, index) => {
      const item = document.createElement('li');
      item.className = 'option-item';

      const label = document.createElement('span');
      label.textContent = text;

      const remove = document.createElement('button');
      remove.type = 'button';
      remove.className = 'option-remove';
      remove.dataset.index = String(index);
      remove.setAttribute('aria-label', `Hapus ide "${text}"`);
      remove.textContent = '\u00D7';

      item.append(label, remove);
      list.append(item);
    });

    if (count) count.textContent = String(options.length);

    if (options.length === 0) {
      const hint = document.createElement('li');
      hint.className = 'stage-note';
      hint.textContent = 'Belum ada ide. Tambahkan satu di bawah.';
      list.append(hint);
    }

    spinBtn.disabled = options.length === 0 || isSpinning;

    if (options.length === 0) {
      setDisplay('Tambahkan ide dulu');
    } else if (!isSpinning && !lastResult) {
      setDisplay('Siap diputar', true);
    }
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

    display.classList.remove('is-spinning');
    display.classList.remove('is-result');
    setDisplay(result);
    void display.offsetWidth;
    display.classList.add('is-result');

    isSpinning = false;
    spinBtn.disabled = options.length === 0;
    spinBtn.textContent = 'Putar lagi';

    if (resultTimer) window.clearTimeout(resultTimer);
    resultTimer = window.setTimeout(() => {
      display.classList.remove('is-result');
    }, 700);
  }

  function spin() {
    if (isSpinning || options.length === 0) return;

    isSpinning = true;
    spinBtn.disabled = true;
    spinBtn.textContent = 'Memutar…';

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

  /* ---------- tambah & hapus ---------- */

  form.addEventListener('submit', (event) => {
    event.preventDefault();

    const value = input.value.trim();

    if (!value) {
      input.focus();
      return;
    }

    const duplicate = options.some(
      (item) => item.toLowerCase() === value.toLowerCase()
    );

    if (duplicate) {
      input.value = '';
      input.placeholder = 'Ide itu sudah ada';
      input.focus();
      window.setTimeout(() => {
        input.placeholder = 'Tambah ide baru…';
      }, 1800);
      return;
    }

    if (options.length >= MAX_OPTIONS) {
      input.value = '';
      input.placeholder = 'Daftar sudah penuh';
      window.setTimeout(() => {
        input.placeholder = 'Tambah ide baru…';
      }, 1800);
      return;
    }

    options.push(value);
    saveOptions();
    input.value = '';
    renderOptions();
    input.focus();
  });

  list.addEventListener('click', (event) => {
    if (isSpinning) return;

    const button = event.target.closest('.option-remove');
    if (!button) return;

    const index = Number(button.dataset.index);
    if (!Number.isInteger(index) || index < 0 || index >= options.length) return;

    options.splice(index, 1);
    saveOptions();
    if (options.length === 0) lastResult = '';
    renderOptions();
  });

  resetBtn?.addEventListener('click', () => {
    const confirmed = window.confirm('Kembalikan daftar ide ke bawaan awal?');
    if (!confirmed) return;

    options = DEFAULT_OPTIONS.slice();
    lastResult = '';
    saveOptions();
    renderOptions();
    setDisplay('Siap diputar', true);
  });

  spinBtn.addEventListener('click', spin);

  /* ---------- mulai ---------- */

  renderOptions();
})();
