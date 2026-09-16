/* =========================================================================
 * SKIBIDI CLICKER :: STATE
 * Tek doğruluk kaynağı. Oyunun tamamı `SK.state` üzerinden okunur/yazılır.
 * Kayıt, yükleme, göç (migration) ve çevrimdışı ilerleme burada.
 * ========================================================================= */
(function (SK) {
    'use strict';

    const SAVE_KEY = 'skibidi_clicker_save_v4';
    const SAVE_VERSION = 4;

    /** Kaydedilmeyen, her açılışta yeniden hesaplanan alanlar. */
    const TRANSIENT_KEYS = ['derived', 'ui'];

    function defaultState() {
        const now = Date.now();

        const assets = {};
        for (const key in SK.ASSET_DEFS) {
            const def = SK.ASSET_DEFS[key];
            assets[key] = {
                price: def.price,
                base: def.price,
                count: 0,
                cost: 0,          // toplam ödenen bedel (ortalama maliyet için)
                history: new Array(24).fill(def.price),
                trend: 0,         // log-uzayda uzun vadeli çapa
                regimeDir: 0,     // -1 ayı / 0 yatay / +1 boğa
                regimeTicks: 0
            };
        }

        const upgrades = {};
        SK.UPGRADES.forEach(u => { upgrades[u.id] = u.startLevel; });

        const generators = {};
        SK.GENERATORS.forEach(g => { generators[g.id] = 0; });

        return {
            version: SAVE_VERSION,
            phase: 1,
            score: 0,
            totalWealth: 0,

            upgrades,
            generators,
            assets,
            deletedAssets: [],
            orders: [],
            nextOrderId: 1,

            market: {
                event: null,        // { id, ticksLeft, targetKey }
                eventCooldown: 90   // saniye
            },

            yilong: {
                cash: 5000000,
                holdings: {},       // key -> adet
                netWorth: 5000000,
                moodId: 'smug',
                heat: 0,            // 0..1, oyuncu önde gittikçe artar
                pending: null,      // { actionId, firesAt }
                nextActionIn: 45
            },

            blackMarketBuffs: [],
            blackMarketCost: 100000,

            prestige: {
                count: 0,
                shards: 0,
                totalShards: 0,
                skills: {}
            },

            achievements: [],

            quests: { active: [], completedCount: 0 },

            combo: { count: 0, lastClickAt: 0, feverUntil: 0 },

            buffs: {
                clickDebuffUntil: 0,
                generatorStunUntil: 0,
                insiderUntil: 0,
                victoryPump: false
            },

            settings: {
                volume: 0.7,
                muted: false,
                reducedMotion: false,
                particles: 'normal',   // off | low | normal | high
                numberFormat: 'short', // short | sci
                autosaveSeconds: 15,
                showFps: false,
                confirmAscend: true
            },

            stats: {
                clicks: 0,
                crits: 0,
                maxCombo: 0,
                feverCount: 0,
                totalEarned: 0,
                totalSpent: 0,
                generatorsBought: 0,
                trades: 0,
                realizedProfit: 0,
                ordersPlaced: 0,
                ordersFilled: 0,
                eventSells: 0,
                spins: 0,
                slotWins: 0,
                toiletJackpots: 0,
                seq789: 0,
                allInWins: 0,
                legendaryPulls: 0,
                sabotagesSurvived: 0,
                playTime: 0,
                idleStreak: 0,
                wentNegative: 0,
                bestWealth: 0
            },

            p3: {
                universe: null,
                firewallHealth: 100,
                exploitCost: 1000000000000,
                costInflation: 1,   // Red Rot hiperenflasyon katsayısı
                entropyTimer: 0
            },

            ending: null,   // 'red' | 'blue'

            meta: {
                gameStartTime: now,
                lastSave: now,
                createdAt: now
            },

            // --- çalışma zamanı (kaydedilmez) ---
            derived: {},
            ui: {}
        };
    }

    /* ------------------------------------------------------------ MIGRATION */

    /**
     * Eksik alanları varsayılandan tamamlar. Yeni bir özellik eklendiğinde
     * eski kayıtların çökmemesini bu sağlar.
     */
    function deepFill(target, template) {
        for (const key in template) {
            const tmpl = template[key];
            if (!(key in target) || target[key] === null || target[key] === undefined) {
                target[key] = Array.isArray(tmpl) ? tmpl.slice() : (tmpl && typeof tmpl === 'object' ? JSON.parse(JSON.stringify(tmpl)) : tmpl);
            } else if (tmpl && typeof tmpl === 'object' && !Array.isArray(tmpl) && typeof target[key] === 'object' && !Array.isArray(target[key])) {
                deepFill(target[key], tmpl);
            }
        }
        return target;
    }

    function migrate(raw) {
        const fresh = defaultState();
        if (!raw || typeof raw !== 'object') return fresh;

        // v4 öncesi kayıt formatı yok (oyun o zaman kayıt tutmuyordu) — yine de
        // ileride sürüm atlandığında buraya adım eklenebilir.
        const merged = deepFill(raw, fresh);
        merged.version = SAVE_VERSION;

        // Yeni eklenmiş varlıklar eski kayıtlarda yok; tabloyla senkronla.
        for (const key in SK.ASSET_DEFS) {
            if (!merged.assets[key]) {
                const def = SK.ASSET_DEFS[key];
                merged.assets[key] = {
                    price: def.price, base: def.price, count: 0, cost: 0,
                    history: new Array(24).fill(def.price), trend: 0, regimeDir: 0, regimeTicks: 0
                };
            }
        }
        // Tablodan kaldırılmış varlıkları kayıttan da at.
        for (const key in merged.assets) {
            if (!SK.ASSET_DEFS[key]) delete merged.assets[key];
        }
        // Sayı olması gereken alanlar bozuksa sıfırla (NaN yayılmasını önler).
        if (!isFinite(merged.score)) merged.score = 0;
        if (!isFinite(merged.yilong.cash)) merged.yilong.cash = 5000000;

        merged.derived = {};
        merged.ui = {};
        return merged;
    }

    /* -------------------------------------------------------- SERIALIZATION */

    function serialize(state) {
        const copy = {};
        for (const key in state) {
            if (TRANSIENT_KEYS.indexOf(key) >= 0) continue;
            copy[key] = state[key];
        }
        copy.meta = Object.assign({}, copy.meta, { lastSave: Date.now() });
        return JSON.stringify(copy);
    }

    let saveBlocked = false;

    function save(silent) {
        if (saveBlocked) return false;
        try {
            localStorage.setItem(SAVE_KEY, serialize(SK.state));
            SK.state.meta.lastSave = Date.now();
            if (!silent) SK.emit('save:done');
            return true;
        } catch (err) {
            console.warn('[SK] Kayıt başarısız:', err);
            SK.emit('save:failed', err);
            return false;
        }
    }

    function load() {
        let raw = null;
        try {
            raw = localStorage.getItem(SAVE_KEY);
        } catch (err) {
            // Gizli sekme / depolama kapalı — oyun kayıtsız çalışmaya devam eder.
            console.warn('[SK] localStorage okunamıyor, kayıtsız mod:', err);
            saveBlocked = true;
            return { state: defaultState(), fresh: true };
        }
        if (!raw) return { state: defaultState(), fresh: true };

        try {
            const parsed = JSON.parse(raw);
            return { state: migrate(parsed), fresh: false };
        } catch (err) {
            console.error('[SK] Kayıt bozuk, sıfırdan başlanıyor:', err);
            try { localStorage.setItem(SAVE_KEY + '_corrupt', raw); } catch (_) { /* yoksay */ }
            return { state: defaultState(), fresh: true };
        }
    }

    function wipe() {
        try { localStorage.removeItem(SAVE_KEY); } catch (_) { /* yoksay */ }
    }

    /* ------------------------------------------------------- EXPORT/IMPORT */

    /** Base64 metin — panoya kopyalanıp başka tarayıcıya taşınabilir. */
    function exportSave() {
        const json = serialize(SK.state);
        return btoa(unescape(encodeURIComponent(json)));
    }

    function importSave(text) {
        const json = decodeURIComponent(escape(atob(String(text).trim())));
        const parsed = JSON.parse(json);
        if (!parsed || typeof parsed !== 'object' || !parsed.stats) {
            throw new Error('Tanınmayan kayıt formatı');
        }
        return migrate(parsed);
    }

    /* ---------------------------------------------------- OFFLINE PROGRESS */

    /**
     * Sekme kapalıyken geçen süreyi ödüle çevirir. Tam verim vermez —
     * aksi halde oyunu açık bırakmanın anlamı kalmaz.
     */
    function computeOffline(state) {
        const elapsedMs = Date.now() - (state.meta.lastSave || Date.now());
        const elapsed = Math.floor(elapsedMs / 1000);
        if (elapsed < 60) return null;

        const skillLevel = state.prestige.skills.offline || 0;
        const rate = 0.5 + skillLevel * 0.10;                // %50 taban
        const capHours = 8 + skillLevel * 2;                 // 8 saat taban
        const capped = Math.min(elapsed, capHours * 3600);

        const cps = SK.computeCPS(state);
        const earned = cps * capped * rate;
        if (earned <= 0) return null;

        return {
            seconds: elapsed,
            cappedSeconds: capped,
            capped: elapsed > capped,
            rate,
            earned
        };
    }

    /* ---------------------------------------------------------------- INIT */

    SK.SAVE_KEY = SAVE_KEY;
    SK.defaultState = defaultState;
    SK.saveGame = save;
    SK.loadGame = load;
    SK.wipeSave = wipe;
    SK.exportSave = exportSave;
    SK.importSave = importSave;
    SK.computeOffline = computeOffline;
    SK.migrateState = migrate;
})(window.SK);
