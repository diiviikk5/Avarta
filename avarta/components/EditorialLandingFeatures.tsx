"use client";

import Link from "next/link";
import { ArrowUpRight, Cpu, Layers, ShieldCheck, Sparkles, Wind, Eye, Compass, Activity } from "lucide-react";

export default function EditorialLandingFeatures() {
  return (
    <section className="relative w-full bg-[var(--canvas)] text-[var(--ink)] py-28 px-6 sm:px-10 lg:px-16 border-t border-stone-200/80 overflow-hidden">
      {/* Background Subtle Atmospheric Orbs */}
      <div className="orb orb-mint top-10 left-10 pointer-events-none" />
      <div className="orb orb-peach bottom-10 right-10 pointer-events-none" />
      <div className="orb orb-sky top-1/2 left-1/3 pointer-events-none" />

      <div className="max-w-7xl mx-auto relative z-10">
        {/* Section Header */}
        <div className="max-w-2xl mb-20">
          <div className="flex items-center gap-2 mb-4">
            <span className="w-1.5 h-1.5 rounded-full bg-stone-900" />
            <span className="text-xs uppercase tracking-widest text-stone-500 font-mono">
              Scientific Architecture
            </span>
          </div>
          <h2 className="text-4xl sm:text-5xl lg:text-6xl font-light tracking-tight text-stone-900 font-serif leading-[1.1] mb-6">
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
          <div className="bg-white/80 backdrop-blur-md rounded-2xl p-7 border border-stone-200/90 shadow-xs flex flex-col justify-between hover:shadow-md transition-all">
            <div>
              <div className="w-10 h-10 rounded-xl bg-stone-100 flex items-center justify-center text-stone-900 mb-6">
                <Layers size={20} />
              </div>
              <div className="text-xs font-mono uppercase tracking-wider text-stone-500 mb-2">01 / Detection</div>
              <h3 className="text-2xl font-serif text-stone-900 mb-3">Global EFI Engine</h3>
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
          <div className="bg-white/80 backdrop-blur-md rounded-2xl p-7 border border-stone-200/90 shadow-xs flex flex-col justify-between hover:shadow-md transition-all">
            <div>
              <div className="w-10 h-10 rounded-xl bg-stone-100 flex items-center justify-center text-stone-900 mb-6">
                <Compass size={20} />
              </div>
              <div className="text-xs font-mono uppercase tracking-wider text-stone-500 mb-2">02 / Tracking</div>
              <h3 className="text-2xl font-serif text-stone-900 mb-3">4D Threat Spatio-Temporal Corridor</h3>
              <p className="text-sm text-stone-600 leading-relaxed font-sans">
                Hungarian bipartite matching and Kalman state estimation bind morphing vorticity fields into persistent 4D threat objects with explicit ensemble spread.
              </p>
            </div>
            <div className="mt-8 pt-4 border-t border-stone-100 flex items-center justify-between text-xs font-mono text-stone-500">
              <span>Trajectory Match</span>
              <span className="text-blue-700 font-medium">0.96 IoU</span>
            </div>
          </div>

          {/* Card 3 */}
          <div className="bg-white/80 backdrop-blur-md rounded-2xl p-7 border border-stone-200/90 shadow-xs flex flex-col justify-between hover:shadow-md transition-all">
            <div>
              <div className="w-10 h-10 rounded-xl bg-stone-100 flex items-center justify-center text-stone-900 mb-6">
                <Sparkles size={20} />
              </div>
              <div className="text-xs font-mono uppercase tracking-wider text-stone-500 mb-2">03 / Downscaling</div>
              <h3 className="text-2xl font-serif text-stone-900 mb-3">12km → 5km Diffusion</h3>
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
          <div className="bg-white/80 backdrop-blur-md rounded-2xl p-7 border border-stone-200/90 shadow-xs flex flex-col justify-between hover:shadow-md transition-all">
            <div>
              <div className="w-10 h-10 rounded-xl bg-stone-100 flex items-center justify-center text-stone-900 mb-6">
                <ShieldCheck size={20} />
              </div>
              <div className="text-xs font-mono uppercase tracking-wider text-stone-500 mb-2">04 / Verification</div>
              <h3 className="text-2xl font-serif text-stone-900 mb-3">Physics Guard</h3>
              <p className="text-sm text-stone-600 leading-relaxed font-sans">
                Differentiable projection layer strictly enforces non-negative precipitation, moisture flux convergence, and hydrostatic balance before dissemination.
              </p>
            </div>
            <div className="mt-8 pt-4 border-t border-stone-100 flex items-center justify-between text-xs font-mono text-stone-500">
              <span>Conservation Error</span>
              <span className="text-emerald-700 font-medium">&lt; 0.002%</span>
            </div>
          </div>
        </div>

        {/* Editorial Deep-Dive Section */}
        <div className="mt-24 p-10 sm:p-12 rounded-3xl bg-stone-900 text-stone-100 relative overflow-hidden shadow-2xl">
          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-10">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-stone-800/80 border border-stone-700/80 text-xs font-mono text-stone-300 mb-6">
                <Activity size={12} className="text-emerald-400" />
                <span>Mission-Ready Operational Deployment</span>
              </div>
              <h3 className="text-3xl sm:text-4xl lg:text-5xl font-serif font-light tracking-tight leading-tight text-white mb-5">
                Precision when every kilometer <br />
                <em className="font-normal italic text-stone-300">dictates the evacuation boundary.</em>
              </h3>
              <p className="text-stone-300 text-base leading-relaxed">
                Avarta exports automated Common Alerting Protocol (CAP v1.2) payloads directly into regional disaster management centers and GIS systems within 400 milliseconds of forecast assimilation.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
              <Link
                href="/dashboard"
                className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-full bg-white text-stone-950 font-sans font-medium text-sm hover:bg-stone-200 transition-colors shadow-lg"
              >
                <span>Launch Operational Console</span>
                <ArrowUpRight size={16} />
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
