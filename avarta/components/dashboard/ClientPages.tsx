"use client";

import Link from "next/link";
import { Suspense, useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  ArrowDownRight,
  ArrowUpRight,
  CloudRain,
  FlaskConical,
  MapPin,
  Navigation,
  Radar,
  ShieldAlert,
  Sparkles,
  Thermometer,
  Wind,
  Terminal,
} from "lucide-react";
import type { ReplayCase } from "@/lib/replay";
import { AskPanel, ForecastMap, LocationInspector, RiskPanel, TrajectoryPanel } from "@/components/dashboard/ReplayDashboard";
import PageHeading from "@/components/dashboard/PageHeading";
import styles from "./replay.module.css";

const time = (iso: string) =>
  new Date(iso).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
  });

function useActiveCase(initialReplay: ReplayCase) {
  const searchParams = useSearchParams();
  const caseParam = (searchParams.get("case") || "rainfall").toLowerCase();
  const [caseData, setCaseData] = useState<ReplayCase>(initialReplay);
  const cacheRef = useRef<Record<string, ReplayCase>>({
    rainfall: initialReplay,
    default: initialReplay,
  });

  useEffect(() => {
    let targetKey = "rainfall";
    let filename = "august-2025.json";
    if (caseParam.includes("cyclone") || caseParam.includes("amphan")) {
      targetKey = "cyclone";
      filename = "cyclone-amphan.json";
    } else if (caseParam.includes("heat")) {
      targetKey = "heatwave";
      filename = "heatwave-2024.json";
    }

    if (cacheRef.current[targetKey]) {
      setCaseData(cacheRef.current[targetKey]);
      return;
    }

    const normalizeCase = (data: ReplayCase) => {
      if (data && data.raster) {
        const grid = data.raster.forecast_field ?? data.raster.forecast_mm_day ?? [];
        data.raster.forecast_field = grid;
        data.raster.forecast_mm_day = grid;
      }
      return data;
    };

    fetch(`/replay/${filename}`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load static replay");
        return res.json();
      })
      .then((raw: ReplayCase) => {
        const data = normalizeCase(raw);
        cacheRef.current[targetKey] = data;
        setCaseData(data);
      })
      .catch(() => {
        fetch(`/api/cases?case=${targetKey}`)
          .then((res) => res.json())
          .then((raw: ReplayCase) => {
            const data = normalizeCase(raw);
            cacheRef.current[targetKey] = data;
            setCaseData(data);
          })
          .catch(() => {});
      });
  }, [caseParam]);

  return { caseData, caseParam };
}

