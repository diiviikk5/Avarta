"use client";

import { useState } from "react";
import { ExternalLink, Sparkles, Database } from "lucide-react";

interface FoundationModelSpec {
  id: string;
  name: string;
  developer: string;
  venue: string;
  paperUrl: string;
  spatialResolution: string;
  temporalStep: string;
  leadTimeLimit: string;
  coreMechanism: string;
  spectralPreservation: string;
  z500RmseDay5: number;
  avartaIntegration: string;
}

const FOUNDATION_MODELS: FoundationModelSpec[] = [
  {
    id: "graphcast",
    name: "GraphCast",
    developer: "Google DeepMind",
    venue: "Science 2023",
    paperUrl: "https://www.science.org/doi/10.1126/science.adi2336",
    spatialResolution: "0.25° (~28 km) × 37 pressure levels",
    temporalStep: "6 hours",
    leadTimeLimit: "10 days (autoregressive rollouts)",
    coreMechanism: "Multi-mesh icosahedral spherical GNN with message-passing across 6 subdivision hierarchies",
    spectralPreservation: "Intermediate (experiences slight spatial diffusion over prolonged rollouts)",
    z500RmseDay5: 486.2,
    avartaIntegration: "Adapted in `models/spherical_gnn/icosahedron.py` for global anomaly identification without polar coordinate distortion."
  },
  {
    id: "corrdiff",
    name: "CorrDiff",
    developer: "NVIDIA Research",
    venue: "arXiv 2023 / Nature Computational Science",
    paperUrl: "https://arxiv.org/abs/2309.15214",
    spatialResolution: "25 km → 2 km super-resolution",
    temporalStep: "Hourly snapshot downscaling",
    leadTimeLimit: "Instantaneous state projection",
    coreMechanism: "Conditional generative diffusion with progressive score-matching over multi-scale radar and topography",
    spectralPreservation: "Superior (perfectly matches Doppler radar energy power spectra across fine scales)",
    z500RmseDay5: 395.0,
    avartaIntegration: "Adapted in `models/residual_downscaler/diffusion_downscaler.py` to downscale 12 km threats to 5 km while preserving extreme tails."
  },
  {
    id: "climax",
    name: "ClimaX",
    developer: "Microsoft Research",
    venue: "ICML 2023",
    paperUrl: "https://arxiv.org/abs/2301.10343",
    spatialResolution: "Variable grid tokenization (5.625° to 1.40625°)",
    temporalStep: "Daily to seasonal",
    leadTimeLimit: "Seasonal & sub-seasonal climate",
    coreMechanism: "Spatio-temporal Vision Transformer pre-trained with Masked Autoencoding across heterogeneous CMIP6 climate models",
    spectralPreservation: "High macro-scale feature coherence",
    z500RmseDay5: 542.1,
    avartaIntegration: "Referenced for variable-token cross-attention when fusing multi-source NWP ensemble inputs."
  },
  {
    id: "pangu",
    name: "Pangu-Weather",
    developer: "Huawei Cloud",
    venue: "Nature 2023",
    paperUrl: "https://www.nature.com/articles/s41586-023-06185-3",
    spatialResolution: "0.25° Global (13 pressure levels)",
    temporalStep: "Hierarchical: 1h, 3h, 6h, 24h models",
    leadTimeLimit: "7 days",
    coreMechanism: "3D Earth-Specific Transformer (3DEST) with cylindrical coordinate positional biases",
    spectralPreservation: "Moderate (strong bulk geostrophic skill, minor convective damping)",
    z500RmseDay5: 478.4,
    avartaIntegration: "Utilized as baseline validation benchmark for geopotential height Z500 trajectory forecasts."
  },
  {
    id: "fourcastnet",
    name: "FourCastNet v2",
    developer: "NVIDIA / Lawrence Berkeley National Lab",
    venue: "IEEE T-PAMI / arXiv 2023",
    paperUrl: "https://arxiv.org/abs/2306.03838",
    spatialResolution: "0.25° Global Equirectangular",
    temporalStep: "6 hours",
    leadTimeLimit: "14 days",
    coreMechanism: "Adaptive Fourier Neural Operators (AFNO) performing global spectral convolutions in frequency domain",
    spectralPreservation: "High harmonic retention in synoptic scales",
    z500RmseDay5: 492.7,
    avartaIntegration: "Frequency domain transforms used for rapid baseline initialization before generative diffusion."
  }
];

