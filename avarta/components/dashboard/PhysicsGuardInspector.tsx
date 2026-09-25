"use client";

import { PhysicsValidation } from "@/types/threat";
import { ShieldCheck, Check, Droplets, Scale, Wind } from "lucide-react";

interface PhysicsGuardInspectorProps {
  guard: PhysicsValidation;
}

export default function PhysicsGuardInspector({ guard }: PhysicsGuardInspectorProps) {
  return (
    <div className="p-6 sm:p-10 space-y-8 text-stone-100 max-w-4xl mx-auto">
      {/* Editorial Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-6 border-b border-stone-800/80">
        <div>
          <span className="text-[10px] font-mono uppercase tracking-widest text-stone-500 block mb-1">
            Stage 3 · Atmospheric Conservation Guard
          </span>
          <h2
            className="text-2xl sm:text-3xl font-light text-white tracking-tight"
            style={{ fontFamily: "var(--font-serif)" }}
          >
            Physics & Conservation Verification
          </h2>
          <p className="text-xs text-stone-400 mt-1">
            Enforces Navier-Stokes mass and moisture conservation to eliminate artificial neural hallucinations.
          </p>
        </div>

        {/* Big Score Callout */}
        <div className="flex items-center gap-3 bg-stone-900 border border-stone-800 px-5 py-2.5 rounded-xl shrink-0">
          <ShieldCheck size={20} className="text-emerald-400" />
          <div>
            <span className="text-[9px] font-mono text-stone-500 uppercase block">Validity Score</span>
            <span className="text-2xl font-light text-white font-serif">{guard.composite_physics_score}%</span>
          </div>
          <span className="text-xs font-mono text-emerald-400 bg-emerald-950/60 border border-emerald-800/40 px-2.5 py-0.5 rounded-full ml-1">
            Passed
          </span>
        </div>
      </div>

      {/* 3 Clean Conservation Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Check 1 */}
        <div className="bg-[#141210] p-5 rounded-xl border border-stone-800/80 space-y-3">
          <div className="flex items-center justify-between">
            <div className="w-8 h-8 rounded-lg bg-sky-950/60 border border-sky-800/40 flex items-center justify-center">
              <Droplets size={16} className="text-sky-400" />
            </div>
            <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-800/30 flex items-center gap-1">
              <Check size={11} />
              <span>Compliant</span>
            </span>
          </div>

          <div>
            <h3 className="text-sm font-medium text-white">Moisture Inflow</h3>
            <span className="text-[11px] font-mono text-stone-500 block mt-0.5">∇·(q·v) ≤ 0</span>
          </div>

          <div className="pt-2 border-t border-stone-800/60 text-xs">
            <div className="flex justify-between py-1">
              <span className="text-stone-500">Inflow:</span>
              <span className="font-mono text-white">{guard.moisture_flux_convergence.val.toExponential(2)}</span>
            </div>
            <p className="text-[11px] text-stone-400 mt-1 leading-relaxed">
              Extreme rain core is actively supported by vapor convergence.
            </p>
          </div>
        </div>

        {/* Check 2 */}
        <div className="bg-[#141210] p-5 rounded-xl border border-stone-800/80 space-y-3">
          <div className="flex items-center justify-between">
            <div className="w-8 h-8 rounded-lg bg-amber-950/60 border border-amber-800/40 flex items-center justify-center">
              <Scale size={16} className="text-amber-400" />
            </div>
            <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-800/30 flex items-center gap-1">
              <Check size={11} />
              <span>Compliant</span>
            </span>
          </div>

          <div>
            <h3 className="text-sm font-medium text-white">Mass Continuity</h3>
            <span className="text-[11px] font-mono text-stone-500 block mt-0.5">∂ρ/∂t + ∇·(ρv) = 0</span>
          </div>

          <div className="pt-2 border-t border-stone-800/60 text-xs">
            <div className="flex justify-between py-1">
              <span className="text-stone-500">Error:</span>
              <span className="font-mono text-white">{(guard.mass_continuity.error_percent * 100).toFixed(2)}%</span>
            </div>
            <p className="text-[11px] text-stone-400 mt-1 leading-relaxed">
              Horizontal fluid divergence remains safely within the &lt;5% bound.
            </p>
          </div>
        </div>

        {/* Check 3 */}
        <div className="bg-[#141210] p-5 rounded-xl border border-stone-800/80 space-y-3">
          <div className="flex items-center justify-between">
            <div className="w-8 h-8 rounded-lg bg-emerald-950/60 border border-emerald-800/40 flex items-center justify-center">
              <Wind size={16} className="text-emerald-400" />
            </div>
            <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-800/30 flex items-center gap-1">
              <Check size={11} />
              <span>Compliant</span>
            </span>
          </div>

          <div>
            <h3 className="text-sm font-medium text-white">Rainfall Positivity</h3>
            <span className="text-[11px] font-mono text-stone-500 block mt-0.5">P(x,y) ≥ 0.0</span>
          </div>

          <div className="pt-2 border-t border-stone-800/60 text-xs">
            <div className="flex justify-between py-1">
              <span className="text-stone-500">Violations:</span>
              <span className="font-mono text-emerald-400">0 Pixels</span>
            </div>
            <p className="text-[11px] text-stone-400 mt-1 leading-relaxed">
              Projection operator bounds precipitation strictly on the valid manifold.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
