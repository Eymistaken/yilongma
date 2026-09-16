/* =========================================================================
 * SKIBIDI CLICKER :: CLICKER
 * Tıklama, kritik vuruş, kombo sayacı ve FEVER modu.
 * Kombo, hızlı tıklamayı ödüllendirip oyunu aktif tutan çekirdek mekanik.
 * ========================================================================= */
(function (SK) {
    'use strict';

    const FEVER_DURATION = 8000;   // ms
    const FEVER_COOLDOWN = 20000;  // ms — üst üste tetiklenmesini engeller

    let toiletEl = null;
    let lastFeverAt = 0;
    let bumpTimer = null;

    const st = () => SK.state;

    /* ---------------------------------------------------------------- KOMBO */

    /** Pencere dolduysa komboyu sıfırlar. Her saniye çağrılır. */
    function decayCombo() {
        const s = st();
        if (s.combo.count <= 0) return;
        if (Date.now() - s.combo.lastClickAt > s.derived.comboWindow) {
            s.combo.count = 0;
            SK.emit('combo:reset');
        }
    }

    function bumpCombo() {
        const s = st();
        const cap = s.derived.comboCap;
        s.combo.lastClickAt = Date.now();
        if (s.combo.count < cap) s.combo.count++;
        if (s.combo.count > s.stats.maxCombo) s.stats.maxCombo = s.combo.count;

        if (s.combo.count >= cap) triggerFever();
    }

    function triggerFever() {
        const s = st();
        const now = Date.now();
        if (now < s.combo.feverUntil) return;                 // zaten aktif
        if (now - lastFeverAt < FEVER_COOLDOWN) return;       // bekleme süresi

        lastFeverAt = now;
        s.combo.feverUntil = now + FEVER_DURATION;
        s.stats.feverCount++;

        document.body.classList.add('fever-active');
        SK.audio.play('fever');
        SK.fx.flash('rgba(255,207,0,0.35)', 350);
        SK.fx.shake(2, 500);
        SK.fx.popup('🔥 FEVER MODE 🔥', '#ffcf00', window.innerWidth / 2, window.innerHeight / 2, 'text-4xl md:text-6xl');
        SK.fx.toast({ icon: '🔥', title: 'FEVER MODE!', body: `${SK.FEVER_MULT}x tüm kazançlar, ${FEVER_DURATION / 1000} saniye`, color: '#ffcf00', ms: 3000 });
        SK.emit('fever:start');
    }

    /** FEVER bitişini yakalayıp CSS sınıfını temizler. */
    function checkFeverEnd() {
        const s = st();
        if (s.combo.feverUntil && Date.now() >= s.combo.feverUntil) {
            s.combo.feverUntil = 0;
            document.body.classList.remove('fever-active');
            SK.emit('fever:end');
        }
    }

    /* ------------------------------------------------------------ TIKLAMA */

    function doClick(e) {
        SK.audio.init();
        const s = st();

        // Faz 3 "matrix": fare hacklendi, tıklama hiçbir şey vermez.
        if (s.phase === 3 && s.p3.universe === 'matrix') {
            SK.fx.popup('MOUSE HACKED', '#00ff00',
                e ? e.clientX : window.innerWidth / 2,
                e ? e.clientY : window.innerHeight / 2);
            return;
        }

        bumpCombo();
        SK.refreshDerived(s);

        const isCrit = Math.random() < s.derived.critChance;
        let gain = s.derived.clickGain;
        if (isCrit) gain *= s.derived.critDamage;

        s.score += gain;
        s.stats.clicks++;
        s.stats.totalEarned += gain;
        s.stats.idleStreak = 0;
        if (isCrit) s.stats.crits++;

        const rect = toiletEl.getBoundingClientRect();
        const x = e && e.clientX ? e.clientX : rect.left + rect.width / 2;
        const y = e && e.clientY ? e.clientY : rect.top + rect.height / 2;

        if (s.derived.fever) SK.audio.play('clickFever');
        else SK.audio.play('click');

        if (isCrit) {
            SK.audio.play('crit');
            SK.fx.popup(`KRİTİK! +${SK.formatNumber(gain)}`, '#facc15', x, y);
            SK.fx.particles(x, y, 6, ['#facc15', '#f87171', '#fff']);
        } else {
            SK.fx.popup(`+${SK.formatNumber(gain)}`, s.derived.fever ? '#ffcf00' : '#c084fc', x, y);
            SK.fx.particles(x, y, s.derived.fever ? 3 : 1, s.derived.fever ? ['#ffcf00', '#fb923c'] : ['#8b5cf6', '#fff']);
        }

        bumpToilet();
        SK.emit('click:done', { gain, isCrit });
        SK.emit('ui:dirty');
    }

    function bumpToilet() {
        if (!toiletEl || (st().settings.reducedMotion)) return;
        toiletEl.style.transform = `scale(0.95) rotate(${Math.random() * 10 - 5}deg)`;
        clearTimeout(bumpTimer);
        bumpTimer = setTimeout(() => { toiletEl.style.transform = 'scale(1) rotate(0deg)'; }, 80);
    }

    /* --------------------------------------------------------------- RENDER */

    function renderComboBar() {
        const s = st();
        const bar = SK.byId('combo-fill');
        const label = SK.byId('combo-label');
        const wrap = SK.byId('combo-wrap');
        if (!bar || !wrap) return;

        const cap = s.derived.comboCap || 100;
        const pct = SK.clamp((s.combo.count / cap) * 100, 0, 100);
        SK.setStyle(bar, 'width', pct.toFixed(1) + '%');

        SK.toggleClass(wrap, 'combo-hot', s.combo.count >= cap * 0.75);
        SK.toggleClass(wrap, 'combo-idle', s.combo.count === 0);

        if (s.derived.fever) {
            const left = Math.max(0, (s.combo.feverUntil - Date.now()) / 1000);
            SK.setText(label, `🔥 FEVER ${left.toFixed(1)}s — ${SK.FEVER_MULT}x`);
        } else {
            SK.setText(label, `KOMBO ${s.combo.count}/${cap} — x${SK.comboMultiplier(s).toFixed(2)}`);
        }
    }

    /* ----------------------------------------------------------------- INIT */

    function init() {
        toiletEl = SK.byId('skibidi-toilet');
        toiletEl.addEventListener('pointerdown', doClick);

        // Klavye ile tıklama — erişilebilirlik ve hızlı oynanış için.
        toiletEl.setAttribute('tabindex', '0');
        toiletEl.setAttribute('role', 'button');
        toiletEl.setAttribute('aria-label', 'Gyatt kazanmak için tuvalete tıkla');
        toiletEl.addEventListener('keydown', (e) => {
            if (e.key === ' ' || e.key === 'Enter') {
                e.preventDefault();
                doClick(null);
            }
        });
    }

    SK.clicker = { init, doClick, decayCombo, checkFeverEnd, renderComboBar, triggerFever, FEVER_DURATION };
})(window.SK);