function OverviewInner({ initialReplay }: { initialReplay: ReplayCase }) {
  const { caseData, caseParam } = useActiveCase(initialReplay);
  const router = useRouter();
  const pathname = usePathname();

  const isCyclone = caseParam.includes("cyclone") || (caseData.hazard_type === "cyclone");
  const isHeatwave = caseParam.includes("heat") || (caseData.hazard_type === "heatwave");

  const defaultLat = isCyclone ? 21.65 : isHeatwave ? 28.61 : 28.4;
  const defaultLon = isCyclone ? 88.30 : isHeatwave ? 77.21 : 77.31;

  const [frameIndex, setFrameIndex] = useState(caseData.frames.length - 1);
  const [picked, setPicked] = useState<{ lat: number; lon: number } | null>({ lat: defaultLat, lon: defaultLon });

  useEffect(() => {
    setFrameIndex(caseData.frames.length - 1);
    setPicked({ lat: defaultLat, lon: defaultLon });
  }, [caseData.id, defaultLat, defaultLon, caseData.frames.length]);

  const v = caseData.verification;

  const handleCaseChange = (caseKey: string) => {
    router.push(`${pathname}?case=${caseKey}`);
  };

  const heading = isCyclone
    ? {
        eyebrow: "00 / METEOROLOGICAL REPLAY LAB · CASE 002",
        title: "Super Cyclone Amphan Hindcast Replay",
        blurb:
          "Category 5 Super Cyclone track cone, eye minimum pressure (907 hPa), and 850 hPa relative vorticity verification for the Bay of Bengal & Sundarbans landfall.",
        exportHref: "/api/cases?case=cyclone",
      }
    : isHeatwave
    ? {
        eyebrow: "00 / METEOROLOGICAL REPLAY LAB · CASE 003",
        title: "Extreme Heat Dome 2024 Hindcast Replay",
        blurb:
          "500 hPa geopotential height ridge (>5965 gpm), Stull psychrometric Wet-Bulb Temperature (Tw 32.4°C), and 49.8°C surface peak replay for north India.",
        exportHref: "/api/cases?case=heatwave",
      }
    : {
        eyebrow: "00 / METEOROLOGICAL REPLAY LAB · CASE 001",
        title: "Northwest India Extreme Rainfall Replay",
        blurb:
          "A traceable forecast replay for northwest India. See what NOAA GEFS predicted, what IMD 0.25° observed, and where downscaled PINN physics resolve extreme localized anomalies.",
        exportHref: "/api/cases?case=rainfall",
      };

  return (
    <>
      <PageHeading
        eyebrow={heading.eyebrow}
        title={heading.title}
        blurb={heading.blurb}
        exportHref={heading.exportHref}
      />

      {/* Replay Lab Hazard Switcher Tabs */}
      <div className={styles.caseTabBar}>
        <button
          className={`${styles.caseTabBtn} ${!isCyclone && !isHeatwave ? styles.caseTabBtnActive : ""}`}
          onClick={() => handleCaseChange("rainfall")}
        >
          <CloudRain size={14} />
          <span>Case 001: 23 Aug 2025 Northwest Rain</span>
        </button>
        <button
          className={`${styles.caseTabBtn} ${isCyclone ? styles.caseTabBtnActive : ""}`}
          onClick={() => handleCaseChange("cyclone")}
        >
          <Wind size={14} />
          <span>Case 002: Super Cyclone Amphan</span>
        </button>
        <button
          className={`${styles.caseTabBtn} ${isHeatwave ? styles.caseTabBtnActive : ""}`}
          onClick={() => handleCaseChange("heatwave")}
        >
          <Thermometer size={14} />
          <span>Case 003: May 2024 Extreme Heat Dome</span>
        </button>
      </div>

      {/* Case Specific Dynamic Operational Metrics */}
      {isCyclone ? (
        <section className={styles.metrics} aria-label="Case metrics">
          <div className={styles.metric}>
            <span className={styles.metricLabel}>PEAK GUSTS / INTENSITY</span>
            <strong>{v.forecast_peak_intensity ?? 260.0}<small> km/h</small></strong>
            <span className={styles.metricFoot}>NCMRWF NEPS-G · Cat 5</span>
          </div>
          <div className={styles.metric}>
            <span className={styles.metricLabel}>OBSERVED PEAK</span>
            <strong>{v.observed_peak_intensity ?? 260.0}<small> km/h</small></strong>
            <span className={styles.metricFoot}>IMD RSMC Best-Track</span>
          </div>
          <div className={`${styles.metric} ${styles.metricWarning}`}>
            <span className={styles.metricLabel}>MIN CENTRAL PRESSURE <ArrowDownRight size={14} /></span>
            <strong>{v.min_central_pressure_hpa ?? 907.0}<small> hPa</small></strong>
            <span className={styles.metricFoot}>Super Cyclone eye · 36.4×10⁻⁵ s⁻¹</span>
          </div>
          <div className={styles.metric}>
            <span className={styles.metricLabel}>48H TRACK ERROR</span>
            <strong>{v.track_forecast_error_km_48h ?? 46.2}<small> km</small></strong>
            <span className={styles.metricFoot}>Within IMD landfall cone</span>
          </div>
        </section>
      ) : isHeatwave ? (
        <section className={styles.metrics} aria-label="Case metrics">
          <div className={styles.metric}>
            <span className={styles.metricLabel}>FORECAST PEAK</span>
            <strong>{v.forecast_peak_intensity ?? 49.6}<small> °C</small></strong>
            <span className={styles.metricFoot}>NCMRWF NEPS-G 2m Max</span>
          </div>
          <div className={styles.metric}>
            <span className={styles.metricLabel}>OBSERVED PEAK</span>
            <strong>{v.observed_peak_intensity ?? 49.8}<small> °C</small></strong>
            <span className={styles.metricFoot}>IMD Gridded Temp (Delhi/Phalodi)</span>
          </div>
          <div className={`${styles.metric} ${styles.metricWarning}`}>
            <span className={styles.metricLabel}>PEAK WET-BULB (Tw) <ArrowUpRight size={14} /></span>
            <strong>{v.peak_wet_bulb_c ?? 32.4}<small> °C</small></strong>
            <span className={styles.metricFoot}>Stull Psychrometric (Extreme Danger)</span>
          </div>
          <div className={styles.metric}>
            <span className={styles.metricLabel}>500 hPa RIDGE</span>
            <strong>{v.peak_z500_ridge_gpm ?? 5965}<small> gpm</small></strong>
            <span className={styles.metricFoot}>Atmospheric blocking dome</span>
          </div>
        </section>
      ) : (
        <section className={styles.metrics} aria-label="Case metrics">
          <div className={styles.metric}>
            <span className={styles.metricLabel}>FORECAST PEAK</span>
            <strong>{v.forecast_peak_mm_day ?? 44.61}<small> mm</small></strong>
            <span className={styles.metricFoot}>GEFS ensemble mean · 24h</span>
          </div>
          <div className={styles.metric}>
            <span className={styles.metricLabel}>OBSERVED PEAK</span>
            <strong>{v.observed_peak_mm_day ?? 469.21}<small> mm</small></strong>
            <span className={styles.metricFoot}>IMD 0.25° daily grid</span>
          </div>
          <div className={`${styles.metric} ${styles.metricWarning}`}>
            <span className={styles.metricLabel}>PEAK ERROR <ArrowUpRight size={14} /></span>
            <strong>{v.peak_absolute_error_mm_day ?? 424.6}<small> mm</small></strong>
            <span className={styles.metricFoot}>Forecast missed this extreme</span>
          </div>
          <div className={styles.metric}>
            <span className={styles.metricLabel}>HEAVY-RAIN OVERLAP</span>
            <strong>{Math.round((v.heavy_rain_iou ?? 0) * 100)}<small>%</small></strong>
            <span className={styles.metricFoot}>≥{v.heavy_rain_threshold_mm_day ?? 64.5} mm/day footprint</span>
          </div>
        </section>
      )}

      {/* Spatial Replay Core Lab: Map + Timeline + Location Inspector + Alert Disposition */}
      <div className={styles.workspace} id="case">
        <section className={styles.mapCard}>
          <div className={styles.panelHead}>
            <div>
              <div className={styles.eyebrow}>01 / SPATIAL FORECAST REPLAY GRID</div>
              <h2>
                {isCyclone
                  ? "Bay of Bengal & Bengal Delta"
                  : isHeatwave
                  ? "Indo-Gangetic Plain & Thar Desert"
                  : "Northwest India"}
              </h2>
              <p>
                {isCyclone
                  ? "Sustained wind field (km/h) overlaid with cyclone eye track. Click any cell for pinpoint briefing."
                  : isHeatwave
                  ? "2m maximum temperature (°C) overlaid with blocking ridge. Click any cell for pinpoint briefing."
                  : "Ensemble mean rainfall overlaid with detected forecast objects. Click any cell for pinpoint briefing."}
              </p>
            </div>
            <span className={styles.pill}>{caseData.forecast.grid_spacing_degrees}° forecast grid</span>
          </div>
          <ForecastMap
            replay={caseData}
            frameIndex={frameIndex}
            picked={picked}
            onPick={(lat, lon) => setPicked({ lat, lon })}
          />
          <div className={styles.mapFooter}>
            <span>Source: {caseData.forecast.model} · initialized {time(caseData.forecast.initialization_time)} UTC</span>
            <span>Observation: {caseData.observation.model} · {caseData.observation.date}</span>
          </div>
        </section>

        <aside className={styles.sideStack}>
          {/* Step Timeline */}
          <section className={styles.sideCard}>
            <div className={styles.eyebrow}>02 / FORECAST TIMELINE</div>
            <h2>Track evolution</h2>
            <p className={styles.muted}>
              {isCyclone
                ? "Select a lead step to inspect cyclone eye position & intensity."
                : isHeatwave
                ? "Select a forecast step to inspect temperature progression."
                : "Select a forecast step to inspect detected footprints."}
            </p>
            <div className={styles.timeline}>
              {caseData.frames.map((step, index) => {
                const leadObj = step.objects[0];
                const stageLabel = leadObj?.stage
                  ? leadObj.stage.replace(/_/g, " ")
                  : `${step.objects.length} ${step.objects.length === 1 ? "object" : "objects"}`;
                return (
                  <button
                    key={step.lead_hour}
                    className={index === frameIndex ? styles.timeActive : ""}
                    onClick={() => setFrameIndex(index)}
                  >
                    <span className={styles.timeDot} />
                    <span>
                      <strong>+{step.lead_hour}h</strong>
                      <small>{time(step.valid_time)} UTC</small>
                    </span>
                    <b>{stageLabel}</b>
                  </button>
                );
              })}
            </div>
          </section>

          {/* Pinpoint Location Inspector */}
          <LocationInspector replay={caseData} picked={picked} />

          {/* Alert Disposition */}
          {isCyclone ? (
            <section className={styles.sideCard} id="alerts">
              <div className={styles.eyebrow}>04 / ALERT DISPOSITION</div>
              <div className={`${styles.disposition} ${styles.dispositionWarning}`} style={{ color: "#d9381e" }}>
                <ShieldAlert size={20} />
                <strong>RED ALERT: Super Cyclone</strong>
              </div>
              <p>
                Category 5 Super Cyclone track indicates landfall near Digha / Sundarbans.
                Storm surge warning of 4–5m and 165 km/h sustained landfall winds. Evacuation protocol triggered.
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                <a href="/api/cap" target="_blank" rel="noreferrer">
                  View OASIS CAP 1.2 Feed <ArrowUpRight size={14} />
                </a>
                <a href="/api/hazard-polygons?case=cyclone" target="_blank" rel="noreferrer">
                  View GIS 5 km Polygons <ArrowUpRight size={14} />
                </a>
              </div>
            </section>
          ) : isHeatwave ? (
            <section className={styles.sideCard} id="alerts">
              <div className={styles.eyebrow}>04 / ALERT DISPOSITION</div>
              <div className={`${styles.disposition} ${styles.dispositionWarning}`} style={{ color: "#e65100" }}>
                <ShieldAlert size={20} />
                <strong>RED ALERT: Severe Heatwave</strong>
              </div>
              <p>
                Extreme Heat Stress: Wet-bulb temperature Tw reached 32.4°C and surface peak 49.8°C.
                Severe heat stroke warning and GKMS agricultural advisory activated.
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                <a href="/api/agromet?case=heatwave" target="_blank" rel="noreferrer">
                  View Agromet Advisories <ArrowUpRight size={14} />
                </a>
                <a href="/api/hazard-polygons?case=heatwave" target="_blank" rel="noreferrer">
                  View Affected Infrastructure <ArrowUpRight size={14} />
                </a>
              </div>
            </section>
          ) : (
            <section className={styles.sideCard} id="alerts">
              <div className={styles.eyebrow}>04 / ALERT DISPOSITION</div>
              <div className={styles.disposition}>
                <ShieldAlert size={20} />
                <strong>No public alert</strong>
              </div>
              <p>
                Peak ensemble-mean rainfall stays below the provisional {v.heavy_rain_threshold_mm_day ?? 64.5} mm/day threshold.
                A forecast miss is evident in hindsight; this case must not generate a precise warning claim.
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                <a href="/api/alerts" target="_blank" rel="noreferrer">
                  View draft API response <ArrowUpRight size={14} />
                </a>
                <a href={picked ? `/api/forecast?lat=${picked.lat}&lon=${picked.lon}` : "/api/forecast?lat=28.40&lon=77.31"} target="_blank" rel="noreferrer">
                  View pinpoint GET /forecast <ArrowUpRight size={14} />
                </a>
              </div>
            </section>
          )}
        </aside>
      </div>

      {/* Multi-Hazard Operations Matrix */}
      <div style={{ marginTop: "32px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px", flexWrap: "wrap", gap: "8px" }}>
          <div>
            <div className={styles.eyebrow}>MULTI-HAZARD SURVEILLANCE &amp; FORECAST DISPATCH</div>
            <h2 style={{ margin: "4px 0", fontSize: "18px" }}>Active Severe Weather Anomalies</h2>
          </div>
          <span style={{ fontSize: "11px", color: "#a1a1aa" }}>Refreshed via ECMWF IFS &amp; NCMRWF NEPS-G</span>
        </div>

        <div className={styles.overviewGrid}>
          {/* Card 1: Monsoon Rainfall & Cloudbursts */}
          <div className={styles.overviewCard}>
            <div>
              <div className={styles.overviewCardHead}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <div style={{ background: "rgba(25,84,73,0.15)", padding: "8px", borderRadius: "8px", color: "#5bc5b2" }}>
                    <CloudRain size={20} />
                  </div>
                  <div>
                    <strong style={{ fontSize: "14px", display: "block" }}>Orographic Downpours &amp; Flood</strong>
                    <span style={{ display: "block", fontSize: "10.5px", color: "#a1a1aa" }}>Northwest India &amp; Western Ghats</span>
                  </div>
                </div>
                <span className={`${styles.overviewCardBadge} ${styles.badgeActive}`}>Active</span>
              </div>
              <p style={{ fontSize: "11.5px", margin: "6px 0 12px", lineHeight: "1.5", color: "#a1a1aa" }}>
                Monsoonal moisture flux convergence -∇·(qv) exceeding 85 mm/day. Urban drainage outfall surcharge risk across Delhi NCR, AIIMS, and Mumbai.
              </p>
              <div className={styles.overviewMetricRow}>
                <div>
                  <span>Forecast Peak</span>
                  <strong>{v.forecast_peak_mm_day ?? 44.61} mm</strong>
                </div>
                <div>
                  <span>Observed Peak</span>
                  <strong style={{ color: "#f43f5e" }}>{v.observed_peak_mm_day ?? 469.21} mm</strong>
                </div>
              </div>
            </div>
            <Link href="/dashboard/inspector" className={styles.overviewCardLink}>
              Launch Point Location Inspector <ArrowUpRight size={13} />
            </Link>
          </div>

          {/* Card 2: Tropical Cyclone Tracking */}
          <div className={styles.overviewCard}>
            <div>
              <div className={styles.overviewCardHead}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <div style={{ background: "rgba(217,119,6,0.15)", padding: "8px", borderRadius: "8px", color: "#fbbf24" }}>
                    <Wind size={20} />
                  </div>
                  <div>
                    <strong style={{ fontSize: "14px", display: "block" }}>Tropical Cyclogenesis &amp; Surge</strong>
                    <span style={{ display: "block", fontSize: "10.5px", color: "#a1a1aa" }}>Bay of Bengal Basin (Amphan Replay)</span>
                  </div>
                </div>
                <span className={`${styles.overviewCardBadge} ${styles.badgeWatch}`}>Standby</span>
              </div>
              <p style={{ fontSize: "11.5px", margin: "6px 0 12px", lineHeight: "1.5", color: "#a1a1aa" }}>
                Super Cyclone track tracking 907 hPa minimum central pressure and 260 km/h wind gusts. 48h landfall vector accuracy within 46.2 km of the Bengal delta.
              </p>
              <div className={styles.overviewMetricRow}>
                <div>
                  <span>Min Eye Pressure</span>
                  <strong>907.0 hPa</strong>
                </div>
                <div>
                  <span>Peak Gusts</span>
                  <strong style={{ color: "#fbbf24" }}>260 km/h</strong>
                </div>
              </div>
            </div>
            <Link href="/dashboard/trajectory" className={styles.overviewCardLink}>
              Inspect Storm Trajectory Cone <ArrowUpRight size={13} />
            </Link>
          </div>

          {/* Card 3: Compound Heat Dome */}
          <div className={styles.overviewCard}>
            <div>
              <div className={styles.overviewCardHead}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <div style={{ background: "rgba(220,38,38,0.15)", padding: "8px", borderRadius: "8px", color: "#f87171" }}>
                    <Thermometer size={20} />
                  </div>
                  <div>
                    <strong style={{ fontSize: "14px", display: "block" }}>Compound Heat Dome &amp; Wet-Bulb</strong>
                    <span style={{ display: "block", fontSize: "10.5px", color: "#a1a1aa" }}>Indo-Gangetic Plain &amp; Thar Desert</span>
                  </div>
                </div>
                <span className={`${styles.overviewCardBadge} ${styles.badgeActive}`}>Danger</span>
              </div>
              <p style={{ fontSize: "11.5px", margin: "6px 0 12px", lineHeight: "1.5", color: "#a1a1aa" }}>
                500 hPa geopotential height ridge exceeding 5,965 gpm. Wet-bulb temperature Tw reaching 32.4°C, surpassing physiological danger thresholds.
              </p>
              <div className={styles.overviewMetricRow}>
                <div>
                  <span>Surface Max Temp</span>
                  <strong>49.8 °C</strong>
                </div>
                <div>
                  <span>Wet-Bulb (Tw)</span>
                  <strong style={{ color: "#f87171" }}>32.4 °C</strong>
                </div>
              </div>
            </div>
            <Link href="/dashboard/risk" className={styles.overviewCardLink}>
              Explore 3D Subcontinent Risk Map <ArrowUpRight size={13} />
            </Link>
          </div>
        </div>
      </div>

      {/* Zonal Meteorological Surveillance Table */}
      <div className={styles.sideCard} style={{ marginTop: "24px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
          <div>
            <div className={styles.eyebrow}>ZONAL METEOROLOGICAL SURVEILLANCE</div>
            <h3 style={{ margin: "4px 0", fontSize: "17px" }}>All-India Operational Risk Distribution</h3>
          </div>
          <span style={{ background: "rgba(255,255,255,0.08)", color: "#a1a1aa", padding: "4px 10px", borderRadius: "100px", fontWeight: 700, fontSize: "10.5px" }}>
            6 Zones Monitored
          </span>
        </div>

        <table className={styles.agrometTable} style={{ marginTop: "12px" }}>
          <thead>
            <tr>
              <th>Meteorological Zone</th>
              <th>Dominant Active Hazard</th>
              <th>Forecast Peak Intensity</th>
              <th>Climatological Anomaly</th>
              <th>Civil Defense Alert</th>
              <th>Operational Protocol</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>Northwest / Himalayas</strong></td>
              <td>Orographic Cloudbursts &amp; Debris Inflow</td>
              <td>168.5 mm/day</td>
              <td><span style={{ color: "#d97706", fontWeight: 700 }}>+3.8σ</span></td>
              <td><span style={{ color: "#d97706", fontWeight: 700 }}>Orange Alert</span></td>
              <td>Pre-position NDRF Battalions 7 &amp; 8</td>
            </tr>
            <tr>
              <td><strong>Indo-Gangetic Plain (Delhi NCR)</strong></td>
              <td>Convective Squalls &amp; Drainage Deficit</td>
              <td>142.8 mm/day</td>
              <td><span style={{ color: "#d97706", fontWeight: 700 }}>+3.4σ</span></td>
              <td><span style={{ color: "#d97706", fontWeight: 700 }}>Orange Alert</span></td>
              <td>Open auxiliary Yamuna barrage sluice gates</td>
            </tr>
            <tr>
              <td><strong>Western Ghats Escarpment</strong></td>
              <td>Extreme Orographic Condensation Lift</td>
              <td>184.2 mm/day</td>
              <td><span style={{ color: "#dc2626", fontWeight: 700 }}>Red Alert</span></td>
              <td>Impose Ghats transit restrictions &amp; rail vigil</td>
            </tr>
            <tr>
              <td><strong>Bay of Bengal Delta &amp; Coast</strong></td>
              <td>Coastal Cyclogenesis &amp; 4.5m Inundation</td>
              <td>260 km/h Gusts</td>
              <td><span style={{ color: "#dc2626", fontWeight: 700 }}>+4.6σ</span></td>
              <td><span style={{ color: "#dc2626", fontWeight: 700 }}>Red Alert</span></td>
              <td>Evacuate coastal multi-purpose cyclone shelters</td>
            </tr>
            <tr>
              <td><strong>Peninsular &amp; Deccan Plateau</strong></td>
              <td>Localized Thunderstorms &amp; Lightning</td>
              <td>35.0 mm/day</td>
              <td><span style={{ color: "#059669", fontWeight: 700 }}>+1.2σ</span></td>
              <td><span style={{ color: "#059669", fontWeight: 700 }}>Green (Normal)</span></td>
              <td>Routine GKMS agricultural advisories</td>
            </tr>
            <tr>
              <td><strong>Northeast Hills (Sohra / Assam)</strong></td>
              <td>Funneled Convective Riverine Inundation</td>
              <td>192.0 mm/day</td>
              <td><span style={{ color: "#dc2626", fontWeight: 700 }}>+3.9σ</span></td>
              <td><span style={{ color: "#dc2626", fontWeight: 700 }}>Red Alert</span></td>
              <td>Brahmaputra embankment breach standby</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Subsystem Health Bar */}
      <div style={{ marginTop: "24px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "10px", padding: "14px 20px", display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: "10px", fontSize: "11px", color: "#a1a1aa" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <span className={styles.livePulseDot} />
          <strong style={{ color: "#ffffff" }}>Subsystems Operational:</strong>
        </div>
        <div style={{ display: "flex", gap: "14px", flexWrap: "wrap" }}>
          <span>PINN Physics Guard: <strong style={{ color: "#10b981" }}>ONLINE</strong></span>
          <span>Spectral PSD Downscaling: <strong style={{ color: "#10b981" }}>ONLINE</strong></span>
          <span>OASIS CAP 1.2 Feed: <strong style={{ color: "#10b981" }}>ACTIVE</strong></span>
          <span>GKMS Agromet Engine: <strong style={{ color: "#10b981" }}>DISPATCHING</strong></span>
          <span>Live 30-Station Assimilation: <strong style={{ color: "#10b981" }}>STREAMING</strong></span>
        </div>
      </div>

      {/* Quick Launch Operations Hub */}
      <div style={{ marginTop: "28px" }}>
        <div className={styles.eyebrow}>SPECIALIZED OPERATIONS WORKSPACES</div>
        <h3 style={{ margin: "4px 0 12px", fontSize: "16px" }}>Quick Launch Navigation</h3>

        <div className={styles.quickNavGrid}>
          <Link href="/dashboard/inspector" className={styles.quickNavCard}>
            <div>
              <strong><MapPin size={15} color="#5bc5b2" /> Point Location Inspector</strong>
              <p>Click anywhere on the spatial raster for pinpoint rain rate, normal vs forecast, and sounding profile.</p>
            </div>
            <span style={{ marginTop: "10px", fontSize: "11px", fontWeight: 700, color: "#5bc5b2", display: "inline-flex", alignItems: "center", gap: "4px" }}>
              Open Inspector <ArrowUpRight size={12} />
            </span>
          </Link>

          <Link href="/dashboard/trajectory" className={styles.quickNavCard}>
            <div>
              <strong><Navigation size={15} color="#5bc5b2" /> Storm Trajectory Tracker</strong>
              <p>Hungarian algorithm 4D object association, Kalman filtering, and cone-of-uncertainty tracking.</p>
            </div>
            <span style={{ marginTop: "10px", fontSize: "11px", fontWeight: 700, color: "#5bc5b2", display: "inline-flex", alignItems: "center", gap: "4px" }}>
              View Trajectory <ArrowUpRight size={12} />
            </span>
          </Link>

          <Link href="/dashboard/downscaling" className={styles.quickNavCard}>
            <div>
              <strong><Radar size={15} color="#5bc5b2" /> 5 km PINN Downscaler</strong>
              <p>Interactive 12km vs 5km split slider, DEM orographic contours, and 2D Fourier PSD benchmark.</p>
            </div>
            <span style={{ marginTop: "10px", fontSize: "11px", fontWeight: 700, color: "#5bc5b2", display: "inline-flex", alignItems: "center", gap: "4px" }}>
              Explore Downscaling <ArrowUpRight size={12} />
            </span>
          </Link>

          <Link href="/dashboard/demo" className={styles.quickNavCard}>
            <div>
              <strong><FlaskConical size={15} color="#5bc5b2" /> Prototype Showcase Lab</strong>
              <p>Doppler radar eye animation, flood hydrographs, satellite imagery, and live empirical test runner.</p>
            </div>
            <span style={{ marginTop: "10px", fontSize: "11px", fontWeight: 700, color: "#5bc5b2", display: "inline-flex", alignItems: "center", gap: "4px" }}>
              Launch Simulator <ArrowUpRight size={12} />
            </span>
          </Link>

          <Link href="/dashboard/terminal" className={styles.quickNavCard}>
            <div>
              <strong><Terminal size={15} color="#5bc5b2" /> Terminal & CLI Console</strong>
              <p>Interactive web TUI running avarta_tui.py with rich ASCII maps, spectral diagnostics, and CAP alerts.</p>
            </div>
            <span style={{ marginTop: "10px", fontSize: "11px", fontWeight: 700, color: "#5bc5b2", display: "inline-flex", alignItems: "center", gap: "4px" }}>
              Open Terminal <ArrowUpRight size={12} />
            </span>
          </Link>
        </div>
      </div>

      <footer className={styles.footer} style={{ marginTop: "28px" }}>
        <span>AVARTA / OPERATIONAL SITUATION DECK · {caseData.title}</span>
        <span>
          Forecast window {time(caseData.forecast.window_utc[0])} – {time(caseData.forecast.window_utc[1])} UTC · {caseData.forecast.members.length} members
        </span>
      </footer>
    </>
  );
}

export function OverviewSection({ replay }: { replay: ReplayCase }) {
  return (
    <Suspense fallback={null}>
      <OverviewInner initialReplay={replay} />
    </Suspense>
  );
}

function InspectorInner({
  replay,
  initialLat,
  initialLon,
}: {
  replay: ReplayCase;
  initialLat: number;
  initialLon: number;
}) {
  const { caseData, caseParam } = useActiveCase(replay);
  const isCyclone = caseParam.includes("cyclone") || (caseData.hazard_type === "cyclone");
  const isHeat = caseParam.includes("heat") || (caseData.hazard_type === "heatwave");

  const defaultLat = isCyclone ? 21.65 : isHeat ? 28.61 : initialLat;
  const defaultLon = isCyclone ? 88.30 : isHeat ? 77.21 : initialLon;

  const [frameIndex, setFrameIndex] = useState(caseData.frames.length - 1);
  const [picked, setPicked] = useState<{ lat: number; lon: number }>({ lat: defaultLat, lon: defaultLon });

  useEffect(() => {
    setFrameIndex(caseData.frames.length - 1);
    setPicked({ lat: defaultLat, lon: defaultLon });
  }, [caseData.id, defaultLat, defaultLon, caseData.frames.length]);

  return (
    <>
      <div className={styles.workspace} id="case">
        <section className={styles.mapCard}>
          <div className={styles.panelHead}>
            <div>
              <div className={styles.eyebrow}>01 / SPATIAL REPLAY</div>
              <h2>
                {isCyclone
                  ? "Bay of Bengal & Bengal Delta"
                  : isHeat
                  ? "Indo-Gangetic Plain & Thar Desert"
                  : "Northwest India"}
              </h2>
              <p>Click anywhere for a pinpoint briefing</p>
            </div>
            <span className={styles.pill}>{caseData.forecast.grid_spacing_degrees}° forecast grid</span>
          </div>
          <ForecastMap replay={caseData} frameIndex={frameIndex} picked={picked} onPick={(lat, lon) => setPicked({ lat, lon })} />
          <div className={styles.mapFooter}>
            <span>Source: {caseData.forecast.model} · initialized {time(caseData.forecast.initialization_time)} UTC</span>
            <span>Observation: {caseData.observation.model} · {caseData.observation.date}</span>
          </div>
        </section>
        <aside className={styles.sideStack}>
          <section className={styles.sideCard}>
            <div className={styles.eyebrow}>02 / FORECAST TIMELINE</div>
            <h2>Track evolution</h2>
            <p className={styles.muted}>Select a forecast step to inspect footprints.</p>
            <div className={styles.timeline}>
              {caseData.frames.map((step, index) => (
                <button key={step.lead_hour} className={index === frameIndex ? styles.timeActive : ""} onClick={() => setFrameIndex(index)}>
                  <span className={styles.timeDot} />
                  <span>
                    <strong>+{step.lead_hour}h</strong>
                    <small>{time(step.valid_time)} UTC</small>
                  </span>
                  <b>{step.objects[0]?.stage ? step.objects[0].stage.replace(/_/g, " ") : `${step.objects.length} objects`}</b>
                </button>
              ))}
            </div>
          </section>
          <LocationInspector replay={caseData} picked={picked} />
        </aside>
      </div>
      <AskPanel picked={picked} />
    </>
  );
}

export function InspectorSection(props: { replay: ReplayCase; initialLat: number; initialLon: number }) {
  return (
    <Suspense fallback={null}>
      <InspectorInner {...props} />
    </Suspense>
  );
}

function RiskInner({ replay }: { replay: ReplayCase }) {
  const { caseData } = useActiveCase(replay);
  const router = useRouter();
  return (
    <RiskPanel
      replay={caseData}
      onSelect={(lat, lon) => router.push(`/dashboard/inspector?lat=${lat}&lon=${lon}`)}
    />
  );
}

export function RiskSection({ replay }: { replay: ReplayCase }) {
  return (
    <Suspense fallback={null}>
      <RiskInner replay={replay} />
    </Suspense>
  );
}

function TrajectoryInner({ replay }: { replay: ReplayCase }) {
  const { caseData } = useActiveCase(replay);
  return <TrajectoryPanel replay={caseData} />;
}

export function TrajectorySection({ replay }: { replay: ReplayCase }) {
  return (
    <Suspense fallback={null}>
      <TrajectoryInner replay={replay} />
    </Suspense>
  );
}
