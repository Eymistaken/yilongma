/* =========================================================================
 * SKIBIDI CLICKER :: CONTENT
 * Oyunun tüm veri tabloları. Denge ayarı yapmak isteyen buraya bakar;
 * mantık dosyaları bu tablolardan başka bir yerden sayı okumaz.
 * ========================================================================= */
(function (SK) {
    'use strict';

    /* ----------------------------------------------------------- VARLIKLAR */

    SK.ASSET_DEFS = {
        // FIAT — düşük oynaklık, güçlü ortalamaya dönüş. Güvenli liman.
        tl:    { name: 'TL',    type: 'fiat',   color: '#f472b6', price: 1.0,     vol: 0.018, drift: -0.0022, revert: 0.05 },
        usd:   { name: 'USD',   type: 'fiat',   color: '#4ade80', price: 35.0,    vol: 0.012, drift: 0.0004,  revert: 0.06 },
        eur:   { name: 'EUR',   type: 'fiat',   color: '#fb923c', price: 38.0,    vol: 0.013, drift: 0.0003,  revert: 0.06 },

        // TECH — orta oynaklık, pozitif eğilim.
        nvda:  { name: 'NVDA',  type: 'tech',   color: '#76b900', price: 130.0,   vol: 0.042, drift: 0.0030,  revert: 0.02 },
        googl: { name: 'GOOGL', type: 'tech',   color: '#ea4335', price: 175.0,   vol: 0.032, drift: 0.0018,  revert: 0.025 },
        aapl:  { name: 'AAPL',  type: 'tech',   color: '#a3a3a3', price: 220.0,   vol: 0.030, drift: 0.0016,  revert: 0.025 },
        tsla:  { name: 'TSLA',  type: 'tech',   color: '#e11d48', price: 240.0,   vol: 0.055, drift: 0.0020,  revert: 0.015 },
        msft:  { name: 'MSFT',  type: 'tech',   color: '#0ea5e9', price: 420.0,   vol: 0.028, drift: 0.0015,  revert: 0.03 },

        // CRYPTO — vahşi oynaklık, neredeyse hiç ortalamaya dönüş yok.
        btc:   { name: 'BTC',   type: 'crypto', color: '#ef4444', price: 65000.0, vol: 0.075, drift: 0.0040,  revert: 0.006 },
        aura:  { name: 'AURA',  type: 'crypto', color: '#c084fc', price: 500.0,   vol: 0.110, drift: 0.0050,  revert: 0.004 },
        gyat:  { name: 'GYAT',  type: 'crypto', color: '#f0abfc', price: 6.9,     vol: 0.150, drift: 0.0065,  revert: 0.003 },
        rizz:  { name: 'RIZZ',  type: 'crypto', color: '#22d3ee', price: 42.0,    vol: 0.125, drift: 0.0055,  revert: 0.004 },

        // METAL — yavaş, sağlam, kriz zamanı değer kazanır.
        xau:   { name: 'Altın', type: 'metal',  color: '#facc15', price: 2500.0,  vol: 0.020, drift: 0.0012,  revert: 0.04 },
        xag:   { name: 'Gümüş', type: 'metal',  color: '#cbd5e1', price: 31.0,    vol: 0.026, drift: 0.0011,  revert: 0.035 }
    };

    SK.ASSET_TYPE_LABEL = { fiat: 'FIAT', tech: 'TECH', crypto: 'CRYPTO', metal: 'METAL' };

    /* ---------------------------------------------------------- ÜRETİCİLER */

    // baseProd = saniyede üretilen ham Gyatt. Maliyet her alımda x1.15 büyür.
    SK.GENERATORS = [
        { id: 'intern',     icon: '🧑‍💻', name: 'Stajyer',             desc: 'Maaş yok, deneyim var.',                    baseCost: 60,            baseProd: 0.5 },
        { id: 'clickbot',   icon: '🤖', name: 'Klik Botu',             desc: 'Senin yerine parmağını yoruyor.',           baseCost: 800,           baseProd: 4 },
        { id: 'memefactory',icon: '🏭', name: 'Meme Fabrikası',        desc: 'Endüstriyel ölçekte brainrot üretimi.',     baseCost: 9000,          baseProd: 28 },
        { id: 'cryptomine', icon: '⛏️', name: 'Kripto Madeni',         desc: 'Elektrik faturası Yilong\'a gidiyor.',      baseCost: 100000,        baseProd: 180 },
        { id: 'ragefarm',   icon: '😡', name: 'Rage Bait Çiftliği',    desc: 'Öfke en saf Gyatt kaynağıdır.',             baseCost: 1200000,       baseProd: 1100 },
        { id: 'datacenter', icon: '🧠', name: 'AI Veri Merkezi',       desc: 'GPU\'lar senin için rizz üretiyor.',        baseCost: 15000000,      baseProd: 7500 },
        { id: 'offshore',   icon: '🏝️', name: 'Offshore Banka',        desc: 'Vergi dairesinin göremediği ada.',          baseCost: 200000000,     baseProd: 52000 },
        { id: 'reactor',    icon: '⚛️', name: 'Kuantum Rizz Reaktörü', desc: 'Rizz\'i madde-enerji seviyesinde üretir.',  baseCost: 3000000000,    baseProd: 380000 },
        { id: 'singularity',icon: '🌀', name: 'Skibidi Tekilliği',     desc: 'Artık geri dönüşü yok.',                    baseCost: 50000000000,   baseProd: 3100000 },
        { id: 'hypercube',  icon: '🧊', name: 'Gyatt Hiperküpü',       desc: '4 boyutlu tuvalet. Sorma.',                 baseCost: 900000000000,  baseProd: 27000000 }
    ];

    SK.GENERATOR_COST_GROWTH = 1.15;
    // Sahip olunan adet bu eşikleri geçtikçe o üreticinin üretimi ikiye katlanır.
    SK.GENERATOR_MILESTONES = [10, 25, 50, 100, 150, 200, 300];

    /* ------------------------------------------------------- YÜKSELTMELER */

    SK.UPGRADES = [
        {
            id: 'ppc', name: 'More Rizz', desc: '+1 Tık Gücü', icon: '⚡',
            color: 'var(--neon-cyan)', baseCost: 15, growth: 1.6, startLevel: 1
        },
        {
            id: 'multi', name: 'Sigma Grindset', desc: 'Tüm Gyatt kazancı x1.5', icon: '🗿',
            color: 'var(--neon-magenta)', baseCost: 2500, growth: 1.9, startLevel: 0
        },
        {
            id: 'tax', name: 'Fanum Tax', desc: 'Portföyünden pasif gelir +%0.5', icon: '💸',
            color: 'var(--neon-lime)', baseCost: 10000, growth: 1.75, startLevel: 0
        },
        {
            id: 'crit', name: 'Kritik Bilinç', desc: 'Kritik tık şansı +%1.5', icon: '🎯',
            color: '#fb923c', baseCost: 5000, growth: 1.9, startLevel: 0, maxLevel: 25
        },
        {
            id: 'critdmg', name: 'Yıkıcı Darbe', desc: 'Kritik hasar +0.5x', icon: '💥',
            color: '#f87171', baseCost: 25000, growth: 2.0, startLevel: 0, maxLevel: 20
        },
        {
            id: 'combo', name: 'Kombo Efendisi', desc: 'Kombo tavanı +20', icon: '🔥',
            color: '#fbbf24', baseCost: 50000, growth: 2.2, startLevel: 0, maxLevel: 15
        },
        {
            id: 'synergy', name: 'Kurumsal Sinerji', desc: 'Tüm üretici çıktısı +%8', icon: '🏢',
            color: '#818cf8', baseCost: 120000, growth: 1.85, startLevel: 0, maxLevel: 30
        }
    ];

    /* -------------------------------------------------------- YETENEK AĞACI */

    // Prestij para birimi "Sigma Parçası" ile alınır. Kalıcıdır, resetlenmez.
    SK.SKILLS = [
        { id: 'genetics',  icon: '🧬', name: 'Rizz Genetiği',      desc: 'Tık gücü +%25',                   max: 10, cost: 1,  growth: 1.5 },
        { id: 'automation',icon: '⚙️', name: 'Otomasyon',          desc: 'Üretici çıktısı +%15',            max: 10, cost: 1,  growth: 1.5 },
        { id: 'crit',      icon: '🎯', name: 'Kritik Sezgi',       desc: 'Kritik şans +%2',                 max: 5,  cost: 2,  growth: 1.8 },
        { id: 'critdmg',   icon: '💢', name: 'Aşırı Yüklenme',     desc: 'Kritik hasar +0.75x',             max: 5,  cost: 2,  growth: 1.8 },
        { id: 'broker',    icon: '🤝', name: 'Piyasa İçgüdüsü',    desc: 'İşlem komisyonu -%0.1',           max: 5,  cost: 2,  growth: 1.6 },
        { id: 'alpha',     icon: '📈', name: 'Alfa Sezgisi',       desc: 'Tüm varlıklara +%10 eğilim',      max: 5,  cost: 3,  growth: 1.9 },
        { id: 'luck',      icon: '🍀', name: 'Şans Tanrısı',       desc: 'Slot ödemesi +%10',               max: 5,  cost: 2,  growth: 1.7 },
        { id: 'offline',   icon: '🌙', name: 'Çevrimdışı Zihin',   desc: 'Çevrimdışı verim +%10, süre +2s', max: 10, cost: 2,  growth: 1.5 },
        { id: 'shield',    icon: '🛡️', name: 'Vergi Kalkanı',      desc: 'Yilong sabotaj hasarı -%12',      max: 5,  cost: 3,  growth: 1.8 },
        { id: 'combo',     icon: '🔗', name: 'Kombo Zinciri',      desc: 'Kombo tavanı +25, süre +0.2sn',   max: 5,  cost: 2,  growth: 1.7 },
        { id: 'contraband',icon: '🏴‍☠️', name: 'Kara Borsa Bağlantısı', desc: 'Nadir kasa şansı +%5',       max: 5,  cost: 3,  growth: 1.8 },
        { id: 'eternal',   icon: '♾️', name: 'Sonsuz Grindset',    desc: 'Tüm Gyatt kazancı +%12',          max: 10, cost: 4,  growth: 1.6 }
    ];

    /* ---------------------------------------------------------- KARA BORSA */

    SK.BLACK_MARKET_ITEMS = [
        { id: 'bm_gold_toilet',  name: 'Altın Tuvalet',    mult: 2.0,  rarity: 'LEGENDARY', color: '#fbbf24', icon: '🚽' },
        { id: 'bm_diamond_flush',name: 'Elmas Sifon',      mult: 1.5,  rarity: 'EPIC',      color: '#38bdf8', icon: '💎' },
        { id: 'bm_skibidi_crown',name: 'Skibidi Tacı',     mult: 1.25, rarity: 'RARE',      color: '#c084fc', icon: '👑' },
        { id: 'bm_fanum_shield', name: 'Fanum Kalkanı',    mult: 1.1,  rarity: 'COMMON',    color: '#94a3b8', icon: '🛡️' },
        { id: 'bm_cyber_attack', name: 'Siber Saldırı',    type: 'sabotage', val: 0.10, rarity: 'EPIC',      color: '#ef4444', icon: '💻' },
        { id: 'bm_market_crash', name: 'Piyasa Çöküşü',    type: 'sabotage', val: 0.25, rarity: 'LEGENDARY', color: '#b91c1c', icon: '📉' },
        { id: 'bm_ghost_server', name: 'Hayalet Sunucu',   mult: 1.35, rarity: 'EPIC',      color: '#2dd4bf', icon: '👻' },
        { id: 'bm_insider_tip',  name: 'İçeriden Bilgi',   type: 'insider', rarity: 'RARE', color: '#a3e635', icon: '🤫' }
    ];

    // roll < eşik → o nadirlik. Yetenek ağacı "contraband" bu eşikleri yukarı iter.
    SK.GACHA_TABLE = [
        { rarity: 'LEGENDARY', threshold: 0.05, ids: ['bm_gold_toilet', 'bm_market_crash'] },
        { rarity: 'EPIC',      threshold: 0.22, ids: ['bm_diamond_flush', 'bm_cyber_attack', 'bm_ghost_server'] },
        { rarity: 'RARE',      threshold: 0.52, ids: ['bm_skibidi_crown', 'bm_insider_tip'] },
        { rarity: 'COMMON',    threshold: 1.01, ids: ['bm_fanum_shield'] }
    ];

    /* --------------------------------------------------------------- SLOT */

    SK.SLOT_SYMBOLS = ['🍒', '🍋', '🍇', '💎', '7️⃣', '🚽', '6️⃣', '8️⃣', '9️⃣'];
    SK.SLOT_WEIGHTS   = [25, 20, 15, 10, 8, 2, 8, 6, 6];
    SK.SLOT_WEIGHTS_P2 = [20, 15, 12, 10, 12, 5, 10, 8, 8];
    SK.SLOT_BASE_COST = 500;

    /* ------------------------------------------------------ PİYASA OLAYLARI */

    // `apply` piyasa modülü tarafından çağrılır; `duration` saniye cinsindendir.
    SK.MARKET_EVENTS = [
        {
            id: 'crash', name: 'KARA PERŞEMBE', icon: '📉', color: '#ef4444', weight: 10, duration: 25,
            skitt: 'Piyasa tamamen çöktü. Fakirler için kötü haber. 📉',
            desc: 'Tüm fiyatlar sert düşüyor. Metaller daha az etkileniyor.',
            mods: { fiat: -0.020, tech: -0.045, crypto: -0.075, metal: -0.005 }
        },
        {
            id: 'rally', name: 'BOĞA KOŞUSU', icon: '🚀', color: '#22c55e', weight: 12, duration: 25,
            skitt: 'Herkes zengin oluyor! Ama ben daha hızlı. 🚀',
            desc: 'Risk iştahı tavan yaptı, her şey yükseliyor.',
            mods: { fiat: 0.006, tech: 0.040, crypto: 0.065, metal: 0.010 }
        },
        {
            id: 'cryptowinter', name: 'KRİPTO KIŞI', icon: '🧊', color: '#38bdf8', weight: 9, duration: 35,
            skitt: 'Kripto öldü. Bu sefer cidden. (Ben dipten topluyorum.) 🧊',
            desc: 'Kripto kan kaybediyor, altına kaçış var.',
            mods: { crypto: -0.085, metal: 0.018, fiat: 0.004 }
        },
        {
            id: 'aiboom', name: 'YAPAY ZEKÂ PATLAMASI', icon: '🧠', color: '#818cf8', weight: 11, duration: 30,
            skitt: 'Her şirket adına "AI" ekledi. Ben de ekledim. 🧠',
            desc: 'Teknoloji hisseleri balon modunda.',
            mods: { tech: 0.070, fiat: -0.004 }
        },
        {
            id: 'hyperinflation', name: 'HİPERENFLASYON', icon: '🔥', color: '#f97316', weight: 8, duration: 30,
            skitt: 'Kâğıt para yakmalık. Altın al kardeşim. 🔥',
            desc: 'Fiat eriyor, sert varlıklar uçuyor.',
            mods: { fiat: -0.045, metal: 0.045, crypto: 0.035 }
        },
        {
            id: 'flightToSafety', name: 'GÜVENLİ LİMANA KAÇIŞ', icon: '🏦', color: '#facc15', weight: 8, duration: 25,
            skitt: 'Panik var. Ben altına geçtim, sen ne yaptın? 🏦',
            desc: 'Riskli her şey satılıyor, altın ve dolar tırmanıyor.',
            mods: { metal: 0.040, fiat: 0.020, tech: -0.030, crypto: -0.055 }
        },
        {
            id: 'shortSqueeze', name: 'SHORT SIKIŞMASI', icon: '🗜️', color: '#f0abfc', weight: 7, duration: 18,
            skitt: 'Açığa satanlar likide oluyor. Acımasız piyasa. 🗜️',
            desc: 'Tek bir varlık dikey gidiyor. Açık pozisyonlar yanıyor.',
            single: true, mods: { any: 0.130 }
        },
        {
            id: 'rugpull', name: 'RUG PULL', icon: '🪤', color: '#b91c1c', weight: 7, duration: 14,
            skitt: 'O coin\'in kurucusu ortadan kayboldu. Kim tutuyordu acaba? 🪤',
            desc: 'Tek bir varlık dipsiz kuyuya düşüyor.',
            single: true, cryptoOnly: true, mods: { any: -0.150 }
        },
        {
            id: 'halving', name: 'HALVING', icon: '⛏️', color: '#fb923c', weight: 6, duration: 40,
            skitt: 'Arz yarıya indi. Matematik basit. ⛏️',
            desc: 'Kripto arzı daraldı, uzun süreli yükseliş.',
            mods: { crypto: 0.048 }
        },
        {
            id: 'circuitBreaker', name: 'DEVRE KESİCİ', icon: '🛑', color: '#94a3b8', weight: 5, duration: 20,
            skitt: 'Borsa işlemleri durduruldu. Sakin olun (olmayın). 🛑',
            desc: 'Fiyatlar dondu. Hiçbir şey hareket etmiyor.',
            freeze: true, mods: {}
        }
    ];

    /* ------------------------------------------------- YILONG RUH HALLERİ */

    // ratio = oyuncunun serveti / Yilong'un serveti. Eşikler yukarıdan aşağı taranır.
    SK.YILONG_MOODS = [
        {
            id: 'broken', minRatio: 1.5, avatar: '😭', label: 'ÇÖKMÜŞ YILONG', color: '#ef4444',
            aggression: 1.0, tweets: [
                'Bu... bu nasıl olur? Her şeyim gitti.',
                'Lütfen. Bir tuvalet bile bırakmadın.',
                'Annem seninle gurur duyuyormuş. Benimkiyle değil.',
                'Kaybettim. Söylemesi bile acı veriyor.'
            ]
        },
        {
            id: 'desperate', minRatio: 0.85, avatar: '😰', label: 'ÇARESİZ YILONG', color: '#f97316',
            aggression: 0.95, tweets: [
                'Avukatlarımla görüşüyorum. Bu yasal olamaz.',
                'Sadece şansın yaver gitti. Sadece şans.',
                'Hesabımda bir sorun var, teknik ekip bakıyor.',
                'Bu bir strateji. Planın parçası. Kesinlikle.'
            ]
        },
        {
            id: 'angry', minRatio: 0.45, avatar: '😠', label: 'SİNİRLİ YILONG', color: '#dc2626',
            aggression: 0.75, tweets: [
                'Seni piyasadan sileceğim.',
                'Bir tuvalete tıklayarak zengin olduğunu mu sanıyorsun?',
                'Lobicilerimi aradım. Yakında görüşürüz.',
                'Bu oyunun kuralları benim tarafımdan yazıldı.'
            ]
        },
        {
            id: 'annoyed', minRatio: 0.18, avatar: '🤨', label: 'RAHATSIZ YILONG', color: '#eab308',
            aggression: 0.45, tweets: [
                'Hmm. Beklediğimden hızlısın.',
                'İlginç. Yine de yetmez.',
                'Portföyünü izliyorum. Amatörce.',
                'Şansın var. Şimdilik.'
            ]
        },
        {
            id: 'smug', minRatio: -Infinity, avatar: '🤓', label: 'YILONG MA', color: '#facc15',
            aggression: 0.2, tweets: [
                'Babanın şirketini de satın alacağım.',
                'Ağlama duvarı sağ tarafta ->',
                'Tuvalet kâğıdı bile alamayacaksın.',
                'Fakirler ağlamasın.',
                'Borsa benim oyun alanım.',
                'Senin servetin benim bahşişim.',
                'Sabah 4\'te kalkmayan kaybeder.',
                'Ben çalışırken sen tıklıyordun.'
            ]
        }
    ];

    /* ---------------------------------------------------- YILONG SABOTAJI */

    // `minAggression` altındaki ruh hallerinde bu saldırı hiç seçilmez.
    SK.SABOTAGE_ACTIONS = [
        {
            id: 'cancel', name: 'İPTAL KÜLTÜRÜ', icon: '🚫', color: '#ef4444',
            minAggression: 0.2, weight: 12, warnSeconds: 4,
            warn: 'Yilong hakkında bir ifşa dosyası hazırlıyor...',
            skitt: '🚫 İFŞA: Bu kişinin eski tweetlerini buldum. Kanselensin!',
            desc: 'Tık gücün 12 saniye boyunca yarıya düşüyor.'
        },
        {
            id: 'audit', name: 'VERGİ DENETİMİ', icon: '🏛️', color: '#f59e0b',
            minAggression: 0.4, weight: 10, warnSeconds: 6,
            warn: 'Vergi müfettişleri kapına dayanmak üzere...',
            skitt: '🏛️ Bir arkadaşım maliyede çalışıyor. Sadece söylüyorum.',
            desc: 'Nakdinin bir kısmına el konuyor ve Yilong\'a aktarılıyor.'
        },
        {
            id: 'rugpull', name: 'HEDEFLİ RUG PULL', icon: '🪤', color: '#b91c1c',
            minAggression: 0.6, weight: 9, warnSeconds: 5,
            warn: 'Yilong en büyük pozisyonunu hedef alıyor...',
            skitt: '🪤 En sevdiğin varlığı boşaltıyorum. İyi eğlenceler.',
            desc: 'En değerli varlığının fiyatı çakılıyor.'
        },
        {
            id: 'ddos', name: 'DDOS SALDIRISI', icon: '🛰️', color: '#8b5cf6',
            minAggression: 0.7, weight: 8, warnSeconds: 5,
            warn: 'Sunucularına doğru anormal trafik yükseliyor...',
            skitt: '🛰️ Sunucuların biraz yavaş görünüyor. Tuhaf.',
            desc: 'Tüm üreticilerin 15 saniye durur.'
        },
        {
            id: 'takeover', name: 'DÜŞMANCA DEVRALMA', icon: '🦈', color: '#0ea5e9',
            minAggression: 0.85, weight: 7, warnSeconds: 7,
            warn: 'Yilong hisselerini toplamaya başladı...',
            skitt: '🦈 Şirketinin %20\'si artık benim. Yönetim kurulunda görüşürüz.',
            desc: 'Rastgele bir varlığının %20\'sini zorla satın alıyor.'
        },
        {
            id: 'shortattack', name: 'AYI SALDIRISI', icon: '🐻', color: '#dc2626',
            minAggression: 0.75, weight: 8, warnSeconds: 6,
            warn: 'Piyasada büyük bir açık pozisyon açılıyor...',
            skitt: '🐻 Portföyüne karşı short açtım. Bol şans.',
            desc: 'Tuttuğun her varlık aynı anda değer kaybediyor.'
        }
    ];

    /* ------------------------------------------------------------ BAŞARIMLAR */

    // `check(s)` her saniye çalışır; `reward` global çarpana eklenen yüzdedir.
    const A = (id, icon, name, desc, check, reward = 0.01, secret = false) =>
        ({ id, icon, name, desc, check, reward, secret });

    SK.ACHIEVEMENTS = [
        // --- Tıklama
        A('click_1',    '👆', 'İlk Temas',        'İlk tıklamanı yap',              s => s.stats.clicks >= 1),
        A('click_100',  '👉', 'Isınma Turu',      '100 tıklama',                    s => s.stats.clicks >= 100),
        A('click_1k',   '✊', 'Parmak Kası',      '1.000 tıklama',                  s => s.stats.clicks >= 1000),
        A('click_10k',  '💪', 'Karpal Tünel',     '10.000 tıklama',                 s => s.stats.clicks >= 10000, 0.02),
        A('click_100k', '🦾', 'Siborg Parmak',    '100.000 tıklama',                s => s.stats.clicks >= 100000, 0.03),
        A('crit_100',   '🎯', 'Keskin Nişancı',   '100 kritik vuruş',               s => s.stats.crits >= 100),
        A('crit_5k',    '💥', 'Kritik Kütle',     '5.000 kritik vuruş',             s => s.stats.crits >= 5000, 0.02),

        // --- Servet
        A('wealth_1k',  '🪙', 'Harçlık',          '1.000 Gyatt servet',             s => s.totalWealth >= 1e3),
        A('wealth_1m',  '💵', 'Milyoner',         '1M Gyatt servet',                s => s.totalWealth >= 1e6),
        A('wealth_1b',  '💰', 'Milyarder',        '1B Gyatt servet',                s => s.totalWealth >= 1e9, 0.02),
        A('wealth_1t',  '🏦', 'Trilyoner',        '1T Gyatt servet',                s => s.totalWealth >= 1e12, 0.03),
        A('wealth_1qa', '🌌', 'Katrilyoner',      '1Qa Gyatt servet',               s => s.totalWealth >= 1e15, 0.05),

        // --- Kombo
        A('combo_50',   '🔥', 'Isındık',          '50 kombo yap',                   s => s.stats.maxCombo >= 50),
        A('combo_100',  '🌋', 'Yanıyor',          '100 kombo yap',                  s => s.stats.maxCombo >= 100, 0.02),
        A('fever_1',    '⚡', 'Ateş Bastı',       'İlk FEVER moduna gir',           s => s.stats.feverCount >= 1),
        A('fever_25',   '☄️', 'Kronik Ateş',      '25 kez FEVER moduna gir',        s => s.stats.feverCount >= 25, 0.02),

        // --- Üreticiler
        A('gen_first',  '🧑‍💻', 'İlk Çalışan',    'İlk üreticini satın al',         s => s.stats.generatorsBought >= 1),
        A('gen_50',     '🏗️', 'Küçük İşletme',   'Toplam 50 üretici',              s => s.stats.generatorsBought >= 50),
        A('gen_500',    '🏙️', 'Holding',         'Toplam 500 üretici',             s => s.stats.generatorsBought >= 500, 0.02),
        A('gen_all',    '🌀', 'Tam Dikey',        'Her üreticiden en az 1 tane',
            s => SK.GENERATORS.every(g => (s.generators[g.id] || 0) >= 1), 0.03),
        A('gen_milestone','🧊','Endüstri Devi',   'Tek üreticiden 100 adet',
            s => SK.GENERATORS.some(g => (s.generators[g.id] || 0) >= 100), 0.03),
        A('cps_1m',     '⚙️', 'Otomasyon Çağı',   'Saniyede 1M Gyatt üret',         s => s.derived.cps >= 1e6, 0.02),

        // --- Piyasa
        A('trade_first','📈', 'İlk İşlem',        'İlk varlığını satın al',         s => s.stats.trades >= 1),
        A('trade_100',  '📊', 'Gün İçi Tüccar',   '100 işlem yap',                  s => s.stats.trades >= 100),
        A('trade_1000', '🕴️', 'Kurumsal Yatırımcı','1.000 işlem yap',               s => s.stats.trades >= 1000, 0.02),
        A('profit_1m',  '🤑', 'Kâr Realize',      'Toplam 1M realize kâr',          s => s.stats.realizedProfit >= 1e6),
        A('profit_1b',  '📿', 'Piyasa Kâhini',    'Toplam 1B realize kâr',          s => s.stats.realizedProfit >= 1e9, 0.03),
        A('diversify',  '🧺', 'Çeşitlendirme',    'Aynı anda 8 farklı varlık tut',
            s => Object.keys(s.holdings).filter(k => s.holdings[k] && s.holdings[k].count > 0).length >= 8, 0.02),
        A('order_first','📋', 'Limitli Emir',     'İlk limit emrini kur',           s => s.stats.ordersPlaced >= 1),
        A('order_50',   '🤖', 'Algo Tüccar',      '50 limit emri gerçekleşsin',     s => s.stats.ordersFilled >= 50, 0.02),
        A('event_ride', '🎢', 'Dalgada Sörf',     'Bir piyasa olayı sırasında sat', s => s.stats.eventSells >= 1),

        // --- Slot
        A('slot_first', '🎰', 'Kumarın Tadı',     'İlk slot çevirişi',              s => s.stats.spins >= 1),
        A('slot_100',   '🍒', 'Bağımlı',          '100 çeviriş',                    s => s.stats.spins >= 100),
        A('slot_jack',  '🚽', 'Tuvalet Jackpot',  'Üç tuvalet yakala',              s => s.stats.toiletJackpots >= 1, 0.05),
        A('slot_789',   '🔢', 'Altı Üstü Yedi',   '7-8-9 dizisini yakala',          s => s.stats.seq789 >= 1, 0.03),
        A('slot_allin', '🎲', 'Hepsi Ya Da Hiç',  'ALL IN ile kazan',               s => s.stats.allInWins >= 1, 0.02),

        // --- Kara Borsa
        A('bm_first',   '🏴‍☠️', 'Karanlık Sokak',  'İlk gizli kasanı aç',            s => s.blackMarketBuffs.length >= 1),
        A('bm_legend',  '👑', 'Efsanevi Çekiliş', 'Bir LEGENDARY eşya çek',         s => s.stats.legendaryPulls >= 1, 0.04),
        A('bm_5',       '📦', 'Koleksiyoncu',     '5 kalıcı güçlendirme topla',     s => s.blackMarketBuffs.length >= 5, 0.03),

        // --- Prestij
        A('ascend_1',   '🔱', 'Yeniden Doğuş',    'İlk kez yüksel',                 s => s.prestige.count >= 1, 0.03),
        A('ascend_5',   '🌠', 'Döngü Ustası',     '5 kez yüksel',                   s => s.prestige.count >= 5, 0.05),
        A('shard_100',  '💠', 'Parça Avcısı',     '100 Sigma Parçası kazan',        s => s.prestige.totalShards >= 100, 0.04),
        A('skill_max',  '🧗', 'Zirve',            'Bir yeteneği sonuna kadar aç',
            s => SK.SKILLS.some(sk => (s.prestige.skills[sk.id] || 0) >= sk.max), 0.04),

        // --- Hikâye
        A('phase_2',    '🗿', 'Sigma Uyandı',     'Faz 2\'ye geç',                  s => s.phase >= 2, 0.03),
        A('phase_3',    '💀', 'Simülasyon Kırıldı','Faz 3\'e geç',                  s => s.phase >= 3, 0.05),
        A('firewall',   '🔥', 'Duvarı Yık',       'Firewall\'u sıfıra indir',       s => s.p3.firewallHealth <= 0 && s.phase >= 3, 0.08),
        A('yilong_zero','🪦', 'İflas Ettirdin',   'Yilong\'un servetini 1M altına indir',
            s => s.yilong.netWorth < 1e6 && s.stats.playTime > 60, 0.05),

        // --- Gizli
        A('sec_idle',   '🧘', 'Zen Ustası',       '5 dakika hiç tıklamadan oyna',   s => s.stats.idleStreak >= 300, 0.03, true),
        A('sec_broke',  '🕳️', 'Dip Noktası',      'Serveti 0\'ın altına düşür',     s => s.stats.wentNegative >= 1, 0.03, true),
        A('sec_night',  '🌙', 'Gece Vardiyası',   'Gece 03:00-05:00 arası oyna',
            () => { const h = new Date().getHours(); return h >= 3 && h < 5; }, 0.03, true),
        A('sec_marathon','⏳', 'Maraton',         'Tek oturumda 1 saat oyna',       s => s.stats.playTime >= 3600, 0.05, true)
    ];

    /* --------------------------------------------------------------- GÖREVLER */

    // `progress(s)` 0..1 arası oran döndürür; havuzdan rastgele 3 tanesi aktif olur.
    SK.QUEST_POOL = [
        { id: 'q_click',   icon: '👆', name: 'Tıklama Serisi',  desc: n => `${SK.formatNumber(n)} kez tıkla`,
          base: 250,   scale: 2.2, metric: 'clicks',        reward: 'gyatt', rewardBase: 5000 },
        { id: 'q_crit',    icon: '🎯', name: 'Kritik Görev',    desc: n => `${SK.formatNumber(n)} kritik vuruş yap`,
          base: 25,    scale: 2.0, metric: 'crits',         reward: 'gyatt', rewardBase: 9000 },
        { id: 'q_trade',   icon: '📈', name: 'Tüccar',          desc: n => `${SK.formatNumber(n)} işlem gerçekleştir`,
          base: 15,    scale: 1.9, metric: 'trades',        reward: 'gyatt', rewardBase: 12000 },
        { id: 'q_spin',    icon: '🎰', name: 'Şansını Dene',    desc: n => `${SK.formatNumber(n)} slot çevir`,
          base: 10,    scale: 1.8, metric: 'spins',         reward: 'gyatt', rewardBase: 15000 },
        { id: 'q_gen',     icon: '⚙️', name: 'Sanayileşme',     desc: n => `${SK.formatNumber(n)} üretici satın al`,
          base: 10,    scale: 1.7, metric: 'generatorsBought', reward: 'gyatt', rewardBase: 20000 },
        { id: 'q_profit',  icon: '💹', name: 'Kâr Hedefi',      desc: n => `${SK.formatNumber(n)} realize kâr elde et`,
          base: 25000, scale: 3.0, metric: 'realizedProfit', reward: 'gyatt', rewardBase: 30000 },
        { id: 'q_fever',   icon: '🔥', name: 'Ateşi Yükselt',   desc: n => `${SK.formatNumber(n)} kez FEVER moduna gir`,
          base: 2,     scale: 1.8, metric: 'feverCount',    reward: 'shard', rewardBase: 1 },
        { id: 'q_earn',    icon: '💰', name: 'Kasayı Doldur',   desc: n => `${SK.formatNumber(n)} Gyatt kazan`,
          base: 50000, scale: 3.2, metric: 'totalEarned',   reward: 'gyatt', rewardBase: 25000 },
        { id: 'q_order',   icon: '📋', name: 'Otomatik Pilot',  desc: n => `${SK.formatNumber(n)} limit emri gerçekleşsin`,
          base: 3,     scale: 1.9, metric: 'ordersFilled',  reward: 'gyatt', rewardBase: 18000 }
    ];

    /* --------------------------------------------------- SKITTER İÇERİĞİ */

    SK.SKITTER_ANALYST_LINES = [
        'Analistler bu hareketi "beklenen" olarak nitelendirdi. Beklemeyenler iflas etti.',
        'Piyasa hacmi son 24 saatte rekor kırdı.',
        'Uzmanlar: "Bu bir balon değil, bu bir yaşam tarzı."',
        'Anket: Katılımcıların %78\'i ne aldığını bilmiyor.',
        'Merkez bankası sessizliğini koruyor.',
        'Perakende yatırımcı yine tepeden aldı.',
        'Bir tuvalet emojisi bugün piyasayı %4 hareket ettirdi.',
        'Kurumsal fonlar sessizce pozisyon topluyor.'
    ];

    SK.WELCOME_TIPS = [
        'İpucu: Hızlı tıklamak kombo yapar. 100 komboda FEVER modu açılır.',
        'İpucu: Üreticiler sen yokken de çalışır. Çevrimdışı kazanç kapalı sekmede birikir.',
        'İpucu: Limit emirleri sen uyurken alım satım yapar.',
        'İpucu: Yilong sinirlendikçe saldırganlaşır. Uyarı bandını kaçırma.',
        'İpucu: Piyasa olayları sırasında satmak realize kârını uçurur.',
        'İpucu: Sigma Yükselişi ilerlemeyi sıfırlar ama kalıcı güç verir.',
        'İpucu: Başarımların her biri tüm kazançlarına kalıcı bonus ekler.'
    ];
})(window.SK);
