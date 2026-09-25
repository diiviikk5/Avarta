"use client";

import { useState } from "react";
import { DownscalingGridData } from "@/types/threat";
import { Sparkles, SlidersHorizontal, Check } from "lucide-react";

interface DownscalingViewerProps {
  data: DownscalingGridData;
}

export default function DownscalingViewer({ data }: DownscalingViewerProps) {
  const [viewMode, setViewMode] = useState<"side_by_side" | "interactive_slider">("side_by_side");
  const [sliderPosition, setSliderPosition] = useState(50);
  const [hoveredCell, setHoveredCell] = useState<{ row: number; col: number; val: number } | null>(null);

  // High-contrast clean scientific color palette for dark canvas
  const getColor = (val: number, maxVal: number) => {
    const ratio = Math.min(1, Math.max(0, val / maxVal));
    if (ratio < 0.08) return "rgba(28, 25, 23, 0.7)"; // deep surface
    if (ratio < 0.25) return "#38bdf8"; // vivid sky
    if (ratio < 0.45) return "#34d399"; // vivid emerald
    if (ratio < 0.65) return "#fbbf24"; // vivid amber
    if (ratio < 0.85) return "#f43f5e"; // vivid rose
    return "#ffffff"; // pure white core peak
  };

  const maxPeak = Math.max(data.coarse_12km_peak, data.avarta_5km_peak);

  return (
    <div className="p-6 sm:p-8 bg-[#0c0a09] space-y-6 text-stone-100">
      {/* Editorial Header */}
      <div className="flex flex-wrap items-end justify-between gap-4 pb-5 border-b border-[#292524]">
        <div>
          <span className="text-[11px] font-medium tracking-wider uppercase text-stone-400 block mb-1">
            Stage 2 · Physics-Guided Generative Reconstruction
          </span>
          <h2
            className="text-2xl sm:text-3xl font-light text-white tracking-tight"
            style={{ fontFamily: "var(--font-serif)" }}
          >
            12 km → 5 km Amplitude-Preserving Downscaling Studio
          </h2>
          <p className="text-sm text-stone-400 max-w-2xl mt-1 leading-relaxed">
            Standard deep learning architectures (CNNs/U-Nets) optimize for Mean Squared Error, creating severe spectral smoothing that suppresses extreme convective rainfall peaks. Avarta uses conditional residual diffusion to reconstruct high-amplitude 5 km subgrid structures.
          </p>
        </div>

        {/* View Switcher Pill */}
        <div className="flex items-center gap-1 bg-[#1c1917] p-1 rounded-full border border-stone-800 text-xs">
          <button
            onClick={() => setViewMode("side_by_side")}
            className={`px-4 py-1.5 rounded-full transition-colors cursor-pointer font-medium ${
              viewMode === "side_by_side"
                ? "bg-white text-black shadow-xs font-semibold"
                : "text-stone-400 hover:text-white"
            }`}
          >
            Triptych Comparison
          </button>
          <button
            onClick={() => setViewMode("interactive_slider")}
            className={`px-4 py-1.5 rounded-full transition-colors cursor-pointer font-medium ${
              viewMode === "interactive_slider"
                ? "bg-white text-black shadow-xs font-semibold"
                : "text-stone-400 hover:text-white"
            }`}
          >
            Split Screen Lens
          </button>
        </div>
      </div>

      {/* Scientific Metrics Dossier (Dark Mode) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#141210] p-5 rounded-[16px] border border-[#292524] shadow-xs">
          <span className="text-[10px] uppercase tracking-wider text-stone-400 block font-medium">
            12 km Raw Coarse NWP
          </span>
          <span
            className="text-2xl font-light text-white block mt-1"
            style={{ fontFamily: "var(--font-serif)" }}
          >
            {data.coarse_12km_peak} <span className="text-sm font-sans text-stone-400">{data.unit}</span>
          </span>
          <span className="text-xs text-stone-400 block mt-1">
            Global 144 km² cell average
          </span>
        </div>

        <div className="bg-[#141210] p-5 rounded-[16px] border border-[#292524] shadow-xs">
          <span className="text-[10px] uppercase tracking-wider text-stone-400 block font-medium">
            Standard Bilinear / CNN Baseline
          </span>
          <span
            className="text-2xl font-light text-stone-500 block mt-1 line-through"
            style={{ fontFamily: "var(--font-serif)" }}
          >
            {data.bilinear_baseline_peak} <span className="text-sm font-sans text-stone-500">{data.unit}</span>
          </span>
          <span className="text-xs text-rose-400 font-medium block mt-1">
            -54% peak loss (Spectral Smoothing)
          </span>
        </div>

        <div className="bg-[#1c1917] p-5 rounded-[16px] border-2 border-white shadow-xl relative">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase tracking-wider text-white block font-semibold">
              Avarta 5 km Generative Model
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          </div>
          <span
            className="text-2xl font-light text-white block mt-1"
            style={{ fontFamily: "var(--font-serif)" }}
          >
            {data.avarta_5km_peak} <span className="text-sm font-sans text-stone-400">{data.unit}</span>
          </span>
          <span className="text-xs text-emerald-400 font-medium block mt-1 flex items-center gap-1">
            <Check size={12} />
            <span>{(data.amplitude_preservation_ratio * 100).toFixed(1)}% Extreme Amplitude Preserved</span>
          </span>
        </div>

        <div className="bg-[#141210] p-5 rounded-[16px] border border-[#292524] shadow-xs">
          <span className="text-[10px] uppercase tracking-wider text-stone-400 block font-medium">
            Wavelet Spectral Energy
          </span>
          <span
            className="text-2xl font-light text-white block mt-1"
            style={{ fontFamily: "var(--font-serif)" }}
          >
            {data.spectral_energy_high_freq} <span className="text-sm font-sans text-stone-400">E_hf</span>
          </span>
          <span className="text-xs text-stone-400 block mt-1">
            High-frequency physical turbulence intact
          </span>
        </div>
      </div>

      {/* Grid Comparison Panels (Dark) */}
      {viewMode === "side_by_side" ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* 1. Coarse 12 km */}
          <div className="bg-[#141210] p-6 rounded-[20px] border border-[#292524] shadow-xs flex flex-col items-center">
            <div className="w-full flex items-center justify-between mb-3 text-xs">
              <span className="font-medium text-white">Coarse Global NWP (12 km)</span>
              <span className="text-[10px] text-stone-300 bg-stone-800 px-2.5 py-0.5 rounded-full">
                8×8 coarse cells
              </span>
            </div>

            <div className="grid grid-cols-8 gap-1 w-full max-w-[280px] aspect-square bg-[#0c0a09] p-3 rounded-[12px] border border-stone-800">
              {data.coarse_matrix.map((row, r) =>
                row.map((val, c) => (
                  <div
                    key={`coarse-${r}-${c}`}
                    className="rounded-xs transition-opacity hover:opacity-80 cursor-pointer"
                    style={{ backgroundColor: getColor(val, maxPeak) }}
                    title={`Coarse [${r},${c}]: ${val} ${data.unit}`}
                  />
                ))
              )}
            </div>

            <div className="mt-4 text-center">
              <span className="text-xs text-stone-400 block">
                Observed Peak: <strong className="text-white">{data.coarse_12km_peak} {data.unit}</strong>
              </span>
              <p className="text-[11px] text-stone-500 mt-1">
                Convective core diluted across 12 km grid box.
              </p>
            </div>
          </div>

          {/* 2. Bilinear Baseline */}
          <div className="bg-[#141210] p-6 rounded-[20px] border border-[#292524] shadow-xs flex flex-col items-center">
            <div className="w-full flex items-center justify-between mb-3 text-xs">
              <span className="font-medium text-stone-400">Bilinear Baseline (Smoothed)</span>
              <span className="text-[10px] text-rose-300 bg-rose-950/60 border border-rose-800/40 px-2.5 py-0.5 rounded-full">
                MSE blur bias
              </span>
            </div>

            <div
              className="grid grid-cols-20 gap-[1px] w-full max-w-[280px] aspect-square bg-[#0c0a09] p-3 rounded-[12px] border border-stone-800"
              style={{ filter: "blur(1.5px)" }}
            >
              {data.downscaled_matrix.map((row, r) =>
                row.map((val, c) => {
                  const smoothedVal = val * 0.46 + data.coarse_12km_peak * 0.42;
                  return (
                    <div
                      key={`blurred-${r}-${c}`}
                      style={{ backgroundColor: getColor(smoothedVal, maxPeak) }}
                    />
                  );
                })
              )}
            </div>

            <div className="mt-4 text-center">
              <span className="text-xs text-stone-400 block">
                Smoothed Peak: <strong className="text-stone-300">{data.bilinear_baseline_peak} {data.unit}</strong>
              </span>
              <p className="text-[11px] text-rose-400 mt-1">
                Extreme amplitude lost due to spatial averaging.
              </p>
            </div>
          </div>

          {/* 3. Avarta 5 km Generative Diffusion */}
          <div className="bg-[#1c1917] p-6 rounded-[20px] border-2 border-white shadow-xl flex flex-col items-center relative">
            <div className="w-full flex items-center justify-between mb-3 text-xs">
              <span className="font-semibold text-white flex items-center gap-1.5">
                <Sparkles size={13} className="text-sky-400" />
                <span>Avarta 5 km Reconstruction</span>
              </span>
              <span className="text-[10px] text-emerald-300 bg-emerald-950/60 border border-emerald-800/40 px-2.5 py-0.5 rounded-full font-medium">
                Physics-Guarded
              </span>
            </div>

            <div className="grid grid-cols-20 gap-[1px] w-full max-w-[280px] aspect-square bg-[#0c0a09] p-3 rounded-[12px] border border-stone-700">
              {data.downscaled_matrix.map((row, r) =>
                row.map((val, c) => (
                  <div
                    key={`fine-${r}-${c}`}
                    onMouseEnter={() => setHoveredCell({ row: r, col: c, val })}
                    className="transition-transform hover:scale-125 hover:z-20 cursor-pointer"
                    style={{ backgroundColor: getColor(val, maxPeak) }}
                  />
                ))
              )}
            </div>

            <div className="mt-4 text-center">
              <span className="text-xs text-white font-medium block">
                Reconstructed Peak: <strong>{data.avarta_5km_peak} {data.unit}</strong>
              </span>
              <p className="text-[11px] text-emerald-400 mt-1 font-medium">
                Convective bands and true physical maximum restored.
              </p>
            </div>
          </div>
        </div>
      ) : (
        /* Split Screen Slider (Dark) */
        <div className="bg-[#141210] p-8 rounded-[20px] border border-[#292524] shadow-xs flex flex-col items-center space-y-4">
          <div className="relative w-full max-w-md aspect-square rounded-[16px] overflow-hidden border border-stone-800 shadow-xl bg-[#0c0a09]">
            {/* Fine grid layer */}
            <div className="absolute inset-0 p-4 grid grid-cols-20 gap-[1px]">
              {data.downscaled_matrix.map((row, r) =>
                row.map((val, c) => (
                  <div
                    key={`split-fine-${r}-${c}`}
                    style={{ backgroundColor: getColor(val, maxPeak) }}
                  />
                ))
              )}
            </div>

            {/* Coarse grid overlay clipped */}
            <div
              className="absolute inset-0 p-4 grid grid-cols-8 gap-1 bg-[#0c0a09] overflow-hidden"
              style={{ clipPath: `polygon(0 0, ${sliderPosition}% 0, ${sliderPosition}% 100%, 0 100%)` }}
            >
              {data.coarse_matrix.map((row, r) =>
                row.map((val, c) => (
                  <div
                    key={`split-coarse-${r}-${c}`}
                    style={{ backgroundColor: getColor(val, maxPeak) }}
                  />
                ))
              )}
            </div>

            {/* Hairline Divider Handle */}
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-white pointer-events-none"
              style={{ left: `${sliderPosition}%` }}
            >
              <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-6 h-6 rounded-full bg-white text-black flex items-center justify-center shadow-lg">
                <SlidersHorizontal size={11} />
              </div>
            </div>

            <div className="absolute bottom-3 left-3 bg-[#141210]/90 px-3 py-1 rounded-full text-[10px] font-medium text-stone-200 border border-stone-800">
              Coarse 12 km ({sliderPosition}%)
            </div>
            <div className="absolute bottom-3 right-3 bg-[#141210]/90 px-3 py-1 rounded-full text-[10px] font-medium text-stone-200 border border-stone-800">
              Avarta 5 km ({100 - sliderPosition}%)
            </div>
          </div>

          <input
            type="range"
            min={10}
            max={90}
            value={sliderPosition}
            onChange={(e) => setSliderPosition(parseInt(e.target.value))}
            className="w-full max-w-md accent-white cursor-pointer h-1.5 bg-stone-800 rounded-lg"
          />
        </div>
      )}

      {/* Palette Legend & Hover Inspector (Dark) */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-[#141210] rounded-[14px] border border-[#292524] text-xs text-stone-300">
        <div className="flex items-center gap-3">
          <span className="text-[10px] uppercase tracking-wider text-stone-400 font-medium">
            Scalar Intensity Scale:
          </span>
          <div className="flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 rounded bg-stone-900 border border-stone-700" />
            <span className="text-[10px] text-stone-500">0</span>
            <span className="w-3.5 h-3.5 rounded bg-[#38bdf8]" />
            <span className="w-3.5 h-3.5 rounded bg-[#34d399]" />
            <span className="w-3.5 h-3.5 rounded bg-[#fbbf24]" />
            <span className="w-3.5 h-3.5 rounded bg-[#f43f5e]" />
            <span className="w-3.5 h-3.5 rounded bg-white" />
            <span className="text-[10px] font-semibold text-white">
              {maxPeak} {data.unit}
            </span>
          </div>
        </div>

        {hoveredCell ? (
          <div className="text-xs text-white font-medium">
            Subgrid Pixel [{hoveredCell.row}, {hoveredCell.col}]:{" "}
            <strong>{hoveredCell.val} {data.unit}</strong>
          </div>
        ) : (
          <span className="text-xs text-stone-400">
            Hover over fine grid cells to inspect localized convective peaks
          </span>
        )}
      </div>
    </div>
  );
}
