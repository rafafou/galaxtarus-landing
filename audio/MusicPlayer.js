// MusicPlayer — Web Audio synthesis for music tracks.
// Faithful port of the legacy updateMusic() + playMidiNote() into a
// reusable, data-driven class. Songs are defined in
// assets/audio/music/<name>.js and registered into GALAXTARUS.music_tracks.
//
// USAGE :
//   const audio = new GALAXTARUS.audio.AudioManager();
//   const music = new GALAXTARUS.audio.MusicPlayer(audio);
//   music.play('theme_galaxtarus');     // start a song
//   music.update();                     // call every frame (via Game.onEveryFrame)
//   music.setActiveLead('melodie_D');   // switch lead melody
//   music.stop();                       // stop
//
// The lookahead scheduler (0.2s) needs `update()` to be called every
// frame from the game loop, like the legacy did.
//
// EXTENDING :
//   Add a new instrument type by adding a method named
//   _play_<type>(note, time, duration, velocity). The data file's
//   `instruments[trackName].type` then refers to it.

(function() {
  'use strict';

  const LOOKAHEAD = 0.2;   // seconds, like legacy
  const FADE_TIME = 0.6;   // seconds, fade out on stop

  /** MIDI note number → frequency in Hz. */
  function midiFreq(note) {
    return 440 * Math.pow(2, (note - 69) / 12);
  }

  // GM drum map — borrowed from the legacy.
  const KICK   = new Set([35, 36]);
  const SNARE  = new Set([38, 40]);
  const HIHAT  = new Set([42, 44, 46]);
  const CYMBAL = new Set([49, 51, 52, 55, 57, 59]);
  const TOM    = new Set([41, 43, 45, 47, 48, 50]);

  class MusicPlayer {
    constructor(audio) {
      this.audio          = audio;       // ref to AudioManager (for ctx + flags)
      this.song           = null;        // currently loaded song (data object)
      this.activeLead     = null;        // lead trackName currently playing
      this.targetLead     = null;        // lead trackName we want to switch to
      this.startTime      = 0;           // ctx time when the song started
      this.leadStartTime  = 0;           // ctx time when current lead started
      this.scheduledUntil = 0;           // ctx time we've scheduled up to
    }

    /**
     * Start a song by name. If something is already playing, it stops
     * immediately (no cross-fade for now). Returns true on success.
     */
    play(songName) {
      const ctx = this.audio.ctx;
      if (!this.audio.ready || !ctx) return false;

      const song = (window.GALAXTARUS.music_tracks || {})[songName];
      if (!song) {
        console.warn('[Music] Unknown song:', songName);
        return false;
      }

      this.song           = song;
      this.activeLead     = song.defaultLead || null;
      this.targetLead     = this.activeLead;
      this.startTime      = ctx.currentTime + 0.5;   // small lead-in like legacy
      this.leadStartTime  = this.startTime;
      this.scheduledUntil = this.startTime;
      return true;
    }

    /** Stop the song. No more notes will be scheduled. */
    stop() {
      this.song           = null;
      this.activeLead     = null;
      this.targetLead     = null;
      this.scheduledUntil = 0;
    }

    /**
     * Request a lead melody switch. The switch happens at the next loop
     * boundary of the current lead (so the music stays musical).
     */
    setActiveLead(trackName) {
      if (!this.song) return;
      if (!this.song.leads || !this.song.leads[trackName]) {
        console.warn('[Music] Unknown lead:', trackName);
        return;
      }
      this.targetLead = trackName;
    }

    /** Loop duration for a given lead (falls back to song.loopDuration). */
    _leadLoop(leadName) {
      if (!this.song) return 0;
      const cfg = (this.song.leads || {})[leadName];
      return (cfg && cfg.loopDuration) || this.song.loopDuration;
    }

    /**
     * Drive the scheduler. Call this every frame. Bails out cleanly when
     * music is disabled or no song is loaded.
     */
    update() {
      const audio = this.audio;
      if (!audio.ready || !audio.musicEnabled || !this.song) return;
      const ctx = audio.ctx;
      const now = ctx.currentTime;
      const schedEnd = now + LOOKAHEAD;
      if (this.scheduledUntil >= schedEnd) return;

      // Honor a pending lead switch at the next lead-loop boundary.
      if (this.activeLead !== this.targetLead) {
        const oldLoop  = this._leadLoop(this.activeLead);
        const elapsed  = Math.max(now - this.leadStartTime, 0.001);
        const nextEdge = this.leadStartTime + Math.ceil(elapsed / oldLoop) * oldLoop;
        if (nextEdge <= schedEnd) {
          this.activeLead    = this.targetLead;
          this.leadStartTime = nextEdge;
        }
      }

      // Schedule the active lead.
      if (this.activeLead) {
        this._scheduleTrack(this.activeLead, this.leadStartTime, this._leadLoop(this.activeLead), schedEnd);
      }

      // Schedule all non-lead tracks (continuous, song-wide loop).
      const songLoop = this.song.loopDuration;
      for (const trackName of Object.keys(this.song.tracks)) {
        if (this.song.leads && this.song.leads[trackName]) continue;  // skip leads
        this._scheduleTrack(trackName, this.startTime, songLoop, schedEnd);
      }

      this.scheduledUntil = schedEnd;
    }

    /** Schedule notes from a track that haven't been scheduled yet. */
    _scheduleTrack(trackName, anchorTime, loopDuration, schedEnd) {
      const notes = this.song.tracks[trackName];
      if (!notes || !loopDuration) return;
      const instrument = (this.song.instruments || {})[trackName] || { type: 'square' };
      const method     = '_play_' + instrument.type;
      const synth      = (typeof this[method] === 'function') ? this[method] : this._play_square;

      for (const n of notes) {
        const firstLoop = Math.floor((this.scheduledUntil - anchorTime - n.time) / loopDuration);
        const startLoop = Math.max(0, firstLoop);
        // 3 loops ahead is plenty for a 0.2s lookahead
        for (let k = startLoop; k < startLoop + 3; k++) {
          const absTime = anchorTime + k * loopDuration + n.time;
          if (absTime >= this.scheduledUntil && absTime < schedEnd) {
            synth.call(this, n.note, absTime, n.duration, n.velocity, instrument);
          }
        }
      }
    }

    // ─────────────────────────────────────────────────────────────
    // INSTRUMENTS — verbatim port of legacy playMidiNote() branches.
    // Each method receives MIDI note + scheduled time + duration +
    // velocity (0..127). They build a one-shot synth graph.
    // ─────────────────────────────────────────────────────────────

    /** Square wave (NES-style lead). */
    _play_square(note, time, duration, velocity) {
      const ctx  = this.audio.ctx;
      const vol  = (velocity / 127) * this.audio.musicVolume;
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type            = 'square';
      osc.frequency.value = midiFreq(note);
      gain.gain.setValueAtTime(0, time);
      gain.gain.linearRampToValueAtTime(vol * 0.07, time + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, time + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(time);
      osc.stop(time + duration + 0.05);
    }

    /** Triangle wave (Game Boy-style soft chords). */
    _play_triangle(note, time, duration, velocity) {
      const ctx  = this.audio.ctx;
      const vol  = (velocity / 127) * this.audio.musicVolume;
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type            = 'triangle';
      osc.frequency.value = midiFreq(note);
      gain.gain.setValueAtTime(0, time);
      gain.gain.linearRampToValueAtTime(vol * 0.045, time + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, time + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(time);
      osc.stop(time + duration + 0.05);
    }

    /** Filtered sawtooth (retro synth bass). */
    _play_sawBass(note, time, duration, velocity) {
      const ctx    = this.audio.ctx;
      const vol    = (velocity / 127) * this.audio.musicVolume;
      const osc    = ctx.createOscillator();
      const filter = ctx.createBiquadFilter();
      const gain   = ctx.createGain();
      osc.type               = 'sawtooth';
      osc.frequency.value    = midiFreq(note);
      filter.type            = 'lowpass';
      filter.frequency.value = 320;
      filter.Q.value         = 6;
      gain.gain.setValueAtTime(0, time);
      gain.gain.linearRampToValueAtTime(vol * 0.13, time + 0.008);
      gain.gain.exponentialRampToValueAtTime(0.001, time + duration);
      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      osc.start(time);
      osc.stop(time + duration + 0.05);
    }

    /** Drum kit (filtered noise + tom sine, GM drum map). */
    _play_drumKit(note, time, duration, velocity) {
      const ctx        = this.audio.ctx;
      const vol        = (velocity / 127) * this.audio.musicVolume;
      const sampleRate = ctx.sampleRate;

      // Tom : sine descending — handled separately, no noise.
      if (TOM.has(note)) {
        const freq = note > 47 ? 200 : 120;
        const osc  = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, time);
        osc.frequency.exponentialRampToValueAtTime(freq * 0.4, time + 0.15);
        gain.gain.setValueAtTime(vol * 0.25, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.15);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(time);
        osc.stop(time + 0.2);
        return;
      }

      // Other drums : filtered noise burst.
      let dur, cutoff, cutoffType, gainVol;
      if (KICK.has(note)) {
        dur = 0.18; cutoff = 90;   cutoffType = 'lowpass';  gainVol = vol * 0.5;
      } else if (SNARE.has(note)) {
        dur = 0.12; cutoff = 2500; cutoffType = 'bandpass'; gainVol = vol * 0.3;
      } else if (HIHAT.has(note)) {
        dur = note === 46 ? 0.10 : 0.04; cutoff = 9000; cutoffType = 'highpass'; gainVol = vol * 0.12;
      } else if (CYMBAL.has(note)) {
        dur = 0.35; cutoff = 7000; cutoffType = 'highpass'; gainVol = vol * 0.10;
      } else {
        dur = 0.06; cutoff = 4000; cutoffType = 'highpass'; gainVol = vol * 0.1;
      }

      const len    = Math.ceil(sampleRate * dur);
      const buf    = ctx.createBuffer(1, len, sampleRate);
      const data   = buf.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
      const src    = ctx.createBufferSource();
      const filter = ctx.createBiquadFilter();
      const gain   = ctx.createGain();
      src.buffer             = buf;
      filter.type            = cutoffType;
      filter.frequency.value = cutoff;
      gain.gain.setValueAtTime(gainVol, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + dur);
      src.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      src.start(time);
    }
  }

  // ────────────────────────────────────────────────────────────
  //  Expose : la classe seule (règles 13 + 14, voir COMMENT_TRAVAILLER.md).
  //  L'instance est créée au boot avec `new G.audio.MusicPlayer(audio)`.
  // ────────────────────────────────────────────────────────────
  window.GALAXTARUS = window.GALAXTARUS || {};
  window.GALAXTARUS.audio = window.GALAXTARUS.audio || {};
  window.GALAXTARUS.audio.MusicPlayer = MusicPlayer;
})();
