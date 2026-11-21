// Stash: переводы. Файлы языков лежат в js/locales/<код>.js и подключаются в index.html ДО app.js.
// Чтобы добавить язык: новый файл js/locales/xx.js (все ключи как в ru.js), запись в LANGS ниже,
// <script> в index.html и путь в sw.js. Если ключа нет в языке, берётся en, затем ru.
(function () {
  'use strict';

  var LOC = window.STASH_LOC = window.STASH_LOC || {};

  // 25 языков, порядок = порядок в списке выбора
  var LANGS = [
    { code: 'en', name: 'English' },
    { code: 'zh', name: '中文' },
    { code: 'hi', name: 'हिन्दी' },
    { code: 'es', name: 'Español' },
    { code: 'fr', name: 'Français' },
    { code: 'ar', name: 'العربية' },
    { code: 'bn', name: 'বাংলা' },
    { code: 'pt', name: 'Português' },
    { code: 'ru', name: 'Русский' },
    { code: 'ur', name: 'اردو' },
    { code: 'id', name: 'Bahasa Indonesia' },
    { code: 'de', name: 'Deutsch' },
    { code: 'ja', name: '日本語' },
    { code: 'mr', name: 'मराठी' },
    { code: 'te', name: 'తెలుగు' },
    { code: 'tr', name: 'Türkçe' },
    { code: 'ta', name: 'தமிழ்' },
    { code: 'vi', name: 'Tiếng Việt' },
    { code: 'ko', name: '한국어' },
    { code: 'it', name: 'Italiano' },
    { code: 'th', name: 'ไทย' },
    { code: 'fa', name: 'فارسی' },
    { code: 'pl', name: 'Polski' },
    { code: 'uk', name: 'Українська' },
    { code: 'nl', name: 'Nederlands' }
  ];
  var RTL = { ar: 1, ur: 1, fa: 1 };
  var cur = 'ru';

  function has(code) {
    if (!code || !LOC[code]) return false;
    for (var i = 0; i < LANGS.length; i++) if (LANGS[i].code === code) return true;
    return false;
  }

  // Язык по настройкам телефона; если такого нет — английский
  function detect() {
    var list = (navigator.languages && navigator.languages.length) ? navigator.languages : [navigator.language || 'ru'];
    for (var i = 0; i < list.length; i++) {
      var c = String(list[i]).toLowerCase().split('-')[0];
      if (has(c)) return c;
    }
    return 'en';
  }

  function t(key, params) {
    var s = LOC[cur] && LOC[cur][key];
    if (s === undefined) s = LOC.en && LOC.en[key];
    if (s === undefined) s = LOC.ru && LOC.ru[key];
    if (s === undefined) s = key;
    if (params) {
      s = s.replace(/\{(\w+)\}/g, function (m, k) { return params[k] !== undefined ? params[k] : m; });
    }
    return s;
  }

  window.I18N = {
    LANGS: LANGS,
    RTL: RTL,
    has: has,
    detect: detect,
    t: t,
    setLang: function (c) { cur = c; },
    getLang: function () { return cur; },
    isRtl: function (c) { return !!RTL[c || cur]; }
  };
})();
