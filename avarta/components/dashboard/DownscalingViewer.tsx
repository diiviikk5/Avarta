"use client";

import { useState } from "react";
import { DownscalingGridData } from "@/types/threat";
import { Sparkles, ArrowRight, Check } from "lucide-react";

interface DownscalingViewerProps {
  data: DownscalingGridData;
}

export default function DownscalingViewer({ data }: DownscalingViewerProps) {
  const [sliderPosition, setSliderPosition] = useState(50);

  // High-contrast clean scientific color palette
  const getColor = (val: number, maxVal: number) => {
    const ratio = Math.min(1, Math.max(0, val / maxVal));
    if (ratio < 0.08) return "rgba(28, 25, 23, 0.7)";
    if (ratio < 0.25) return "#38bdf8";
    if (ratio < 0.45) return "#34d399";
    if (ratio < 0.65) return "#fbbf24";
    if (ratio < 0.85) return "#f43f5e";
    return "#ffffff";
  };

  const maxPeak = Math.max(data.coarse_12km_peak, data.avarta_5km_peak);

  return (
    <div className="p-6 sm:p-10 space-y-8 text-stone-100 max-w-5xl mx-auto">
      {/* Editorial Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-6 border-b border-stone-800/80">
        <div>
          <span className="text-[10px] font-mono uppercase tracking-widest text-stone-500 block mb-1">
            Stage 2 · Physics-Guided Super Resolution
          </span>
          <h2
            className="text-2xl sm:text-3xl font-light text-white tracking-tight"
            style={{ fontFamily: "var(--font-serif)" }}
          >
            12 km → 5 km Convective Downscaling
          </h2>
          <p className="text-xs text-stone-400 mt-1">
            Overcomes spectral smoothing in global ensembles to recover extreme localized peaks.
          </p>
        </div>

        {/* Hero Stat Highlight */}
        <div className="flex items-center gap-3 bg-stone-900/90 border border-stone-800 px-4 py-2 rounded-xl shrink-0">
          <div>
            <span className="text-[9px] font-mono text-stone-500 uppercase block">Extreme Core Restored</span>
            <span className="text-lg font-light text-white font-serif">
              {data.coarse_12km_peak} → <span className="text-emerald-400 font-normal">{data.avarta_5km_peak} {data.unit}</span>
            </span>
          </div>
          <span className="text-xs font-mono font-medium text-emerald-400 bg-emerald-950/60 border border-emerald-800/40 px-2 py-0.5 rounded-full">
            +{(data.amplitude_preservation_ratio * 100).toFixed(0)}%
          </span>
        </div>
      </div>

      {/* Visual Comparison Grid (Clean & Direct) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
        {/* Left: 12 km Coarse Global NWP */}
        <div className="bg-[#141210] p-6 rounded-2xl border border-stone-800/80 flex flex-col items-center">
          <div className="w-full flex items-center justify-between mb-4">
            <span className="text-xs font-mono uppercase text-stone-400">Coarse Global NWP (12 km)</span>
            <span className="text-[10px] font-mono text-stone-500 bg-stone-900 px-2 py-0.5 rounded">
              Smoothed Peak: {data.coarse_12km_peak} {data.unit}
            </span>
          </div>

          <div className="grid grid-cols-8 gap-1.5 w-full max-w-[280px] aspect-square bg-[#0c0a09] p-4 rounded-xl border border-stone-800/80 shadow-inner">
            {data.coarse_matrix.map((row, r) =>
              row.map((val, c) => (
                <div
                  key={`coarse-${r}-${c}`}
                  className="rounded-xs transition-opacity hover:opacity-80"
                  style={{ backgroundColor: getColor(val, maxPeak) }}
                  title={`Coarse: ${val} ${data.unit}`}
                />
              ))
            )}
          </div>

          <p className="text-xs text-stone-500 text-center mt-4">
            Convective peak is diluted across the 144 km² coarse cell.
          </p>
        </div>

        {/* Right: Avarta 5 km Generative Diffusion */}
        <div className="bg-[#141210] p-6 rounded-2xl border border-white/30 shadow-xl shadow-black/50 flex flex-col items-center relative">
          <div className="w-full flex items-center justify-between mb-4">
            <div className="flex items-center gap-1.5 text-xs font-mono uppercase text-white font-medium">
              <Sparkles size={12} className="text-sky-400" />
              <span>Avarta 5 km Reconstruction</span>
            </div>
            <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/70 border border-emerald-800/50 px-2 py-0.5 rounded">
              True Peak: {data.avarta_5km_peak} {data.unit}
            </span>
          </div>

          <div className="grid grid-cols-20 gap-[1px] w-full max-w-[280px] aspect-square bg-[#0c0a09] p-4 rounded-xl border border-stone-700 shadow-inner">
            {data.downscaled_matrix.map((row, r) =>
              row.map((val, c) => (
                <div
                  key={`fine-${r}-${c}`}
                  className="transition-transform hover:scale-125 hover:z-10"
                  style={{ backgroundColor: getColor(val, maxPeak) }}
                  title={`5km Cell: ${val} ${data.unit}`}
                />
              ))
            )}
          </div>

          <p className="text-xs text-emerald-400 text-center mt-4 font-medium flex items-center justify-center gap-1">
            <Check size={13} />
            <span>High-frequency convective core and true physical gradient restored.</span>
          </p>
        </div>
      </div>

      {/* Palette Legend */}
      <div className="flex items-center justify-between p-3.5 bg-stone-900/50 rounded-xl border border-stone-800 text-xs text-stone-400">
        <span className="text-[10px] font-mono uppercase">Intensity Gradient:</span>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono">0</span>
          <div className="flex items-center gap-1">
            <span className="w-4 h-3 rounded-xs bg-stone-900 border border-stone-800" />
            <span className="w-4 h-3 rounded-xs bg-[#38bdf8]" />
            <span className="w-4 h-3 rounded-xs bg-[#34d399]" />
            <span className="w-4 h-3 rounded-xs bg-[#fbbf24]" />
            <span className="w-4 h-3 rounded-xs bg-[#f43f5e]" />
            <span className="w-4 h-3 rounded-xs bg-white" />
          </div>
          <span className="text-[10px] font-mono text-white">{maxPeak} {data.unit}</span>
        </div>
      </div>
    </div>
  );
}
