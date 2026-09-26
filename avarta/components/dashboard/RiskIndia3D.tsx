"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowUpRight, MapPin } from "lucide-react";
import type { ReplayCase } from "@/lib/replay";
import { impactsFor, regionRiskRows, type RegionRiskRow } from "@/lib/forecast";
import { INDIA_OUTLINE } from "@/lib/india-outline";
import styles from "./replay.module.css";

const BAND_COLOR: Record<string, string> = {
  LOW: "#43a854",
  MODERATE: "#d9a521",
  HIGH: "#dd6f2d",
  SEVERE: "#c03a2b",
};

// Equirectangular projection fitted to the India outline.
const LON_MIN = 65;
const LON_MAX = 99;
const LAT_MIN = 5;
const LAT_MAX = 38;
const W = 620;
const H = 660;
const PAD = 30;

const project = (lat: number, lon: number) => ({
  x: PAD + ((lon - LON_MIN) / (LON_MAX - LON_MIN)) * (W - PAD * 2),
  y: PAD + ((LAT_MAX - lat) / (LAT_MAX - LAT_MIN)) * (H - PAD * 2),
});

function landPath(dy = 0) {
  return (
    INDIA_OUTLINE.map(([lon, lat], i) => {
      const p = project(lat, lon);
      return `${i === 0 ? "M" : "L"}${(p.x).toFixed(1)},${(p.y + dy).toFixed(1)}`;
    }).join(" ") + " Z"
  );
}

