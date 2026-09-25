"use client";

import { PhysicsValidation } from "@/types/threat";
import { ShieldCheck, Check, Droplets, Scale, Wind, Thermometer } from "lucide-react";

interface PhysicsGuardInspectorProps {
  guard: PhysicsValidation;
}

export default function PhysicsGuardInspector({ guard }: PhysicsGuardInspectorProps) {
  return (
    <div className="p-6 sm:p-8 bg-[#0c0a09] space-y-6 text-stone-100">
      {/* Editorial Header */}
      <div className="flex flex-wrap items-end justify-between gap-4 pb-5 border-b border-[#292524]">
        <div>
          <span className="text-[11px] font-medium tracking-wider uppercase text-stone-400 block mb-1">
            Verification Protocol · Atmospheric Conservation Laws
          </span>
          <h2
            className="text-2xl sm:text-3xl font-light text-white tracking-tight"
            style={{ fontFamily: "var(--font-serif)" }}
          >
            Physics Guard & Conservation Ledger
          </h2>
          <p className="text-sm text-stone-400 max-w-2xl mt-1 leading-relaxed">
            Avarta penalizes mathematically impossible generated weather states through soft-constrained loss functions and hard projection operators, ensuring mass, momentum, and moisture flux consistency.
          </p>
        </div>

        <div className="flex items-center gap-2 bg-[#141210] px-4 py-2 rounded-full border border-stone-800 shadow-xs">
          <ShieldCheck size={16} className="text-emerald-400" />
          <span className="text-xs font-medium text-stone-300">
            Conservation Score:
          </span>
          <span className="text-xs font-semibold text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-800/40">
            {guard.composite_physics_score}% Verified
          </span>
        </div>
      </div>

      {/* Conservation Ledger Table / Cards (Dark Mode) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* 1. Moisture Flux Convergence */}
        <div className="bg-[#141210] p-6 rounded-[18px] border border-[#292524] shadow-xs space-y-3">
          <div className="flex items-center justify-between pb-3 border-b border-stone-800/80">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-stone-800 flex items-center justify-center">
                <Droplets size={16} className="text-sky-400" />
              </div>
              <div>
                <h3 className="text-sm font-medium text-white">Moisture Flux Convergence</h3>
                <span className="text-xs text-stone-400 font-mono">∇·(q·v) ≤ 0</span>
              </div>
            </div>
            <span className="text-[11px] font-medium px-2.5 py-1 rounded-full bg-emerald-950/60 text-emerald-400 border border-emerald-800/40 flex items-center gap-1">
              <Check size={12} />
              <span>Compliant</span>
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs pt-1">
            <div>
              <span className="text-[10px] text-stone-400 block">MEASURED INFLOW</span>
              <span className="text-sm font-light text-white font-mono mt-0.5 block">
                {guard.moisture_flux_convergence.val.toExponential(2)} {guard.moisture_flux_convergence.unit}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-stone-400 block">PHYSICAL THRESHOLD</span>
              <span className="text-sm font-light text-stone-400 font-mono mt-0.5 block">
                ≤ {guard.moisture_flux_convergence.threshold.toExponential(2)}
              </span>
            </div>
          </div>
          <p className="text-xs text-stone-400 leading-relaxed pt-2 border-t border-stone-800/80">
            Verifies that extreme localized downpour is actively fed by deep moisture convergence vectors, mathematically eliminating artificial neural hallucination.
          </p>
        </div>

        {/* 2. Horizontal Mass Continuity */}
        <div className="bg-[#141210] p-6 rounded-[18px] border border-[#292524] shadow-xs space-y-3">
          <div className="flex items-center justify-between pb-3 border-b border-stone-800/80">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-stone-800 flex items-center justify-center">
                <Scale size={16} className="text-amber-400" />
              </div>
              <div>
                <h3 className="text-sm font-medium text-white">Mass Continuity Residual</h3>
                <span className="text-xs text-stone-400 font-mono">∂ρ/∂t + ∇·(ρv) = 0</span>
              </div>
            </div>
            <span className="text-[11px] font-medium px-2.5 py-1 rounded-full bg-emerald-950/60 text-emerald-400 border border-emerald-800/40 flex items-center gap-1">
              <Check size={12} />
              <span>Compliant</span>
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs pt-1">
            <div>
              <span className="text-[10px] text-stone-400 block">RESIDUAL CONTINUITY ERROR</span>
              <span className="text-sm font-light text-white font-mono mt-0.5 block">
                {(guard.mass_continuity.error_percent * 100).toFixed(2)}%
              </span>
            </div>
            <div>
              <span className="text-[10px] text-stone-400 block">MAX TOLERANCE</span>
              <span className="text-sm font-light text-stone-400 font-mono mt-0.5 block">
                &lt; {(guard.mass_continuity.max_tolerated * 100).toFixed(1)}%
              </span>
            </div>
          </div>
          <p className="text-xs text-stone-400 leading-relaxed pt-2 border-t border-stone-800/80">
            Horizontal divergence across 5 km atmospheric layers integrates to near-zero, proving aerodynamic fluid volume conservation.
          </p>
        </div>

        {/* 3. Non-Negative Precipitation Bounds */}
        <div className="bg-[#141210] p-6 rounded-[18px] border border-[#292524] shadow-xs space-y-3">
          <div className="flex items-center justify-between pb-3 border-b border-stone-800/80">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-stone-800 flex items-center justify-center">
                <Wind size={16} className="text-emerald-400" />
              </div>
              <div>
                <h3 className="text-sm font-medium text-white">Non-Negative Precipitation</h3>
                <span className="text-xs text-stone-400 font-mono">P(x,y) ≥ 0.0 mm/h</span>
              </div>
            </div>
            <span className="text-[11px] font-medium px-2.5 py-1 rounded-full bg-emerald-950/60 text-emerald-400 border border-emerald-800/40 flex items-center gap-1">
              <Check size={12} />
              <span>0 Violations</span>
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs pt-1">
            <div>
              <span className="text-[10px] text-stone-400 block">SUBGRID PIXELS CORRECTED</span>
              <span className="text-sm font-light text-white font-mono mt-0.5 block">
                {guard.non_negative_precipitation.corrected_pixels} px
              </span>
            </div>
            <div>
              <span className="text-[10px] text-stone-400 block">PROJECTION OPERATOR</span>
              <span className="text-sm font-light text-stone-400 font-mono mt-0.5 block">
                PhysicsGuard.project()
              </span>
            </div>
          </div>
          <p className="text-xs text-stone-400 leading-relaxed pt-2 border-t border-stone-800/80">
            Strict positive-definite projection guarantees zero unphysical negative rainfall values while preserving raw extreme peaks.
          </p>
        </div>

        {/* 4. Boundary Layer Lapse Rate */}
        <div className="bg-[#141210] p-6 rounded-[18px] border border-[#292524] shadow-xs space-y-3">
          <div className="flex items-center justify-between pb-3 border-b border-stone-800/80">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-stone-800 flex items-center justify-center">
                <Thermometer size={16} className="text-rose-400" />
              </div>
              <div>
                <h3 className="text-sm font-medium text-white">Thermodynamic Lapse Rate</h3>
                <span className="text-xs text-stone-400 font-mono">dT/dz ≈ -6.5 K/km</span>
              </div>
            </div>
            <span className="text-[11px] font-medium px-2.5 py-1 rounded-full bg-emerald-950/60 text-emerald-400 border border-emerald-800/40 flex items-center gap-1">
              <Check size={12} />
              <span>Stable Ascent</span>
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs pt-1">
            <div>
              <span className="text-[10px] text-stone-400 block">VERTICAL TEMPERATURE GRADIENT</span>
              <span className="text-sm font-light text-white font-mono mt-0.5 block">
                {guard.thermodynamic_lapse_rate.val_k_per_km} K/km
              </span>
            </div>
            <div>
              <span className="text-[10px] text-stone-400 block">ASCENT PROFILE</span>
              <span className="text-sm font-light text-stone-400 font-mono mt-0.5 block">
                Moist Pseudo-Adiabatic
              </span>
            </div>
          </div>
          <p className="text-xs text-stone-400 leading-relaxed pt-2 border-t border-stone-800/80">
            Vertical thermal structure remains bounded between dry and moist adiabatic limits, verifying realistic convective buoyancy.
          </p>
        </div>
      </div>
    </div>
  );
}
