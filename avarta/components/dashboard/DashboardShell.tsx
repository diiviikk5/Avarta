"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import {
  Database,
  Sparkles,
  Terminal,
} from "lucide-react";
import styles from "./replay.module.css";
import sihStyles from "./sih.module.css";
import AssistantWidget from "./AssistantWidget";

const TOP_PILL_LINKS = [
  { href: "/dashboard", label: "Overview", exact: true },
  { href: "/dashboard/downscaling", label: "Downscale" },
  { href: "/dashboard/training", label: "AI Core" },
  { href: "/dashboard/risk", label: "Risk Grid" },
  { href: "/dashboard/terminal", label: "Terminal" },
  { href: "/dashboard/trajectory", label: "Trajectory" },
  { href: "/dashboard/inspector", label: "Inspector" },
  { href: "/dashboard/ask", label: "Copilot" },
  { href: "/dashboard/validation", label: "Validation" },
  { href: "/dashboard/human-approval", label: "Approval" },
  { href: "/dashboard/demo", label: "Demo" },
];

export default function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", "dark");
  }, []);

  return (
    <div className={`${styles.shell} ${styles.shellDark}`} data-theme="dark">
      {/* Content Area with Signature Argus Floating Header */}
      <div className={styles.content}>
        <header className="sticky top-0 z-40 w-full py-2.5 px-4 sm:px-6 flex items-center justify-between gap-3 backdrop-blur-xl border-b bg-black/90 border-white/10 text-white">
          {/* Left: Brand Logo only */}
          <div className="flex items-center shrink-0">
            <Link
              href="/"
              className="flex items-center gap-2.5 group"
              title="Return to Landing Portal"
            >
              <div className="w-8 h-8 rounded-full shadow-sm grid place-items-center bg-white group-hover:scale-105 transition-transform shrink-0">
                <img src="/assets/logo.webp" alt="Avarta" width={32} height={32} className="w-[70%] h-[70%] object-contain" />
              </div>
              <span className="font-mono font-bold text-[17px] tracking-tight text-white hidden sm:inline">
                avarta<span className="text-[#ffb4c8]">.</span>
              </span>
            </Link>
          </div>

          {/* Center: Signature White Nav Pill - Cleanly centered with zero cropping */}
          <div className="flex-1 flex justify-center items-center min-w-0 px-2 overflow-x-auto scrollbar-none">
            <nav className="flex h-9 px-2 sm:px-3 rounded-full shadow-[0_4px_14px_rgba(0,0,0,0.25)] items-center gap-0.5 sm:gap-1 bg-white text-black shrink-0 max-w-full">
              {TOP_PILL_LINKS.map((link) => {
                const active = link.exact ? pathname === link.href : pathname.startsWith(link.href);
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`font-sans font-medium text-[11.5px] sm:text-[12px] tracking-tight px-2.5 sm:px-3 py-1 rounded-full transition-all whitespace-nowrap relative ${
                      active ? "text-black font-semibold" : "text-[#2e2e2e]/65 hover:text-black"
                    }`}
                  >
                    {link.label}
                    {active && (
                      <span className="absolute bottom-[3px] left-1/2 -translate-x-1/2 w-[3px] h-[3px] rounded-full bg-black shadow-[-5px_0_0_#000,5px_0_0_#000]" />
                    )}
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Right: Quick CLI & Landing Portal Action Buttons */}
          <div className="flex items-center gap-2 shrink-0">
            <details className={sihStyles.provenance}>
              <summary className="h-8 px-3 rounded-full text-xs font-medium inline-flex items-center gap-1.5 transition-colors bg-[#111827] text-[#7dd3fc] hover:bg-[#172033] border border-sky-400/20" title="Official data sources and provenance">
                <Database size={13} /><span className="hidden xl:inline">Sources</span>
              </summary>
              <div className={sihStyles.provenanceDrawer}>
                <div className={sihStyles.eyebrow}>DATA SOURCES & PROVENANCE</div>
                <div className={sihStyles.source}><b>MoES / NCMRWF NEPS-G 12km Ensemble</b><span>ACTIVE INGESTION FEED</span></div>
                <div className={sihStyles.source}><b>IMDAA 12km 30-Year Reanalysis · 1990–2020</b><span>EFI BASELINE</span></div>
                <div className={sihStyles.source}><b>NCUM Global Deterministic · MoES</b><span>BOUNDARY CONDITIONS</span></div>
                <div className={sihStyles.source}><b>IMD Pune Gridded 4km</b><span>VALIDATION TARGET</span></div>
                <div className={sihStyles.source}><b>Copernicus DEM 30m / ESA WorldCover</b><span>LAND CONDITIONING</span></div>
              </div>
            </details>
            <Link
              href="/dashboard/terminal"
              className="h-8 px-3 rounded-full text-xs font-medium inline-flex items-center gap-1.5 transition-colors bg-[#28282a] text-[#c8c8c8] hover:bg-[#323234] hover:text-white"
              title="Terminal / CLI"
            >
              <Terminal size={13} />
              <span className="hidden sm:inline">CLI</span>
            </Link>
            <Link
              href="/"
              className="h-8 px-3.5 rounded-full text-xs font-semibold inline-flex items-center gap-1.5 transition-opacity shadow-sm bg-white text-black hover:opacity-90"
              title="Return to Landing Portal"
            >
              <Sparkles size={13} />
              <span className="hidden sm:inline">Portal</span>
            </Link>
          </div>
        </header>

        <main className={styles.main}>{children}</main>
      </div>

      <AssistantWidget />
    </div>
  );
}
