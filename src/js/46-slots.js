/* =========================================================================
 * SKIBIDI CLICKER :: SLOTS
 * Skibidi Slots mini oyunu. Orijinal ödeme tablosu korundu; üstüne
 * yetenek ağacından gelen şans bonusu ve istatistik takibi eklendi.
 * ========================================================================= */
(function (SK) {
    'use strict';

    const st = () => SK.state;
    let spinning = false;

    const els = {};

    function cacheEls() {
        els.spinBtn = SK.byId('spin-btn');
        els.allInBtn = SK.byId('spin-all-in-btn');
        els.cost = SK.byId('slot-cost');
        els.costBox = SK.byId('slot-cost-container');
        els.betBox = SK.byId('slot-bet-input-container');
        els.betInput = SK.byId('slot-bet-input');
        els.status = SK.byId('slot-status');
        els.reels = [SK.byId('reel-inner-1'), SK.byId('reel-inner-2'), SK.byId('reel-inner-3')];

        els.mSpinBtn = SK.byId('m-spin-btn');
        els.mAllInBtn = SK.byId('m-spin-all-in-btn');
        els.mCost = SK.byId('m-slot-cost');
        els.mStatus = SK.byId('m-slot-status');
        els.mReels = [SK.byId('m-reel-inner-1'), SK.byId('m-reel-inner-2'), SK.byId('m-reel-inner-3')];
    }

    function randomSymbol() {
        const weights = st().phase >= 2 ? SK.SLOT_WEIGHTS_P2 : SK.SLOT_WEIGHTS;
        return SK.weightedPick(SK.SLOT_SYMBOLS, weights);
    }

    function setReel(reel, symbol, big) {
        if (!reel) return;
        let node = reel.querySelector('.slot-symbol');
        if (!node) {
            node = SK.el('div', 'slot-symbol');
            reel.innerHTML = '';
            reel.appendChild(node);
        }
        node.textContent = symbol;
        SK.toggleClass(node, 'text-4xl', !!big);
    }

    /* ----------------------------------------------------------- ÖDEME TABLOSU */

    /** Sonuçtan çarpanı ve metni çıkarır. Faz 2'de tüm ödemeler yükselir. */
    function evaluate(results) {
        const p2 = st().phase >= 2;
        const [a, b, c] = results;

        if (a === '7️⃣' && b === '8️⃣' && c === '9️⃣') {
            return { mult: p2 ? 60 : 50, text: p2 ? 'SIGMA GRINDSET! x60' : 'BÜYÜK İKRAMİYE! x50',
                cls: 'text-fuchsia-400 font-bold jackpot-anim', color: '#f0abfc', big: true, tag: 'seq789' };
        }
        if ((a === '6️⃣' && b === '7️⃣') || (b === '6️⃣' && c === '7️⃣')) {
            return { mult: p2 ? 50 : 10, text: p2 ? 'YAN YANA 6 & 7! x50' : 'YAN YANA 6 & 7! x10',
                cls: 'text-orange-400 font-bold jackpot-anim', color: '#fb923c', big: true };
        }
        if (a === b && b === c) {
            const table = a === '🚽' ? (p2 ? 1000 : 500)
                : a === '7️⃣' ? (p2 ? 200 : 100)
                    : a === '💎' ? (p2 ? 100 : 50)
                        : (p2 ? 40 : 20);
            return { mult: table, text: 'JACKPOT! 🔥', cls: 'text-green-400 font-bold jackpot-anim',
                color: '#4ade80', big: true, tag: a === '🚽' ? 'toilet' : null };
        }
        if (a === b || b === c || a === c) {
            return { mult: p2 ? 5 : 3, text: 'Güzel! 👍', cls: 'text-cyan-400 font-bold', color: '#22d3ee' };
        }
        return { mult: 0, text: 'Tekrar dene 💀', cls: 'text-slate-400', color: '#94a3b8' };
    }

    /* --------------------------------------------------------------- ÇEVİRİŞ */

    /** Bahis tutarını belirler; faz 1'de sabit, faz 2+'da girişten okunur. */
    function resolveBet(overrideBet) {
        const s = st();
        if (overrideBet > 0) return { bet: Math.floor(overrideBet) };
        if (s.phase >= 2) {
            const val = parseInt(els.betInput.value, 10);
            if (isNaN(val) || val < 100) return { error: 'Min bahis: 100' };
            if (val > s.score) return { error: 'Yetersiz bakiye' };
            return { bet: val };
        }
        if (s.score < SK.SLOT_BASE_COST) return { error: 'Yetersiz bakiye' };
        return { bet: SK.SLOT_BASE_COST };
    }

    async function spin(isMobile, overrideBet) {
        if (spinning) return;

        const s = st();
        const resolved = resolveBet(overrideBet === undefined ? -1 : overrideBet);
        const status = isMobile ? els.mStatus : els.status;

        if (resolved.error) {
            SK.setText(status, resolved.error);
            SK.audio.play('error');
            return;
        }

        const bet = resolved.bet;
        if (s.score < bet || bet <= 0) { SK.audio.play('error'); return; }

        await SK.audio.init();

        const isAllIn = overrideBet !== undefined && overrideBet > 0;
        s.score -= bet;
        s.stats.spins++;
        spinning = true;

        const btn = isMobile ? els.mSpinBtn : els.spinBtn;
        const allIn = isMobile ? els.mAllInBtn : els.allInBtn;
        const reels = isMobile ? els.mReels : els.reels;

        setSpinButtons(true);
        SK.setText(status, 'Çeviriliyor...');
        status.className = 'text-yellow-200 animate-pulse';

        const rollTimer = setInterval(() => {
            reels.forEach(r => setReel(r, SK.pick(SK.SLOT_SYMBOLS), false));
            SK.audio.play('spin');
        }, 100);

        setTimeout(() => {
            clearInterval(rollTimer);

            const results = [randomSymbol(), randomSymbol(), randomSymbol()];
            reels.forEach((r, i) => setReel(r, results[i], true));

            const outcome = evaluate(results);
            SK.setText(status, outcome.text);
            status.className = outcome.cls;

            if (outcome.mult > 0) {
                const win = bet * outcome.mult * (s.derived.slotBonus || 1);
                s.score += win;
                s.stats.slotWins += win;
                s.stats.totalEarned += win;
                if (isAllIn) s.stats.allInWins++;
                if (outcome.tag === 'toilet') s.stats.toiletJackpots++;
                if (outcome.tag === 'seq789') s.stats.seq789++;

                SK.fx.popup(`+${SK.formatNumber(win)}`, outcome.color,
                    window.innerWidth / 2, window.innerHeight / 2,
                    outcome.big ? 'text-4xl md:text-6xl' : undefined);
                SK.audio.play(outcome.big ? 'jackpot' : 'levelUp');
                if (outcome.big) {
                    SK.fx.flash(outcome.color + '33', 300);
                    SK.fx.toast({ icon: '🎰', title: outcome.text, body: `+${SK.formatNumber(win)} Gyatt`, color: outcome.color, ms: 4000 });
                }
            }

            spinning = false;
            setSpinButtons(false);
            SK.emit('slot:done', { results, mult: outcome.mult });
            SK.emit('ui:dirty');
        }, 2000);
    }

    function setSpinButtons(disabled) {
        [els.spinBtn, els.mSpinBtn, els.allInBtn, els.mAllInBtn].forEach(b => {
            if (!b) return;
            b.disabled = disabled;
            SK.toggleClass(b, 'opacity-50', disabled);
        });
    }

    /* --------------------------------------------------------------- RENDER */

    function render() {
        const s = st();
        SK.setText(els.cost, SK.formatNumber(SK.SLOT_BASE_COST));
        SK.setText(els.mCost, SK.formatNumber(SK.SLOT_BASE_COST));

        const p2 = s.phase >= 2;
        SK.toggleClass(els.costBox, 'hidden', p2);
        SK.toggleClass(els.betBox, 'hidden', !p2);
        SK.toggleClass(els.betBox, 'flex', p2);
        SK.toggleClass(els.allInBtn, 'hidden', !p2);
        SK.toggleClass(els.mAllInBtn, 'hidden', !p2);

        if (spinning) return;

        const minBet = p2 ? 100 : SK.SLOT_BASE_COST;
        const broke = s.score < minBet;
        [els.spinBtn, els.mSpinBtn].forEach(b => {
            if (!b) return;
            b.disabled = broke;
            SK.toggleClass(b, 'opacity-50', broke);
        });
        [els.allInBtn, els.mAllInBtn].forEach(b => {
            if (!b) return;
            b.disabled = broke;
            SK.toggleClass(b, 'opacity-50', broke);
        });

        const bonus = SK.byId('slot-luck-bonus');
        if (bonus) {
            const pct = ((s.derived.slotBonus || 1) - 1) * 100;
            SK.setText(bonus, pct > 0 ? `🍀 +%${pct.toFixed(0)} ödeme` : '');
        }
    }

    /* ----------------------------------------------------------------- INIT */

    function init() {
        cacheEls();
        els.spinBtn.addEventListener('click', () => spin(false));
        els.mSpinBtn.addEventListener('click', () => spin(true));
        if (els.allInBtn) els.allInBtn.addEventListener('click', () => spin(false, st().score));
        if (els.mAllInBtn) els.mAllInBtn.addEventListener('click', () => spin(true, st().score));
        render();
    }

    SK.slots = { init, spin, render, evaluate, get spinning() { return spinning; } };
})(window.SK);
