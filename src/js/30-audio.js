/* =========================================================================
 * SKIBIDI CLICKER :: AUDIO
 * Tone.js sarmalayıcısı. Tarayıcı ses bağlamı ilk kullanıcı etkileşimine
 * kadar kilitli olduğu için her çağrı sessizce başarısız olabilmeli.
 * ========================================================================= */
(function (SK) {
    'use strict';

    let ready = false;
    let starting = null;
    let master = null;
    let synth = null;
    let bassSynth = null;
    let slotSynth = null;
    let noiseSynth = null;

    const available = () => typeof Tone !== 'undefined';

    /** İlk tıklamada çağrılır; art arda çağrılsa da tek kez kurar. */
    async function init() {
        if (ready || !available()) return ready;
        if (starting) return starting;

        starting = (async () => {
            try {
                if (Tone.context.state !== 'running') await Tone.start();

                master = new Tone.Volume(0).toDestination();

                synth = new Tone.PolySynth(Tone.Synth, {
                    maxPolyphony: 6,
                    oscillator: { type: 'sine' },
                    envelope: { attack: 0.001, decay: 0.06, sustain: 0, release: 0.04 },
                    volume: -18
                }).connect(master);

                bassSynth = new Tone.MembraneSynth({ volume: -10 }).connect(master);

                slotSynth = new Tone.Synth({
                    oscillator: { type: 'square' },
                    envelope: { attack: 0.01, decay: 0.2, sustain: 0, release: 0.2 },
                    volume: -20
                }).connect(master);

                noiseSynth = new Tone.NoiseSynth({
                    noise: { type: 'white' },
                    envelope: { attack: 0.005, decay: 0.12, sustain: 0 },
                    volume: -26
                }).connect(master);

                ready = true;
                applyVolume();
            } catch (err) {
                console.warn('[SK] Ses motoru başlatılamadı:', err);
            }
            return ready;
        })();

        return starting;
    }

    /** Ayarlardaki 0..1 ses seviyesini desibele çevirir. */
    function applyVolume() {
        if (!master || !SK.state) return;
        const st = SK.state.settings;
        if (st.muted || st.volume <= 0) {
            master.volume.value = -Infinity;
        } else {
            master.volume.value = -34 + 34 * Math.pow(st.volume, 0.6);
        }
    }

    const silent = () => !ready || !SK.state || SK.state.settings.muted || SK.state.settings.volume <= 0;

    function note(pitch, dur = '32n') {
        if (silent() || !synth) return;
        try { synth.triggerAttackRelease(pitch, dur); } catch (_) { /* voice çakışması */ }
    }

    function chord(pitches, dur = '4n') {
        if (silent() || !synth) return;
        try { synth.triggerAttackRelease(pitches, dur); } catch (_) { /* yoksay */ }
    }

    function thump(pitch = 'C2', dur = '16n') {
        if (silent() || !bassSynth) return;
        try { bassSynth.triggerAttackRelease(pitch, dur); } catch (_) { /* yoksay */ }
    }

    function blip(pitch = 'C4', dur = '32n') {
        if (silent() || !slotSynth) return;
        try { slotSynth.triggerAttackRelease(pitch, dur); } catch (_) { /* yoksay */ }
    }

    function noise(dur = '32n') {
        if (silent() || !noiseSynth) return;
        try { noiseSynth.triggerAttackRelease(dur); } catch (_) { /* yoksay */ }
    }

    /* ----------------------------------------------------- İSİMLİ EFEKTLER */

    const CLICK_NOTES = ['C2', 'D2', 'E2', 'F2', 'G2'];
    const FEVER_NOTES = ['C4', 'E4', 'G4', 'B4', 'D5'];

    const SFX = {
        click: () => note(SK.pick(CLICK_NOTES), '64n'),
        clickFever: () => note(SK.pick(FEVER_NOTES), '64n'),
        crit: () => chord(['G4', 'C5'], '32n'),
        buy: () => note('C6', '16n'),
        sell: () => thump('F2', '32n'),
        error: () => note('A2', '16n'),
        levelUp: () => chord(['C5', 'E5', 'G5'], '8n'),
        achievement: () => chord(['E5', 'A5', 'C6'], '4n'),
        quest: () => chord(['D5', 'F5', 'A5'], '8n'),
        fever: () => chord(['C4', 'E4', 'G4', 'C5', 'E5'], '2n'),
        jackpot: () => chord(['C4', 'E4', 'G4', 'C5', 'E5', 'G5'], '2n'),
        spin: () => blip('C4', '32n'),
        warning: () => { thump('A1', '8n'); noise('16n'); },
        sabotage: () => { thump('F1', '4n'); noise('8n'); },
        ascend: () => chord(['C4', 'G4', 'C5', 'E5', 'G5', 'C6'], '1n'),
        phase: () => thump('A1', '2n'),
        reboot: () => thump('C1', '4n'),
        pill: () => chord(['C5', 'E5', 'G5', 'C6'], '1n'),
        ending: () => chord(['C2', 'C3', 'C4'], '1n')
    };

    function play(name) {
        const fn = SFX[name];
        if (fn) fn();
    }

    /** Faz 3'te sesi bozup kısar — sistemin çöktüğü hissini verir. */
    function corrupt() {
        if (!ready || !synth) return;
        try {
            const crusher = new Tone.BitCrusher(4).connect(master);
            synth.disconnect();
            synth.connect(crusher);
            synth.volume.value = -22;
        } catch (err) {
            console.warn('[SK] Ses bozma efekti uygulanamadı:', err);
        }
    }

    function fadeOut(seconds = 5) {
        if (!ready || !master) return;
        try { master.volume.rampTo(-Infinity, seconds); } catch (_) { /* yoksay */ }
    }

    SK.audio = { init, play, note, chord, thump, blip, noise, applyVolume, corrupt, fadeOut,
        get ready() { return ready; } };
})(window.SK);
