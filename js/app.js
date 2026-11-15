// Stash v0.1.0 — копилка: одна цель, кнопки «Внести» / «Снять».
(function () {
  'use strict';

  var VERSION = '0.1.0';
  var KEY = 'stash.data';
  var CIRC = 603.19; // длина окружности кольца (2·π·96)

  // ---------- Хранилище (суммы в копейках, чтобы не копились ошибки округления) ----------
  var memory = null; // запасной вариант, если localStorage недоступен
  function load() {
    try {
      var raw = localStorage.getItem(KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) {}
    return memory;
  }
  function save(data) {
    memory = data;
    try { localStorage.setItem(KEY, JSON.stringify(data)); } catch (e) {}
  }

  var data = load() || { goal: null };

  // ---------- Помощники ----------
  function $(id) { return document.getElementById(id); }

  function fmt(cents) {
    var rub = cents / 100;
    var whole = cents % 100 === 0;
    return rub.toLocaleString('ru-RU', {
      minimumFractionDigits: whole ? 0 : 2,
      maximumFractionDigits: 2
    }) + ' ₽';
  }

  // "1 500,50" / "1500.5" -> 150050 копеек; null, если не число
  function parseAmount(str) {
    var s = String(str).replace(/[\s ]/g, '').replace(',', '.');
    if (!/^\d+(\.\d{1,2})?$/.test(s)) return null;
    var cents = Math.round(parseFloat(s) * 100);
    return cents > 0 && cents <= 100000000000 ? cents : null;
  }

  // ---------- Отрисовка ----------
  var shown = 0; // сколько показано сейчас на экране (для плавного счёта)
  var anim = null;

  function countTo(cents) {
    cancelAnimationFrame(anim);
    var from = shown, to = cents, start = null, dur = 1100;
    if (from === to) { $('saved').textContent = fmt(to); return; }
    function step(t) {
      if (start === null) start = t;
      var k = Math.min(1, (t - start) / dur);
      var e = 1 - Math.pow(1 - k, 4);
      shown = Math.round(from + (to - from) * e);
      $('saved').textContent = fmt(shown);
      if (k < 1) anim = requestAnimationFrame(step);
      else shown = to;
    }
    anim = requestAnimationFrame(step);
  }

  function render() {
    var g = data.goal;
    $('view-empty').hidden = !!g;
    $('view-goal').hidden = !g;
    if (!g) return;

    var ratio = g.target > 0 ? Math.min(1, g.saved / g.target) : 0;
    var pct = Math.floor(ratio * 100);

    $('goal-name').textContent = g.name;
    $('of').textContent = 'из ' + fmt(g.target);
    $('percent').textContent = pct + '%';
    $('done-tag').hidden = g.saved < g.target;
    $('ring-fg').style.strokeDashoffset = String(CIRC * (1 - ratio));
    countTo(g.saved);
  }

  // ---------- Окно ----------
  var mode = null; // 'create' | 'add' | 'take'

  function showError(text) {
    var el = $('error');
    el.textContent = text;
    el.hidden = false;
    // перезапустить анимацию
    el.style.animation = 'none'; void el.offsetWidth; el.style.animation = '';
  }
  function clearError() { $('error').hidden = true; }

  function openSheet(m) {
    mode = m;
    var o = $('overlay');
    o.classList.remove('closing');
    clearError();
    $('in-name').value = '';
    $('in-amount').value = '';

    var isCreate = m === 'create';
    $('field-name').hidden = !isCreate;
    $('sheet-title').textContent = isCreate ? 'Новая цель' : (m === 'add' ? 'Внести' : 'Снять');
    $('amount-label').textContent = isCreate ? 'Сколько нужно накопить, ₽' : 'Сумма, ₽';
    $('sheet-ok').textContent = isCreate ? 'Создать' : (m === 'add' ? 'Внести' : 'Снять');

    o.hidden = false;
    setTimeout(function () { (isCreate ? $('in-name') : $('in-amount')).focus(); }, 350);
  }

  var closeTimer = null;
  function closeSheet() {
    var o = $('overlay');
    if (o.hidden) return;
    o.classList.add('closing');
    clearTimeout(closeTimer);
    closeTimer = setTimeout(function () {
      o.hidden = true;
      o.classList.remove('closing');
      mode = null;
    }, 350);
    if (document.activeElement) document.activeElement.blur();
  }

  function submit(e) {
    e.preventDefault();
    clearError();
    var cents = parseAmount($('in-amount').value);

    if (mode === 'create') {
      var name = $('in-name').value.trim();
      if (!name) return showError('Введите название цели');
      if (cents === null) return showError('Введите сумму цифрами, например 50000');
      data.goal = { name: name, target: cents, saved: 0, created: Date.now() };
      shown = 0;
    } else {
      if (cents === null) return showError('Введите сумму цифрами, например 500');
      var g = data.goal;
      if (mode === 'add') {
        g.saved += cents;
      } else {
        if (cents > g.saved) return showError('Нельзя снять больше, чем накоплено (' + fmt(g.saved) + ')');
        g.saved -= cents;
      }
    }
    save(data);
    closeSheet();
    render();
  }

  // ---------- Запуск ----------
  $('version').textContent = 'v' + VERSION;
  $('btn-create').addEventListener('click', function () { openSheet('create'); });
  $('btn-add').addEventListener('click', function () { openSheet('add'); });
  $('btn-take').addEventListener('click', function () { openSheet('take'); });
  $('sheet-cancel').addEventListener('click', closeSheet);
  $('sheet').addEventListener('submit', submit);
  $('overlay').addEventListener('click', function (e) { if (e.target === this) closeSheet(); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeSheet(); });

  // Тема: как в системе
  var mq = window.matchMedia ? window.matchMedia('(prefers-color-scheme: light)') : null;
  function applyTheme() {
    var light = mq && mq.matches;
    document.documentElement.setAttribute('data-theme', light ? 'light' : 'dark');
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', light ? '#f1f2f5' : '#121316');
  }
  applyTheme();
  if (mq && mq.addEventListener) mq.addEventListener('change', applyTheme);

  render();

  // Service worker (офлайн-режим). Работает по https и на localhost.
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('sw.js').catch(function () {});
    });
  }
})();
