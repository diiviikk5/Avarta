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
} from "lucide-react";
import styles from "./replay.module.css";
import AssistantWidget from "./AssistantWidget";

const LINKS = [
  { href: "/dashboard", label: "Overview", icon: Layers3, exact: true },
  { href: "/dashboard/inspector", label: "Inspector", icon: MapPin },
  { href: "/dashboard/trajectory", label: "Trajectory", icon: Navigation },
  { href: "/dashboard/risk", label: "Risk Map", icon: Thermometer },
  { href: "/dashboard/downscaling", label: "Downscaling", icon: Radar },
  { href: "/dashboard/ask", label: "Ask", icon: Sparkles },
  { href: "/dashboard/validation", label: "Validation", icon: FlaskConical },
  { href: "/dashboard/demo", label: "Prototype demo", icon: CloudRain },
];

function ThemeToggle() {
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem("avarta-theme") as "light" | "dark" | null;
    const initial = saved ?? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
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
  const [theme, setTheme] = useState<"light" | "dark">("light");
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
      const current = (document.documentElement.getAttribute("data-theme") as "light" | "dark") || "light";
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

      {/* Content Area - No Topbar Header */}
      <div className={styles.content}>
        <main className={styles.main}>{children}</main>
      </div>

      <AssistantWidget />
    </div>
  );
}
