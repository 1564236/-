(function () {
  "use strict";

  const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);

  class AudioEngine {
    constructor() {
      this.ctx = null;
      this.master = null;
      this.musicBus = null;
      this.sfxBus = null;
      this.delay = null;
      this.noiseBuffer = null;
      this.muted = false;
      this.started = false;
      this.timer = null;
      this.nextTime = 0;
      this.step = 0;
      this.scene = "mountain";
      this.boss = false;
      this.tempo = 104;
      this.intensity = 0;
    }

    init() {
      if (this.ctx) {
        if (this.ctx.state === "suspended") this.ctx.resume().catch(() => {});
        return;
      }
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;

      try {
        this.ctx = new AC();
        const ctx = this.ctx;

        const comp = ctx.createDynamicsCompressor();
        comp.threshold.value = -18;
        comp.knee.value = 18;
        comp.ratio.value = 4;
        comp.attack.value = 0.006;
        comp.release.value = 0.22;
        comp.connect(ctx.destination);

        this.master = ctx.createGain();
        this.master.gain.value = this.muted ? 0 : 0.72;
        this.master.connect(comp);

        this.musicBus = ctx.createGain();
        this.musicBus.gain.value = 0.36;
        this.musicBus.connect(this.master);

        this.sfxBus = ctx.createGain();
        this.sfxBus.gain.value = 0.9;
        this.sfxBus.connect(this.master);

        this.delay = ctx.createDelay(1.2);
        this.delay.delayTime.value = 0.26;
        const feedback = ctx.createGain();
        feedback.gain.value = 0.18;
        const wet = ctx.createGain();
        wet.gain.value = 0.18;
        this.delay.connect(feedback).connect(this.delay);
        this.delay.connect(wet).connect(this.master);
        this.musicBus.connect(this.delay);

        this.noiseBuffer = this.makeNoise(2);

        this.startMusic();
        this.started = true;

        if (ctx.state === "suspended") ctx.resume().catch(() => {});
      } catch (err) {
        console.warn("Audio unavailable", err);
      }
    }

    makeNoise(seconds) {
      const length = Math.floor(this.ctx.sampleRate * seconds);
      const buffer = this.ctx.createBuffer(1, length, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
      return buffer;
    }

    setMuted(muted) {
      this.muted = muted;
      if (!this.ctx || !this.master) return;
      const target = muted ? 0 : 0.72;
      this.master.gain.cancelScheduledValues(this.ctx.currentTime);
      this.master.gain.setTargetAtTime(target, this.ctx.currentTime, 0.04);
    }

    toggleMuted() {
      this.setMuted(!this.muted);
      return this.muted;
    }

    setScene(scene, boss = false) {
      const changed = scene !== this.scene || boss !== this.boss;
      this.scene = scene;
      this.boss = boss;
      if (changed) {
        this.step = 0;
        if (this.ctx) this.nextTime = this.ctx.currentTime + 0.08;
        this.tempo = scene === "cave" ? 92 : scene === "bone" ? 88 : scene === "fire" ? 120 : scene === "river" ? 84 : 106;
        if (boss) this.tempo += 20;
      }
    }

    setPaused(paused) {
      if (!this.ctx) return;
      const target = paused ? 0.12 : 0.36;
      this.musicBus.gain.setTargetAtTime(target, this.ctx.currentTime, 0.1);
    }

    startMusic() {
      if (this.timer || !this.ctx) return;
      this.nextTime = this.ctx.currentTime + 0.1;
      this.timer = setInterval(() => this.schedule(), 45);
    }

    schedule() {
      if (!this.ctx || this.ctx.state !== "running") return;
      const ahead = 0.22;
      while (this.nextTime < this.ctx.currentTime + ahead) {
        this.scheduleStep(this.step, this.nextTime);
        this.nextTime += 60 / this.tempo / 2;
        this.step++;
      }
    }

    scheduleStep(step, t) {
      const s = step % 32;
      const isBoss = this.boss;
      const roots = { mountain: 60, cave: 57, bone: 52 };
      const root = roots[this.scene] || 60;

      const melodies = {
        mountain: [0, 7, 9, 12, 9, 7, 4, 7, 0, 7, 12, 16, 14, 12, 9, 7],
        cave: [0, 3, 7, 10, 7, 3, 0, -2, 0, 3, 7, 12, 10, 7, 3, 0],
        bone: [0, 5, 7, 12, 10, 7, 5, 0, -3, 0, 5, 7, 12, 10, 7, 5]
      };

      const melody = melodies[this.scene] || melodies.mountain;
      const notes = isBoss ? melody.map((n) => n - 5) : melody;

      if (s % 2 === 0) {
        const idx = s / 2;
        const midi = root + notes[idx % notes.length] + (s >= 16 ? 12 : 0);
        this.tone(mtof(midi), t, 0.17, {
          type: this.scene === "bone" || this.scene === "river" ? "triangle" : "square",
          gain: isBoss ? 0.055 : 0.043,
          attack: 0.008,
          release: 0.1,
          filter: 2200
        });
      }

      if (s % 8 === 0) {
        this.tone(mtof(root - 24 + (s === 16 ? 7 : 0)), t, 0.42, {
          type: "triangle",
          gain: 0.09,
          attack: 0.01,
          release: 0.2,
          filter: 700
        });
      }
      if (s === 6 || s === 14 || s === 22 || s === 30) {
        this.tone(mtof(root - 12), t, 0.24, { type: "sine", gain: 0.032, release: 0.16 });
      }

      if (s % 4 === 2) this.hat(t, 0.012, 0.035);
      if (s === 0 || s === 8 || s === 16 || s === 24) this.kick(t, isBoss ? 0.1 : 0.075);
      if (isBoss && (s === 12 || s === 28)) this.tom(t, 0.055);

      if (isBoss && s % 16 === 0) {
        this.tone(mtof(root - 36), t, 0.6, { type: "sawtooth", gain: 0.03, filter: 240, release: 0.4 });
      }
    }

    tone(freq, time, duration, opts = {}) {
      if (!this.ctx) return;
      const ctx = this.ctx;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      let node = osc;
      osc.type = opts.type || "square";
      osc.frequency.setValueAtTime(Math.max(20, freq), time);
      if (opts.slide) {
        osc.frequency.exponentialRampToValueAtTime(Math.max(20, opts.slide), time + duration);
      }
      let filter = null;
      if (opts.filter) {
        filter = ctx.createBiquadFilter();
        filter.type = "lowpass";
        filter.frequency.value = opts.filter;
        filter.Q.value = opts.q || 0.7;
        osc.connect(filter);
        node = filter;
      }
      node.connect(gain);
      gain.connect(opts.bus || this.sfxBus);
      const peak = Math.max(0.0001, opts.gain || 0.04);
      const attack = opts.attack === undefined ? 0.004 : opts.attack;
      const release = opts.release === undefined ? 0.05 : opts.release;
      gain.gain.setValueAtTime(0.0001, time);
      gain.gain.linearRampToValueAtTime(peak, time + attack);
      gain.gain.setValueAtTime(peak, time + Math.max(attack, duration - release));
      gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);
      osc.start(time);
      osc.stop(time + duration + 0.03);
    }

    noise(time, duration, gainValue, filterFreq, type = "bandpass", bus) {
      if (!this.ctx || !this.noiseBuffer) return;
      const ctx = this.ctx;
      const src = ctx.createBufferSource();
      src.buffer = this.noiseBuffer;
      const filter = ctx.createBiquadFilter();
      filter.type = type;
      filter.frequency.value = filterFreq;
      filter.Q.value = 0.8;
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.0001, time);
      gain.gain.linearRampToValueAtTime(gainValue, time + 0.006);
      gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);
      src.connect(filter).connect(gain).connect(bus || this.sfxBus);
      src.start(time);
      src.stop(time + duration + 0.02);
    }

    kick(t, gainValue = 0.08) {
      this.tone(120, t, 0.16, { type: "sine", gain: gainValue, slide: 48, release: 0.12 });
    }

    hat(t, duration = 0.025, gainValue = 0.02) {
      this.noise(t, duration, gainValue, 7200, "highpass");
    }

    tom(t, gainValue = 0.04) {
      this.tone(150, t, 0.12, { type: "sine", gain: gainValue, slide: 90, release: 0.08 });
    }

    sfx(name, option) {
      if (!this.ctx || this.muted) return;
      const t = this.ctx.currentTime + 0.008;
      switch (name) {
        case "ui":
          this.tone(520, t, 0.05, { type: "square", gain: 0.025, release: 0.03 });
          break;
        case "jump":
          this.tone(230, t, 0.1, { type: "square", gain: 0.035, slide: 440, release: 0.06 });
          break;
        case "doubleJump":
          this.tone(420, t, 0.12, { type: "triangle", gain: 0.04, slide: 760, release: 0.07 });
          this.noise(t, 0.09, 0.02, 2600, "bandpass");
          break;
        case "slash":
          this.noise(t, 0.09, 0.06, 1900, "bandpass");
          this.tone(190, t, 0.06, { type: "sawtooth", gain: 0.025, slide: 110, filter: 900 });
          break;
        case "hit":
          this.tone(120, t, 0.08, { type: "square", gain: 0.055, slide: 62, release: 0.05 });
          this.noise(t, 0.06, 0.04, 800, "lowpass");
          break;
        case "crit":
          this.tone(180, t, 0.1, { type: "square", gain: 0.06, slide: 78, release: 0.06 });
          this.tone(920, t + 0.01, 0.07, { type: "triangle", gain: 0.03, slide: 1400 });
          break;
        case "hurt":
          this.tone(210, t, 0.22, { type: "sawtooth", gain: 0.065, slide: 70, filter: 900, release: 0.12 });
          this.noise(t, 0.12, 0.035, 600, "lowpass");
          break;
        case "skill":
          this.noise(t, 0.45, 0.07, 1200, "bandpass");
          this.tone(90, t, 0.36, { type: "sawtooth", gain: 0.055, slide: 48, filter: 500, release: 0.2 });
          this.tone(420, t + 0.03, 0.32, { type: "square", gain: 0.025, slide: 120, release: 0.2 });
          break;
        case "dash":
          this.noise(t, 0.16, 0.045, 2400, "bandpass");
          this.tone(300, t, 0.1, { type: "sine", gain: 0.02, slide: 600 });
          break;
        case "potion":
          this.tone(420, t, 0.08, { type: "sine", gain: 0.03, slide: 620 });
          this.tone(620, t + 0.08, 0.16, { type: "sine", gain: 0.032, slide: 900, release: 0.1 });
          break;
        case "levelup":
          [0, 4, 7, 12].forEach((n, i) => {
            this.tone(mtof(72 + n), t + i * 0.09, 0.28, { type: "square", gain: 0.038, release: 0.16, filter: 3000 });
          });
          this.tone(mtof(48), t, 0.4, { type: "triangle", gain: 0.035, release: 0.2 });
          break;
        case "loot": {
          const rare = option || "common";
          const base = rare === "legendary" ? 84 : rare === "epic" ? 81 : rare === "rare" ? 79 : 76;
          this.tone(mtof(base), t, 0.18, { type: "triangle", gain: 0.035, release: 0.14 });
          this.tone(mtof(base + 7), t + 0.08, 0.26, { type: "triangle", gain: 0.038, release: 0.18 });
          if (rare === "epic" || rare === "legendary") {
            this.tone(mtof(base + 12), t + 0.17, 0.32, { type: "sine", gain: 0.04, release: 0.24 });
          }
          break;
        }
        case "equip":
          this.tone(320, t, 0.06, { type: "square", gain: 0.026 });
          this.tone(480, t + 0.055, 0.1, { type: "square", gain: 0.026, release: 0.06 });
          break;
        case "gold":
          this.tone(mtof(88), t, 0.06, { type: "square", gain: 0.022 });
          this.tone(mtof(93), t + 0.05, 0.1, { type: "square", gain: 0.02, release: 0.08 });
          break;
        case "boss":
          this.tone(52, t, 1.1, { type: "sawtooth", gain: 0.08, slide: 38, filter: 260, release: 0.7 });
          this.noise(t, 0.9, 0.06, 420, "lowpass");
          break;
        case "bosswind":
          this.noise(t, 0.28, 0.035, 780, "bandpass");
          this.tone(78, t, 0.3, { type: "sawtooth", gain: 0.028, slide: 54, filter: 420, release: 0.2 });
          break;
        case "gong":
          this.tone(96, t, 0.9, { type: "sine", gain: 0.06, slide: 72, release: 0.6 });
          this.tone(196, t, 0.6, { type: "triangle", gain: 0.026, release: 0.45 });
          this.noise(t, 0.35, 0.025, 1200, "bandpass");
          break;
        case "portal":
          [0, 5, 9, 12].forEach((n, i) => {
            this.tone(mtof(72 + n), t + i * 0.06, 0.4, { type: "sine", gain: 0.028, release: 0.3 });
          });
          break;
        case "death":
          [0, -3, -7, -12].forEach((n, i) => {
            this.tone(mtof(60 + n), t + i * 0.16, 0.5, { type: "triangle", gain: 0.045, release: 0.3 });
          });
          break;
        case "victory":
          [0, 4, 7, 12, 7, 12, 16].forEach((n, i) => {
            this.tone(mtof(65 + n), t + i * 0.14, 0.45, { type: "triangle", gain: 0.045, release: 0.28 });
          });
          break;
        case "error":
          this.tone(150, t, 0.12, { type: "square", gain: 0.03, slide: 100 });
          break;
        default:
          break;
      }
    }
  }

  window.GameAudio = new AudioEngine();
})();
