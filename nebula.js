// nebula.js — background canvas for LANDING2. (version compacte sans commentaires
// — source commentée disponible sur galaxtarus.com/nebula.js)
(function () {
  'use strict';
  var canvas = document.getElementById('nebula-bg');
  if (!canvas) return;
  var ctx = canvas.getContext('2d');
var _gzA; try { _gzA = localStorage.getItem('gzAnim'); } catch(e) {}
  if (window.innerWidth <= 820 ? _gzA !== 'on' : _gzA === 'off') { canvas.style.display = 'none'; return; }
  var W, H, scrollY = 0, t = 0;
  var mouseX = -9999, mouseY = -9999;
  var LITE = false, forcedLite = false;
  function computeLite() {
    LITE = forcedLite || !!(window.matchMedia && window.matchMedia('(max-width: 820px)').matches);
    if (LITE && typeof document !== 'undefined' && document.documentElement) {
      document.documentElement.classList.add('perf-lite');
    }
  }
  computeLite();
  var _realSB = 0;
  try {
    Object.defineProperty(ctx, 'shadowBlur', {
      get: function () { return LITE ? 0 : _realSB; },
      set: function (v) { _realSB = v; },
      configurable: true
    });
  } catch (e) {}
  // MOBILE : fond statique noir, zéro animation.
  if (LITE) {
    var paintStatic = function () {
      W = canvas.width  = window.innerWidth;
      H = canvas.height = window.innerHeight;
      ctx.fillStyle = '#050b18';
      ctx.fillRect(0, 0, W, H);
    };
    paintStatic();
    window.addEventListener('resize', paintStatic, { passive: true });
    return;
  }
  var T_START = 0, perfLast = 0, perfAcc = 0, perfFrames = 0, perfLow = 0, perfDone = false;
  function degrade() {
    if (forcedLite) return;
    forcedLite = true; computeLite();
    document.documentElement.classList.add('perf-lite');
  }
  function perfTick(now) {
    if (perfDone || LITE || !now) return;
    if (!T_START) { T_START = now; perfLast = now; return; }
    if (now - T_START < 6000) { perfLast = now; return; }
    var dt = now - perfLast; perfLast = now;
    if (dt <= 0 || dt > 500) return;
    perfAcc += dt; perfFrames++;
    if (perfAcc >= 1500) {
      var fps = perfFrames * 1000 / perfAcc;
      perfAcc = 0; perfFrames = 0;
      if (fps < 36) { if (++perfLow >= 3) { perfDone = true; degrade(); } }
      else perfLow = 0;
      if (now - T_START > 16000) perfDone = true;
    }
  }
  function hashSeed(str) {
    var h = 2166136261;
    for (var i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h  = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }
  function mulberry32(seed) {
    var a = seed;
    return function () {
      a = (a + 0x6D2B79F5) | 0;
      var v = a;
      v  = Math.imul(v ^ (v >>> 15), v | 1);
      v ^= v + Math.imul(v ^ (v >>> 7), v | 61);
      return ((v ^ (v >>> 14)) >>> 0) / 4294967296;
    };
  }
  var PUFF_COUNT = 9;
  var SCALE_X    = 2.8;
  var SCALE_Y    = 0.35;
  var NEBULA_DEFS = [
    { name: 'neb-a', xp: 0.22, yp: 0.20, hue: 238, alpha: 0.10, radius: 150, pf: 0.05 },
    { name: 'neb-b', xp: 0.85, yp: 0.24, hue: 292, alpha: 0.10, radius: 160, pf: 0.06 },
    { name: 'neb-c', xp: 0.12, yp: 0.78, hue: 258, alpha: 0.10, radius: 145, pf: 0.04 },
    { name: 'neb-d', xp: 0.82, yp: 0.74, hue: 312, alpha: 0.10, radius: 150, pf: 0.05 },
    { name: 'neb-e', xp: 0.50, yp: 0.50, hue: 222, alpha: 0.09, radius: 195, pf: 0.03 },
  ];
  var nebulae = [];
  function initNebulae() {
    nebulae = NEBULA_DEFS.map(function (def) {
      var rng   = mulberry32(hashSeed(def.name));
      var puffs = [];
      for (var i = 0; i < PUFF_COUNT; i++) {
        puffs.push({
          ox:       (rng() - 0.5) * def.radius * 1.4,
          oy:       (rng() - 0.5) * def.radius * 1.4,
          r:        def.radius * (0.55 + rng() * 0.80),
          alphaMul: 0.5 + rng() * 0.5,
          aOff:     rng() * 0.0002,
        });
      }
      return { def: def, angle: rng() * Math.PI, puffs: puffs };
    });
  }
  var PLANET_DEFS = [
    {
      name: 'Veloth Zul',
      xp: 0.87, yp: 0.22, r: 92, pf: 0.03,
      col1: '#b98cff', col2: '#4a2f8c', col3: '#241540',
      atmo: '#e066ff', glowMul: 0.46, type: 'rocky',
      rings: { col: '#4dd9ff', alpha: 0.55, tiltY: 0.16, gap: 0.15, count: 5, rot: 35 },
    },
  ];
  var SOLUM_CFG = {"pType":"rocky","pRadius":47,"pCol1":"#d3ed86","pCol2":"#f58f61","pCol3":"#7910a6","pAtmo":"#326b2c","pBands":13,"pRot":14,"pClouds":1,"pGlow":6,"pTurb":9,"pStorm":5,"rCount":8,"rThick":28,"rGap":15,"rTilt":70,"rCol":"#d97150","rAlpha":87,"rRot":3,"rType":"crystal","mCount":0,"mSize":18,"mDist":163,"mSpeed":12,"mCol":"#cec0a9","mOrbit":0,"mTilt":26,"sDens":66,"nebula":3,"nebCol":"#41b568","bgCol":"#050b18","meteors":3,"dust":3,"name":"Solum Ignis"};
  var PYROTH_CFG = {"pType":"rocky","pRadius":97,"pCol1":"#b27dc8","pCol2":"#f117c2","pCol3":"#688e1f","pAtmo":"#e69f72","pBands":18,"pRot":12,"pClouds":0,"pGlow":13,"pTurb":4,"pStorm":5,"rCount":8,"rThick":16,"rGap":20,"rTilt":66,"rCol":"#dfb9d7","rAlpha":84,"rRot":9,"rType":"debris","mCount":0,"mSize":18,"mDist":129,"mSpeed":18,"mCol":"#900527","mOrbit":9,"mTilt":40,"sDens":51,"nebula":2,"nebCol":"#0fcde6","bgCol":"#050b18","meteors":1,"dust":5,"name":"Pyroth Thar"};
  var CFG_PLANETS = [
    { cfg: SOLUM_CFG,  xp: 0.06, yp: 0.64, scale: 1.05, pf: 0.034, glow: '#84d56a' },
    { cfg: PYROTH_CFG, xp: 0.92, yp: 0.90, scale: 0.85, pf: 0.030, glow: '#ffb98f' },
  ];
  var _planetFxReg = null;
  try {
    var _PG = window.GALAXTARUS;
    if (_PG && _PG.entities && _PG.entities.planet_fx && _PG.assets &&
        typeof _PG.assets.populateGalaxtarusPlanetFx === 'function') {
      _planetFxReg = new _PG.entities.planet_fx.PlanetFxRegistry();
      _PG.assets.populateGalaxtarusPlanetFx(_planetFxReg);
    }
  } catch (e) { _planetFxReg = null; }
  var AST_COLORS = ['#1a6fa8', '#0d9ecc', '#14c4b0', '#0e7acc', '#1890b8'];
  function buildAstDefs() {
    var bands = LITE
      ? [ { n: 6, rMin: 8,  rMax: 18, sMin: 0.15, sMax: 0.35 },
          { n: 3, rMin: 22, rMax: 40, sMin: 0.45, sMax: 0.85 },
          { n: 1, rMin: 55, rMax: 90, sMin: 1.0,  sMax: 1.7  } ]
      : [ { n: 18, rMin: 8,  rMax: 18, sMin: 0.15, sMax: 0.35 },
          { n: 9,  rMin: 22, rMax: 44, sMin: 0.45, sMax: 0.90 },
          { n: 4,  rMin: 55, rMax: 95, sMin: 1.0,  sMax: 1.8  } ];
    var defs = [], id = 0;
    for (var b = 0; b < bands.length; b++) {
      var band = bands[b];
      for (var i = 0; i < band.n; i++) {
        defs.push({
          name:  'a' + (id++),
          r:     band.rMin + Math.random() * (band.rMax - band.rMin),
          speed: band.sMin + Math.random() * (band.sMax - band.sMin),
        });
      }
    }
    return defs;
  }
  var asteroids = [];
  function makePolygon(rng, radius, verts) {
    var pts  = [];
    var step = (Math.PI * 2) / verts;
    for (var i = 0; i < verts; i++) {
      var a = i * step + (rng() - 0.5) * step * 0.45;
      var r = radius * (0.70 + rng() * 0.58);
      pts.push([Math.cos(a) * r, Math.sin(a) * r]);
    }
    return pts;
  }
  function spawnBelow(ast, stagger) {
    var r = ast.def.r;
    ast.x  = W * Math.random();
    ast.y  = H + r + 10 + (stagger ? Math.random() * H * 1.8 : Math.random() * 60);
    ast.vx = (Math.random() - 0.5) * 0.25;
    ast.vy = 0;
  }
  function initAsteroids() {
    asteroids = buildAstDefs().map(function(def) {
      var rng   = mulberry32(hashSeed('ast|' + def.name));
      var verts = 6 + Math.floor(rng() * 4);
      var col   = AST_COLORS[Math.floor(rng() * AST_COLORS.length)];
      var lw    = 0.8 + rng() * 0.7;
      var ast = {
        def:     def,
        polygon: makePolygon(rng, def.r, verts),
        color:   col,
        lw:      lw,
        angle:   rng() * Math.PI * 2,
        rotSpd:  (rng() - 0.5) * 0.010,
        x: 0, y: 0, vx: 0, vy: 0,
      };
      spawnBelow(ast, true);
      return ast;
    });
  }
  function drawAsteroidBody(ast) {
    var poly = ast.polygon;
    var n    = poly.length;
    ctx.shadowColor = ast.color;
    ctx.lineJoin    = 'round';
    ctx.strokeStyle = ast.color;
    ctx.lineWidth   = ast.lw;
    ctx.beginPath();
    ctx.moveTo(poly[0][0], poly[0][1]);
    for (var j = 1; j < n; j++) ctx.lineTo(poly[j][0], poly[j][1]);
    ctx.closePath();
    ctx.fillStyle  = '#05050f';
    ctx.shadowBlur = 0;
    ctx.fill();
    ctx.shadowBlur = 5;
    ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.shadowBlur  = 0;
  }
  function collideAsteroids() {
    var n = asteroids.length;
    for (var i = 0; i < n; i++) {
      var A = asteroids[i];
      for (var j = i + 1; j < n; j++) {
        var B = asteroids[j];
        var dx = B.x - A.x, dy = B.y - A.y;
        var rs = A.def.r + B.def.r;
        var d2 = dx * dx + dy * dy;
        if (d2 >= rs * rs || d2 < 0.0001) continue;
        var d  = Math.sqrt(d2);
        var nx = dx / d, ny = dy / d;
        var overlap = rs - d;
        var mA = A.def.r * A.def.r, mB = B.def.r * B.def.r;
        var imA = 1 / mA, imB = 1 / mB, invSum = 1 / (mA + mB);
        A.x -= nx * overlap * (mB * invSum);
        A.y -= ny * overlap * (mB * invSum);
        B.x += nx * overlap * (mA * invSum);
        B.y += ny * overlap * (mA * invSum);
        var avy = A.vy - A.def.speed, bvy = B.vy - B.def.speed;
        var vn  = (B.vx - A.vx) * nx + (bvy - avy) * ny;
        if (vn < 0) {
          var e = 0.55;
          var jimp = -(1 + e) * vn / (imA + imB);
          A.vx -= jimp * imA * nx; A.vy -= jimp * imA * ny;
          B.vx += jimp * imB * nx; B.vy += jimp * imB * ny;
        } else {
          var sep = overlap * 0.05;
          A.vx -= nx * sep; A.vy -= ny * sep;
          B.vx += nx * sep; B.vy += ny * sep;
        }
      }
    }
  }
  function updateAndDrawAsteroids() {
    asteroids.forEach(function(ast) {
      ast.x     += ast.vx;
      ast.y     += ast.vy - ast.def.speed;
      ast.vx    *= 0.96;
      ast.vy    *= 0.96;
      ast.angle += ast.rotSpd;
      var _m = ast.def.r + 90;
      var _mBottom = ast.def.r + 90;
      if (!isFinite(ast.x) || !isFinite(ast.y) ||
          ast.y < -_m || ast.y > H + _mBottom || ast.x < -_m || ast.x > W + _m) spawnBelow(ast, false);
    });
    collideAsteroids();
    asteroids.forEach(function(ast) {
      var sy = ast.y;
      if (sy < -(ast.def.r*3) || sy > H+(ast.def.r*3)) return;
      ctx.save();
      ctx.translate(ast.x, sy);
      ctx.rotate(ast.angle);
      drawAsteroidBody(ast);
      ctx.restore();
    });
  }
  var explosions = [];
  function spawnExplosion(x, y, r, color) {
    var lines = [];
    for (var i = 0; i < 22; i++) {
      lines.push({
        angle:     (i / 22) * Math.PI * 2 + (Math.random() - 0.5) * 0.2,
        lenFactor: 0.25 + Math.random() * 0.35,
      });
    }
    explosions.push({ x: x, y: y, radius: 8, maxRadius: 55 + r * 3, alpha: 1, color: color || '#ffffff', lines: lines });
  }
  function updateAndDrawExplosions() {
    for (var k = explosions.length - 1; k >= 0; k--) {
      var e = explosions[k];
      e.radius += 14;
      var progress = e.radius / e.maxRadius;
      if (progress > 0.65) e.alpha = 1 - (progress - 0.65) / 0.35;
      if (e.radius >= e.maxRadius) { explosions.splice(k, 1); continue; }
      if (!e.affected) e.affected = [];
      for (var ai = 0; ai < asteroids.length; ai++) {
        var a = asteroids[ai];
        if (e.affected.indexOf(a) !== -1) continue;
        var adx = a.x - e.x, ady = a.y - e.y;
        var ad = Math.sqrt(adx * adx + ady * ady) || 1;
        if (ad > e.radius) continue;
        e.affected.push(a);
        var pf = (5 + Math.random() * 3) * e.alpha;
        a.vx += (adx / ad) * pf;
        a.vy += (ady / ad) * pf;
      }
      if (!e.fragHit) e.fragHit = [];
      for (var fi = 0; fi < fragments.length; fi++) {
        var fg = fragments[fi];
        if (e.fragHit.indexOf(fg) !== -1) continue;
        var fdx = fg.x - e.x, fdy = fg.y - e.y;
        var fd = Math.sqrt(fdx * fdx + fdy * fdy) || 1;
        if (fd > e.radius) continue;
        e.fragHit.push(fg);
        var fpf = (7 + Math.random() * 4) * e.alpha;
        fg.vx += (fdx / fd) * fpf;
        fg.vy += (fdy / fd) * fpf;
      }
      var sr = e.radius, mr = e.maxRadius;
      ctx.save();
      ctx.globalAlpha = e.alpha * 0.15;
      ctx.beginPath(); ctx.arc(e.x, e.y, mr, 0, Math.PI * 2);
      ctx.strokeStyle = e.color; ctx.lineWidth = 1; ctx.stroke();
      if (progress < 0.45) {
        ctx.globalAlpha = e.alpha * (1 - progress / 0.45);
        ctx.beginPath(); ctx.arc(e.x, e.y, sr * 0.85, 0, Math.PI * 2);
        ctx.fillStyle = '#5cb8ff'; ctx.shadowColor = '#5cb8ff'; ctx.shadowBlur = 20;
        ctx.fill();
      }
      for (var li = 0; li < e.lines.length; li++) {
        var line = e.lines[li];
        var inner = sr * 0.25, outer = sr * (1 + line.lenFactor);
        var cos = Math.cos(line.angle), sin = Math.sin(line.angle);
        ctx.globalAlpha = e.alpha * 0.55;
        ctx.beginPath();
        ctx.moveTo(e.x + cos * inner, e.y + sin * inner);
        ctx.lineTo(e.x + cos * outer, e.y + sin * outer);
        ctx.strokeStyle = e.color; ctx.shadowColor = e.color; ctx.shadowBlur = 6; ctx.lineWidth = 0.9;
        ctx.stroke();
      }
      ctx.globalAlpha = e.alpha;
      ctx.beginPath(); ctx.arc(e.x, e.y, sr, 0, Math.PI * 2);
      ctx.strokeStyle = e.color; ctx.shadowColor = e.color; ctx.shadowBlur = 22; ctx.lineWidth = 2;
      ctx.stroke();
      ctx.restore();
    }
    ctx.globalAlpha = 1; ctx.shadowBlur = 0;
  }
  var fragments = [], FRAG_MAX = 90;
  function spawnFragments(ast) {
    var rng = mulberry32((Math.random() * 4294967296) >>> 0);
    var n = 5 + Math.floor(Math.random() * 3);
    for (var i = 0; i < n; i++) {
      var ang = (i / n) * Math.PI * 2 + (Math.random() - 0.5) * 0.6;
      var spd = 4 + Math.random() * 5;
      var fr  = ast.def.r * (0.22 + Math.random() * 0.22);
      fragments.push({
        x: ast.x, y: ast.y, r: fr,
        vx: Math.cos(ang) * spd, vy: Math.sin(ang) * spd,
        driftX: (Math.random() - 0.5) * 0.25,
        driftY: -(0.25 + Math.random() * 0.45),
        polygon: makePolygon(rng, fr, 4 + Math.floor(rng() * 3)),
        color: ast.color, lw: ast.lw,
        angle: Math.random() * Math.PI * 2, rotSpeed: (Math.random() - 0.5) * 0.3,
        alpha: 1,
      });
    }
    if (fragments.length > FRAG_MAX) fragments.splice(0, fragments.length - FRAG_MAX);
  }
  function updateAndDrawFragments() {
    for (var k = fragments.length - 1; k >= 0; k--) {
      var f = fragments[k];
      f.x += f.vx + f.driftX; f.y += f.vy + f.driftY;
      f.vx *= 0.985; f.vy *= 0.985;
      f.angle += f.rotSpeed;
      f.rotSpeed *= 0.96;
      if (f.y < -60 || f.x < -90 || f.x > W + 90 || f.y > H + 90) { fragments.splice(k, 1); continue; }
      ctx.save();
      ctx.globalAlpha = f.alpha;
      ctx.translate(f.x, f.y);
      ctx.rotate(f.angle);
      ctx.lineJoin = 'round';
      ctx.strokeStyle = f.color; ctx.lineWidth = f.lw;
      ctx.beginPath();
      ctx.moveTo(f.polygon[0][0], f.polygon[0][1]);
      for (var j = 1; j < f.polygon.length; j++) ctx.lineTo(f.polygon[j][0], f.polygon[j][1]);
      ctx.closePath();
      ctx.fillStyle = '#05050f'; ctx.fill();
      ctx.globalAlpha = f.alpha * 0.5;
      ctx.strokeStyle = f.color; ctx.lineWidth = f.lw;
      ctx.stroke();
      ctx.globalAlpha = f.alpha;
      ctx.restore();
    }
    ctx.globalAlpha = 1;
  }
  var _sfxCtx = null;
  function _sfxAudio() {
    if (_sfxCtx) return _sfxCtx;
    try {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (AC) _sfxCtx = new AC();
    } catch (e) { _sfxCtx = null; }
    return _sfxCtx;
  }
  function playExplosionSound(x, r) {
    var ac = _sfxAudio();
    if (!ac) return;
    if (ac.state === 'suspended' && ac.resume) ac.resume();
    var now = ac.currentTime;
    var pan = Math.max(-1, Math.min(1, (x / (W || 1)) * 2 - 1));
    var vol = Math.max(0.25, Math.min(1, (r || 30) / 75)) * (0.9 + Math.random() * 0.2);
    var panner = ac.createStereoPanner ? ac.createStereoPanner() : null;
    if (panner) { panner.pan.value = pan; panner.connect(ac.destination); }
    var out = panner || ac.destination;
    var dur = 0.34;
    var buf = ac.createBuffer(1, Math.max(1, Math.floor(ac.sampleRate * dur)), ac.sampleRate);
    var d = buf.getChannelData(0);
    for (var i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    var noise = ac.createBufferSource(); noise.buffer = buf;
    var lp = ac.createBiquadFilter(); lp.type = 'lowpass';
    lp.frequency.setValueAtTime(2200, now);
    lp.frequency.exponentialRampToValueAtTime(180, now + dur);
    var ng = ac.createGain();
    ng.gain.setValueAtTime(0.0001, now);
    ng.gain.exponentialRampToValueAtTime(0.35 * vol, now + 0.008);
    ng.gain.exponentialRampToValueAtTime(0.0001, now + dur);
    noise.connect(lp); lp.connect(ng); ng.connect(out);
    noise.start(now); noise.stop(now + dur);
    var osc = ac.createOscillator(); osc.type = 'sine';
    osc.frequency.setValueAtTime(110, now);
    osc.frequency.exponentialRampToValueAtTime(38, now + 0.25);
    var og = ac.createGain();
    og.gain.setValueAtTime(0.0001, now);
    og.gain.exponentialRampToValueAtTime(0.32 * vol, now + 0.015);
    og.gain.exponentialRampToValueAtTime(0.0001, now + 0.28);
    osc.connect(og); og.connect(out);
    osc.start(now); osc.stop(now + 0.3);
  }
  var SHIP = {
    x: 0, y: 0, vx: 0, vy: 0, angle: 0, wander: 0,
    SZ: 16, COLOR: '#ff4d8f',
    ACCEL: 0.7, FRICTION: 0.99, MAX: 12,
    hurtStart: 0
  };
  var shipSmoke = [];
  function shipReset() {
    SHIP.x = W * (0.3 + Math.random() * 0.4);
    SHIP.y = H * (0.3 + Math.random() * 0.4);
    SHIP.vx = 0; SHIP.vy = 0;
    SHIP.angle  = Math.random() * Math.PI * 2;
    SHIP.wander = Math.random() * Math.PI * 2;
  }
  function shipTrail(x0, y0, x1, y1, w, rgb) {
    var c = rgb || [255, 77, 143];
    var p = c[0] + ',' + c[1] + ',' + c[2];
    var g = ctx.createLinearGradient(x0, y0, x1, y1);
    g.addColorStop(0,   'rgba(' + p + ',0.95)');
    g.addColorStop(0.3, 'rgba(' + p + ',0.55)');
    g.addColorStop(0.7, 'rgba(' + p + ',0.15)');
    g.addColorStop(1,   'rgba(' + p + ',0)');
    ctx.strokeStyle = g; ctx.lineWidth = w; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
  }
  function updateAndDrawShip() {
    var ax = 0, ay = 0;
    SHIP.wander += (Math.random() - 0.5) * 0.30;
    ax += Math.cos(SHIP.wander) * SHIP.ACCEL;
    ay += Math.sin(SHIP.wander) * SHIP.ACCEL;
    for (var i = 0; i < asteroids.length; i++) {
      var a = asteroids[i];
      var dxa = SHIP.x - a.x, dya = SHIP.y - a.y;
      var da = Math.sqrt(dxa * dxa + dya * dya);
      var R = a.def.r * 2.6 + 40;
      if (da < R && da > 0.1) {
        var f = (R - da) / R * 2.6;
        ax += (dxa / da) * f;
        ay += (dya / da) * f;
      }
    }
    for (var fai = 0; fai < fragments.length; fai++) {
      var fa = fragments[fai];
      var dxf = SHIP.x - fa.x, dyf = SHIP.y - fa.y;
      var df  = Math.sqrt(dxf * dxf + dyf * dyf);
      var Rf  = fa.r * 2.4 + 34;
      if (df < Rf && df > 0.1) {
        var ff = (Rf - df) / Rf * 2.0;
        ax += (dxf / df) * ff;
        ay += (dyf / df) * ff;
      }
    }
    var nowMs = (typeof performance !== 'undefined' ? performance.now() : Date.now());
    var canHurt = (!SHIP.hurtStart || (nowMs - SHIP.hurtStart) / 1000 >= 4);
    var sspd = Math.sqrt(SHIP.vx * SHIP.vx + SHIP.vy * SHIP.vy);
    for (var ci = 0; ci < asteroids.length; ci++) {
      var ca = asteroids[ci];
      var cdx = ca.x - SHIP.x, cdy = ca.y - SHIP.y;
      var rr  = ca.def.r + SHIP.SZ * 0.6;
      if (cdx * cdx + cdy * cdy >= rr * rr) continue;
      var cd = Math.sqrt(cdx * cdx + cdy * cdy) || 1;
      if (ca.def.r < 30) {
        var push = 2.4 + sspd * 0.3;
        ca.vx += (cdx / cd) * push + SHIP.vx * 0.45;
        ca.vy += (cdy / cd) * push + SHIP.vy * 0.45;
      }
      if (canHurt) { SHIP.hurtStart = nowMs; canHurt = false; }
    }
    for (var cf = 0; cf < fragments.length; cf++) {
      var cfa = fragments[cf];
      var fdx2 = cfa.x - SHIP.x, fdy2 = cfa.y - SHIP.y;
      var frr = cfa.r + SHIP.SZ * 0.5;
      if (fdx2 * fdx2 + fdy2 * fdy2 >= frr * frr) continue;
      var fcd = Math.sqrt(fdx2 * fdx2 + fdy2 * fdy2) || 1;
      var fpush = 1.8 + sspd * 0.25;
      cfa.vx += (fdx2 / fcd) * fpush + SHIP.vx * 0.4;
      cfa.vy += (fdy2 / fcd) * fpush + SHIP.vy * 0.4;
    }
    var pad = 180;
    if (SHIP.x < pad)     ax += (pad - SHIP.x) / pad * 2.2;
    if (SHIP.x > W - pad) ax -= (SHIP.x - (W - pad)) / pad * 2.2;
    if (SHIP.y < pad)     ay += (pad - SHIP.y) / pad * 2.2;
    if (SHIP.y > H - pad) ay -= (SHIP.y - (H - pad)) / pad * 2.2;
    for (var ei = 0; ei < explosions.length; ei++) {
      var ex = explosions[ei];
      var edx = SHIP.x - ex.x, edy = SHIP.y - ex.y;
      var ed = Math.sqrt(edx * edx + edy * edy) || 1;
      if (ed < ex.radius + 45) {
        var ef = 7 * ex.alpha;
        ax += (edx / ed) * ef;
        ay += (edy / ed) * ef;
      }
    }
    SHIP.vx += ax; SHIP.vy += ay;
    var spd = Math.sqrt(SHIP.vx * SHIP.vx + SHIP.vy * SHIP.vy);
    if (spd > SHIP.MAX) { SHIP.vx = SHIP.vx / spd * SHIP.MAX; SHIP.vy = SHIP.vy / spd * SHIP.MAX; spd = SHIP.MAX; }
    SHIP.vx *= SHIP.FRICTION; SHIP.vy *= SHIP.FRICTION;
    SHIP.x += SHIP.vx; SHIP.y += SHIP.vy;
    if (spd > 0.5) {
      var target = Math.atan2(SHIP.vy, SHIP.vx), diff = target - SHIP.angle;
      while (diff >  Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      SHIP.angle += diff * 0.20;
    }
    if (SHIP.x < -300 || SHIP.x > W + 300 || SHIP.y < -300 || SHIP.y > H + 300) shipReset();
    var hk = 0;
    if (SHIP.hurtStart) {
      var el = (nowMs - SHIP.hurtStart) / 1000;
      if (el >= 4)       { hk = 0; SHIP.hurtStart = 0; }
      else if (el < 0.2)  hk = el / 0.2;
      else if (el < 3)    hk = 1;
      else                hk = 1 - (el - 3);
    }
    var NRM = [255, 77, 143], HRT = [255, 110, 115];
    var crgb = [
      Math.round(NRM[0] + (HRT[0] - NRM[0]) * hk),
      Math.round(NRM[1] + (HRT[1] - NRM[1]) * hk),
      Math.round(NRM[2] + (HRT[2] - NRM[2]) * hk)
    ];
    var sz = SHIP.SZ, col = 'rgb(' + crgb[0] + ',' + crgb[1] + ',' + crgb[2] + ')';
    if (hk > 0 && Math.random() < 0.35 + hk * 0.4) {
      var sdx = Math.cos(SHIP.angle), sdy = Math.sin(SHIP.angle);
      var rearX = SHIP.x - sdx * sz * 0.7, rearY = SHIP.y - sdy * sz * 0.7;
      var spread = (Math.random() - 0.5) * sz * 0.5;
      var nv = 5 + Math.floor(Math.random() * 2);
      var verts = [];
      for (var vk = 0; vk < nv; vk++) {
        verts.push({ a: (vk / nv) * Math.PI * 2, j: 0.78 + Math.random() * 0.34 });
      }
      shipSmoke.push({
        x: rearX - sdy * spread, y: rearY + sdx * spread,
        vx: -sdx * (0.35 + Math.random() * 0.4) + (Math.random() - 0.5) * 0.35,
        vy: -sdy * (0.35 + Math.random() * 0.4) + (Math.random() - 0.5) * 0.35,
        r: 2 + Math.random() * 2,
        grow: 0.3 + Math.random() * 0.35,
        rot: Math.random() * Math.PI * 2,
        rotV: (Math.random() - 0.5) * 0.05,
        alpha: (0.16 + Math.random() * 0.10) * (0.5 + hk * 0.5),
        decay: 0.006 + Math.random() * 0.005,
        verts: verts
      });
    }
    ctx.lineJoin = 'round';
    ctx.strokeStyle = 'rgba(168,180,202,1)';
    ctx.shadowColor = 'rgba(168,180,202,0.6)';
    for (var si = shipSmoke.length - 1; si >= 0; si--) {
      var sm = shipSmoke[si];
      sm.x += sm.vx; sm.y += sm.vy;
      sm.vx *= 0.95; sm.vy *= 0.95;
      sm.r += sm.grow;
      sm.rot += sm.rotV;
      sm.alpha -= sm.decay;
      if (sm.alpha <= 0) { shipSmoke.splice(si, 1); continue; }
      ctx.globalAlpha = sm.alpha;
      ctx.lineWidth = 1;
      ctx.shadowBlur = 4;
      ctx.beginPath();
      for (var vp = 0; vp < sm.verts.length; vp++) {
        var va = sm.verts[vp].a + sm.rot, rr2 = sm.r * sm.verts[vp].j;
        var px = sm.x + Math.cos(va) * rr2, py = sm.y + Math.sin(va) * rr2;
        if (vp === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;
    ctx.save();
    ctx.translate(SHIP.x, SHIP.y);
    ctx.rotate(SHIP.angle + Math.PI / 2);
    var trailLen = Math.min(spd * 9, 175) + hk * 70;
    var trailW   = 2.0 + hk * 2.4;
    var lx = -sz * 0.58, ly = sz * 0.38, rx = sz * 0.58, ry = sz * 0.38;
    ctx.shadowColor = col; ctx.shadowBlur = 10 + hk * 14;
    shipTrail(lx, ly, lx - trailLen * 0.17, ly + trailLen, trailW, crgb);
    shipTrail(rx, ry, rx + trailLen * 0.17, ry + trailLen, trailW, crgb);
    ctx.shadowColor = col; ctx.shadowBlur = 20; ctx.fillStyle = col;
    ctx.beginPath();
    ctx.moveTo( 0,         -sz);
    ctx.lineTo( sz * 0.50,  sz * 0.05);
    ctx.lineTo( sz * 0.72,  sz * 0.55);
    ctx.lineTo( sz * 0.28,  sz * 0.38);
    ctx.lineTo( sz * 0.18,  sz * 0.72);
    ctx.lineTo(-sz * 0.18,  sz * 0.72);
    ctx.lineTo(-sz * 0.28,  sz * 0.38);
    ctx.lineTo(-sz * 0.72,  sz * 0.55);
    ctx.lineTo(-sz * 0.50,  sz * 0.05);
    ctx.closePath(); ctx.fill();
    ctx.shadowBlur = 5; ctx.fillStyle = 'rgba(255,170,210,0.55)';
    ctx.beginPath();
    ctx.moveTo( 0,         -sz * 0.42);
    ctx.lineTo( sz * 0.22,  sz * 0.08);
    ctx.lineTo( 0,          sz * 0.32);
    ctx.lineTo(-sz * 0.22,  sz * 0.08);
    ctx.closePath(); ctx.fill();
    ctx.restore();
    ctx.shadowBlur = 0;
  }
  function hex2rgb(hex) {
    return [parseInt(hex.slice(1,3),16), parseInt(hex.slice(3,5),16), parseInt(hex.slice(5,7),16)];
  }
  function drawRings(px, py, r, rings, back) {
    var rgb = hex2rgb(rings.col);
    for (var i = 0; i < rings.count; i++) {
      var rr   = r * (1.40 + i * rings.gap);
      var lw   = Math.max(1, r * 0.09 * (1 - i * 0.07));
      var alph = rings.alpha * (1 - i * 0.10);
      ctx.beginPath();
      ctx.ellipse(px, py, rr, rr * rings.tiltY, (rings.rot || 0) * Math.PI / 180,
        back ? 0 : Math.PI,
        back ? Math.PI : Math.PI * 2);
      ctx.strokeStyle = 'rgba('+rgb[0]+','+rgb[1]+','+rgb[2]+','+alph+')';
      ctx.lineWidth   = lw;
      ctx.stroke();
    }
  }
  function drawPlanet(pd) {
    var px  = pd.xp * W;
    var py  = pd.yp * H - scrollY * pd.pf;
    var r   = pd.r;
    if (py < -r*5 || py > H+r*5) return;
    var r1 = hex2rgb(pd.col1);
    var r2 = hex2rgb(pd.col2);
    var r3 = hex2rgb(pd.col3);
    var ra = hex2rgb(pd.atmo);
    if (pd.rings) drawRings(px, py, r, pd.rings, true);
    var gGlow = ctx.createRadialGradient(px,py,r*0.75,px,py,r*(1+pd.glowMul));
    gGlow.addColorStop(0,   'rgba('+ra[0]+','+ra[1]+','+ra[2]+',0.22)');
    gGlow.addColorStop(0.5, 'rgba('+ra[0]+','+ra[1]+','+ra[2]+',0.10)');
    gGlow.addColorStop(1,   'rgba('+ra[0]+','+ra[1]+','+ra[2]+',0)');
    ctx.fillStyle = gGlow;
    ctx.beginPath(); ctx.arc(px,py,r*(1+pd.glowMul),0,Math.PI*2); ctx.fill();
    var gBody = ctx.createRadialGradient(px-r*0.28,py-r*0.22,r*0.05,px,py,r);
    gBody.addColorStop(0,    'rgb('+r1[0]+','+r1[1]+','+r1[2]+')');
    gBody.addColorStop(0.55, 'rgb('+r2[0]+','+r2[1]+','+r2[2]+')');
    gBody.addColorStop(1,    'rgb('+Math.max(0,r2[0]-25)+','+Math.max(0,r2[1]-25)+','+Math.max(0,r2[2]-25)+')');
    ctx.fillStyle = gBody;
    ctx.beginPath(); ctx.arc(px,py,r,0,Math.PI*2); ctx.fill();
    if (pd.type === 'ice' || pd.type === 'gas') {
      ctx.save();
      ctx.beginPath(); ctx.arc(px,py,r,0,Math.PI*2); ctx.clip();
      var bCount = pd.type === 'gas' ? 6 : 4;
      var bH     = r * 0.16;
      var bScroll = (t * 0.25) % (r * 2 / bCount);
      for (var b = 0; b < bCount+1; b++) {
        var by = py - r + b*(r*2/bCount) - bScroll;
        ctx.fillStyle = 'rgba('+r3[0]+','+r3[1]+','+r3[2]+',0.11)';
        ctx.fillRect(px-r, by, r*2, bH);
      }
      ctx.restore();
    }
    var gAtmo = ctx.createRadialGradient(px,py,r*0.82,px,py,r*1.10);
    gAtmo.addColorStop(0,    'rgba('+ra[0]+','+ra[1]+','+ra[2]+',0)');
    gAtmo.addColorStop(0.55, 'rgba('+ra[0]+','+ra[1]+','+ra[2]+',0.20)');
    gAtmo.addColorStop(1,    'rgba('+ra[0]+','+ra[1]+','+ra[2]+',0)');
    ctx.fillStyle = gAtmo;
    ctx.beginPath(); ctx.arc(px,py,r*1.10,0,Math.PI*2); ctx.fill();
    ctx.save();
    ctx.beginPath(); ctx.arc(px,py,r,0,Math.PI*2); ctx.clip();
    var gShad = ctx.createRadialGradient(px+r*0.42,py+r*0.32,0,px+r*0.30,py+r*0.22,r*1.05);
    gShad.addColorStop(0,    'rgba(0,0,6,0.75)');
    gShad.addColorStop(0.50, 'rgba(0,0,6,0.18)');
    gShad.addColorStop(1,    'rgba(0,0,6,0)');
    ctx.fillStyle = gShad;
    ctx.fillRect(px-r,py-r,r*2,r*2);
    ctx.restore();
    if (pd.haze) {
      var hz = hex2rgb(pd.haze);
      var gHaze = ctx.createRadialGradient(px, py, r*0.55, px, py, r*1.85);
      gHaze.addColorStop(0,    'rgba('+hz[0]+','+hz[1]+','+hz[2]+',0.12)');
      gHaze.addColorStop(0.55, 'rgba('+hz[0]+','+hz[1]+','+hz[2]+',0.05)');
      gHaze.addColorStop(1,    'rgba('+hz[0]+','+hz[1]+','+hz[2]+',0)');
      ctx.fillStyle = gHaze;
      ctx.beginPath(); ctx.arc(px, py, r*1.85, 0, Math.PI*2); ctx.fill();
    }
    if (pd.rings) drawRings(px, py, r, pd.rings, false);
  }
  var SS_MIN  = 8;
  var SS_VAR  = 14;
  var SS_AVOID_R   = 220;
  var SS_AVOID_VAR = 180;
  var shootingStars = [];
  var ssNext   = 10 + Math.random() * 8;
  var ssLast   = null;
  var ssTime   = 0;
  function ssSpawn() {
    var angle = Math.random() * Math.PI * 2;
    if (ssLast !== null && Math.abs(angle - ssLast) < 0.8) angle += 1.1;
    ssLast = angle;
    var speed = 500 + Math.random() * 300;
    var vx = Math.cos(angle) * speed / 60;
    var vy = Math.sin(angle) * speed / 60;
    var ox = -Math.cos(angle);
    var oy = -Math.sin(angle);
    var px = -Math.sin(angle);
    var py =  Math.cos(angle);
    var sign = Math.random() < 0.5 ? -1 : 1;
    var off  = sign * (SS_AVOID_R + Math.random() * SS_AVOID_VAR);
    shootingStars.push({
      x: W/2 + ox*(W/2+100) + px*off,
      y: H/2 + oy*(H/2+100) + py*off,
      vx: vx, vy: vy,
      trailLen: 30 + Math.random() * 40,
      color:    Math.random() < 0.6 ? '#ffffff' : '#cce0ff',
      alpha: 0.7, life: 1,
    });
  }
  function ssUpdate() {
    ssTime = t / 60;
    if (ssTime >= ssNext) { ssSpawn(); ssNext = ssTime + SS_MIN + Math.random() * SS_VAR; }
    for (var i = 0; i < shootingStars.length; i++) {
      var s = shootingStars[i];
      s.x += s.vx; s.y += s.vy;
      s.life *= 0.985;
      s.alpha = s.life * 0.7;
    }
    shootingStars = shootingStars.filter(function(s) {
      return s.x > -150 && s.x < W+150 && s.y > -150 && s.y < H+150 && s.life >= 0.03;
    });
  }
  function ssRender() {
    ctx.save();
    for (var i = 0; i < shootingStars.length; i++) {
      var s  = shootingStars[i];
      var tx = s.x - s.vx * s.trailLen;
      var ty = s.y - s.vy * s.trailLen;
      var rgb = s.color === '#ffffff' ? '255,255,255' : '204,224,255';
      var grad = ctx.createLinearGradient(s.x, s.y, tx, ty);
      grad.addColorStop(0, 'rgba('+rgb+','+s.alpha+')');
      grad.addColorStop(1, 'rgba('+rgb+',0)');
      ctx.globalAlpha = 1;
      ctx.strokeStyle = grad;
      ctx.shadowBlur  = 3;
      ctx.shadowColor = s.color;
      ctx.lineWidth   = 0.8;
      ctx.beginPath(); ctx.moveTo(s.x,s.y); ctx.lineTo(tx,ty); ctx.stroke();
      ctx.globalAlpha = s.alpha;
      ctx.fillStyle   = s.color;
      ctx.shadowBlur  = 0;
      ctx.beginPath(); ctx.arc(s.x,s.y,0.8,0,Math.PI*2); ctx.fill();
    }
    ctx.restore();
  }
  var stars = [];
  function initStars() {
    stars = [];
    var n = Math.min(220, Math.floor(W * H / 5500));
    if (LITE) n = Math.min(70, n);
    for (var i = 0; i < n; i++) {
      stars.push({
        x: Math.random()*W, y: Math.random()*H,
        r: Math.random()*1.2+0.2,
        a: Math.random()*0.7+0.15,
        spd: Math.random()*0.015+0.004,
        ph: Math.random()*Math.PI*2,
        pf: Math.random()*0.009+0.002,
        col: null,
      });
    }
    var hues = [310,275,185,255,200];
    for (var j = 0; j < (LITE ? 0 : 20); j++) {
      stars.push({
        x: Math.random()*W, y: Math.random()*H,
        r: Math.random()*2.2+0.8,
        a: Math.random()*0.25+0.06,
        spd: Math.random()*0.008+0.002,
        ph: Math.random()*Math.PI*2,
        pf: Math.random()*0.007+0.002,
        col: hues[Math.floor(Math.random()*hues.length)],
      });
    }
  }
  var _lastDraw = 0;
  function draw(now) {
    requestAnimationFrame(draw);
    if (typeof document !== 'undefined' && document.hidden) return;
    perfTick(now);
    if (LITE && now && (now - _lastDraw) < 33) return;
    _lastDraw = now || 0;
    ctx.clearRect(0, 0, W, H);
    nebulae.forEach(function(neb) {
      var def = neb.def;
      var cx  = def.xp * W;
      var cy  = def.yp * H - scrollY * def.pf;
      neb.puffs.forEach(function(puff) {
        var pr = puff.r;
        ctx.save();
        ctx.translate(cx+puff.ox, cy+puff.oy);
        ctx.rotate(neb.angle + puff.ox * 0.0024);
        ctx.scale(SCALE_X, SCALE_Y);
        var a = def.alpha * puff.alphaMul;
        var g = puff._grad;
        if (!g) {
          g = ctx.createRadialGradient(0,0,0,0,0,pr);
          g.addColorStop(0,   'hsla('+def.hue+',85%,55%,'+a+')');
          g.addColorStop(0.4, 'hsla('+(def.hue+15)+',80%,45%,'+(a*0.5)+')');
          g.addColorStop(1,   'hsla('+def.hue+',80%,40%,0)');
          puff._grad = g;
        }
        ctx.fillStyle = g;
        ctx.fillRect(-pr,-pr,pr*2,pr*2);
        ctx.restore();
      });
    });
    stars.forEach(function(s) {
      var twinkle = Math.sin(t * s.spd * 13 + s.ph);
      var alpha   = s.a * (0.6 + 0.4 * twinkle);
      var py      = s.y - scrollY * s.pf;
      py = ((py % (H+10)) + H+10) % (H+10);
      if (s.col !== null) {
        ctx.shadowBlur  = 7;
        ctx.shadowColor = 'hsl('+s.col+',90%,70%)';
        ctx.fillStyle   = 'hsla('+s.col+',90%,80%,'+alpha+')';
      } else {
        ctx.shadowBlur = 0;
        ctx.fillStyle  = 'rgba(255,255,255,'+alpha+')';
      }
      ctx.beginPath(); ctx.arc(s.x, py, s.r, 0, Math.PI*2); ctx.fill();
    });
    ctx.shadowBlur = 0;
    if (!LITE) { ssUpdate(); ssRender(); }
    PLANET_DEFS.forEach(drawPlanet);
    if (_planetFxReg && window.GALAXTARUS && GALAXTARUS.Planet) {
      var _pt = t / 60;
      for (var _pi = 0; _pi < CFG_PLANETS.length; _pi++) {
        var _pp = CFG_PLANETS[_pi];
        if (!_pp._scfg) {
          var _s = _pp.scale || 1, _src = _pp.cfg, _sc = {};
          for (var _k in _src) _sc[_k] = _src[_k];
          _sc.rThick = (parseFloat(_src.rThick) || 0) * _s;
          _sc.rGap   = (parseFloat(_src.rGap)   || 0) * _s;
          _sc.pGlow  = (parseFloat(_src.pGlow)  || 0) * _s;
          _pp._scfg = _sc;
          _pp._R    = (parseFloat(_src.pRadius) || 60) * _s;
          var _rc = parseInt(_sc.rCount, 10) || 0;
          _pp._hs = Math.ceil(_pp._R + _rc * ((parseFloat(_sc.rThick) || 0) + (parseFloat(_sc.rGap) || 0)) + 60);
          _pp._cv = document.createElement('canvas');
          _pp._cv.width = _pp._cv.height = _pp._hs * 2;
          _pp._cctx = _pp._cv.getContext('2d');
          _pp._cf = 0;
        }
        var _psx = _pp.xp * W;
        var _psy = _pp.yp * H - scrollY * _pp.pf;
        if (_psy < -_pp._hs || _psy > H + _pp._hs) continue;
        if (_pp._cf <= 0) {
          _pp._cctx.clearRect(0, 0, _pp._cv.width, _pp._cv.height);
          GALAXTARUS.Planet._renderBody(_pp._cctx, _pp._scfg, _pp._hs, _pp._hs, _pp._R, _pt, _planetFxReg);
          _pp._cf = 10;
        }
        _pp._cf--;
        var _ga = hex2rgb(_pp.glow || _pp.cfg.pAtmo || '#80c0ff');
        var _gr = _pp._R * 3.4;
        var _gp = 0.22 + 0.13 * Math.sin(_pt * 1.1 + _pi * 2.1);
        var _gg = ctx.createRadialGradient(_psx, _psy, _pp._R * 0.55, _psx, _psy, _gr);
        _gg.addColorStop(0,   'rgba(' + _ga[0] + ',' + _ga[1] + ',' + _ga[2] + ',' + _gp.toFixed(3) + ')');
        _gg.addColorStop(0.5, 'rgba(' + _ga[0] + ',' + _ga[1] + ',' + _ga[2] + ',' + (_gp * 0.35).toFixed(3) + ')');
        _gg.addColorStop(1,   'rgba(' + _ga[0] + ',' + _ga[1] + ',' + _ga[2] + ',0)');
        ctx.fillStyle = _gg;
        ctx.beginPath(); ctx.arc(_psx, _psy, _gr, 0, Math.PI * 2); ctx.fill();
        ctx.drawImage(_pp._cv, _psx - _pp._hs, _psy - _pp._hs);
      }
    }
    updateAndDrawAsteroids();
    updateAndDrawShip();
    updateAndDrawFragments();
    updateAndDrawExplosions();
    t += 1;
  }
  function resize() {
    W = canvas.width  = window.innerWidth;
    H = canvas.height = window.innerHeight;
  }
  document.addEventListener('click', function (e) {
    if (e.target.closest && e.target.closest(
      'a, button, input, label, select, textarea, [data-notify], #notify-trigger, ' +
      '.nav-burger, .pager-dot, .social-link, .los-bot, .lang-toggle')) return;
    var cx = e.clientX, cy = e.clientY;
    for (var i = 0; i < asteroids.length; i++) {
      var a = asteroids[i];
      var dx = cx - a.x, dy = cy - a.y;
      if (Math.sqrt(dx * dx + dy * dy) <= a.def.r + 10) {
        spawnExplosion(a.x, a.y, a.def.r, a.color);
        playExplosionSound(a.x, a.def.r);
        if (a.def.r >= 48) spawnFragments(a);
        spawnBelow(a, false);
        break;
      }
    }
  }, { passive: true });
  window.addEventListener('scroll', function() { scrollY = window.pageYOffset || window.scrollY; }, {passive:true});
  document.addEventListener('mousemove', function(e) { mouseX = e.clientX; mouseY = e.clientY; }, {passive:true});
  window.addEventListener('resize', function() { computeLite(); resize(); initStars(); initNebulae(); initAsteroids(); shipReset(); }, {passive:true});
  resize();
  initNebulae();
  initStars();
  initAsteroids();
  shipReset();
  draw();
})();
// nebula.js — background canvas for LANDING2.
//
// Nébuleuses : style identique à src/entities/Nebula.js —
//   9 puffs par nébuleuse, SCALE_X 2.8 (large), SCALE_Y 0.35 (plate),
//   placement déterministe via mulberry32.
//
// Planètes : Pyroth Prime (ice, anneaux) + Nova Mundi (rocky, halo magenta),
//   données directement issues de galaxtarus_planets.js, rendus simplifiés.
//
// Étoiles filantes : port fidèle de src/core/ShootingStarSystem.js.

(function () {
  'use strict';

  var canvas = document.getElementById('nebula-bg');
  if (!canvas) return;
  var ctx = canvas.getContext('2d');

  var W, H, scrollY = 0, t = 0;
  var mouseX = -9999, mouseY = -9999;

  // Mode "léger" sur petit écran (≤820px) : moins d'éléments dessinés + ~30 fps
  // au lieu de 60 → environ moitié de la charge GPU, donc batterie ménagée sur
  // téléphone. Sur desktop, LITE reste faux : aucun changement.
  var LITE = false, forcedLite = false;
  function computeLite() {
    LITE = forcedLite || !!(window.matchMedia && window.matchMedia('(max-width: 820px)').matches);
  }
  computeLite();

  // ── Gouverneur de performance AUTOMATIQUE ─────────────────────────────────
  // Mesure le vrai FPS après le boot. Si la machine peine (< 38 fps soutenu),
  // bascule toute seule en mode léger (moins d'éléments, 30 fps, et coupe le
  // grain + le flou via la classe .perf-lite). Aucun clic requis. Ne se
  // déclenche jamais si on est déjà en mode léger (mobile).
  var T_START = 0, perfLast = 0, perfAcc = 0, perfFrames = 0, perfLow = 0, perfDone = false;
  function degrade() {
    if (forcedLite) return;
    forcedLite = true; computeLite();
    // On NE ré-initialise PLUS étoiles/astéroïdes : ça provoquait un "reset" visible
    // (toute la scène disparaissait puis réapparaissait, surtout si on scrollait
    // tôt après le chargement). Le mode léger seul — throttle 30 fps + CSS
    // .perf-lite (coupe grain/flou) + planètes en cache — soulage sans vider rien.
    document.documentElement.classList.add('perf-lite');   // CSS : coupe grain + backdrop-filter
  }
  function perfTick(now) {
    if (perfDone || LITE || !now) return;
    if (!T_START) { T_START = now; perfLast = now; return; }
    if (now - T_START < 6000) { perfLast = now; return; }  // chauffe plus longue : on ignore le pic de chargement/scroll initial
    var dt = now - perfLast; perfLast = now;
    if (dt <= 0 || dt > 500) return;                       // ignore onglet en arrière-plan
    perfAcc += dt; perfFrames++;
    if (perfAcc >= 1500) {                                 // fenêtre de ~1,5 s
      var fps = perfFrames * 1000 / perfAcc;
      perfAcc = 0; perfFrames = 0;
      // Dégrade SEULEMENT si le FPS est bas de façon vraiment SOUTENUE (3 fenêtres
      // consécutives ≈ 4,5 s), pas sur un pic transitoire (scroll, 1er paint…).
      if (fps < 36) { if (++perfLow >= 3) { perfDone = true; degrade(); } }
      else perfLow = 0;
      if (now - T_START > 16000) perfDone = true;          // au-delà de 16 s : on arrête de surveiller
    }
  }

  // RNG — mulberry32 (identique à Nebula.js du moteur)
  function hashSeed(str) {
    var h = 2166136261;
    for (var i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h  = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }
  function mulberry32(seed) {
    var a = seed;
    return function () {
      a = (a + 0x6D2B79F5) | 0;
      var v = a;
      v  = Math.imul(v ^ (v >>> 15), v | 1);
      v ^= v + Math.imul(v ^ (v >>> 7), v | 61);
      return ((v ^ (v >>> 14)) >>> 0) / 4294967296;
    };
  }

  // NEBULEUSES
  var PUFF_COUNT = 9;
  var SCALE_X    = 2.8;
  var SCALE_Y    = 0.35;

  // Réglages repris du legacy (galaxtarus_legacy/galaxtarus.html) : 5 nébuleuses,
  // palette bleu / indigo / violet / magenta (teintes 238/292/258/312/222), une
  // grosse au centre, puffs plus larges, alpha ~0.10. Positions transposées du
  // monde legacy vers des fractions du viewport.
  var NEBULA_DEFS = [
    { name: 'neb-a', xp: 0.22, yp: 0.20, hue: 238, alpha: 0.10, radius: 150, pf: 0.05 },
    { name: 'neb-b', xp: 0.85, yp: 0.24, hue: 292, alpha: 0.10, radius: 160, pf: 0.06 },
    { name: 'neb-c', xp: 0.12, yp: 0.78, hue: 258, alpha: 0.10, radius: 145, pf: 0.04 },
    { name: 'neb-d', xp: 0.82, yp: 0.74, hue: 312, alpha: 0.10, radius: 150, pf: 0.05 },
    { name: 'neb-e', xp: 0.50, yp: 0.50, hue: 222, alpha: 0.09, radius: 195, pf: 0.03 },
  ];

  var nebulae = [];
  function initNebulae() {
    nebulae = NEBULA_DEFS.map(function (def) {
      var rng   = mulberry32(hashSeed(def.name));
      var puffs = [];
      for (var i = 0; i < PUFF_COUNT; i++) {
        puffs.push({
          ox:       (rng() - 0.5) * def.radius * 1.4,
          oy:       (rng() - 0.5) * def.radius * 1.4,
          r:        def.radius * (0.55 + rng() * 0.80),
          alphaMul: 0.5 + rng() * 0.5,
          aOff:     rng() * 0.0002,
        });
      }
      return { def: def, angle: rng() * Math.PI, puffs: puffs };
    });
  }

  // PLANETES
  // Une seule planète conservée : Nova Mundi, à gauche.
  // (Pyroth Prime haut-droite et Vael Tor bas-droite retirées.)
  var PLANET_DEFS = [
    {
      // Planète d'accent (haut-droite) — violet/améthyste lumineux, halo magenta,
      // anneaux cyan : s'harmonise avec les nébuleuses violettes du fond.
      name: 'Veloth Zul',
      xp: 0.87, yp: 0.22, r: 92, pf: 0.03,
      col1: '#b98cff', col2: '#4a2f8c', col3: '#241540',
      atmo: '#e066ff', glowMul: 0.46, type: 'rocky',
      rings: { col: '#4dd9ff', alpha: 0.55, tiltY: 0.16, gap: 0.15, count: 5, rot: 35 },
    },
  ];

  // ── Planètes rendues par le VRAI moteur du jeu (Planet._renderBody), depuis
  //    leur cfg EXACTE exportée par l'éditeur. Anneaux cristal/débris inclus via
  //    le registry de FX. (Veloth Zul ci-dessus reste sur le rendu simplifié.)
  var SOLUM_CFG = {"pType":"rocky","pRadius":47,"pCol1":"#d3ed86","pCol2":"#f58f61","pCol3":"#7910a6","pAtmo":"#326b2c","pBands":13,"pRot":14,"pClouds":1,"pGlow":6,"pTurb":9,"pStorm":5,"rCount":8,"rThick":28,"rGap":15,"rTilt":70,"rCol":"#d97150","rAlpha":87,"rRot":3,"rType":"crystal","mCount":0,"mSize":18,"mDist":163,"mSpeed":12,"mCol":"#cec0a9","mOrbit":0,"mTilt":26,"sDens":66,"nebula":3,"nebCol":"#41b568","bgCol":"#050b18","meteors":3,"dust":3,"name":"Solum Ignis"};
  var PYROTH_CFG = {"pType":"rocky","pRadius":97,"pCol1":"#b27dc8","pCol2":"#f117c2","pCol3":"#688e1f","pAtmo":"#e69f72","pBands":18,"pRot":12,"pClouds":0,"pGlow":13,"pTurb":4,"pStorm":5,"rCount":8,"rThick":16,"rGap":20,"rTilt":66,"rCol":"#dfb9d7","rAlpha":84,"rRot":9,"rType":"debris","mCount":0,"mSize":18,"mDist":129,"mSpeed":18,"mCol":"#900527","mOrbit":9,"mTilt":40,"sDens":51,"nebula":2,"nebCol":"#0fcde6","bgCol":"#050b18","meteors":1,"dust":5,"name":"Pyroth Thar"};
  // xp,yp = position en fraction du viewport ; scale = facteur d'échelle uniforme
  // (corps + anneaux gardent les proportions de l'éditeur) ; pf = parallaxe.
  var CFG_PLANETS = [
    { cfg: SOLUM_CFG,  xp: 0.06, yp: 0.64, scale: 1.05, pf: 0.034, glow: '#84d56a' },
    { cfg: PYROTH_CFG, xp: 0.92, yp: 0.90, scale: 0.85, pf: 0.030, glow: '#ffb98f' },
  ];
  // Registry de FX (anneaux cristal/débris, lunes…), créé une fois si le moteur
  // de planète est bien chargé. Sinon on saute proprement le rendu cfg.
  var _planetFxReg = null;
  try {
    var _PG = window.GALAXTARUS;
    if (_PG && _PG.entities && _PG.entities.planet_fx && _PG.assets &&
        typeof _PG.assets.populateGalaxtarusPlanetFx === 'function') {
      _planetFxReg = new _PG.entities.planet_fx.PlanetFxRegistry();
      _PG.assets.populateGalaxtarusPlanetFx(_planetFxReg);
    }
  } catch (e) { _planetFxReg = null; }

  // ASTEROIDES — port de Asteroid._defaultRenderBody (src/entities/Asteroid.js)
  // Palette identique au jeu : cristal bleu
  var AST_COLORS = ['#1a6fa8', '#0d9ecc', '#14c4b0', '#0e7acc', '#1890b8'];

  // 3 bandes de profondeur (parallaxe par taille + vitesse de dérive) :
  //   loin  = petits, très nombreux, lents
  //   moyen = intermédiaires
  //   proche = gros, rares, rapides (dessinés en dernier → devant)
  function buildAstDefs() {
    var bands = LITE
      ? [ { n: 6, rMin: 8,  rMax: 18, sMin: 0.15, sMax: 0.35 },
          { n: 3, rMin: 22, rMax: 40, sMin: 0.45, sMax: 0.85 },
          { n: 1, rMin: 55, rMax: 90, sMin: 1.0,  sMax: 1.7  } ]
      : [ { n: 18, rMin: 8,  rMax: 18, sMin: 0.15, sMax: 0.35 },
          { n: 9,  rMin: 22, rMax: 44, sMin: 0.45, sMax: 0.90 },
          { n: 4,  rMin: 55, rMax: 95, sMin: 1.0,  sMax: 1.8  } ];
    var defs = [], id = 0;
    for (var b = 0; b < bands.length; b++) {
      var band = bands[b];
      for (var i = 0; i < band.n; i++) {
        defs.push({
          name:  'a' + (id++),
          r:     band.rMin + Math.random() * (band.rMax - band.rMin),
          speed: band.sMin + Math.random() * (band.sMax - band.sMin),
        });
      }
    }
    return defs;
  }

  var asteroids = [];

  function makePolygon(rng, radius, verts) {
    var pts  = [];
    var step = (Math.PI * 2) / verts;
    for (var i = 0; i < verts; i++) {
      var a = i * step + (rng() - 0.5) * step * 0.45;
      var r = radius * (0.70 + rng() * 0.58);
      pts.push([Math.cos(a) * r, Math.sin(a) * r]);
    }
    return pts;
  }

  // Place un astéroïde SOUS l'écran, prêt à remonter lentement.
  // Jamais positionné dans la zone visible → aucune apparition brutale (« pop »).
  // stagger=true au boot pour étaler les positions de départ sur une grande
  // bande sous l'écran ; false au recyclage (réapparition juste sous le bord).
  function spawnBelow(ast, stagger) {
    var r = ast.def.r;
    ast.x  = W * Math.random();
    ast.y  = H + r + 10 + (stagger ? Math.random() * H * 1.8 : Math.random() * 60);
    // vx/vy = impulsion transitoire (souffle d'explosion) qui s'atténue.
    // La remontée de base (-def.speed) est appliquée à part dans l'update,
    // donc TOUJOURS présente : aucun météore ne peut se figer en place.
    ast.vx = (Math.random() - 0.5) * 0.25;     // léger ballant horizontal initial
    ast.vy = 0;
  }

  function initAsteroids() {
    asteroids = buildAstDefs().map(function(def) {
      var rng   = mulberry32(hashSeed('ast|' + def.name));
      var verts = 6 + Math.floor(rng() * 4);
      var col   = AST_COLORS[Math.floor(rng() * AST_COLORS.length)];
      var lw    = 0.8 + rng() * 0.7;
      var ast = {
        def:     def,
        polygon: makePolygon(rng, def.r, verts),
        color:   col,
        lw:      lw,
        angle:   rng() * Math.PI * 2,
        rotSpd:  (rng() - 0.5) * 0.010,   // rotation lente sur elle-même
        x: 0, y: 0, vx: 0, vy: 0,
      };
      spawnBelow(ast, true);              // départ étalé sous l'écran
      return ast;
    });
  }

  function drawAsteroidBody(ast) {
    var poly = ast.polygon;
    var n    = poly.length;
    ctx.shadowColor = ast.color;
    ctx.lineJoin    = 'round';
    ctx.strokeStyle = ast.color;
    ctx.lineWidth   = ast.lw;
    ctx.beginPath();
    ctx.moveTo(poly[0][0], poly[0][1]);
    for (var j = 1; j < n; j++) ctx.lineTo(poly[j][0], poly[j][1]);
    ctx.closePath();
    ctx.fillStyle  = '#05050f';
    ctx.shadowBlur = 0;
    ctx.fill();
    ctx.shadowBlur = 5;
    ctx.stroke();
    // Lignes internes retirées : corps de météore = bleu très foncé uni,
    // seul le contour porte la couleur.
    ctx.globalAlpha = 1;
    ctx.shadowBlur  = 0;
  }

  // Collisions météore ↔ météore : O(n²) sur ~31 météores (négligeable).
  // Séparation positionnelle pour défaire le chevauchement + impulsion de rebond
  // le long de la normale. Masse ∝ surface (r²) → un gros bouscule un petit, pas
  // l'inverse. La vitesse effective inclut la dérive de base (les bandes rapides
  // rattrapent les lentes), mais l'impulsion ne modifie que vx/vy (canal souffle).
  function collideAsteroids() {
    var n = asteroids.length;
    for (var i = 0; i < n; i++) {
      var A = asteroids[i];
      for (var j = i + 1; j < n; j++) {
        var B = asteroids[j];
        var dx = B.x - A.x, dy = B.y - A.y;
        var rs = A.def.r + B.def.r;
        var d2 = dx * dx + dy * dy;
        if (d2 >= rs * rs || d2 < 0.0001) continue;
        var d  = Math.sqrt(d2);
        var nx = dx / d, ny = dy / d;
        var overlap = rs - d;
        var mA = A.def.r * A.def.r, mB = B.def.r * B.def.r;
        var imA = 1 / mA, imB = 1 / mB, invSum = 1 / (mA + mB);
        // Séparation positionnelle : le plus léger s'écarte le plus.
        A.x -= nx * overlap * (mB * invSum);
        A.y -= ny * overlap * (mB * invSum);
        B.x += nx * overlap * (mA * invSum);
        B.y += ny * overlap * (mA * invSum);
        // Vitesse relative le long de la normale (dérive de base incluse).
        var avy = A.vy - A.def.speed, bvy = B.vy - B.def.speed;
        var vn  = (B.vx - A.vx) * nx + (bvy - avy) * ny;
        if (vn < 0) {                       // ils se rapprochent → rebond
          var e = 0.55;                     // restitution (rebond doux)
          var jimp = -(1 + e) * vn / (imA + imB);
          A.vx -= jimp * imA * nx; A.vy -= jimp * imA * ny;
          B.vx += jimp * imB * nx; B.vy += jimp * imB * ny;
        } else {                            // déjà imbriqués sans approche → léger écart
          var sep = overlap * 0.05;
          A.vx -= nx * sep; A.vy -= ny * sep;
          B.vx += nx * sep; B.vy += ny * sep;
        }
      }
    }
  }

  function updateAndDrawAsteroids() {
    // ── Mise à jour : dérive lente vers le haut ───────────────────────────
    asteroids.forEach(function(ast) {
      // Position = impulsion (vx/vy) + dérive de base toujours vers le haut.
      ast.x     += ast.vx;
      ast.y     += ast.vy - ast.def.speed;
      ast.vx    *= 0.96;            // l'impulsion du souffle s'estompe…
      ast.vy    *= 0.96;            // …et le météore retrouve sa montée régulière
      ast.angle += ast.rotSpd;

      // Recyclage : sortie par le haut (dérive normale) OU éjecté par un souffle
      // hors de n'importe quel bord → réapparition sous l'écran.
      var _m = ast.def.r + 90;
      // Bas : seuil juste sous la zone de réapparition (spawnBelow ≤ H+r+70), pour
      // qu'un météore réapparu ne soit pas recyclé en boucle. Réapparition proche
      // du bord → le champ se repeuple vite après une explosion (plus de "tout
      // disparaît").
      var _mBottom = ast.def.r + 90;
      if (!isFinite(ast.x) || !isFinite(ast.y) ||
          ast.y < -_m || ast.y > H + _mBottom || ast.x < -_m || ast.x > W + _m) spawnBelow(ast, false);
    });

    collideAsteroids();   // ── rebonds météore ↔ météore ──

    // ── Rendu (repère écran, canvas fixe) ─────────────────────────────────
    asteroids.forEach(function(ast) {
      var sy = ast.y;
      if (sy < -(ast.def.r*3) || sy > H+(ast.def.r*3)) return;
      ctx.save();
      ctx.translate(ast.x, sy);
      ctx.rotate(ast.angle);
      drawAsteroidBody(ast);
      ctx.restore();
    });
  }

  // ── EXPLOSIONS BLANCHES (clic sur un météore) ─────────────────────────────
  // Port de Explosion.render du moteur (src/entities/Explosion.js) en BLANC :
  // anneau externe faible + 22 lignes radiales + anneau principal qui s'étend
  // puis s'estompe. Déclenchée au clic sur un astéroïde.
  var explosions = [];
  function spawnExplosion(x, y, r, color) {
    var lines = [];
    for (var i = 0; i < 22; i++) {
      lines.push({
        angle:     (i / 22) * Math.PI * 2 + (Math.random() - 0.5) * 0.2,
        lenFactor: 0.25 + Math.random() * 0.35,
      });
    }
    explosions.push({ x: x, y: y, radius: 8, maxRadius: 55 + r * 3, alpha: 1, color: color || '#ffffff', lines: lines });
  }
  function updateAndDrawExplosions() {
    for (var k = explosions.length - 1; k >= 0; k--) {
      var e = explosions[k];
      e.radius += 14;                                   // vitesse d'expansion
      var progress = e.radius / e.maxRadius;
      if (progress > 0.65) e.alpha = 1 - (progress - 0.65) / 0.35;   // fondu sur les 35 % finaux
      if (e.radius >= e.maxRadius) { explosions.splice(k, 1); continue; }

      // Expulse les météores dans le rayon courant (une seule fois chacun).
      // Aucun n'explose ici : seul le météore cliqué explose. Tous les autres,
      // quelle que soit leur taille, sont projetés à l'opposé du centre.
      if (!e.affected) e.affected = [];
      for (var ai = 0; ai < asteroids.length; ai++) {
        var a = asteroids[ai];
        if (e.affected.indexOf(a) !== -1) continue;
        var adx = a.x - e.x, ady = a.y - e.y;
        var ad = Math.sqrt(adx * adx + ady * ady) || 1;
        if (ad > e.radius) continue;
        e.affected.push(a);
        // Tous les météores de la zone sont EXPULSÉS, peu importe leur taille :
        // forte poussée à l'opposé du centre. Aucun n'explose ici — seul le
        // météore cliqué explose (géré au clic).
        var pf = (5 + Math.random() * 3) * e.alpha;
        a.vx += (adx / ad) * pf;
        a.vy += (ady / ad) * pf;
      }

      // Les éclats déjà présents dans la zone sont eux aussi expulsés (une fois).
      if (!e.fragHit) e.fragHit = [];
      for (var fi = 0; fi < fragments.length; fi++) {
        var fg = fragments[fi];
        if (e.fragHit.indexOf(fg) !== -1) continue;
        var fdx = fg.x - e.x, fdy = fg.y - e.y;
        var fd = Math.sqrt(fdx * fdx + fdy * fdy) || 1;
        if (fd > e.radius) continue;
        e.fragHit.push(fg);
        var fpf = (7 + Math.random() * 4) * e.alpha;
        fg.vx += (fdx / fd) * fpf;
        fg.vy += (fdy / fd) * fpf;
      }

      var sr = e.radius, mr = e.maxRadius;
      ctx.save();
      // anneau externe (rayon max), couleur du météore, très faible
      ctx.globalAlpha = e.alpha * 0.15;
      ctx.beginPath(); ctx.arc(e.x, e.y, mr, 0, Math.PI * 2);
      ctx.strokeStyle = e.color; ctx.lineWidth = 1; ctx.stroke();
      // Cœur chaud : flash blanc qui s'estompe vite (premier ~45 % de vie).
      if (progress < 0.45) {
        ctx.globalAlpha = e.alpha * (1 - progress / 0.45);
        ctx.beginPath(); ctx.arc(e.x, e.y, sr * 0.85, 0, Math.PI * 2);
        ctx.fillStyle = '#5cb8ff'; ctx.shadowColor = '#5cb8ff'; ctx.shadowBlur = 20;
        ctx.fill();
      }
      // 22 lignes radiales (couleur du météore)
      for (var li = 0; li < e.lines.length; li++) {
        var line = e.lines[li];
        var inner = sr * 0.25, outer = sr * (1 + line.lenFactor);
        var cos = Math.cos(line.angle), sin = Math.sin(line.angle);
        ctx.globalAlpha = e.alpha * 0.55;
        ctx.beginPath();
        ctx.moveTo(e.x + cos * inner, e.y + sin * inner);
        ctx.lineTo(e.x + cos * outer, e.y + sin * outer);
        ctx.strokeStyle = e.color; ctx.shadowColor = e.color; ctx.shadowBlur = 6; ctx.lineWidth = 0.9;
        ctx.stroke();
      }
      // anneau principal en expansion
      ctx.globalAlpha = e.alpha;
      ctx.beginPath(); ctx.arc(e.x, e.y, sr, 0, Math.PI * 2);
      ctx.strokeStyle = e.color; ctx.shadowColor = e.color; ctx.shadowBlur = 22; ctx.lineWidth = 2;
      ctx.stroke();
      ctx.restore();
    }
    ctx.globalAlpha = 1; ctx.shadowBlur = 0;
  }

  // ── ÉCLATS DE GROS MÉTÉORES ───────────────────────────────────────────────
  // Port de AsteroidFragment du moteur : un gros météore cliqué éclate en
  // morceaux projetés très vite, qui dérivent (friction), tournent et s'estompent.
  var fragments = [], FRAG_MAX = 90;   // plafond mémoire des éclats
  function spawnFragments(ast) {
    var rng = mulberry32((Math.random() * 4294967296) >>> 0);
    var n = 5 + Math.floor(Math.random() * 3);          // 5 à 7 morceaux
    for (var i = 0; i < n; i++) {
      var ang = (i / n) * Math.PI * 2 + (Math.random() - 0.5) * 0.6;
      var spd = 4 + Math.random() * 5;                  // projetés très vite
      var fr  = ast.def.r * (0.22 + Math.random() * 0.22);
      fragments.push({
        x: ast.x, y: ast.y, r: fr,
        vx: Math.cos(ang) * spd, vy: Math.sin(ang) * spd,
        // dérive de base permanente (légère montée) : un éclat ne se fige jamais
        driftX: (Math.random() - 0.5) * 0.25,
        driftY: -(0.25 + Math.random() * 0.45),
        polygon: makePolygon(rng, fr, 4 + Math.floor(rng() * 3)),
        color: ast.color, lw: ast.lw,
        angle: Math.random() * Math.PI * 2, rotSpeed: (Math.random() - 0.5) * 0.3,
        alpha: 1,
      });
    }
    // Plafond mémoire : on garde au plus FRAG_MAX éclats (les plus anciens
    // partent en premier) → empêche toute accumulation sans fin.
    if (fragments.length > FRAG_MAX) fragments.splice(0, fragments.length - FRAG_MAX);
  }
  function updateAndDrawFragments() {
    for (var k = fragments.length - 1; k >= 0; k--) {
      var f = fragments[k];
      // Impulsion (souffle) qui s'atténue + dérive de base toujours active :
      // l'éclat continue de flotter même quand le souffle s'est dissipé.
      f.x += f.vx + f.driftX; f.y += f.vy + f.driftY;
      f.vx *= 0.985; f.vy *= 0.985;                     // l'impulsion du souffle s'estompe
      f.angle += f.rotSpeed;
      f.rotSpeed *= 0.96;                               // la rotation s'amortit
      // Optimisation : un éclat sorti de l'écran est retiré (il dérive vers le
      // haut et ne revient jamais) → borne la mémoire, invisible à l'écran.
      if (f.y < -60 || f.x < -90 || f.x > W + 90 || f.y > H + 90) { fragments.splice(k, 1); continue; }
      ctx.save();
      ctx.globalAlpha = f.alpha;
      ctx.translate(f.x, f.y);
      ctx.rotate(f.angle);
      ctx.lineJoin = 'round';
      ctx.strokeStyle = f.color; ctx.lineWidth = f.lw;
      ctx.beginPath();
      ctx.moveTo(f.polygon[0][0], f.polygon[0][1]);
      for (var j = 1; j < f.polygon.length; j++) ctx.lineTo(f.polygon[j][0], f.polygon[j][1]);
      ctx.closePath();
      ctx.fillStyle = '#05050f'; ctx.fill();
      // Éclats SOMBRES (presque noirs) : pas de bleu vif, juste un contour discret
      // pour les rendre visibles sur le fond.
      ctx.globalAlpha = f.alpha * 0.5;
      ctx.strokeStyle = f.color; ctx.lineWidth = f.lw;
      ctx.stroke();
      ctx.globalAlpha = f.alpha;
      ctx.restore();
    }
    ctx.globalAlpha = 1;
  }

  // ── SON D'EXPLOSION (synthèse Web Audio, panoramé selon la position X) ─────
  // Crack (bruit filtré) + boom (sinus grave). Le pan stéréo suit la position :
  // météore à gauche → son à gauche. Contexte audio créé/résumé au 1er clic.
  var _sfxCtx = null;
  function _sfxAudio() {
    if (_sfxCtx) return _sfxCtx;
    try {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (AC) _sfxCtx = new AC();
    } catch (e) { _sfxCtx = null; }
    return _sfxCtx;
  }
  function playExplosionSound(x, r) {
    var ac = _sfxAudio();
    if (!ac) return;
    if (ac.state === 'suspended' && ac.resume) ac.resume();
    var now = ac.currentTime;
    var pan = Math.max(-1, Math.min(1, (x / (W || 1)) * 2 - 1));
    // Volume selon la taille du météore (petit = plus discret) + petite variation naturelle.
    var vol = Math.max(0.25, Math.min(1, (r || 30) / 75)) * (0.9 + Math.random() * 0.2);

    var panner = ac.createStereoPanner ? ac.createStereoPanner() : null;
    if (panner) { panner.pan.value = pan; panner.connect(ac.destination); }
    var out = panner || ac.destination;

    // Crack : burst de bruit blanc à travers un passe-bas qui descend.
    var dur = 0.34;
    var buf = ac.createBuffer(1, Math.max(1, Math.floor(ac.sampleRate * dur)), ac.sampleRate);
    var d = buf.getChannelData(0);
    for (var i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    var noise = ac.createBufferSource(); noise.buffer = buf;
    var lp = ac.createBiquadFilter(); lp.type = 'lowpass';
    lp.frequency.setValueAtTime(2200, now);
    lp.frequency.exponentialRampToValueAtTime(180, now + dur);
    var ng = ac.createGain();
    ng.gain.setValueAtTime(0.0001, now);
    ng.gain.exponentialRampToValueAtTime(0.35 * vol, now + 0.008);
    ng.gain.exponentialRampToValueAtTime(0.0001, now + dur);
    noise.connect(lp); lp.connect(ng); ng.connect(out);
    noise.start(now); noise.stop(now + dur);

    // Boom : sinus grave qui chute.
    var osc = ac.createOscillator(); osc.type = 'sine';
    osc.frequency.setValueAtTime(110, now);
    osc.frequency.exponentialRampToValueAtTime(38, now + 0.25);
    var og = ac.createGain();
    og.gain.setValueAtTime(0.0001, now);
    og.gain.exponentialRampToValueAtTime(0.32 * vol, now + 0.015);
    og.gain.exponentialRampToValueAtTime(0.0001, now + 0.28);
    osc.connect(og); og.connect(out);
    osc.start(now); osc.stop(now + 0.3);
  }

  // ── NAVETTE GALAXTARUS ────────────────────────────────────────────────────
  // Port fidèle de drawShip/drawTrailLine du legacy (polygone exact, couleur
  // #ff4d8f, cockpit, deux jets). Ici elle ne joue pas : elle croise lentement
  // l'écran en diagonale, puis réapparaît (recyclage). Dessinée dans le fond,
  // donc derrière le contenu de la page.
  // Modèle à INERTIE (repris du legacy : ACCEL / FRICTION / vitesse max). La
  // navette accélère, garde son élan, plafonne, freine par friction — bien plus
  // rapide et nerveux qu'une vitesse constante.
  var SHIP = {
    x: 0, y: 0, vx: 0, vy: 0, angle: 0, wander: 0,
    SZ: 16, COLOR: '#ff4d8f',
    ACCEL: 0.7, FRICTION: 0.99, MAX: 12,
    hurtStart: 0   // timestamp (ms) du dernier accident, 0 = navette intacte
  };
  var shipSmoke = [];   // particules de fumée émises pendant un accident

  function shipReset() {
    SHIP.x = W * (0.3 + Math.random() * 0.4);
    SHIP.y = H * (0.3 + Math.random() * 0.4);
    SHIP.vx = 0; SHIP.vy = 0;
    SHIP.angle  = Math.random() * Math.PI * 2;
    SHIP.wander = Math.random() * Math.PI * 2;
  }

  function shipTrail(x0, y0, x1, y1, w, rgb) {
    var c = rgb || [255, 77, 143];
    var p = c[0] + ',' + c[1] + ',' + c[2];
    var g = ctx.createLinearGradient(x0, y0, x1, y1);
    g.addColorStop(0,   'rgba(' + p + ',0.95)');
    g.addColorStop(0.3, 'rgba(' + p + ',0.55)');
    g.addColorStop(0.7, 'rgba(' + p + ',0.15)');
    g.addColorStop(1,   'rgba(' + p + ',0)');
    ctx.strokeStyle = g; ctx.lineWidth = w; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
  }

  function updateAndDrawShip() {
    var ax = 0, ay = 0;

    // Errance : la direction désirée tourne doucement au hasard (poussée moteur).
    SHIP.wander += (Math.random() - 0.5) * 0.30;
    ax += Math.cos(SHIP.wander) * SHIP.ACCEL;
    ay += Math.sin(SHIP.wander) * SHIP.ACCEL;

    // Évite TOUS les météores, quelle que soit leur taille. Rayon de réaction
    // ∝ taille → les petits n'ont qu'une petite zone d'évitement (pas de panique
    // inutile), les gros une large.
    for (var i = 0; i < asteroids.length; i++) {
      var a = asteroids[i];
      var dxa = SHIP.x - a.x, dya = SHIP.y - a.y;
      var da = Math.sqrt(dxa * dxa + dya * dya);
      var R = a.def.r * 2.6 + 40;
      if (da < R && da > 0.1) {
        var f = (R - da) / R * 2.6;
        ax += (dxa / da) * f;
        ay += (dya / da) * f;
      }
    }
    // Évite aussi les éclats projetés par les explosions.
    for (var fai = 0; fai < fragments.length; fai++) {
      var fa = fragments[fai];
      var dxf = SHIP.x - fa.x, dyf = SHIP.y - fa.y;
      var df  = Math.sqrt(dxf * dxf + dyf * dyf);
      var Rf  = fa.r * 2.4 + 34;
      if (df < Rf && df > 0.1) {
        var ff = (Rf - df) / Rf * 2.0;
        ax += (dxf / df) * ff;
        ay += (dyf / df) * ff;
      }
    }

    // Collisions navette ↔ météores (TOUTES tailles). Un petit météore (< 30)
    // est POUSSÉ par la navette : impulsion radiale + transfert d'une part de la
    // vitesse du ship. Tout impact déclenche l'« accident » (1 fois / cycle 4 s).
    var nowMs = (typeof performance !== 'undefined' ? performance.now() : Date.now());
    var canHurt = (!SHIP.hurtStart || (nowMs - SHIP.hurtStart) / 1000 >= 4);
    var sspd = Math.sqrt(SHIP.vx * SHIP.vx + SHIP.vy * SHIP.vy);
    for (var ci = 0; ci < asteroids.length; ci++) {
      var ca = asteroids[ci];
      var cdx = ca.x - SHIP.x, cdy = ca.y - SHIP.y;   // du ship VERS le météore
      var rr  = ca.def.r + SHIP.SZ * 0.6;
      if (cdx * cdx + cdy * cdy >= rr * rr) continue;
      var cd = Math.sqrt(cdx * cdx + cdy * cdy) || 1;
      if (ca.def.r < 30) {
        var push = 2.4 + sspd * 0.3;
        ca.vx += (cdx / cd) * push + SHIP.vx * 0.45;
        ca.vy += (cdy / cd) * push + SHIP.vy * 0.45;
      }
      if (canHurt) { SHIP.hurtStart = nowMs; canHurt = false; }
    }
    // Repousse aussi les éclats d'explosion traversés (légers, sans accident).
    for (var cf = 0; cf < fragments.length; cf++) {
      var cfa = fragments[cf];
      var fdx2 = cfa.x - SHIP.x, fdy2 = cfa.y - SHIP.y;
      var frr = cfa.r + SHIP.SZ * 0.5;
      if (fdx2 * fdx2 + fdy2 * fdy2 >= frr * frr) continue;
      var fcd = Math.sqrt(fdx2 * fdx2 + fdy2 * fdy2) || 1;
      var fpush = 1.8 + sspd * 0.25;
      cfa.vx += (fdx2 / fcd) * fpush + SHIP.vx * 0.4;
      cfa.vy += (fdy2 / fcd) * fpush + SHIP.vy * 0.4;
    }

    // Bords : pousse vers l'intérieur avant la sortie.
    var pad = 180;
    if (SHIP.x < pad)     ax += (pad - SHIP.x) / pad * 2.2;
    if (SHIP.x > W - pad) ax -= (SHIP.x - (W - pad)) / pad * 2.2;
    if (SHIP.y < pad)     ay += (pad - SHIP.y) / pad * 2.2;
    if (SHIP.y > H - pad) ay -= (SHIP.y - (H - pad)) / pad * 2.2;

    // Fuir les explosions : forte poussée à l'opposé du centre de l'onde de choc
    // (impulsion qui s'atténue à mesure que l'explosion s'estompe).
    for (var ei = 0; ei < explosions.length; ei++) {
      var ex = explosions[ei];
      var edx = SHIP.x - ex.x, edy = SHIP.y - ex.y;
      var ed = Math.sqrt(edx * edx + edy * edy) || 1;
      if (ed < ex.radius + 45) {
        var ef = 7 * ex.alpha;
        ax += (edx / ed) * ef;
        ay += (edy / ed) * ef;
      }
    }

    // Inertie (modèle legacy) : accumulation de vélocité, plafond, friction.
    SHIP.vx += ax; SHIP.vy += ay;
    var spd = Math.sqrt(SHIP.vx * SHIP.vx + SHIP.vy * SHIP.vy);
    if (spd > SHIP.MAX) { SHIP.vx = SHIP.vx / spd * SHIP.MAX; SHIP.vy = SHIP.vy / spd * SHIP.MAX; spd = SHIP.MAX; }
    SHIP.vx *= SHIP.FRICTION; SHIP.vy *= SHIP.FRICTION;

    SHIP.x += SHIP.vx; SHIP.y += SHIP.vy;

    // Oriente le nez vers la vélocité (virage progressif).
    if (spd > 0.5) {
      var target = Math.atan2(SHIP.vy, SHIP.vx), diff = target - SHIP.angle;
      while (diff >  Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      SHIP.angle += diff * 0.20;
    }

    // Sécurité (ex. après resize) : si très loin hors écran, repositionne.
    if (SHIP.x < -300 || SHIP.x > W + 300 || SHIP.y < -300 || SHIP.y > H + 300) shipReset();

    // Intensité « accident » (hk : 0→1). Montée douce ~0.2 s, plein rouge 3 s,
    // retour fluide à la normale 1 s, puis fin (hurtStart remis à 0). Tout en
    // interpolation linéaire → transition très fluide, jamais de saut brusque.
    var hk = 0;
    if (SHIP.hurtStart) {
      var el = (nowMs - SHIP.hurtStart) / 1000;
      if (el >= 4)       { hk = 0; SHIP.hurtStart = 0; }
      else if (el < 0.2)  hk = el / 0.2;
      else if (el < 3)    hk = 1;
      else                hk = 1 - (el - 3);
    }
    var NRM = [255, 77, 143], HRT = [255, 110, 115];  // rose normal → léger rouge accident (subtil)
    var crgb = [
      Math.round(NRM[0] + (HRT[0] - NRM[0]) * hk),
      Math.round(NRM[1] + (HRT[1] - NRM[1]) * hk),
      Math.round(NRM[2] + (HRT[2] - NRM[2]) * hk)
    ];
    var sz = SHIP.SZ, col = 'rgb(' + crgb[0] + ',' + crgb[1] + ',' + crgb[2] + ')';

    // ── Fumée d'accident (style VECTEUR) ──────────────────────────────────
    // De petits anneaux polygonaux au trait fin, qui tournent lentement,
    // s'agrandissent et s'estompent — cohérent avec l'esthétique line-art du
    // décor, plus subtil qu'un flou plein. Émis à l'arrière tant que hk > 0 ;
    // dessinés en coordonnées MONDE, AVANT le corps → passent derrière.
    if (hk > 0 && Math.random() < 0.35 + hk * 0.4) {
      var sdx = Math.cos(SHIP.angle), sdy = Math.sin(SHIP.angle);   // direction du nez
      var rearX = SHIP.x - sdx * sz * 0.7, rearY = SHIP.y - sdy * sz * 0.7;
      var spread = (Math.random() - 0.5) * sz * 0.5;
      var nv = 5 + Math.floor(Math.random() * 2);                   // 5-6 sommets
      var verts = [];
      for (var vk = 0; vk < nv; vk++) {
        verts.push({ a: (vk / nv) * Math.PI * 2, j: 0.78 + Math.random() * 0.34 });
      }
      shipSmoke.push({
        x: rearX - sdy * spread, y: rearY + sdx * spread,
        vx: -sdx * (0.35 + Math.random() * 0.4) + (Math.random() - 0.5) * 0.35,
        vy: -sdy * (0.35 + Math.random() * 0.4) + (Math.random() - 0.5) * 0.35,
        r: 2 + Math.random() * 2,
        grow: 0.3 + Math.random() * 0.35,
        rot: Math.random() * Math.PI * 2,
        rotV: (Math.random() - 0.5) * 0.05,
        alpha: (0.16 + Math.random() * 0.10) * (0.5 + hk * 0.5),   // discret
        decay: 0.006 + Math.random() * 0.005,
        verts: verts
      });
    }
    ctx.lineJoin = 'round';
    ctx.strokeStyle = 'rgba(168,180,202,1)';
    ctx.shadowColor = 'rgba(168,180,202,0.6)';
    for (var si = shipSmoke.length - 1; si >= 0; si--) {
      var sm = shipSmoke[si];
      sm.x += sm.vx; sm.y += sm.vy;
      sm.vx *= 0.95; sm.vy *= 0.95;
      sm.r += sm.grow;
      sm.rot += sm.rotV;
      sm.alpha -= sm.decay;
      if (sm.alpha <= 0) { shipSmoke.splice(si, 1); continue; }
      ctx.globalAlpha = sm.alpha;
      ctx.lineWidth = 1;
      ctx.shadowBlur = 4;
      ctx.beginPath();
      for (var vp = 0; vp < sm.verts.length; vp++) {
        var va = sm.verts[vp].a + sm.rot, rr2 = sm.r * sm.verts[vp].j;
        var px = sm.x + Math.cos(va) * rr2, py = sm.y + Math.sin(va) * rr2;
        if (vp === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;

    ctx.save();
    ctx.translate(SHIP.x, SHIP.y);
    ctx.rotate(SHIP.angle + Math.PI / 2);             // nez orienté dans la vélocité

    // Deux jets — longueur ∝ vitesse, allongés et élargis pendant l'accident
    // (panache de « fumée » rouge plus marqué, même quand la navette ralentit).
    var trailLen = Math.min(spd * 9, 175) + hk * 70;
    var trailW   = 2.0 + hk * 2.4;
    var lx = -sz * 0.58, ly = sz * 0.38, rx = sz * 0.58, ry = sz * 0.38;
    ctx.shadowColor = col; ctx.shadowBlur = 10 + hk * 14;
    shipTrail(lx, ly, lx - trailLen * 0.17, ly + trailLen, trailW, crgb);
    shipTrail(rx, ry, rx + trailLen * 0.17, ry + trailLen, trailW, crgb);

    // Corps (polygone exact du legacy)
    ctx.shadowColor = col; ctx.shadowBlur = 20; ctx.fillStyle = col;
    ctx.beginPath();
    ctx.moveTo( 0,         -sz);
    ctx.lineTo( sz * 0.50,  sz * 0.05);
    ctx.lineTo( sz * 0.72,  sz * 0.55);
    ctx.lineTo( sz * 0.28,  sz * 0.38);
    ctx.lineTo( sz * 0.18,  sz * 0.72);
    ctx.lineTo(-sz * 0.18,  sz * 0.72);
    ctx.lineTo(-sz * 0.28,  sz * 0.38);
    ctx.lineTo(-sz * 0.72,  sz * 0.55);
    ctx.lineTo(-sz * 0.50,  sz * 0.05);
    ctx.closePath(); ctx.fill();

    // Cockpit
    ctx.shadowBlur = 5; ctx.fillStyle = 'rgba(255,170,210,0.55)';
    ctx.beginPath();
    ctx.moveTo( 0,         -sz * 0.42);
    ctx.lineTo( sz * 0.22,  sz * 0.08);
    ctx.lineTo( 0,          sz * 0.32);
    ctx.lineTo(-sz * 0.22,  sz * 0.08);
    ctx.closePath(); ctx.fill();

    ctx.restore();
    ctx.shadowBlur = 0;
  }

  function hex2rgb(hex) {
    return [parseInt(hex.slice(1,3),16), parseInt(hex.slice(3,5),16), parseInt(hex.slice(5,7),16)];
  }

  function drawRings(px, py, r, rings, back) {
    var rgb = hex2rgb(rings.col);
    for (var i = 0; i < rings.count; i++) {
      var rr   = r * (1.40 + i * rings.gap);
      var lw   = Math.max(1, r * 0.09 * (1 - i * 0.07));
      var alph = rings.alpha * (1 - i * 0.10);
      ctx.beginPath();
      ctx.ellipse(px, py, rr, rr * rings.tiltY, (rings.rot || 0) * Math.PI / 180,
        back ? 0 : Math.PI,
        back ? Math.PI : Math.PI * 2);
      ctx.strokeStyle = 'rgba('+rgb[0]+','+rgb[1]+','+rgb[2]+','+alph+')';
      ctx.lineWidth   = lw;
      ctx.stroke();
    }
  }

  function drawPlanet(pd) {
    var px  = pd.xp * W;
    var py  = pd.yp * H - scrollY * pd.pf;
    var r   = pd.r;
    if (py < -r*5 || py > H+r*5) return;

    var r1 = hex2rgb(pd.col1);
    var r2 = hex2rgb(pd.col2);
    var r3 = hex2rgb(pd.col3);
    var ra = hex2rgb(pd.atmo);

    if (pd.rings) drawRings(px, py, r, pd.rings, true);

    var gGlow = ctx.createRadialGradient(px,py,r*0.75,px,py,r*(1+pd.glowMul));
    gGlow.addColorStop(0,   'rgba('+ra[0]+','+ra[1]+','+ra[2]+',0.22)');
    gGlow.addColorStop(0.5, 'rgba('+ra[0]+','+ra[1]+','+ra[2]+',0.10)');
    gGlow.addColorStop(1,   'rgba('+ra[0]+','+ra[1]+','+ra[2]+',0)');
    ctx.fillStyle = gGlow;
    ctx.beginPath(); ctx.arc(px,py,r*(1+pd.glowMul),0,Math.PI*2); ctx.fill();

    var gBody = ctx.createRadialGradient(px-r*0.28,py-r*0.22,r*0.05,px,py,r);
    gBody.addColorStop(0,    'rgb('+r1[0]+','+r1[1]+','+r1[2]+')');
    gBody.addColorStop(0.55, 'rgb('+r2[0]+','+r2[1]+','+r2[2]+')');
    gBody.addColorStop(1,    'rgb('+Math.max(0,r2[0]-25)+','+Math.max(0,r2[1]-25)+','+Math.max(0,r2[2]-25)+')');
    ctx.fillStyle = gBody;
    ctx.beginPath(); ctx.arc(px,py,r,0,Math.PI*2); ctx.fill();

    if (pd.type === 'ice' || pd.type === 'gas') {
      ctx.save();
      ctx.beginPath(); ctx.arc(px,py,r,0,Math.PI*2); ctx.clip();
      var bCount = pd.type === 'gas' ? 6 : 4;
      var bH     = r * 0.16;
      var bScroll = (t * 0.25) % (r * 2 / bCount);
      for (var b = 0; b < bCount+1; b++) {
        var by = py - r + b*(r*2/bCount) - bScroll;
        ctx.fillStyle = 'rgba('+r3[0]+','+r3[1]+','+r3[2]+',0.11)';
        ctx.fillRect(px-r, by, r*2, bH);
      }
      ctx.restore();
    }

    var gAtmo = ctx.createRadialGradient(px,py,r*0.82,px,py,r*1.10);
    gAtmo.addColorStop(0,    'rgba('+ra[0]+','+ra[1]+','+ra[2]+',0)');
    gAtmo.addColorStop(0.55, 'rgba('+ra[0]+','+ra[1]+','+ra[2]+',0.20)');
    gAtmo.addColorStop(1,    'rgba('+ra[0]+','+ra[1]+','+ra[2]+',0)');
    ctx.fillStyle = gAtmo;
    ctx.beginPath(); ctx.arc(px,py,r*1.10,0,Math.PI*2); ctx.fill();

    ctx.save();
    ctx.beginPath(); ctx.arc(px,py,r,0,Math.PI*2); ctx.clip();
    var gShad = ctx.createRadialGradient(px+r*0.42,py+r*0.32,0,px+r*0.30,py+r*0.22,r*1.05);
    gShad.addColorStop(0,    'rgba(0,0,6,0.75)');
    gShad.addColorStop(0.50, 'rgba(0,0,6,0.18)');
    gShad.addColorStop(1,    'rgba(0,0,6,0)');
    ctx.fillStyle = gShad;
    ctx.fillRect(px-r,py-r,r*2,r*2);
    ctx.restore();

    // Brume : voile froid très diffus autour de la planète (remplace les anneaux).
    if (pd.haze) {
      var hz = hex2rgb(pd.haze);
      var gHaze = ctx.createRadialGradient(px, py, r*0.55, px, py, r*1.85);
      gHaze.addColorStop(0,    'rgba('+hz[0]+','+hz[1]+','+hz[2]+',0.12)');
      gHaze.addColorStop(0.55, 'rgba('+hz[0]+','+hz[1]+','+hz[2]+',0.05)');
      gHaze.addColorStop(1,    'rgba('+hz[0]+','+hz[1]+','+hz[2]+',0)');
      ctx.fillStyle = gHaze;
      ctx.beginPath(); ctx.arc(px, py, r*1.85, 0, Math.PI*2); ctx.fill();
    }

    if (pd.rings) drawRings(px, py, r, pd.rings, false);
  }

  // ETOILES FILANTES — port de ShootingStarSystem.js
  var SS_MIN  = 8;
  var SS_VAR  = 14;
  var SS_AVOID_R   = 220;
  var SS_AVOID_VAR = 180;
  var shootingStars = [];
  var ssNext   = 10 + Math.random() * 8;
  var ssLast   = null;
  var ssTime   = 0;

  function ssSpawn() {
    var angle = Math.random() * Math.PI * 2;
    if (ssLast !== null && Math.abs(angle - ssLast) < 0.8) angle += 1.1;
    ssLast = angle;
    var speed = 500 + Math.random() * 300;
    var vx = Math.cos(angle) * speed / 60;
    var vy = Math.sin(angle) * speed / 60;
    var ox = -Math.cos(angle);
    var oy = -Math.sin(angle);
    var px = -Math.sin(angle);
    var py =  Math.cos(angle);
    var sign = Math.random() < 0.5 ? -1 : 1;
    var off  = sign * (SS_AVOID_R + Math.random() * SS_AVOID_VAR);
    shootingStars.push({
      x: W/2 + ox*(W/2+100) + px*off,
      y: H/2 + oy*(H/2+100) + py*off,
      vx: vx, vy: vy,
      trailLen: 30 + Math.random() * 40,
      color:    Math.random() < 0.6 ? '#ffffff' : '#cce0ff',
      alpha: 0.7, life: 1,
    });
  }

  function ssUpdate() {
    ssTime = t / 60;
    if (ssTime >= ssNext) { ssSpawn(); ssNext = ssTime + SS_MIN + Math.random() * SS_VAR; }
    for (var i = 0; i < shootingStars.length; i++) {
      var s = shootingStars[i];
      s.x += s.vx; s.y += s.vy;
      s.life *= 0.985;
      s.alpha = s.life * 0.7;
    }
    shootingStars = shootingStars.filter(function(s) {
      return s.x > -150 && s.x < W+150 && s.y > -150 && s.y < H+150 && s.life >= 0.03;
    });
  }

  function ssRender() {
    ctx.save();
    for (var i = 0; i < shootingStars.length; i++) {
      var s  = shootingStars[i];
      var tx = s.x - s.vx * s.trailLen;
      var ty = s.y - s.vy * s.trailLen;
      var rgb = s.color === '#ffffff' ? '255,255,255' : '204,224,255';
      var grad = ctx.createLinearGradient(s.x, s.y, tx, ty);
      grad.addColorStop(0, 'rgba('+rgb+','+s.alpha+')');
      grad.addColorStop(1, 'rgba('+rgb+',0)');
      ctx.globalAlpha = 1;
      ctx.strokeStyle = grad;
      ctx.shadowBlur  = 3;
      ctx.shadowColor = s.color;
      ctx.lineWidth   = 0.8;
      ctx.beginPath(); ctx.moveTo(s.x,s.y); ctx.lineTo(tx,ty); ctx.stroke();
      ctx.globalAlpha = s.alpha;
      ctx.fillStyle   = s.color;
      ctx.shadowBlur  = 0;
      ctx.beginPath(); ctx.arc(s.x,s.y,0.8,0,Math.PI*2); ctx.fill();
    }
    ctx.restore();
  }

  // ETOILES DE FOND
  var stars = [];
  function initStars() {
    stars = [];
    var n = Math.min(220, Math.floor(W * H / 5500));
    if (LITE) n = Math.min(70, n);   // mobile : moins d'étoiles
    for (var i = 0; i < n; i++) {
      stars.push({
        x: Math.random()*W, y: Math.random()*H,
        r: Math.random()*1.2+0.2,
        a: Math.random()*0.7+0.15,
        spd: Math.random()*0.015+0.004,
        ph: Math.random()*Math.PI*2,
        pf: Math.random()*0.009+0.002,   // très lointain : bouge moins que les planètes
        col: null,
      });
    }
    var hues = [310,275,185,255,200];
    for (var j = 0; j < (LITE ? 0 : 20); j++) {   // mobile : pas d'étoiles colorées (shadowBlur coûteux)
      stars.push({
        x: Math.random()*W, y: Math.random()*H,
        r: Math.random()*2.2+0.8,
        a: Math.random()*0.25+0.06,
        spd: Math.random()*0.008+0.002,
        ph: Math.random()*Math.PI*2,
        pf: Math.random()*0.007+0.002,   // très lointain : bouge moins que les planètes
        col: hues[Math.floor(Math.random()*hues.length)],
      });
    }
  }

  // BOUCLE
  var _lastDraw = 0;
  function draw(now) {
    requestAnimationFrame(draw);
    // Optimisation : onglet en arrière-plan → on ne dessine rien (économie
    // CPU/batterie). Le navigateur ralentit déjà rAF, ceci couvre le reste.
    if (typeof document !== 'undefined' && document.hidden) return;
    perfTick(now);                                       // surveille le FPS (auto-allègement)
    if (LITE && now && (now - _lastDraw) < 33) return;   // ~30 fps en mode léger
    _lastDraw = now || 0;
    ctx.clearRect(0, 0, W, H);

    nebulae.forEach(function(neb) {
      var def = neb.def;
      var cx  = def.xp * W;
      var cy  = def.yp * H - scrollY * def.pf;
      neb.puffs.forEach(function(puff) {
        var pr = puff.r;
        ctx.save();
        ctx.translate(cx+puff.ox, cy+puff.oy);
        ctx.rotate(neb.angle + puff.ox * 0.0024);   // rotation aléatoire par nébuleuse (comme le legacy) → aspect nuage, plus de barres
        ctx.scale(SCALE_X, SCALE_Y);
        var a = def.alpha * puff.alphaMul;
        // Optimisation : le dégradé (couleurs + rayon constants par puff) est
        // construit UNE fois puis mémorisé → plus aucune allocation par frame.
        var g = puff._grad;
        if (!g) {
          g = ctx.createRadialGradient(0,0,0,0,0,pr);
          g.addColorStop(0,   'hsla('+def.hue+',85%,55%,'+a+')');
          g.addColorStop(0.4, 'hsla('+(def.hue+15)+',80%,45%,'+(a*0.5)+')');
          g.addColorStop(1,   'hsla('+def.hue+',80%,40%,0)');
          puff._grad = g;
        }
        ctx.fillStyle = g;
        ctx.fillRect(-pr,-pr,pr*2,pr*2);
        ctx.restore();
      });
    });

    // Étoiles de fond — dessinées AVANT les planètes pour que celles-ci les cachent.
    stars.forEach(function(s) {
      var twinkle = Math.sin(t * s.spd * 13 + s.ph);
      var alpha   = s.a * (0.6 + 0.4 * twinkle);
      var py      = s.y - scrollY * s.pf;
      py = ((py % (H+10)) + H+10) % (H+10);
      if (s.col !== null) {
        ctx.shadowBlur  = 7;
        ctx.shadowColor = 'hsl('+s.col+',90%,70%)';
        ctx.fillStyle   = 'hsla('+s.col+',90%,80%,'+alpha+')';
      } else {
        ctx.shadowBlur = 0;
        ctx.fillStyle  = 'rgba(255,255,255,'+alpha+')';
      }
      ctx.beginPath(); ctx.arc(s.x, py, s.r, 0, Math.PI*2); ctx.fill();
    });
    ctx.shadowBlur = 0;

    // Étoiles filantes — derrière les planètes (elles font partie du fond lointain)
    if (!LITE) { ssUpdate(); ssRender(); }   // desktop seulement

    // Planètes — devant les étoiles et les filantes (corps opaque qui les masque)
    PLANET_DEFS.forEach(drawPlanet);

    // Planètes au VRAI moteur (cfg EXACTE de l'éditeur) — Planet._renderBody.
    // L'échelle est appliquée à la cfg (rThick/rGap/pGlow) pour garder les
    // proportions, et le corps est dessiné au rayon pRadius*scale.
    if (_planetFxReg && window.GALAXTARUS && GALAXTARUS.Planet) {
      var _pt = t / 60;                          // temps approx. en secondes (60 fps)
      for (var _pi = 0; _pi < CFG_PLANETS.length; _pi++) {
        var _pp = CFG_PLANETS[_pi];
        if (!_pp._scfg) {                         // préparé UNE fois : cfg à l'échelle + canvas cache
          var _s = _pp.scale || 1, _src = _pp.cfg, _sc = {};
          for (var _k in _src) _sc[_k] = _src[_k];
          _sc.rThick = (parseFloat(_src.rThick) || 0) * _s;
          _sc.rGap   = (parseFloat(_src.rGap)   || 0) * _s;
          _sc.pGlow  = (parseFloat(_src.pGlow)  || 0) * _s;
          _pp._scfg = _sc;
          _pp._R    = (parseFloat(_src.pRadius) || 60) * _s;
          var _rc = parseInt(_sc.rCount, 10) || 0;   // demi-taille du canvas (corps + anneaux + marge)
          _pp._hs = Math.ceil(_pp._R + _rc * ((parseFloat(_sc.rThick) || 0) + (parseFloat(_sc.rGap) || 0)) + 60);
          _pp._cv = document.createElement('canvas');
          _pp._cv.width = _pp._cv.height = _pp._hs * 2;
          _pp._cctx = _pp._cv.getContext('2d');
          _pp._cf = 0;
        }
        var _psx = _pp.xp * W;
        var _psy = _pp.yp * H - scrollY * _pp.pf;
        if (_psy < -_pp._hs || _psy > H + _pp._hs) continue;
        // PERF : corps + anneaux (coûteux) dessinés dans un canvas hors-écran,
        // re-rafraîchi seulement tous les 10 frames (anim lente), puis collé.
        if (_pp._cf <= 0) {
          _pp._cctx.clearRect(0, 0, _pp._cv.width, _pp._cv.height);
          GALAXTARUS.Planet._renderBody(_pp._cctx, _pp._scfg, _pp._hs, _pp._hs, _pp._R, _pt, _planetFxReg);
          _pp._cf = 10;
        }
        _pp._cf--;
        // Gros halo lumineux qui pulse (live, peu coûteux), derrière la planète.
        var _ga = hex2rgb(_pp.glow || _pp.cfg.pAtmo || '#80c0ff');
        var _gr = _pp._R * 3.4;
        var _gp = 0.22 + 0.13 * Math.sin(_pt * 1.1 + _pi * 2.1);
        var _gg = ctx.createRadialGradient(_psx, _psy, _pp._R * 0.55, _psx, _psy, _gr);
        _gg.addColorStop(0,   'rgba(' + _ga[0] + ',' + _ga[1] + ',' + _ga[2] + ',' + _gp.toFixed(3) + ')');
        _gg.addColorStop(0.5, 'rgba(' + _ga[0] + ',' + _ga[1] + ',' + _ga[2] + ',' + (_gp * 0.35).toFixed(3) + ')');
        _gg.addColorStop(1,   'rgba(' + _ga[0] + ',' + _ga[1] + ',' + _ga[2] + ',0)');
        ctx.fillStyle = _gg;
        ctx.beginPath(); ctx.arc(_psx, _psy, _gr, 0, Math.PI * 2); ctx.fill();
        ctx.drawImage(_pp._cv, _psx - _pp._hs, _psy - _pp._hs);   // colle la planète cachée
      }
    }

    // Astéroïdes du jeu (devant les planètes)
    updateAndDrawAsteroids();

    // Navette Galaxtarus qui croise lentement
    updateAndDrawShip();

    // Éclats des gros météores, puis explosions (flash au-dessus)
    updateAndDrawFragments();
    updateAndDrawExplosions();

    t += 1;
  }

  function resize() {
    W = canvas.width  = window.innerWidth;
    H = canvas.height = window.innerHeight;
  }

  // Clic sur un météore → explosion blanche, puis il réapparaît plus bas.
  // On ignore les clics sur l'UI interactive (boutons, liens, formulaires…).
  document.addEventListener('click', function (e) {
    if (e.target.closest && e.target.closest(
      'a, button, input, label, select, textarea, [data-notify], #notify-trigger, ' +
      '.nav-burger, .pager-dot, .social-link, .los-bot, .lang-toggle')) return;
    var cx = e.clientX, cy = e.clientY;
    for (var i = 0; i < asteroids.length; i++) {
      var a = asteroids[i];
      var dx = cx - a.x, dy = cy - a.y;
      if (Math.sqrt(dx * dx + dy * dy) <= a.def.r + 10) {
        spawnExplosion(a.x, a.y, a.def.r, a.color);   // explosion à la couleur du météore
        playExplosionSound(a.x, a.def.r);  // son panoramé (X) + volume selon la taille
        if (a.def.r >= 48) spawnFragments(a);   // gros météore → éclate en morceaux projetés
        spawnBelow(a, false);     // le météore "détruit" repart d'en bas
        break;                    // un seul par clic
      }
    }
  }, { passive: true });

  window.addEventListener('scroll', function() { scrollY = window.pageYOffset || window.scrollY; }, {passive:true});
  document.addEventListener('mousemove', function(e) { mouseX = e.clientX; mouseY = e.clientY; }, {passive:true});
  window.addEventListener('resize', function() { computeLite(); resize(); initStars(); initNebulae(); initAsteroids(); shipReset(); }, {passive:true});

  resize();
  initNebulae();
  initStars();
  initAsteroids();
  shipReset();
  draw();
})();