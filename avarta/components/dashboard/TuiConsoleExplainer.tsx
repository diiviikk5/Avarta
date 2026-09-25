"use client";

import Image from "next/image";
import { Terminal, Cpu, Database, Activity, ShieldAlert, Sparkles, Sliders, Zap, CheckCircle2, ArrowRight } from "lucide-react";

export default function TuiConsoleExplainer() {
  return (
    <div className="space-y-8 p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Top Banner Header */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-[#141210] via-[#1a1715] to-[#141210] border border-cyan-900/40 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/80 border border-cyan-800/80 text-cyan-400 text-xs font-mono font-medium mb-3">
              <Terminal size={13} />
              <span>Avarta Mission Control Terminal Engine</span>
            </div>
            <h1 className="text-2xl lg:text-3xl font-serif text-white tracking-tight">
              Operational TUI & Terminal Telemetry Console
            </h1>
            <p className="text-stone-300 text-sm mt-2 max-w-3xl leading-relaxed">
              High-throughput, zero-latency curses terminal interface built directly on Rich and Textual for meteorologists, NDMA emergency operators, and HPC clusters processing live NCMRWF & IMD binary streams.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-stone-900 border border-stone-800 text-xs font-mono text-cyan-300">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
              CLI: <code className="text-white">python tui/app.py</code>
            </span>
            <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-stone-900 border border-stone-800 text-xs font-mono text-emerald-400">
              <CheckCircle2 size={13} />
              Theme Switcher Enabled
            </span>
          </div>
        </div>
      </div>

      {/* Embedded High-Resolution TUI Screenshot */}
      <div className="rounded-2xl border border-cyan-900/50 bg-[#07090e] p-3 shadow-2xl overflow-hidden relative group">
        <div className="flex items-center justify-between px-4 py-2.5 bg-[#0f141c] rounded-xl border border-cyan-900/40 text-xs font-mono text-stone-400 mb-3">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-red-500/80 inline-block" />
            <span className="w-3 h-3 rounded-full bg-yellow-500/80 inline-block" />
            <span className="w-3 h-3 rounded-full bg-emerald-500/80 inline-block" />
            <span className="ml-2 text-cyan-400 font-semibold">AVARTA_OPERATIONAL_TUI // STAGE-1 + STAGE-2 TELEMETRY</span>
          </div>
          <span className="text-stone-500 text-[11px]">80x24 / ANSI Cyber Terminal Matrix</span>
        </div>

        <div className="relative w-full rounded-xl overflow-hidden border border-stone-800/80 bg-black">
          <img
            src="/tui_mission_control.png"
            alt="Avarta Mission Control Terminal UI Screenshot"
            className="w-full h-auto object-cover rounded-lg shadow-inner filter contrast-105"
          />
        </div>
        <p className="text-center text-xs font-mono text-cyan-400/80 mt-3">
          Live capture of Avarta TUI with Cyan High-Contrast Cyber palette running on Windows PowerShell.
        </p>
      </div>

      {/* Feature Architecture Matrix */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-stone-300 font-serif text-xl">
          <Sparkles className="text-cyan-400" size={20} />
          <h2>Deep-Dive: TUI Subsystems & Engineering Highlights</h2>
        </div>
        <p className="text-stone-400 text-sm">
          Every panel in the terminal interface corresponds to an active mathematical or operational module from SIH Problem Statement 26078:
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 pt-2">
          {/* 1. Cyber ASCII Banner & Theme Engine */}
          <div className="p-5 rounded-xl bg-[#121110] border border-stone-800 hover:border-cyan-700/60 transition-all space-y-3">
            <div className="w-9 h-9 rounded-lg bg-cyan-950/80 border border-cyan-800/80 flex items-center justify-center text-cyan-400">
              <Sliders size={18} />
            </div>
            <h3 className="text-white font-medium text-base">1. ASCII Banner & Dynamic Themes</h3>
            <p className="text-stone-400 text-xs leading-relaxed">
              Custom-rendered figlet ASCII typography. Interactive color scheme engine supporting 5 live palettes: <strong>Icy Cyan</strong> (default), <strong>Matrix Green</strong>, <strong>Solar Amber</strong>, <strong>Crimson Alert</strong>, and <strong>Cyberpunk Purple</strong>. Switchable in real-time with the <code className="text-cyan-300">[T]</code> hotkey.
            </p>
            <div className="pt-2 text-[11px] font-mono text-cyan-400/90 flex items-center gap-1.5">
              <span>Dynamic ANSI rendering via Rich library</span>
            </div>
          </div>

          {/* 2. Real-Time NWP Ingestion Stream */}
          <div className="p-5 rounded-xl bg-[#121110] border border-stone-800 hover:border-cyan-700/60 transition-all space-y-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-950/80 border border-emerald-800/80 flex items-center justify-center text-emerald-400">
              <Database size={18} />
            </div>
            <h3 className="text-white font-medium text-base">2. Multi-Model Ingestion Engine</h3>
            <p className="text-stone-400 text-xs leading-relaxed">
              Directly parses binary raster files like <code className="text-emerald-300">Rainfall_ind2025_rfp25.grd</code> (IMD 0.25° grid, 365 daily float32 slices), NCUM 12km deterministic forecasts, NEPS-G 33-member ensemble streams, and ERA5 30-year climatology norms.
            </p>
            <div className="pt-2 text-[11px] font-mono text-emerald-400/90 flex items-center gap-1.5">
              <span>Zero-copy NumPy memory mapping</span>
            </div>
          </div>

          {/* 3. Spatio-Temporal GNN Tracking Core */}
          <div className="p-5 rounded-xl bg-[#121110] border border-stone-800 hover:border-cyan-700/60 transition-all space-y-3">
            <div className="w-9 h-9 rounded-lg bg-sky-950/80 border border-sky-800/80 flex items-center justify-center text-sky-400">
              <Activity size={18} />
            </div>
            <h3 className="text-white font-medium text-base">3. 4D Threat Corridor Tracking</h3>
            <p className="text-stone-400 text-xs leading-relaxed">
              Spatio-Temporal Graph Neural Network continuously ingesting global NWP states to detect, cluster, and track extreme convective cells. Automatically generates dynamic 4D bounding boxes <code className="text-sky-300">[lat, lon, t]</code>, velocity vectors, and Extreme Forecast Index (EFI) metrics.
            </p>
            <div className="pt-2 text-[11px] font-mono text-sky-400/90 flex items-center gap-1.5">
              <span>Stage 1: Adaptive corridor extraction</span>
            </div>
          </div>

          {/* 4. Amplitude-Preserving Downscaler */}
          <div className="p-5 rounded-xl bg-[#121110] border border-stone-800 hover:border-cyan-700/60 transition-all space-y-3">
            <div className="w-9 h-9 rounded-lg bg-amber-950/80 border border-amber-800/80 flex items-center justify-center text-amber-400">
              <Zap size={18} />
            </div>
            <h3 className="text-white font-medium text-base">4. 12km → 5km Generative Core</h3>
            <p className="text-stone-400 text-xs leading-relaxed">
              Conditional residual downscaler trained using <code className="text-amber-300">ExtremeTailPreservationLoss</code>. Overcomes traditional CNN spectral smoothing by penalizing errors on 90th+ percentile deluges, retaining true localized peaks (e.g. 469.21 mm/day monsoon rain).
            </p>
            <div className="pt-2 text-[11px] font-mono text-amber-400/90 flex items-center gap-1.5">
              <span>Stage 2: 174,401 PyTorch parameters</span>
            </div>
          </div>

          {/* 5. Physics Conservation Guard */}
          <div className="p-5 rounded-xl bg-[#121110] border border-stone-800 hover:border-cyan-700/60 transition-all space-y-3">
            <div className="w-9 h-9 rounded-lg bg-teal-950/80 border border-teal-800/80 flex items-center justify-center text-teal-400">
              <Cpu size={18} />
            </div>
            <h3 className="text-white font-medium text-base">5. Navier-Stokes Physics Guard</h3>
            <p className="text-stone-400 text-xs leading-relaxed">
              Real-time conservation checker verifying total moisture mass continuity, non-negativity constraint (<code className="text-teal-300">precip &ge; 0</code>), and divergence dissipation tolerance (&le; 1.8%). Rejects unphysical artifacts before outputting downscaled arrays.
            </p>
            <div className="pt-2 text-[11px] font-mono text-teal-400/90 flex items-center gap-1.5">
              <span>Mass continuity: &Delta;M &le; 1.8%</span>
            </div>
          </div>

          {/* 6. Production Spatial Alerting & CAP 1.2 */}
          <div className="p-5 rounded-xl bg-[#121110] border border-stone-800 hover:border-cyan-700/60 transition-all space-y-3">
            <div className="w-9 h-9 rounded-lg bg-rose-950/80 border border-rose-800/80 flex items-center justify-center text-rose-400">
              <ShieldAlert size={18} />
            </div>
            <h3 className="text-white font-medium text-base">6. CAP 1.2 Alerting & NDMA Protocol</h3>
            <p className="text-stone-400 text-xs leading-relaxed">
              Programmatic generation of OASIS Common Alerting Protocol (CAP v1.2) XML and GeoJSON polygons. Provides district-level severity, urgency, certainty, and specific mitigation guidance for emergency dispatchers.
            </p>
            <div className="pt-2 text-[11px] font-mono text-rose-400/90 flex items-center gap-1.5">
              <span>Standard: ITU-T X.1303 / OASIS CAP-1.2</span>
            </div>
          </div>
        </div>
      </div>

      {/* Interactive Hotkey Matrix Guide */}
      <div className="p-6 rounded-2xl bg-[#11100e] border border-stone-800 space-y-4">
        <h3 className="text-white font-medium text-base flex items-center gap-2">
          <Terminal size={17} className="text-cyan-400" />
          Interactive Terminal Keybindings (TUI Control Matrix)
        </h3>
        <p className="text-stone-400 text-xs">
          While running <code className="text-cyan-300 bg-stone-900 px-2 py-0.5 rounded">python tui/app.py</code> in your shell, use the following interactive hotkeys:
        </p>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 pt-1">
          <div className="p-3 rounded-lg bg-stone-900/80 border border-stone-800 text-center">
            <span className="px-2 py-1 bg-stone-800 text-cyan-300 font-mono text-xs rounded font-bold">T</span>
            <p className="text-white text-xs mt-2 font-medium">Cycle Theme</p>
            <p className="text-stone-400 text-[10px]">Switch ASCII pallete</p>
          </div>

          <div className="p-3 rounded-lg bg-stone-900/80 border border-stone-800 text-center">
            <span className="px-2 py-1 bg-stone-800 text-emerald-300 font-mono text-xs rounded font-bold">R</span>
            <p className="text-white text-xs mt-2 font-medium">Refresh Ingest</p>
            <p className="text-stone-400 text-[10px]">Re-read IMD slices</p>
          </div>

          <div className="p-3 rounded-lg bg-stone-900/80 border border-stone-800 text-center">
            <span className="px-2 py-1 bg-stone-800 text-amber-300 font-mono text-xs rounded font-bold">D</span>
            <p className="text-white text-xs mt-2 font-medium">Downscale</p>
            <p className="text-stone-400 text-[10px]">Trigger 12km &rarr; 5km</p>
          </div>

          <div className="p-3 rounded-lg bg-stone-900/80 border border-stone-800 text-center">
            <span className="px-2 py-1 bg-stone-800 text-rose-300 font-mono text-xs rounded font-bold">A</span>
            <p className="text-white text-xs mt-2 font-medium">Dispatch CAP</p>
            <p className="text-stone-400 text-[10px]">Emit NDMA GeoJSON</p>
          </div>

          <div className="p-3 rounded-lg bg-stone-900/80 border border-stone-800 text-center">
            <span className="px-2 py-1 bg-stone-800 text-sky-300 font-mono text-xs rounded font-bold">1 - 5</span>
            <p className="text-white text-xs mt-2 font-medium">Jump Stage</p>
            <p className="text-stone-400 text-[10px]">Inspect subsystems</p>
          </div>

          <div className="p-3 rounded-lg bg-stone-900/80 border border-stone-800 text-center">
            <span className="px-2 py-1 bg-stone-800 text-red-400 font-mono text-xs rounded font-bold">Q</span>
            <p className="text-white text-xs mt-2 font-medium">Quit TUI</p>
            <p className="text-stone-400 text-[10px]">Graceful exit</p>
          </div>
        </div>
      </div>
    </div>
  );
}
