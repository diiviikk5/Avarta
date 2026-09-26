"use client";

import { useMemo, useState } from "react";
import { ArrowDownRight, ArrowUpRight, CalendarDays, ChevronRight, CloudRain, Download, FlaskConical, Layers3, MapPin, Navigation, Radar, ShieldAlert, Sparkles, Thermometer } from "lucide-react";
import type { BenchmarkReport, ReplayCase } from "@/lib/replay";
import { impactsFor, nearestPlace, regionRiskRows, replayTrackLegs, riskScore } from "@/lib/forecast";
import RiskIndia3D from "@/components/dashboard/RiskIndia3D";
import { MOCK_THREATS } from "@/lib/mock-weather-data";
import styles from "./replay.module.css";

type Mode = "historical" | "demo";

const time = (iso: string) => new Date(iso).toLocaleString("en-GB", {
  day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "UTC",
});

function fieldColor(value: number, hazardType?: string) {
  if (hazardType === "cyclone") {
    if (value >= 200) return "#781c68";
    if (value >= 165) return "#a82323";
    if (value >= 120) return "#db4827";
    if (value >= 90) return "#e68a22";
    if (value >= 60) return "#389e82";
    if (value >= 30) return "#72b6c7";
    return "#e8f1f2";
  }
  if (hazardType === "heatwave") {
    if (value >= 48) return "#8a1111";
    if (value >= 45) return "#cb2821";
    if (value >= 42) return "#eb6b20";
    if (value >= 38) return "#f2a93b";
    if (value >= 35) return "#f5d562";
    return "#faf5e8";
  }
  if (value >= 35) return "#b84d30";
  if (value >= 25) return "#db7544";
  if (value >= 15) return "#e9a45f";
  if (value >= 8) return "#edd29a";
  if (value >= 3) return "#bad2c4";
  if (value >= 0.5) return "#dce5dd";
  return "#f0f1e9";
}

function riskEmoji(band: string) {
  return band === "SEVERE" ? "🔴" : band === "HIGH" ? "🟠" : band === "MODERATE" ? "🟡" : "🟢";
}

function nearestGridValue(replay: ReplayCase, lat: number, lon: number) {
  let row = 0;
  let col = 0;
  replay.raster.latitudes.forEach((v, i) => {
    if (Math.abs(v - lat) < Math.abs(replay.raster.latitudes[row] - lat)) row = i;
  });
  replay.raster.longitudes.forEach((v, i) => {
    if (Math.abs(v - lon) < Math.abs(replay.raster.longitudes[col] - lon)) col = i;
  });
  const grid = replay.raster.forecast_field ?? replay.raster.forecast_mm_day ?? [];
  return {
    row,
    col,
    rainfall: grid[row]?.[col] ?? 0,
    gridLat: replay.raster.latitudes[row] ?? lat,
    gridLon: replay.raster.longitudes[col] ?? lon,
  };
}

