// galaxtarus_planet_fx.js — content (assets/) : the FX library that
// gives Galaxtarus planets their identity. Each class extends
// G.entities.planet_fx.PlanetFx and *composes* primitives from
// G.render.fx.* to produce its visual signature.
//
// Engine ships zero FX. This file is the Galaxtarus-specific content
// loaded at boot (galaxtarus.html + test_ship.html + planet_editor.html).
// Another game built on the engine writes its OWN file like this one
// without touching src/.
//
// Compatible clé USB (file://). Exposes `populateGalaxtarusPlanetFx(reg)`
// on G.assets so the boot can register everything in one call.

(function () {
  'use strict';

  const G   = window.GALAXTARUS;
  const Fx  = G.entities.planet_fx.PlanetFx;
  const fx  = G.render.fx;

  // Helper : convert hex → rgba string (for primitives that take a CSS color).
  function _rgba(hex, a) {
    if (!hex || hex.length < 7) return `rgba(120,120,120,${a})`;
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r},${g},${b},${a})`;
  }

  // ── pType FX ────────────────────────────────────────────────────────

  class OceanContinentsFx extends Fx {
    appliesTo(cfg) { return cfg.pType === 'ocean'; }
    render(ctx, cfg, cx, cy, R, t) {
      const rotSpd = (parseFloat(cfg.pRot) || 4) * 0.002;
      fx.Blobs.draw(ctx, {
        cx, cy, R, t,
        color: 'rgba(80,140,50,0.5)',
        count: 5,
        driftSpeed: rotSpd,
      });
    }
  }

  class LavaCracksFx extends Fx {
    appliesTo(cfg) { return cfg.pType === 'lava'; }
    render(ctx, cfg, cx, cy, R, t) {
      fx.Crack.draw(ctx, {
        cx, cy, R, t,
        color: '#FFA000',
        count: 10,
      });
    }
  }

  class LavaPoolsFx extends Fx {
    appliesTo(cfg) { return cfg.pType === 'lava'; }
    render(ctx, cfg, cx, cy, R, t) {
      // Ported from legacy : 4 small bright orange pools that pulse.
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, R, 0, Math.PI * 2);
      ctx.clip();
      for (let i = 0; i < 4; i++) {
        const px = cx + Math.sin(i * 2.4) * R * 0.55;
        const py = cy + Math.cos(i * 3.1) * R * 0.55;
        const pr = R * 0.06 + Math.sin(t * 2 + i) * R * 0.02;
        ctx.fillStyle = `rgba(255,${Math.floor(80 + Math.sin(t * 3 + i) * 60)},0,0.7)`;
        ctx.beginPath();
        ctx.arc(px, py, pr, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
  }

  class AlienBioFx extends Fx {
    appliesTo(cfg) { return cfg.pType === 'alien'; }
    render(ctx, cfg, cx, cy, R, t) {
      const rotSpd = (parseFloat(cfg.pRot) || 4) * 0.002;
      fx.Bioluminescence.draw(ctx, {
        cx, cy, R, t,
        count: 20,
        driftSpeed: rotSpd,
      });
    }
  }

  class DarkTendrilsFx extends Fx {
    appliesTo(cfg) { return cfg.pType === 'dark'; }
    render(ctx, cfg, cx, cy, R, t) {
      fx.EnergyTendrils.draw(ctx, {
        cx, cy, R, t,
        color: 'rgba(120,0,200,0.2)',
        count: 8,
      });
    }
  }

  class IceCapsExtraFx extends Fx {
    appliesTo(cfg) { return cfg.pType === 'ice'; }
    render(ctx, cfg, cx, cy, R) {
      // South polar cap (the engine's _renderBody only draws the north one).
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, R, 0, Math.PI * 2);
      ctx.clip();
      ctx.fillStyle = 'rgba(230,245,255,0.5)';
      ctx.beginPath();
      ctx.ellipse(cx, cy + R - R * 0.12, R * 0.35, R * 0.14, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  // ── Ring FX (substitutes for non-solid ring types) ──────────────────
  // The engine's _renderRings only handles 'solid' rings (gradient stroke).
  // For 'dust' / 'crystal' / 'debris', we draw OVER the body using the
  // ring geometry. front=false → behind planet, true → in front. Since
  // the registry runs after the body, we treat both halves at once.

  function _drawRingsArc(ctx, cfg, cx, cy, R, t, half, primitive) {
    const rCount = parseInt(cfg.rCount, 10) || 0;
    if (!rCount) return;
    const thick = parseFloat(cfg.rThick) || 14;
    const gap   = parseFloat(cfg.rGap)   || 8;
    const tilt  = ((parseFloat(cfg.rTilt) || 22) * Math.PI) / 180;
    const scaleY = Math.sin(tilt);
    const color = cfg.rCol || '#A08050';
    const alpha = (parseFloat(cfg.rAlpha) || 60) / 100;

    // Same convention as Planet._renderRings (engine, post-fix) :
    //   'back'  = far half  = TOP of the ellipse (-PI to 0)
    //   'front' = near half = BOTTOM of the ellipse (0 to PI)
    const startAng = (half === 'back') ? -Math.PI : 0;
    const sweep    = Math.PI;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(1, scaleY);
    for (let ri = 0; ri < rCount; ri++) {
      const inner = R + gap * 1.5 + ri * (thick + gap);
      const a     = alpha * (1 - ri * 0.12);
      primitive(ctx, { cx: 0, cy: 0, innerR: inner, thick, color, alpha: a, startAng, sweep, t, seedOffset: ri });
    }
    ctx.restore();
  }

  // ── Helper : a tiny base for ring FX so we don't repeat the appliesTo
  //            and render boilerplate three times.
  function _ringFxClass(rType, half, scopeName, primitive) {
    return class extends Fx {
      get scope() { return scopeName; }
      appliesTo(cfg) {
        return cfg.rType === rType && (parseInt(cfg.rCount, 10) || 0) > 0;
      }
      render(ctx, cfg, cx, cy, R, t) {
        _drawRingsArc(ctx, cfg, cx, cy, R, t, half, primitive);
      }
    };
  }
  const RingDustBackFx     = _ringFxClass('dust',    'back',  'outside_back', (c, o) => fx.DustCloud.draw(c, o));
  const RingDustFrontFx    = _ringFxClass('dust',    'front', 'outside',      (c, o) => fx.DustCloud.draw(c, o));
  const RingCrystalBackFx  = _ringFxClass('crystal', 'back',  'outside_back', (c, o) => fx.CrystalShards.draw(c, o));
  const RingCrystalFrontFx = _ringFxClass('crystal', 'front', 'outside',      (c, o) => fx.CrystalShards.draw(c, o));
  const RingDebrisBackFx   = _ringFxClass('debris',  'back',  'outside_back', (c, o) => fx.DebrisField.draw(c, o));
  const RingDebrisFrontFx  = _ringFxClass('debris',  'front', 'outside',      (c, o) => fx.DebrisField.draw(c, o));

  // ── Moon extras (orbit lines + craters on each moon) ────────────────

  class MoonOrbitFx extends Fx {
    get scope() { return 'outside_back'; }
    appliesTo(cfg) {
      return (parseInt(cfg.mCount, 10) || 0) > 0 && (parseFloat(cfg.mOrbit) || 0) > 0;
    }
    render(ctx, cfg, cx, cy, R) {
      const mCount = parseInt(cfg.mCount, 10);
      const mDist  = parseFloat(cfg.mDist) || 90;
      const mTilt  = ((parseFloat(cfg.mTilt) || 5) * Math.PI) / 180;
      const orbV   = parseFloat(cfg.mOrbit) || 0;
      for (let i = 0; i < mCount; i++) {
        const dist = mDist * (0.75 + i * 0.22);
        fx.OrbitEllipse.draw(ctx, {
          cx, cy, dist,
          tilt: mTilt + i * 0.15,
          color: `rgba(80,130,200,${orbV * 0.015})`,
          lineWidth: 0.5,
        });
      }
    }
  }

  class MoonCratersFx extends Fx {
    get scope() { return 'outside'; }
    appliesTo(cfg) { return (parseInt(cfg.mCount, 10) || 0) > 0; }
    render(ctx, cfg, cx, cy, R, t) {
      // Re-walk the moon positions (mirroring Planet._renderMoons) and
      // overlay 3 small craters on each.
      const mCount = parseInt(cfg.mCount, 10);
      const mSize  = parseFloat(cfg.mSize)  || 6;
      const mDist  = parseFloat(cfg.mDist)  || 90;
      const mSpd   = (parseFloat(cfg.mSpeed) || 3) * 0.008;
      const mTilt  = ((parseFloat(cfg.mTilt) || 5) * Math.PI) / 180;
      for (let i = 0; i < mCount; i++) {
        const ang  = t * mSpd * (1 - i * 0.12) + i * (Math.PI * 2 / mCount);
        const dist = mDist * (0.75 + i * 0.22);
        const mx   = cx + Math.cos(ang) * dist;
        const my   = cy + Math.sin(ang) * dist * Math.cos(mTilt + i * 0.15);
        const sz   = mSize * (1 - i * 0.08);
        for (let c = 0; c < 3; c++) {
          const ca  = c / 3 * Math.PI * 2 + i;
          const cr  = sz * 0.18;
          const cpx = mx + Math.cos(ca) * sz * 0.5;
          const cpy = my + Math.sin(ca) * sz * 0.5;
          ctx.strokeStyle = 'rgba(0,0,0,0.25)';
          ctx.lineWidth   = 0.5;
          ctx.beginPath();
          ctx.arc(cpx, cpy, cr, 0, Math.PI * 2);
          ctx.stroke();
        }
      }
    }
  }

  // ── Public API : populate a PlanetFxRegistry ────────────────────────

  function populateGalaxtarusPlanetFx(registry) {
    if (!registry || typeof registry.register !== 'function') {
      console.warn('[galaxtarus_planet_fx] populate called with an invalid registry');
      return;
    }
    // Order = render order. Body / atmosphere are drawn around this list
    // by Planet._renderBody (FX called between body and atmosphere rim).
    registry.register(new OceanContinentsFx());
    registry.register(new LavaCracksFx());
    registry.register(new LavaPoolsFx());
    registry.register(new AlienBioFx());
    registry.register(new DarkTendrilsFx());
    registry.register(new IceCapsExtraFx());
    // Ring substitutes (only fire when cfg.rType matches). Each ring type
    // ships TWO FX instances : one for the far half (scope='outside_back',
    // drawn before the body so it gets occluded) and one for the near
    // half (scope='outside', drawn over everything).
    registry.register(new RingDustBackFx());
    registry.register(new RingCrystalBackFx());
    registry.register(new RingDebrisBackFx());
    registry.register(new RingDustFrontFx());
    registry.register(new RingCrystalFrontFx());
    registry.register(new RingDebrisFrontFx());
    // Moon extras : orbits go behind the planet (outside_back),
    // craters are tiny features on the moon body (outside, on top).
    registry.register(new MoonOrbitFx());
    registry.register(new MoonCratersFx());
  }

  // Expose the populate function (no auto-instance — règle 14).
  window.GALAXTARUS = window.GALAXTARUS || {};
  window.GALAXTARUS.assets = window.GALAXTARUS.assets || {};
  window.GALAXTARUS.assets.populateGalaxtarusPlanetFx = populateGalaxtarusPlanetFx;
})();
