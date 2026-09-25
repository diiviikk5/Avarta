"use client";

import { useState } from "react";
import { ImpactFootprint } from "@/types/threat";
import { MapPin, Users, Clock, Check, Copy, ShieldAlert } from "lucide-react";

interface ImpactPanelProps {
  impact: ImpactFootprint;
}

export default function ImpactPanel({ impact }: ImpactPanelProps) {
  const [copiedCap, setCopiedCap] = useState(false);
  const [showJson, setShowJson] = useState(false);

  const capPayload = {
    identifier: `CAP-AVARTA-${impact.threat_id}-${Date.now().toString().slice(-6)}`,
    sender: "avarta.intelligence@ncmrwf.gov.in",
    sent: new Date().toISOString(),
    status: "Actual",
    msgType: "Alert",
    scope: "Public",
    info: {
      category: "Met",
      event: "Hyper-Localized Extreme Weather Anomaly",
      urgency: impact.estimated_arrival_hours <= 12 ? "Immediate" : "Expected",
      severity: "Extreme",
      certainty: "Observed & Ensemble Confirmed",
      eventCode: { valueName: "AVARTA_5KM_ID", value: impact.threat_id },
      headline: `Targeted 5 km Pinpoint Warning: ${impact.primary_zone_name}`,
      description: `Avarta 5km generative downscaling detects localized peak of ${impact.peak_metric_value} ${impact.peak_metric_unit}. Affected population estimated at ${impact.exposed_population.toLocaleString()}.`,
      instruction: `Execute ${impact.ndrf_recommended_readiness}. Pre-position disaster relief teams.`,
      area: {
        areaDesc: impact.primary_zone_name,
        circle: `${impact.coordinates.lat},${impact.coordinates.lon},5.0`
      }
    }
  };

  const copyCapAlert = () => {
    navigator.clipboard.writeText(JSON.stringify(capPayload, null, 2));
    setCopiedCap(true);
    setTimeout(() => setCopiedCap(false), 2000);
  };

  return (
    <aside className="w-full lg:w-[320px] shrink-0 border-l border-stone-800/80 bg-[#110f0e] flex flex-col justify-between text-stone-100">
      <div className="p-5 space-y-5">
        {/* Section Header */}
        <div className="flex items-center justify-between pb-3 border-b border-stone-800/80">
          <div>
            <h2
              className="text-base font-light text-white tracking-tight"
              style={{ fontFamily: "var(--font-serif)" }}
            >
              5 km Impact Intelligence
            </h2>
            <p className="text-[11px] text-stone-500 font-mono mt-0.5">
              Pinpoint Civil Defense Zone
            </p>
          </div>

          <span className="text-[9px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-full bg-rose-950/80 text-rose-300 border border-rose-800/50">
            {impact.ndrf_recommended_readiness}
          </span>
        </div>

        {/* Primary Impact Location Card */}
        <div className="bg-[#161412] p-4 rounded-xl border border-stone-800/70 space-y-2">
          <div className="flex items-center gap-1.5 text-xs text-stone-400">
            <MapPin size={13} className="text-rose-400" />
            <span className="font-mono text-[10px] uppercase">Primary Strike Zone</span>
          </div>
          <h3
            className="text-base font-medium text-white"
            style={{ fontFamily: "var(--font-serif)" }}
          >
            {impact.primary_zone_name}
          </h3>
          <span className="text-xs text-stone-400 font-mono block">
            {impact.coordinates.lat}°N, {impact.coordinates.lon}°E (5 km Mesh)
          </span>
        </div>

        {/* Core Metrics: ETA & Population */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-[#161412] p-3.5 rounded-xl border border-stone-800/70">
            <div className="flex items-center gap-1.5 text-stone-400 mb-1">
              <Clock size={12} />
              <span className="text-[10px] font-mono uppercase">ETA Arrival</span>
            </div>
            <span className="text-lg font-light text-white font-serif">
              T+{impact.estimated_arrival_hours}h
            </span>
          </div>

          <div className="bg-[#161412] p-3.5 rounded-xl border border-stone-800/70">
            <div className="flex items-center gap-1.5 text-stone-400 mb-1">
              <Users size={12} />
              <span className="text-[10px] font-mono uppercase">Exposed Pop</span>
            </div>
            <span className="text-lg font-light text-white font-serif">
              {(impact.exposed_population / 1000000).toFixed(2)}M
            </span>
          </div>
        </div>

        {/* Critical Assets in 5km Zone */}
        <div className="bg-[#161412] p-4 rounded-xl border border-stone-800/70 space-y-2">
          <span className="text-[10px] font-mono uppercase text-stone-400 block">
            Key Infrastructure At Risk
          </span>
          <div className="space-y-1.5 text-xs text-stone-300">
            {impact.critical_infrastructure.slice(0, 3).map((item, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <span className="w-1 h-1 rounded-full bg-emerald-400 shrink-0" />
                <span className="truncate">{item}</span>
              </div>
            ))}
          </div>
        </div>

        {/* CAP 1.2 Action */}
        <div className="space-y-2 pt-2">
          <button
            onClick={copyCapAlert}
            className="w-full py-2.5 px-4 rounded-full text-xs font-semibold bg-white hover:bg-stone-200 text-black transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm"
          >
            {copiedCap ? <Check size={14} /> : <Copy size={14} />}
            <span>{copiedCap ? "CAP 1.2 Payload Copied" : "Copy CAP 1.2 Alert Payload"}</span>
          </button>

          <button
            onClick={() => setShowJson(!showJson)}
            className="w-full text-center text-[11px] font-mono text-stone-400 hover:text-white cursor-pointer py-1"
          >
            {showJson ? "Hide JSON Schema" : "Inspect Raw OASIS JSON"}
          </button>

          {showJson && (
            <div className="bg-black/80 p-3 rounded-lg border border-stone-800 text-[10px] font-mono text-stone-300 max-h-40 overflow-y-auto">
              <pre>{JSON.stringify(capPayload, null, 2)}</pre>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