export function ForecastMap({ replay, frameIndex, picked, onPick }: { replay: ReplayCase; frameIndex: number; picked: { lat: number; lon: number } | null; onPick: (lat: number, lon: number) => void }) {
  const { latitudes, longitudes } = replay.raster;
  const forecastGrid: number[][] = (replay.raster.forecast_field ?? replay.raster.forecast_mm_day ?? []) as number[][];
  const { south, north, west, east } = replay.domain;
  const x = (lon: number) => 58 + ((lon - west) / (east - west)) * 744;
  const y = (lat: number) => 36 + ((north - lat) / (north - south)) * 485;
  const safeFrameIdx = Math.min(Math.max(0, frameIndex), replay.frames.length - 1);
  const frame = replay.frames[safeFrameIdx] ?? replay.frames[0];
  const selected = (frame?.objects ?? []).slice(0, 4);
  const trail = replay.frames.slice(0, safeFrameIdx + 1).flatMap((item) => (item?.objects ?? []).slice(0, 1));
  const legs = replayTrackLegs(replay).slice(0, 1);

  const cellW = (744 / Math.max(1, longitudes.length)) * 1.05;
  const cellH = (485 / Math.max(1, latitudes.length)) * 1.05;

  const lonSteps = useMemo(() => {
    const steps: number[] = [];
    const span = east - west;
    const interval = span > 14 ? 4 : span > 7 ? 2 : 1;
    const start = Math.ceil(west / interval) * interval;
    for (let l = start; l < east; l += interval) steps.push(l);
    return steps;
  }, [west, east]);

  const latSteps = useMemo(() => {
    const steps: number[] = [];
    const span = north - south;
    const interval = span > 14 ? 4 : span > 7 ? 2 : 1;
    const start = Math.ceil(south / interval) * interval;
    for (let l = start; l < north; l += interval) steps.push(l);
    return steps;
  }, [south, north]);

  const peakLoc = replay.verification.observed_peak_location ??
    replay.verification.landfall_location ??
    (replay.hazard_type === "heatwave" ? [27.13, 72.36] : null);

  const isCyclone = (replay.hazard_type === "cyclone") || replay.id?.includes("cyclone");
  const isHeat = (replay.hazard_type === "heatwave") || replay.id?.includes("heat");

  const handleClick = (event: React.MouseEvent<SVGSVGElement>) => {
    const rect = (event.currentTarget as SVGSVGElement).getBoundingClientRect();
    const px = ((event.clientX - rect.left) / rect.width) * 860;
    const py = ((event.clientY - rect.top) / rect.height) * 570;
    const lon = west + ((px - 58) / 744) * (east - west);
    const lat = north - ((py - 36) / 485) * (north - south);
    if (Number.isFinite(lat) && Number.isFinite(lon)) {
      onPick(Math.round(Math.max(south, Math.min(north, lat)) * 100) / 100, Math.round(Math.max(west, Math.min(east, lon)) * 100) / 100);
    }
  };
  return (
    <div className={styles.mapWrap}>
      <svg viewBox="0 0 860 570" role="img" onClick={handleClick} style={{ cursor: "crosshair" }} aria-label="Forecast spatial map with detected forecast footprints. Click to inspect a location.">
        <rect x="58" y="36" width="744" height="485" rx="4" fill="#0f0f13" />
        {forecastGrid.map((row, r) => row.map((value, c) => (
          <rect key={`${r}-${c}`} x={x(longitudes[c]) - cellW / 2} y={y(latitudes[r]) - cellH / 2}
            width={cellW} height={cellH} fill={fieldColor(value, replay.hazard_type)} opacity="0.95" />
        )))}
        {lonSteps.map((lon) => <g key={lon}><line x1={x(lon)} x2={x(lon)} y1="36" y2="521" stroke="#60766e" strokeOpacity=".27" strokeDasharray="3 5"/><text x={x(lon)} y="547" textAnchor="middle">{lon}°E</text></g>)}
        {latSteps.map((lat) => <g key={lat}><line x1="58" x2="802" y1={y(lat)} y2={y(lat)} stroke="#60766e" strokeOpacity=".27" strokeDasharray="3 5"/><text x="40" y={y(lat) + 4} textAnchor="end">{lat}°N</text></g>)}
        {trail.length > 1 && <polyline points={trail.map((object) => `${x(object.centroid[1])},${y(object.centroid[0])}`).join(" ")} fill="none" stroke="#ffb4c8" strokeWidth="2" strokeDasharray="5 5" />}
        {legs.flatMap((leg) => leg.steps).map((step, i) => (
          <g key={`leg-${i}`}>
            <circle cx={x(step.lon)} cy={y(step.lat)} r={i === 0 ? 9 : 7} fill="none" stroke={i === 0 ? "#c08a2d" : i === 1 ? "#c25e2e" : "#b0322c"} strokeWidth="2" strokeDasharray="4 3" opacity="0.9" />
            <text x={x(step.lon) + 12} y={y(step.lat) - 8}>T+{step.lead_hours}h</text>
          </g>
        ))}
        {legs.length > 0 && (
          <polyline
            points={[{ lat: legs[0].current.lat, lon: legs[0].current.lon }, ...legs[0].steps].map((p) => `${x(p.lon)},${y(p.lat)}`).join(" ")}
            fill="none" stroke="#7a4a1f" strokeWidth="2" />
        )}
        {selected.map((object, index) => <g key={object.track_id ?? index}>
          <rect x={x(object.bbox[1])} y={y(object.bbox[2])} width={Math.max(10, x(object.bbox[3]) - x(object.bbox[1]))} height={Math.max(10, y(object.bbox[0]) - y(object.bbox[2]))} fill="none" stroke="#ffb4c8" strokeWidth="2" strokeDasharray="5 4" />
          <circle cx={x(object.centroid[1])} cy={y(object.centroid[0])} r="6" fill="#ffb4c8" stroke="white" strokeWidth="2" />
        </g>)}
        {peakLoc && (
          <>
            <circle cx={x(peakLoc[1])} cy={y(peakLoc[0])} r="11" fill="none" stroke="#bb5031" strokeWidth="2" />
            <line x1={x(peakLoc[1])-15} x2={x(peakLoc[1])+15} y1={y(peakLoc[0])} y2={y(peakLoc[0])} stroke="#bb5031" strokeWidth="2" />
            <line x1={x(peakLoc[1])} x2={x(peakLoc[1])} y1={y(peakLoc[0])-15} y2={y(peakLoc[0])+15} stroke="#bb5031" strokeWidth="2" />
          </>
        )}
        {picked && (
          <g>
            <circle cx={x(picked.lon)} cy={y(picked.lat)} r="10" fill="#ffb4c8" stroke="white" strokeWidth="3" />
            <text x={x(picked.lon) + 14} y={y(picked.lat) + 4} fontWeight="bold">📍 {picked.lat.toFixed(2)}N {picked.lon.toFixed(2)}E</text>
          </g>
        )}
      </svg>
      <div className={styles.mapKey}>
        <span>
          <i className={styles.ramp} />{" "}
          {isCyclone ? "Sustained wind · km/h" : isHeat ? "Max temperature · °C" : "Forecast rainfall · mm / 24h"}
        </span>
        <span><i className={styles.observedKey} /> Observed peak / landfall</span>
        <span><i className={styles.trackKey} /> Selected forecast object</span>
        <span>🟡 T+24 · 🟠 T+48 · 🔴 T+72 predicted legs</span>
        <span>Click the map to inspect a location</span>
      </div>
    </div>
  );
}

