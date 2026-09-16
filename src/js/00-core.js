/* =========================================================================
 * SKIBIDI CLICKER :: CORE
 * Ortak yardımcılar, olay veri yolu (event bus) ve global isim alanı.
 * Tüm modüller bu dosyadaki `SK` nesnesine bağlanır.
 * ========================================================================= */
window.SK = window.SK || {};

(function (SK) {
    'use strict';

    SK.VERSION = '4.0.0';

    /* ---------------------------------------------------------------- MATH */

    const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);
    const lerp = (a, b, t) => a + (b - a) * t;
    const rand = (lo, hi) => lo + Math.random() * (hi - lo);
    const randInt = (lo, hi) => Math.floor(rand(lo, hi + 1));
    const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
    const chance = (p) => Math.random() < p;

    /** Box-Muller: normal dağılımlı gürültü. Piyasa modelinin kalbi. */
    function gauss() {
        let u = 0, v = 0;
        while (u === 0) u = Math.random();
        while (v === 0) v = Math.random();
        return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
    }

    /** Ağırlıklı seçim. `weights[i]`, `items[i]` ile eşleşir. */
    function weightedPick(items, weights) {
        let total = 0;
        for (let i = 0; i < weights.length; i++) total += weights[i];
        let roll = Math.random() * total;
        for (let i = 0; i < items.length; i++) {
            roll -= weights[i];
            if (roll <= 0) return items[i];
        }
        return items[items.length - 1];
    }

    /* ----------------------------------------------------------- FORMATTING */

    const SUFFIXES = ['', 'K', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx', 'Sp', 'Oc', 'No', 'Dc'];

    /**
     * Sayıyı kısa biçimde yazar (1.23M). Ayarlardan bilimsel gösterime geçilebilir.
     * Sonsuz/NaN değerler oyunu kilitlemesin diye burada yakalanır.
     */
    function formatNumber(num, decimals) {
        if (num === null || num === undefined || !isFinite(num)) return '∞';
        const neg = num < 0;
        num = Math.abs(num);
        let out;

        if (SK.state && SK.state.settings && SK.state.settings.numberFormat === 'sci' && num >= 1000) {
            out = num.toExponential(2).replace('e+', 'e');
        } else if (num < 1000) {
            out = decimals !== undefined ? num.toFixed(decimals) : Math.floor(num).toString();
        } else {
            let tier = Math.floor(Math.log10(num) / 3);
            if (tier >= SUFFIXES.length) return (neg ? '-' : '') + num.toExponential(2).replace('e+', 'e');
            const scaled = num / Math.pow(1000, tier);
            out = scaled.toFixed(scaled < 10 ? 2 : scaled < 100 ? 1 : 0) + SUFFIXES[tier];
        }
        return (neg ? '-' : '') + out;
    }

    /** Fiyatlar için: küçükken ondalık, büyükken kısaltma. */
    function formatPrice(p) {
        if (!isFinite(p)) return '∞';
        if (p < 1) return p.toFixed(4);
        if (p < 1000) return p.toFixed(2);
        return formatNumber(p);
    }

    const formatPercent = (p, decimals = 1) => (p >= 0 ? '+' : '') + (p * 100).toFixed(decimals) + '%';

    /** Saniyeyi "2s 14d 09sn" gibi okunur bir süreye çevirir. */
    function formatDuration(totalSeconds) {
        totalSeconds = Math.max(0, Math.floor(totalSeconds));
        const h = Math.floor(totalSeconds / 3600);
        const m = Math.floor((totalSeconds % 3600) / 60);
        const s = totalSeconds % 60;
        if (h > 0) return `${h}s ${m}d ${String(s).padStart(2, '0')}sn`;
        if (m > 0) return `${m}d ${String(s).padStart(2, '0')}sn`;
        return `${s}sn`;
    }

    const formatClock = (totalSeconds) => {
        totalSeconds = Math.max(0, Math.floor(totalSeconds));
        const m = Math.floor(totalSeconds / 60);
        const s = totalSeconds % 60;
        return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    };

    /** Kullanıcıdan/kayıttan gelen metni DOM'a basmadan önce güvenli hale getirir. */
    function escapeHTML(str) {
        return String(str).replace(/[&<>"']/g, (c) => (
            { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
        ));
    }

    /* ------------------------------------------------------------------ DOM */

    const $ = (sel, root) => (root || document).querySelector(sel);
    const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));
    const byId = (id) => document.getElementById(id);

    function el(tag, className, html) {
        const node = document.createElement(tag);
        if (className) node.className = className;
        if (html !== undefined) node.innerHTML = html;
        return node;
    }

    /** Gereksiz reflow'u önlemek için sadece değişince yazar. */
    function setText(node, text) {
        if (node && node.textContent !== text) node.textContent = text;
    }

    function setHTML(node, html) {
        if (node && node.innerHTML !== html) node.innerHTML = html;
    }

    function setStyle(node, prop, value) {
        if (node && node.style[prop] !== value) node.style[prop] = value;
    }

    function toggleClass(node, className, on) {
        if (!node) return;
        node.classList.toggle(className, !!on);
    }

    /* ------------------------------------------------------------ EVENT BUS */

    const listeners = new Map();

    /** Modüller arası gevşek bağ: `SK.on('click:gain', fn)`. */
    function on(event, handler) {
        if (!listeners.has(event)) listeners.set(event, []);
        listeners.get(event).push(handler);
        return () => off(event, handler);
    }

    function off(event, handler) {
        const list = listeners.get(event);
        if (!list) return;
        const i = list.indexOf(handler);
        if (i >= 0) list.splice(i, 1);
    }

    /** Bir dinleyicinin patlaması diğerlerini ya da oyun döngüsünü durdurmaz. */
    function emit(event, payload) {
        const list = listeners.get(event);
        if (!list) return;
        for (let i = 0; i < list.length; i++) {
            try {
                list[i](payload);
            } catch (err) {
                console.error(`[SK] "${event}" dinleyicisi hata verdi:`, err);
            }
        }
    }

    /* --------------------------------------------------------------- TIMING */

    /** Ağır UI işlerini kısıtlamak için basit throttle. */
    function throttle(fn, ms) {
        let last = 0;
        let pending = null;
        return function (...args) {
            const now = performance.now();
            if (now - last >= ms) {
                last = now;
                fn.apply(this, args);
            } else if (!pending) {
                pending = setTimeout(() => {
                    pending = null;
                    last = performance.now();
                    fn.apply(this, args);
                }, ms - (now - last));
            }
        };
    }

    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

    /* ---------------------------------------------------------------- EXPORT */

    Object.assign(SK, {
        clamp, lerp, rand, randInt, pick, chance, gauss, weightedPick,
        formatNumber, formatPrice, formatPercent, formatDuration, formatClock, escapeHTML,
        $, $$, byId, el, setText, setHTML, setStyle, toggleClass,
        on, off, emit, throttle, sleep
    });
})(window.SK);
