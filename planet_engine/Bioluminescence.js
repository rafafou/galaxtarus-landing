// Bioluminescence — small bright dots that pulse in/out, scattered on a
// circular surface. Useful for : alien planet, plankton field, firefly
// swarm, energy nodes.
//
// Compatible clé USB (file://). Règle 13 : exposed on G.render.fx.Bioluminescence.

(function () {
  'use strict';

  class Bioluminescence {
    /**
     * @param {CanvasRenderingContext2D} ctx
     * @param {object} opts
     * @param {number} opts.cx, opts.cy
     * @param {number} opts.R
     * @param {string} [opts.colorRamp='cyan']  - 'cyan' (alien default) or
     *                                            an array [r, g, b] (fixed)
     * @param {number} [opts.count=20]
     * @param {number} [opts.t=0]
     * @param {number} [opts.driftSpeed=0]
     * @param {number} [opts.dotRadiusFactor=0.025]
     */
    static draw(ctx, opts) {
      if (!opts) return;
      const { cx, cy, R } = opts;
      const count = opts.count || 20;
      const t     = opts.t || 0;
      const drift = opts.driftSpeed || 0;
      const drf   = opts.dotRadiusFactor || 0.025;
      const useFixed = Array.isArray(opts.colorRamp);
      const fixed = useFixed ? opts.colorRamp : null;

      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, R, 0, Math.PI * 2);
      ctx.clip();
      for (let i = 0; i < count; i++) {
        const seed = i * 5.7;
        const px = cx + Math.sin(seed + t * drift * 8) * R * 0.8;
        const py = cy + Math.cos(seed * 1.3) * R * 0.8;
        if (Math.sqrt((px - cx) ** 2 + (py - cy) ** 2) > R * 0.95) continue;
        const bright = Math.abs(Math.sin(t * 1.5 + i)) * 0.7 + 0.3;
        if (useFixed) {
          ctx.fillStyle = `rgba(${fixed[0]},${fixed[1]},${fixed[2]},${bright * 0.4})`;
        } else {
          ctx.fillStyle = `rgba(0,255,${Math.floor(150 + i * 5)},${bright * 0.4})`;
        }
        ctx.beginPath();
        ctx.arc(px, py, R * drf, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
  }

  window.GALAXTARUS = window.GALAXTARUS || {};
  window.GALAXTARUS.render = window.GALAXTARUS.render || {};
  window.GALAXTARUS.render.fx = window.GALAXTARUS.render.fx || {};
  window.GALAXTARUS.render.fx.Bioluminescence = Bioluminescence;
})();
