// Stash: валюты. Коды ISO 4217 (действующие), плюс несколько популярных криптовалют.
// Названия валют берутся у браузера через Intl.DisplayNames на выбранном языке, символы — через Intl.NumberFormat.
(function () {
  'use strict';

  var CODES = (
    'AED AFN ALL AMD AOA ARS AUD AWG AZN BAM BBD BDT BHD BIF BMD BND BOB BRL BSD BTN BWP BYN BZD ' +
    'CAD CDF CHF CLP CNY COP CRC CUP CVE CZK DJF DKK DOP DZD EGP ERN ETB EUR FJD FKP GBP GEL GHS ' +
    'GIP GMD GNF GTQ GYD HKD HNL HTG HUF IDR ILS INR IQD IRR ISK JMD JOD JPY KES KGS KHR KMF KPW ' +
    'KRW KWD KYD KZT LAK LBP LKR LRD LSL LYD MAD MDL MGA MKD MMK MNT MOP MRU MUR MVR MWK MXN MYR ' +
    'MZN NAD NGN NIO NOK NPR NZD OMR PAB PEN PGK PHP PKR PLN PYG QAR RON RSD RUB RWF SAR SBD SCR ' +
    'SDG SEK SGD SHP SLE SOS SRD SSP STN SVC SYP SZL THB TJS TMT TND TOP TRY TTD TWD TZS UAH UGX ' +
    'USD UYU UZS VED VES VND VUV WST XAF XCD XCG XOF XPF YER ZAR ZMW ZWG'
  ).split(' ');

  // Криптовалюты: название и значок (не меняются от языка)
  var CRYPTO = {
    BTC: { sym: '₿', name: 'Bitcoin' },
    ETH: { sym: 'Ξ', name: 'Ethereum' },
    USDT: { sym: '₮', name: 'Tether' },
    USDC: { sym: 'USDC', name: 'USD Coin' },
    TON: { sym: 'TON', name: 'Toncoin' },
    SOL: { sym: 'SOL', name: 'Solana' },
    XRP: { sym: 'XRP', name: 'XRP' },
    BNB: { sym: 'BNB', name: 'BNB' },
    DOGE: { sym: 'Ð', name: 'Dogecoin' },
    LTC: { sym: 'Ł', name: 'Litecoin' }
  };

  // Что показывать в начале списка
  var PINNED = ['RUB', 'USD', 'EUR', 'GBP', 'CNY', 'UAH', 'BYN', 'KZT', 'TRY', 'JPY'];

  window.CURRENCIES = {
    codes: CODES,
    crypto: CRYPTO,
    pinned: PINNED,
    cryptoCodes: Object.keys(CRYPTO),
    has: function (c) { return CODES.indexOf(c) >= 0 || !!CRYPTO[c]; }
  };
})();
