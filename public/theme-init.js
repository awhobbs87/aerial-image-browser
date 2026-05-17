/** Sync theme on every navigation (including Astro view transitions). */
(function themeInit() {
  const KEY = 'theme-preference';

  function readPref() {
    const stored = localStorage.getItem(KEY);
    return stored === 'light' || stored === 'dark' || stored === 'auto' ? stored : 'auto';
  }

  function resolve(pref) {
    return pref === 'dark' ||
      (pref === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches)
      ? 'dark'
      : 'light';
  }

  function applyTo(root, pref) {
    const preference = pref ?? readPref();
    const resolved = resolve(preference);
    root.setAttribute('data-theme', resolved);
    root.setAttribute('data-theme-preference', preference);
    root.classList.toggle('dark', resolved === 'dark');
  }

  function apply() {
    applyTo(document.documentElement);
  }

  apply();
  document.addEventListener('astro:before-swap', (event) => {
    const newDoc = event.detail?.newDocument;
    if (newDoc) applyTo(newDoc.documentElement);
  });
  document.addEventListener('astro:page-load', apply);
  document.addEventListener('astro:after-swap', apply);
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if (readPref() === 'auto') apply();
  });
})();
