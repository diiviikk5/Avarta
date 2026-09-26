"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import {
  CloudRain,
  FlaskConical,
  Layers3,
  MapPin,
  Navigation,
  PanelLeftClose,
  PanelLeftOpen,
  Radar,
  Sparkles,
  Thermometer,
  Wind,
  Terminal,
} from "lucide-react";
import styles from "./replay.module.css";
import AssistantWidget from "./AssistantWidget";

const LINKS = [
  { href: "/", label: "Landing Portal", icon: Sparkles, exact: true },
  { href: "/dashboard", label: "Overview", icon: Layers3, exact: true },
  { href: "/dashboard/inspector", label: "Inspector", icon: MapPin },
  { href: "/dashboard/trajectory", label: "Trajectory", icon: Navigation },
  { href: "/dashboard/risk", label: "Risk Map", icon: Thermometer },
  { href: "/dashboard/downscaling", label: "Downscaling", icon: Radar },
  { href: "/dashboard/terminal", label: "Terminal / CLI", icon: Terminal },
  { href: "/dashboard/ask", label: "Ask Copilot", icon: Sparkles },
  { href: "/dashboard/validation", label: "Validation", icon: FlaskConical },
  { href: "/dashboard/demo", label: "Prototype demo", icon: CloudRain },
];

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

