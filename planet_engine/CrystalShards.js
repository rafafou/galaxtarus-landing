// CrystalShards — sparkling crystalline shards along an arc. Useful for :
// crystal rings around a planet, ice crystals, gem field, magic shards.
//
// Compatible clé USB (file://). Règle 13 : exposed on G.render.fx.CrystalShards.

(function () {
  'use strict';

  class CrystalShards {
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
     * @param {number} [opts.angStep=0.08]
     * @param {number} [opts.lineWidth=1.5]
     * @param {number} [opts.seedOffset=0]
     */
    static draw(ctx, opts) {
      if (!opts) return;
      const { cx, cy, innerR, thick } = opts;
      const color   = opts.color || '#A08050';
      const alpha   = (opts.alpha !== undefined) ? opts.alpha : 0.6;
      const startA  = (opts.startAng !== undefined) ? opts.startAng : 0;
      const sweep   = (opts.sweep    !== undefined) ? opts.sweep    : Math.PI;
      const aStep   = opts.angStep   || 0.08;
      const lw      = opts.lineWidth || 1.5;
      const seedO   = opts.seedOffset || 0;

      const m = /^#([0-9A-Fa-f]{2})([0-9A-Fa-f]{2})([0-9A-Fa-f]{2})$/.exec(color);
      const r = m ? parseInt(m[1], 16) : 160;
      const g = m ? parseInt(m[2], 16) : 128;
      const b = m ? parseInt(m[3], 16) : 80;

      ctx.save();
      ctx.translate(cx, cy);
      for (let a = startA; a < startA + sweep; a += aStep) {
        const pr1 = innerR + Math.sin(a * 17 + seedO)       * thick * 0.4 + thick * 0.3;
        const pr2 = innerR + Math.sin(a * 17 + seedO + 0.5) * thick * 0.4 + thick * 0.6;
        const shine = Math.abs(Math.sin(a * 7 + seedO * 3)) * alpha;
        ctx.strokeStyle = `rgba(${Math.min(255, r + 80)},${Math.min(255, g + 60)},${Math.min(255, b + 120)},${shine})`;
        ctx.lineWidth = lw;
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * pr1, Math.sin(a) * pr1);
        ctx.lineTo(Math.cos(a) * pr2, Math.sin(a) * pr2);
        ctx.stroke();
      }
      ctx.restore();
    }
  }

  window.GALAXTARUS = window.GALAXTARUS || {};
  window.GALAXTARUS.render = window.GALAXTARUS.render || {};
  window.GALAXTARUS.render.fx = window.GALAXTARUS.render.fx || {};
  window.GALAXTARUS.render.fx.CrystalShards = CrystalShards;
})();
