"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, Clipboard, Download, FileJson2, Search } from "lucide-react";
import { SIH_THREAT_OBJECT, threatObjectToGeoJSON, type ThreatObject4D } from "@/lib/sih-presentation-data";
import styles from "./sih.module.css";

type JsonValue = null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue };

function TreeNode({ name, value, depth = 0, forceOpen = false }: { name?: string; value: JsonValue; depth?: number; forceOpen?: boolean }) {
  const [open, setOpen] = useState(depth < 2);
  const compound = value !== null && typeof value === "object";
  if (!compound) {
    const cls = typeof value === "string" ? styles.jsonString : typeof value === "number" ? styles.jsonNumber : styles.jsonBool;
    return <div style={{ paddingLeft: depth * 15 }}>{name && <><span className={styles.jsonKey}>&quot;{name}&quot;</span>: </>}<span className={cls}>{typeof value === "string" ? `"${value}"` : String(value)}</span></div>;
  }
  const entries = Object.entries(value as JsonValue[] | Record<string, JsonValue>);
  const expanded = forceOpen || open;
  return <div style={{ paddingLeft: depth * 15 }}>
    <button type="button" onClick={() => setOpen((current) => !current)}>{expanded ? "▾" : "▸"} {name ? `"${name}"` : "root"} <span className={styles.muted}>{Array.isArray(value) ? `[${entries.length}]` : `{${entries.length}}`}</span></button>
    {expanded && entries.map(([key, child]) => <TreeNode key={key} name={Array.isArray(value) ? key : key} value={child} depth={depth + 1} forceOpen={forceOpen}/>)}
  </div>;
}

function filterJson(value: JsonValue, query: string): JsonValue | undefined {
  if (!query) return value;
  if (value === null || typeof value !== "object") return String(value).toLowerCase().includes(query) ? value : undefined;
  if (Array.isArray(value)) { const items = value.map((item) => filterJson(item, query)).filter((item) => item !== undefined) as JsonValue[]; return items.length ? items : undefined; }
  const result: Record<string, JsonValue> = {};
  for (const [key, child] of Object.entries(value)) {
    if (key.toLowerCase().includes(query)) result[key] = child;
    else { const filtered = filterJson(child, query); if (filtered !== undefined) result[key] = filtered; }
  }
  return Object.keys(result).length ? result : undefined;
}

function save(name: string, data: unknown, mime = "application/json") {
  const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: mime }));
  const anchor = document.createElement("a"); anchor.href = url; anchor.download = name; anchor.click(); URL.revokeObjectURL(url);
}

export default function ThreatObjectInspector() {
  const [threat, setThreat] = useState<ThreatObject4D>(SIH_THREAT_OBJECT);
  const [query, setQuery] = useState(""); const [copied, setCopied] = useState(false);
  useEffect(() => { void fetch("/api/threats").then((r) => r.json()).then((data) => data.threat && setThreat(data.threat)); }, []);
  const filtered = useMemo(() => filterJson(threat as unknown as JsonValue, query.trim().toLowerCase()), [threat, query]);
  async function copy() { await navigator.clipboard.writeText(JSON.stringify(threat, null, 2)); setCopied(true); window.setTimeout(() => setCopied(false), 1600); }
  return <section className={`${styles.module} ${styles.panel}`}>
    <div className={styles.header}><div><div className={styles.eyebrow}>MACHINE-READABLE THREAT INTELLIGENCE · SCHEMA V1</div><h2>Persistent 4D threat object</h2><p>Location · intensity · trajectory · uncertainty · time — serialized for downstream GIS and emergency systems.</p></div><span className={styles.badge}><FileJson2 size={13}/>{threat.threat_id}</span></div>
    <div className={styles.pad}>
      <div className={styles.grid3}>
        <div className={styles.stat}><span>4D Spatiotemporal Extent</span><strong>4 Pressure Levels × 120 Forecast Hours</strong></div>
        <div className={styles.stat}><span>Footprint Area</span><strong>14,250 km²</strong><small className={styles.muted}>Reconstructed at 5 km</small></div>
        <div className={styles.stat}><span>Max Climatological EFI</span><strong>0.98</strong><small className={styles.muted}>Top 2% historical tail</small></div>
      </div>
      <div className={styles.buttonRow} style={{ margin: "14px 0" }}>
        <label className={styles.input} style={{ display: "flex", alignItems: "center", gap: 7 }}><Search size={13}/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Filter centroid_trajectory…" style={{ border: 0, outline: 0, color: "inherit", background: "transparent", width: "100%" }}/></label>
        <button className={styles.button} onClick={() => void copy()}>{copied ? <Check size={13}/> : <Clipboard size={13}/>} {copied ? "Copied!" : "Copy JSON"}</button>
        <button className={styles.button} onClick={() => save(`${threat.threat_id}.json`, threat)}><Download size={13}/> Download .json</button>
        <button className={`${styles.button} ${styles.primary}`} onClick={() => save(`${threat.threat_id}.geojson`, threatObjectToGeoJSON(threat), "application/geo+json")}><Download size={13}/> Export GeoJSON</button>
      </div>
      <div className={styles.json}>{filtered === undefined ? <span className={styles.muted}>No matching keys or values.</span> : <TreeNode value={filtered} forceOpen={Boolean(query)}/>}</div>
    </div>
  </section>;
}
