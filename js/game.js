(function () {
  "use strict";

  const D = window.GameData;
  const A = window.Art;
  const Audio = window.GameAudio;
  const {
    W, H, FLOOR, WORLD_W, SAVE_KEY, SLOT_ORDER,
    clamp, lerp, rand, randInt, choice, chance, xpNeeded, scoreItem, getRarity
  } = D;

  const SAVE_VERSION = 2;
  const ROLL_TIME = 0.42;

  function cnNum(n) {
    const digits = ["零", "一", "二", "三", "四", "五", "六", "七", "八", "九"];
    const value = Math.max(1, Math.floor(n));
    if (value <= 10) return value === 10 ? "十" : digits[value];
    if (value < 20) return `十${digits[value - 10]}`;
    if (value < 100) {
      const tens = Math.floor(value / 10);
      const ones = value % 10;
      return `${digits[tens]}十${ones ? digits[ones] : ""}`;
    }
    return String(value);
  }
  const STAT_KEYS = [
    "atk", "def", "hp", "mp", "crit", "speed", "goldPct", "lifesteal",
    "atkPct", "hpPct", "defPct", "skillPct", "bossPct", "cdr", "dr",
    "atkSpeedPct", "luck"
  ];
  const SPECIAL_STAT_KEYS = [
    "atkPct", "hpPct", "defPct", "skillPct", "bossPct", "cdr", "dr",
    "atkSpeedPct", "luck", "lifesteal"
  ];

  // 普攻四阶段：轻击 → 中击 → 重击 → 暴击
  const COMBO_STAGES = [
    { name: "轻击", mult: 1.0, dur: 0.26, range: 36, offset: 19, radius: 28, color: "#f7cc67" },
    { name: "中击", mult: 1.22, dur: 0.28, range: 42, offset: 22, radius: 30, color: "#ffd77a" },
    { name: "重击", mult: 1.62, dur: 0.34, range: 50, offset: 28, radius: 34, color: "#ffe8a0" },
    { name: "暴击", mult: 2.25, dur: 0.46, range: 58, offset: 34, radius: 40, color: "#fff3c0", forceCrit: true }
  ];

  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d");
  ctx.imageSmoothingEnabled = false;

  const dom = {
    shell: document.getElementById("game-shell"),
    hud: document.getElementById("hud"),
    loading: document.getElementById("loading"),
    portrait: document.getElementById("portrait"),
    title: document.getElementById("title-screen"),
    start: document.getElementById("start-button"),
    continue: document.getElementById("continue-button"),
    stageBanner: document.getElementById("stage-banner"),
    stageBannerIndex: document.getElementById("stage-banner-index"),
    stageBannerName: document.getElementById("stage-banner-name"),
    stageBannerDesc: document.getElementById("stage-banner-desc"),
    hpFill: document.getElementById("hp-fill"),
    hpText: document.getElementById("hp-text"),
    mpFill: document.getElementById("mp-fill"),
    mpText: document.getElementById("mp-text"),
    xpFill: document.getElementById("xp-fill"),
    xpText: document.getElementById("xp-text"),
    level: document.getElementById("portrait-level"),
    realm: document.getElementById("hero-realm"),
    gold: document.getElementById("gold-text"),
    stageChip: document.getElementById("stage-chip"),
    mute: document.getElementById("mute-button"),
    pause: document.getElementById("pause-button"),
    bossPanel: document.getElementById("boss-panel"),
    bossTitle: document.getElementById("boss-title"),
    bossPhase: document.getElementById("boss-phase"),
    bossFill: document.getElementById("boss-fill"),
    bossPoiseBar: document.getElementById("boss-poise-bar"),
    bossPoiseFill: document.getElementById("boss-poise-fill"),
    waveBanner: document.getElementById("wave-banner"),
    waveTitle: document.getElementById("wave-title"),
    combo: document.getElementById("combo-display"),
    comboCount: document.getElementById("combo-count"),
    lootFeed: document.getElementById("loot-feed"),
    interactPrompt: document.getElementById("interact-prompt"),
    miniHead: document.getElementById("mini-head"),
    miniBody: document.getElementById("mini-body"),
    miniLegs: document.getElementById("mini-legs"),
    miniShoes: document.getElementById("mini-shoes"),
    miniWeapon: document.getElementById("mini-weapon"),
    miniAccessory: document.getElementById("mini-accessory"),
    bagButton: document.getElementById("bag-button"),
    dashCd: document.getElementById("dash-cd"),
    potionCd: document.getElementById("potion-cd"),
    potionCount: document.getElementById("potion-count"),
    killCount: document.getElementById("kill-count"),
    atkStat: document.getElementById("atk-stat"),
    defStat: document.getElementById("def-stat"),
    critStat: document.getElementById("crit-stat"),
    hintBar: document.getElementById("hint-bar"),
    pauseScreen: document.getElementById("pause-screen"),
    pauseSummary: document.getElementById("pause-summary"),
    resume: document.getElementById("resume-button"),
    pauseBag: document.getElementById("pause-bag-button"),
    pauseSkill: document.getElementById("pause-skill-button"),
    pauseArtifact: document.getElementById("pause-artifact-button"),
    pauseForge: document.getElementById("pause-forge-button"),
    pauseShop: document.getElementById("pause-shop-button"),
    pauseStage: document.getElementById("pause-stage-button"),
    pauseReincarnation: document.getElementById("pause-reincarnation-button"),
    pauseAwaken: document.getElementById("pause-awaken-button"),
    pauseBody: document.getElementById("pause-body-button"),
    pauseWing: document.getElementById("pause-wing-button"),
    enhanceStoneCount: document.getElementById("enhance-stone-count"),
    shopScreen: document.getElementById("shop-screen"),
    closeShop: document.getElementById("close-shop"),
    shopGold: document.getElementById("shop-gold"),
    shopStones: document.getElementById("shop-stones"),
    shopTabs: document.getElementById("shop-tabs"),
    shopGrid: document.getElementById("shop-grid"),
    shopRefresh: document.getElementById("shop-refresh"),
    shopRefreshCost: document.getElementById("shop-refresh-cost"),
    shopUnlockLabel: document.getElementById("shop-unlock-label"),
    forgeScreen: document.getElementById("forge-screen"),
    closeForge: document.getElementById("close-forge"),
    forgeJadeCount: document.getElementById("forge-jade-count"),
    forgeMaterials: document.getElementById("forge-materials"),
    forgeList: document.getElementById("forge-list"),
    stageSelectScreen: document.getElementById("stage-select-screen"),
    closeStageSelect: document.getElementById("close-stage-select"),
    stageSelectGrid: document.getElementById("stage-select-grid"),
    reincarnationScreen: document.getElementById("reincarnation-screen"),
    closeReincarnation: document.getElementById("close-reincarnation"),
    awakenScreen: document.getElementById("awaken-screen"),
    closeAwaken: document.getElementById("close-awaken"),
    awakenStones: document.getElementById("awaken-stones"),
    awakenList: document.getElementById("awaken-list"),
    awakenTotal: document.getElementById("awaken-total"),
    bodyScreen: document.getElementById("body-screen"),
    closeBody: document.getElementById("close-body"),
    bodyHerbs: document.getElementById("body-herbs"),
    bodyList: document.getElementById("body-list"),
    wingScreen: document.getElementById("wing-screen"),
    closeWings: document.getElementById("close-wings"),
    wingList: document.getElementById("wing-list"),
    confirmReincarnation: document.getElementById("confirm-reincarnation"),
    cancelReincarnation: document.getElementById("cancel-reincarnation"),
    reincarnationStats: document.getElementById("reincarnation-stats"),
    stayButton: document.getElementById("stay-button"),
    artifactIcon: document.getElementById("artifact-icon"),
    artifactName: document.getElementById("artifact-name"),
    artifactTag: document.getElementById("artifact-tag"),
    artifactDesc: document.getElementById("artifact-desc"),
    artifactScreen: document.getElementById("artifact-screen"),
    artifactHud: document.getElementById("artifact-hud-button"),
    artifactHudIcon: document.getElementById("artifact-hud-icon"),
    artifactHudName: document.getElementById("artifact-hud-name"),
    artifactHudCd: document.getElementById("artifact-hud-cd"),
    artifactHudFill: document.getElementById("artifact-hud-fill"),
    treasureJadeCount: document.getElementById("treasure-jade-count"),
    closeArtifacts: document.getElementById("close-artifacts"),
    craftArtifact: document.getElementById("craft-artifact"),
    equipArtifact: document.getElementById("equip-artifact"),
    useArtifact: document.getElementById("use-artifact"),
    artifactStatus: document.getElementById("artifact-status"),
    artifactList: document.getElementById("artifact-list"),
    artifactCost: document.getElementById("artifact-cost"),
    artifactStats: document.getElementById("artifact-stats"),
    artifactUpgradeBox: document.getElementById("artifact-upgrade-box"),
    artifactLevel: document.getElementById("artifact-level"),
    artifactUpgradeCost: document.getElementById("artifact-upgrade-cost"),
    upgradeArtifact: document.getElementById("upgrade-artifact"),
    quit: document.getElementById("quit-button"),
    inventory: document.getElementById("inventory-screen"),
    closeInventory: document.getElementById("close-inventory"),
    invGold: document.getElementById("inv-gold"),
    invLevel: document.getElementById("inv-level"),
    invSkin: document.getElementById("inv-skin"),
    invSkinEquip: document.getElementById("inv-skin-equip"),
    invSkinUnequip: document.getElementById("inv-skin-unequip"),
    invTitle: document.getElementById("inv-title"),
    invWing: document.getElementById("inv-wing"),
    invWingOpen: document.getElementById("inv-wing-open"),
    invWingUnequip: document.getElementById("inv-wing-unequip"),
    power: document.getElementById("power-text"),
    characterPreview: document.getElementById("character-preview"),
    gearHead: document.getElementById("gear-head"),
    gearBody: document.getElementById("gear-body"),
    gearLegs: document.getElementById("gear-legs"),
    gearShoes: document.getElementById("gear-shoes"),
    gearWeapon: document.getElementById("gear-weapon"),
    gearAccessory: document.getElementById("gear-accessory"),
    gearHeadStat: document.getElementById("gear-head-stat"),
    gearBodyStat: document.getElementById("gear-body-stat"),
    gearLegsStat: document.getElementById("gear-legs-stat"),
    gearShoesStat: document.getElementById("gear-shoes-stat"),
    gearWeaponStat: document.getElementById("gear-weapon-stat"),
    gearAccessoryStat: document.getElementById("gear-accessory-stat"),
    gearSlots: document.getElementById("gear-slots"),
    characterStats: document.getElementById("character-stats"),
    characterSpecials: document.getElementById("character-specials"),
    bagCapacity: document.getElementById("bag-capacity"),
    autoEquip: document.getElementById("auto-equip"),
    salvageLow: document.getElementById("salvage-low"),
    salvageCommon: document.getElementById("salvage-common"),
    bagGrid: document.getElementById("bag-grid"),
    bagPageLabel: document.getElementById("bag-page-label"),
    bagPrev: document.getElementById("bag-prev"),
    bagNext: document.getElementById("bag-next"),
    itemDetail: document.getElementById("item-detail"),
    skillScreen: document.getElementById("skill-screen"),
    closeSkills: document.getElementById("close-skills"),
    essenceCount: document.getElementById("essence-count"),
    skillLoadout: document.getElementById("skill-loadout"),
    skillCatalog: document.getElementById("skill-catalog"),
    selectedSkillSlotLabel: document.getElementById("selected-skill-slot-label"),
    skillMaxMp: document.getElementById("skill-max-mp"),
    skillIcon0: document.getElementById("skill-icon-0"),
    skillIcon1: document.getElementById("skill-icon-1"),
    skillIcon2: document.getElementById("skill-icon-2"),
    skillName0: document.getElementById("skill-name-0"),
    skillName1: document.getElementById("skill-name-1"),
    skillName2: document.getElementById("skill-name-2"),
    skillCost0: document.getElementById("skill-cost-0"),
    skillCost1: document.getElementById("skill-cost-1"),
    skillCost2: document.getElementById("skill-cost-2"),
    touchSkill0: document.getElementById("touch-skill-0"),
    touchSkill1: document.getElementById("touch-skill-1"),
    touchSkill2: document.getElementById("touch-skill-2"),
    deathScreen: document.getElementById("death-screen"),
    deathStats: document.getElementById("death-stats"),
    revive: document.getElementById("revive-button"),
    deathTitle: document.getElementById("death-title-button"),
    victoryScreen: document.getElementById("victory-screen"),
    victoryStats: document.getElementById("victory-stats"),
    loopBtn: document.getElementById("loop-button"),
    victoryTitle: document.getElementById("victory-title-button"),
    touch: document.getElementById("touch-controls")
  };

  const INVENTORY_CAP = 96;
  const BAG_PAGE_SIZE = 12;
  let bagPage = 0;

  const G = {
    mode: "boot",
    time: 0,
    playerTime: 0,
    titleTime: 0,
    stageIndex: 0,
    loop: 0,
    stage: null,
    platforms: [],
    player: null,
    enemies: [],
    projectiles: [],
    hazards: [],
    drops: [],
    particles: [],
    effects: [],
    texts: [],
    boss: null,
    portal: null,
    portalActive: false,
    camera: { x: 0, shake: 0, shakeTime: 0 },
    waveIndex: -1,
    waveState: "idle",
    waveTimer: 0,
    stageIntroT: 0,
    stageBannerT: 0,
    killCount: 0,
    totalKills: 0,
    goldEarned: 0,
    combo: 0,
    comboTimer: 0,
    maxCombo: 0,
    gold: 0,
    potions: 3,
    essence: 2,
    treasureJade: 1,
    enhanceStones: 2,
    reincarnationStones: 0,
    artifactMats: { purification: 0, heavenSeal: 0, chaosBell: 0, immortalSword: 0 },
    awaken: { atkPct: 0, hpPct: 0, defPct: 0, skillPct: 0 },
    spiritHerb: 0,
    wingMats: {},
    body: { hp: 0, atk: 0, def: 0 },
    maxStageUnlocked: 0,
    shopTab: "gold",
    shopStock: [],
    shopKey: "",
    shopRefreshCost: 0,
    artifactSelected: "jadeBottle",
    clone: null,
    skillSlotSelected: 0,
    muted: false,
    saveTimer: 0,
    saveDirty: false,
    hitStop: 0,
    timeScale: 1,
    slowTimer: 0,
    screenFlash: null,
    deathTimer: 0,
    bossDefeated: false,
    returnMode: "playing",
    selection: null,
    previewTick: 0,
    lastSave: 0,
    waveBannerTimer: null,
    runStartedAt: 0,
    stageStartedAt: 0,
    hintTimer: 0,
    hasSave: false,
    fpsTime: 0,
    fpsFrames: 0
  };

  const keys = {
    left: false,
    right: false,
    jump: false,
    attack: false,
    skill: false,
    dash: false,
    potion: false
  };

  const inputBuffer = {
    jump: 0,
    attack: 0
  };

  let jumpHeld = false;
  let lastFrame = performance.now();

  const setText = (el, value) => {
    if (!el) return;
    const text = String(value);
    if (el.textContent !== text) el.textContent = text;
  };

  const setStyle = (el, prop, value) => {
    if (el) el.style[prop] = value;
  };

  const hide = (el) => el && el.classList.add("hidden");
  const show = (el) => el && el.classList.remove("hidden");

  const fmtTime = (seconds) => {
    const s = Math.max(0, Math.floor(seconds));
    return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
  };

  /* ------------------------------------------------------------------ */
  /* Player + stats                                                      */
  /* ------------------------------------------------------------------ */

  function makePlayer() {
    const p = {
      x: 160,
      y: FLOOR,
      vx: 0,
      vy: 0,
      w: 14,
      h: 30,
      facing: 1,
      grounded: true,
      onPlatform: false,
      dropThrough: 0,
      jumpsUsed: 0,
      coyote: 0,
      level: 1,
      xp: 0,
      equip: { head: null, body: null, legs: null, shoes: null, weapon: null, accessory: null },
      inventory: [],
      attack: { active: false, t: 0, dur: 0.28, combo: 0, hit: false, index: 0 },
      skill: { id: null, active: false, t: 0, dur: 0, hit: false, tick: 0, level: 1 },
      skillSlots: D.DEFAULT_SKILL_SLOTS.slice(),
      skillLevels: {
        fireStaff: 1,
        fireEye: 1,
        clone: 1,
        staffSlam: 1,
        fireStorm: 1
      },
      artifacts: [],
      activeArtifact: null,
      artifactCd: 0,
      artifactLevels: {},
      skins: ["default"],
      skin: "default",
      skinBag: {},
      skinLevels: {},
      titles: ["none"],
      title: "none",
      wings: [],
      wing: null,
      wingLevels: {},
      goldenT: 0,
      goldenMul: 1,
      regenT: 0,
      debuffBurnT: 0,
      debuffBurnDps: 0,
      debuffBurnTick: 0,
      debuffPoisonT: 0,
      debuffPoisonDps: 0,
      debuffPoisonTick: 0,
      debuffSlowT: 0,
      debuffSlowMult: 1,
      dashing: 0,
      dashDir: 1,
      dashCd: 0,
      potionCd: 0,
      invuln: 0,
      hurtT: 0,
      flash: 0,
      attackBuffer: 0,
      rollT: 0,
      rollDuration: ROLL_TIME,
      state: "idle",
      animTime: 0,
      dead: false,
      stats: {},
      hp: undefined,
      mp: undefined,
      maxHp: 1,
      maxMp: 1
    };
    return p;
  }

  function normalizeSkillSlots(raw) {
    const out = [];
    if (Array.isArray(raw)) {
      for (const id of raw) {
        if (D.SKILLS[id] && !out.includes(id) && out.length < 3) out.push(id);
      }
    }
    for (const id of D.DEFAULT_SKILL_SLOTS) {
      if (out.length >= 3) break;
      if (!out.includes(id)) out.push(id);
    }
    return out.slice(0, 3);
  }

  function normalizeSkillLevels(raw) {
    const out = {};
    for (const id of D.SKILL_ORDER) {
      const value = raw && raw[id] !== undefined ? Number(raw[id]) : 1;
      out[id] = clamp(Math.round(value) || 1, 1, D.MAX_SKILL_LEVEL);
    }
    return out;
  }

  function baseStatsFor(level) {
    const l = Math.max(1, level);
    return {
      hp: 170 + (l - 1) * 25,
      mp: 48 + (l - 1) * 2.6,
      atk: 17 + (l - 1) * 3.8,
      def: 3 + (l - 1) * 1.1
    };
  }

  function itemStatsSum() {
    const sum = {};
    for (const key of STAT_KEYS) sum[key] = 0;
    if (!G.player) return sum;
    for (const slot of SLOT_ORDER) {
      const item = G.player.equip[slot];
      if (!item) continue;
      for (const key of STAT_KEYS) sum[key] += item.stats[key] || 0;
    }
    return sum;
  }

  function recalcStats(opts = {}) {
    const p = G.player;
    if (!p) return;
    const base = baseStatsFor(p.level);
    const gear = itemStatsSum();
    // 灵药淬体：固定属性成长
    const body = G.body || {};
    base.hp += (body.hp || 0) * 35;
    base.atk += (body.atk || 0) * 4;
    base.def += (body.def || 0) * 3;
    const title = D.TITLES[p.title] || D.TITLES.none;
    // 觉醒前世：轮回石强化百分比
    const awaken = G.awaken || {};
    for (const [key, value] of Object.entries(awaken)) {
      if (!value) continue;
      gear[key] = (gear[key] || 0) + value;
    }
    for (const [key, value] of Object.entries(title.stats || {})) {
      gear[key] = (gear[key] || 0) + value;
    }
    // 时装百分比加成（按合成等级）
    const skinDef = D.SKINS[p.skin];
    if (skinDef && p.skin !== "default") {
      const skinLevel = Math.max(1, (p.skinLevels && p.skinLevels[p.skin]) || 1);
      for (const [key, value] of Object.entries(skinDef.stats || {})) {
        gear[key] = (gear[key] || 0) + value;
      }
      for (let i = 1; i < skinLevel; i++) {
        for (const [key, value] of Object.entries(skinDef.levelStats || {})) {
          gear[key] = (gear[key] || 0) + value;
        }
      }
    }
    const activeArtifact = p.activeArtifact ? D.ARTIFACTS[p.activeArtifact] : null;
    if (activeArtifact) {
      const lv = artifactLevel(p.activeArtifact);
      const base = activeArtifact.stats || activeArtifact.statPct;
      if (base) {
        for (const [key, value] of Object.entries(base)) gear[key] = (gear[key] || 0) + value;
      }
      if (activeArtifact.levelStats) {
        for (let i = 1; i < lv; i++) {
          for (const [key, value] of Object.entries(activeArtifact.levelStats)) {
            gear[key] = (gear[key] || 0) + value;
          }
        }
      }
    }
    const oldHp = p.hp === undefined ? null : p.hp;
    const oldMp = p.mp === undefined ? null : p.mp;

    // 翅膀：水平速度 / 跳跃速度 / 百分比属性
    let wingJump = 0;
    const wingDef = p.wing ? D.WINGS[p.wing] : null;
    if (wingDef) {
      const wl = wingLevel(p.wing);
      const applyWing = (obj) => {
        for (const [key, value] of Object.entries(obj || {})) {
          if (key === "jump") wingJump += value;
          else gear[key] = (gear[key] || 0) + value;
        }
      };
      applyWing(wingDef.stats);
      for (let i = 1; i < wl; i++) applyWing(wingDef.levelStats);
    }

    p.maxHp = Math.max(1, Math.round((base.hp + gear.hp) * (1 + gear.hpPct / 100)));
    p.maxMp = Math.max(1, Math.round(base.mp + gear.mp));
    const atk = (base.atk + gear.atk) * (1 + gear.atkPct / 100);
    const def = (base.def + gear.def) * (1 + gear.defPct / 100);
    const crit = clamp(0.05 + gear.crit / 100, 0, 0.75);
    const speed = 98 + gear.speed;
    const lifesteal = clamp(gear.lifesteal / 100, 0, 0.5);
    const goldPct = gear.goldPct / 100;
    const dr = clamp(gear.dr / 100, 0, 0.35);
    const cdr = clamp(gear.cdr / 100, 0, 0.4);
    const skillPct = gear.skillPct / 100;
    const bossPct = gear.bossPct / 100;
    const atkSpeed = clamp(1 + gear.atkSpeedPct / 100, 1, 1.6);
    const luck = gear.luck / 100;

    p.stats = {
      atk: Math.round(atk * 10) / 10,
      def: Math.round(def * 10) / 10,
      crit,
      speed,
      lifesteal,
      goldPct,
      dr,
      cdr,
      skillPct,
      bossPct,
      atkSpeed,
      luck,
      atkPct: gear.atkPct / 100,
      hpPct: gear.hpPct / 100,
      defPct: gear.defPct / 100,
      luckPct: gear.luck,
      maxPotions: 3,
      jump: wingJump,
      power: 0
    };
    // 法相金身：攻击与防御翻倍（随强化倍率提升）
    if (p.goldenT > 0) {
      const gm = p.goldenMul || 2;
      p.stats.atk = Math.round(p.stats.atk * gm * 10) / 10;
      p.stats.def = Math.round(p.stats.def * gm * 10) / 10;
    }
    p.stats.power = Math.round(
      p.stats.atk * 4 +
      p.stats.def * 2.5 +
      p.maxHp * 0.55 +
      p.maxMp * 0.8 +
      p.stats.crit * 100 * 7 +
      p.stats.lifesteal * 100 * 9 +
      p.stats.speed * 1.5 +
      gear.atkPct * 4 +
      gear.hpPct * 3 +
      gear.defPct * 3 +
      gear.skillPct * 3.5 +
      gear.bossPct * 2.5 +
      gear.cdr * 5 +
      gear.dr * 4 +
      gear.atkSpeedPct * 3.5 +
      gear.luck * 2
    );

    if (opts.full || oldHp === null) p.hp = p.maxHp;
    else p.hp = clamp(oldHp, 0, p.maxHp);

    if (opts.full || oldMp === null) p.mp = p.maxMp;
    else p.mp = clamp(oldMp, 0, p.maxMp);
  }

  function playerAppearance() {
    const p = G.player;
    if (!p) return {};
    const appearance = {};
    for (const slot of SLOT_ORDER) {
      const item = p.equip[slot];
      appearance[slot] = item
        ? {
            color: getRarity(item.rarity).color,
            rarity: item.rarity,
            upgrade: item.upgrade || 0
          }
        : null;
    }
    appearance.skin = p.skin || "default";
    return appearance;
  }

  function gainXp(amount) {
    const p = G.player;
    if (!p || p.dead) return;
    p.xp += Math.max(0, Math.round(amount));
    let leveled = 0;
    let guard = 0;
    while (p.xp >= xpNeeded(p.level) && guard++ < 500) {
      p.xp -= xpNeeded(p.level);
      p.level++;
      leveled++;
    }
    if (leveled > 0) {
      recalcStats({ full: true });
      Audio.sfx("levelup");
      addEffect({ kind: "levelup", x: p.x, y: p.y - 24, duration: 1.1 });
      addText("升级!", p.x, p.y - 44, "#ffe58a", 11, { second: "Lv." + p.level });
      for (let i = 0; i < 24; i++) {
        addParticle({
          x: p.x + rand(-16, 16),
          y: p.y - rand(4, 30),
          vx: rand(-30, 30),
          vy: rand(-70, -20),
          life: rand(0.4, 0.9),
          size: rand(1, 2),
          color: i % 2 ? "#ffe58a" : "#9de8bf",
          gravity: 20
        });
      }
      G.screenFlash = { color: "#ffe7a0", alpha: 0.22, t: 0.35, duration: 0.35 };
      showToast(`等级提升 · Lv.${p.level}`, "等级突破，气血法力已回满");
      markSave();
    }
  }

  /* ------------------------------------------------------------------ */
  /* Items                                                               */
  /* ------------------------------------------------------------------ */

  let itemSeq = 0;

  function statRound(key, value) {
    if (D.PERCENT_STAT_KEYS.includes(key)) return Math.round(value * 10) / 10;
    return Math.round(value);
  }

  function refreshItem(item) {
    if (!item) return item;
    const mult = 1 + (item.upgrade || 0) * 0.06;
    const stats = {};
    for (const [key, value] of Object.entries(item.baseStats || {})) {
      stats[key] = statRound(key, value * mult);
    }
    for (const affix of item.affixes || []) {
      stats[affix.key] = statRound(affix.key, (stats[affix.key] || 0) + affix.value);
    }
    item.stats = stats;
    item.score = scoreItem(item);
    return item;
  }

  function itemName(item) {
    if (!item) return "—";
    return item.name + (item.upgrade ? ` +${item.upgrade}` : "");
  }

  function itemSellValue(item) {
    if (!item) return 0;
    const r = getRarity(item.rarity);
    return Math.round((r.salvage + item.ilvl * 3) * (1 + (item.upgrade || 0) * 0.2));
  }

  function upgradeCost(item) {
    if (!item) return 0;
    const r = getRarity(item.rarity);
    return Math.round((18 + item.ilvl * 7) * r.mult * Math.pow((item.upgrade || 0) + 1, 1.28) * 0.72);
  }

  function generateItem(opts = {}) {
    const p = G.player;
    const source = opts.source || "drop";
    const luck = (p ? p.stats.luck || 0 : 0) + (source === "boss" ? 0.14 : 0) + G.stageIndex * 0.012;
    let rarity = D.rollRarity(luck);
    if (source === "boss" && rarity.order < 2) rarity = D.RARITIES[2];
    if (opts.minRarity && rarity.order < getRarity(opts.minRarity).order) rarity = getRarity(opts.minRarity);

    const slot = opts.slot || choice(SLOT_ORDER);
    const ilvl = Math.max(
      1,
      Math.round(
        (p ? p.level : 1) + randInt(-1, 2) + G.stageIndex * 1.4 + G.loop * 1.5 + (source === "boss" ? 2 : 0)
      )
    );
    const mult = rarity.mult * (1 + G.loop * 0.08);
    const baseStats = {};

    if (slot === "head") {
      baseStats.def = (0.3 + ilvl * 0.09) * mult;
      baseStats.mp = (5 + ilvl * 0.9) * mult;
      baseStats.hp = (4 + ilvl * 1.1) * mult;
    } else if (slot === "body") {
      baseStats.def = (0.6 + ilvl * 0.14) * mult;
      baseStats.hp = (9 + ilvl * 2.0) * mult;
      baseStats.mp = (6 + ilvl * 1.2) * mult;
    } else if (slot === "legs") {
      baseStats.def = (0.4 + ilvl * 0.11) * mult;
      baseStats.hp = (6 + ilvl * 1.45) * mult;
    } else if (slot === "shoes") {
      baseStats.speed = (2 + ilvl * 0.4) * mult;
      baseStats.def = (0.2 + ilvl * 0.04) * mult;
    } else if (slot === "weapon") {
      baseStats.atk = (2.0 + ilvl * 0.6) * mult;
    } else {
      baseStats.crit = (1.5 + ilvl * 0.22) * mult;
      baseStats.mp = (18 + ilvl * 3.2) * mult;
      baseStats.atk = (0.8 + ilvl * 0.1) * mult;
    }

    const item = {
      id: `item_${++itemSeq}_${Date.now().toString(36)}`,
      slot,
      rarity: rarity.key,
      ilvl,
      name: choice(D.GEAR_NAMES[slot][rarity.key]),
      baseStats,
      affixes: [],
      upgrade: 0,
      balanceVersion: 2,
      lifestealNerf: true,
      flavor: D.GEAR_FLAVOR[rarity.key]
    };

    const count = rarity.affixes + (source === "boss" ? 1 : 0);
    const specialChance = [0, 0.22, 0.38, 0.55, 0.72][rarity.order] || 0;
    const used = new Set();
    let needsSpecial = source === "boss" && rarity.order >= 2;
    let guard = 0;

    while (item.affixes.length < count && guard++ < 60) {
      const wantSpecial = needsSpecial || chance(specialChance);
      const pool = D.AFFIXES.filter((a) => (wantSpecial ? a.special : !a.special));
      const affix = choice(pool);
      if (used.has(affix.key)) continue;
      used.add(affix.key);
      if (affix.special) needsSpecial = false;
      const value = (affix.min + rand(0, affix.max - affix.min) + affix.scale * ilvl) * 0.82;
      const rounded = Number(value.toFixed(affix.decimals));
      item.affixes.push({ key: affix.key, value: rounded, special: !!affix.special });
    }

    // 妖王装备至少带一条特殊词条
    if (needsSpecial) {
      const specialPool = D.AFFIXES.filter((a) => a.special && !used.has(a.key));
      if (specialPool.length) {
        const affix = choice(specialPool);
        const value = (affix.min + rand(0, affix.max - affix.min) + affix.scale * ilvl) * 0.82;
        item.affixes.push({
          key: affix.key,
          value: Number(value.toFixed(affix.decimals)),
          special: true
        });
      }
    }

    refreshItem(item);
    return item;
  }

  function itemSlotLabel(slot) {
    return D.SLOTS[slot] ? D.SLOTS[slot].name : slot;
  }

  function itemShort(slot) {
    return D.SLOTS[slot] ? D.SLOTS[slot].short : "?";
  }

  function normalizeItem(item) {
    if (!item || !item.baseStats) return null;
    if (item.slot === "armor") item.slot = "body";
    else if (item.slot === "charm") item.slot = "accessory";
    if (!D.SLOTS[item.slot]) return null;
    if (!Array.isArray(item.affixes)) item.affixes = [];
    // v1.8 平衡：旧存档中的装备主属性与词条做一次兼容压缩
    if (item.balanceVersion !== 2) {
      for (const key of Object.keys(item.baseStats || {})) {
        item.baseStats[key] = item.baseStats[key] * 0.6;
      }
      for (const affix of item.affixes) {
        affix.value *= 0.75;
      }
      item.balanceVersion = 2;
    }
    // v2.9：吸血词条全局减半（旧存档一次性迁移）
    if (!item.lifestealNerf) {
      for (const affix of item.affixes) {
        if (affix.key === "lifesteal") affix.value = Number((affix.value * 0.5).toFixed(2));
      }
      item.lifestealNerf = true;
    }
    for (const affix of item.affixes) {
      if (affix.special === undefined) {
        const def = D.AFFIXES.find((a) => a.key === affix.key);
        affix.special = !!(def && def.special);
      }
    }
    return refreshItem(item);
  }

  function equippedScore(slot) {
    return scoreItem(G.player.equip[slot]);
  }

  function ensureBagSpace() {
    const p = G.player;
    if (p.inventory.length < INVENTORY_CAP) return true;
    let worstIndex = 0;
    for (let i = 1; i < p.inventory.length; i++) {
      if (scoreItem(p.inventory[i]) < scoreItem(p.inventory[worstIndex])) worstIndex = i;
    }
    const worst = p.inventory[worstIndex];
    const gold = itemSellValue(worst);
    p.inventory.splice(worstIndex, 1);
    G.gold += gold;
    showToast(`行囊已满 · 自动分解 ${itemName(worst)}`, `获得 ${gold} 金币`);
    return true;
  }

  function acquireItem(item, opts = {}) {
    const p = G.player;
    const current = p.equip[item.slot];
    const currentScore = scoreItem(current);
    const newScore = scoreItem(item);
    const autoEquip = !current || newScore > currentScore * 1.02;
    let tag = "已入背包";

    if (autoEquip) {
      ensureBagSpace();
      if (current) p.inventory.push(current);
      p.equip[item.slot] = item;
      tag = current ? "已自动装备" : "已装备";
      recalcStats();
    } else {
      ensureBagSpace();
      p.inventory.push(item);
    }
    if (p.inventory.length) bagPage = Math.floor((p.inventory.length - 1) / BAG_PAGE_SIZE);

    Audio.sfx("loot", item.rarity);
    showLootFeed(item, tag);
    if (opts.silent !== true) {
      const color = getRarity(item.rarity).color;
      addText(itemName(item), item.x || p.x, (item.y || p.y - 20) - 10, color, 7, { life: 1.1, vy: -14 });
    }
    markSave();
    return autoEquip;
  }

  function equipFromBag(index) {
    const p = G.player;
    const item = p.inventory[index];
    if (!item) return;
    p.inventory.splice(index, 1);
    const old = p.equip[item.slot];
    if (old) p.inventory.push(old);
    p.equip[item.slot] = item;
    recalcStats();
    Audio.sfx("equip");
    G.selection = { type: "equipped", slot: item.slot, id: item.id };
    renderInventory();
    markSave();
  }

  function unequipSlot(slot) {
    const p = G.player;
    const item = p.equip[slot];
    if (!item) return;
    if (p.inventory.length >= INVENTORY_CAP) {
      showToast("行囊已满", "先分解一件装备再卸下");
      Audio.sfx("error");
      return;
    }
    p.equip[slot] = null;
    p.inventory.push(item);
    bagPage = Math.floor((p.inventory.length - 1) / BAG_PAGE_SIZE);
    recalcStats();
    Audio.sfx("equip");
    G.selection = { type: "bag", id: item.id };
    renderInventory();
    markSave();
  }

  function autoEquipBest() {
    const p = G.player;
    let changed = 0;
    for (const slot of SLOT_ORDER) {
      let best = p.equip[slot];
      let bestIndex = -1;
      for (let i = 0; i < p.inventory.length; i++) {
        const item = p.inventory[i];
        if (item.slot !== slot) continue;
        if (!best || scoreItem(item) > scoreItem(best)) {
          best = item;
          bestIndex = i;
        }
      }
      if (bestIndex >= 0 && best !== p.equip[slot]) {
        const old = p.equip[slot];
        p.inventory.splice(bestIndex, 1);
        if (old) p.inventory.push(old);
        p.equip[slot] = best;
        changed++;
      }
    }
    if (changed) {
      recalcStats();
      Audio.sfx("equip");
      showToast("一键换装", "已选择每个部位战力最高的装备");
      markSave();
    } else {
      showToast("无需更换", "当前装备已是最优");
      Audio.sfx("ui");
    }
    G.selection = null;
    renderInventory();
  }

  function salvageBelowEquipped() {
    const p = G.player;
    const keep = [];
    let gold = 0;
    let count = 0;
    for (const item of p.inventory) {
      const current = p.equip[item.slot];
      if (current && scoreItem(item) < scoreItem(current)) {
        gold += itemSellValue(item);
        count++;
      } else {
        keep.push(item);
      }
    }
    if (!count) {
      showToast("没有可分解的低战力装备", "只分解低于同部位已装备战力的装备");
      Audio.sfx("ui");
      return;
    }
    p.inventory = keep;
    G.gold += gold;
    Audio.sfx("gold");
    showToast(`分解 ${count} 件低战力装备`, `获得 ${gold} 金币`);
    G.selection = null;
    renderInventory();
    markSave();
  }

  function salvageCommon() {
    const p = G.player;
    const keep = [];
    let gold = 0;
    let count = 0;
    for (const item of p.inventory) {
      if (item.rarity === "common") {
        gold += itemSellValue(item);
        count++;
      } else keep.push(item);
    }
    if (!count) {
      showToast("没有可分解的凡品", "灵品及以上装备会被保留");
      Audio.sfx("ui");
      return;
    }
    p.inventory = keep;
    G.gold += gold;
    Audio.sfx("gold");
    showToast(`分解 ${count} 件凡品`, `获得 ${gold} 金币`);
    G.selection = null;
    renderInventory();
    markSave();
  }

  function salvageSelected() {
    if (!G.selection || G.selection.type !== "bag") return;
    const p = G.player;
    const index = p.inventory.findIndex((i) => i.id === G.selection.id);
    if (index < 0) return;
    const item = p.inventory[index];
    const gold = itemSellValue(item);
    p.inventory.splice(index, 1);
    G.gold += gold;
    Audio.sfx("gold");
    showToast(`分解 ${itemName(item)}`, `获得 ${gold} 金币`);
    G.selection = null;
    renderInventory();
    markSave();
  }

  function upgradeSelected() {
    if (!G.selection || G.selection.type !== "equipped") return;
    const p = G.player;
    const item = p.equip[G.selection.slot];
    if (!item) return;
    if (item.upgrade >= 9) {
      showToast("已强化至上限", "装备最多强化到 +9");
      Audio.sfx("error");
      return;
    }
    const cost = upgradeCost(item);
    if (G.enhanceStones < 1) {
      showToast("强化石不足", "可在商店购买强化石");
      Audio.sfx("error");
      return;
    }
    if (G.gold < cost) {
      showToast("金币不足", `强化需要 ${cost} 金币与 1 枚强化石`);
      Audio.sfx("error");
      return;
    }
    G.gold -= cost;
    G.enhanceStones--;
    item.upgrade++;
    refreshItem(item);
    recalcStats();
    Audio.sfx("equip");
    addEffect({ kind: "levelup", x: p.x, y: p.y - 24, duration: 0.8 });
    showToast(`${itemName(item)} 强化成功`, `消耗 ${cost} 金币与 1 枚强化石`);
    renderInventory();
    markSave();
  }

  /* ------------------------------------------------------------------ */
  /* Save / load                                                         */
  /* ------------------------------------------------------------------ */

  function snapshot() {
    const p = G.player;
    if (!p) return null;
    return {
      version: SAVE_VERSION,
      savedAt: Date.now(),
      stageIndex: G.stageIndex,
      loop: G.loop,
      level: p.level,
      xp: p.xp,
      gold: G.gold,
      potions: G.potions,
      essence: G.essence,
      treasureJade: G.treasureJade,
      enhanceStones: G.enhanceStones,
      reincarnationStones: G.reincarnationStones,
      artifactMats: G.artifactMats,
      awaken: G.awaken,
      spiritHerb: G.spiritHerb,
      wingMats: G.wingMats,
      body: G.body,
      maxStageUnlocked: G.maxStageUnlocked,
      artifacts: p.artifacts,
      activeArtifact: p.activeArtifact,
      artifactLevels: p.artifactLevels,
      skins: p.skins,
      skin: p.skin,
      wings: p.wings,
      wing: p.wing,
      wingLevels: p.wingLevels,
      skinBag: p.skinBag,
      skinLevels: p.skinLevels,
      titles: p.titles,
      title: p.title,
      equip: p.equip,
      inventory: p.inventory,
      skillSlots: p.skillSlots,
      skillLevels: p.skillLevels,
      totalKills: G.totalKills,
      killCount: G.killCount,
      maxCombo: G.maxCombo,
      playTime: G.time - G.runStartedAt,
      muted: G.muted
    };
  }

  function writeSave() {
    const data = snapshot();
    if (!data) return;
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(data));
      G.hasSave = true;
      G.saveDirty = false;
    } catch (err) {
      console.warn("Unable to save game", err);
    }
  }

  function markSave() {
    G.saveDirty = true;
    G.saveTimer = 1.2;
  }

  function readSave() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return null;
      const data = JSON.parse(raw);
      if (!data || (data.version !== 1 && data.version !== 2) || !data.equip) return null;
      return data;
    } catch (err) {
      return null;
    }
  }

  function refreshSaveButton() {
    const save = readSave();
    G.hasSave = !!save;
    if (save) {
      show(dom.continue);
      setText(dom.continue, `继续旅程 · Lv.${save.level || 1}`);
    } else {
      hide(dom.continue);
    }
  }

  function applySave(data) {
    G.loop = clamp(Number(data.loop) || 0, 0, 99);
    G.stageIndex = clamp(Number(data.stageIndex) || 0, 0, D.STAGES.length - 1);
    G.gold = Math.max(0, Number(data.gold) || 0);
    const savedPotions = Number(data.potions);
    G.potions = Number.isFinite(savedPotions) ? Math.max(0, savedPotions) : 3;
    const savedEssence = Number(data.essence);
    G.essence = Number.isFinite(savedEssence) ? Math.max(0, savedEssence) : 2;
    const savedJade = Number(data.treasureJade);
    G.treasureJade = Number.isFinite(savedJade) ? Math.max(0, savedJade) : 1;
    const savedStones = Number(data.enhanceStones);
    G.enhanceStones = Number.isFinite(savedStones) ? Math.max(0, savedStones) : 2;
    const savedReincarnation = Number(data.reincarnationStones);
    G.reincarnationStones = Number.isFinite(savedReincarnation) ? Math.max(0, savedReincarnation) : 0;
    G.artifactMats = {
      purification: Math.max(0, Number(data.artifactMats && data.artifactMats.purification) || 0),
      heavenSeal: Math.max(0, Number(data.artifactMats && data.artifactMats.heavenSeal) || 0),
      chaosBell: Math.max(0, Number(data.artifactMats && data.artifactMats.chaosBell) || 0),
      immortalSword: Math.max(0, Number(data.artifactMats && data.artifactMats.immortalSword) || 0)
    };
    G.maxStageUnlocked = clamp(
      Number.isFinite(Number(data.maxStageUnlocked)) ? Number(data.maxStageUnlocked) : G.stageIndex,
      0,
      D.STAGES.length - 1
    );
    const aw = data.awaken && typeof data.awaken === "object" ? data.awaken : {};
    G.awaken = {
      atkPct: Math.max(0, Number(aw.atkPct) || 0),
      hpPct: Math.max(0, Number(aw.hpPct) || 0),
      defPct: Math.max(0, Number(aw.defPct) || 0),
      skillPct: Math.max(0, Number(aw.skillPct) || 0)
    };
    G.spiritHerb = Math.max(0, Number(data.spiritHerb) || 0);
    G.wingMats = data.wingMats && typeof data.wingMats === "object" ? data.wingMats : {};
    for (const key of Object.keys(D.MATERIALS)) {
      if (key.startsWith("wing") || key.endsWith("Feather") || key === "flamePlume" || key === "coreThruster" || key === "holyLight" || key === "starDust") {
        G.wingMats[key] = Math.max(0, Number(G.wingMats[key]) || 0);
      }
    }
    const bd = data.body && typeof data.body === "object" ? data.body : {};
    G.body = {
      hp: Math.max(0, Number(bd.hp) || 0),
      atk: Math.max(0, Number(bd.atk) || 0),
      def: Math.max(0, Number(bd.def) || 0)
    };
    G.clone = null;
    G.totalKills = Math.max(0, Number(data.totalKills) || 0);
    G.killCount = Math.max(0, Number(data.killCount) || 0);
    G.maxCombo = Math.max(0, Number(data.maxCombo) || 0);
    G.muted = !!data.muted;

    const p = makePlayer();
    p.level = Math.max(1, Math.floor(Number(data.level) || 1));
    p.xp = Math.max(0, Number(data.xp) || 0);
    p.skillSlots = normalizeSkillSlots(data.skillSlots);
    p.skillLevels = normalizeSkillLevels(data.skillLevels);
    p.artifacts = Array.isArray(data.artifacts) ? data.artifacts.filter((id) => D.ARTIFACTS[id]) : [];
    p.activeArtifact = p.artifacts.includes(data.activeArtifact) ? data.activeArtifact : p.artifacts[0] || null;
    p.artifactLevels = data.artifactLevels && typeof data.artifactLevels === "object" ? data.artifactLevels : {};
    for (const id of p.artifacts) {
      if (!p.artifactLevels[id]) p.artifactLevels[id] = 1;
    }
    p.skins = Array.isArray(data.skins) ? data.skins.filter((id) => D.SKINS[id]) : ["default"];
    if (!p.skins.includes("default")) p.skins.unshift("default");
    p.skin = p.skins.includes(data.skin) ? data.skin : "default";
    p.skinBag = data.skinBag && typeof data.skinBag === "object" ? data.skinBag : {};
    p.skinLevels = data.skinLevels && typeof data.skinLevels === "object" ? data.skinLevels : {};
    // 旧存档迁移：已拥有但还没有时装库存的，补一份 1 级
    for (const id of p.skins) {
      if (id === "default") continue;
      if (!p.skinBag[id] || !Object.keys(p.skinBag[id]).length) p.skinBag[id] = { 1: 1 };
      if (!p.skinLevels[id]) p.skinLevels[id] = 1;
    }
    p.titles = Array.isArray(data.titles) ? data.titles.filter((id) => D.TITLES[id]) : ["none"];
    if (!p.titles.includes("none")) p.titles.unshift("none");
    p.title = p.titles.includes(data.title) ? data.title : "none";
    p.wings = Array.isArray(data.wings) ? data.wings.filter((id) => D.WINGS[id]) : [];
    p.wing = p.wings.includes(data.wing) ? data.wing : p.wings[p.wings.length - 1] || null;
    p.wingLevels = data.wingLevels && typeof data.wingLevels === "object" ? data.wingLevels : {};
    for (const id of p.wings) if (!p.wingLevels[id]) p.wingLevels[id] = 1;
    p.equip = { head: null, body: null, legs: null, shoes: null, weapon: null, accessory: null };

    // v1 save migration: armor -> body, charm -> accessory
    const equippedItems = new Set();
    for (const rawItem of Object.values(data.equip || {})) {
      const item = normalizeItem(rawItem);
      if (!item || equippedItems.has(item)) continue;
      p.equip[item.slot] = item;
      equippedItems.add(item);
    }

    p.inventory = [];
    for (const rawItem of Array.isArray(data.inventory) ? data.inventory : []) {
      if (p.inventory.length >= INVENTORY_CAP) break;
      const item = normalizeItem(rawItem);
      if (item) p.inventory.push(item);
    }

    G.player = p;
    recalcStats({ full: true });
    setMuteUI();
  }

  /* ------------------------------------------------------------------ */
  /* UI: loot feed, toasts, HUD                                          */
  /* ------------------------------------------------------------------ */

  function showLootFeed(item, tag) {
    if (!dom.lootFeed) return;
    const rarity = getRarity(item.rarity);
    const hasSpecial = (item.affixes || []).some((a) => a.special);
    const card = document.createElement("div");
    card.className = "loot-card";
    card.style.setProperty("--rarity", rarity.color);
    card.innerHTML = `
      <div class="loot-icon">${itemShort(item.slot)}</div>
      <div class="loot-copy">
        <b>${itemName(item)}</b>
        <span>${rarity.name} · ${itemSlotLabel(item.slot)} · 等级 ${item.ilvl}${hasSpecial ? " · 特殊词条" : ""}</span>
      </div>
      <em class="loot-tag ${tag === "已入背包" ? "bag" : ""}">${tag}</em>
    `;
    dom.lootFeed.prepend(card);
    while (dom.lootFeed.children.length > 4) dom.lootFeed.lastElementChild.remove();
    window.setTimeout(() => {
      if (!card.isConnected) return;
      card.classList.add("out");
      window.setTimeout(() => card.remove(), 300);
    }, 3600);
  }

  function showToast(title, desc) {
    if (!dom.lootFeed) return;
    const card = document.createElement("div");
    card.className = "loot-card";
    card.style.setProperty("--rarity", "#e4c27a");
    card.innerHTML = `
      <div class="loot-icon" style="background:#e4c27a">讯</div>
      <div class="loot-copy">
        <b style="color:#f4dda6">${title}</b>
        <span>${desc || ""}</span>
      </div>
      <em class="loot-tag" style="background:#c9a252">提示</em>
    `;
    dom.lootFeed.prepend(card);
    while (dom.lootFeed.children.length > 4) dom.lootFeed.lastElementChild.remove();
    window.setTimeout(() => {
      if (!card.isConnected) return;
      card.classList.add("out");
      window.setTimeout(() => card.remove(), 300);
    }, 3200);
  }

  function showWaveBanner(title, kicker) {
    if (!dom.waveBanner) return;
    if (kicker) {
      const k = dom.waveBanner.querySelector(".wave-kicker");
      if (k) setText(k, kicker);
    }
    setText(dom.waveTitle, title);
    show(dom.waveBanner);
    dom.waveBanner.style.animation = "none";
    void dom.waveBanner.offsetWidth;
    dom.waveBanner.style.animation = "";
    if (G.waveBannerTimer) window.clearTimeout(G.waveBannerTimer);
    G.waveBannerTimer = window.setTimeout(() => hide(dom.waveBanner), 1750);
  }

  const MINI_BY_SLOT = {
    head: "miniHead",
    body: "miniBody",
    legs: "miniLegs",
    shoes: "miniShoes",
    weapon: "miniWeapon",
    accessory: "miniAccessory"
  };

  const GEAR_BY_SLOT = {
    head: ["gearHead", "gearHeadStat"],
    body: ["gearBody", "gearBodyStat"],
    legs: ["gearLegs", "gearLegsStat"],
    shoes: ["gearShoes", "gearShoesStat"],
    weapon: ["gearWeapon", "gearWeaponStat"],
    accessory: ["gearAccessory", "gearAccessoryStat"]
  };

  function updateHUD() {
    const p = G.player;
    if (!p) return;
    const hpPct = clamp((p.hp / p.maxHp) * 100, 0, 100);
    const mpPct = clamp((p.mp / p.maxMp) * 100, 0, 100);
    const need = xpNeeded(p.level);
    const xpPct = clamp((p.xp / need) * 100, 0, 100);
    setStyle(dom.hpFill, "width", `${hpPct}%`);
    setStyle(dom.mpFill, "width", `${mpPct}%`);
    setStyle(dom.xpFill, "width", `${xpPct}%`);
    setText(dom.hpText, `${Math.ceil(p.hp)} / ${Math.ceil(p.maxHp)}`);
    setText(dom.mpText, `${Math.ceil(p.mp)} / ${Math.ceil(p.maxMp)}`);
    setText(dom.xpText, `${Math.floor(p.xp)} / ${need}`);
    setText(dom.level, p.level);
    setText(dom.gold, G.gold);
    setText(dom.invGold, G.gold);
    setText(dom.enhanceStoneCount, G.enhanceStones);
    setText(dom.realm, G.stage ? `${G.stage.name}${G.loop ? ` · 轮回${G.loop}` : ""}` : "");

    const stageNo = G.stageIndex + 1;
    setText(dom.stageChip, `${G.loop ? `轮回${G.loop} · ` : ""}第${cnNum(stageNo)}关 · ${G.stage ? G.stage.name : ""}`);

    setText(dom.killCount, G.killCount);
    setText(dom.atkStat, Math.round(p.stats.atk));
    setText(dom.defStat, Math.round(p.stats.def));
    setText(dom.critStat, `${Math.round(p.stats.crit * 100)}%`);
    setText(dom.potionCount, `×${G.potions}`);

    for (let i = 0; i < 3; i++) {
      const id = p.skillSlots[i];
      const def = id ? D.SKILLS[id] : null;
      const iconEl = dom[`skillIcon${i}`];
      const nameEl = dom[`skillName${i}`];
      const costEl = dom[`skillCost${i}`];
      const touchEl = dom[`touchSkill${i}`];
      setText(iconEl, def ? def.icon : "—");
      setText(nameEl, def ? def.name : "未研习");
      setText(costEl, def ? def.mana : "");
      if (touchEl) setText(touchEl, def ? def.icon : "—");
      const card = dom.shell.querySelector(`[data-skill-slot="${i}"]`);
      if (card) {
        card.classList.toggle("active", !!def && p.skill.active && p.skill.id === id);
        card.title = def ? `${["K", "L", "O"][i]} · ${def.name} Lv.${p.skillLevels[id] || 1} · ${def.mana} 法力` : "未研习";
      }
    }
    setStyle(dom.dashCd, "height", `${clamp((p.dashCd / Math.max(0.2, 1.2 - p.stats.cdr * 0.2)) * 100, 0, 100)}%`);
    setStyle(dom.potionCd, "height", `${clamp((p.potionCd / 0.65) * 100, 0, 100)}%`);

    if (G.combo >= 2 && G.comboTimer > 0) {
      show(dom.combo);
      setText(dom.comboCount, G.combo);
    } else {
      hide(dom.combo);
    }

    if (G.boss && !G.boss.dead && G.boss.hp > 0) {
      show(dom.bossPanel);
      setText(dom.bossTitle, G.boss.name);
      const casting = ["windup", "attack", "charge", "cast"].includes(G.boss.state) && G.boss.currentSkillName;
      setText(
        dom.bossPhase,
        casting
          ? `${G.boss.currentSkillType === "divine" ? "神通" : "技能"} · ${G.boss.currentSkillName}`
          : G.boss.phaseTriggered
            ? "狂暴"
            : G.boss.title || "妖王"
      );
      setStyle(dom.bossFill, "width", `${clamp((G.boss.hp / G.boss.maxHp) * 100, 0, 100)}%`);
      if (dom.bossPoiseBar && dom.bossPoiseFill && G.boss.maxPoise > 0) {
        dom.bossPoiseBar.classList.remove("hidden");
        dom.bossPoiseBar.classList.toggle("broken", !!G.boss.poiseBroken);
        setStyle(dom.bossPoiseFill, "width", `${clamp((G.boss.poise / G.boss.maxPoise) * 100, 0, 100)}%`);
      } else if (dom.bossPoiseBar) {
        dom.bossPoiseBar.classList.add("hidden");
      }
    } else {
      hide(dom.bossPanel);
    }

    for (const slot of SLOT_ORDER) {
      const el = dom[MINI_BY_SLOT[slot]];
      const item = p.equip[slot];
      if (el) {
        setText(el, item ? itemName(item) : "—");
        const button = el.parentElement;
        if (button) button.style.setProperty("--rarity", item ? getRarity(item.rarity).color : "#727c96");
      }
    }

    const artifactDef = p.activeArtifact ? D.ARTIFACTS[p.activeArtifact] : null;
    if (artifactDef && artifactOwned(p.activeArtifact)) {
      show(dom.artifactHud);
      setText(dom.artifactHudIcon, artifactDef.icon);
      setText(dom.artifactHudName, artifactDef.name);
      const readyPct = p.artifactCd > 0 ? clamp(1 - p.artifactCd / artifactDef.cooldown, 0, 1) * 100 : 100;
      setStyle(dom.artifactHudFill, "width", `${readyPct}%`);
      dom.artifactHud.classList.toggle("ready", p.artifactCd <= 0);
      dom.artifactHud.classList.toggle("cooling", p.artifactCd > 0);
      if (p.regenT > 0) setText(dom.artifactHudCd, `甘露 ${p.regenT.toFixed(1)}s`);
      else if (p.artifactCd > 0) setText(dom.artifactHudCd, `冷却 ${Math.ceil(p.artifactCd)}s`);
      else setText(dom.artifactHudCd, "就绪 · F 催动");
      dom.artifactHud.title = `${artifactDef.name} · ${p.artifactCd > 0 ? `冷却 ${Math.ceil(p.artifactCd)} 秒` : "可以催动"} (F)`;
    } else {
      hide(dom.artifactHud);
    }

    const nearPortal =
      G.portalActive &&
      G.portal &&
      Math.abs(p.x - G.portal.x) < 30 &&
      G.mode === "playing" &&
      G.waveState === "portal";
    if (nearPortal) show(dom.interactPrompt);
    else hide(dom.interactPrompt);
  }

  /* ------------------------------------------------------------------ */
  /* Inventory UI                                                        */
  /* ------------------------------------------------------------------ */

  function mainStatLine(item) {
    if (!item) return "";
    if (item.slot === "weapon") return `攻击 +${Math.round(item.stats.atk || 0)}`;
    if (item.slot === "head" || item.slot === "body" || item.slot === "legs") {
      return `防御 +${Math.round(item.stats.def || 0)} · 生命 +${Math.round(item.stats.hp || 0)}`;
    }
    if (item.slot === "shoes") {
      return `移速 +${Math.round(item.stats.speed || 0)} · 防御 +${Math.round(item.stats.def || 0)}`;
    }
    return `暴击 +${Number(item.stats.crit || 0).toFixed(1)}% · 法力 +${Math.round(item.stats.mp || 0)}`;
  }

  function itemDetailForAffixes(item) {
    return (item.affixes || [])
      .map((a) => `<span class="detail-affix${a.special ? " special" : ""}">${D.statText(a.key, a.value)}</span>`)
      .join("");
  }

  function selectionItem() {
    const p = G.player;
    if (!p || !G.selection) return null;
    if (G.selection.type === "equipped") return p.equip[G.selection.slot] || null;
    if (G.selection.type === "bag") return p.inventory.find((i) => i.id === G.selection.id) || null;
    return null;
  }

  function renderItemDetail() {
    const p = G.player;
    const item = selectionItem();
    if (!item || !p) {
      dom.itemDetail.innerHTML = `<div class="item-detail-empty">选择一件装备查看详情</div>`;
      return;
    }
    const rarity = getRarity(item.rarity);
    const equipped = G.selection.type === "equipped";
    const current = p.equip[item.slot];
    const diff = scoreItem(item) - scoreItem(current);
    const affixSum = {};
    for (const a of item.affixes || []) affixSum[a.key] = (affixSum[a.key] || 0) + a.value;

    const mainStats = Object.entries(item.baseStats || {})
      .map(([key, value]) => {
        const shown = Math.max(0, (item.stats[key] || 0) - (affixSum[key] || 0));
        const pct = D.PERCENT_STAT_KEYS.includes(key);
        const display = pct ? Number(shown).toFixed(1) : Math.round(shown);
        return `<span>${D.STAT_PREFIX[key] || key} <b>+${display}${pct ? "%" : ""}</b></span>`;
      })
      .join("");

    const compare = equipped
      ? `<span>战力 <b>${scoreItem(item)}</b></span>`
      : `<span>对比当前 <b class="${diff >= 0 ? "good" : ""}" style="${diff < 0 ? "color:#e2857d" : ""}">${diff >= 0 ? "+" : ""}${diff} 战力</b></span>`;

    let actions = "";
    if (equipped) {
      const cost = upgradeCost(item);
      const canMax = item.upgrade >= 9;
      actions = `
        <button class="tiny-button gold" data-action="upgrade" ${canMax ? "disabled" : ""}>${canMax ? "已强化至 +9" : `强化 +${item.upgrade + 1} · ${cost} 金 · 石×1`}</button>
        <button class="tiny-button" data-action="unequip">卸下</button>
      `;
    } else {
      actions = `
        <button class="tiny-button gold" data-action="equip">穿戴</button>
        <button class="tiny-button danger" data-action="salvage">分解 · ${itemSellValue(item)} 金</button>
      `;
    }

    dom.itemDetail.innerHTML = `
      <div class="detail-top">
        <div>
          <h4 class="detail-name" style="--rarity:${rarity.color}">${itemName(item)}</h4>
          <p class="detail-meta">${rarity.name} · ${itemSlotLabel(item.slot)} · 装备等级 ${item.ilvl} · 战力 ${scoreItem(item)}</p>
        </div>
        <div class="detail-actions">${actions}</div>
      </div>
      <div class="detail-stats">${mainStats}${compare}</div>
      <div class="detail-affixes">${itemDetailForAffixes(item) || '<span class="detail-affix">无附加词条</span>'}</div>
      <p class="detail-flavor">${item.flavor || ""}</p>
    `;
  }

  function renderGearSlot(slot) {
    const p = G.player;
    const item = p.equip[slot];
    const [nameId, statId] = GEAR_BY_SLOT[slot];
    const nameEl = dom[nameId];
    const statEl = dom[statId];
    setText(nameEl, item ? itemName(item) : "未装备");
    setText(statEl, item ? mainStatLine(item) : "点击查看");
    const button = nameEl && nameEl.closest(".gear-slot");
    if (button) {
      button.style.setProperty("--rarity", item ? getRarity(item.rarity).color : "#727c96");
    }
  }

  function renderInventory() {
    const p = G.player;
    if (!p) return;
    setText(dom.invGold, G.gold);
    setText(dom.invLevel, p.level);
    setText(dom.power, p.stats.power);
    if (dom.invSkin) {
      const skinDef = D.SKINS[p.skin];
      const skinLv = p.skinLevels && p.skinLevels[p.skin] ? p.skinLevels[p.skin] : 1;
      setText(dom.invSkin, skinDef ? `${skinDef.name}${p.skin !== "default" && skinLv > 1 ? ` +${skinLv}` : ""}` : "原皮");
      if (dom.invSkinUnequip) dom.invSkinUnequip.disabled = p.skin === "default";
    }
    if (dom.invTitle) setText(dom.invTitle, D.TITLES[p.title] && p.title !== "none" ? D.TITLES[p.title].name : "无称号");
    if (dom.invWing) {
      const wDef = p.wing ? D.WINGS[p.wing] : null;
      setText(dom.invWing, wDef ? `${wDef.name} +${wingLevel(p.wing)}` : "无");
      if (dom.invWingUnequip) dom.invWingUnequip.disabled = !p.wing;
    }
    for (const slot of SLOT_ORDER) renderGearSlot(slot);

    const stats = [
      ["攻击", Math.round(p.stats.atk)],
      ["防御", Math.round(p.stats.def)],
      ["生命", Math.ceil(p.maxHp)],
      ["法力", Math.ceil(p.maxMp)],
      ["暴击", `${Math.round(p.stats.crit * 1000) / 10}%`],
      ["移速", Math.round(p.stats.speed)],
      ["吸血", `${Math.round(p.stats.lifesteal * 1000) / 10}%`],
      ["金币加成", `${Math.round(p.stats.goldPct * 100)}%`]
    ];
    dom.characterStats.innerHTML = stats.map(([label, value]) => `<div><span>${label}</span><b>${value}</b></div>`).join("");

    const specials = [
      ["攻击加成", p.stats.atkPct * 100],
      ["生命加成", p.stats.hpPct * 100],
      ["防御加成", p.stats.defPct * 100],
      ["技能增伤", p.stats.skillPct * 100],
      ["降妖增伤", p.stats.bossPct * 100],
      ["冷却缩减", p.stats.cdr * 100],
      ["伤害减免", p.stats.dr * 100],
      ["攻击速度", (p.stats.atkSpeed - 1) * 100],
      ["掉落品质", p.stats.luckPct || 0],
      ["吸血", p.stats.lifesteal * 100]
    ].filter(([, value]) => value > 0.05);
    dom.characterSpecials.innerHTML =
      '<span class="special-title">特殊词条</span>' +
      (specials.length
        ? specials.map(([label, value]) => `<span class="special-chip">${label} +${value.toFixed(1)}%</span>`).join("")
        : '<span class="special-chip" style="opacity:.45">暂无</span>');

    setText(dom.bagCapacity, `${p.inventory.length} / ${INVENTORY_CAP}`);
    const totalPages = Math.max(1, Math.ceil(p.inventory.length / BAG_PAGE_SIZE));
    bagPage = clamp(bagPage, 0, totalPages - 1);
    const pageItems = p.inventory.slice(bagPage * BAG_PAGE_SIZE, (bagPage + 1) * BAG_PAGE_SIZE);
    setText(dom.bagPageLabel, `${bagPage + 1} / ${totalPages}`);
    if (dom.bagPrev) dom.bagPrev.disabled = bagPage <= 0;
    if (dom.bagNext) dom.bagNext.disabled = bagPage >= totalPages - 1;
    if (!p.inventory.length) {
      dom.bagGrid.innerHTML = `<div class="bag-empty">行囊空空如也<br />击败妖怪，装备会掉落于此</div>`;
    } else {
      dom.bagGrid.innerHTML = pageItems
        .map((item) => {
          const rarity = getRarity(item.rarity);
          const selected = G.selection && G.selection.type === "bag" && G.selection.id === item.id;
          const hasSpecial = (item.affixes || []).some((a) => a.special);
          return `
            <button class="bag-item ${selected ? "selected" : ""}" data-item-id="${item.id}" style="--rarity:${rarity.color}">
              ${hasSpecial ? '<span class="bag-item-special">特</span>' : ""}
              <span class="bag-item-icon">${itemShort(item.slot)}</span>
              <span class="bag-item-name">${itemName(item)}</span>
              <span class="bag-item-level">${rarity.name} · ${item.ilvl}级</span>
            </button>
          `;
        })
        .join("");
    }

    if (!G.selection) {
      if (p.equip.weapon) G.selection = { type: "equipped", slot: "weapon", id: p.equip.weapon.id };
      else if (p.inventory.length) G.selection = { type: "bag", id: p.inventory[0].id };
    }
    renderItemDetail();
    A.drawCharacterPreview(dom.characterPreview, {
      t: G.time,
      state: p.dead ? "dead" : "idle",
      gear: playerAppearance()
    });
  }

  function selectBagItem(id) {
    const item = G.player.inventory.find((i) => i.id === id);
    if (!item) return;
    G.selection = { type: "bag", id };
    renderInventory();
    Audio.sfx("ui");
  }

  function selectEquippedSlot(slot) {
    const item = G.player.equip[slot];
    if (!item) {
      G.selection = null;
      renderInventory();
      return;
    }
    G.selection = { type: "equipped", slot, id: item.id };
    renderInventory();
    Audio.sfx("ui");
  }

  /* ------------------------------------------------------------------ */
  /* Skill UI                                                            */
  /* ------------------------------------------------------------------ */

  function skillSlotKey(index) {
    return ["K", "L", "O"][index] || "?";
  }

  function renderSkillScreen() {
    const p = G.player;
    if (!p) return;
    setText(dom.essenceCount, G.essence);
    setText(dom.skillMaxMp, p.maxMp);
    setText(dom.selectedSkillSlotLabel, `装配到 ${skillSlotKey(G.skillSlotSelected)}`);

    dom.skillLoadout.innerHTML = p.skillSlots
      .map((id, index) => {
        const def = D.SKILLS[id];
        const level = p.skillLevels[id] || 1;
        const selected = G.skillSlotSelected === index;
        if (!def) {
          return `
            <button class="skill-loadout-slot ${selected ? "selected" : ""}" data-loadout-index="${index}">
              <span class="skill-slot-key">${skillSlotKey(index)}</span>
              <span class="skill-slot-icon">—</span>
              <span class="skill-slot-info"><span class="skill-slot-name">未研习</span><span class="skill-slot-meta">选择技能装配</span></span>
            </button>
          `;
        }
        return `
          <button class="skill-loadout-slot ${selected ? "selected" : ""}" data-loadout-index="${index}" style="--skill-color:${def.color}">
            <span class="skill-slot-key">${skillSlotKey(index)}</span>
            <span class="skill-slot-icon">${def.icon}</span>
            <span class="skill-slot-info">
              <span class="skill-slot-name">${def.name}</span>
              <span class="skill-slot-meta">Lv.${level} · ${def.tag} · 无冷却</span>
            </span>
            <span class="skill-slot-cost">${def.mana} 法力</span>
          </button>
        `;
      })
      .join("");

    dom.skillCatalog.innerHTML = D.SKILL_ORDER.map((id) => {
      const def = D.SKILLS[id];
      const assignedIndex = p.skillSlots.indexOf(id);
      const assigned = assignedIndex >= 0;
      const level = p.skillLevels[id] || 1;
      const maxed = level >= D.MAX_SKILL_LEVEL;
      const breakCost = maxed ? 0 : D.SKILL_BREAK_COST[level];
      const canBreak = assigned && !maxed && G.essence >= breakCost;
      const key = skillSlotKey(G.skillSlotSelected);
      let assignLabel = `研习到 ${key}`;
      if (assignedIndex === G.skillSlotSelected) assignLabel = `已在 ${key}`;
      else if (assigned) assignLabel = `换到 ${key}`;

      return `
        <article class="skill-card ${assigned ? "assigned" : ""}" style="--skill-color:${def.color}">
          ${assigned ? `<span class="skill-card-assigned">${skillSlotKey(assignedIndex)}</span>` : ""}
          <div class="skill-card-top">
            <span class="skill-card-icon">${def.icon}</span>
            <div>
              <div class="skill-card-name">${def.name}</div>
              <span class="skill-card-tag">${def.tag} · ${assigned ? `Lv.${level}` : "未研习"}</span>
            </div>
          </div>
          <p class="skill-card-desc">${def.desc}</p>
          <div class="skill-card-meta">
            <span class="skill-card-mana">${def.mana} 法力 · 无冷却</span>
            <span class="skill-level-dots">${Array.from({ length: D.MAX_SKILL_LEVEL }, (_, i) => `<i class="${i < level ? "on" : ""}"></i>`).join("")}</span>
          </div>
          <div class="skill-card-actions">
            <button class="skill-mini-button ${assignedIndex === G.skillSlotSelected ? "" : "primary"}" data-assign-skill="${id}" ${assignedIndex === G.skillSlotSelected ? "disabled" : ""}>${assignLabel}</button>
            ${assigned
              ? `<button class="skill-mini-button breakthrough" data-breakthrough-skill="${id}" ${(!canBreak || maxed) ? "disabled" : ""}>${maxed ? "已突破至五重" : `突破 ${breakCost} 魄`}</button>`
              : ""}
          </div>
        </article>
      `;
    }).join("");

    updateHUD();
  }

  function selectSkillSlot(index) {
    G.skillSlotSelected = clamp(index, 0, 2);
    renderSkillScreen();
    Audio.sfx("ui");
  }

  function assignSkillToSlot(id) {
    const p = G.player;
    if (!p || !D.SKILLS[id]) return;
    const target = G.skillSlotSelected;
    const existing = p.skillSlots.indexOf(id);
    if (existing === target) return;
    const old = p.skillSlots[target];
    if (existing >= 0) p.skillSlots[existing] = old;
    p.skillSlots[target] = id;
    Audio.sfx("equip");
    showToast(`${D.SKILLS[id].name} 已研习`, `装配到 ${skillSlotKey(target)} 技能栏`);
    renderSkillScreen();
    markSave();
  }

  function breakthroughSkill(id) {
    const p = G.player;
    if (!p || !D.SKILLS[id]) return;
    if (!p.skillSlots.includes(id)) {
      showToast("尚未研习", "先把该技能装配到技能栏");
      Audio.sfx("error");
      return;
    }
    const level = p.skillLevels[id] || 1;
    if (level >= D.MAX_SKILL_LEVEL) {
      showToast("已突破至五重", "该技能已达到上限");
      Audio.sfx("error");
      return;
    }
    const cost = D.SKILL_BREAK_COST[level];
    if (G.essence < cost) {
      showToast("悟道精魄不足", `突破需要 ${cost} 枚悟道精魄`);
      Audio.sfx("error");
      return;
    }
    G.essence -= cost;
    p.skillLevels[id] = level + 1;
    Audio.sfx("levelup");
    addEffect({ kind: "levelup", x: p.x, y: p.y - 24, duration: 0.9 });
    showToast(`${D.SKILLS[id].name} 突破至 ${level + 1} 重`, `消耗 ${cost} 枚悟道精魄`);
    renderSkillScreen();
    markSave();
  }

  function openSkills(fromPause) {
    if (!G.player) return;
    if (!(G.mode === "playing" || G.mode === "paused")) return;
    G.returnMode = fromPause || G.mode === "paused" ? "paused" : "playing";
    hide(dom.pauseScreen);
    hide(dom.interactPrompt);
    G.mode = "skills";
    setTouchVisible(false);
    show(dom.skillScreen);
    Audio.setPaused(true);
    G.skillSlotSelected = 0;
    renderSkillScreen();
    Audio.sfx("ui");
  }

  function closeSkills() {
    if (G.mode !== "skills") return;
    hide(dom.skillScreen);
    if (G.returnMode === "paused") {
      G.mode = "paused";
      show(dom.pauseScreen);
      fillPauseSummary();
      Audio.setPaused(true);
      setTouchVisible(false);
    } else {
      G.mode = "playing";
      setTouchVisible(true);
      Audio.setPaused(false);
      lastFrame = performance.now();
    }
    updateHUD();
    Audio.sfx("ui");
  }

  function artifactOwned(id) {
    return !!(G.player && G.player.artifacts.includes(id));
  }

  function artifactCostText(id) {
    const def = D.ARTIFACTS[id];
    if (!def) return "";
    if (def.shopOnly) return `轮回石 ×${def.costStones}`;
    return Object.entries(def.cost)
      .map(([key, amount]) => `${D.MATERIALS[key].name} ×${amount}`)
      .join(" + ");
  }

  function canCraftArtifact(id) {
    const def = D.ARTIFACTS[id];
    if (!def || def.shopOnly) return false;
    return Object.entries(def.cost).every(([key, amount]) => {
      if (key === "treasureJade") return G.treasureJade >= amount;
      return (G.artifactMats[key] || 0) >= amount;
    });
  }

  function renderArtifactScreen() {
    const p = G.player;
    if (!p) return;
    if (!D.ARTIFACTS[G.artifactSelected]) {
      G.artifactSelected = p.activeArtifact || D.ARTIFACT_ORDER[0];
    }
    const id = G.artifactSelected;
    const def = D.ARTIFACTS[id];
    const owned = artifactOwned(id);
    const active = p.activeArtifact === id;
    setText(dom.treasureJadeCount, G.treasureJade);
    setText(dom.artifactIcon, def.icon);
    setText(dom.artifactName, def.name);
    setText(dom.artifactTag, def.tag);
    setText(dom.artifactDesc, def.desc);
    if (dom.artifactStats) setText(dom.artifactStats, artifactStatsText(id));
    setText(dom.artifactCost, artifactCostText(id));
    dom.craftArtifact.classList.toggle("hidden", owned || !!def.shopOnly);
    dom.craftArtifact.disabled = false;
    dom.equipArtifact.classList.toggle("hidden", !owned || active);
    dom.useArtifact.classList.toggle("hidden", !owned || !active);
    dom.useArtifact.disabled = p.artifactCd > 0;
    const upInfo = artifactUpgradeInfo(id);
    if (dom.artifactUpgradeBox) {
      dom.artifactUpgradeBox.classList.toggle("hidden", !owned);
      if (owned && upInfo) {
        const haveMat = G.artifactMats[upInfo.matKey] || 0;
        setText(dom.artifactLevel, upInfo.maxed ? `+${upInfo.maxLevel} 满级` : `+${upInfo.level}`);
        setText(dom.artifactUpgradeCost, upInfo.maxed ? "已满级" : `${upInfo.matName} ×${upInfo.matCost} · ${upInfo.goldCost} 金币（持有 ${haveMat}）`);
        if (dom.upgradeArtifact) {
          dom.upgradeArtifact.disabled = upInfo.maxed || G.gold < upInfo.goldCost || haveMat < upInfo.matCost;
          dom.upgradeArtifact.textContent = upInfo.maxed ? "已满级" : "强化法宝";
        }
      }
    }
    if (!owned) {
      if (def.shopOnly) setText(dom.artifactStatus, "异界法宝 · 在轮回商店用轮回石兑换");
      else setText(dom.artifactStatus, canCraftArtifact(id) ? "材料齐备 · 可前往熔炉炼制" : "尚未炼制 · 集齐材料后可在熔炉合成");
    } else if (!active) {
      setText(dom.artifactStatus, "已炼制 · 装备后可催动");
    } else if (p.artifactCd > 0) {
      setText(dom.artifactStatus, `已装备 · 冷却 ${Math.ceil(p.artifactCd)} 秒`);
    } else if (def.effect === "cleanse" && p.regenT > 0) {
      setText(dom.artifactStatus, `甘露持续中 · 剩余 ${p.regenT.toFixed(1)} 秒`);
    } else {
      setText(dom.artifactStatus, "已装备 · 按 F 催动");
    }
    dom.artifactList.innerHTML = D.ARTIFACT_ORDER.map((aid) => {
      const a = D.ARTIFACTS[aid];
      const has = artifactOwned(aid);
      const on = p.activeArtifact === aid;
      return `<div class="artifact-card ${has ? "owned" : ""} ${aid === id ? "selected" : ""}" data-artifact-id="${aid}">
        <div class="artifact-card-icon">${a.icon}</div>
        <div><b>${a.name}</b><span>${a.shortDesc || a.desc}</span></div>
        <em>${on ? `已装备 +${artifactLevel(aid)}` : has ? `已炼制 +${artifactLevel(aid)}` : "未炼制"}</em>
      </div>`;
    }).join("");
  }

  function craftArtifact() {
    openForge(G.mode === "artifacts" || G.mode === "paused");
  }

  function equipArtifact(id = G.artifactSelected) {
    const p = G.player;
    if (!p || !artifactOwned(id)) return;
    p.activeArtifact = id;
    recalcStats();
    showToast(`装备法宝 · ${D.ARTIFACTS[id].name}`, "按 F 催动法宝");
    renderArtifactScreen();
    updateHUD();
    markSave();
  }

  const ARTIFACT_MAX_LEVEL = 10;

  function artifactLevel(id) {
    const p = G.player;
    if (!p || !id) return 1;
    return Math.max(1, (p.artifactLevels && p.artifactLevels[id]) || 1);
  }

  const WING_MAX_LEVEL = 10;

  function wingLevel(id) {
    const p = G.player;
    if (!p || !id) return 1;
    return Math.max(1, (p.wingLevels && p.wingLevels[id]) || 1);
  }

  function wingOwned(id) {
    const p = G.player;
    return !!(p && p.wings.includes(id));
  }

  function wingMaterialCount(id) {
    const def = D.WINGS[id];
    if (!def) return 0;
    return Math.max(0, (G.wingMats && G.wingMats[def.mat]) || 0);
  }

  function wingUpgradeInfo(id) {
    const def = D.WINGS[id];
    if (!def) return null;
    const level = wingLevel(id);
    const maxed = level >= WING_MAX_LEVEL;
    return {
      level,
      maxed,
      maxLevel: WING_MAX_LEVEL,
      mat: def.mat,
      matName: D.MATERIALS[def.mat] ? D.MATERIALS[def.mat].name : def.mat,
      matCost: 1 + Math.floor(level / 2),
      goldCost: Math.round(260 + level * 200)
    };
  }

  function wingStatsText(id) {
    const def = D.WINGS[id];
    if (!def) return "";
    const lv = wingLevel(id);
    const total = {};
    let jump = 0;
    const add = (obj) => {
      for (const [key, value] of Object.entries(obj || {})) {
        if (key === "jump") jump += value;
        else total[key] = (total[key] || 0) + value;
      }
    };
    add(def.stats);
    for (let i = 1; i < lv; i++) add(def.levelStats);
    const parts = Object.entries(total).map(([key, value]) => {
      if (key === "speed") return `水平速度 +${value.toFixed(0)}`;
      return `${D.STAT_PREFIX[key] || key} +${Number(value).toFixed(1)}%`;
    });
    if (jump) parts.push(`跳跃速度 +${jump.toFixed(0)}`);
    return parts.join(" · ");
  }

  function artifactScale(id) {
    return 1 + (artifactLevel(id) - 1) * 0.18;
  }

  function artifactCooldown(def) {
    const lv = artifactLevel(def.id);
    return Math.max(5, def.cooldown * Math.max(0.5, 1 - (lv - 1) * 0.045));
  }

  function artifactStatsText(id) {
    const def = D.ARTIFACTS[id];
    if (!def) return "属性加成：—";
    const lv = artifactLevel(id);
    const total = {};
    const base = def.stats || def.statPct;
    if (base) for (const [k, v] of Object.entries(base)) total[k] = (total[k] || 0) + v;
    if (def.levelStats) {
      for (let i = 1; i < lv; i++) {
        for (const [k, v] of Object.entries(def.levelStats)) total[k] = (total[k] || 0) + v;
      }
    }
    const parts = Object.entries(total).map(([k, v]) => `${D.STAT_PREFIX[k] || k} +${Number(v).toFixed(1)}%`);
    return `属性加成（+${lv}）：${parts.length ? parts.join(" · ") : "—"}`;
  }

  function artifactUpgradeInfo(id) {
    const def = D.ARTIFACTS[id];
    if (!def) return null;
    const level = artifactLevel(id);
    const maxed = level >= ARTIFACT_MAX_LEVEL;
    const matKey = def.upgradeMat || "treasureJade";
    return {
      level,
      maxed,
      maxLevel: ARTIFACT_MAX_LEVEL,
      matKey,
      matName: D.MATERIALS[matKey] ? D.MATERIALS[matKey].name : matKey,
      matCost: 1 + Math.floor(level / 2),
      goldCost: Math.round(320 + level * 260)
    };
  }

  function upgradeArtifact(id) {
    const p = G.player;
    const def = D.ARTIFACTS[id];
    const info = artifactUpgradeInfo(id);
    if (!p || !def || !info || !p.artifacts.includes(id)) return;
    if (info.maxed) {
      showToast("法宝已满级", `最高 +${info.maxLevel}`);
      Audio.sfx("error");
      return;
    }
    const haveMat = G.artifactMats[info.matKey] || 0;
    if (G.gold < info.goldCost || haveMat < info.matCost) {
      showToast("强化材料不足", `需要 ${info.matName} ×${info.matCost} 与 ${info.goldCost} 金币`);
      Audio.sfx("error");
      return;
    }
    G.gold -= info.goldCost;
    G.artifactMats[info.matKey] = haveMat - info.matCost;
    p.artifactLevels[id] = info.level + 1;
    recalcStats();
    showToast(`${def.name} 强化 +${info.level + 1}`, "法宝效果提升");
    Audio.sfx("levelup");
    renderArtifactScreen();
    updateHUD();
    markSave();
  }

  function useArtifact() {
    const p = G.player;
    if (!p || p.dead) return false;
    if (G.mode !== "playing" && G.mode !== "artifacts") {
      showToast("战斗中才能催动法宝", "先继续战斗再按 F");
      return false;
    }
    const id = p.activeArtifact;
    const def = id ? D.ARTIFACTS[id] : null;
    if (!def) {
      showToast("尚未装备法宝", "在法宝阁装备法宝");
      Audio.sfx("error");
      return false;
    }
    if (p.artifactCd > 0) {
      showToast("法宝冷却中", `还需 ${Math.ceil(p.artifactCd)} 秒`);
      Audio.sfx("error");
      return false;
    }

    const scale = artifactScale(id);
    p.artifactCd = artifactCooldown(def);
    addText(`${def.name}${artifactLevel(id) > 1 ? ` +${artifactLevel(id)}` : ""}`, p.x, p.y - 56, def.color, 8, { life: 1.1, vy: -20 });
    if (def.effect === "cleanse") {
      const hadDebuff = p.debuffBurnT > 0 || p.debuffPoisonT > 0 || p.debuffSlowT > 0;
      clearPlayerDebuffs();
      p.regenT = def.duration * scale;
      addEffect({ kind: "bottle", x: p.x, y: p.y - 16, duration: 0.85, color: def.color });
      if (hadDebuff) addText("负面效果已净化", p.x, p.y - 44, "#8fe4ff", 6, { life: 1, vy: -14 });
      Audio.sfx("potion");
      showToast("玉净瓶 · 甘露", "负面效果已清除，持续回复生命与法力");
    } else if (def.effect === "stun" || def.effect === "freeze") {
      const radius = (def.effect === "freeze" ? 185 : 135) * (1 + (scale - 1) * 0.25);
      addEffect({ kind: "ring", x: p.x, y: FLOOR, radius: 10, grow: radius, duration: 0.7, color: def.color });
      addEffect({ kind: "eye", x: p.x, y: p.y - 28, radius: radius * 0.45, duration: 0.6, color: def.color });
      for (const e of G.enemies) {
        if (e.dead) continue;
        if (Math.hypot(e.x - p.x, e.y - e.h / 2 - (p.y - 16)) > radius + e.w / 2) continue;
        let stunDur = def.duration * scale;
        // 韧性未破：控制时间大幅缩短；破韧：控制时间延长
        if (e.boss && e.maxPoise > 0) stunDur *= e.poiseBroken ? 1.6 : 0.3;
        e.stunT = Math.max(e.stunT || 0, stunDur);
        if (def.damagePct) damageEnemy(e, p.stats.atk * def.damagePct * scale, { source: "artifact" });
        addEffect({ kind: "hit", x: e.x, y: e.y - e.h * 0.55, duration: 0.25, seed: rand(0, 6) });
      }
      shakeScreen(0.6, 0.3);
      G.screenFlash = { color: def.color, alpha: 0.12, t: 0.3, duration: 0.3 };
      Audio.sfx("boss");
      showToast(`${def.name} · 镇压`, def.effect === "freeze" ? "周围敌人被冻结" : "周围敌人被镇压");
    } else if (def.effect === "swordstorm") {
      const radius = 210 + (scale - 1) * 90;
      addEffect({ kind: "ring", x: p.x, y: FLOOR, radius: 8, grow: radius, duration: 0.65, color: def.color });
      addEffect({ kind: "eyeBeam", x: p.x, y: p.y - 26, targetX: p.x, targetY: p.y - 90, facing: 1, duration: 0.5, color: def.color });
      for (const e of G.enemies) {
        if (e.dead) continue;
        if (Math.hypot(e.x - p.x, e.y - e.h / 2 - (p.y - 16)) > radius + e.w / 2) continue;
        damageEnemy(e, p.stats.atk * def.damagePct * scale, { crit: true, source: "artifact" });
        addEffect({ kind: "hit", x: e.x, y: e.y - e.h * 0.55, duration: 0.3, seed: rand(0, 6) });
      }
      shakeScreen(1.1, 0.45);
      G.screenFlash = { color: def.color, alpha: 0.18, t: 0.35, duration: 0.35 };
      Audio.sfx("hit");
      showToast("诛仙剑 · 剑阵", "万剑齐发，周围敌人受到巨额伤害");
    }

    if (G.mode === "artifacts") closeArtifacts();
    updateHUD();
    return true;
  }

  function openArtifacts(fromPause) {
    if (!G.player) return;
    if (!(G.mode === "playing" || G.mode === "paused")) return;
    G.returnMode = fromPause || G.mode === "paused" ? "paused" : "playing";
    hide(dom.pauseScreen);
    hide(dom.interactPrompt);
    G.mode = "artifacts";
    setTouchVisible(false);
    show(dom.artifactScreen);
    Audio.setPaused(true);
    renderArtifactScreen();
    Audio.sfx("ui");
  }

  function closeArtifacts() {
    if (G.mode !== "artifacts") return;
    hide(dom.artifactScreen);
    if (G.returnMode === "paused") {
      G.mode = "paused";
      show(dom.pauseScreen);
      fillPauseSummary();
      Audio.setPaused(true);
      setTouchVisible(false);
    } else {
      G.mode = "playing";
      setTouchVisible(true);
      Audio.setPaused(false);
      lastFrame = performance.now();
    }
    updateHUD();
    Audio.sfx("ui");
  }

  function shopRefreshPrice() {
    return 40 + G.maxStageUnlocked * 25;
  }

  function generateShopStock() {
    const stage = G.maxStageUnlocked;
    const stock = [];
    const addMaterial = (key, amount, price) => {
      const mat = D.MATERIALS[key];
      stock.push({ type: "material", key, amount, price, name: mat.name, icon: mat.icon, color: mat.color });
    };
    addMaterial("enhanceStone", 2, 90 + stage * 20);
    addMaterial("essence", 1, 140 + stage * 28);
    addMaterial("treasureJade", 1, 110 + stage * 24);
    addMaterial("spiritHerb", 2, 110 + stage * 20);
    if (stage >= 2) addMaterial("purification", 1, 360 + stage * 36);
    if (stage >= 5) addMaterial("heavenSeal", 1, 520 + stage * 44);
    if (stage >= 8) addMaterial("chaosBell", 1, 720 + stage * 52);
    for (let i = 0; i < 2; i++) {
      const item = generateItem({ source: stage >= 5 ? "boss" : "elite" });
      const price = Math.max(120, Math.round(scoreItem(item) * 1.5 + 60));
      stock.push({ type: "equipment", item, price, name: itemName(item), icon: D.SLOTS[item.slot].icon, color: getRarity(item.rarity).color });
    }
    G.shopStock = stock;
    G.shopKey = `${G.maxStageUnlocked}:${G.loop}`;
    G.shopRefreshCost = shopRefreshPrice();
  }

  function ensureShopStock(force = false) {
    const key = `${G.maxStageUnlocked}:${G.loop}`;
    if (force || G.shopKey !== key) generateShopStock();
    G.shopRefreshCost = shopRefreshPrice();
  }

  function renderShop() {
    const p = G.player;
    if (!p) return;
    ensureShopStock();
    setText(dom.shopGold, G.gold);
    setText(dom.shopStones, G.reincarnationStones);
    setText(dom.shopRefreshCost, G.shopRefreshCost);
    setText(dom.shopUnlockLabel, `已解锁至第${cnNum(G.maxStageUnlocked + 1)}关 · 商品随进度解锁`);
    dom.shell.querySelectorAll("[data-shop-tab]").forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.shopTab === G.shopTab);
    });
    dom.shopRefresh.classList.toggle("hidden", G.shopTab !== "gold");
    if (G.shopTab === "gold") {
      dom.shopGrid.innerHTML = G.shopStock.map((offer, index) => `
        <div class="shop-card">
          <div class="shop-card-icon" style="--card-color:${offer.color}">${offer.icon}</div>
          <div class="shop-card-main">
            <b>${offer.type === "equipment" ? itemName(offer.item) : offer.name}${offer.amount > 1 ? ` ×${offer.amount}` : ""}</b>
            <span>${offer.type === "equipment" ? `${D.SLOTS[offer.item.slot].name} · ${getRarity(offer.item.rarity).name} · 战力 ${scoreItem(offer.item)}` : "材料 / 强化资源"}</span>
          </div>
          <div class="shop-card-buy">
            <em>${offer.price} 金</em>
            <button class="tiny-button gold" data-shop-buy="${index}" ${G.gold < offer.price ? "disabled" : ""}>购买</button>
          </div>
        </div>
      `).join("");
    } else if (G.shopTab === "rebirth") {
      const offers = [
        { key: "immortalSword", name: "诛仙剑魄 ×1", desc: "异界法宝材料，集齐 3 枚可在熔炉合成诛仙剑", price: 2 },
        { key: "treasureJade", name: "法宝灵玉 ×5", desc: "法宝合成的通用灵材", price: 1 },
        { key: "gold", name: "金币 ×1000", desc: "1 轮回石兑换 1000 金币", price: 1 },
        { key: "mecha", name: "机甲·齐天", desc: "异界机甲时装", price: 8 },
        { key: "kunlunMirror", name: "昆仑镜", desc: "异界法宝：冻结敌人，攻击/生命百分比 +3%", price: 15 }
      ];
      dom.shopGrid.innerHTML = offers.map((offer) => `
        <div class="shop-card">
          <div class="shop-card-icon rebirth" style="--card-color:#8fe4ff">${offer.key === "mecha" ? "甲" : offer.key === "gold" ? "金" : "轮"}</div>
          <div class="shop-card-main"><b>${offer.name}</b><span>${offer.desc}</span></div>
          <div class="shop-card-buy"><em>${offer.price} 轮回石</em><button class="tiny-button gold" data-rebirth-buy="${offer.key}" ${G.reincarnationStones < offer.price ? "disabled" : ""}>兑换</button></div>
        </div>
      `).join("");
    } else if (G.shopTab === "fashion") {
      dom.shopGrid.innerHTML = D.SKIN_ORDER.map((id) => {
        const skin = D.SKINS[id];
        const owned = id === "default" || p.skins.includes(id);
        const active = p.skin === id;
        const level = id === "default" ? 1 : Math.max(1, p.skinLevels[id] || 1);
        const bag = p.skinBag[id] || {};
        const bonus = {};
        if (id !== "default") {
          for (const [k, v] of Object.entries(skin.stats || {})) bonus[k] = (bonus[k] || 0) + v;
          for (let i = 1; i < level; i++) {
            for (const [k, v] of Object.entries(skin.levelStats || {})) bonus[k] = (bonus[k] || 0) + v;
          }
        }
        const statLines = Object.entries(bonus).map(([k, v]) => `${D.STAT_PREFIX[k] || k} +${Number(v).toFixed(1)}%`);
        const copies = id === "default" ? "" : Object.keys(bag).map((n) => `+${n}×${bag[n]}`).join(" ");
        const canMerge = id !== "default" && Object.keys(bag).some((n) => bag[n] >= 3 && Number(n) < (skin.maxLevel || 1));
        const buyPrice = owned ? skin.copyCost || skin.costStones : skin.costStones;
        const meta = [id === "default" ? "" : `Lv.${level}`, copies, statLines.join(" · ")].filter(Boolean).join(" · ");
        let actions;
        if (!owned) {
          actions = `<em>${skin.costStones} 轮回石</em><button class="tiny-button gold" data-skin-buy="${id}" ${G.reincarnationStones < skin.costStones ? "disabled" : ""}>购买</button>`;
        } else if (id === "default") {
          actions = `<button class="tiny-button gold" data-skin-equip="default" ${active ? "disabled" : ""}>${active ? "使用中" : "使用"}</button>`;
        } else {
          actions = `<button class="tiny-button gold" data-skin-equip="${active ? "default" : id}">${active ? "卸下" : "穿戴"}</button>`;
          actions += `<button class="tiny-button gold" data-skin-buy="${id}" ${G.reincarnationStones < buyPrice ? "disabled" : ""}>买1件 ${buyPrice}石</button>`;
          if (canMerge) actions += `<button class="tiny-button gold" data-skin-merge="${id}">合成</button>`;
        }
        return `<div class="shop-card skin-card ${active ? "selected" : ""}">
          <div class="shop-card-icon skin" style="--card-color:${skin.color || "#c79a47"}">${skin.icon}</div>
          <div class="shop-card-main"><b>${skin.name}</b><span>${skin.desc}</span>${meta ? `<span class="skin-meta">${meta}</span>` : ""}</div>
          <div class="shop-card-buy">${actions}</div>
        </div>`;
      }).join("");
    } else {
      dom.shopGrid.innerHTML = D.TITLE_ORDER.map((id) => {
        const title = D.TITLES[id];
        const owned = p.titles.includes(id);
        const active = p.title === id;
        const condMet = checkTitleCond(title.cond);
        let titleActions;
        if (owned) {
          titleActions = `<button class="tiny-button gold" data-title-equip="${id}" ${active ? "disabled" : ""}>${active ? "已佩戴" : "佩戴"}</button>`;
        } else if (title.cond) {
          titleActions = `<em>条件：${title.cond.desc}</em><button class="tiny-button gold" data-title-claim="${id}" ${condMet ? "" : "disabled"}>${condMet ? "领取" : "未达成"}</button>`;
        } else {
          titleActions = `<em>${title.costStones} 轮回石</em><button class="tiny-button gold" data-title-buy="${id}" ${G.reincarnationStones < title.costStones ? "disabled" : ""}>购买</button>`;
        }
        return `<div class="shop-card title-card ${active ? "selected" : ""}">
          <div class="shop-card-icon title" style="--card-color:#e6c35a">${title.icon}</div>
          <div class="shop-card-main"><b>${title.name}</b><span>${title.desc}</span></div>
          <div class="shop-card-buy">${titleActions}</div>
        </div>`;
      }).join("");
    }
  }

  function buyShopOffer(index) {
    const offer = G.shopStock[index];
    if (!offer) return;
    if (G.gold < offer.price) {
      showToast("金币不足", "先去打怪或出售材料吧");
      Audio.sfx("error");
      return;
    }
    G.gold -= offer.price;
    if (offer.type === "material") {
      if (offer.key === "enhanceStone") G.enhanceStones += offer.amount;
      else if (offer.key === "essence") G.essence += offer.amount;
      else if (offer.key === "treasureJade") G.treasureJade += offer.amount;
      else if (offer.key === "spiritHerb") G.spiritHerb = (G.spiritHerb || 0) + offer.amount;
      else G.artifactMats[offer.key] = (G.artifactMats[offer.key] || 0) + offer.amount;
      showToast(`购买 ${offer.name}`, `获得 ${offer.amount} 份`);
    } else {
      acquireItem(offer.item, { silent: true });
      showToast(`购买 ${itemName(offer.item)}`, `花费 ${offer.price} 金币，已放入背包`);
    }
    G.shopStock.splice(index, 1);
    Audio.sfx("loot", "epic");
    renderShop();
    updateHUD();
    markSave();
  }

  function buyRebirthOffer(key) {
    if (key === "immortalSword") {
      if (G.reincarnationStones < 2) return;
      G.reincarnationStones -= 2;
      G.artifactMats.immortalSword = (G.artifactMats.immortalSword || 0) + 1;
      showToast("兑换 诛仙剑魄", "异界法宝材料 +1");
    } else if (key === "treasureJade") {
      if (G.reincarnationStones < 1) return;
      G.reincarnationStones -= 1;
      G.treasureJade += 5;
      showToast("兑换 法宝灵玉", "法宝灵玉 +5");
    } else if (key === "gold") {
      if (G.reincarnationStones < 1) return;
      G.reincarnationStones -= 1;
      G.gold += 1000;
      showToast("兑换 金币", "金币 +1000");
    } else if (key === "mecha") {
      const p = G.player;
      const owned = p.skins.includes("mecha");
      if (G.reincarnationStones < 8) return;
      G.reincarnationStones -= 8;
      grantSkinCopy("mecha");
      if (!owned) p.skin = "mecha";
      recalcStats();
      showToast(owned ? "再购入 · 机甲·齐天" : "获得时装 · 机甲·齐天", owned ? "可用于三合一合成升级" : "已自动穿戴");
    } else if (key === "kunlunMirror") {
      if (G.player.artifacts.includes("kunlunMirror")) {
        showToast("已经拥有", "昆仑镜已在法宝栏中");
        return;
      }
      if (G.reincarnationStones < 15) return;
      G.reincarnationStones -= 15;
      G.player.artifacts.push("kunlunMirror");
      G.player.activeArtifact = "kunlunMirror";
      G.artifactSelected = "kunlunMirror";
      recalcStats();
      showToast("获得异界法宝 · 昆仑镜", "攻击与生命 +3%（百分比）");
    }
    Audio.sfx("loot", "epic");
    renderShop();
    updateHUD();
    markSave();
  }

  function skinBagOf(id) {
    const p = G.player;
    if (!p.skinBag[id]) p.skinBag[id] = {};
    return p.skinBag[id];
  }

  function grantSkinCopy(id) {
    const p = G.player;
    if (!p.skins.includes(id)) p.skins.push(id);
    const bag = skinBagOf(id);
    bag[1] = (bag[1] || 0) + 1;
    if (!p.skinLevels[id]) p.skinLevels[id] = 1;
  }

  function buySkin(id) {
    const skin = D.SKINS[id];
    const p = G.player;
    if (!skin || !p || id === "default") return;
    const owned = p.skins.includes(id);
    const price = owned ? skin.copyCost || skin.costStones : skin.costStones;
    if (G.reincarnationStones < price) {
      showToast("轮回石不足", `需要 ${price} 枚轮回石`);
      Audio.sfx("error");
      return;
    }
    G.reincarnationStones -= price;
    grantSkinCopy(id);
    if (!owned) p.skin = id;
    recalcStats();
    showToast(
      owned ? `再购入 · ${skin.name}` : `获得时装 · ${skin.name}`,
      owned ? "可用于三合一合成升级" : "已自动穿戴"
    );
    renderShop();
    updateHUD();
    renderInventory();
    markSave();
  }

  function equipSkin(id) {
    const p = G.player;
    if (!p) return;
    if (id !== "default" && !p.skins.includes(id)) return;
    p.skin = id;
    recalcStats();
    showToast(id === "default" ? "已卸下时装" : `切换时装 · ${D.SKINS[id].name}`, "外观与百分比属性已更新");
    renderShop();
    updateHUD();
    renderInventory();
    markSave();
  }

  function mergeSkin(id) {
    const skin = D.SKINS[id];
    const p = G.player;
    if (!skin || !p || id === "default") return;
    const bag = skinBagOf(id);
    const maxLevel = skin.maxLevel || 1;
    const levels = Object.keys(bag)
      .map(Number)
      .filter((n) => bag[n] >= 3 && n < maxLevel)
      .sort((a, b) => a - b);
    if (!levels.length) {
      showToast("暂时无法合成", "需要 3 件同等级时装");
      Audio.sfx("error");
      return;
    }
    const level = levels[0];
    bag[level] -= 3;
    if (bag[level] <= 0) delete bag[level];
    bag[level + 1] = (bag[level + 1] || 0) + 1;
    p.skinLevels[id] = Math.max(p.skinLevels[id] || 1, level + 1);
    recalcStats();
    showToast(`合成成功 · ${skin.name} +${level + 1}`, "百分比加成提升");
    Audio.sfx("levelup");
    renderShop();
    updateHUD();
    renderInventory();
    markSave();
  }

  function checkTitleCond(cond) {
    if (!cond) return true;
    const p = G.player;
    switch (cond.type) {
      case "stage": return G.maxStageUnlocked >= cond.value;
      case "loop": return G.loop >= cond.value;
      case "kills": return (G.totalKills || 0) >= cond.value;
      case "body": {
        const b = G.body || {};
        return (b.hp || 0) + (b.atk || 0) + (b.def || 0) >= cond.value;
      }
      case "wing": return !!(p && p.wings.includes(cond.value));
      case "artifacts": return !!(p && p.artifacts.length >= cond.value);
      default: return false;
    }
  }

  function claimTitle(id) {
    const title = D.TITLES[id];
    const p = G.player;
    if (!title || !p || p.titles.includes(id)) return;
    if (!checkTitleCond(title.cond)) {
      showToast("条件未达成", title.cond ? title.cond.desc : "");
      Audio.sfx("error");
      return;
    }
    p.titles.push(id);
    p.title = id;
    recalcStats();
    showToast(`获得称号 · ${title.name}`, "达成条件，永久获得");
    Audio.sfx("levelup");
    renderShop();
    updateHUD();
    markSave();
  }

  function buyTitle(id) {
    const title = D.TITLES[id];
    const p = G.player;
    if (!title || !p || p.titles.includes(id)) return;
    if (G.reincarnationStones < title.costStones) {
      showToast("轮回石不足", `需要 ${title.costStones} 枚轮回石`);
      Audio.sfx("error");
      return;
    }
    G.reincarnationStones -= title.costStones;
    p.titles.push(id);
    p.title = id;
    recalcStats();
    showToast(`获得称号 · ${title.name}`, "只提供百分比属性加成");
    renderShop();
    updateHUD();
    markSave();
  }

  function equipTitle(id) {
    const p = G.player;
    if (!p || !p.titles.includes(id)) return;
    p.title = id;
    recalcStats();
    showToast(`佩戴称号 · ${D.TITLES[id].name}`, "属性已按百分比重新计算");
    renderShop();
    updateHUD();
    markSave();
  }

  function openShop(fromPause) {
    if (!G.player) return;
    if (!(G.mode === "playing" || G.mode === "paused")) return;
    G.returnMode = fromPause || G.mode === "paused" ? "paused" : "playing";
    hide(dom.pauseScreen);
    hide(dom.interactPrompt);
    G.mode = "shop";
    setTouchVisible(false);
    show(dom.shopScreen);
    Audio.setPaused(true);
    ensureShopStock();
    renderShop();
    Audio.sfx("ui");
  }

  function closeShop() {
    if (G.mode !== "shop") return;
    hide(dom.shopScreen);
    if (G.returnMode === "paused") {
      G.mode = "paused";
      show(dom.pauseScreen);
      fillPauseSummary();
      Audio.setPaused(true);
      setTouchVisible(false);
    } else {
      G.mode = "playing";
      setTouchVisible(true);
      Audio.setPaused(false);
      lastFrame = performance.now();
    }
    updateHUD();
    Audio.sfx("ui");
  }

  function renderForge() {
    const p = G.player;
    if (!p) return;
    setText(dom.forgeJadeCount, G.treasureJade);
    const matKeys = ["purification", "heavenSeal", "chaosBell", "immortalSword"];
    dom.forgeMaterials.innerHTML = matKeys.map((key) => {
      const mat = D.MATERIALS[key];
      return `<div class="forge-mat" style="--mat-color:${mat.color}"><b>${mat.icon}</b><span>${mat.name}</span><em>×${G.artifactMats[key] || 0}</em></div>`;
    }).join("") + `<div class="forge-mat" style="--mat-color:#8fe4ff"><b>玉</b><span>法宝灵玉</span><em>×${G.treasureJade}</em></div>`;
    dom.forgeList.innerHTML = D.ARTIFACT_ORDER.filter((id) => !D.ARTIFACTS[id].shopOnly).map((id) => {
      const a = D.ARTIFACTS[id];
      const owned = artifactOwned(id);
      const craftable = canCraftArtifact(id);
      return `<div class="forge-card ${owned ? "owned" : ""}">
        <div class="forge-card-icon" style="--forge-color:${a.color}">${a.icon}</div>
        <div class="forge-card-main"><b>${a.name}</b><span>${a.desc}</span><small>${artifactCostText(id)}</small></div>
        <div class="forge-card-action">
          ${owned ? `<em>已炼制</em>` : `<button class="tiny-button gold" data-forge-craft="${id}" ${craftable ? "" : "disabled"}>${craftable ? "合成" : "材料不足"}</button>`}
        </div>
      </div>`;
    }).join("");
  }

  function craftArtifactAtForge(id) {
    const p = G.player;
    const def = D.ARTIFACTS[id];
    if (!p || !def) return;
    if (artifactOwned(id)) {
      showToast("已经炼成", `${def.name}已在法宝栏中`);
      return;
    }
    if (!canCraftArtifact(id)) {
      showToast("材料不足", `合成 ${def.name} 需要：${artifactCostText(id)}`);
      Audio.sfx("error");
      return;
    }
    for (const [key, amount] of Object.entries(def.cost)) {
      if (key === "treasureJade") G.treasureJade -= amount;
      else G.artifactMats[key] -= amount;
    }
    p.artifacts.push(id);
    p.activeArtifact = id;
    G.artifactSelected = id;
    recalcStats();
    Audio.sfx("levelup");
    addEffect({ kind: "levelup", x: p.x, y: p.y - 24, duration: 0.9 });
    showToast(`法宝炼成 · ${def.name}`, def.tag);
    renderForge();
    renderArtifactScreen();
    updateHUD();
    markSave();
  }

  function openForge(fromPause) {
    if (!G.player) return;
    if (!(G.mode === "playing" || G.mode === "paused" || G.mode === "artifacts")) return;
    G.returnMode = G.mode === "artifacts" ? "artifacts" : fromPause || G.mode === "paused" ? "paused" : "playing";
    hide(dom.pauseScreen);
    hide(dom.artifactScreen);
    hide(dom.interactPrompt);
    G.mode = "forge";
    setTouchVisible(false);
    show(dom.forgeScreen);
    Audio.setPaused(true);
    renderForge();
    Audio.sfx("ui");
  }

  function closeForge() {
    if (G.mode !== "forge") return;
    hide(dom.forgeScreen);
    if (G.returnMode === "artifacts") {
      G.mode = "artifacts";
      show(dom.artifactScreen);
      renderArtifactScreen();
      Audio.setPaused(true);
      setTouchVisible(false);
    } else if (G.returnMode === "paused") {
      G.mode = "paused";
      show(dom.pauseScreen);
      fillPauseSummary();
      Audio.setPaused(true);
      setTouchVisible(false);
    } else {
      G.mode = "playing";
      setTouchVisible(true);
      Audio.setPaused(false);
      lastFrame = performance.now();
    }
    updateHUD();
    Audio.sfx("ui");
  }

  function renderStageSelect() {
    dom.stageSelectGrid.innerHTML = D.STAGES.map((stage, index) => {
      const unlocked = index <= G.maxStageUnlocked;
      const current = index === G.stageIndex;
      const boss = D.BOSSES[stage.boss];
      return `<button class="stage-card ${unlocked ? "" : "locked"} ${current ? "current" : ""}" data-stage-select="${index}" ${unlocked ? "" : "disabled"}>
        <span class="stage-card-index">${stage.index}</span>
        <b>${stage.name}</b>
        <span class="stage-card-boss">${unlocked ? boss.name : "未解锁"}</span>
        <span class="stage-card-desc">${unlocked ? stage.desc : "击败前一个妖王后解锁"}</span>
      </button>`;
    }).join("");
  }

  function openStageSelect(fromPause) {
    if (!G.player) return;
    if (!(G.mode === "playing" || G.mode === "paused")) return;
    G.returnMode = fromPause || G.mode === "paused" ? "paused" : "playing";
    hide(dom.pauseScreen);
    hide(dom.interactPrompt);
    G.mode = "stage-select";
    setTouchVisible(false);
    show(dom.stageSelectScreen);
    Audio.setPaused(true);
    renderStageSelect();
    Audio.sfx("ui");
  }

  function closeStageSelect() {
    if (G.mode !== "stage-select") return;
    hide(dom.stageSelectScreen);
    if (G.returnMode === "paused") {
      G.mode = "paused";
      show(dom.pauseScreen);
      fillPauseSummary();
      Audio.setPaused(true);
      setTouchVisible(false);
    } else {
      G.mode = "playing";
      setTouchVisible(true);
      Audio.setPaused(false);
      lastFrame = performance.now();
    }
    updateHUD();
    Audio.sfx("ui");
  }

  function selectStage(index) {
    if (index > G.maxStageUnlocked) {
      showToast("关卡未解锁", "先击败前一个妖王");
      Audio.sfx("error");
      return;
    }
    hide(dom.stageSelectScreen);
    G.mode = "playing";
    setTouchVisible(true);
    Audio.setPaused(false);
    loadStage(index, { transition: true });
    updateHUD();
    Audio.sfx("portal");
  }

  function reincarnationReward() {
    const p = G.player;
    if (!p) return 1;
    return Math.max(1, Math.floor(p.stats.power / 600) + G.loop * 2 + Math.floor(G.maxStageUnlocked / 2));
  }

  function goldConversionStones() {
    return Math.floor(Math.max(0, G.gold) / 10000);
  }

  function essenceConversionStones() {
    return Math.floor(Math.max(0, G.essence) / 10);
  }

  function renderReincarnation() {
    const p = G.player;
    if (!p) return;
    const reward = reincarnationReward();
    const goldReward = goldConversionStones();
    const essenceReward = essenceConversionStones();
    dom.reincarnationStats.innerHTML = `
      <div><span>当前战力</span><b>${p.stats.power}</b></div>
      <div><span>当前轮回</span><b>${G.loop + 1}</b></div>
      <div><span>战力结算</span><b>+${reward} 轮回石</b></div>
      <div><span>金币结算</span><b>${G.gold} → +${goldReward} 轮回石</b></div>
      <div><span>精魄结算</span><b>${G.essence} → +${essenceReward} 轮回石</b></div>
      <div><span>合计获得</span><b>+${reward + goldReward + essenceReward} 轮回石</b></div>
      <div><span>现有轮回石</span><b>${G.reincarnationStones}</b></div>
    `;
    dom.confirmReincarnation.textContent = `确认轮回 · +${reward + goldReward + essenceReward} 轮回石`;
  }

  function openReincarnation() {
    if (!G.player) return;
    if (!(G.mode === "playing" || G.mode === "paused" || G.mode === "victory")) return;
    G.reincarnationReturn = G.mode;
    hide(dom.pauseScreen);
    hide(dom.victoryScreen);
    hide(dom.interactPrompt);
    G.mode = "reincarnation";
    setTouchVisible(false);
    show(dom.reincarnationScreen);
    Audio.setPaused(true);
    renderReincarnation();
    Audio.sfx("ui");
  }

  function closeReincarnation() {
    if (G.mode !== "reincarnation") return;
    hide(dom.reincarnationScreen);
    if (G.reincarnationReturn === "victory") {
      G.mode = "victory";
      show(dom.victoryScreen);
      Audio.setPaused(true);
      setTouchVisible(false);
    } else if (G.reincarnationReturn === "paused") {
      G.mode = "paused";
      show(dom.pauseScreen);
      fillPauseSummary();
      Audio.setPaused(true);
      setTouchVisible(false);
    } else {
      G.mode = "playing";
      setTouchVisible(true);
      Audio.setPaused(false);
      lastFrame = performance.now();
    }
    updateHUD();
    Audio.sfx("ui");
  }

  function confirmReincarnation() {
    const p = G.player;
    if (!p) return;
    const powerReward = reincarnationReward();
    const goldReward = goldConversionStones();
    const essenceReward = essenceConversionStones();
    const reward = powerReward + goldReward + essenceReward;
    G.reincarnationStones += reward;
    G.gold = 0;
    G.essence = 0;
    // 轮回重置技能：等级归 1，技能栏回到默认
    for (const id of Object.keys(p.skillLevels)) p.skillLevels[id] = 1;
    p.skillSlots = D.DEFAULT_SKILL_SLOTS.slice();
    p.skill.active = false;
    G.loop++;
    G.stageIndex = 0;
    G.portalActive = false;
    G.bossDefeated = false;
    G.boss = null;
    G.selection = null;
    p.level = 1;
    p.xp = 0;
    p.inventory = [];
    p.equip = { head: null, body: null, legs: null, shoes: null, weapon: null, accessory: null };
    p.attack.active = false;
    recalcStats({ full: true });
    p.hp = p.maxHp;
    p.mp = p.maxMp;
    G.mode = "playing";
    hideAllScreens();
    showHUD();
    setTouchVisible(true);
    Audio.setPaused(false);
    loadStage(0, { transition: true });
    showToast("轮回成功", `等级、装备、背包、金币与精魄已清空，技能已重置 · 战力 +${powerReward}、金币 +${goldReward}、精魄 +${essenceReward}，共 ${reward} 枚轮回石`);
    Audio.sfx("gong");
    writeSave();
  }

  /* ------------------------------------------------------------------ */
  /* Screens and flow                                                    */
  /* ------------------------------------------------------------------ */

  const AWAKEN_KEYS = [
    { key: "atkPct", name: "攻击强化" },
    { key: "hpPct", name: "生命强化" },
    { key: "defPct", name: "防御强化" },
    { key: "skillPct", name: "技能增伤强化" }
  ];

  function openAwaken(fromPause) {
    if (!G.player) return;
    if (!(G.mode === "playing" || G.mode === "paused")) return;
    G.returnMode = fromPause || G.mode === "paused" ? "paused" : "playing";
    hide(dom.pauseScreen);
    hide(dom.interactPrompt);
    G.mode = "awaken";
    setTouchVisible(false);
    show(dom.awakenScreen);
    Audio.setPaused(true);
    renderAwaken();
    Audio.sfx("ui");
  }

  function closeAwaken() {
    if (G.mode !== "awaken") return;
    hide(dom.awakenScreen);
    if (G.returnMode === "paused") {
      G.mode = "paused";
      show(dom.pauseScreen);
      fillPauseSummary();
      Audio.setPaused(true);
      setTouchVisible(false);
    } else {
      G.mode = "playing";
      setTouchVisible(true);
      Audio.setPaused(false);
      lastFrame = performance.now();
    }
    updateHUD();
    Audio.sfx("ui");
  }

  function renderAwaken() {
    if (!G.player) return;
    setText(dom.awakenStones, G.reincarnationStones);
    dom.awakenList.innerHTML = AWAKEN_KEYS.map(({ key, name }) => {
      const cur = G.awaken[key] || 0;
      return `<div class="awaken-row">
        <span class="awaken-row-name">${name}</span>
        <span class="awaken-row-val">+${Number(cur).toFixed(0)}%</span>
        <button class="tiny-button gold" data-awaken-key="${key}" data-awaken-amount="1" ${G.reincarnationStones < 1 ? "disabled" : ""}>+1% · 1石</button>
        <button class="tiny-button gold" data-awaken-key="${key}" data-awaken-amount="5" ${G.reincarnationStones < 5 ? "disabled" : ""}>+5% · 5石</button>
      </div>`;
    }).join("");
    const total = AWAKEN_KEYS.reduce((sum, k) => sum + (G.awaken[k.key] || 0), 0);
    setText(dom.awakenTotal, `累计强化：${total.toFixed(0)}%（1 轮回石 = 1%），轮回后依然保留`);
  }

  function awakenUpgrade(key, amount) {
    const p = G.player;
    if (!p) return;
    if (!AWAKEN_KEYS.some((k) => k.key === key)) return;
    const n = Math.max(1, Math.floor(amount || 1));
    if (G.reincarnationStones < n) {
      showToast("轮回石不足", `需要 ${n} 枚轮回石`);
      Audio.sfx("error");
      return;
    }
    G.reincarnationStones -= n;
    G.awaken[key] = (G.awaken[key] || 0) + n;
    recalcStats();
    const label = (AWAKEN_KEYS.find((k) => k.key === key) || {}).name || key;
    showToast("觉醒前世", `${label} +${n}%`);
    Audio.sfx("levelup");
    renderAwaken();
    updateHUD();
    markSave();
  }

  const BODY_KEYS = [
    { key: "hp", name: "气血淬体", per: 35 },
    { key: "atk", name: "攻击淬体", per: 4 },
    { key: "def", name: "防御淬体", per: 3 }
  ];

  function bodyCost(level, amount = 1) {
    let total = 0;
    for (let i = 0; i < amount; i++) total += 1 + Math.floor((level + i) / 2);
    return total;
  }

  function openBody(fromPause) {
    if (!G.player) return;
    if (!(G.mode === "playing" || G.mode === "paused")) return;
    G.returnMode = fromPause || G.mode === "paused" ? "paused" : "playing";
    hide(dom.pauseScreen);
    hide(dom.interactPrompt);
    G.mode = "body";
    setTouchVisible(false);
    show(dom.bodyScreen);
    Audio.setPaused(true);
    renderBody();
    Audio.sfx("ui");
  }

  function closeBody() {
    if (G.mode !== "body") return;
    hide(dom.bodyScreen);
    if (G.returnMode === "paused") {
      G.mode = "paused";
      show(dom.pauseScreen);
      fillPauseSummary();
      Audio.setPaused(true);
      setTouchVisible(false);
    } else {
      G.mode = "playing";
      setTouchVisible(true);
      Audio.setPaused(false);
      lastFrame = performance.now();
    }
    updateHUD();
    Audio.sfx("ui");
  }

  function renderBody() {
    if (!G.player) return;
    setText(dom.bodyHerbs, G.spiritHerb || 0);
    dom.bodyList.innerHTML = BODY_KEYS.map(({ key, name, per }) => {
      const lv = (G.body && G.body[key]) || 0;
      const cost1 = bodyCost(lv, 1);
      const cost5 = bodyCost(lv, 5);
      return `<div class="awaken-row">
        <span class="awaken-row-name">${name} Lv.${lv}</span>
        <span class="awaken-row-val">+${lv * per}</span>
        <button class="tiny-button gold" data-body-key="${key}" data-body-amount="1" ${(G.spiritHerb || 0) < cost1 ? "disabled" : ""}>+1 · ${cost1}药</button>
        <button class="tiny-button gold" data-body-key="${key}" data-body-amount="5" ${(G.spiritHerb || 0) < cost5 ? "disabled" : ""}>+5 · ${cost5}药</button>
      </div>`;
    }).join("");
  }

  function bodyUpgrade(key, amount) {
    if (!BODY_KEYS.some((k) => k.key === key)) return;
    const n = Math.max(1, Math.floor(amount || 1));
    const lv = (G.body && G.body[key]) || 0;
    const cost = bodyCost(lv, n);
    if ((G.spiritHerb || 0) < cost) {
      showToast("灵药不足", `需要 ${cost} 株灵药`);
      Audio.sfx("error");
      return;
    }
    G.spiritHerb -= cost;
    G.body[key] = lv + n;
    recalcStats();
    const label = (BODY_KEYS.find((k) => k.key === key) || {}).name || key;
    showToast("灵药淬体", `${label} +${n} 级`);
    Audio.sfx("levelup");
    renderBody();
    updateHUD();
    markSave();
  }

  function openWings(fromPause) {
    if (!G.player) return;
    if (!(G.mode === "playing" || G.mode === "paused")) return;
    G.returnMode = fromPause || G.mode === "paused" ? "paused" : "playing";
    hide(dom.pauseScreen);
    hide(dom.interactPrompt);
    G.mode = "wings";
    setTouchVisible(false);
    show(dom.wingScreen);
    Audio.setPaused(true);
    renderWings();
    Audio.sfx("ui");
  }

  function closeWings() {
    if (G.mode !== "wings") return;
    hide(dom.wingScreen);
    if (G.returnMode === "paused") {
      G.mode = "paused";
      show(dom.pauseScreen);
      fillPauseSummary();
      Audio.setPaused(true);
      setTouchVisible(false);
    } else {
      G.mode = "playing";
      setTouchVisible(true);
      Audio.setPaused(false);
      lastFrame = performance.now();
    }
    updateHUD();
    Audio.sfx("ui");
  }

  function renderWings() {
    const p = G.player;
    if (!p) return;
    dom.wingList.innerHTML = D.WING_ORDER.map((id) => {
      const def = D.WINGS[id];
      const owned = p.wings.includes(id);
      const active = p.wing === id;
      const mats = wingMaterialCount(id);
      const info = wingUpgradeInfo(id);
      const matName = D.MATERIALS[def.mat] ? D.MATERIALS[def.mat].name : def.mat;
      let actions = "";
      if (!owned) {
        actions = `<em>${matName} ×1（持有 ${mats}）</em><button class="tiny-button gold" data-wing-craft="${id}" ${mats < 1 ? "disabled" : ""}>制作</button>`;
      } else {
        actions = `<button class="tiny-button gold" data-wing-equip="${active ? "none" : id}">${active ? "卸下" : "装备"}</button>`;
        if (!info.maxed) {
          actions += `<button class="tiny-button gold" data-wing-upgrade="${id}" ${mats < info.matCost || G.gold < info.goldCost ? "disabled" : ""}>强化 +${info.level + 1}（${info.matCost}${matName}·${info.goldCost}金）</button>`;
        } else {
          actions += `<em>已满级 +${info.maxLevel}</em>`;
        }
      }
      return `<div class="shop-card title-card ${active ? "selected" : ""}">
        <div class="shop-card-icon wing" style="--card-color:${def.color}">${def.icon}</div>
        <div class="shop-card-main">
          <b>${def.name}${owned ? ` +${wingLevel(id)}` : ""}</b>
          <span>${def.desc}</span>
          <span class="skin-meta">${owned ? wingStatsText(id) : `材料：${matName} ×1（持有 ${mats}）`}</span>
        </div>
        <div class="shop-card-buy">${actions}</div>
      </div>`;
    }).join("");
  }

  function craftWing(id) {
    const p = G.player;
    const def = D.WINGS[id];
    if (!p || !def || p.wings.includes(id)) return;
    if (wingMaterialCount(id) < 1) {
      showToast("材料不足", `需要 1 枚${D.MATERIALS[def.mat] ? D.MATERIALS[def.mat].name : def.mat}`);
      Audio.sfx("error");
      return;
    }
    G.wingMats[def.mat] -= 1;
    p.wings.push(id);
    p.wingLevels[id] = 1;
    p.wing = id;
    recalcStats();
    showToast(`获得翅膀 · ${def.name}`, "已自动装备");
    Audio.sfx("levelup");
    renderWings();
    updateHUD();
    markSave();
  }

  function equipWing(id) {
    const p = G.player;
    if (!p) return;
    if (id !== "none" && !p.wings.includes(id)) return;
    p.wing = id === "none" ? null : id;
    recalcStats();
    showToast(p.wing ? `装备翅膀 · ${D.WINGS[p.wing].name}` : "已卸下翅膀", "速度与属性已更新");
    Audio.sfx("equip");
    renderWings();
    updateHUD();
    markSave();
  }

  function upgradeWing(id) {
    const p = G.player;
    const def = D.WINGS[id];
    const info = wingUpgradeInfo(id);
    if (!p || !def || !info || !p.wings.includes(id)) return;
    if (info.maxed) {
      showToast("翅膀已满级", `最高 +${info.maxLevel}`);
      Audio.sfx("error");
      return;
    }
    if (wingMaterialCount(id) < info.matCost || G.gold < info.goldCost) {
      showToast("材料不足", `需要 ${info.matCost} 枚${info.matName}与 ${info.goldCost} 金币`);
      Audio.sfx("error");
      return;
    }
    G.wingMats[def.mat] -= info.matCost;
    G.gold -= info.goldCost;
    p.wingLevels[id] = info.level + 1;
    recalcStats();
    showToast(`${def.name} 强化 +${info.level + 1}`, "翅膀属性提升");
    Audio.sfx("levelup");
    renderWings();
    updateHUD();
    markSave();
  }

  function hideAllScreens() {
    for (const el of [
      dom.title,
      dom.pauseScreen,
      dom.inventory,
      dom.skillScreen,
      dom.artifactScreen,
      dom.shopScreen,
      dom.forgeScreen,
      dom.stageSelectScreen,
      dom.reincarnationScreen,
      dom.awakenScreen,
      dom.bodyScreen,
      dom.wingScreen,
      dom.deathScreen,
      dom.victoryScreen
    ]) {
      hide(el);
    }
  }

  function setTouchVisible(visible) {
    if (!dom.shell.classList.contains("touch-mode")) return;
    if (visible) show(dom.touch);
    else hide(dom.touch);
  }

  function setMuteUI() {
    if (!dom.mute) return;
    dom.mute.classList.toggle("muted", G.muted);
    setText(dom.mute, G.muted ? "×" : "♪");
  }

  function toggleMute() {
    G.muted = !G.muted;
    Audio.setMuted(G.muted);
    setMuteUI();
    Audio.sfx("ui");
    markSave();
  }

  function enterTitle() {
    if (G.player && (G.mode === "playing" || G.mode === "paused" || G.mode === "inventory")) writeSave();
    hideAllScreens();
    hide(dom.hud);
    hide(dom.interactPrompt);
    hide(dom.bossPanel);
    setTouchVisible(false);
    show(dom.title);
    G.mode = "title";
    G.timeScale = 1;
    G.hitStop = 0;
    G.screenFlash = null;
    G.player = G.player || makePlayer();
    Audio.setPaused(false);
    Audio.setScene("mountain", false);
    refreshSaveButton();
    clearKeys();
  }

  function showHUD() {
    show(dom.hud);
    setTouchVisible(true);
  }

  function startNewGame() {
    Audio.init();
    Audio.setMuted(G.muted);
    hideAllScreens();
    showHUD();
    G.mode = "playing";
    G.stageIndex = 0;
    G.loop = 0;
    G.gold = 0;
    G.potions = 3;
    G.essence = 2;
    G.treasureJade = 1;
    G.enhanceStones = 2;
    G.reincarnationStones = 0;
    G.artifactMats = { purification: 0, heavenSeal: 0, chaosBell: 0, immortalSword: 0 };
    G.awaken = { atkPct: 0, hpPct: 0, defPct: 0, skillPct: 0 };
    G.spiritHerb = 0;
    G.wingMats = {};
    G.body = { hp: 0, atk: 0, def: 0 };
    G.maxStageUnlocked = 0;
    G.shopStock = [];
    G.shopKey = "";
    G.clone = null;
    G.killCount = 0;
    G.totalKills = 0;
    G.goldEarned = 0;
    G.combo = 0;
    G.comboTimer = 0;
    G.maxCombo = 0;
    G.enemies = [];
    G.projectiles = [];
    G.drops = [];
    G.particles = [];
    G.effects = [];
    G.texts = [];
    G.selection = null;
    G.player = makePlayer();
    recalcStats({ full: true });
    G.runStartedAt = G.time;
    loadStage(0, { fresh: true });
    G.hintTimer = 9;
    show(dom.hintBar);
    dom.hintBar.classList.remove("fade");
    Audio.setPaused(false);
    Audio.sfx("ui");
    writeSave();
  }

  function continueGame() {
    const data = readSave();
    if (!data) {
      refreshSaveButton();
      Audio.sfx("error");
      return;
    }
    Audio.init();
    applySave(data);
    Audio.setMuted(G.muted);
    hideAllScreens();
    showHUD();
    G.mode = "playing";
    G.killCount = Math.max(0, Number(data.killCount) || 0);
    G.enemies = [];
    G.projectiles = [];
    G.drops = [];
    G.particles = [];
    G.effects = [];
    G.texts = [];
    G.selection = null;
    G.runStartedAt = G.time - (Number(data.playTime) || 0);
    loadStage(G.stageIndex, { continued: true });
    Audio.setPaused(false);
    G.hintTimer = 5;
    show(dom.hintBar);
    dom.hintBar.classList.remove("fade");
    Audio.sfx("ui");
  }

  function togglePause() {
    if (G.mode === "playing") {
      G.mode = "paused";
      G.returnMode = "paused";
      hide(dom.interactPrompt);
      setTouchVisible(false);
      show(dom.pauseScreen);
      fillPauseSummary();
      Audio.setPaused(true);
      Audio.sfx("ui");
      clearKeys();
    } else if (G.mode === "paused") {
      hide(dom.pauseScreen);
      G.mode = "playing";
      setTouchVisible(true);
      Audio.setPaused(false);
      Audio.sfx("ui");
      lastFrame = performance.now();
    }
  }

  function fillPauseSummary() {
    if (!G.player) return;
    dom.pauseSummary.innerHTML = `
      <div><span>等级</span><b>Lv.${G.player.level}</b></div>
      <div><span>战力</span><b>${G.player.stats.power}</b></div>
      <div><span>关卡</span><b>${G.stage ? G.stage.name : "—"}</b></div>
      <div><span>击杀</span><b>${G.killCount}</b></div>
      <div><span>金币</span><b>${G.gold}</b></div>
      <div><span>用时</span><b>${fmtTime(G.time - G.runStartedAt)}</b></div>
    `;
  }

  function openInventory(fromPause) {
    if (!G.player) return;
    if (!(G.mode === "playing" || G.mode === "paused")) return;
    G.returnMode = fromPause || G.mode === "paused" ? "paused" : "playing";
    hide(dom.pauseScreen);
    hide(dom.interactPrompt);
    G.mode = "inventory";
    setTouchVisible(false);
    show(dom.inventory);
    Audio.setPaused(true);
    if (!G.selection) {
      if (G.player.equip.weapon) G.selection = { type: "equipped", slot: "weapon", id: G.player.equip.weapon.id };
      else if (G.player.inventory[0]) G.selection = { type: "bag", id: G.player.inventory[0].id };
    }
    renderInventory();
    Audio.sfx("ui");
  }

  function closeInventory() {
    if (G.mode !== "inventory") return;
    hide(dom.inventory);
    if (G.returnMode === "paused") {
      G.mode = "paused";
      show(dom.pauseScreen);
      fillPauseSummary();
      Audio.setPaused(true);
      setTouchVisible(false);
    } else {
      G.mode = "playing";
      setTouchVisible(true);
      Audio.setPaused(false);
      lastFrame = performance.now();
    }
    Audio.sfx("ui");
  }

  function showDeathScreen() {
    G.mode = "dead";
    hide(dom.interactPrompt);
    hide(dom.bossPanel);
    setTouchVisible(false);
    const p = G.player;
    dom.deathStats.innerHTML = `
      <div><span>等级</span><b>Lv.${p.level}</b></div>
      <div><span>击杀</span><b>${G.killCount}</b></div>
      <div><span>最高连击</span><b>${G.maxCombo}</b></div>
      <div><span>关卡</span><b>${G.stage ? G.stage.name : "—"}</b></div>
      <div><span>战力</span><b>${p.stats.power}</b></div>
      <div><span>用时</span><b>${fmtTime(G.time - G.runStartedAt)}</b></div>
    `;
    show(dom.deathScreen);
    Audio.setPaused(true);
  }

  function reviveAtStage() {
    hide(dom.deathScreen);
    if (!G.player) return;
    G.gold = Math.floor(G.gold * 0.9);
    G.player.dead = false;
    G.player.state = "idle";
    G.player.hp = 1;
    G.player.invuln = 1.5;
    recalcStats();
    G.player.hp = Math.max(1, Math.round(G.player.maxHp * 0.5));
    G.player.mp = Math.round(G.player.maxMp * 0.45);
    G.mode = "playing";
    setTouchVisible(true);
    loadStage(G.stageIndex, { revive: true });
    Audio.setPaused(false);
    Audio.sfx("portal");
    showToast("再战此关", "保留等级与装备，恢复五成气血");
  }

  function showVictory() {
    G.mode = "victory";
    hide(dom.interactPrompt);
    hide(dom.bossPanel);
    setTouchVisible(false);
    const p = G.player;
    dom.victoryStats.innerHTML = `
      <div><span>轮回</span><b>${G.loop + 1}</b></div>
      <div><span>等级</span><b>Lv.${p.level}</b></div>
      <div><span>战力</span><b>${p.stats.power}</b></div>
      <div><span>总击杀</span><b>${G.totalKills}</b></div>
      <div><span>最高连击</span><b>${G.maxCombo}</b></div>
      <div><span>金币</span><b>${G.gold}</b></div>
      <div><span>用时</span><b>${fmtTime(G.time - G.runStartedAt)}</b></div>
      <div><span>妖王</span><b>${D.STAGES.length}</b></div>
    `;
    show(dom.victoryScreen);
    Audio.setPaused(true);
    Audio.sfx("victory");
  }

  function nextLoop() {
    hide(dom.victoryScreen);
    G.loop++;
    G.stageIndex = 0;
    G.potions = 3;
    G.player.dead = false;
    recalcStats({ full: true });
    G.mode = "playing";
    setTouchVisible(true);
    loadStage(0, { loop: true });
    Audio.setPaused(false);
    showToast(`第 ${G.loop + 1} 轮回`, "妖王更强，战利品也更好");
  }

  function completeStage() {
    if (G.mode !== "playing" || !G.portalActive) return;
    G.portalActive = false;
    G.projectiles = [];
    G.hazards = [];
    hide(dom.interactPrompt);
    // collect remaining loot before leaving
    for (const drop of G.drops.slice()) {
      if (drop.kind === "equipment" && drop.item) acquireItem(drop.item, { silent: true });
    }
    G.drops = [];
    if (G.player) {
      G.player.hp = Math.min(G.player.maxHp, G.player.hp + G.player.maxHp * 0.22);
      gainEssence(1, G.player.x, G.player.y - 46);
      gainTreasureJade(1, G.player.x, G.player.y - 58);
    }
    Audio.sfx("portal");

    if (G.stageIndex >= D.STAGES.length - 1) {
      writeSave();
      showVictory();
      return;
    }

    const clearedStage = G.stage;
    G.stageIndex++;
    G.potions = Math.min(9, G.potions + 1);
    G.combo = 0;
    G.comboTimer = 0;
    G.mode = "playing";
    setTouchVisible(true);
    loadStage(G.stageIndex, { transition: true });
    Audio.setPaused(false);
    Audio.sfx("gong");
    showToast(`踏入${G.stage.name}`, clearedStage ? clearedStage.clearText : "继续深入妖穴");
    writeSave();
  }

  /* ------------------------------------------------------------------ */
  /* Input                                                               */
  /* ------------------------------------------------------------------ */

  function clearKeys() {
    for (const k of Object.keys(keys)) keys[k] = false;
    inputBuffer.jump = 0;
    inputBuffer.attack = 0;
    jumpHeld = false;
  }

  function onKeyDown(e) {
    const code = e.code;
    if (["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Tab"].includes(code)) e.preventDefault();

    if (G.mode === "title") {
      if (code === "Enter" || code === "Space") {
        if (G.hasSave) continueGame();
        else startNewGame();
      }
      return;
    }

    if (G.mode === "inventory") {
      if (code === "Escape" || code === "KeyC") closeInventory();
      return;
    }
    if (G.mode === "skills") {
      if (code === "Escape" || code === "KeyT") closeSkills();
      return;
    }
    if (G.mode === "artifacts") {
      if (code === "Escape" || code === "KeyB") closeArtifacts();
      else if (code === "KeyF") useArtifact();
      return;
    }
    if (G.mode === "shop") {
      if (code === "Escape" || code === "KeyP") closeShop();
      return;
    }
    if (G.mode === "forge") {
      if (code === "Escape" || code === "KeyG") closeForge();
      return;
    }
    if (G.mode === "stage-select") {
      if (code === "Escape" || code === "KeyM") closeStageSelect();
      return;
    }
    if (G.mode === "reincarnation") {
      if (code === "Escape") closeReincarnation();
      return;
    }
    if (G.mode === "awaken") {
      if (code === "Escape" || code === "KeyN") closeAwaken();
      return;
    }
    if (G.mode === "body") {
      if (code === "Escape" || code === "KeyV") closeBody();
      return;
    }
    if (G.mode === "wings") {
      if (code === "Escape" || code === "KeyY") closeWings();
      return;
    }
    if (G.mode === "paused") {
      if (code === "Escape") togglePause();
      else if (code === "KeyC") openInventory(true);
      else if (code === "KeyT") openSkills(true);
      else if (code === "KeyB") openArtifacts(true);
      else if (code === "KeyG") openForge(true);
      else if (code === "KeyP") openShop(true);
      else if (code === "KeyM") openStageSelect(true);
      else if (code === "KeyR") openReincarnation();
      else if (code === "KeyN") openAwaken(true);
      else if (code === "KeyV") openBody(true);
      else if (code === "KeyY") openWings(true);
      return;
    }
    if (G.mode !== "playing") return;
    if (e.repeat) {
      return;
    }

    switch (code) {
      case "KeyA":
      case "ArrowLeft":
        keys.left = true;
        break;
      case "KeyD":
      case "ArrowRight":
        keys.right = true;
        break;
      case "KeyW":
      case "ArrowUp":
      case "Space":
        keys.jump = true;
        jumpHeld = true;
        inputBuffer.jump = 0.14;
        break;
      case "KeyJ":
        keys.attack = true;
        inputBuffer.attack = 0.24;
        break;
      case "KeyK":
        tryCastSkill(0);
        break;
      case "KeyL":
        tryCastSkill(1);
        break;
      case "KeyO":
        tryCastSkill(2);
        break;
      case "ShiftLeft":
      case "ShiftRight":
        tryDash();
        break;
      case "KeyS":
      case "ArrowDown":
        tryDropThrough();
        break;
      case "KeyH":
        usePotion();
        break;
      case "KeyT":
        openSkills(false);
        break;
      case "KeyB":
        openArtifacts(false);
        break;
      case "KeyF":
        useArtifact();
        break;
      case "KeyG":
        openForge(false);
        break;
      case "KeyP":
        openShop(false);
        break;
      case "KeyM":
        openStageSelect(false);
        break;
      case "KeyR":
        openReincarnation();
        break;
      case "KeyN":
        openAwaken(false);
        break;
      case "KeyV":
        openBody(false);
        break;
      case "KeyY":
        openWings(false);
        break;
      case "KeyC":
        openInventory(false);
        break;
      case "Escape":
        togglePause();
        break;
      default:
        break;
    }
  }

  function onKeyUp(e) {
    const code = e.code;
    switch (code) {
      case "KeyA":
      case "ArrowLeft":
        keys.left = false;
        break;
      case "KeyD":
      case "ArrowRight":
        keys.right = false;
        break;
      case "KeyW":
      case "ArrowUp":
      case "Space":
        keys.jump = false;
        jumpHeld = false;
        if (G.player && !G.player.grounded && G.player.vy < -135) G.player.vy = -135;
        break;
      case "KeyJ":
        keys.attack = false;
        break;
      default:
        break;
    }
  }

  function bindInput() {
    window.addEventListener("keydown", onKeyDown, { passive: false });
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", () => {
      clearKeys();
      if (G.mode === "playing") togglePause();
    });
    document.addEventListener("visibilitychange", () => {
      if (document.hidden && G.mode === "playing") togglePause();
    });

    const touchMap = {
      left: "left",
      right: "right",
      jump: "jump",
      attack: "attack",
      skill0: "skill0",
      skill1: "skill1",
      skill2: "skill2",
      dash: "dash",
      potion: "potion"
    };

    dom.touch.querySelectorAll("[data-touch]").forEach((button) => {
      const action = touchMap[button.dataset.touch];
      const press = (ev) => {
        ev.preventDefault();
        if (G.mode !== "playing") return;
        button.classList.add("active");
        if (!action) return;
        if (action === "left" || action === "right") {
          keys[action] = true;
          return;
        }
        if (action === "jump") {
          keys.jump = true;
          jumpHeld = true;
          inputBuffer.jump = 0.14;
        } else if (action === "attack") {
          keys.attack = true;
          inputBuffer.attack = 0.24;
        } else if (action.startsWith("skill")) {
          tryCastSkill(Number(action.slice(5)));
        } else if (action === "dash") {
          tryDash();
        } else if (action === "potion") {
          usePotion();
        }
      };
      const release = (ev) => {
        if (ev) ev.preventDefault();
        button.classList.remove("active");
        if (action === "left" || action === "right") keys[action] = false;
        if (action === "jump") {
          keys.jump = false;
          jumpHeld = false;
          if (G.player && !G.player.grounded && G.player.vy < -135) G.player.vy = -135;
        }
        if (action === "attack") keys.attack = false;
      };
      button.addEventListener("pointerdown", press);
      button.addEventListener("pointerup", release);
      button.addEventListener("pointercancel", release);
      button.addEventListener("pointerleave", release);
    });
  }

  /* ------------------------------------------------------------------ */
  /* Bind UI                                                             */
  /* ------------------------------------------------------------------ */

  function bindUI() {
    dom.start.addEventListener("click", startNewGame);
    dom.continue.addEventListener("click", continueGame);
    dom.resume.addEventListener("click", togglePause);
    dom.pause.addEventListener("click", togglePause);
    dom.mute.addEventListener("click", toggleMute);
    dom.bagButton.addEventListener("click", () => openInventory(false));
    dom.pauseBag.addEventListener("click", () => openInventory(true));
    dom.pauseSkill.addEventListener("click", () => openSkills(true));
    dom.pauseArtifact.addEventListener("click", () => openArtifacts(true));
    dom.pauseForge.addEventListener("click", () => openForge(true));
    dom.pauseShop.addEventListener("click", () => openShop(true));
    dom.pauseStage.addEventListener("click", () => openStageSelect(true));
    dom.pauseReincarnation.addEventListener("click", openReincarnation);
    if (dom.pauseAwaken) dom.pauseAwaken.addEventListener("click", () => openAwaken(true));
    if (dom.pauseBody) dom.pauseBody.addEventListener("click", () => openBody(true));
    if (dom.pauseWing) dom.pauseWing.addEventListener("click", () => openWings(true));
    if (dom.closeBody) dom.closeBody.addEventListener("click", closeBody);
    if (dom.closeWings) dom.closeWings.addEventListener("click", closeWings);
    if (dom.bodyList) {
      dom.bodyList.addEventListener("click", (e) => {
        const btn = e.target.closest("[data-body-key]");
        if (!btn) return;
        bodyUpgrade(btn.dataset.bodyKey, Number(btn.dataset.bodyAmount) || 1);
      });
    }
    if (dom.wingList) {
      dom.wingList.addEventListener("click", (e) => {
        const craft = e.target.closest("[data-wing-craft]");
        if (craft) return craftWing(craft.dataset.wingCraft);
        const equip = e.target.closest("[data-wing-equip]");
        if (equip) return equipWing(equip.dataset.wingEquip);
        const up = e.target.closest("[data-wing-upgrade]");
        if (up) return upgradeWing(up.dataset.wingUpgrade);
      });
    }
    if (dom.closeAwaken) dom.closeAwaken.addEventListener("click", closeAwaken);
    if (dom.awakenList) {
      dom.awakenList.addEventListener("click", (e) => {
        const btn = e.target.closest("[data-awaken-key]");
        if (!btn) return;
        awakenUpgrade(btn.dataset.awakenKey, Number(btn.dataset.awakenAmount) || 1);
      });
    }
    dom.closeInventory.addEventListener("click", closeInventory);
    if (dom.invSkinEquip) {
      dom.invSkinEquip.addEventListener("click", () => {
        const fromPause = G.returnMode === "paused" || G.mode === "paused";
        closeInventory();
        G.shopTab = "fashion";
        openShop(fromPause);
      });
    }
    if (dom.invSkinUnequip) dom.invSkinUnequip.addEventListener("click", () => equipSkin("default"));
    if (dom.invWingOpen) {
      dom.invWingOpen.addEventListener("click", () => {
        const fromPause = G.returnMode === "paused" || G.mode === "paused";
        closeInventory();
        openWings(fromPause);
      });
    }
    if (dom.invWingUnequip) dom.invWingUnequip.addEventListener("click", () => equipWing("none"));
    dom.closeSkills.addEventListener("click", closeSkills);
    dom.closeArtifacts.addEventListener("click", closeArtifacts);
    dom.closeShop.addEventListener("click", closeShop);
    dom.closeForge.addEventListener("click", closeForge);
    dom.closeStageSelect.addEventListener("click", closeStageSelect);
    dom.closeReincarnation.addEventListener("click", closeReincarnation);
    dom.craftArtifact.addEventListener("click", craftArtifact);
    dom.equipArtifact.addEventListener("click", () => equipArtifact(G.artifactSelected));
    dom.useArtifact.addEventListener("click", useArtifact);
    if (dom.upgradeArtifact) dom.upgradeArtifact.addEventListener("click", () => upgradeArtifact(G.artifactSelected));
    dom.artifactHud.addEventListener("click", useArtifact);
    dom.shopRefresh.addEventListener("click", () => {
      if (G.gold < G.shopRefreshCost) {
        showToast("金币不足", `刷新商品需要 ${G.shopRefreshCost} 金币`);
        Audio.sfx("error");
        return;
      }
      G.gold -= G.shopRefreshCost;
      generateShopStock();
      renderShop();
      updateHUD();
      Audio.sfx("ui");
      markSave();
    });
    dom.shopTabs.addEventListener("click", (e) => {
      const tab = e.target.closest("[data-shop-tab]");
      if (!tab) return;
      G.shopTab = tab.dataset.shopTab;
      renderShop();
    });
    dom.shopGrid.addEventListener("click", (e) => {
      const buy = e.target.closest("[data-shop-buy]");
      if (buy) {
        buyShopOffer(Number(buy.dataset.shopBuy));
        return;
      }
      const rebirth = e.target.closest("[data-rebirth-buy]");
      if (rebirth) {
        buyRebirthOffer(rebirth.dataset.rebirthBuy);
        return;
      }
      const skinBuy = e.target.closest("[data-skin-buy]");
      if (skinBuy) {
        buySkin(skinBuy.dataset.skinBuy);
        return;
      }
      const skinEquip = e.target.closest("[data-skin-equip]");
      if (skinEquip) {
        equipSkin(skinEquip.dataset.skinEquip);
        return;
      }
      const skinMerge = e.target.closest("[data-skin-merge]");
      if (skinMerge) {
        mergeSkin(skinMerge.dataset.skinMerge);
        return;
      }
      const titleBuy = e.target.closest("[data-title-buy]");
      if (titleBuy) {
        buyTitle(titleBuy.dataset.titleBuy);
        return;
      }
      const titleClaim = e.target.closest("[data-title-claim]");
      if (titleClaim) {
        claimTitle(titleClaim.dataset.titleClaim);
        return;
      }
      const titleEquip = e.target.closest("[data-title-equip]");
      if (titleEquip) equipTitle(titleEquip.dataset.titleEquip);
    });
    dom.forgeList.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-forge-craft]");
      if (!btn) return;
      craftArtifactAtForge(btn.dataset.forgeCraft);
    });
    dom.stageSelectGrid.addEventListener("click", (e) => {
      const card = e.target.closest("[data-stage-select]");
      if (!card || card.disabled) return;
      selectStage(Number(card.dataset.stageSelect));
    });
    dom.confirmReincarnation.addEventListener("click", confirmReincarnation);
    dom.cancelReincarnation.addEventListener("click", closeReincarnation);
    dom.artifactList.addEventListener("click", (e) => {
      const card = e.target.closest("[data-artifact-id]");
      if (!card) return;
      G.artifactSelected = card.dataset.artifactId;
      renderArtifactScreen();
    });
    dom.autoEquip.addEventListener("click", autoEquipBest);
    dom.salvageLow.addEventListener("click", salvageBelowEquipped);
    if (dom.bagPrev) dom.bagPrev.addEventListener("click", () => { bagPage = Math.max(0, bagPage - 1); renderInventory(); Audio.sfx("ui"); });
    if (dom.bagNext) dom.bagNext.addEventListener("click", () => { bagPage += 1; renderInventory(); Audio.sfx("ui"); });
    dom.salvageCommon.addEventListener("click", salvageCommon);
    dom.revive.addEventListener("click", reviveAtStage);
    dom.deathTitle.addEventListener("click", enterTitle);
    dom.quit.addEventListener("click", enterTitle);
    dom.loopBtn.addEventListener("click", openReincarnation);
    dom.stayButton.addEventListener("click", enterTitle);
    dom.victoryTitle.addEventListener("click", enterTitle);

    dom.bagGrid.addEventListener("click", (e) => {
      const button = e.target.closest("[data-item-id]");
      if (!button) return;
      selectBagItem(button.dataset.itemId);
    });
    dom.gearSlots.addEventListener("click", (e) => {
      const button = e.target.closest("[data-slot]");
      if (!button) return;
      selectEquippedSlot(button.dataset.slot);
    });
    dom.itemDetail.addEventListener("click", (e) => {
      const button = e.target.closest("[data-action]");
      if (!button) return;
      const action = button.dataset.action;
      if (action === "equip") {
        if (G.selection && G.selection.type === "bag") {
          const index = G.player.inventory.findIndex((i) => i.id === G.selection.id);
          if (index >= 0) equipFromBag(index);
        }
      } else if (action === "salvage") {
        salvageSelected();
      } else if (action === "upgrade") {
        upgradeSelected();
      } else if (action === "unequip") {
        if (G.selection && G.selection.type === "equipped") unequipSlot(G.selection.slot);
      }
    });
    for (const slot of SLOT_ORDER) {
      const mini = dom[MINI_BY_SLOT[slot]];
      if (mini && mini.parentElement) {
        mini.parentElement.addEventListener("click", () => openInventory(false));
      }
    }

    dom.skillLoadout.addEventListener("click", (e) => {
      const slot = e.target.closest("[data-loadout-index]");
      if (!slot) return;
      selectSkillSlot(Number(slot.dataset.loadoutIndex));
    });
    dom.skillCatalog.addEventListener("click", (e) => {
      const assign = e.target.closest("[data-assign-skill]");
      if (assign) {
        assignSkillToSlot(assign.dataset.assignSkill);
        return;
      }
      const breakthrough = e.target.closest("[data-breakthrough-skill]");
      if (breakthrough && !breakthrough.disabled) {
        breakthroughSkill(breakthrough.dataset.breakthroughSkill);
      }
    });
    dom.shell.querySelector(".skill-bar").addEventListener("click", (e) => {
      const slot = e.target.closest("[data-skill-slot]");
      if (slot) openSkills(false);
    });
  }

  function detectTouch() {
    const coarse = window.matchMedia && window.matchMedia("(pointer: coarse)").matches;
    if (coarse) {
      dom.shell.classList.add("touch-mode");
      hide(dom.touch);
    }
  }

  /* ------------------------------------------------------------------ */
  /* Stage / waves                                                       */
  /* ------------------------------------------------------------------ */

  function showStageBanner() {
    if (!G.stage) return;
    setText(dom.stageBannerIndex, `${G.stage.index}${G.loop ? ` · 第 ${G.loop + 1} 轮回` : ""}`);
    setText(dom.stageBannerName, G.stage.name);
    setText(dom.stageBannerDesc, G.stage.desc);
    show(dom.stageBanner);
    dom.stageBanner.style.animation = "none";
    void dom.stageBanner.offsetWidth;
    dom.stageBanner.style.animation = "";
    G.stageBannerT = 2.5;
  }

  function loadStage(index, opts = {}) {
    G.stageIndex = clamp(index, 0, D.STAGES.length - 1);
    G.maxStageUnlocked = Math.max(G.maxStageUnlocked || 0, G.stageIndex);
    G.stage = D.STAGES[G.stageIndex];
    G.platforms = G.stage.platforms.map((p) => ({ ...p }));
    G.enemies = [];
    G.projectiles = [];
    G.hazards = [];
    G.drops = [];
    G.particles = [];
    G.effects = [];
    G.texts = [];
    G.boss = null;
    G.portal = null;
    G.portalActive = false;
    G.waveIndex = -1;
    G.waveState = "intro";
    G.waveTimer = 0;
    G.stageIntroT = 2.35;
    G.stageStartedAt = G.time;
    G.bossDefeated = false;
    G.slowTimer = 0;
    G.hitStop = 0;
    G.timeScale = 1;

    const p = G.player;
    p.x = 160;
    p.y = FLOOR;
    p.vx = 0;
    p.vy = 0;
    p.facing = 1;
    p.grounded = true;
    p.onPlatform = false;
    p.dropThrough = 0;
    p.jumpsUsed = 0;
    p.coyote = 0;
    p.dead = false;
    p.state = "idle";
    p.attack.active = false;
    p.attack.t = 0;
    p.attack.combo = 0;
    p.attackQueue = 0;
    p.comboWindow = 0;
    p.skill.active = false;
    p.skill.id = null;
    p.skill.t = 0;
    p.skill.tick = 0;
    p.artifactCd = 0;
    p.regenT = 0;
    p.debuffBurnT = 0;
    p.debuffBurnTick = 0;
    p.debuffPoisonT = 0;
    p.debuffPoisonTick = 0;
    p.debuffSlowT = 0;
    p.debuffSlowMult = 1;
    G.clone = null;
    p.dashing = 0;
    p.rollT = 0;
    p.kbT = 0;
    p.kbVx = 0;
    p.invuln = 1.2;
    p.hurtT = 0;
    p.flash = 0;

    if (opts.fresh) {
      recalcStats({ full: true });
    } else if (opts.revive) {
      p.hp = Math.max(1, Math.round(p.maxHp * 0.5));
      p.mp = Math.round(p.maxMp * 0.45);
    } else {
      p.hp = Math.min(p.maxHp, p.hp + p.maxHp * 0.22);
      p.mp = Math.min(p.maxMp, p.mp + p.maxMp * 0.4);
      if (p.hp <= 0) p.hp = Math.max(1, Math.round(p.maxHp * 0.5));
    }

    G.camera.x = 0;
    hide(dom.bossPanel);
    hide(dom.interactPrompt);
    dom.lootFeed.innerHTML = "";
    showStageBanner();
    Audio.setScene(G.stage.biome, false);
    Audio.setPaused(false);
    markSave();
    updateHUD();
  }

  function startWave(index) {
    if (!G.stage) return;
    const wave = G.stage.waves[index];
    if (!wave) {
      spawnBoss();
      return;
    }
    G.waveIndex = index;
    G.waveState = "fighting";
    G.waveTimer = 0;
    G.stageBannerT = 0;
    hide(dom.stageBanner);
    const p = G.player;

    let spawnNo = 0;
    for (let g = 0; g < wave.groups.length; g++) {
      const group = wave.groups[g];
      const def = D.ENEMIES[group.type];
      for (let n = 0; n < group.count; n++) {
        const side = spawnNo % 2 === 0 ? 1 : -1;
        const distance = 130 + (spawnNo % 3) * 34 + rand(0, 28);
        const x = clamp(p.x + side * distance, 28, WORLD_W - 28);
        const flying = def && def.flying;
        const y = flying ? FLOOR - 58 - rand(0, 38) : FLOOR;
        spawnEnemy(group.type, x, y, {
          delay: 0.38 + spawnNo * 0.13,
          elite: index >= 1 && chance(0.08 + G.loop * 0.02)
        });
        spawnNo++;
      }
    }

    showWaveBanner(`第 ${index + 1} 波`, `妖气来袭 · 共 ${G.stage.waves.length} 波`);
    Audio.sfx("gong");
    markSave();
  }

  function spawnEnemy(type, x, y, opts = {}) {
    const def = D.ENEMIES[type];
    if (!def) return null;
    const stageFactor = (1 + G.loop * 0.6) * Math.pow(1.12, G.stageIndex);
    const elite = !!opts.elite;
    const monsterBuff = 3.0;
    const hp = Math.round(def.hp * monsterBuff * stageFactor * (elite ? 1.55 : 1) * rand(0.96, 1.06));
    const atk = def.atk * monsterBuff * (1 + G.loop * 0.38) * Math.pow(1.1, G.stageIndex) * (elite ? 1.16 : 1);
    const exp = Math.round(def.exp * (1 + G.loop * 0.35) * (1 + G.stageIndex * 0.07) * (elite ? 1.55 : 1));
    const gold = Math.round(def.gold * (1 + G.loop * 0.3) * (1 + G.stageIndex * 0.07) * (elite ? 2 : 1));
    const facing = G.player && G.player.x < x ? -1 : 1;
    const e = {
      id: `enemy_${Date.now().toString(36)}_${Math.floor(Math.random() * 9999)}`,
      type,
      name: (elite ? "精英·" : "") + def.name,
      kind: def.kind,
      x,
      y,
      w: def.w * (elite ? 1.12 : 1),
      h: def.h * (elite ? 1.12 : 1),
      hp,
      maxHp: hp,
      atk,
      def: (def.def * Math.pow(1.09, G.stageIndex) + G.loop * 1.8) * 3,
      speed: def.speed * (1 + G.loop * 0.08) * (1 + G.stageIndex * 0.012) * (elite ? 1.06 : 1),
      exp,
      gold,
      range: def.range,
      windup: def.windup,
      recover: def.recover,
      dropChance: elite ? 1 : def.dropChance,
      flying: !!def.flying,
      heavy: !!def.heavy,
      elite,
      facing,
      vx: 0,
      vy: 0,
      kx: 0,
      state: "spawn",
      stateT: 0,
      spawnT: opts.delay === undefined ? 0.45 : opts.delay,
      animTime: 0,
      attackT: 0,
      cooldown: rand(0.3, 0.9),
      flash: 0,
      hurtT: 0,
      deathT: 0,
      dead: false,
      killed: false,
      boss: false,
      summoned: !!opts.summoned,
      ranged: def.kind === "ranged",
      projectile: def.projectile || "boneArrow",
      burnStacks: 0,
      burnTime: 0,
      burnDps: 0,
      burnTick: 0,
      burnMaxStacks: 0,
      stunT: 0,
      enraged: false
    };
    G.enemies.push(e);
    addEffect({ kind: "rift", x, y: e.flying ? y + 10 : FLOOR, duration: 0.55, color: elite ? "#f2c95c" : "#a964d9" });
    return e;
  }

  function spawnBossEnemy(type, x) {
    const def = D.BOSSES[type];
    if (!def) return null;
    const hpFactor = (1 + G.loop * 0.72) * Math.pow(1.1, G.stageIndex);
    const atkScale = (1 + G.loop * 0.44) * Math.pow(1.085, G.stageIndex);
    const hp = Math.round(def.hp * 3 * hpFactor);
    // 每五关妖王额外获得一个专属神通（上限 3 个）
    const stageNo = G.stageIndex + 1;
    const extraDivine = stageNo % 5 === 0 && def.extraDivine ? def.extraDivine : null;
    const bossPatterns = def.patterns.slice();
    if (extraDivine && !bossPatterns.includes(extraDivine)) bossPatterns.splice(3, 0, extraDivine);
    const bossDivines = (def.divineSkills || []).slice();
    if (extraDivine && bossDivines.length < 3 && !bossDivines.includes(extraDivine)) bossDivines.push(extraDivine);
    if (bossDivines.length > 3) bossDivines.length = 3;
    const e = {
      id: `boss_${type}_${Date.now().toString(36)}`,
      type,
      name: def.name,
      title: def.title,
      kind: "boss",
      x: clamp(x, 120, WORLD_W - 70),
      y: FLOOR,
      w: def.w,
      h: def.h,
      hp,
      maxHp: hp,
      atk: def.atk * 3.4 * atkScale,
      def: (def.def * Math.pow(1.08, G.stageIndex) + G.loop * 2.5) * 3,
      speed: def.speed * (1 + G.loop * 0.09) * (1 + G.stageIndex * 0.01),
      exp: Math.round(def.exp * (1 + G.loop * 0.4)),
      gold: Math.round(def.gold * (1 + G.loop * 0.35)),
      range: def.range,
      windup: def.windup,
      recover: def.recover,
      dropChance: 1,
      facing: -1,
      vx: 0,
      vy: 0,
      kx: 0,
      state: "spawn",
      stateT: 1.15,
      spawnT: 0,
      animTime: 0,
      attackT: 0,
      cooldown: 1.4,
      flash: 0,
      hurtT: 0,
      deathT: 0,
      dead: false,
      killed: false,
      boss: true,
      elite: false,
      flying: false,
      heavy: true,
      ranged: false,
      patterns: bossPatterns,
      commonSkills: (def.commonSkills || []).slice(),
      divineSkills: bossDivines,
      patternIndex: 0,
      currentSkillName: "",
      currentSkillType: "",
      phase2: def.phase2,
      phaseTriggered: false,
      windupDuration: 0.6,
      attackDuration: 0.4,
      pattern: "",
      chargeDir: -1,
      chargeSpeed: 0,
      chargeHit: false,
      chargeBurn: false,
      burnStacks: 0,
      burnTime: 0,
      burnDps: 0,
      burnTick: 0,
      burnMaxStacks: 0,
      stunT: 0,
      maxPoise: Math.round(hp * 0.28),
      poise: Math.round(hp * 0.28),
      poiseBroken: false,
      poiseRegenRate: Math.max(1, Math.round(hp * 0.28) / 4),
      enraged: false
    };
    G.enemies.push(e);
    G.boss = e;
    return e;
  }

  function spawnBoss() {
    if (!G.stage || G.boss) return;
    G.waveState = "boss";
    const bx = clamp(G.player.x + 185, 355, WORLD_W - 64);
    const e = spawnBossEnemy(G.stage.boss, bx);
    if (!e) return;
    G.camera.x = clamp(bx - W * 0.68, 0, WORLD_W - W);
    showWaveBanner(e.name, "妖王降临");
    addEffect({ kind: "ring", x: e.x, y: FLOOR, radius: 10, grow: 130, duration: 0.8, color: "#e3a558" });
    addEffect({ kind: "rift", x: e.x, y: FLOOR, duration: 1, color: "#e86b4f" });
    shakeScreen(0.9, 0.55);
    G.screenFlash = { color: "#e86b4f", alpha: 0.2, t: 0.4, duration: 0.4 };
    Audio.setScene(G.stage.biome, true);
    Audio.sfx("boss");
    showToast("妖王现身", "小心它的攻击预兆，翻滚闪避后再反击");
    markSave();
  }

  function updateStageFlow(dt) {
    const p = G.player;
    if (!p) return;

    if (G.stageBannerT > 0) {
      G.stageBannerT -= dt;
      if (G.stageBannerT <= 0) hide(dom.stageBanner);
    }

    if (G.stageIntroT > 0) {
      G.stageIntroT -= dt;
      if (G.stageIntroT <= 0) startWave(0);
      return;
    }

    if (G.waveState === "intro") {
      startWave(0);
      return;
    }

    if (G.waveState === "fighting") {
      const alive = G.enemies.some((e) => !e.dead && e.kind !== "boss");
      if (!alive) {
        G.waveState = "cleared";
        G.waveTimer = 1.15;
        showWaveBanner("妖邪尽退", "调息片刻");
      }
      return;
    }

    if (G.waveState === "cleared") {
      G.waveTimer -= dt;
      if (G.waveTimer <= 0) {
        if (G.waveIndex + 1 < G.stage.waves.length) startWave(G.waveIndex + 1);
        else spawnBoss();
      }
      return;
    }

    if (G.waveState === "victoryWait") {
      G.waveTimer -= dt;
      if (G.waveTimer <= 0) {
        G.waveState = "portal";
        G.portalActive = true;
        G.portal = { x: WORLD_W - 44, y: FLOOR };
        Audio.sfx("portal");
        showToast("传送门已开启", "向右前行，踏入金光离开此关");
      }
      return;
    }

    if (G.waveState === "portal") {
      if (G.portalActive && G.portal && Math.abs(p.x - G.portal.x) < 32 && keys.jump) {
        completeStage();
      }
    }
  }

  /* ------------------------------------------------------------------ */
  /* Player actions + update                                             */
  /* ------------------------------------------------------------------ */

  function skillLevel(id) {
    return clamp(Number(G.player && G.player.skillLevels[id]) || 1, 1, D.MAX_SKILL_LEVEL);
  }

  function tryCastSkill(slotIndex) {
    const p = G.player;
    if (!p || p.dead || G.mode !== "playing") return false;
    if (p.dashing > 0) return false;
    if (p.skill.active) return false;
    const id = p.skillSlots[slotIndex];
    const def = D.SKILLS[id];
    if (!def) return false;
    if (p.goldenT > 0 && id !== "goldenBody") {
      showToast("法相金身持续中", "期间无法使用其他技能");
      Audio.sfx("error");
      return false;
    }
    if (id === "goldenBody" && p.goldenT > 0) {
      showToast("法相金身持续中", `还剩 ${p.goldenT.toFixed(1)} 秒`);
      Audio.sfx("error");
      return false;
    }
    if (p.mp < def.mana) {
      showToast("法力不足", `${def.name}需要 ${def.mana} 法力，法力上限主要来自装备`);
      Audio.sfx("error");
      return false;
    }
    const level = skillLevel(id);
    p.mp -= def.mana;
    p.attack.active = false;
    p.skill.id = id;
    p.skill.active = true;
    p.skill.t = 0;
    p.skill.dur = def.castTime + (def.channel ? (level - 1) * 0.18 : 0);
    p.skill.hit = false;
    p.skill.tick = 0;
    p.skill.level = level;
    p.state = id === "fireStorm" ? "firespin" : "skill";
    p.invuln = Math.max(p.invuln, id === "staffSlam" ? 0.28 : id === "fireStorm" ? 0.2 : 0.12);
    Audio.sfx("skill");
    addEffect({
      kind: "ring",
      x: p.x,
      y: p.y - 16,
      radius: 5,
      grow: id === "staffSlam" ? 62 : id === "fireStorm" ? 54 : 42,
      duration: 0.42,
      color: def.color
    });
    if (G.clone && !G.clone.dead && id !== "clone") {
      G.clone.pendingSkill = id;
      G.clone.pendingT = 0.16;
    }
    return true;
  }

  function tryDropThrough() {
    const p = G.player;
    if (!p || p.dead || G.mode !== "playing") return;
    if (!p.grounded || !p.onPlatform || p.dropThrough > 0 || p.skill.active) return;
    p.dropThrough = 0.22;
    p.grounded = false;
    p.onPlatform = false;
    p.vy = Math.max(p.vy, 28);
    p.y += 2;
    addEffect({ kind: "burst", x: p.x, y: p.y - 2, duration: 0.25, color: "#c7d8bf", count: 5, spread: 13 });
    Audio.sfx("ui");
  }

  function tryDash() {
    const p = G.player;
    if (!p || p.dead || G.mode !== "playing") return;
    if (p.skill.active) return;
    if (p.dashCd > 0 || p.dashing > 0) return;
    p.dashCd = Math.max(0.25, 1.2 * (1 - p.stats.cdr * 0.2));
    p.dashing = 0.26;
    p.dashDir = keys.left ? -1 : keys.right ? 1 : p.facing;
    p.facing = p.dashDir;
    p.vy = 0;
    p.invuln = Math.max(p.invuln, 0.32);
    p.attack.active = false;
    p.dashTrail = 0;
    Audio.sfx("dash");
    addEffect({ kind: "burst", x: p.x, y: p.y - 10, duration: 0.3, color: "#b9e6ef", count: 7, spread: 26 });
  }

  function usePotion() {
    const p = G.player;
    if (!p || p.dead || G.mode !== "playing") return;
    if (p.potionCd > 0) return;
    if (G.potions <= 0) {
      showToast("回春丹已用完", "击败妖怪或进入下一关可以补充");
      Audio.sfx("error");
      return;
    }
    if (p.hp >= p.maxHp) {
      showToast("气血已满", "无需服用回春丹");
      Audio.sfx("error");
      return;
    }
    p.potionCd = 0.65;
    G.potions--;
    const heal = Math.round(p.maxHp * 0.42);
    p.hp = Math.min(p.maxHp, p.hp + heal);
    Audio.sfx("potion");
    addText(`+${heal}`, p.x, p.y - 36, "#8ce8ad", 8, { life: 0.9 });
    for (let i = 0; i < 15; i++) {
      addParticle({
        x: p.x + rand(-9, 9),
        y: p.y - rand(2, 23),
        vx: rand(-12, 12),
        vy: rand(-40, -12),
        life: rand(0.35, 0.8),
        size: rand(1, 2),
        color: i % 2 ? "#7fe2a1" : "#d5f7c0",
        gravity: -8
      });
    }
    markSave();
  }

  function startPlayerAttack(forceCombo) {
    const p = G.player;
    if (!p || p.dead) return;
    let combo = forceCombo || (p.comboWindow > 0 ? (p.comboChain || 0) + 1 : 1);
    if (combo > 4) combo = 1;
    const stage = COMBO_STAGES[combo - 1];
    p.attack.active = true;
    p.attack.t = 0;
    p.attack.combo = combo;
    p.attack.dur = stage.dur / Math.max(0.6, p.stats.atkSpeed);
    p.attack.hit = false;
    p.attack.index = combo;
    p.comboChain = combo;
    p.comboWindow = 0;
    p.attackQueue = 0;
    p.state = "attack";
    if (p.grounded) p.vx += p.facing * (combo === 4 ? 40 : combo === 3 ? 30 : 22);
    Audio.sfx("slash");
    addEffect({
      kind: "slash",
      x: p.x + p.facing * stage.offset,
      y: p.y - 16,
      facing: p.facing,
      radius: stage.radius,
      duration: combo === 4 ? 0.24 : 0.18,
      color: stage.color
    });
    if (combo >= 3) {
      addText(stage.name, p.x, p.y - 42, stage.color, combo === 4 ? 8 : 6, { life: 0.5, vy: -14 });
    }
  }

  function performPlayerAttack() {
    const p = G.player;
    const combo = p.attack.combo;
    const stage = COMBO_STAGES[Math.min(4, Math.max(1, combo)) - 1];
    const range = stage.range;
    const centerX = p.x + p.facing * stage.offset;
    const centerY = p.y - 16;
    let hitAny = false;
    let critAny = false;

    for (const e of G.enemies) {
      if (e.dead) continue;
      if (e.spawnT > 0) continue;
      const dx = Math.abs(e.x - centerX);
      const dy = Math.abs(e.y - e.h / 2 - centerY);
      if (dx <= range + e.w / 2 && dy <= 28 + e.h / 2) {
        const crit = stage.forceCrit || Math.random() < p.stats.crit;
        let raw = p.stats.atk * stage.mult;
        if (crit) raw *= stage.forceCrit ? 1.9 : 1.75;
        if (e.kind === "boss") raw *= 1 + p.stats.bossPct;
        raw *= rand(0.92, 1.08);
        const dmg = Math.max(1, raw - e.def * 0.55);
        damageEnemy(e, dmg, { crit, dir: p.facing, source: "attack", combo });
        hitAny = true;
        if (crit) critAny = true;
      }
    }

    // staff can swat away enemy projectiles
    for (const proj of G.projectiles) {
      if (proj.dead) continue;
      if (Math.abs(proj.x - centerX) < range + 10 && Math.abs(proj.y - centerY) < 28) {
        proj.dead = true;
        addEffect({ kind: "hit", x: proj.x, y: proj.y, duration: 0.18, seed: rand(0, 6) });
      }
    }

    if (hitAny) {
      G.hitStop = Math.max(G.hitStop, critAny ? 0.055 : 0.035);
      shakeScreen(critAny ? 0.32 : 0.18, 0.12);
    }
  }

  function updatePlayer(dt) {
    const p = G.player;
    if (!p) return;
    p.animTime += dt;
    p.dashCd = Math.max(0, p.dashCd - dt);
    p.potionCd = Math.max(0, p.potionCd - dt);
    p.invuln = Math.max(0, p.invuln - dt);
    p.flash = Math.max(0, p.flash - dt);
    p.hurtT = Math.max(0, p.hurtT - dt);
    p.rollT = Math.max(0, p.rollT - dt);
    p.dropThrough = Math.max(0, p.dropThrough - dt);
    p.comboWindow = Math.max(0, p.comboWindow - dt);
    if (p.comboWindow <= 0 && !p.attack.active) p.comboChain = 0;
    if (p.attackQueue > 0) p.attackQueue = Math.max(0, p.attackQueue - dt);

    if (p.dead) {
      p.state = "dead";
      return;
    }

    p.artifactCd = Math.max(0, p.artifactCd - dt);
    if (p.goldenT > 0) {
      p.goldenT = Math.max(0, p.goldenT - dt);
      p.goldenFx = (p.goldenFx || 0) - dt;
      if (p.goldenFx <= 0) {
        p.goldenFx = 0.08;
        addParticle({
          x: p.x + rand(-14, 14),
          y: p.y - rand(2, 46),
          vx: rand(-8, 8),
          vy: rand(-46, -18),
          life: rand(0.35, 0.7),
          size: rand(1, 3),
          color: Math.random() < 0.5 ? "#ffd75e" : "#fff3b8",
          gravity: -20
        });
      }
      if (p.goldenT <= 0) {
        p.goldenMul = 1;
        recalcStats();
        showToast("法相金身结束", "攻击与防御恢复");
      }
    }
    p.debuffSlowT = Math.max(0, p.debuffSlowT - dt);
    if (p.debuffSlowT <= 0) p.debuffSlowMult = 1;
    if (p.regenT > 0) {
      p.regenT = Math.max(0, p.regenT - dt);
      p.hp = Math.min(p.maxHp, p.hp + p.maxHp * 0.04 * dt);
      p.mp = Math.min(p.maxMp, p.mp + p.maxMp * 0.06 * dt);
      p.regenFx = (p.regenFx || 0) - dt;
      if (p.regenFx <= 0) {
        p.regenFx = 0.12;
        addParticle({
          x: p.x + rand(-10, 10),
          y: p.y - rand(4, 34),
          vx: rand(-6, 6),
          vy: rand(-30, -12),
          life: rand(0.4, 0.75),
          size: rand(1, 2),
          color: Math.random() < 0.5 ? "#8ff0d4" : "#b9ffe9",
          gravity: -18
        });
      }
    }
    if (p.debuffBurnT > 0) {
      p.debuffBurnT = Math.max(0, p.debuffBurnT - dt);
      p.debuffBurnTick -= dt;
      if (p.debuffBurnTick <= 0) {
        p.debuffBurnTick = 0.5;
        const burnDmg = Math.max(1, Math.round(p.debuffBurnDps * 0.5));
        p.hp -= burnDmg;
        addText(`-${burnDmg}`, p.x + rand(-4, 4), p.y - 36, "#ff9b5e", 6, { life: 0.5, vy: -16 });
        addEffect({ kind: "burst", x: p.x, y: p.y - 16, duration: 0.28, color: "#ff7b3d", count: 4, spread: 12 });
        if (p.hp <= 0) {
          p.hp = 0;
          beginDeath();
          return;
        }
      }
      if (p.debuffBurnT <= 0) p.debuffBurnDps = 0;
    }
    if (p.debuffPoisonT > 0) {
      p.debuffPoisonT = Math.max(0, p.debuffPoisonT - dt);
      p.debuffPoisonTick -= dt;
      if (p.debuffPoisonTick <= 0) {
        p.debuffPoisonTick = 0.6;
        const poisonDmg = Math.max(1, Math.round(p.debuffPoisonDps * 0.6));
        p.hp -= poisonDmg;
        addText(`-${poisonDmg}`, p.x + rand(-4, 4), p.y - 36, "#9be66a", 6, { life: 0.5, vy: -16 });
        addEffect({ kind: "burst", x: p.x, y: p.y - 16, duration: 0.28, color: "#76c94f", count: 4, spread: 12 });
        if (p.hp <= 0) {
          p.hp = 0;
          beginDeath();
          return;
        }
      }
      if (p.debuffPoisonT <= 0) p.debuffPoisonDps = 0;
    }

    // invincibility blink timer is cosmetic; actual damage gate is p.invuln
    if (p.dashing > 0) {
      p.dashing -= dt;
      p.dashTrail = (p.dashTrail || 0) - dt;
      if (p.dashTrail <= 0) {
        p.dashTrail = 0.035;
        addEffect({ kind: "afterimage", x: p.x, y: p.y, facing: p.facing, duration: 0.24, state: "dash" });
      }
      p.vx = p.dashDir * 395;
      p.vy = 0;
      if (p.dashing <= 0) {
        p.dashing = 0;
        p.vx *= 0.25;
      }
    } else {
      const move = (keys.right ? 1 : 0) - (keys.left ? 1 : 0);
      if (move !== 0) p.facing = move;
      let target = move * p.stats.speed;
      if (p.debuffSlowT > 0) target *= p.debuffSlowMult || 0.55;
      if (p.attack.active) target *= 0.3;
      if (p.skill.active) target = p.skill.id === "fireStorm" ? move * p.stats.speed * 0.62 * (p.debuffSlowT > 0 ? p.debuffSlowMult : 1) : 0;
      p.vx = lerp(p.vx, target, 1 - Math.exp(-18 * dt));
    }

    if ((p.kbT || 0) > 0) {
      p.kbT -= dt;
      p.x += (p.kbVx || 0) * dt;
      p.kbVx *= Math.exp(-7 * dt);
    }

    inputBuffer.jump = Math.max(0, inputBuffer.jump - dt);
    inputBuffer.attack = Math.max(0, inputBuffer.attack - dt);

    // jump
    if (inputBuffer.jump > 0 && !p.skill.active) {
      if (p.grounded || p.coyote > 0) {
        inputBuffer.jump = 0;
        p.vy = -260 - (p.stats.jump || 0);
        p.grounded = false;
        p.coyote = 0;
        p.jumpsUsed = 1;
        Audio.sfx("jump");
        addEffect({ kind: "burst", x: p.x, y: p.y, duration: 0.3, color: "#c7d8bf", count: 6, spread: 16 });
      } else if (p.jumpsUsed < 2) {
        inputBuffer.jump = 0;
        p.vy = -235 - (p.stats.jump || 0);
        p.jumpsUsed = 2;
        p.rollT = ROLL_TIME;
        p.rollDuration = ROLL_TIME;
        Audio.sfx("doubleJump");
        addEffect({ kind: "ring", x: p.x, y: p.y - 12, radius: 5, grow: 30, duration: 0.38, color: "#d8f7f0" });
        addEffect({
          kind: "afterimage",
          x: p.x,
          y: p.y,
          facing: p.facing,
          duration: 0.26,
          state: "jump",
          roll: 0.36
        });
        for (let i = 0; i < 14; i++) {
          const ang = (i / 14) * Math.PI * 2;
          addParticle({
            x: p.x + Math.cos(ang) * 9,
            y: p.y - 14 + Math.sin(ang) * 7,
            vx: Math.cos(ang) * rand(18, 44),
            vy: Math.sin(ang) * rand(12, 30) + 6,
            life: rand(0.24, 0.5),
            size: rand(1, 2),
            color: i % 3 === 0 ? "#ffe7a0" : "#dff7ee",
            gravity: 22
          });
        }
      }
    }

    // attacks
    if (p.attack.active && (inputBuffer.attack > 0 || (keys.attack && p.attack.t / p.attack.dur > 0.55))) {
      p.attackQueue = 0.5;
      inputBuffer.attack = 0;
    }
    if (p.attack.active) {
      p.attack.t += dt;
      const progress = p.attack.t / p.attack.dur;
      if (!p.attack.hit && progress >= 0.38) {
        p.attack.hit = true;
        performPlayerAttack();
      }
      if (progress >= 1) {
        p.attack.active = false;
        p.attack.t = 0;
        p.comboWindow = 0.46;
        p.state = "idle";
        if (p.attackQueue > 0 || inputBuffer.attack > 0) {
          p.attackQueue = 0;
          inputBuffer.attack = 0;
          startPlayerAttack(p.comboChain + 1);
        }
      }
    } else if ((inputBuffer.attack > 0 || p.attackQueue > 0) && !p.skill.active && p.dashing <= 0) {
      inputBuffer.attack = 0;
      p.attackQueue = 0;
      startPlayerAttack();
    }

    updateActiveSkill(dt);

    // gravity + movement
    p.x += p.vx * dt;
    p.x = clamp(p.x, 18, WORLD_W - 18);

    const prevY = p.y;
    if (p.dashing > 0) {
      p.vy = 0; // 冲刺期间无下坠
    } else {
      p.vy += 760 * dt;
    }
    p.y += p.vy * dt;
    let grounded = false;
    if (p.vy >= 0 && p.y >= FLOOR) {
      p.y = FLOOR;
      p.vy = 0;
      grounded = true;
      p.onPlatform = false;
    } else if (p.vy >= 0 && p.dropThrough <= 0) {
      for (const plat of G.platforms) {
        if (
          prevY <= plat.y + 2 &&
          p.y >= plat.y &&
          p.x > plat.x - 5 &&
          p.x < plat.x + plat.w + 5
        ) {
          p.y = plat.y;
          p.vy = 0;
          grounded = true;
          p.onPlatform = true;
          break;
        }
      }
    }

    if (grounded) {
      if (!p.grounded && p.vy === 0) {
        addEffect({ kind: "burst", x: p.x, y: p.y, duration: 0.24, color: "#b7b99d", count: 5, spread: 12 });
      }
      p.grounded = true;
      p.coyote = 0.1;
      p.jumpsUsed = 0;
      p.rollT = 0;
    } else {
      p.grounded = false;
      p.onPlatform = false;
      p.coyote = Math.max(0, p.coyote - dt);
    }

    // mana regen (equipment provides the bulk of the pool)
    p.mp = Math.min(p.maxMp, p.mp + 1.2 * dt);

    // state for the sprite renderer
    if (p.dead) p.state = "dead";
    else if (p.hurtT > 0) p.state = "hurt";
    else if (p.dashing > 0) p.state = "dash";
    else if (p.skill.active) p.state = p.skill.id === "fireStorm" ? "firespin" : "skill";
    else if (p.attack.active) p.state = "attack";
    else if (!p.grounded) p.state = p.vy < 0 ? "jump" : "fall";
    else if (Math.abs(p.vx) > 12) p.state = "run";
    else p.state = "idle";
  }

  function endPlayerSkill() {
    const p = G.player;
    if (!p) return;
    p.skill.active = false;
    p.skill.id = null;
    p.skill.t = 0;
    p.skill.tick = 0;
    p.skill.hit = false;
  }

  function skillHit(e, multiplier, ratio = 1, dir = 1, heavy = false) {
    const p = G.player;
    const crit = Math.random() < p.stats.crit;
    let raw = p.stats.atk * multiplier * (1 + p.stats.skillPct) * ratio;
    if (crit) raw *= 1.75;
    if (e.kind === "boss") raw *= 1 + p.stats.bossPct;
    const dmg = Math.max(1, raw - e.def * 0.45);
    damageEnemy(e, dmg, { crit, dir, source: "skill", heavy });
    return dmg;
  }

  function skillFlourish(kind, x, y, facing, color, level = 1, fromClone = false) {
    const rings = kind === "ultimate" ? 3 : 2;
    for (let r = 0; r < rings; r++) {
      addEffect({
        kind: "ring",
        x,
        y: y - 16,
        radius: 6 + r * 4,
        grow: 44 + level * 8 + r * 16,
        duration: 0.4 + r * 0.12,
        color: r ? "#fff0b8" : color
      });
    }
    addEffect({ kind: "burst", x, y: y - 16, duration: 0.4, color, count: 12 + level * 2, spread: 32 + level * 5 });
    const n = 16 + level * 4;
    for (let i = 0; i < n; i++) {
      const a = rand(0, Math.PI * 2);
      const sp = rand(40, 165);
      addParticle({
        x: x + Math.cos(a) * rand(2, 18),
        y: y - 16 + Math.sin(a) * rand(2, 16),
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp - 42,
        life: rand(0.3, 0.85),
        size: rand(1, 3),
        color: i % 3 === 0 ? "#fff0b8" : color,
        gravity: 34
      });
    }
    if (!fromClone) {
      if (kind === "fireEye") {
        addEffect({ kind: "eye", x, y: y - 32, radius: 22 + level * 4, duration: 0.5, color });
        addEffect({ kind: "eyeBeam", x, y: y - 26, targetX: x + facing * (210 + level * 10), targetY: y - 34, facing, duration: 0.45, color });
      } else {
        addEffect({ kind: "hit", x, y: y - 16, duration: 0.26, seed: rand(0, 6) });
      }
      if (kind === "ultimate") {
        addEffect({ kind: "rift", x, y: FLOOR, duration: 0.6, color });
        shakeScreen(0.9, 0.4);
        G.screenFlash = { color, alpha: 0.16, t: 0.3, duration: 0.3 };
      }
    }
  }

  function clearProjectilesInRadius(x, y, radius) {
    for (const proj of G.projectiles) {
      if (proj.dead) continue;
      if (Math.hypot(proj.x - x, proj.y - y) <= radius) {
        proj.dead = true;
        addEffect({ kind: "hit", x: proj.x, y: proj.y, duration: 0.16, seed: rand(0, 6) });
      }
    }
  }

  function executeFireStaff(x, y, facing, level, ratio = 1, fromClone = false) {
    const p = G.player;
    const radius = 58 + level * 5;
    const color = fromClone ? "#7ce9cb" : "#ff9b45";
    skillFlourish("fireStaff", x, y, facing, color, level, fromClone);
    for (const e of G.enemies) {
      if (e.dead || e.spawnT > 0) continue;
      const dx = e.x - x;
      const dy = e.y - e.h / 2 - (y - 16);
      if (dx * dx + dy * dy <= (radius + e.w * 0.5) * (radius + e.w * 0.5)) {
        skillHit(e, 2.0 + level * 0.32, ratio, Math.sign(dx) || facing, true);
      }
    }
    clearProjectilesInRadius(x, y - 16, radius + 8);
    for (let i = 0; i < (fromClone ? 12 : 22); i++) {
      const ang = rand(0, Math.PI * 2);
      const speed = rand(30, 110);
      addParticle({
        x: x + Math.cos(ang) * rand(4, 24),
        y: y - 16 + Math.sin(ang) * rand(4, 24),
        vx: Math.cos(ang) * speed,
        vy: Math.sin(ang) * speed - 20,
        life: rand(0.25, 0.65),
        size: rand(1, 2),
        color: i % 3 === 0 ? "#fff0a6" : i % 2 ? color : "#e64836",
        gravity: 30
      });
    }
    addEffect({ kind: "ring", x, y: y - 16, radius: 6, grow: radius + 8, duration: 0.42, color });
    if (!fromClone) shakeScreen(0.45, 0.22);
  }

  function executeFireEye(x, y, facing, level, ratio = 1, fromClone = false) {
    const p = G.player;
    const range = 260 + level * 10;
    const baseDps = p.stats.atk * (0.32 + level * 0.07) * (1 + p.stats.skillPct) * ratio;
    const duration = 5.5 + level * 0.6;
    const maxStacks = 5 + level;
    const eyeY = y - 26;
    skillFlourish("fireEye", x, y, facing, fromClone ? "#8ff0d4" : "#ffd45e", level, fromClone);

    // 只锁定身前最近的敌人，不再对周身生效
    let target = null;
    let best = Infinity;
    for (const e of G.enemies) {
      if (e.dead || e.spawnT > 0) continue;
      const forward = (e.x - x) * facing;
      const dy = e.y - e.h / 2 - (y - 16);
      if (forward < -8 || forward > range + e.w * 0.5) continue;
      if (Math.abs(dy) > 64 + e.h * 0.5) continue;
      const score = Math.max(0, forward) + Math.abs(dy) * 0.55;
      if (score < best) {
        best = score;
        target = e;
      }
    }

    const beamEndX = target ? target.x : x + facing * range;
    const beamEndY = target ? target.y - target.h * 0.55 : y - 28;
    addEffect({
      kind: "eyeBeam",
      x,
      y: eyeY,
      targetX: beamEndX,
      targetY: beamEndY,
      facing,
      duration: 0.62,
      color: fromClone ? "#8ff0d4" : "#ffd45e"
    });

    if (!target) {
      addText("未锁定目标", x, y - 52, "#c7c1a0", 6, { life: 0.6, vy: -16 });
      return;
    }

    const splash = 40 + level * 3.5;
    for (const e of G.enemies) {
      if (e.dead || e.spawnT > 0) continue;
      const dx = e.x - target.x;
      const dy = e.y - e.h / 2 - (target.y - target.h / 2);
      if (e === target || dx * dx + dy * dy <= splash * splash) {
        const bossMult = e.kind === "boss" ? 1 + p.stats.bossPct : 1;
        applyBurn(e, baseDps * bossMult, duration, maxStacks);
      }
    }

    addEffect({
      kind: "eye",
      x: target.x,
      y: target.y - target.h * 0.55,
      radius: 24 + level * 2,
      duration: 0.65,
      color: fromClone ? "#8ff0d4" : "#ffd45e"
    });
    for (let i = 0; i < 20; i++) {
      const t = rand(0.1, 1);
      addParticle({
        x: lerp(x + facing * 12, target.x, t),
        y: lerp(eyeY, target.y - target.h * 0.55, t),
        vx: rand(-25, 25),
        vy: rand(-30, 12),
        life: rand(0.3, 0.7),
        size: rand(1, 2),
        color: i % 2 ? "#ffe38a" : "#ff9b45",
        gravity: 5
      });
    }
    if (!fromClone) {
      shakeScreen(0.28, 0.2);
      addText("火眼金睛 · 锁敌", x, y - 58, "#ffe28a", 8, { life: 0.8, vy: -20 });
    }
  }

  function executeStaffSlam(x, y, facing, level, ratio = 1, fromClone = false) {
    const reach = 120 + level * 14;
    const color = fromClone ? "#8debd0" : "#ffd060";
    skillFlourish("ultimate", x, y, facing, color, level, fromClone);
    for (const e of G.enemies) {
      if (e.dead || e.spawnT > 0) continue;
      const forward = (e.x - x) * facing;
      if (forward > -24 && forward < reach + e.w * 0.5 && Math.abs(e.y - e.h / 2 - (y - 22)) < 58 + e.h * 0.4) {
        skillHit(e, 4.1 + level * 0.9, ratio, facing, true);
      }
    }
    clearProjectilesInRadius(x + facing * reach * 0.55, y - 20, reach * 0.7);
    addEffect({ kind: "staffSlam", x, y: y - 16, facing, length: reach, duration: 0.62, color });
    for (let i = 0; i < 26; i++) {
      addParticle({
        x: x + facing * rand(10, reach),
        y: FLOOR - rand(0, 16),
        vx: rand(-90, 90),
        vy: rand(-110, -25),
        life: rand(0.25, 0.7),
        size: rand(1, 3),
        color: i % 2 ? "#e8c37a" : "#7b6040",
        gravity: 130
      });
    }
    if (!fromClone) {
      shakeScreen(0.9, 0.4);
      addEffect({ kind: "ring", x: x + facing * reach * 0.55, y: FLOOR, radius: 8, grow: 100, duration: 0.6, color: "#ffd06a" });
    }
  }

  function executeFireStormTick(x, y, facing, level, ratio = 1, fromClone = false) {
    const radius = 64 + level * 6;
    for (const e of G.enemies) {
      if (e.dead || e.spawnT > 0) continue;
      const dx = e.x - x;
      const dy = e.y - e.h / 2 - (y - 16);
      if (dx * dx + dy * dy <= (radius + e.w * 0.5) * (radius + e.w * 0.5)) {
        skillHit(e, 0.62 + level * 0.1, ratio, Math.sign(dx) || facing, false);
      }
    }
    if (Math.random() < 0.22) skillFlourish("fireStorm", x, y, facing, "#ff6b3d", level, fromClone);
    for (let i = 0; i < 4; i++) {
      const ang = rand(0, Math.PI * 2);
      addParticle({
        x: x + Math.cos(ang) * rand(4, radius * 0.6),
        y: y - rand(6, 38),
        vx: Math.cos(ang) * rand(15, 50),
        vy: rand(-80, -20),
        life: rand(0.25, 0.55),
        size: rand(1, 2),
        color: i % 2 ? "#ffd264" : fromClone ? "#7ce9cb" : "#ff6b3d",
        gravity: -20
      });
    }
  }

  function activateGoldenBody(level) {
    const p = G.player;
    if (!p) return;
    const lv = Math.max(1, level || 1);
    p.goldenT = 5 + (lv - 1) * 0.6;
    p.goldenMul = 2 + (lv - 1) * 0.18;
    p.goldenFx = 0;
    recalcStats();
    skillFlourish("ultimate", p.x, p.y, p.facing, "#ffd75e", lv);
    addEffect({ kind: "ring", x: p.x, y: FLOOR, radius: 10, grow: 100, duration: 0.6, color: "#ffd75e" });
    addEffect({ kind: "burst", x: p.x, y: p.y - 18, duration: 0.5, color: "#ffe9a0", count: 14, spread: 46 });
    shakeScreen(0.8, 0.32);
    G.screenFlash = { color: "#ffd75e", alpha: 0.22, t: 0.4, duration: 0.4 };
    Audio.sfx("levelup");
    showToast("法相金身", `攻击与防御 ×${p.goldenMul.toFixed(2)}，持续 ${p.goldenT.toFixed(1)} 秒`);
  }

  function updateActiveSkill(dt) {
    const p = G.player;
    const s = p.skill;
    if (!s.active) return;
    s.t += dt;
    const def = D.SKILLS[s.id];
    if (!def) {
      endPlayerSkill();
      return;
    }
    const level = s.level || 1;

    if (s.id === "fireStaff") {
      if (!s.hit && s.t >= 0.12) {
        s.hit = true;
        executeFireStaff(p.x, p.y, p.facing, level, 1, false);
      }
    } else if (s.id === "fireEye") {
      if (!s.hit && s.t >= 0.16) {
        s.hit = true;
        executeFireEye(p.x, p.y, p.facing, level, 1, false);
      }
    } else if (s.id === "clone") {
      if (!s.hit && s.t >= 0.2) {
        s.hit = true;
        summonClone(level);
      }
    } else if (s.id === "goldenBody") {
      if (!s.hit && s.t >= 0.16) {
        s.hit = true;
        activateGoldenBody(level);
      }
    } else if (s.id === "staffSlam") {
      if (!s.hit && s.t >= 0.3) {
        s.hit = true;
        executeStaffSlam(p.x, p.y, p.facing, level, 1, false);
      }
    } else if (s.id === "fireStorm") {
      s.tick -= dt;
      if (s.tick <= 0) {
        s.tick = 0.2;
        executeFireStormTick(p.x, p.y, p.facing, level, 1, false);
        Audio.sfx("hit");
      }
      if (Math.random() < 0.55) {
        addParticle({
          x: p.x + rand(-18, 18),
          y: p.y - rand(2, 36),
          vx: rand(-35, 35),
          vy: rand(-95, -30),
          life: rand(0.3, 0.65),
          size: rand(1, 2),
          color: Math.random() < 0.5 ? "#ffd264" : "#ff6b3d",
          gravity: -20
        });
      }
    }

    if (s.t >= s.dur) endPlayerSkill();
  }

  function summonClone(level) {
    const p = G.player;
    if (G.clone) dismissClone(false);
    const maxHp = Math.max(1, Math.round(p.maxHp * (0.25 + level * 0.05)));
    G.clone = {
      x: p.x - p.facing * 26,
      y: p.y - 8,
      hp: maxHp,
      maxHp,
      atkRatio: Math.min(0.65, 0.32 + level * 0.06),
      level,
      duration: 7 + level * 1.3,
      maxDuration: 7 + level * 1.3,
      t: 0,
      facing: p.facing,
      flash: 0,
      pendingSkill: null,
      pendingT: 0,
      tornadoT: 0,
      tornadoTick: 0,
      dead: false
    };
    Audio.sfx("portal");
    addEffect({ kind: "ring", x: G.clone.x, y: p.y - 16, radius: 4, grow: 48, duration: 0.55, color: "#7ce9cb" });
    addText("分身!", G.clone.x, p.y - 48, "#8ff0d4", 8, { life: 0.9, vy: -18 });
  }

  function dismissClone(showMessage = true) {
    if (!G.clone) return;
    addEffect({ kind: "burst", x: G.clone.x, y: G.clone.y - 14, duration: 0.45, color: "#7ce9cb", count: 14, spread: 28 });
    addText("分身消散", G.clone.x, G.clone.y - 38, "#8ff0d4", 7, { life: 0.8, vy: -18 });
    G.clone = null;
    if (showMessage) Audio.sfx("error");
  }

  function damageCloneInArea(x, y, radius, amount) {
    const c = G.clone;
    if (!c || c.dead) return false;
    const dx = c.x - x;
    const dy = c.y - 10 - y;
    if (dx * dx + dy * dy <= radius * radius) {
      damageClone(amount);
      return true;
    }
    return false;
  }

  function damageClone(amount) {
    const c = G.clone;
    if (!c || c.dead) return false;
    const dmg = Math.max(1, Math.round(amount * 0.65));
    c.hp -= dmg;
    c.flash = 0.14;
    addText(`-${dmg}`, c.x, c.y - 34, "#8ff0d4", 7, { life: 0.65, vy: -18 });
    if (c.hp <= 0) {
      c.hp = 0;
      dismissClone();
    }
    return true;
  }

  function updateClone(dt) {
    const c = G.clone;
    const p = G.player;
    if (!c || c.dead || !p) return;
    c.t += dt;
    c.duration -= dt;
    c.flash = Math.max(0, c.flash - dt);
    if (c.duration <= 0) {
      dismissClone(false);
      return;
    }
    if (p.dead) {
      dismissClone(false);
      return;
    }

    const targetX = p.x - p.facing * 26;
    const targetY = p.y - 8 + Math.sin(c.t * 4.2) * 3;
    if (Math.abs(targetX - c.x) > 230 || Math.abs(targetY - c.y) > 120) {
      addEffect({ kind: "burst", x: c.x, y: c.y - 12, duration: 0.3, color: "#7ce9cb", count: 8, spread: 20 });
      c.x = targetX;
      c.y = targetY;
    } else {
      c.x = lerp(c.x, targetX, 1 - Math.exp(-5 * dt));
      c.y = lerp(c.y, targetY, 1 - Math.exp(-5 * dt));
    }
    c.facing = p.facing;

    if (c.pendingSkill) {
      c.pendingT -= dt;
      if (c.pendingT <= 0) {
        const id = c.pendingSkill;
        c.pendingSkill = null;
        cloneCastSkill(id);
      }
    }

    if (c.tornadoT > 0) {
      c.tornadoT -= dt;
      c.tornadoTick -= dt;
      if (c.tornadoTick <= 0) {
        c.tornadoTick = 0.24;
        executeFireStormTick(c.x, c.y, c.facing, c.level, c.atkRatio, true);
      }
      if (Math.random() < 0.5) {
        addParticle({
          x: c.x + rand(-12, 12),
          y: c.y - rand(2, 30),
          vx: rand(-22, 22),
          vy: rand(-60, -20),
          life: rand(0.25, 0.5),
          size: 1,
          color: Math.random() < 0.5 ? "#7ce9cb" : "#ffd264",
          gravity: -10
        });
      }
      if (c.tornadoT <= 0) c.tornadoT = 0;
    }
  }

  function cloneCastSkill(id) {
    const c = G.clone;
    if (!c) return;
    const level = skillLevel(id);
    const ratio = c.atkRatio;
    if (id === "fireStaff") executeFireStaff(c.x, c.y, c.facing, level, ratio, true);
    else if (id === "fireEye") executeFireEye(c.x, c.y, c.facing, level, ratio, true);
    else if (id === "staffSlam") executeStaffSlam(c.x, c.y, c.facing, level, ratio, true);
    else if (id === "fireStorm") {
      const p = G.player;
      const playerDur = p && p.skill.active && p.skill.id === "fireStorm" ? p.skill.dur : D.SKILLS.fireStorm.castTime;
      c.tornadoT = playerDur;
      c.tornadoTick = 0;
      addEffect({ kind: "ring", x: c.x, y: c.y - 16, radius: 4, grow: 46, duration: 0.45, color: "#7ce9cb" });
    }
  }

  function applyBurn(enemy, dps, duration, maxStacks) {
    if (!enemy || enemy.dead) return;
    enemy.burnStacks = Math.min(maxStacks, (enemy.burnStacks || 0) + 1);
    enemy.burnDps = Math.max(enemy.burnDps || 0, dps);
    enemy.burnTime = Math.max(enemy.burnTime || 0, duration);
    enemy.burnMaxStacks = Math.max(enemy.burnMaxStacks || 0, maxStacks);
    if (enemy.burnTick === undefined || enemy.burnTick <= 0) enemy.burnTick = 0.18;
    if (G.player) {
      addText(`灼烧 ×${enemy.burnStacks}`, enemy.x, enemy.y - enemy.h - 14, "#ffb45d", 6, { life: 0.65, vy: -16 });
    }
  }

  function updateBurn(enemy, dt) {
    if (!enemy || enemy.dead) return;
    if ((enemy.burnTime || 0) <= 0) {
      enemy.burnStacks = 0;
      enemy.burnDps = 0;
      return;
    }
    enemy.burnTime -= dt;
    enemy.burnTick -= dt;
    if (enemy.burnTick <= 0) {
      enemy.burnTick = 0.45;
      const dmg = Math.max(1, enemy.burnDps * enemy.burnStacks * 0.62);
      damageEnemy(enemy, dmg, {
        dot: true,
        dir: 0,
        source: "burn"
      });
    }
    if (Math.random() < 0.18 && G.particles.length < 300) {
      addParticle({
        x: enemy.x + rand(-enemy.w * 0.45, enemy.w * 0.45),
        y: enemy.y - rand(2, enemy.h),
        vx: rand(-10, 10),
        vy: rand(-45, -12),
        life: rand(0.25, 0.55),
        size: 1,
        color: Math.random() < 0.5 ? "#ffb45d" : "#ff6b3d",
        gravity: -12
      });
    }
  }

  function applyPlayerBurn(dps, time) {
    const p = G.player;
    if (!p || p.dead) return;
    p.debuffBurnT = Math.max(p.debuffBurnT, time);
    p.debuffBurnDps = Math.max(p.debuffBurnDps, dps);
    addText("灼烧", p.x, p.y - 46, "#ff7b45", 6, { life: 0.6, vy: -14 });
  }

  function applyPlayerPoison(dps, time) {
    const p = G.player;
    if (!p || p.dead) return;
    p.debuffPoisonT = Math.max(p.debuffPoisonT, time);
    p.debuffPoisonDps = Math.max(p.debuffPoisonDps, dps);
    addText("中毒", p.x, p.y - 46, "#8ee06a", 6, { life: 0.6, vy: -14 });
  }

  function applyPlayerSlow(time, mult = 0.55) {
    const p = G.player;
    if (!p || p.dead) return;
    p.debuffSlowT = Math.max(p.debuffSlowT, time);
    p.debuffSlowMult = Math.min(p.debuffSlowMult || 1, mult);
    addText("迟缓", p.x, p.y - 46, "#7fd8e8", 6, { life: 0.6, vy: -14 });
  }

  function clearPlayerDebuffs() {
    const p = G.player;
    if (!p) return;
    p.debuffBurnT = 0;
    p.debuffBurnDps = 0;
    p.debuffBurnTick = 0;
    p.debuffPoisonT = 0;
    p.debuffPoisonDps = 0;
    p.debuffPoisonTick = 0;
    p.debuffSlowT = 0;
    p.debuffSlowMult = 1;
  }

  function hitPlayer(amount, sourceX, opts = {}) {
    const p = G.player;
    if (!p || p.dead) return false;
    if (p.invuln > 0 || p.dashing > 0) return false;
    const mitigation = 100 / (100 + Math.max(0, p.stats.def) * 1.8);
    let dmg = amount * mitigation * (1 - p.stats.dr);
    dmg = Math.max(1, Math.round(dmg * rand(0.94, 1.06)));
    p.hp -= dmg;
    p.invuln = 0.82;
    p.hurtT = 0.28;
    p.flash = 0.16;
    const dir = sourceX > p.x ? -1 : 1;
    p.kbVx = dir * (opts.heavy ? 150 : 95);
    p.kbT = 0.18;
    if (opts.launch) p.vy = -120;
    p.attack.active = false;
    endPlayerSkill();
    Audio.sfx("hurt");
    addText(`-${dmg}`, p.x, p.y - 38, "#ff7b6e", 9, { life: 1, vy: -22 });
    addEffect({ kind: "hit", x: p.x, y: p.y - 16, duration: 0.22, seed: rand(0, 6) });
    for (let i = 0; i < 10; i++) {
      addParticle({
        x: p.x,
        y: p.y - 15,
        vx: rand(-60, 60),
        vy: rand(-60, 10),
        life: rand(0.2, 0.5),
        size: 1,
        color: i % 2 ? "#f5d7bd" : "#c44a4a",
        gravity: 80
      });
    }
    shakeScreen(opts.heavy ? 0.8 : 0.5, 0.24);
    G.screenFlash = { color: "#e83e3e", alpha: opts.heavy ? 0.2 : 0.13, t: 0.24, duration: 0.24 };
    G.combo = 0;
    G.comboTimer = 0;
    if (p.hp <= 0) {
      p.hp = 0;
      beginDeath();
    }
    return true;
  }

  function beginDeath() {
    const p = G.player;
    if (!p || G.mode !== "playing") return;
    if (G.clone) dismissClone(false);
    G.hazards = [];
    endPlayerSkill();
    p.dead = true;
    p.state = "dead";
    G.mode = "dying";
    G.deathTimer = 1.25;
    G.slowTimer = 0.8;
    clearKeys();
    Audio.setPaused(true);
    Audio.sfx("death");
    hide(dom.interactPrompt);
    shakeScreen(0.9, 0.6);
    G.screenFlash = { color: "#7d1b1b", alpha: 0.28, t: 0.5, duration: 0.5 };
  }

  /* ------------------------------------------------------------------ */
  /* Effects / particles / camera                                        */
  /* ------------------------------------------------------------------ */

  function shakeScreen(magnitude, duration) {
    G.camera.shake = Math.max(G.camera.shake, magnitude);
    G.camera.shakeTime = Math.max(G.camera.shakeTime, duration);
  }

  function addEffect(effect) {
    effect.t = 0;
    G.effects.push(effect);
    if (G.effects.length > 90) G.effects.shift();
  }

  function addParticle(particle) {
    particle.t = 0;
    particle.life = particle.life || 0.5;
    particle.maxLife = particle.life;
    G.particles.push(particle);
    if (G.particles.length > 380) G.particles.shift();
  }

  function addText(text, x, y, color, size, opts = {}) {
    G.texts.push({
      text,
      second: opts.second || "",
      x,
      y,
      color: color || "#fff",
      size: size || 8,
      vy: opts.vy === undefined ? -16 : opts.vy,
      life: opts.life || 0.8,
      maxLife: opts.life || 0.8,
      t: 0
    });
    if (G.texts.length > 50) G.texts.shift();
  }

  function updateEffects(dt) {
    for (const e of G.effects) e.t += dt;
    G.effects = G.effects.filter((e) => e.t < (e.duration || 0.5));
    for (const p of G.particles) {
      p.t += dt;
      p.x += (p.vx || 0) * dt;
      p.y += (p.vy || 0) * dt;
      p.vy = (p.vy || 0) + (p.gravity || 0) * dt;
      p.vx = (p.vx || 0) * Math.exp(-1.2 * dt);
    }
    G.particles = G.particles.filter((p) => p.t < p.life);
    for (const t of G.texts) {
      t.t += dt;
      t.y += (t.vy || 0) * dt;
      t.vy = (t.vy || 0) * Math.exp(-2.2 * dt);
    }
    G.texts = G.texts.filter((t) => t.t < t.life);
  }

  function updateCamera(dt) {
    const p = G.player;
    if (!p) return;
    let target = clamp(p.x - W * 0.46 + p.facing * 16, 0, WORLD_W - W);
    if (G.boss && !G.boss.dead && (G.waveState === "boss" || G.waveState === "victoryWait")) {
      const mid = (p.x + G.boss.x) / 2 - W * 0.5;
      target = clamp(mid, 0, WORLD_W - W);
    }
    G.camera.x = lerp(G.camera.x, target, 1 - Math.exp(-4.4 * dt));
  }

  /* ------------------------------------------------------------------ */
  /* Enemy AI                                                            */
  /* ------------------------------------------------------------------ */

  function updateEnemies(dt) {
    const p = G.player;
    for (const e of G.enemies) {
      e.animTime += dt;
      e.flash = Math.max(0, e.flash - dt);
      e.hurtT = Math.max(0, e.hurtT - dt);
      e.attackT = clamp(e.attackT || 0, 0, 1);

      if (e.dead) {
        e.deathT += dt;
        continue;
      }

      if (e.spawnT > 0) {
        e.spawnT -= dt;
        e.animTime += dt;
        if (e.spawnT <= 0) e.state = "chase";
        continue;
      }

      updateBurn(e, dt);
      if (e.dead) continue;
      e.stunT = Math.max(0, (e.stunT || 0) - dt);
      if (e.stunT > 0) {
        e.state = "stun";
        e.vx = 0;
        applyEnemyPhysics(e, dt);
        continue;
      }
      // 定身结束后恢复行动，避免永久僵直
      if (e.state === "stun") {
        e.state = "chase";
        e.cooldown = Math.min(e.cooldown || 0, 0.35);
        e.hurtT = 0;
      }

      // 半血狂暴：伤害提高、防御下降、出手更快
      if (!e.boss && !e.enraged && e.maxHp > 0 && e.hp <= e.maxHp * 0.5) {
        e.enraged = true;
        e.atk *= 1.35;
        e.def *= 0.6;
        e.windup = Math.max(0.1, e.windup * 0.72);
        e.recover = Math.max(0.08, e.recover * 0.65);
        e.speed *= 1.12;
        addText("狂暴", e.x, e.y - e.h - 12, "#ff8a5a", 7, { life: 0.9, vy: -18 });
        addEffect({ kind: "ring", x: e.x, y: FLOOR, radius: 6, grow: 46, duration: 0.45, color: "#ff6b52" });
      }

      if (!p || p.dead) {
        applyEnemyPhysics(e, dt);
        continue;
      }

      if (e.boss) updateBoss(e, dt);
      else updateNormalEnemy(e, dt);

      applyEnemyPhysics(e, dt);
    }

    separateEnemies();
    G.enemies = G.enemies.filter((e) => !e.dead || e.deathT < 0.95);
  }

  function updateNormalEnemy(e, dt) {
    const p = G.player;
    const dx = p.x - e.x;
    const adx = Math.abs(dx);
    const dy = p.y - e.y;
    e.cooldown = Math.max(0, e.cooldown - dt);

    if (e.state === "hurt") {
      e.stateT -= dt;
      if (e.stateT <= 0) {
        e.state = "chase";
        e.cooldown = Math.max(e.cooldown, 0.4);
      }
      return;
    }

    if (e.state === "windup") {
      e.stateT -= dt;
      e.attackT = 1 - clamp(e.stateT / Math.max(0.001, e.windup), 0, 1);
      if (e.stateT <= 0) {
        e.state = "attack";
        e.stateT = 0.16;
        e.attackT = 1;
        executeNormalAttack(e);
      }
      return;
    }

    if (e.state === "attack") {
      e.stateT -= dt;
      if (e.stateT <= 0) {
        e.state = "recover";
        e.stateT = e.recover;
      }
      return;
    }

    if (e.state === "recover") {
      e.stateT -= dt;
      if (e.stateT <= 0) {
        e.state = "chase";
        e.cooldown = rand(0.55, 1.1);
      }
      return;
    }

    // chase
    if (Math.abs(dx) > 3) e.facing = Math.sign(dx);
    if (e.flying) {
      const targetY = clamp(p.y - 58 + Math.sin(e.animTime * 3.1) * 9, 62, FLOOR - 18);
      e.y = lerp(e.y, targetY, 1 - Math.exp(-3.2 * dt));
      if (adx > 22) e.x += Math.sign(dx) * e.speed * dt;
      e.x += Math.sin(e.animTime * 4.2) * 8 * dt;
      if (e.cooldown <= 0 && adx < 82) startEnemyWindup(e);
      return;
    }

    if (e.ranged) {
      if (adx < 88) e.x -= Math.sign(dx) * e.speed * 0.8 * dt;
      else if (adx > 158) e.x += Math.sign(dx) * e.speed * 0.55 * dt;
      else e.x += Math.sin(e.animTime * 1.7) * 5 * dt;
      if (e.cooldown <= 0 && adx < 190) startEnemyWindup(e);
      return;
    }

    if (adx > e.range) {
      e.x += Math.sign(dx) * e.speed * dt;
    } else if (e.cooldown <= 0) {
      startEnemyWindup(e);
    }
  }

  function startEnemyWindup(e) {
    const p = G.player;
    if (!p) return;
    e.state = "windup";
    e.stateT = e.windup;
    e.attackT = 0;
    e.cooldown = rand(1.2, 2.0);
    if (e.ranged) {
      addEffect({
        kind: "telegraph",
        shape: "line",
        x: e.x,
        y: e.y - e.h * 0.55,
        facing: p.x > e.x ? 1 : -1,
        length: 190,
        width: 14,
        duration: e.windup,
        color: "#e2c479"
      });
    } else if (e.heavy) {
      addEffect({
        kind: "telegraph",
        shape: "circle",
        x: e.x + (p.x > e.x ? 1 : -1) * (e.range + 9),
        y: FLOOR,
        radius: 38,
        duration: e.windup,
        color: "#e09b59"
      });
    } else {
      addEffect({
        kind: "telegraph",
        shape: "circle",
        x: e.x + (p.x > e.x ? 1 : -1) * (e.range + 4),
        y: FLOOR,
        radius: 20,
        duration: e.windup,
        color: "#d99673"
      });
    }
  }

  function executeNormalAttack(e) {
    const p = G.player;
    if (!p) return;
    const dx = p.x - e.x;
    const adx = Math.abs(dx);
    const dy = Math.abs(p.y - e.y);
    e.facing = dx < 0 ? -1 : 1;

    if (e.ranged) {
      const sx = e.x + e.facing * 12;
      const sy = e.y - e.h * 0.55;
      const angle = Math.atan2(p.y - 16 - sy, p.x - sx);
      const speed = 170;
      spawnEnemyProjectile({
        type: e.projectile || "boneArrow",
        x: sx,
        y: sy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 16,
        gravity: e.projectile === "fireOrb" ? 25 : e.projectile === "waterArrow" ? 40 : 65,
        damage: e.atk,
        radius: 6,
        life: 2.6,
        playerBurn: e.projectile === "fireOrb" ? { dps: e.atk * 0.18, time: 3 } : null,
        playerSlow:
          e.projectile === "waterArrow" || e.projectile === "webShot"
            ? { time: e.projectile === "webShot" ? 3.2 : 2.4, mult: 0.5 }
            : null
      });
      Audio.sfx("slash");
      addEffect({ kind: "slash", x: sx, y: sy, facing: e.facing, radius: 14, duration: 0.15, color: "#d6c79c" });
      return;
    }

    if (e.flying) {
      if (adx < 42 && Math.abs(p.y - 16 - (e.y - 8)) < 28) {
        hitPlayer(e.atk, e.x, { heavy: false });
      }
      damageCloneInArea(e.x, e.y - 8, 42, e.atk * 0.7);
      addEffect({ kind: "slash", x: e.x + e.facing * 12, y: e.y - 8, facing: e.facing, radius: 20, duration: 0.18, color: "#c79be8" });
      return;
    }

    if (e.heavy) {
      const impactX = e.x + e.facing * (e.range + 12);
      if (Math.abs(p.x - impactX) < 48 && p.y > FLOOR - 45) {
        hitPlayer(e.atk * 1.08, impactX, { heavy: true });
      }
      damageCloneInArea(impactX, FLOOR, 52, e.atk * 0.9);
      addEffect({ kind: "ring", x: impactX, y: FLOOR, radius: 4, grow: 44, duration: 0.45, color: "#d98a4b" });
      addEffect({ kind: "hit", x: impactX, y: FLOOR - 4, duration: 0.28, seed: rand(0, 6) });
      shakeScreen(0.35, 0.2);
      Audio.sfx("hit");
      return;
    }

    if (adx < e.range + 14 && dy < 34) {
      hitPlayer(e.atk, e.x, {});
    }
    damageCloneInArea(e.x + e.facing * (e.range * 0.5), e.y - 14, e.range + 16, e.atk * 0.7);
    addEffect({ kind: "slash", x: e.x + e.facing * 12, y: e.y - 15, facing: e.facing, radius: 20, duration: 0.17, color: "#e3b17c" });
  }

  function applyEnemyPhysics(e, dt) {
    e.x += (e.kx || 0) * dt;
    e.kx *= Math.exp(-6 * dt);
    if (!e.flying) {
      e.vy += 760 * dt;
      e.y += e.vy * dt;
      if (e.y >= FLOOR) {
        e.y = FLOOR;
        e.vy = 0;
      }
    }
    e.x = clamp(e.x, 20, WORLD_W - 20);
    e.y = clamp(e.y, 36, FLOOR);
  }

  function separateEnemies() {
    const ground = G.enemies.filter((e) => !e.dead && !e.flying && !e.boss);
    for (let i = 0; i < ground.length; i++) {
      for (let j = i + 1; j < ground.length; j++) {
        const a = ground[i];
        const b = ground[j];
        const min = (a.w + b.w) * 0.44;
        const dx = b.x - a.x;
        if (Math.abs(dx) < min) {
          const push = (min - Math.abs(dx)) * 0.5 * (dx >= 0 ? 1 : -1);
          a.x -= push * 0.5;
          b.x += push * 0.5;
        }
      }
    }
  }

  /* ------------------------------------------------------------------ */
  /* Boss AI                                                             */
  /* ------------------------------------------------------------------ */

  function updateBoss(e, dt) {
    const p = G.player;
    if (!p) return;
    const dx = p.x - e.x;
    const adx = Math.abs(dx);

    // 韧性回复期：无法行动，直到回满
    if (e.maxPoise > 0 && e.poiseBroken) {
      e.poise = Math.min(e.maxPoise, e.poise + e.poiseRegenRate * dt);
      e.state = "broken";
      e.vx = 0;
      e.kx = 0;
      e.attackT = 0;
      applyEnemyPhysics(e, dt);
      if (e.poise >= e.maxPoise) {
        e.poise = e.maxPoise;
        e.poiseBroken = false;
        e.state = "chase";
        e.cooldown = 0.6;
        addText("韧性恢复", e.x, e.y - e.h - 16, "#ffe08a", 8, { life: 0.9, vy: -18 });
      }
      return;
    }

    if (e.state === "spawn") {
      e.stateT -= dt;
      if (e.stateT <= 0) {
        e.state = "chase";
        e.cooldown = 1.1;
      }
      return;
    }

    if (e.hurtT > 0 && e.state !== "charge") {
      return;
    }

    if (e.state === "chase") {
      e.cooldown -= dt;
      if (adx > 8) e.facing = Math.sign(dx);
      if (adx > e.range) e.x += e.facing * e.speed * dt;
      if (e.cooldown <= 0 && adx < 240) startBossPattern(e);
      return;
    }

    if (e.state === "windup") {
      e.stateT -= dt;
      e.attackT = 1 - clamp(e.stateT / Math.max(0.001, e.windupDuration), 0, 1);
      if (e.stateT <= 0) executeBossPattern(e);
      return;
    }

    if (e.state === "attack" || e.state === "cast") {
      e.stateT -= dt;
      e.attackT = 1;
      if (e.stateT <= 0) {
        e.state = "recover";
        e.stateT = e.recover * (e.phaseTriggered ? 0.45 : 0.62);
        e.attackT = 0;
      }
      return;
    }

    if (e.state === "charge") {
      e.stateT -= dt;
      e.x += e.chargeDir * e.chargeSpeed * dt;
      e.x = clamp(e.x, 40, WORLD_W - 40);
      if (!e.chargeHit) {
        const overlap = Math.abs(p.x - e.x) < e.w * 0.55 + 10 && Math.abs(p.y - 16 - (e.y - e.h * 0.5)) < e.h * 0.5 + 18;
        if (overlap) {
          e.chargeHit = true;
          if (hitPlayer(e.atk * 1.2, e.x, { heavy: true }) && e.chargeBurn) {
            applyPlayerBurn(e.atk * 0.14, 4.2);
          }
        }
      }
      damageCloneInArea(e.x, e.y - e.h * 0.5, e.w * 0.55 + 14, e.atk * 0.9);
      if (e.chargeBurn && Math.random() < 0.55) {
        addParticle({
          x: e.x - e.chargeDir * rand(4, 24),
          y: FLOOR - rand(2, 22),
          vx: rand(-20, 20),
          vy: rand(-45, -10),
          life: rand(0.2, 0.5),
          size: rand(1, 3),
          color: Math.random() < 0.5 ? "#ff7a2e" : "#ffd05a",
          gravity: -20
        });
      }
      if (e.chargeSpeed > 80 && Math.random() < 0.7) {
        addParticle({
          x: e.x - e.chargeDir * rand(8, 20),
          y: FLOOR - rand(0, 10),
          vx: rand(-15, 15),
          vy: rand(-28, -5),
          life: rand(0.2, 0.45),
          size: rand(1, 2),
          color: "#b28b67",
          gravity: 30
        });
      }
      if (e.stateT <= 0) {
        e.state = "recover";
        e.stateT = 0.55;
        e.attackT = 0;
        addEffect({ kind: "burst", x: e.x, y: FLOOR, duration: 0.35, color: "#b6936d", count: 10, spread: 30 });
      }
      return;
    }

    if (e.state === "recover" || e.state === "hurt") {
      e.stateT -= dt;
      if (e.stateT <= 0) {
        e.state = "chase";
        e.cooldown = rand(0.45, 0.85) * (e.phaseTriggered ? 0.7 : 1);
      }
      return;
    }
  }

  function startBossPattern(e) {
    const p = G.player;
    if (!p) return;
    const pattern = e.patterns[e.patternIndex % e.patterns.length];
    e.patternIndex++;
    e.pattern = pattern;
    const skillDef = D.BOSS_SKILLS[pattern] || { name: pattern, type: "common" };
    e.currentSkillName = skillDef.name;
    e.currentSkillType = skillDef.type;
    e.state = "windup";
    e.attackT = 0;
    e.facing = p.x < e.x ? -1 : 1;

    let duration = 0.62;
    let telegraph = null;
    if (pattern === "slam") {
      duration = 0.76;
      telegraph = {
        shape: "circle",
        x: e.x + e.facing * 56,
        y: FLOOR,
        radius: 50,
        color: "#e8664f"
      };
    } else if (pattern === "charge") {
      duration = 0.58;
      telegraph = {
        shape: "line",
        x: e.x,
        y: e.y - 15,
        facing: e.facing,
        length: 250,
        width: 28,
        color: "#e2814d"
      };
    } else if (pattern === "shockwave") {
      duration = 0.66;
      telegraph = { shape: "circle", x: e.x, y: FLOOR, radius: 62, color: "#e3a45b" };
    } else if (pattern === "boneVolley") {
      duration = 0.6;
      telegraph = {
        shape: "line",
        x: e.x,
        y: e.y - 25,
        facing: e.facing,
        length: 220,
        width: 18,
        color: "#93e3c6"
      };
    } else if (pattern === "summon") {
      duration = 0.72;
      telegraph = { shape: "circle", x: e.x, y: FLOOR, radius: 48, color: "#b07cdd" };
    } else if (pattern === "teleport") {
      duration = 0.48;
      telegraph = { shape: "circle", x: p.x, y: FLOOR, radius: 34, color: "#9fead1" };
    } else if (pattern === "demonFlame") {
      duration = 0.82;
      telegraph = { shape: "circle", x: p.x, y: FLOOR, radius: 82, color: "#ff633e" };
    } else if (pattern === "warRoar") {
      duration = 0.62;
      telegraph = { shape: "circle", x: e.x, y: FLOOR, radius: 122, color: "#f0c35c" };
    } else if (pattern === "blackTornado") {
      duration = 0.68;
      telegraph = {
        shape: "line",
        x: e.x,
        y: e.y - 16,
        facing: e.facing,
        length: 330,
        width: 34,
        color: "#7c7b9e"
      };
    } else if (pattern === "blackStep") {
      duration = 0.46;
      telegraph = { shape: "circle", x: p.x, y: FLOOR, radius: 42, color: "#8d7bc0" };
    } else if (pattern === "ghostFire") {
      duration = 0.6;
      telegraph = { shape: "circle", x: e.x, y: FLOOR, radius: 52, color: "#83e6c8" };
    } else if (pattern === "bonePrison") {
      duration = 0.74;
      telegraph = { shape: "circle", x: p.x, y: FLOOR, radius: 76, color: "#d9ddc9" };
    } else if (pattern === "samadhiFire") {
      duration = 0.78;
      telegraph = { shape: "circle", x: p.x, y: FLOOR, radius: 86, color: "#ff5a2b" };
    } else if (pattern === "fireWheel") {
      duration = 0.55;
      telegraph = {
        shape: "line",
        x: e.x,
        y: e.y - 14,
        facing: e.facing,
        length: 350,
        width: 30,
        color: "#ff7a2e"
      };
    } else if (pattern === "waterSurge") {
      duration = 0.7;
      telegraph = {
        shape: "line",
        x: e.x,
        y: e.y - 18,
        facing: e.facing,
        length: 380,
        width: 52,
        color: "#5fdfe8"
      };
    } else if (pattern === "waterPrison") {
      duration = 0.72;
      telegraph = { shape: "circle", x: p.x, y: FLOOR, radius: 80, color: "#7fe4ef" };
    } else if (pattern === "gourdVortex") {
      duration = 0.82;
      telegraph = { shape: "circle", x: p.x, y: FLOOR, radius: 82, color: "#d8b34d" };
    } else if (pattern === "swordRain") {
      duration = 0.66;
      telegraph = { shape: "circle", x: p.x, y: FLOOR, radius: 96, color: "#d9d2b2" };
    } else if (pattern === "webTrap") {
      duration = 0.72;
      telegraph = { shape: "circle", x: p.x, y: FLOOR, radius: 88, color: "#c59be0" };
    } else if (pattern === "venomBeam") {
      duration = 0.58;
      telegraph = {
        shape: "line",
        x: e.x,
        y: e.y - 22,
        facing: e.facing,
        length: 360,
        width: 24,
        color: "#8ee06a"
      };
    } else if (pattern === "windBlades") {
      duration = 0.56;
      telegraph = {
        shape: "line",
        x: e.x,
        y: e.y - 18,
        facing: e.facing,
        length: 340,
        width: 38,
        color: "#a8d8e6"
      };
    } else if (pattern === "skyDive") {
      duration = 0.62;
      telegraph = {
        shape: "line",
        x: e.x,
        y: e.y - 18,
        facing: e.facing,
        length: 360,
        width: 36,
        color: "#e0c06a"
      };
    } else if (pattern === "fanGust") {
      duration = 0.58;
      telegraph = { shape: "circle", x: e.x, y: FLOOR, radius: 155, color: "#8fcbb5" };
    } else if (pattern === "flameSea") {
      duration = 0.8;
      telegraph = { shape: "circle", x: p.x, y: FLOOR, radius: 100, color: "#ff5a2b" };
    } else if (pattern === "abyssMaw") {
      duration = 0.8;
      telegraph = { shape: "circle", x: p.x, y: FLOOR, radius: 92, color: "#4f6fd6" };
    } else if (pattern === "sixEarEcho") {
      duration = 0.62;
      telegraph = { shape: "circle", x: e.x, y: FLOOR, radius: 120, color: "#c9a6ff" };
    } else if (pattern === "riverDragon") {
      duration = 0.72;
      telegraph = {
        shape: "line",
        x: e.x,
        y: e.y - 18,
        facing: e.facing,
        length: 420,
        width: 58,
        color: "#5fdfe8"
      };
    } else if (pattern === "endlessNight") {
      duration = 0.86;
      telegraph = { shape: "circle", x: p.x, y: FLOOR, radius: 120, color: "#7a2f4f" };
    }

    // v2.4：妖王出手更快、预警范围更大；狂暴后进一步加速
    duration *= 0.78 * (e.phaseTriggered ? 0.75 : 1);
    if (telegraph) {
      if (telegraph.radius) telegraph.radius *= 1.32;
      if (telegraph.length) telegraph.length *= 1.32;
      if (telegraph.width) telegraph.width *= 1.28;
    }

    e.windupDuration = duration;
    e.stateT = duration;
    if (telegraph) {
      addEffect({
        kind: "telegraph",
        ...telegraph,
        duration,
        x: telegraph.x,
        y: telegraph.y
      });
    }
    Audio.sfx("bosswind");
  }

  function executeBossPattern(e) {
    const p = G.player;
    if (!p) return;
    e.attackT = 0;

    switch (e.pattern) {
      case "slam": {
        e.state = "attack";
        e.stateT = 0.38;
        e.attackDuration = 0.38;
        e.attackT = 1;
        const impactX = e.x + e.facing * 56;
        addEffect({ kind: "ring", x: impactX, y: FLOOR, radius: 5, grow: 65, duration: 0.5, color: "#e6a45a" });
        addEffect({ kind: "hit", x: impactX, y: FLOOR - 8, duration: 0.35, seed: rand(0, 6) });
        for (let i = 0; i < 16; i++) {
          addParticle({
            x: impactX + rand(-24, 24),
            y: FLOOR - rand(0, 12),
            vx: rand(-80, 80),
            vy: rand(-90, -20),
            life: rand(0.25, 0.6),
            size: rand(1, 3),
            color: i % 2 ? "#d8b178" : "#72533a",
            gravity: 140
          });
        }
        if (Math.abs(p.x - impactX) < 84 && p.y > FLOOR - 55) {
          hitPlayer(e.atk * 1.15, impactX, { heavy: true, launch: true });
        }
        damageCloneInArea(impactX, FLOOR, 66, e.atk * 0.85);
        shakeScreen(0.85, 0.35);
        Audio.sfx("hit");
        break;
      }
      case "charge": {
        e.state = "charge";
        e.stateT = 0.48;
        e.chargeDir = e.facing;
        e.chargeSpeed = 270 + G.loop * 12;
        e.chargeHit = false;
        e.chargeBurn = false;
        shakeScreen(0.32, 0.18);
        Audio.sfx("dash");
        break;
      }
      case "shockwave": {
        e.state = "attack";
        e.stateT = 0.42;
        e.attackT = 1;
        for (const dir of [-1, 1]) {
          spawnEnemyProjectile({
            type: "shockwave",
            x: e.x + dir * 24,
            y: FLOOR - 2,
            vx: dir * 175,
            vy: 0,
            radius: 16,
            damage: e.atk * 0.8,
            life: 1.75,
            color: "#e6ad67"
          });
        }
        addEffect({ kind: "ring", x: e.x, y: FLOOR, radius: 8, grow: 75, duration: 0.5, color: "#e6ad67" });
        shakeScreen(0.55, 0.28);
        Audio.sfx("skill");
        break;
      }
      case "summon": {
        e.state = "cast";
        e.stateT = 0.75;
        e.attackT = 1;
        const type = G.stageIndex === 0 ? "monkey" : G.stageIndex === 1 ? "imp" : "skeleton";
        for (const dir of [-1, 1]) {
          const minion = spawnEnemy(type, clamp(e.x + dir * 76, 42, WORLD_W - 42), FLOOR, { delay: 0.2, summoned: true });
          if (minion) {
            minion.elite = false;
            minion.name = `召唤·${minion.name}`;
            minion.hp = Math.round(minion.maxHp * 0.8);
            minion.maxHp = minion.hp;
          }
        }
        addEffect({ kind: "ring", x: e.x, y: FLOOR, radius: 6, grow: 86, duration: 0.65, color: "#b17adb" });
        Audio.sfx("portal");
        break;
      }
      case "boneVolley": {
        e.state = "attack";
        e.stateT = 0.45;
        e.attackT = 1;
        const sx = e.x + e.facing * 18;
        const sy = e.y - 30;
        const base = Math.atan2(p.y - 16 - sy, p.x - sx);
        for (let i = -2; i <= 2; i++) {
          const angle = base + i * 0.15;
          spawnEnemyProjectile({
            type: "boneSpike",
            x: sx,
            y: sy,
            vx: Math.cos(angle) * 155,
            vy: Math.sin(angle) * 155,
            radius: 6,
            damage: e.atk * 0.72,
            life: 2.2
          });
        }
        Audio.sfx("slash");
        break;
      }
      case "teleport": {
        const oldX = e.x;
        const dir = p.x > e.x ? 1 : -1;
        e.x = clamp(p.x + dir * 78, 60, WORLD_W - 60);
        e.facing = p.x > e.x ? 1 : -1;
        e.state = "attack";
        e.stateT = 0.36;
        e.attackT = 1;
        addEffect({ kind: "burst", x: oldX, y: FLOOR - 24, duration: 0.4, color: "#95e7cc", count: 16, spread: 30 });
        addEffect({ kind: "burst", x: e.x, y: FLOOR - 24, duration: 0.4, color: "#b9ffe9", count: 16, spread: 30 });
        if (Math.abs(p.x - e.x) < 68) {
          hitPlayer(e.atk * 1.05, e.x, { heavy: true, launch: true });
        }
        damageCloneInArea(e.x, FLOOR - 24, 54, e.atk * 0.9);
        shakeScreen(0.5, 0.25);
        Audio.sfx("portal");
        break;
      }
      case "demonFlame": {
        e.state = "attack";
        e.stateT = 0.5;
        e.attackT = 1;
        for (let i = -1; i <= 1; i++) {
          spawnHazard({
            x: clamp(p.x + i * 56, 40, WORLD_W - 40),
            y: FLOOR,
            radius: 36,
            delay: 0.48 + Math.abs(i) * 0.14,
            damage: e.atk * 0.9,
            color: "#ff633e",
            kind: "flame"
          });
        }
        addEffect({ kind: "ring", x: e.x, y: FLOOR, radius: 8, grow: 120, duration: 0.6, color: "#ff633e" });
        shakeScreen(0.6, 0.3);
        Audio.sfx("skill");
        break;
      }
      case "warRoar": {
        e.state = "attack";
        e.stateT = 0.55;
        e.attackT = 1;
        addEffect({ kind: "ring", x: e.x, y: FLOOR, radius: 10, grow: 145, duration: 0.7, color: "#f0c35c" });
        if (Math.hypot(p.x - e.x, p.y - 16 - (e.y - 24)) < 178) {
          hitPlayer(e.atk * 1.12, e.x, { heavy: true, launch: true });
        }
        damageCloneInArea(e.x, e.y - 20, 140, e.atk * 0.9);
        e.speed *= 1.06;
        shakeScreen(0.85, 0.4);
        Audio.sfx("boss");
        break;
      }
      case "blackTornado": {
        e.state = "attack";
        e.stateT = 0.5;
        e.attackT = 1;
        spawnEnemyProjectile({
          type: "blackTornado",
          x: e.x + e.facing * 34,
          y: FLOOR - 24,
          vx: e.facing * 112,
          vy: 0,
          radius: 28,
          damage: e.atk * 0.9,
          life: 2.8,
          color: "#766b9e"
        });
        addEffect({ kind: "ring", x: e.x, y: FLOOR, radius: 6, grow: 72, duration: 0.5, color: "#766b9e" });
        shakeScreen(0.42, 0.25);
        Audio.sfx("dash");
        break;
      }
      case "blackStep": {
        const oldX = e.x;
        const dir = p.x > e.x ? 1 : -1;
        e.x = clamp(p.x + dir * 72, 60, WORLD_W - 60);
        e.facing = p.x > e.x ? 1 : -1;
        e.state = "attack";
        e.stateT = 0.38;
        e.attackT = 1;
        addEffect({ kind: "burst", x: oldX, y: FLOOR - 26, duration: 0.5, color: "#766b9e", count: 22, spread: 36 });
        addEffect({ kind: "burst", x: e.x, y: FLOOR - 26, duration: 0.5, color: "#a596d0", count: 22, spread: 36 });
        if (Math.abs(p.x - e.x) < 76) {
          hitPlayer(e.atk * 1.16, e.x, { heavy: true, launch: true });
        }
        damageCloneInArea(e.x, FLOOR - 26, 58, e.atk * 0.9);
        shakeScreen(0.62, 0.3);
        Audio.sfx("portal");
        break;
      }
      case "ghostFire": {
        e.state = "attack";
        e.stateT = 0.5;
        e.attackT = 1;
        const sx = e.x + e.facing * 12;
        const sy = e.y - 34;
        const base = Math.atan2(p.y - 16 - sy, p.x - sx);
        for (let i = -1; i <= 1; i++) {
          const angle = base + i * 0.2;
          spawnEnemyProjectile({
            type: "ghostFire",
            x: sx,
            y: sy,
            vx: Math.cos(angle) * 125,
            vy: Math.sin(angle) * 125,
            radius: 8,
            damage: e.atk * 0.62,
            life: 4,
            color: "#70e0b4"
          });
        }
        addEffect({ kind: "ring", x: e.x, y: FLOOR, radius: 5, grow: 54, duration: 0.45, color: "#70e0b4" });
        Audio.sfx("portal");
        break;
      }
      case "bonePrison": {
        e.state = "attack";
        e.stateT = 0.48;
        e.attackT = 1;
        for (let i = 0; i < 6; i++) {
          const angle = (i / 6) * Math.PI * 2;
          spawnHazard({
            x: clamp(p.x + Math.cos(angle) * 46, 40, WORLD_W - 40),
            y: FLOOR,
            radius: 28,
            delay: 0.4 + i * 0.05,
            damage: e.atk * 0.82,
            color: "#d9ddc9",
            kind: "bone"
          });
        }
        addEffect({ kind: "ring", x: p.x, y: FLOOR, radius: 10, grow: 78, duration: 0.65, color: "#d9ddc9" });
        shakeScreen(0.65, 0.32);
        Audio.sfx("skill");
        break;
      }
      case "samadhiFire": {
        e.state = "attack";
        e.stateT = 0.5;
        e.attackT = 1;
        for (let i = -1; i <= 2; i++) {
          spawnHazard({
            x: clamp(p.x + i * 48, 40, WORLD_W - 40),
            y: FLOOR,
            radius: 34,
            delay: 0.42 + Math.abs(i) * 0.1,
            damage: e.atk * 0.82,
            color: "#ff5a2b",
            kind: "flame",
            playerBurn: { dps: e.atk * 0.14, time: 4.2 }
          });
        }
        addEffect({ kind: "ring", x: e.x, y: FLOOR, radius: 8, grow: 110, duration: 0.6, color: "#ff5a2b" });
        shakeScreen(0.65, 0.32);
        Audio.sfx("skill");
        break;
      }
      case "abyssMaw": {
        // 幽冥漩涡：把玩家往中心吸，四周接连爆发
        e.state = "cast";
        e.stateT = 0.7;
        e.attackT = 1;
        const pullDir = Math.sign(e.x - p.x) || 1;
        p.kbVx = (p.kbVx || 0) + pullDir * 95;
        p.kbT = Math.max(p.kbT || 0, 0.55);
        for (let i = 0; i < 4; i++) {
          const a = (i / 4) * Math.PI * 2 + G.time;
          spawnHazard({
            x: clamp(p.x + Math.cos(a) * 86, 40, WORLD_W - 40),
            y: FLOOR,
            radius: 34,
            delay: 0.3 + i * 0.12,
            damage: e.atk * 0.85,
            color: "#4f6fd6",
            kind: "flame"
          });
        }
        addEffect({ kind: "ring", x: p.x, y: FLOOR, radius: 8, grow: 112, duration: 0.7, color: "#4f6fd6" });
        shakeScreen(0.6, 0.3);
        Audio.sfx("boss");
        break;
      }
      case "sixEarEcho": {
        // 六耳回声：扇形音波
        e.state = "attack";
        e.stateT = 0.5;
        e.attackT = 1;
        const sx = e.x;
        const sy = e.y - 32;
        const base = Math.atan2(p.y - 16 - sy, p.x - sx);
        for (let i = -2; i <= 2; i++) {
          const a = base + i * 0.22;
          spawnEnemyProjectile({
            type: "windBlade",
            x: sx,
            y: sy,
            vx: Math.cos(a) * 190,
            vy: Math.sin(a) * 190,
            radius: 9,
            damage: e.atk * 0.7,
            life: 2.4,
            color: "#c9a6ff"
          });
        }
        for (let i = 0; i < 3; i++) {
          addEffect({ kind: "ring", x: e.x, y: e.y - 28, radius: 6 + i * 8, grow: 60 + i * 20, duration: 0.5 + i * 0.1, color: "#c9a6ff" });
        }
        Audio.sfx("skill");
        break;
      }
      case "riverDragon": {
        // 翻江倒海：七道水浪 + 地面水牢
        e.state = "attack";
        e.stateT = 0.6;
        e.attackT = 1;
        const sx = e.x + e.facing * 30;
        const sy = e.y - 20;
        const base = Math.atan2(p.y - 16 - sy, p.x - sx);
        for (let i = -3; i <= 3; i++) {
          const a = base + i * 0.16;
          spawnEnemyProjectile({
            type: "waterSurge",
            x: sx,
            y: sy,
            vx: Math.cos(a) * 235,
            vy: Math.sin(a) * 235,
            radius: 24,
            damage: e.atk * 0.8,
            life: 2.2,
            color: "#5fdfe8",
            playerSlow: { time: 3, mult: 0.5 }
          });
        }
        spawnHazard({
          x: clamp(p.x, 40, WORLD_W - 40),
          y: FLOOR,
          radius: 40,
          delay: 0.5,
          damage: e.atk * 0.9,
          color: "#5fdfe8",
          kind: "flame",
          playerSlow: { time: 2.5, mult: 0.55 }
        });
        addEffect({ kind: "ring", x: e.x, y: FLOOR, radius: 10, grow: 152, duration: 0.7, color: "#5fdfe8" });
        shakeScreen(0.65, 0.32);
        Audio.sfx("boss");
        break;
      }
      case "endlessNight": {
        // 无边长夜：全场黑暗，连环爆发 + 追踪暗球
        e.state = "cast";
        e.stateT = 0.85;
        e.attackT = 1;
        G.screenFlash = { color: "#1a0a18", alpha: 0.38, t: 0.6, duration: 0.6 };
        for (let i = 0; i < 5; i++) {
          spawnHazard({
            x: clamp(p.x + rand(-70, 70), 40, WORLD_W - 40),
            y: FLOOR,
            radius: 30 + i * 3,
            delay: 0.25 + i * 0.14,
            damage: e.atk * 0.85,
            color: "#a03a6a",
            kind: "bone"
          });
        }
        const nsx = e.x + e.facing * 20;
        for (let i = -1; i <= 1; i++) {
          spawnEnemyProjectile({
            type: "darkOrb",
            x: nsx,
            y: e.y - 30,
            vx: i * 70,
            vy: -60,
            gravity: 40,
            radius: 14,
            damage: e.atk * 0.9,
            life: 2.6,
            color: "#a03a6a"
          });
        }
        addEffect({ kind: "rift", x: p.x, y: FLOOR, duration: 0.8, color: "#7a2f4f" });
        shakeScreen(0.9, 0.45);
        Audio.sfx("boss");
        break;
      }
      case "fireWheel": {
        e.state = "charge";
        e.stateT = 0.55;
        e.chargeDir = e.facing;
        e.chargeSpeed = 335 + G.loop * 10;
        e.chargeHit = false;
        e.chargeBurn = true;
        addEffect({ kind: "ring", x: e.x, y: FLOOR, radius: 5, grow: 40, duration: 0.35, color: "#ff8a2e" });
        shakeScreen(0.45, 0.25);
        Audio.sfx("dash");
        break;
      }
      case "waterSurge": {
        e.state = "attack";
        e.stateT = 0.55;
        e.attackT = 1;
        spawnEnemyProjectile({
          type: "waterSurge",
          x: e.x + e.facing * 34,
          y: FLOOR - 16,
          vx: e.facing * 218,
          vy: 0,
          radius: 28,
          damage: e.atk * 0.92,
          life: 2.4,
          color: "#5fdfe8",
          playerSlow: { time: 3, mult: 0.5 }
        });
        addEffect({ kind: "ring", x: e.x, y: FLOOR, radius: 8, grow: 90, duration: 0.55, color: "#5fdfe8" });
        shakeScreen(0.55, 0.3);
        Audio.sfx("skill");
        break;
      }
      case "waterPrison": {
        e.state = "attack";
        e.stateT = 0.5;
        e.attackT = 1;
        for (let i = 0; i < 5; i++) {
          const angle = (i / 5) * Math.PI * 2;
          spawnHazard({
            x: clamp(p.x + Math.cos(angle) * 44, 40, WORLD_W - 40),
            y: FLOOR,
            radius: 27,
            delay: 0.42 + i * 0.05,
            damage: e.atk * 0.72,
            color: "#7fe4ef",
            kind: "water",
            playerSlow: { time: 3.2, mult: 0.5 }
          });
        }
        addEffect({ kind: "ring", x: p.x, y: FLOOR, radius: 8, grow: 88, duration: 0.6, color: "#7fe4ef" });
        shakeScreen(0.55, 0.3);
        Audio.sfx("portal");
        break;
      }
      case "gourdVortex": {
        e.state = "attack";
        e.stateT = 0.6;
        e.attackT = 1;
        spawnHazard({
          x: clamp(p.x, 50, WORLD_W - 50),
          y: FLOOR,
          radius: 74,
          delay: 0.8,
          damage: e.atk * 0.9,
          color: "#d8b34d",
          kind: "vortex",
          playerSlow: { time: 4, mult: 0.35 }
        });
        addEffect({ kind: "ring", x: e.x, y: FLOOR, radius: 8, grow: 120, duration: 0.65, color: "#d8b34d" });
        shakeScreen(0.55, 0.3);
        Audio.sfx("portal");
        break;
      }
      case "swordRain": {
        e.state = "attack";
        e.stateT = 0.55;
        e.attackT = 1;
        for (let i = -3; i <= 3; i++) {
          spawnEnemyProjectile({
            type: "sword",
            x: clamp(p.x + i * 28, 24, WORLD_W - 24),
            y: 18 + Math.abs(i) * 10,
            vx: 0,
            vy: 235,
            radius: 7,
            damage: e.atk * 0.7,
            life: 2.4,
            color: "#d9d2b2"
          });
        }
        addEffect({ kind: "ring", x: p.x, y: FLOOR, radius: 8, grow: 108, duration: 0.6, color: "#d9d2b2" });
        Audio.sfx("slash");
        break;
      }
      case "webTrap": {
        e.state = "attack";
        e.stateT = 0.5;
        e.attackT = 1;
        for (let i = -1; i <= 1; i++) {
          spawnHazard({
            x: clamp(p.x + i * 48, 40, WORLD_W - 40),
            y: FLOOR,
            radius: 32,
            delay: 0.4 + Math.abs(i) * 0.12,
            damage: e.atk * 0.65,
            color: "#c59be0",
            kind: "web",
            playerSlow: { time: 4.5, mult: 0.4 }
          });
        }
        addEffect({ kind: "ring", x: p.x, y: FLOOR, radius: 8, grow: 92, duration: 0.6, color: "#c59be0" });
        shakeScreen(0.45, 0.25);
        Audio.sfx("portal");
        break;
      }
      case "venomBeam": {
        e.state = "attack";
        e.stateT = 0.5;
        e.attackT = 1;
        spawnEnemyProjectile({
          type: "venomBeam",
          x: e.x + e.facing * 24,
          y: e.y - 24,
          vx: e.facing * 245,
          vy: 0,
          radius: 16,
          damage: e.atk * 0.82,
          life: 1.8,
          color: "#8ee06a",
          playerPoison: { dps: e.atk * 0.12, time: 5 }
        });
        addEffect({ kind: "ring", x: e.x, y: FLOOR, radius: 5, grow: 50, duration: 0.4, color: "#8ee06a" });
        Audio.sfx("skill");
        break;
      }
      case "windBlades": {
        e.state = "attack";
        e.stateT = 0.5;
        e.attackT = 1;
        const base = Math.atan2(p.y - 16 - (e.y - 22), p.x - e.x);
        for (let i = -2; i <= 2; i++) {
          const angle = base + i * 0.16;
          spawnEnemyProjectile({
            type: "windBlade",
            x: e.x + e.facing * 24,
            y: e.y - 22,
            vx: Math.cos(angle) * 225,
            vy: Math.sin(angle) * 225,
            radius: 9,
            damage: e.atk * 0.68,
            life: 2.2,
            color: "#a8d8e6"
          });
        }
        addEffect({ kind: "ring", x: e.x, y: FLOOR, radius: 6, grow: 76, duration: 0.5, color: "#a8d8e6" });
        Audio.sfx("slash");
        break;
      }
      case "skyDive": {
        e.state = "charge";
        e.stateT = 0.6;
        e.chargeDir = e.facing;
        e.chargeSpeed = 390 + G.loop * 12;
        e.chargeHit = false;
        e.chargeBurn = false;
        addEffect({ kind: "ring", x: e.x, y: FLOOR, radius: 6, grow: 54, duration: 0.4, color: "#e0c06a" });
        shakeScreen(0.55, 0.3);
        Audio.sfx("dash");
        break;
      }
      case "fanGust": {
        e.state = "attack";
        e.stateT = 0.55;
        e.attackT = 1;
        addEffect({ kind: "ring", x: e.x, y: FLOOR, radius: 10, grow: 170, duration: 0.7, color: "#8fcbb5" });
        if (Math.hypot(p.x - e.x, p.y - 16 - (e.y - 24)) < 215) {
          hitPlayer(e.atk * 1.05, e.x, { heavy: true, launch: true });
          p.kbVx = (p.x > e.x ? 1 : -1) * 240;
        }
        damageCloneInArea(e.x, e.y - 24, 170, e.atk * 0.8);
        shakeScreen(0.8, 0.4);
        Audio.sfx("boss");
        break;
      }
      case "flameSea": {
        e.state = "attack";
        e.stateT = 0.5;
        e.attackT = 1;
        for (let i = -2; i <= 2; i++) {
          spawnHazard({
            x: clamp(p.x + i * 56, 40, WORLD_W - 40),
            y: FLOOR,
            radius: 38,
            delay: 0.45 + Math.abs(i) * 0.08,
            damage: e.atk * 0.85,
            color: "#ff5a2b",
            kind: "flame",
            playerBurn: { dps: e.atk * 0.13, time: 4.5 }
          });
        }
        addEffect({ kind: "ring", x: e.x, y: FLOOR, radius: 10, grow: 150, duration: 0.7, color: "#ff5a2b" });
        shakeScreen(0.7, 0.35);
        Audio.sfx("skill");
        break;
      }
      default:
        e.state = "recover";
        e.stateT = 0.6;
        break;
    }
  }

  /* ------------------------------------------------------------------ */
  /* Damage / death / loot                                               */
  /* ------------------------------------------------------------------ */

  function breakBossPoise(e) {
    if (!e || e.poiseBroken) return;
    e.poise = 0;
    e.poiseBroken = true;
    e.poiseRegenRate = Math.max(1, e.maxPoise / 4);
    e.state = "broken";
    e.hurtT = 0;
    e.vx = 0;
    e.kx = 0;
    e.attackT = 0;
    showToast(`${e.name} · 韧性破裂`, "妖王陷入硬直，受到伤害提高，恢复前无法行动");
    addText("韧性破裂", e.x, e.y - e.h - 16, "#7fe0ff", 9, { life: 1.15, vy: -22 });
    addEffect({ kind: "ring", x: e.x, y: FLOOR, radius: 8, grow: 130, duration: 0.65, color: "#7fe0ff" });
    G.screenFlash = { color: "#7fe0ff", alpha: 0.16, t: 0.35, duration: 0.35 };
    Audio.sfx("boss");
    shakeScreen(0.75, 0.36);
  }

  function damageEnemy(e, rawDamage, opts = {}) {
    if (!e || e.dead) return;
    const dot = !!opts.dot;
    const crit = !!opts.crit;
    let dmg = Math.max(1, Math.round(rawDamage * rand(0.95, 1.05)));
    // 韧性：未破时减伤，破韧后增伤
    const hasPoise = e.boss && e.maxPoise > 0;
    let poiseDamage = 0;
    if (hasPoise) {
      if (e.poiseBroken) {
        dmg = Math.max(1, Math.round(dmg * 1.22));
      } else {
        dmg = Math.max(1, Math.round(dmg * 0.55));
        if (!dot) poiseDamage = Math.max(1, Math.round(rawDamage * 0.5));
      }
    }
    e.hp -= dmg;

    if (dot) {
      addText(`${dmg}`, e.x + rand(-5, 5), e.y - e.h - 7, "#ffb45d", 6, { life: 0.5, vy: -16 });
      if (e.hp <= 0) killEnemy(e);
      return;
    }

    if (poiseDamage > 0 && !e.poiseBroken && e.hp > 0) {
      e.poise -= poiseDamage;
      if (e.poise <= 0) breakBossPoise(e);
    }

    e.flash = 0.1;
    e.hurtT = Math.max(e.hurtT, e.boss ? 0.07 : 0.17);
    const dir = opts.dir === undefined ? Math.sign(e.x - G.player.x) || 1 : opts.dir;
    e.kx += dir * (e.boss ? 8 : e.heavy ? 18 : 42);

    if (!e.boss && !e.heavy && (e.state === "windup" || e.state === "attack") && chance(0.6)) {
      e.state = "hurt";
      e.stateT = 0.2;
    }

    const dmgColor = hasPoise ? (e.poiseBroken ? "#ffb35c" : "#cfe6ff") : "#fff0cf";
    addText(
      crit ? `暴击 ${dmg}` : `${dmg}`,
      e.x + rand(-4, 4),
      e.y - e.h - 7,
      crit ? "#ffd45f" : dmgColor,
      crit ? 10 : 8,
      { life: crit ? 0.95 : 0.8, vy: crit ? -28 : -20 }
    );
    addEffect({ kind: "hit", x: e.x + rand(-4, 4), y: e.y - e.h * 0.55, duration: 0.18, seed: rand(0, 6) });
    for (let i = 0; i < (crit ? 10 : 5); i++) {
      addParticle({
        x: e.x,
        y: e.y - e.h * 0.5,
        vx: rand(-70, 70),
        vy: rand(-80, 20),
        life: rand(0.15, 0.4),
        size: rand(1, 2),
        color: i % 2 ? "#ffe099" : "#e47648",
        gravity: 120
      });
    }
    Audio.sfx(crit ? "crit" : "hit");
    G.hitStop = Math.max(G.hitStop, e.boss ? 0.04 : 0.026);
    shakeScreen(crit ? 0.35 : 0.22, 0.12);

    if (G.player && G.player.stats.lifesteal > 0) {
      const heal = Math.max(1, Math.round(dmg * G.player.stats.lifesteal));
      if (G.player.hp < G.player.maxHp) {
        G.player.hp = Math.min(G.player.maxHp, G.player.hp + heal);
        addText(`+${heal}`, G.player.x, G.player.y - 46, "#83e1a5", 7, { life: 0.6 });
      }
    }

    G.combo++;
    G.comboTimer = 1.55;
    G.maxCombo = Math.max(G.maxCombo, G.combo);

    if (e.boss && !e.phaseTriggered && e.hp / e.maxHp <= e.phase2) {
      e.phaseTriggered = true;
      e.speed *= 1.16;
      e.atk *= 1.2;
      e.def *= 0.7;
      e.cooldown = 0.45;
      showToast(`${e.name} · 狂暴`, "妖王气息暴涨：伤害提高、防御下降、出手更快");
      addEffect({ kind: "ring", x: e.x, y: FLOOR, radius: 8, grow: 95, duration: 0.7, color: "#ff6b52" });
      G.screenFlash = { color: "#e83e3e", alpha: 0.18, t: 0.35, duration: 0.35 };
      Audio.sfx("boss");
      shakeScreen(0.75, 0.4);
    }

    if (e.hp <= 0) killEnemy(e);
  }

  function gainEssence(amount, x, y) {
    if (!amount || amount <= 0) return;
    G.essence += amount;
    addText(`+${amount} 悟道精魄`, x, y, "#7ee0c0", 7, { life: 1, vy: -20 });
    Audio.sfx("loot", "epic");
    markSave();
  }

  function gainTreasureJade(amount, x, y) {
    if (!amount || amount <= 0) return;
    G.treasureJade += amount;
    addText(`+${amount} 法宝灵玉`, x, y, "#8fe4ff", 7, { life: 1, vy: -20 });
    Audio.sfx("loot", "epic");
    markSave();
  }

  function killEnemy(e, opts = {}) {
    if (!e || e.dead) return;
    e.dead = true;
    e.state = "dead";
    e.deathT = 0;
    e.hp = 0;
    e.killed = true;

    G.killCount++;
    G.totalKills++;
    const p = G.player;
    const gold = Math.round(e.gold * (1 + (p ? p.stats.goldPct : 0)));
    G.gold += gold;
    G.goldEarned += gold;
    if (gold > 0) {
      addText(`+${gold}金`, e.x, e.y - e.h - 18, "#ffd76a", 7, { life: 0.8, vy: -24 });
      Audio.sfx("gold");
    }
    gainXp(e.exp);
    if (!e.boss && !opts.noLoot) {
      if (e.elite ? chance(0.35) : chance(0.04)) {
        gainEssence(1, e.x, e.y - e.h - 24);
      }
      if (e.elite ? chance(0.18) : chance(0.035)) {
        gainTreasureJade(1, e.x, e.y - e.h - 34);
      }
    }

    for (let i = 0; i < (e.boss ? 34 : 14); i++) {
      addParticle({
        x: e.x + rand(-e.w * 0.4, e.w * 0.4),
        y: e.y - rand(2, e.h),
        vx: rand(-80, 80),
        vy: rand(-110, -15),
        life: rand(0.3, 0.8),
        size: rand(1, 3),
        color: i % 3 === 0 ? "#ffde8c" : i % 2 ? "#dc7e4a" : "#5e5245",
        gravity: 150
      });
    }

    if (e.boss) {
      onBossDefeated(e);
    } else if (!opts.noLoot) {
      if (chance(e.elite ? 0.72 : e.dropChance * 0.55)) {
        const item = generateItem({ source: e.elite ? "elite" : "drop" });
        item.x = e.x;
        item.y = FLOOR - 8;
        spawnDrop({ kind: "equipment", item, x: e.x, y: FLOOR - 10, seed: rand(0, 10) });
      }
      if (chance(0.085)) spawnDrop({ kind: "health", x: e.x + rand(-10, 10), y: FLOOR - 8, seed: rand(0, 10) });
      if (chance(0.065)) spawnDrop({ kind: "mana", x: e.x + rand(-10, 10), y: FLOOR - 8, seed: rand(0, 10) });
      if (chance(0.022)) spawnDrop({ kind: "potion", x: e.x + rand(-10, 10), y: FLOOR - 8, seed: rand(0, 10) });
      if (chance(0.075)) spawnDrop({ kind: "herb", x: e.x + rand(-12, 12), y: FLOOR - 8, seed: rand(0, 10) });
    }

    if (G.combo >= 3) {
      addText(`${G.combo} 连击`, p.x, p.y - 54, "#ffd980", 8, { life: 0.8, vy: -18 });
    }
    markSave();
  }

  function onBossDefeated(e) {
    if (G.bossDefeated) return;
    G.bossDefeated = true;
    G.waveState = "victoryWait";
    G.waveTimer = 2.1;
    G.portalActive = false;
    G.projectiles = [];
    G.hazards = [];
    G.slowTimer = 0.9;
    G.screenFlash = { color: "#ffe0a0", alpha: 0.32, t: 0.55, duration: 0.55 };
    shakeScreen(1.0, 0.7);
    Audio.setScene(G.stage.biome, false);
    Audio.sfx("gong");

    // minions fall with their master
    for (const other of G.enemies) {
      if (other === e || other.dead) continue;
      other.dead = true;
      other.state = "dead";
      other.deathT = 0.25;
      for (let i = 0; i < 8; i++) {
        addParticle({
          x: other.x,
          y: other.y - other.h * 0.5,
          vx: rand(-50, 50),
          vy: rand(-60, 0),
          life: rand(0.2, 0.5),
          size: 1,
          color: "#d6b886",
          gravity: 60
        });
      }
    }

    // boss guaranteed spoils, straight into the bag
    const bonusGold = Math.round(e.gold * 0.9 * (1 + (G.player ? G.player.stats.goldPct : 0)));
    G.gold += bonusGold;
    const drops = [];
    for (let i = 0; i < 3; i++) {
      const item = generateItem({ source: "boss", ...(i === 0 ? { slot: "weapon" } : {}) });
      drops.push(item);
      acquireItem(item, { silent: true });
    }
    const essenceGain = 2 + G.stageIndex;
    G.essence += essenceGain;
    const jadeGain = 1 + (G.stageIndex >= 3 ? 1 : 0);
    G.treasureJade += jadeGain;
    const specialKey = ["purification", "heavenSeal", "chaosBell"][Math.min(2, Math.floor(G.stageIndex / 3))];
    G.artifactMats[specialKey] = (G.artifactMats[specialKey] || 0) + 1;
    const specialName = D.MATERIALS[specialKey].name;
    // 每三关妖王掉落一枚翅膀材料
    const wingKey = D.WING_MAT_ORDER[Math.min(D.WING_MAT_ORDER.length - 1, Math.floor(G.stageIndex / 3))];
    G.wingMats[wingKey] = (G.wingMats[wingKey] || 0) + 1;
    const wingName = D.MATERIALS[wingKey] ? D.MATERIALS[wingKey].name : "翅膀材料";
    const herbGain = 2 + Math.floor(G.stageIndex / 2);
    G.spiritHerb = (G.spiritHerb || 0) + herbGain;
    showWaveBanner("妖王伏诛", "大妖已灭 · 战利品已入行囊");
    showToast(
      `击破 ${e.name}`,
      `获得 ${bonusGold} 金币、${drops.length} 件装备、${essenceGain} 精魄、${jadeGain} 灵玉、1 枚${specialName}、1 枚${wingName}与 ${herbGain} 株灵药`
    );
    G.portal = { x: WORLD_W - 44, y: FLOOR };
    markSave();
    writeSave();
  }

  function spawnDrop(drop) {
    drop.t = 0;
    drop.life = 30;
    drop.seed = drop.seed === undefined ? rand(0, 10) : drop.seed;
    G.drops.push(drop);
  }

  function updateDrops(dt) {
    const p = G.player;
    if (!p) return;
    for (const d of G.drops) {
      d.t += dt;
      d.life -= dt;
      const dx = p.x - d.x;
      const dy = p.y - 10 - d.y;
      const dist = Math.hypot(dx, dy);
      if (d.t > 0.3 && dist < 58) {
        const pull = 1 - clamp(dist / 58, 0, 1);
        d.x += dx * pull * 5.5 * dt;
        d.y += dy * pull * 5.5 * dt;
      }
      if (dist < 13 || (d.t > 25 && dist < 40)) {
        pickupDrop(d);
        d.dead = true;
      }
    }
    G.drops = G.drops.filter((d) => !d.dead && d.life > 0);
  }

  function pickupDrop(d) {
    const p = G.player;
    if (!p) return;
    if (d.kind === "equipment" && d.item) {
      acquireItem(d.item);
      addEffect({ kind: "ring", x: d.x, y: d.y, radius: 2, grow: 22, duration: 0.35, color: getRarity(d.item.rarity).color });
    } else if (d.kind === "health") {
      const heal = Math.round(p.maxHp * 0.22);
      p.hp = Math.min(p.maxHp, p.hp + heal);
      addText(`+${heal}`, p.x, p.y - 38, "#8ce8ad", 8, { life: 0.8 });
      Audio.sfx("potion");
    } else if (d.kind === "mana") {
      const mana = Math.round(p.maxMp * 0.28);
      p.mp = Math.min(p.maxMp, p.mp + mana);
      addText(`+${mana} 法力`, p.x, p.y - 38, "#8bcdf2", 7, { life: 0.8 });
      Audio.sfx("ui");
    } else if (d.kind === "potion") {
      G.potions = Math.min(9, G.potions + 1);
      addText("回春丹 +1", p.x, p.y - 38, "#a9e7b8", 7, { life: 0.9 });
      Audio.sfx("loot", "uncommon");
    } else if (d.kind === "herb") {
      G.spiritHerb = (G.spiritHerb || 0) + 1;
      addText("灵药 +1", p.x, p.y - 38, "#8ce8ad", 8, { life: 0.9, vy: -16 });
      Audio.sfx("loot", "uncommon");
    } else if (d.kind === "wingMat" && d.mat) {
      G.wingMats[d.mat] = (G.wingMats[d.mat] || 0) + 1;
      const name = D.MATERIALS[d.mat] ? D.MATERIALS[d.mat].name : "翅膀材料";
      addText(`${name} +1`, p.x, p.y - 40, "#ffe08a", 8, { life: 1, vy: -18 });
      Audio.sfx("loot", "epic");
    }
  }

  /* ------------------------------------------------------------------ */
  /* Projectiles                                                         */
  /* ------------------------------------------------------------------ */

  function spawnHazard(hazard) {
    G.hazards.push({
      x: hazard.x,
      y: hazard.y === undefined ? FLOOR : hazard.y,
      radius: (hazard.radius || 34) * 1.3,
      delay: hazard.delay === undefined ? 0.55 : hazard.delay,
      maxDelay: hazard.delay === undefined ? 0.55 : hazard.delay,
      damage: hazard.damage || 10,
      color: hazard.color || "#ff633e",
      kind: hazard.kind || "flame",
      playerBurn: hazard.playerBurn || null,
      playerPoison: hazard.playerPoison || null,
      playerSlow: hazard.playerSlow || null,
      dead: false
    });
  }

  function updateHazards(dt) {
    const p = G.player;
    if (!p) return;
    for (const h of G.hazards) {
      if (h.dead) continue;
      h.delay -= dt;
      if (h.delay > 0) continue;
      if (Math.hypot(p.x - h.x, p.y - 16 - h.y) <= h.radius + 10) {
        const hit = hitPlayer(h.damage, h.x, { heavy: h.kind === "bone" });
        if (hit) {
          if (h.playerBurn) applyPlayerBurn(h.playerBurn.dps, h.playerBurn.time);
          if (h.playerPoison) applyPlayerPoison(h.playerPoison.dps, h.playerPoison.time);
          if (h.playerSlow) applyPlayerSlow(h.playerSlow.time, h.playerSlow.mult);
        }
      }
      damageCloneInArea(h.x, h.y, h.radius + 10, h.damage * 0.8);
      addEffect({ kind: "ring", x: h.x, y: h.y, radius: 4, grow: h.radius + 20, duration: 0.38, color: h.color });
      for (let i = 0; i < 16; i++) {
        addParticle({
          x: h.x + rand(-h.radius, h.radius),
          y: h.y - rand(0, 18),
          vx: rand(-70, 70),
          vy: rand(-110, -25),
          life: rand(0.25, 0.65),
          size: rand(1, 3),
          color: i % 2 ? h.color : h.kind === "bone" ? "#e8e2cf" : "#ffd36a",
          gravity: h.kind === "bone" ? 140 : -20
        });
      }
      shakeScreen(0.42, 0.22);
      h.dead = true;
    }
    G.hazards = G.hazards.filter((h) => !h.dead);
  }

  function spawnEnemyProjectile(proj) {
    const p = {
      x: proj.x,
      y: proj.y,
      vx: proj.vx || 0,
      vy: proj.vy || 0,
      gravity: proj.gravity || 0,
      type: proj.type || "darkOrb",
      damage: proj.damage || 5,
      radius: (proj.radius || 6) * 1.22,
      life: proj.life || 2,
      maxLife: proj.life || 2,
      color: proj.color || "#e4c47b",
      playerBurn: proj.playerBurn || null,
      playerPoison: proj.playerPoison || null,
      playerSlow: proj.playerSlow || null,
      dead: false
    };
    G.projectiles.push(p);
    return p;
  }

  function updateProjectiles(dt) {
    const p = G.player;
    if (!p) return;
    for (const proj of G.projectiles) {
      if (proj.dead) continue;
      proj.life -= dt;
      if (proj.type === "ghostFire") {
        const angle = Math.atan2(p.y - 16 - proj.y, p.x - proj.x);
        const speed = 132;
        proj.vx = lerp(proj.vx, Math.cos(angle) * speed, 0.055);
        proj.vy = lerp(proj.vy, Math.sin(angle) * speed, 0.055);
      }
      proj.vy += proj.gravity * dt;
      proj.x += proj.vx * dt;
      proj.y += proj.vy * dt;
      if (proj.life <= 0) {
        proj.dead = true;
        continue;
      }
      if (proj.type === "shockwave") {
        if (G.clone && Math.abs(G.clone.x - proj.x) < proj.radius + 10 && Math.abs(G.clone.y - FLOOR) < 34) {
          damageClone(proj.damage);
          proj.dead = true;
          continue;
        }
        if (Math.abs(p.x - proj.x) < proj.radius + 8 && Math.abs(p.y - FLOOR) < 26) {
          if (hitPlayer(proj.damage, proj.x, { heavy: false })) {
            if (proj.playerBurn) applyPlayerBurn(proj.playerBurn.dps, proj.playerBurn.time);
            if (proj.playerPoison) applyPlayerPoison(proj.playerPoison.dps, proj.playerPoison.time);
            if (proj.playerSlow) applyPlayerSlow(proj.playerSlow.time, proj.playerSlow.mult);
            proj.dead = true;
          }
        }
        continue;
      }
      if (proj.y >= FLOOR - 1 && proj.type === "boneArrow") {
        proj.dead = true;
        addEffect({ kind: "burst", x: proj.x, y: FLOOR, duration: 0.3, color: "#b7a88d", count: 4, spread: 9 });
        continue;
      }
      if (G.clone) {
        const cdx = G.clone.x - proj.x;
        const cdy = G.clone.y - 15 - proj.y;
        if (cdx * cdx + cdy * cdy < Math.pow(proj.radius + 10, 2)) {
          damageClone(proj.damage);
          proj.dead = true;
          continue;
        }
      }
      const dx = p.x - proj.x;
      const dy = p.y - 15 - proj.y;
      if (dx * dx + dy * dy < Math.pow(proj.radius + 8, 2)) {
        if (hitPlayer(proj.damage, proj.x, {})) {
          if (proj.playerBurn) applyPlayerBurn(proj.playerBurn.dps, proj.playerBurn.time);
          if (proj.playerPoison) applyPlayerPoison(proj.playerPoison.dps, proj.playerPoison.time);
          if (proj.playerSlow) applyPlayerSlow(proj.playerSlow.time, proj.playerSlow.mult);
          proj.dead = true;
        }
      }
      if (proj.x < -20 || proj.x > WORLD_W + 20 || proj.y > H + 20 || proj.y < -30) proj.dead = true;
    }
    G.projectiles = G.projectiles.filter((p) => !p.dead);
  }

  /* ------------------------------------------------------------------ */
  /* Rendering                                                           */
  /* ------------------------------------------------------------------ */

  function drawTelegraph(effect) {
    const progress = clamp(effect.t / effect.duration, 0, 1);
    const pulse = 0.5 + 0.5 * Math.sin(effect.t * 24);
    ctx.save();
    ctx.globalAlpha = 0.13 + progress * 0.24 + pulse * 0.04;
    if (effect.shape === "line") {
      const dir = effect.facing || 1;
      const x = dir > 0 ? effect.x : effect.x - effect.length;
      ctx.fillStyle = effect.color || "#e38a62";
      ctx.fillRect(Math.round(x), Math.round(effect.y - effect.width / 2), Math.round(effect.length), Math.round(effect.width));
      ctx.globalAlpha = 0.55 + pulse * 0.2;
      ctx.strokeStyle = effect.color || "#e38a62";
      ctx.lineWidth = 1;
      ctx.strokeRect(Math.round(x) + 0.5, Math.round(effect.y - effect.width / 2) + 0.5, Math.round(effect.length) - 1, Math.round(effect.width) - 1);
      const chevronX = x + ((effect.t * 190) % Math.max(1, effect.length));
      ctx.fillStyle = "#ffe9b4";
      for (let i = 0; i < 3; i++) {
        ctx.fillRect(Math.round(chevronX + i * 4), Math.round(effect.y - 4 + i), 2, 8 - i * 2);
      }
    } else {
      const r = effect.radius || 30;
      ctx.fillStyle = effect.color || "#e38a62";
      ctx.beginPath();
      ctx.ellipse(effect.x, effect.y, r, r * 0.3, 0, 0, TAU2);
      ctx.fill();
      ctx.globalAlpha = 0.58 + pulse * 0.22;
      ctx.strokeStyle = effect.color || "#e38a62";
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 3]);
      ctx.beginPath();
      ctx.ellipse(effect.x, effect.y, r - 2, (r - 2) * 0.3, 0, 0, TAU2);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.globalAlpha = 0.35 + pulse * 0.3;
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * TAU2 + effect.t * 0.5;
        ctx.fillStyle = "#ffe9b4";
        ctx.fillRect(effect.x + Math.cos(a) * r * 0.7 - 1, effect.y + Math.sin(a) * r * 0.2 - 1, 2, 4);
      }
    }
    ctx.restore();
  }

  function drawEffect(effect) {
    const progress = clamp(effect.t / effect.duration, 0, 1);
    if (effect.kind === "slash") {
      A.drawSlash(ctx, effect);
    } else if (effect.kind === "hit") {
      A.drawHitSpark(ctx, effect);
    } else if (effect.kind === "ring") {
      const radius = lerp(effect.radius || 2, (effect.radius || 2) + (effect.grow || 30), 1 - Math.pow(1 - progress, 2));
      ctx.save();
      ctx.globalAlpha = (1 - progress) * 0.8;
      ctx.strokeStyle = effect.color || "#ffd278";
      ctx.lineWidth = Math.max(1, 2.5 - progress * 1.5);
      ctx.beginPath();
      ctx.ellipse(effect.x, effect.y, radius, radius * 0.32, 0, 0, TAU2);
      ctx.stroke();
      ctx.globalAlpha = (1 - progress) * 0.24;
      ctx.fillStyle = effect.color || "#ffd278";
      ctx.beginPath();
      ctx.ellipse(effect.x, effect.y, radius * 0.85, radius * 0.25, 0, 0, TAU2);
      ctx.fill();
      ctx.restore();
    } else if (effect.kind === "burst") {
      ctx.save();
      ctx.globalAlpha = 1 - progress;
      const count = effect.count || 7;
      for (let i = 0; i < count; i++) {
        const ang = (i / count) * TAU2 + (effect.seed || 0);
        const r = (effect.spread || 20) * progress;
        ctx.fillStyle = effect.color || "#d8c8a2";
        ctx.fillRect(effect.x + Math.cos(ang) * r, effect.y + Math.sin(ang) * r * 0.5, 2, 2);
      }
      ctx.restore();
    } else if (effect.kind === "levelup") {
      ctx.save();
      const beamAlpha = Math.sin(progress * Math.PI) * 0.5;
      ctx.globalAlpha = beamAlpha;
      const gradient = ctx.createLinearGradient(effect.x, effect.y - 80, effect.x, effect.y + 10);
      gradient.addColorStop(0, "rgba(255,238,170,0)");
      gradient.addColorStop(0.5, "rgba(255,238,170,0.8)");
      gradient.addColorStop(1, "rgba(255,238,170,0)");
      ctx.fillStyle = gradient;
      ctx.fillRect(effect.x - 16, effect.y - 80, 32, 95);
      ctx.globalAlpha = (1 - progress) * 0.7;
      ctx.strokeStyle = "#ffe9a1";
      ctx.beginPath();
      ctx.ellipse(effect.x, effect.y, 24 + progress * 24, 7 + progress * 7, 0, 0, TAU2);
      ctx.stroke();
      ctx.restore();
    } else if (effect.kind === "rift") {
      A.drawSpawnRift(ctx, effect.x, effect.y, effect.t * 4, 1 - progress, effect.color);
    } else if (effect.kind === "afterimage") {
      ctx.save();
      ctx.globalAlpha = (1 - progress) * 0.28;
      A.drawWukong(ctx, effect.x, effect.y, effect.facing || 1, {
        state: effect.state || "dash",
        t: G.playerTime,
        combo: 1,
        attackProgress: 0,
        roll: effect.roll || 0,
        gear: playerAppearance()
      });
      ctx.restore();
    } else if (effect.kind === "staffSlam") {
      A.drawStaffSlamEffect(ctx, effect);
    } else if (effect.kind === "eye") {
      A.drawEyeBurst(ctx, effect);
    } else if (effect.kind === "eyeBeam") {
      A.drawEyeBeam(ctx, effect);
    } else if (effect.kind === "bottle") {
      A.drawBottleAura(ctx, effect);
    }
  }

  function drawWorldContent() {
    for (const effect of G.effects) {
      if (effect.kind === "telegraph") drawTelegraph(effect);
      else if (effect.kind === "rift") drawEffect(effect);
    }

    if (G.portalActive && G.portal) A.drawPortal(ctx, G.portal.x, G.portal.y, G.time, true);

    for (const d of G.drops) A.drawDrop(ctx, d, G.time);

    for (const h of G.hazards) {
      if (h.dead) continue;
      const prog = clamp(1 - h.delay / Math.max(0.001, h.maxDelay), 0, 1);
      const pulse = 0.5 + 0.5 * Math.sin(G.time * 22);
      ctx.save();
      ctx.globalAlpha = 0.16 + prog * 0.22 + pulse * 0.05;
      ctx.fillStyle = h.color;
      ctx.beginPath();
      ctx.ellipse(h.x, h.y, h.radius, h.radius * 0.32, 0, 0, TAU2);
      ctx.fill();
      ctx.globalAlpha = 0.7;
      ctx.strokeStyle = h.color;
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 3]);
      ctx.beginPath();
      ctx.ellipse(h.x, h.y, h.radius - 2, (h.radius - 2) * 0.32, 0, 0, TAU2);
      ctx.stroke();
      ctx.setLineDash([]);
      if (h.kind === "bone") {
        for (let i = 0; i < 5; i++) {
          const a = (i / 5) * TAU2 + h.x;
          const bx = h.x + Math.cos(a) * h.radius * 0.55;
          A.rect(ctx, bx - 1, h.y - 10 - Math.sin(a) * 5, 2, 10, "#d8d2bd");
        }
      } else if (h.kind === "water") {
        ctx.save();
        ctx.globalAlpha = 0.35 + prog * 0.25;
        ctx.strokeStyle = h.color;
        ctx.lineWidth = 1;
        for (let i = 0; i < 3; i++) {
          ctx.beginPath();
          ctx.ellipse(h.x, h.y - i * 5, h.radius * (0.45 + i * 0.16), 3, 0, 0, TAU2);
          ctx.stroke();
        }
        ctx.restore();
      } else if (h.kind === "vortex") {
        ctx.save();
        ctx.globalAlpha = 0.45 + prog * 0.3;
        ctx.strokeStyle = h.color;
        ctx.lineWidth = 2;
        for (let i = 0; i < 3; i++) {
          ctx.beginPath();
          ctx.ellipse(h.x, h.y - 8 - i * 7, h.radius * (0.3 + i * 0.16), 5, G.time * (2 + i), 0, TAU2 * 0.82);
          ctx.stroke();
        }
        ctx.restore();
      } else if (h.kind === "web") {
        ctx.save();
        ctx.globalAlpha = 0.4 + prog * 0.25;
        ctx.strokeStyle = h.color;
        ctx.lineWidth = 1;
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * TAU2 + G.time * 0.3;
          A.line(ctx, h.x, h.y - 2, h.x + Math.cos(a) * h.radius, h.y - 2 + Math.sin(a) * h.radius * 0.4, h.color, 1);
        }
        for (let r = 0.35; r <= 1; r += 0.3) {
          ctx.beginPath();
          ctx.ellipse(h.x, h.y - 2, h.radius * r, h.radius * r * 0.4, 0, 0, TAU2);
          ctx.stroke();
        }
        ctx.restore();
      } else {
        A.drawFlame(ctx, h.x + Math.sin(G.time * 6 + h.x) * 4, h.y - 4, 0.8, G.time);
      }
      ctx.restore();
    }

    const sorted = G.enemies.slice().sort((a, b) => a.y - b.y);
    for (const e of sorted) {
      if (e.spawnT > 0) {
        A.drawSpawnRift(
          ctx,
          e.x,
          e.flying ? e.y + 6 : FLOOR,
          e.animTime,
          1 - clamp(e.spawnT / 0.6, 0, 1),
          e.elite ? "#f3cc67" : "#b471df"
        );
        continue;
      }
      A.drawEnemy(ctx, e, G.time);
      if ((e.stunT || 0) > 0) {
        A.drawText(ctx, "镇", e.x, e.y - e.h - 12, { size: 7, color: "#ffe08a", strokeWidth: 2 });
      }
      if ((e.burnTime || 0) > 0 && e.burnStacks > 0) {
        A.drawFlame(ctx, e.x - e.w * 0.3, e.y - e.h * 0.35, 0.55, G.time + e.x * 0.05);
        A.drawFlame(ctx, e.x + e.w * 0.28, e.y - e.h * 0.5, 0.65, G.time + 1.7 + e.x * 0.03);
        if (e.burnStacks > 1) {
          A.drawText(ctx, `×${e.burnStacks}`, e.x + e.w * 0.5, e.y - e.h - 15, {
            size: 5,
            color: "#ffb45d",
            strokeWidth: 2
          });
        }
      }
    }

    for (const effect of G.effects) {
      if (effect.kind === "afterimage") drawEffect(effect);
    }

    if (G.clone && !G.clone.dead) A.drawClone(ctx, G.clone, G.time, playerAppearance());

    const p = G.player;
    if (p && !p.dead && p.wing) {
      A.drawWings(ctx, p.x, p.y, p.facing, G.time, p.wing, { state: p.state });
    }
    if (p && !p.dead && p.activeArtifact && p.state !== "firespin") {
      const ax = p.x - p.facing * 15;
      const ay = p.y - 30 + Math.sin(G.time * 2.6) * 2;
      A.drawArtifactModel(ctx, p.activeArtifact, ax, ay, G.time + 0.7, 1);
    }
    if (p) {
      if (p.state === "firespin") {
        A.drawFireTornado(ctx, p.x, p.y, 1, G.time, 1);
      } else {
        ctx.save();
        if (p.invuln > 0 && Math.floor(G.time * 24) % 2 === 0 && !p.dead) ctx.globalAlpha = 0.55;
        if (p.goldenT > 0) {
          ctx.translate(p.x, p.y);
          ctx.scale(1.35, 1.35);
          ctx.translate(-p.x, -p.y);
        }
        A.drawWukong(ctx, p.x, p.y, p.facing, {
          state: p.state,
          t: G.playerTime,
          combo: p.attack.combo || 1,
          attackProgress: p.attack.active ? clamp(p.attack.t / p.attack.dur, 0, 1) : 0,
          roll: p.rollT > 0 ? 1 - p.rollT / (p.rollDuration || ROLL_TIME) : 0,
          skillId: p.skill.active ? p.skill.id : null,
          skillProgress: p.skill.active ? clamp(p.skill.t / Math.max(0.001, p.skill.dur), 0, 1) : 0,
          gear: playerAppearance(),
          flash: p.flash > 0,
          golden: p.goldenT > 0
        });
        ctx.restore();
        if (p.goldenT > 0) {
          A.halo(ctx, p.x, p.y - 22, 34, "#ffd75e", 0.16 + Math.sin(G.time * 6) * 0.05);
          A.halo(ctx, p.x, p.y - 12, 20, "#fff3b8", 0.12);
        }
      }
      if (p.regenT > 0) {
        A.halo(ctx, p.x, p.y - 16, 20, "#79e6c1", 0.1 + Math.sin(G.time * 4) * 0.03);
      }
      let statusY = p.y - 52;
      if (p.goldenT > 0) {
        A.drawText(ctx, `法相金身 ${p.goldenT.toFixed(1)}s`, p.x, statusY, { size: 6, color: "#ffe08a", strokeWidth: 2 });
        statusY -= 8;
      }
      if (p.debuffBurnT > 0) {
        A.drawText(ctx, `灼烧 ${p.debuffBurnT.toFixed(1)}s`, p.x, statusY, { size: 5, color: "#ff8a55", strokeWidth: 2 });
        statusY -= 8;
      }
      if (p.debuffPoisonT > 0) {
        A.drawText(ctx, `中毒 ${p.debuffPoisonT.toFixed(1)}s`, p.x, statusY, { size: 5, color: "#9be66a", strokeWidth: 2 });
        statusY -= 8;
      }
      if (p.debuffSlowT > 0) {
        A.drawText(ctx, `迟缓 ${p.debuffSlowT.toFixed(1)}s`, p.x, statusY, { size: 5, color: "#7fd8e8", strokeWidth: 2 });
        statusY -= 8;
      }
      if (p.regenT > 0) {
        A.drawText(ctx, `甘露 ${p.regenT.toFixed(1)}s`, p.x, statusY, { size: 5, color: "#8ff0d4", strokeWidth: 2 });
        statusY -= 8;
      }
      const titleDef = D.TITLES[p.title];
      if (titleDef && titleDef.id !== "none") {
        const label = titleDef.name;
        const plateW = label.length * 7 + 14;
        const plateH = 13;
        const px0 = Math.round(p.x - plateW / 2);
        const py0 = Math.round(statusY - plateH + 2);
        ctx.save();
        ctx.globalAlpha = 0.86;
        A.rect(ctx, px0, py0, plateW, plateH, "rgba(12,10,18,0.84)");
        ctx.restore();
        A.rect(ctx, px0, py0, plateW, 1, "#f0c85a");
        A.rect(ctx, px0, py0 + plateH - 1, plateW, 1, "#8a6420");
        A.rect(ctx, px0, py0, 1, plateH, "#f0c85a");
        A.rect(ctx, px0 + plateW - 1, py0, 1, plateH, "#8a6420");
        A.rect(ctx, px0 + 1, py0 + 1, plateW - 2, 1, "rgba(255,220,120,0.18)");
        A.rect(ctx, px0 + 2, py0 + 2, 1, plateH - 4, "rgba(255,220,120,0.25)");
        A.drawText(ctx, label, p.x, py0 + plateH / 2 + 0.5, { size: 7, color: "#ffe8a8", weight: 800, strokeWidth: 2 });
      }
    }

    for (const proj of G.projectiles) A.drawProjectile(ctx, proj, G.time);

    for (const effect of G.effects) {
      if (effect.kind === "telegraph" || effect.kind === "rift" || effect.kind === "afterimage") continue;
      drawEffect(effect);
    }

    for (const particle of G.particles) {
      const alpha = clamp(1 - particle.t / particle.life, 0, 1);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = particle.color || "#fff";
      const size = Math.max(1, Math.round(particle.size || 1));
      ctx.fillRect(Math.round(particle.x), Math.round(particle.y), size, size);
    }
    ctx.globalAlpha = 1;

    for (const t of G.texts) {
      const alpha = clamp(1 - t.t / t.life, 0, 1);
      ctx.save();
      ctx.globalAlpha = alpha;
      A.drawText(ctx, t.text, t.x, t.y, {
        size: t.size,
        color: t.color,
        strokeWidth: t.size > 8 ? 4 : 3
      });
      if (t.second) {
        A.drawText(ctx, t.second, t.x, t.y + 11, { size: 6, color: "#fff3c9", strokeWidth: 2 });
      }
      ctx.restore();
    }
  }

  function drawBackground() {
    const cam = G.camera.x;
    const biome = G.stage ? G.stage.biome : "mountain";
    if (biome === "cave") {
      A.drawCaveBackground(ctx, cam, G.time);
      A.drawGround(ctx, "cave", cam, G.time);
    } else if (biome === "bone") {
      A.drawBoneBackground(ctx, cam, G.time);
      A.drawGround(ctx, "bone", cam, G.time);
    } else if (biome === "fire") {
      A.drawFireBackground(ctx, cam, G.time);
      A.drawGround(ctx, "fire", cam, G.time);
    } else if (biome === "river") {
      A.drawRiverBackground(ctx, cam, G.time);
      A.drawGround(ctx, "river", cam, G.time);
    } else if (biome === "web") {
      A.drawWebBackground(ctx, cam, G.time);
      A.drawGround(ctx, "web", cam, G.time);
    } else if (biome === "sky") {
      A.drawSkyBackground(ctx, cam, G.time);
      A.drawGround(ctx, "sky", cam, G.time);
    } else {
      A.drawMountainRange(ctx, cam, G.time);
      A.drawGround(ctx, "mountain", cam, G.time);
    }
  }

  const TAU2 = Math.PI * 2;

  function render() {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, W, H);
    if (G.mode === "boot") return;

    if (G.mode === "title") {
      renderTitleScene();
      return;
    }

    const shakeX = G.camera.shake > 0 ? (Math.random() * 2 - 1) * G.camera.shake * 5 : 0;
    const shakeY = G.camera.shake > 0 ? (Math.random() * 2 - 1) * G.camera.shake * 3 : 0;
    ctx.save();
    ctx.translate(Math.round(shakeX), Math.round(shakeY));
    drawBackground();
    A.drawPlatforms(ctx, G.platforms, G.camera.x, G.stage ? G.stage.biome : "mountain", G.time);
    ctx.save();
    ctx.translate(-Math.round(G.camera.x), 0);
    drawWorldContent();
    ctx.restore();
    ctx.restore();

    if (G.screenFlash) {
      const f = G.screenFlash;
      const alpha = f.alpha * clamp(f.t / f.duration, 0, 1);
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = f.color;
      ctx.fillRect(0, 0, W, H);
      ctx.restore();
    }

    const p = G.player;
    if (p && !p.dead && (G.mode === "playing" || G.mode === "inventory") && p.hp / p.maxHp < 0.28) {
      const low = 1 - p.hp / p.maxHp;
      const pulse = 0.5 + Math.sin(G.time * 6) * 0.5;
      const grad = ctx.createRadialGradient(W / 2, H / 2, H * 0.22, W / 2, H / 2, W * 0.62);
      grad.addColorStop(0, "rgba(0,0,0,0)");
      grad.addColorStop(1, `rgba(152,22,30,${0.12 + low * 0.2 + pulse * 0.04})`);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, W, H);
    }
  }

  function renderTitleScene() {
    const cam = 22 + Math.sin(G.titleTime * 0.07) * 34;
    A.drawMountainRange(ctx, cam, G.titleTime);
    A.drawGround(ctx, "mountain", cam, G.titleTime);
    A.drawPlatforms(ctx, D.STAGES[0].platforms, cam, "mountain", G.titleTime);
    ctx.save();
    ctx.translate(-cam, 0);
    // hero stands on the left, mostly outside the title overlay's brightest area
    A.drawWukong(ctx, 84, FLOOR, 1, { state: "idle", t: G.titleTime, combo: 1, attackProgress: 0 });
    // a lone peach tree frames the composition
    A.drawPeachTree(ctx, 402, FLOOR + 1, 1.45, "#6f4257", G.titleTime);
    ctx.restore();

    // foreground petals
    ctx.save();
    for (let i = 0; i < 18; i++) {
      const x = ((i * 71 + G.titleTime * (6 + (i % 4) * 2)) % (W + 30)) - 15;
      const y = ((i * 43 + G.titleTime * 11) % (H - 30)) + 8;
      ctx.globalAlpha = 0.25 + (i % 5) * 0.08;
      ctx.fillStyle = i % 3 ? "#f0b5c4" : "#ffe0c1";
      ctx.fillRect(Math.round(x), Math.round(y), 2, 1);
    }
    ctx.restore();
  }

  /* ------------------------------------------------------------------ */
  /* Main loop                                                           */
  /* ------------------------------------------------------------------ */

  function updateGame(dt) {
    const p = G.player;
    if (!p) return;
    const real = dt;
    let step = dt;
    if (G.hitStop > 0) {
      G.hitStop = Math.max(0, G.hitStop - real);
      step *= 0.08;
    }
    if (G.slowTimer > 0) {
      G.slowTimer = Math.max(0, G.slowTimer - real);
      step *= 0.42;
    }
    G.playerTime += step;

    if (G.comboTimer > 0) {
      G.comboTimer -= step;
      if (G.comboTimer <= 0) G.combo = 0;
    }

    updatePlayer(step);
    updateClone(step);
    updateEnemies(step);
    updateProjectiles(step);
    updateHazards(step);
    updateDrops(step);
    updateEffects(step);
    updateStageFlow(step);
    updateCamera(step);

    if (G.hintTimer > 0) {
      G.hintTimer -= real;
      if (G.hintTimer < 1.2) dom.hintBar.classList.add("fade");
      if (G.hintTimer <= 0) hide(dom.hintBar);
    }

    if (G.saveDirty) {
      G.saveTimer -= real;
      if (G.saveTimer <= 0) writeSave();
    }

    if (G.hitStop <= 0 && G.playerTime > 0 && Math.random() < 0.45) {
      // tiny ambient dust motes
      addParticle({
        x: G.camera.x + rand(0, W),
        y: rand(155, FLOOR),
        vx: rand(-4, 4),
        vy: rand(-8, -2),
        life: rand(0.8, 1.8),
        size: 1,
        color: G.stage && G.stage.biome === "cave" ? "#b98a6e" : G.stage && G.stage.biome === "bone" ? "#8bbfae" : "#e8cf9b",
        gravity: -1
      });
    }
  }

  function updateDying(dt) {
    const p = G.player;
    if (!p) return;
    p.animTime += dt;
    updateEffects(dt);
    updateCamera(dt);
    G.deathTimer -= dt;
    if (G.deathTimer <= 0) showDeathScreen();
  }

  function updateAmbient(dt) {
    if (G.screenFlash) {
      G.screenFlash.t -= dt;
      if (G.screenFlash.t <= 0) G.screenFlash = null;
    }
    if (G.camera.shakeTime > 0) {
      G.camera.shakeTime -= dt;
      if (G.camera.shakeTime <= 0) G.camera.shake = 0;
    }
  }

  function frame(now) {
    requestAnimationFrame(frame);
    const raw = (now - lastFrame) / 1000;
    lastFrame = now;
    const dt = clamp(raw, 0, 0.033);
    G.time += dt;

    if (G.mode === "playing") {
      updateGame(dt);
    } else if (G.mode === "dying") {
      updateDying(dt);
    } else if (G.mode === "title") {
      G.titleTime += dt;
    } else if (G.mode === "inventory") {
      G.playerTime += dt;
      G.previewTick += dt;
      if (G.previewTick > 0.1 && G.player) {
        G.previewTick = 0;
        A.drawCharacterPreview(dom.characterPreview, { t: G.time, state: G.player.dead ? "dead" : "idle" });
      }
    }

    updateAmbient(dt);
    render();

    if (G.mode !== "title" && G.mode !== "boot" && G.player) updateHUD();
  }

  /* ------------------------------------------------------------------ */
  /* Init                                                                */
  /* ------------------------------------------------------------------ */

  function init() {
    A.drawPortrait(dom.portrait);
    G.stage = D.STAGES[0];
    G.platforms = G.stage.platforms.map((p) => ({ ...p }));
    G.player = makePlayer();
    recalcStats({ full: true });
    const save = readSave();
    if (save) G.muted = !!save.muted;
    bindUI();
    bindInput();
    detectTouch();
    setMuteUI();
    refreshSaveButton();
    hideAllScreens();
    show(dom.title);
    hide(dom.hud);
    hide(dom.touch);
    hide(dom.stageBanner);
    hide(dom.bossPanel);
    hide(dom.interactPrompt);
    G.mode = "title";
    lastFrame = performance.now();
    requestAnimationFrame(frame);

    window.setTimeout(() => {
      dom.loading.classList.add("done");
      window.setTimeout(() => dom.loading.remove(), 500);
    }, 420);

    window.__QTXS = {
      G,
      get player() {
        return G.player;
      },
      startNewGame,
      continueGame,
      writeSave,
      loadStage,
      startWave,
      spawnEnemy,
      spawnBoss,
      tryCastSkill,
      summonClone,
      gainEssence,
      generateItem,
      acquireItem,
      gainXp,
      damageEnemy,
      killEnemy,
      hitPlayer,
      beginDeath,
      showDeathScreen,
      reviveAtStage,
      recalcStats,
      salvageBelowEquipped,
      autoEquipBest,
      updateHUD,
      renderInventory,
      completeStage,
      showVictory
    };
  }

  init();
})();
