"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect } from "react";
import {
  CloudRain,
  Sparkles,
  Thermometer,
  Wind,
  Terminal,
} from "lucide-react";
import styles from "./replay.module.css";
import AssistantWidget from "./AssistantWidget";

const TOP_PILL_LINKS = [
  { href: "/dashboard", label: "Replay Lab", exact: true },
  { href: "/dashboard/downscaling", label: "PINN Downscale" },
  { href: "/dashboard/risk", label: "3D Risk Grid" },
  { href: "/dashboard/terminal", label: "Terminal CLI" },
  { href: "/dashboard/trajectory", label: "Trajectory" },
  { href: "/dashboard/inspector", label: "Inspector & CAP" },
  { href: "/dashboard/ask", label: "Copilot" },
  { href: "/dashboard/validation", label: "Validation" },
  { href: "/dashboard/demo", label: "Demo" },
];

function TopBarHazardControls({ pathname }: { pathname: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentCase = searchParams.get("case") || "rainfall";

  const handleCaseChange = (caseId: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("case", caseId);
    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <div className="hidden md:flex items-center gap-1 p-0.5 rounded-full bg-[#18181b] border border-white/10 shrink-0 text-[11px]">
      <button
        type="button"
        onClick={() => handleCaseChange("live")}
        className={`px-2.5 py-1 rounded-full font-medium transition-all flex items-center gap-1.5 ${
          currentCase.includes("live")
            ? "bg-[#ffb4c8] text-black shadow-sm font-semibold"
            : "text-zinc-400 hover:text-white"
        }`}
        title="Live Operational Assimilation"
      >
        <span className={`w-1.5 h-1.5 rounded-full ${currentCase.includes("live") ? "bg-black animate-pulse" : "bg-[#ffb4c8]"}`} />
        Live
      </button>
      <button
        type="button"
        onClick={() => handleCaseChange("rainfall")}
        className={`px-2.5 py-1 rounded-full font-medium transition-all flex items-center gap-1 ${
          currentCase === "rainfall"
            ? "bg-[#ffb4c8] text-black shadow-sm font-semibold"
            : "text-zinc-400 hover:text-white"
        }`}
        title="23 August 2025 Northwest Rain"
      >
        <CloudRain size={11} /> Rain
      </button>
      <button
        type="button"
        onClick={() => handleCaseChange("cyclone")}
        className={`px-2.5 py-1 rounded-full font-medium transition-all flex items-center gap-1 ${
          currentCase.includes("cyclone")
            ? "bg-[#ffb4c8] text-black shadow-sm font-semibold"
            : "text-zinc-400 hover:text-white"
        }`}
        title="May 2020 Super Cyclone Amphan"
      >
        <Wind size={11} /> Cyclone
      </button>
      <button
        type="button"
        onClick={() => handleCaseChange("heatwave")}
        className={`px-2.5 py-1 rounded-full font-medium transition-all flex items-center gap-1 ${
          currentCase.includes("heat")
            ? "bg-[#ffb4c8] text-black shadow-sm font-semibold"
            : "text-zinc-400 hover:text-white"
        }`}
        title="May 2024 North India Severe Heat Dome"
      >
        <Thermometer size={11} /> Heat
      </button>
    </div>
  );
}

export default function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", "dark");
  }, []);

  return (
    <div className={`${styles.shell} ${styles.shellDark}`} data-theme="dark">
      {/* Content Area with Permanent Signature Argus Floating Header */}
      <div className={styles.content}>
        <header className="sticky top-0 z-40 w-full py-2.5 px-3 sm:px-6 flex items-center justify-between gap-3 backdrop-blur-xl border-b bg-black/90 border-white/10 text-white">
          {/* Left: Brand Logo & Hazard Mode Pills */}
          <div className="flex items-center gap-3 shrink-0">
            <Link
              href="/"
              className="flex items-center gap-2 group"
              title="Return to Landing Portal"
            >
              <div className="w-8 h-8 rounded-full shadow-sm grid place-items-center bg-white group-hover:scale-105 transition-transform shrink-0">
                <img src="/assets/logo.webp" alt="Avarta" width={36} height={36} className="w-[70%] h-[70%] object-contain" />
              </div>
              <span className="font-mono font-bold text-[17px] tracking-tight text-white hidden sm:inline">
                avarta<span className="text-[#ffb4c8]">.</span>
              </span>
            </Link>

            <Suspense fallback={null}>
              <TopBarHazardControls pathname={pathname} />
            </Suspense>
          </div>

          {/* Center: Signature White Nav Pill - ALWAYS VISIBLE across all zoom levels with smooth scroll */}
          <div className="flex-1 flex justify-center min-w-0 overflow-x-auto scrollbar-none py-0.5 px-1">
            <nav className="flex h-9 px-2 sm:px-3 rounded-full shadow-[0_4px_14px_rgba(0,0,0,0.35)] items-center gap-0.5 sm:gap-1 bg-white text-black shrink-0">
              {TOP_PILL_LINKS.map((link) => {
                const active = link.exact ? pathname === link.href : pathname.startsWith(link.href);
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`font-sans font-medium text-[11px] sm:text-[12px] tracking-tight px-2.5 sm:px-3 py-1 rounded-full transition-all whitespace-nowrap relative ${
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
