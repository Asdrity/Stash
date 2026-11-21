// Stash v0.4.1 — копилка: цели, стратегии, настройки (тема, валюта, иконка, язык).
(function () {
  'use strict';

  var VERSION = '0.4.1';
  var KEY = 'stash.data';          // цели
  var SKEY = 'stash.settings';     // настройки: { theme, currency, lang, icon }
  var CIRC = 603.19;               // длина окружности кольца (2·π·96)
  var ICONS = ['sky', 'graphite', 'mint', 'sunset', 'violet', 'light'];

  var I = window.I18N;
  var C = window.CURRENCIES;

  function $(id) { return document.getElementById(id); }
  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text !== undefined && text !== null) e.textContent = text;
    return e;
  }
  function t(key, params) { return I.t(key, params); }

  var CHEV = '<svg class="chev" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 5l7 7-7 7"/></svg>';
  var CHECK = '<svg class="pick-check" viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';

  // ---------- Настройки ----------
  function loadSettings() {
    var s = {};
    try { s = JSON.parse(localStorage.getItem(SKEY)) || {}; } catch (e) {}
    return {
      theme: ['system', 'dark', 'light'].indexOf(s.theme) >= 0 ? s.theme : 'system',
      currency: typeof s.currency === 'string' && C.has(s.currency) ? s.currency : 'RUB',
      lang: I.has(s.lang) ? s.lang : I.detect(),
      icon: ICONS.indexOf(s.icon) >= 0 ? s.icon : 'sky'
    };
  }
  var settings = loadSettings();
  I.setLang(settings.lang);

  function saveSettings() {
    try { localStorage.setItem(SKEY, JSON.stringify(settings)); } catch (e) {}
  }

  // ---------- Данные целей (суммы в копейках, чтобы не копились ошибки округления) ----------
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
  var tab = 'list';     // раздел: 'list' | 'strategies' | 'settings'
  var TABS = ['list', 'strategies', 'settings'];

  // ---------- Деньги и числа ----------
  // Числа всегда латинскими цифрами (локаль + -u-nu-latn), чтобы совпадали с вводом.
  var fmtCache = {};
  function numLoc() { return settings.lang + '-u-nu-latn'; }
  function nf(key, opts) {
    var k = numLoc() + '|' + key;
    if (!fmtCache[k]) {
      try { fmtCache[k] = new Intl.NumberFormat(numLoc(), opts); }
      catch (e) { fmtCache[k] = new Intl.NumberFormat('en', opts); }
    }
    return fmtCache[k];
  }

  function num(cents) {
    var whole = cents % 100 === 0;
    return nf('n' + whole, { minimumFractionDigits: whole ? 0 : 2, maximumFractionDigits: 2 }).format(cents / 100);
  }

  function symbol(code) {
    if (C.crypto[code]) return C.crypto[code].sym;
    try {
      var parts = nf('s' + code, { style: 'currency', currency: code, currencyDisplay: 'narrowSymbol' }).formatToParts(1);
      for (var i = 0; i < parts.length; i++) if (parts[i].type === 'currency') return parts[i].value;
    } catch (e) {}
    return code;
  }

  function money(cents) {
    var code = settings.currency;
    if (C.crypto[code]) return num(cents) + ' ' + C.crypto[code].sym;
    var whole = cents % 100 === 0;
    try {
      return nf('c' + code + whole, {
        style: 'currency', currency: code, currencyDisplay: 'narrowSymbol',
        minimumFractionDigits: whole ? 0 : 2, maximumFractionDigits: 2
      }).format(cents / 100);
    } catch (e) {
      return num(cents) + ' ' + code;
    }
  }

  // "1 500,50" / "1500.5" / цифры других письменностей -> копейки; null, если не число
  function parseAmount(str) {
    var s = String(str).replace(/[\s  ]/g, '');
    s = s.replace(/\p{Nd}/gu, function (ch) {
      var cp = ch.codePointAt(0), n = 0;
      while (/\p{Nd}/u.test(String.fromCodePoint(cp - 1 - n))) n++;
      return String(n % 10);
    });
    s = s.replace(/[٬]/g, '').replace(/[,٫]/g, '.');
    if (!/^\d+(\.\d{1,2})?$/.test(s)) return null;
    var cents = Math.round(parseFloat(s) * 100);
    return cents > 0 && cents <= 100000000000 ? cents : null;
  }

  function findGoal(id) {
    for (var i = 0; i < data.goals.length; i++) if (data.goals[i].id === id) return data.goals[i];
    return null;
  }

  // ---------- Оформление: язык, тема, иконка ----------
  function applyStatic() {
    var i, nodes = document.querySelectorAll('[data-i18n]');
    for (i = 0; i < nodes.length; i++) nodes[i].textContent = t(nodes[i].getAttribute('data-i18n'));
    nodes = document.querySelectorAll('[data-i18n-ph]');
    for (i = 0; i < nodes.length; i++) nodes[i].setAttribute('placeholder', t(nodes[i].getAttribute('data-i18n-ph')));
    nodes = document.querySelectorAll('[data-i18n-aria]');
    for (i = 0; i < nodes.length; i++) nodes[i].setAttribute('aria-label', t(nodes[i].getAttribute('data-i18n-aria')));
  }

  function applyLang() {
    document.documentElement.setAttribute('lang', settings.lang);
    document.documentElement.setAttribute('dir', I.isRtl(settings.lang) ? 'rtl' : 'ltr');
    fmtCache = {};
    applyStatic();
  }

  var mq = window.matchMedia ? window.matchMedia('(prefers-color-scheme: light)') : null;
  function applyTheme() {
    var light = settings.theme === 'light' || (settings.theme === 'system' && mq && mq.matches);
    document.documentElement.setAttribute('data-theme', light ? 'light' : 'dark');
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', light ? '#f1f2f5' : '#121316');
  }

  // Значок для «На экран Домой» берётся при добавлении на экран; уже установленный значок iOS сам не меняет.
  function applyIcon() {
    var href = 'icons/app-' + settings.icon + '.png';
    var a = document.querySelector('link[rel="apple-touch-icon"]');
    if (a) a.setAttribute('href', href);
    var f = document.querySelector('link[rel="icon"]');
    if (f) f.setAttribute('href', href);
  }

  // ---------- Отрисовка: цели ----------
  var shown = 0; // сколько показано сейчас на экране (для плавного счёта)
  var anim = null;

  function countTo(cents) {
    cancelAnimationFrame(anim);
    var from = shown, to = cents, start = null, dur = 1100;
    if (from === to) { $('saved').textContent = money(to); return; }
    function step(ts) {
      if (start === null) start = ts;
      var k = Math.min(1, (ts - start) / dur);
      var e = 1 - Math.pow(1 - k, 4);
      shown = Math.round(from + (to - from) * e);
      $('saved').textContent = money(shown);
      if (k < 1) anim = requestAnimationFrame(step);
      else shown = to;
    }
    anim = requestAnimationFrame(step);
  }

  function renderList() {
    var list = $('view-list');
    list.innerHTML = '';
    data.goals.forEach(function (g, i) {
      var b = el('button', 'item');
      b.type = 'button';
      b.style.setProperty('--d', Math.min(i, 8) * 0.07 + 's');
      b.appendChild(el('span', 'item-name', g.name));
      b.appendChild(el('span', 'item-sum', num(g.saved) + ' / ' + money(g.target)));
      b.addEventListener('click', function () { openGoal(g.id); });
      list.appendChild(b);
    });
  }

  function renderGoal(g) {
    var ratio = g.target > 0 ? Math.min(1, g.saved / g.target) : 0;
    $('goal-name').textContent = g.name;
    $('of').textContent = t('goal.of', { x: money(g.target) });
    $('percent').textContent = Math.floor(ratio * 100) + '%';
    $('done-tag').hidden = g.saved < g.target;
    $('ring-fg').style.strokeDashoffset = String(CIRC * (1 - ratio));
    countTo(g.saved);
  }

  // ---------- Отрисовка: стратегии (только отображение) ----------
  var SGROUPS = [
    ['grp.rhythm', [1, 2, 3]],
    ['grp.pace', [4, 5, 6]],
    ['grp.challenge', [7, 8]],
    ['grp.own', [9, 10]]
  ];
  var PCT = { 4: 5, 5: 10, 6: 20 };

  function strategyDesc(n) {
    if (PCT[n]) return t('pct.d', { p: PCT[n] });
    if (n === 7) return t('s7.d', { x: money(100000) });
    if (n === 8) return t('s8.d', { x: money(10000) });
    return t('s' + n + '.d');
  }

  function renderStrategies() {
    var body = $('strat-body');
    body.innerHTML = '';
    SGROUPS.forEach(function (grp, gi) {
      var d = (gi * 0.08).toFixed(2) + 's';
      var h = el('h3', 'group-title', t(grp[0]));
      h.style.setProperty('--d', d);
      body.appendChild(h);
      var block = el('div', 'block');
      block.style.setProperty('--d', d);
      grp[1].forEach(function (n) {
        var row = el('div', 'row' + (n === 10 ? ' row-off' : ''));
        var main = el('div', 'row-main');
        main.appendChild(el('div', 'row-title', t('s' + n + '.n')));
        if (n === 10) {
          main.appendChild(el('div', 'row-sub', t('s10.d')));
          row.appendChild(main);
          var end = el('div', 'row-end');
          end.appendChild(el('span', 'row-off-text', t('soon')));
          row.appendChild(end);
        } else {
          main.appendChild(el('div', 'row-sub', strategyDesc(n)));
          row.appendChild(main);
        }
        block.appendChild(row);
      });
      body.appendChild(block);
    });
  }

  // ---------- Отрисовка: настройки ----------
  function langName(code) {
    for (var i = 0; i < I.LANGS.length; i++) if (I.LANGS[i].code === code) return I.LANGS[i].name;
    return code;
  }

  function renderSettings(animate) {
    var body = $('set-body');
    body.innerHTML = '';
    body.classList.toggle('static', !animate);
    var n = 0;

    function card(tag) {
      var c = el(tag, 'row-card' + (tag === 'button' ? ' row-btn' : ''));
      if (tag === 'button') c.type = 'button';
      c.style.setProperty('--d', (n++ * 0.05).toFixed(2) + 's');
      return c;
    }
    function main(title, sub) {
      var m = el('div', 'row-main');
      m.appendChild(el('div', 'row-title', title));
      if (sub) m.appendChild(el('div', 'row-sub', sub));
      return m;
    }

    // Напоминания (пока без логики)
    var rem = card('div');
    rem.appendChild(main(t('set.remind'), t('set.remind.sub')));
    body.appendChild(rem);

    // Валюта
    var cur = card('button');
    cur.appendChild(main(t('set.currency')));
    var ce = el('div', 'row-end');
    ce.appendChild(el('span', 'row-value', symbol(settings.currency) + ' ' + settings.currency));
    ce.insertAdjacentHTML('beforeend', CHEV);
    cur.appendChild(ce);
    cur.addEventListener('click', openCurrencyPicker);
    body.appendChild(cur);

    // Иконка приложения
    var ic = card('button');
    ic.appendChild(main(t('set.icon')));
    var ie = el('div', 'row-end');
    var img = el('img', 'icon-preview');
    img.src = 'icons/app-' + settings.icon + '.png';
    img.alt = '';
    img.width = 44; img.height = 44;
    ie.appendChild(img);
    ie.insertAdjacentHTML('beforeend', CHEV);
    ic.appendChild(ie);
    ic.addEventListener('click', openIconPicker);
    body.appendChild(ic);

    // Язык
    var lg = card('button');
    lg.appendChild(main(t('set.lang')));
    var le = el('div', 'row-end');
    le.appendChild(el('span', 'row-value', langName(settings.lang)));
    le.insertAdjacentHTML('beforeend', CHEV);
    lg.appendChild(le);
    lg.addEventListener('click', openLangPicker);
    body.appendChild(lg);

    // Тема
    var th = card('div');
    th.className += ' row-col';
    th.appendChild(el('div', 'row-title', t('set.theme')));
    var seg = el('div', 'seg');
    [['dark', 'theme.dark'], ['light', 'theme.light'], ['system', 'theme.system']].forEach(function (o) {
      var b = el('button', settings.theme === o[0] ? 'on' : '', t(o[1]));
      b.type = 'button';
      b.addEventListener('click', function () {
        settings.theme = o[0];
        saveSettings();
        applyTheme();
        var all = seg.children;
        for (var i = 0; i < all.length; i++) all[i].classList.toggle('on', all[i] === b);
      });
      seg.appendChild(b);
    });
    th.appendChild(seg);
    body.appendChild(th);
  }

  // ---------- Главная отрисовка ----------
  function render() {
    if (currentId && !findGoal(currentId)) currentId = null;
    var onList = tab === 'list';
    var g = onList && currentId ? findGoal(currentId) : null;
    var hasGoals = data.goals.length > 0;

    $('view-goal').hidden = !g;
    $('view-empty').hidden = !onList || !!g || hasGoals;
    $('view-list').hidden = !onList || !!g || !hasGoals;
    $('view-strategies').hidden = tab !== 'strategies';
    $('view-settings').hidden = tab !== 'settings';
    $('btn-plus').style.visibility = onList ? '' : 'hidden';

    renderTabs();
    if (g) renderGoal(g);
    else if (onList && hasGoals) renderList();
    if (tab === 'strategies') renderStrategies();
    if (tab === 'settings') renderSettings(true);
  }

  function renderTabs() {
    // первая вкладка: «Цель», пока открыта цель, иначе «Цели»
    var label = tab === 'list' && currentId && findGoal(currentId) ? t('tab.goal') : t('tab.goals');
    $('tab-goals-label').textContent = label;
    $('tabbar').style.setProperty('--i', String(TABS.indexOf(tab)));
    var btns = document.querySelectorAll('.tab');
    for (var i = 0; i < btns.length; i++) {
      var on = btns[i].getAttribute('data-tab') === tab;
      btns[i].classList.toggle('active', on);
      btns[i].setAttribute('aria-selected', on ? 'true' : 'false');
    }
  }

  function setTab(name) {
    if (name === 'list' && tab === 'list' && currentId) { backToList(); return; }
    if (name === tab) return;
    if (tab === 'list') currentId = null; // уходя из «Целей», возвращаемся потом к списку
    tab = name;
    $('scroll').scrollTop = 0;
    render();
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

  // ---------- Окна (общая логика показа/скрытия) ----------
  function openOv(o) {
    clearTimeout(o._t);
    o.classList.remove('closing');
    o.hidden = false;
  }
  function closeOv(o, after) {
    if (o.hidden) return;
    o.classList.add('closing');
    clearTimeout(o._t);
    o._t = setTimeout(function () {
      o.hidden = true;
      o.classList.remove('closing');
      if (after) after();
    }, 350);
    if (document.activeElement) document.activeElement.blur();
  }

  // ---------- Окно ввода: создать / внести / снять / удалить ----------
  var mode = null; // 'create' | 'add' | 'take' | 'delete'

  function showError(text) {
    var e = $('error');
    e.textContent = text;
    e.hidden = false;
    e.style.animation = 'none'; void e.offsetWidth; e.style.animation = '';
  }
  function clearError() { $('error').hidden = true; }

  function openSheet(m) {
    mode = m;
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

    var sym = symbol(settings.currency);
    if (isDelete) {
      var g = findGoal(currentId);
      $('sheet-title').textContent = t('sheet.delete.title');
      $('sheet-text').textContent = t('sheet.delete.text', { name: g ? g.name : '' });
      ok.textContent = t('btn.delete');
    } else if (isCreate) {
      $('sheet-title').textContent = t('sheet.new');
      $('amount-label').textContent = t('field.target', { c: sym });
      ok.textContent = t('btn.create');
    } else {
      var label = m === 'add' ? t('act.add') : t('act.take');
      $('sheet-title').textContent = label;
      $('amount-label').textContent = t('field.amount', { c: sym });
      ok.textContent = label;
    }

    openOv($('overlay'));
    if (!isDelete) setTimeout(function () { (isCreate ? $('in-name') : $('in-amount')).focus(); }, 350);
  }

  function closeSheet() {
    closeOv($('overlay'), function () { mode = null; });
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
      if (!name) return showError(t('err.name'));
      if (cents === null) return showError(t('err.target'));
      data.goals.push({ id: newId(), name: name, target: cents, saved: 0, created: Date.now() });
      currentId = null; // после создания показываем список
    } else if (mode === 'add' || mode === 'take') {
      if (cents === null) return showError(t('err.amount'));
      var g = findGoal(currentId);
      if (!g) return closeSheet();
      if (mode === 'add') {
        g.saved += cents;
      } else {
        if (cents > g.saved) return showError(t('err.over', { x: money(g.saved) }));
        g.saved -= cents;
      }
    } else {
      return;
    }
    save();
    closeSheet();
    render();
  }

  // ---------- Окно выбора: валюта / язык / иконка ----------
  var pick = null; // { items, selected, grid, onPick }

  function openPicker(cfg) {
    pick = cfg;
    $('pick-title').textContent = cfg.title;
    $('pick-search-wrap').hidden = !cfg.search;
    $('pick-search').value = '';
    $('pick-note').hidden = !cfg.note;
    if (cfg.note) $('pick-note').textContent = cfg.note;
    buildPick('');
    $('pick-scroll').scrollTop = 0;
    openOv($('pick-overlay'));
    // длинный список: сразу показать выбранный пункт
    setTimeout(function () {
      var sel = $('pick-list').querySelector('.sel');
      var box = $('pick-scroll');
      if (sel && !cfg.grid) box.scrollTop = Math.max(0, sel.offsetTop - box.clientHeight / 2 + sel.offsetHeight / 2);
    }, 30);
  }

  function closePicker() {
    closeOv($('pick-overlay'), function () { pick = null; });
  }

  function buildPick(q) {
    var list = $('pick-list');
    list.innerHTML = '';
    q = (q || '').trim().toLowerCase();
    var items = pick.items.filter(function (it) { return !q || it.key.indexOf(q) >= 0; });

    if (!items.length) {
      list.className = '';
      list.appendChild(el('div', 'pick-empty', t('pick.empty')));
      return;
    }

    list.className = pick.grid ? 'icon-grid' : 'block';
    items.forEach(function (it) {
      var on = it.id === pick.selected;
      var b;
      if (pick.grid) {
        b = el('button', 'icon-opt' + (on ? ' on sel' : ''));
        var img = el('img');
        img.src = it.img; img.alt = ''; img.width = 76; img.height = 76;
        b.appendChild(img);
        b.appendChild(el('span', '', it.title));
      } else {
        b = el('button', 'pick-row' + (on ? ' sel' : ''));
        b.appendChild(el('span', 'pick-badge', it.badge));
        var txt = el('span', 'pick-text');
        txt.appendChild(el('div', 'pick-title', it.title));
        if (it.sub) txt.appendChild(el('div', 'pick-sub', it.sub));
        b.appendChild(txt);
        if (on) b.insertAdjacentHTML('beforeend', CHECK);
      }
      b.type = 'button';
      b.setAttribute('data-id', it.id);
      list.appendChild(b);
    });
  }

  function currencyName(code) {
    if (C.crypto[code]) return C.crypto[code].name;
    try {
      if (!currencyName.dn || currencyName.lang !== settings.lang) {
        currencyName.dn = new Intl.DisplayNames([settings.lang], { type: 'currency' });
        currencyName.lang = settings.lang;
      }
      var n = currencyName.dn.of(code);
      if (n && n !== code) return n.charAt(0).toLocaleUpperCase(settings.lang) + n.slice(1);
    } catch (e) {}
    return code;
  }

  function openCurrencyPicker() {
    var rest = C.codes.filter(function (c) { return C.pinned.indexOf(c) < 0; });
    var collator;
    try { collator = new Intl.Collator(settings.lang); } catch (e) { collator = new Intl.Collator('en'); }
    var named = rest.map(function (c) { return { c: c, n: currencyName(c) }; });
    named.sort(function (a, b) { return collator.compare(a.n, b.n); });
    var order = C.pinned.concat(named.map(function (x) { return x.c; })).concat(C.cryptoCodes);

    var items = order.map(function (code) {
      var name = currencyName(code), sym = symbol(code);
      return { id: code, badge: sym, title: name, sub: code, key: (code + ' ' + name + ' ' + sym).toLowerCase() };
    });
    openPicker({
      title: t('pick.currency'), items: items, selected: settings.currency, search: true,
      onPick: function (id) {
        settings.currency = id;
        saveSettings();
        fmtCache = {};
        renderSettings(false);
      }
    });
  }

  function openLangPicker() {
    var items = I.LANGS.map(function (l) {
      return { id: l.code, badge: l.code.toUpperCase(), title: l.name, sub: '', key: (l.code + ' ' + l.name).toLowerCase() };
    });
    openPicker({
      title: t('pick.lang'), items: items, selected: settings.lang, search: false,
      onPick: function (id) {
        settings.lang = id;
        I.setLang(id);
        saveSettings();
        currencyName.dn = null;
        applyLang();
        render();
      }
    });
  }

  function openIconPicker() {
    var items = ICONS.map(function (id) {
      return { id: id, img: 'icons/app-' + id + '.png', title: t('ic.' + id), key: id };
    });
    openPicker({
      title: t('set.icon'), items: items, selected: settings.icon, search: false, grid: true,
      note: t('icon.note'),
      onPick: function (id) {
        settings.icon = id;
        saveSettings();
        applyIcon();
        renderSettings(false);
      }
    });
  }

  // ---------- Запуск ----------
  $('version').textContent = 'v' + VERSION;
  applyLang();
  applyTheme();
  applyIcon();

  $('btn-plus').addEventListener('click', function () { openSheet('create'); });
  $('btn-create').addEventListener('click', function () { openSheet('create'); });
  $('btn-back').addEventListener('click', backToList);
  $('btn-delete').addEventListener('click', function () { openSheet('delete'); });
  $('btn-add').addEventListener('click', function () { openSheet('add'); });
  $('btn-take').addEventListener('click', function () { openSheet('take'); });
  $('sheet-cancel').addEventListener('click', closeSheet);
  $('sheet').addEventListener('submit', submit);
  $('overlay').addEventListener('click', function (e) { if (e.target === this) closeSheet(); });

  var tabBtns = document.querySelectorAll('.tab');
  for (var ti = 0; ti < tabBtns.length; ti++) {
    tabBtns[ti].addEventListener('click', function () { setTab(this.getAttribute('data-tab')); });
  }

  $('pick-close').addEventListener('click', closePicker);
  $('pick-overlay').addEventListener('click', function (e) { if (e.target === this) closePicker(); });
  $('pick-search').addEventListener('input', function () { if (pick) buildPick(this.value); });
  $('pick-list').addEventListener('click', function (e) {
    var node = e.target.closest ? e.target.closest('[data-id]') : null;
    if (!node || !pick) return;
    var cb = pick.onPick;
    var id = node.getAttribute('data-id');
    closePicker();
    cb(id);
  });

  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    if (!$('pick-overlay').hidden) closePicker();
    else closeSheet();
  });

  if (mq && mq.addEventListener) mq.addEventListener('change', function () { if (settings.theme === 'system') applyTheme(); });

  render();

  // Service worker (офлайн-режим). Работает по https и на localhost.
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('sw.js').catch(function () {});
    });
  }
})();
