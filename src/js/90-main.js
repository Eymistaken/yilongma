/* =========================================================================
 * SKIBIDI CLICKER :: MAIN
 * Önyükleme sırası ve oyun döngüsü.
 * Üç ayrı ritim var: her kare (görsel), saniyede 10 (ekonomi), saniyede 1
 * (sistemler). Böylece ağır kontroller kare hızını düşürmez.
 * ========================================================================= */
(function (SK) {
    'use strict';

    let lastFrame = 0;
    let economyAccumulator = 0;
    let secondAccumulator = 0;
    let autosaveAccumulator = 0;
    let uiDirty = true;

    const ECONOMY_STEP = 0.1;   // saniye

    /* ---------------------------------------------------------- BOOTSTRAP */

    function boot() {
        const loaded = SK.loadGame();
        SK.state = loaded.state;

        // Eski sürümdeki gibi konsoldan kurcalamak isteyenler için.
        window.gameState = SK.state;

        SK.refreshDerived(SK.state);

        // Sıra önemli: UI paneli en son kurulur, çünkü açılışta her sistemin
        // render fonksiyonunu bir kez çağırıyor.
        SK.fx.init();
        SK.market.init();
        SK.production.init();
        SK.clicker.init();
        SK.slots.init();
        SK.blackMarket.init();
        SK.achievements.init();
        SK.quests.init();
        SK.prestige.init();
        SK.skitter.init();
        SK.yilong.init();
        SK.narrative.init();
        SK.ui.init();

        wireEvents();

        // Çevrimdışı kazanç kontrolü (kayıt kapalı olduğu için sıfırdan başlar)
        if (!loaded.fresh) {
            const report = SK.computeOffline(SK.state);
            if (report) SK.ui.showOfflineReport(report);
        }

        // Oturum sayacı her açılışta sıfırdan başlar (maraton başarımı için).
        SK.state.meta.sessionStart = Date.now();

        SK.ui.renderActivePanels(true);
        SK.ui.renderHeader();
        SK.yilong.render();

        lastFrame = performance.now();
        requestAnimationFrame(frame);

        console.log(`%c SKIBIDI CLICKER v${SK.VERSION} %c hazır`,
            'background:#00f0ff;color:#000;font-weight:bold',
            'color:#00f0ff');
    }

    function wireEvents() {
        SK.on('ui:dirty', () => { uiDirty = true; });
        SK.on('market:trade', () => { uiDirty = true; });
        SK.on('achievement:unlocked', () => { uiDirty = true; });

        // Çevrimdışı / sekme olayları
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden) {
                SK.state.meta.lastSave = Date.now();
            }
        });

        // Mobil slot modalini HTML'deki inline onclick çağırıyor.
        window.toggleMobileSlot = () => {
            const modal = SK.byId('mobile-slot-modal');
            modal.classList.toggle('hidden');
            modal.classList.toggle('flex');
        };
    }

    /* -------------------------------------------------------------- LOOP */

    function frame(now) {
        const dt = Math.min(0.25, (now - lastFrame) / 1000);  // sekme uyanınca sıçramayı kes
        lastFrame = now;

        economyAccumulator += dt;
        secondAccumulator += dt;

        while (economyAccumulator >= ECONOMY_STEP) {
            economyAccumulator -= ECONOMY_STEP;
            economyStep(ECONOMY_STEP);
        }

        if (secondAccumulator >= 1) {
            secondAccumulator -= 1;
            secondStep();
        }

        renderStep();
        SK.ui.tickFps();
        requestAnimationFrame(frame);
    }

    /** Ekonomi: saniyede 10 kez. Para kazanma ve servet hesabı burada. */
    function economyStep(dt) {
        const s = SK.state;

        SK.refreshDerived(s);
        SK.production.produce(dt);

        const wealth = s.score + SK.market.portfolioValue();
        s.totalWealth = isFinite(wealth) ? wealth : 0;
        if (s.totalWealth > s.stats.bestWealth) s.stats.bestWealth = s.totalWealth;

        if (s.score < 0 && s.stats.wentNegative === 0) s.stats.wentNegative = 1;

        SK.narrative.checkTransitions();
        uiDirty = true;
    }

    /** Sistemler: saniyede 1. Pahalı taramalar burada toplanır. */
    function secondStep() {
        const s = SK.state;

        s.stats.playTime++;
        s.stats.idleStreak++;

        SK.clicker.decayCombo();
        SK.clicker.checkFeverEnd();

        // Faz 3'te bu kutu Firewall'a dönüşüyor; diğer tüm fazlarda (Mimar Modu
        // dahil) rakip işlemeye devam etmeli, yoksa kutusu donup kalıyordu.
        if (s.phase !== 3) SK.yilong.tick();
        SK.skitter.tick();
        SK.achievements.check();
        SK.quests.check();

        SK.ui.renderActivePanels(false);
        uiDirty = true;
    }

    /** Görsel: her kare. Sadece ucuz metin/genişlik güncellemeleri. */
    function renderStep() {
        SK.clicker.renderComboBar();

        if (!uiDirty) return;
        uiDirty = false;

        const s = SK.state;
        SK.ui.renderHeader();
        SK.market.renderHoldings();

        if (s.phase === 3) SK.narrative.renderPhase3UI();
        else SK.yilong.render();
    }

    /* ---------------------------------------------------------------- GO */

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', boot);
    } else {
        boot();
    }
})(window.SK);
