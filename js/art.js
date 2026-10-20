(function () {
  "use strict";

  const { W, H, FLOOR, WORLD_W, clamp, lerp } = window.GameData;
  const TAU = Math.PI * 2;

  /* ------------------------------------------------------------------ */
  /* Pixel helpers                                                       */
  /* ------------------------------------------------------------------ */

  function rect(ctx, x, y, w, h, color) {
    ctx.fillStyle = color;
    ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
  }

  function px(ctx, x, y, color) {
    rect(ctx, x, y, 1, 1, color);
  }

  function parseHex(color) {
    if (typeof color !== "string" || color[0] !== "#" || color.length < 7) return null;
    return [parseInt(color.slice(1, 3), 16), parseInt(color.slice(3, 5), 16), parseInt(color.slice(5, 7), 16)];
  }

  function shade(color, factor = 0.68) {
    const rgb = parseHex(color);
    if (!rgb) return color;
    return `rgb(${Math.round(rgb[0] * factor)},${Math.round(rgb[1] * factor)},${Math.round(rgb[2] * factor)})`;
  }

  function tint(color, amount = 0.35, target = [255, 255, 255]) {
    const rgb = parseHex(color);
    if (!rgb) return color;
    return `rgb(${Math.round(rgb[0] + (target[0] - rgb[0]) * amount)},${Math.round(rgb[1] + (target[1] - rgb[1]) * amount)},${Math.round(rgb[2] + (target[2] - rgb[2]) * amount)})`;
  }

  // 法相金身：把任意颜色映射到金色梯度
  function goldify(color) {
    const rgb = parseHex(color);
    if (!rgb) return "#ffd75e";
    const lum = rgb[0] * 0.3 + rgb[1] * 0.59 + rgb[2] * 0.11;
    if (lum < 55) return "#6b4a0e";
    if (lum < 105) return "#b8860f";
    if (lum < 155) return "#e8b32a";
    if (lum < 205) return "#ffd75e";
    return "#fff3b8";
  }

  function circle(ctx, cx, cy, r, color) {
    ctx.fillStyle = color;
    cx = Math.round(cx);
    cy = Math.round(cy);
    r = Math.max(1, Math.round(r));
    for (let y = -r; y <= r; y++) {
      const span = Math.floor(Math.sqrt(Math.max(0, r * r - y * y)));
      ctx.fillRect(cx - span, cy + y, span * 2 + 1, 1);
    }
  }

  function ellipse(ctx, cx, cy, rx, ry, color) {
    ctx.fillStyle = color;
    cx = Math.round(cx);
    cy = Math.round(cy);
    for (let y = -ry; y <= ry; y++) {
      const span = Math.floor(rx * Math.sqrt(Math.max(0, 1 - (y * y) / (ry * ry))));
      ctx.fillRect(cx - span, cy + y, span * 2 + 1, 1);
    }
  }

  function line(ctx, x0, y0, x1, y1, color, thickness = 1) {
    const steps = Math.max(1, Math.ceil(Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0))));
    ctx.fillStyle = color;
    for (let i = 0; i <= steps; i++) {
      const x = Math.round(x0 + ((x1 - x0) * i) / steps);
      const y = Math.round(y0 + ((y1 - y0) * i) / steps);
      ctx.fillRect(x - ((thickness - 1) >> 1), y - ((thickness - 1) >> 1), thickness, thickness);
    }
  }

  function polygon(ctx, points, color) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(Math.round(points[0][0]), Math.round(points[0][1]));
    for (let i = 1; i < points.length; i++) ctx.lineTo(Math.round(points[i][0]), Math.round(points[i][1]));
    ctx.closePath();
    ctx.fill();
  }

  function halo(ctx, x, y, r, color, alpha) {
    ctx.save();
    ctx.globalAlpha = alpha;
    circle(ctx, x, y, r, color);
    circle(ctx, x, y, Math.max(1, r * 0.65), color);
    ctx.restore();
  }

  function shadow(ctx, x, y, width, alpha = 0.28) {
    ctx.save();
    ctx.globalAlpha = alpha;
    ellipse(ctx, x, y + 1, width, Math.max(2, width * 0.25), "#05060b");
    ctx.restore();
  }

  function hash(n) {
    const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
    return x - Math.floor(x);
  }

  function softLine(ctx, x0, y0, x1, y1, color, thickness = 1, alpha = 1) {
    ctx.save();
    ctx.globalAlpha = alpha;
    line(ctx, x0, y0, x1, y1, color, thickness);
    ctx.restore();
  }

  function drawText(ctx, text, x, y, opts = {}) {
    ctx.save();
    ctx.font = `${opts.weight || 700} ${opts.size || 8}px "Microsoft YaHei", "Segoe UI", sans-serif`;
    ctx.textAlign = opts.align || "center";
    ctx.textBaseline = "middle";
    if (opts.stroke !== false) {
      ctx.lineWidth = opts.strokeWidth || 2.5;
      ctx.lineJoin = "round";
      ctx.strokeStyle = opts.stroke || "rgba(8,8,14,0.92)";
      ctx.strokeText(text, Math.round(x), Math.round(y));
    }
    ctx.fillStyle = opts.color || "#fff";
    ctx.fillText(text, Math.round(x), Math.round(y));
    ctx.restore();
  }

  /* ------------------------------------------------------------------ */
  /* Backgrounds                                                         */
  /* ------------------------------------------------------------------ */

  function drawRidge(ctx, baseY, amp, color, seed, shift, step = 26) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(-30, H);
    for (let x = -30; x <= W + 40; x += step) {
      const s = x + shift;
      const n1 = Math.sin(s * 0.017 + seed) * amp;
      const n2 = Math.sin(s * 0.041 + seed * 1.8) * amp * 0.36;
      const n3 = (hash(x * 0.31 + seed) - 0.5) * amp * 0.24;
      ctx.lineTo(x, baseY + n1 + n2 + n3);
    }
    ctx.lineTo(W + 40, H);
    ctx.lineTo(-30, H);
    ctx.closePath();
    ctx.fill();
  }

  function drawCloud(ctx, x, y, scale, color, alpha) {
    ctx.save();
    ctx.globalAlpha = alpha;
    const s = scale;
    rect(ctx, x, y, 22 * s, 4 * s, color);
    rect(ctx, x + 4 * s, y - 3 * s, 12 * s, 4 * s, color);
    rect(ctx, x + 9 * s, y - 5 * s, 7 * s, 4 * s, color);
    rect(ctx, x - 4 * s, y + 2 * s, 11 * s, 3 * s, color);
    rect(ctx, x + 17 * s, y + 2 * s, 10 * s, 3 * s, color);
    ctx.restore();
  }

  function drawMountainRange(ctx, cam, t) {
    const sky = ctx.createLinearGradient(0, 0, 0, FLOOR);
    sky.addColorStop(0, "#0b1e35");
    sky.addColorStop(0.36, "#1f4b61");
    sky.addColorStop(0.64, "#5f776f");
    sky.addColorStop(0.82, "#ba8d69");
    sky.addColorStop(1, "#e3b47e");
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W, FLOOR);

    for (let y = 0; y < FLOOR; y += 9) {
      ctx.globalAlpha = 0.025 + hash(y) * 0.025;
      rect(ctx, 0, y, W, 3, y > 130 ? "#ffdcae" : "#8ee8ff");
    }
    ctx.globalAlpha = 1;

    // sun
    const sx = 374 - cam * 0.035;
    halo(ctx, sx, 53, 31, "#ffdda0", 0.1);
    halo(ctx, sx, 53, 23, "#ffe1a8", 0.17);
    circle(ctx, sx, 53, 16, "#ffe5b7");
    circle(ctx, sx - 4, 49, 4, "#ffd18a");
    circle(ctx, sx + 6, 58, 3, "#f3c88f");

    // clouds
    for (let i = 0; i < 7; i++) {
      const drift = t * (3 + i * 0.35);
      const x = ((i * 83 + 17 + drift - cam * 0.07) % 580) - 55;
      const y = 34 + (i % 4) * 23;
      drawCloud(ctx, x, y, 0.8 + (i % 3) * 0.25, i % 2 ? "#f4d6b4" : "#b7d9d2", 0.17);
    }

    // twin rocks with a thin waterfall between them
    const wx = 398 - cam * 0.12;
    polygon(ctx, [[wx - 32, 172], [wx - 29, 128], [wx - 21, 113], [wx - 13, 109], [wx - 8, 121], [wx - 6, 151], [wx + 1, 172]], "#1c3b43");
    polygon(ctx, [[wx + 7, 171], [wx + 8, 120], [wx + 16, 109], [wx + 27, 117], [wx + 33, 139], [wx + 31, 173]], "#1c3b43");
    polygon(ctx, [[wx - 23, 127], [wx - 18, 117], [wx - 12, 115], [wx - 10, 153], [wx - 17, 170], [wx - 21, 151]], "#2e5f5b");
    polygon(ctx, [[wx + 14, 121], [wx + 22, 119], [wx + 28, 132], [wx + 26, 166], [wx + 17, 169]], "#2e5f5b");
    ctx.save();
    ctx.globalAlpha = 0.35;
    rect(ctx, wx - 4, 114, 12, 55, "#91ccc8");
    ctx.globalAlpha = 0.6;
    for (let i = 0; i < 9; i++) {
      const yy = 116 + ((i * 11 + t * 38) % 52);
      rect(ctx, wx - 3 + (i % 4) * 3, yy, 1 + (i % 2), 5, "#e0fbf4");
    }
    ctx.globalAlpha = 0.3;
    ellipse(ctx, wx + 1, 169, 14, 4, "#d9fbf2");
    ctx.restore();

    // distant ridges
    drawRidge(ctx, 134, 24, "#17394a", 1.7, -cam * 0.08, 31);
    drawRidge(ctx, 158, 20, "#245253", 3.1, -cam * 0.15, 27);
    drawRidge(ctx, 182, 17, "#365f56", 5.3, -cam * 0.24, 24);

    // mist
    ctx.save();
    for (let i = 0; i < 4; i++) {
      ctx.globalAlpha = 0.07;
      ellipse(ctx, 80 + i * 130 + Math.sin(t * 0.2 + i) * 12, 163 + i * 4, 80, 7, "#e5dfc9");
    }
    ctx.restore();

    // peach trees on middle planes
    const trees = [
      { x: 38, y: 214, s: 1.18, layer: 0.36, tone: "#6f4257" },
      { x: 232, y: 206, s: 0.94, layer: 0.5, tone: "#784558" },
      { x: 626, y: 212, s: 1.08, layer: 0.42, tone: "#6b3f51" },
      { x: 846, y: 205, s: 0.9, layer: 0.55, tone: "#7b4a5d" }
    ];
    for (const tr of trees) {
      const x = tr.x - cam * tr.layer;
      if (x < -80 || x > W + 80) continue;
      drawPeachTree(ctx, x, tr.y, tr.s, tr.tone, t);
    }

    // near glow
    const glow = ctx.createLinearGradient(0, 180, 0, FLOOR);
    glow.addColorStop(0, "rgba(255,213,155,0)");
    glow.addColorStop(1, "rgba(255,213,155,0.15)");
    ctx.fillStyle = glow;
    ctx.fillRect(0, 180, W, FLOOR - 180);

    // petals
    ctx.save();
    for (let i = 0; i < 28; i++) {
      const speed = 7 + hash(i + 2) * 12;
      const x = ((hash(i + 8) * W + Math.sin(t * 0.7 + i) * 14 - cam * 0.25) % W + W) % W;
      const y = ((hash(i + 20) * 245 + t * speed) % 240) + 2;
      ctx.globalAlpha = 0.22 + hash(i) * 0.5;
      rect(ctx, x, y, 2, 1, i % 3 ? "#f1b6c4" : "#ffd6d9");
    }
    ctx.restore();
  }

  function drawPeachTree(ctx, x, y, s, tone, t) {
    const sway = Math.sin(t * 0.7 + x * 0.05) * 1.3;
    rect(ctx, x - 2 * s, y - 34 * s, 4 * s, 34 * s, "#4a2b29");
    line(ctx, x, y - 25 * s, x - 12 * s + sway, y - 41 * s, "#4a2b29", 2);
    line(ctx, x, y - 29 * s, x + 13 * s + sway, y - 45 * s, "#4a2b29", 2);
    line(ctx, x, y - 18 * s, x - 9 * s, y - 30 * s, "#54322c", 1);

    const blobs = [
      [-13, -46, 11], [1, -52, 13], [14, -45, 10],
      [-5, -40, 12], [10, -35, 9], [-18, -36, 7]
    ];
    for (let i = 0; i < blobs.length; i++) {
      const [bx, by, br] = blobs[i];
      circle(ctx, x + (bx + sway) * s, y + by * s, br * s, i % 2 ? "#c7788d" : "#e29bad");
      circle(ctx, x + (bx + sway) * s - 2 * s, y + by * s - 2 * s, br * 0.58 * s, "#f2bcc6");
    }
    rect(ctx, x - 1, y - 58 * s, 2, 2, "#f8d7dc");
    rect(ctx, x + 8 * s, y - 53 * s, 2, 1, "#f8d7dc");
    rect(ctx, x - 12 * s, y - 51 * s, 2, 1, "#f8d7dc");
    rect(ctx, x - 6 * s, y - 1, 2 * s, 2 * s, "#7a4b32");
  }

  function drawCaveBackground(ctx, cam, t) {
    const sky = ctx.createLinearGradient(0, 0, 0, FLOOR);
    sky.addColorStop(0, "#07070f");
    sky.addColorStop(0.5, "#161021");
    sky.addColorStop(0.78, "#2a182f");
    sky.addColorStop(1, "#392033");
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W, FLOOR);

    // distant cavern mouth
    const openX = 245 - cam * 0.06;
    polygon(ctx, [[openX - 140, FLOOR], [openX - 108, 90], [openX - 50, 47], [openX + 65, 44], [openX + 132, 102], [openX + 153, FLOOR]], "#251329");
    polygon(ctx, [[openX - 112, FLOOR], [openX - 85, 103], [openX - 37, 68], [openX + 55, 66], [openX + 105, 112], [openX + 121, FLOOR]], "#100d19");
    halo(ctx, openX, 138, 65, "#6c3c7d", 0.07);

    // far stalactites
    for (let i = 0; i < 16; i++) {
      const x = ((i * 59 + 11 - cam * 0.13) % 590) - 40;
      const len = 14 + hash(i + 9) * 39;
      polygon(ctx, [[x, 0], [x + 9, 0], [x + 4, len]], i % 2 ? "#1a1021" : "#221529");
    }

    // distant crystal glow
    for (let i = 0; i < 5; i++) {
      const x = 76 + i * 96 - cam * 0.25;
      const y = 153 + (i % 2) * 25;
      halo(ctx, x, y, 14, "#7e5cf0", 0.09);
      drawCrystalCluster(ctx, x, y, 0.78 + (i % 3) * 0.14, i % 2 ? "#7266e5" : "#4eb9c8", t + i);
    }

    // rock ledges
    drawRidge(ctx, 171, 18, "#2b1c32", 8.1, -cam * 0.16, 33);
    drawRidge(ctx, 194, 14, "#35223a", 4.4, -cam * 0.24, 26);

    // lava crack glows
    ctx.save();
    ctx.globalAlpha = 0.22;
    for (let i = 0; i < 4; i++) {
      ellipse(ctx, 65 + i * 126 - cam * 0.2, 212, 33, 5, "#db5c43");
    }
    ctx.restore();

    // torches
    for (let i = 0; i < 4; i++) {
      const x = 42 + i * 143 - cam * 0.34;
      if (x < -20 || x > W + 20) continue;
      rect(ctx, x - 1, 152, 3, 31, "#49342b");
      rect(ctx, x - 4, 148, 9, 4, "#7a5840");
      drawFlame(ctx, x + 0.5, 145, 0.7 + (i % 2) * 0.16, t * 1.3 + i);
    }

    // fog bands
    ctx.save();
    for (let i = 0; i < 5; i++) {
      ctx.globalAlpha = 0.055;
      const x = ((t * 7 + i * 127 - cam * 0.2) % 620) - 70;
      ellipse(ctx, x, 203 + (i % 2) * 11, 84, 8, i % 2 ? "#8f72ba" : "#5b9a9d");
    }
    ctx.restore();

    // embers
    ctx.save();
    for (let i = 0; i < 26; i++) {
      const x = ((hash(i + 4) * W - cam * 0.2 + Math.sin(t * 0.5 + i) * 7) % W + W) % W;
      const y = 230 - ((hash(i + 7) * 200 + t * (5 + hash(i) * 11)) % 205);
      ctx.globalAlpha = 0.25 + hash(i + 1) * 0.5;
      rect(ctx, x, y, 1, 2, i % 3 ? "#f08a4b" : "#ffd07a");
    }
    ctx.restore();

    // foreground crystals
    drawCrystalCluster(ctx, 26 - cam * 0.55, 222, 1.45, "#3b7e9b", t + 3);
    drawCrystalCluster(ctx, 468 - cam * 0.55, 219, 1.1, "#6c4f9e", t + 8);
  }

  function drawCrystalCluster(ctx, x, y, s, color, t) {
    const shine = 0.55 + Math.sin(t * 2) * 0.16;
    ctx.save();
    ctx.globalAlpha = 0.12;
    circle(ctx, x, y - 8 * s, 14 * s, "#9a7dff");
    ctx.globalAlpha = shine;
    polygon(ctx, [[x - 12 * s, y], [x - 7 * s, y - 21 * s], [x - 3 * s, y]], color);
    polygon(ctx, [[x - 5 * s, y], [x + 1 * s, y - 30 * s], [x + 6 * s, y]], color);
    polygon(ctx, [[x + 3 * s, y], [x + 10 * s, y - 18 * s], [x + 13 * s, y]], color);
    line(ctx, x + 1 * s, y - 2 * s, x + 1 * s, y - 24 * s, "#d3c6ff", 1);
    ctx.globalAlpha = 0.5;
    rect(ctx, x + 2 * s, y - 19 * s, 2, 2, "#fff8c8");
    ctx.restore();
  }

  function drawBoneBackground(ctx, cam, t) {
    const sky = ctx.createLinearGradient(0, 0, 0, FLOOR);
    sky.addColorStop(0, "#071316");
    sky.addColorStop(0.45, "#10262a");
    sky.addColorStop(0.75, "#27423d");
    sky.addColorStop(1, "#566357");
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W, FLOOR);

    // stars
    ctx.save();
    for (let i = 0; i < 42; i++) {
      const x = (hash(i + 2) * W - cam * 0.025 + W) % W;
      const y = 9 + hash(i + 15) * 118;
      ctx.globalAlpha = 0.18 + hash(i + 3) * 0.55;
      rect(ctx, x, y, 1, 1, i % 7 ? "#c9e5dd" : "#f2dca9");
    }
    ctx.restore();

    // moon
    const mx = 364 - cam * 0.045;
    halo(ctx, mx, 52, 40, "#dcead6", 0.08);
    halo(ctx, mx, 52, 29, "#e3efdd", 0.1);
    circle(ctx, mx, 52, 22, "#d9e1cf");
    circle(ctx, mx - 7, 47, 4, "#bcc8b4");
    circle(ctx, mx + 6, 59, 3, "#c5cfb9");
    circle(ctx, mx + 9, 44, 2, "#c1ccb5");
    ctx.save();
    ctx.globalAlpha = 0.4;
    rect(ctx, mx - 25, 68, 50, 4, "#d9e1cf");
    ctx.restore();

    // thin clouds
    for (let i = 0; i < 5; i++) {
      const x = ((i * 137 + 10 + t * 2.1 - cam * 0.06) % 620) - 60;
      const y = 84 + (i % 3) * 25;
      drawCloud(ctx, x, y, 1.15 + (i % 2) * 0.35, "#b4c8bc", 0.1);
    }

    drawRidge(ctx, 146, 27, "#142e30", 2.2, -cam * 0.1, 34);
    drawRidge(ctx, 174, 20, "#1c3937", 6.6, -cam * 0.19, 27);
    drawRidge(ctx, 199, 14, "#2b4640", 1.1, -cam * 0.3, 23);

    // mist
    ctx.save();
    for (let i = 0; i < 5; i++) {
      ctx.globalAlpha = 0.05 + i * 0.008;
      ellipse(ctx, 30 + i * 116 + Math.sin(t * 0.14 + i) * 17, 181 + (i % 2) * 9, 78, 9, "#c3d4c7");
    }
    ctx.restore();

    // dead trees
    const trees = [
      { x: 72, y: 218, s: 1.2 },
      { x: 282, y: 211, s: 0.9 },
      { x: 663, y: 217, s: 1.1 },
      { x: 866, y: 210, s: 0.85 }
    ];
    for (const tr of trees) {
      const x = tr.x - cam * 0.4;
      if (x < -70 || x > W + 70) continue;
      drawDeadTree(ctx, x, tr.y, tr.s, t);
    }

    // gravestones and bones
    for (let i = 0; i < 8; i++) {
      const x = 30 + i * 112 - cam * 0.35;
      if (x < -20 || x > W + 20) continue;
      const s = 0.7 + hash(i + 5) * 0.5;
      if (i % 3 === 0) {
        rect(ctx, x - 5 * s, 206, 10 * s, 18 * s, "#54584f");
        rect(ctx, x - 4 * s, 205, 8 * s, 4 * s, "#666b5e");
        rect(ctx, x - 1, 210, 2, 6, "#383d37");
      } else {
        drawBonePile(ctx, x, 221, s);
      }
    }

    // ghost fire
    for (let i = 0; i < 6; i++) {
      const x = 45 + i * 84 - cam * 0.3 + Math.sin(t * 0.5 + i * 2) * 9;
      const y = 180 + Math.sin(t * 0.8 + i) * 11 + (i % 3) * 12;
      drawGhostFire(ctx, x, y, 0.75 + (i % 2) * 0.2, t + i);
    }

    // drifting soul motes
    ctx.save();
    for (let i = 0; i < 22; i++) {
      const x = ((hash(i + 9) * W - cam * 0.22 + Math.sin(t * 0.6 + i) * 10) % W + W) % W;
      const y = 226 - ((hash(i + 4) * 205 + t * (3 + hash(i) * 8)) % 200);
      ctx.globalAlpha = 0.16 + hash(i + 6) * 0.42;
      rect(ctx, x, y, 1, 1, "#9de3cd");
    }
    ctx.restore();
  }

  function drawDeadTree(ctx, x, y, s, t) {
    const sway = Math.sin(t * 0.4 + x * 0.03) * 1.2;
    line(ctx, x, y, x + sway, y - 42 * s, "#2b2927", 4 * s);
    line(ctx, x + sway, y - 32 * s, x - 18 * s, y - 48 * s + sway, "#2b2927", 2 * s);
    line(ctx, x + sway, y - 37 * s, x + 17 * s, y - 54 * s, "#2b2927", 2 * s);
    line(ctx, x - 8 * s, y - 40 * s, x - 21 * s, y - 41 * s + sway, "#35312d", 1);
    line(ctx, x + 9 * s, y - 47 * s, x + 23 * s, y - 47 * s, "#35312d", 1);
    line(ctx, x + 2 * s, y - 43 * s, x + 5 * s, y - 60 * s, "#35312d", 1);
    rect(ctx, x - 3 * s, y - 2, 6 * s, 2, "#1e1c1b");
    rect(ctx, x - 4 * s, y - 22 * s, 2, 2, "#49443d");
    rect(ctx, x + 2 * s, y - 30 * s, 2, 2, "#49443d");
  }

  function drawBonePile(ctx, x, y, s) {
    ellipse(ctx, x, y - 2, 8 * s, 3 * s, "#4b4b44");
    line(ctx, x - 7 * s, y - 3, x + 7 * s, y - 1, "#c2bca5", 1);
    line(ctx, x - 4 * s, y - 6, x + 3 * s, y - 4, "#a9a48f", 1);
    circle(ctx, x + 5 * s, y - 5, 2.3 * s, "#d3cdb8");
    rect(ctx, x + 5 * s, y - 5, 1, 1, "#3c3b35");
    rect(ctx, x + 7 * s, y - 5, 1, 1, "#3c3b35");
  }

  function drawGhostFire(ctx, x, y, s, t) {
    ctx.save();
    ctx.globalAlpha = 0.16 + Math.sin(t * 3) * 0.04;
    halo(ctx, x, y, 12 * s, "#70e0b3", 0.2);
    ctx.globalAlpha = 0.8;
    polygon(ctx, [[x - 4 * s, y + 2 * s], [x - 2 * s, y - 6 * s], [x + 1 * s, y - 10 * s], [x + 4 * s, y - 4 * s], [x + 3 * s, y + 2 * s]], "#79d9b0");
    polygon(ctx, [[x - 2 * s, y], [x, y - 5 * s], [x + 2 * s, y - 1 * s]], "#c8ffe9");
    ctx.restore();
  }

  function drawFireBackground(ctx, cam, t) {
    const sky = ctx.createLinearGradient(0, 0, 0, FLOOR);
    sky.addColorStop(0, "#1b0709");
    sky.addColorStop(0.42, "#4c1712");
    sky.addColorStop(0.72, "#8a2f16");
    sky.addColorStop(1, "#c4531f");
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W, FLOOR);

    // volcanic ridge
    const ridgeX = 120 - cam * 0.06;
    polygon(ctx, [[ridgeX - 140, FLOOR], [ridgeX - 60, 84], [ridgeX + 18, 116], [ridgeX + 82, 57], [ridgeX + 170, 130], [ridgeX + 250, FLOOR]], "#38100f");
    polygon(ctx, [[ridgeX + 52, 78], [ridgeX + 82, 57], [ridgeX + 112, 92], [ridgeX + 88, 109]], "#6c1d12");
    halo(ctx, ridgeX + 86, 93, 34, "#ff6a25", 0.16);
    drawRidge(ctx, 188, 25, "#5b190f", 5.2, -cam * 0.2, 34);

    // lava rivers in the distance
    ctx.save();
    ctx.globalAlpha = 0.45;
    for (let i = 0; i < 5; i++) {
      const y = 141 + i * 12;
      const x = ((i * 113 - cam * 0.18) % 560) - 40;
      ellipse(ctx, x, y, 58, 4, i % 2 ? "#ff7a2e" : "#d33f1e");
      ellipse(ctx, x + 30, y, 24, 2, "#ffb14d");
    }
    ctx.restore();

    // fire clouds
    for (let i = 0; i < 5; i++) {
      const x = ((i * 137 + t * 3 - cam * 0.12) % 620) - 70;
      const y = 32 + (i % 3) * 24;
      ctx.save();
      ctx.globalAlpha = 0.2;
      ellipse(ctx, x, y, 66, 14, i % 2 ? "#ff8a3e" : "#a63a22");
      ellipse(ctx, x + 38, y + 5, 42, 10, "#ffb15c");
      ctx.restore();
    }

    // embers
    ctx.save();
    for (let i = 0; i < 32; i++) {
      const x = ((hash(i + 3) * W - cam * 0.22 + Math.sin(t * 0.7 + i) * 8) % W + W) % W;
      const y = 230 - ((hash(i + 8) * 210 + t * (8 + hash(i) * 14)) % 210);
      ctx.globalAlpha = 0.25 + hash(i + 5) * 0.55;
      rect(ctx, x, y, 1, 2, i % 3 ? "#ff8a3e" : "#ffd47a");
    }
    ctx.restore();

    // foreground crags
    polygon(ctx, [[-20, FLOOR], [0, 148], [34, 186], [52, FLOOR]], "#2b0e0c");
    polygon(ctx, [[480, FLOOR], [462, 165], [430, 194], [418, FLOOR]], "#2b0e0c");
  }

  function drawRiverBackground(ctx, cam, t) {
    const sky = ctx.createLinearGradient(0, 0, 0, FLOOR);
    sky.addColorStop(0, "#031722");
    sky.addColorStop(0.38, "#0a3545");
    sky.addColorStop(0.7, "#126273");
    sky.addColorStop(1, "#2b9093");
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W, FLOOR);

    // distant water palace
    const px = 330 - cam * 0.06;
    for (let i = 0; i < 3; i++) {
      const x = px + i * 54;
      const h = 36 + i * 10;
      rect(ctx, x, 128 - h, 30, h, "rgba(20,65,76,0.55)");
      polygon(ctx, [[x - 5, 128 - h], [x + 15, 128 - h - 13], [x + 35, 128 - h]], "rgba(35,100,110,0.6)");
      rect(ctx, x + 11, 128 - h + 8, 8, 10, "rgba(120,220,220,0.18)");
    }
    halo(ctx, px + 80, 96, 40, "#6fe0e8", 0.08);

    // light shafts
    ctx.save();
    for (let i = 0; i < 4; i++) {
      ctx.globalAlpha = 0.045;
      polygon(ctx, [[80 + i * 120 - cam * 0.14, 0], [112 + i * 120 - cam * 0.14, 0], [150 + i * 120 - cam * 0.14, FLOOR], [90 + i * 120 - cam * 0.14, FLOOR]], "#a9f3ef");
    }
    ctx.restore();

    // water surface bands
    ctx.save();
    for (let i = 0; i < 7; i++) {
      const y = 48 + i * 17;
      const x = ((i * 97 + t * 9 - cam * 0.2) % 580) - 50;
      ctx.globalAlpha = 0.08;
      ellipse(ctx, x, y, 74, 3, i % 2 ? "#9ff1ef" : "#4ca7bb");
      ctx.globalAlpha = 0.18;
      ctx.strokeStyle = "#9ff1ef";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x - 40, y);
      ctx.quadraticCurveTo(x, y - 3, x + 42, y);
      ctx.stroke();
    }
    ctx.restore();

    // bubbles
    ctx.save();
    for (let i = 0; i < 24; i++) {
      const x = ((hash(i + 2) * W - cam * 0.18) % W + W) % W;
      const y = 225 - ((hash(i + 6) * 205 + t * (6 + hash(i) * 10)) % 205);
      ctx.globalAlpha = 0.2 + hash(i + 4) * 0.35;
      circle(ctx, x, y, 1 + hash(i + 9) * 2.5, "#a9f3ef");
    }
    ctx.restore();

    // riverbed reeds / coral silhouettes
    for (let i = 0; i < 6; i++) {
      const x = 35 + i * 90 - cam * 0.3;
      const sway = Math.sin(t * 1.4 + i) * 3;
      line(ctx, x, FLOOR, x + sway, FLOOR - 30, i % 2 ? "#0f4a4a" : "#155e59", 2);
      line(ctx, x + sway, FLOOR - 24, x + sway - 9, FLOOR - 36, "#155e59", 1);
    }
  }

  function drawWebBackground(ctx, cam, t) {
    const sky = ctx.createLinearGradient(0, 0, 0, FLOOR);
    sky.addColorStop(0, "#0b0714");
    sky.addColorStop(0.45, "#20132e");
    sky.addColorStop(0.78, "#382047");
    sky.addColorStop(1, "#50315f");
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W, FLOOR);

    // distant cave mouth / silk columns
    const cx = 280 - cam * 0.05;
    polygon(ctx, [[cx - 170, FLOOR], [cx - 120, 68], [cx - 35, 36], [cx + 70, 42], [cx + 150, 95], [cx + 185, FLOOR]], "#1a1026");
    polygon(ctx, [[cx - 126, FLOOR], [cx - 88, 91], [cx - 20, 60], [cx + 64, 68], [cx + 112, 112], [cx + 138, FLOOR]], "#0d0815");
    halo(ctx, cx, 118, 80, "#b184ef", 0.07);
    for (let i = 0; i < 9; i++) {
      const x = ((i * 71 + 20 - cam * 0.16) % 590) - 40;
      line(ctx, x, 0, x + Math.sin(t * 0.4 + i) * 8, 95 + (i % 3) * 35, "rgba(220,190,240,0.12)", 1);
    }
    drawRidge(ctx, 184, 16, "#2a1838", 7.1, -cam * 0.18, 30);

    // webs in corners
    for (const corner of [[22, 30, 1], [458, 52, -1]]) {
      const [wx, wy, dir] = corner;
      ctx.save();
      ctx.globalAlpha = 0.22;
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 0.9;
        line(ctx, wx, wy, wx + dir * Math.cos(a) * 64, wy + Math.sin(a) * 64, "#d8c4e8", 1);
      }
      for (let r = 12; r <= 52; r += 13) {
        ctx.beginPath();
        ctx.arc(wx, wy, r, 0.1, Math.PI * 0.85);
        ctx.strokeStyle = "#d8c4e8";
        ctx.lineWidth = 1;
        ctx.stroke();
      }
      ctx.restore();
    }

    // glowing eyes
    for (let i = 0; i < 5; i++) {
      const x = 58 + i * 94 - cam * 0.24;
      const y = 123 + (i % 2) * 24;
      rect(ctx, x, y, 2, 2, "#ff8a6a");
      rect(ctx, x + 4, y, 2, 2, "#ff8a6a");
    }

    // drifting silk / spores
    ctx.save();
    for (let i = 0; i < 26; i++) {
      const x = ((hash(i + 4) * W - cam * 0.2 + Math.sin(t * 0.5 + i) * 10) % W + W) % W;
      const y = 220 - ((hash(i + 9) * 200 + t * (3 + hash(i) * 7)) % 200);
      ctx.globalAlpha = 0.18 + hash(i + 2) * 0.36;
      rect(ctx, x, y, 1, 1, i % 2 ? "#d8c4e8" : "#b184ef");
    }
    ctx.restore();
  }

  function drawSkyBackground(ctx, cam, t) {
    const sky = ctx.createLinearGradient(0, 0, 0, FLOOR);
    sky.addColorStop(0, "#101a2b");
    sky.addColorStop(0.4, "#3a4a63");
    sky.addColorStop(0.72, "#9a7b63");
    sky.addColorStop(1, "#d6a46a");
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W, FLOOR);

    // sun / glow
    const sx = 372 - cam * 0.04;
    halo(ctx, sx, 54, 44, "#ffd08a", 0.1);
    circle(ctx, sx, 54, 20, "#f5cf8c");

    // far peaks above clouds
    drawRidge(ctx, 155, 44, "#2d374a", 3.2, -cam * 0.08, 42);
    drawRidge(ctx, 184, 23, "#596071", 6.4, -cam * 0.16, 30);

    // clouds
    ctx.save();
    for (let i = 0; i < 9; i++) {
      const x = ((i * 87 + t * 4 - cam * 0.14) % 620) - 70;
      const y = 88 + (i % 3) * 28;
      ctx.globalAlpha = 0.16 + (i % 2) * 0.05;
      ellipse(ctx, x, y, 64, 15, "#f3e2cf");
      ellipse(ctx, x + 35, y + 5, 40, 10, "#ffe9d2");
    }
    ctx.restore();

    // wind lines
    ctx.save();
    for (let i = 0; i < 18; i++) {
      const x = ((i * 67 + t * 28 - cam * 0.2) % 580) - 50;
      const y = 42 + (i % 5) * 27;
      ctx.globalAlpha = 0.1 + (i % 3) * 0.04;
      line(ctx, x, y, x + 28, y - 3, "#d6f1ff", 1);
    }
    ctx.restore();

    // floating rocks
    for (let i = 0; i < 3; i++) {
      const x = 84 + i * 168 - cam * 0.24;
      const y = 198 - (i % 2) * 24;
      polygon(ctx, [[x - 22, y], [x - 8, y - 16], [x + 18, y - 8], [x + 24, y + 4], [x - 10, y + 6]], "#3b3a41");
    }
  }

  /* ------------------------------------------------------------------ */
  /* Ground + platforms                                                  */
  /* ------------------------------------------------------------------ */

  function drawGround(ctx, biome, cam, t) {
    if (biome === "web") {
      rect(ctx, 0, FLOOR, W, H - FLOOR, "#24152e");
      rect(ctx, 0, FLOOR, W, 4, "#4e2d60");
      rect(ctx, 0, FLOOR, W, 2, "#8f63a8");
      for (let x = -28; x < W + 40; x += 23) {
        const wx = x - (cam % 23);
        rect(ctx, wx, FLOOR + 9 + hash(x) * 7, 6, 2, "#392044");
        if (hash(x + 4) > 0.6) line(ctx, wx, FLOOR + 4, wx + 13, FLOOR + 12, "#b184ef", 1);
      }
      return;
    }
    if (biome === "sky") {
      rect(ctx, 0, FLOOR, W, H - FLOOR, "#6f5d52");
      rect(ctx, 0, FLOOR, W, 4, "#a68a70");
      rect(ctx, 0, FLOOR, W, 2, "#d6b98d");
      for (let x = -30; x < W + 40; x += 25) {
        const wx = x - (cam % 25);
        rect(ctx, wx, FLOOR + 9 + hash(x) * 7, 7, 2, "#56473f");
      }
      return;
    }
    if (biome === "fire") {
      rect(ctx, 0, FLOOR, W, H - FLOOR, "#25100f");
      rect(ctx, 0, FLOOR, W, 4, "#5b2117");
      rect(ctx, 0, FLOOR, W, 2, "#a33e22");
      for (let x = -28; x < W + 40; x += 24) {
        const wx = x - (cam % 24);
        rect(ctx, wx, FLOOR + 9 + hash(x) * 7, 6, 2, "#451a14");
        if (hash(x + 5) > 0.55) {
          line(ctx, wx + 3, FLOOR + 5, wx + 12, FLOOR + 12, "#ff7a2e", 1);
          line(ctx, wx + 12, FLOOR + 12, wx + 20, FLOOR + 9, "#ffb14d", 1);
        }
      }
      ctx.save();
      ctx.globalAlpha = 0.25 + Math.sin(t * 3) * 0.06;
      for (let i = 0; i < 4; i++) ellipse(ctx, 70 + i * 124 - cam * 0.2, FLOOR + 2, 38, 3, "#ff6a25");
      ctx.restore();
      return;
    }

    if (biome === "river") {
      rect(ctx, 0, FLOOR, W, H - FLOOR, "#173b43");
      rect(ctx, 0, FLOOR, W, 4, "#347982");
      rect(ctx, 0, FLOOR, W, 2, "#69c4c1");
      for (let x = -30; x < W + 40; x += 22) {
        const wx = x - (cam % 22);
        rect(ctx, wx, FLOOR + 9 + hash(x) * 8, 7, 2, "#21545a");
        if (hash(x + 3) > 0.6) rect(ctx, wx + 8, FLOOR + 16 + hash(x + 1) * 5, 5, 1, "#65b7b1");
      }
      ctx.save();
      ctx.globalAlpha = 0.18;
      for (let i = 0; i < 3; i++) ellipse(ctx, 84 + i * 150 - cam * 0.24, FLOOR + 2, 48, 3, "#a9f3ef");
      ctx.restore();
      return;
    }


    if (biome === "cave") {
      rect(ctx, 0, FLOOR, W, H - FLOOR, "#1a1721");
      rect(ctx, 0, FLOOR, W, 5, "#42374a");
      rect(ctx, 0, FLOOR + 5, W, 5, "#302635");
      for (let x = -24; x < W + 32; x += 18) {
        const wx = x + ((-cam) % 18);
        rect(ctx, wx, FLOOR + 10 + (hash(x + 1) * 6), 7, 3, "#2a202e");
        rect(ctx, wx + 9, FLOOR + 18 + (hash(x + 4) * 9), 4, 2, "#211a26");
      }
      ctx.save();
      ctx.globalAlpha = 0.5;
      for (let x = -30; x < W + 30; x += 47) {
        const xx = x - (cam % 47);
        line(ctx, xx, FLOOR + 3, xx + 14, FLOOR + 8, "#8c4938", 1);
        line(ctx, xx + 14, FLOOR + 8, xx + 22, FLOOR + 6, "#a85a40", 1);
      }
      ctx.restore();
      return;
    }

    if (biome === "bone") {
      rect(ctx, 0, FLOOR, W, H - FLOOR, "#3e403c");
      rect(ctx, 0, FLOOR, W, 4, "#77796c");
      rect(ctx, 0, FLOOR + 4, W, 5, "#56584f");
      for (let x = -28; x < W + 40; x += 25) {
        const wx = x - (cam % 25);
        rect(ctx, wx, FLOOR + 10 + hash(x) * 7, 4, 2, "#4a4c45");
        if (hash(x + 8) > 0.6) rect(ctx, wx + 10, FLOOR + 17 + hash(x + 2) * 5, 7, 1, "#9b9b86");
      }
      return;
    }

    rect(ctx, 0, FLOOR, W, H - FLOOR, "#4b3326");
    rect(ctx, 0, FLOOR, W, 4, "#5e8e48");
    rect(ctx, 0, FLOOR, W, 2, "#8abf63");
    rect(ctx, 0, FLOOR + 4, W, 6, "#6d4d32");
    for (let x = -30; x < W + 40; x += 16) {
      const wx = x - (cam % 16);
      if (hash(x + 2) > 0.42) {
        rect(ctx, wx, FLOOR - 2 - hash(x) * 2, 1, 2 + hash(x + 4) * 3, "#72a952");
      }
      if (hash(x + 7) > 0.8) {
        rect(ctx, wx + 5, FLOOR - 1, 1, 1, hash(x) > 0.5 ? "#f1df79" : "#e9a4b2");
      }
      rect(ctx, wx + 2, FLOOR + 10 + hash(x + 9) * 8, 5, 2, "#3d2a20");
    }
  }

  function drawPlatforms(ctx, platforms, cam, biome, t) {
    for (const p of platforms) {
      const x = p.x - cam;
      if (x > W + 30 || x + p.w < -30) continue;
      const y = p.y;
      if (p.type === "web") {
        rect(ctx, x + 1, y, p.w - 2, p.h, "#4d2c60");
        rect(ctx, x, y, p.w, 2, "#a87cc4");
        rect(ctx, x + 2, y + p.h, p.w - 4, 3, "#2b1738");
        for (let i = 6; i < p.w - 4; i += 14) {
          rect(ctx, x + i, y + 3, 5, 2, "#6f4485");
          line(ctx, x + i + 2, y + p.h, x + i + 2, y + p.h + 7, "#c59be0", 1);
        }
        continue;
      }
      if (p.type === "sky") {
        rect(ctx, x + 1, y, p.w - 2, p.h, "#5e5e68");
        rect(ctx, x, y, p.w, 2, "#a9a9b4");
        rect(ctx, x + 2, y + p.h, p.w - 4, 3, "#3c3c45");
        for (let i = 6; i < p.w - 4; i += 16) {
          rect(ctx, x + i, y + 3, 6, 2, "#494954");
          ctx.save();
          ctx.globalAlpha = 0.4;
          rect(ctx, x + i, y + p.h, 9, 1, "#e8f4ff");
          ctx.restore();
        }
        continue;
      }
      if (p.type === "fire") {
        rect(ctx, x + 1, y, p.w - 2, p.h, "#3d1a15");
        rect(ctx, x, y, p.w, 2, "#b94a25");
        rect(ctx, x, y + 2, p.w, 1, "#ff9a42");
        rect(ctx, x + 2, y + p.h, p.w - 4, 3, "#1e0c0b");
        for (let i = 5; i < p.w - 4; i += 14) {
          rect(ctx, x + i, y + 3, 5, 2, "#64271b");
          if (hash(i + p.x) > 0.5) {
            const len = 2 + hash(i) * 6;
            line(ctx, x + i + 2, y + p.h, x + i + 2, y + p.h + len, "#ff6a25", 1);
          }
        }
        continue;
      }
      if (p.type === "water") {
        rect(ctx, x + 1, y, p.w - 2, p.h, "#2b626b");
        rect(ctx, x, y, p.w, 2, "#7fd3cf");
        rect(ctx, x + 2, y + p.h, p.w - 4, 3, "#123b43");
        for (let i = 6; i < p.w - 4; i += 15) {
          rect(ctx, x + i, y + 3, 6, 2, "#3f858b");
          ctx.save();
          ctx.globalAlpha = 0.5;
          rect(ctx, x + i - 1, y + p.h, 8, 1, "#b9f1e7");
          ctx.restore();
        }
        continue;
      }
      if (biome === "cave" || p.type === "stone") {
        rect(ctx, x + 1, y, p.w - 2, p.h, "#5d5666");
        rect(ctx, x, y, p.w, 2, "#777080");
        rect(ctx, x + 2, y + p.h, p.w - 4, 3, "#342e3d");
        for (let i = 4; i < p.w - 4; i += 12) {
          rect(ctx, x + i, y + 3, 6, 1, "#474151");
          rect(ctx, x + i + 3, y + p.h, 3, 2, "#29232f");
        }
        ctx.save();
        ctx.globalAlpha = 0.34;
        rect(ctx, x + p.w * 0.2, y + 1, p.w * 0.28, 1, "#8fbb81");
        rect(ctx, x + p.w * 0.22, y + p.h + 1, 4, 2, "#587a50");
        ctx.restore();
      } else if (biome === "bone" || p.type === "bone") {
        rect(ctx, x + 1, y, p.w - 2, p.h, "#8b8879");
        rect(ctx, x, y, p.w, 2, "#b2ae9b");
        rect(ctx, x + 2, y + p.h, p.w - 4, 2, "#5a584f");
        for (let i = 7; i < p.w - 6; i += 17) {
          circle(ctx, x + i, y + 3, 2, "#6d6b5e");
          rect(ctx, x + i - 1, y + 2, 1, 1, "#d0cbb7");
          rect(ctx, x + i + 2, y + 4, 1, 1, "#d0cbb7");
        }
      } else {
        rect(ctx, x, y, p.w, p.h, "#6e472a");
        rect(ctx, x, y, p.w, 2, "#9d6d3c");
        rect(ctx, x + 1, y + p.h, p.w - 2, 3, "#3d2618");
        for (let i = 5; i < p.w - 2; i += 13) {
          rect(ctx, x + i, y + 2, 1, p.h - 2, "#4b2f1c");
        }
        ctx.save();
        ctx.globalAlpha = 0.65;
        for (let i = 3; i < p.w - 3; i += 9) {
          const len = 3 + hash(i + p.x) * 7;
          line(ctx, x + i, y + p.h + 1, x + i - 1 + Math.sin(t + i) * 1.5, y + p.h + len, "#4c6d37", 1);
          rect(ctx, x + i - 1, y + p.h + len, 2, 1, "#7da84e");
        }
        ctx.restore();
      }
    }
  }

  /* ------------------------------------------------------------------ */
  /* Wukong                                                              */
  /* ------------------------------------------------------------------ */

  function drawStaff(ctx, hx, hy, angle, len, flash, accent) {
    const dx = Math.cos(angle);
    const dy = Math.sin(angle);
    const x0 = hx - dx * 5;
    const y0 = hy - dy * 5;
    const x1 = hx + dx * len;
    const y1 = hy + dy * len;
    line(ctx, x0, y0, x1, y1, flash ? "#fff0d8" : "#43230f", 3);
    line(ctx, x0, y0, x1, y1, flash ? "#fff9ec" : "#8d572a", 1);
    const cap = accent || (flash ? "#fff9ec" : "#f4cb61");
    rect(ctx, x0 - 2, y0 - 2, 4, 4, flash ? "#fff9ec" : accent || "#e9bb50");
    rect(ctx, x1 - 2, y1 - 2, 4, 4, cap);
    rect(ctx, x1 - 1, y1 - 1, 2, 2, "#6e4818");
    if (accent) {
      ctx.save();
      ctx.globalAlpha = 0.28;
      circle(ctx, x1, y1, 4, accent);
      ctx.restore();
    }
    return { x1, y1 };
  }

  function drawMechaSword(ctx, hx, hy, angle, len, m) {
    const dx = Math.cos(angle);
    const dy = Math.sin(angle);
    const bx = hx + dx * 7;
    const by = hy + dy * 7;
    const tx = hx + dx * len;
    const ty = hy + dy * len;
    // hilt
    line(ctx, hx - dx * 4, hy - dy * 4, bx, by, m("#2c3550"), 3);
    rect(ctx, bx - 3, by - 2, 6, 4, m("#e3bd5a"));
    // blade
    polygon(ctx, [
      [bx + dy * 4, by - dx * 4],
      [tx + dy * 3, ty - dx * 3],
      [tx + dx * 7, ty + dy * 7],
      [tx - dy * 3, ty + dx * 3],
      [bx - dy * 4, by + dx * 4]
    ], m("#d9e8f2"));
    line(ctx, bx + dy * 2, by - dx * 2, tx + dy * 1.5, ty - dx * 1.5, m("#8fe8ff"), 1);
    polygon(ctx, [[bx + dy * 4, by - dx * 4], [bx + dx * 18 + dy * 4, by + dy * 18 - dx * 4], [bx + dx * 18 + dy * 1, by + dy * 18 - dx * 1]], m("#5b7fca"));
    // energy edge
    line(ctx, tx + dx * 5, ty + dy * 5, bx + dx * 26, by + dy * 26, m("#ffb45a"), 1);
    ctx.save();
    ctx.globalAlpha = 0.18;
    circle(ctx, tx, ty, 4, m("#8fe8ff"));
    ctx.restore();
  }

  function drawMechaWukong(ctx, x, y, facing, opts = {}) {
    const state = opts.state || "idle";
    const t = opts.t || 0;
    const progress = clamp(opts.attackProgress || 0, 0, 1);
    const combo = opts.combo || 1;
    const skillProgress = clamp(opts.skillProgress || 0, 0, 1);
    const roll = clamp(opts.roll || 0, 0, 1);
    const flash = !!opts.flash;
    const golden = !!opts.golden;
    const m = (color) => (golden ? goldify(color) : flash ? "#fff8e8" : color);
    const blue = "#4f6fb5";
    const blueDark = "#2f416d";
    const blueLight = "#7fa6d9";
    const cream = "#efe6cf";
    const gold = "#e3bd5a";
    const red = "#d34a4a";
    const visor = "#8ff0ff";
    const run = state === "run";
    const jump = state === "jump" || state === "fall";
    const attack = state === "attack";
    const skill = state === "skill";
    const hurt = state === "hurt";
    const dead = state === "dead";
    const dash = state === "dash";
    const runPhase = Math.sin(t * 21);

    shadow(ctx, x, y, dead ? 16 : 12, 0.26);
    ctx.save();
    ctx.translate(Math.round(x), Math.round(y));
    if (facing < 0) ctx.scale(-1, 1);
    if (dead) {
      ctx.rotate(-0.18);
      ctx.translate(0, -2);
    }
    const bob = state === "idle" ? Math.round(Math.sin(t * 3)) : run ? Math.round(Math.abs(runPhase) * 1.2) : 0;
    ctx.translate(run ? 1.2 : 0, bob);
    if (roll > 0) {
      ctx.translate(0, -16);
      ctx.rotate(roll * TAU);
      ctx.translate(0, 16);
    }
    if (dash) {
      ctx.rotate(0.22);
      ctx.save();
      ctx.globalAlpha = 0.45;
      for (let i = 0; i < 4; i++) {
        const yy = -34 + i * 8;
        rect(ctx, -22 - i * 5, yy, 11, 1, i % 2 ? visor : "#ffffff");
      }
      ctx.restore();
    }

    const stride = run ? 6 : 0;
    const legA = run ? runPhase * stride : 0;
    const legB = run ? -runPhase * stride : 0;
    const jumpLeg = jump ? 3 : 0;
    if (run) {
      // 奔跑速度线 & 喷射气浪
      ctx.save();
      ctx.globalAlpha = 0.35;
      for (let i = 0; i < 3; i++) {
        const yy = -32 + i * 6;
        const xx = -17 - ((t * 18 + i * 5) % 12);
        rect(ctx, xx, yy, 6, 1, i % 2 ? m(visor) : "#ffd36a");
      }
      ctx.restore();
    }
    // legs / greaves 带膝部弯曲与推进火焰
    for (const [lx, off, side] of [[-6, legA, 1], [3, legB, -1]]) {
      const topY = -18 + Math.max(-3, off);
      const footY = -4 + (jump ? -jumpLeg : 0);
      const kneeX = lx + (off > 0 ? 2 : -1);
      rect(ctx, lx, topY, 5, 14, m(blueDark));
      rect(ctx, lx + 1, topY, 3, 7, m(blue));
      rect(ctx, kneeX, -11 + Math.max(-3, off), 3, 4, m(blueLight)); // 膝盖关节
      rect(ctx, lx - 1, footY, 8, 4, m(side > 0 ? blueLight : blue));
      rect(ctx, lx - 2, footY + 1, 9, 2, m(cream));
      rect(ctx, lx + 1, footY + 3, 5, 1, m(visor)); // 脚底喷射口
      rect(ctx, lx + 1, -13 + Math.max(-2, off), 2, 4, m(gold));
      if (run) {
        ctx.save();
        const fx = lx - 4 - (off > 0 ? 3 : 0);
        const fy = footY + 2;
        polygon(ctx, [[fx, fy], [fx + 4, fy], [fx + 1, fy + 3], [fx + 3, fy + 3]], m("#ffb45a"));
        rect(ctx, fx - 2, fy + 1, 2, 2, m(visor));
        ctx.restore();
      }
    }
    // hip / waist
    rect(ctx, -8, -21, 16, 4, m(blueDark));
    rect(ctx, -6, -20, 12, 3, m(cream));
    rect(ctx, -3, -20, 6, 1, m(red));
    // skirt plates
    rect(ctx, -9, -18, 4, 7, m(blue));
    rect(ctx, 5, -18, 4, 7, m(blue));
    rect(ctx, -8, -14, 16, 2, m(gold));
    // torso
    rect(ctx, -8, -36, 16, 16, m(blue));
    rect(ctx, -6, -35, 12, 10, m(cream));
    polygon(ctx, [[-6, -34], [0, -39], [6, -34], [5, -27], [0, -24], [-5, -27]], m("#f6f0df"));
    rect(ctx, -3, -32, 6, 5, m(blueDark));
    rect(ctx, -2, -31, 4, 2, m(visor));
    rect(ctx, -6, -27, 12, 2, m(red));
    rect(ctx, -1, -27, 2, 2, m(gold));
    rect(ctx, -8, -33, 2, 8, m(gold));
    rect(ctx, 6, -33, 2, 8, m(gold));
    // backpack / wing binders
    polygon(ctx, [[-9, -34], [-18, -42], [-15, -30], [-9, -26]], m(blueDark));
    polygon(ctx, [[9, -34], [18, -42], [15, -30], [9, -26]], m(blueDark));
    rect(ctx, -17, -39, 4, 3, m(red));
    rect(ctx, 13, -39, 4, 3, m(red));
    // shoulders
    polygon(ctx, [[-8, -35], [-18, -38], [-20, -30], [-10, -28]], m(blue));
    polygon(ctx, [[8, -35], [18, -38], [20, -30], [10, -28]], m(blue));
    rect(ctx, -19, -37, 10, 2, m(cream));
    rect(ctx, 9, -37, 10, 2, m(cream));
    rect(ctx, -17, -33, 5, 2, m(gold));
    rect(ctx, 12, -33, 5, 2, m(gold));
    // arms —— 四段普攻各有独立剑路
    const swingEase = 1 - Math.pow(1 - progress, 2.1);
    const swordAngle = attack
      ? (combo === 1 ? lerp(-2.0, 0.7, swingEase)
        : combo === 2 ? lerp(1.1, -1.7, swingEase)
        : combo === 3 ? lerp(-2.8, 1.1, swingEase)
        : -1.5 + progress * TAU * 1.1)
      : skill ? lerp(-1.2, 0.8, skillProgress) : run ? -0.7 + runPhase * 0.12 : -0.55;
    const handX = attack ? 9 + Math.cos(swordAngle) * 9 : 10;
    const handY = attack ? -28 + Math.sin(swordAngle) * 7 : -26;
    line(ctx, 7, -33, handX, handY, m(blueDark), 4);
    rect(ctx, handX - 2, handY - 2, 4, 4, m(gold));
    line(ctx, -7, -33, -12, -22, m(blueDark), 4);
    rect(ctx, -14, -23, 4, 4, m(cream));
    // head / helmet
    rect(ctx, -2, -40, 5, 4, m(blueDark));
    polygon(ctx, [[-8, -45], [-10, -51], [-4, -48], [0, -55], [4, -48], [10, -51], [8, -45]], m(blue));
    rect(ctx, -8, -46, 16, 8, m(blue));
    rect(ctx, -5, -44, 10, 5, m(cream));
    rect(ctx, -5, -43, 10, 2, m(visor));
    rect(ctx, -4, -43, 3, 1, "#ffffff");
    rect(ctx, 2, -43, 3, 1, "#ffffff");
    rect(ctx, -1, -39, 2, 2, m(red));
    rect(ctx, -8, -46, 2, 6, m(gold));
    rect(ctx, 6, -46, 2, 6, m(gold));
    // horn / antenna
    polygon(ctx, [[-6, -51], [-13, -63], [-8, -52]], m(cream));
    polygon(ctx, [[6, -51], [13, -63], [8, -52]], m(cream));
    rect(ctx, -1, -57, 2, 6, m(blueLight));
    rect(ctx, -2, -51, 4, 1, m(gold));
    // sword
    drawMechaSword(ctx, handX, handY, swordAngle, attack ? 33 : 29, m);
    if (attack && progress > 0.25) {
      ctx.save();
      ctx.globalAlpha = (1 - Math.abs(progress - 0.55)) * (combo === 4 ? 0.7 : 0.45);
      const trailCount = combo === 4 ? 12 : combo === 3 ? 9 : 7;
      for (let i = 0; i < trailCount; i++) {
        const a = swordAngle - (combo === 4 ? 1.6 : 0.9) + i * (combo === 4 ? 0.28 : 0.15);
        line(ctx, handX, handY, handX + Math.cos(a) * (combo === 4 ? 40 : 34), handY + Math.sin(a) * (combo === 4 ? 40 : 34), i % 2 ? "#8fe8ff" : "#ffd36a", combo === 4 ? 2 : 1);
      }
      ctx.restore();
    }
    // chest core glow
    ctx.save();
    ctx.globalAlpha = 0.35 + Math.sin(t * 5) * 0.1;
    halo(ctx, 0, -30, 7, visor, 0.3);
    ctx.restore();
    if (hurt) {
      rect(ctx, -4, -45, 8, 1, "#ffd9c2");
    }
    if (state === "skill" || state === "firespin") {
      ctx.save();
      ctx.globalAlpha = 0.25;
      halo(ctx, 0, -28, 20, "#8fe8ff", 0.25);
      ctx.restore();
    }
    ctx.restore();
  }

  function drawWukong(ctx, x, y, facing, opts = {}) {
    const state = opts.state || "idle";
    const t = opts.t || 0;
    const combo = opts.combo || 1;
    const progress = clamp(opts.attackProgress || 0, 0, 1);
    const roll = clamp(opts.roll || 0, 0, 1);
    const skillId = opts.skillId || "fireStaff";
    const skillProgress = clamp(opts.skillProgress || 0, 0, 1);
    const gear = opts.gear || {};
    const weaponColor = gear.weapon ? gear.weapon.color : null;
    const skin = opts.skin || gear.skin || "default";
    const mecha = skin === "mecha";
    const flash = !!opts.flash;
    const golden = !!opts.golden;
    const c = (color) => (golden ? goldify(color) : flash ? "#fff4df" : color);
    if (mecha) {
      drawMechaWukong(ctx, x, y, facing, opts);
      return;
    }

    shadow(ctx, x, y, state === "dead" ? 15 : 11, 0.24);
    ctx.save();
    ctx.translate(Math.round(x), Math.round(y));
    if (facing < 0) ctx.scale(-1, 1);

    if (state === "dead") {
      ctx.rotate(-0.14);
      ctx.translate(0, -2);
    }

    const bob = state === "idle" ? Math.round(Math.sin(t * 3.2)) : 0;
    ctx.translate(0, bob);

    if (roll > 0) {
      ctx.translate(0, -15);
      ctx.rotate(roll * TAU);
      ctx.translate(0, 15);
    }

    const run = state === "run";
    const jump = state === "jump" || state === "fall";
    const attack = state === "attack";
    const skill = state === "skill";
    const dash = state === "dash";
    const hurt = state === "hurt";
    const runPhase = Math.sin(t * 18);
    const lean = dash ? 6 : attack ? 2 : run ? 2 : 0;
    // 冲刺前倾动画：整身向前压 + 身后速度线
    if (dash) {
      ctx.rotate(0.22);
      ctx.save();
      ctx.globalAlpha = 0.45;
      for (let i = 0; i < 4; i++) {
        const yy = -30 + i * 7;
        rect(ctx, -20 - i * 5, yy, 10, 1, i % 2 ? "#bfe9f5" : "#ffffff");
      }
      ctx.restore();
    }

    if (gear.accessory) {
      ctx.save();
      ctx.globalAlpha = 0.16;
      halo(ctx, 0, -16, 17, gear.accessory.color, 0.5);
      ctx.globalAlpha = 0.45;
      for (let i = 0; i < 3; i++) {
        const a = t * 1.6 + (i / 3) * TAU;
        rect(ctx, Math.cos(a) * 15, -16 + Math.sin(a) * 11, 1, 2, gear.accessory.color);
      }
      ctx.restore();
    }

    // tail
    const tailSway = Math.sin(t * 3.4) * 3;
    const tailBase = [-4, -13];
    for (let i = 0; i < 5; i++) {
      const pxX = tailBase[0] - i * 3 - (run ? 2 : 0);
      const pxY = tailBase[1] - i * 2 + Math.sin(i * 1.1 + t * 3.2) * 1.2 + (run ? -1 : 0);
      rect(ctx, pxX, pxY, 3, 3, c(i < 3 ? "#8e542f" : "#ba7b42"));
    }
    rect(ctx, tailBase[0] - 16 + tailSway, tailBase[1] - 9, 3, 3, c("#d9a25f"));

    // scarf / cape
    ctx.save();
    ctx.globalAlpha = 0.95;
    for (let i = 0; i < 5; i++) {
      const sx = -7 - i * (dash ? 5 : 3.4);
      const sy = -21 + Math.sin(t * 8 + i * 0.8) * (dash ? 1.4 : 2.4) + i * 0.8;
      rect(ctx, sx, sy, dash ? 5 : 4, 3, c(i % 2 ? "#d64b3c" : "#b83731"));
    }
    ctx.restore();
    rect(ctx, -7, -22, 10, 3, c("#d95040"));
    rect(ctx, -6, -20, 4, 2, c("#a52e2a"));

    // staff behind for idle / run / jump
    let staffAngle = -1.3;
    let handX = 5;
    let handY = -14;
    if (run) {
      staffAngle = -1.05;
      handX = 6;
      handY = -13;
    } else if (jump) {
      staffAngle = -1.5;
      handX = 6;
      handY = -16;
    } else if (hurt) {
      staffAngle = -0.8;
      handX = 4;
      handY = -12;
    }
    if (!attack && !skill) drawStaff(ctx, handX, handY, staffAngle, jump ? 24 : 27, flash, weaponColor);

    // 腿甲 / 战靴：装备直接决定腿甲与靴子的配色与层次
    const legColor = gear.legs ? gear.legs.color : "#33507f";
    const bootColor = gear.shoes ? gear.shoes.color : "#3a2a23";
    let legDefs;
    if (state === "dead") legDefs = [];
    else if (jump) legDefs = [[-6, -10, -0.4], [2, -9, 0.5]];
    else if (attack) legDefs = [[-8, -11, -0.3], [3, -11, 0.45]];
    else if (run) legDefs = [[-5 + runPhase * 2.4, -10 - Math.max(0, runPhase) * 2, runPhase], [1 - runPhase * 2.4, -10 - Math.max(0, -runPhase) * 2, -runPhase]];
    else if (dash) legDefs = [[-11, -8, -0.7], [2, -10, 0.45]];
    else legDefs = [[-5, -11, 0], [2, -11, 0]];
    for (const [lx, ly, swing] of legDefs) {
      const kneeX = lx + swing * 1.6;
      rect(ctx, lx, ly, 5, 10, c(legColor));
      rect(ctx, lx + 1, ly, 3, 7, c(tint(legColor, 0.2)));
      rect(ctx, Math.round(kneeX), ly + 6, 3, 3, c(tint(legColor, 0.35)));   // 膝盖甲
      rect(ctx, lx - 1, ly + 8, 7, 3, c(bootColor));                          // 战靴
      rect(ctx, lx - 1, ly + 10, 7, 1, c(shade(bootColor, 0.55)));
      rect(ctx, lx, ly + 8, 5, 1, c(tint(bootColor, 0.3)));
      if (gear.legs) {
        rect(ctx, lx, ly + 1, 5, 1, "#f0d98a");
        rect(ctx, lx + 1, ly + 4, 3, 1, shade(gear.legs.color, 0.45));
      }
      if (gear.shoes) rect(ctx, lx - 1, ly + 8, 7, 1, "#f0d98a");
    }

    // torso —— 更宽厚的英雄体型
    const torsoShift = lean * 0.4;
    rect(ctx, -9 + torsoShift, -23, 4, 7, c("#7c482a"));
    rect(ctx, 6 + torsoShift, -23, 4, 7, c("#7c482a"));
    rect(ctx, -9 + torsoShift, -23, 4, 2, c("#a86a33"));
    rect(ctx, 6 + torsoShift, -23, 4, 2, c("#a86a33"));
    rect(ctx, -7 + torsoShift, -23, 15, 12, c("#c08a24"));
    rect(ctx, -7 + torsoShift, -23, 5, 11, c("#9c6a18"));
    rect(ctx, 2 + torsoShift, -23, 6, 11, c("#e0a82f"));
    rect(ctx, -4 + torsoShift, -22, 10, 5, c("#e7b23b"));
    rect(ctx, -3 + torsoShift, -21, 4, 4, c("#f0c45c"));
    rect(ctx, 0 + torsoShift, -21, 3, 4, c("#d9a12e"));
    rect(ctx, -3 + torsoShift, -16, 7, 1, c("#a8761c"));
    rect(ctx, -3 + torsoShift, -14, 7, 1, c("#a8761c"));
    rect(ctx, -2 + torsoShift, -21, 5, 4, c("#b9834a"));
    rect(ctx, 0 + torsoShift, -20, 2, 2, c("#e0ab71"));
    rect(ctx, -8 + torsoShift, -13, 17, 3, c("#c23a30"));
    rect(ctx, 0 + torsoShift, -12, 3, 2, c("#f2c55e"));
    rect(ctx, -8 + torsoShift, -13, 17, 1, c("#e07a5a"));

    if (gear.body) {
      const bc = c(gear.body.color);
      rect(ctx, -10 + torsoShift, -24, 5, 6, bc);
      rect(ctx, 5 + torsoShift, -24, 5, 6, bc);
      rect(ctx, -10 + torsoShift, -24, 5, 1, "#f0d98a");
      rect(ctx, 5 + torsoShift, -24, 5, 1, "#f0d98a");
      rect(ctx, -10 + torsoShift, -19, 5, 2, shade(gear.body.color, 0.55));
      rect(ctx, 5 + torsoShift, -19, 5, 2, shade(gear.body.color, 0.55));
      rect(ctx, -8 + torsoShift, -23, 16, 10, bc);
      rect(ctx, -6 + torsoShift, -22, 12, 6, tint(gear.body.color, 0.2));
      rect(ctx, -4 + torsoShift, -24, 9, 2, "#f0d98a");
      rect(ctx, -8 + torsoShift, -14, 16, 1, "#e8c35a");
      rect(ctx, -2 + torsoShift, -21, 4, 3, "#fff0b8");
      rect(ctx, -8 + torsoShift, -13, 16, 4, bc);
      rect(ctx, -8 + torsoShift, -13, 16, 1, "#f0d98a");
      rect(ctx, -8 + torsoShift, -9, 6, 3, bc);
      rect(ctx, 3 + torsoShift, -9, 6, 3, bc);
      if (gear.body.rarity === "epic" || gear.body.rarity === "legendary") {
        ctx.save();
        ctx.globalAlpha = 0.28;
        halo(ctx, torsoShift, -18, 17, gear.body.color, 0.5);
        ctx.restore();
      }
    }

    // arms
    if (attack) {
      const a = attackAngle(combo, progress);
      handX = 1 + Math.cos(a) * 8;
      handY = -17 + Math.sin(a) * 5;
      line(ctx, 2 + torsoShift, -20, handX, handY, c("#9b6037"), 3);
      rect(ctx, handX - 1, handY - 1, 3, 3, c("#e0ab71"));
      line(ctx, -6 + torsoShift, -19, -10, -15, c("#b77c21"), 2);
    } else if (skill) {
      if (skillId === "fireEye") {
        line(ctx, 2 + torsoShift, -20, -2, -27, c("#9b6037"), 3);
        line(ctx, -4 + torsoShift, -19, 4, -27, c("#9b6037"), 3);
        rect(ctx, -3, -28, 3, 3, c("#e0ab71"));
        rect(ctx, 3, -28, 3, 3, c("#e0ab71"));
      } else if (skillId === "clone") {
        line(ctx, 4 + torsoShift, -20, 4, -29, c("#9b6037"), 3);
        rect(ctx, 3, -31, 3, 3, c("#e0ab71"));
        line(ctx, -4 + torsoShift, -19, -9, -13, c("#9b6037"), 3);
      } else if (skillId === "staffSlam") {
        const a = lerp(-2.7, 0.9, 1 - Math.pow(1 - skillProgress, 2.4));
        handX = 1 + Math.cos(a) * 8;
        handY = -17 + Math.sin(a) * 5;
        line(ctx, 2 + torsoShift, -20, handX, handY, c("#9b6037"), 3);
        rect(ctx, handX - 1, handY - 1, 3, 3, c("#e0ab71"));
        line(ctx, -5 + torsoShift, -19, -9, -23, c("#b77c21"), 2);
      } else {
        const a = t * 17;
        const hx2 = Math.cos(a) * 7;
        const hy = -17 + Math.sin(a) * 3;
        line(ctx, 2 + torsoShift, -20, hx2, hy, c("#9b6037"), 3);
        rect(ctx, hx2 - 1, hy - 1, 3, 3, c("#e0ab71"));
        line(ctx, -4 + torsoShift, -19, -Math.cos(a) * 7, -17 - Math.sin(a) * 3, c("#9b6037"), 3);
      }
    } else if (jump) {
      line(ctx, -5 + torsoShift, -20, -10, -25, c("#9b6037"), 3);
      line(ctx, 4 + torsoShift, -19, 10, -23, c("#9b6037"), 3);
    } else if (hurt) {
      line(ctx, -5, -20, -10, -15, c("#9b6037"), 3);
      line(ctx, 4, -20, 8, -25, c("#9b6037"), 3);
    } else {
      const armSwing = run ? runPhase * 2.4 : Math.sin(t * 3.2) * 0.5;
      line(ctx, -5 + torsoShift, -20, -7 - armSwing, -14, c("#9b6037"), 3);
      line(ctx, 4 + torsoShift, -20, 7 + armSwing, -15, c("#9b6037"), 3);
      rect(ctx, 6 + armSwing, -16, 3, 3, c("#e0ab71"));
    }

    // head
    const hx = torsoShift + (attack ? 1 : 0);
    rect(ctx, -6 + hx, -29, 13, 8, c("#9b6037"));
    rect(ctx, -7 + hx, -28, 3, 4, c("#b97a46"));
    rect(ctx, 7 + hx, -28, 3, 4, c("#b97a46"));
    rect(ctx, -5 + hx, -27, 11, 6, c("#dca676"));
    rect(ctx, -3 + hx, -26, 7, 4, c("#e6ad79"));
    rect(ctx, -6 + hx, -30, 13, 2, c("#d9a53b"));
    rect(ctx, -5 + hx, -31, 4, 2, c("#f0c45c"));
    rect(ctx, 4 + hx, -31, 3, 2, c("#c38a2c"));
    // mane —— 鬃毛披散，更具妖王气势
    rect(ctx, -8 + hx, -33, 3, 6, c("#5f3620"));
    rect(ctx, -6 + hx, -35, 4, 5, c("#7c482a"));
    rect(ctx, -2 + hx, -36, 5, 5, c("#8d542f"));
    rect(ctx, 3 + hx, -35, 4, 5, c("#6f3e25"));
    rect(ctx, 6 + hx, -33, 3, 6, c("#5f3620"));
    rect(ctx, -7 + hx, -30, 2, 3, c("#a86a33"));
    rect(ctx, 6 + hx, -30, 2, 3, c("#a86a33"));
    // headband tails
    rect(ctx, -10 + hx, -29, 4, 1, c("#e7ba4a"));
    rect(ctx, -12 + hx, -28 + Math.sin(t * 5) * 1, 3, 1, c("#d19f35"));
    rect(ctx, -11 + hx, -27 + Math.sin(t * 5 + 1) * 1, 3, 1, c("#b9872a"));
    // face — 冷峻凶相：金瞳 + 怒眉 + 无高光 + 战纹
    rect(ctx, -2 + hx, -26, 2, 2, c("#241611"));
    rect(ctx, 3 + hx, -26, 2, 2, c("#241611"));
    rect(ctx, -2 + hx, -26, 1, 1, c("#f6c95c"));
    rect(ctx, 4 + hx, -26, 1, 1, c("#f6c95c"));
    rect(ctx, -2 + hx, -28, 3, 1, c("#2a1a13"));
    rect(ctx, 3 + hx, -28, 3, 1, c("#2a1a13"));
    rect(ctx, 0 + hx, -24, 2, 1, c("#8e5a3a"));
    rect(ctx, 0 + hx, -22, 3, 1, c("#5a3222"));
    rect(ctx, -5 + hx, -25, 3, 1, c("#c23a30"));
    rect(ctx, 4 + hx, -25, 3, 1, c("#c23a30"));
    rect(ctx, -4 + hx, -25, 1, 1, c("#e9785a"));
    rect(ctx, 5 + hx, -25, 1, 1, c("#e9785a"));
    if (hurt) {
      rect(ctx, -3 + hx, -26, 3, 1, c("#f5d9c2"));
      rect(ctx, 2 + hx, -26, 3, 1, c("#f5d9c2"));
    }
    if (gear.head) {
      const hc = c(gear.head.color);
      rect(ctx, -7 + hx, -33, 15, 3, hc);
      rect(ctx, -8 + hx, -31, 3, 6, hc);
      rect(ctx, 6 + hx, -31, 3, 6, hc);
      rect(ctx, -6 + hx, -34, 13, 1, "#f0d98a");
      rect(ctx, -7 + hx, -31, 1, 5, shade(gear.head.color, 0.5));
      rect(ctx, 7 + hx, -31, 1, 5, shade(gear.head.color, 0.5));
      polygon(ctx, [[-2 + hx, -34], [0 + hx, -40], [2 + hx, -34]], hc);
      rect(ctx, -1 + hx, -39, 2, 5, hc);
      rect(ctx, -1 + hx, -37, 2, 2, "#f0d98a");
      if (gear.head.rarity === "epic" || gear.head.rarity === "legendary") {
        ctx.save();
        ctx.globalAlpha = 0.35;
        halo(ctx, hx, -33, 9, gear.head.color, 0.5);
        ctx.restore();
      }
    }
    if (skill && skillId === "fireEye") {
      halo(ctx, hx, -26, 5, "#ffd45e", 0.35);
      rect(ctx, -3 + hx, -27, 3, 2, "#fff0b0");
      rect(ctx, 3 + hx, -27, 3, 2, "#fff0b0");
    }

    // staff front + slash trail
    if (attack) {
      const a = attackAngle(combo, progress);
      ctx.save();
      const trailStart = a - (combo >= 3 ? 1.7 : 0.95) * (progress > 0.08 ? 1 : 0);
      for (let i = 0; i < (combo === 4 ? 10 : 7); i++) {
        const aa = lerp(trailStart, a, i / (combo === 4 ? 9 : 6));
        const rr = 17 + i % 2;
        ctx.globalAlpha = (0.1 + (i / 6) * 0.4) * (1 - Math.abs(progress - 0.55) * 0.5);
        rect(ctx, Math.cos(aa) * rr + 1, -17 + Math.sin(aa) * rr, 2, 2, i > 3 ? "#fff0a8" : "#f6bd45");
      }
      ctx.restore();
      drawStaff(ctx, 1, -17, a, combo === 4 ? 34 : combo === 3 ? 31 : 28, flash, weaponColor);
      if (progress > 0.25 && progress < 0.7) {
        halo(ctx, Math.cos(a) * 20, -17 + Math.sin(a) * 20, 5, "#ffd76a", 0.16);
      }
    } else if (skill) {
      if (skillId === "fireEye") {
        ctx.save();
        ellipse(ctx, 0, -42, 9, 4, "#ffd45e");
        ellipse(ctx, 0, -42, 6, 2, "#fff3c0");
        circle(ctx, 1, -42, 2, "#3a2608");
        ctx.globalAlpha = 0.5;
        for (let i = 0; i < 6; i++) {
          const ang = (i / 6) * TAU + t * 2;
          rect(ctx, Math.cos(ang) * 13, -42 + Math.sin(ang) * 8, 2, 2, "#ffe9a1");
        }
        ctx.restore();
      } else if (skillId === "clone") {
        halo(ctx, 0, -26, 12, "#7ce9cb", 0.24);
        ctx.save();
        ctx.globalAlpha = 0.6;
        for (let i = 0; i < 6; i++) {
          const ang = (i / 6) * TAU + t * 3;
          rect(ctx, Math.cos(ang) * 12, -26 + Math.sin(ang) * 9, 2, 2, "#b9ffe9");
        }
        ctx.restore();
      } else if (skillId === "staffSlam") {
        const a = lerp(-2.7, 0.9, 1 - Math.pow(1 - skillProgress, 2.4));
        ctx.save();
        ctx.globalAlpha = 0.3;
        for (let i = 0; i < 8; i++) {
          const aa = a - 0.9 + (i / 8) * 0.9;
          rect(ctx, Math.cos(aa) * 20, -17 + Math.sin(aa) * 20, 2, 2, "#ffe6a8");
        }
        ctx.restore();
        drawStaff(ctx, 1, -17, a, 34, flash, weaponColor);
        halo(ctx, Math.cos(a) * 20, -17 + Math.sin(a) * 20, 5, "#ffd76a", 0.2);
      } else {
        const a = t * 17;
        const spinA = a + Math.PI;
        ctx.save();
        for (let i = 0; i < 10; i++) {
          const aa = a + (i / 10) * TAU;
          ctx.globalAlpha = 0.22 + (i % 2) * 0.12;
          rect(ctx, Math.cos(aa) * 19, -16 + Math.sin(aa) * 19, 2, 2, i % 3 ? "#f6b33c" : "#ffe28a");
        }
        ctx.restore();
        drawStaff(ctx, 0, -16, a, 30, flash, weaponColor);
        drawStaff(ctx, 0, -16, spinA, 24, flash, weaponColor);
        halo(ctx, 0, -16, 22, "#f07b32", 0.11);
      }
    }

    ctx.restore();

    if (roll > 0 && roll < 1) {
      ctx.save();
      ctx.globalAlpha = (1 - roll) * 0.55;
      for (let i = 0; i < 8; i++) {
        const a = roll * TAU + (i / 8) * TAU;
        rect(ctx, x + Math.cos(a) * 16, y - 15 + Math.sin(a) * 12, 2, 2, i % 2 ? "#fff0aa" : "#8fe0c7");
      }
      ctx.restore();
    }
  }

  function attackAngle(combo, p) {
    const ease = 1 - Math.pow(1 - p, 2.4);
    if (combo === 1) return lerp(-2.55, 0.58, ease);
    if (combo === 2) return lerp(0.9, -2.2, ease);
    if (combo === 3) return lerp(-3.0, 1.15, ease);
    return -1.6 + p * TAU * 1.15;
  }

  /* ------------------------------------------------------------------ */
  /* Enemies                                                             */
  /* ------------------------------------------------------------------ */

  function drawEnemy(ctx, e, t) {
    const flash = e.flash > 0;
    const c = (color) => (flash ? "#fff5e2" : color);
    const facing = e.facing || 1;
    const state = e.state;
    const run = state === "chase";
    const phase = Math.sin((e.animTime || t) * 13);
    const windup = state === "windup";
    const attack = state === "attack" || state === "charge" || state === "cast";
    const dead = state === "dead";
    const deathT = clamp(e.deathT || 0, 0, 1);

    shadow(ctx, e.x, e.flying ? FLOOR : e.y, e.w * 0.6, e.flying ? 0.14 : 0.23);

    ctx.save();
    ctx.translate(Math.round(e.x), Math.round(e.y));
    if (facing < 0) ctx.scale(-1, 1);
    if (dead) {
      ctx.globalAlpha = 1 - deathT;
      ctx.translate(0, deathT * 7);
      ctx.rotate(deathT * 0.7 * facing);
    }
    if (windup) {
      ctx.globalAlpha = 0.75 + Math.sin(t * 30) * 0.2;
    }

    switch (e.type) {
      case "monkey": drawMonkeyEnemy(ctx, e, t, phase, run, windup, attack, c); break;
      case "tree": drawTreeEnemy(ctx, e, t, windup, attack, c); break;
      case "bat":
      case "batking": drawBatEnemy(ctx, e, t, phase, windup, attack, c); break;
      case "imp": drawImpEnemy(ctx, e, t, phase, run, windup, attack, c); break;
      case "stone": drawStoneEnemy(ctx, e, t, windup, attack, c); break;
      case "skeleton": drawSkeletonEnemy(ctx, e, t, phase, run, windup, attack, c); break;
      case "archer": drawArcherEnemy(ctx, e, t, windup, attack, c); break;
      case "knight": drawKnightEnemy(ctx, e, t, phase, windup, attack, c); break;
      case "fireImp": drawFireImpEnemy(ctx, e, t, phase, run, windup, attack, c); break;
      case "flameSpirit": drawFlameSpirit(ctx, e, t, windup, attack, c); break;
      case "fireBat": drawFireBatEnemy(ctx, e, t, phase, windup, attack, c); break;
      case "waterImp": drawWaterImpEnemy(ctx, e, t, phase, run, windup, attack, c); break;
      case "waterArcher": drawWaterArcher(ctx, e, t, windup, attack, c); break;
      case "turtle": drawTurtleEnemy(ctx, e, t, windup, attack, c); break;
      case "goldImp": drawFireImpEnemy(ctx, e, t, phase, run, windup, attack, c); break;
      case "silverImp": drawWaterImpEnemy(ctx, e, t, phase, run, windup, attack, c); break;
      case "gourdSpirit": drawFlameSpirit(ctx, e, t, windup, attack, c); break;
      case "spiderling":
      case "webSpinner": drawSpiderEnemy(ctx, e, t, phase, windup, attack, c); break;
      case "lionDemon": drawLionEnemy(ctx, e, t, phase, windup, attack, c); break;
      case "elephantDemon": drawElephantEnemy(ctx, e, t, windup, attack, c); break;
      case "roc": drawRocEnemy(ctx, e, t, phase, windup, attack, c); break;
      case "flameBull": drawBullEnemy(ctx, e, t, windup, attack, c); break;
      case "fireCultivator": drawFireImpEnemy(ctx, e, t, phase, run, windup, attack, c); break;
      case "magmaTurtle": drawTurtleEnemy(ctx, e, t, windup, attack, c); break;
      case "chaos": drawChaosBoss(ctx, e, t, windup, attack, c); break;
      case "bear": drawBearBoss(ctx, e, t, windup, attack, c); break;
      case "bone": drawBoneBoss(ctx, e, t, windup, attack, c); break;
      case "redBoy": drawRedBoyBoss(ctx, e, t, windup, attack, c); break;
      case "inspiration": drawInspirationBoss(ctx, e, t, windup, attack, c); break;
      case "goldHorn": drawGoldHornBoss(ctx, e, t, windup, attack, c); break;
      case "spiderQueen": drawSpiderQueenBoss(ctx, e, t, windup, attack, c); break;
      case "rocKing": drawRocKingBoss(ctx, e, t, windup, attack, c); break;
      case "bullDemon": drawBullDemonBoss(ctx, e, t, windup, attack, c); break;
      case "sixEar": drawChaosBoss(ctx, e, t, windup, attack, c); break;
      case "yellowBrow": drawGoldHornBoss(ctx, e, t, windup, attack, c); break;
      case "hundredEyes": drawSpiderQueenBoss(ctx, e, t, windup, attack, c); break;
      case "jadeRabbit": drawBearBoss(ctx, e, t, windup, attack, c); break;
      case "nineHeads": drawBullDemonBoss(ctx, e, t, windup, attack, c); break;
      case "tuoDragon": drawInspirationBoss(ctx, e, t, windup, attack, c); break;
      case "rhinoKing": drawBullDemonBoss(ctx, e, t, windup, attack, c); break;
      case "scorpion": drawSpiderQueenBoss(ctx, e, t, windup, attack, c); break;
      case "leopard": drawBearBoss(ctx, e, t, windup, attack, c); break;
      case "rhinoBro": drawGoldHornBoss(ctx, e, t, windup, attack, c); break;
      case "mara": drawChaosBoss(ctx, e, t, windup, attack, c); break;
      default: drawMonkeyEnemy(ctx, e, t, phase, run, windup, attack, c); break;
    }

    ctx.restore();

    if (!dead && e.hp < e.maxHp && e.kind !== "boss") {
      drawEnemyHealth(ctx, e);
    }
  }

  function drawEnemyHealth(ctx, e) {
    const w = Math.max(18, e.w + 5);
    const x = e.x - w / 2;
    const y = e.y - e.h - 8;
    rect(ctx, x - 1, y - 1, w + 2, 5, "rgba(5,6,10,0.82)");
    rect(ctx, x, y, w, 3, "#3b2026");
    rect(ctx, x, y, w * clamp(e.hp / e.maxHp, 0, 1), 3, e.elite ? "#f0c65b" : "#dd6153");
    if (e.elite) rect(ctx, x + w / 2 - 1, y - 5, 3, 2, "#f0c65b");
  }

  function drawMonkeyEnemy(ctx, e, t, phase, run, windup, attack, c) {
    shadowlessTail(ctx, t, c);
    rect(ctx, -4, -12, 4, 10, c("#36455c"));
    rect(ctx, 2, -12, 4, 10, c("#2b394e"));
    rect(ctx, -5, -3, 6, 3, c("#37261f"));
    rect(ctx, 2, -3, 6, 3, c("#37261f"));
    rect(ctx, -5, -20, 11, 9, c("#86512c"));
    rect(ctx, -5, -18, 11, 4, c("#b56e39"));
    rect(ctx, -3, -11, 7, 2, c("#a8322f"));
    rect(ctx, -6, -18, 3, 6, c("#9b5d33"));
    rect(ctx, 5, -18 - (windup || attack ? 4 : 0), 3, 6, c("#9b5d33"));
    rect(ctx, -6, -25, 12, 7, c("#9b5d33"));
    rect(ctx, -4, -24, 8, 5, c("#d4a06b"));
    rect(ctx, -6, -26, 12, 2, c("#d2a13e"));
    rect(ctx, -2, -23, 2, 2, c("#2b1a14"));
    rect(ctx, 3, -23, 2, 2, c("#2b1a14"));
    rect(ctx, 0, -21, 3, 1, c("#7b4332"));
    rect(ctx, -8, -27, 2, 4, c("#83502e"));
    rect(ctx, 8, -27, 2, 4, c("#83502e"));
    // club
    const angle = attack ? lerp(-1.4, 0.75, clamp(e.attackT || 0, 0, 1)) : windup ? -1.6 : -1.15;
    const hx = 6;
    const hy = -16;
    line(ctx, hx, hy, hx + Math.cos(angle) * 17, hy + Math.sin(angle) * 17, c("#6b4227"), 3);
    rect(ctx, hx + Math.cos(angle) * 17 - 2, hy + Math.sin(angle) * 17 - 2, 5, 5, c("#8b6234"));
    rect(ctx, hx + Math.cos(angle) * 17, hy + Math.sin(angle) * 17, 2, 2, c("#c9a166"));
    rect(ctx, 7, -15, 3, 3, c("#e0a775"));
    if (windup) rect(ctx, -1, -33, 3, 2, c("#f9d97b"));
  }

  function shadowlessTail(ctx, t, c) {
    for (let i = 0; i < 4; i++) {
      const x = -5 - i * 3;
      const y = -9 - i * 2 + Math.sin(t * 4 + i) * 1.5;
      rect(ctx, x, y, 3, 2, c(i < 2 ? "#704022" : "#8d592f"));
    }
  }

  function drawTreeEnemy(ctx, e, t, windup, attack, c) {
    const sway = Math.sin(t * 1.2) * 1.2;
    rect(ctx, -10, -30, 20, 30, c("#5e422d"));
    rect(ctx, -7, -28, 5, 26, c("#785538"));
    rect(ctx, -10, -2, 9, 3, c("#453024"));
    rect(ctx, 2, -2, 9, 3, c("#453024"));
    // roots
    line(ctx, -9, -2, -17, 0, c("#4b3224"), 3);
    line(ctx, 9, -2, 16, 0, c("#4b3224"), 3);
    // face
    rect(ctx, -5, -23, 3, 3, c("#3b2b1f"));
    rect(ctx, 2, -23, 3, 3, c("#3b2b1f"));
    rect(ctx, -4, -22, 1, 1, c("#f1d25d"));
    rect(ctx, 3, -22, 1, 1, c("#f1d25d"));
    rect(ctx, -2, -17, 5, 2, c("#2f2119"));
    // moss
    rect(ctx, -10, -31, 4, 4, c("#6f9a53"));
    rect(ctx, 5, -28, 4, 3, c("#5f8847"));
    // crown
    const crownY = -34;
    circle(ctx, -11 + sway, crownY, 9, c("#47713e"));
    circle(ctx, 0 + sway, crownY - 5, 13, c("#568a45"));
    circle(ctx, 12 + sway, crownY - 1, 9, c("#3f6638"));
    circle(ctx, -4 + sway, crownY - 10, 7, c("#6e9d51"));
    rect(ctx, -15 + sway, crownY - 8, 3, 2, c("#8ab65e"));
    rect(ctx, 9 + sway, crownY - 11, 3, 2, c("#8ab65e"));
    // branch arms
    if (windup) {
      line(ctx, -8, -20, -25, -31, c("#5e422d"), 4);
      line(ctx, 8, -20, 25, -31, c("#5e422d"), 4);
    } else if (attack) {
      line(ctx, 8, -20, 30, -4, c("#5e422d"), 4);
      line(ctx, -8, -20, -27, -12, c("#5e422d"), 4);
    } else {
      line(ctx, 8, -20, 22, -21 + sway, c("#5e422d"), 4);
      line(ctx, -8, -20, -20, -17 - sway, c("#5e422d"), 4);
    }
  }

  function drawBatEnemy(ctx, e, t, phase, windup, attack, c) {
    const flap = Math.sin(t * (windup ? 20 : 11) + (e.animTime || 0)) * 6;
    const scale = e.type === "batking" ? 1.25 : 1;
    ctx.save();
    ctx.scale(scale, scale);
    // wings
    polygon(ctx, [[-4, -10], [-20, -16 - flap], [-15, -6], [-21, -3], [-5, -1]], c("#5b447f"));
    polygon(ctx, [[4, -10], [20, -16 - flap], [15, -6], [21, -3], [5, -1]], c("#5b447f"));
    polygon(ctx, [[-5, -10], [-15, -13 - flap * 0.7], [-12, -5], [-5, -3]], c("#7559a2"));
    polygon(ctx, [[5, -10], [15, -13 - flap * 0.7], [12, -5], [5, -3]], c("#7559a2"));
    rect(ctx, -6, -12, 12, 10, c("#3a2b4e"));
    rect(ctx, -4, -13, 8, 5, c("#5c4774"));
    rect(ctx, -4, -10, 3, 3, c("#f0c85c"));
    rect(ctx, 2, -10, 3, 3, c("#f0c85c"));
    rect(ctx, -1, -9, 1, 1, c("#261a17"));
    rect(ctx, 1, -9, 1, 1, c("#261a17"));
    rect(ctx, -2, -6, 5, 2, c("#a25d75"));
    rect(ctx, -1, -5, 1, 2, c("#f3e8d0"));
    rect(ctx, 2, -5, 1, 2, c("#f3e8d0"));
    ctx.restore();
    if (windup) rect(ctx, -2, -22, 4, 2, c("#e8b4ff"));
  }

  function drawImpEnemy(ctx, e, t, phase, run, windup, attack, c) {
    rect(ctx, -5, -12, 4, 10, c("#303247"));
    rect(ctx, 2, -12, 4, 10, c("#282a3c"));
    rect(ctx, -6, -3, 6, 3, c("#211c25"));
    rect(ctx, 2, -3, 6, 3, c("#211c25"));
    rect(ctx, -6, -21, 12, 10, c("#42465f"));
    rect(ctx, -4, -19, 8, 5, c("#5a5e7a"));
    rect(ctx, -4, -13, 9, 2, c("#7f3638"));
    rect(ctx, -6, -28, 13, 8, c("#565b75"));
    rect(ctx, -8, -31, 3, 5, c("#e0c97c"));
    rect(ctx, 6, -31, 3, 5, c("#e0c97c"));
    rect(ctx, -4, -27, 3, 2, c("#ee5b50"));
    rect(ctx, 3, -27, 3, 2, c("#ee5b50"));
    rect(ctx, -2, -24, 6, 2, c("#2a1d26"));
    // axe
    const angle = attack ? lerp(-2.0, 0.7, clamp(e.attackT || 0, 0, 1)) : windup ? -2.2 : -1.3;
    const hx = 7;
    const hy = -17;
    const ax = hx + Math.cos(angle) * 14;
    const ay = hy + Math.sin(angle) * 14;
    line(ctx, hx, hy, ax, ay, c("#65462c"), 3);
    polygon(ctx, [[ax - 1, ay - 1], [ax + 7, ay - 6], [ax + 9, ay + 3], [ax + 2, ay + 2]], c("#9fa6b3"));
    rect(ctx, ax + 2, ay - 2, 2, 2, c("#d2d6db"));
    rect(ctx, 6, -16, 3, 3, c("#6b6f8b"));
    if (windup) rect(ctx, -2, -36, 3, 2, c("#ff7466"));
  }

  function drawStoneEnemy(ctx, e, t, windup, attack, c) {
    const shake = windup ? Math.sin(t * 40) * 1 : 0;
    ctx.translate(shake, 0);
    ellipse(ctx, 0, -15, 15, 15, c("#4d5260"));
    ellipse(ctx, 0, -17, 12, 13, c("#626877"));
    rect(ctx, -12, -6, 8, 6, c("#464b58"));
    rect(ctx, 4, -6, 8, 6, c("#3b404d"));
    rect(ctx, -11, -12, 8, 3, c("#7d8290"));
    rect(ctx, 4, -22, 7, 3, c("#787d8b"));
    // cracks
    line(ctx, -7, -26, -2, -18, c("#2f333e"), 1);
    line(ctx, -2, -18, 4, -20, c("#2f333e"), 1);
    line(ctx, 6, -12, 10, -6, c("#30343e"), 1);
    // eyes
    rect(ctx, -6, -20, 4, 3, c("#2a201e"));
    rect(ctx, 3, -20, 4, 3, c("#2a201e"));
    rect(ctx, -5, -19, 2, 1, c("#f3b854"));
    rect(ctx, 4, -19, 2, 1, c("#f3b854"));
    // moss
    rect(ctx, -14, -29, 7, 3, c("#617d49"));
    rect(ctx, 8, -27, 4, 2, c("#567044"));
    // arms
    if (attack) {
      rect(ctx, -23, -12, 9, 8, c("#555b68"));
      rect(ctx, 13, -9, 10, 8, c("#555b68"));
    } else {
      rect(ctx, -21, -16, 8, 10, c("#555b68"));
      rect(ctx, 12, -18, 8, 10, c("#4b505d"));
    }
    if (windup) rect(ctx, -3, -39, 5, 2, c("#f9d67a"));
  }

  function drawSkeletonEnemy(ctx, e, t, phase, run, windup, attack, c) {
    const leg = run ? phase * 2.5 : 0;
    line(ctx, -4, -11, -6 + leg, -1, c("#c7c2ad"), 3);
    line(ctx, 3, -11, 5 - leg, -1, c("#bdb8a3"), 3);
    rect(ctx, -7 + leg, -2, 6, 2, c("#9c9784"));
    rect(ctx, 2 - leg, -2, 6, 2, c("#9c9784"));
    // pelvis + ribs
    rect(ctx, -6, -14, 11, 4, c("#aaa48f"));
    rect(ctx, -5, -22, 10, 8, c("#d7d1bb"));
    rect(ctx, -5, -22, 2, 8, c("#b6b09b"));
    rect(ctx, -6, -20, 12, 1, c("#8d8877"));
    rect(ctx, -6, -17, 12, 1, c("#8d8877"));
    // arms
    line(ctx, -5, -20, -9 - (windup ? 2 : 0), -12, c("#c7c2ad"), 2);
    line(ctx, 5, -20, 8, -14, c("#c7c2ad"), 2);
    // skull
    circle(ctx, 0, -27, 7, c("#ddd7c1"));
    rect(ctx, -5, -27, 3, 3, c("#2e2922"));
    rect(ctx, 3, -27, 3, 3, c("#2e2922"));
    rect(ctx, -4, -26, 1, 1, c("#75c1a1"));
    rect(ctx, 4, -26, 1, 1, c("#75c1a1"));
    rect(ctx, -2, -23, 5, 2, c("#8c8675"));
    rect(ctx, -1, -22, 1, 1, c("#5a5448"));
    rect(ctx, 2, -22, 1, 1, c("#5a5448"));
    // rusty blade
    const angle = attack ? lerp(-1.8, 0.65, clamp(e.attackT || 0, 0, 1)) : windup ? -2.0 : -1.15;
    const hx = 7;
    const hy = -16;
    line(ctx, hx, hy, hx + Math.cos(angle) * 15, hy + Math.sin(angle) * 15, c("#5f5b50"), 3);
    rect(ctx, hx + Math.cos(angle) * 15 - 1, hy + Math.sin(angle) * 15 - 1, 3, 3, c("#c6b46e"));
    if (windup) rect(ctx, -2, -38, 3, 2, c("#aee0c3"));
  }

  function drawArcherEnemy(ctx, e, t, windup, attack, c) {
    line(ctx, -4, -11, -6, -1, c("#c3bea9"), 3);
    line(ctx, 3, -11, 5, -1, c("#b9b49f"), 3);
    rect(ctx, -7, -2, 6, 2, c("#989380"));
    rect(ctx, 2, -2, 6, 2, c("#989380"));
    rect(ctx, -5, -14, 10, 4, c("#aaa48f"));
    rect(ctx, -4, -22, 9, 8, c("#d3cdb7"));
    rect(ctx, -5, -20, 10, 1, c("#8d8877"));
    rect(ctx, -5, -17, 10, 1, c("#8d8877"));
    line(ctx, 4, -19, 8, -13, c("#c3bea9"), 2);
    circle(ctx, 0, -27, 6, c("#ded8c2"));
    rect(ctx, -4, -27, 2, 2, c("#302b24"));
    rect(ctx, 3, -27, 2, 2, c("#302b24"));
    rect(ctx, -3, -26, 1, 1, c("#8bd4b5"));
    rect(ctx, 4, -26, 1, 1, c("#8bd4b5"));
    rect(ctx, -2, -23, 4, 2, c("#8d8776"));
    // bow
    const draw = attack ? 4 : windup ? 2 : 0;
    const bx = 8;
    const by = -16;
    ctx.save();
    ctx.strokeStyle = c("#a97b43");
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(bx, by, 11, -1.2, 1.2);
    ctx.stroke();
    line(ctx, bx + Math.cos(-1.2) * 11, by + Math.sin(-1.2) * 11, bx + Math.cos(1.2) * 11 - draw, by + Math.sin(1.2) * 11, c("#ded4ba"), 1);
    if (windup) {
      line(ctx, bx - 4, by, bx + 8 + draw, by, c("#e9e0c9"), 1);
      rect(ctx, bx + 9 + draw, by - 1, 3, 2, c("#b8b39f"));
    }
    ctx.restore();
    if (windup) rect(ctx, -1, -37, 2, 2, c("#b9f0d4"));
  }

  function drawKnightEnemy(ctx, e, t, phase, windup, attack, c) {
    const leg = Math.sin(t * 6) * 1.5;
    rect(ctx, -6, -12, 5, 11, c("#b5b09a"));
    rect(ctx, 2, -12, 5, 11, c("#aba68f"));
    rect(ctx, -8 + leg, -2, 7, 3, c("#777267"));
    rect(ctx, 3 - leg, -2, 7, 3, c("#777267"));
    // cape
    polygon(ctx, [[-7, -27], [-18 + Math.sin(t * 3) * 2, -11], [-10, -13], [4, -26]], c("#553b48"));
    // torso armor
    rect(ctx, -7, -25, 15, 13, c("#7b7567"));
    rect(ctx, -5, -23, 11, 9, c("#918a78"));
    rect(ctx, -5, -24, 11, 2, c("#c7bea3"));
    rect(ctx, -7, -16, 15, 2, c("#4f4a43"));
    // shoulder
    rect(ctx, -11, -25, 5, 6, c("#5f594f"));
    rect(ctx, 7, -25, 5, 6, c("#5f594f"));
    // helmet skull
    rect(ctx, -6, -34, 13, 10, c("#b9b299"));
    rect(ctx, -5, -33, 11, 7, c("#d7d0b8"));
    rect(ctx, -8, -35, 3, 5, c("#8e8774"));
    rect(ctx, 6, -35, 3, 5, c("#8e8774"));
    rect(ctx, -4, -31, 3, 2, c("#386b5c"));
    rect(ctx, 3, -31, 3, 2, c("#386b5c"));
    rect(ctx, -4, -32, 1, 1, c("#b9ffe4"));
    rect(ctx, 4, -32, 1, 1, c("#b9ffe4"));
    rect(ctx, -2, -27, 5, 2, c("#6e685a"));
    rect(ctx, -1, -26, 1, 1, c("#453f36"));
    rect(ctx, 2, -26, 1, 1, c("#453f36"));
    // greatsword
    const angle = attack ? lerp(-2.1, 0.85, clamp(e.attackT || 0, 0, 1)) : windup ? -2.3 : -1.0;
    const hx = 8;
    const hy = -17;
    const tx = hx + Math.cos(angle) * 23;
    const ty = hy + Math.sin(angle) * 23;
    line(ctx, hx, hy, tx, ty, c("#4e574f"), 4);
    line(ctx, hx, hy, tx, ty, c("#c5d0bf"), 1);
    line(ctx, hx + Math.cos(angle + 1.57) * 4, hy + Math.sin(angle + 1.57) * 4, hx - Math.cos(angle + 1.57) * 4, hy - Math.sin(angle + 1.57) * 4, c("#c9a94d"), 2);
    if (windup) rect(ctx, -2, -45, 4, 2, c("#c6ffe3"));
  }

  /* ------------------------------------------------------------------ */
  /* Bosses                                                              */
  /* ------------------------------------------------------------------ */

  function drawFireImpEnemy(ctx, e, t, phase, run, windup, attack, c) {
    const sway = Math.sin(t * 5 + e.x * 0.03) * 1;
    rect(ctx, -4, -11, 4, 11, c("#70251f"));
    rect(ctx, 2, -11, 4, 11, c("#5c1e1b"));
    rect(ctx, -5, -13, 11, 4, c("#c34a2f"));
    rect(ctx, -5, -22, 11, 10, c("#a83628"));
    rect(ctx, -3, -21, 7, 5, c("#d75b36"));
    rect(ctx, -6, -21, 3, 7, c("#b5402b"));
    rect(ctx, 4, -21, 3, 7, c("#b5402b"));
    rect(ctx, -4, -30, 9, 9, c("#d9683d"));
    rect(ctx, -5, -29, 2, 5, c("#b3482b"));
    rect(ctx, 4, -29, 2, 5, c("#b3482b"));
    rect(ctx, -3, -28, 3, 2, c("#ffd25e"));
    rect(ctx, 2, -28, 3, 2, c("#ffd25e"));
    rect(ctx, -1, -25, 4, 1, c("#7b2a1e"));
    drawFlame(ctx, sway, -31, 0.55, t * 1.6);
    if (attack) {
      const a = -0.5;
      line(ctx, 4, -18, 4 + Math.cos(a) * 16, -18 + Math.sin(a) * 16, c("#7a3a1e"), 2);
      drawFlame(ctx, 4 + Math.cos(a) * 17, -18 + Math.sin(a) * 17, 0.6, t * 2);
    }
    if (windup) {
      rect(ctx, -6, -35, 12, 2, "#ffb45a");
    }
  }

  function drawFlameSpirit(ctx, e, t, windup, attack, c) {
    const bob = Math.sin(t * 3 + e.x) * 3;
    halo(ctx, 0, -18 + bob, 15, "#ff8a3d", 0.2);
    drawFlame(ctx, 0, -6 + bob, 1.5, t * 1.8);
    polygon(ctx, [[-7, -14 + bob], [-4, -25 + bob], [0, -31 + bob], [5, -24 + bob], [7, -13 + bob], [0, -8 + bob]], c("#ff9a3f"));
    polygon(ctx, [[-3, -14 + bob], [0, -22 + bob], [3, -14 + bob], [0, -10 + bob]], c("#ffe7a1"));
    rect(ctx, -3, -20 + bob, 2, 2, c("#4c1d10"));
    rect(ctx, 2, -20 + bob, 2, 2, c("#4c1d10"));
    if (attack) {
      circle(ctx, 0, -35 + bob, 4, "#ffd36a");
      circle(ctx, 0, -35 + bob, 2, "#fff4c6");
    }
    if (windup) halo(ctx, 0, -18 + bob, 20, "#ff5f35", 0.25);
  }

  function drawFireBatEnemy(ctx, e, t, phase, windup, attack, c) {
    const flap = Math.sin(t * 14) * 7;
    polygon(ctx, [[-2, -15], [-18, -23 - flap], [-12, -12], [-20, -7 + flap], [-2, -10]], c("#a8322c"));
    polygon(ctx, [[2, -15], [18, -23 - flap], [12, -12], [20, -7 + flap], [2, -10]], c("#a8322c"));
    polygon(ctx, [[-12, -17], [-17, -21 - flap], [-13, -14]], c("#e36a45"));
    polygon(ctx, [[12, -17], [17, -21 - flap], [13, -14]], c("#e36a45"));
    circle(ctx, 0, -14, 7, c("#d34a36"));
    polygon(ctx, [[-5, -19], [-2, -24], [0, -18], [2, -24], [5, -19]], c("#7d2824"));
    rect(ctx, -4, -16, 2, 2, c("#ffd45e"));
    rect(ctx, 2, -16, 2, 2, c("#ffd45e"));
    rect(ctx, -2, -10, 4, 2, c("#5e1f1c"));
    if (windup) halo(ctx, 0, -14, 12, "#ff7a42", 0.25);
  }

  function drawWaterImpEnemy(ctx, e, t, phase, run, windup, attack, c) {
    const sway = Math.sin(t * 4 + e.x * 0.02);
    rect(ctx, -4, -11, 4, 11, c("#2e6572"));
    rect(ctx, 2, -11, 4, 11, c("#24525e"));
    rect(ctx, -5, -22, 11, 11, c("#3e8794"));
    rect(ctx, -3, -21, 7, 5, c("#63b2ba"));
    rect(ctx, -6, -20, 3, 7, c("#35717d"));
    rect(ctx, 4, -20, 3, 7, c("#35717d"));
    rect(ctx, -4, -30, 9, 9, c("#4c9aa4"));
    polygon(ctx, [[-5, -30], [-9, -36], [-3, -33]], c("#8fd8d8"));
    polygon(ctx, [[4, -30], [9, -35], [3, -33]], c("#8fd8d8"));
    rect(ctx, -3, -28, 2, 2, c("#d5fff4"));
    rect(ctx, 2, -28, 2, 2, c("#d5fff4"));
    rect(ctx, -1, -24, 4, 1, c("#24505c"));
    rect(ctx, -1, -23, 4, 2, c("#6fc8b8"));
    if (attack) {
      line(ctx, 3, -18, 14, -12 + sway * 2, c("#a9e3dd"), 2);
      rect(ctx, 13, -14, 4, 4, c("#d8fffa"));
    }
    if (windup) halo(ctx, 0, -18, 14, "#75d8e0", 0.2);
  }

  function drawWaterArcher(ctx, e, t, windup, attack, c) {
    rect(ctx, -4, -10, 3, 10, c("#3b6e78"));
    rect(ctx, 2, -10, 3, 10, c("#315b64"));
    rect(ctx, -5, -21, 10, 11, c("#5a9aa0"));
    rect(ctx, -3, -20, 6, 5, c("#93d1cd"));
    rect(ctx, -4, -28, 9, 8, c("#b9d8cc"));
    rect(ctx, -3, -27, 2, 2, c("#1d3940"));
    rect(ctx, 2, -27, 2, 2, c("#1d3940"));
    polygon(ctx, [[-4, -28], [-8, -34], [-2, -31]], c("#79b9b5"));
    polygon(ctx, [[4, -28], [8, -34], [2, -31]], c("#79b9b5"));
    line(ctx, 5, -18, 15, -19, c("#c7a75c"), 2);
    line(ctx, 15, -24, 15, -13, c("#a9e3dd"), 1);
    if (attack) {
      line(ctx, 12, -19, 22, -19, c("#e0fffb"), 1);
      rect(ctx, 20, -20, 3, 2, "#ffffff");
    }
    if (windup) halo(ctx, 14, -19, 9, "#7fe4ef", 0.24);
  }

  function drawTurtleEnemy(ctx, e, t, windup, attack, c) {
    const step = Math.sin(t * 3 + e.x) * 1;
    rect(ctx, -11, -9, 6, 9, c("#3f6b5c"));
    rect(ctx, 5, -9, 6, 9, c("#355b4e"));
    ellipse(ctx, 0, -14, 15, 12, c("#4e7b65"));
    ellipse(ctx, 0, -15, 12, 9, c("#6f9a79"));
    ellipse(ctx, 0, -15, 8, 6, c("#8fb88c"));
    for (let i = -2; i <= 2; i++) {
      rect(ctx, i * 4 - 1, -20 + Math.abs(i), 2, 2, c("#4d7057"));
    }
    rect(ctx, -6, -34, 12, 10, c("#7ca786"));
    rect(ctx, -3, -32, 3, 3, c("#1e3327"));
    rect(ctx, 2, -32, 3, 3, c("#1e3327"));
    rect(ctx, -2, -28, 5, 2, c("#3b5a42"));
    rect(ctx, -10, -13 + step, 7, 4, c("#426b58"));
    rect(ctx, 3, -13 - step, 7, 4, c("#365d4c"));
    if (windup) rect(ctx, -7, -37, 14, 2, "#b7e0a8");
    if (attack) {
      ellipse(ctx, 0, -2, 18, 4, "rgba(150,220,180,0.25)");
    }
  }

  function drawRedBoyBoss(ctx, e, t, windup, attack, c) {
    const flame = 0.8 + Math.sin(t * 7) * 0.15;
    if (e.phaseTriggered) halo(ctx, 0, -26, 30, "#ff4b2e", 0.16);
    // fire wheels
    for (const dir of [-1, 1]) {
      const wx = dir * 13;
      const wy = -4 + Math.sin(t * 6 + dir) * 1;
      ctx.save();
      ctx.globalAlpha = 0.85;
      circle(ctx, wx, wy, 8, c("#b83a26"));
      circle(ctx, wx, wy, 5, c("#ff9c3f"));
      circle(ctx, wx, wy, 2, c("#ffe7a1"));
      for (let i = 0; i < 6; i++) {
        const a = t * 5 + i;
        rect(ctx, wx + Math.cos(a) * 8, wy + Math.sin(a) * 8, 1, 2, "#ffd05a");
      }
      ctx.restore();
    }
    rect(ctx, -5, -14, 4, 11, c("#8e2d22"));
    rect(ctx, 2, -14, 4, 11, c("#7a241d"));
    rect(ctx, -6, -26, 12, 13, c("#c1402a"));
    rect(ctx, -4, -25, 8, 6, c("#e05e34"));
    rect(ctx, -8, -25, 3, 8, c("#a93424"));
    rect(ctx, 6, -25, 3, 8, c("#a93424"));
    rect(ctx, -5, -36, 10, 11, c("#e27a4b"));
    rect(ctx, -6, -35, 2, 5, c("#c55c34"));
    rect(ctx, 4, -35, 2, 5, c("#c55c34"));
    rect(ctx, -3, -33, 2, 3, c("#2a1410"));
    rect(ctx, 2, -33, 2, 3, c("#2a1410"));
    rect(ctx, -1, -29, 4, 1, c("#7d241b"));
    // flame hair and circlet
    for (let i = 0; i < 5; i++) {
      drawFlame(ctx, -6 + i * 3, -38, 0.5 + i * 0.05, t * 1.7 + i);
    }
    line(ctx, -6, -35, 6, -35, c("#f2c85b"), 1);
    rect(ctx, -1, -38, 2, 3, c("#ffe08a"));
    // spear
    const angle = attack ? 0.1 : windup ? -0.9 : -0.45;
    const hx = 6;
    const hy = -21;
    line(ctx, hx, hy, hx + Math.cos(angle) * 30, hy + Math.sin(angle) * 30, c("#7d3b1e"), 2);
    polygon(ctx, [[hx + Math.cos(angle) * 32, hy + Math.sin(angle) * 32 - 3], [hx + Math.cos(angle) * 40, hy + Math.sin(angle) * 40], [hx + Math.cos(angle) * 32, hy + Math.sin(angle) * 32 + 3]], c("#ffd56a"));
    if (attack) {
      line(ctx, Math.cos(angle) * 18, -21 + Math.sin(angle) * 18, Math.cos(angle) * 38, -21 + Math.sin(angle) * 38, "#ff8a3f", 3);
    }
    if (windup) halo(ctx, 0, -28, 26, "#ff5a2b", 0.18);
  }

  function drawInspirationBoss(ctx, e, t, windup, attack, c) {
    const wave = Math.sin(t * 2.5) * 2;
    if (e.phaseTriggered) halo(ctx, 0, -28, 34, "#4fd4e0", 0.14);
    rect(ctx, -10, -13, 7, 13, c("#235a68"));
    rect(ctx, 5, -13, 7, 13, c("#1b4957"));
    polygon(ctx, [[-14, -38], [-4, -24], [-6, -8], [0, -5], [6, -8], [4, -24], [14, -38]], c("#2e7584"));
    rect(ctx, -9, -37, 18, 17, c("#3b8d9b"));
    rect(ctx, -5, -35, 10, 8, c("#62b5bb"));
    rect(ctx, -12, -36, 4, 12, c("#2c6b79"));
    rect(ctx, 8, -36, 4, 12, c("#2c6b79"));
    // fish head
    ellipse(ctx, 0, -48, 10, 8, c("#5ba9ad"));
    polygon(ctx, [[-9, -50], [-18, -60], [-13, -44]], c("#8fd8d1"));
    polygon(ctx, [[9, -50], [18, -60], [13, -44]], c("#8fd8d1"));
    rect(ctx, -5, -50, 3, 3, c("#112c33"));
    rect(ctx, 2, -50, 3, 3, c("#112c33"));
    rect(ctx, -3, -44, 6, 2, c("#1d4b54"));
    // crown + whiskers
    polygon(ctx, [[-9, -55], [-6, -63], [-2, -56], [2, -64], [6, -56], [10, -62], [9, -55]], c("#e9c65e"));
    rect(ctx, -10, -55, 20, 2, c("#cfa83f"));
    line(ctx, -7, -44, -13 + wave, -39, c("#b9f1e7"), 1);
    line(ctx, 7, -44, 13 + wave, -39, c("#b9f1e7"), 1);
    // trident
    const angle = attack ? 0 : windup ? -0.6 : -0.35;
    const hx = 11;
    const hy = -33;
    line(ctx, hx, hy, hx + Math.cos(angle) * 38, hy + Math.sin(angle) * 38, c("#5f5a4a"), 2);
    const tx = hx + Math.cos(angle) * 42;
    const ty = hy + Math.sin(angle) * 42;
    line(ctx, tx - 4, ty - 4, tx - 4, ty + 5, c("#d8e7dc"), 1);
    line(ctx, tx, ty - 6, tx, ty + 6, c("#f0fff8"), 1);
    line(ctx, tx + 4, ty - 4, tx + 4, ty + 5, c("#d8e7dc"), 1);
    if (attack) {
      for (let i = 0; i < 3; i++) {
        ctx.save();
        ctx.globalAlpha = 0.4;
        ellipse(ctx, -10 + i * 13, -2, 18, 4, "#6fe0e8");
        ctx.restore();
      }
    }
    if (windup) halo(ctx, 0, -34, 28, "#55cbd6", 0.16);
  }

  function drawSpiderEnemy(ctx, e, t, phase, windup, attack, c) {
    const sway = Math.sin(t * 5 + e.x * 0.02) * 1.5;
    // legs
    for (const dir of [-1, 1]) {
      for (let i = 0; i < 4; i++) {
        const a = -0.9 + i * 0.5;
        const lx = dir * (10 + Math.cos(a) * 8);
        const ly = -12 + Math.sin(a) * 8;
        line(ctx, dir * 5, -12, lx, ly, c("#4d2c62"), 1);
        rect(ctx, lx, ly, 2, 1, c("#8d6aa8"));
      }
    }
    ellipse(ctx, 0, -13 + Math.sin(t * 3) * 0.5, 11, 8, c("#5b3678"));
    ellipse(ctx, 0, -14, 7, 5, c("#7e56a0"));
    circle(ctx, -2, -17, 2, c("#ff8a6a"));
    circle(ctx, 3, -17, 2, c("#ff8a6a"));
    rect(ctx, -2, -13, 4, 1, c("#d8b4e8"));
    line(ctx, 0, -20, sway, -32, c("#c9a8de"), 1);
    if (windup) halo(ctx, 0, -16, 13, "#c59be0", 0.2);
    if (attack) {
      line(ctx, 7, -12, 18, -8, c("#d8b4e8"), 1);
    }
  }

  function drawLionEnemy(ctx, e, t, phase, windup, attack, c) {
    const step = Math.sin(t * 4 + e.x) * 1;
    rect(ctx, -8, -10, 6, 10, c("#3f5f4e"));
    rect(ctx, 3, -10, 6, 10, c("#355244"));
    ellipse(ctx, 0, -18, 15, 11, c("#4c7a61"));
    ellipse(ctx, 0, -18, 11, 8, c("#6b9b78"));
    // mane
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * TAU;
      circle(ctx, Math.cos(a) * 12, -27 + Math.sin(a) * 10, 4, c("#315c45"));
    }
    circle(ctx, 0, -29, 9, c("#d1a95f"));
    rect(ctx, -5, -31, 3, 3, c("#1d2b23"));
    rect(ctx, 2, -31, 3, 3, c("#1d2b23"));
    rect(ctx, -2, -26, 5, 2, c("#5a3a22"));
    polygon(ctx, [[-8, -36], [-3, -43], [0, -35], [4, -43], [8, -36]], c("#3b6b50"));
    rect(ctx, 8, -22, 8, 3, c("#d1a95f"));
    rect(ctx, 13, -24, 2, 4, c("#e8d4a0"));
    if (windup) halo(ctx, 0, -28, 16, "#e0c06a", 0.18);
    if (attack) line(ctx, 10, -22, 23, -18 + step, c("#f1dcaa"), 2);
  }

  function drawElephantEnemy(ctx, e, t, windup, attack, c) {
    const sway = Math.sin(t * 2.5) * 1.5;
    rect(ctx, -10, -11, 7, 11, c("#77796f"));
    rect(ctx, 4, -11, 7, 11, c("#65675f"));
    ellipse(ctx, 0, -21, 17, 12, c("#8b8d82"));
    ellipse(ctx, 0, -27, 11, 9, c("#a3a598"));
    circle(ctx, 0, -34, 9, c("#b4b6a7"));
    polygon(ctx, [[-9, -36], [-16, -41], [-8, -31]], c("#c9cbbd"));
    polygon(ctx, [[9, -36], [16, -41], [8, -31]], c("#c9cbbd"));
    rect(ctx, -5, -37, 3, 3, c("#232720"));
    rect(ctx, 2, -37, 3, 3, c("#232720"));
    // trunk
    line(ctx, 7, -30, 12 + sway, -18, c("#b4b6a7"), 4);
    line(ctx, 12 + sway, -18, 10 + sway, -11, c("#a3a598"), 3);
    // tusks
    line(ctx, 5, -28, 11, -22, c("#f0ead8"), 2);
    line(ctx, -5, -28, -11, -22, c("#f0ead8"), 2);
    if (windup) halo(ctx, 0, -32, 18, "#e8e4d0", 0.15);
    if (attack) {
      ellipse(ctx, 0, -2, 20, 4, "rgba(220,220,200,0.2)");
    }
  }

  function drawRocEnemy(ctx, e, t, phase, windup, attack, c) {
    const flap = Math.sin(t * 12) * 8;
    polygon(ctx, [[-3, -20], [-22, -30 - flap], [-15, -15], [-26, -7 + flap], [-3, -12]], c("#d1a53d"));
    polygon(ctx, [[3, -20], [22, -30 - flap], [15, -15], [26, -7 + flap], [3, -12]], c("#d1a53d"));
    polygon(ctx, [[-13, -22], [-20, -27 - flap], [-15, -18]], c("#f0d37a"));
    polygon(ctx, [[13, -22], [20, -27 - flap], [15, -18]], c("#f0d37a"));
    ellipse(ctx, 0, -18, 8, 11, c("#b8882e"));
    circle(ctx, 0, -26, 7, c("#e6c25e"));
    polygon(ctx, [[0, -32], [5, -24], [-4, -23]], c("#f4df98"));
    rect(ctx, -4, -27, 3, 2, c("#3d2b12"));
    rect(ctx, 2, -27, 3, 2, c("#3d2b12"));
    polygon(ctx, [[-3, -12], [0, -3], [3, -12]], c("#8f6a23"));
    if (windup) halo(ctx, 0, -20, 17, "#f0d37a", 0.2);
    if (attack) line(ctx, 6, -18, 16, -18, c("#fff0b0"), 2);
  }

  function drawBullEnemy(ctx, e, t, windup, attack, c) {
    const step = Math.sin(t * 4) * 1;
    rect(ctx, -10, -10, 7, 10, c("#5f211e"));
    rect(ctx, 4, -10, 7, 10, c("#4e1b19"));
    ellipse(ctx, 0, -21, 17, 12, c("#7a2a24"));
    ellipse(ctx, 0, -22, 12, 8, c("#a33b2e"));
    circle(ctx, 0, -32, 10, c("#8c3028"));
    // horns
    polygon(ctx, [[-7, -38], [-17, -44], [-11, -33]], c("#e8d9b4"));
    polygon(ctx, [[7, -38], [17, -44], [11, -33]], c("#e8d9b4"));
    rect(ctx, -5, -33, 3, 3, c("#ffd37a"));
    rect(ctx, 2, -33, 3, 3, c("#ffd37a"));
    rect(ctx, -2, -27, 5, 3, c("#5a1b16"));
    rect(ctx, -2, -27, 1, 1, c("#f0e2c4"));
    rect(ctx, 2, -27, 1, 1, c("#f0e2c4"));
    // axe
    line(ctx, 11, -22, 22, -34, c("#6b4428"), 3);
    polygon(ctx, [[20, -36], [28, -40], [27, -29], [20, -31]], c("#d9d2bd"));
    if (windup) halo(ctx, 0, -30, 18, "#ff8a3d", 0.16);
    if (attack) line(ctx, 20, -35, 30, -25 + step, c("#ffd9a0"), 2);
  }

  function drawGoldHornBoss(ctx, e, t, windup, attack, c) {
    const sway = Math.sin(t * 2.2) * 2;
    if (e.phaseTriggered) halo(ctx, 0, -28, 32, "#e6c35a", 0.15);
    rect(ctx, -10, -14, 7, 13, c("#8f6a23"));
    rect(ctx, 5, -14, 7, 13, c("#75551b"));
    polygon(ctx, [[-15, -40], [-5, -25], [-7, -10], [0, -7], [7, -10], [5, -25], [15, -40]], c("#c9a13f"));
    rect(ctx, -10, -38, 20, 18, c("#d6ad4a"));
    rect(ctx, -6, -36, 12, 8, c("#f0d37a"));
    rect(ctx, -13, -37, 4, 13, c("#a67f2c"));
    rect(ctx, 9, -37, 4, 13, c("#a67f2c"));
    circle(ctx, 0, -48, 10, c("#e0b65a"));
    polygon(ctx, [[-9, -50], [-26, -57], [-12, -45]], c("#f2d98b"));
    polygon(ctx, [[9, -50], [26, -57], [12, -45]], c("#f2d98b"));
    rect(ctx, -5, -50, 3, 3, c("#3a2710"));
    rect(ctx, 2, -50, 3, 3, c("#3a2710"));
    polygon(ctx, [[-10, -55], [-6, -63], [-2, -56], [2, -64], [6, -56], [10, -62], [9, -54]], c("#f0d37a"));
    // gourd
    const gx = 16;
    const gy = -30 + Math.sin(t * 2) * 2;
    ellipse(ctx, gx, gy, 7, 9, c("#b88a2a"));
    ellipse(ctx, gx, gy - 8, 4, 4, c("#d6ad4a"));
    rect(ctx, gx - 1, gy - 14, 2, 4, c("#6b4a1c"));
    line(ctx, gx - 3, gy - 2, gx + 3, gy - 2, c("#f0d37a"), 1);
    if (windup) halo(ctx, 0, -34, 28, "#e6c35a", 0.18);
    if (attack) line(ctx, gx, gy - 14, gx + 10, gy - 20, c("#ffe8a1"), 2);
  }

  function drawSpiderQueenBoss(ctx, e, t, windup, attack, c) {
    const sway = Math.sin(t * 3) * 2;
    if (e.phaseTriggered) halo(ctx, 0, -30, 32, "#b184ef", 0.15);
    // spider legs
    for (const dir of [-1, 1]) {
      for (let i = 0; i < 4; i++) {
        const a = -0.8 + i * 0.5;
        line(ctx, dir * 8, -22, dir * (22 + Math.cos(a) * 14), -12 + Math.sin(a) * 16, c("#4c2a61"), 2);
      }
    }
    polygon(ctx, [[-16, -42], [-6, -25], [-8, -8], [0, -4], [8, -8], [6, -25], [16, -42]], c("#5f3678"));
    rect(ctx, -9, -40, 18, 20, c("#7b4a9e"));
    rect(ctx, -5, -38, 10, 9, c("#a678c9"));
    rect(ctx, -12, -38, 4, 14, c("#633b80"));
    rect(ctx, 8, -38, 4, 14, c("#633b80"));
    circle(ctx, 0, -50, 9, c("#d8c4e8"));
    rect(ctx, -5, -52, 3, 3, c("#7a1f45"));
    rect(ctx, 2, -52, 3, 3, c("#7a1f45"));
    rect(ctx, -2, -45, 5, 2, c("#8e2a5a"));
    polygon(ctx, [[-9, -56], [-5, -64], [-1, -57], [3, -64], [7, -56], [10, -61], [8, -54]], c("#c59be0"));
    line(ctx, -6, -56, -13 + sway, -63, c("#e3c8f2"), 1);
    line(ctx, 6, -56, 13 - sway, -63, c("#e3c8f2"), 1);
    if (windup) halo(ctx, 0, -36, 28, "#c59be0", 0.18);
    if (attack) {
      for (let i = 0; i < 5; i++) {
        const a = -1 + i * 0.5;
        line(ctx, 0, -42, Math.cos(a) * 28, -42 + Math.sin(a) * 20, "#e3c8f2", 1);
      }
    }
  }

  function drawRocKingBoss(ctx, e, t, windup, attack, c) {
    const flap = Math.sin(t * 10) * 10;
    if (e.phaseTriggered) halo(ctx, 0, -34, 38, "#f0d37a", 0.14);
    polygon(ctx, [[-6, -38], [-42, -52 - flap], [-30, -28], [-48, -12 + flap], [-8, -22]], c("#b8882e"));
    polygon(ctx, [[6, -38], [42, -52 - flap], [30, -28], [48, -12 + flap], [8, -22]], c("#b8882e"));
    polygon(ctx, [[-20, -38], [-32, -48 - flap], [-24, -30]], c("#f0d37a"));
    polygon(ctx, [[20, -38], [32, -48 - flap], [24, -30]], c("#f0d37a"));
    ellipse(ctx, 0, -32, 14, 20, c("#a87822"));
    rect(ctx, -8, -40, 16, 18, c("#c99a35"));
    circle(ctx, 0, -50, 10, c("#e6c25e"));
    polygon(ctx, [[0, -60], [8, -48], [-7, -46]], c("#f4df98"));
    rect(ctx, -5, -52, 4, 3, c("#3d2b12"));
    rect(ctx, 2, -52, 4, 3, c("#3d2b12"));
    polygon(ctx, [[-8, -24], [0, -8], [8, -24]], c("#7a581d"));
    // spear
    const a = attack ? 0.2 : windup ? -0.8 : -0.4;
    line(ctx, 12, -32, 12 + Math.cos(a) * 34, -32 + Math.sin(a) * 34, c("#7d5a25"), 2);
    polygon(ctx, [[12 + Math.cos(a) * 38, -32 + Math.sin(a) * 38 - 3], [12 + Math.cos(a) * 48, -32 + Math.sin(a) * 48], [12 + Math.cos(a) * 38, -32 + Math.sin(a) * 38 + 3]], c("#ffe8a1"));
    if (windup) halo(ctx, 0, -36, 30, "#f0d37a", 0.18);
  }

  function drawBullDemonBoss(ctx, e, t, windup, attack, c) {
    const step = Math.sin(t * 3.5) * 1.5;
    if (e.phaseTriggered) halo(ctx, 0, -34, 38, "#ff5a2b", 0.16);
    rect(ctx, -14, -16, 9, 15, c("#4d1a17"));
    rect(ctx, 5, -16, 9, 15, c("#3e1412"));
    ellipse(ctx, 0, -30, 22, 17, c("#6b231f"));
    ellipse(ctx, 0, -32, 16, 12, c("#963b2e"));
    circle(ctx, 0, -47, 12, c("#7a2822"));
    polygon(ctx, [[-9, -53], [-27, -63], [-15, -45]], c("#e8d9b4"));
    polygon(ctx, [[9, -53], [27, -63], [15, -45]], c("#e8d9b4"));
    rect(ctx, -6, -49, 4, 4, c("#ffd37a"));
    rect(ctx, 2, -49, 4, 4, c("#ffd37a"));
    rect(ctx, -3, -41, 7, 4, c("#3d1210"));
    rect(ctx, -2, -41, 1, 2, c("#f0e2c4"));
    rect(ctx, 2, -41, 1, 2, c("#f0e2c4"));
    // armor
    rect(ctx, -9, -35, 18, 4, c("#c9a13f"));
    rect(ctx, -7, -25, 14, 3, c("#c9a13f"));
    // axe
    const a = attack ? 0.3 : windup ? -0.9 : -0.45;
    const ax = 18;
    const ay = -32;
    line(ctx, ax, ay, ax + Math.cos(a) * 38, ay + Math.sin(a) * 38, c("#5b3b20"), 3);
    const hx = ax + Math.cos(a) * 42;
    const hy = ay + Math.sin(a) * 42;
    polygon(ctx, [[hx - 6, hy - 8], [hx + 10, hy - 12], [hx + 9, hy + 4], [hx - 5, hy + 6]], c("#d9d2bd"));
    if (windup) halo(ctx, 0, -38, 34, "#ff7a2e", 0.18);
    if (attack) line(ctx, hx, hy - 6, hx + 14, hy + 10 + step, c("#ffb45a"), 2);
  }

  function drawChaosBoss(ctx, e, t, windup, attack, c) {
    const phase2 = e.hp / e.maxHp < 0.5;
    const bob = Math.sin(t * 2.2) * 1;
    ctx.translate(0, bob);
    // cape
    polygon(ctx, [[-11, -44], [-31 + Math.sin(t * 2) * 2, -14], [-17, -7], [10, -34]], c(phase2 ? "#6a2934" : "#3f2b43"));
    // legs
    rect(ctx, -13, -14, 10, 14, c("#3e4a5c"));
    rect(ctx, 3, -14, 10, 14, c("#354154"));
    rect(ctx, -15, -3, 13, 3, c("#2b2521"));
    rect(ctx, 3, -3, 14, 3, c("#2b2521"));
    // body
    rect(ctx, -13, -43, 27, 30, c("#4e5f74"));
    rect(ctx, -10, -39, 20, 18, c("#66788d"));
    rect(ctx, -13, -30, 27, 5, c("#82613b"));
    rect(ctx, -11, -43, 22, 7, c("#7a8b9c"));
    rect(ctx, -4, -39, 9, 10, c("#95a5b3"));
    rect(ctx, -17, -44, 8, 9, c("#37465a"));
    rect(ctx, 9, -44, 8, 9, c("#37465a"));
    // head
    rect(ctx, -10, -57, 21, 15, c("#72869a"));
    rect(ctx, -7, -55, 15, 11, c("#8fa1b1"));
    rect(ctx, -13, -58, 4, 8, c("#56687d"));
    rect(ctx, 10, -58, 4, 8, c("#56687d"));
    // horns
    polygon(ctx, [[-9, -57], [-17, -68], [-13, -55]], c("#c4b28b"));
    polygon(ctx, [[9, -57], [17, -68], [13, -55]], c("#c4b28b"));
    // helmet
    rect(ctx, -11, -62, 23, 6, c("#4e3e35"));
    rect(ctx, -5, -65, 11, 4, c("#79624c"));
    rect(ctx, 0, -68, 3, 5, c("#c9a85f"));
    // eyes
    rect(ctx, -6, -52, 5, 3, c("#28171a"));
    rect(ctx, 3, -52, 5, 3, c("#28171a"));
    rect(ctx, -5, -51, 3, 1, c(phase2 ? "#ff574e" : "#ffb64e"));
    rect(ctx, 4, -51, 3, 1, c(phase2 ? "#ff574e" : "#ffb64e"));
    rect(ctx, -2, -47, 6, 2, c("#3d2523"));
    rect(ctx, -1, -46, 2, 2, c("#e9d5ad"));
    rect(ctx, 2, -46, 2, 2, c("#e9d5ad"));
    // arms + club
    const angle = attack ? lerp(-2.3, 0.75, clamp(e.attackT || 0, 0, 1)) : windup ? -2.5 : -1.2;
    const hx = 17;
    const hy = -37;
    line(ctx, 11, -41, hx, hy, c("#72869a"), 8);
    line(ctx, 13, -40, hx, hy, c("#9aacbb"), 3);
    const cx = hx + Math.cos(angle) * 25;
    const cy = hy + Math.sin(angle) * 25;
    line(ctx, hx, hy, cx, cy, c("#4d321d"), 5);
    rect(ctx, cx - 4, cy - 4, 9, 9, c("#65452a"));
    rect(ctx, cx - 5, cy - 5, 3, 3, c("#9b8763"));
    rect(ctx, cx + 2, cy + 2, 3, 3, c("#9b8763"));
    if (windup) {
      rect(ctx, -5, -72, 10, 2, c("#f2a45e"));
      rect(ctx, -8, -70, 16, 1, c("#b5463e"));
    }
    if (phase2) {
      ctx.save();
      ctx.globalAlpha = 0.18 + Math.sin(t * 8) * 0.06;
      halo(ctx, 0, -42, 33, "#e0433e", 0.4);
      ctx.restore();
    }
  }

  function drawBearBoss(ctx, e, t, windup, attack, c) {
    const phase2 = e.hp / e.maxHp < 0.45;
    const bob = Math.sin(t * 2) * 1;
    ctx.translate(0, bob);
    // cloak
    polygon(ctx, [[-13, -45], [-32 + Math.sin(t * 2.3) * 2, -12], [-17, -4], [14, -34]], c(phase2 ? "#7d2d32" : "#542c38"));
    // legs
    rect(ctx, -15, -14, 12, 14, c("#2c2930"));
    rect(ctx, 4, -14, 12, 14, c("#252229"));
    rect(ctx, -16, -3, 14, 3, c("#18161b"));
    rect(ctx, 4, -3, 15, 3, c("#18161b"));
    // body
    ellipse(ctx, 0, -27, 19, 18, c("#39343b"));
    ellipse(ctx, -2, -28, 14, 15, c("#49434c"));
    rect(ctx, -10, -33, 20, 3, c("#2d2930"));
    // belly
    ellipse(ctx, 0, -24, 8, 9, c("#6d6059"));
    // arms
    const angle = attack ? lerp(-2.4, 0.8, clamp(e.attackT || 0, 0, 1)) : windup ? -2.5 : -1.0;
    rect(ctx, -28, -39, 10, 25, c("#332e35"));
    rect(ctx, 18, -38, 10, 24, c("#2d2930"));
    // head
    circle(ctx, 0, -49, 13, c("#3a353c"));
    circle(ctx, 0, -47, 9, c("#524b54"));
    circle(ctx, -11, -56, 5, c("#332e35"));
    circle(ctx, 11, -56, 5, c("#332e35"));
    ellipse(ctx, 0, -44, 7, 5, c("#806e60"));
    rect(ctx, -2, -46, 4, 3, c("#241d1d"));
    rect(ctx, -6, -51, 3, 2, c(phase2 ? "#ff5b4f" : "#e8ae4c"));
    rect(ctx, 4, -51, 3, 2, c(phase2 ? "#ff5b4f" : "#e8ae4c"));
    rect(ctx, -7, -48, 5, 1, c("#8c3e38"));
    rect(ctx, 3, -48, 5, 1, c("#8c3e38"));
    // axe
    const hx = 26;
    const hy = -27;
    const ax = hx + Math.cos(angle) * 25;
    const ay = hy + Math.sin(angle) * 25;
    line(ctx, hx, hy, ax, ay, c("#513a2a"), 6);
    polygon(ctx, [[ax - 2, ay - 5], [ax + 13, ay - 12], [ax + 15, ay + 4], [ax + 2, ay + 5]], c("#8f9aa4"));
    polygon(ctx, [[ax + 2, ay - 4], [ax + 11, ay - 8], [ax + 12, ay + 2], [ax + 3, ay + 3]], c("#c1cad0"));
    rect(ctx, ax + 1, ay - 2, 2, 2, c("#59636b"));
    if (windup) {
      rect(ctx, -6, -76, 12, 2, c("#e8a25d"));
      rect(ctx, -3, -74, 6, 1, c("#ffd590"));
    }
    if (phase2) {
      ctx.save();
      ctx.globalAlpha = 0.17 + Math.sin(t * 7) * 0.05;
      halo(ctx, 0, -38, 34, "#d74b38", 0.4);
      ctx.restore();
    }
  }

  function drawBoneBoss(ctx, e, t, windup, attack, c) {
    const phase2 = e.hp / e.maxHp < 0.5;
    const float = Math.sin(t * 2.1) * 2;
    ctx.translate(0, float - 4);
    // ghost aura
    ctx.save();
    ctx.globalAlpha = 0.11 + Math.sin(t * 3) * 0.025;
    ellipse(ctx, 0, -24, 25, 36, "#7ee0c0");
    ctx.restore();
    // robe
    polygon(ctx, [[-10, -43], [-20 - Math.sin(t * 2) * 2, -8], [-8, -2], [1, -8], [8, -2], [20 + Math.sin(t * 2) * 2, -8], [10, -43]], c("#ddd8cb"));
    polygon(ctx, [[-6, -40], [-12, -8], [-5, -5], [0, -9], [5, -5], [12, -8], [6, -40]], c("#f0ece2"));
    rect(ctx, -10, -43, 20, 4, c("#b9b4a8"));
    rect(ctx, -2, -12, 4, 9, c("#7cbfa8"));
    // arms / sleeves
    const angle = attack ? lerp(-1.9, 0.4, clamp(e.attackT || 0, 0, 1)) : windup ? -2.0 : -0.8;
    polygon(ctx, [[-9, -38], [-22, -27], [-17, -19], [-5, -28]], c("#e8e4d9"));
    polygon(ctx, [[9, -38], [20, -30], [16, -21], [5, -29]], c("#d6d1c4"));
    // neck / head
    rect(ctx, -4, -48, 8, 5, c("#e7dccb"));
    circle(ctx, 0, -55, 9, c("#f0e6d6"));
    // hair
    polygon(ctx, [[-9, -58], [-12, -69], [-3, -65], [0, -72], [4, -65], [11, -69], [9, -56], [3, -60], [-3, -60]], c("#25252c"));
    rect(ctx, -10, -60, 4, 10, c("#1f2026"));
    rect(ctx, 7, -60, 4, 11, c("#1f2026"));
    // face
    rect(ctx, -5, -57, 4, 2, c(phase2 ? "#f45e58" : "#432f38"));
    rect(ctx, 2, -57, 4, 2, c(phase2 ? "#f45e58" : "#432f38"));
    rect(ctx, -1, -53, 3, 1, c("#a54954"));
    rect(ctx, -7, -59, 2, 1, c("#8c4358"));
    rect(ctx, 6, -59, 2, 1, c("#8c4358"));
    // hairpin
    line(ctx, -10, -65, 10, -67, c("#c7a959"), 1);
    rect(ctx, 8, -68, 3, 3, c("#e6c96d"));
    // bone fan
    const fanAngle = angle;
    const fx = 12;
    const fy = -31;
    for (let i = 0; i < 5; i++) {
      const a = fanAngle - 0.5 + i * 0.24;
      line(ctx, fx, fy, fx + Math.cos(a) * 16, fy + Math.sin(a) * 16, c("#ddd6c4"), 2);
      rect(ctx, fx + Math.cos(a) * 16 - 1, fy + Math.sin(a) * 16 - 1, 3, 2, c("#a9a18e"));
    }
    circle(ctx, fx, fy, 2, c("#f0e7d3"));
    if (windup) {
      rect(ctx, -4, -77, 8, 2, c("#a6f7d9"));
      rect(ctx, -8, -75, 16, 1, c("#5bc19f"));
    }
    if (phase2) {
      ctx.save();
      ctx.globalAlpha = 0.14 + Math.sin(t * 6) * 0.04;
      halo(ctx, 0, -40, 30, "#6de6c1", 0.4);
      ctx.restore();
    }
  }

  /* ------------------------------------------------------------------ */
  /* Projectiles / drops / effects                                       */
  /* ------------------------------------------------------------------ */

  function drawProjectile(ctx, p, t) {
    if (p.type === "boneArrow") {
      const ang = Math.atan2(p.vy || 0, p.vx || 1);
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(ang);
      line(ctx, -10, 0, 9, 0, "#d9d2bd", 2);
      rect(ctx, 8, -2, 5, 4, "#f0ead8");
      rect(ctx, -11, -3, 3, 2, "#a8a18e");
      rect(ctx, -11, 1, 3, 2, "#a8a18e");
      ctx.restore();
    } else if (p.type === "darkOrb") {
      halo(ctx, p.x, p.y, 8, "#9f5bd9", 0.2);
      circle(ctx, p.x, p.y, 4, "#5d2c84");
      circle(ctx, p.x - 1, p.y - 1, 2, "#c59af0");
    } else if (p.type === "boneSpike") {
      const ang = Math.atan2(p.vy || 0, p.vx || 1);
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(ang);
      polygon(ctx, [[-7, 0], [4, -3], [9, 0], [4, 3]], "#e4deca");
      rect(ctx, -7, -1, 2, 2, "#a09a87");
      ctx.restore();
    } else if (p.type === "shockwave") {
      ctx.save();
      ctx.globalAlpha = 0.6 * (1 - (p.life || 0) / (p.maxLife || 1));
      for (let i = 0; i < 4; i++) {
        line(ctx, p.x - p.radius, p.y - i * 2, p.x + p.radius, p.y - i * 2, i % 2 ? "#e3b05a" : "#8e5d36", 1);
      }
      ctx.restore();
    } else if (p.type === "fireOrb") {
      halo(ctx, p.x, p.y, 10, "#ff7a2e", 0.25);
      drawFlame(ctx, p.x, p.y + 4, 1, t * 2.1);
      circle(ctx, p.x, p.y, 4, "#ff9f45");
      circle(ctx, p.x - 1, p.y - 1, 2, "#ffe8a1");
    } else if (p.type === "waterArrow") {
      const ang = Math.atan2(p.vy || 0, p.vx || 1);
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(ang);
      line(ctx, -10, 0, 8, 0, "#6fc9d6", 2);
      polygon(ctx, [[7, -3], [13, 0], [7, 3]], "#c9fbff");
      rect(ctx, -11, -2, 2, 4, "#3d8b9a");
      ctx.restore();
    } else if (p.type === "waterSurge") {
      ctx.save();
      ctx.globalAlpha = 0.75;
      for (let i = 0; i < 4; i++) {
        const yy = p.y + i * 5;
        ctx.strokeStyle = i % 2 ? "#8ff0f2" : "#4fc4d6";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(p.x, yy, p.radius - i * 3, Math.PI * 0.1, Math.PI * 0.9);
        ctx.stroke();
      }
      ctx.globalAlpha = 0.22;
      ellipse(ctx, p.x, p.y + 14, p.radius + 6, 8, "#5fdfe8");
      ctx.restore();
    } else if (p.type === "sword") {
      const ang = Math.atan2(p.vy || 0, p.vx || 1);
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(ang - Math.PI / 2);
      line(ctx, 0, -12, 0, 10, "#e6dfc8", 2);
      polygon(ctx, [[-3, -12], [0, -18], [3, -12]], "#f8f0d8");
      rect(ctx, -4, 8, 8, 2, "#b99c55");
      rect(ctx, -1, 10, 2, 5, "#7d5c2a");
      ctx.restore();
    } else if (p.type === "venomBeam") {
      ctx.save();
      ctx.globalAlpha = 0.35;
      line(ctx, p.x - 22, p.y, p.x + 22, p.y, "#8ee06a", 8);
      ctx.globalAlpha = 0.9;
      line(ctx, p.x - 24, p.y, p.x + 24, p.y, "#c9ff9b", 2);
      for (let i = 0; i < 4; i++) {
        circle(ctx, p.x + Math.sin(t * 9 + i) * 10, p.y + Math.cos(t * 7 + i) * 4, 1.5, "#9be66a");
      }
      ctx.restore();
    } else if (p.type === "windBlade") {
      const ang = Math.atan2(p.vy || 0, p.vx || 1);
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(ang);
      ctx.globalAlpha = 0.8;
      ctx.strokeStyle = "#c9f3ff";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, 9, -1.1, 1.1);
      ctx.stroke();
      ctx.globalAlpha = 0.35;
      ctx.strokeStyle = "#7fc9dd";
      ctx.beginPath();
      ctx.arc(-5, 0, 10, -0.9, 0.9);
      ctx.stroke();
      ctx.restore();
    } else if (p.type === "webShot") {
      ctx.save();
      ctx.globalAlpha = 0.85;
      circle(ctx, p.x, p.y, 5, "#c59be0");
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * TAU + t * 2;
        line(ctx, p.x, p.y, p.x + Math.cos(a) * 9, p.y + Math.sin(a) * 9, "#e3c8f2", 1);
      }
      ctx.restore();
    } else if (p.type === "ghostFire") {
      halo(ctx, p.x, p.y, 11, "#70e0b4", 0.28);
      drawFlame(ctx, p.x, p.y + 4, 1.15, t * 1.8);
      circle(ctx, p.x, p.y, 3, "#8ff0d4");
      circle(ctx, p.x - 1, p.y - 1, 1, "#ffffff");
      for (let i = 0; i < 4; i++) {
        rect(ctx, p.x + Math.sin(t * 8 + i * 1.7) * 8, p.y + Math.cos(t * 7 + i) * 6, 1, 2, "#b9ffe9");
      }
    } else if (p.type === "blackTornado") {
      halo(ctx, p.x, p.y, 30, "#5b517a", 0.22);
      ctx.save();
      ctx.globalAlpha = 0.85;
      for (let i = 0; i < 4; i++) {
        const radius = 12 + i * 5;
        const a = t * -4 + i * 1.2;
        ctx.strokeStyle = i % 2 ? "#9a8cc4" : "#d8d1ef";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.ellipse(p.x, p.y - i * 2, radius, radius * 0.42, a, 0, Math.PI * 1.4);
        ctx.stroke();
      }
      ctx.globalAlpha = 0.5;
      circle(ctx, p.x, p.y - 10, 8, "#3b3452");
      ctx.restore();
      for (let i = 0; i < 6; i++) {
        const a = t * 4 + i * 1.1;
        rect(ctx, p.x + Math.cos(a) * 22, p.y - 6 + Math.sin(a) * 9, 1, 2, "#b6a9e0");
      }
    } else if (p.type === "soul") {
      halo(ctx, p.x, p.y, 7, "#71e3bc", 0.25);
      circle(ctx, p.x, p.y, 3, "#aaf5d9");
      circle(ctx, p.x - 1, p.y - 1, 1, "#ffffff");
    }
  }

  function drawDrop(ctx, d, t) {
    const bob = Math.sin(t * 4 + d.seed) * 2;
    const y = d.y + bob;
    if (d.kind === "gold") {
      const w = Math.max(2, Math.abs(Math.cos(t * 7 + d.seed)) * 5 + 1);
      rect(ctx, d.x - 1, y - 7, 2, 2, "rgba(255,215,102,0.22)");
      rect(ctx, d.x - w / 2, y - 3, w, 5, "#edbd45");
      rect(ctx, d.x - w / 2, y - 3, Math.max(1, w / 2), 2, "#ffe799");
      rect(ctx, d.x - 1, y - 2, 1, 3, "#8d641d");
    } else if (d.kind === "health") {
      halo(ctx, d.x, y, 7, "#e7595e", 0.13);
      circle(ctx, d.x, y, 4, "#d84951");
      rect(ctx, d.x - 1, y - 3, 2, 7, "#ffd9d4");
      rect(ctx, d.x - 3, y - 1, 7, 2, "#ffd9d4");
    } else if (d.kind === "mana") {
      halo(ctx, d.x, y, 7, "#67b7f2", 0.13);
      circle(ctx, d.x, y, 4, "#3f82c7");
      rect(ctx, d.x - 1, y - 3, 2, 6, "#c9ecff");
      rect(ctx, d.x - 3, y - 1, 6, 2, "#c9ecff");
    } else if (d.kind === "potion") {
      halo(ctx, d.x, y, 7, "#71d89e", 0.13);
      rect(ctx, d.x - 2, y - 6, 4, 3, "#d9c6a1");
      rect(ctx, d.x - 4, y - 3, 8, 6, "#5fbf88");
      rect(ctx, d.x - 3, y - 2, 3, 2, "#c7f3d3");
      rect(ctx, d.x - 4, y + 2, 8, 1, "#316f4e");
    } else if (d.kind === "herb") {
      halo(ctx, d.x, y, 8, "#8ce8ad", 0.16);
      rect(ctx, d.x - 1, y - 2, 2, 7, "#4f8f62");
      polygon(ctx, [[d.x - 1, y - 1], [d.x - 6, y - 5], [d.x - 2, y + 1]], "#7fe0a0");
      polygon(ctx, [[d.x + 1, y - 2], [d.x + 6, y - 6], [d.x + 2, y + 1]], "#a9f0c4");
      circle(ctx, d.x, y - 6, 2, "#d9ffe8");
    } else if (d.kind === "wingMat" && d.mat) {
      const matDef = window.GameData.MATERIALS[d.mat] || { color: "#ffe08a" };
      halo(ctx, d.x, y, 9, matDef.color, 0.18);
      polygon(ctx, [[d.x, y - 7], [d.x + 5, y + 4], [d.x - 5, y + 4]], matDef.color);
      polygon(ctx, [[d.x, y - 4], [d.x + 3, y + 3], [d.x - 3, y + 3]], "#fff6d8");
      rect(ctx, d.x - 1, y + 2, 2, 4, shade(matDef.color, 0.6));
    } else if (d.kind === "equipment" && d.item) {
      const gearColor = window.GameData.getRarity(d.item.rarity).color;
      drawLootBeam(ctx, d.x, y, d.item.rarity, t + d.seed);
      halo(ctx, d.x, y - 7, 10, gearColor, 0.18);
      drawGearGlyph(ctx, d.x, y - 7, d.item.slot, d.item.rarity, 1);
      drawText(ctx, window.GameData.SLOTS[d.item.slot].name, d.x, y - 22, {
        size: 5,
        color: gearColor,
        strokeWidth: 2
      });
    }
  }

  function drawLootBeam(ctx, x, y, rarityKey, t) {
    const color = window.GameData.getRarity(rarityKey).color;
    ctx.save();
    ctx.globalAlpha = 0.09 + Math.sin(t * 3) * 0.025;
    rect(ctx, x - 6, Math.max(0, y - 55), 12, 50, color);
    ctx.globalAlpha = 0.2;
    rect(ctx, x - 2, Math.max(0, y - 48), 4, 45, color);
    ctx.globalAlpha = 0.5;
    for (let i = 0; i < 4; i++) {
      const yy = y - 15 - ((t * 14 + i * 12) % 35);
      rect(ctx, x + Math.sin(t * 4 + i) * 6, yy, 1, 2, color);
    }
    ctx.restore();
  }

  function drawGearGlyph(ctx, x, y, slot, rarityKey, scale = 1) {
    const color = window.GameData.getRarity(rarityKey).color;
    const glyph = window.GameData.SLOTS[slot] ? window.GameData.SLOTS[slot].short : "?";
    ctx.save();
    ctx.translate(Math.round(x), Math.round(y));
    ctx.scale(scale, scale);
    ctx.globalAlpha = 0.22;
    circle(ctx, 0, 0, 11, color);
    ctx.globalAlpha = 1;
    rect(ctx, -8, -8, 16, 16, color);
    rect(ctx, -7, -7, 14, 14, "#151824");
    rect(ctx, -7, -7, 14, 1, "rgba(255,255,255,0.2)");
    drawText(ctx, glyph, 0, 0, { size: 8, color: "#fff5d4", stroke: "#0d0e16", strokeWidth: 2 });
    ctx.restore();
  }

  function drawPortal(ctx, x, y, t, active = true) {
    if (!active) return;
    ctx.save();
    const pulse = 1 + Math.sin(t * 2.4) * 0.05;
    halo(ctx, x, y - 25, 23, "#f4c95d", 0.1);
    ctx.globalAlpha = 0.58;
    ctx.strokeStyle = "#f7d77e";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(x, y - 27, 12 * pulse, 28 * pulse, 0, 0, TAU);
    ctx.stroke();
    ctx.globalAlpha = 0.22;
    ctx.strokeStyle = "#ffeeb5";
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.ellipse(x, y - 27, 16 * pulse, 33 * pulse, 0, 0, TAU);
    ctx.stroke();
    ctx.globalAlpha = 0.8;
    for (let i = 0; i < 12; i++) {
      const a = t * 1.1 + (i / 12) * TAU;
      const rx = 7 + Math.sin(t * 2 + i) * 3;
      const ry = 23 + Math.cos(t * 1.7 + i) * 5;
      rect(ctx, x + Math.cos(a) * rx, y - 27 + Math.sin(a) * ry, 1, 2, i % 3 ? "#ffe29a" : "#fff9d8");
    }
    // floor glow
    ctx.globalAlpha = 0.16;
    ellipse(ctx, x, y, 16, 4, "#f4c95d");
    ctx.restore();
  }

  function drawSpawnRift(ctx, x, y, t, progress, color = "#b75be6") {
    const p = clamp(progress, 0, 1);
    ctx.save();
    ctx.globalAlpha = 0.25 + p * 0.4;
    halo(ctx, x, y - 18, 12 + p * 7, color, 0.25);
    for (let i = 0; i < 7; i++) {
      const a = t * 3 + (i / 7) * TAU;
      const r = 7 + p * 8;
      rect(ctx, x + Math.cos(a) * r, y - 18 + Math.sin(a) * r * 1.5, 2, 2, color);
    }
    ctx.restore();
  }

  function drawSlash(ctx, eff) {
    const p = clamp(eff.t / eff.duration, 0, 1);
    ctx.save();
    ctx.translate(eff.x, eff.y);
    if (eff.facing < 0) ctx.scale(-1, 1);
    const radius = eff.radius || 24;
    const start = -1.7;
    const end = 1.0;
    const a = lerp(start, end, p);
    ctx.globalAlpha = 0.7 * (1 - p);
    for (let i = 0; i < 6; i++) {
      const aa = a - i * 0.08;
      const r = radius - i;
      rect(ctx, Math.cos(aa) * r, Math.sin(aa) * r, 2, 2, eff.color || "#ffe9a3");
    }
    ctx.lineWidth = 2;
    ctx.strokeStyle = eff.color || "#ffe9a3";
    ctx.beginPath();
    ctx.arc(0, 0, radius - 2, a - 0.5, a + 0.08);
    ctx.stroke();
    ctx.restore();
  }

  function drawHitSpark(ctx, eff) {
    const p = clamp(eff.t / eff.duration, 0, 1);
    const a = 1 - p;
    ctx.save();
    ctx.globalAlpha = a;
    for (let i = 0; i < 7; i++) {
      const ang = (i / 7) * TAU + eff.seed;
      const r = 3 + p * (10 + (i % 3) * 5);
      rect(ctx, eff.x + Math.cos(ang) * r, eff.y + Math.sin(ang) * r, 2, 2, i % 2 ? "#fff3bd" : "#f39b4f");
    }
    circle(ctx, eff.x, eff.y, 2 + p * 2, "#fff6d3");
    ctx.restore();
  }

  function drawShockwave(ctx, x, y, radius, alpha, color) {
    ctx.save();
    ctx.globalAlpha = alpha;
    for (let i = 0; i < 5; i++) {
      const r = radius - i * 3;
      if (r <= 0) continue;
      ctx.strokeStyle = i % 2 ? color || "#e3b05a" : "#fff0bd";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(x, y, r, Math.PI, TAU);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawFlame(ctx, x, y, s, t) {
    const flick = Math.sin(t * 12) * 1.2;
    ctx.save();
    ctx.globalAlpha = 0.2;
    halo(ctx, x, y - 4, 6 * s, "#ff8d42", 0.3);
    ctx.globalAlpha = 0.95;
    polygon(ctx, [[x - 4 * s, y], [x - 2 * s + flick, y - 8 * s], [x + 1 * s, y - 3 * s], [x + 4 * s, y - 10 * s], [x + 4 * s, y]], "#e96534");
    polygon(ctx, [[x - 2 * s, y], [x + flick * 0.5, y - 5 * s], [x + 3 * s, y]], "#ffd15e");
    rect(ctx, x, y - 4 * s, 1, 2, "#fff6cf");
    ctx.restore();
  }

  function drawFireTornado(ctx, x, y, scale = 1, t = 0, intensity = 1) {
    const h = 38 * scale;
    ctx.save();
    ellipse(ctx, x, y, 11 * scale, 3 * scale, "rgba(0,0,0,0.22)");
    halo(ctx, x, y - 10, 15 * scale, "#ff7b3d", 0.16 * intensity);
    for (let i = 0; i < 13; i++) {
      const p = i / 12;
      const yy = y - p * h;
      const base = (3.4 + 7 * Math.sin(p * Math.PI)) * scale * (0.8 + 0.2 * intensity);
      const sway = Math.sin(t * 9 + i * 1.7) * 3.4 * scale * (1 - p * 0.4);
      ctx.globalAlpha = clamp((0.8 - p * 0.42) * intensity, 0, 1);
      circle(ctx, x + sway, yy, base, "#e9582c");
      circle(ctx, x + sway - base * 0.35, yy - base * 0.3, base * 0.62, "#ff9a3d");
      circle(ctx, x + sway - base * 0.55, yy - base * 0.55, base * 0.32, "#ffdc7a");
    }
    ctx.globalAlpha = 0.4 * intensity;
    circle(ctx, x + Math.sin(t * 5) * 4 * scale, y - h, 6 * scale, "#43302c");
    circle(ctx, x + Math.sin(t * 5 + 1) * 5 * scale, y - h - 4 * scale, 4 * scale, "#33262a");
    ctx.globalAlpha = 0.9 * intensity;
    for (let i = 0; i < 10; i++) {
      const a = t * 4 + i * 2.1;
      rect(ctx, x + Math.cos(a) * 12 * scale, y - h * (0.2 + 0.75 * (i / 10)) + Math.sin(a) * 5 * scale, 1, 2, i % 2 ? "#ffd76a" : "#fff0b0");
    }
    ctx.restore();
  }

  function drawClone(ctx, c, t = 0, gear = {}) {
    if (!c) return;
    const tornado = (c.tornadoT || 0) > 0;
    if (tornado) {
      drawFireTornado(ctx, c.x, c.y, 0.72, t, 0.75);
    } else {
      ctx.save();
      ctx.globalAlpha = 0.6;
      halo(ctx, c.x, c.y - 15, 13, "#6ee7c2", 0.18);
      drawWukong(ctx, c.x, c.y, c.facing || 1, { state: "idle", t, combo: 1, attackProgress: 0, gear });
      ctx.restore();
      ctx.save();
      ctx.globalAlpha = 0.38 + 0.2 * Math.sin(t * 7);
      circle(ctx, c.x, c.y - 16, 3, "#c9fff0");
      circle(ctx, c.x + Math.sin(t * 3) * 4, c.y - 24, 2, "#8ff0d4");
      ctx.restore();
    }

    const w = 22;
    const barY = c.y - (tornado ? 54 : 41);
    rect(ctx, c.x - w / 2 - 1, barY - 1, w + 2, 5, "rgba(5,6,10,0.85)");
    rect(ctx, c.x - w / 2, barY, w, 3, "#1c3a32");
    rect(ctx, c.x - w / 2, barY, w * clamp(c.hp / c.maxHp, 0, 1), 3, "#6ee7c2");
    drawText(ctx, "分身", c.x, barY - 7, { size: 5, color: "#8ff0d4", strokeWidth: 2 });
  }

  function drawStaffSlamEffect(ctx, effect) {
    const p = clamp(effect.t / effect.duration, 0, 1);
    const dir = effect.facing || 1;
    const len = effect.length || 120;
    const staffX = effect.x + dir * len * 0.14;
    const cx = effect.x + dir * len * 0.55;
    const drop = Math.min(1, p * 1.8);
    ctx.save();
    ctx.globalAlpha = 1 - p * 0.35;
    line(ctx, staffX, effect.y - 150 + drop * 140, staffX, effect.y - 4, "#3a2410", 7);
    line(ctx, staffX, effect.y - 150 + drop * 140, staffX, effect.y - 4, "#d8a94e", 3);
    rect(ctx, staffX - 3, effect.y - 146 + drop * 140, 6, 6, "#ffe08a");
    rect(ctx, staffX - 3, effect.y - 8, 6, 6, "#ffe08a");
    if (p > 0.3) {
      const ip = Math.min(1, (p - 0.3) / 0.55);
      ctx.globalAlpha = 1 - ip;
      ctx.strokeStyle = effect.color || "#ffd060";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(cx, effect.y + 2, 12 + ip * (len * 0.5), 5 + ip * 10, 0, 0, TAU);
      ctx.stroke();
      for (let i = -3; i <= 3; i++) {
        const px = cx + i * 15;
        rect(ctx, px, effect.y - 2 - Math.abs(i) * 2, 3, 8 + Math.abs(i) * 3, i % 2 ? "#e8c37a" : "#9a7648");
      }
      for (let i = 0; i < 8; i++) {
        rect(ctx, effect.x + dir * (20 + i * 14), effect.y - 30 - ((i * 17 + effect.t * 60) % 60), 2, 4, "#ffe6a8");
      }
    }
    ctx.restore();
  }

  function drawBottleAura(ctx, effect) {
    const p = clamp(effect.t / effect.duration, 0, 1);
    const color = effect.color || "#79e6c1";
    const lift = 14 + p * 8;
    ctx.save();
    ctx.globalAlpha = (1 - p) * 0.5;
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    for (let i = 0; i < 2; i++) {
      ctx.beginPath();
      ctx.ellipse(effect.x, effect.y + 8, 16 + i * 10 + p * 12, 6 + i * 4 + p * 4, 0, 0, TAU);
      ctx.stroke();
    }
    // bottle silhouette
    ctx.globalAlpha = 0.85 * (1 - p * 0.35);
    const bx = effect.x;
    const by = effect.y - 32 - lift;
    ellipse(ctx, bx, by + 3, 6, 7, "#b9ffe9");
    rect(ctx, bx - 5, by - 2, 10, 9, "#5ac9a8");
    rect(ctx, bx - 1, by - 8, 2, 5, "#e8fff8");
    rect(ctx, bx - 3, by - 10, 6, 2, "#f4d58a");
    rect(ctx, bx - 3, by, 6, 2, "#e8fff8");
    for (let i = 0; i < 8; i++) {
      const a = p * TAU + i * 1.7;
      rect(ctx, bx + Math.cos(a) * (12 + p * 8), by + 2 + Math.sin(a) * 10, 1, 2, "#b9ffe9");
    }
    ctx.restore();
  }

  function drawEyeBeam(ctx, effect) {
    const p = clamp(effect.t / effect.duration, 0, 1);
    const alpha = (1 - p) * 0.9;
    const color = effect.color || "#ffd45e";
    ctx.save();
    ctx.globalAlpha = alpha * 0.3;
    line(ctx, effect.x, effect.y, effect.targetX, effect.targetY, color, 4);
    ctx.globalAlpha = alpha;
    line(ctx, effect.x, effect.y - 1, effect.targetX, effect.targetY - 1, "#fff2b0", 1);
    line(ctx, effect.x, effect.y + 1, effect.targetX, effect.targetY + 1, color, 1);
    ctx.globalAlpha = alpha * 0.7;
    halo(ctx, effect.targetX, effect.targetY, 8 + p * 6, color, 0.25);
    for (let i = 0; i < 9; i++) {
      const t = (i / 9 + effect.t * 1.8) % 1;
      rect(
        ctx,
        lerp(effect.x, effect.targetX, t),
        lerp(effect.y, effect.targetY, t) + Math.sin(t * 9 + effect.t * 20) * 3,
        2,
        2,
        "#fff3c0"
      );
    }
    ctx.restore();
  }

  function drawEyeBurst(ctx, effect) {
    const p = clamp(effect.t / effect.duration, 0, 1);
    const r = (effect.radius || 70) * (0.35 + 0.65 * p);
    const color = effect.color || "#ffd45e";
    ctx.save();
    ctx.globalAlpha = (1 - p) * 0.9;
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(effect.x, effect.y, r * 0.82, r * 0.38, 0, 0, TAU);
    ctx.stroke();
    ctx.globalAlpha = (1 - p) * 0.2;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.ellipse(effect.x, effect.y, r * 0.78, r * 0.34, 0, 0, TAU);
    ctx.fill();
    ctx.globalAlpha = (1 - p) * 0.95;
    circle(ctx, effect.x, effect.y, Math.max(2, r * 0.13), "#fff2bd");
    circle(ctx, effect.x, effect.y, Math.max(1, r * 0.06), "#3a2608");
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * TAU;
      line(
        ctx,
        effect.x + Math.cos(a) * r * 0.58,
        effect.y + Math.sin(a) * r * 0.26,
        effect.x + Math.cos(a) * r * 0.95,
        effect.y + Math.sin(a) * r * 0.5,
        color,
        1
      );
    }
    ctx.restore();
  }

  /* ------------------------------------------------------------------ */
  /* Portraits / previews                                                */
  /* ------------------------------------------------------------------ */

  function drawPortrait(canvas) {
    const ctx = canvas.getContext("2d");
    const w = canvas.width;
    const h = canvas.height;
    ctx.imageSmoothingEnabled = false;
    const sky = ctx.createLinearGradient(0, 0, w, h);
    sky.addColorStop(0, "#25475a");
    sky.addColorStop(1, "#101a2a");
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 9; i++) {
      rect(ctx, (i * 13 + 3) % w, (i * 7 + 2) % h, 2, 2, i % 2 ? "#7fbb9a" : "#c7a05b");
    }
    halo(ctx, w / 2, h / 2 + 4, 16, "#e0ae54", 0.12);
    circle(ctx, w / 2, 24, 12, "#9b6037");
    rect(ctx, w / 2 - 12, 22, 5, 8, "#b97a46");
    rect(ctx, w / 2 + 8, 22, 5, 8, "#b97a46");
    rect(ctx, w / 2 - 10, 21, 20, 13, "#e8b27c");
    rect(ctx, w / 2 - 8, 23, 16, 9, "#f2c691");
    rect(ctx, w / 2 - 11, 18, 22, 4, "#e7ba4a");
    rect(ctx, w / 2 - 9, 16, 6, 3, "#a86a30");
    rect(ctx, w / 2, 15, 7, 4, "#8d542f");
    rect(ctx, w / 2 + 5, 17, 4, 3, "#6f3e25");
    rect(ctx, w / 2 - 6, 24, 4, 4, "#2a1a13");
    rect(ctx, w / 2 + 3, 24, 4, 4, "#2a1a13");
    rect(ctx, w / 2 - 6, 24, 2, 2, "#f4ede0");
    rect(ctx, w / 2 + 4, 24, 2, 2, "#f4ede0");
    rect(ctx, w / 2 - 1, 27, 4, 2, "#b56b4d");
    rect(ctx, w / 2 - 2, 30, 6, 1, "#8e4e38");
    rect(ctx, w / 2 - 9, 22, 3, 1, "#b84b3f");
    rect(ctx, w / 2 + 8, 22, 3, 1, "#b84b3f");
    rect(ctx, w / 2 - 7, 34, 14, 5, "#d9a12e");
    rect(ctx, w / 2 - 4, 36, 8, 2, "#d14a39");
    // vignette
    const vg = ctx.createRadialGradient(w / 2, h / 2, 8, w / 2, h / 2, 29);
    vg.addColorStop(0, "rgba(0,0,0,0)");
    vg.addColorStop(1, "rgba(0,0,0,0.32)");
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, w, h);
  }

  function drawCharacterPreview(canvas, opts = {}) {
    const ctx = canvas.getContext("2d");
    const w = canvas.width;
    const h = canvas.height;
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, w, h);
    // backdrop
    const bg = ctx.createRadialGradient(w / 2, h * 0.55, 5, w / 2, h * 0.55, w * 0.6);
    bg.addColorStop(0, "rgba(99, 146, 130, 0.26)");
    bg.addColorStop(0.6, "rgba(44, 68, 74, 0.1)");
    bg.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);
    // decorative moon
    halo(ctx, w * 0.74, h * 0.22, 18, "#f0d089", 0.13);
    circle(ctx, w * 0.74, h * 0.22, 11, "#b89d68");
    // platform
    ellipse(ctx, w / 2, h * 0.88, 33, 5, "rgba(0,0,0,0.24)");
    rect(ctx, w / 2 - 29, h * 0.86, 58, 3, "#3f4b48");
    rect(ctx, w / 2 - 24, h * 0.86, 48, 1, "#738477");
    // character
    const scale = 2.55;
    const t = opts.t || 0;
    ctx.save();
    ctx.translate(w / 2, h * 0.84);
    ctx.scale(scale, scale);
    ctx.translate(0, -1);
    drawWukong(ctx, 0, 0, 1, { state: opts.state || "idle", t, flash: false, gear: opts.gear || {} });
    ctx.restore();
    // sparkle
    ctx.save();
    ctx.globalAlpha = 0.4 + Math.sin(t * 2) * 0.15;
    for (let i = 0; i < 6; i++) {
      const x = w / 2 + Math.sin(t * 0.6 + i * 2.1) * 36;
      const y = 30 + ((i * 19 + t * 6) % 82);
      rect(ctx, x, y, 1, 2, i % 2 ? "#f1d27f" : "#8fe0be");
    }
    ctx.restore();
  }

  function drawArtifactModel(ctx, id, x, y, t, scale = 1) {
    if (!id) return;
    ctx.save();
    ctx.translate(Math.round(x), Math.round(y));
    ctx.scale(scale, scale);
    ctx.translate(0, Math.sin(t * 2.6) * 1.6);
    const spin = Math.sin(t * 1.8) * 0.12;
    if (id === "jadeBottle") {
      halo(ctx, 0, 0, 9, "#79e6c1", 0.16);
      rect(ctx, -3, -7, 6, 3, "#d9c9a0");
      rect(ctx, -2, -9, 4, 2, "#f0e2bb");
      rect(ctx, -4, -4, 8, 9, "#bfe8d8");
      rect(ctx, -3, -3, 6, 7, "#6fd6b0");
      rect(ctx, -3, -1, 6, 3, "#a9f0d4");
      rect(ctx, -1, 2, 2, 3, "#4fae8c");
      circle(ctx, 2, -1, 1, "#eafff6");
    } else if (id === "heavenSeal") {
      halo(ctx, 0, 0, 10, "#e6c35a", 0.18);
      ctx.save();
      ctx.rotate(spin);
      rect(ctx, -6, -6, 12, 12, "#b98c2e");
      rect(ctx, -5, -5, 10, 10, "#e6c35a");
      rect(ctx, -4, -4, 8, 8, "#f4dc92");
      rect(ctx, -2, -3, 4, 1, "#8a6420");
      rect(ctx, -2, 0, 4, 1, "#8a6420");
      rect(ctx, -2, 2, 4, 1, "#8a6420");
      rect(ctx, -1, -3, 1, 6, "#8a6420");
      ctx.restore();
    } else if (id === "chaosBell") {
      halo(ctx, 0, 0, 11, "#9fd8ff", 0.18);
      ctx.save();
      ctx.rotate(spin * 0.6);
      polygon(ctx, [[-7, 5], [-5, -4], [-2, -8], [2, -8], [5, -4], [7, 5], [7, 7], [-7, 7]], "#7fb8e6");
      polygon(ctx, [[-5, 4], [-3.5, -3], [-1.5, -6], [1.5, -6], [3.5, -3], [5, 4]], "#bfe4ff");
      rect(ctx, -1, 5, 2, 4, "#5f92c4");
      circle(ctx, 0, 9, 2, "#e8f6ff");
      rect(ctx, -6, -2, 12, 1, "#dff2ff");
      rect(ctx, -7, 5, 14, 2, "#9fd8ff");
      ctx.restore();
    } else if (id === "immortalSword") {
      halo(ctx, 0, 0, 11, "#c58cff", 0.2);
      ctx.save();
      ctx.rotate(spin * 0.5);
      polygon(ctx, [[-2, 8], [2, 8], [2, -6], [0, -12], [-2, -6]], "#e6d8ff");
      polygon(ctx, [[-1, 8], [1, 8], [1, -6], [0, -11], [-1, -6]], "#b58cff");
      rect(ctx, -5, 6, 10, 2, "#e6c35a");
      rect(ctx, -1, 8, 2, 5, "#8a6420");
      circle(ctx, 0, 14, 1.5, "#c58cff");
      ctx.restore();
    } else if (id === "kunlunMirror") {
      halo(ctx, 0, 0, 11, "#bfe8ff", 0.2);
      ctx.save();
      ctx.rotate(spin * 0.4);
      circle(ctx, 0, 0, 8, "#3f6f96");
      circle(ctx, 0, 0, 6, "#bfe8ff");
      circle(ctx, 0, 0, 4, "#e8f8ff");
      rect(ctx, -1, -4, 2, 8, "#ffffff");
      rect(ctx, -4, -1, 8, 2, "#ffffff");
      circle(ctx, -2, -2, 1, "#5f92c4");
      ctx.restore();
      rect(ctx, -2, 8, 4, 3, "#8a6420");
    }
    ctx.restore();
  }

  function drawWings(ctx, x, y, facing, t, wingId, opts = {}) {
    const def = window.GameData.WINGS[wingId];
    if (!def) return;
    const c = opts.flash ? "#fff4df" : def.color;
    const flap = Math.sin(t * 2.4) * 0.2 + (opts.state === "jump" || opts.state === "fall" ? -0.16 : 0);
    const scale = opts.scale || 1;
    ctx.save();
    ctx.translate(Math.round(x), Math.round(y));
    ctx.scale(facing < 0 ? -scale : scale, scale);
    ctx.translate(0, -24);

    if (wingId === "feather") {
      // 雏翼：小巧圆润的幼羽
      for (const side of [-1, 1]) {
        ctx.save();
        ctx.scale(side, 1);
        ctx.rotate(flap * 0.9);
        polygon(ctx, [[0, -2], [20, -15], [29, -3], [20, 9], [5, 6]], tint(def.color, 0.3));
        for (let i = 0; i < 3; i++) {
          const a = -0.7 + i * 0.45;
          const bx = Math.cos(a) * 24;
          const by = Math.sin(a) * 17;
          polygon(ctx, [[0, 0], [bx, by], [bx - 6, by + 5], [2, 6]], i === 1 ? "#e8f8ff" : c);
        }
        ctx.restore();
      }
      for (let i = 0; i < 4; i++) {
        rect(ctx, Math.sin(t * 2 + i) * 22, -18 - i * 7, 1, 1, "#e8f8ff");
      }
    } else if (wingId === "flame") {
      // 浴火：火舌状羽翼
      for (const side of [-1, 1]) {
        ctx.save();
        ctx.scale(side, 1);
        ctx.rotate(flap * 1.4);
        for (let i = 0; i < 6; i++) {
          const a = -0.95 + i * 0.3;
          const len = 40 - i * 3 + Math.sin(t * 6 + i) * 3;
          const bx = Math.cos(a) * len;
          const by = Math.sin(a) * len * 0.8 - 4;
          polygon(ctx, [[0, 4], [bx, by], [bx * 0.7, by + 12], [3, 10]], i % 2 ? "#ffd05a" : c);
          polygon(ctx, [[2, 5], [bx * 0.75, by + 4], [bx * 0.55, by + 12], [4, 10]], "#ff5a2b");
        }
        ctx.restore();
      }
      for (let i = 0; i < 8; i++) {
        const ph = (t * 1.6 + i * 0.7) % 1;
        rect(ctx, Math.sin(t * 3 + i) * 26, -6 - ph * 34, 1, 2, i % 2 ? "#ffb45a" : "#ffe8a0");
      }
    } else if (wingId === "core") {
      // 核力制动：机械翼板 + 推进器
      for (const side of [-1, 1]) {
        ctx.save();
        ctx.scale(side, 1);
        ctx.rotate(flap * 0.5);
        polygon(ctx, [[0, -6], [32, -20], [44, -6], [26, 8]], "#3f5a78");
        polygon(ctx, [[2, -5], [30, -17], [39, -7], [24, 5]], "#7e9bb8");
        line(ctx, 4, -4, 34, -14, "#9fe8ff", 1);
        line(ctx, 6, 1, 30, -6, "#9fe8ff", 1);
        rect(ctx, 18, -12, 8, 2, "#ffd36a");
        ctx.restore();
      }
      ctx.save();
      ctx.globalAlpha = 0.85;
      for (const side of [-1, 1]) {
        const jx = 10 * side;
        rect(ctx, jx - 3, 6, 6, 4, "#5d7694");
        rect(ctx, jx - 2, 9, 4, 5, "#9fe8ff");
        polygon(ctx, [[jx - 3, 14], [jx + 3, 14], [jx, 22 + Math.sin(t * 18) * 3]], "#ffd36a");
      }
      ctx.restore();
    } else if (wingId === "holy") {
      // 神光：巨大天使羽翼 + 圣光
      ctx.save();
      ctx.globalAlpha = 0.3;
      halo(ctx, 0, -4, 54, "#fff3c0", 0.35);
      ctx.restore();
      for (const side of [-1, 1]) {
        ctx.save();
        ctx.scale(side, 1);
        ctx.rotate(flap * 1.1);
        polygon(ctx, [[0, -3], [36, -24], [54, -8], [38, 14], [10, 9]], "#e8dcb0");
        for (let row = 0; row < 4; row++) {
          const len = 46 - row * 8;
          for (let i = 0; i < 6; i++) {
            const a = -0.95 + i * 0.32 - row * 0.06;
            const bx = Math.cos(a) * len;
            const by = Math.sin(a) * len * 0.72 - row * 2;
            polygon(ctx, [[0, 0], [bx, by], [bx - 8, by + 6], [2, 8]], row === 0 ? "#fffdf0" : row === 1 ? "#ffe9a0" : c);
          }
        }
        ctx.restore();
      }
      for (let i = 0; i < 6; i++) {
        const a = -1.3 + i * 0.52 + Math.sin(t) * 0.05;
        line(ctx, 0, -2, Math.cos(a) * 62, Math.sin(a) * 36, "#fff3c0", 1);
      }
    } else if (wingId === "star") {
      // 星宇：星空翼膜 + 星尘
      ctx.save();
      ctx.globalAlpha = 0.35;
      halo(ctx, 0, -4, 48, "#b48cff", 0.35);
      ctx.restore();
      for (const side of [-1, 1]) {
        ctx.save();
        ctx.scale(side, 1);
        ctx.rotate(flap * 0.85);
        polygon(ctx, [[0, -4], [30, -22], [48, -14], [50, 2], [30, 12], [8, 8]], "#2b2350");
        polygon(ctx, [[0, -3], [26, -18], [42, -12], [44, 1], [27, 9], [8, 6]], "#4b3f86");
        for (let i = 0; i < 12; i++) {
          const a = -0.8 + i * 0.16;
          const r = 12 + (i % 4) * 9;
          rect(ctx, Math.cos(a) * r, Math.sin(a) * r * 0.62 - 3, 1, 1, i % 3 === 0 ? "#fff3c0" : "#e8dcff");
        }
        line(ctx, 2, -3, 40, -12, "#b48cff", 1);
        ctx.restore();
      }
      for (let i = 0; i < 7; i++) {
        const a = t * 1.1 + i * 0.9;
        rect(ctx, Math.cos(a) * (30 + (i % 3) * 8), Math.sin(a) * 20, 1, 1, "#e8dcff");
      }
    } else if (wingId === "void") {
      // 太虚：半透明虚影羽翼 + 符环
      ctx.save();
      ctx.globalAlpha = 0.45;
      for (const off of [-6, 6]) {
        for (const side of [-1, 1]) {
          ctx.save();
          ctx.scale(side, 1);
          ctx.translate(off * side * 0.4, 0);
          ctx.rotate(flap * 0.7);
          polygon(ctx, [[0, -3], [30, -20], [46, -8], [32, 12], [8, 8]], "#1f4f46");
          ctx.restore();
        }
      }
      ctx.restore();
      for (const side of [-1, 1]) {
        ctx.save();
        ctx.scale(side, 1);
        ctx.rotate(flap * 0.7);
        polygon(ctx, [[0, -2], [28, -18], [43, -7], [30, 11], [8, 7]], "#3f8f7c");
        for (let i = 0; i < 5; i++) {
          const a = -0.85 + i * 0.4;
          const bx = Math.cos(a) * 34;
          const by = Math.sin(a) * 24;
          polygon(ctx, [[0, 0], [bx, by], [bx - 6, by + 5], [2, 6]], i % 2 ? "#6ee7c2" : "#b9ffe9");
        }
        ctx.restore();
      }
      ctx.save();
      ctx.globalAlpha = 0.55;
      circle(ctx, 0, -4, 12, "rgba(0,0,0,0)");
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.arc(0, -4, 14 + i * 5, t * (1 + i * 0.3), t * (1 + i * 0.3) + Math.PI * 1.4);
        ctx.strokeStyle = "#6ee7c2";
        ctx.lineWidth = 1;
        ctx.stroke();
      }
      ctx.restore();
    } else {
      // 无极：双层金翼 + 曼陀罗光环
      ctx.save();
      ctx.globalAlpha = 0.3;
      halo(ctx, 0, -4, 60, "#ffd75e", 0.4);
      ctx.restore();
      for (const layer of [0, 1]) {
        const mul = layer === 0 ? 1 : 0.68;
        for (const side of [-1, 1]) {
          ctx.save();
          ctx.scale(side, 1);
          ctx.rotate(flap * (1 + layer * 0.3));
          polygon(ctx, [[0, -3], [38 * mul, -24 * mul], [56 * mul, -8 * mul], [40 * mul, 14 * mul], [10 * mul, 10 * mul]], layer === 0 ? "#8a6420" : "#b98c2e");
          for (let row = 0; row < 4; row++) {
            const len = (48 - row * 8) * mul;
            for (let i = 0; i < 6; i++) {
              const a = -0.95 + i * 0.32 - row * 0.06;
              const bx = Math.cos(a) * len;
              const by = Math.sin(a) * len * 0.72 - row * 2;
              polygon(ctx, [[0, 0], [bx, by], [bx - 8, by + 6], [2, 8]], row === 0 ? "#fff3c0" : row === 1 ? "#ffd75e" : layer === 0 ? "#e8b32a" : "#fff0b8");
            }
          }
          ctx.restore();
        }
      }
      ctx.save();
      ctx.globalAlpha = 0.6;
      for (let i = 0; i < 2; i++) {
        ctx.beginPath();
        ctx.arc(0, -6, 26 + i * 10, t * (0.8 + i * 0.4), t * (0.8 + i * 0.4) + Math.PI * 1.7);
        ctx.strokeStyle = "#ffe8a8";
        ctx.lineWidth = 1;
        ctx.stroke();
      }
      ctx.restore();
      for (let i = 0; i < 10; i++) {
        const a = t * 1.4 + i * 0.63;
        rect(ctx, Math.cos(a) * (30 + (i % 4) * 8), Math.sin(a) * (18 + (i % 2) * 8) - 4, 1, 2, "#fff3c0");
      }
    }
    ctx.restore();
  }

  window.Art = {
    W, H, FLOOR,
    rect, px, circle, ellipse, line, polygon, halo, shadow, drawText,
    drawMountainRange, drawCaveBackground, drawBoneBackground, drawFireBackground, drawRiverBackground, drawWebBackground, drawSkyBackground, drawGround,
    drawPlatforms,
    drawWukong, drawStaff,
    drawEnemy, drawEnemyHealth,
    drawProjectile, drawDrop, drawPortal, drawSpawnRift,
    drawSlash, drawHitSpark, drawShockwave, drawFlame,
    drawFireTornado, drawClone, drawStaffSlamEffect, drawEyeBeam, drawEyeBurst, drawBottleAura,
    drawGearGlyph, drawLootBeam,
    drawPortrait, drawCharacterPreview, drawArtifactModel, drawWings,
    drawPeachTree, drawCrystalCluster, drawDeadTree, drawGhostFire
  };
})();
