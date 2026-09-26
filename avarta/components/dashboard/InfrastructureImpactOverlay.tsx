"use client";

import { useEffect, useState } from "react";
import { Building2, Download, PlugZap, Sprout, Users, Waves } from "lucide-react";
import styles from "./sih.module.css";

interface ImpactData {
  population_at_risk: { total_exposed: number; tier1_severe_zone: number; evacuation_centers_active: number };
  critical_infrastructure: { power_substations_threatened: Array<{ id: string; name: string; voltage: string; risk: string; lat: number; lon: number }>; highway_submergence_km: number; railway_tracks_inundation_km: number };
  agriculture_exposure: { kharif_paddy_threatened_hectares: number; saline_inundation_risk_hectares: number };
  urban_flash_flood_nodes: Array<{ location: string; predicted_24h_accumulation_mm: number; drainage_capacity_exceeded_by_percent: number }>;
  highway_segments: Array<{ id: string; name: string; risk: string; lat: number; lon: number }>;
}
type Tab = "disaster" | "infrastructure" | "agriculture" | "urban";

export default function InfrastructureImpactOverlay({ compact = false }: { compact?: boolean }) {
  const [data, setData] = useState<ImpactData | null>(null); const [tab, setTab] = useState<Tab>("disaster"); const [counter, setCounter] = useState(0);
  useEffect(() => { void fetch("/api/infrastructure-impact").then((r) => r.json()).then(setData); }, []);
  useEffect(() => { if (!data) return; const start = performance.now(); let frame = 0; const tick = (now: number) => { const p = Math.min(1, (now - start) / 1000); setCounter(Math.round(data.population_at_risk.total_exposed * (1 - Math.pow(1 - p, 3)))); if (p < 1) frame = requestAnimationFrame(tick); }; frame = requestAnimationFrame(tick); return () => cancelAnimationFrame(frame); }, [data]);
  if (!data) return null;
  function csv() {
    const rows = [["resource", "quantity", "deployment_zone", "trigger"], ["NDRF battalion", "4", "Balasore;Kendrapara", "T+36h"], ["Evacuation centre", String(data!.population_at_risk.evacuation_centers_active), "Tier-1 severe zone", "Immediate"], ["Power crew", "12", "Cuttack-Puri corridor", "Pre-landfall"]];
    const url = URL.createObjectURL(new Blob([rows.map((row) => row.join(",")).join("\n")], { type: "text/csv" })); const a = document.createElement("a"); a.href = url; a.download = "avarta-ndrf-resource-deployment.csv"; a.click(); URL.revokeObjectURL(url);
  }
  return <section className={`${styles.module} ${styles.panel}`}>
    <div className={styles.header}><div><div className={styles.eyebrow}>FIVE-SECTOR IMPACT INTELLIGENCE</div><h2>Infrastructure & exposure overlay</h2><p>Hazard geometry translated into people, assets, crops and urban drainage consequences.</p></div><button className={`${styles.button} ${styles.primary}`} onClick={csv}><Download size={13}/> Export NDRF deployment .csv</button></div>
    <div className={styles.pad}>
      <div className={styles.tabs}>{[
        ["disaster", "Disaster Management / NDRF", Users], ["infrastructure", "Critical Infrastructure", PlugZap], ["agriculture", "Agriculture & Crops", Sprout], ["urban", "Urban Drainage Stress", Waves],
      ].map(([id, label, Icon]) => { const I = Icon as typeof Users; return <button key={id as string} className={`${styles.tab} ${tab === id ? styles.tabActive : ""}`} onClick={() => setTab(id as Tab)}><I size={12}/> {label as string}</button>; })}</div>
      <div className={styles.impactGrid} style={{ marginTop: 14 }}>
        <div>
          {tab === "disaster" && <><span className={styles.eyebrow}>EXPOSED POPULATION</span><div className={styles.counter}>{counter.toLocaleString()}</div><div className={styles.grid3}><div className={styles.stat}><span>Tier-1 severe zone</span><strong>{data.population_at_risk.tier1_severe_zone.toLocaleString()}</strong></div><div className={styles.stat}><span>Evacuation centres active</span><strong>{data.population_at_risk.evacuation_centers_active}</strong></div><div className={styles.stat}><span>NDRF staging</span><strong>4 battalions</strong></div></div></>}
          {tab === "infrastructure" && <div className={styles.cards}>{data.critical_infrastructure.power_substations_threatened.map((site) => <div className={styles.stat} key={site.id}><span>{site.id} · {site.risk}</span><strong>{site.name}</strong><small className={styles.muted}>{site.voltage}</small></div>)}<div className={styles.grid3}><div className={styles.stat}><span>NH-16 submergence</span><strong>{data.critical_infrastructure.highway_submergence_km} km</strong></div><div className={styles.stat}><span>Rail inundation</span><strong>{data.critical_infrastructure.railway_tracks_inundation_km} km</strong></div></div></div>}
          {tab === "agriculture" && <div className={styles.grid3}><div className={styles.stat}><span>Kharif paddy threatened</span><strong>{data.agriculture_exposure.kharif_paddy_threatened_hectares.toLocaleString()} ha</strong></div><div className={styles.stat}><span>Saline inundation risk</span><strong>{data.agriculture_exposure.saline_inundation_risk_hectares.toLocaleString()} ha</strong></div></div>}
          {tab === "urban" && <div className={styles.cards}>{data.urban_flash_flood_nodes.map((node) => <div className={styles.stat} key={node.location}><span>Drainage +{node.drainage_capacity_exceeded_by_percent}% over capacity</span><strong>{node.location}</strong><small className={styles.muted}>{node.predicted_24h_accumulation_mm} mm / 24h</small></div>)}</div>}
        </div>
        {!compact && <div className={styles.miniMap} aria-label="Schematic Odisha infrastructure exposure map">
          {data.critical_infrastructure.power_substations_threatened.map((site, index) => <span key={site.id} className={styles.mapPin} style={{ left: `${58 + index * 10}%`, top: `${28 + index * 18}%` }}><i/>{site.voltage}</span>)}
          {data.highway_segments.map((segment, index) => <span key={segment.id} className={styles.mapPin} style={{ left: `${48 + index * 21}%`, top: `${70 + index * 8}%`, color: "#fde68a" }}><Building2 size={15}/>{segment.name}</span>)}
        </div>}
      </div>
    </div>
  </section>;
}
