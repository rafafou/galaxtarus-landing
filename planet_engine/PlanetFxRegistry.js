// PlanetFxRegistry — container of PlanetFx instances, applied in order to
// a planet at render time. Each fx decides via appliesTo(cfg) whether it
// runs for the current planet.
//
// Used by Planet._renderBody : the renderer asks the registry to apply
// every relevant effect after the body / before the atmosphere rim.
//
// Compatible clé USB (file://). Règle 14 : instances injectées (the
// registry is created at boot, never auto-instantiated). Règle 13 :
// exposed on G.entities.planet_fx.PlanetFxRegistry.

(function () {
  'use strict';

  class PlanetFxRegistry {
    constructor() {
      /** @type {Array<PlanetFx>} */
      this._fx = [];
    }

    /** Add a PlanetFx (or subclass) to the registry. Order matters. */
    register(fx) {
      if (!fx) return;
      if (typeof fx.render !== 'function' || typeof fx.appliesTo !== 'function') {
        console.warn('[PlanetFxRegistry] ignoring item without appliesTo/render', fx);
        return;
      }
      this._fx.push(fx);
    }

    /** Remove all registered FX. */
    clear() { this._fx = []; }

    /** @returns {number} */
    count() { return this._fx.length; }

    /**
     * Iterate registered FX, render those whose appliesTo(cfg) is true
     * AND whose scope matches the requested phase.
     * @param {CanvasRenderingContext2D} ctx
     * @param {object} cfg
     * @param {number} cx, cy
     * @param {number} R
     * @param {number} t
     * @param {'inside'|'outside'} [phase='inside']
     */
    renderAll(ctx, cfg, cx, cy, R, t, phase) {
      const want = phase || 'inside';
      for (const fx of this._fx) {
        if (fx.scope !== want) continue;
        if (fx.appliesTo(cfg)) fx.render(ctx, cfg, cx, cy, R, t);
      }
    }
  }

  window.GALAXTARUS = window.GALAXTARUS || {};
  window.GALAXTARUS.entities = window.GALAXTARUS.entities || {};
  window.GALAXTARUS.entities.planet_fx = window.GALAXTARUS.entities.planet_fx || {};
  window.GALAXTARUS.entities.planet_fx.PlanetFxRegistry = PlanetFxRegistry;
})();
