"use client";

import { useEffect, useMemo, useState } from "react";
import { Activity, GitBranch, Play } from "lucide-react";
import styles from "./sih.module.css";

interface Point { t_lead: number; lat: number; lon: number }
interface Member { id: string; source: string; divergent: boolean; waypoints: Point[] }
interface EnsembleData { lead_hours: number[]; members_count: number; members: Member[]; mean_track: Point[]; p10_p90_corridor_polygon: Point[]; member_divergence_index: { value: number; classification: string; onset_lead_hour: number; interpretation: string } }

const W = 780, H = 410, PAD = 36, LAT_MIN = 17.5, LAT_MAX = 23.2, LON_MIN = 83.5, LON_MAX = 88.2;
const xy = (point: Point) => ({ x: PAD + ((point.lon - LON_MIN) / (LON_MAX - LON_MIN)) * (W - PAD * 2), y: PAD + ((LAT_MAX - point.lat) / (LAT_MAX - LAT_MIN)) * (H - PAD * 2) });
const path = (points: Point[]) => points.map((point, index) => { const p = xy(point); return `${index ? "L" : "M"}${p.x.toFixed(1)},${p.y.toFixed(1)}`; }).join(" ");

export default function EnsembleSpaghettiPlot() {
  const [data, setData] = useState<EnsembleData | null>(null); const [leadIndex, setLeadIndex] = useState(7);
  const [showMembers, setShowMembers] = useState(true); const [showCorridor, setShowCorridor] = useState(true); const [highlight, setHighlight] = useState(true);
  useEffect(() => { void fetch("/api/ensemble-plume").then((r) => r.json()).then(setData); }, []);
  const currentLead = data?.lead_hours[leadIndex] ?? 120;
  const clippedMembers = useMemo(() => data?.members.map((member) => ({ ...member, waypoints: member.waypoints.filter((point) => point.t_lead <= currentLead) })) ?? [], [data, currentLead]);
  if (!data) return <section className={`${styles.module} ${styles.panel} ${styles.pad}`}><span className={styles.badge}><Activity size={13}/> Loading ensemble trajectories…</span></section>;
  const mean = data.mean_track.filter((point) => point.t_lead <= currentLead);
  return <section className={`${styles.module} ${styles.panel}`}>
    <div className={styles.header}><div><div className={styles.eyebrow}>NCMRWF NEPS-G × 11 · GEFS × 9</div><h2>Multi-ensemble trajectory plume</h2><p>Twenty dynamically independent evolutions reveal track bifurcation and the P10–P90 uncertainty corridor.</p></div><span className={styles.badge}><GitBranch size={13}/> DIVERGENCE {data.member_divergence_index.value.toFixed(2)} · {data.member_divergence_index.classification}</span></div>
    <div className={styles.pad}>
      <div className={styles.mapControls}>
        <div className={styles.buttonRow}>
          <button className={`${styles.toggle} ${showMembers ? styles.toggleOn : ""}`} onClick={() => setShowMembers(!showMembers)}>✓ All 20 members</button>
          <button className={`${styles.toggle} ${showCorridor ? styles.toggleOn : ""}`} onClick={() => setShowCorridor(!showCorridor)}>✓ 90% corridor</button>
          <button className={`${styles.toggle} ${highlight ? styles.toggleOn : ""}`} onClick={() => setHighlight(!highlight)}>✓ Divergent members</button>
        </div><span className={styles.badge}><Play size={12}/> T+{currentLead}h</span>
      </div>
      <svg className={styles.chart} viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Spaghetti plot of twenty cyclone ensemble trajectories">
        <defs><filter id="cyanGlow"><feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter><linearGradient id="sea" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#06131e"/><stop offset="1" stopColor="#10101b"/></linearGradient></defs>
        <rect width={W} height={H} rx="12" fill="url(#sea)"/>
        {Array.from({ length: 8 }, (_, i) => <line key={`v${i}`} x1={PAD + i * (W - PAD * 2) / 7} x2={PAD + i * (W - PAD * 2) / 7} y1={PAD} y2={H - PAD} stroke="rgba(255,255,255,.06)"/>)}
        {Array.from({ length: 6 }, (_, i) => <line key={`h${i}`} x1={PAD} x2={W - PAD} y1={PAD + i * (H - PAD * 2) / 5} y2={PAD + i * (H - PAD * 2) / 5} stroke="rgba(255,255,255,.06)"/>)}
        <path d="M48 52 C145 70 180 145 225 212 C260 266 324 294 372 402" fill="none" stroke="rgba(134,239,172,.42)" strokeWidth="3"/>
        {showCorridor && <path d={`${path(data.p10_p90_corridor_polygon)} Z`} fill="#a855f7" fillOpacity=".16" stroke="#a855f7" strokeOpacity=".45" strokeDasharray="5 5"/>}
        {showMembers && clippedMembers.map((member) => <path key={member.id} d={path(member.waypoints)} fill="none" stroke={highlight && member.divergent ? "#fb923c" : member.source === "NCMRWF_NEPS_G" ? "#c084fc" : "#94a3b8"} strokeWidth={highlight && member.divergent ? 2.2 : 1.15} strokeOpacity={highlight && member.divergent ? .95 : .35}/>)}
        <path d={path(mean)} fill="none" stroke="#38bdf8" strokeWidth="3.5" filter="url(#cyanGlow)"/>
        {mean.map((point) => { const p = xy(point); return <g key={point.t_lead}><circle cx={p.x} cy={p.y} r="4" fill="#38bdf8" stroke="white"/><text x={p.x + 7} y={p.y - 6} fill="#bae6fd" fontSize="9">T+{point.t_lead}</text></g>; })}
        <text x="52" y="35" fill="#86efac" fontSize="10">Odisha coast</text><text x={W - 185} y="30" fill="#94a3b8" fontSize="9">Bay of Bengal</text>
      </svg>
      <div style={{ marginTop: 12 }}><input aria-label="Lead time" type="range" min="0" max={data.lead_hours.length - 1} step="1" value={leadIndex} onChange={(event) => setLeadIndex(Number(event.target.value))} style={{ width: "100%", accentColor: "#38bdf8" }}/><div className={styles.mapControls}><span className={styles.muted}>T+0h</span><span className={styles.muted}>{data.member_divergence_index.interpretation}</span><span className={styles.muted}>T+120h</span></div></div>
    </div>
  </section>;
}
