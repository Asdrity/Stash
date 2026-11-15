// Stash v0.2.0 — копилка: список целей, у каждой кнопки «Внести» / «Снять», удаление цели.
(function () {
  'use strict';

  var VERSION = '0.2.0';
  var KEY = 'stash.data';
  var CIRC = 603.19; // длина окружности кольца (2·π·96)

  // ---------- Хранилище (суммы в копейках, чтобы не копились ошибки округления) ----------
  // Формат: { goals: [ { id, name, target, saved, created } ] }
  var memory = null; // запасной вариант, если localStorage недоступен

  function newId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  function load() {
    var raw = null;
    try { raw = JSON.parse(localStorage.getItem(KEY)); } catch (e) {}
    if (!raw) raw = memory;
    if (!raw) return { goals: [] };
    if (Array.isArray(raw.goals)) return raw;
    // v0.1.0 хранил одну цель в поле goal — переносим в список
    if (raw.goal) {
      var g = raw.goal;
      return { goals: [{ id: newId(), name: g.name, target: g.target, saved: g.saved, created: g.created || Date.now() }] };
    }
    return { goals: [] };
  }

  function save() {
    memory = data;
    try { localStorage.setItem(KEY, JSON.stringify(data)); } catch (e) {}
  }

  var data = load();
  save();

  var currentId = null; // открытая цель (null — показан список)

  // ---------- Помощники ----------
  function $(id) { return document.getElementById(id); }

  function num(cents) {
    var whole = cents % 100 === 0;
    return (cents / 100).toLocaleString('ru-RU', {
      minimumFractionDigits: whole ? 0 : 2,
      maximumFractionDigits: 2
    });
  }
  function fmt(cents) { return num(cents) + ' ₽'; }

  // "1 500,50" / "1500.5" -> 150050 копеек; null, если не число
  function parseAmount(str) {
    var s = String(str).replace(/[\s ]/g, '').replace(',', '.');
    if (!/^\d+(\.\d{1,2})?$/.test(s)) return null;
    var cents = Math.round(parseFloat(s) * 100);
    return cents > 0 && cents <= 100000000000 ? cents : null;
  }

  function findGoal(id) {
    for (var i = 0; i < data.goals.length; i++) if (data.goals[i].id === id) return data.goals[i];
    return null;
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

  function renderList() {
    var list = $('view-list');
    list.innerHTML = '';
    data.goals.forEach(function (g, i) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'item';
      b.style.setProperty('--d', Math.min(i, 8) * 0.07 + 's');

      var name = document.createElement('span');
      name.className = 'item-name';
      name.textContent = g.name;

      var sum = document.createElement('span');
      sum.className = 'item-sum';
      sum.textContent = num(g.saved) + ' / ' + fmt(g.target);

      b.appendChild(name);
      b.appendChild(sum);
      b.addEventListener('click', function () { openGoal(g.id); });
      list.appendChild(b);
    });
  }

  function renderGoal(g) {
    var ratio = g.target > 0 ? Math.min(1, g.saved / g.target) : 0;
    $('goal-name').textContent = g.name;
    $('of').textContent = 'из ' + fmt(g.target);
    $('percent').textContent = Math.floor(ratio * 100) + '%';
    $('done-tag').hidden = g.saved < g.target;
    $('ring-fg').style.strokeDashoffset = String(CIRC * (1 - ratio));
    countTo(g.saved);
  }

  function render() {
    var g = currentId ? findGoal(currentId) : null;
    if (currentId && !g) currentId = null;

    var hasGoals = data.goals.length > 0;
    $('view-goal').hidden = !g;
    $('view-empty').hidden = !!g || hasGoals;
    $('view-list').hidden = !!g || !hasGoals;

    if (g) renderGoal(g);
    else if (hasGoals) renderList();
  }

  function openGoal(id) {
    currentId = id;
    shown = 0;
    // кольцо стартует с нуля и плавно заполняется
    var ring = $('ring-fg');
    ring.style.transition = 'none';
    ring.style.strokeDashoffset = String(CIRC);
    void ring.getBoundingClientRect();
    ring.style.transition = '';
    render();
  }

  function backToList() {
    currentId = null;
    render();
  }

  // ---------- Окно ----------
  var mode = null; // 'create' | 'add' | 'take' | 'delete'

  function showError(text) {
    var el = $('error');
    el.textContent = text;
    el.hidden = false;
    el.style.animation = 'none'; void el.offsetWidth; el.style.animation = '';
  }
  function clearError() { $('error').hidden = true; }

  function openSheet(m) {
    mode = m;
    clearTimeout(closeTimer);
    var o = $('overlay');
    o.classList.remove('closing');
    clearError();
    $('in-name').value = '';
    $('in-amount').value = '';

    var isCreate = m === 'create';
    var isDelete = m === 'delete';
    $('field-name').hidden = !isCreate;
    $('field-amount').hidden = isDelete;
    $('sheet-text').hidden = !isDelete;

    var ok = $('sheet-ok');
    ok.classList.toggle('btn-danger', isDelete);
    ok.classList.toggle('btn-accent', !isDelete);

    if (isDelete) {
      var g = findGoal(currentId);
      $('sheet-title').textContent = 'Удалить цель?';
      $('sheet-text').textContent = '«' + (g ? g.name : '') + '» и накопленная сумма будут удалены без возможности восстановления.';
      ok.textContent = 'Удалить';
    } else {
      $('sheet-title').textContent = isCreate ? 'Новая цель' : (m === 'add' ? 'Внести' : 'Снять');
      $('amount-label').textContent = isCreate ? 'Сколько нужно накопить, ₽' : 'Сумма, ₽';
      ok.textContent = isCreate ? 'Создать' : (m === 'add' ? 'Внести' : 'Снять');
    }

    o.hidden = false;
    if (!isDelete) setTimeout(function () { (isCreate ? $('in-name') : $('in-amount')).focus(); }, 350);
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

    if (mode === 'delete') {
      data.goals = data.goals.filter(function (g) { return g.id !== currentId; });
      currentId = null;
      save();
      closeSheet();
      render();
      return;
    }

    var cents = parseAmount($('in-amount').value);

    if (mode === 'create') {
      var name = $('in-name').value.trim();
      if (!name) return showError('Введите название цели');
      if (cents === null) return showError('Введите сумму цифрами, например 50000');
      data.goals.push({ id: newId(), name: name, target: cents, saved: 0, created: Date.now() });
      currentId = null; // после создания показываем список
    } else if (mode === 'add' || mode === 'take') {
      if (cents === null) return showError('Введите сумму цифрами, например 500');
      var g = findGoal(currentId);
      if (!g) return closeSheet();
      if (mode === 'add') {
        g.saved += cents;
      } else {
        if (cents > g.saved) return showError('Нельзя снять больше, чем накоплено (' + fmt(g.saved) + ')');
        g.saved -= cents;
      }
    } else {
      return;
    }
    save();
    closeSheet();
    render();
  }

  // ---------- Запуск ----------
  $('version').textContent = 'v' + VERSION;
  $('btn-plus').addEventListener('click', function () { openSheet('create'); });
  $('btn-create').addEventListener('click', function () { openSheet('create'); });
  $('btn-back').addEventListener('click', backToList);
  $('btn-delete').addEventListener('click', function () { openSheet('delete'); });
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