export function LocationInspector({ replay, picked }: { replay: ReplayCase; picked: { lat: number; lon: number } | null }) {
  const isCyclone = (replay.hazard_type === "cyclone") || replay.id?.includes("cyclone");
  const isHeat = (replay.hazard_type === "heatwave") || replay.id?.includes("heat");

  const info = useMemo(() => {
    if (!picked) return null;
    const grid = nearestGridValue(replay, picked.lat, picked.lon);
    const baseline = isHeat ? 40.0 : isCyclone ? 50.0 : 18.0;
    const sigma = Math.round(((grid.rainfall - baseline) / (baseline * 0.5)) * 100) / 100;
    const { score, band } = riskScore({ rain: sigma, percentile: Math.min(99.9, 50 + Math.abs(sigma) * 8) });
    return { grid, sigma, score, band, impacts: impactsFor(grid.rainfall, band), place: nearestPlace(picked.lat, picked.lon) };
  }, [replay, picked, isHeat, isCyclone]);

  if (!info || !picked) {
    return (
      <section className={styles.sideCard} id="inspector">
        <div className={styles.eyebrow}>05 / LOCATION INSPECTOR</div>
        <h2>What happens here?</h2>
        <p className={styles.muted}>Click anywhere on the forecast map to get a pinpoint briefing: normal vs forecast values, anomaly σ, risk band, impacts and timing.</p>
        <p className={styles.muted}>
          {isCyclone
            ? "Try: Kolkata (22.57, 88.36) · Digha (21.62, 87.51) · Sundarbans (21.94, 88.90)."
            : isHeat
            ? "Try: Delhi (28.61, 77.21) · Phalodi (27.13, 72.36) · Churu (28.29, 74.96)."
            : "Try: Faridabad (28.40, 77.31) · Noida (28.53, 77.39) · Delhi (28.61, 77.21)."}
        </p>
      </section>
    );
  }
  return (
    <section className={styles.sideCard} id="inspector">
      <div className={styles.eyebrow}>05 / LOCATION INSPECTOR</div>
      <div className={styles.disposition}><MapPin size={20} /><strong>📍 {info.place}</strong></div>
      <p>{picked.lat.toFixed(2)}°N, {picked.lon.toFixed(2)}°E · nearest grid {info.grid.gridLat.toFixed(2)}N {info.grid.gridLon.toFixed(2)}E</p>
      <p>
        {isCyclone
          ? `Wind: Sustained speed ${info.grid.rainfall.toFixed(1)} km/h`
          : isHeat
          ? `Temperature: Forecast max ${info.grid.rainfall.toFixed(1)} °C`
          : `Rainfall: Normal 18 mm · Forecast ${info.grid.rainfall.toFixed(1)} mm`}
      </p>
      <p>Anomaly: {info.sigma >= 0 ? "+" : ""}{info.sigma.toFixed(1)}σ · Risk: {riskEmoji(info.band)} {info.band} ({info.score})</p>
      <p>Expected: {info.impacts.join(" · ")}</p>
      <p>Time: next 12–18 hours · Risk radius ~5 km · Draft only</p>
      <a href={`/api/forecast?lat=${picked.lat}&lon=${picked.lon}`} target="_blank" rel="noreferrer">Open GET /forecast JSON <ArrowUpRight size={14} /></a>
    </section>
  );
}

