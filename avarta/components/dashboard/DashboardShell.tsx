"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { CalendarDays, ChevronRight, CloudRain, FlaskConical, Layers3, MapPin, Navigation, Radar, Sparkles, Thermometer, Wind } from "lucide-react";
import styles from "./replay.module.css";

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
    if (currentCase.includes("cyclone")) return "16–21 May 2020";
    if (currentCase.includes("heat")) return "23–28 May 2024";
    return "23 August 2025";
  };

  return (
    <>
      <div className={styles.hazardSwitcher}>
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
  const isDemo = pathname === "/dashboard/demo";
  const current = [...LINKS].reverse().find((link) =>
    link.exact ? pathname === link.href : pathname.startsWith(link.href),
  ) ?? LINKS[0];

  return (
    <div className={styles.shell}>
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
          </div>
        </header>
        <main className={styles.main}>{children}</main>
      </div>
    </div>
  );
}