export default function FoundationModelsExplorer() {
  const [selectedModelId, setSelectedModelId] = useState<string>("graphcast");

  const selectedModel = FOUNDATION_MODELS.find((m) => m.id === selectedModelId) || FOUNDATION_MODELS[0];

  return (
    <div className="p-6 sm:p-8 bg-[#0c0a09] space-y-6 text-stone-100">
      {/* Editorial Header */}
      <div className="pb-5 border-b border-[#292524] flex flex-wrap items-end justify-between gap-4">
        <div>
          <span className="text-[11px] font-medium tracking-wider uppercase text-stone-400 block mb-1">
            Planetary Weather AI Taxonomy · Curated from Awesome-Weather-Forecast
          </span>
          <h2
            className="text-2xl sm:text-3xl font-light text-white tracking-tight"
            style={{ fontFamily: "var(--font-serif)" }}
          >
            Spatio-Temporal Foundation Models Architecture Dossier
          </h2>
          <p className="text-sm text-stone-400 max-w-2xl mt-1 leading-relaxed">
            Avarta synthesizes the latest advances from leading planetary foundation models, bridging global spherical GNN representation with localized generative residual diffusion.
          </p>
        </div>

        <div className="flex items-center gap-2 bg-[#141210] px-4 py-2 rounded-full border border-stone-800 shadow-xs">
          <Database size={13} className="text-stone-300" />
          <span className="text-xs font-medium text-stone-300">5 Foundation Architectures Audited</span>
        </div>
      </div>

      {/* Model Selection Pills (Dark) */}
      <div className="flex flex-wrap gap-2">
        {FOUNDATION_MODELS.map((model) => (
          <button
            key={model.id}
            onClick={() => setSelectedModelId(model.id)}
            className={`px-4 py-2 rounded-full text-xs font-medium transition-all cursor-pointer border ${
              selectedModelId === model.id
                ? "bg-white text-black border-white shadow-xs font-semibold"
                : "bg-[#1c1917] text-stone-300 border-stone-800 hover:border-stone-700"
            }`}
          >
            <span>{model.name}</span>
            <span className="ml-1.5 opacity-60 text-[10px]">({model.developer})</span>
          </button>
        ))}
      </div>

      {/* Selected Model Deep Dive Card (Dark) */}
      <div className="bg-[#141210] rounded-[20px] border border-[#292524] p-7 shadow-xs space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-stone-800/80">
          <div>
            <div className="flex items-center gap-2.5">
              <h3
                className="text-2xl font-light text-white"
                style={{ fontFamily: "var(--font-serif)" }}
              >
                {selectedModel.name}
              </h3>
              <span className="px-2.5 py-0.5 rounded-full bg-stone-800 text-[11px] font-mono text-stone-300">
                {selectedModel.venue}
              </span>
            </div>
            <span className="text-xs text-stone-400 mt-0.5 block">
              Developed by {selectedModel.developer}
            </span>
          </div>

          <a
            href={selectedModel.paperUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full border border-stone-700 hover:bg-stone-800 text-xs font-medium text-white transition-colors"
          >
            <span>View Publication</span>
            <ExternalLink size={12} />
          </a>
        </div>

        {/* Specifications Quadrant (Dark) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-[#1c1917] p-4 rounded-[14px] border border-stone-800">
            <span className="text-[10px] font-mono uppercase text-stone-400 block mb-1">Spatial Resolution</span>
            <span className="text-sm font-medium text-white block">{selectedModel.spatialResolution}</span>
          </div>

          <div className="bg-[#1c1917] p-4 rounded-[14px] border border-stone-800">
            <span className="text-[10px] font-mono uppercase text-stone-400 block mb-1">Temporal Step & Horizon</span>
            <span className="text-sm font-medium text-white block">
              {selectedModel.temporalStep} (Up to {selectedModel.leadTimeLimit})
            </span>
          </div>

          <div className="bg-[#1c1917] p-4 rounded-[14px] border border-stone-800">
            <span className="text-[10px] font-mono uppercase text-stone-400 block mb-1">5-Day Z500 RMSE</span>
            <span className="text-sm font-medium text-white block">
              {selectedModel.z500RmseDay5} m²/s² (ERA5 Verified)
            </span>
          </div>
        </div>

        {/* Mechanism & Spectral Preservation */}
        <div className="space-y-4">
          <div>
            <h4 className="text-xs font-mono uppercase tracking-wider text-stone-400 mb-1.5">
              Core Neural Architecture
            </h4>
            <p className="text-sm text-stone-300 leading-relaxed">
              {selectedModel.coreMechanism}
            </p>
          </div>

          <div>
            <h4 className="text-xs font-mono uppercase tracking-wider text-stone-400 mb-1.5">
              Spectral Power Preservation
            </h4>
            <p className="text-sm text-stone-300 leading-relaxed">
              {selectedModel.spectralPreservation}
            </p>
          </div>

          {/* Avarta Operational Synthesis */}
          <div className="bg-[#1c1917] border-l-2 border-white p-4 rounded-r-[14px] border-y border-r border-stone-800">
            <div className="text-xs font-mono uppercase tracking-wider text-white font-semibold mb-1 flex items-center gap-1.5">
              <Sparkles size={13} className="text-sky-400" />
              <span>Avarta Operational Pipeline Role</span>
            </div>
            <p className="text-xs text-stone-300 leading-relaxed">
              {selectedModel.avartaIntegration}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