export function TrajectoryPanel({ replay }: { replay: ReplayCase }) {
  const legs = useMemo(() => replayTrackLegs(replay), [replay]);
  if (!legs.length) return null;
  return (
    <section className={styles.lower} id="trajectory">
      <div className={styles.lowerHead}><div><div className={styles.eyebrow}>06 / EVENT TRACKING · T+24 / T+48 / T+72</div><h2>Where is the anomaly moving?</h2></div><span>Kalman-linked footprints + extrapolated legs · 4D bbox per event</span></div>
      <div className={styles.evidenceGrid}>
        {legs.map((leg) => (
          <article key={leg.event_id}>
            <span className={styles.evidenceIcon}><Navigation size={18} /></span>
            <h3>{leg.event_id} · peak {leg.peak.toFixed(1)} mm/3h</h3>
            <p>Now: {leg.current.lat.toFixed(2)}N {leg.current.lon.toFixed(2)}E · bbox S {leg.bbox[0].toFixed(1)} W {leg.bbox[1].toFixed(1)} N {leg.bbox[2].toFixed(1)} E {leg.bbox[3].toFixed(1)}</p>
            {leg.steps.map((s, i) => (
              <p key={s.lead_hours}>{i === 0 ? "🟡" : i === 1 ? "🟠" : "🔴"} T+{s.lead_hours}h → {s.lat.toFixed(2)}N {s.lon.toFixed(2)}E · ±{s.uncertainty_radius_km.toFixed(0)} km</p>
            ))}
          </article>
        ))}
      </div>
      <p className={styles.benchmarkNote}>Legs extrapolate detected-footprint velocity with linearly growing uncertainty. They track the anomaly — they do not predict new weather. <a href="/api/events" target="_blank" rel="noreferrer">View /api/events <ArrowUpRight size={12} /></a></p>
    </section>
  );
}

