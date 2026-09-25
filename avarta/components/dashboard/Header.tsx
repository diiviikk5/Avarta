"use client";

import Link from "next/link";
import { ArrowLeft, Radio, ShieldCheck, Activity, Cpu } from "lucide-react";

interface DashboardHeaderProps {
  activeThreatCount: number;
}

export default function DashboardHeader({ activeThreatCount }: DashboardHeaderProps) {
  return (
    <header className="w-full bg-[#141210] border-b border-[#292524] px-6 sm:px-10 py-4 sticky top-0 z-40 text-stone-100">
      <div className="max-w-[1340px] mx-auto flex flex-wrap items-center justify-between gap-4">
        {/* Brand & Editorial Title */}
        <div className="flex items-center gap-4">
          <Link
            href="/"
            className="text-stone-400 hover:text-white transition-colors p-1.5 rounded-full hover:bg-stone-800/80"
            title="Return to Home"
          >
            <ArrowLeft size={17} />
          </Link>

          <div className="flex items-baseline gap-3">
            <span
              className="text-2xl font-light tracking-tight text-white"
              style={{ fontFamily: "var(--font-serif)" }}
            >
              Avarta
            </span>
            <span className="text-[11px] font-medium tracking-[0.12em] uppercase text-stone-400 border-l border-stone-800 pl-3 hidden sm:inline">
              Meteorological Intelligence Console
            </span>
          </div>
        </div>

        {/* Quiet Scientific Telemetry Badges (Dark Mode) */}
        <div className="hidden xl:flex items-center gap-2.5 text-xs">
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#1c1917] border border-stone-800 text-stone-300 shadow-xs">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span className="font-medium text-white">NEPS-G 12km EPS</span>
            <span className="text-stone-500">· Synchronized</span>
          </div>

          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#1c1917] border border-stone-800 text-stone-300 shadow-xs">
            <Activity size={12} className="text-stone-400" />
            <span className="font-medium text-white">Spherical GNN v2.4</span>
            <span className="text-stone-500">· Active Mesh</span>
          </div>

          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#1c1917] border border-stone-800 text-stone-300 shadow-xs">
            <Cpu size={12} className="text-stone-400" />
            <span className="font-medium text-white">5km Diffusion</span>
            <span className="text-stone-500">· Threat-First Crop</span>
          </div>

          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#1c1917] border border-stone-800 text-stone-300 shadow-xs">
            <ShieldCheck size={12} className="text-emerald-400" />
            <span className="font-medium text-white">Physics Guard</span>
            <span className="text-emerald-400 font-semibold">99.4% Valid</span>
          </div>
        </div>

        {/* Right Action: Active Threats Pill */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#1c1917] border border-stone-800 text-xs">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-white font-medium">
              {activeThreatCount} Active 4D Corridors
            </span>
          </div>

          <Link
            href="/api/threats"
            target="_blank"
            className="hidden sm:inline-flex items-center gap-1.5 text-xs font-medium text-stone-200 bg-[#1c1917] hover:bg-stone-800 border border-stone-700 px-3.5 py-1.5 rounded-full transition-colors shadow-xs"
          >
            <span>Live JSON Feed</span>
          </Link>
        </div>
      </div>
    </header>
  );
}
