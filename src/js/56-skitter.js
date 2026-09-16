/* =========================================================================
 * SKIBIDI CLICKER :: SKITTER
 * Oyunun haber akışı. Yilong, analistler ve sistem olayları buraya düşer.
 * Diğer modüller doğrudan DOM'a dokunmak yerine `skitter:post` yayınlar.
 * ========================================================================= */
(function (SK) {
    'use strict';

    const MAX_MESSAGES = 30;
    let listEl = null;
    let unread = 0;

    const AUTHOR_COLOR = {
        'Yilong Ma': 'text-yellow-400',
        'Skitter Analiz': 'text-sky-400',
        'Sistem': 'text-rose-400',
        'Sen': 'text-emerald-400'
    };

    function post(msg, author = 'Yilong Ma', highlight = false) {
        if (!listEl) return;

        const row = SK.el('div',
            `${highlight ? 'new-skitt-glow' : 'bg-white/5 border-white/10'} p-3 rounded-xl border mb-2 flex flex-col gap-1 transition-all duration-500`);
        row.innerHTML = `
            <div class="flex justify-between items-center">
                <span class="font-bold text-xs ${AUTHOR_COLOR[author] || 'text-slate-300'}">${SK.escapeHTML(author)}</span>
                <span class="text-[8px] text-slate-500">Şimdi</span>
            </div>
            <p class="text-xs text-slate-300 leading-snug">${msg}</p>
        `;

        listEl.prepend(row);
        while (listEl.children.length > MAX_MESSAGES) listEl.removeChild(listEl.lastChild);

        if (highlight) {
            setTimeout(() => {
                row.classList.remove('new-skitt-glow');
                row.classList.add('bg-white/5', 'border-white/10');
            }, 5000);
        }

        bumpIcon();
    }

    /** Akış kapalıyken yeni mesajları rozetle haber verir. */
    function bumpIcon() {
        const feed = SK.byId('skitter-feed');
        if (!feed || feed.open) { unread = 0; updateBadge(); return; }

        unread++;
        updateBadge();

        const icon = SK.byId('skitter-icon');
        if (!icon || (SK.state && SK.state.settings.reducedMotion)) return;
        icon.classList.remove('animate-bounce');
        void icon.offsetWidth;   // reflow tetikle ki animasyon baştan başlasın
        icon.classList.add('animate-bounce');
        setTimeout(() => icon.classList.remove('animate-bounce'), 3000);
    }

    function updateBadge() {
        const badge = SK.byId('skitter-badge');
        if (!badge) return;
        SK.toggleClass(badge, 'hidden', unread === 0);
        SK.setText(badge, unread > 9 ? '9+' : String(unread));
    }

    let analystTimer = 0;

    /** Arada bir analist yorumu düşerek akışı canlı tutar. */
    function tick() {
        analystTimer++;
        if (analystTimer >= 37) {
            analystTimer = 0;
            if (SK.chance(0.5)) post(SK.pick(SK.SKITTER_ANALYST_LINES), 'Skitter Analiz', false);
        }
    }

    function init() {
        listEl = SK.byId('skitter-messages');

        const feed = SK.byId('skitter-feed');
        if (feed) {
            feed.addEventListener('toggle', () => {
                if (feed.open) { unread = 0; updateBadge(); }
            });
        }

        SK.on('skitter:post', (p) => post(p.msg, p.author, p.highlight));
        post('5 milyon dolarım var. Sizi geçeceğim! 😎', 'Yilong Ma', false);
    }

    SK.skitter = { init, post, tick };
})(window.SK);
