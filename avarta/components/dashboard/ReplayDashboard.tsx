"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { AlertTriangle, ArrowDownRight, ArrowUpRight, Box, Building2, CalendarDays, CheckCircle2, ChevronRight, CircleDot, Clock3, CloudRain, Download, Droplets, FlaskConical, Gauge, Layers3, MapPin, Navigation, Radar, Route, Satellite, ShieldAlert, Sparkles, Search, RefreshCw, ChevronUp, ChevronDown, Umbrella, Waves } from "lucide-react";
import type { BenchmarkReport, ReplayCase } from "@/lib/replay";
import { BRIEFING_REGIONS, impactsFor, nearestPlace, regionRiskRows, replayTrackLegs, riskScore, type RegionRiskRow } from "@/lib/forecast";
import RiskIndia3D from "@/components/dashboard/RiskIndia3D";
import { MOCK_THREATS } from "@/lib/mock-weather-data";
import styles from "./replay.module.css";

type Mode = "historical" | "demo";

interface LiveRiskRegion {
  name: string;
  state?: string;
  zone?: string;
  latitude: number;
  longitude: number;
  rain_sum_24h_mm?: number;
  rainfall_mm?: number;
  anomaly_sigma?: number;
  score: number;
  band: string;
  hazard_alert?: string;
  temperature_c?: number;
  max_temp_c?: number;
  wind_gust_kmh?: number;
}

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
  const [selectedTrack, setSelectedTrack] = useState(0);
  const [selectedLead, setSelectedLead] = useState(24);

  if (!legs.length) {
    return (
      <section className={styles.trajectoryEmpty}>
        <Radar size={28} />
        <div><strong>No linked event track in this replay frame</strong><span>The tracker needs at least one detected footprint before a trajectory can be extrapolated.</span></div>
      </section>
    );
  }

  const leg = legs[Math.min(selectedTrack, legs.length - 1)];
  const activeStep = selectedLead === 0 ? null : leg.steps.find((step) => step.lead_hours === selectedLead) ?? leg.steps[0];
  const activePoint = activeStep ?? leg.current;
  const sourcePoints = [...leg.history, leg.current, ...leg.steps];
  const latMin = Math.min(...sourcePoints.map((point) => point.lat)) - 1.2;
  const latMax = Math.max(...sourcePoints.map((point) => point.lat)) + 1.2;
  const lonMin = Math.min(...sourcePoints.map((point) => point.lon)) - 1.2;
  const lonMax = Math.max(...sourcePoints.map((point) => point.lon)) + 1.2;
  const x = (lon: number) => 60 + ((lon - lonMin) / Math.max(0.1, lonMax - lonMin)) * 780;
  const y = (lat: number) => 42 + ((latMax - lat) / Math.max(0.1, latMax - latMin)) * 416;
  const frameGapHours = Math.max(1, (replay.frames.at(-1)?.lead_hour ?? 3) - (replay.frames.at(-2)?.lead_hour ?? 0));
  const northKmh = leg.velocity_degrees_per_3h.lat * 111 / frameGapHours;
  const eastKmh = leg.velocity_degrees_per_3h.lon * 111 * Math.cos(leg.current.lat * Math.PI / 180) / frameGapHours;
  const speedKmh = Math.hypot(northKmh, eastKmh);
  const bearing = (Math.atan2(eastKmh, northKmh) * 180 / Math.PI + 360) % 360;
  const directions = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  const direction = directions[Math.round(bearing / 45) % 8];
  const peakUnit = replay.hazard_type === "cyclone" ? "km/h" : replay.hazard_type === "heatwave" ? "°C" : "mm/3h";
  const bboxWidthKm = Math.abs(leg.bbox[3] - leg.bbox[1]) * 111 * Math.cos(leg.current.lat * Math.PI / 180);
  const bboxHeightKm = Math.abs(leg.bbox[2] - leg.bbox[0]) * 111;
  const selectedUncertainty = activeStep?.uncertainty_radius_km ?? 0;
  const uncertaintyPixels = Math.max(0, selectedUncertainty / 111 / Math.max(0.1, lonMax - lonMin) * 780);
  const colorForLead = (lead: number) => lead === 24 ? "#facc15" : lead === 48 ? "#fb923c" : lead === 72 ? "#f43f5e" : "#ffb4c8";

  return (
    <div className={styles.trajectorySuite} id="trajectory">
      <section className={styles.trajectoryHero}>
        <div>
          <div className={styles.eyebrow}>KINEMATIC TRACK OPERATIONS</div>
          <h2>Event trajectory command view</h2>
          <p>Inspect linked footprint history, motion vectors, future centroids, uncertainty growth and the active 4D bounding box from one auditable surface.</p>
        </div>
        <div className={styles.trajectoryTruth}><CircleDot size={14} /><span>TRACK EXTRAPOLATION</span><strong>NOT A NEW WEATHER FORECAST</strong></div>
      </section>

      <div className={styles.trackSelector} aria-label="Tracked events">
        {legs.map((candidate, index) => (
          <button key={candidate.event_id} className={index === selectedTrack ? styles.trackSelectorActive : ""} onClick={() => setSelectedTrack(index)}>
            <span>{String(index + 1).padStart(2, "0")}</span>
            <strong>{candidate.event_id}</strong>
            <small>{candidate.peak.toFixed(1)} {peakUnit}</small>
          </button>
        ))}
      </div>

      <section className={styles.trajectoryMetrics} aria-label="Track summary">
        <article><span><Satellite size={14} /> TRACKS LINKED</span><strong>{legs.length}</strong><small>{leg.history.length} measured positions on selected track</small></article>
        <article><span><Gauge size={14} /> MOTION SPEED</span><strong>{speedKmh.toFixed(1)} <em>km/h</em></strong><small>{direction} · bearing {bearing.toFixed(0)}°</small></article>
        <article><span><Box size={14} /> CURRENT FOOTPRINT</span><strong>{bboxWidthKm.toFixed(0)} × {bboxHeightKm.toFixed(0)} <em>km</em></strong><small>{leg.bbox[0].toFixed(1)}–{leg.bbox[2].toFixed(1)}°N</small></article>
        <article><span><Radar size={14} /> T+72 UNCERTAINTY</span><strong>±{leg.steps.at(-1)?.uncertainty_radius_km.toFixed(0)} <em>km</em></strong><small>linear lead-time growth</small></article>
      </section>

      <section className={styles.trajectoryWorkspace}>
        <div className={styles.trajectoryMapCard}>
          <div className={styles.trajectoryMapHead}>
            <div><span>SPATIAL TRACK CANVAS</span><strong>{leg.event_id}</strong></div>
            <div className={styles.leadControls}>
              {[0, 24, 48, 72].map((lead) => <button key={lead} className={selectedLead === lead ? styles.leadControlActive : ""} onClick={() => setSelectedLead(lead)}>{lead === 0 ? "NOW" : `T+${lead}`}</button>)}
            </div>
          </div>
          <div className={styles.trajectoryCanvas}>
            <svg viewBox="0 0 900 500" role="img" aria-label={`Track map for ${leg.event_id} at ${selectedLead ? `T plus ${selectedLead} hours` : "the current position"}`}>
              <defs>
                <radialGradient id="trackGlow"><stop offset="0" stopColor="#ffb4c8" stopOpacity=".18"/><stop offset="1" stopColor="#ffb4c8" stopOpacity="0"/></radialGradient>
                <marker id="trackArrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L0,6 L7,3 z" fill="#ffb4c8"/></marker>
              </defs>
              <rect width="900" height="500" rx="18" fill="#08080b" />
              <circle cx={x(activePoint.lon)} cy={y(activePoint.lat)} r="150" fill="url(#trackGlow)" />
              {[1,2,3,4,5].map((index) => <line key={`v${index}`} x1={index * 150} x2={index * 150} y1="25" y2="470" stroke="rgba(255,255,255,.07)" strokeDasharray="3 7"/>)}
              {[1,2,3,4].map((index) => <line key={`h${index}`} x1="35" x2="865" y1={index * 100} y2={index * 100} stroke="rgba(255,255,255,.07)" strokeDasharray="3 7"/>)}
              {leg.history.length > 1 && <polyline points={leg.history.map((point) => `${x(point.lon)},${y(point.lat)}`).join(" ")} fill="none" stroke="#38bdf8" strokeWidth="3" opacity=".7" />}
              <polyline points={[leg.current, ...leg.steps].map((point) => `${x(point.lon)},${y(point.lat)}`).join(" ")} fill="none" stroke="#ffb4c8" strokeWidth="3" strokeDasharray="8 7" markerEnd="url(#trackArrow)" />
              <rect x={x(leg.bbox[1])} y={y(leg.bbox[2])} width={Math.max(8, x(leg.bbox[3]) - x(leg.bbox[1]))} height={Math.max(8, y(leg.bbox[0]) - y(leg.bbox[2]))} fill="rgba(255,180,200,.08)" stroke="#ffb4c8" strokeWidth="2" strokeDasharray="5 4" />
              {leg.history.map((point, index) => <circle key={`history-${index}`} cx={x(point.lon)} cy={y(point.lat)} r="5" fill="#38bdf8" stroke="#08080b" strokeWidth="2" />)}
              <circle cx={x(leg.current.lon)} cy={y(leg.current.lat)} r="9" fill="#ffb4c8" stroke="white" strokeWidth="3" />
              <text x={x(leg.current.lon) + 14} y={y(leg.current.lat) - 12} fill="white">NOW · {leg.current.lat.toFixed(2)}N {leg.current.lon.toFixed(2)}E</text>
              {leg.steps.map((step) => {
                const isActive = selectedLead === step.lead_hours;
                const radius = step.uncertainty_radius_km / 111 / Math.max(0.1, lonMax - lonMin) * 780;
                return <g key={step.lead_hours} opacity={selectedLead === 0 || isActive ? 1 : .48}>
                  <circle cx={x(step.lon)} cy={y(step.lat)} r={Math.max(12, radius)} fill={`${colorForLead(step.lead_hours)}12`} stroke={colorForLead(step.lead_hours)} strokeWidth={isActive ? 3 : 1.5} strokeDasharray="5 5" />
                  <circle cx={x(step.lon)} cy={y(step.lat)} r={isActive ? 8 : 5} fill={colorForLead(step.lead_hours)} />
                  <text x={x(step.lon) + 11} y={y(step.lat) - 9} fill={colorForLead(step.lead_hours)}>T+{step.lead_hours} · ±{step.uncertainty_radius_km.toFixed(0)} km</text>
                </g>;
              })}
              {activeStep && <circle cx={x(activeStep.lon)} cy={y(activeStep.lat)} r={Math.max(15, uncertaintyPixels)} fill="none" stroke="white" strokeWidth="1" opacity=".35" />}
              <text x="42" y="482" fill="#71717a">{lonMin.toFixed(1)}°E</text><text x="815" y="482" fill="#71717a">{lonMax.toFixed(1)}°E</text>
              <text x="15" y="45" fill="#71717a">{latMax.toFixed(1)}°N</text><text x="15" y="460" fill="#71717a">{latMin.toFixed(1)}°N</text>
            </svg>
          </div>
          <div className={styles.trajectoryLegend}><span><i className={styles.historyLegend}/>Measured centroids</span><span><i className={styles.projectedLegend}/>Kinematic extrapolation</span><span><i className={styles.bboxLegend}/>Current footprint</span><span>Rings = uncertainty radius</span></div>
        </div>

        <aside className={styles.trajectoryInspector}>
          <div className={styles.inspectorStatus}><span>SELECTED HORIZON</span><strong>{selectedLead === 0 ? "CURRENT" : `T+${selectedLead} HOURS`}</strong></div>
          <div className={styles.coordinateReadout}><MapPin size={18}/><div><span>PROJECTED CENTROID</span><strong>{activePoint.lat.toFixed(3)}°N</strong><strong>{activePoint.lon.toFixed(3)}°E</strong></div></div>
          <div className={styles.motionVector}>
            <div><span>NORTH COMPONENT</span><strong>{northKmh >= 0 ? "+" : ""}{northKmh.toFixed(1)} km/h</strong></div>
            <div><span>EAST COMPONENT</span><strong>{eastKmh >= 0 ? "+" : ""}{eastKmh.toFixed(1)} km/h</strong></div>
          </div>
          <div className={styles.uncertaintyBlock}><div><span>UNCERTAINTY ENVELOPE</span><strong>{activeStep ? `±${activeStep.uncertainty_radius_km.toFixed(0)} km` : "observed footprint"}</strong></div><div className={styles.uncertaintyBar}><i style={{width: `${activeStep ? Math.min(100, activeStep.uncertainty_radius_km / 1.2) : 8}%`}}/></div><small>Expands linearly with extrapolation lead time.</small></div>
          <div className={styles.qualityGates}>
            <span>METHOD GATES</span>
            <p><b>✓</b> Track identity linked across frames</p>
            <p><b>✓</b> Velocity derived from measured centroids</p>
            <p><i>!</i> No atmospheric evolution after final frame</p>
          </div>
          <a href="/api/events" target="_blank" rel="noreferrer">Inspect event JSON <ArrowUpRight size={14}/></a>
        </aside>
      </section>

      <section className={styles.leadDeck}>
        {leg.steps.map((step) => (
          <button key={step.lead_hours} onClick={() => setSelectedLead(step.lead_hours)} className={selectedLead === step.lead_hours ? styles.leadDeckActive : ""}>
            <span style={{color: colorForLead(step.lead_hours)}}><Clock3 size={14}/> T+{step.lead_hours}H</span>
            <strong>{step.lat.toFixed(2)}°N · {step.lon.toFixed(2)}°E</strong>
            <small>±{step.uncertainty_radius_km.toFixed(0)} km envelope</small>
            <i><Route size={15}/></i>
          </button>
        ))}
      </section>

      <section className={styles.trajectoryMethod}>
        <div><Navigation size={18}/><p><strong>What this can answer:</strong> where the already-detected footprint would move if its latest velocity persists.</p></div>
        <div><ShieldAlert size={18}/><p><strong>What it cannot answer:</strong> intensification, decay, splitting, terrain interaction or newly developing weather.</p></div>
      </section>
    </div>
  );
}

