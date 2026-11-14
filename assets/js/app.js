/* ============================================================
   SELA — navigasi utama
   ============================================================ */

(() => {
  'use strict';

  const TABS = ['kapsul', 'kuis', 'roulette'];
  const DEFAULT_TAB = 'kapsul';

  const tabbar = document.querySelector('.tabbar');
  const tabs = Array.from(document.querySelectorAll('.tab'));
  const panels = Array.from(document.querySelectorAll('.panel'));

  if (!tabbar || tabs.length === 0 || panels.length === 0) return;

  function normalize(hash) {
    const name = String(hash || '').replace(/^#/, '').toLowerCase();
    return TABS.includes(name) ? name : DEFAULT_TAB;
  }

  function activate(name, options = {}) {
    const { focus = false, updateHash = true } = options;
    const target = normalize(name);

    tabs.forEach((tab) => {
      const isActive = tab.dataset.panel === target;
      tab.classList.toggle('is-active', isActive);
      tab.setAttribute('aria-selected', String(isActive));
      tab.tabIndex = isActive ? 0 : -1;
      if (isActive && focus) tab.focus();
    });

    panels.forEach((panel) => {
      panel.classList.toggle('is-active', panel.id === `panel-${target}`);
    });

    if (updateHash) {
      const next = `#${target}`;
      if (window.history && typeof window.history.replaceState === 'function') {
        window.history.replaceState(null, '', next);
      } else {
        window.location.hash = next;
      }
    }
  }

  /* Klik tab */
  tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      activate(tab.dataset.panel, { focus: false });
    });
  });

  /* Papan ketik: panah kiri/kanan, Home, End */
  tabbar.addEventListener('keydown', (event) => {
    const keys = ['ArrowLeft', 'ArrowRight', 'Home', 'End'];
    if (!keys.includes(event.key)) return;

    event.preventDefault();

    const currentIndex = tabs.findIndex((tab) => tab.getAttribute('aria-selected') === 'true');
    let nextIndex = currentIndex < 0 ? 0 : currentIndex;

    if (event.key === 'ArrowRight') nextIndex = (nextIndex + 1) % tabs.length;
    if (event.key === 'ArrowLeft') nextIndex = (nextIndex - 1 + tabs.length) % tabs.length;
    if (event.key === 'Home') nextIndex = 0;
    if (event.key === 'End') nextIndex = tabs.length - 1;

    activate(tabs[nextIndex].dataset.panel, { focus: true });
  });

  /* Perubahan hash (misalnya tombol back) */
  window.addEventListener('hashchange', () => {
    activate(window.location.hash, { focus: false, updateHash: false });
  });

  /* Tab awal mengikuti hash kalau ada */
  activate(window.location.hash, { focus: false, updateHash: false });

  /* Service worker — hanya saat dibuka lewat http/https */
  if ('serviceWorker' in navigator && /^https?:$/.test(window.location.protocol)) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('sw.js').catch(() => {
        /* offline mode tidak tersedia — aplikasi tetap jalan */
      });
    });
  }
})();
