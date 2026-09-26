"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  CloudRain,
  Compass,
  FileText,
  Flame,
  Layers3,
  MapPin,
  Navigation,
  Radar,
  Radio,
  Satellite,
  Send,
  ShieldAlert,
  Sparkles,
  Terminal as TerminalIcon,
  Wind,
} from "lucide-react";

export default function LandingView() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeCase, setActiveCase] = useState<"rainfall" | "cyclone" | "heatwave">("rainfall");
  const [termOutput, setTermOutput] = useState<string[]>([
    "Avarta Meteorological Intelligence Console v0.1.0",
    "Problem Statement #26078 (MoES / NCMRWF / IMD)",
    "Type 'help' to see all commands, or click any quick prompt below.",
  ]);
  const [termInput, setTermInput] = useState("");
  const [briefingZone, setBriefingZone] = useState("western_ghats");
  const [briefingText, setBriefingText] = useState(
    "Active ensemble consensus indicates severe orographic enhancement along windward slopes. 24h accumulation will exceed local drainage absorption limits (148 mm/day). Recommend pre-positioning SDRF teams near vulnerable Ghat cuttings on NH-66 and issuing GKMS agricultural advisory to postpone paddy harvesting."
  );

  const CASE_DATA = {
    rainfall: {
      title: "August 2025 Northwest India Rain",
      summary:
        "An archived NOAA GEFS forecast initialized 19 Aug 2025 00:00 UTC verified against the IMD 23 Aug daily rainfall grid across 2,237 common valid cells.",
      gefs: "44.61 mm/d",
      obs: "469.21 mm/d",
      cells: "2,237",
      mae: "13.97 mm/d",
      caveat:
        "Honest demonstration: 5 GEFS members missed the extreme 469 mm/d localized cloudburst peak, establishing need for physics-informed downscaling.",
    },
    cyclone: {
      title: "Super Cyclone Amphan (May 2020)",
      summary:
        "Extreme cyclonic storm with 185 km/h landfall winds reconstructed across Bay of Bengal coastal corridor with GNN spherical vortex tracking.",
      gefs: "124.5 km/h",
      obs: "185.0 km/h",
      cells: "4,812",
      mae: "18.42 km/h",
      caveat:
        "Track trajectory correctly predicted landfall within 24 km, but coarse resolution underestimated inner eyewall pressure drop.",
    },
    heatwave: {
      title: "2024 North India Severe Heat Dome",
      summary:
        "Persistent 500 hPa subtropical ridge trapped extreme subsidence heating across Indo-Gangetic Plains, evaluated against Stull wet-bulb metrics.",
      gefs: "44.2 °C",
      obs: "49.8 °C",
      cells: "6,140",
      mae: "2.14 °C",
      caveat:
        "High thermal consistency across 12 ECMWF members; maximum variance occurred over urban heat island centers.",
    },
  };

  const handleCommand = (raw: string) => {
    const cmd = raw.trim().toLowerCase();
    if (!cmd) return;

    const newLines = [...termOutput, `avarta@ncmrwf:~$ ${cmd}`];

    switch (cmd) {
      case "help":
        newLines.push(
          "AVAILABLE AVARTA COMMANDS:",
          "  status     - Show active NWP assimilation pipelines & cluster health",
          "  scan       - Run multi-variable anomaly detector over 30 Indian regions",
          "  downscale  - Trigger 5 km PINN downscaler with differentiable moisture flux",
          "  alerts     - Query OASIS CAP 1.2 emergency feeds & critical infrastructure",
          "  cases      - List verified historical cases (August 2025, Amphan, Heatwave)",
          "  clear      - Clear terminal screen"
        );
        break;
      case "status":
        newLines.push(
          "[SYSTEM STATUS] Operational Core Online",
          "  Assimilation Engine: ECMWF IFS (0.25°) + NOAA GEFS (0.5°) Control + 4 Members",
          "  Valid Grid Domain:   [6.0°N–37.5°N, 68.0°E–98.0°E] (All-India)",
          "  PINN Acceleration:   Active (PyTorch CUDA / Differentiable Conservation Barrier)",
          "  OASIS CAP Feed:      NDMA / SACHET XML v1.2 Protocol Synchronized"
        );
        break;
      case "scan":
        newLines.push(
          "[SCANNING 30 NWP SUB-DIVISIONS...]",
          "  [!] Severe Anomaly Detected: Western Ghats (148.4 mm/24h orographic moisture flux)",
          "  [!] High Anomaly Detected:   Konkan Coast & Goa (88.2 mm/24h runoff risk)",
          "  [!] Offshore Alert:          Bay of Bengal (92 km/h cyclonic surface gusts)",
          "  Hungarian Kalman Tracker:   3 Active Bounding Boxes Assigned"
        );
        break;
      case "downscale":
        newLines.push(
          "[TRIGGERING 5 KM PINN DOWNSCALING INFERENCE]",
          "  Input:  Coarse NWP 12 km moisture & wind tensor [16x16]",
          "  Loss:   Conservation constraint ∇·(qv) + w_oro (5km DEM slope gradient)",
          "  Result: Generated 5 km resolution field with 50.7% Fourier PSD fine-scale retention",
          "  Peak:   Predicted 162.4 mm/day (Standard Bilinear only resolved 58.2 mm/day)"
        );
        break;
      case "alerts":
        newLines.push(
          "[ACTIVE OASIS CAP 1.2 BROADCASTS]",
          "  ALERT ID:   AVARTA-CAP-2025-08-23-001",
          "  SEVERITY:   SEVERE | URGENCY: Immediate | CERTAINTY: Observed",
          "  POLYGON:    Geodesic 5km buffer around vulnerable Ghat corridors",
          "  IMPACT:     AIIMS buffer clear; NH-66 sector 4 alert; 220kV power lines flagged"
        );
        break;
      case "cases":
        newLines.push(
          "[VERIFIED CASE CATALOG]",
          "  1. august-2025.json    - Northwest India Rain (469 mm/d IMD vs 44.6 mm/d GEFS)",
          "  2. cyclone-amphan.json - Super Cyclone Amphan (185 km/h landfall)",
          "  3. heatwave-2024.json  - North India Heat Dome (49.8°C wet-bulb)"
        );
        break;
      case "clear":
        setTermOutput([
          "Avarta Meteorological Intelligence Console v0.1.0",
          "Type 'help' to see all commands.",
        ]);
        return;
      default:
        newLines.push(`Command not recognized: '${cmd}'. Type 'help' for command list.`);
        break;
    }

    setTermOutput(newLines);
  };

  const handleGenerateBriefing = () => {
    const BRIEFINGS: Record<string, string> = {
      western_ghats:
        "Active ensemble consensus indicates severe orographic enhancement along windward slopes. 24h accumulation will exceed local drainage absorption limits (148 mm/day). Recommend pre-positioning SDRF teams near vulnerable Ghat cuttings on NH-66 and issuing GKMS agricultural advisory to postpone paddy harvesting.",
      bay_of_bengal:
        "Deep depression vortex tracking northeastward at 14 km/h with gale wind gusts to 92 km/h. Coastal tidal surge expected to breach 1.2m above astronomical tide. Advise immediate return of all mechanized fishing vessels along Paradip-Dhamra corridor and prepare shelters in Balasore.",
      assam_brahmaputra:
        "High-altitude watershed precipitation in Arunachal catchment is propagating downriver. 48-hour flood wave arrival expected at Guwahati gauge. Critical infrastructure buffer: AIIMS Guwahati remains above 100-year inundation level; culverts on NH-27 require continuous debris monitoring.",
    };
    setBriefingText(BRIEFINGS[briefingZone] || BRIEFINGS.western_ghats);
  };

  return (
    <div className="relative min-h-screen bg-black text-white selection:bg-rose-500/20 selection:text-white font-sans overflow-x-hidden">
      {/* Background Video */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
        <video
          className="absolute inset-0 w-full h-full object-cover"
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
        >
          <source
            src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260809_012548_ef22562c-c0ae-4816-ad9d-f8922af4e6a7.mp4"
            type="video/mp4"
          />
        </video>
        <div className="absolute inset-0 bg-black/60 backdrop-blur-[1px]" />
      </div>

      {/* Hero Single Viewport */}
      <section className="relative z-10 w-full h-screen h-dvh flex flex-col justify-between items-center p-[clamp(16px,2.4vh,28px)_clamp(14px,3vw,32px)]">
        {/* Header */}
        <header className="w-full max-w-[1040px] mx-auto flex items-center justify-between gap-3 sm:gap-4 shrink-0 z-50">
          <Link
            href="/"
            className="w-11 h-11 rounded-full bg-white shadow-[0_4px_14px_rgba(0,0,0,0.16)] grid place-items-center cursor-pointer transition-all duration-300 hover:scale-105 shrink-0"
            aria-label="Avarta Home"
          >
            <img src="/assets/logo.webp" alt="Avarta" width={52} height={52} className="w-[72%] h-[72%] object-contain" />
          </Link>

          <nav className="hidden md:flex bg-white h-11 px-4 rounded-full shadow-[0_4px_14px_rgba(0,0,0,0.16)] items-center justify-between gap-1 flex-1 max-w-[660px]">
            <Link href="/" className="font-sans font-medium text-[13px] tracking-tight px-3.5 py-1.5 rounded-full text-[#2e2e2e] relative active-link whitespace-nowrap">
              Home
              <span className="absolute bottom-[4px] left-1/2 -translate-x-1/2 w-[3px] h-[3px] rounded-full bg-black shadow-[-5px_0_0_#000,5px_0_0_#000]" />
            </Link>
            <Link href="/dashboard" className="font-sans font-medium text-[13px] tracking-tight px-3.5 py-1.5 rounded-full text-[#2e2e2e]/60 hover:text-black transition-colors whitespace-nowrap">
              Replay Lab
            </Link>
            <Link href="/dashboard/downscaling" className="font-sans font-medium text-[13px] tracking-tight px-3.5 py-1.5 rounded-full text-[#2e2e2e]/60 hover:text-black transition-colors whitespace-nowrap">
              Downscale
            </Link>
            <Link href="/dashboard/risk" className="font-sans font-medium text-[13px] tracking-tight px-3.5 py-1.5 rounded-full text-[#2e2e2e]/60 hover:text-black transition-colors whitespace-nowrap">
              Risk Grid
            </Link>
            <Link href="/dashboard/terminal" className="font-sans font-medium text-[13px] tracking-tight px-3.5 py-1.5 rounded-full text-[#2e2e2e]/60 hover:text-black transition-colors whitespace-nowrap">
              Terminal
            </Link>
            <Link href="/dashboard/inspector" className="font-sans font-medium text-[13px] tracking-tight px-3.5 py-1.5 rounded-full text-[#2e2e2e]/60 hover:text-black transition-colors whitespace-nowrap">
              CAP Feed
            </Link>
          </nav>

          <Link
            href="/dashboard"
            className="hidden md:inline-flex bg-[#28282a] text-[#c8c8c8] hover:bg-[#323234] hover:text-white h-11 px-5 rounded-full shadow-[0_4px_14px_rgba(0,0,0,0.16)] items-center justify-center font-sans font-medium text-[13px] tracking-tight transition-all shrink-0 whitespace-nowrap"
          >
            Launch Console
          </Link>

          {/* Mobile Burger */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="flex md:hidden items-center justify-center w-11 h-11 rounded-full bg-[#28282a] text-white transition-all"
            aria-label="Toggle menu"
          >
            <Layers3 className="w-5 h-5" />
          </button>
        </header>

        {/* Mobile Sheet */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex flex-col items-center justify-center p-6 md:hidden">
            <div className="w-full max-w-sm bg-white text-black rounded-3xl p-6 flex flex-col gap-4 shadow-2xl">
              <div className="flex justify-between items-center pb-2 border-b border-zinc-200">
                <span className="font-bold text-sm tracking-wider uppercase">Navigation</span>
                <button onClick={() => setMobileMenuOpen(false)} className="text-zinc-600 hover:text-black font-bold">✕</button>
              </div>
              <Link href="/" onClick={() => setMobileMenuOpen(false)} className="py-2 px-3 rounded-lg hover:bg-zinc-100 font-medium text-sm">Home</Link>
              <Link href="/dashboard" onClick={() => setMobileMenuOpen(false)} className="py-2 px-3 rounded-lg hover:bg-zinc-100 font-medium text-sm">Replay Lab</Link>
              <Link href="/dashboard/downscaling" onClick={() => setMobileMenuOpen(false)} className="py-2 px-3 rounded-lg hover:bg-zinc-100 font-medium text-sm">PINN Downscaling</Link>
              <Link href="/dashboard/risk" onClick={() => setMobileMenuOpen(false)} className="py-2 px-3 rounded-lg hover:bg-zinc-100 font-medium text-sm">All-India Risk Map</Link>
              <Link href="/dashboard/trajectory" onClick={() => setMobileMenuOpen(false)} className="py-2 px-3 rounded-lg hover:bg-zinc-100 font-medium text-sm">Kalman 4D Trajectory</Link>
              <Link href="/dashboard/terminal" onClick={() => setMobileMenuOpen(false)} className="py-2 px-3 rounded-lg hover:bg-zinc-100 font-medium text-sm">Terminal Mission Control</Link>
              <Link href="/dashboard/inspector" onClick={() => setMobileMenuOpen(false)} className="py-2 px-3 rounded-lg hover:bg-zinc-100 font-medium text-sm">OASIS CAP 1.2 Feed</Link>
              <Link href="/dashboard" onClick={() => setMobileMenuOpen(false)} className="w-full bg-[#28282a] text-white py-3 rounded-full text-center font-medium text-sm mt-2">Launch Console</Link>
            </div>
          </div>
        )}

        {/* Hero Body */}
        <main className="flex-1 flex flex-col items-center justify-center text-center max-w-[920px] w-full my-auto z-10">
          {/* Trust Row */}
          <div className="inline-flex items-center mb-[clamp(16px,2.5vh,26px)]">
            <div className="flex items-center">
              <div className="w-[clamp(36px,4.5vw,42px)] h-[clamp(36px,4.5vw,42px)] rounded-full bg-[#28282a] border border-white/40 p-[5px] grid place-items-center relative z-[1]">
                <div className="w-full h-full rounded-full bg-white flex items-center justify-center text-[#111] text-[13px]">
                  <CloudRain className="w-3.5 h-3.5" />
                </div>
              </div>
              <div className="w-[clamp(36px,4.5vw,42px)] h-[clamp(36px,4.5vw,42px)] rounded-full bg-[#28282a] border border-white/40 p-[5px] grid place-items-center relative z-[2] -ml-[calc(clamp(36px,4.5vw,42px)*0.42)]">
                <div className="w-full h-full rounded-full bg-white flex items-center justify-center text-[#111] text-[13px]">
                  <Satellite className="w-3.5 h-3.5" />
                </div>
              </div>
              <div className="w-[clamp(36px,4.5vw,42px)] h-[clamp(36px,4.5vw,42px)] rounded-full bg-[#28282a] border border-white/40 p-[5px] grid place-items-center relative z-[4] -ml-[calc(clamp(36px,4.5vw,42px)*0.42)]">
                <div className="w-full h-full rounded-full bg-white flex items-center justify-center text-[#111] text-[13px]">
                  <Wind className="w-3.5 h-3.5" />
                </div>
              </div>
            </div>
            <div className="h-[clamp(36px,4.5vw,42px)] bg-[#28282a] border border-white/40 rounded-full inline-flex items-center -ml-[calc(clamp(36px,4.5vw,42px)*0.42)] pl-[calc(clamp(36px,4.5vw,42px)*0.58)] pr-4 z-[3]">
              <span className="font-sans font-medium text-[#c4c2c3] text-[clamp(11.5px,1.3vw,13px)] whitespace-nowrap">
                Validated on MoES / NCMRWF Problem Statement #26078
              </span>
            </div>
          </div>

          {/* Headline */}
          <h1
            className="text-white text-[clamp(44px,11vw,120px)] leading-[0.98] tracking-[-0.03em] font-normal select-none m-0 p-0 uppercase"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            AVARTA
          </h1>

          {/* Subhead */}
          <p className="max-w-2xl font-sans text-sm sm:text-base text-zinc-300 leading-relaxed font-normal mt-4 mb-6 opacity-85 px-4">
            Physics-informed neural downscaling, multi-hazard 4D trajectory tracking, and automated OASIS CAP alerts for extreme weather events across India.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/dashboard"
              className="bg-white text-black font-sans font-semibold text-[clamp(13px,1.4vw,14.5px)] px-7 py-3 rounded-full shadow-[0_0_22px_rgba(255,255,255,0.32)] hover:scale-105 transition-all"
            >
              Launch Replay Lab
            </Link>
            <Link
              href="/dashboard/terminal"
              className="bg-white/10 hover:bg-white/20 text-white border border-white/25 font-sans font-medium text-[clamp(13px,1.4vw,14.5px)] px-6 py-3 rounded-full backdrop-blur-md transition-all"
            >
              Interactive TUI Console
            </Link>
          </div>
        </main>

        {/* Stats Footer */}
        <footer className="w-full max-w-[960px] shrink-0 z-10">
          <div className="grid grid-cols-4 max-[720px]:grid-cols-2 gap-4 text-center">
            <div className="flex flex-col items-center">
              <div className="flex items-baseline gap-1">
                <span className="text-white text-2xl sm:text-3xl leading-none" style={{ fontFamily: 'var(--font-display)' }}>&lt;</span>
                <span className="text-white text-xl sm:text-2xl font-medium tracking-tight">5km</span>
              </div>
              <div className="text-zinc-400 text-xs mt-1">PINN Downscaled Grid</div>
            </div>

            <div className="flex flex-col items-center">
              <div className="flex items-baseline gap-1">
                <span className="text-white text-2xl sm:text-3xl leading-none" style={{ fontFamily: 'var(--font-display)' }}>%</span>
                <span className="text-white text-xl sm:text-2xl font-medium tracking-tight">50.7%</span>
              </div>
              <div className="text-zinc-400 text-xs mt-1">High-Freq PSD Energy</div>
            </div>

            <div className="flex flex-col items-center">
              <div className="flex items-baseline gap-1">
                <span className="text-white text-2xl sm:text-3xl leading-none" style={{ fontFamily: 'var(--font-display)' }}>*</span>
                <span className="text-white text-xl sm:text-2xl font-medium tracking-tight">24/7</span>
              </div>
              <div className="text-zinc-400 text-xs mt-1">NWP Data Assimilation</div>
            </div>

            <div className="flex flex-col items-center">
              <div className="flex items-baseline gap-1">
                <span className="text-white text-2xl sm:text-3xl leading-none" style={{ fontFamily: 'var(--font-display)' }}>#</span>
                <span className="text-white text-xl sm:text-2xl font-medium tracking-tight">30+</span>
              </div>
              <div className="text-zinc-400 text-xs mt-1">Monitored Risk Regions</div>
            </div>
          </div>
        </footer>
      </section>

      {/* Deep-Dive Sections */}
      <div className="relative z-10 max-w-7xl mx-auto px-6 py-24 space-y-32">
        {/* Section 01: Case Replay */}
        <section id="replay" className="space-y-8">
          <div className="space-y-3 text-left">
            <div className="flex items-center gap-3">
              <span className="text-xs text-white bg-white/10 px-4 py-1.5 rounded-full border border-white/20" style={{ fontFamily: 'var(--font-display)' }}>
                [ 01 // PARADIGM SHIFT ]
              </span>
              <span className="font-mono text-xs text-[#ffb4c8]">01 / 05</span>
            </div>
            <h2 className="text-3xl sm:text-5xl font-medium text-white tracking-tight" style={{ fontFamily: 'var(--font-display)' }}>
              Reconstruct extreme events from <br />
              <span className="text-[#ffb4c8]">multi-member ensemble fields.</span>
            </h2>
            <p className="text-zinc-300 text-sm sm:text-base max-w-2xl leading-relaxed">
              Archived NOAA GEFS GRIB2 forecasts verified cell-by-cell against IMD 0.25° daily rainfall and CHIRPS v2 0.05° observations.
            </p>
          </div>

          {/* Switcher */}
          <div className="flex gap-2.5 flex-wrap">
            <button
              onClick={() => setActiveCase("rainfall")}
              className={`px-5 py-2.5 rounded-full text-xs font-medium transition-all ${
                activeCase === "rainfall" ? "bg-white text-black font-semibold shadow-lg" : "bg-white/5 border border-white/15 text-zinc-300 hover:bg-white/10"
              }`}
            >
              August 2025 Heavy Rain
            </button>
            <button
              onClick={() => setActiveCase("cyclone")}
              className={`px-5 py-2.5 rounded-full text-xs font-medium transition-all ${
                activeCase === "cyclone" ? "bg-white text-black font-semibold shadow-lg" : "bg-white/5 border border-white/15 text-zinc-300 hover:bg-white/10"
              }`}
            >
              Super Cyclone Amphan
            </button>
            <button
              onClick={() => setActiveCase("heatwave")}
              className={`px-5 py-2.5 rounded-full text-xs font-medium transition-all ${
                activeCase === "heatwave" ? "bg-white text-black font-semibold shadow-lg" : "bg-white/5 border border-white/15 text-zinc-300 hover:bg-white/10"
              }`}
            >
              2024 Heat Dome
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="rounded-3xl p-7 bg-zinc-900/80 border border-white/15 backdrop-blur-xl space-y-5 text-left">
              <div className="flex justify-between items-center text-xs">
                <span className="font-mono text-[#ffb4c8] font-bold">VERIFIED REPLAY CASE</span>
                <span className="text-emerald-400 font-mono flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />OFFICIAL REPLAY</span>
              </div>
              <h3 className="text-2xl text-white font-medium" style={{ fontFamily: 'var(--font-display)' }}>{CASE_DATA[activeCase].title}</h3>
              <p className="text-sm text-zinc-300 leading-relaxed">{CASE_DATA[activeCase].summary}</p>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                <div className="p-3.5 rounded-2xl bg-white/[0.04] border border-white/10">
                  <span className="text-[10px] font-mono text-zinc-400 block">GEFS PEAK</span>
                  <strong className="text-lg text-white font-semibold">{CASE_DATA[activeCase].gefs}</strong>
                </div>
                <div className="p-3.5 rounded-2xl bg-white/[0.04] border border-white/10">
                  <span className="text-[10px] font-mono text-zinc-400 block">OBS. PEAK</span>
                  <strong className="text-lg text-[#ffb4c8] font-semibold">{CASE_DATA[activeCase].obs}</strong>
                </div>
                <div className="p-3.5 rounded-2xl bg-white/[0.04] border border-white/10">
                  <span className="text-[10px] font-mono text-zinc-400 block">VALID CELLS</span>
                  <strong className="text-lg text-white font-semibold">{CASE_DATA[activeCase].cells}</strong>
                </div>
                <div className="p-3.5 rounded-2xl bg-white/[0.04] border border-white/10">
                  <span className="text-[10px] font-mono text-zinc-400 block">MAE</span>
                  <strong className="text-lg text-white font-semibold">{CASE_DATA[activeCase].mae}</strong>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-200 leading-relaxed">
                {CASE_DATA[activeCase].caveat}
              </div>

              <Link href="/dashboard" className="inline-flex items-center gap-2 text-xs font-semibold text-[#ffb4c8] hover:text-white transition-colors">
                Explore Full Interactive Forecast Replay Grid →
              </Link>
            </div>

            <div className="rounded-3xl p-7 bg-zinc-900/80 border border-white/15 backdrop-blur-xl flex flex-col justify-between space-y-6 text-left">
              <div className="flex justify-between items-center text-xs">
                <span className="font-mono text-[#ffb4c8] font-bold">4D KALMAN TRACKER</span>
                <span className="bg-white/10 px-3 py-1 rounded-full text-zinc-300 font-mono text-[10px]">HUNGARIAN ASSOCIATION</span>
              </div>
              <div className="space-y-3 font-mono text-xs text-zinc-300 bg-black/40 p-5 rounded-2xl border border-white/10">
                <div className="flex justify-between">
                  <span className="text-zinc-500">TRAJECTORY LEGS:</span>
                  <span className="text-white">T+24h, T+48h, T+72h</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">STATE VECTOR:</span>
                  <span className="text-[#ffb4c8]">[x, y, dx/dt, dy/dt, intensity, area]</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">ASSOCIATION:</span>
                  <span className="text-white">Globally Optimal Hungarian Cost Matrix</span>
                </div>
              </div>
              <div className="relative h-44 rounded-2xl bg-black border border-white/10 overflow-hidden flex items-center justify-center">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,180,200,0.15)_0%,transparent_70%)]" />
                <div className="w-2.5 h-2.5 rounded-full bg-[#ffb4c8] shadow-[0_0_15px_#ffb4c8] animate-ping" />
                <span className="absolute bottom-3 text-[11px] font-mono text-zinc-500">Active Geodesic 5 km Impact Buffer</span>
              </div>
              <Link href="/dashboard/trajectory" className="inline-flex items-center gap-2 text-xs font-semibold text-[#ffb4c8] hover:text-white transition-colors">
                View 4D Trajectory Legs in Lab →
              </Link>
            </div>
          </div>
        </section>

        {/* Section 02: Terminal TUI Simulator */}
        <section id="terminal" className="space-y-8">
          <div className="space-y-3 text-left">
            <div className="flex items-center gap-3">
              <span className="text-xs text-white bg-white/10 px-4 py-1.5 rounded-full border border-white/20" style={{ fontFamily: 'var(--font-display)' }}>
                [ 02 // PRODUCTION CLI ]
              </span>
              <span className="font-mono text-xs text-[#ffb4c8]">02 / 05</span>
            </div>
            <h2 className="text-3xl sm:text-5xl font-medium text-white tracking-tight" style={{ fontFamily: 'var(--font-display)' }}>
              Audit operational models in <br />
              <span className="text-[#ffb4c8]">a single terminal command.</span>
            </h2>
            <p className="text-zinc-300 text-sm sm:text-base max-w-2xl leading-relaxed">
              Run interactive commands directly on the browser simulator or deploy via standard CLI.
            </p>
          </div>

          <div className="rounded-3xl bg-zinc-950 border border-white/15 overflow-hidden shadow-2xl text-left font-mono">
            <div className="bg-zinc-900/90 px-5 py-3 border-b border-white/10 flex justify-between items-center text-xs">
              <div className="flex gap-2">
                <span className="w-3 h-3 rounded-full bg-rose-500/80" />
                <span className="w-3 h-3 rounded-full bg-amber-500/80" />
                <span className="w-3 h-3 rounded-full bg-emerald-500/80" />
              </div>
              <span className="text-zinc-400">avarta-engine — bash — 80x24</span>
              <span className="text-[#ffb4c8] font-bold text-[10px]">LIVE CLI SIMULATOR</span>
            </div>

            <div className="p-6 h-64 overflow-y-auto space-y-1.5 text-xs text-zinc-300 bg-black/90">
              {termOutput.map((line, idx) => (
                <div key={idx} className="leading-relaxed">{line}</div>
              ))}
            </div>

            <div className="p-3 bg-zinc-900/60 border-t border-white/10 flex items-center gap-2 flex-wrap text-xs text-zinc-400">
              <span>Quick:</span>
              {["status", "scan", "downscale", "alerts", "cases", "clear"].map((cmd) => (
                <button
                  key={cmd}
                  onClick={() => handleCommand(cmd)}
                  className="px-2.5 py-1 rounded bg-white/5 hover:bg-white/15 text-zinc-200 border border-white/10 transition-colors"
                >
                  {cmd}
                </button>
              ))}
            </div>

            <div className="p-4 bg-zinc-950 border-t border-white/10 flex items-center gap-2">
              <span className="text-[#ffb4c8] text-xs font-bold">avarta@ncmrwf:~$</span>
              <input
                type="text"
                value={termInput}
                onChange={(e) => setTermInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleCommand(termInput);
                    setTermInput("");
                  }
                }}
                placeholder="type status, scan, downscale, alerts..."
                className="flex-1 bg-transparent border-none outline-none text-xs text-white font-mono"
              />
              <button
                onClick={() => {
                  handleCommand(termInput);
                  setTermInput("");
                }}
                className="bg-white text-black font-sans font-bold text-xs px-4 py-1.5 rounded-lg"
              >
                Run
              </button>
            </div>

            <div className="p-4 bg-zinc-900/60 border-t border-white/10 flex items-center justify-between text-xs flex-wrap gap-3">
              <span className="text-zinc-400 font-mono">Full VT100 interactive emulator with ASCII live maps & diagnostics</span>
              <Link
                href="/dashboard/terminal"
                className="bg-white/10 hover:bg-white/20 text-[#ffb4c8] hover:text-white px-4 py-2 rounded-xl border border-white/20 font-semibold transition-all inline-flex items-center gap-1.5"
              >
                <TerminalIcon className="w-3.5 h-3.5" />
                Launch Full Web Terminal Console (VT100) →
              </Link>
            </div>
          </div>
        </section>

        {/* Section 03: Decision Copilot */}
        <section id="copilot" className="space-y-8">
          <div className="space-y-3 text-left">
            <div className="flex items-center gap-3">
              <span className="text-xs text-white bg-white/10 px-4 py-1.5 rounded-full border border-white/20" style={{ fontFamily: 'var(--font-display)' }}>
                [ 03 // DECISION SUPPORT ]
              </span>
              <span className="font-mono text-xs text-[#ffb4c8]">03 / 05</span>
            </div>
            <h2 className="text-3xl sm:text-5xl font-medium text-white tracking-tight" style={{ fontFamily: 'var(--font-display)' }}>
              "What Happens Here" <br />
              <span className="text-[#ffb4c8]">decision briefing copilot.</span>
            </h2>
            <p className="text-zinc-300 text-sm sm:text-base max-w-2xl leading-relaxed">
              Generates plain-language meteorological briefings for district disaster management authorities (DDMA) and NDMA responders.
            </p>
          </div>

          <div className="rounded-3xl p-8 bg-zinc-900/80 border border-white/15 backdrop-blur-xl space-y-6 text-left">
            <div className="flex flex-wrap gap-4 items-center justify-between">
              <select
                value={briefingZone}
                onChange={(e) => setBriefingZone(e.target.value)}
                className="bg-black/60 border border-white/20 rounded-xl px-4 py-2.5 text-xs text-white outline-none min-w-[280px]"
              >
                <option value="western_ghats">Western Ghats (Sindhudurg / Ratnagiri)</option>
                <option value="bay_of_bengal">Bay of Bengal Coastal Arc (Odisha / WB)</option>
                <option value="assam_brahmaputra">Brahmaputra Valley (Kamrup / Barpeta)</option>
              </select>
              <button
                onClick={handleGenerateBriefing}
                className="bg-white text-black font-semibold text-xs px-6 py-2.5 rounded-xl hover:opacity-90 transition-opacity"
              >
                Update Briefing
              </button>
            </div>

            <div className="p-6 rounded-2xl bg-white/[0.03] border border-white/10 space-y-2">
              <span className="font-mono text-[11px] text-[#ffb4c8] block font-bold">AUTOMATED DECISION MEMO:</span>
              <p className="text-sm text-zinc-200 leading-relaxed font-sans">{briefingText}</p>
            </div>

            <div className="flex justify-between items-center pt-2 flex-wrap gap-3">
              <span className="text-xs text-zinc-400 font-mono">OASIS CAP 1.2 XML / JSON schema broadcast ready</span>
              <div className="flex gap-4">
                <Link href="/dashboard/ask" className="text-xs font-semibold text-[#ffb4c8] hover:text-white">
                  Open Copilot Chat →
                </Link>
                <Link href="/dashboard/inspector" className="text-xs font-semibold text-[#ffb4c8] hover:text-white">
                  Inspect Active CAP XML Feed →
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Section 04: PINN Downscaling Lab */}
        <section id="downscale" className="space-y-8">
          <div className="space-y-3 text-left">
            <div className="flex items-center gap-3">
              <span className="text-xs text-white bg-white/10 px-4 py-1.5 rounded-full border border-white/20" style={{ fontFamily: 'var(--font-display)' }}>
                [ 04 // NEURAL DOWNSCALING ]
              </span>
              <span className="font-mono text-xs text-[#ffb4c8]">04 / 05</span>
            </div>
            <h2 className="text-3xl sm:text-5xl font-medium text-white tracking-tight" style={{ fontFamily: 'var(--font-display)' }}>
              Physics-Informed Downscaling Core <br />
              <span className="text-[#ffb4c8]">preserving extreme spatial gradients.</span>
            </h2>
            <p className="text-zinc-300 text-sm sm:text-base max-w-2xl leading-relaxed">
              Standard bilinear and CNN interpolation blur out extreme cloudburst peaks. Avarta uses generative diffusion governed by Navier-Stokes moisture flux divergence and 5 km DEM orographic lift.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="rounded-3xl p-8 bg-zinc-900/80 border border-white/15 backdrop-blur-xl space-y-6 text-left">
              <div className="flex justify-between items-center text-xs">
                <span className="font-mono text-[#ffb4c8] font-bold">PHYSICAL CONSERVATION LAWS</span>
                <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-3 py-1 rounded-full text-[10px] font-mono">DIFFERENTIABLE</span>
              </div>
              <div className="space-y-4 font-mono text-xs text-zinc-300 bg-black/50 p-5 rounded-2xl border border-white/10">
                <div>
                  <span className="text-zinc-500 block mb-1">MOISTURE FLUX DIVERGENCE:</span>
                  <code className="text-[#ffb4c8] text-xs">L_flux = || ∇ · (q v) + ∂q/∂t - (E - P) ||²</code>
                </div>
                <div>
                  <span className="text-zinc-500 block mb-1">5 KM OROGRAPHIC VERTICAL LIFT:</span>
                  <code className="text-[#ffb4c8] text-xs">w_oro = v_horiz · ∇h_DEM(lat, lon)</code>
                </div>
                <div>
                  <span className="text-zinc-500 block mb-1">PHYSICAL NON-NEGATIVITY BARRIER:</span>
                  <code className="text-[#ffb4c8] text-xs">L_barrier = ReLU(-P_pred) · λ_phys</code>
                </div>
              </div>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Trained on real IMD 0.25° precipitation archives and CHIRPS v2 datasets with ExtremeTailLoss to penalize peak under-prediction.
              </p>
              <Link href="/dashboard/downscaling" className="inline-flex items-center gap-2 text-xs font-semibold text-[#ffb4c8] hover:text-white">
                Launch 12 km → 5 km Split Slider Lab →
              </Link>
            </div>

            <div className="rounded-3xl p-8 bg-zinc-900/80 border border-white/15 backdrop-blur-xl flex flex-col justify-between space-y-6 text-left">
              <div className="flex justify-between items-center text-xs">
                <span className="font-mono text-[#ffb4c8] font-bold">2D FOURIER POWER SPECTRUM (PSD)</span>
                <span className="bg-white/10 px-3 py-1 rounded-full text-zinc-300 font-mono text-[10px]">RADIAL FFT</span>
              </div>
              <div className="space-y-3">
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-zinc-400">Bilinear Interpolation (12 km)</span>
                    <span className="text-zinc-500 font-mono">1.7% Power</span>
                  </div>
                  <div className="h-2 rounded-full bg-zinc-800 overflow-hidden">
                    <div className="h-full bg-zinc-600 rounded-full" style={{ width: "1.7%" }} />
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-zinc-400">Deterministic Residual CNN</span>
                    <span className="text-zinc-500 font-mono">11.7% Power</span>
                  </div>
                  <div className="h-2 rounded-full bg-zinc-800 overflow-hidden">
                    <div className="h-full bg-zinc-500 rounded-full" style={{ width: "11.7%" }} />
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-white font-medium">Avarta Generative PINN</span>
                    <span className="text-[#ffb4c8] font-mono font-bold">50.7% Power (Sharp Peaks)</span>
                  </div>
                  <div className="h-2.5 rounded-full bg-zinc-800 overflow-hidden p-0.5 border border-[#ffb4c8]/30">
                    <div className="h-full bg-gradient-to-r from-rose-500 to-[#ffb4c8] rounded-full" style={{ width: "50.7%" }} />
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-zinc-400">IMD High-Resolution Ground Truth</span>
                    <span className="text-zinc-400 font-mono">100.0% Reference</span>
                  </div>
                  <div className="h-2 rounded-full bg-zinc-800 overflow-hidden">
                    <div className="h-full bg-white/40 rounded-full" style={{ width: "100%" }} />
                  </div>
                </div>
              </div>
              <p className="text-xs text-zinc-400">
                Preserves 29.8x more extreme precipitation energy than bilinear interpolation, resolving severe spectral smoothing.
              </p>
              <Link href="/dashboard/downscaling" className="inline-flex items-center gap-2 text-xs font-semibold text-[#ffb4c8] hover:text-white">
                Inspect 2D FFT Power Spectral Density Curve →
              </Link>
            </div>
          </div>
        </section>

        {/* Section 05: 3D Subcontinent Risk Map */}
        <section id="risk" className="space-y-8">
          <div className="space-y-3 text-left">
            <div className="flex items-center gap-3">
              <span className="text-xs text-white bg-white/10 px-4 py-1.5 rounded-full border border-white/20" style={{ fontFamily: 'var(--font-display)' }}>
                [ 05 // CONTINUOUS RISK ]
              </span>
              <span className="font-mono text-xs text-[#ffb4c8]">05 / 05</span>
            </div>
            <h2 className="text-3xl sm:text-5xl font-medium text-white tracking-tight" style={{ fontFamily: 'var(--font-display)' }}>
              All-India Multi-Hazard Risk Grid <br />
              <span className="text-[#ffb4c8]">across 30 meteorological regions.</span>
            </h2>
            <p className="text-zinc-300 text-sm sm:text-base max-w-2xl leading-relaxed">
              Real-time assimilation of ECMWF IFS (0.25°) and NOAA GFS (0.5°) across 30 Indian cities and coastal corridors, computing compound danger scores from rainfall, cyclonic winds, and wet-bulb temperatures.
            </p>
          </div>

          <div className="rounded-3xl p-8 bg-zinc-900/80 border border-white/15 backdrop-blur-xl space-y-6 text-left">
            <div className="flex justify-between items-center flex-wrap gap-4">
              <div className="flex items-center gap-3">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="font-mono text-xs text-white">LIVE NWP ASSIMILATION FEED ACTIVE</span>
              </div>
              <span className="text-xs text-zinc-400 font-mono">30 REGIONS MONITORED · ECMWF + GFS</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="p-4 rounded-2xl bg-black/40 border border-white/10">
                <span className="text-[10px] font-mono text-zinc-400 block">WESTERN GHATS</span>
                <strong className="text-lg text-rose-400 font-semibold block">94 / 100</strong>
                <span className="text-[10px] text-zinc-500">Orographic Lift Alert</span>
              </div>
              <div className="p-4 rounded-2xl bg-black/40 border border-white/10">
                <span className="text-[10px] font-mono text-zinc-400 block">BENGAL DELTA</span>
                <strong className="text-lg text-rose-400 font-semibold block">88 / 100</strong>
                <span className="text-[10px] text-zinc-500">Coastal Inundation</span>
              </div>
              <div className="p-4 rounded-2xl bg-black/40 border border-white/10">
                <span className="text-[10px] font-mono text-zinc-400 block">DELHI NCR</span>
                <strong className="text-lg text-amber-400 font-semibold block">76 / 100</strong>
                <span className="text-[10px] text-zinc-500">Urban Flood Risk</span>
              </div>
              <div className="p-4 rounded-2xl bg-black/40 border border-white/10">
                <span className="text-[10px] font-mono text-zinc-400 block">THAR / RAJASTHAN</span>
                <strong className="text-lg text-amber-400 font-semibold block">71 / 100</strong>
                <span className="text-[10px] text-zinc-500">Extreme Heat Dome</span>
              </div>
            </div>

            <div className="flex justify-between items-center pt-2 flex-wrap gap-4">
              <span className="text-xs text-zinc-400 font-mono">Interactive 3D vector projection with pitch, tilt, and region click-inspection</span>
              <Link href="/dashboard/risk" className="bg-white text-black font-semibold text-xs px-6 py-2.5 rounded-full hover:opacity-90 transition-opacity">
                Launch 3D India Subcontinent Risk Map →
              </Link>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
