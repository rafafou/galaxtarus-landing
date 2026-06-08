// Crack — bright, animated cracks on a circular surface. Useful for :
// lava planet, asteroid fracture lines, broken shield, dimensional rift.
//
// Compatible clé USB (file://). Règle 13 : exposed on G.render.fx.Crack.

(function () {
  'use strict';

  class Crack {
    /**
     * @param {CanvasRenderingContext2D} ctx
     * @param {object} opts
     * @param {number} opts.cx, opts.cy
     * @param {number} opts.R
     * @param {string} [opts.color='#FFA000'] - base color (the brightness pulses)
     * @param {number} [opts.count=10]        - number of cracks
     * @param {number} [opts.t=0]
     * @param {number} [opts.segments=6]      - number of zigzag segments per crack
     * @param {number} [opts.lineWidth=1.2]
     */
    static draw(ctx, opts) {
      if (!opts) return;
      const { cx, cy, R } = opts;
      const baseCol = opts.color || '#FFA000';
      const count   = opts.count || 10;
      const t       = opts.t || 0;
      const segs    = opts.segments || 6;
      const lw      = opts.lineWidth || 1.2;

      // Parse hex base color → rgb so we can animate brightness.
      const m = /^#([0-9A-Fa-f]{2})([0-9A-Fa-f]{2})([0-9A-Fa-f]{2})$/.exec(baseCol);
      const r0 = m ? parseInt(m[1], 16) : 255;
      const g0 = m ? parseInt(m[2], 16) : 160;
      const b0 = m ? parseInt(m[3], 16) : 0;

      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, R, 0, Math.PI * 2);
      ctx.clip();
      for (let i = 0; i < count; i++) {
        const bright = Math.abs(Math.sin(t * 2 + i)) * 0.85 + 0.15;
        ctx.strokeStyle = `rgba(${r0},${Math.floor(g0 * bright)},${Math.floor(b0 * bright)},${bright * 0.85})`;
        ctx.lineWidth = lw;
        ctx.beginPath();
        let lx = cx - R + Math.sin(i * 3.1) * R * 1.8;
        let ly = cy - R + Math.cos(i * 2.3) * R * 1.8;
        ctx.moveTo(lx, ly);
        for (let s = 0; s < segs; s++) {
          lx += Math.sin(t * 0.5 + i + s) * 14 - 7;
          ly += 10 + Math.cos(t + i + s) * 5;
          ctx.lineTo(lx, ly);
        }
        ctx.stroke();
      }
      ctx.restore();
    }
  }

  window.GALAXTARUS = window.GALAXTARUS || {};
  window.GALAXTARUS.render = window.GALAXTARUS.render || {};
  window.GALAXTARUS.render.fx = window.GALAXTARUS.render.fx || {};
  window.GALAXTARUS.render.fx.Crack = Crack;
})();
