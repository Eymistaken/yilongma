/* =========================================================================
 * SKIBIDI CLICKER :: ACHIEVEMENTS
 * Her başarım tüm Gyatt kazançlarına kalıcı bir yüzde ekler, yani
 * koleksiyon yapmak sadece kozmetik değil gerçek bir ilerleme hattı.
 * ========================================================================= */
(function (SK) {
    'use strict';

    const st = () => SK.state;
    const has = (id) => st().achievements.indexOf(id) >= 0;

    /** Her saniye taranır; koşul fonksiyonları ucuz tutulmalı. */
    function check() {
        const s = st();
        for (let i = 0; i < SK.ACHIEVEMENTS.length; i++) {
            const a = SK.ACHIEVEMENTS[i];
            if (has(a.id)) continue;

            let ok = false;
            try {
                ok = !!a.check(s);
            } catch (err) {
                // Bozuk bir koşul tüm taramayı durdurmasın.
                console.warn(`[SK] Başarım koşulu hata verdi: ${a.id}`, err);
            }
            if (ok) unlock(a);
        }
    }

    function unlock(a) {
        const s = st();
        if (has(a.id)) return;
        s.achievements.push(a.id);

        SK.audio.play('achievement');
        SK.fx.toast({
            icon: a.icon,
            title: `Başarım: ${a.name}`,
            body: `${a.desc} · +%${(a.reward * 100).toFixed(0)} tüm kazançlar`,
            color: a.secret ? '#c084fc' : '#facc15',
            ms: 4600,
            onClick: () => SK.ui.openModal('achievements')
        });
        SK.refreshDerived(s);
        SK.emit('achievement:unlocked', { id: a.id });
        renderGallery();
    }

    /* --------------------------------------------------------------- GALERİ */

    function renderGallery() {
        const grid = SK.byId('achievement-grid');
        if (!grid) return;

        const s = st();
        const unlockedCount = s.achievements.length;
        SK.setText(SK.byId('achievement-count'), `${unlockedCount} / ${SK.ACHIEVEMENTS.length}`);
        SK.setText(SK.byId('achievement-bonus'), `+%${(SK.achievementBonus(s) * 100).toFixed(0)}`);

        const signature = unlockedCount + ':' + SK.ACHIEVEMENTS.length;
        if (grid.dataset.signature === signature) return;
        grid.dataset.signature = signature;

        grid.innerHTML = '';
        SK.ACHIEVEMENTS.forEach(a => {
            const got = has(a.id);
            const cell = SK.el('div', 'ach-cell' + (got ? ' unlocked' : '') + (a.secret ? ' secret' : ''));
            const hidden = a.secret && !got;
            cell.innerHTML = `
                <div class="ach-icon">${hidden ? '❔' : a.icon}</div>
                <div class="ach-meta">
                    <div class="ach-name">${hidden ? 'Gizli Başarım' : SK.escapeHTML(a.name)}</div>
                    <div class="ach-desc">${hidden ? 'Keşfedilmeyi bekliyor…' : SK.escapeHTML(a.desc)}</div>
                </div>
                <div class="ach-reward">+%${(a.reward * 100).toFixed(0)}</div>
            `;
            grid.appendChild(cell);
        });
    }

    function init() {
        renderGallery();
    }

    SK.achievements = { init, check, unlock, renderGallery, has };
})(window.SK);
