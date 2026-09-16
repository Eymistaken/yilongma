/* =========================================================================
 * SKIBIDI CLICKER :: YILONG AI
 * Rakip artık sadece artan bir sayı değil: gerçek bir portföyü var,
 * momentum stratejisiyle alım satım yapıyor, kaybettikçe ruh hali bozuluyor
 * ve saldırganlaştıkça oyuncuya sabotaj uyguluyor.
 * ========================================================================= */
(function (SK) {
    'use strict';

    const st = () => SK.state;
    const y = () => SK.state.yilong;

    /* ------------------------------------------------------------- SERVET */

    function holdingsValue() {
        let total = 0;
        const s = st();
        for (const key in y().holdings) {
            const a = s.assets[key];
            if (a && SK.market.isAlive(key)) total += y().holdings[key] * a.price;
        }
        return total;
    }

    function recomputeNetWorth() {
        const net = y().cash + holdingsValue();
        y().netWorth = isFinite(net) ? Math.max(0, net) : 0;
        return y().netWorth;
    }

    /** Oyuncunun serveti / Yilong'un serveti. Ruh halini bu oran belirler. */
    function wealthRatio() {
        const net = Math.max(1, y().netWorth);
        return st().totalWealth / net;
    }

    function currentMood() {
        const ratio = wealthRatio();
        for (let i = 0; i < SK.YILONG_MOODS.length; i++) {
            if (ratio >= SK.YILONG_MOODS[i].minRatio) return SK.YILONG_MOODS[i];
        }
        return SK.YILONG_MOODS[SK.YILONG_MOODS.length - 1];
    }

    /** Faz ilerledikçe hedef de büyür — yakalaması hep zor kalsın diye. */
    function targetWealth() {
        const s = st();
        const mult = s.phase === 2 ? 10 : s.phase >= 3 ? 1 : 2;
        return y().netWorth * mult;
    }

    /* ---------------------------------------------------------- TİCARET AI */

    /** Son N adımdaki momentum: pozitifse yükseliyor demektir. */
    function momentum(key) {
        const h = st().assets[key].history;
        if (h.length < 6) return 0;
        const recent = h[h.length - 1];
        const past = h[h.length - 6];
        return past > 0 ? (recent - past) / past : 0;
    }

    /**
     * Her karar turunda ya momentumu en güçlü varlığa girer ya da elindeki
     * en kötü pozisyonu keser. Beceri, ruh haline göre değişir: sinirlendikçe
     * daha riskli ve daha sık işlem yapar.
     */
    function trade() {
        const s = st();
        const keys = SK.market.aliveKeys();
        if (!keys.length) return;

        const mood = currentMood();
        const skill = 0.55 + mood.aggression * 0.35;   // 0.55..0.90

        // 1) Zarardaki ya da momentumu kırılan pozisyonları sat.
        for (const key in y().holdings) {
            const qty = y().holdings[key];
            if (!qty || !SK.market.isAlive(key)) continue;
            const m = momentum(key);
            if (m < -0.04 && Math.random() < skill) {
                const sold = Math.ceil(qty * SK.rand(0.35, 0.8));
                y().holdings[key] -= sold;
                y().cash += sold * s.assets[key].price;
                if (y().holdings[key] <= 0) delete y().holdings[key];
            }
        }

        // 2) Nakdin bir kısmıyla momentum lideri varlığa gir.
        const ranked = keys
            .map(k => ({ k, m: momentum(k) }))
            .sort((a, b) => b.m - a.m);

        const pickIndex = Math.random() < skill ? 0 : SK.randInt(0, Math.min(3, ranked.length - 1));
        let target = ranked[pickIndex];

        // Oyunun ilk saniyelerinde hiçbir varlığın momentumu yok. Rakibin
        // tamamen nakitte beklemesi yerine rastgele bir başlangıç pozisyonu
        // açmasını sağlıyoruz — aksi halde portföyü hiç kurulmuyordu.
        if (!target || target.m <= 0) {
            if (!SK.chance(0.5)) return;
            target = { k: SK.pick(keys), m: 0 };
        }

        const budget = y().cash * SK.rand(0.05, 0.18);
        const price = s.assets[target.k].price;
        const qty = Math.floor(budget / price);
        if (qty <= 0) return;

        y().cash -= qty * price;
        y().holdings[target.k] = (y().holdings[target.k] || 0) + qty;

        // Yilong'un alımı piyasayı pompalar — tweetleri bu yüzden değerli.
        s.assets[target.k].price *= 1 + SK.rand(0.02, 0.07);

        return target.k;
    }

    /* -------------------------------------------------------------- TWEET */

    function tweet(force) {
        const mood = currentMood();
        if (!force && !SK.chance(0.75)) return;
        SK.emit('skitter:post', { msg: SK.pick(mood.tweets), author: 'Yilong Ma', highlight: false });
    }

    function tweetTrade(key) {
        const s = st();
        const d = SK.ASSET_DEFS[key];
        if (!d) return;

        let phrase;
        if (d.type === 'fiat') phrase = `Bütün paramı ${d.name}'ye yatırdım. Diğer kâğıt paralar çöp! 🚮`;
        else if (d.type === 'tech') phrase = `${d.name} geleceği inşa ediyor. Yapay zekâ, roketler, her şey! 🚀`;
        else if (d.type === 'metal') phrase = `${d.name} hiç yalan söylemez. Fiziksel varlık kazanır. 🪙`;
        else phrase = `${d.name} aya çıkıyor! Hold hold hold! 💎🙌`;

        SK.emit('skitter:post', { msg: phrase, author: 'Yilong Ma', highlight: true });

        const node = SK.byId(`market-${key}-container`);
        if (node) {
            node.classList.add('highlight-asset');
            setTimeout(() => node.classList.remove('highlight-asset'), 3000);
        }
    }

    /* ------------------------------------------------------------ SABOTAJ */

    function pickSabotage() {
        const mood = currentMood();
        const pool = SK.SABOTAGE_ACTIONS.filter(a => mood.aggression >= a.minAggression);
        if (!pool.length) return null;
        return SK.weightedPick(pool, pool.map(a => a.weight));
    }

    /** Saldırıyı hemen uygulamaz — önce uyarı bandı çıkar, oyuncu hazırlanır. */
    function scheduleSabotage() {
        const s = st();
        if (s.phase >= 3 || s.buffs.victoryPump) return;
        if (y().pending) return;

        const action = pickSabotage();
        if (!action) return;

        y().pending = { actionId: action.id, firesAt: Date.now() + action.warnSeconds * 1000 };

        SK.fx.banner({
            icon: action.icon,
            title: action.name,
            text: action.warn,
            color: action.color,
            seconds: action.warnSeconds
        });
        SK.audio.play('warning');
        SK.emit('skitter:post', { msg: action.skitt, author: 'Yilong Ma', highlight: true });
    }

    function resolveSabotage() {
        const s = st();
        const pending = y().pending;
        if (!pending || Date.now() < pending.firesAt) return;
        y().pending = null;

        const action = SK.SABOTAGE_ACTIONS.find(a => a.id === pending.actionId);
        if (!action) return;

        const resist = s.derived.sabotageResist || 0;
        const power = 1 - resist;
        s.stats.sabotagesSurvived++;

        SK.audio.play('sabotage');
        SK.fx.shake(2.5, 600);
        SK.fx.flash(action.color + '33', 300);

        let body = '';

        if (action.id === 'cancel') {
            const ms = Math.round(12000 * power);
            s.buffs.clickDebuffUntil = Date.now() + ms;
            body = `Tık gücün ${(ms / 1000).toFixed(0)} saniye yarıya düştü.`;

        } else if (action.id === 'audit') {
            const amount = Math.max(0, s.score * 0.20 * power);
            s.score -= amount;
            y().cash += amount;
            body = `-${SK.formatNumber(amount)} Gyatt el konuldu.`;

        } else if (action.id === 'ddos') {
            const ms = Math.round(15000 * power);
            s.buffs.generatorStunUntil = Date.now() + ms;
            body = `Üreticilerin ${(ms / 1000).toFixed(0)} saniye durdu.`;

        } else if (action.id === 'rugpull') {
            const summary = SK.market.portfolioSummary();
            if (summary.rows.length) {
                const top = summary.rows[0];
                const drop = 0.45 * power;
                s.assets[top.key].price *= (1 - drop);
                body = `${top.name} %${(drop * 100).toFixed(0)} çakıldı.`;
            } else {
                body = 'Hedef bulunamadı — portföyün boştu.';
            }

        } else if (action.id === 'shortattack') {
            const drop = 0.18 * power;
            let hit = 0;
            SK.market.aliveKeys().forEach(k => {
                if (s.assets[k].count > 0) { s.assets[k].price *= (1 - drop); hit++; }
            });
            body = hit ? `${hit} varlığın %${(drop * 100).toFixed(0)} düştü.` : 'Portföyün boştu, saldırı boşa gitti.';

        } else if (action.id === 'takeover') {
            const summary = SK.market.portfolioSummary();
            if (summary.rows.length) {
                const target = SK.pick(summary.rows);
                const qty = Math.max(1, Math.floor(target.count * 0.20 * power));
                const a = s.assets[target.key];
                const basis = SK.market.avgCost(a) * qty;
                a.count -= qty;
                a.cost -= basis;
                if (a.count <= 0) { a.count = 0; a.cost = 0; }
                y().holdings[target.key] = (y().holdings[target.key] || 0) + qty;
                // Zorla devralmada oyuncuya piyasa değerinin yarısı ödenir.
                const payout = qty * a.price * 0.5;
                s.score += payout;
                y().cash -= payout;
                body = `${target.name} varlığının ${SK.formatNumber(qty)} adedi zorla alındı (yarı fiyata).`;
            } else {
                body = 'Devralacak varlığın yoktu.';
            }
        }

        SK.fx.toast({ icon: action.icon, title: action.name, body, color: action.color, ms: 5000 });
        SK.emit('yilong:sabotage', { id: action.id });
        SK.emit('ui:dirty');
    }

    /* ---------------------------------------------------------------- TICK */

    let secondsSinceTrade = 0;
    let secondsSinceTweet = 0;

    /** Saniyede bir çağrılır. */
    function tick() {
        const s = st();
        const yi = y();

        // Gelirinin bir kısmı düzenli olarak nakde akar: rakip de büyüyor.
        const passive = yi.netWorth * (s.phase === 2 ? 0.0035 : s.phase >= 3 ? 0 : 0.0018);
        yi.cash += passive;

        secondsSinceTrade++;
        if (secondsSinceTrade >= 8) {
            secondsSinceTrade = 0;
            const bought = trade();
            if (bought && SK.chance(0.4)) tweetTrade(bought);
        }

        secondsSinceTweet++;
        if (secondsSinceTweet >= 14) {
            secondsSinceTweet = 0;
            tweet();
        }

        // Oyuncu öne geçtikçe "heat" artar; saldırı sıklığını bu belirler.
        const mood = currentMood();
        yi.heat = SK.clamp(mood.aggression, 0, 1);
        yi.moodId = mood.id;

        resolveSabotage();

        yi.nextActionIn -= 1;
        if (yi.nextActionIn <= 0) {
            scheduleSabotage();
            const base = s.phase === 2 ? 55 : 80;
            yi.nextActionIn = Math.round(base * (1.25 - yi.heat));
        }

        recomputeNetWorth();
    }

    /* --------------------------------------------------------------- RENDER */

    let lastMoodId = null;

    function render() {
        const s = st();
        const avatar = SK.byId('yilong-avatar');
        const nameEl = SK.byId('yilong-name');
        const wealthEl = SK.byId('realtime-yilong-wealth');
        const smallEl = SK.byId('yilong-ma-servet-display');
        const targetEl = SK.byId('dynamic-target');
        const progress = SK.byId('wealth-progress');
        const moodEl = SK.byId('yilong-mood');

        if (s.phase === 3) return;   // Faz 3'te bu kutu Firewall'a dönüşüyor

        const mood = currentMood();
        if (mood.id !== lastMoodId) {
            lastMoodId = mood.id;
            SK.setHTML(avatar, mood.avatar);
            SK.setText(nameEl, mood.label);
            if (avatar) avatar.parentElement.style.borderColor = mood.color + '4d';
            if (wealthEl) wealthEl.style.color = mood.color;
            if (s.stats.playTime > 5) {
                SK.fx.toast({ icon: mood.avatar, title: `Yilong ruh hali: ${mood.label}`, color: mood.color, ms: 3000 });
            }
        }

        SK.setText(moodEl, `SALDIRGANLIK %${Math.round(mood.aggression * 100)}`);
        if (moodEl) moodEl.style.color = mood.color;

        const net = SK.formatNumber(y().netWorth);
        SK.setText(wealthEl, net);
        SK.setText(smallEl, net);

        const target = targetWealth();
        SK.setText(targetEl, SK.formatNumber(target));

        const pct = SK.clamp((s.totalWealth / Math.max(1, target)) * 100, 0, 100);
        SK.setStyle(progress, 'width', pct.toFixed(2) + '%');
    }

    /* ---------------------------------------------------------------- SETUP */

    /** Faz geçişinde rakip evrim geçirir: yeni sermaye, yeni portföy. */
    function evolve(phase) {
        const yi = y();
        if (phase === 2) {
            yi.cash = 50000000;
            yi.holdings = {};
            yi.nextActionIn = 30;
        }
        recomputeNetWorth();
        lastMoodId = null;
    }

    function init() {
        recomputeNetWorth();
        lastMoodId = null;
    }

    SK.yilong = {
        init, tick, render, evolve, recomputeNetWorth, currentMood,
        targetWealth, wealthRatio, holdingsValue, scheduleSabotage
    };
})(window.SK);
