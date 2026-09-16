/* =========================================================================
 * SKIBIDI CLICKER :: PRODUCTION
 * Pasif üreticiler (idle katmanı) ve tıklama yükseltmeleri.
 * Üreticiler oyunun "sen yokken de kazanıyorsun" tarafını kurar.
 * ========================================================================= */
(function (SK) {
    'use strict';

    const st = () => SK.state;
    let genListEl = null;
    let upgListEl = null;

    /* ------------------------------------------------------- YÜKSELTMELER */

    function buyUpgrade(id) {
        const s = st();
        const d = SK.UPGRADES.find(u => u.id === id);
        if (!d) return false;

        const level = s.upgrades[id];
        if (SK.upgradeMaxed(d, level)) return false;

        const cost = SK.upgradeCost(d, level);
        if (s.score < cost) { SK.audio.play('error'); return false; }

        s.score -= cost;
        s.upgrades[id]++;
        s.stats.totalSpent += cost;

        SK.audio.play('levelUp');
        SK.fx.popup('LEVEL UP!', d.color.startsWith('var') ? '#4ade80' : d.color,
            window.innerWidth / 2, window.innerHeight / 2);
        SK.refreshDerived(s);
        SK.emit('upgrade:bought', { id, level: s.upgrades[id] });
        SK.emit('ui:dirty');
        return true;
    }

    function renderUpgradeList() {
        const s = st();
        upgListEl.innerHTML = '';

        SK.UPGRADES.forEach(d => {
            const btn = SK.el('button', 'upgrade-btn w-full bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg p-3 flex flex-col gap-1 text-left group');
            btn.id = `upgrade-${d.id}`;
            btn.dataset.upgrade = d.id;
            btn.innerHTML = `
                <div class="flex justify-between items-start w-full gap-2">
                    <div class="min-w-0">
                        <span class="font-bold text-slate-200 group-hover:text-white block truncate">${d.icon} ${SK.escapeHTML(d.name)}</span>
                        <span class="text-[10px] text-slate-400">${SK.escapeHTML(d.desc)}</span>
                    </div>
                    <span class="text-[10px] px-1.5 py-0.5 rounded font-mono shrink-0"
                          style="background:${d.color}1a; color:${d.color};">LVL <span id="lvl-${d.id}">0</span></span>
                </div>
                <div class="mt-1 pt-2 border-t border-white/5 flex justify-between items-center w-full">
                    <span class="text-[10px] text-slate-500 uppercase">Bedel</span>
                    <span id="cost-${d.id}" class="font-bold font-mono text-sm" style="color:${d.color};">-</span>
                </div>
            `;
            btn.addEventListener('click', () => buyUpgrade(d.id));
            upgListEl.appendChild(btn);
        });

        updateUpgradeList();
    }

    function updateUpgradeList() {
        const s = st();
        SK.UPGRADES.forEach(d => {
            const level = s.upgrades[d.id];
            const btn = SK.byId(`upgrade-${d.id}`);
            if (!btn) return;

            SK.setText(SK.byId(`lvl-${d.id}`), String(level - d.startLevel));

            const maxed = SK.upgradeMaxed(d, level);
            const cost = maxed ? 0 : SK.upgradeCost(d, level);
            SK.setText(SK.byId(`cost-${d.id}`), maxed ? 'MAX' : SK.formatNumber(cost));

            const disabled = maxed || s.score < cost;
            if (btn.disabled !== disabled) btn.disabled = disabled;
            SK.toggleClass(btn, 'upgrade-maxed', maxed);
        });
    }

    /* ---------------------------------------------------------- ÜRETİCİLER */

    /** Satın alma miktarı modu: 1 / 10 / 100 / max */
    function buyAmount(def, owned) {
        const mode = st().ui.genBuyMode || 1;
        if (mode === 'max') return SK.generatorMaxAffordable(def, owned, st().score);
        return mode;
    }

    function buyGenerator(id) {
        const s = st();
        const d = SK.GENERATORS.find(g => g.id === id);
        if (!d) return false;

        const owned = s.generators[id] || 0;
        const amount = buyAmount(d, owned);
        if (amount <= 0) { SK.audio.play('error'); return false; }

        const cost = SK.generatorBulkCost(d, owned, amount);
        if (s.score < cost) { SK.audio.play('error'); return false; }

        const before = SK.milestoneMultiplier(owned);
        s.score -= cost;
        s.generators[id] = owned + amount;
        s.stats.generatorsBought += amount;
        s.stats.totalSpent += cost;
        const after = SK.milestoneMultiplier(s.generators[id]);

        SK.audio.play('buy');
        if (after > before) {
            SK.audio.play('levelUp');
            SK.fx.toast({
                icon: d.icon, title: 'Kilometre Taşı!',
                body: `${d.name} üretimi x${after / before} arttı (${s.generators[id]} adet)`,
                color: '#22c55e', ms: 3600
            });
            SK.fx.flash('rgba(34,197,94,0.18)', 240);
        }

        SK.refreshDerived(s);
        SK.emit('generator:bought', { id, amount });
        SK.emit('ui:dirty');
        return true;
    }

    function renderGeneratorList() {
        genListEl.innerHTML = '';

        SK.GENERATORS.forEach(d => {
            const row = SK.el('button', 'gen-row w-full text-left rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 p-3 flex items-center gap-3 transition-all');
            row.id = `gen-${d.id}`;
            row.innerHTML = `
                <div class="gen-icon shrink-0">${d.icon}</div>
                <div class="flex-1 min-w-0">
                    <div class="flex items-baseline justify-between gap-2">
                        <span class="font-bold text-slate-200 truncate">${SK.escapeHTML(d.name)}</span>
                        <span class="font-mono text-xs shrink-0" id="gen-owned-${d.id}">0</span>
                    </div>
                    <div class="text-[10px] text-slate-500 truncate" id="gen-desc-${d.id}">${SK.escapeHTML(d.desc)}</div>
                    <div class="flex items-baseline justify-between gap-2 mt-1">
                        <span class="font-mono text-[11px]" id="gen-cost-${d.id}" style="color: var(--neon-cyan);">-</span>
                        <span class="font-mono text-[10px] text-slate-400" id="gen-prod-${d.id}">-</span>
                    </div>
                    <div class="gen-milestone-bar mt-1"><div class="gen-milestone-fill" id="gen-ms-${d.id}"></div></div>
                </div>
            `;
            row.addEventListener('click', () => buyGenerator(d.id));
            genListEl.appendChild(row);
        });

        updateGeneratorList();
    }

    function updateGeneratorList() {
        const s = st();
        const totalRaw = SK.rawGeneratorOutput(s) || 1;

        SK.GENERATORS.forEach((d, index) => {
            const row = SK.byId(`gen-${d.id}`);
            if (!row) return;

            const owned = s.generators[d.id] || 0;
            const prevOwned = index > 0 ? (s.generators[SK.GENERATORS[index - 1].id] || 0) : 1;

            // Henüz sırası gelmemiş üreticiler gizlenir; oyunun ilk dakikaları
            // 10 satırlık bir listeyle boğulmasın.
            const unlocked = owned > 0 || index === 0 || prevOwned >= 1
                || s.score >= d.baseCost * 0.35;
            SK.toggleClass(row, 'hidden', !unlocked);
            if (!unlocked) return;

            const amount = buyAmount(d, owned);
            const cost = amount > 0 ? SK.generatorBulkCost(d, owned, amount) : SK.generatorCost(d, owned);

            SK.setText(SK.byId(`gen-owned-${d.id}`), String(owned));
            SK.setText(SK.byId(`gen-cost-${d.id}`),
                (amount > 1 ? `${amount}x ` : '') + SK.formatNumber(cost));

            const mult = SK.milestoneMultiplier(owned);
            const each = d.baseProd * mult * (s.derived.globalMult || 1)
                * (1 + 0.08 * s.upgrades.synergy) * (1 + 0.15 * (s.prestige.skills.automation || 0));
            const mine = owned * d.baseProd * mult;
            const share = totalRaw > 0 ? (mine / totalRaw) * 100 : 0;

            SK.setText(SK.byId(`gen-prod-${d.id}`),
                `${SK.formatNumber(each)}/sn${owned > 0 ? ` · %${share.toFixed(0)}` : ''}`);

            const next = SK.nextMilestone(owned);
            const fill = SK.byId(`gen-ms-${d.id}`);
            if (fill) {
                if (next) {
                    const prevMs = SK.GENERATOR_MILESTONES.filter(m => m <= owned).pop() || 0;
                    const pct = ((owned - prevMs) / (next - prevMs)) * 100;
                    SK.setStyle(fill, 'width', SK.clamp(pct, 0, 100).toFixed(1) + '%');
                    row.title = `Sonraki kilometre taşı: ${next} adet (üretim x2). Şu anki çarpan: x${mult}`;
                } else {
                    SK.setStyle(fill, 'width', '100%');
                    row.title = `Tüm kilometre taşları açık. Çarpan: x${mult}`;
                }
            }

            const disabled = s.score < cost || amount <= 0;
            if (row.disabled !== disabled) row.disabled = disabled;
        });
    }

    /* ----------------------------------------------------- PASİF ÜRETİM */

    /**
     * Ana döngüden saniyede birkaç kez çağrılır. `dt` saniye cinsindendir,
     * böylece kare hızı değişse de kazanç aynı kalır.
     */
    function produce(dt) {
        const s = st();
        const cps = s.derived.cps;
        if (cps > 0) {
            const gain = cps * dt;
            s.score += gain;
            s.stats.totalEarned += gain;
        }

        // Fanum Tax: portföy değerinin bir kısmı nakde döner.
        const rate = s.derived.passiveRate;
        if (rate > 0) {
            const value = SK.market.portfolioValue();
            if (value > 0) {
                const gain = value * rate * dt;
                s.score += gain;
                s.stats.totalEarned += gain;
            }
        }
    }

    /* ----------------------------------------------------------------- INIT */

    function init() {
        genListEl = SK.byId('generator-list');
        upgListEl = SK.byId('upgrades-list');
        renderUpgradeList();
        renderGeneratorList();
    }

    SK.production = {
        init, produce, buyUpgrade, buyGenerator,
        updateUpgradeList, updateGeneratorList,
        renderUpgradeList, renderGeneratorList
    };
})(window.SK);
