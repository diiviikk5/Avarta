"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import {
  CloudRain,
  FlaskConical,
  Layers3,
  MapPin,
  Moon,
  Navigation,
  PanelLeftClose,
  PanelLeftOpen,
  Radar,
  Sparkles,
  Sun,
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

function ThemeToggle() {
  const [theme, setTheme] = useState<"light" | "dark">("dark");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem("avarta-theme") as "light" | "dark" | null;
    const initial = saved ?? "dark";
    setTheme(initial);
    document.documentElement.setAttribute("data-theme", initial);
  }, []);

  const toggleTheme = () => {
    const next = theme === "light" ? "dark" : "light";
    setTheme(next);
    localStorage.setItem("avarta-theme", next);
    document.documentElement.setAttribute("data-theme", next);
  };

  return (
    <button
      onClick={toggleTheme}
      className={`${styles.themeBtn} ${mounted && theme === "dark" ? styles.themeBtnDark : ""}`}
      aria-label={mounted && theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
      title={mounted && theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
    >
      {mounted && theme === "dark" ? (
        <>
          <Sun size={13} className={styles.themeSun} />
          <span>Light</span>
        </>
      ) : (
        <>
          <Moon size={13} className={styles.themeMoon} />
          <span>Dark</span>
        </>
      )}
    </button>
  );
}

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
  const [theme, setTheme] = useState<"light" | "dark">("dark");
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  useEffect(() => {
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

  useEffect(() => {
    const checkTheme = () => {
      const current = (document.documentElement.getAttribute("data-theme") as "light" | "dark") || "dark";
      setTheme(current);
    };
    checkTheme();
    const observer = new MutationObserver(checkTheme);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => observer.disconnect();
  }, []);

  return (
    <div className={`${styles.shell} ${theme === "dark" ? styles.shellDark : ""}`} data-theme={theme}>
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

        {/* Theme Toggle in Sidebar */}
        <div style={{ marginTop: "auto", paddingTop: "14px", paddingLeft: "4px", paddingRight: "4px" }}>
          <ThemeToggle />
        </div>

        <div className={styles.railBottom}>
          <span className={styles.railPulse} />
          <span>Research prototype<br /><small>MoES / NCMRWF 26078</small></span>
        </div>
      </aside>

      {/* Floating Sidebar Reopen Controls (When Sidebar is Collapsed) */}
      {!isSidebarOpen && (
        <div className={styles.floatingControlGroup}>
          <button
            onClick={toggleSidebar}
            className={styles.floatingSidebarOpener}
            title="Open sidebar (Ctrl+B)"
            aria-label="Open sidebar"
          >
            <PanelLeftOpen size={16} />
            <span>Open Menu</span>
          </button>
          <ThemeToggle />
        </div>
      )}

      {/* Content Area with Signature Argus Floating Header */}
      <div className={styles.content}>
        <header className="sticky top-0 z-40 w-full py-3 px-6 flex items-center justify-between gap-4 bg-black/80 backdrop-blur-xl border-b border-white/10">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="w-10 h-10 rounded-full bg-white shadow-[0_4px_14px_rgba(0,0,0,0.16)] grid place-items-center hover:scale-105 transition-transform shrink-0"
              title="Return to Landing Portal"
            >
              <img src="/assets/logo.webp" alt="Avarta" width={44} height={44} className="w-[70%] h-[70%] object-contain" />
            </Link>
            <button
              onClick={toggleSidebar}
              className="p-2 rounded-full hover:bg-white/10 text-zinc-400 hover:text-white transition-colors"
              title="Toggle Sidebar (Ctrl+B)"
            >
              {isSidebarOpen ? <PanelLeftClose size={17} /> : <PanelLeftOpen size={17} />}
            </button>
          </div>

          {/* Centered White Nav Pill with 3-dot active indicator */}
          <nav className="hidden xl:flex bg-white h-10 px-3 rounded-full shadow-[0_4px_14px_rgba(0,0,0,0.2)] items-center justify-around gap-1 max-w-[850px]">
            {TOP_PILL_LINKS.map((link) => {
              const active = link.exact ? pathname === link.href : pathname.startsWith(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`font-sans font-medium text-[12px] tracking-tight px-3 py-1.5 rounded-full transition-all relative ${
                    active ? "text-black font-semibold" : "text-[#2e2e2e]/60 hover:text-black"
                  }`}
                >
                  {link.label}
                  {active && (
                    <span className="absolute bottom-[4px] left-1/2 -translate-x-1/2 w-[3px] h-[3px] rounded-full bg-black shadow-[-5px_0_0_#000,5px_0_0_#000]" />
                  )}
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-2">
            <Link
              href="/dashboard/terminal"
              className="bg-[#28282a] text-[#c8c8c8] hover:bg-[#323234] hover:text-white h-9 px-3.5 rounded-full text-xs font-medium inline-flex items-center gap-1.5 transition-colors"
            >
              <Terminal size={13} />
              <span>CLI</span>
            </Link>
            <Link
              href="/"
              className="bg-white text-black hover:opacity-90 h-9 px-4 rounded-full text-xs font-semibold inline-flex items-center gap-1.5 transition-opacity shadow-sm"
            >
              <Sparkles size={13} />
              <span>Portal</span>
            </Link>
          </div>
        </header>

        <main className={styles.main}>{children}</main>
      </div>

      <AssistantWidget />
    </div>
  );
}
