// Blobs — soft round patches scattered on a circular surface (planet,
// asteroid, drawing). Useful for : ocean continents, lava pools,
// vegetation patches, surface stains.
//
// Compatible clé USB (file://). Règle 13 : exposed on G.render.fx.Blobs.

(function () {
  'use strict';

  class Blobs {
    /**
     * @param {CanvasRenderingContext2D} ctx
     * @param {object} opts
     * @param {number} opts.cx, opts.cy        - center of the surface
     * @param {number} opts.R                  - radius of the surface (clip)
     * @param {string} [opts.color='#508032']  - blob fill color (CSS color)
     * @param {number} [opts.count=5]          - number of blobs
     * @param {number} [opts.t=0]              - time (seconds) for animation
     * @param {number} [opts.driftSpeed=0]     - drift speed (0 = static)
     * @param {number} [opts.alpha=0.5]        - global blob alpha
     * @param {boolean}[opts.glow=false]       - if true, add a soft outer glow
     * @param {number} [opts.sizeFactor=1]     - relative blob size (1 = default)
     */
    static draw(ctx, opts) {
      if (!opts) return;
      const { cx, cy, R } = opts;
      const color  = opts.color || '#508032';
      const count  = opts.count || 5;
      const t      = opts.t || 0;
      const drift  = opts.driftSpeed || 0;
      const alpha  = (opts.alpha !== undefined) ? opts.alpha : 0.5;
      const sf     = opts.sizeFactor || 1;
      const glow   = !!opts.glow;

      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, R, 0, Math.PI * 2);
      ctx.clip();
      for (let i = 0; i < count; i++) {
        const seed = i * 8.3;
        const bx = cx + Math.sin(seed + t * drift * 10) * R * 0.6;
        const by = cy + Math.cos(seed * 1.4) * R * 0.6;
        const br = R * (0.1 + Math.sin(seed * 3) * 0.12) * sf;
        if (glow) {
          const g = ctx.createRadialGradient(bx, by, 0, bx, by, br * 1.6);
          g.addColorStop(0, color);
          g.addColorStop(1, 'rgba(0,0,0,0)');
          ctx.fillStyle = g;
        } else {
          ctx.globalAlpha = alpha;
          ctx.fillStyle = color;
        }
        ctx.beginPath();
        ctx.arc(bx, by, br, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
  }

  window.GALAXTARUS = window.GALAXTARUS || {};
  window.GALAXTARUS.render = window.GALAXTARUS.render || {};
  window.GALAXTARUS.render.fx = window.GALAXTARUS.render.fx || {};
  window.GALAXTARUS.render.fx.Blobs = Blobs;
})();
