"use client";

import { useState } from "react";
import { ArrowDownRight, ArrowUpRight, CalendarDays, ChevronRight, CloudRain, Download, FlaskConical, Layers3, MapPin, ShieldAlert } from "lucide-react";
import type { BenchmarkReport, ReplayCase } from "@/lib/replay";
import { MOCK_THREATS } from "@/lib/mock-weather-data";
import styles from "./replay.module.css";

type Mode = "historical" | "demo";

const time = (iso: string) => new Date(iso).toLocaleString("en-GB", {
  day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "UTC",
});

function fieldColor(value: number) {
  if (value >= 35) return "#b84d30";
  if (value >= 25) return "#db7544";
  if (value >= 15) return "#e9a45f";
  if (value >= 8) return "#edd29a";
  if (value >= 3) return "#bad2c4";
  if (value >= 0.5) return "#dce5dd";
  return "#f0f1e9";
}

function ForecastMap({ replay, frameIndex }: { replay: ReplayCase; frameIndex: number }) {
  const { latitudes, longitudes, forecast_mm_day } = replay.raster;
  const { south, north, west, east } = replay.domain;
  const x = (lon: number) => 58 + ((lon - west) / (east - west)) * 744;
  const y = (lat: number) => 36 + ((north - lat) / (north - south)) * 485;
  const frame = replay.frames[frameIndex];
  const selected = frame.objects.slice(0, 4);
  const trail = replay.frames.slice(0, frameIndex + 1).flatMap((item) => item.objects.slice(0, 1));
  return (
    <div className={styles.mapWrap}>
      <svg viewBox="0 0 860 570" role="img" aria-label="GEFS forecast rainfall over northwest India, with detected forecast footprints and the observed IMD peak">
        <rect x="58" y="36" width="744" height="485" rx="4" fill="#f0f1e9" />
        {forecast_mm_day.map((row, r) => row.map((value, c) => (
          <rect key={`${r}-${c}`} x={x(longitudes[c]) - 12.4} y={y(latitudes[r]) - 11.1}
            width="24.8" height="22.2" fill={fieldColor(value)} opacity="0.95" />
        )))}
        {[70, 75, 80].map((lon) => <g key={lon}><line x1={x(lon)} x2={x(lon)} y1="36" y2="521" stroke="#60766e" strokeOpacity=".27" strokeDasharray="3 5"/><text x={x(lon)} y="547" textAnchor="middle">{lon}°E</text></g>)}
        {[20, 25, 30].map((lat) => <g key={lat}><line x1="58" x2="802" y1={y(lat)} y2={y(lat)} stroke="#60766e" strokeOpacity=".27" strokeDasharray="3 5"/><text x="40" y={y(lat) + 4} textAnchor="end">{lat}°N</text></g>)}
        {trail.length > 1 && <polyline points={trail.map((object) => `${x(object.centroid[1])},${y(object.centroid[0])}`).join(" ")} fill="none" stroke="#1e635f" strokeWidth="2" strokeDasharray="5 5" />}
        {selected.map((object, index) => <g key={object.track_id ?? index}>
          <rect x={x(object.bbox[1])} y={y(object.bbox[2])} width={Math.max(10, x(object.bbox[3]) - x(object.bbox[1]))} height={Math.max(10, y(object.bbox[0]) - y(object.bbox[2]))} fill="none" stroke="#205d5c" strokeWidth="2" strokeDasharray="5 4" />
          <circle cx={x(object.centroid[1])} cy={y(object.centroid[0])} r="6" fill="#205d5c" stroke="white" strokeWidth="2" />
        </g>)}
        <circle cx={x(replay.verification.observed_peak_location[1])} cy={y(replay.verification.observed_peak_location[0])} r="11" fill="none" stroke="#bb5031" strokeWidth="2" />
        <line x1={x(replay.verification.observed_peak_location[1])-15} x2={x(replay.verification.observed_peak_location[1])+15} y1={y(replay.verification.observed_peak_location[0])} y2={y(replay.verification.observed_peak_location[0])} stroke="#bb5031" strokeWidth="2" />
        <line x1={x(replay.verification.observed_peak_location[1])} x2={x(replay.verification.observed_peak_location[1])} y1={y(replay.verification.observed_peak_location[0])-15} y2={y(replay.verification.observed_peak_location[0])+15} stroke="#bb5031" strokeWidth="2" />
      </svg>
      <div className={styles.mapKey}><span><i className={styles.ramp} /> Forecast rainfall · mm / 24h</span><span><i className={styles.observedKey} /> IMD observed peak</span><span><i className={styles.trackKey} /> Selected forecast object</span></div>
    </div>
  );
}

