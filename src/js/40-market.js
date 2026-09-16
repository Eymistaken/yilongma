/* =========================================================================
 * SKIBIDI CLICKER :: MARKET
 * Fiyat modeli (eğilim + rejim + ortalamaya dönüş + şok), alım/satım,
 * ortalama maliyet & realize kâr, limit emirleri ve piyasa olayları.
 * ========================================================================= */
(function (SK) {
    'use strict';

    const TICK_MS = 3000;
    const HISTORY_LEN = 24;

    const charts = {};          // key -> Chart örneği (kaydedilmez)
    let listEl = null;
    let tickTimer = null;

    const st = () => SK.state;
    const def = (key) => SK.ASSET_DEFS[key];
    const live = (key) => st().assets[key];

    /** Faz 3 "matrix" evreninde fiat silinir; silinmişleri atlıyoruz. */
    const isAlive = (key) => !!st().assets[key] && st().deletedAssets.indexOf(key) < 0;

    function aliveKeys() {
        return Object.keys(st().assets).filter(isAlive);
    }

    /* ---------------------------------------------------------- FİYAT MODELİ */

    /** Aktif olayın bu varlığa uyguladığı ek yüzde değişim. */
    function eventModifier(key) {
        const ev = st().market.event;
        if (!ev) return 0;
        const evDef = SK.MARKET_EVENTS.find(e => e.id === ev.id);
        if (!evDef) return 0;
        if (evDef.freeze) return 0;
        if (evDef.single) return ev.targetKey === key ? (evDef.mods.any || 0) : 0;
        return evDef.mods[def(key).type] || 0;
    }

    const isFrozen = () => {
        const ev = st().market.event;
        if (!ev) return false;
        const evDef = SK.MARKET_EVENTS.find(e => e.id === ev.id);
        return !!(evDef && evDef.freeze);
    };

    /** Boğa/ayı/yatay rejimleri; fiyatlara saf gürültüden fazlası katar. */
    function rollRegime(a) {
        if (a.regimeTicks > 0) { a.regimeTicks--; return; }
        const roll = Math.random();
        a.regimeDir = roll < 0.35 ? 1 : roll < 0.70 ? -1 : 0;
        a.regimeTicks = SK.randInt(8, 25);
    }

    function stepPrice(key) {
        const d = def(key);
        const a = live(key);
        const s = st();

        rollRegime(a);

        // Uzun vadeli çapa üstel olarak büyür; ortalamaya dönüş bu çapaya çeker.
        // Tavan şart: çok uzun oturumlarda exp(trend) sonsuza gidip fiyatları
        // NaN'a çeviriyordu.
        const alpha = 1 + (s.derived.alphaBonus || 0);
        a.trend = Math.min(80, (a.trend || 0) + d.drift * alpha);

        let vol = d.vol;
        // Faz 3 / matrix: kripto anarşisi — oynaklık patlar.
        if (s.phase === 3 && s.p3.universe === 'matrix' && d.type === 'crypto') vol *= 5;
        if (s.phase === 3 && s.p3.universe === 'red_rot') a.trend += 0.012; // hiperenflasyon

        const logGap = a.trend - Math.log(a.price / a.base);
        const revert = d.revert * logGap;
        const regime = a.regimeDir * vol * 0.30;
        const shock = vol * SK.gauss();
        const evMod = eventModifier(key);

        // Itô düzeltmesi. Yüzdesel değişimlerin bileşiği, log-uzayda vol²/2
        // kadar aşağı çeker ("oynaklık aşınması"). Düzeltmeden önce oynak
        // varlıklar bandın dibine yapışıyor, eğilim değerleri hiç
        // gerçekleşmiyordu: kripto tanımı gereği en hızlı büyüyen sınıf olduğu
        // halde pratikte en kötü yatırım oluyordu.
        const drag = 0.53 * vol * vol;

        let change = revert + regime + shock + evMod + drag;
        change = SK.clamp(change, -0.60, 0.80);

        a.price *= (1 + change);

        // Fiyatı çapasının etrafında bir bantta tut. Oynak varlıklarda geri
        // çekme kuvveti gürültünün yanında çok zayıf kalıyordu: fiyat binlerce
        // adım boyunca serbestçe sürükleniyor, tabana çakılıp sonra çapaya
        // dönerken astronomik bir sıçrama üretiyordu (dibinden alıp beklemek
        // her şeyi kıran bir istismara dönüşüyordu). Bant hem o yayı kırıyor
        // hem de oynaklığın uzun vadeli aşınmasını engelliyor.
        const band = SK.clamp(12 * d.vol, 1.2, 2.5);
        const logPrice = SK.clamp(Math.log(a.price / a.base), a.trend - band, a.trend + band);
        a.price = a.base * Math.exp(logPrice);

        const floor = Math.max(0.0001, a.base * 0.0005);
        if (a.price < floor) a.price = floor;
        if (!isFinite(a.price)) a.price = a.base;
    }

    /** Zafer pompası: oyun kazanıldığında portföy üstel büyür (orijinal davranış). */
    function victoryPump(key) {
        const a = live(key);
        if (a.count > 0) {
            a.price *= 1.25;
            SK.fx.popup('🚀', '#10b981', Math.random() * window.innerWidth, Math.random() * window.innerHeight);
        }
    }

    function tick() {
        const s = st();
        const keys = aliveKeys();

        if (!isFrozen()) {
            for (let i = 0; i < keys.length; i++) {
                if (s.buffs.victoryPump && s.phase !== 3) victoryPump(keys[i]);
                else stepPrice(keys[i]);
            }
        }

        for (let i = 0; i < keys.length; i++) {
            const a = live(keys[i]);
            a.history.push(a.price);
            while (a.history.length > HISTORY_LEN) a.history.shift();
        }

        checkOrders();
        tickEvents();
        SK.emit('market:tick');
        renderPrices();
    }

    /* ----------------------------------------------------------- PİYASA OLAYI */

    function tickEvents() {
        const s = st();
        const m = s.market;

        if (m.event) {
            // Süre duvar saatiyle değil tick sayısıyla ölçülür: arka plana
            // atılmış bir sekmede Date.now() sıçradığında olaylar anında
            // bitiyor ya da takılı kalıyordu.
            if (!isFinite(m.event.ticksLeft)) m.event.ticksLeft = 1;
            m.event.ticksLeft--;
            if (m.event.ticksLeft <= 0) {
                const evDef = SK.MARKET_EVENTS.find(e => e.id === m.event.id);
                m.event = null;
                m.eventCooldown = SK.randInt(60, 140) / (TICK_MS / 1000);
                SK.fx.hideBanner();
                if (evDef) {
                    SK.fx.toast({ icon: evDef.icon, title: evDef.name + ' sona erdi', color: evDef.color, ms: 3000 });
                }
                SK.emit('market:eventEnd');
            }
            return;
        }

        m.eventCooldown -= 1;
        if (m.eventCooldown > 0) return;
        if (s.phase >= 3) { m.eventCooldown = 30; return; }   // Faz 3'ün kendi kuralları var

        startRandomEvent();
    }

    function startRandomEvent() {
        const pool = SK.MARKET_EVENTS;
        const evDef = SK.weightedPick(pool, pool.map(e => e.weight));
        startEvent(evDef.id);
    }

    function startEvent(id) {
        const evDef = SK.MARKET_EVENTS.find(e => e.id === id);
        if (!evDef) return;

        let targetKey = null;
        if (evDef.single) {
            let candidates = aliveKeys();
            if (evDef.cryptoOnly) {
                const crypto = candidates.filter(k => def(k).type === 'crypto');
                if (crypto.length) candidates = crypto;
            }
            targetKey = SK.pick(candidates);
        }

        const ticks = Math.max(1, Math.round(evDef.duration * 1000 / TICK_MS));
        st().market.event = { id, ticksLeft: ticks, targetKey };

        const targetName = targetKey ? def(targetKey).name : null;
        SK.fx.banner({
            icon: evDef.icon,
            title: evDef.name + (targetName ? ` — ${targetName}` : ''),
            text: evDef.desc,
            color: evDef.color,
            seconds: evDef.duration
        });
        SK.audio.play('warning');
        SK.emit('skitter:post', {
            msg: evDef.skitt + (targetName ? ` (${targetName})` : ''),
            author: 'Skitter Analiz',
            highlight: true
        });
        SK.emit('market:eventStart', { id, targetKey });
    }

    /* ---------------------------------------------------------- ALIM/SATIM */

    const avgCost = (a) => (a.count > 0 ? a.cost / a.count : 0);

    function unrealized(key) {
        const a = live(key);
        if (!a || a.count <= 0) return 0;
        return a.count * a.price - a.cost;
    }

    function buy(key, qty) {
        if (!isAlive(key)) return false;
        const s = st();
        const a = live(key);
        qty = Math.floor(qty);
        if (qty <= 0) return false;

        const fee = s.derived.tradeFee || 0;
        const total = qty * a.price * (1 + fee);
        if (s.score < total) return false;

        s.score -= total;
        a.count += qty;
        a.cost += total;               // komisyon da maliyete girer
        s.stats.trades++;
        s.stats.totalSpent += total;

        SK.audio.play('buy');
        SK.emit('market:trade', { key, side: 'buy', qty, total });
        return true;
    }

    function maxBuyable(key) {
        const s = st();
        const a = live(key);
        if (!a) return 0;
        const unit = a.price * (1 + (s.derived.tradeFee || 0));
        if (unit <= 0) return 0;
        return Math.floor(s.score / unit);
    }

    function sell(key, qty) {
        if (!isAlive(key)) return false;
        const s = st();
        const a = live(key);
        qty = Math.min(Math.floor(qty), a.count);
        if (qty <= 0) return false;

        const fee = s.derived.tradeFee || 0;
        const proceeds = qty * a.price * (1 - fee);
        const basis = avgCost(a) * qty;

        s.score += proceeds;
        a.count -= qty;
        a.cost -= basis;
        if (a.count <= 0) { a.count = 0; a.cost = 0; }

        s.stats.trades++;
        s.stats.realizedProfit += (proceeds - basis);
        s.stats.totalEarned += Math.max(0, proceeds - basis);
        if (s.market.event) s.stats.eventSells++;

        SK.audio.play('sell');
        SK.emit('market:trade', { key, side: 'sell', qty, total: proceeds, pnl: proceeds - basis });
        return true;
    }

    /* ------------------------------------------------------------ PORTFÖY */

    function portfolioValue() {
        let total = 0;
        const keys = aliveKeys();
        for (let i = 0; i < keys.length; i++) {
            const a = live(keys[i]);
            total += a.count * a.price;
        }
        return total;
    }

    function portfolioSummary() {
        const rows = [];
        let value = 0;
        let basis = 0;
        const keys = aliveKeys();

        for (let i = 0; i < keys.length; i++) {
            const key = keys[i];
            const a = live(key);
            if (a.count <= 0) continue;
            const v = a.count * a.price;
            value += v;
            basis += a.cost;
            rows.push({
                key, name: def(key).name, color: def(key).color,
                count: a.count, price: a.price, value: v,
                avg: avgCost(a), pnl: v - a.cost,
                pnlPct: a.cost > 0 ? (v - a.cost) / a.cost : 0
            });
        }

        rows.sort((x, y) => y.value - x.value);
        rows.forEach(r => { r.weight = value > 0 ? r.value / value : 0; });
        return { rows, value, basis, pnl: value - basis, pnlPct: basis > 0 ? (value - basis) / basis : 0 };
    }

    /* ------------------------------------------------------- LİMİT EMİRLERİ */

    const MAX_ORDERS = 24;

    function placeOrder(key, side, price, qty) {
        const s = st();
        if (!isAlive(key)) return { ok: false, reason: 'Varlık işlem dışı.' };
        if (s.orders.length >= MAX_ORDERS) return { ok: false, reason: `En fazla ${MAX_ORDERS} emir.` };
        price = Number(price);
        qty = Math.floor(Number(qty));
        if (!isFinite(price) || price <= 0) return { ok: false, reason: 'Geçersiz fiyat.' };
        if (!isFinite(qty) || qty <= 0) return { ok: false, reason: 'Geçersiz adet.' };
        if (side === 'sell' && qty > live(key).count) return { ok: false, reason: 'Elinde o kadar yok.' };

        s.orders.push({ id: s.nextOrderId++, key, side, price, qty, created: Date.now() });
        s.stats.ordersPlaced++;
        SK.audio.play('buy');
        SK.emit('orders:changed');
        return { ok: true };
    }

    function cancelOrder(id) {
        const s = st();
        const i = s.orders.findIndex(o => o.id === id);
        if (i < 0) return false;
        s.orders.splice(i, 1);
        SK.emit('orders:changed');
        return true;
    }

    /**
     * Her fiyat adımında emirleri tarar. Alış emri fiyat hedefin altına
     * düşünce, satış emri üstüne çıkınca tetiklenir.
     */
    function checkOrders() {
        const s = st();
        if (!s.orders.length) return;
        const filled = [];

        for (let i = s.orders.length - 1; i >= 0; i--) {
            const o = s.orders[i];
            if (!isAlive(o.key)) { s.orders.splice(i, 1); continue; }
            const a = live(o.key);

            const hit = o.side === 'buy' ? a.price <= o.price : a.price >= o.price;
            if (!hit) continue;

            const ok = o.side === 'buy' ? buy(o.key, o.qty) : sell(o.key, o.qty);
            if (ok) {
                s.orders.splice(i, 1);
                s.stats.ordersFilled++;
                filled.push(o);
            } else if (o.side === 'buy') {
                // Para yetmedi: emri iptal etmiyoruz, fiyat tekrar gelirse dener.
                continue;
            } else {
                s.orders.splice(i, 1);
            }
        }

        filled.forEach(o => {
            SK.fx.toast({
                icon: o.side === 'buy' ? '🟢' : '🔴',
                title: `Emir gerçekleşti: ${def(o.key).name}`,
                body: `${o.side === 'buy' ? 'ALIŞ' : 'SATIŞ'} ${SK.formatNumber(o.qty)} @ ${SK.formatPrice(o.price)}`,
                color: o.side === 'buy' ? '#22c55e' : '#f43f5e',
                ms: 3200
            });
        });
        if (filled.length) SK.emit('orders:changed');
    }

    /* ------------------------------------------------------------ RENDERING */

    function assetCardHTML(key) {
        const d = def(key);
        const a = live(key);
        const typeClass = d.type === 'tech' ? 'bg-blue-500/20 text-blue-300'
            : d.type === 'fiat' ? 'bg-green-500/20 text-green-300'
                : d.type === 'metal' ? 'bg-yellow-500/20 text-yellow-300'
                    : 'bg-purple-500/20 text-purple-300';

        return `
            <summary class="p-3 md:p-4 cursor-pointer flex items-center justify-between hover:bg-white/5 transition-colors select-none">
                <div class="flex items-center gap-3 min-w-0">
                    <div class="w-10 h-10 shrink-0 rounded-lg bg-slate-800 flex items-center justify-center font-bold text-lg shadow-lg"
                         style="color:${d.color}; text-shadow:0 0 10px ${d.color}40;">${SK.escapeHTML(d.name.substring(0, 1))}</div>
                    <div class="text-left min-w-0">
                        <h3 class="font-bold text-slate-200 leading-tight flex items-center gap-2">
                            ${SK.escapeHTML(d.name)}
                            <span class="text-[9px] px-1.5 py-0.5 rounded ${typeClass} uppercase border border-white/10">${SK.ASSET_TYPE_LABEL[d.type]}</span>
                            <span class="regime-dot" id="regime-${key}"></span>
                        </h3>
                        <div class="text-xs text-slate-500 truncate">
                            Adet: <span id="count-${key}" class="text-slate-300 font-mono">0</span>
                            <span id="pnl-${key}" class="ml-2 font-mono"></span>
                        </div>
                    </div>
                </div>
                <div class="flex items-center gap-3 shrink-0">
                    <div class="text-right">
                        <div id="price-${key}" class="font-mono font-bold text-slate-300 transition-colors duration-500">${SK.formatPrice(a.price)}</div>
                        <div id="chg-${key}" class="text-[10px] font-mono text-slate-500"></div>
                    </div>
                    <div class="drag-handle opacity-50 hover:opacity-100 cursor-grab active:cursor-grabbing p-1 hidden md:block">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="12" r="1"></circle><circle cx="9" cy="5" r="1"></circle><circle cx="9" cy="19" r="1"></circle><circle cx="15" cy="12" r="1"></circle><circle cx="15" cy="5" r="1"></circle><circle cx="15" cy="19" r="1"></circle></svg>
                    </div>
                </div>
            </summary>

            <div class="p-3 md:p-4 bg-black/20 border-t border-white/5 space-y-3">
                <div class="h-24 w-full rounded-lg overflow-hidden bg-slate-900/50 relative border border-white/5">
                    <canvas id="chart-${key}"></canvas>
                </div>

                <div class="grid grid-cols-3 gap-2 text-[10px] font-mono bg-black/30 rounded-lg p-2 border border-white/5">
                    <div><span class="text-slate-500 block">ORT. MALİYET</span><span id="avg-${key}" class="text-slate-300">-</span></div>
                    <div><span class="text-slate-500 block">POZİSYON</span><span id="pos-${key}" class="text-slate-300">-</span></div>
                    <div><span class="text-slate-500 block">K/Z</span><span id="upnl-${key}" class="text-slate-300">-</span></div>
                </div>

                <div class="grid grid-cols-4 gap-2">
                    <button class="trade-btn bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-400 border border-emerald-500/30" data-action="buy" data-asset="${key}">AL</button>
                    <button class="trade-btn bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-400 border border-emerald-500/30" data-action="buy-all" data-asset="${key}">MAX</button>
                    <button class="trade-btn bg-rose-600/20 hover:bg-rose-600/40 text-rose-400 border border-rose-500/30" data-action="sell" data-asset="${key}">SAT</button>
                    <button class="trade-btn bg-rose-600/20 hover:bg-rose-600/40 text-rose-400 border border-rose-500/30" data-action="sell-all" data-asset="${key}">HEPSİ</button>
                </div>

                <details class="limit-order-box rounded-lg border border-white/5 bg-black/30">
                    <summary class="px-3 py-2 text-[11px] text-slate-400 cursor-pointer hover:text-slate-200">📋 Limit Emri Kur</summary>
                    <div class="p-3 pt-0 grid grid-cols-[1fr_1fr_auto_auto] gap-2 items-end">
                        <label class="text-[9px] text-slate-500 uppercase">Fiyat
                            <input type="number" step="any" min="0" id="lo-price-${key}" placeholder="${a.price.toFixed(2)}"
                                   class="limit-input" />
                        </label>
                        <label class="text-[9px] text-slate-500 uppercase">Adet
                            <input type="number" step="1" min="1" id="lo-qty-${key}" placeholder="1" class="limit-input" />
                        </label>
                        <button class="limit-btn bg-emerald-600/30 text-emerald-300 border-emerald-500/40" data-action="order-buy" data-asset="${key}">ALIŞ</button>
                        <button class="limit-btn bg-rose-600/30 text-rose-300 border-rose-500/40" data-action="order-sell" data-asset="${key}">SATIŞ</button>
                    </div>
                </details>
            </div>
        `;
    }

    function buildCard(key) {
        const box = SK.el('details', 'market-box glass-panel rounded-xl border border-white/5 overflow-hidden group transition-all duration-300');
        box.id = `market-${key}-container`;
        box.innerHTML = assetCardHTML(key);
        listEl.appendChild(box);

        // Grafik ilk açılışta değil, kart ilk kez genişletildiğinde kurulur —
        // 14 grafiği aynı anda kurmak açılışı gözle görülür yavaşlatıyordu.
        box.addEventListener('toggle', () => {
            if (box.open) {
                ensureChart(key);
                updateChart(key);
            }
        });
    }

    function ensureChart(key) {
        if (charts[key] || typeof Chart === 'undefined') return;
        const canvas = SK.byId(`chart-${key}`);
        if (!canvas) return;

        const d = def(key);
        const a = live(key);
        const ctx = canvas.getContext('2d');
        const gradient = ctx.createLinearGradient(0, 0, 0, 100);
        gradient.addColorStop(0, `${d.color}80`);
        gradient.addColorStop(1, 'transparent');

        charts[key] = new Chart(ctx, {
            type: 'line',
            data: {
                labels: a.history.map((_, i) => i),
                datasets: [{
                    data: a.history.slice(),
                    borderColor: d.color,
                    borderWidth: 2,
                    backgroundColor: gradient,
                    fill: true,
                    pointRadius: 0,
                    tension: 0.3
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false }, tooltip: { enabled: false } },
                scales: { x: { display: false }, y: { display: false } },
                animation: false,
                elements: { point: { radius: 0 } }
            }
        });
    }

    function updateChart(key) {
        const chart = charts[key];
        if (!chart) return;
        const a = live(key);
        chart.data.labels = a.history.map((_, i) => i);
        chart.data.datasets[0].data = a.history.slice();
        chart.update('none');
    }

    const REGIME_GLYPH = { '1': '▲', '-1': '▼', '0': '▬' };
    const REGIME_COLOR = { '1': '#22c55e', '-1': '#f43f5e', '0': '#64748b' };

    /** Fiyat kutucuklarını tazeler. Kapalı kartların grafiği güncellenmez. */
    function renderPrices() {
        const keys = aliveKeys();
        for (let i = 0; i < keys.length; i++) {
            const key = keys[i];
            const a = live(key);
            const prev = a.history[a.history.length - 2] || a.price;

            const priceEl = SK.byId(`price-${key}`);
            if (priceEl) {
                SK.setText(priceEl, SK.formatPrice(a.price));
                const cls = `font-mono font-bold transition-colors duration-500 ${a.price >= prev ? 'text-emerald-400' : 'text-rose-400'}`;
                if (priceEl.className !== cls) priceEl.className = cls;
            }

            const chgEl = SK.byId(`chg-${key}`);
            if (chgEl) {
                const pct = prev > 0 ? (a.price - prev) / prev : 0;
                SK.setText(chgEl, SK.formatPercent(pct));
                chgEl.style.color = pct >= 0 ? '#4ade80' : '#fb7185';
            }

            const dot = SK.byId(`regime-${key}`);
            if (dot) {
                SK.setText(dot, REGIME_GLYPH[String(a.regimeDir)]);
                dot.style.color = REGIME_COLOR[String(a.regimeDir)];
            }

            const container = SK.byId(`market-${key}-container`);
            if (container && container.open) updateChart(key);
        }
    }

    /** Sahiplik/K-Z alanları — her UI karesinde çağrılır. */
    function renderHoldings() {
        const keys = aliveKeys();
        for (let i = 0; i < keys.length; i++) {
            const key = keys[i];
            const a = live(key);

            SK.setText(SK.byId(`count-${key}`), SK.formatNumber(a.count));

            const pnl = unrealized(key);
            const pnlEl = SK.byId(`pnl-${key}`);
            if (pnlEl) {
                if (a.count > 0) {
                    SK.setText(pnlEl, (pnl >= 0 ? '+' : '') + SK.formatNumber(pnl));
                    pnlEl.style.color = pnl >= 0 ? '#4ade80' : '#fb7185';
                } else {
                    SK.setText(pnlEl, '');
                }
            }

            const container = SK.byId(`market-${key}-container`);
            if (!container || !container.open) continue;

            SK.setText(SK.byId(`avg-${key}`), a.count > 0 ? SK.formatPrice(avgCost(a)) : '-');
            SK.setText(SK.byId(`pos-${key}`), a.count > 0 ? SK.formatNumber(a.count * a.price) : '-');
            const upnlEl = SK.byId(`upnl-${key}`);
            if (upnlEl) {
                if (a.count > 0) {
                    const pct = a.cost > 0 ? pnl / a.cost : 0;
                    SK.setText(upnlEl, `${pnl >= 0 ? '+' : ''}${SK.formatNumber(pnl)} (${SK.formatPercent(pct)})`);
                    upnlEl.style.color = pnl >= 0 ? '#4ade80' : '#fb7185';
                } else {
                    SK.setText(upnlEl, '-');
                    upnlEl.style.color = '';
                }
            }
        }
    }

    /** Faz 3 matrix evreni fiat'ı yok eder; kartı ve emirleri de kaldırıyoruz. */
    function deleteAsset(key) {
        if (st().deletedAssets.indexOf(key) < 0) st().deletedAssets.push(key);
        const node = SK.byId(`market-${key}-container`);
        if (node) node.remove();
        if (charts[key]) { charts[key].destroy(); delete charts[key]; }
        st().orders = st().orders.filter(o => o.key !== key);
    }

    /* --------------------------------------------------------------- EVENTS */

    function onListClick(e) {
        const btn = e.target.closest('button');
        if (!btn || !btn.dataset.action) return;

        const key = btn.dataset.asset;
        const action = btn.dataset.action;
        if (!isAlive(key)) return;

        const qty = SK.state.ui.buyQty || 1;

        if (action === 'buy') {
            const n = qty === 'max' ? maxBuyable(key) : qty;
            if (!buy(key, n)) SK.audio.play('error');
        } else if (action === 'buy-all') {
            if (!buy(key, maxBuyable(key))) SK.audio.play('error');
        } else if (action === 'sell') {
            const n = qty === 'max' ? live(key).count : qty;
            if (!sell(key, n)) SK.audio.play('error');
        } else if (action === 'sell-all') {
            if (!sell(key, live(key).count)) SK.audio.play('error');
        } else if (action === 'order-buy' || action === 'order-sell') {
            const side = action === 'order-buy' ? 'buy' : 'sell';
            const priceInput = SK.byId(`lo-price-${key}`);
            const qtyInput = SK.byId(`lo-qty-${key}`);
            const res = placeOrder(key, side, priceInput.value, qtyInput.value || 1);
            if (res.ok) {
                priceInput.value = '';
                qtyInput.value = '';
                SK.fx.toast({ icon: '📋', title: 'Emir kuruldu', body: `${def(key).name} ${side === 'buy' ? 'ALIŞ' : 'SATIŞ'}`, color: '#38bdf8', ms: 2600 });
            } else {
                SK.audio.play('error');
                SK.fx.toast({ icon: '⛔', title: 'Emir reddedildi', body: res.reason, color: '#ef4444', ms: 3000 });
            }
        }

        SK.emit('ui:dirty');
    }

    /* ----------------------------------------------------------------- INIT */

    function init() {
        listEl = SK.byId('market-list-container');
        listEl.innerHTML = '';
        aliveKeys().forEach(buildCard);

        if (typeof Sortable !== 'undefined') {
            new Sortable(listEl, {
                animation: 200,
                handle: '.drag-handle',
                ghostClass: 'sortable-ghost',
                easing: 'cubic-bezier(1, 0, 0, 1)'
            });
        }

        listEl.addEventListener('click', onListClick);
        renderPrices();
        renderHoldings();

        clearInterval(tickTimer);
        tickTimer = setInterval(tick, TICK_MS);
    }

    SK.market = {
        init, tick, buy, sell, maxBuyable, placeOrder, cancelOrder,
        portfolioValue, portfolioSummary, unrealized, avgCost,
        renderHoldings, renderPrices, deleteAsset, aliveKeys, isAlive,
        startEvent, charts, TICK_MS
    };
})(window.SK);
