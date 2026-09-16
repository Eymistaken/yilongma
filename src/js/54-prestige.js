/* =========================================================================
 * SKIBIDI CLICKER :: PRESTIGE
 * "Sigma Yükselişi": ekonomiyi sıfırlar, karşılığında Sigma Parçası verir.
 * Parçalar kalıcıdır ve yetenek ağacında kalıcı güce dönüşür.
 * Hikâye ilerlemesi (faz), başarımlar ve kara borsa eşyaları KORUNUR.
 * ========================================================================= */
(function (SK) {
    'use strict';

    const st = () => SK.state;

    /* ------------------------------------------------------------ YÜKSELİŞ */

    function ascend() {
        const s = st();
        SK.refreshDerived(s);

        if (!s.derived.canAscend) {
            SK.audio.play('error');
            SK.fx.toast({
                icon: '🔒', title: 'Henüz yükselemezsin',
                body: `Gereken servet: ${SK.formatNumber(SK.ASCEND_REQUIREMENT)} (Faz 2+)`,
                color: '#94a3b8', ms: 4000
            });
            return false;
        }

        const gained = s.derived.pendingShards;
        if (gained <= 0) {
            SK.fx.toast({
                icon: '💠', title: 'Yeni parça yok',
                body: 'Daha fazla servet biriktirmeden yükselmek anlamsız.',
                color: '#94a3b8', ms: 4000
            });
            return false;
        }

        s.prestige.shards += gained;
        s.prestige.totalShards += gained;
        s.prestige.count++;

        resetRun(s);

        SK.audio.play('ascend');
        SK.fx.flash('rgba(192,132,252,0.45)', 600);
        SK.fx.shake(3, 800);
        SK.fx.toast({
            icon: '🔱', title: `Sigma Yükselişi #${s.prestige.count}`,
            body: `+${gained} Sigma Parçası kazandın. Yetenek ağacını aç.`,
            color: '#c084fc', ms: 6000,
            onClick: () => SK.ui.openPanel('right', 'skills')
        });

        SK.refreshDerived(s);
        SK.emit('prestige:ascend', { gained });
        SK.emit('ui:dirty');
        SK.saveGame(true);
        return true;
    }

    /**
     * Koşu ekonomisini sıfırlar. Kalıcı olan her şey (parçalar, yetenekler,
     * başarımlar, kara borsa, faz, istatistikler) dokunulmadan bırakılır.
     */
    function resetRun(s) {
        s.score = s.phase >= 2 ? 25000 : 0;
        s.totalWealth = 0;

        SK.UPGRADES.forEach(u => { s.upgrades[u.id] = u.startLevel; });
        SK.GENERATORS.forEach(g => { s.generators[g.id] = 0; });

        for (const key in s.assets) {
            const a = s.assets[key];
            const def = SK.ASSET_DEFS[key];
            a.count = 0;
            a.cost = 0;
            a.price = def.price;
            a.trend = 0;
            a.regimeDir = 0;
            a.regimeTicks = 0;
            a.history = new Array(24).fill(def.price);
        }

        s.orders = [];
        s.market.event = null;
        s.market.eventCooldown = 60;
        s.combo.count = 0;
        s.combo.feverUntil = 0;
        s.buffs.clickDebuffUntil = 0;
        s.buffs.generatorStunUntil = 0;
        s.buffs.insiderUntil = 0;
        s.buffs.victoryPump = false;

        // Rakip de yeniden kuruluyor — faz seviyesine uygun sermayeyle.
        SK.yilong.reset(s.phase);

        SK.fx.hideBanner();
        document.body.classList.remove('fever-active');
        SK.market.renderPrices();
        SK.market.renderHoldings();
        SK.production.updateGeneratorList();
        SK.production.updateUpgradeList();
    }

    /* -------------------------------------------------------- YETENEK AĞACI */

    function buySkill(id) {
        const s = st();
        const def = SK.SKILLS.find(x => x.id === id);
        if (!def) return false;

        const level = s.prestige.skills[id] || 0;
        if (level >= def.max) return false;

        const cost = SK.skillCost(def, level);
        if (s.prestige.shards < cost) { SK.audio.play('error'); return false; }

        s.prestige.shards -= cost;
        s.prestige.skills[id] = level + 1;

        SK.audio.play('levelUp');
        SK.fx.popup(`${def.icon} ${def.name} Lv${level + 1}`, '#c084fc', window.innerWidth / 2, window.innerHeight / 2);
        SK.refreshDerived(s);
        SK.emit('skill:bought', { id, level: level + 1 });
        renderSkills();
        SK.emit('ui:dirty');
        return true;
    }

    let skillsBuilt = false;

    function renderSkills() {
        const grid = SK.byId('skill-grid');
        if (!grid) return;

        const s = st();

        if (!skillsBuilt) {
            skillsBuilt = true;
            grid.innerHTML = '';
            SK.SKILLS.forEach(def => {
                const cell = SK.el('button', 'skill-cell');
                cell.id = `skill-${def.id}`;
                cell.innerHTML = `
                    <div class="skill-top">
                        <span class="skill-icon">${def.icon}</span>
                        <span class="skill-level" id="skill-lvl-${def.id}">0/${def.max}</span>
                    </div>
                    <div class="skill-name">${SK.escapeHTML(def.name)}</div>
                    <div class="skill-desc">${SK.escapeHTML(def.desc)}</div>
                    <div class="skill-cost" id="skill-cost-${def.id}">💠 -</div>
                    <div class="skill-bar"><div class="skill-fill" id="skill-fill-${def.id}"></div></div>
                `;
                cell.addEventListener('click', () => buySkill(def.id));
                grid.appendChild(cell);
            });
        }

        SK.SKILLS.forEach(def => {
            const level = s.prestige.skills[def.id] || 0;
            const maxed = level >= def.max;
            const cost = maxed ? 0 : SK.skillCost(def, level);
            const cell = SK.byId(`skill-${def.id}`);

            SK.setText(SK.byId(`skill-lvl-${def.id}`), `${level}/${def.max}`);
            SK.setText(SK.byId(`skill-cost-${def.id}`), maxed ? '✓ TAMAM' : `💠 ${cost}`);
            SK.setStyle(SK.byId(`skill-fill-${def.id}`), 'width', ((level / def.max) * 100).toFixed(0) + '%');

            if (cell) {
                const disabled = maxed || s.prestige.shards < cost;
                if (cell.disabled !== disabled) cell.disabled = disabled;
                SK.toggleClass(cell, 'skill-maxed', maxed);
                SK.toggleClass(cell, 'skill-owned', level > 0);
            }
        });

        SK.setText(SK.byId('shard-balance'), String(s.prestige.shards));
        SK.setText(SK.byId('shard-total'), String(s.prestige.totalShards));
        SK.setText(SK.byId('ascend-count'), String(s.prestige.count));
    }

    /* ------------------------------------------------------ YÜKSELİŞ PANELİ */

    function renderAscendPanel() {
        const s = st();
        const btn = SK.byId('btn-ascend');
        const info = SK.byId('ascend-info');
        if (!btn) return;

        const pending = s.derived.pendingShards || 0;
        const can = s.derived.canAscend && pending > 0;

        btn.disabled = !can;
        SK.toggleClass(btn, 'opacity-40', !can);
        SK.setText(SK.byId('ascend-gain'), `+${pending} 💠`);

        if (s.phase < 2) {
            SK.setHTML(info, 'Sigma Yükselişi <strong>Faz 2</strong>\'de açılır.');
        } else if (!s.derived.canAscend) {
            const need = SK.ASCEND_REQUIREMENT;
            const pct = SK.clamp((Math.max(s.totalWealth, s.stats.bestWealth) / need) * 100, 0, 100);
            SK.setHTML(info, `Gereken servet: <strong>${SK.formatNumber(need)}</strong> — %${pct.toFixed(1)}`);
        } else if (pending <= 0) {
            SK.setHTML(info, 'Yeni parça için daha fazla servet biriktir.');
        } else {
            SK.setHTML(info, `Koşun sıfırlanır, <strong>${pending} parça</strong> kalıcı olur.`);
        }

        SK.setText(SK.byId('shard-passive'), `+%${(s.prestige.shards * 2).toFixed(0)}`);
    }

    /* ----------------------------------------------------------------- INIT */

    function init() {
        const btn = SK.byId('btn-ascend');
        if (btn) {
            btn.addEventListener('click', () => {
                if (!st().settings.confirmAscend) { ascend(); return; }
                SK.ui.confirm({
                    icon: '🔱',
                    title: 'Sigma Yükselişi',
                    body: `Koşun sıfırlanacak: Gyatt, üreticiler, yükseltmeler ve portföy gidecek.<br>
                           <strong>Kalıcı olanlar:</strong> Sigma Parçaları, yetenekler, başarımlar, kara borsa eşyaları, faz ilerlemen.<br><br>
                           Kazanacağın parça: <strong>${st().derived.pendingShards} 💠</strong>`,
                    confirmText: 'YÜKSEL',
                    onConfirm: ascend
                });
            });
        }
        renderSkills();
    }

    SK.prestige = { init, ascend, buySkill, renderSkills, renderAscendPanel, resetRun };
})(window.SK);
