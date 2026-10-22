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
      this.tempo = 152;
      this.intensity = 0;
      // BGM：默认使用内置 UniCube 风格合成曲；若 audio/unicube.* 存在则优先播放
      this.bgmName = "unicube";
      this.customBgm = null;
      this.customNode = null;
      this.customLoading = false;
    }

    /* ---------------- BGM：自定义音频优先，缺失时用内置合成曲 ---------------- */
    tryLoadCustomBgm() {
      if (this.customBgm || this.customLoading || !this.ctx) return;
      // 目标曲目：Leoseven - UNICUBE（需自行放入 audio/ 目录）
      const bases = ["unicube", "UNICUBE", "UniCube", "leoseven-unicube", "Leoseven-UNICUBE", "leoseven_unicube", "bgm"];
      const exts = ["mp3", "ogg", "wav", "m4a"];
      const candidates = [];
      for (const base of bases) for (const ext of exts) candidates.push(`audio/${base}.${ext}`);
      this.customLoading = true;
      const attempt = (i) => {
        if (i >= candidates.length) {
          this.customLoading = false;
          console.info("[BGM] 未检测到 audio/unicube.mp3（Leoseven - UNICUBE），当前播放内置合成曲。放入音频文件后刷新即可切换。");
          return;
        }
        fetch(candidates[i])
          .then((res) => {
            if (!res.ok) throw new Error("missing");
            return res.arrayBuffer();
          })
          .then((buf) => this.ctx.decodeAudioData(buf))
          .then((decoded) => {
            this.customBgm = decoded;
            this.customLoading = false;
            this.playCustomBgm();
            console.info(`[BGM] 已载入自定义曲目：${candidates[i]}`);
          })
          .catch(() => attempt(i + 1));
      };
      attempt(0);
    }

    playCustomBgm() {
      if (!this.ctx || !this.customBgm || this.customNode) return;
      const src = this.ctx.createBufferSource();
      src.buffer = this.customBgm;
      src.loop = true;
      src.connect(this.musicBus);
      src.start();
      this.customNode = src;
      // 自定义 BGM 接管后停止内置步进音序器
      if (this.timer) {
        clearInterval(this.timer);
        this.timer = null;
      }
      this.bgmName = "unicube";
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
        this.tryLoadCustomBgm();

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
        // UniCube 风格统一速度，妖王战略微加速
        this.tempo = boss ? 160 : 152;
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
        this.nextTime += 60 / this.tempo / 4;
        this.step++;
      }
    }

    scheduleStep(step, t) {
      const prevBus = this._bus;
      this._bus = this.musicBus;
      const s = step % 64;
      const isBoss = this.boss;
      const t16 = s % 16;
      // 和弦进行：Am - F - C - G
      const PROG = [
        { root: 45, tones: [0, 3, 7, 12] },
        { root: 41, tones: [0, 4, 7, 12] },
        { root: 48, tones: [0, 4, 7, 12] },
        { root: 43, tones: [0, 4, 7, 11] }
      ];
      const chord = PROG[((s / 16) | 0) % 4];

      // 主音琶音：密集 16 分音符，第二段换一条旋律走向
      const SHAPE_A = [0, 1, 2, 3, 2, 3, 1, 2, 0, 2, 3, 1, 2, 1, 3, 2];
      const SHAPE_B = [3, 2, 1, 0, 1, 2, 3, 2, 3, 1, 0, 2, 3, 2, 1, 0];
      const shape = ((s / 32) | 0) % 2 === 0 ? SHAPE_A : SHAPE_B;
      const idx = shape[t16];
      const accent = t16 % 4 === 0;
      const midi = chord.root + 12 + chord.tones[idx] + (idx >= 3 ? 12 : 0) + (accent ? 0 : 0);
      this.tone(mtof(midi), t, accent ? 0.16 : 0.11, {
        type: isBoss ? "sawtooth" : "square",
        gain: (isBoss ? 0.05 : 0.038) * (accent ? 1.15 : 0.85),
        attack: 0.005,
        release: 0.06,
        filter: isBoss ? 3200 : 2600
      });
      // 高八度点缀
      if (accent) {
        this.tone(mtof(chord.root + 24 + chord.tones[idx]), t, 0.09, {
          type: "triangle",
          gain: isBoss ? 0.02 : 0.015,
          release: 0.05
        });
      }

      // 贝斯：正拍 + 反拍
      if (t16 % 4 === 0) {
        this.tone(mtof(chord.root - 12), t, 0.2, { type: "sawtooth", gain: isBoss ? 0.095 : 0.078, attack: 0.006, release: 0.1, filter: 520 });
      } else if (t16 % 4 === 2) {
        this.tone(mtof(chord.root - 12), t, 0.1, { type: "square", gain: isBoss ? 0.055 : 0.042, release: 0.05, filter: 620 });
      }

      // 铺底和弦
      if (t16 === 0 || t16 === 8) {
        const padGain = t16 === 0 ? (isBoss ? 0.026 : 0.02) : (isBoss ? 0.018 : 0.014);
        for (const n of [chord.tones[0], chord.tones[1], chord.tones[2]]) {
          this.tone(mtof(chord.root + 12 + n), t, t16 === 0 ? 0.95 : 0.5, {
            type: "triangle",
            gain: padGain,
            attack: 0.03,
            release: 0.35,
            filter: 1700
          });
        }
      }

      // 鼓组
      if (t16 === 0 || t16 === 8) this.kick(t, isBoss ? 0.11 : 0.085);
      if (isBoss && (t16 === 6 || t16 === 14)) this.kick(t, 0.06);
      if (t16 === 4 || t16 === 12) this.snare(t, isBoss ? 0.075 : 0.058);
      if (t16 % 2 === 0) this.hat(t, t16 % 4 === 0 ? 0.016 : 0.012, t16 % 4 === 0 ? 0.032 : 0.022);
      if (t16 === 15) this.hat(t, 0.09, 0.026);
      if (isBoss && (t16 === 10 || t16 === 14)) this.tom(t, 0.05);
      if (s % 64 === 0) {
        this.noise(t, 0.5, isBoss ? 0.05 : 0.038, 5200, "highpass", this.musicBus);
      }
      if (isBoss && s % 16 === 0) {
        this.tone(mtof(chord.root - 36), t, 0.5, { type: "sawtooth", gain: 0.028, filter: 280, release: 0.3 });
      }
      this._bus = prevBus;
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
      gain.connect(opts.bus || this._bus || this.sfxBus);
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
      src.connect(filter).connect(gain).connect(bus || this._bus || this.sfxBus);
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

    snare(t, gainValue = 0.06) {
      this.noise(t, 0.14, gainValue, 1900, "bandpass");
      this.tone(210, t, 0.08, { type: "triangle", gain: gainValue * 0.5, slide: 140, release: 0.05 });
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
