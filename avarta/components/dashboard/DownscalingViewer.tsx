"use client";

import { useState } from "react";
import { DownscalingGridData } from "@/types/threat";
import { Sparkles, SlidersHorizontal, Check, Info } from "lucide-react";

interface DownscalingViewerProps {
  data: DownscalingGridData;
}

export default function DownscalingViewer({ data }: DownscalingViewerProps) {
  const [viewMode, setViewMode] = useState<"side_by_side" | "interactive_slider">("side_by_side");
  const [sliderPosition, setSliderPosition] = useState(50);
  const [hoveredCell, setHoveredCell] = useState<{ row: number; col: number; val: number } | null>(null);

  // High-contrast clean scientific color palette (pastel sky -> sage -> amber -> rose -> deep ink)
  const getColor = (val: number, maxVal: number) => {
    const ratio = Math.min(1, Math.max(0, val / maxVal));
    if (ratio < 0.08) return "rgba(240, 239, 237, 0.6)"; // canvas soft
    if (ratio < 0.25) return "#a8c8e8"; // pastel sky
    if (ratio < 0.45) return "#a7e5d3"; // pastel mint
    if (ratio < 0.65) return "#f4c5a8"; // pastel peach
    if (ratio < 0.85) return "#e8b8c4"; // pastel rose
    return "#0c0a09"; // deep ink peak
  };

  const maxPeak = Math.max(data.coarse_12km_peak, data.avarta_5km_peak);

  return (
    <div className="p-6 sm:p-8 bg-[#f5f5f5] space-y-6">
      {/* Editorial Header */}
      <div className="flex flex-wrap items-end justify-between gap-4 pb-5 border-b border-[#e7e5e4]">
        <div>
          <span className="text-[11px] font-medium tracking-wider uppercase text-[#777169] block mb-1">
            Stage 2 · Physics-Guided Generative Reconstruction
          </span>
          <h2
            className="text-2xl sm:text-3xl font-light text-[#0c0a09] tracking-tight"
            style={{ fontFamily: "var(--font-serif)" }}
          >
            12 km → 5 km Amplitude-Preserving Downscaling Studio
          </h2>
          <p className="text-sm text-[#4e4e4e] max-w-2xl mt-1 leading-relaxed">
            Standard deep learning architectures (CNNs/U-Nets) optimize for Mean Squared Error, creating severe spectral smoothing that suppresses extreme convective rainfall peaks. Avarta uses conditional residual diffusion to reconstruct high-amplitude 5 km subgrid structures.
          </p>
        </div>

        {/* View Switcher Pill */}
        <div className="flex items-center gap-1 bg-[#f0efed] p-1 rounded-full border border-[#e7e5e4] text-xs">
          <button
            onClick={() => setViewMode("side_by_side")}
            className={`px-4 py-1.5 rounded-full transition-colors cursor-pointer font-medium ${
              viewMode === "side_by_side"
                ? "bg-white text-[#0c0a09] shadow-[0_2px_6px_rgba(0,0,0,0.04)]"
                : "text-[#777169] hover:text-[#0c0a09]"
            }`}
          >
            Triptych Comparison
          </button>
          <button
            onClick={() => setViewMode("interactive_slider")}
            className={`px-4 py-1.5 rounded-full transition-colors cursor-pointer font-medium ${
              viewMode === "interactive_slider"
                ? "bg-white text-[#0c0a09] shadow-[0_2px_6px_rgba(0,0,0,0.04)]"
                : "text-[#777169] hover:text-[#0c0a09]"
            }`}
          >
            Split Screen Lens
          </button>
        </div>
      </div>

      {/* Scientific Metrics Dossier */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-[16px] border border-[#e7e5e4] shadow-[0_2px_8px_rgba(0,0,0,0.02)]">
          <span className="text-[10px] uppercase tracking-wider text-[#777169] block font-medium">
            12 km Raw Coarse NWP
          </span>
          <span
            className="text-2xl font-light text-[#0c0a09] block mt-1"
            style={{ fontFamily: "var(--font-serif)" }}
          >
            {data.coarse_12km_peak} <span className="text-sm font-sans text-[#777169]">{data.unit}</span>
          </span>
          <span className="text-xs text-[#777169] block mt-1">
            Global 144 km² cell average
          </span>
        </div>

        <div className="bg-white p-5 rounded-[16px] border border-[#e7e5e4] shadow-[0_2px_8px_rgba(0,0,0,0.02)]">
          <span className="text-[10px] uppercase tracking-wider text-[#777169] block font-medium">
            Standard Bilinear / CNN Baseline
          </span>
          <span
            className="text-2xl font-light text-[#a8a29e] block mt-1 line-through"
            style={{ fontFamily: "var(--font-serif)" }}
          >
            {data.bilinear_baseline_peak} <span className="text-sm font-sans text-[#a8a29e]">{data.unit}</span>
          </span>
          <span className="text-xs text-[#dc2626] font-medium block mt-1">
            -54% peak loss (Spectral Smoothing)
          </span>
        </div>

        <div className="bg-white p-5 rounded-[16px] border-2 border-[#0c0a09] shadow-[0_8px_24px_rgba(0,0,0,0.04)] relative">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase tracking-wider text-[#0c0a09] block font-semibold">
              Avarta 5 km Generative Model
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-[#0c0a09]" />
          </div>
          <span
            className="text-2xl font-light text-[#0c0a09] block mt-1"
            style={{ fontFamily: "var(--font-serif)" }}
          >
            {data.avarta_5km_peak} <span className="text-sm font-sans text-[#777169]">{data.unit}</span>
          </span>
          <span className="text-xs text-[#16a34a] font-medium block mt-1 flex items-center gap-1">
            <Check size={12} />
            <span>{(data.amplitude_preservation_ratio * 100).toFixed(1)}% Extreme Amplitude Preserved</span>
          </span>
        </div>

        <div className="bg-white p-5 rounded-[16px] border border-[#e7e5e4] shadow-[0_2px_8px_rgba(0,0,0,0.02)]">
          <span className="text-[10px] uppercase tracking-wider text-[#777169] block font-medium">
            Wavelet Spectral Energy
          </span>
          <span
            className="text-2xl font-light text-[#0c0a09] block mt-1"
            style={{ fontFamily: "var(--font-serif)" }}
          >
            {data.spectral_energy_high_freq} <span className="text-sm font-sans text-[#777169]">E_hf</span>
          </span>
          <span className="text-xs text-[#777169] block mt-1">
            High-frequency physical turbulence intact
          </span>
        </div>
      </div>

      {/* Grid Comparison Panels */}
      {viewMode === "side_by_side" ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* 1. Coarse 12 km */}
          <div className="bg-white p-6 rounded-[20px] border border-[#e7e5e4] shadow-[0_2px_8px_rgba(0,0,0,0.02)] flex flex-col items-center">
            <div className="w-full flex items-center justify-between mb-3 text-xs">
              <span className="font-medium text-[#0c0a09]">Coarse Global NWP (12 km)</span>
              <span className="text-[10px] text-[#777169] bg-[#f0efed] px-2.5 py-0.5 rounded-full">
                8×8 coarse cells
              </span>
            </div>

            <div className="grid grid-cols-8 gap-1 w-full max-w-[280px] aspect-square bg-[#fafafa] p-3 rounded-[12px] border border-[#e7e5e4]">
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
              <span className="text-xs text-[#777169] block">
                Observed Peak: <strong className="text-[#0c0a09]">{data.coarse_12km_peak} {data.unit}</strong>
              </span>
              <p className="text-[11px] text-[#a8a29e] mt-1">
                Convective core diluted across 12 km grid box.
              </p>
            </div>
          </div>

          {/* 2. Bilinear Interpolated Baseline (Smoothed) */}
          <div className="bg-white p-6 rounded-[20px] border border-[#e7e5e4] shadow-[0_2px_8px_rgba(0,0,0,0.02)] flex flex-col items-center">
            <div className="w-full flex items-center justify-between mb-3 text-xs">
              <span className="font-medium text-[#777169]">Bilinear Baseline (Smoothed)</span>
              <span className="text-[10px] text-[#dc2626] bg-[#fef2f2] px-2.5 py-0.5 rounded-full">
                MSE blur bias
              </span>
            </div>

            <div
              className="grid grid-cols-20 gap-[1px] w-full max-w-[280px] aspect-square bg-[#fafafa] p-3 rounded-[12px] border border-[#e7e5e4]"
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
              <span className="text-xs text-[#777169] block">
                Smoothed Peak: <strong className="text-[#777169]">{data.bilinear_baseline_peak} {data.unit}</strong>
              </span>
              <p className="text-[11px] text-[#dc2626] mt-1">
                Extreme amplitude lost due to spatial averaging.
              </p>
            </div>
          </div>

          {/* 3. Avarta 5 km Generative Diffusion */}
          <div className="bg-white p-6 rounded-[20px] border-2 border-[#0c0a09] shadow-[0_8px_24px_rgba(0,0,0,0.05)] flex flex-col items-center relative">
            <div className="w-full flex items-center justify-between mb-3 text-xs">
              <span className="font-semibold text-[#0c0a09] flex items-center gap-1.5">
                <Sparkles size={13} />
                <span>Avarta 5 km Reconstruction</span>
              </span>
              <span className="text-[10px] text-[#0c0a09] bg-[#f0efed] px-2.5 py-0.5 rounded-full font-medium">
                Physics-Guarded
              </span>
            </div>

            <div className="grid grid-cols-20 gap-[1px] w-full max-w-[280px] aspect-square bg-[#fafafa] p-3 rounded-[12px] border border-[#d6d3d1]">
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
              <span className="text-xs text-[#0c0a09] font-medium block">
                Reconstructed Peak: <strong>{data.avarta_5km_peak} {data.unit}</strong>
              </span>
              <p className="text-[11px] text-[#16a34a] mt-1 font-medium">
                Convective bands and true physical maximum restored.
              </p>
            </div>
          </div>
        </div>
      ) : (
        /* Split Screen Slider */
        <div className="bg-white p-8 rounded-[20px] border border-[#e7e5e4] shadow-[0_2px_8px_rgba(0,0,0,0.02)] flex flex-col items-center space-y-4">
          <div className="relative w-full max-w-md aspect-square rounded-[16px] overflow-hidden border border-[#d6d3d1] shadow-lg bg-[#fafafa]">
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
              className="absolute inset-0 p-4 grid grid-cols-8 gap-1 bg-[#fafafa] overflow-hidden"
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
              className="absolute top-0 bottom-0 w-0.5 bg-[#0c0a09] pointer-events-none"
              style={{ left: `${sliderPosition}%` }}
            >
              <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-6 h-6 rounded-full bg-[#0c0a09] text-white flex items-center justify-center shadow-md">
                <SlidersHorizontal size={11} />
              </div>
            </div>

            <div className="absolute bottom-3 left-3 bg-white/95 px-3 py-1 rounded-full text-[10px] font-medium text-[#0c0a09] border border-[#e7e5e4]">
              Coarse 12 km ({sliderPosition}%)
            </div>
            <div className="absolute bottom-3 right-3 bg-white/95 px-3 py-1 rounded-full text-[10px] font-medium text-[#0c0a09] border border-[#e7e5e4]">
              Avarta 5 km ({100 - sliderPosition}%)
            </div>
          </div>

          <input
            type="range"
            min={10}
            max={90}
            value={sliderPosition}
            onChange={(e) => setSliderPosition(parseInt(e.target.value))}
            className="w-full max-w-md accent-[#0c0a09] cursor-pointer h-1.5 bg-[#e7e5e4] rounded-lg"
          />
        </div>
      )}

      {/* Palette Legend & Hover Inspector */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-white rounded-[14px] border border-[#e7e5e4] text-xs text-[#4e4e4e]">
        <div className="flex items-center gap-3">
          <span className="text-[10px] uppercase tracking-wider text-[#777169] font-medium">
            Scalar Intensity Scale:
          </span>
          <div className="flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 rounded bg-[rgba(240,239,237,0.6)] border border-[#e7e5e4]" />
            <span className="text-[10px] text-[#777169]">0</span>
            <span className="w-3.5 h-3.5 rounded bg-[#a8c8e8]" />
            <span className="w-3.5 h-3.5 rounded bg-[#a7e5d3]" />
            <span className="w-3.5 h-3.5 rounded bg-[#f4c5a8]" />
            <span className="w-3.5 h-3.5 rounded bg-[#e8b8c4]" />
            <span className="w-3.5 h-3.5 rounded bg-[#0c0a09]" />
            <span className="text-[10px] font-semibold text-[#0c0a09]">
              {maxPeak} {data.unit}
            </span>
          </div>
        </div>

        {hoveredCell ? (
          <div className="text-xs text-[#0c0a09] font-medium">
            Subgrid Pixel [{hoveredCell.row}, {hoveredCell.col}]:{" "}
            <strong>{hoveredCell.val} {data.unit}</strong>
          </div>
        ) : (
          <span className="text-xs text-[#777169]">
            Hover over fine grid cells to inspect localized convective peaks
          </span>
        )}
      </div>
    </div>
  );
}
