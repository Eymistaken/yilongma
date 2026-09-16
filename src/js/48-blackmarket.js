/* =========================================================================
 * SKIBIDI CLICKER :: BLACK MARKET
 * Faz 2'de açılan gacha kasası. Kalıcı çarpanlar ve Yilong'a sabotaj
 * eşyaları verir; yüksek risk yerine yüksek maliyetle dengelenir.
 * ========================================================================= */
(function (SK) {
    'use strict';

    const st = () => SK.state;
    const itemById = (id) => SK.BLACK_MARKET_ITEMS.find(i => i.id === id);

    /* ------------------------------------------------------------- ÇEKİLİŞ */

    /**
     * Nadirlik tablosundan çeker. Yetenek ağacındaki "Kara Borsa Bağlantısı"
     * iyi nadirliklerin eşiklerini genişletir.
     */
    function roll() {
        const luck = st().derived.gachaLuck || 0;
        const r = Math.random() * (1 - Math.min(0.45, luck));

        for (let i = 0; i < SK.GACHA_TABLE.length; i++) {
            const tier = SK.GACHA_TABLE[i];
            if (r < tier.threshold) {
                return itemById(SK.pick(tier.ids));
            }
        }
        return itemById('bm_fanum_shield');
    }

    function grant(item) {
        const s = st();

        if (item.rarity === 'LEGENDARY') s.stats.legendaryPulls++;

        if (item.type === 'sabotage') {
            const reduction = s.yilong.cash * item.val;
            s.yilong.cash -= reduction;
            SK.yilong.recomputeNetWorth();
            SK.fx.popup(`Yilong: -${SK.formatNumber(reduction)}`, '#ef4444', window.innerWidth - 120, 60);
            SK.fx.flash('rgba(239,68,68,0.3)', 200);

        } else if (item.type === 'insider') {
            // İçeriden bilgi: 45 saniye boyunca rejim okları ve olay ipuçları netleşir.
            s.buffs.insiderUntil = Date.now() + 45000;
            SK.fx.toast({ icon: '🤫', title: 'İçeriden Bilgi', body: '45 saniye boyunca piyasa yönü görünür.', color: '#a3e635', ms: 4000 });

        } else {
            s.blackMarketBuffs.push(item.id);
        }

        SK.refreshDerived(s);
        SK.emit('blackmarket:pull', { id: item.id });
        SK.emit('ui:dirty');
    }

    /* ---------------------------------------------------------------- KASA */

    function buyCase() {
        const s = st();
        if (s.score < s.blackMarketCost) { SK.audio.play('error'); return false; }

        s.score -= s.blackMarketCost;
        s.stats.totalSpent += s.blackMarketCost;
        s.blackMarketCost *= 10;

        SK.emit('ui:dirty');
        openGacha();
        return true;
    }

    /* ---------------------------------------------------------- GACHA MODAL */

    function openGacha() {
        const modal = SK.byId('gacha-modal');
        const container = SK.byId('gacha-cards');
        modal.style.opacity = 1;
        modal.style.pointerEvents = 'auto';
        container.innerHTML = '';

        let picked = false;

        for (let i = 0; i < 4; i++) {
            const card = SK.el('div', 'gacha-card aspect-[3/4] bg-gradient-to-br from-slate-800 to-black border-2 border-red-900/50 rounded-xl cursor-pointer transform hover:scale-105 transition-all duration-300 relative overflow-hidden group shadow-[0_0_30px_rgba(220,38,38,0.2)]');
            card.innerHTML = `
                <div class="absolute inset-0 flex items-center justify-center text-6xl opacity-20 group-hover:opacity-100 transition-opacity">❓</div>
                <div class="absolute inset-0 bg-red-500/10 opacity-0 group-hover:opacity-20 transition-opacity"></div>
            `;

            card.addEventListener('click', () => {
                if (picked) return;
                picked = true;

                const item = roll();
                Array.from(container.children).forEach(c => { if (c !== card) c.style.opacity = 0.2; });

                card.style.transition = 'transform 0.6s';
                card.style.transform = 'rotateY(180deg)';

                setTimeout(() => {
                    card.style.transform = 'rotateY(0deg)';
                    card.className = 'gacha-card revealed aspect-[3/4] bg-slate-900 border-4 rounded-xl flex flex-col items-center justify-center gap-4 shadow-[0_0_50px_currentColor] scale-110 z-50';
                    card.style.borderColor = item.color;
                    card.style.color = item.color;

                    const effect = item.type === 'sabotage'
                        ? `Yilong -%${(item.val * 100).toFixed(0)}`
                        : item.type === 'insider'
                            ? '45sn piyasa görüşü'
                            : `x${item.mult} Çarpan`;

                    card.innerHTML = `
                        <div class="text-6xl animate-bounce">${item.icon}</div>
                        <div class="text-center px-2">
                            <h3 class="font-bold text-xl leading-tight">${SK.escapeHTML(item.name)}</h3>
                            <p class="text-xs text-white mt-2 font-mono">${effect}</p>
                            <p class="text-[10px] mt-1 opacity-70">${item.rarity}</p>
                        </div>
                    `;

                    SK.audio.play(item.rarity === 'LEGENDARY' ? 'jackpot' : 'achievement');
                    if (item.rarity === 'LEGENDARY') SK.fx.flash(item.color + '40', 400);
                    grant(item);

                    setTimeout(closeGacha, 2500);
                }, 300);
            });

            container.appendChild(card);
        }
    }

    function closeGacha() {
        const modal = SK.byId('gacha-modal');
        modal.style.opacity = 0;
        modal.style.pointerEvents = 'none';
    }

    /* --------------------------------------------------------------- RENDER */

    function render() {
        const s = st();
        const panel = SK.byId('black-market-panel');
        if (!panel) return;

        // Faz 2'den önce kilitli.
        const locked = s.phase < 2;
        SK.toggleClass(panel, 'hidden', locked);
        SK.toggleClass(SK.byId('bm-locked-note'), 'hidden', !locked);
        if (locked) return;

        SK.setText(SK.byId('bm-cost-display'), SK.formatNumber(s.blackMarketCost));

        const btn = SK.byId('btn-black-market-buy');
        if (btn) {
            const broke = s.score < s.blackMarketCost;
            btn.disabled = broke;
            SK.toggleClass(btn, 'opacity-50', broke);
            SK.toggleClass(btn, 'grayscale', broke);
        }

        SK.setText(SK.byId('bm-mult-display'), 'x' + SK.blackMarketMultiplier(s).toFixed(2));

        const inv = SK.byId('bm-inventory');
        if (!inv) return;

        // Aynı eşyadan birden fazla olabilir; sayarak gösteriyoruz.
        const counts = {};
        s.blackMarketBuffs.forEach(id => { counts[id] = (counts[id] || 0) + 1; });
        const signature = Object.keys(counts).map(k => k + counts[k]).join('|');
        if (inv.dataset.signature === signature) return;
        inv.dataset.signature = signature;

        inv.innerHTML = '';
        Object.keys(counts).forEach(id => {
            const item = itemById(id);
            if (!item) return;
            const cell = SK.el('div', 'bm-cell group');
            cell.style.borderColor = item.color;
            cell.innerHTML = `
                <span class="text-xl">${item.icon}</span>
                ${counts[id] > 1 ? `<span class="bm-count">${counts[id]}</span>` : ''}
                <div class="bm-tooltip">
                    <strong style="color:${item.color}">${SK.escapeHTML(item.name)}</strong><br>
                    x${item.mult} çarpan${counts[id] > 1 ? ` (${counts[id]} adet)` : ''}
                </div>
            `;
            inv.appendChild(cell);
        });
    }

    function init() {
        const btn = SK.byId('btn-black-market-buy');
        if (btn) btn.addEventListener('click', buyCase);
        render();
    }

    SK.blackMarket = { init, render, buyCase, openGacha, roll };
})(window.SK);
