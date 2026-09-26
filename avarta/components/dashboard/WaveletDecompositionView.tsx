"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Activity, SlidersHorizontal, Sparkles } from "lucide-react";
import styles from "./sih.module.css";

interface WaveData { ll_subband: number[][]; lh_subband: number[][]; hl_subband: number[][]; hh_subband: number[][]; psd_gain_db: number; ranges: Record<string, [number, number]> }
type Band = "ll" | "lh" | "hl" | "hh";

function rgb(a: [number, number, number], b: [number, number, number], t: number) { return a.map((v, i) => Math.round(v + (b[i] - v) * Math.max(0, Math.min(1, t)))) as [number, number, number]; }
function color(value: number, min: number, max: number, palette: "viridis" | "seismic" | "magma") {
  const t = (value - min) / (max - min || 1); let c: [number, number, number];
  if (palette === "seismic") c = t < .5 ? rgb([37,99,235],[245,245,245],t * 2) : rgb([245,245,245],[239,68,68],(t - .5) * 2);
  else if (palette === "magma") c = t < .55 ? rgb([18,8,44],[190,35,98],t / .55) : rgb([190,35,98],[253,231,37],(t - .55) / .45);
  else c = t < .5 ? rgb([68,1,84],[32,144,140],t * 2) : rgb([32,144,140],[253,231,37],(t - .5) * 2);
  return c;
}
function WaveCanvas({ matrix, range, palette, label }: { matrix: number[][]; range: [number, number]; palette: "viridis" | "seismic" | "magma"; label: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => { const canvas = ref.current; if (!canvas) return; const ctx = canvas.getContext("2d"); if (!ctx) return; canvas.width = matrix[0]?.length || 64; canvas.height = matrix.length || 64; const image = ctx.createImageData(canvas.width, canvas.height); matrix.forEach((row, y) => row.forEach((value, x) => { const c = color(value, range[0], range[1], palette); const i = (y * canvas.width + x) * 4; image.data.set([...c, 255], i); })); ctx.putImageData(image, 0, 0); }, [matrix, range, palette]);
  return <div className={styles.waveCell}><span className={styles.waveLabel}>{label}</span><canvas ref={ref}/></div>;
}

export default function WaveletDecompositionView() {
  const [data, setData] = useState<WaveData | null>(null); const [bands, setBands] = useState<Record<Band, boolean>>({ ll: true, lh: true, hl: true, hh: true }); const [frequency, setFrequency] = useState(100);
  useEffect(() => { void fetch("/api/wavelet-decomposition").then((r) => r.json()).then(setData); }, []);
  const reconstruction = useMemo(() => { if (!data) return []; return data.ll_subband.map((row, y) => row.map((value, x) => (bands.ll ? value : 0) + (frequency / 100) * ((bands.lh ? data.lh_subband[y][x] : 0) + (bands.hl ? data.hl_subband[y][x] : 0) + (bands.hh ? data.hh_subband[y][x] : 0)))); }, [data, bands, frequency]);
  if (!data) return null;
  return <section className={`${styles.module} ${styles.panel}`}>
    <div className={styles.header}><div><div className={styles.eyebrow}>2D DISCRETE WAVELET TRANSFORM · DB2</div><h2>Residual sub-band decomposition</h2><p>L<sub>MSE</sub> = ‖Y − Ŷ‖² averages sharp extremes. AVARTA predicts LH, HL and HH residuals to restore the tail.</p></div><span className={styles.badge}><Sparkles size={13}/> +{data.psd_gain_db} dB HIGH-k POWER</span></div>
    <div className={styles.pad}>
      <div className={styles.mapControls}><div className={styles.buttonRow}>{(["ll","lh","hl","hh"] as Band[]).map((band) => <button key={band} className={`${styles.toggle} ${bands[band] ? styles.toggleOn : ""}`} onClick={() => setBands((current) => ({ ...current, [band]: !current[band] }))}>{bands[band] ? "✓" : "○"} {band.toUpperCase()}</button>)}</div><span className={styles.muted}><SlidersHorizontal size={12}/> high-frequency residual gain {frequency}%</span></div>
      <input type="range" min="0" max="140" value={frequency} onChange={(event) => setFrequency(Number(event.target.value))} style={{ width: "100%", accentColor: "#22c55e", marginBottom: 12 }} aria-label="High frequency residual gain"/>
      <div className={styles.waveGrid}>
        <WaveCanvas matrix={data.ll_subband} range={data.ranges.ll} palette="viridis" label="LL · Synoptic approximation (12 km)"/>
        <WaveCanvas matrix={data.lh_subband} range={data.ranges.lh} palette="seismic" label="LH · Horizontal rainband gradients"/>
        <WaveCanvas matrix={data.hl_subband} range={data.ranges.hl} palette="seismic" label="HL · Vertical convective boundaries"/>
        <WaveCanvas matrix={data.hh_subband} range={data.ranges.hh} palette="magma" label="HH · Microscale convective eddies"/>
      </div>
      <div style={{ marginTop: 14 }}><WaveCanvas matrix={reconstruction} range={[-20,100]} palette="magma" label={`Interactive inverse-DWT reconstruction · ${Object.entries(bands).filter(([,on]) => on).map(([band]) => band.toUpperCase()).join(" + ") || "no bands"}`}/></div>
      <div className={styles.stat} style={{ marginTop: 14 }}><span>ANTI-SMOOTHING CROSS-SECTION · PEAK RAIN RATE</span><svg viewBox="0 0 760 160" style={{ width: "100%", marginTop: 10 }}><path d="M20 132 C170 126 270 112 360 83 S520 88 740 125" fill="none" stroke="#3b82f6" strokeWidth="3"/><path d="M20 132 C210 125 308 115 380 21 S510 111 740 128" fill="none" stroke="#f59e0b" strokeWidth="3"/><path d="M20 132 C210 125 310 113 381 24 S515 110 740 128" fill="none" stroke="#22c55e" strokeWidth="3"/></svg><div className={styles.buttonRow}><span className={styles.tag}>● U-Net 42 mm/h</span><span className={styles.tag}>● IMD truth 88 mm/h</span><span className={styles.tag}>● AVARTA 86.4 mm/h</span></div></div>
      <p className={styles.muted} style={{ marginTop: 12 }}><Activity size={12}/> Referencing Yi et al., JGR 2026: Conditional Wavelet Diffusion · high wavenumbers k &gt; 0.1 km⁻¹.</p>
    </div>
  </section>;
}
