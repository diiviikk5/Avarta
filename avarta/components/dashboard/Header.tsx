"use client";

import Link from "next/link";
import { ArrowLeft, Radio } from "lucide-react";

interface DashboardHeaderProps {
  activeThreatCount: number;
}

export default function DashboardHeader({ activeThreatCount }: DashboardHeaderProps) {
  return (
    <header className="w-full bg-[#110f0e] border-b border-stone-800/80 px-6 sm:px-10 py-3.5 sticky top-0 z-40 text-stone-100">
      <div className="max-w-[1400px] mx-auto flex items-center justify-between gap-4">
        {/* Left: Brand & Quiet Horizon Indicator */}
        <div className="flex items-center gap-4">
          <Link
            href="/"
            className="text-stone-400 hover:text-white transition-colors p-1.5 rounded-full hover:bg-stone-800/80"
            title="Return to Home"
          >
            <ArrowLeft size={16} />
          </Link>

          <div className="flex items-center gap-3">
            <span
              className="text-2xl font-light tracking-tight text-white"
              style={{ fontFamily: "var(--font-serif)" }}
            >
              Avarta
            </span>
            <span className="w-1 h-1 rounded-full bg-stone-700 hidden sm:inline" />
            <div className="hidden sm:flex items-center gap-2 text-xs font-mono text-stone-400">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Medium-Range Threat Intelligence</span>
            </div>
          </div>
        </div>

        {/* Right: Active Threats Counter & Direct CAP Feed */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-stone-900 border border-stone-800 text-xs font-mono text-stone-300">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span>{activeThreatCount} Active 4D Corridors</span>
          </div>

          <Link
            href="/api/threats"
            target="_blank"
            className="hidden sm:inline-flex items-center text-xs font-medium text-stone-300 hover:text-white bg-transparent hover:bg-stone-900 border border-stone-800 px-4 py-1.5 rounded-full transition-colors"
          >
            REST API
          </Link>
        </div>
      </div>
    </header>
  );
}
