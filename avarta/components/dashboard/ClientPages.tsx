"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowDownRight, ArrowUpRight, ShieldAlert } from "lucide-react";
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

  const isCyclone = caseParam.includes("cyclone") || (caseData.hazard_type === "cyclone");
  const isHeatwave = caseParam.includes("heat") || (caseData.hazard_type === "heatwave");

  const [frameIndex, setFrameIndex] = useState(caseData.frames.length - 1);

  useEffect(() => {
    setFrameIndex(caseData.frames.length - 1);
  }, [caseData.id, caseData.frames.length]);

  const v = caseData.verification;

  const heading = isCyclone
    ? {
        eyebrow: "WEATHER INTELLIGENCE / 002 · HISTORICAL REPLAY",
        title: "Super Cyclone Amphan, in context.",
        blurb: "Category 5 Super Cyclone track cone, eye minimum pressure (907 hPa), and 850 hPa relative vorticity verification for the Bay of Bengal & Sundarbans landfall.",
        exportHref: "/api/cases?case=cyclone",
      }
    : isHeatwave
    ? {
        eyebrow: "WEATHER INTELLIGENCE / 003 · HISTORICAL REPLAY",
        title: "Extreme Heat Dome 2024, in context.",
        blurb: "500 hPa geopotential height ridge (>5940 gpm), Stull psychrometric Wet-Bulb Temperature (Tw 31.4°C), and 49.6°C surface peak replay for north India.",
        exportHref: "/api/cases?case=heatwave",
      }
    : {
        eyebrow: "WEATHER INTELLIGENCE / 001 · HISTORICAL REPLAY",
        title: "Rainfall, in context.",
        blurb: "A traceable forecast replay for northwest India. See what the ensemble predicted, what IMD observed, and where the two diverged.",
        exportHref: "/api/cases",
      };

  return (
    <>
      <PageHeading
        eyebrow={heading.eyebrow}
        title={heading.title}
        blurb={heading.blurb}
        exportHref={heading.exportHref}
      />

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
            <strong>{v.peak_wet_bulb_c ?? 31.4}<small> °C</small></strong>
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

      <div className={styles.workspace} id="case">
        <section className={styles.mapCard}>
          <div className={styles.panelHead}>
            <div>
              <div className={styles.eyebrow}>01 / SPATIAL REPLAY</div>
              <h2>
                {isCyclone
                  ? "Bay of Bengal & Bengal Delta"
                  : isHeatwave
                  ? "Indo-Gangetic Plain & Thar Desert"
                  : "Northwest India"}
              </h2>
              <p>
                {isCyclone
                  ? "Sustained wind field (km/h) overlaid with cyclone eye track"
                  : isHeatwave
                  ? "2m maximum temperature (°C) overlaid with blocking ridge"
                  : "Ensemble mean rainfall overlaid with detected forecast objects"}
              </p>
            </div>
            <span className={styles.pill}>{caseData.forecast.grid_spacing_degrees}° forecast grid</span>
          </div>
          <ForecastMap
            replay={caseData}
            frameIndex={frameIndex}
            picked={null}
            onPick={(lat, lon) => router.push(`/dashboard/inspector?lat=${lat}&lon=${lon}`)}
          />
          <div className={styles.mapFooter}>
            <span>Source: {caseData.forecast.model} · initialized {time(caseData.forecast.initialization_time)} UTC</span>
            <span>Observation: {caseData.observation.model} · {caseData.observation.date}</span>
          </div>
        </section>

        <aside className={styles.sideStack}>
          <section className={styles.sideCard}>
            <div className={styles.eyebrow}>02 / FORECAST TIMELINE</div>
            <h2>Track evolution</h2>
            <p className={styles.muted}>
              {isCyclone
                ? "Select a lead step to inspect cyclone eye position & intensity."
                : isHeatwave
                ? "Select a forecast step to inspect temperature progression."
                : "Select a three-hour forecast step to inspect detected footprints."}
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

          {isCyclone ? (
            <section className={styles.sideCard} id="alerts">
              <div className={styles.eyebrow}>03 / ALERT DISPOSITION</div>
              <div className={`${styles.disposition} ${styles.dispositionWarning}`} style={{ color: "#d9381e" }}>
                <ShieldAlert size={20} />
                <strong>RED ALERT: Super Cyclone</strong>
              </div>
              <p>
                Category 5 Super Cyclone track indicates landfall near Digha / Sundarbans.
                Storm surge warning of 4–5m and 165 km/h sustained landfall winds. Evacuation protocol triggered.
              </p>
              <a href="/api/cap" target="_blank" rel="noreferrer">
                View OASIS CAP 1.2 Feed <ArrowUpRight size={14} />
              </a>
              <br />
              <a href="/api/hazard-polygons?case=cyclone" target="_blank" rel="noreferrer">
                View GIS 5 km Polygons <ArrowUpRight size={14} />
              </a>
            </section>
          ) : isHeatwave ? (
            <section className={styles.sideCard} id="alerts">
              <div className={styles.eyebrow}>03 / ALERT DISPOSITION</div>
              <div className={`${styles.disposition} ${styles.dispositionWarning}`} style={{ color: "#e65100" }}>
                <ShieldAlert size={20} />
                <strong>RED ALERT: Severe Heatwave</strong>
              </div>
              <p>
                Extreme Heat Stress: Wet-bulb temperature Tw reached 31.4°C and surface peak 49.8°C.
                Severe heat stroke warning and GKMS agricultural advisory activated.
              </p>
              <a href="/api/agromet?case=heatwave" target="_blank" rel="noreferrer">
                View Agromet Advisories <ArrowUpRight size={14} />
              </a>
              <br />
              <a href="/api/hazard-polygons?case=heatwave" target="_blank" rel="noreferrer">
                View Affected Infrastructure <ArrowUpRight size={14} />
              </a>
            </section>
          ) : (
            <section className={styles.sideCard} id="alerts">
              <div className={styles.eyebrow}>03 / ALERT DISPOSITION</div>
              <div className={styles.disposition}>
                <ShieldAlert size={20} />
                <strong>No public alert</strong>
              </div>
              <p>
                Peak ensemble-mean rainfall stays below the provisional {v.heavy_rain_threshold_mm_day ?? 64.5} mm/day threshold.
                A forecast miss is evident in hindsight; this case must not generate a precise warning claim.
              </p>
              <a href="/api/alerts" target="_blank" rel="noreferrer">
                View draft API response <ArrowUpRight size={14} />
              </a>
              <br />
              <a href="/api/forecast?lat=28.40&lon=77.31" target="_blank" rel="noreferrer">
                View pinpoint GET /forecast <ArrowUpRight size={14} />
              </a>
            </section>
          )}
        </aside>
      </div>

      <footer className={styles.footer}>
        <span>AVARTA / RESEARCH PROTOTYPE · {caseData.title}</span>
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
