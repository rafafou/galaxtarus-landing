// PlanetFx — abstract base class for any visual effect that decorates a
// planet. A PlanetFx asks two questions :
//   1. appliesTo(cfg) → true if this effect applies to the given planet.
//   2. render(ctx, cfg, cx, cy, R, t) → draw the effect.
//
// Concrete subclasses live OUTSIDE the engine, in assets/visuals/planet_fx/
// (game-specific content). The engine ships only this abstract class +
// the registry — it has zero hardcoded knowledge of "ocean" or "lava"
// planet types. That keeps the engine reusable for other games.
//
// Compatible clé USB (file://). Règle 13 : exposed on
// G.entities.planet_fx.PlanetFx.

(function () {
  'use strict';

  class PlanetFx {
    /**
     * Render scope : 'inside' (clipped to the planet's circle, drawn
     * between body and atmosphere rim) or 'outside' (drawn after the
     * full planet body + rings + moons, no clip — for halos, extra
     * rings, orbital lines, etc.). Override in subclass when needed.
     * @type {'inside'|'outside'}
     */
    get scope() { return 'inside'; }

    /**
     * Override : decide whether this effect applies to the given cfg.
     * Default : applies always.
     * @param {object} cfg - planet config
     * @returns {boolean}
     */
    appliesTo(/* cfg */) { return true; }

    /**
     * Override : render the effect on the planet body.
     * @param {CanvasRenderingContext2D} ctx
     * @param {object} cfg - planet config
     * @param {number} cx, cy - planet center (screen px)
     * @param {number} R     - planet radius (screen px)
     * @param {number} t     - global time in seconds
     */
    render(/* ctx, cfg, cx, cy, R, t */) { /* override me */ }
  }

  window.GALAXTARUS = window.GALAXTARUS || {};
  window.GALAXTARUS.entities = window.GALAXTARUS.entities || {};
  window.GALAXTARUS.entities.planet_fx = window.GALAXTARUS.entities.planet_fx || {};
  window.GALAXTARUS.entities.planet_fx.PlanetFx = PlanetFx;
})();
