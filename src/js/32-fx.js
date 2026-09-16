/* =========================================================================
 * SKIBIDI CLICKER :: FX
 * Görsel geri bildirim: popup, partikül, floater, ekran sarsıntısı, toast.
 * Hepsi "Hareketi Azalt" ve partikül yoğunluğu ayarına saygı duyar.
 * ========================================================================= */
(function (SK) {
    'use strict';

    let popupCont = null;
    let floaterCont = null;
    let toastCont = null;

    // Aynı anda ekranda duran efekt sayısını sınırlar (düşük donanım koruması).
    const MAX_POPUPS = 28;
    const MAX_PARTICLES = 90;
    let liveParticles = 0;

    const PARTICLE_SCALE = { off: 0, low: 0.4, normal: 1, high: 2 };

    function init() {
        popupCont = SK.byId('popup-container');
        floaterCont = SK.byId('floater-container');
        toastCont = SK.byId('toast-container');
    }

    const reduced = () => SK.state && SK.state.settings.reducedMotion;
    const particleScale = () => {
        if (!SK.state) return 1;
        if (reduced()) return 0;
        return PARTICLE_SCALE[SK.state.settings.particles] !== undefined
            ? PARTICLE_SCALE[SK.state.settings.particles] : 1;
    };

    /* --------------------------------------------------------------- POPUP */

    /**
     * Uçan yazı. x/y sayı verilirse piksel, verilmezse rastgele yüzde konum.
     */
    function popup(text, color = '#fff', x, y, sizeClass) {
        if (!popupCont || reduced()) return;
        if (popupCont.children.length > MAX_POPUPS) {
            popupCont.removeChild(popupCont.firstChild);
        }

        const node = SK.el('div', 'click-popup ' + (sizeClass || 'text-2xl md:text-4xl'));
        node.textContent = text;
        node.style.color = color;

        if (typeof x === 'number') {
            node.style.left = `${x}px`;
            node.style.top = `${y}px`;
        } else {
            node.style.left = (Math.random() * 80 + 10) + '%';
            node.style.top = (Math.random() * 40 + 30) + '%';
        }

        node.style.setProperty('--rot', `${Math.random() * 40 - 20}deg`);
        popupCont.appendChild(node);
        setTimeout(() => node.remove(), 800);
    }

    /* ----------------------------------------------------------- PARTİKÜL */

    function particles(x, y, count = 3, colorSet = ['#8b5cf6', '#fff']) {
        const scale = particleScale();
        if (scale <= 0) return;
        let n = Math.round(count * scale);
        if (liveParticles + n > MAX_PARTICLES) n = Math.max(0, MAX_PARTICLES - liveParticles);

        for (let i = 0; i < n; i++) {
            const p = SK.el('div', 'particle');
            const size = Math.random() * 8 + 4;
            p.style.width = `${size}px`;
            p.style.height = `${size}px`;
            p.style.backgroundColor = SK.pick(colorSet);
            p.style.left = `${x}px`;
            p.style.top = `${y}px`;

            const angle = Math.random() * Math.PI * 2;
            const velocity = Math.random() * 100 + 50;
            p.style.setProperty('--tx', `${Math.cos(angle) * velocity}px`);
            p.style.setProperty('--ty', `${Math.sin(angle) * velocity}px`);

            document.body.appendChild(p);
            liveParticles++;
            setTimeout(() => { p.remove(); liveParticles--; }, 800);
        }
    }

    /* ------------------------------------------------------------ FLOATER */

    const FLOATER_EMOJI = ['🗿', '💜', '🤓', '🍑', '✨', '🔥', '👽', '👻', '👑', '💯', '💩', '💸', '🚽', '🧠'];

    function floater() {
        if (!floaterCont || reduced() || particleScale() <= 0) return;
        if (floaterCont.children.length > 14) return;

        const node = SK.el('div', 'floater');
        node.textContent = SK.pick(FLOATER_EMOJI);
        node.style.left = `${Math.random() * 100}vw`;
        node.style.animationDuration = `${Math.random() * 15 + 10}s`;
        floaterCont.appendChild(node);
        setTimeout(() => node.remove(), 25000);
    }

    /* ------------------------------------------------------------- SARSMA */

    let shakeTimer = null;

    function shake(intensity = 1, ms = 300) {
        if (reduced()) return;
        const world = SK.byId('game-world');
        if (!world) return;
        world.style.setProperty('--shake-amp', `${Math.min(14, 3 * intensity)}px`);
        world.classList.add('screen-shake');
        clearTimeout(shakeTimer);
        shakeTimer = setTimeout(() => world.classList.remove('screen-shake'), ms);
    }

    /** Kısa renkli ekran parlaması — büyük olaylar için. */
    function flash(color = 'rgba(255,255,255,0.25)', ms = 220) {
        if (reduced()) return;
        const node = SK.el('div', 'fx-flash');
        node.style.background = color;
        document.body.appendChild(node);
        setTimeout(() => node.remove(), ms);
    }

    /* -------------------------------------------------------------- TOAST */

    const toastQueue = [];
    let toastShowing = 0;
    const MAX_VISIBLE_TOASTS = 4;

    /**
     * Sağ altta yığılan bildirim. `opts`: { icon, title, body, color, ms, onClick }
     */
    function toast(opts) {
        if (!toastCont) return;
        toastQueue.push(opts);
        drainToasts();
    }

    function drainToasts() {
        while (toastShowing < MAX_VISIBLE_TOASTS && toastQueue.length) {
            renderToast(toastQueue.shift());
        }
    }

    function renderToast(o) {
        toastShowing++;
        const node = SK.el('div', 'sk-toast');
        node.style.setProperty('--toast-color', o.color || 'var(--neon-cyan)');
        node.innerHTML = `
            <div class="sk-toast-icon">${o.icon || '✨'}</div>
            <div class="sk-toast-body">
                <div class="sk-toast-title">${SK.escapeHTML(o.title || '')}</div>
                ${o.body ? `<div class="sk-toast-text">${SK.escapeHTML(o.body)}</div>` : ''}
            </div>
        `;
        if (o.onClick) {
            node.classList.add('cursor-pointer');
            node.addEventListener('click', () => { o.onClick(); dismiss(); });
        }
        toastCont.appendChild(node);

        let done = false;
        function dismiss() {
            if (done) return;
            done = true;
            node.classList.add('leaving');
            setTimeout(() => {
                node.remove();
                toastShowing--;
                drainToasts();
            }, 320);
        }
        setTimeout(dismiss, o.ms || 4200);
    }

    /* ------------------------------------------------------ UYARI BANDI */

    let bannerTimer = null;

    /**
     * Ekranın üstünde sayaçlı tehdit bandı. Yilong saldırılarını önceden
     * haber verir ki oyuncu tepki verebilsin.
     */
    function banner(opts) {
        const bar = SK.byId('threat-banner');
        if (!bar) return;
        clearTimeout(bannerTimer);

        bar.style.setProperty('--banner-color', opts.color || '#ef4444');
        bar.innerHTML = `
            <span class="threat-icon">${opts.icon || '⚠️'}</span>
            <span class="threat-title">${SK.escapeHTML(opts.title || '')}</span>
            <span class="threat-text">${SK.escapeHTML(opts.text || '')}</span>
            ${opts.seconds ? '<span class="threat-count" id="threat-count"></span>' : ''}
        `;
        bar.classList.add('active');

        if (opts.seconds) {
            let left = opts.seconds;
            const countEl = SK.byId('threat-count');
            SK.setText(countEl, left + 's');
            const tick = setInterval(() => {
                left--;
                if (left <= 0) {
                    clearInterval(tick);
                    hideBanner();
                } else {
                    SK.setText(SK.byId('threat-count'), left + 's');
                }
            }, 1000);
            bannerTimer = setTimeout(() => clearInterval(tick), opts.seconds * 1000 + 100);
        } else {
            bannerTimer = setTimeout(hideBanner, opts.ms || 4000);
        }
    }

    function hideBanner() {
        const bar = SK.byId('threat-banner');
        if (bar) bar.classList.remove('active');
    }

    /* ------------------------------------------------------ SAYI AKIŞI */

    /**
     * Bir sayıyı eski değerden yenisine yumuşakça sayar. Büyük atlamalarda
     * anlık yazar ki ekran geride kalmasın.
     */
    function countUp(node, from, to, ms = 400, formatter = SK.formatNumber) {
        if (!node) return;
        if (reduced() || !isFinite(from) || !isFinite(to) || Math.abs(to - from) < 1) {
            SK.setText(node, formatter(to));
            return;
        }
        const start = performance.now();
        function step(now) {
            const t = Math.min(1, (now - start) / ms);
            const eased = 1 - Math.pow(1 - t, 3);
            SK.setText(node, formatter(from + (to - from) * eased));
            if (t < 1) requestAnimationFrame(step);
        }
        requestAnimationFrame(step);
    }

    SK.fx = { init, popup, particles, floater, shake, flash, toast, banner, hideBanner, countUp };
})(window.SK);
