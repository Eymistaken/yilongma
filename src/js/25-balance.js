/* =========================================================================
 * SKIBIDI CLICKER :: BALANCE
 * Ham durumdan türetilmiş değerleri hesaplar (tık gücü, CPS, kritik, ücretler).
 * Başka hiçbir modül bu formülleri kendi içinde tekrarlamaz.
 * ========================================================================= */
(function (SK) {
    'use strict';

    const skill = (s, id) => (s.prestige && s.prestige.skills[id]) || 0;
    const upg = (s, id) => (s.upgrades && s.upgrades[id]) || 0;

    /* ----------------------------------------------------- YÜKSELTME BEDELİ */

    /** Faz 3 "Red Rot" evreninde hiperenflasyon tüm bedelleri şişirir. */
    const costInflation = (s) => (s && s.p3 && s.p3.costInflation) || 1;

    function upgradeCost(def, level, s) {
        const inflation = costInflation(s || SK.state);
        return Math.floor(def.baseCost * Math.pow(def.growth, level - def.startLevel) * inflation);
    }

    function upgradeMaxed(def, level) {
        return def.maxLevel !== undefined && level - def.startLevel >= def.maxLevel;
    }

    /* ------------------------------------------------------- ÜRETİCİ BEDELİ */

    function generatorCost(def, owned) {
        return Math.floor(def.baseCost * Math.pow(SK.GENERATOR_COST_GROWTH, owned) * costInflation(SK.state));
    }

    /** N adet birden almanın toplam bedeli (geometrik seri). */
    function generatorBulkCost(def, owned, amount) {
        const r = SK.GENERATOR_COST_GROWTH;
        return Math.floor(def.baseCost * Math.pow(r, owned) * (Math.pow(r, amount) - 1) / (r - 1) * costInflation(SK.state));
    }

    /** Verilen bütçeyle kaç adet alınabilir. */
    function generatorMaxAffordable(def, owned, budget) {
        const r = SK.GENERATOR_COST_GROWTH;
        const unit = def.baseCost * Math.pow(r, owned) * costInflation(SK.state);
        if (budget < unit) return 0;
        const n = Math.log((budget * (r - 1)) / unit + 1) / Math.log(r);
        return Math.max(0, Math.floor(n));
    }

    /** Kilometre taşı ödülleri: her eşikte o üreticinin çıktısı ikiye katlanır. */
    function milestoneMultiplier(owned) {
        let mult = 1;
        for (let i = 0; i < SK.GENERATOR_MILESTONES.length; i++) {
            if (owned >= SK.GENERATOR_MILESTONES[i]) mult *= 2;
        }
        return mult;
    }

    function nextMilestone(owned) {
        for (let i = 0; i < SK.GENERATOR_MILESTONES.length; i++) {
            if (owned < SK.GENERATOR_MILESTONES[i]) return SK.GENERATOR_MILESTONES[i];
        }
        return null;
    }

    /* --------------------------------------------------------- YETENEK BEDELİ */

    function skillCost(def, level) {
        return Math.ceil(def.cost * Math.pow(def.growth, level));
    }

    /* ---------------------------------------------------------- ÇARPANLAR */

    function achievementBonus(s) {
        let sum = 0;
        for (let i = 0; i < SK.ACHIEVEMENTS.length; i++) {
            if (s.achievements.indexOf(SK.ACHIEVEMENTS[i].id) >= 0) sum += SK.ACHIEVEMENTS[i].reward;
        }
        return sum;
    }

    function blackMarketMultiplier(s) {
        let mult = 1;
        for (let i = 0; i < s.blackMarketBuffs.length; i++) {
            const item = SK.BLACK_MARKET_ITEMS.find(x => x.id === s.blackMarketBuffs[i]);
            if (item && item.mult) mult *= item.mult;
        }
        return mult;
    }

    /** Hem tık hem üretici kazancına uygulanan ortak çarpan. */
    function globalMultiplier(s) {
        return Math.pow(1.5, upg(s, 'multi'))
            * blackMarketMultiplier(s)
            * (1 + achievementBonus(s))
            * (1 + 0.02 * s.prestige.shards)
            * (1 + 0.12 * skill(s, 'eternal'));
    }

    function comboMultiplier(s) {
        // Her yığın +%1. Tavan yükseltmelerle büyür.
        return 1 + s.combo.count * 0.01;
    }

    const isFever = (s) => Date.now() < s.combo.feverUntil;
    const FEVER_MULT = 3;

    function clickDebuffFactor(s) {
        return Date.now() < s.buffs.clickDebuffUntil ? 0.5 : 1;
    }

    const generatorsStunned = (s) => Date.now() < s.buffs.generatorStunUntil;

    /* ------------------------------------------------------------ TÜRETİLEN */

    function computeClickGain(s) {
        const base = upg(s, 'ppc') * (1 + 0.25 * skill(s, 'genetics'));
        let gain = base * globalMultiplier(s) * comboMultiplier(s) * clickDebuffFactor(s);
        if (isFever(s)) gain *= FEVER_MULT;
        if (s.phase === 3 && s.p3.universe === 'matrix') gain = 0; // fare hacklendi
        return gain;
    }

    /** Ham üretici çıktısı (global çarpan hariç) — kilometre taşları dahil. */
    function rawGeneratorOutput(s) {
        let total = 0;
        for (let i = 0; i < SK.GENERATORS.length; i++) {
            const def = SK.GENERATORS[i];
            const owned = s.generators[def.id] || 0;
            if (owned > 0) total += owned * def.baseProd * milestoneMultiplier(owned);
        }
        return total * (1 + 0.08 * upg(s, 'synergy')) * (1 + 0.15 * skill(s, 'automation'));
    }

    function computeCPS(s) {
        if (generatorsStunned(s)) return 0;
        let cps = rawGeneratorOutput(s) * globalMultiplier(s);
        if (isFever(s)) cps *= FEVER_MULT;
        return cps;
    }

    /** Portföy değerinin saniyede kaçta kaçı nakde döner (Fanum Tax). */
    function passiveMarketRate(s) {
        return 0.001 * upg(s, 'tax');
    }

    function computeCritChance(s) {
        return Math.min(0.85, 0.05 + 0.015 * upg(s, 'crit') + 0.02 * skill(s, 'crit'));
    }

    function computeCritDamage(s) {
        return 3 + 0.5 * upg(s, 'critdmg') + 0.75 * skill(s, 'critdmg');
    }

    function computeComboCap(s) {
        return 100 + 20 * upg(s, 'combo') + 25 * skill(s, 'combo');
    }

    function computeComboWindow(s) {
        return 1500 + 200 * skill(s, 'combo');  // ms
    }

    function computeTradeFee(s) {
        return Math.max(0, 0.005 - 0.001 * skill(s, 'broker'));
    }

    const computeSabotageResist = (s) => Math.min(0.8, 0.12 * skill(s, 'shield'));
    const computeSlotBonus = (s) => 1 + 0.10 * skill(s, 'luck');
    const computeGachaLuck = (s) => 0.05 * skill(s, 'contraband');
    const computeAlphaBonus = (s) => 0.10 * skill(s, 'alpha');

    /* ------------------------------------------------------------- PRESTİJ */

    const ASCEND_REQUIREMENT = 1e11;   // 100B servet

    function shardsFor(bestWealth) {
        if (bestWealth < ASCEND_REQUIREMENT) return 0;
        return Math.floor(12 * Math.pow(bestWealth / 1e12, 0.4));
    }

    function canAscend(s) {
        return s.phase >= 2 && Math.max(s.totalWealth, s.stats.bestWealth) >= ASCEND_REQUIREMENT;
    }

    /* -------------------------------------------------------------- REFRESH */

    /**
     * Her karede bir kez çağrılır; sonuçlar `state.derived` içine yazılır ki
     * UI ve sistemler aynı sayıyı tekrar tekrar hesaplamasın.
     */
    function refreshDerived(s) {
        const d = s.derived;
        d.globalMult = globalMultiplier(s);
        d.clickGain = computeClickGain(s);
        d.cps = computeCPS(s);
        d.rawCps = rawGeneratorOutput(s);
        d.critChance = computeCritChance(s);
        d.critDamage = computeCritDamage(s);
        d.comboCap = computeComboCap(s);
        d.comboWindow = computeComboWindow(s);
        d.tradeFee = computeTradeFee(s);
        d.passiveRate = passiveMarketRate(s);
        d.sabotageResist = computeSabotageResist(s);
        d.slotBonus = computeSlotBonus(s);
        d.gachaLuck = computeGachaLuck(s);
        d.alphaBonus = computeAlphaBonus(s);
        d.achievementBonus = achievementBonus(s);
        d.fever = isFever(s);
        d.stunned = generatorsStunned(s);
        d.debuffed = Date.now() < s.buffs.clickDebuffUntil;
        d.pendingShards = shardsFor(Math.max(s.totalWealth, s.stats.bestWealth)) - s.prestige.totalShards;
        if (d.pendingShards < 0) d.pendingShards = 0;
        d.canAscend = canAscend(s);
        return d;
    }

    Object.assign(SK, {
        upgradeCost, upgradeMaxed,
        generatorCost, generatorBulkCost, generatorMaxAffordable, milestoneMultiplier, nextMilestone,
        skillCost,
        globalMultiplier, blackMarketMultiplier, achievementBonus, comboMultiplier,
        computeClickGain, computeCPS, rawGeneratorOutput, passiveMarketRate,
        computeCritChance, computeCritDamage, computeComboCap, computeComboWindow,
        computeTradeFee, computeSabotageResist, computeSlotBonus, computeGachaLuck, computeAlphaBonus,
        shardsFor, canAscend, refreshDerived,
        isFever, FEVER_MULT, ASCEND_REQUIREMENT
    });
})(window.SK);
