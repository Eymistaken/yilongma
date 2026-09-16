/* =========================================================================
 * SKIBIDI CLICKER :: QUESTS
 * Aynı anda 3 aktif görev. Tamamlanan görev havuzdan yenisiyle değişir ve
 * hedefler tamamlama sayısıyla birlikte ölçeklenir.
 * ========================================================================= */
(function (SK) {
    'use strict';

    const ACTIVE_COUNT = 3;
    const st = () => SK.state;

    /** Görev metriklerini tek yerden okuyoruz ki yeni metrik eklemek kolay olsun. */
    function readMetric(metric) {
        return st().stats[metric] || 0;
    }

    function makeQuest(poolId, tier) {
        const def = SK.QUEST_POOL.find(q => q.id === poolId);
        const target = Math.ceil(def.base * Math.pow(def.scale, tier));
        return {
            poolId,
            tier,
            target,
            start: readMetric(def.metric),
            reward: def.reward,
            rewardAmount: def.reward === 'shard'
                ? Math.max(1, Math.round(def.rewardBase * (1 + tier * 0.5)))
                : Math.round(def.rewardBase * Math.pow(3.1, tier))
        };
    }

    function rollNewQuest(excludeIds) {
        const s = st();
        const tier = Math.floor(s.quests.completedCount / SK.QUEST_POOL.length);
        const available = SK.QUEST_POOL.filter(q => excludeIds.indexOf(q.id) < 0);
        const chosen = available.length ? SK.pick(available) : SK.pick(SK.QUEST_POOL);
        return makeQuest(chosen.id, tier);
    }

    function refill() {
        const s = st();
        while (s.quests.active.length < ACTIVE_COUNT) {
            const taken = s.quests.active.map(q => q.poolId);
            s.quests.active.push(rollNewQuest(taken));
        }
    }

    function progressOf(q) {
        const def = SK.QUEST_POOL.find(p => p.id === q.poolId);
        if (!def) return 1;
        const done = readMetric(def.metric) - q.start;
        return SK.clamp(done / q.target, 0, 1);
    }

    function complete(q, index) {
        const s = st();
        const def = SK.QUEST_POOL.find(p => p.id === q.poolId);

        if (q.reward === 'shard') {
            s.prestige.shards += q.rewardAmount;
            s.prestige.totalShards += q.rewardAmount;
        } else {
            s.score += q.rewardAmount;
            s.stats.totalEarned += q.rewardAmount;
        }

        s.quests.completedCount++;
        s.quests.active.splice(index, 1);

        SK.audio.play('quest');
        SK.fx.toast({
            icon: def ? def.icon : '✅',
            title: `Görev tamam: ${def ? def.name : ''}`,
            body: q.reward === 'shard'
                ? `+${q.rewardAmount} Sigma Parçası`
                : `+${SK.formatNumber(q.rewardAmount)} Gyatt`,
            color: '#4ade80',
            ms: 4200
        });

        refill();
        SK.refreshDerived(s);
        SK.emit('quest:completed', { poolId: q.poolId });
        render(true);
    }

    function check() {
        const s = st();
        for (let i = s.quests.active.length - 1; i >= 0; i--) {
            if (progressOf(s.quests.active[i]) >= 1) complete(s.quests.active[i], i);
        }
    }

    /** Sıkıcı bir görevi elle atmak — küçük bir bedel karşılığı. */
    function reroll(index) {
        const s = st();
        const q = s.quests.active[index];
        if (!q) return;
        const taken = s.quests.active.map(x => x.poolId);
        s.quests.active[index] = rollNewQuest(taken);
        SK.audio.play('buy');
        render(true);
    }

    /* --------------------------------------------------------------- RENDER */

    let builtSignature = null;

    function render(force) {
        const list = SK.byId('quest-list');
        if (!list) return;

        const s = st();
        const signature = s.quests.active.map(q => q.poolId + q.tier).join('|');

        if (force || signature !== builtSignature) {
            builtSignature = signature;
            list.innerHTML = '';

            s.quests.active.forEach((q, i) => {
                const def = SK.QUEST_POOL.find(p => p.id === q.poolId);
                if (!def) return;

                const row = SK.el('div', 'quest-row');
                row.innerHTML = `
                    <div class="quest-icon">${def.icon}</div>
                    <div class="quest-body">
                        <div class="quest-title">${SK.escapeHTML(def.name)}</div>
                        <div class="quest-desc">${SK.escapeHTML(def.desc(q.target))}</div>
                        <div class="quest-bar"><div class="quest-fill" id="quest-fill-${i}"></div></div>
                        <div class="quest-foot">
                            <span id="quest-prog-${i}">0%</span>
                            <span class="quest-reward">${q.reward === 'shard'
                        ? `💠 ${q.rewardAmount}`
                        : `💰 ${SK.formatNumber(q.rewardAmount)}`}</span>
                        </div>
                    </div>
                    <button class="quest-reroll" data-index="${i}" title="Görevi değiştir">🔄</button>
                `;
                list.appendChild(row);
            });

            SK.$$('.quest-reroll', list).forEach(btn => {
                btn.addEventListener('click', () => reroll(parseInt(btn.dataset.index, 10)));
            });
        }

        s.quests.active.forEach((q, i) => {
            const pct = progressOf(q) * 100;
            SK.setStyle(SK.byId(`quest-fill-${i}`), 'width', pct.toFixed(1) + '%');
            SK.setText(SK.byId(`quest-prog-${i}`), pct.toFixed(0) + '%');
        });

        SK.setText(SK.byId('quest-completed'), String(s.quests.completedCount));
    }

    function init() {
        refill();
        render(true);
    }

    SK.quests = { init, check, render, refill, reroll };
})(window.SK);
