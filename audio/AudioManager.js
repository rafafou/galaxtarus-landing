// AudioManager — Web Audio synthesis for sfx.
// No audio files (.wav/.mp3). Everything is generated in real time
// from oscillators + filters + envelopes. Tiny memory footprint,
// USB-stick friendly, zero load time. Faithful port of the legacy
// sfx* functions.
//
// USAGE :
//   const audio = new GALAXTARUS.audio.AudioManager();
//   audio.init();              // call once on user gesture
//   audio.play('death');       // play a registered sfx
//   audio.setSfxEnabled(false);
//   audio.setSfxVolume(0.5);
//
// EXTENDING :
//   Add a new method named _play_<name>() to the class. Done.
//   It will be playable via audio.play('<name>').

(function() {
  'use strict';

  // Minor scale ratios (legacy NOTE_RATIOS) — random pleasant notes.
  const NOTE_RATIOS = [1, 9/8, 6/5, 4/3, 3/2, 5/3, 9/5, 2, 9/4, 12/5, 8/3, 3, 18/5, 4];

  class AudioManager {
    constructor() {
      this.ctx          = null;
      this.ready        = false;
      this.sfxEnabled   = true;
      this.sfxVolume    = 1.0;
      this.musicEnabled = true;
      this.musicVolume  = 1.0;
      this._engine      = null;   // lazy-built engine sound graph
      this._ambient     = null;   // currently playing ambient (null if none)
    }

    /**
     * Lazy-initialize the AudioContext. Browsers require this to happen
     * inside a user-gesture handler (click, keydown). If you call
     * play() inside a gesture handler, init() is called automatically.
     */
    init() {
      if (!this.ctx) {
        try {
          const Ctx = window.AudioContext || window.webkitAudioContext;
          if (!Ctx) return false;
          this.ctx = new Ctx();
        } catch (e) {
          console.warn('[Audio] Web Audio API unavailable:', e);
          return false;
        }
      }
      // Modern browsers create the context in 'suspended' state —
      // it must be resumed inside a user gesture handler.
      if (this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }
      this.ready = (this.ctx.state === 'running');
      return this.ready;
    }

    setSfxEnabled(enabled)   { this.sfxEnabled   = !!enabled; }
    setSfxVolume(v)          { this.sfxVolume    = Math.max(0, Math.min(1, v)); }
    setMusicEnabled(enabled) {
      this.musicEnabled = !!enabled;
      if (!this.musicEnabled) this.stopAmbient();
    }
    setMusicVolume(v) {
      this.musicVolume = Math.max(0, Math.min(1, v));
      // Re-apply target gain on the fly if an ambient is playing
      if (this._ambient && !this._ambient.fadingOut) this._fadeAmbientIn();
    }

    /**
     * Play a registered sfx by name. Extra arguments are passed to the
     * sfx method (useful for parameterized sounds like explosionBlast).
     * Silently does nothing if the sfx doesn't exist or audio is off.
     */
    play(name, ...args) {
      // Lazy init on first call (must be inside a user-gesture handler).
      if (!this.ready) this.init();
      if (!this.ready || !this.sfxEnabled) return;

      // 1. Data-driven lookup (priority) - GALAXTARUS.sfx[name]
      //    Two accepted forms :
      //      - function: function(audio, ...args) { ... }    ← custom JS escape hatch
      //      - spec:     { template, ...params }             ← data template (editable in sound_editor)
      //    Both forms support optional spec.repeat / spec.repeatInterval to
      //    play the sound N times spaced by `repeatInterval` seconds.
      const reg = window.GALAXTARUS && window.GALAXTARUS.sfx;
      const entry = reg ? reg[name] : null;
      if (entry !== undefined && entry !== null) {
        const repeat = (entry && typeof entry === 'object' && entry.repeat != null)
                       ? Math.min(20, Math.max(1, entry.repeat | 0)) : 1;
        const interval = (entry && typeof entry === 'object' && entry.repeatInterval != null)
                         ? entry.repeatInterval : 0.15;
        for (let i = 0; i < repeat; i++) {
          const delay = i * interval * 1000;
          if (delay === 0) {
            this._playEntryOnce(name, entry, args);
          } else {
            setTimeout(() => this._playEntryOnce(name, entry, args), delay);
          }
        }
        return;
      }

      // 2. Legacy fallback - _play_<name>() method on the class.
      //    Kept as safety net during migration. When all SFX are migrated
      //    to data, the legacy methods can be removed and this branch will
      //    just print the Unknown warning.
      const method = '_play_' + name;
      if (typeof this[method] === 'function') {
        try { this[method](...args); }
        catch (e) { console.warn('[Audio] sfx error:', name, e); }
      } else {
        console.warn('[Audio] Unknown sfx:', name);
      }
    }

    /** Internal : dispatch a single play of an entry (function or spec).
     *  Called once per repeat iteration by play(). */
    _playEntryOnce(name, entry, args) {
      try {
        if (typeof entry === 'function') {
          entry(this, ...args);
        } else if (entry && typeof entry.template === 'string') {
          const tplMethod = '_template_' + entry.template;
          if (typeof this[tplMethod] === 'function') {
            this[tplMethod](entry, args);
          } else {
            console.warn('[Audio] Unknown template:', entry.template, 'for sfx:', name);
          }
        } else {
          console.warn('[Audio] Malformed sfx entry:', name);
        }
      } catch (e) { console.warn('[Audio] sfx error (data):', name, e); }
    }

    // ─────────────────────────────────────────────────────────────
    // INTERNAL HELPERS — building blocks for sfx
    // ─────────────────────────────────────────────────────────────

    /** Single tone (sine/triangle/square/sawtooth) with envelope.
     *  @param {AudioNode} [destNode]  destination node (default ctx.destination)
     *  @param {object}    [opts]      { attack, releaseRatio, detune } */
    _tone(freq, type, duration, vol, freqEnd, destNode, opts) {
      const ctx = this.ctx;
      const dest = destNode || ctx.destination;
      const o = opts || {};
      const attack = (o.attack !== undefined && o.attack >= 0) ? o.attack : 0.01;
      const releaseRatio = (o.releaseRatio !== undefined) ? o.releaseRatio : 1.0;
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.value = freq;
      if (o.detune !== undefined && o.detune !== 0) {
        osc.detune.value = o.detune;
      }
      if (freqEnd !== undefined) {
        osc.frequency.setTargetAtTime(freqEnd, now + Math.max(0.01, attack), duration * 0.25);
      }
      const v = vol * this.sfxVolume;
      const releaseTime = Math.max(0.001, duration * releaseRatio);
      const sustainTime = Math.max(0, duration - attack - releaseTime);
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(v, now + attack);
      if (sustainTime > 0) {
        gain.gain.setValueAtTime(v, now + attack + sustainTime);
      }
      gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
      osc.connect(gain);
      gain.connect(dest);
      osc.start(now);
      osc.stop(now + duration + 0.05);
    }

    /** Filtered white noise burst with envelope.
     *  @param {AudioNode} [destNode]  destination (default ctx.destination)
     *  @param {object}    [opts]      { attack, releaseRatio } */
    _noise(duration, vol, cutoff, destNode, opts) {
      const ctx = this.ctx;
      const dest = destNode || ctx.destination;
      const o = opts || {};
      const now = ctx.currentTime;
      const len = Math.ceil(ctx.sampleRate * duration);
      const buf = ctx.createBuffer(1, len, ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
      const src    = ctx.createBufferSource();
      const filter = ctx.createBiquadFilter();
      const gain   = ctx.createGain();
      src.buffer             = buf;
      filter.type            = 'lowpass';
      filter.frequency.value = cutoff;
      const v = vol * this.sfxVolume;
      const attack = (o.attack !== undefined && o.attack > 0) ? o.attack : 0;
      if (attack > 0) {
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(v, now + attack);
      } else {
        gain.gain.setValueAtTime(v, now);
      }
      gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
      src.connect(filter); filter.connect(gain); gain.connect(dest);
      src.start(now);
    }

    /** Random pleasant note from a base frequency. */
    _rndNote(base) {
      return base * NOTE_RATIOS[Math.floor(Math.random() * NOTE_RATIOS.length)];
    }

    // ─────────────────────────────────────────────────────────────
    // EFFECT CHAIN
    // Apply optional global effects (filter, pan, distortion, delay)
    // from a spec to a source node. Returns the last node — caller
    // connects it to ctx.destination. Reverb deferred (needs IR file).
    // ─────────────────────────────────────────────────────────────

    _applyEffectChain(srcNode, spec) {
      const ctx = this.ctx;
      let current = srcNode;
      // 1. Filter (lowpass/highpass/bandpass) — only if type != 'none' and not undefined
      if (spec.filterType && spec.filterType !== 'none' && spec.filterCutoff != null) {
        const f = ctx.createBiquadFilter();
        f.type = spec.filterType;
        f.frequency.value = spec.filterCutoff;
        if (spec.filterQ != null) f.Q.value = spec.filterQ;
        current.connect(f);
        current = f;
      }
      // 2. Distortion (WaveShaper)
      if (spec.distortion != null && spec.distortion > 0) {
        const ws = ctx.createWaveShaper();
        ws.curve = this._makeDistortionCurve(spec.distortion);
        ws.oversample = '4x';
        current.connect(ws);
        current = ws;
      }
      // 3. Delay (with feedback + dry/wet mix)
      if (spec.delayTime != null && spec.delayTime > 0) {
        const delay = ctx.createDelay(5.0);
        delay.delayTime.value = spec.delayTime;
        const feedback = ctx.createGain();
        feedback.gain.value = Math.min(0.9, Math.max(0, spec.delayFeedback != null ? spec.delayFeedback : 0.3));
        const wetMix = ctx.createGain();
        wetMix.gain.value = Math.min(1, Math.max(0, spec.delayMix != null ? spec.delayMix : 0.3));
        const dryMix = ctx.createGain();
        dryMix.gain.value = 1 - wetMix.gain.value;
        current.connect(dryMix);
        current.connect(delay);
        delay.connect(feedback);
        feedback.connect(delay);
        delay.connect(wetMix);
        const merger = ctx.createGain();
        dryMix.connect(merger);
        wetMix.connect(merger);
        current = merger;
      }
      // 4. Pan (StereoPannerNode)
      if (spec.pan != null && spec.pan !== 0) {
        const panner = ctx.createStereoPanner();
        panner.pan.value = Math.max(-1, Math.min(1, spec.pan));
        current.connect(panner);
        current = panner;
      }
      return current;
    }

    /** Build a soft-clip distortion curve for WaveShaperNode.
     *  amount in [0..1] : 0 = light, 1 = heavy */
    _makeDistortionCurve(amount) {
      const k = Math.max(0.001, amount) * 100;
      const n = 256;
      const curve = new Float32Array(n);
      const deg = Math.PI;
      for (let i = 0; i < n; i++) {
        const x = (i * 2) / n - 1;
        curve[i] = (deg + k) * x / (deg + k * Math.abs(x));
      }
      return curve;
    }

    /** Master + effect chain helper for templates.
     *  Creates a master GainNode, applies effects from spec, connects to destination,
     *  returns the master (used as destNode for _tone/_noise calls). */
    _buildMaster(spec) {
      const ctx = this.ctx;
      const master = ctx.createGain();
      master.gain.value = 1.0;
      const last = this._applyEffectChain(master, spec);
      last.connect(ctx.destination);
      return master;
    }

    // ─────────────────────────────────────────────────────────────
    // PUBLIC SYNTH HELPERS
    // Exposed for SFX content defined as functions in assets/audio/sfx/*.js
    // (escape hatch for custom sounds that don't fit a template).
    // ─────────────────────────────────────────────────────────────

    /** Public alias for _tone(). See _tone() doc. */
    tone(freq, type, duration, vol, freqEnd) {
      return this._tone(freq, type, duration, vol, freqEnd);
    }
    /** Public alias for _noise(). See _noise() doc. */
    noise(duration, vol, cutoff) {
      return this._noise(duration, vol, cutoff);
    }
    /** Public alias for _rndNote(). See _rndNote() doc. */
    rndNote(base) {
      return this._rndNote(base);
    }

    // ─────────────────────────────────────────────────────────────
    // ENGINE SOUND — continuous synth graph that reacts to the ship
    // ─────────────────────────────────────────────────────────────

    /** Build the engine synth graph (called lazily on first updateEngine). */
    _ensureEngine() {
      if (this._engine || !this.ready) return;
      const ctx = this.ctx;

      const osc        = ctx.createOscillator();
      const filter     = ctx.createBiquadFilter();
      const gain       = ctx.createGain();
      const panner     = ctx.createStereoPanner();
      osc.type                  = 'sawtooth';
      osc.frequency.value       = 80;
      filter.type               = 'lowpass';
      filter.frequency.value    = 200;
      filter.Q.value            = 2.5;
      gain.gain.value           = 0;
      panner.pan.value          = 0;
      osc.connect(filter);
      filter.connect(gain);
      gain.connect(panner);
      panner.connect(ctx.destination);
      osc.start();

      // Vibrato on the fundamental
      const vibrato      = ctx.createOscillator();
      const vibratoDepth = ctx.createGain();
      vibrato.frequency.value     = 1.2;
      vibratoDepth.gain.value     = 0;
      vibrato.connect(vibratoDepth);
      vibratoDepth.connect(osc.frequency);
      vibrato.start();

      // 4 harmonics : minor third, fourth, fifth, octave
      const harmonics = [];
      [6/5, 4/3, 3/2, 2].forEach((ratio, i) => {
        const hOsc = ctx.createOscillator();
        const tmbr = ctx.createGain();
        const env  = ctx.createGain();
        const lfo  = ctx.createOscillator();
        const lfoG = ctx.createGain();
        hOsc.type            = 'sawtooth';
        hOsc.frequency.value = 80 * ratio;
        tmbr.gain.value      = 0.035;
        env.gain.value       = 0;
        lfo.frequency.value  = 0.055 + i * 0.028;
        lfoG.gain.value      = 0.020;
        lfo.connect(lfoG);
        lfoG.connect(tmbr.gain);
        hOsc.connect(tmbr); tmbr.connect(env); env.connect(panner);
        hOsc.start();
        lfo.start();
        harmonics.push({ osc: hOsc, env, ratio });
      });

      this._engine = { osc, filter, gain, panner, vibrato, vibratoDepth, harmonics };
    }

    /**
     * Update the engine sound parameters each frame.
     * Decoupled from Ship/Camera : the caller computes the values and
     * passes them in. AudioManager doesn't know about Ship.
     *
     * @param {object} state
     * @param {number} state.speed         - current speed (Math.hypot(vx, vy))
     * @param {number} state.maxSpeed      - reference max speed (for ratio)
     * @param {boolean} state.isSuperBoost - is super boost active ?
     * @param {number} state.vx            - x velocity (for stereo pan)
     * @param {number} [state.zoomProx]    - 0..1 zoom proximity (optional)
     * @param {boolean} [state.alive=true] - if false, fade out
     */
    updateEngine(state) {
      if (!this.ready) return;
      // Audio off or ship dying : fade out gain
      if (!this.sfxEnabled || state.alive === false) {
        if (this._engine) {
          const now = this.ctx.currentTime;
          this._engine.gain.gain.setTargetAtTime(0, now, 0.1);
          for (const h of this._engine.harmonics) {
            h.env.gain.setTargetAtTime(0, now, 0.1);
          }
        }
        return;
      }

      this._ensureEngine();
      if (!this._engine) return;

      const speed    = state.speed || 0;
      const maxSpeed = Math.max(state.maxSpeed || 1, 1);
      const ratio    = Math.min(speed / maxSpeed, 1.0);
      const prox     = Math.min(1, Math.max(0, state.zoomProx || 0));
      const now      = this.ctx.currentTime;

      const baseFreq = 80 + ratio * 90;
      this._engine.osc.frequency.setTargetAtTime(baseFreq, now, 0.08);

      const filterCutoff = state.isSuperBoost ? 700 : 180 + ratio * 400 + prox * 180;
      this._engine.filter.frequency.setTargetAtTime(filterCutoff, now, 0.12);
      this._engine.filter.Q.setTargetAtTime(2.5 + prox * 4.5, now, 0.20);

      this._engine.vibratoDepth.gain.setTargetAtTime(1.5 + ratio * 5, now, 0.30);

      const v = (0.004 + ratio * 0.052 + prox * 0.014) * this.sfxVolume;
      this._engine.gain.gain.setTargetAtTime(v, now, 0.08);

      const harmVol = ((state.isSuperBoost ? 0.004 + ratio * 0.042 : 0.002 + ratio * 0.032)
                      + prox * 0.011) * this.sfxVolume;
      for (const h of this._engine.harmonics) {
        h.osc.frequency.setTargetAtTime(baseFreq * h.ratio, now, 0.10);
        h.env.gain.setTargetAtTime(harmVol, now, 0.10);
      }

      const vx  = state.vx || 0;
      const pan = speed > 0 ? (vx / speed) * 0.20 : 0;
      this._engine.panner.pan.setTargetAtTime(pan, now, 0.15);
    }

    // ─────────────────────────────────────────────────────────────
    // AMBIENT SOUND — continuous drone played in the background.
    // Data-driven : reads from GALAXTARUS.ambients[name]. The default
    // is registered by assets/audio/ambient/ambient_default.js.
    // ─────────────────────────────────────────────────────────────

    /**
     * Start playing an ambient by name (defaults to 'default'). If an
     * ambient is already playing :
     *   - same name → fade back in (in case it was fading out)
     *   - different name → fade out current, build new
     * Falls back to 'default' if name is not registered.
     */
    startAmbient(name = 'default') {
      if (!this.ready) this.init();
      if (!this.ready || !this.musicEnabled) return;

      // Already playing this ambient : just (re)fade in
      if (this._ambient && this._ambient.name === name) {
        this._fadeAmbientIn();
        return;
      }

      // Different ambient : tear down current first
      if (this._ambient) this._teardownAmbient();

      const registry = window.GALAXTARUS.ambients || {};
      const data = registry[name] || registry['default'];
      if (!data) {
        console.warn('[Audio] No ambient data registered for:', name);
        return;
      }

      this._buildAmbient(data);
    }

    /** Fade out and stop the current ambient (no-op if none playing). */
    stopAmbient() {
      if (!this._ambient || !this.ctx) return;
      const now = this.ctx.currentTime;
      for (const o of this._ambient.oscillators) {
        o.gain.gain.setTargetAtTime(0, now, 0.4);
      }
      this._ambient.fadingOut = true;
      // Schedule full teardown after the fade has effectively ended
      const ambient = this._ambient;
      setTimeout(() => {
        if (this._ambient === ambient && ambient.fadingOut) {
          this._teardownAmbient();
        }
      }, 1500);
    }

    /** Build the synth graph from ambient data. */
    _buildAmbient(data) {
      const ctx = this.ctx;
      const ambient = { name: data.name, oscillators: [], fadingOut: false };

      data.oscillators.forEach(cfg => {
        const osc  = ctx.createOscillator();
        const gain = ctx.createGain();
        const lfo  = ctx.createOscillator();
        const lfoG = ctx.createGain();
        osc.type            = cfg.type;
        osc.frequency.value = cfg.freq;
        gain.gain.value     = 0;  // faded in below
        lfo.frequency.value = cfg.lfoFreq;
        lfoG.gain.value     = cfg.vol * cfg.lfoDepthRatio;
        lfo.connect(lfoG);
        lfoG.connect(gain.gain);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        lfo.start();
        ambient.oscillators.push({ osc, gain, lfo, lfoG, maxVol: cfg.vol });
      });

      this._ambient = ambient;
      this._fadeAmbientIn();
    }

    /** Fade in (or refresh target gain after a volume change). */
    _fadeAmbientIn() {
      if (!this._ambient || !this.ctx) return;
      const now = this.ctx.currentTime;
      for (const o of this._ambient.oscillators) {
        const target = o.maxVol * 0.5 * this.musicVolume;
        o.gain.gain.setTargetAtTime(target, now, 0.4);
      }
      this._ambient.fadingOut = false;
    }

    /** Tear down oscillators and clear state. */
    _teardownAmbient() {
      if (!this._ambient) return;
      for (const o of this._ambient.oscillators) {
        try { o.osc.stop(); } catch (e) {}
        try { o.lfo.stop(); } catch (e) {}
      }
      this._ambient = null;
    }

    // ─────────────────────────────────────────────────────────────
    // DATA-DRIVEN SFX TEMPLATES
    // Each _template_<name>(spec, args) interprets a data spec from
    // GALAXTARUS.sfx[name] and feeds the existing _tone/_noise helpers.
    // Add a new template = add a method here + document it in
    // assets/audio/sfx/galaxtarus_sfx.js header.
    // ─────────────────────────────────────────────────────────────

    /**
     * Multi-tone random — N successive tones at random notes around baseFreq,
     * optionally staggered by `interval` seconds. Optional secondary harmonic
     * layer (vol2/duration2) doubles the first tone — used by the simple
     * pickup family (pickupShield/Magnet/Explosion/SavePoint) and the
     * staggered ascending family (pickupSuperBoost).
     *
     * @param {object} spec - { baseFreq, wave, count, interval, vol, duration, vol2?, duration2? }
     */
    _template_multiToneRandom(spec) {
      const wave     = spec.wave  || 'sine';
      const count    = spec.count || 1;
      const intvl    = spec.interval || 0;
      const vol      = (spec.vol      != null) ? spec.vol      : 0.2;
      const dur      = (spec.duration != null) ? spec.duration : 0.4;
      const randomize = (spec.randomizeNote !== undefined) ? !!spec.randomizeNote : true;
      const detune    = spec.detune || 0;
      const freqEndRatio = spec.freqEndRatio;  // if set != 1, sweep applies per tone
      const opts = {
        attack:       (spec.attack       != null) ? spec.attack       : 0.015,
        releaseRatio: (spec.releaseRatio != null) ? spec.releaseRatio : 1.0,
        detune:       detune,
      };
      const master = this._buildMaster(spec);
      const base   = randomize ? this._rndNote(spec.baseFreq) : spec.baseFreq;
      if (intvl > 0) {
        // Staggered — schedule each tone via raw ctx for precise timing.
        const ctx = this.ctx;
        for (let i = 0; i < count; i++) {
          const freq = (i === 0) ? base : (randomize ? this._rndNote(base) : base);
          const t0   = ctx.currentTime + i * intvl;
          const osc  = ctx.createOscillator();
          const g    = ctx.createGain();
          osc.type            = wave;
          osc.frequency.value = freq;
          if (detune !== 0) osc.detune.value = detune;
          if (freqEndRatio != null && freqEndRatio !== 1) {
            osc.frequency.setTargetAtTime(freq * freqEndRatio, t0 + opts.attack, dur * 0.25);
          }
          g.gain.setValueAtTime(0, t0);
          g.gain.linearRampToValueAtTime(vol * this.sfxVolume, t0 + opts.attack);
          g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
          osc.connect(g); g.connect(master);
          osc.start(t0); osc.stop(t0 + dur + 0.05);
        }
      } else {
        // Simultaneous main tone + optional harmonic layer.
        const freqEnd1 = (freqEndRatio != null && freqEndRatio !== 1) ? base * freqEndRatio : undefined;
        this._tone(base, wave, dur, vol, freqEnd1, master, opts);
        if (spec.vol2 != null && spec.duration2 != null) {
          const h = randomize ? this._rndNote(base) : base;
          const freqEnd2 = (freqEndRatio != null && freqEndRatio !== 1) ? h * freqEndRatio : undefined;
          this._tone(h, wave, spec.duration2, spec.vol2, freqEnd2, master, opts);
        }
      }
    }

    /**
     * Noise + sweep tone — filtered noise burst followed by a tone whose
     * frequency sweeps down to `baseFreq * freqEndRatio`. Covers the
     * shield-hit family (shieldHit / shieldBreak).
     *
     * @param {object} spec - { noiseDur, noiseVol, noiseCutoff,
     *                          toneBaseFreq, toneWave, toneDur, toneVol, freqEndRatio }
     */
    _template_noiseAndSweepTone(spec) {
      const master = this._buildMaster(spec);
      const opts = {
        attack:       (spec.attack       != null) ? spec.attack       : 0.01,
        releaseRatio: (spec.releaseRatio != null) ? spec.releaseRatio : 1.0,
      };
      this._noise(spec.noiseDur, spec.noiseVol, spec.noiseCutoff, master, opts);
      const randomize = (spec.randomizeNote !== undefined) ? !!spec.randomizeNote : true;
      const b = randomize ? this._rndNote(spec.toneBaseFreq) : spec.toneBaseFreq;
      const freqEnd = (spec.freqEndRatio != null) ? b * spec.freqEndRatio : undefined;
      this._tone(b, spec.toneWave || 'sine', spec.toneDur, spec.toneVol, freqEnd, master, opts);
    }

    /**
     * simpleTone — single tone with optional attack/release envelope.
     * Useful for plain beeps/boops or as a building block.
     * Spec : { freq, wave, duration, vol, freqEnd?, attack?, releaseRatio?, detune? }
     */
    _template_simpleTone(spec) {
      const master = this._buildMaster(spec);
      const opts = {
        attack:       (spec.attack       != null) ? spec.attack       : 0.01,
        releaseRatio: (spec.releaseRatio != null) ? spec.releaseRatio : 1.0,
        detune:       spec.detune || 0,
      };
      this._tone(
        spec.freq, spec.wave || 'sine',
        (spec.duration != null) ? spec.duration : 0.3,
        (spec.vol      != null) ? spec.vol      : 0.2,
        spec.freqEnd, master, opts
      );
    }

    /**
     * chord — N notes simultaneously, at musical intervals from baseFreq.
     * Spec : { baseFreq, wave, intervals: [semi1, semi2, ...], duration, vol, attack?, releaseRatio? }
     * Default intervals : [0, 4, 7] (major triad).
     */
    _template_chord(spec) {
      const master   = this._buildMaster(spec);
      const wave     = spec.wave || 'sine';
      const dur      = (spec.duration != null) ? spec.duration : 0.8;
      const vol      = (spec.vol      != null) ? spec.vol      : 0.15;
      const intervals = Array.isArray(spec.intervals) ? spec.intervals : [0, 4, 7];
      const opts = {
        attack:       (spec.attack       != null) ? spec.attack       : 0.02,
        releaseRatio: (spec.releaseRatio != null) ? spec.releaseRatio : 1.0,
      };
      const base = spec.baseFreq || 220;
      for (const semi of intervals) {
        const freq = base * Math.pow(2, semi / 12);
        this._tone(freq, wave, dur, vol, undefined, master, opts);
      }
    }

    /**
     * arpeggio — N notes in sequence at musical intervals (NOT random).
     * Spec : { baseFreq, wave, intervals, interval (sec), duration, vol, attack?, releaseRatio? }
     * Default intervals : [0, 4, 7, 12] (major triad + octave).
     */
    _template_arpeggio(spec) {
      const ctx       = this.ctx;
      const master    = this._buildMaster(spec);
      const wave      = spec.wave || 'sine';
      const intervals = Array.isArray(spec.intervals) ? spec.intervals : [0, 4, 7, 12];
      const stepSec   = (spec.interval != null) ? spec.interval : 0.08;
      const dur       = (spec.duration != null) ? spec.duration : 0.18;
      const vol       = (spec.vol      != null) ? spec.vol      : 0.18;
      const base      = spec.baseFreq || 330;
      const attack    = (spec.attack       != null) ? spec.attack       : 0.005;
      const release   = (spec.releaseRatio != null) ? spec.releaseRatio : 1.0;
      for (let i = 0; i < intervals.length; i++) {
        const t0   = ctx.currentTime + i * stepSec;
        const freq = base * Math.pow(2, intervals[i] / 12);
        const osc  = ctx.createOscillator();
        const g    = ctx.createGain();
        osc.type            = wave;
        osc.frequency.value = freq;
        const v = vol * this.sfxVolume;
        const releaseTime = Math.max(0.001, dur * release);
        const sustainTime = Math.max(0, dur - attack - releaseTime);
        g.gain.setValueAtTime(0, t0);
        g.gain.linearRampToValueAtTime(v, t0 + attack);
        if (sustainTime > 0) g.gain.setValueAtTime(v, t0 + attack + sustainTime);
        g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
        osc.connect(g); g.connect(master);
        osc.start(t0); osc.stop(t0 + dur + 0.05);
      }
    }

    /**
     * kick — low percussive sine with fast freq sweep down + lowpass filter.
     * Spec : { freqStart, freqEnd, duration, vol, cutoff, Q }
     */
    _template_kick(spec) {
      const ctx     = this.ctx;
      const master  = this._buildMaster(spec);
      const freqA   = (spec.freqStart != null) ? spec.freqStart : 150;
      const freqB   = (spec.freqEnd   != null) ? spec.freqEnd   : 40;
      const dur     = (spec.duration  != null) ? spec.duration  : 0.35;
      const vol     = (spec.vol       != null) ? spec.vol       : 0.45;
      const cutoff  = (spec.cutoff    != null) ? spec.cutoff    : 200;
      const Q       = (spec.Q         != null) ? spec.Q         : 2;
      const now = ctx.currentTime;
      const osc    = ctx.createOscillator();
      const filter = ctx.createBiquadFilter();
      const gain   = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freqA, now);
      osc.frequency.exponentialRampToValueAtTime(Math.max(1, freqB), now + dur * 0.5);
      filter.type            = 'lowpass';
      filter.frequency.value = cutoff;
      filter.Q.value         = Q;
      const v = vol * this.sfxVolume;
      gain.gain.setValueAtTime(v, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + dur);
      osc.connect(filter); filter.connect(gain); gain.connect(master);
      osc.start(now);
      osc.stop(now + dur + 0.1);
    }

    /**
     * snare — short noise burst (high cutoff) + crisp low tone.
     * Spec : { noiseDur, noiseVol, noiseCutoff, toneFreq, toneDur, toneVol }
     */
    _template_snare(spec) {
      const master = this._buildMaster(spec);
      const opts = { attack: 0, releaseRatio: 1.0 };
      this._noise(
        (spec.noiseDur    != null) ? spec.noiseDur    : 0.12,
        (spec.noiseVol    != null) ? spec.noiseVol    : 0.35,
        (spec.noiseCutoff != null) ? spec.noiseCutoff : 3500,
        master, opts
      );
      this._tone(
        (spec.toneFreq != null) ? spec.toneFreq : 180,
        'triangle',
        (spec.toneDur  != null) ? spec.toneDur  : 0.06,
        (spec.toneVol  != null) ? spec.toneVol  : 0.2,
        undefined, master, opts
      );
    }

    /**
     * laser — tone sweeping fast from freqStart to freqEnd.
     * Spec : { freqStart, freqEnd, wave, duration, vol }
     */
    _template_laser(spec) {
      const ctx    = this.ctx;
      const master = this._buildMaster(spec);
      const freqA  = (spec.freqStart != null) ? spec.freqStart : 1200;
      const freqB  = (spec.freqEnd   != null) ? spec.freqEnd   : 200;
      const dur    = (spec.duration  != null) ? spec.duration  : 0.16;
      const vol    = (spec.vol       != null) ? spec.vol       : 0.22;
      const wave   = spec.wave || 'square';
      const now = ctx.currentTime;
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = wave;
      osc.frequency.setValueAtTime(freqA, now);
      osc.frequency.exponentialRampToValueAtTime(Math.max(1, freqB), now + dur);
      const v = vol * this.sfxVolume;
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(v, now + 0.005);
      gain.gain.exponentialRampToValueAtTime(0.001, now + dur);
      osc.connect(gain); gain.connect(master);
      osc.start(now);
      osc.stop(now + dur + 0.05);
    }

    /**
     * bell — additive synthesis : N harmonics (1x, 2x, 3x, 5x...) with decaying ratios.
     * Spec : { baseFreq, wave, duration, vol, harmonics: [{mul, gain}], decay }
     * Default harmonics : [{mul:1, gain:1}, {mul:2, gain:0.6}, {mul:3, gain:0.4}, {mul:5, gain:0.2}].
     */
    _template_bell(spec) {
      const master    = this._buildMaster(spec);
      const wave      = spec.wave || 'sine';
      const dur       = (spec.duration != null) ? spec.duration : 1.5;
      const vol       = (spec.vol      != null) ? spec.vol      : 0.12;
      const harmonics = Array.isArray(spec.harmonics) ? spec.harmonics
                       : [{mul:1, gain:1}, {mul:2, gain:0.6}, {mul:3, gain:0.4}, {mul:5, gain:0.2}];
      const base      = spec.baseFreq || 440;
      const opts = {
        attack:       (spec.attack       != null) ? spec.attack       : 0.005,
        releaseRatio: (spec.releaseRatio != null) ? spec.releaseRatio : 1.0,
      };
      for (const h of harmonics) {
        const mul = (h && h.mul  != null) ? h.mul  : 1;
        const hg  = (h && h.gain != null) ? h.gain : 1;
        this._tone(base * mul, wave, dur, vol * hg, undefined, master, opts);
      }
    }

    /**
     * composite — play multiple registered sounds with delays.
     * Spec : { layers: [{ id, delay?, vol? }, ...] }
     * Each layer references another SFX by id (looked up in GALAXTARUS.sfx
     * or .uiSounds). `delay` is the offset in seconds before that layer plays.
     * `vol` is optional multiplier (multiplies sfxVolume during that layer).
     * Recursion is shallow : if a layer.id resolves to another composite,
     * it will play but its own layers won't see this composite's vol multiplier.
     */
    _template_composite(spec) {
      const layers = Array.isArray(spec.layers) ? spec.layers : [];
      for (const layer of layers) {
        if (!layer || !layer.id) continue;
        const delayMs = ((layer.delay != null) ? layer.delay : 0) * 1000;
        const layerVol = layer.vol;
        const id = layer.id;
        setTimeout(() => {
          if (layerVol != null && layerVol !== 1) {
            // Apply vol multiplier transiently
            const saved = this.sfxVolume;
            this.sfxVolume = saved * layerVol;
            try { this.play(id); }
            finally { this.sfxVolume = saved; }
          } else {
            this.play(id);
          }
        }, delayMs);
      }
    }

    // ─────────────────────────────────────────────────────────────
    // SFX CATALOG — verbatim port of the legacy sfx* functions
    // ─────────────────────────────────────────────────────────────

    _play_pickupShield() {
      const b = this._rndNote(440);
      this._tone(b,                'sine', 0.7, 0.22);
      this._tone(this._rndNote(b), 'sine', 0.4, 0.10);
    }

    _play_pickupSuperBoost() {
      const ctx  = this.ctx;
      const base = this._rndNote(220);
      [base, this._rndNote(base), this._rndNote(base), this._rndNote(base)].forEach((freq, i) => {
        const t0  = ctx.currentTime + i * 0.09;
        const osc = ctx.createOscillator();
        const g   = ctx.createGain();
        osc.type            = 'sine';
        osc.frequency.value = freq;
        g.gain.setValueAtTime(0, t0);
        g.gain.linearRampToValueAtTime(0.18 * this.sfxVolume, t0 + 0.015);
        g.gain.exponentialRampToValueAtTime(0.001, t0 + 0.28);
        osc.connect(g); g.connect(ctx.destination);
        osc.start(t0); osc.stop(t0 + 0.35);
      });
    }

    _play_pickupSavePoint() {
      const b = this._rndNote(110);
      this._tone(b,                'sine', 1.6, 0.18);
      this._tone(this._rndNote(b), 'sine', 1.2, 0.09);
    }

    _play_pickupMagnet() {
      // Reused from the legacy : same as pickupShield with a slight tweak
      const b = this._rndNote(330);
      this._tone(b,                'triangle', 0.6, 0.20);
      this._tone(this._rndNote(b), 'triangle', 0.4, 0.10);
    }

    _play_pickupExplosion() {
      // Reused from the legacy : same family
      const b = this._rndNote(220);
      this._tone(b,                'square', 0.5, 0.18);
      this._tone(this._rndNote(b), 'square', 0.3, 0.10);
    }

    _play_shieldHit() {
      this._noise(0.14, 0.30, 200);
      const b = this._rndNote(110);
      this._tone(b, 'sine', 0.25, 0.28, b * 0.5);
    }

    _play_shieldBreak() {
      this._noise(0.35, 0.50, 700);
      const b = this._rndNote(90);
      this._tone(b, 'sawtooth', 0.45, 0.20, b * 0.4);
    }

    /**
     * @param {number} count - 1..5 (more = bigger explosion = lower freq)
     */
    _play_explosionBlast(count = 1) {
      const ctx = this.ctx;
      const norm = Math.min(1, (count - 1) / 4);  // 0..1
      const now  = ctx.currentTime;
      const dur  = 0.9 + norm * 1.4;
      const vol  = (0.22 + norm * 0.24) * this.sfxVolume;
      const freq = 55 - norm * 25;

      // Whoosh : filtered noise burst
      this._noise(dur * 0.55, (0.22 + norm * 0.24) * 0.75, 250 + norm * 500);

      // Boom : low sine sweep down
      const osc    = ctx.createOscillator();
      const filter = ctx.createBiquadFilter();
      const gain   = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq * 2.5, now);
      osc.frequency.exponentialRampToValueAtTime(freq, now + 0.08);
      filter.type            = 'lowpass';
      filter.frequency.value = 180 + norm * 140;
      filter.Q.value         = 3;
      gain.gain.setValueAtTime(vol, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + dur);
      osc.connect(filter); filter.connect(gain); gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + dur + 0.1);
    }

    _play_death() {
      this._noise(1.0, 0.55, 900);
      const b = this._rndNote(50);
      this._tone(b, 'sawtooth', 1.8, 0.28, b * 0.25);
      setTimeout(() => {
        if (this.ready) this._tone(this._rndNote(40), 'sine', 2.2, 0.14, 18);
      }, 250);
    }

    // ─────────────────────────────────────────────────────────────
    // UI SOUNDS — dialogue HUD (data-driven)
    // Parameters live in assets/audio/ui/ui_dialogue_sounds.js
    // (registered as GALAXTARUS.uiSounds[<name>]). Each method here
    // is a thin wrapper that reads the params and feeds them into
    // the existing _tone() helper. To add a new UI sound :
    //   1. Add an entry in ui_dialogue_sounds.js (or a new file)
    //   2. Add a new wrapper method below
    // ─────────────────────────────────────────────────────────────

    /** Read params from the UI sound registry and play via _tone(). */
    _playUiSound(name) {
      const reg = window.GALAXTARUS && window.GALAXTARUS.uiSounds;
      const p = reg ? reg[name] : null;
      if (!p) {
        console.warn('[Audio] UI sound params missing:', name);
        return;
      }
      const freqEnd = (p.freqEnd !== undefined && p.freqEnd !== p.freqStart)
        ? p.freqEnd : undefined;
      this._tone(p.freqStart, p.type || 'sine', p.duration, p.vol, freqEnd);
    }

    _play_dialogueOpen()    { this._playUiSound('dialogueOpen'); }
    _play_dialogueAdvance() { this._playUiSound('dialogueAdvance'); }
    _play_dialogueClose()   { this._playUiSound('dialogueClose'); }

    // Chapter menu — params in assets/audio/ui/ui_menu_sounds.js
    _play_menuSelect()      { this._playUiSound('menuSelect'); }
    _play_menuEngage()      { this._playUiSound('menuEngage'); }
    _play_menuLang()        { this._playUiSound('menuLang'); }
    _play_menuLocked()      { this._playUiSound('menuLocked'); }
  }

  // -- TEMPLATE_SCHEMAS : UI schemas for each data-driven template -----
  // Consumed by sound_editor.html PropertiesPanel to build the form per template.
  // Each schema entry follows PropertiesPanel convention :
  //   { key, label, type: 'number'|'range'|'select'|'text'|'checkbox',
  //     min?, max?, step?, options? }
  // Adding a new template = add a _template_<name>(spec) method + add an
  // entry here. The sound_editor will auto-detect it.
  // Reusable schema fragments — shared by all templates.
  const WAVE_OPTIONS = [
    { value: 'sine',     label: 'Sine'     },
    { value: 'triangle', label: 'Triangle' },
    { value: 'square',   label: 'Square'   },
    { value: 'sawtooth', label: 'Sawtooth' },
  ];

  const REPEAT_SCHEMA = [
    { key: 'repeat',         label: 'Repeat count',        type: 'number', min: 1,    max: 20,  step: 1    },
    { key: 'repeatInterval', label: 'Repeat interval (s)', type: 'range',  min: 0.01, max: 2,   step: 0.01 },
  ];

  const ENVELOPE_SCHEMA = [
    { key: 'attack',        label: 'Attack (s)',     type: 'range', min: 0,   max: 0.5, step: 0.005 },
    { key: 'releaseRatio',  label: 'Release ratio',  type: 'range', min: 0.1, max: 1,   step: 0.05  },
    { key: 'detune',        label: 'Detune (cents)', type: 'number',min: -100, max: 100, step: 1     },
    { key: 'randomizeNote', label: 'Randomize note', type: 'checkbox' },
  ];

  const EFFECTS_SCHEMA = [
    { key: 'filterType',    label: 'Filter type',          type: 'select', options: [
      { value: 'none',     label: 'None'     },
      { value: 'lowpass',  label: 'Lowpass'  },
      { value: 'highpass', label: 'Highpass' },
      { value: 'bandpass', label: 'Bandpass' },
    ] },
    { key: 'filterCutoff',  label: 'Filter cutoff (Hz)',   type: 'number', min: 50,   max: 8000, step: 50   },
    { key: 'filterQ',       label: 'Filter Q',             type: 'range',  min: 0,    max: 20,   step: 0.5  },
    { key: 'pan',           label: 'Pan (-1..+1)',         type: 'range',  min: -1,   max: 1,    step: 0.05 },
    { key: 'distortion',    label: 'Distortion (0..1)',    type: 'range',  min: 0,    max: 1,    step: 0.05 },
    { key: 'delayTime',     label: 'Delay time (s)',       type: 'range',  min: 0,    max: 1,    step: 0.01 },
    { key: 'delayFeedback', label: 'Delay feedback (0..0.9)', type: 'range',  min: 0,    max: 0.9,  step: 0.05 },
    { key: 'delayMix',      label: 'Delay mix (0..1)',     type: 'range',  min: 0,    max: 1,    step: 0.05 },
  ];

  // -- TEMPLATE_SCHEMAS : UI schemas for each data-driven template -----
  // Each schema = [specific params] + ENVELOPE_SCHEMA + REPEAT_SCHEMA + EFFECTS_SCHEMA
  AudioManager.TEMPLATE_SCHEMAS = {
    multiToneRandom: [
      { key: 'baseFreq',     label: 'Base Frequency (Hz)', type: 'number', min: 20,  max: 4000, step: 10   },
      { key: 'wave',         label: 'Wave',                type: 'select', options: WAVE_OPTIONS },
      { key: 'count',        label: 'Tone count',          type: 'number', min: 1,   max: 10,   step: 1    },
      { key: 'interval',     label: 'Stagger interval (s)',type: 'range',  min: 0,   max: 1,    step: 0.01 },
      { key: 'vol',          label: 'Volume',              type: 'range',  min: 0,   max: 1,    step: 0.01 },
      { key: 'duration',     label: 'Duration (s)',        type: 'range',  min: 0.01,max: 5,    step: 0.05 },
      { key: 'vol2',         label: 'Harmonic volume',     type: 'range',  min: 0,   max: 1,    step: 0.01 },
      { key: 'duration2',    label: 'Harmonic duration',   type: 'range',  min: 0.01,max: 5,    step: 0.05 },
      { key: 'freqEndRatio', label: 'Freq end ratio',      type: 'range',  min: 0.1, max: 2,    step: 0.05 },
      ...ENVELOPE_SCHEMA, ...REPEAT_SCHEMA, ...EFFECTS_SCHEMA,
    ],
    noiseAndSweepTone: [
      { key: 'noiseDur',     label: 'Noise duration (s)',  type: 'range',  min: 0.01,max: 2,    step: 0.01 },
      { key: 'noiseVol',     label: 'Noise volume',        type: 'range',  min: 0,   max: 1,    step: 0.01 },
      { key: 'noiseCutoff',  label: 'Noise cutoff (Hz)',   type: 'number', min: 50,  max: 8000, step: 50   },
      { key: 'toneBaseFreq', label: 'Tone base freq (Hz)', type: 'number', min: 20,  max: 4000, step: 10   },
      { key: 'toneWave',     label: 'Tone wave',           type: 'select', options: WAVE_OPTIONS },
      { key: 'toneDur',      label: 'Tone duration (s)',   type: 'range',  min: 0.01,max: 5,    step: 0.05 },
      { key: 'toneVol',      label: 'Tone volume',         type: 'range',  min: 0,   max: 1,    step: 0.01 },
      { key: 'freqEndRatio', label: 'Freq end ratio',      type: 'range',  min: 0.1, max: 2,    step: 0.05 },
      ...ENVELOPE_SCHEMA, ...REPEAT_SCHEMA, ...EFFECTS_SCHEMA,
    ],
    simpleTone: [
      { key: 'freq',         label: 'Frequency (Hz)',      type: 'number', min: 20,  max: 4000, step: 10   },
      { key: 'wave',         label: 'Wave',                type: 'select', options: WAVE_OPTIONS },
      { key: 'duration',     label: 'Duration (s)',        type: 'range',  min: 0.01,max: 5,    step: 0.05 },
      { key: 'vol',          label: 'Volume',              type: 'range',  min: 0,   max: 1,    step: 0.01 },
      { key: 'freqEnd',      label: 'Freq end (Hz)',       type: 'number', min: 20,  max: 4000, step: 10   },
      ...ENVELOPE_SCHEMA, ...REPEAT_SCHEMA, ...EFFECTS_SCHEMA,
    ],
    chord: [
      { key: 'baseFreq',     label: 'Base Frequency (Hz)', type: 'number', min: 20,  max: 2000, step: 10   },
      { key: 'wave',         label: 'Wave',                type: 'select', options: WAVE_OPTIONS },
      { key: 'duration',     label: 'Duration (s)',        type: 'range',  min: 0.01,max: 5,    step: 0.05 },
      { key: 'vol',          label: 'Volume per note',     type: 'range',  min: 0,   max: 1,    step: 0.01 },
      ...ENVELOPE_SCHEMA, ...REPEAT_SCHEMA, ...EFFECTS_SCHEMA,
    ],
    arpeggio: [
      { key: 'baseFreq',     label: 'Base Frequency (Hz)', type: 'number', min: 20,  max: 2000, step: 10   },
      { key: 'wave',         label: 'Wave',                type: 'select', options: WAVE_OPTIONS },
      { key: 'interval',     label: 'Note step (s)',       type: 'range',  min: 0.02,max: 1,    step: 0.01 },
      { key: 'duration',     label: 'Note duration (s)',   type: 'range',  min: 0.02,max: 2,    step: 0.02 },
      { key: 'vol',          label: 'Volume',              type: 'range',  min: 0,   max: 1,    step: 0.01 },
      ...ENVELOPE_SCHEMA, ...REPEAT_SCHEMA, ...EFFECTS_SCHEMA,
    ],
    kick: [
      { key: 'freqStart',    label: 'Freq start (Hz)',     type: 'number', min: 30,  max: 500,  step: 10   },
      { key: 'freqEnd',      label: 'Freq end (Hz)',       type: 'number', min: 10,  max: 200,  step: 5    },
      { key: 'duration',     label: 'Duration (s)',        type: 'range',  min: 0.05,max: 1,    step: 0.05 },
      { key: 'vol',          label: 'Volume',              type: 'range',  min: 0,   max: 1,    step: 0.01 },
      { key: 'cutoff',       label: 'Lowpass cutoff (Hz)', type: 'number', min: 50,  max: 1000, step: 50   },
      { key: 'Q',            label: 'Lowpass Q',           type: 'range',  min: 0,   max: 10,   step: 0.5  },
      ...REPEAT_SCHEMA, ...EFFECTS_SCHEMA,
    ],
    snare: [
      { key: 'noiseDur',     label: 'Noise duration (s)',  type: 'range',  min: 0.02,max: 1,    step: 0.01 },
      { key: 'noiseVol',     label: 'Noise volume',        type: 'range',  min: 0,   max: 1,    step: 0.01 },
      { key: 'noiseCutoff',  label: 'Noise cutoff (Hz)',   type: 'number', min: 200, max: 8000, step: 100  },
      { key: 'toneFreq',     label: 'Tone freq (Hz)',      type: 'number', min: 50,  max: 800,  step: 10   },
      { key: 'toneDur',      label: 'Tone duration (s)',   type: 'range',  min: 0.02,max: 0.5,  step: 0.01 },
      { key: 'toneVol',      label: 'Tone volume',         type: 'range',  min: 0,   max: 1,    step: 0.01 },
      ...REPEAT_SCHEMA, ...EFFECTS_SCHEMA,
    ],
    laser: [
      { key: 'freqStart',    label: 'Freq start (Hz)',     type: 'number', min: 100, max: 5000, step: 50   },
      { key: 'freqEnd',      label: 'Freq end (Hz)',       type: 'number', min: 20,  max: 2000, step: 10   },
      { key: 'wave',         label: 'Wave',                type: 'select', options: WAVE_OPTIONS },
      { key: 'duration',     label: 'Duration (s)',        type: 'range',  min: 0.02,max: 1,    step: 0.01 },
      { key: 'vol',          label: 'Volume',              type: 'range',  min: 0,   max: 1,    step: 0.01 },
      ...REPEAT_SCHEMA, ...EFFECTS_SCHEMA,
    ],
    bell: [
      { key: 'baseFreq',     label: 'Base Frequency (Hz)', type: 'number', min: 50,  max: 4000, step: 10   },
      { key: 'wave',         label: 'Wave',                type: 'select', options: WAVE_OPTIONS },
      { key: 'duration',     label: 'Duration (s)',        type: 'range',  min: 0.1, max: 5,    step: 0.1  },
      { key: 'vol',          label: 'Volume',              type: 'range',  min: 0,   max: 1,    step: 0.01 },
      ...ENVELOPE_SCHEMA, ...REPEAT_SCHEMA, ...EFFECTS_SCHEMA,
    ],
    composite: [
      // Composite layers are edited via the JSON textarea (no slider UI for nested objects).
      // Use spec.layers = [{ id: 'pickupShield', delay: 0, vol: 1 }, { id: 'kick', delay: 0.05 }]
      ...REPEAT_SCHEMA, ...EFFECTS_SCHEMA,
    ],
  };

  // Expose : the class only (regles 13 + 14). Instance creee par le
  // boot du jeu (galaxtarus.html / test_ship.html) et injectee via game.
  window.GALAXTARUS                    = window.GALAXTARUS                    || {};
  window.GALAXTARUS.audio              = window.GALAXTARUS.audio              || {};
  window.GALAXTARUS.audio.AudioManager = AudioManager;
})();
