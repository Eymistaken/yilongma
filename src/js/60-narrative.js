/* =========================================================================
 * SKIBIDI CLICKER :: NARRATIVE
 * Faz geçişleri ve son sekanslar. Orijinal hikâye (Devlet Vergisi → BSOD →
 * Çoklu Evren → Firewall → Kırmızı/Mavi Hap) olduğu gibi korundu, yeni
 * sistemlerle uyumlu hale getirildi.
 * ========================================================================= */
(function (SK) {
    'use strict';

    const st = () => SK.state;
    let p3Timer = null;
    let p2TaxTimer = null;

    /* ------------------------------------------------------- MESAJ KUTUSU */

    function showMessage(html, extraClass) {
        const box = SK.byId('message-box');
        const content = SK.byId('message-content-box');
        SK.setHTML(SK.byId('message-text'), html);
        if (extraClass) content.className += ' ' + extraClass;
        box.style.opacity = 1;
        box.style.pointerEvents = 'auto';
        content.style.transform = 'scale(1)';
    }

    function hideMessage() {
        const box = SK.byId('message-box');
        const content = SK.byId('message-content-box');
        box.style.opacity = 0;
        box.style.pointerEvents = 'none';
        content.style.transform = 'scale(0.9)';
    }

    /* ------------------------------------------------------------- FAZ 2 */

    function triggerPhase2() {
        const s = st();
        s.phase = 2;

        // 1) SERT SIFIRLAMA — varlıklar ve temel yükseltmeler gider.
        s.score = 10000;
        SK.UPGRADES.forEach(u => { s.upgrades[u.id] = u.startLevel; });
        s.upgrades.ppc = 10;                    // biraz güçlü başla
        SK.GENERATORS.forEach(g => { s.generators[g.id] = 0; });

        for (const key in s.assets) {
            const a = s.assets[key];
            a.count = 0;
            a.cost = 0;
            a.price = SK.ASSET_DEFS[key].price;
            a.trend = 0;
            a.history = new Array(24).fill(a.price);
        }
        s.orders = [];

        // 2) YILONG EVRİMİ — Sigma heykeli, 50M yeni sermaye.
        SK.yilong.evolve(2);

        document.body.style.background = 'linear-gradient(-45deg, #2a0a10, #450a1f, #1a0505, #000000)';
        SK.audio.play('phase');
        SK.fx.flash('rgba(220,38,38,0.4)', 700);
        SK.fx.shake(3, 900);

        showMessage(`
            <h2 class="text-4xl md:text-5xl font-black text-red-600 mb-6 tracking-tighter animate-pulse">⚠️ DEVLET VERGİSİ ⚠️</h2>
            <div class="text-7xl md:text-8xl mb-6 animate-bounce">🏛️</div>
            <p class="text-lg md:text-xl text-slate-300 mb-6 italic border-l-4 border-red-500 pl-4 py-2 bg-red-900/20">
                "Sen kiminle dans ettiğini bilmiyorsun..." <br>
                <span class="text-sm not-italic text-stone-400 mt-2 block">- Sigma Yilong</span>
            </p>
            <p class="text-sm text-slate-400 mb-6">
                Devlet ve Yilong işbirliği yaptı. Tüm varlıklarına el konuldu.<br>
                Geriye sadece <strong>10.000 Gyatt</strong> ve <strong>Kara Borsa</strong> erişimi kaldı.
            </p>
            <div class="bg-black/50 p-4 rounded-xl border border-red-500/30 space-y-2">
                <div>
                    <span class="text-red-400 font-mono text-xs">YENİ HEDEF:</span>
                    <span class="text-2xl font-black text-white block">${SK.formatNumber(SK.yilong.targetWealth())}</span>
                </div>
                <div class="text-[11px] text-slate-400 border-t border-white/10 pt-2">
                    🏴‍☠️ Kara Borsa açıldı · 🎰 Slot bahsi serbest · 🔱 Sigma Yükselişi kullanılabilir
                </div>
            </div>
        `, 'border-red-600 shadow-[0_0_50px_red] animate-bounce-short');

        SK.blackMarket.render();
        SK.slots.render();
        SK.production.updateGeneratorList();
        SK.production.updateUpgradeList();
        SK.market.renderHoldings();
        SK.refreshDerived(s);

        startPhase2Tax();
        SK.emit('phase:changed', { phase: 2 });
        SK.saveGame(true);
    }

    /** Faz 2 boyunca 60 saniyede bir servet vergisi kesilir. */
    function startPhase2Tax() {
        clearInterval(p2TaxTimer);
        p2TaxTimer = setInterval(() => {
            const s = st();
            if (s.phase !== 2 || s.buffs.victoryPump) return;

            const resist = s.derived.sabotageResist || 0;
            const amount = s.totalWealth * 0.15 * (1 - resist);
            s.score -= amount;
            s.yilong.cash += amount;
            SK.yilong.recomputeNetWorth();

            showMessage(`
                <h2 class="text-3xl font-black text-red-600 mb-4 animate-pulse">⚠️ VARLIK VERGİSİ</h2>
                <p class="text-slate-300">Yilong Ma'nın lobisi sayesinde varlık vergisi çıktı.</p>
                <p class="text-red-500 font-bold text-xl mt-4">-${SK.formatNumber(amount)} Gyatt</p>
                <p class="text-xs text-slate-500 mt-1">Hesabından çekildi ve Yilong'a aktarıldı.</p>
                ${resist > 0 ? `<p class="text-xs text-emerald-400 mt-2">🛡️ Vergi Kalkanı %${(resist * 100).toFixed(0)} hafifletti.</p>` : ''}
            `);
            SK.audio.play('warning');
            SK.emit('ui:dirty');
        }, 60000);
    }

    /* --------------------------------------------------------- FAZ 2 ZAFERİ */

    function triggerVictory() {
        const s = st();
        s.buffs.victoryPump = true;

        const avatar = SK.byId('yilong-avatar');
        SK.setHTML(avatar, '😭');
        SK.setText(SK.byId('yilong-name'), 'İFLAS ETMİŞ YILONG');

        document.body.style.background = 'linear-gradient(-45deg, #fcd34d, #059669, #fbbf24, #10b981)';
        document.body.style.backgroundSize = '400% 400%';
        SK.setText(SK.byId('skibidi-toilet'), '👑');

        for (const key in s.assets) s.assets[key].price *= 5;

        showMessage(`
            <h2 class="text-4xl md:text-5xl font-black text-yellow-400 mb-6 tracking-tighter animate-pulse">👑 PİYASANIN YENİ SAHİBİ SENSİN! 👑</h2>
            <p class="text-lg md:text-xl text-slate-300 mb-6">
                "Yilong Ma diz çöktü. Artık kuralları sen koyuyorsun."
            </p>
            <div class="text-7xl md:text-8xl mb-6 animate-bounce">🗿</div>
            <p class="text-sm text-slate-400 mb-8">Sonsuz servet ve güç senin elinde.</p>
            <button id="victory-continue" class="bg-yellow-500 hover:bg-yellow-400 text-black px-8 py-4 rounded-xl font-black text-xl shadow-[0_0_30px_rgba(234,179,8,0.5)] transition-all transform hover:scale-105">
                SONSUZ MODDA DEVAM ET
            </button>
        `);

        SK.audio.chord(['C4', 'E4', 'G4', 'C5', 'E5', 'G5', 'C6', 'E6'], '1n');
        SK.fx.flash('rgba(250,204,21,0.4)', 800);

        setTimeout(() => {
            const btn = SK.byId('victory-continue');
            if (btn) btn.addEventListener('click', triggerPhase3);
        }, 100);

        SK.emit('phase:victory');
    }

    /* ------------------------------------------------------------- FAZ 3 */

    function triggerPhase3() {
        const s = st();
        s.phase = 3;
        hideMessage();

        SK.byId('game-world').classList.add('hidden');
        SK.fx.hideBanner();

        const bsod = SK.byId('bsod-layer');
        bsod.classList.remove('hidden');
        bsod.classList.add('flex');

        SK.audio.corrupt();

        let percent = 0;
        const counter = setInterval(() => {
            percent = Math.min(100, percent + Math.floor(Math.random() * 5));
            SK.setText(SK.byId('bsod-percent'), String(percent));
        }, 500);

        setTimeout(() => {
            clearInterval(counter);
            bsod.classList.add('hidden');
            bsod.classList.remove('flex');
            SK.byId('blackout-layer').classList.remove('hidden');

            setTimeout(() => {
                // FAZ 3 İÇİN SIFIRLAMA
                s.score = 1000;
                SK.UPGRADES.forEach(u => { s.upgrades[u.id] = u.startLevel; });
                SK.GENERATORS.forEach(g => { s.generators[g.id] = 0; });
                for (const key in s.assets) {
                    const a = s.assets[key];
                    a.count = 0;
                    a.cost = 0;
                    a.price = SK.ASSET_DEFS[key].price;
                    a.trend = 0;
                }
                s.orders = [];
                s.buffs.victoryPump = false;
                SK.refreshDerived(s);

                SK.byId('blackout-layer').classList.add('hidden');

                applyPhase3Visuals();

                const modal = SK.byId('p3-multiverse-modal');
                modal.className += ' blink-fade-in';
                modal.style.opacity = 1;
                modal.style.pointerEvents = 'auto';

                SK.audio.play('reboot');
            }, 3000);
        }, 10000);

        SK.emit('phase:changed', { phase: 3 });
    }

    function applyPhase3Visuals() {
        const overlay = SK.el('div', 'crt-overlay');
        overlay.style.backgroundImage = 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noiseFilter\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.65\' numOctaves=\'3\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noiseFilter)\'/%3E%3C/svg%3E")';
        overlay.style.opacity = '0.05';
        overlay.style.mixBlendMode = 'overlay';
        document.body.appendChild(overlay);

        document.body.style.background = '#000';
        document.body.style.backgroundSize = '';
        document.body.style.filter = 'grayscale(100%) contrast(150%)';
        document.body.style.transition = 'filter 2s';

        const scanline = document.querySelector('.scanline-overlay');
        if (scanline) scanline.style.display = 'none';
    }

    /** Çoklu evren modalindeki üç butondan çağrılır. */
    function initPhase3(universe) {
        const s = st();
        s.p3.universe = universe;

        const modal = SK.byId('p3-multiverse-modal');
        modal.style.opacity = 0;
        modal.style.pointerEvents = 'none';

        SK.byId('game-world').classList.remove('hidden');

        if (universe === 'matrix') {
            ['tl', 'usd', 'eur'].forEach(k => SK.market.deleteAsset(k));
            SK.fx.popup('MOUSE HACKED', '#00ff00', window.innerWidth / 2, window.innerHeight / 2);
            SK.skitter.post('FIAT PROTOKOLÜ SİLİNDİ. Sadece kripto kaldı.', 'Sistem', true);
        } else if (universe === 'void') {
            SK.fx.popup('ENTROPY STARTED', '#ffffff', window.innerWidth / 2, window.innerHeight / 2);
            SK.skitter.post('ENTROPİ YÜKSELİYOR. Varlıkların silinmeye başladı.', 'Sistem', true);
        } else {
            SK.fx.popup('INFLATION STARTED', '#ff0000', window.innerWidth / 2, window.innerHeight / 2);
            SK.skitter.post('HİPERENFLASYON AKTİF. Nakit çürüyor.', 'Sistem', true);
        }

        startPhase3Loop();
        SK.emit('ui:dirty');
    }

    function startPhase3Loop() {
        clearInterval(p3Timer);
        p3Timer = setInterval(() => {
            const s = st();
            if (s.phase !== 3) return;

            // Firewall kendini onarır — saldırıya ara vermek pahalıya patlar.
            if (s.p3.firewallHealth < 100 && s.p3.firewallHealth > 0) {
                s.p3.firewallHealth = Math.min(100, s.p3.firewallHealth + 0.5);
            }

            if (s.p3.universe === 'red_rot') {
                // Nakit çürür, her şeyin fiyatı şişer. Enflasyon seviyeleri değil,
                // etkin maliyeti çarpan tek bir katsayı üzerinden uygulanıyor.
                s.score *= 0.99;
                s.p3.costInflation = (s.p3.costInflation || 1) * 1.023;
                s.p3.exploitCost *= 1.005;

            } else if (s.p3.universe === 'void') {
                if (SK.chance(0.1)) {
                    const keys = SK.market.aliveKeys().filter(k => s.assets[k].count > 0);
                    if (keys.length) {
                        const target = SK.pick(keys);
                        const a = s.assets[target];
                        const lost = Math.ceil(a.count * 0.1);
                        const basis = SK.market.avgCost(a) * lost;
                        a.count -= lost;
                        a.cost -= basis;
                        SK.fx.popup(`ENTROPY: ${SK.ASSET_DEFS[target].name} -${lost}`, '#ffffff', 120, 140);
                    }
                }
            }

            SK.emit('ui:dirty');
        }, 1000);
    }

    /** Faz 3'te Yilong kutusu Firewall göstergesine dönüşür. */
    function renderPhase3UI() {
        const s = st();
        SK.setHTML(SK.byId('yilong-avatar'), '🔥');
        SK.setText(SK.byId('yilong-name'), 'THE FIREWALL');
        SK.setText(SK.byId('yilong-mood'), `EVREN: ${(s.p3.universe || '—').toUpperCase()}`);

        const wealthEl = SK.byId('realtime-yilong-wealth');
        SK.setText(wealthEl, s.p3.firewallHealth.toFixed(1) + '%');
        if (wealthEl) wealthEl.style.color = '#ef4444';
        SK.setText(SK.byId('dynamic-target'), 'YOK ET');

        const progress = SK.byId('wealth-progress');
        SK.setStyle(progress, 'width', s.p3.firewallHealth + '%');
        if (progress) progress.style.background = 'linear-gradient(90deg, #ef4444, #f97316)';

        let btn = SK.byId('p3-exploit-btn');
        if (!btn) {
            btn = SK.el('button', 'upgrade-btn w-full bg-red-600 hover:bg-red-500 border-2 border-red-400 rounded-xl p-4 font-black text-white animate-pulse mt-2 mb-2');
            btn.id = 'p3-exploit-btn';
            btn.addEventListener('click', launchExploit);
            SK.byId('upgrades-list').prepend(btn);
        }
        SK.setHTML(btn, `LAUNCH EXPLOIT (Saldır) <br> <span class='text-[10px] font-mono'>Bedel: ${SK.formatNumber(s.p3.exploitCost)} · -5%</span>`);
        btn.disabled = s.score < s.p3.exploitCost;
        SK.toggleClass(btn, 'opacity-50', btn.disabled);
    }

    function launchExploit() {
        const s = st();
        if (s.score < s.p3.exploitCost) { SK.audio.play('error'); return; }

        s.score -= s.p3.exploitCost;
        s.p3.firewallHealth -= 5;
        SK.fx.popup('HIT! -5%', '#ff0000', window.innerWidth / 2, window.innerHeight / 2);
        SK.fx.shake(2, 300);
        SK.audio.play('sabotage');

        if (s.p3.firewallHealth <= 0) {
            s.p3.firewallHealth = 0;
            triggerEndingSequence();
        }
        SK.emit('ui:dirty');
    }

    /* ------------------------------------------------------------- FAZ 4 */

    function triggerEndingSequence() {
        clearInterval(p3Timer);
        clearInterval(p2TaxTimer);

        const modal = SK.byId('p4-ending-modal');
        modal.style.opacity = 1;
        modal.style.pointerEvents = 'auto';

        document.body.style.filter = 'invert(1) grayscale(100%)';
        setTimeout(() => { document.body.style.filter = 'grayscale(100%) contrast(150%)'; }, 500);

        SK.audio.play('ending');
        SK.emit('phase:changed', { phase: 4 });
    }

    async function playRedPillEnding() {
        const s = st();
        s.ending = 'red';
        s.phase = 4;
        SK.saveGame(true);

        const endingModal = SK.byId('p4-ending-modal');
        endingModal.style.opacity = 0;
        endingModal.style.pointerEvents = 'none';

        const credits = SK.byId('credits-screen');
        credits.classList.remove('hidden');
        credits.classList.add('flex');

        SK.audio.fadeOut(5);
        SK.byId('game-world').classList.add('hidden');

        const timeStr = SK.formatDuration(s.stats.playTime);

        const messages = [
            'Sonsuzluk arayışın...',
            'Milyarlarca Gyatt...',
            'Yilong Ma ile olan bitmek bilmez rekabetin...',
            'Hepsi bir yanılsamaydı.',
            'Sayılar ekranında parladı ve söndü.',
            'Hiçbir gerçek değeri yoktu.',
            `Toplam ${SK.formatNumber(s.stats.totalEarned)} Gyatt kazandın.`,
            `Farene ${SK.formatNumber(s.stats.clicks)} kez tıkladın.`,
            `${SK.formatNumber(s.stats.trades)} kez alıp sattın.`,
            `Hayatının ${timeStr}'sini bu ekrana verdin.`,
            'Peki elinde ne kaldı?',
            'Sadece bir boşluk.'
        ];

        const container = SK.byId('credits-content');

        for (let i = 0; i < messages.length; i++) {
            const node = SK.el('div', 'credit-msg text-xl md:text-3xl font-mono text-slate-300 tracking-wide w-full');
            node.textContent = messages[i];
            container.appendChild(node);
            setTimeout(() => node.classList.add('collapse'), 5000);
            await SK.sleep(3000);
        }

        await SK.sleep(4000);
        container.innerHTML = '';

        const finalEl = SK.el('div', 'credit-final-msg text-3xl md:text-5xl font-mono text-white tracking-widest font-black');
        finalEl.textContent = 'Simülasyon bitti. Artık dinlenebilirsin...';
        credits.appendChild(finalEl);

        await SK.sleep(8000);

        const flash = SK.byId('white-flash');
        flash.style.opacity = 1;

        await SK.sleep(1000);
        const voidScreen = SK.byId('pitch-black');
        voidScreen.classList.add('active');
        voidScreen.style.opacity = 1;

        await SK.sleep(100);
        flash.style.opacity = 0;
    }

    function playBluePillEnding() {
        const s = st();
        s.ending = 'blue';
        s.phase = 4;

        const endingModal = SK.byId('p4-ending-modal');
        endingModal.style.opacity = 0;
        endingModal.style.pointerEvents = 'none';

        document.body.style.filter = 'contrast(120%) hue-rotate(180deg)';
        document.body.style.background = 'linear-gradient(135deg, #001133, #000000)';

        const exploitBtn = SK.byId('p3-exploit-btn');
        if (exploitBtn) exploitBtn.remove();

        SK.audio.play('pill');
        renderDevConsole();
        SK.skitter.post('MİMAR MODU AKTİF. Simülasyonun kontrolü sende.', 'Sistem', true);
        SK.saveGame(true);
        SK.emit('ui:dirty');
    }

    /* --------------------------------------------------------- MİMAR MODU */

    function renderDevConsole() {
        if (SK.byId('dev-console-panel')) return;
        const host = SK.byId('left-panel-stack');
        if (!host) return;

        const panel = SK.el('div', 'dev-console-panel p-5 rounded-3xl relative overflow-hidden group border-t-4');
        panel.id = 'dev-console-panel';
        panel.style.borderTopColor = 'var(--neon-gold)';
        panel.innerHTML = `
            <div class="absolute inset-0 bg-blue-500/5 group-hover:bg-blue-500/10 transition-colors"></div>
            <h2 class="text-xl font-black mb-4 flex items-center gap-2 relative z-10 font-display" style="color: var(--neon-gold); text-shadow: 0 0 10px rgba(255,207,0,0.5);">
                👑 MİMAR MODU
            </h2>
            <div class="space-y-3 relative z-10">
                <div class="bg-black/50 p-2 rounded-lg border border-white/10">
                    <span class="text-[10px] text-slate-400 block mb-1">PİYASA KONTROLÜ</span>
                    <div class="flex gap-2">
                        <button id="btn-pump-all" class="dev-btn bg-green-600/30 hover:bg-green-500/50 text-green-400 border-green-500/50">PUMP ALL (x10)</button>
                        <button id="btn-crash-all" class="dev-btn bg-red-600/30 hover:bg-red-500/50 text-red-400 border-red-500/50">CRASH ALL (/10)</button>
                    </div>
                </div>
                <div class="bg-black/50 p-2 rounded-lg border border-white/10">
                    <span class="text-[10px] text-slate-400 block mb-1">YILONG KONTROLÜ</span>
                    <div class="flex gap-2">
                        <button id="btn-steal-yilong" class="dev-btn bg-purple-600/30 hover:bg-purple-500/50 text-purple-400 border-purple-500/50">STEAL 50%</button>
                        <button id="btn-donate-yilong" class="dev-btn bg-blue-600/30 hover:bg-blue-500/50 text-blue-400 border-blue-500/50">DONATE 1B</button>
                    </div>
                </div>
                <div class="bg-black/50 p-2 rounded-lg border border-white/10">
                    <span class="text-[10px] text-slate-400 block mb-1">HİLELER</span>
                    <button id="btn-infinite-rizz" class="dev-btn w-full bg-yellow-600/30 hover:bg-yellow-500/50 text-yellow-400 border-yellow-500/50 shadow-[0_0_10px_rgba(255,207,0,0.2)]">SONSUZ RIZZ (1M Tık Gücü)</button>
                </div>
            </div>
        `;
        host.appendChild(panel);

        SK.byId('btn-pump-all').addEventListener('click', () => {
            const s = st();
            SK.market.aliveKeys().forEach(k => { s.assets[k].price *= 10; });
            SK.fx.popup('PUMP IT! 🚀', '#4ade80', 150, 200);
            SK.audio.play('buy');
            SK.emit('ui:dirty');
        });

        SK.byId('btn-crash-all').addEventListener('click', () => {
            const s = st();
            SK.market.aliveKeys().forEach(k => {
                s.assets[k].price = Math.max(0.01, s.assets[k].price / 10);
            });
            SK.fx.popup('CRASH! 📉', '#ef4444', 150, 200);
            SK.audio.play('sell');
            SK.emit('ui:dirty');
        });

        SK.byId('btn-steal-yilong').addEventListener('click', () => {
            const s = st();
            const stolen = s.yilong.cash * 0.5;
            s.yilong.cash -= stolen;
            s.score += stolen;
            SK.yilong.recomputeNetWorth();
            SK.fx.popup(`STOLEN +${SK.formatNumber(stolen)}`, '#c084fc', 150, 300);
            SK.audio.play('achievement');
            SK.emit('ui:dirty');
        });

        SK.byId('btn-donate-yilong').addEventListener('click', () => {
            const s = st();
            const amount = 1e9;
            if (s.score < amount) { SK.fx.popup('YETERSİZ GYATT', '#ef4444', 150, 300); return; }
            s.score -= amount;
            s.yilong.cash += amount;
            SK.yilong.recomputeNetWorth();
            SK.fx.popup('CHARITY -1B', '#60a5fa', 150, 300);
            SK.audio.note('E4', '16n');
            SK.emit('ui:dirty');
        });

        SK.byId('btn-infinite-rizz').addEventListener('click', (e) => {
            st().upgrades.ppc = 1000000;
            SK.fx.popup('GOD MODE ON', '#facc15', window.innerWidth / 2, window.innerHeight / 2);
            SK.audio.chord(['C4', 'E4', 'G4', 'C5'], '2n');
            e.currentTarget.disabled = true;
            e.currentTarget.classList.add('opacity-50', 'grayscale');
            SK.refreshDerived(st());
            SK.emit('ui:dirty');
        });
    }

    /* ------------------------------------------------- GEÇİŞ KONTROLÜ */

    /** Ana döngüden çağrılır: hedef aşıldıysa faz ilerler. */
    function checkTransitions() {
        const s = st();
        if (s.phase >= 3) return;

        const target = SK.yilong.targetWealth();

        if (s.phase === 1 && s.totalWealth >= target) {
            triggerPhase2();
        } else if (s.phase === 2 && s.totalWealth >= target && !s.buffs.victoryPump) {
            triggerVictory();
        }
    }

    /** Kaydedilmiş oyun açıldığında faza uygun görsel/döngüleri geri kurar. */
    function restore() {
        const s = st();
        if (s.phase >= 2) {
            document.body.style.background = 'linear-gradient(-45deg, #2a0a10, #450a1f, #1a0505, #000000)';
            startPhase2Tax();
        }
        if (s.phase >= 3) {
            applyPhase3Visuals();
            if (s.p3.universe) startPhase3Loop();
        }
        if (s.ending === 'blue') {
            document.body.style.filter = 'contrast(120%) hue-rotate(180deg)';
            document.body.style.background = 'linear-gradient(135deg, #001133, #000000)';
            renderDevConsole();
        }
        if (s.buffs.victoryPump) {
            SK.setText(SK.byId('skibidi-toilet'), '👑');
        }
    }

    function init() {
        SK.byId('message-close').addEventListener('click', hideMessage);
        restore();
    }

    // Çoklu evren ve hap butonları HTML içinde inline onclick kullanıyor.
    window.initPhase3 = initPhase3;
    window.playRedPillEnding = playRedPillEnding;
    window.playBluePillEnding = playBluePillEnding;

    SK.narrative = {
        init, checkTransitions, renderPhase3UI, showMessage, hideMessage,
        triggerPhase2, triggerPhase3, triggerVictory, triggerEndingSequence,
        renderDevConsole, restore
    };
})(window.SK);
