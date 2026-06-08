// OrbitEllipse — a faint elliptical orbit line around a center. Useful
// for : moon orbit visualization, planet trajectory preview, satellite path.
//
// Compatible clé USB (file://). Règle 13 : exposed on G.render.fx.OrbitEllipse.

(function () {
  'use strict';

  class OrbitEllipse {
    /**
     * @param {CanvasRenderingContext2D} ctx
     * @param {object} opts
     * @param {number} opts.cx, opts.cy
     * @param {number} opts.dist          - semi-major axis
     * @param {number} [opts.tilt=0]      - radians (Math.PI/2 = circular projection)
     * @param {string} [opts.color='rgba(80,130,200,0.05)']
     * @param {number} [opts.lineWidth=0.5]
     */
    static draw(ctx, opts) {
      if (!opts) return;
      const { cx, cy, dist } = opts;
      const tilt  = opts.tilt  || 0;
      const color = opts.color || 'rgba(80,130,200,0.05)';
      const lw    = opts.lineWidth || 0.5;

      ctx.save();
      ctx.strokeStyle = color;
      ctx.lineWidth   = lw;
      ctx.beginPath();
      ctx.ellipse(cx, cy, dist, dist * Math.cos(tilt), 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  }

  window.GALAXTARUS = window.GALAXTARUS || {};
  window.GALAXTARUS.render = window.GALAXTARUS.render || {};
  window.GALAXTARUS.render.fx = window.GALAXTARUS.render.fx || {};
  window.GALAXTARUS.render.fx.OrbitEllipse = OrbitEllipse;
})();
