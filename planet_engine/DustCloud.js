// DustCloud — diffuse dust particles arranged along an arc (or full ring,
// or scattered area). Useful for : ring of dust around a planet, debris
// belt, smoke trail, cosmic dust.
//
// Compatible clé USB (file://). Règle 13 : exposed on G.render.fx.DustCloud.

(function () {
  'use strict';

  class DustCloud {
    /**
     * Render dust particles along an arc.
     * @param {CanvasRenderingContext2D} ctx
     * @param {object} opts
     * @param {number} opts.cx, opts.cy
     * @param {number} opts.innerR        - inner radius of the arc band
     * @param {number} opts.thick         - band thickness
     * @param {string} [opts.color='#A08050']
     * @param {number} [opts.alpha=0.6]
     * @param {number} [opts.startAng=0]  - radians
     * @param {number} [opts.sweep=Math.PI]
     * @param {number} [opts.density=2]   - particle step (smaller = denser)
     * @param {number} [opts.particleR=0.6]
     */
    static draw(ctx, opts) {
      if (!opts) return;
      const { cx, cy, innerR, thick } = opts;
      const color = opts.color || '#A08050';
      const alpha = (opts.alpha !== undefined) ? opts.alpha : 0.6;
      const startA = (opts.startAng !== undefined) ? opts.startAng : 0;
      const sweep  = (opts.sweep    !== undefined) ? opts.sweep    : Math.PI;
      const step   = opts.density || 2;
      const pr     = opts.particleR || 0.6;

      const m = /^#([0-9A-Fa-f]{2})([0-9A-Fa-f]{2})([0-9A-Fa-f]{2})$/.exec(color);
      const r = m ? parseInt(m[1], 16) : 160;
      const g = m ? parseInt(m[2], 16) : 128;
      const b = m ? parseInt(m[3], 16) : 80;

      const pcount = Math.floor((innerR + thick) * sweep / 2);
      ctx.save();
      ctx.translate(cx, cy);
      for (let p = 0; p < pcount; p += step) {
        const ang = startA + (p / pcount) * sweep;
        const r0  = innerR + Math.random() * thick;
        const a   = alpha * (0.3 + Math.random() * 0.7);
        ctx.fillStyle = `rgba(${r},${g},${b},${a})`;
        ctx.beginPath();
        ctx.arc(Math.cos(ang) * r0, Math.sin(ang) * r0, pr, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
  }

  window.GALAXTARUS = window.GALAXTARUS || {};
  window.GALAXTARUS.render = window.GALAXTARUS.render || {};
  window.GALAXTARUS.render.fx = window.GALAXTARUS.render.fx || {};
  window.GALAXTARUS.render.fx.DustCloud = DustCloud;
})();
