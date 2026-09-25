"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { CalendarDays, ChevronRight, CloudRain, FlaskConical, Layers3, MapPin, Moon, Navigation, Radar, Sparkles, Sun, Thermometer, Wind } from "lucide-react";
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

function HazardControls({ isDemo, pathname }: { isDemo: boolean; pathname: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentCase = searchParams.get("case") || "rainfall";

  const handleCaseChange = (caseId: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("case", caseId);
    router.push(`${pathname}?${params.toString()}`);
  };

  const getCaseDateLabel = () => {
    if (currentCase.includes("live")) return "Live Operational NWP";
    if (currentCase.includes("cyclone")) return "16–21 May 2020";
    if (currentCase.includes("heat")) return "23–28 May 2024";
    return "23 August 2025";
  };

  return (
    <>
      <div className={styles.hazardSwitcher}>
        <button
          className={`${styles.hazardBtn} ${currentCase.includes("live") ? styles.hazardBtnActive : ""}`}
          onClick={() => handleCaseChange("live")}
          title="Live Operational Real-Time NWP Across India"
        >
          <span className={styles.livePulseDot} /> Live
        </button>
        <button
          className={`${styles.hazardBtn} ${currentCase === "rainfall" ? styles.hazardBtnActive : ""}`}
          onClick={() => handleCaseChange("rainfall")}
          title="23 August 2025 Northwest India Rain"
        >
          <CloudRain size={12} /> Rain
        </button>
        <button
          className={`${styles.hazardBtn} ${currentCase.includes("cyclone") ? styles.hazardBtnActive : ""}`}
          onClick={() => handleCaseChange("cyclone")}
          title="May 2020 Super Cyclone Amphan"
        >
          <Wind size={12} /> Cyclone
        </button>
        <button
          className={`${styles.hazardBtn} ${currentCase.includes("heat") ? styles.hazardBtnActive : ""}`}
          onClick={() => handleCaseChange("heatwave")}
          title="May 2024 North India Severe Heat Dome"
        >
          <Thermometer size={12} /> Heatwave
        </button>
      </div>

      {!isDemo && (
        <span className={styles.topDate}>
          <CalendarDays size={14} /> {getCaseDateLabel()}
        </span>
      )}
    </>
  );
}

export default function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [theme, setTheme] = useState<"light" | "dark">("light");

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

  const isDemo = pathname === "/dashboard/demo";
  const current = [...LINKS].reverse().find((link) =>
    link.exact ? pathname === link.href : pathname.startsWith(link.href),
  ) ?? LINKS[0];

  return (
    <div className={`${styles.shell} ${theme === "dark" ? styles.shellDark : ""}`} data-theme={theme}>
      <aside className={styles.rail}>
        <Link href="/dashboard" className={styles.logo} aria-label="Avarta home">
          <span className={styles.logoMark}>a</span>
          <span>avarta<span className={styles.logoDot}>.</span></span>
        </Link>
        <p className={styles.railLabel}>WORKSPACE</p>
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
      <div className={styles.content}>
        <header className={styles.topbar}>
          <div className={styles.breadcrumb}>
            Avarta <ChevronRight size={13} /> Weather intelligence <ChevronRight size={13} /> <strong>{current.label}</strong>
          </div>
          <div className={styles.topRight}>
            <Suspense fallback={
              <div className={styles.hazardSwitcher}>
                <button className={`${styles.hazardBtn} ${styles.hazardBtnActive}`}>
                  <CloudRain size={12} /> Rain
                </button>
              </div>
            }>
              <HazardControls isDemo={isDemo} pathname={pathname} />
            </Suspense>
            <span className={styles.status}>{isDemo ? "SYNTHETIC DEMO" : "HISTORICAL REPLAY"}</span>
            <ThemeToggle />
          </div>
        </header>
        <main className={styles.main}>{children}</main>
      </div>
      <AssistantWidget />
    </div>
  );
}
