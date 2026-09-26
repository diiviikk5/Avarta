"use client";

import { useState } from "react";
import { BarChart3, Trophy } from "lucide-react";
import styles from "./sih.module.css";

const rows = [
  { metric: "Trajectory Error @ 72h", tip: "Great-circle distance between predicted and best-track centroids at a 72-hour lead.", nwp: "68.4 km", unet: "61.2 km", graph: "52.0 km", avarta: "38.5 km", target: "NCMRWF Best Track" },
  { metric: "Peak Intensity Underestimation", tip: "100 × (predicted peak − observed peak) / observed peak; values nearer zero are better.", nwp: "−28.4%", unet: "−22.1% (smoothed)", graph: "−19.5%", avarta: "−4.2%", target: "Extreme Tail Guard" },
  { metric: "Threat Footprint IoU", tip: "Intersection over Union: |A ∩ B| / |A ∪ B| for predicted and observed extreme-weather footprints.", nwp: "48.2%", unet: "56.7%", graph: "62.3%", avarta: "79.4%", target: "IMD 4 km Ground Truth" },
  { metric: "High-Frequency Spectral Loss", tip: "Power loss in decibels above k = 0.1 km⁻¹ against the observed 2D Fourier PSD.", nwp: "14.2 dB", unet: "18.6 dB", graph: "12.1 dB", avarta: "2.8 dB", target: "2D Fourier PSD (Yi et al.)" },
  { metric: "Compute FLOPs per Anomaly", tip: "Compute normalized to a full-domain NWP pass; lower is better at equal verification skill.", nwp: "1.0× (Full Domain)", unet: "0.85×", graph: "0.50×", avarta: "0.21× (79% saved)", target: "Threat-First Masking" },
];

export default function BenchmarkScorecard({ compact = false }: { compact?: boolean }) {
  const [scenario, setScenario] = useState<"cyclone" | "rain">("cyclone");
  const rainFactor = scenario === "rain";
  return <section className={`${styles.module} ${styles.panel}`}>
    <div className={styles.header}><div><div className={styles.eyebrow}>QUANTIFIABLE FIVE-METRIC VALIDATION</div><h2>Capability benchmark scorecard</h2><p>Like-for-like evaluation against operational and AI baselines. Hover metric names for definitions.</p></div><span className={styles.badge}><Trophy size={13}/> AVARTA LEADS 5 / 5</span></div>
    <div className={styles.pad}>
      <div className={styles.tabs} style={{ marginBottom: 12 }}><button className={`${styles.tab} ${scenario === "cyclone" ? styles.tabActive : ""}`} onClick={() => setScenario("cyclone")}>Cyclone · Dana / Fani</button><button className={`${styles.tab} ${scenario === "rain" ? styles.tabActive : ""}`} onClick={() => setScenario("rain")}>Heavy Rainfall · Mumbai 2024</button></div>
      <div className={styles.benchmarkWrap}><table className={styles.benchmark}><thead><tr><th>Evaluation metric</th><th>Traditional NWP 12 km</th><th>Standard U-Net</th><th>GraphCast</th><th>AVARTA pipeline</th><th>Target reference</th></tr></thead><tbody>
        {rows.slice(0, compact ? 3 : rows.length).map((row, index) => <tr key={row.metric}><td className={styles.metricName} title={row.tip}>{row.metric} ⓘ</td><td>{rainFactor && index === 0 ? "74.1 km" : row.nwp}</td><td>{row.unet}</td><td>{row.graph}</td><td className={styles.winner}><Trophy size={11} style={{ verticalAlign: "middle", marginRight: 5 }}/>{rainFactor && index === 2 ? "81.1%" : row.avarta}</td><td className={styles.muted}>{row.target}</td></tr>)}
      </tbody></table></div>
      <p className={styles.muted} style={{ marginTop: 12 }}><BarChart3 size={12} style={{ verticalAlign: "middle" }}/> SIH presentation benchmark fixture; operational claims require independent prospective validation and confidence intervals.</p>
    </div>
  </section>;
}
