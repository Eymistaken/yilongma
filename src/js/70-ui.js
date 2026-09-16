/* =========================================================================
 * SKIBIDI CLICKER :: UI
 * Sekmeli paneller, üst göstergeler, modaller, ayarlar ve klavye kısayolları.
 * Oyun mantığı burada yaşamaz — sadece durumu ekrana çevirir.
 * ========================================================================= */
(function (SK) {
    'use strict';

    const st = () => SK.state;

    /* ------------------------------------------------------------- SEKMELER */

    const activeTab = { left: 'slots', right: 'upgrades' };

    function openPanel(side, name) {
        activeTab[side] = name;

        SK.$$(`[data-tabgroup="${side}"]`).forEach(btn => {
            SK.toggleClass(btn, 'tab-active', btn.dataset.tab === name);
        });
        SK.$$(`[data-panelgroup="${side}"]`).forEach(panel => {
            SK.toggleClass(panel, 'hidden', panel.dataset.panel !== name);
        });

        // Paneller gizliyken güncellenmiyor; açılınca bir kez tazeleyelim.
        renderActivePanels(true);
    }

    function initTabs() {
        SK.$$('[data-tabgroup]').forEach(btn => {
            btn.addEventListener('click', () => openPanel(btn.dataset.tabgroup, btn.dataset.tab));
        });
        openPanel('left', 'slots');
        openPanel('right', 'upgrades');
    }

    const isPanelOpen = (side, name) => activeTab[side] === name;

    /* --------------------------------------------------------- ÜST GÖSTERGE */

    let lastScore = 0;

    function renderHeader() {
        const s = st();
        const d = s.derived;

        SK.setText(SK.byId('score'), SK.formatNumber(s.score));
        SK.setText(SK.byId('total-wealth'), SK.formatNumber(s.totalWealth));
        SK.setText(SK.byId('stat-cps'), SK.formatNumber(d.cps) + '/sn');
        SK.setText(SK.byId('stat-click-gain'), SK.formatNumber(d.clickGain));

        const cpsCard = SK.byId('cps-card');
        SK.toggleClass(cpsCard, 'stat-stunned', !!d.stunned);
        SK.setText(SK.byId('cps-note'), d.stunned ? '🛰️ DDOS — üretim durdu' : '');

        SK.setText(SK.byId('stat-clicks'), SK.formatNumber(s.stats.clicks));
        SK.setText(SK.byId('stat-slot-win'), SK.formatNumber(s.stats.slotWins));
        SK.setText(SK.byId('stat-time'), SK.formatClock(s.stats.playTime));

        // Aktif etkiler rozet şeridi
        const badges = SK.byId('buff-strip');
        if (badges) {
            const parts = [];
            if (d.fever) parts.push(`<span class="buff-badge" style="--c:#ffcf00">🔥 FEVER x${SK.FEVER_MULT}</span>`);
            if (d.debuffed) parts.push('<span class="buff-badge" style="--c:#ef4444">🚫 KANSELLENDİ</span>');
            if (d.stunned) parts.push('<span class="buff-badge" style="--c:#8b5cf6">🛰️ DDOS</span>');
            if (Date.now() < s.buffs.insiderUntil) parts.push('<span class="buff-badge" style="--c:#a3e635">🤫 İÇERİDEN BİLGİ</span>');
            if (s.market.event) {
                const ev = SK.MARKET_EVENTS.find(e => e.id === s.market.event.id);
                if (ev) parts.push(`<span class="buff-badge" style="--c:${ev.color}">${ev.icon} ${SK.escapeHTML(ev.name)}</span>`);
            }
            SK.setHTML(badges, parts.join(''));
        }

        lastScore = s.score;
    }

    /* ------------------------------------------------------------- PORTFÖY */

    function renderPortfolio() {
        const box = SK.byId('portfolio-body');
        if (!box) return;

        const summary = SK.market.portfolioSummary();
        SK.setText(SK.byId('pf-value'), SK.formatNumber(summary.value));

        const pnlEl = SK.byId('pf-pnl');
        SK.setText(pnlEl, `${summary.pnl >= 0 ? '+' : ''}${SK.formatNumber(summary.pnl)} (${SK.formatPercent(summary.pnlPct)})`);
        if (pnlEl) pnlEl.style.color = summary.pnl >= 0 ? '#4ade80' : '#fb7185';

        SK.setText(SK.byId('pf-realized'), SK.formatNumber(st().stats.realizedProfit));
        SK.setText(SK.byId('pf-fee'), '%' + ((st().derived.tradeFee || 0) * 100).toFixed(2));

        if (!summary.rows.length) {
            SK.setHTML(box, '<p class="text-xs text-slate-500 text-center py-6">Portföyün boş. Borsadan varlık al.</p>');
            return;
        }

        const rows = summary.rows.map(r => `
            <div class="pf-row">
                <div class="pf-dot" style="background:${r.color}"></div>
                <div class="pf-name">
                    <span>${SK.escapeHTML(r.name)}</span>
                    <span class="pf-sub">${SK.formatNumber(r.count)} @ ${SK.formatPrice(r.avg)}</span>
                </div>
                <div class="pf-num">
                    <span>${SK.formatNumber(r.value)}</span>
                    <span class="pf-sub" style="color:${r.pnl >= 0 ? '#4ade80' : '#fb7185'}">${SK.formatPercent(r.pnlPct)}</span>
                </div>
            </div>
            <div class="pf-bar"><div class="pf-bar-fill" style="width:${(r.weight * 100).toFixed(1)}%; background:${r.color}"></div></div>
        `).join('');

        SK.setHTML(box, rows);
    }

    function renderOrders() {
        const box = SK.byId('orders-body');
        if (!box) return;

        const s = st();
        SK.setText(SK.byId('orders-count'), String(s.orders.length));

        if (!s.orders.length) {
            SK.setHTML(box, '<p class="text-xs text-slate-500 text-center py-4">Bekleyen emir yok. Borsada bir varlığı açıp "Limit Emri Kur" de.</p>');
            return;
        }

        const signature = s.orders.map(o => `${o.id}:${o.side}:${o.price}:${o.qty}`).join('|');
        if (box.dataset.signature === signature) return;
        box.dataset.signature = signature;

        SK.setHTML(box, s.orders.map(o => {
            const d = SK.ASSET_DEFS[o.key];
            return `
                <div class="order-row">
                    <span class="order-side ${o.side}">${o.side === 'buy' ? 'AL' : 'SAT'}</span>
                    <span class="order-name" style="color:${d.color}">${SK.escapeHTML(d.name)}</span>
                    <span class="order-detail">${SK.formatNumber(o.qty)} @ ${SK.formatPrice(o.price)}</span>
                    <button class="order-cancel" data-order="${o.id}" title="İptal et">✕</button>
                </div>
            `;
        }).join(''));

        SK.$$('.order-cancel', box).forEach(btn => {
            btn.addEventListener('click', () => {
                SK.market.cancelOrder(parseInt(btn.dataset.order, 10));
                box.dataset.signature = '';
                renderOrders();
            });
        });
    }

    /* ------------------------------------------------------- İSTATİSTİKLER */

    function renderStats() {
        const box = SK.byId('stats-body');
        if (!box) return;

        const s = st();
        const d = s.derived;

        const groups = [
            ['Kazanç', [
                ['Tık başına', SK.formatNumber(d.clickGain)],
                ['Saniyede (CPS)', SK.formatNumber(d.cps)],
                ['Global çarpan', 'x' + SK.formatNumber(d.globalMult, 2)],
                ['Başarım bonusu', '+%' + (d.achievementBonus * 100).toFixed(0)],
                ['Parça bonusu', '+%' + (s.prestige.shards * 2).toFixed(0)],
                ['Toplam kazanılan', SK.formatNumber(s.stats.totalEarned)]
            ]],
            ['Tıklama', [
                ['Toplam tık', SK.formatNumber(s.stats.clicks)],
                ['Kritik vuruş', SK.formatNumber(s.stats.crits)],
                ['Kritik şans', '%' + (d.critChance * 100).toFixed(1)],
                ['Kritik hasar', 'x' + d.critDamage.toFixed(2)],
                ['En yüksek kombo', String(s.stats.maxCombo)],
                ['FEVER sayısı', String(s.stats.feverCount)]
            ]],
            ['Piyasa', [
                ['İşlem sayısı', SK.formatNumber(s.stats.trades)],
                ['Realize kâr', SK.formatNumber(s.stats.realizedProfit)],
                ['Komisyon', '%' + (d.tradeFee * 100).toFixed(2)],
                ['Kurulan emir', SK.formatNumber(s.stats.ordersPlaced)],
                ['Gerçekleşen emir', SK.formatNumber(s.stats.ordersFilled)],
                ['Pasif piyasa geliri', '%' + (d.passiveRate * 100).toFixed(2) + '/sn']
            ]],
            ['Kumar & Kasa', [
                ['Slot çevirişi', SK.formatNumber(s.stats.spins)],
                ['Slot kazancı', SK.formatNumber(s.stats.slotWins)],
                ['Tuvalet jackpot', String(s.stats.toiletJackpots)],
                ['Efsanevi çekiliş', String(s.stats.legendaryPulls)],
                ['Kara borsa eşyası', String(s.blackMarketBuffs.length)]
            ]],
            ['Rekabet & Meta', [
                ['Yilong serveti', SK.formatNumber(s.yilong.netWorth)],
                ['Atlatılan sabotaj', String(s.stats.sabotagesSurvived)],
                ['Sabotaj direnci', '%' + (d.sabotageResist * 100).toFixed(0)],
                ['Yükseliş sayısı', String(s.prestige.count)],
                ['Sigma Parçası', `${s.prestige.shards} / ${s.prestige.totalShards}`],
                ['Tamamlanan görev', String(s.quests.completedCount)],
                ['En yüksek servet', SK.formatNumber(s.stats.bestWealth)],
                ['Oynama süresi', SK.formatDuration(s.stats.playTime)]
            ]]
        ];

        SK.setHTML(box, groups.map(([title, rows]) => `
            <div class="stat-group">
                <h4>${title}</h4>
                ${rows.map(([k, v]) => `<div class="stat-line"><span>${k}</span><span>${v}</span></div>`).join('')}
            </div>
        `).join(''));
    }

    /* ------------------------------------------------------------- MODALLER */

    function openModal(id) {
        const modal = SK.byId(`modal-${id}`);
        if (!modal) return;
        modal.classList.remove('hidden');
        modal.classList.add('flex');
        if (id === 'achievements') SK.achievements.renderGallery();
        if (id === 'settings') syncSettingsForm();
    }

    function closeModal(id) {
        const modal = SK.byId(`modal-${id}`);
        if (!modal) return;
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }

    function closeAllModals() {
        SK.$$('.sk-modal').forEach(m => {
            m.classList.add('hidden');
            m.classList.remove('flex');
        });
    }

    /** Genel amaçlı onay penceresi. */
    function confirm(opts) {
        const modal = SK.byId('modal-confirm');
        SK.setHTML(SK.byId('confirm-icon'), opts.icon || '❓');
        SK.setText(SK.byId('confirm-title'), opts.title || 'Emin misin?');
        SK.setHTML(SK.byId('confirm-body'), opts.body || '');
        SK.setText(SK.byId('confirm-ok'), opts.confirmText || 'ONAYLA');

        const ok = SK.byId('confirm-ok');
        const cancel = SK.byId('confirm-cancel');

        // Her açılışta dinleyiciyi tazeliyoruz ki eski geri çağrı kalmasın.
        const okClone = ok.cloneNode(true);
        ok.parentNode.replaceChild(okClone, ok);
        const cancelClone = cancel.cloneNode(true);
        cancel.parentNode.replaceChild(cancelClone, cancel);

        okClone.addEventListener('click', () => {
            closeModal('confirm');
            if (opts.onConfirm) opts.onConfirm();
        });
        cancelClone.addEventListener('click', () => closeModal('confirm'));

        openModal('confirm');
    }

    /* ------------------------------------------------------- ÇEVRİMDIŞI */

    function showOfflineReport(report) {
        const s = st();
        s.score += report.earned;
        s.stats.totalEarned += report.earned;

        SK.setHTML(SK.byId('offline-body'), `
            <p class="text-slate-300 mb-4">
                <strong>${SK.formatDuration(report.seconds)}</strong> boyunca yoktun.
                Üreticilerin senin yerine çalıştı.
            </p>
            <div class="offline-amount">+${SK.formatNumber(report.earned)}</div>
            <p class="text-xs text-slate-500 mt-3">
                Çevrimdışı verim: %${(report.rate * 100).toFixed(0)}
                ${report.capped ? `· ⏱️ ${SK.formatDuration(report.cappedSeconds)} ile sınırlandı` : ''}
            </p>
            <p class="text-xs mt-4 px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-slate-400">
                ${SK.escapeHTML(SK.pick(SK.WELCOME_TIPS))}
            </p>
        `);
        openModal('offline');
    }

    /* --------------------------------------------------------------- AYARLAR */

    function syncSettingsForm() {
        const s = st().settings;
        SK.byId('set-volume').value = Math.round(s.volume * 100);
        SK.byId('set-muted').checked = s.muted;
        SK.byId('set-motion').checked = s.reducedMotion;
        SK.byId('set-particles').value = s.particles;
        SK.byId('set-format').value = s.numberFormat;
        SK.byId('set-autosave').value = String(s.autosaveSeconds);
        SK.byId('set-fps').checked = s.showFps;
        SK.byId('set-confirm-ascend').checked = s.confirmAscend;
        SK.setText(SK.byId('set-volume-label'), Math.round(s.volume * 100) + '%');
    }

    function applySettings() {
        const s = st().settings;
        SK.audio.applyVolume();
        SK.toggleClass(document.body, 'reduced-motion', s.reducedMotion);
        SK.toggleClass(SK.byId('fps-meter'), 'hidden', !s.showFps);
    }

    function bindSettings() {
        const s = () => st().settings;

        SK.byId('set-volume').addEventListener('input', (e) => {
            s().volume = Number(e.target.value) / 100;
            SK.setText(SK.byId('set-volume-label'), e.target.value + '%');
            SK.audio.applyVolume();
        });
        SK.byId('set-muted').addEventListener('change', (e) => {
            s().muted = e.target.checked;
            SK.audio.applyVolume();
        });
        SK.byId('set-motion').addEventListener('change', (e) => {
            s().reducedMotion = e.target.checked;
            applySettings();
        });
        SK.byId('set-particles').addEventListener('change', (e) => { s().particles = e.target.value; });
        SK.byId('set-format').addEventListener('change', (e) => { s().numberFormat = e.target.value; });
        SK.byId('set-autosave').addEventListener('change', (e) => { s().autosaveSeconds = Number(e.target.value); });
        SK.byId('set-fps').addEventListener('change', (e) => {
            s().showFps = e.target.checked;
            applySettings();
        });
        SK.byId('set-confirm-ascend').addEventListener('change', (e) => { s().confirmAscend = e.target.checked; });

        SK.byId('btn-save-now').addEventListener('click', () => {
            const ok = SK.saveGame();
            SK.fx.toast({
                icon: ok ? '💾' : '⛔',
                title: ok ? 'Kaydedildi' : 'Kayıt başarısız',
                body: ok ? '' : 'Tarayıcı depolaması engelli olabilir.',
                color: ok ? '#4ade80' : '#ef4444', ms: 2600
            });
        });

        SK.byId('btn-export').addEventListener('click', async () => {
            const text = SK.exportSave();
            const area = SK.byId('save-textarea');
            area.value = text;
            area.select();
            let copied = false;
            try {
                await navigator.clipboard.writeText(text);
                copied = true;
            } catch (_) {
                // Pano izni yoksa metin zaten seçili; kullanıcı elle kopyalar.
            }
            SK.fx.toast({
                icon: '📤', title: copied ? 'Panoya kopyalandı' : 'Kayıt kutuya yazıldı',
                body: copied ? '' : 'Metni elle kopyalayabilirsin.', color: '#38bdf8', ms: 3200
            });
        });

        SK.byId('btn-import').addEventListener('click', () => {
            const text = SK.byId('save-textarea').value.trim();
            if (!text) {
                SK.fx.toast({ icon: '⛔', title: 'Kutu boş', body: 'Önce kayıt metnini yapıştır.', color: '#ef4444', ms: 3000 });
                return;
            }
            confirm({
                icon: '📥', title: 'Kaydı içe aktar',
                body: 'Mevcut ilerlemen tamamen değiştirilecek. Devam edilsin mi?',
                confirmText: 'İÇE AKTAR',
                onConfirm: () => {
                    try {
                        const next = SK.importSave(text);
                        SK.state = window.gameState = next;
                        SK.saveGame(true);
                        location.reload();
                    } catch (err) {
                        console.error('[SK] İçe aktarma hatası:', err);
                        SK.fx.toast({ icon: '⛔', title: 'Geçersiz kayıt', body: String(err.message || err), color: '#ef4444', ms: 4200 });
                    }
                }
            });
        });

        SK.byId('btn-hard-reset').addEventListener('click', () => {
            confirm({
                icon: '💀', title: 'Her şeyi sıfırla',
                body: 'Başarımlar, Sigma Parçaları, yetenekler ve tüm ilerleme <strong>kalıcı olarak</strong> silinir. Bu işlem geri alınamaz.',
                confirmText: 'HEPSİNİ SİL',
                onConfirm: () => {
                    SK.wipeSave();
                    location.reload();
                }
            });
        });
    }

    /* ---------------------------------------------------- MİKTAR SEÇİCİLER */

    function bindQuantityPickers() {
        SK.$$('[data-qty]').forEach(btn => {
            btn.addEventListener('click', () => {
                const raw = btn.dataset.qty;
                const value = raw === 'max' ? 'max' : parseInt(raw, 10);
                const group = btn.dataset.qtygroup;

                if (group === 'trade') st().ui.buyQty = value;
                else st().ui.genBuyMode = value;

                SK.$$(`[data-qtygroup="${group}"]`).forEach(b => {
                    SK.toggleClass(b, 'qty-active', b === btn);
                });
                SK.production.updateGeneratorList();
            });
        });
    }

    /* --------------------------------------------------------- KISAYOLLAR */

    function bindShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Bir metin kutusuna yazarken kısayollar devreye girmemeli.
            const tag = (e.target.tagName || '').toLowerCase();
            if (tag === 'input' || tag === 'textarea' || tag === 'select') {
                if (e.key === 'Escape') e.target.blur();
                return;
            }

            switch (e.key) {
                case 'Escape':
                    closeAllModals();
                    SK.narrative.hideMessage();
                    break;
                case '1': openPanel('left', 'slots'); break;
                case '2': openPanel('left', 'portfolio'); break;
                case '3': openPanel('left', 'quests'); break;
                case '4': openPanel('left', 'stats'); break;
                case 'q': case 'Q': openPanel('right', 'upgrades'); break;
                case 'w': case 'W': openPanel('right', 'generators'); break;
                case 'e': case 'E': openPanel('right', 'skills'); break;
                case 'r': case 'R': openPanel('right', 'market'); break;
                case 'a': case 'A': openModal('achievements'); break;
                case 's': case 'S': openModal('settings'); break;
                case 'h': case 'H': case '?': openModal('help'); break;
                case 'm': case 'M':
                    st().settings.muted = !st().settings.muted;
                    SK.audio.applyVolume();
                    SK.fx.toast({ icon: st().settings.muted ? '🔇' : '🔊', title: st().settings.muted ? 'Ses kapalı' : 'Ses açık', ms: 1600 });
                    break;
                case ' ':
                    if (document.activeElement === document.body) {
                        e.preventDefault();
                        SK.clicker.doClick(null);
                    }
                    break;
                default: break;
            }
        });
    }

    /* ----------------------------------------------------------- FPS METRE */

    let frames = 0;
    let fpsLast = performance.now();

    function tickFps() {
        frames++;
        const now = performance.now();
        if (now - fpsLast >= 1000) {
            if (st().settings.showFps) {
                SK.setText(SK.byId('fps-meter'), `${frames} FPS`);
            }
            frames = 0;
            fpsLast = now;
        }
    }

    /* ----------------------------------------------------- PANEL YENİLEME */

    /** Sadece görünür paneller çizilir — kapalı sekmeler CPU yakmaz. */
    function renderActivePanels(force) {
        if (isPanelOpen('left', 'portfolio') || force) { renderPortfolio(); renderOrders(); }
        if (isPanelOpen('left', 'quests') || force) SK.quests.render();
        if (isPanelOpen('left', 'stats') || force) renderStats();
        if (isPanelOpen('left', 'slots') || force) SK.slots.render();

        if (isPanelOpen('right', 'upgrades') || force) SK.production.updateUpgradeList();
        if (isPanelOpen('right', 'generators') || force) SK.production.updateGeneratorList();
        if (isPanelOpen('right', 'skills') || force) {
            SK.prestige.renderSkills();
            SK.prestige.renderAscendPanel();
        }
        if (isPanelOpen('right', 'market') || force) SK.blackMarket.render();
    }

    /* ----------------------------------------------------------------- INIT */

    function init() {
        st().ui.buyQty = 1;
        st().ui.genBuyMode = 1;

        initTabs();
        bindSettings();
        bindQuantityPickers();
        bindShortcuts();
        applySettings();

        SK.$$('[data-openmodal]').forEach(btn => {
            btn.addEventListener('click', () => openModal(btn.dataset.openmodal));
        });
        SK.$$('[data-closemodal]').forEach(btn => {
            btn.addEventListener('click', () => closeModal(btn.dataset.closemodal));
        });
        // Karartılmış arka plana tıklayınca kapansın.
        SK.$$('.sk-modal').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) modal.classList.add('hidden');
            });
        });

        // Mobil alt gezinme: ilgili bölüme kaydır ve sekmeyi aç.
        SK.$$('[data-jump]').forEach(btn => {
            btn.addEventListener('click', () => {
                const [target, side, tab] = btn.dataset.jump.split(':');
                if (side && tab) openPanel(side, tab);
                const node = SK.byId(target);
                if (node) node.scrollIntoView({ behavior: st().settings.reducedMotion ? 'auto' : 'smooth', block: 'start' });
            });
        });

        SK.byId('modal-close-offline').addEventListener('click', () => closeModal('offline'));

        // Geliştirici kısayolu: fazları hızlıca test etmek için.
        const dev = SK.byId('dev-skip-btn');
        if (dev) {
            dev.addEventListener('click', () => {
                const s = st();
                s.score += 1e12;
                s.upgrades.ppc += 1000000;
                SK.refreshDerived(s);
                SK.fx.popup('DEV: +1T GYATT', '#ef4444', window.innerWidth / 2, 160);
                SK.emit('ui:dirty');
            });
        }
    }

    SK.ui = {
        init, openPanel, openModal, closeModal, closeAllModals, confirm,
        renderHeader, renderActivePanels, renderPortfolio, renderOrders, renderStats,
        showOfflineReport, applySettings, tickFps, isPanelOpen
    };
})(window.SK);
