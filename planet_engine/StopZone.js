// StopZone — polygone de danger dessiné via le zone_editor.
//
// Chaque stop zone est un polygone arbitraire (vertices world-space).
// Données dans zone data blob :
//   stopZoneMarkers : [{ id, kind, vertices:[{wx,wy},...] }]
//
// Events bus :
//   stopzone:enter            — une fois à l'entrée
//   stopzone:exit             — une fois à la sortie
//   collision:ship-stopzone   — chaque frame dedans, payload { stopZone, warnLevel }
//
// Rendu : nuages animés (blobs radial-gradient clippés au polygone).
// Pas de fill plat, pas de bordure dure — fondu naturel vers les bords.
//
// POO ES6 + file:// safe (window.GALAXTARUS.StopZone).

(function () {
  'use strict';

  // RGB components (string) pour construire les rgba() des gradients.
  const KIND_PALETTE = {
    aurora:   { c1: '0,220,180',   c2: '0,140,255'   },
    lava:     { c1: '255,90,0',    c2: '255,170,30'  },
    void:     { c1: '150,0,255',   c2: '80,0,200'    },
    electric: { c1: '255,255,0',   c2: '180,255,240' },
  };

  // Blobs définis en coords relatives au bbox du polygone (fraction de la demi-taille).
  // ox/oy = offset du centre depuis le centroid, rs = rayon relatif au max(rW,rH),
  // a = alpha max, sp = vitesse d'animation, ph = phase, ci = palette index (0=c1,1=c2).
  // Alphas intentionnellement bas : les blobs se superposent, l'accumulation
  // doit rester translucide — on vise des volutes effilochées, pas une nappe.
  const CLOUD_BLOBS = [
    { ox:  0.00, oy:  0.00, rs: 1.15, a: 0.12, sp: 0.28, ph: 0.00, ci: 0 },
    { ox:  0.22, oy:  0.16, rs: 0.82, a: 0.14, sp: 0.41, ph: 1.30, ci: 1 },
    { ox: -0.26, oy: -0.20, rs: 0.75, a: 0.12, sp: 0.35, ph: 2.20, ci: 0 },
    { ox:  0.10, oy: -0.30, rs: 0.66, a: 0.11, sp: 0.52, ph: 0.80, ci: 1 },
    { ox: -0.18, oy:  0.28, rs: 0.72, a: 0.11, sp: 0.44, ph: 3.10, ci: 0 },
    { ox:  0.36, oy: -0.08, rs: 0.60, a: 0.09, sp: 0.60, ph: 1.90, ci: 1 },
    { ox: -0.37, oy:  0.12, rs: 0.63, a: 0.09, sp: 0.33, ph: 2.60, ci: 0 },
    { ox:  0.05, oy:  0.38, rs: 0.56, a: 0.08, sp: 0.48, ph: 4.00, ci: 1 },
  ];

  const WARN_SECS = 3;

  class StopZone {
    /**
     * @param {object}         data
     * @param {string}         data.id
     * @param {string}         data.kind    'aurora' | 'lava' | 'void' | 'electric'
     * @param {Array<{wx,wy}>} data.vertices  polygone en world-coords
     */
    constructor(data) {
      this.id       = data.id   || ('sz_' + Math.random().toString(36).slice(2));
      this.kind     = data.kind || 'aurora';
      this.vertices = Array.isArray(data.vertices) ? data.vertices : [];
      this._palette   = KIND_PALETTE[this.kind] || KIND_PALETTE.aurora;
      this._warnTimer = 0;
      this._wasInZone = false;
      this._lastTick  = null;
    }

    get warnLevel() {
      return Math.min(1, Math.max(0, this._warnTimer / WARN_SECS));
    }

    _isShipInPolygon(ship) {
      const px = ship.wx, py = ship.wy;
      const verts = this.vertices;
      if (verts.length < 3) return false;
      let inside = false;
      const n = verts.length;
      for (let i = 0, j = n - 1; i < n; j = i++) {
        const xi = verts[i].wx, yi = verts[i].wy;
        const xj = verts[j].wx, yj = verts[j].wy;
        if (((yi > py) !== (yj > py)) && (px < (xj - xi) * (py - yi) / (yj - yi) + xi)) {
          inside = !inside;
        }
      }
      return inside;
    }

    tickShip(ship, bus) {
      if (!ship || !bus) return;
      const now = performance.now() / 1000;
      const dt  = (this._lastTick !== null) ? Math.min(0.1, now - this._lastTick) : 0.016;
      this._lastTick = now;
      const inZone = this._isShipInPolygon(ship);
      if (inZone) {
        this._warnTimer = Math.min(WARN_SECS + 0.5, this._warnTimer + dt);
      } else {
        this._warnTimer = Math.max(0, this._warnTimer - dt * 2);
      }
      if (inZone && !this._wasInZone) {
        bus.emit('stopzone:enter', { stopZone: this });
      } else if (!inZone && this._wasInZone) {
        bus.emit('stopzone:exit',  { stopZone: this });
      }
      if (inZone) {
        bus.emit('collision:ship-stopzone', { stopZone: this, warnLevel: this.warnLevel });
      }
      this._wasInZone = inZone;
    }

    /**
     * Rendu nuage animé :
     *  - Le polygone est utilisé comme clip (zone clippée = forme visible).
     *  - À l'intérieur, on peint N blobs radial-gradient qui dérivent dans
     *    le temps via sin/cos indépendants → apparence nuageuse, sans bord dur.
     *  - Aucun stroke, aucun fill uniforme → le fondu vers alpha=0 crée
     *    naturellement la limite douce de la zone.
     *
     * @param {CanvasRenderingContext2D} ctx
     * @param {{wx,wy,zoom}} camera
     * @param {number} t  temps en secondes
     */
    render(ctx, camera, t) {
      const verts = this.vertices;
      if (verts.length < 3) return;
      const W = ctx.canvas.width, H = ctx.canvas.height, z = camera.zoom;
      const pal = this._palette;

      // Conversion world → screen
      const sv = verts.map(v => ({
        x: (v.wx - camera.wx) * z + W / 2,
        y: (v.wy - camera.wy) * z + H / 2,
      }));

      // Bounding box + cull hors-écran
      let minX = sv[0].x, maxX = sv[0].x, minY = sv[0].y, maxY = sv[0].y;
      for (let i = 1; i < sv.length; i++) {
        if (sv[i].x < minX) minX = sv[i].x;
        if (sv[i].x > maxX) maxX = sv[i].x;
        if (sv[i].y < minY) minY = sv[i].y;
        if (sv[i].y > maxY) maxY = sv[i].y;
      }
      if (maxX < 0 || minX > W || maxY < 0 || minY > H) return;

      const cx   = (minX + maxX) / 2;
      const cy   = (minY + maxY) / 2;
      const rW   = Math.max(8, (maxX - minX) / 2);
      const rH   = Math.max(8, (maxY - minY) / 2);
      const rMax = Math.max(rW, rH);

      ctx.save();

      // --- Clip polygone ondulé ---
      // Chaque arête est subdivisée et déformée perpendiculairement par une
      // onde sinusoïdale animée → le bord lui-même ondule, aucune droite visible.
      const WAVE_AMP  = 18;    // amplitude de déformation (px écran)
      const WAVE_FREQ = 2.5;   // cycles d'onde par arête
      const WAVE_SEG  = 18;    // nb de segments par arête
      ctx.beginPath();
      for (let ei = 0; ei < sv.length; ei++) {
        const ni  = (ei + 1) % sv.length;
        const ax  = sv[ei].x, ay = sv[ei].y;
        const bx  = sv[ni].x, by = sv[ni].y;
        const elen = Math.hypot(bx - ax, by - ay);
        if (elen < 0.001) continue;
        // Normale perpendiculaire à l'arête (vers l'intérieur OU extérieur selon winding)
        const nxn = -(by - ay) / elen;
        const nyn =  (bx - ax) / elen;
        if (ei === 0) ctx.moveTo(ax, ay);
        for (let s = 1; s <= WAVE_SEG; s++) {
          const frac = s / WAVE_SEG;
          const px   = ax + (bx - ax) * frac;
          const py   = ay + (by - ay) * frac;
          // Phase unique par arête + avancement dans l'arête + temps → ondulation vivante
          const wave = WAVE_AMP * Math.sin(frac * WAVE_FREQ * Math.PI * 2 + t * 1.1 + ei * 1.9);
          ctx.lineTo(px + nxn * wave, py + nyn * wave);
        }
      }
      ctx.closePath();
      ctx.clip();

      // --- Blobs nuage ---
      ctx.globalAlpha = 1;
      for (let bi = 0; bi < CLOUD_BLOBS.length; bi++) {
        const b   = CLOUD_BLOBS[bi];
        // Dérive animée indépendante par blob
        const dx  = Math.sin(t * b.sp       + b.ph) * 0.15 * rW;
        const dy  = Math.cos(t * b.sp * 0.7 + b.ph) * 0.12 * rH;
        const bx  = cx + b.ox * rW + dx;
        const by  = cy + b.oy * rH + dy;
        const br  = b.rs * rMax;
        const rgb = (b.ci === 0) ? pal.c1 : pal.c2;

        // Gradient radial : couleur au centre → transparent au bord
        const grad = ctx.createRadialGradient(bx, by, 0, bx, by, br);
        grad.addColorStop(0,    'rgba(' + rgb + ',' + b.a           + ')');
        grad.addColorStop(0.30, 'rgba(' + rgb + ',' + (b.a * 0.50) + ')');
        grad.addColorStop(0.65, 'rgba(' + rgb + ',' + (b.a * 0.15) + ')');
        grad.addColorStop(1,    'rgba(' + rgb + ',0)');

        ctx.fillStyle = grad;
        // fillRect canvas entier — le clip polygone restreint les pixels visibles.
        ctx.fillRect(0, 0, W, H);
      }

      ctx.restore();
    }
  }

  window.GALAXTARUS = window.GALAXTARUS || {};
  window.GALAXTARUS.StopZone = StopZone;
})();