function SidebarHazardControls({ pathname }: { pathname: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentCase = searchParams.get("case") || "rainfall";

  const handleCaseChange = (caseId: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("case", caseId);
    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <div className={styles.sidebarHazardPills}>
      <button
        className={`${styles.sidebarHazardBtn} ${currentCase.includes("live") ? styles.sidebarHazardBtnActive : ""}`}
        onClick={() => handleCaseChange("live")}
        title="Live Operational Assimilation"
      >
        <span className={styles.livePulseDot} /> Live
      </button>
      <button
        className={`${styles.sidebarHazardBtn} ${currentCase === "rainfall" ? styles.sidebarHazardBtnActive : ""}`}
        onClick={() => handleCaseChange("rainfall")}
        title="23 August 2025 Northwest Rain"
      >
        <CloudRain size={12} /> Rain
      </button>
      <button
        className={`${styles.sidebarHazardBtn} ${currentCase.includes("cyclone") ? styles.sidebarHazardBtnActive : ""}`}
        onClick={() => handleCaseChange("cyclone")}
        title="May 2020 Super Cyclone Amphan"
      >
        <Wind size={12} /> Cyclone
      </button>
      <button
        className={`${styles.sidebarHazardBtn} ${currentCase.includes("heat") ? styles.sidebarHazardBtnActive : ""}`}
        onClick={() => handleCaseChange("heatwave")}
        title="May 2024 North India Severe Heat Dome"
      >
        <Thermometer size={12} /> Heat
      </button>
    </div>
  );
}

export default function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", "dark");
    const saved = localStorage.getItem("avarta-sidebar-open");
    if (saved !== null) {
      setIsSidebarOpen(saved === "true");
    }
  }, []);

  const toggleSidebar = () => {
    setIsSidebarOpen((prev) => {
      const next = !prev;
      localStorage.setItem("avarta-sidebar-open", String(next));
      return next;
    });
  };

  // Keyboard shortcut Ctrl+B / Cmd+B to toggle sidebar
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "b") {
        e.preventDefault();
        toggleSidebar();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <div className={`${styles.shell} ${styles.shellDark}`} data-theme="dark">
      {/* Collapsible Left Rail Sidebar */}
      <aside className={`${styles.rail} ${!isSidebarOpen ? styles.railClosed : ""}`}>
        <div className={styles.sidebarHeader}>
          <Link href="/dashboard" className={styles.logo} aria-label="Avarta home">
            <span className={styles.logoMark}>a</span>
            <span>avarta<span className={styles.logoDot}>.</span></span>
          </Link>
          <button
            onClick={toggleSidebar}
            className={styles.sidebarToggleBtn}
            title="Collapse sidebar (Ctrl+B)"
            aria-label="Collapse sidebar"
          >
            <PanelLeftClose size={18} />
          </button>
        </div>

        {/* Hazard Selector in Sidebar */}
        <div className={styles.sidebarHazardGroup}>
          <div className={styles.sidebarHazardLabel}>SURVEILLANCE MODE</div>
          <Suspense fallback={null}>
            <SidebarHazardControls pathname={pathname} />
          </Suspense>
        </div>

        <p className={styles.railLabel} style={{ margin: "14px 12px 10px" }}>WORKSPACE</p>
        <nav className={styles.nav}>
          {LINKS.map((link) => {
            const active = link.exact ? pathname === link.href : pathname.startsWith(link.href);
            const Icon = link.icon;
            return (
              <Link key={link.href} href={link.href} className={active ? styles.navActive : ""} aria-current={active ? "page" : undefined}>
                <Icon size={17} /> {link.label}
              </Link>
            );
          })}
        </nav>

        <div className={styles.railBottom}>
          <span className={styles.railPulse} />
          <span>Research prototype<br /><small>MoES / NCMRWF 26078</small></span>
        </div>
      </aside>

      {/* Content Area with Signature Argus Floating Header */}
      <div className={styles.content}>
        <header className="sticky top-0 z-40 w-full py-2.5 px-4 sm:px-6 flex items-center justify-between gap-4 backdrop-blur-xl border-b bg-black/85 border-white/10 text-white">
          <div className="flex items-center gap-2.5 shrink-0">
            <Link
              href="/"
              className="w-8 h-8 sm:w-8.5 sm:h-8.5 rounded-full shadow-sm grid place-items-center hover:scale-105 transition-transform shrink-0 bg-white"
              title="Return to Landing Portal"
            >
              <img src="/assets/logo.webp" alt="Avarta" width={36} height={36} className="w-[70%] h-[70%] object-contain" />
            </Link>

            <button
              onClick={toggleSidebar}
              className={`h-8 rounded-full text-xs font-medium inline-flex items-center gap-1.5 transition-all shadow-sm shrink-0 ${
                isSidebarOpen
                  ? "p-2 bg-transparent hover:bg-white/10 text-zinc-400 hover:text-white"
                  : "px-2.5 bg-[#18181b] hover:bg-[#27272a] border border-white/15 text-zinc-200 hover:text-white"
              }`}
              title={isSidebarOpen ? "Collapse sidebar (Ctrl+B)" : "Open sidebar menu (Ctrl+B)"}
              aria-label={isSidebarOpen ? "Collapse sidebar" : "Open sidebar menu"}
            >
              {isSidebarOpen ? (
                <PanelLeftClose size={15} />
              ) : (
                <>
                  <PanelLeftOpen size={13} className="text-[#ffb4c8]" />
                  <span className="text-[11px] font-sans font-medium">Menu</span>
                </>
              )}
            </button>
          </div>

          {/* Centered White Nav Pill with 3-dot active indicator */}
          <nav className="hidden xl:flex h-9 px-3 rounded-full shadow-[0_4px_14px_rgba(0,0,0,0.2)] items-center justify-around gap-1 max-w-[850px] bg-white text-black">
            {TOP_PILL_LINKS.map((link) => {
              const active = link.exact ? pathname === link.href : pathname.startsWith(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`font-sans font-medium text-[12px] tracking-tight px-3 py-1 rounded-full transition-all relative ${
                    active ? "text-black font-semibold" : "text-[#2e2e2e]/60 hover:text-black"
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

          <div className="flex items-center gap-2 shrink-0">
            <Link
              href="/dashboard/terminal"
              className="h-8 px-3 rounded-full text-xs font-medium inline-flex items-center gap-1.5 transition-colors bg-[#28282a] text-[#c8c8c8] hover:bg-[#323234] hover:text-white"
            >
              <Terminal size={13} />
              <span className="hidden sm:inline">CLI</span>
            </Link>
            <Link
              href="/"
              className="h-8 px-3.5 rounded-full text-xs font-semibold inline-flex items-center gap-1.5 transition-opacity shadow-sm bg-white text-black hover:opacity-90"
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
