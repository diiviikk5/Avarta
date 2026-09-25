"use client";

import Link from "next/link";
import { ArrowUpRight, Cpu, Layers, ShieldCheck, Sparkles, Wind, Eye, Compass, Activity, CheckCircle2, ArrowRight } from "lucide-react";

export default function EditorialLandingFeatures() {
  const FOUNDATION_MODELS = [
    {
      name: "GraphCast",
      institution: "Google DeepMind",
      architecture: "Multi-Mesh Spherical GNN (Icosahedral)",
      resolution: "0.25° (~28 km) → 12 km",
      horizon: "10 Days (6-hour steps)",
      spectralPreservation: "Moderate (GNN smoothing)",
      avartaRole: "Backbone for Stage 1 Global Anomaly & Voronoi Tracking",
    },
    {
      name: "CorrDiff",
      institution: "NVIDIA Research",
      architecture: "Generative Residual Diffusion",
      resolution: "25 km → 2 km",
      horizon: "Deterministic + Stochastic downscaling",
      spectralPreservation: "Superior (Solves spectral smoothing)",
      avartaRole: "Engine for Stage 4 Threat-First 5km Residual Generation",
    },
    {
      name: "ClimaX",
      institution: "Microsoft Research",
      architecture: "Spatio-Temporal Masked Autoencoder (MAE)",
      resolution: "Multi-scale variable resolution",
      horizon: "Transfer learning & seasonal forecast",
      spectralPreservation: "High",
      avartaRole: "Pre-trained representations for multi-variable assimilation",
    },
    {
      name: "Pangu-Weather",
      institution: "Huawei Cloud",
      architecture: "3D Earth-Specific Transformer (3DEST)",
      resolution: "0.25° Global",
      horizon: "Hourly, 3-hour, 6-hour, 24-hour hierarchies",
      spectralPreservation: "Moderate",
      avartaRole: "Benchmark validation for geopotential height Z500",
    },
  ];

  return (
    <section className="relative w-full bg-[var(--canvas)] text-[var(--ink)] py-28 px-6 sm:px-10 lg:px-16 border-t border-stone-200/80 overflow-hidden">
      {/* Background Subtle Atmospheric Orbs */}
      <div className="orb orb-mint top-10 left-10 pointer-events-none" />
      <div className="orb orb-peach bottom-10 right-10 pointer-events-none" />
      <div className="orb orb-sky top-1/2 left-1/3 pointer-events-none" />

      <div className="max-w-7xl mx-auto relative z-10">
        {/* Section 1 Header */}
        <div id="architecture" className="max-w-3xl mb-20 scroll-mt-24">
          <div className="flex items-center gap-2 mb-4">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--ink)]" />
            <span className="text-xs uppercase tracking-widest text-stone-500 font-mono">
              Scientific Architecture
            </span>
          </div>
          <h2 className="text-4xl sm:text-5xl lg:text-6xl font-light tracking-tight text-[var(--ink)] font-serif leading-[1.1] mb-6">
            Beyond isolated pixels. <br />
            <em className="font-normal italic text-stone-700">Persistent</em> weather intelligence.
          </h2>
          <p className="text-stone-600 text-base sm:text-lg leading-relaxed font-sans font-normal">
            Legacy NWP systems generate gigabytes of grid points where human analysts must manually connect anomalies across forecast horizons. Avarta treats extreme events as continuous 4D geometric threat corridors governed by geophysical laws.
          </p>
        </div>

        {/* 4-Column Feature Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Card 1 */}
          <div className="bg-white rounded-2xl p-7 border border-stone-200/90 shadow-xs flex flex-col justify-between hover:shadow-md transition-all">
            <div>
              <div className="w-10 h-10 rounded-xl bg-stone-100 flex items-center justify-center text-stone-900 mb-6">
                <Layers size={20} />
              </div>
              <div className="text-xs font-mono uppercase tracking-wider text-stone-500 mb-2">01 / Detection</div>
              <h3 className="text-2xl font-serif text-[var(--ink)] mb-3">Global EFI Engine</h3>
              <p className="text-sm text-stone-600 leading-relaxed font-sans">
                Computes Extreme Forecast Index against 30-year ERA5 climatological distributions, isolating high-impact deviations 3 to 10 days before onset.
              </p>
            </div>
            <div className="mt-8 pt-4 border-t border-stone-100 flex items-center justify-between text-xs font-mono text-stone-500">
              <span>ERA5 Climatology</span>
              <span className="text-emerald-700 font-medium">99.8th %tile</span>
            </div>
          </div>

          {/* Card 2 */}
          <div className="bg-white rounded-2xl p-7 border border-stone-200/90 shadow-xs flex flex-col justify-between hover:shadow-md transition-all">
            <div>
              <div className="w-10 h-10 rounded-xl bg-stone-100 flex items-center justify-center text-stone-900 mb-6">
                <Compass size={20} />
              </div>
              <div className="text-xs font-mono uppercase tracking-wider text-stone-500 mb-2">02 / Tracking</div>
              <h3 className="text-2xl font-serif text-[var(--ink)] mb-3">4D Threat Corridor</h3>
              <p className="text-sm text-stone-600 leading-relaxed font-sans">
                Hungarian bipartite matching and 6-state Kalman estimation bind morphing vorticity fields into persistent 4D threat objects with explicit ensemble spread.
              </p>
            </div>
            <div className="mt-8 pt-4 border-t border-stone-100 flex items-center justify-between text-xs font-mono text-stone-500">
              <span>Trajectory Match</span>
              <span className="text-blue-700 font-medium">0.96 IoU</span>
            </div>
          </div>

          {/* Card 3 */}
          <div className="bg-white rounded-2xl p-7 border border-stone-200/90 shadow-xs flex flex-col justify-between hover:shadow-md transition-all">
            <div>
              <div className="w-10 h-10 rounded-xl bg-stone-100 flex items-center justify-center text-stone-900 mb-6">
                <Sparkles size={20} />
              </div>
              <div className="text-xs font-mono uppercase tracking-wider text-stone-500 mb-2">03 / Downscaling</div>
              <h3 className="text-2xl font-serif text-[var(--ink)] mb-3">12km → 5km Diffusion</h3>
              <p className="text-sm text-stone-600 leading-relaxed font-sans">
                Amplitude-preserving residual diffusion reconstructs sharp spatial topography and extreme tails without the blur or spectral decay of standard interpolation.
              </p>
            </div>
            <div className="mt-8 pt-4 border-t border-stone-100 flex items-center justify-between text-xs font-mono text-stone-500">
              <span>Spatial Resolution</span>
              <span className="text-purple-700 font-medium">5.0 km Mesh</span>
            </div>
          </div>

          {/* Card 4 */}
          <div className="bg-white rounded-2xl p-7 border border-stone-200/90 shadow-xs flex flex-col justify-between hover:shadow-md transition-all">
            <div>
              <div className="w-10 h-10 rounded-xl bg-stone-100 flex items-center justify-center text-stone-900 mb-6">
                <ShieldCheck size={20} />
              </div>
              <div className="text-xs font-mono uppercase tracking-wider text-stone-500 mb-2">04 / Verification</div>
              <h3 className="text-2xl font-serif text-[var(--ink)] mb-3">Physics Guard</h3>
              <p className="text-sm text-stone-600 leading-relaxed font-sans">
                Differentiable projection layer strictly enforces non-negative precipitation, moisture flux convergence, and mass continuity before dissemination.
              </p>
            </div>
            <div className="mt-8 pt-4 border-t border-stone-100 flex items-center justify-between text-xs font-mono text-stone-500">
              <span>Conservation Error</span>
              <span className="text-emerald-700 font-medium">&lt; 0.002%</span>
            </div>
          </div>
        </div>

        {/* Section 2: Foundation Models Synthesis (Awesome-Weather-Forecast Reference) */}
        <div id="foundation-models" className="mt-32 pt-20 border-t border-stone-200/80 scroll-mt-24">
          <div className="max-w-3xl mb-12">
            <div className="flex items-center gap-2 mb-3">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--ink)]" />
              <span className="text-xs uppercase tracking-widest text-stone-500 font-mono">
                Spatio-Temporal Foundation Models
              </span>
            </div>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-serif font-light text-[var(--ink)] tracking-tight mb-4">
              Standing on the shoulders of planetary AI.
            </h2>
            <p className="text-stone-600 text-base leading-relaxed font-sans">
              Avarta integrates benchmarks and architectural primitives cataloged in the open atmospheric AI repositories, combining global spherical representation with localized extreme tail diffusion.
            </p>
          </div>

          {/* Foundation Models Table / Card Matrix */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {FOUNDATION_MODELS.map((m) => (
              <div
                key={m.name}
                className="bg-white rounded-2xl p-7 border border-stone-200/90 shadow-xs flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-xs font-mono uppercase tracking-wider text-stone-500">
                      {m.institution}
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full bg-stone-100 text-stone-700 text-xs font-mono">
                      {m.resolution}
                    </span>
                  </div>
                  <h3 className="text-2xl font-serif text-[var(--ink)] mb-2">{m.name}</h3>
                  <div className="text-xs text-stone-500 font-mono mb-4">{m.architecture}</div>
                  <div className="text-sm text-stone-600 font-sans leading-relaxed mb-6">
                    <strong className="text-stone-800 font-medium">Integration in Avarta:</strong> {m.avartaRole}
                  </div>
                </div>

                <div className="pt-4 border-t border-stone-100 flex items-center justify-between text-xs font-mono text-stone-500">
                  <span>Spectral Fidelity</span>
                  <span className="text-stone-800 font-medium">{m.spectralPreservation}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Section 3: Deep-Dive Operational Deployment */}
        <div id="physics-guard" className="mt-32 p-10 sm:p-14 rounded-3xl bg-[var(--ink)] text-stone-100 relative overflow-hidden shadow-xl">
          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-10">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-stone-800/80 border border-stone-700/80 text-xs font-mono text-stone-300 mb-6">
                <Activity size={12} className="text-emerald-400" />
                <span>Mission-Critical Operational Deployment</span>
              </div>
              <h3 className="text-3xl sm:text-4xl lg:text-5xl font-serif font-light tracking-tight leading-tight text-white mb-5">
                Precision when every kilometer <br />
                <em className="font-normal italic text-stone-300">dictates the evacuation boundary.</em>
              </h3>
              <p className="text-stone-300 text-base leading-relaxed">
                Avarta exports automated Common Alerting Protocol (CAP v1.2) payloads directly into regional disaster management centers and GIS systems within 400 milliseconds of forecast assimilation.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 shrink-0">
              <Link
                href="/dashboard"
                className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-full bg-white text-stone-950 font-sans font-medium text-sm hover:bg-stone-200 transition-colors shadow-lg"
              >
                <span>Launch Operational Console</span>
                <ArrowRight size={16} />
              </Link>
            </div>
          </div>
        </div>

        {/* Editorial Citation Footer */}
        <div className="mt-20 pt-8 border-t border-stone-200/80 flex flex-col sm:flex-row items-center justify-between text-xs text-stone-500 font-mono gap-4">
          <div className="flex items-center gap-3">
            <span>AVARTA WEATHER INTELLIGENCE</span>
            <span>·</span>
            <span>SIH PROBLEM STATEMENT 26078</span>
          </div>
          <div>
            <span>INSPIRED BY GRAPHCAST · CORRDIFF · ERA5 CLIMATOLOGY</span>
          </div>
        </div>
      </div>
    </section>
  );
}