export function RiskPanel({ replay, onSelect }: { replay: ReplayCase; onSelect: (lat: number, lon: number) => void }) {
  const [liveMode, setLiveMode] = useState<boolean>(true);
  const [liveRegions, setLiveRegions] = useState<LiveRiskRegion[]>([]);
  const [selectedName, setSelectedName] = useState<string>("");
  const [zoneFilter, setZoneFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [sortField, setSortField] = useState<"score" | "rainfall" | "name" | "sigma">("score");
  const [sortAsc, setSortAsc] = useState<boolean>(false);
  const [loadingLive, setLoadingLive] = useState<boolean>(false);

  const fetchLiveRisk = async () => {
    setLoadingLive(true);
    try {
      const res = await fetch("/api/live-risk");
      if (res.ok) {
        const data = await res.json();
        if (data.regions) {
          setLiveRegions(data.regions);
        }
      }
    } catch (err) {
      console.warn("Failed to fetch live risk:", err);
    } finally {
      setLoadingLive(false);
    }
  };

  useEffect(() => {
    const initial = window.setTimeout(() => void fetchLiveRisk(), 0);
    const interval = setInterval(() => {
      void fetchLiveRisk();
    }, 5 * 60 * 1000);
    return () => {
      window.clearTimeout(initial);
      clearInterval(interval);
    };
  }, []);

  const allRows: RegionRiskRow[] = useMemo(() => {
    if (liveMode && liveRegions.length > 0) {
      return liveRegions.map((lr) => ({
        name: lr.name,
        state: lr.state,
        zone: lr.zone,
        latitude: lr.latitude,
        longitude: lr.longitude,
        rainfall: lr.rain_sum_24h_mm ?? lr.rainfall_mm ?? 0,
        sigma: lr.anomaly_sigma ?? Math.round(((lr.rain_sum_24h_mm ?? lr.rainfall_mm ?? 0) - 5.0) / 10.0 * 100) / 100,
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

  const filteredRows = useMemo(() => {
    return allRows
      .filter((r) => {
        if (zoneFilter !== "ALL" && r.zone !== zoneFilter) return false;
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchName = r.name.toLowerCase().includes(q);
          const matchState = (r.state ?? "").toLowerCase().includes(q);
          const matchZone = (r.zone ?? "").toLowerCase().includes(q);
          if (!matchName && !matchState && !matchZone) return false;
        }
        return true;
      })
      .sort((a, b) => {
        let diff = 0;
        if (sortField === "score") diff = a.score - b.score;
        else if (sortField === "rainfall") diff = a.rainfall - b.rainfall;
        else if (sortField === "sigma") diff = a.sigma - b.sigma;
        else if (sortField === "name") diff = a.name.localeCompare(b.name);
        return sortAsc ? diff : -diff;
      });
  }, [allRows, zoneFilter, searchQuery, sortField, sortAsc]);

  const handleRowClick = (r: RegionRiskRow) => {
    setSelectedName(r.name);
    onSelect(r.latitude, r.longitude);
  };

  const handleSort = (field: "score" | "rainfall" | "name" | "sigma") => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(field === "name");
    }
  };

  const zones = ["ALL", "North", "West", "Central", "East", "South", "Northeast", "Islands"];

  return (
    <section className={styles.lower} id="risk">
      <div className={styles.lowerHead}>
        <div>
          <div className={styles.eyebrow}>07 / RISK MAP · 0–100</div>
          <h2>Categorized spatial alerts</h2>
        </div>
        <span>LOW 0–30 · MODERATE 30–60 · HIGH 60–80 · SEVERE 80–100 · ~5 km radius (provisional)</span>
      </div>

      <div style={{ paddingTop: 20 }}>
        <RiskIndia3D
          replay={replay}
          onSelect={onSelect}
          liveMode={liveMode}
          onLiveModeChange={setLiveMode}
          selectedName={selectedName}
          onSelectedNameChange={setSelectedName}
        />
      </div>

      {/* Table Controls & Search */}
      <div style={{ marginTop: 24, marginBottom: 12, display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: "#ffffff", letterSpacing: "0.4px" }}>
              {liveMode ? "LIVE ALL-INDIA REGIONAL RISK TABLE" : "CASE REPLAY RISK TABLE"}
            </span>
            <span style={{ fontSize: 11, background: "rgba(255, 180, 200, 0.15)", color: "#ffb4c8", padding: "2px 8px", borderRadius: 100, fontWeight: 600 }}>
              {filteredRows.length} {filteredRows.length === 1 ? "Region" : "Regions"}
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <div style={{ position: "relative", minWidth: 200 }}>
              <Search size={13} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "#71717a" }} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search region or state..."
                style={{
                  background: "rgba(18, 18, 22, 0.9)",
                  border: "1px solid rgba(255, 255, 255, 0.14)",
                  borderRadius: 100,
                  padding: "6px 12px 6px 30px",
                  fontSize: 11.5,
                  color: "#ffffff",
                  outline: "none",
                  width: "100%",
                }}
              />
            </div>
            {liveMode && (
              <button
                type="button"
                onClick={() => void fetchLiveRisk()}
                disabled={loadingLive}
                style={{
                  border: "1px solid rgba(255, 255, 255, 0.14)",
                  background: "rgba(255, 255, 255, 0.05)",
                  color: "#d4d4d8",
                  padding: "5px 10px",
                  borderRadius: 100,
                  fontSize: 11,
                  display: "flex",
                  alignItems: "center",
                  gap: 5,
                  cursor: "pointer",
                }}
                title="Refresh real-time meteorological observations"
              >
                <RefreshCw size={11} className={loadingLive ? "animate-spin" : ""} />
                <span>{loadingLive ? "Refreshing…" : "Live Feed"}</span>
              </button>
            )}
          </div>
        </div>

        {/* Zone Filters Bar */}
        {liveMode && (
          <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 4 }}>
            {zones.map((z) => {
              const count = z === "ALL" ? allRows.length : allRows.filter((r) => r.zone === z).length;
              const active = zoneFilter === z;
              return (
                <button
                  key={z}
                  type="button"
                  onClick={() => setZoneFilter(z)}
                  style={{
                    border: active ? "1px solid rgba(255, 180, 200, 0.4)" : "1px solid rgba(255, 255, 255, 0.08)",
                    background: active ? "rgba(255, 180, 200, 0.15)" : "rgba(255, 255, 255, 0.03)",
                    color: active ? "#ffb4c8" : "#a1a1aa",
                    padding: "4px 10px",
                    borderRadius: 100,
                    fontSize: 10.5,
                    fontWeight: active ? 700 : 500,
                    cursor: "pointer",
                    whiteSpace: "nowrap",
                    transition: "all 0.15s ease",
                  }}
                >
                  {z === "ALL" ? "All India" : z} ({count})
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div className={styles.riskTableCard}>
        <div className={styles.benchmarkScroll} style={{ maxHeight: 480, overflowY: "auto" }}>
          <table className={styles.riskTable}>
            <thead style={{ position: "sticky", top: 0, zIndex: 2 }}>
              <tr>
                <th onClick={() => handleSort("name")} style={{ cursor: "pointer", userSelect: "none" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <span>Region / State</span>
                    {sortField === "name" && (sortAsc ? <ChevronUp size={11} /> : <ChevronDown size={11} />)}
                  </div>
                </th>
                <th onClick={() => handleSort("rainfall")} style={{ cursor: "pointer", userSelect: "none" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <span>{liveMode ? "24h Rain / Max Temp" : "Forecast (mm/day)"}</span>
                    {sortField === "rainfall" && (sortAsc ? <ChevronUp size={11} /> : <ChevronDown size={11} />)}
                  </div>
                </th>
                <th onClick={() => handleSort("sigma")} style={{ cursor: "pointer", userSelect: "none" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <span>Anomaly (σ)</span>
                    {sortField === "sigma" && (sortAsc ? <ChevronUp size={11} /> : <ChevronDown size={11} />)}
                  </div>
                </th>
                <th onClick={() => handleSort("score")} style={{ cursor: "pointer", userSelect: "none" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <span>Risk (0–100)</span>
                    {sortField === "score" && (sortAsc ? <ChevronUp size={11} /> : <ChevronDown size={11} />)}
                  </div>
                </th>
                <th>Band</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: "center", padding: "30px 16px", color: "#71717a" }}>
                    No regions matched &ldquo;{searchQuery}&rdquo;. Try another name or select &ldquo;All India&rdquo;.
                  </td>
                </tr>
              ) : (
                filteredRows.map((r) => {
                  const color = r.band === "SEVERE" ? "#c03a2b" : r.band === "HIGH" ? "#dd6f2d" : r.band === "MODERATE" ? "#d9a521" : "#43a854";
                  const isSelected = selectedName === r.name;
                  return (
                    <tr
                      key={r.name}
                      onClick={() => handleRowClick(r)}
                      style={{
                        cursor: "pointer",
                        background: isSelected ? "rgba(255, 180, 200, 0.12)" : undefined,
                        borderLeft: isSelected ? "3px solid #ffb4c8" : "3px solid transparent",
                        transition: "all 0.15s ease",
                      }}
                      title="Click to inspect this region"
                    >
                      <td>
                        <span className={styles.riskRegionCell}>
                          <span className={styles.riskDot} style={{ background: color, color }} />
                          <span style={{ fontWeight: 600, color: isSelected ? "#ffffff" : "#e4e4e7" }}>{r.name}</span>
                          {r.state && (
                            <span style={{ fontSize: 10, color: "#a1a1aa", marginLeft: 6, fontWeight: 400 }}>
                              ({r.state})
                            </span>
                          )}
                          {r.zone && (
                            <span style={{ fontSize: 9, background: "rgba(255, 255, 255, 0.06)", color: "#d4d4d8", padding: "1px 6px", borderRadius: 100, marginLeft: 6, fontWeight: 500 }}>
                              {r.zone}
                            </span>
                          )}
                        </span>
                      </td>
                      <td>
                        {liveMode && r.rainfall === 0 && r.max_temp_c ? (
                          <span>{r.max_temp_c.toFixed(1)}°C <span style={{ fontSize: 10, color: "#71717a" }}>(dry)</span></span>
                        ) : (
                          <span>{r.rainfall.toFixed(1)} <span style={{ fontSize: 10, color: "#71717a" }}>mm</span></span>
                        )}
                      </td>
                      <td>{r.sigma >= 0 ? "+" : ""}{r.sigma.toFixed(1)}</td>
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span style={{ fontWeight: 700, minWidth: 24 }}>{r.score}</span>
                          <div style={{ width: 44, height: 4, background: "rgba(255, 255, 255, 0.1)", borderRadius: 100, overflow: "hidden" }}>
                            <div style={{ width: `${Math.min(100, r.score)}%`, height: "100%", background: color, borderRadius: 100 }} />
                          </div>
                        </div>
                      </td>
                      <td><span className={styles.bandPill} data-band={r.band}>{r.band}</span></td>
                    </tr>
                  );
                })
              )}
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

interface AreaBriefing {
  location: string;
  coordinates: { lat: number; lon: number };
  headline: string;
  expected_rainfall_mm: [number, number];
  forecast_window: string;
  potential_impacts: string[];
  risk_radius_km: number;
  confidence: number;
  confidence_percent: number;
  anomaly_sigma: number;
  severity: "LOW" | "MODERATE" | "HIGH" | "SEVERE";
  risk_score: number;
  risk_band: string;
  narrative: string;
  hourly_timeline: Array<{ lead_hour: number; label: string; rainfall_rate_mm_hr: number; accumulated_rainfall_mm: number; probability_percent: number }>;
  risk_components: Array<{ label: string; score: number }>;
  recommended_actions: string[];
  explanations: { meteorology: string; impacts: string; confidence: string };
  visual_context: { image: string; alt: string; label: string };
  provenance: { model: string; initialization_time: string; grid_note: string };
}

function RainfallBriefingChart({ points }: { points: AreaBriefing["hourly_timeline"] }) {
  const max = Math.max(1, ...points.map((point) => point.rainfall_rate_mm_hr));
  const polyline = points.map((point, index) => `${28 + index * 71},${145 - (point.rainfall_rate_mm_hr / max) * 108}`).join(" ");
  return (
    <div className={styles.askChart} aria-label="Rainfall intensity through the forecast window">
      <div className={styles.askChartHead}><div><span>Forecast evolution</span><strong>Rainfall intensity & support</strong></div><span className={styles.askLivePill}><i /> animated model curve</span></div>
      <svg viewBox="0 0 480 175" role="img" aria-label="Animated rainfall intensity graph">
        {[38, 73, 108, 143].map((y) => <line key={y} x1="28" y1={y} x2="454" y2={y} className={styles.askGridLine} />)}
        <polygon points={`28,145 ${polyline} 454,145`} className={styles.askChartArea} />
        <polyline points={polyline} className={styles.askChartLine} />
        {points.map((point, index) => {
          const x = 28 + index * 71;
          const y = 145 - (point.rainfall_rate_mm_hr / max) * 108;
          return <g key={point.label}><circle cx={x} cy={y} r="4" className={styles.askChartDot} /><text x={x} y="166" textAnchor="middle">{point.label}</text></g>;
        })}
      </svg>
      <div className={styles.askTimelineNumbers}>{points.map((point) => <div key={point.label}><strong>{point.rainfall_rate_mm_hr}</strong><span>mm/h · {point.probability_percent}% support</span></div>)}</div>
    </div>
  );
}

function BriefingGauge({ score, band }: { score: number; band: string }) {
  const dash = Math.max(0, Math.min(100, score)) * 2.64;
  return (
    <div className={styles.askGaugeWrap}>
      <svg viewBox="0 0 110 110" aria-label={`Risk score ${score} out of 100`}>
        <circle cx="55" cy="55" r="42" className={styles.askGaugeTrack} />
        <circle cx="55" cy="55" r="42" className={styles.askGaugeValue} style={{ strokeDasharray: `${dash} 264` }} />
      </svg>
      <div><strong>{score}</strong><span>/ 100</span><b>{band}</b></div>
    </div>
  );
}

export function AskPanel({ picked }: { picked: { lat: number; lon: number } | null }) {
  const [lat, setLat] = useState("28.53");
  const [lon, setLon] = useState("77.39");
  const [answer, setAnswer] = useState<AreaBriefing | null>(null);
  const [region, setRegion] = useState("Noida");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const ask = async (aLat: string, aLon: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/what-happens-here?lat=${encodeURIComponent(aLat)}&lon=${encodeURIComponent(aLon)}`);
      if (!res.ok) throw new Error("The briefing service could not validate these coordinates.");
      const data = await res.json();
      setAnswer(data as AreaBriefing);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not reach the explainer API.");
    } finally {
      setLoading(false);
    }
  };
  const chooseRegion = (name: string) => {
    const selected = BRIEFING_REGIONS.find((item) => item.name === name);
    if (!selected) return;
    const nextLat = String(selected.lat);
    const nextLon = String(selected.lon);
    setRegion(name);
    setLat(nextLat);
    setLon(nextLon);
    void ask(nextLat, nextLon);
  };
  const groupedRegions = useMemo(() => Object.entries(BRIEFING_REGIONS.reduce<Record<string, typeof BRIEFING_REGIONS>>((groups, item) => {
    (groups[item.zone] ??= []).push(item);
    return groups;
  }, {})), []);
  const quickRegions = ["Noida", "Delhi", "Mumbai", "Kolkata", "Bhubaneswar", "Chennai", "Guwahati"];
  return (
    <section className={`${styles.lower} ${styles.askWorkspace}`} id="ask">
      <div className={styles.lowerHead}><div><div className={styles.eyebrow}>09 / WHAT HAPPENS HERE?</div><h2>Local impact intelligence</h2></div><span>29 regions · custom coordinates · visual briefing</span></div>
      <p className={styles.askIntro}>Choose a major Indian region or enter any coordinate. AVARTA translates the nearest model-grid signal into a visual timeline, likely local impacts, uncertainty and practical next steps.</p>
      <div className={styles.askControls}>
        <label className={styles.askRegionSelect}>Explore a region
          <select value={region} onChange={(event) => chooseRegion(event.target.value)} aria-label="Choose an Indian region">
            {groupedRegions.map(([zone, items]) => <optgroup key={zone} label={zone}>{items.map((item) => <option key={item.name} value={item.name}>{item.name} · {item.state}</option>)}</optgroup>)}
          </select>
        </label>
        <div className={styles.askCoordinateGroup}>
          <label>Latitude <input value={lat} onChange={(e) => setLat(e.target.value)} inputMode="decimal" aria-label="Latitude" /></label>
          <label>Longitude <input value={lon} onChange={(e) => setLon(e.target.value)} inputMode="decimal" aria-label="Longitude" /></label>
        </div>
        <button className={styles.askPrimaryButton} onClick={() => ask(lat, lon)} disabled={loading}>{loading ? <><RefreshCw size={16} className={styles.askSpin} /> Building briefing…</> : <><Sparkles size={16} /> What will happen here?</>}</button>
        {picked && <button className={styles.ghostBtn} onClick={() => { setLat(String(picked.lat)); setLon(String(picked.lon)); void ask(String(picked.lat), String(picked.lon)); }}><MapPin size={14} /> Use map pin</button>}
      </div>
      <div className={styles.askQuickRegions}>{quickRegions.map((name) => <button key={name} className={region === name ? styles.askQuickActive : ""} onClick={() => chooseRegion(name)}>{name}</button>)}</div>
      {error && <div className={styles.askError}><AlertTriangle size={16} /> {error}</div>}
      {loading && <div className={styles.askLoading} aria-live="polite"><div /><div /><div /><span>Sampling the replay grid and translating the signal into local impacts…</span></div>}
      {answer && !loading && (
        <div className={styles.askBriefing} key={`${answer.location}-${answer.coordinates.lat}-${answer.coordinates.lon}`}>
          <div className={styles.askHero}>
            <Image src={answer.visual_context.image} alt={answer.visual_context.alt} width={1200} height={620} priority className={styles.askHeroImage} />
            <div className={styles.askHeroShade} />
            <div className={styles.askHeroContent}>
              <div className={styles.askHeroTop}><span className={`${styles.askSeverity} ${styles[`ask${answer.severity}`]}`}><i /> {answer.severity}</span><span><MapPin size={13} /> {answer.coordinates.lat.toFixed(2)}°N · {answer.coordinates.lon.toFixed(2)}°E</span></div>
              <span className={styles.askKicker}>AVARTA LOCAL BRIEF · DRAFT DECISION SUPPORT</span>
              <h3>{answer.location}</h3>
              <p>{answer.narrative}</p>
              <small>{answer.visual_context.label}</small>
            </div>
            <div className={styles.askRadarPulse}><span /><span /><MapPin size={18} /></div>
          </div>

          <div className={styles.askMetrics}>
            <article><CloudRain size={18} /><span>Expected rainfall</span><strong>{answer.expected_rainfall_mm[0]}–{answer.expected_rainfall_mm[1]}<small> mm</small></strong><p>{answer.forecast_window}</p></article>
            <article><Gauge size={18} /><span>Model confidence</span><strong>{answer.confidence_percent}<small>%</small></strong><p>Support, not personal-risk probability</p></article>
            <article><Waves size={18} /><span>Anomaly</span><strong>{answer.anomaly_sigma >= 0 ? "+" : ""}{answer.anomaly_sigma}<small>σ</small></strong><p>vs provisional climatology</p></article>
            <article><MapPin size={18} /><span>Indicative radius</span><strong>~{answer.risk_radius_km}<small> km</small></strong><p>nearest-grid impact envelope</p></article>
          </div>

          <div className={styles.askVisualGrid}>
            <RainfallBriefingChart points={answer.hourly_timeline} />
            <article className={styles.askRiskCard}>
              <div className={styles.askSectionLabel}>Composite signal</div>
              <h4>Why this risk level?</h4>
              <BriefingGauge score={answer.risk_score} band={answer.risk_band} />
              <div className={styles.askRiskBars}>{answer.risk_components.map((component) => <div key={component.label}><span>{component.label}<b>{component.score}%</b></span><i><em style={{ width: `${component.score}%` }} /></i></div>)}</div>
            </article>
          </div>

          <div className={styles.askExplanationGrid}>
            <article><span className={styles.askIconBox}><Radar size={18} /></span><div><div className={styles.askSectionLabel}>What the atmosphere is doing</div><h4>Model signal, decoded</h4><p>{answer.explanations.meteorology}</p></div></article>
            <article><span className={styles.askIconBox}><Building2 size={18} /></span><div><div className={styles.askSectionLabel}>What it can mean locally</div><h4>From rainfall to disruption</h4><p>{answer.explanations.impacts}</p></div></article>
            <article><span className={styles.askIconBox}><ShieldAlert size={18} /></span><div><div className={styles.askSectionLabel}>How sure are we?</div><h4>Confidence with caveats</h4><p>{answer.explanations.confidence}</p></div></article>
          </div>

          <div className={styles.askBottomGrid}>
            <article className={styles.askImpactCard}><div className={styles.askSectionLabel}>Likely local effects</div><h4>Watch these first</h4><div>{answer.potential_impacts.map((impact, index) => <span key={impact}>{index === 0 ? <Droplets size={15} /> : index === 1 ? <Waves size={15} /> : <AlertTriangle size={15} />}{impact}</span>)}</div></article>
            <article className={styles.askActionCard}><div className={styles.askSectionLabel}>Practical preparation</div><h4>What you can do now</h4><ol>{answer.recommended_actions.map((action) => <li key={action}><CheckCircle2 size={16} /><span>{action}</span></li>)}</ol></article>
          </div>

          <footer className={styles.askProvenance}><Umbrella size={16} /><div><strong>Interpretation boundary</strong><span>{answer.provenance.grid_note} Model: {answer.provenance.model}. Initialised {time(answer.provenance.initialization_time)} UTC. Always follow official IMD and district authority warnings.</span></div><a href={`/api/what-happens-here?lat=${answer.coordinates.lat}&lon=${answer.coordinates.lon}`} target="_blank" rel="noreferrer">Open machine-readable brief <ArrowUpRight size={13} /></a></footer>
        </div>
      )}
      {!answer && !loading && <div className={styles.askEmpty}><div className={styles.askEmptyVisual}><span /><span /><Radar size={38} /></div><div><strong>Select a region to generate a visual briefing</strong><p>The result will include a forecast graph, risk drivers, impact explanation and recommended actions—not just a one-line answer.</p></div></div>}
    </section>
  );
}

function EnsembleEvidenceAudit({ replay }: { replay: ReplayCase }) {
  const probability = replay.raster.member_exceedance_probability;
  if (!probability) return null;
  const memberCount = replay.forecast.members.length;
  const maximum = Math.max(...probability.flat());
  return (
    <section className={styles.lower} aria-label="Ensemble evidence audit">
      <div className={styles.crossCheck} style={{ marginTop: 0 }}>
        <div>
          <div className={styles.eyebrow}>FINITE-ENSEMBLE UNCERTAINTY AUDIT</div>
          <h3>Probability with honest error bars.</h3>
          <p>
            Every archived exceedance value is a raw member count, not a calibrated warning probability.
            The new intelligence core adds 90% finite-sample intervals, EFI, Shift-of-Tails, confidence,
            and spherical-GNN features when full member and model-climate fields are supplied.
          </p>
          <p className={styles.crossCaveat}>
            This compact replay retained member frequency only, so it cannot reconstruct EFI or SOT.
          </p>
        </div>
        <div className={styles.crossStats}>
          <div><span>Archived members</span><strong>{memberCount}</strong></div>
          <div><span>Probability resolution</span><strong>{Math.round(100 / memberCount)}<small>% steps</small></strong></div>
          <div><span>Maximum raw support</span><strong>{Math.round(maximum * 100)}<small>%</small></strong></div>
          <a href="/api/intelligence" target="_blank" rel="noreferrer">
            Inspect uncertainty-aware footprints <ArrowUpRight size={13}/>
          </a>
        </div>
      </div>
    </section>
  );
}

export function ValidationSection({ replay, benchmark }: { replay: ReplayCase; benchmark: BenchmarkReport }) {
  const v = replay.verification;
  return (<>
    <EnsembleEvidenceAudit replay={replay} />
    <section className={styles.lower} id="validation"><div className={styles.lowerHead}><div><div className={styles.eyebrow}>04 / EVIDENCE & LIMITS</div><h2>What the numbers say</h2></div><span>Retrospective verification · {v.sampled_grid_cells.toLocaleString()} valid IMD cells</span></div><div className={styles.evidenceGrid}><article><span className={styles.evidenceIcon}><ArrowDownRight size={18}/></span><h3>Mismatch matters</h3><p>The forecast peak is {v.forecast_peak_mm_day} mm/day; IMD reports {v.observed_peak_mm_day} mm/day. The heavy-rain footprints do not overlap at this threshold.</p></article><article><span className={styles.evidenceIcon}><Layers3 size={18}/></span><h3>Resolution is explicit</h3><p>GEFS is 0.5°; IMD observations are 0.25°. No 5 km forecast, diffusion output, or calibrated local impact zone is claimed here.</p></article><article><span className={styles.evidenceIcon}><MapPin size={18}/></span><h3>Trace every point</h3><p>Five archived GEFS members and the IMD daily grid feed this replay. Each frame carries a valid time, lead hour, and track footprint.</p></article></div>{replay.independent_verification && replay.independent_observation && <div className={styles.crossCheck}><div><div className={styles.eyebrow}>INDEPENDENT OBSERVATION CHECK</div><h3>Two grids, one missed event.</h3><p>CHIRPS v2 offers a separate 0.05° daily rainfall estimate. Its peak differs sharply from IMD; neither observation supports a successful heavy-rain forecast in this case.</p><p className={styles.crossCaveat}>CHIRPS is not gauge truth or a 5 km forecast target. Daily timing and extreme magnitudes require caution.</p></div><div className={styles.crossStats}><div><span>GEFS forecast peak</span><strong>{replay.independent_verification.forecast_peak_mm_day}<small> mm/day</small></strong></div><div><span>CHIRPS estimate peak</span><strong>{replay.independent_verification.chirps_peak_mm_day}<small> mm/day</small></strong></div><div><span>Heavy-rain overlap</span><strong>{Math.round((replay.independent_verification.heavy_rain_iou ?? 0) * 100)}<small>%</small></strong></div><a href={replay.independent_observation.source_url} target="_blank" rel="noreferrer">View CHIRPS source <ArrowUpRight size={13}/></a></div></div>}<div className={styles.benchmark}><div><div className={styles.eyebrow}>SEPARATE MODEL EXPERIMENT</div><h3>Residual CNN vs. bilinear</h3><p>IMD 0.25° target-centered crops, smoothed into a coarse proxy. {benchmark.validation.validation_samples} held-out dates from {benchmark.validation.first_validation_date}; no independent NWP and no 5 km ground truth.</p></div><div className={styles.benchmarkScroll}><table><thead><tr><th>Validation metric</th><th>Residual CNN</th><th>Bilinear</th></tr></thead><tbody><tr><td>Peak absolute error ↓</td><td>{benchmark.validation.residual_cnn.mean_peak_absolute_error_mm_day} mm</td><td>{benchmark.validation.bilinear.mean_peak_absolute_error_mm_day} mm</td></tr><tr><td>Heavy-rain recall ↑</td><td>{Math.round(benchmark.validation.residual_cnn.heavy_rain_detection_recall * 100)}%</td><td>{Math.round(benchmark.validation.bilinear.heavy_rain_detection_recall * 100)}%</td></tr><tr><td>Footprint overlap ↑</td><td>{Math.round(benchmark.validation.residual_cnn.heavy_rain_footprint_iou * 100)}%</td><td>{Math.round(benchmark.validation.bilinear.heavy_rain_footprint_iou * 100)}%</td></tr><tr><td>Overall MAE ↓</td><td>{benchmark.validation.residual_cnn.mean_absolute_error_mm_day} mm</td><td>{benchmark.validation.bilinear.mean_absolute_error_mm_day} mm</td></tr><tr><td>False-alarm ratio ↓</td><td>{Math.round(benchmark.validation.residual_cnn.heavy_rain_false_alarm_ratio * 100)}%</td><td>{Math.round(benchmark.validation.bilinear.heavy_rain_false_alarm_ratio * 100)}%</td></tr></tbody></table></div></div><p className={styles.benchmarkNote}>The CNN improves peak and overlap metrics but worsens overall error and false alarms. It is not promoted to the historical forecast pipeline. <a href="/api/benchmark" target="_blank" rel="noreferrer">View full benchmark <ArrowUpRight size={12}/></a></p></section>
    </>
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