export default function RiskIndia3D({
  replay,
  onSelect,
  liveMode: propLiveMode,
  onLiveModeChange,
  selectedName: propSelectedName,
  onSelectedNameChange,
}: {
  replay: ReplayCase;
  onSelect: (lat: number, lon: number) => void;
  liveMode?: boolean;
  onLiveModeChange?: (live: boolean) => void;
  selectedName?: string;
  onSelectedNameChange?: (name: string) => void;
}) {
  const isCaseLive = replay.hazard_type === "live" || replay.id?.includes("live");
  const [internalLiveMode, setInternalLiveMode] = useState<boolean>(true);
  const liveMode = propLiveMode !== undefined ? propLiveMode : internalLiveMode;
  const setLiveMode = (val: boolean) => {
    setInternalLiveMode(val);
    onLiveModeChange?.(val);
  };
  const [liveRegions, setLiveRegions] = useState<any[]>([]);
  const [liveSource, setLiveSource] = useState<string>("");
  const [liveUpdatedAt, setLiveUpdatedAt] = useState<string>("");
  const [loadingLive, setLoadingLive] = useState(false);

  // Fetch live operational data across all 30 regions
  const fetchLiveRisk = async () => {
    setLoadingLive(true);
    try {
      const res = await fetch("/api/live-risk");
      if (res.ok) {
        const data = await res.json();
        setLiveRegions(data.regions || []);
        setLiveSource(data.source || "ECMWF / GFS Live Assimilation");
        setLiveUpdatedAt(data.updated_at || new Date().toISOString());
      }
    } catch {
      // Handled silently with fallback
    } finally {
      setLoadingLive(false);
    }
  };

  useEffect(() => {
    void fetchLiveRisk();
    const interval = setInterval(() => {
      void fetchLiveRisk();
    }, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const rows: RegionRiskRow[] = useMemo(() => {
    if (liveMode && liveRegions.length > 0) {
      return liveRegions.map((lr: any) => ({
        name: lr.name,
        state: lr.state,
        zone: lr.zone,
        latitude: lr.latitude,
        longitude: lr.longitude,
        rainfall: lr.rain_sum_24h_mm ?? lr.rainfall_mm ?? 0,
        sigma: (lr.rain_sum_24h_mm - 5.0) / 10.0,
        score: lr.score,
        band: lr.band,
        hazard_alert: lr.hazard_alert,
        temperature_c: lr.temperature_c,
        max_temp_c: lr.max_temp_c,
        wind_gust_kmh: lr.wind_gust_kmh,
      }));
    }
    return regionRiskRows(replay, liveMode);
  }, [replay, liveMode, liveRegions]);

  const [internalSelectedName, setInternalSelectedName] = useState<string>("");
  const selectedName = propSelectedName !== undefined ? propSelectedName : internalSelectedName;
  const setSelectedName = (val: string | ((prev: string) => string)) => {
    const nextVal = typeof val === "function" ? val(selectedName) : val;
    setInternalSelectedName(nextVal);
    onSelectedNameChange?.(nextVal);
  };
  const [tourPaused, setTourPaused] = useState(false);
  const [reducedMotion, setReducedMotion] = useState<boolean>(() =>
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );

  useEffect(() => {
    if (rows.length > 0 && !selectedName) {
      setSelectedName(rows[0].name);
    }
  }, [rows, selectedName]);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = (event: MediaQueryListEvent) => setReducedMotion(event.matches);
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  // Gentle auto-tour across regions until the user takes over.
  useEffect(() => {
    if (tourPaused || reducedMotion || rows.length === 0) return;
    const timer = setInterval(() => {
      setSelectedName((current) => {
        const index = rows.findIndex((r: any) => r.name === current);
        return rows[(index + 1) % rows.length].name;
      });
    }, 3800);
    return () => clearInterval(timer);
  }, [tourPaused, reducedMotion, rows]);

  const selected: any =
    rows.find((r: any) => r.name === selectedName) ?? rows[0];

  const pick = (row: any) => {
    setSelectedName(row.name);
    setTourPaused(true);
    onSelect(row.latitude, row.longitude);
  };

  const topPath = useMemo(() => landPath(0), []);
  const graticule = useMemo(() => {
    const lines: { x1: number; y1: number; x2: number; y2: number; label: string; vertical: boolean }[] = [];
    for (let lon = 70; lon <= 95; lon += 5) {
      const a = project(LAT_MIN, lon);
      const b = project(LAT_MAX, lon);
      lines.push({ x1: a.x, y1: a.y, x2: b.x, y2: b.y, label: `${lon}°E`, vertical: true });
    }
    for (let lat = 10; lat <= 35; lat += 5) {
      const a = project(lat, LON_MIN);
      const b = project(lat, LON_MAX);
      lines.push({ x1: a.x, y1: a.y, x2: b.x, y2: b.y, label: `${lat}°N`, vertical: false });
    }
    return lines;
  }, []);

  return (
    <div>
      {/* Live All-India Control Bar */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px", flexWrap: "wrap", gap: "10px" }}>
        <div style={{ display: "flex", gap: "6px", background: "rgba(18, 18, 22, 0.88)", padding: "3px", borderRadius: "100px", border: "1px solid rgba(255, 255, 255, 0.12)" }}>
          <button
            type="button"
            onClick={() => setLiveMode(true)}
            style={{
              border: 0,
              padding: "5px 14px",
              borderRadius: "100px",
              fontSize: "11px",
              fontWeight: 700,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              background: liveMode ? "#ffb4c8" : "transparent",
              color: liveMode ? "#000000" : "#a1a1aa",
              boxShadow: liveMode ? "0 0 12px rgba(255, 180, 200, 0.35)" : "none",
              transition: "all 0.15s ease",
            }}
          >
            <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: liveMode ? "#000000" : "#ffb4c8", boxShadow: liveMode ? "none" : "0 0 8px #ffb4c8" }} />
            🔴 Live All-India (30 Stations)
          </button>
          <button
            type="button"
            onClick={() => setLiveMode(false)}
            style={{
              border: 0,
              padding: "5px 14px",
              borderRadius: "100px",
              fontSize: "11px",
              fontWeight: 700,
              cursor: "pointer",
              background: !liveMode ? "#ffb4c8" : "transparent",
              color: !liveMode ? "#000000" : "#a1a1aa",
              boxShadow: !liveMode ? "0 0 12px rgba(255, 180, 200, 0.35)" : "none",
              transition: "all 0.15s ease",
            }}
          >
            Case Replay Pins
          </button>
        </div>

        {liveMode && (
          <div style={{ fontSize: "10.5px", color: "#a1a1aa", display: "flex", alignItems: "center", gap: "6px" }}>
            <span>Real-time ECMWF/GFS · {liveUpdatedAt ? new Date(liveUpdatedAt).toLocaleTimeString() : "Live"}</span>
            <button
              type="button"
              onClick={() => void fetchLiveRisk()}
              disabled={loadingLive}
              style={{ border: 0, background: "transparent", cursor: "pointer", color: "#ffb4c8", fontWeight: 700, fontSize: "10.5px", textDecoration: "underline" }}
            >
              {loadingLive ? "Refreshing…" : "Refresh"}
            </button>
          </div>
        )}
      </div>

      <div
        className={styles.risk3dWrap}
        onMouseEnter={() => setTourPaused(true)}
        onMouseLeave={() => setTourPaused(false)}
      >
        <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Three-dimensional risk map of India with animated regional forecast pins">
          <defs>
            <linearGradient id="risk3dLand" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#2c1a26" />
              <stop offset="55%" stopColor="#1c1219" />
              <stop offset="100%" stopColor="#120c11" />
            </linearGradient>
            <linearGradient id="risk3dSweep" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#ffb4c8" stopOpacity="0" />
              <stop offset="50%" stopColor="#ffb4c8" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#ffb4c8" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="risk3dOcean" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0c0c0e" />
              <stop offset="100%" stopColor="#08080a" />
            </linearGradient>
            <clipPath id="risk3dClip">
              <path d={topPath} />
            </clipPath>
            <filter id="risk3dGlow" x="-80%" y="-80%" width="260%" height="260%">
              <feGaussianBlur stdDeviation="5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          <rect x="0" y="0" width={W} height={H} rx="14" fill="url(#risk3dOcean)" />
          {graticule.map((g, i) => (
            <g key={i}>
              <line x1={g.x1} y1={g.y1} x2={g.x2} y2={g.y2} stroke="rgba(255, 255, 255, 0.08)" strokeOpacity="0.4" strokeDasharray="3 6" />
              <text
                x={g.vertical ? g.x1 + 4 : 8}
                y={g.vertical ? H - 10 : g.y1 - 5}
                className={styles.risk3dGratLabel}
              >
                {g.label}
              </text>
            </g>
          ))}

          {/* ground shadow */}
          <ellipse cx={W / 2} cy={H - 46} rx={W / 2 - 90} ry={26} fill="#000000" opacity="0.4" />

          {/* 3D extrusion */}
          {[22, 15, 8].map((dy) => (
            <path key={dy} d={landPath(dy)} fill="#100a0f" opacity={dy === 22 ? 0.85 : 0.55} />
          ))}
          <path d={topPath} fill="url(#risk3dLand)" stroke="rgba(255, 180, 200, 0.35)" strokeWidth="1.4" />

          {/* animated light sweep across the landmass */}
          {!reducedMotion && (
            <g clipPath="url(#risk3dClip)">
              <rect x="-220" y="0" width="170" height={H} fill="url(#risk3dSweep)" className={styles.risk3dSweep} />
            </g>
          )}

          {/* region beams + pins */}
          {rows.map((row) => {
            const p = project(row.latitude, row.longitude);
            const color = BAND_COLOR[row.band] ?? "#43a854";
            const active = selected?.name === row.name;
            const top = p.y - (active ? 64 : 48);
            return (
              <g
                key={row.name}
                className={styles.risk3dPin}
                onClick={() => pick(row)}
                role="button"
                tabIndex={0}
                aria-label={`${row.name}: forecast ${row.rainfall} millimetres per day, risk ${row.band}`}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") pick(row);
                }}
              >
                <line x1={p.x} y1={p.y} x2={p.x} y2={top} stroke={color} strokeWidth={active ? 3 : 2} opacity="0.75" />
                {!reducedMotion && (
                  <circle cx={p.x} cy={p.y} r={active ? 12 : 9} fill="none" stroke={color} strokeWidth="2" className={styles.risk3dPulse} />
                )}
                <circle cx={p.x} cy={top} r={active ? 11 : 8} fill={color} stroke="#ffffff" strokeWidth="2.5" filter="url(#risk3dGlow)" />
                <text x={p.x} y={top + 4.5} textAnchor="middle" className={styles.risk3dPinValue}>
                  {liveMode ? (row.rainfall > 0.5 ? `${Math.round(row.rainfall)}m` : `${Math.round(row.temperature_c ?? 25)}°`) : row.rainfall.toFixed(0)}
                </text>
                <text
                  x={p.x}
                  y={top - (active ? 20 : 16)}
                  textAnchor="middle"
                  className={active ? styles.risk3dLabelActive : styles.risk3dLabel}
                >
                  {row.name}
                </text>
              </g>
            );
          })}
        </svg>

        <div className={styles.risk3dLegend}>
          {(["LOW", "MODERATE", "HIGH", "SEVERE"] as const).map((band) => (
            <span key={band}>
              <i style={{ background: BAND_COLOR[band] }} /> {band}
            </span>
          ))}
          <span className={styles.risk3dHint}>
            {liveMode ? "number = mm rain or °C temp · 40 stations nationwide (all 28 states & 8 UTs)" : "number = mm/day · click a pin to inspect"}
          </span>
        </div>
      </div>

      {selected && (
        <div className={styles.risk3dDetail}>
          <div>
            <div className={styles.eyebrow}>
              {liveMode ? "🔴 LIVE REAL-TIME ASSIMILATION · ALL INDIA" : "PINPOINT · PROVISIONAL"}
            </div>
            <h3>
              <MapPin size={16} /> {selected.name} {selected.state ? `(${selected.state})` : ""} · {selected.latitude.toFixed(1)}°N {selected.longitude.toFixed(1)}°E
            </h3>
            {liveMode ? (
              <p>
                Live Temp <strong>{selected.temperature_c ?? 26}°C</strong> (Max <strong>{selected.max_temp_c ?? 30}°C</strong>) · 24h Rain <strong>{selected.rainfall.toFixed(1)} mm</strong> · Wind Gusts <strong>{selected.wind_gust_kmh ?? 12} km/h</strong> · Risk <strong>{selected.score}/100</strong> ({selected.band})
              </p>
            ) : (
              <p>
                Forecast <strong>{selected.rainfall.toFixed(1)} mm/day</strong> · anomaly{" "}
                <strong>
                  {selected.sigma >= 0 ? "+" : ""}
                  {selected.sigma.toFixed(1)}σ
                </strong>{" "}
                · risk <strong>{selected.score}</strong> ({selected.band}) · ~5 km radius
              </p>
            )}
            <p className={styles.muted}>
              {liveMode && selected.hazard_alert ? (
                <span><strong>Live Assessment:</strong> {selected.hazard_alert} · Real-time NWP ingestion.</span>
              ) : (
                <span>Expected: {impactsFor(selected.rainfall, selected.band).join(" · ")} · next 12–18 hours. Draft decision support only.</span>
              )}
            </p>
          </div>
          <a href={`/api/forecast?lat=${selected.latitude}&lon=${selected.longitude}`} target="_blank" rel="noreferrer">
            Open GET /forecast JSON <ArrowUpRight size={14} />
          </a>
        </div>
      )}
    </div>
  );
}
