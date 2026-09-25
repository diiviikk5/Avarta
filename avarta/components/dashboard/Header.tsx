"use client";

import Link from "next/link";
import { ArrowLeft, Radio, ShieldCheck, Activity, Cpu, Bell } from "lucide-react";

interface DashboardHeaderProps {
  activeThreatCount: number;
}

export default function DashboardHeader({ activeThreatCount }: DashboardHeaderProps) {
  return (
    <header className="w-full bg-[#f5f5f5] border-b border-[#e7e5e4] px-6 sm:px-10 py-4 sticky top-0 z-40">
      <div className="max-w-[1340px] mx-auto flex flex-wrap items-center justify-between gap-4">
        {/* Brand & Editorial Title */}
        <div className="flex items-center gap-4">
          <Link
            href="/"
            className="text-[#777169] hover:text-[#0c0a09] transition-colors p-1.5 rounded-full hover:bg-[#e7e5e4]/60"
            title="Return to Home"
          >
            <ArrowLeft size={17} />
          </Link>

          <div className="flex items-baseline gap-3">
            <span
              className="text-2xl font-light tracking-tight text-[#0c0a09]"
              style={{ fontFamily: "var(--font-serif)" }}
            >
              Avarta
            </span>
            <span className="text-[11px] font-medium tracking-[0.12em] uppercase text-[#777169] border-l border-[#d6d3d1] pl-3 hidden sm:inline">
              Meteorological Intelligence Console
            </span>
          </div>
        </div>

        {/* Quiet Scientific Telemetry Badges */}
        <div className="hidden xl:flex items-center gap-2.5 text-xs">
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white border border-[#e7e5e4] text-[#4e4e4e] shadow-[0_2px_8px_rgba(0,0,0,0.02)]">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span className="font-medium text-[#292524]">NEPS-G 12km EPS</span>
            <span className="text-[#a8a29e]">· Synchronized</span>
          </div>

          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white border border-[#e7e5e4] text-[#4e4e4e] shadow-[0_2px_8px_rgba(0,0,0,0.02)]">
            <Activity size={12} className="text-[#777169]" />
            <span className="font-medium text-[#292524]">Spherical GNN v2.4</span>
            <span className="text-[#a8a29e]">· Active Mesh</span>
          </div>

          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white border border-[#e7e5e4] text-[#4e4e4e] shadow-[0_2px_8px_rgba(0,0,0,0.02)]">
            <Cpu size={12} className="text-[#777169]" />
            <span className="font-medium text-[#292524]">5km Diffusion</span>
            <span className="text-[#a8a29e]">· Threat-First Crop</span>
          </div>

          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white border border-[#e7e5e4] text-[#4e4e4e] shadow-[0_2px_8px_rgba(0,0,0,0.02)]">
            <ShieldCheck size={12} className="text-emerald-600" />
            <span className="font-medium text-[#292524]">Physics Guard</span>
            <span className="text-emerald-700 font-semibold">99.4% Valid</span>
          </div>
        </div>

        {/* Right Action: Active Threats Pill */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#f0efed] border border-[#e7e5e4] text-xs">
            <span className="w-1.5 h-1.5 rounded-full bg-[#0c0a09]" />
            <span className="text-[#0c0a09] font-medium">
              {activeThreatCount} Active 4D Corridors
            </span>
          </div>

          <Link
            href="/api/threats"
            target="_blank"
            className="hidden sm:inline-flex items-center gap-1.5 text-xs font-medium text-[#292524] bg-white hover:bg-[#fafafa] border border-[#d6d3d1] px-3.5 py-1.5 rounded-full transition-colors shadow-[0_2px_6px_rgba(0,0,0,0.02)]"
          >
            <span>Live JSON Feed</span>
          </Link>
        </div>
      </div>
    </header>
  );
}
