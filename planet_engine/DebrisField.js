// DebrisField — small rotating rectangular debris along an arc. Useful
// for : debris ring around a planet, asteroid belt, wreckage cloud.
//
// Compatible clé USB (file://). Règle 13 : exposed on G.render.fx.DebrisField.

(function () {
  'use strict';

  class DebrisField {
    /**
     * @param {CanvasRenderingContext2D} ctx
     * @param {object} opts
     * @param {number} opts.cx, opts.cy
     * @param {number} opts.innerR
     * @param {number} opts.thick
     * @param {string} [opts.color='#A08050']
     * @param {number} [opts.alpha=0.6]
     * @param {number} [opts.startAng=0]
     * @param {number} [opts.sweep=Math.PI]
     * @param {number} [opts.count=80]
     */
    static draw(ctx, opts) {
      if (!opts) return;
      const { cx, cy, innerR, thick } = opts;
      const color  = opts.color || '#A08050';
      const alpha  = (opts.alpha !== undefined) ? opts.alpha : 0.6;
      const startA = (opts.startAng !== undefined) ? opts.startAng : 0;
      const sweep  = (opts.sweep    !== undefined) ? opts.sweep    : Math.PI;
      const count  = opts.count || 80;

      const m = /^#([0-9A-Fa-f]{2})([0-9A-Fa-f]{2})([0-9A-Fa-f]{2})$/.exec(color);
      const r = m ? parseInt(m[1], 16) : 160;
      const g = m ? parseInt(m[2], 16) : 128;
      const b = m ? parseInt(m[3], 16) : 80;

      ctx.save();
      ctx.translate(cx, cy);
      for (let p = 0; p < count; p++) {
        const ang = startA + (p / count) * sweep + Math.sin(p) * 0.1;
        const r0  = innerR + ((p * 13.7) % thick);
        const ds  = 1 + Math.sin(p * 7) * 1.2;
        ctx.fillStyle = `rgba(${r},${g},${b},${alpha * (0.4 + Math.sin(p) * 0.4)})`;
        ctx.save();
        ctx.translate(Math.cos(ang) * r0, Math.sin(ang) * r0);
        ctx.rotate(ang);
        ctx.fillRect(-ds, -ds * 0.4, ds * 2, ds * 0.8);
        ctx.restore();
      }
      ctx.restore();
    }
  }

  window.GALAXTARUS = window.GALAXTARUS || {};
  window.GALAXTARUS.render = window.GALAXTARUS.render || {};
  window.GALAXTARUS.render.fx = window.GALAXTARUS.render.fx || {};
  window.GALAXTARUS.render.fx.DebrisField = DebrisField;
})();