export default function ReplayDashboard({ replay, benchmark }: { replay: ReplayCase; benchmark: BenchmarkReport }) {
  const [mode, setMode] = useState<Mode>("historical");
  const [frameIndex, setFrameIndex] = useState(replay.frames.length - 1);
  const v = replay.verification;
  const selectedDemo = MOCK_THREATS[0];
  return <div className={styles.shell}>
    <aside className={styles.rail}>
      <a href="/dashboard" className={styles.logo} aria-label="Avarta home"><span className={styles.logoMark}>a</span><span>avarta<span className={styles.logoDot}>.</span></span></a>
      <p className={styles.railLabel}>WORKSPACE</p>
      <nav className={styles.nav}><a className={styles.navActive} href="/dashboard"><Layers3 size={17}/> Overview</a><a href="#case"><CloudRain size={17}/> Case study</a><a href="#validation"><FlaskConical size={17}/> Validation</a><a href="#alerts"><ShieldAlert size={17}/> Alert policy</a></nav>
      <div className={styles.railBottom}><span className={styles.railPulse}/><span>Research prototype<br/><small>SIH 26078 · Not operational</small></span></div>
    </aside>
    <div className={styles.content}>
      <header className={styles.topbar}><div className={styles.breadcrumb}>Avarta <ChevronRight size={13}/> Weather intelligence <ChevronRight size={13}/> <strong>Overview</strong></div><div className={styles.topRight}>{mode === "historical" && <span className={styles.topDate}><CalendarDays size={14}/> 23 August 2025</span>}<span className={styles.status}>{mode === "historical" ? "HISTORICAL REPLAY" : "SYNTHETIC DEMO"}</span></div></header>
      <main className={styles.main}>
        <div className={styles.heading}><div><div className={styles.eyebrow}>WEATHER INTELLIGENCE / 001</div><h1>Rainfall, in context.</h1><p>A traceable forecast replay for northwest India. See what the ensemble predicted, what IMD observed, and where the two diverged.</p></div><a className={styles.export} href="/api/cases" target="_blank" rel="noreferrer"><Download size={15}/> Export case JSON</a></div>
        <div className={styles.modeBar} role="tablist" aria-label="Data mode"><button role="tab" aria-selected={mode === "historical"} className={mode === "historical" ? styles.modeActive : ""} onClick={() => setMode("historical")}>Historical evidence <span>01</span></button><button role="tab" aria-selected={mode === "demo"} className={mode === "demo" ? styles.modeActive : ""} onClick={() => setMode("demo")}>Prototype demo <span>03</span></button><span className={styles.modeNote}>{mode === "historical" ? "NOAA GEFS + IMD · real archived data" : "Synthetic examples · not real forecasts"}</span></div>
        {mode === "historical" ? <>
          <section className={styles.metrics} aria-label="Case metrics"><div className={styles.metric}><span className={styles.metricLabel}>FORECAST PEAK</span><strong>{v.forecast_peak_mm_day}<small> mm</small></strong><span className={styles.metricFoot}>GEFS ensemble mean · 24h</span></div><div className={styles.metric}><span className={styles.metricLabel}>OBSERVED PEAK</span><strong>{v.observed_peak_mm_day}<small> mm</small></strong><span className={styles.metricFoot}>IMD 0.25° daily grid</span></div><div className={`${styles.metric} ${styles.metricWarning}`}><span className={styles.metricLabel}>PEAK ERROR <ArrowUpRight size={14}/></span><strong>{v.peak_absolute_error_mm_day}<small> mm</small></strong><span className={styles.metricFoot}>Forecast missed this extreme</span></div><div className={styles.metric}><span className={styles.metricLabel}>HEAVY-RAIN OVERLAP</span><strong>{Math.round((v.heavy_rain_iou ?? 0) * 100)}<small>%</small></strong><span className={styles.metricFoot}>≥{v.heavy_rain_threshold_mm_day} mm/day footprint</span></div></section>
          <div className={styles.workspace} id="case"><section className={styles.mapCard}><div className={styles.panelHead}><div><div className={styles.eyebrow}>01 / SPATIAL REPLAY</div><h2>Northwest India</h2><p>Ensemble mean rainfall overlaid with detected forecast objects</p></div><span className={styles.pill}>0.5° forecast grid</span></div><ForecastMap replay={replay} frameIndex={frameIndex}/><div className={styles.mapFooter}><span>Source: NOAA GEFS · initialized {time(replay.forecast.initialization_time)} UTC</span><span>Observation: IMD · {replay.observation.date}</span></div></section>
          <aside className={styles.sideStack}><section className={styles.sideCard}><div className={styles.eyebrow}>02 / FORECAST TIMELINE</div><h2>Track evolution</h2><p className={styles.muted}>Select a three-hour forecast step to inspect detected footprints.</p><div className={styles.timeline}>{replay.frames.map((step, index) => <button key={step.lead_hour} className={index === frameIndex ? styles.timeActive : ""} onClick={() => setFrameIndex(index)}><span className={styles.timeDot}/><span><strong>+{step.lead_hour}h</strong><small>{time(step.valid_time)} UTC</small></span><b>{step.objects.length} {step.objects.length === 1 ? "object" : "objects"}</b></button>)}</div></section><section className={styles.sideCard} id="alerts"><div className={styles.eyebrow}>03 / ALERT DISPOSITION</div><div className={styles.disposition}><ShieldAlert size={20}/><strong>No public alert</strong></div><p>Peak ensemble-mean rainfall stays below the provisional {v.heavy_rain_threshold_mm_day} mm/day threshold. A forecast miss is evident in hindsight; this case must not generate a precise warning claim.</p><a href="/api/alerts" target="_blank" rel="noreferrer">View draft API response <ArrowUpRight size={14}/></a></section></aside></div>
          <section className={styles.lower} id="validation"><div className={styles.lowerHead}><div><div className={styles.eyebrow}>04 / EVIDENCE & LIMITS</div><h2>What the numbers say</h2></div><span>Retrospective verification · {v.sampled_grid_cells.toLocaleString()} valid cells</span></div><div className={styles.evidenceGrid}><article><span className={styles.evidenceIcon}><ArrowDownRight size={18}/></span><h3>Mismatch matters</h3><p>The forecast peak is {v.forecast_peak_mm_day} mm/day; IMD reports {v.observed_peak_mm_day} mm/day. The heavy-rain footprints do not overlap at this threshold.</p></article><article><span className={styles.evidenceIcon}><Layers3 size={18}/></span><h3>Resolution is explicit</h3><p>GEFS is 0.5°; IMD observations are 0.25°. No 5 km grid, diffusion output, or calibrated local impact zone is claimed here.</p></article><article><span className={styles.evidenceIcon}><MapPin size={18}/></span><h3>Trace every point</h3><p>Five archived GEFS members and the IMD daily grid feed this replay. Each frame carries a valid time, lead hour, and track footprint.</p></article></div><div className={styles.benchmark}><div><div className={styles.eyebrow}>SEPARATE MODEL EXPERIMENT</div><h3>Residual CNN vs. bilinear</h3><p>IMD 0.25° target-centered crops, smoothed into a coarse proxy. {benchmark.validation.validation_samples} held-out dates from {benchmark.validation.first_validation_date}; no independent NWP and no 5 km ground truth.</p></div><div className={styles.benchmarkScroll}><table><thead><tr><th>Validation metric</th><th>Residual CNN</th><th>Bilinear</th></tr></thead><tbody><tr><td>Peak absolute error ↓</td><td>{benchmark.validation.residual_cnn.mean_peak_absolute_error_mm_day} mm</td><td>{benchmark.validation.bilinear.mean_peak_absolute_error_mm_day} mm</td></tr><tr><td>Heavy-rain recall ↑</td><td>{Math.round(benchmark.validation.residual_cnn.heavy_rain_detection_recall * 100)}%</td><td>{Math.round(benchmark.validation.bilinear.heavy_rain_detection_recall * 100)}%</td></tr><tr><td>Footprint overlap ↑</td><td>{Math.round(benchmark.validation.residual_cnn.heavy_rain_footprint_iou * 100)}%</td><td>{Math.round(benchmark.validation.bilinear.heavy_rain_footprint_iou * 100)}%</td></tr><tr><td>Overall MAE ↓</td><td>{benchmark.validation.residual_cnn.mean_absolute_error_mm_day} mm</td><td>{benchmark.validation.bilinear.mean_absolute_error_mm_day} mm</td></tr><tr><td>False-alarm ratio ↓</td><td>{Math.round(benchmark.validation.residual_cnn.heavy_rain_false_alarm_ratio * 100)}%</td><td>{Math.round(benchmark.validation.bilinear.heavy_rain_false_alarm_ratio * 100)}%</td></tr></tbody></table></div></div><p className={styles.benchmarkNote}>The CNN improves peak and overlap metrics but worsens overall error and false alarms. It is not promoted to the historical forecast pipeline. <a href="/api/benchmark" target="_blank" rel="noreferrer">View full benchmark <ArrowUpRight size={12}/></a></p></section>
          <footer className={styles.footer}><span>AVARTA / RESEARCH PROTOTYPE</span><span>Forecast window {time(replay.forecast.window_utc[0])} – {time(replay.forecast.window_utc[1])} UTC · {replay.forecast.members.length} members</span></footer>
        </> : <section className={styles.demoPanel}><div className={styles.demoBanner}><FlaskConical size={19}/><div><strong>Synthetic prototype mode</strong><span>Everything below is hand-authored demo data. It is not a forecast, observation, or validated warning.</span></div></div><div className={styles.demoHeading}><div className={styles.eyebrow}>DESIGN CONCEPT / SYNTHETIC</div><h2>Explore the original threat objects</h2><p>These examples are retained to demonstrate future interface concepts only.</p></div><div className={styles.demoGrid}>{MOCK_THREATS.map((threat) => <article key={threat.id}><span>FICTIONAL · {threat.hazard_type.replaceAll("_", " ")}</span><h3>{threat.name}</h3><div className={styles.demoStat}>{threat.intensity_current}<small> {threat.intensity_unit}</small></div><p>{threat.centroid.lat.toFixed(1)}°N, {threat.centroid.lon.toFixed(1)}°E · synthetic centroid</p></article>)}</div><p className={styles.demoFoot}>The legacy dashboard referenced 5 km downscaling, physical verification, and CAP alerts without empirical support. Those claims are intentionally excluded from this research interface. Example: {selectedDemo.id}.</p></section>}
      </main>
    </div>
  </div>;
}
