"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Compass, Layers, ShieldCheck, Sparkles, Wind, Activity } from "lucide-react";

export default function HeroSection() {
  const [activeHorizon, setActiveHorizon] = useState<number>(5);

  const HORIZONS = [
    { day: 3, label: "+72h", efi: "0.84", status: "Emergence" },
    { day: 5, label: "+120h", efi: "0.96", status: "Peak Threat" },
    { day: 7, label: "+168h", efi: "0.91", status: "Landfall Coincident" },
    { day: 10, label: "+240h", efi: "0.78", status: "Dissipation" },
  ];

  return (
    <section className="relative w-full bg-[var(--canvas)] text-[var(--ink)] overflow-hidden pt-8 pb-20 sm:pb-28 px-6 sm:px-10 lg:px-16 selection:bg-[#f4c5a8]/40 selection:text-[var(--ink)]">
      {/* Editorial Pastel Atmospheric Gradient Orbs */}
      <div className="orb orb-mint -top-32 -left-32 pointer-events-none" />
      <div className="orb orb-sky top-1/4 -right-32 pointer-events-none" />
      <div className="orb orb-peach top-2/3 left-1/4 pointer-events-none" />
      <div className="orb orb-lavender -bottom-32 right-1/4 pointer-events-none" />

      {/* Top Editorial Navigation Bar */}
      <header className="max-w-7xl mx-auto flex items-center justify-between pb-16 sm:pb-20 border-b border-stone-200/80 relative z-20">
        <Link href="/" className="flex items-center gap-3 group">
          <span className="w-3.5 h-3.5 rounded-full bg-[var(--ink)] inline-block group-hover:scale-110 transition-transform" />
          <span className="text-2xl font-serif font-light tracking-tight text-[var(--ink)]">
            Avarta
          </span>
          <span className="hidden sm:inline-block px-2 py-0.5 rounded-full bg-stone-100 text-[10px] font-mono uppercase tracking-wider text-stone-600 border border-stone-200/80">
            SIH 26078
          </span>
        </Link>

        {/* Editorial Navigation Menu */}
        <nav className="hidden md:flex items-center gap-8 text-sm font-sans text-stone-600">
          <Link href="#architecture" className="hover:text-[var(--ink)] transition-colors">
            Architecture
          </Link>
          <Link href="#foundation-models" className="hover:text-[var(--ink)] transition-colors">
            Foundation Models
          </Link>
          <Link href="#physics-guard" className="hover:text-[var(--ink)] transition-colors">
            Physics Guard
          </Link>
          <Link href="#benchmarks" className="hover:text-[var(--ink)] transition-colors">
            Benchmarks
          </Link>
        </nav>

        {/* Primary Ink Action */}
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard"
            className="px-5 py-2 rounded-full bg-[var(--ink)] text-white text-xs font-medium tracking-wide hover:bg-stone-800 transition-all shadow-xs flex items-center gap-2"
          >
            <span>Launch Console</span>
            <ArrowRight size={13} />
          </Link>
        </div>
      </header>

      {/* Hero Body Content */}
      <div className="max-w-7xl mx-auto mt-16 sm:mt-24 relative z-10">
        <div className="max-w-3xl">
          {/* Scientific Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-stone-100/90 border border-stone-200/80 text-xs font-mono text-stone-600 mb-8 backdrop-blur-xs">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
            <span>Medium-Range Atmospheric Intelligence · 3 to 10 Day Horizon</span>
          </div>

          {/* Display Headline (Waldenburg / EB Garamond 300) */}
          <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-[5.25rem] font-serif font-light text-[var(--ink)] leading-[1.05] tracking-tight mb-8">
            Extreme weather, tracked as{" "}
            <em className="font-normal italic text-stone-700">continuous</em> four-dimensional objects.
          </h1>

          {/* Running Subhead in Inter */}
          <p className="text-lg sm:text-xl text-stone-600 leading-relaxed font-sans font-normal mb-10 max-w-2xl">
            Avarta transforms 12 km numerical ensemble fields into physics-verified, hyper-local 5 km threat intelligence. Reconstructing high-impact atmospheric extremes with zero spectral smoothing.
          </p>

          {/* Primary & Secondary Editorial Actions */}
          <div className="flex flex-wrap items-center gap-4">
            <Link
              href="/dashboard"
              className="px-6 py-3 rounded-full bg-[var(--ink)] text-white text-sm font-medium tracking-wide hover:bg-stone-800 transition-all shadow-sm inline-flex items-center gap-2"
            >
              <span>Enter Operational Console</span>
              <ArrowRight size={15} />
            </Link>
            <a
              href="#architecture"
              className="px-6 py-3 rounded-full border border-stone-300 text-stone-800 text-sm font-medium tracking-wide hover:bg-white transition-all shadow-xs"
            >
              Read Architecture Spec
            </a>
          </div>
        </div>

        {/* Live Interactive 4D Forecast Horizon Card */}
        <div className="mt-20 p-8 sm:p-10 rounded-2xl bg-white border border-stone-200/90 shadow-sm relative overflow-hidden">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between pb-6 border-b border-stone-100 gap-6">
            <div>
              <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-stone-500 mb-1">
                <span>Active 4D Threat Corridor</span>
                <span>·</span>
                <span className="text-emerald-700 font-medium">Bay of Bengal Cyclone Monolith</span>
              </div>
              <h3 className="text-2xl font-serif text-[var(--ink)]">
                Forecast Horizon Trajectory & Climatological EFI Spread
              </h3>
            </div>

            {/* Forecast Horizon Tabs */}
            <div className="flex items-center gap-1.5 p-1 bg-stone-100 rounded-full border border-stone-200/60 self-start lg:self-auto">
              {HORIZONS.map((h) => (
                <button
                  key={h.day}
                  onClick={() => setActiveHorizon(h.day)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-mono transition-all cursor-pointer ${
                    activeHorizon === h.day
                      ? "bg-[var(--ink)] text-white shadow-xs"
                      : "text-stone-600 hover:text-stone-900 hover:bg-white/60"
                  }`}
                >
                  {h.label}
                </button>
              ))}
            </div>
          </div>

          {/* Telemetry Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 pt-6">
            <div>
              <div className="text-xs font-mono uppercase text-stone-500 mb-1">Extreme Forecast Index</div>
              <div className="text-3xl font-serif text-[var(--ink)]">
                {activeHorizon === 3 && "0.84"}
                {activeHorizon === 5 && "0.96"}
                {activeHorizon === 7 && "0.91"}
                {activeHorizon === 10 && "0.78"}
              </div>
              <div className="text-xs text-stone-500 font-sans mt-0.5">ERA5 30-Year Quantile</div>
            </div>

            <div>
              <div className="text-xs font-mono uppercase text-stone-500 mb-1">Peak Sustained Wind</div>
              <div className="text-3xl font-serif text-[var(--ink)]">
                {activeHorizon === 3 && "148 km/h"}
                {activeHorizon === 5 && "195 km/h"}
                {activeHorizon === 7 && "165 km/h"}
                {activeHorizon === 10 && "85 km/h"}
              </div>
              <div className="text-xs text-stone-500 font-sans mt-0.5">5 km Downscaled Core</div>
            </div>

            <div>
              <div className="text-xs font-mono uppercase text-stone-500 mb-1">Threat Status</div>
              <div className="text-3xl font-serif text-[var(--ink)]">
                {activeHorizon === 3 && "Emergence"}
                {activeHorizon === 5 && "Peak Threat"}
                {activeHorizon === 7 && "Landfall"}
                {activeHorizon === 10 && "Dissipation"}
              </div>
              <div className="text-xs text-stone-500 font-sans mt-0.5">Kalman State Vector</div>
            </div>

            <div>
              <div className="text-xs font-mono uppercase text-stone-500 mb-1">Physics Conservation</div>
              <div className="text-3xl font-serif text-emerald-700">99.98%</div>
              <div className="text-xs text-stone-500 font-sans mt-0.5">∇ · (qv) Divergence Verified</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
