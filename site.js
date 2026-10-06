/* Shared behavior for every page: theme, spotlight, nav state, copy email, ⌘K menu. */
(function () {
  var root = document.documentElement;
  function $(id) { return document.getElementById(id); }
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var EMAIL = 'dschneiderman955@gmail.com';

  /* ---------- Theme (circular reveal via View Transitions) ---------- */
  function setTheme(next, x, y) {
    function apply() { root.dataset.theme = next; try { localStorage.setItem('theme', next); } catch (e) {} }
    if (!document.startViewTransition || reduce) return apply();
    root.classList.add('theme-vt');
    var r = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
    var t = document.startViewTransition(apply);
    t.ready.catch(function () {}); t.ready.then(function () {
      root.animate({ clipPath: ['circle(0 at ' + x + 'px ' + y + 'px)', 'circle(' + r + 'px at ' + x + 'px ' + y + 'px)'] },
        { duration: 550, easing: 'cubic-bezier(.2,.8,.2,1)', pseudoElement: '::view-transition-new(root)' });
    });
    t.finished.finally(function () { root.classList.remove("theme-vt"); }).catch(function () {});
  }
  function toggleTheme(e) {
    var b = $('theme').getBoundingClientRect();
    setTheme(root.dataset.theme === 'dark' ? 'light' : 'dark', e && e.clientX ? e.clientX : b.left + b.width / 2, e && e.clientY ? e.clientY : b.top + b.height / 2);
  }
  $('theme').addEventListener('click', toggleTheme);

  /* ---------- Current page in the nav ---------- */
  var here = location.pathname.replace(/index\.html$/, '').replace(/\/+$/, '/') || '/';
  document.querySelectorAll('.nav a.link').forEach(function (a) {
    var p = new URL(a.href).pathname.replace(/index\.html$/, '');
    if (p === here) a.setAttribute('aria-current', 'page');
  });

  /* ---------- Spotlight on glass cards ---------- */
  document.addEventListener('pointermove', function (e) {
    var el = e.target.closest && e.target.closest('.spot'); if (!el) return;
    var r = el.getBoundingClientRect();
    el.style.setProperty('--x', (e.clientX - r.left) + 'px'); el.style.setProperty('--y', (e.clientY - r.top) + 'px');
  }, { passive: true });

  /* ---------- Copy email ---------- */
  function copyEmail() {
    var ok = $('copied');
    (navigator.clipboard ? navigator.clipboard.writeText(EMAIL) : Promise.reject())
      .then(function () { if (ok) ok.textContent = '✓ Copied ' + EMAIL; })
      .catch(function () { if (ok) ok.textContent = EMAIL; });
  }
  document.querySelectorAll('[data-copy]').forEach(function (b) { b.addEventListener('click', copyEmail); });

  /* ---------- ⌘K command menu ---------- */
  var dlg = $('cmdk'); if (!dlg) return;
  var q = $('cmdk-q'), list = $('cmdk-list'), sel = 0, shown = [];
  function nav(path) { return function () { location.href = path; }; }
  var CMDS = [
    { g: 'Pages', t: 'Home', ic: '⌂', run: nav('/') },
    { g: 'Pages', t: 'Insights — UN Global Compact data platform', ic: '▦', run: nav('/insights/') },
    { g: 'Pages', t: 'Betawise — CGM coach', ic: '◐', run: nav('/betawise/') },
    { g: 'Pages', t: 'Jarvis — text-yourself notes app', ic: '✦', run: nav('/jarvis/') },
    { g: 'Pages', t: 'About & experience', ic: '◇', run: nav('/about/') },
    { g: 'Actions', t: 'Copy email address', ic: '⧉', run: function () { copyEmail(); var c = $('copied'); if (c) c.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' }); } },
    { g: 'Actions', t: 'Email Daniel', ic: '→', run: function () { location.href = 'mailto:' + EMAIL; } },
    { g: 'Actions', t: 'Download résumé (PDF)', ic: '↓', run: function () { var a = document.createElement('a'); a.href = '/Daniel_Schneiderman_Resume.pdf'; a.download = ''; a.click(); } },
    { g: 'Actions', t: 'Toggle light / dark', ic: '◑', run: function () { toggleTheme(); } },
    { g: 'Links', t: 'Open insights.unglobalcompact.org', ic: '↗', run: function () { open('https://insights.unglobalcompact.org', '_blank', 'noopener'); } },
    { g: 'Links', t: 'Open betawise.org', ic: '↗', run: function () { open('https://betawise.org', '_blank', 'noopener'); } },
    { g: 'Links', t: 'Open LinkedIn', ic: '↗', run: function () { open('https://www.linkedin.com/in/danielschneiderman955/', '_blank', 'noopener'); } }
  ];
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function render() {
    var term = q.value.trim().toLowerCase();
    shown = CMDS.filter(function (c) { return !term || (c.t + ' ' + c.g).toLowerCase().indexOf(term) >= 0; });
    if (sel >= shown.length) sel = Math.max(0, shown.length - 1);
    var html = '', last = '';
    shown.forEach(function (c, i) {
      if (c.g !== last) { html += '<li class="grp" role="presentation">' + c.g + '</li>'; last = c.g; }
      html += '<li role="option" id="opt-' + i + '" data-i="' + i + '" aria-selected="' + (i === sel) + '"><span class="ic" aria-hidden="true">' + c.ic + '</span>' + esc(c.t) + (i === sel ? '<span class="hint">↵</span>' : '') + '</li>';
    });
    list.innerHTML = html || '<li class="empty" role="presentation">No results for “' + esc(q.value) + '”</li>';
    q.setAttribute('aria-activedescendant', shown.length ? 'opt-' + sel : '');
    var cur = $('opt-' + sel); if (cur) cur.scrollIntoView({ block: 'nearest' });
  }
  function openCmdk() { if (dlg.open) return; q.value = ''; sel = 0; render(); dlg.showModal(); q.focus(); }
  function runSel(i) { var c = shown[i]; if (!c) return; dlg.close(); setTimeout(c.run, 10); }
  q.addEventListener('input', function () { sel = 0; render(); });
  q.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowDown') { e.preventDefault(); sel = (sel + 1) % Math.max(1, shown.length); render(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); sel = (sel - 1 + shown.length) % Math.max(1, shown.length); render(); }
    else if (e.key === 'Enter') { e.preventDefault(); runSel(sel); }
  });
  list.addEventListener('click', function (e) { var li = e.target.closest('[data-i]'); if (li) runSel(+li.dataset.i); });
  list.addEventListener('pointermove', function (e) { var li = e.target.closest('[data-i]'); if (li && +li.dataset.i !== sel) { sel = +li.dataset.i; render(); } });
  dlg.addEventListener('click', function (e) { if (e.target === dlg) dlg.close(); });
  document.querySelectorAll('[data-cmdk]').forEach(function (b) { b.addEventListener('click', openCmdk); });
  document.addEventListener('keydown', function (e) {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); dlg.open ? dlg.close() : openCmdk(); }
    else if (e.key === '/' && !/input|textarea|select/i.test(document.activeElement.tagName)) { e.preventDefault(); openCmdk(); }
  });
})();