export function RiskPanel({ replay, onSelect }: { replay: ReplayCase; onSelect: (lat: number, lon: number) => void }) {
  const rows = useMemo(() => regionRiskRows(replay), [replay]);
  return (
    <section className={styles.lower} id="risk">
      <div className={styles.lowerHead}><div><div className={styles.eyebrow}>07 / RISK MAP · 0–100</div><h2>Categorized spatial alerts</h2></div><span>LOW 0–30 · MODERATE 30–60 · HIGH 60–80 · SEVERE 80–100 · ~5 km radius (provisional)</span></div>
      <div style={{ paddingTop: 20 }}>
      <RiskIndia3D replay={replay} onSelect={onSelect} />
      </div>
      <div className={styles.riskTableCard}>
      <div className={styles.benchmarkScroll}>
        <table className={styles.riskTable}>
          <thead><tr><th>Region</th><th>Forecast (mm/day)</th><th>Anomaly (σ)</th><th>Risk (0–100)</th><th>Band</th></tr></thead>
          <tbody>
            {rows.map((r) => {
              const color = r.band === "SEVERE" ? "#c03a2b" : r.band === "HIGH" ? "#dd6f2d" : r.band === "MODERATE" ? "#d9a521" : "#43a854";
              return (
                <tr key={r.name}>
                  <td><span className={styles.riskRegionCell}><span className={styles.riskDot} style={{ background: color, color }} />{r.name}</span></td>
                  <td>{r.rainfall.toFixed(1)}</td>
                  <td>{r.sigma >= 0 ? "+" : ""}{r.sigma.toFixed(1)}</td>
                  <td>{r.score}</td>
                  <td><span className={styles.bandPill} data-band={r.band}>{r.band}</span></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      </div>
      <p className={styles.benchmarkNote}>Risk = rainfall + wind + temperature + historical extremeness + forecast uncertainty. Draft decision support — <a href="/api/risk-regions" target="_blank" rel="noreferrer">view /api/risk-regions <ArrowUpRight size={12} /></a></p>
    </section>
  );
}

export function DownscalePanel() {
  return (
    <section className={styles.lower} id="downscaling">
      <div className={styles.lowerHead}><div><div className={styles.eyebrow}>08 / HYPER-LOCAL 12 KM → 5 KM</div><h2>Progressive downscaling</h2></div><span>V1 live · V2 experimental · Diffusion architecture-only</span></div>
      <div className={styles.evidenceGrid}>
        <article><span className={styles.evidenceIcon}><Layers3 size={18} /></span><h3>V1 · Interpolation (live)</h3><p>12 km grid → bilinear → ~5 km. Transparent baseline, preserves means but smooths convective peaks. Used for all map overlays.</p></article>
        <article><span className={styles.evidenceIcon}><Radar size={18} /></span><h3>V2 · Residual CNN (experimental)</h3><p>Deterministic super-resolution trained on IMD coarse proxies. Improves held-out peaks/recall but worsens MAE/false alarms — not deployed.</p></article>
        <article><span className={styles.evidenceIcon}><Sparkles size={18} /></span><h3>Advanced · Diffusion (research)</h3><p>Conditional DDPM preserves high-amplitude tails where CNNs smooth them. Architecture + tests exist; no trained weights or 5 km skill yet.</p></article>
      </div>
      <p className={styles.benchmarkNote}><a href="/api/downscaling" target="_blank" rel="noreferrer">View /api/downscaling tier comparison <ArrowUpRight size={12} /></a></p>
    </section>
  );
}

export function AskPanel({ picked }: { picked: { lat: number; lon: number } | null }) {
  const [lat, setLat] = useState("28.53");
  const [lon, setLon] = useState("77.39");
  const [answer, setAnswer] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const ask = async (aLat: string, aLon: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/what-happens-here?lat=${encodeURIComponent(aLat)}&lon=${encodeURIComponent(aLon)}`);
      const data = await res.json();
      setAnswer(data.narrative ?? JSON.stringify(data));
    } catch {
      setAnswer("Could not reach the explainer API.");
    } finally {
      setLoading(false);
    }
  };
  return (
    <section className={styles.lower} id="ask">
      <div className={styles.lowerHead}><div><div className={styles.eyebrow}>09 / WHAT HAPPENS HERE?</div><h2>Plain-language briefing</h2></div><span>GET /api/what-happens-here?lat & lon</span></div>
      <p className={styles.muted}>Ask about your area in numbers you can act on — expected rainfall, window, impacts, radius and confidence.</p>
      <div className={styles.askRow}>
        <label>Lat <input value={lat} onChange={(e) => setLat(e.target.value)} inputMode="decimal" aria-label="Latitude" /></label>
        <label>Lon <input value={lon} onChange={(e) => setLon(e.target.value)} inputMode="decimal" aria-label="Longitude" /></label>
        <button onClick={() => ask(lat, lon)} disabled={loading}>{loading ? "Briefing…" : "What will happen here?"}</button>
        <button className={styles.ghostBtn} onClick={() => { setLat("28.40"); setLon("77.31"); ask("28.40", "77.31"); }}>Faridabad</button>
        <button className={styles.ghostBtn} onClick={() => { setLat("28.53"); setLon("77.39"); ask("28.53", "77.39"); }}>Noida</button>
        {picked && <button className={styles.ghostBtn} onClick={() => { setLat(String(picked.lat)); setLon(String(picked.lon)); ask(String(picked.lat), String(picked.lon)); }}>Use map pin 📍</button>}
      </div>
      {answer && <p className={styles.askAnswer}>📍 {answer}</p>}
      <p className={styles.benchmarkNote}>Example: Noida → extreme rainfall 145–175 mm in 8–14 h, urban flooding, ~5 km radius, 81% uncalibrated confidence. Draft only.</p>
    </section>
  );
}

export function ValidationSection({ replay, benchmark }: { replay: ReplayCase; benchmark: BenchmarkReport }) {
  const v = replay.verification;
  return (
    <section className={styles.lower} id="validation"><div className={styles.lowerHead}><div><div className={styles.eyebrow}>04 / EVIDENCE & LIMITS</div><h2>What the numbers say</h2></div><span>Retrospective verification · {v.sampled_grid_cells.toLocaleString()} valid IMD cells</span></div><div className={styles.evidenceGrid}><article><span className={styles.evidenceIcon}><ArrowDownRight size={18}/></span><h3>Mismatch matters</h3><p>The forecast peak is {v.forecast_peak_mm_day} mm/day; IMD reports {v.observed_peak_mm_day} mm/day. The heavy-rain footprints do not overlap at this threshold.</p></article><article><span className={styles.evidenceIcon}><Layers3 size={18}/></span><h3>Resolution is explicit</h3><p>GEFS is 0.5°; IMD observations are 0.25°. No 5 km forecast, diffusion output, or calibrated local impact zone is claimed here.</p></article><article><span className={styles.evidenceIcon}><MapPin size={18}/></span><h3>Trace every point</h3><p>Five archived GEFS members and the IMD daily grid feed this replay. Each frame carries a valid time, lead hour, and track footprint.</p></article></div>{replay.independent_verification && replay.independent_observation && <div className={styles.crossCheck}><div><div className={styles.eyebrow}>INDEPENDENT OBSERVATION CHECK</div><h3>Two grids, one missed event.</h3><p>CHIRPS v2 offers a separate 0.05° daily rainfall estimate. Its peak differs sharply from IMD; neither observation supports a successful heavy-rain forecast in this case.</p><p className={styles.crossCaveat}>CHIRPS is not gauge truth or a 5 km forecast target. Daily timing and extreme magnitudes require caution.</p></div><div className={styles.crossStats}><div><span>GEFS forecast peak</span><strong>{replay.independent_verification.forecast_peak_mm_day}<small> mm/day</small></strong></div><div><span>CHIRPS estimate peak</span><strong>{replay.independent_verification.chirps_peak_mm_day}<small> mm/day</small></strong></div><div><span>Heavy-rain overlap</span><strong>{Math.round((replay.independent_verification.heavy_rain_iou ?? 0) * 100)}<small>%</small></strong></div><a href={replay.independent_observation.source_url} target="_blank" rel="noreferrer">View CHIRPS source <ArrowUpRight size={13}/></a></div></div>}<div className={styles.benchmark}><div><div className={styles.eyebrow}>SEPARATE MODEL EXPERIMENT</div><h3>Residual CNN vs. bilinear</h3><p>IMD 0.25° target-centered crops, smoothed into a coarse proxy. {benchmark.validation.validation_samples} held-out dates from {benchmark.validation.first_validation_date}; no independent NWP and no 5 km ground truth.</p></div><div className={styles.benchmarkScroll}><table><thead><tr><th>Validation metric</th><th>Residual CNN</th><th>Bilinear</th></tr></thead><tbody><tr><td>Peak absolute error ↓</td><td>{benchmark.validation.residual_cnn.mean_peak_absolute_error_mm_day} mm</td><td>{benchmark.validation.bilinear.mean_peak_absolute_error_mm_day} mm</td></tr><tr><td>Heavy-rain recall ↑</td><td>{Math.round(benchmark.validation.residual_cnn.heavy_rain_detection_recall * 100)}%</td><td>{Math.round(benchmark.validation.bilinear.heavy_rain_detection_recall * 100)}%</td></tr><tr><td>Footprint overlap ↑</td><td>{Math.round(benchmark.validation.residual_cnn.heavy_rain_footprint_iou * 100)}%</td><td>{Math.round(benchmark.validation.bilinear.heavy_rain_footprint_iou * 100)}%</td></tr><tr><td>Overall MAE ↓</td><td>{benchmark.validation.residual_cnn.mean_absolute_error_mm_day} mm</td><td>{benchmark.validation.bilinear.mean_absolute_error_mm_day} mm</td></tr><tr><td>False-alarm ratio ↓</td><td>{Math.round(benchmark.validation.residual_cnn.heavy_rain_false_alarm_ratio * 100)}%</td><td>{Math.round(benchmark.validation.bilinear.heavy_rain_false_alarm_ratio * 100)}%</td></tr></tbody></table></div></div><p className={styles.benchmarkNote}>The CNN improves peak and overlap metrics but worsens overall error and false alarms. It is not promoted to the historical forecast pipeline. <a href="/api/benchmark" target="_blank" rel="noreferrer">View full benchmark <ArrowUpRight size={12}/></a></p></section>
  );
}

export function DemoSection() {
  const selectedDemo = MOCK_THREATS[0];
  return (
    <section className={styles.demoPanel}><div className={styles.demoBanner}><FlaskConical size={19}/><div><strong>Synthetic prototype mode</strong><span>Everything below is hand-authored demo data. It is not a forecast, observation, or validated warning.</span></div></div><div className={styles.demoHeading}><div className={styles.eyebrow}>DESIGN CONCEPT / SYNTHETIC</div><h2>Explore the original threat objects</h2><p>These examples are retained to demonstrate future interface concepts only.</p></div><div className={styles.demoGrid}>{MOCK_THREATS.map((threat) => <article key={threat.id}><span>FICTIONAL · {threat.hazard_type.replaceAll("_", " ")}</span><h3>{threat.name}</h3><div className={styles.demoStat}>{threat.intensity_current}<small> {threat.intensity_unit}</small></div><p>{threat.centroid.lat.toFixed(1)}°N, {threat.centroid.lon.toFixed(1)}°E · synthetic centroid</p></article>)}</div><p className={styles.demoFoot}>The legacy dashboard referenced 5 km downscaling, physical verification, and CAP alerts without empirical support. Those claims are intentionally excluded from this research interface. Example: {selectedDemo.id}.</p></section>
  );
}

export default function ReplayDashboard({ replay, benchmark }: { replay: ReplayCase; benchmark: BenchmarkReport }) {
  const [mode, setMode] = useState<Mode>("historical");
  const [frameIndex, setFrameIndex] = useState(replay.frames.length - 1);
  const [picked, setPicked] = useState<{ lat: number; lon: number } | null>({ lat: 28.4, lon: 77.31 });
  const v = replay.verification;
  return <div className={styles.shell}>
    <aside className={styles.rail}>
      <a href="/dashboard" className={styles.logo} aria-label="Avarta home"><span className={styles.logoMark}>a</span><span>avarta<span className={styles.logoDot}>.</span></span></a>
      <p className={styles.railLabel}>WORKSPACE</p>
      <nav className={styles.nav}><a className={styles.navActive} href="/dashboard"><Layers3 size={17}/> Overview</a><a href="#case"><CloudRain size={17}/> Case study</a><a href="#validation"><FlaskConical size={17}/> Validation</a><a href="#alerts"><ShieldAlert size={17}/> Alert policy</a><a href="#inspector"><MapPin size={17}/> Inspector</a><a href="#trajectory"><Navigation size={17}/> Trajectory</a><a href="#risk"><Thermometer size={17}/> Risk map</a><a href="#ask"><Sparkles size={17}/> Ask</a></nav>
      <div className={styles.railBottom}><span className={styles.railPulse}/><span>Research prototype<br/><small>SIH 26078 · Not operational</small></span></div>
    </aside>
    <div className={styles.content}>
      <header className={styles.topbar}><div className={styles.breadcrumb}>Avarta <ChevronRight size={13}/> Weather intelligence <ChevronRight size={13}/> <strong>Overview</strong></div><div className={styles.topRight}>{mode === "historical" && <span className={styles.topDate}><CalendarDays size={14}/> 23 August 2025</span>}<span className={styles.status}>{mode === "historical" ? "HISTORICAL REPLAY" : "SYNTHETIC DEMO"}</span></div></header>
      <main className={styles.main}>
        <div className={styles.heading}><div><div className={styles.eyebrow}>WEATHER INTELLIGENCE / 001</div><h1>Rainfall, in context.</h1><p>A traceable forecast replay for northwest India. See what the ensemble predicted, what IMD observed, and where the two diverged.</p></div><a className={styles.export} href="/api/cases" target="_blank" rel="noreferrer"><Download size={15}/> Export case JSON</a></div>
        <div className={styles.modeBar} role="tablist" aria-label="Data mode"><button role="tab" aria-selected={mode === "historical"} className={mode === "historical" ? styles.modeActive : ""} onClick={() => setMode("historical")}>Historical evidence <span>01</span></button><button role="tab" aria-selected={mode === "demo"} className={mode === "demo" ? styles.modeActive : ""} onClick={() => setMode("demo")}>Prototype demo <span>03</span></button><span className={styles.modeNote}>{mode === "historical" ? "NOAA GEFS + IMD · real archived data" : "Synthetic examples · not real forecasts"}</span></div>
        {mode === "historical" ? <>
          <section className={styles.metrics} aria-label="Case metrics"><div className={styles.metric}><span className={styles.metricLabel}>FORECAST PEAK</span><strong>{v.forecast_peak_mm_day}<small> mm</small></strong><span className={styles.metricFoot}>GEFS ensemble mean · 24h</span></div><div className={styles.metric}><span className={styles.metricLabel}>OBSERVED PEAK</span><strong>{v.observed_peak_mm_day}<small> mm</small></strong><span className={styles.metricFoot}>IMD 0.25° daily grid</span></div><div className={`${styles.metric} ${styles.metricWarning}`}><span className={styles.metricLabel}>PEAK ERROR <ArrowUpRight size={14}/></span><strong>{v.peak_absolute_error_mm_day}<small> mm</small></strong><span className={styles.metricFoot}>Forecast missed this extreme</span></div><div className={styles.metric}><span className={styles.metricLabel}>HEAVY-RAIN OVERLAP</span><strong>{Math.round((v.heavy_rain_iou ?? 0) * 100)}<small>%</small></strong><span className={styles.metricFoot}>≥{v.heavy_rain_threshold_mm_day} mm/day footprint</span></div></section>
          <div className={styles.workspace} id="case"><section className={styles.mapCard}><div className={styles.panelHead}><div><div className={styles.eyebrow}>01 / SPATIAL REPLAY</div><h2>Northwest India</h2><p>Ensemble mean rainfall overlaid with detected forecast objects</p></div><span className={styles.pill}>0.5° forecast grid</span></div><ForecastMap replay={replay} frameIndex={frameIndex} picked={picked} onPick={(lat, lon) => setPicked({ lat, lon })} /><div className={styles.mapFooter}><span>Source: NOAA GEFS · initialized {time(replay.forecast.initialization_time)} UTC</span><span>Observation: IMD · {replay.observation.date}</span></div></section>
          <aside className={styles.sideStack}><section className={styles.sideCard}><div className={styles.eyebrow}>02 / FORECAST TIMELINE</div><h2>Track evolution</h2><p className={styles.muted}>Select a three-hour forecast step to inspect detected footprints.</p><div className={styles.timeline}>{replay.frames.map((step, index) => <button key={step.lead_hour} className={index === frameIndex ? styles.timeActive : ""} onClick={() => setFrameIndex(index)}><span className={styles.timeDot}/><span><strong>+{step.lead_hour}h</strong><small>{time(step.valid_time)} UTC</small></span><b>{step.objects.length} {step.objects.length === 1 ? "object" : "objects"}</b></button>)}</div></section><LocationInspector replay={replay} picked={picked} /><section className={styles.sideCard} id="alerts"><div className={styles.eyebrow}>03 / ALERT DISPOSITION</div><div className={styles.disposition}><ShieldAlert size={20}/><strong>No public alert</strong></div><p>Peak ensemble-mean rainfall stays below the provisional {v.heavy_rain_threshold_mm_day} mm/day threshold. A forecast miss is evident in hindsight; this case must not generate a precise warning claim.</p><a href="/api/alerts" target="_blank" rel="noreferrer">View draft API response <ArrowUpRight size={14}/></a><br/><a href={picked ? `/api/forecast?lat=${picked.lat}&lon=${picked.lon}` : "/api/forecast?lat=28.40&lon=77.31"} target="_blank" rel="noreferrer">View pinpoint GET /forecast <ArrowUpRight size={14}/></a></section></aside></div>
          <TrajectoryPanel replay={replay} />
          <RiskPanel replay={replay} onSelect={(lat, lon) => setPicked({ lat, lon })} />
          <DownscalePanel />
          <AskPanel picked={picked} />
                    <ValidationSection replay={replay} benchmark={benchmark} />
          <footer className={styles.footer}><span>AVARTA / RESEARCH PROTOTYPE</span><span>Forecast window {time(replay.forecast.window_utc[0])} – {time(replay.forecast.window_utc[1])} UTC · {replay.forecast.members.length} members</span></footer>
        </> : <DemoSection />}
      </main>
    </div>
  </div>;
}
