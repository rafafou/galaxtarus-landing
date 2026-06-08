// EnergyTendrils — curved energy lines radiating from a center. Useful
// for : dark/void planet, black hole pull, gravity well, enemy aura,
// portal arcs.
//
// Compatible clé USB (file://). Règle 13 : exposed on G.render.fx.EnergyTendrils.

(function () {
  'use strict';

  class EnergyTendrils {
    /**
     * @param {CanvasRenderingContext2D} ctx
     * @param {object} opts
     * @param {number} opts.cx, opts.cy
     * @param {number} opts.R
     * @param {string} [opts.color='rgba(120,0,200,0.2)'] - line color (rgba ok)
     * @param {number} [opts.count=8]
     * @param {number} [opts.t=0]
     * @param {number} [opts.lineWidth=1.5]
     * @param {number} [opts.curl=0.5]                    - quadratic control offset (0 = straight)
     */
    static draw(ctx, opts) {
      if (!opts) return;
      const { cx, cy, R } = opts;
      const baseCol = opts.color || 'rgba(120,0,200,0.2)';
      const count   = opts.count || 8;
      const t       = opts.t || 0;
      const lw      = opts.lineWidth || 1.5;
      const curl    = (opts.curl !== undefined) ? opts.curl : 0.5;

      ctx.save();
      for (let i = 0; i < count; i++) {
        const ang = i / count * Math.PI * 2 + t * 0.05;
        const a   = 0.15 + Math.sin(t + i) * 0.1;
        // If user gave an rgba(), animate alpha by replacing it; else just use as-is.
        if (/^rgba?\(/.test(baseCol)) {
          ctx.strokeStyle = baseCol.replace(/[\d.]+\)$/, a.toFixed(3) + ')');
        } else {
          ctx.strokeStyle = baseCol;
        }
        ctx.lineWidth = lw;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        const ex = cx + Math.cos(ang) * R * 0.9;
        const ey = cy + Math.sin(ang) * R * 0.9;
        ctx.quadraticCurveTo(
          cx + Math.cos(ang + curl) * R * 0.5,
          cy + Math.sin(ang + curl) * R * 0.5,
          ex, ey
        );
        ctx.stroke();
      }
      ctx.restore();
    }
  }

  window.GALAXTARUS = window.GALAXTARUS || {};
  window.GALAXTARUS.render = window.GALAXTARUS.render || {};
  window.GALAXTARUS.render.fx = window.GALAXTARUS.render.fx || {};
  window.GALAXTARUS.render.fx.EnergyTendrils = EnergyTendrils;
})();
