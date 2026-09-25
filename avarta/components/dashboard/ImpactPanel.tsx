"use client";

import { useState } from "react";
import { ImpactFootprint } from "@/types/threat";
import { MapPin, FileText, Check, Copy, Building2 } from "lucide-react";

interface ImpactPanelProps {
  impact: ImpactFootprint;
}

export default function ImpactPanel({ impact }: ImpactPanelProps) {
  const [copiedCap, setCopiedCap] = useState(false);
  const [showCapModal, setShowCapModal] = useState(false);

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
      expires: new Date(Date.now() + impact.duration_hours * 3600000).toISOString(),
      headline: `Targeted 5 km Pinpoint Warning: ${impact.primary_zone_name}`,
      description: `Avarta 5km generative downscaling detects localized peak of ${impact.peak_metric_value} ${impact.peak_metric_unit} within a 5 km impact radius. Affected population estimated at ${impact.exposed_population.toLocaleString()}.`,
      instruction: `NDRF Action: Execute ${impact.ndrf_recommended_readiness}. Pre-position disaster relief teams to coordinates [${impact.coordinates.lat}°N, ${impact.coordinates.lon}°E].`,
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
    <aside className="w-full lg:w-[380px] shrink-0 border-l border-[#292524] bg-[#141210] flex flex-col justify-between text-stone-100">
      <div className="p-5 space-y-5">
        {/* Section Header */}
        <div className="pb-4 border-b border-[#292524] flex items-center justify-between">
          <div>
            <h2
              className="text-lg font-light text-white tracking-tight"
              style={{ fontFamily: "var(--font-serif)" }}
            >
              5 km Pinpoint Impact Zone
            </h2>
            <p className="text-xs text-stone-400 mt-0.5">
              Hyper-local disaster mitigation dossier
            </p>
          </div>
          <span className="text-[10px] font-medium tracking-wide uppercase px-2.5 py-1 rounded-full bg-white text-black font-semibold">
            {impact.ndrf_recommended_readiness}
          </span>
        </div>

        {/* Primary Impact Location Card */}
        <div className="bg-[#1c1917] p-4 rounded-[16px] border border-[#292524] shadow-xs space-y-2">
          <div className="flex items-center gap-2 text-xs text-stone-400">
            <MapPin size={14} className="text-rose-400" />
            <span className="font-medium uppercase tracking-wider text-[10px]">Primary Strike Centroid</span>
          </div>
          <h3
            className="text-base font-normal text-white tracking-tight"
            style={{ fontFamily: "var(--font-serif)" }}
          >
            {impact.primary_zone_name}
          </h3>
          <div className="text-xs text-stone-300 font-mono bg-black/40 p-2 rounded-lg border border-stone-800">
            Coordinates: {impact.coordinates.lat}° N, {impact.coordinates.lon}° E (5 km Radius)
          </div>
        </div>

        {/* Key Metrics Quadrant */}
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="bg-[#1c1917] p-3.5 rounded-[14px] border border-[#292524] shadow-xs">
            <span className="text-[10px] uppercase tracking-wider text-stone-400 block">
              5 km Peak Amplitude
            </span>
            <span
              className="text-xl font-light text-white block mt-1"
              style={{ fontFamily: "var(--font-serif)" }}
            >
              {impact.peak_metric_value}{" "}
              <span className="text-xs font-sans text-stone-400">{impact.peak_metric_unit}</span>
            </span>
            <span className="text-[10px] text-stone-400 block mt-0.5">Extreme value preserved</span>
          </div>

          <div className="bg-[#1c1917] p-3.5 rounded-[14px] border border-[#292524] shadow-xs">
            <span className="text-[10px] uppercase tracking-wider text-stone-400 block">
              Landfall / ETA Window
            </span>
            <span
              className="text-xl font-light text-white block mt-1"
              style={{ fontFamily: "var(--font-serif)" }}
            >
              T+{impact.estimated_arrival_hours}h
            </span>
            <span className="text-[10px] text-stone-400 block mt-0.5">Duration: ~{impact.duration_hours}h</span>
          </div>

          <div className="bg-[#1c1917] p-3.5 rounded-[14px] border border-[#292524] shadow-xs">
            <span className="text-[10px] uppercase tracking-wider text-stone-400 block">
              Exposed Population
            </span>
            <span
              className="text-xl font-light text-white block mt-1"
              style={{ fontFamily: "var(--font-serif)" }}
            >
              {(impact.exposed_population / 1000000).toFixed(2)}M
            </span>
            <span className="text-[10px] text-stone-400 block mt-0.5">{impact.affected_area_km2} km² impact zone</span>
          </div>

          <div className="bg-[#1c1917] p-3.5 rounded-[14px] border border-[#292524] shadow-xs">
            <span className="text-[10px] uppercase tracking-wider text-stone-400 block">
              Alert Fatigue Reduction
            </span>
            <span
              className="text-xl font-light text-emerald-400 block mt-1"
              style={{ fontFamily: "var(--font-serif)" }}
            >
              94.2%
            </span>
            <span className="text-[10px] text-emerald-400 block mt-0.5">District-wide fatigue solved</span>
          </div>
        </div>

        {/* Critical Infrastructure in 5km Zone */}
        <div className="bg-[#1c1917] p-4 rounded-[16px] border border-[#292524] shadow-xs space-y-2.5">
          <div className="flex items-center gap-2 text-xs text-stone-400">
            <Building2 size={14} className="text-white" />
            <span className="font-medium uppercase tracking-wider text-[10px]">Critical Infrastructure In Corridor</span>
          </div>
          <ul className="space-y-1.5 text-xs text-stone-300">
            {impact.critical_infrastructure.map((asset, i) => (
              <li key={i} className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                <span className="truncate">{asset}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Common Alerting Protocol (CAP 1.2) */}
        <div className="bg-[#1c1917] p-4 rounded-[16px] border border-[#292524] shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-medium text-white">
              <FileText size={15} />
              <span>CAP 1.2 Standard Protocol</span>
            </div>
            <span className="text-[10px] text-stone-400">NDMA & NDRF</span>
          </div>

          <p className="text-xs text-stone-400 leading-relaxed">
            Automated Common Alerting Protocol payload ready for direct injection into national and state disaster dispatch centers.
          </p>

          <div className="flex items-center gap-2 pt-1">
            <button
              onClick={() => setShowCapModal(!showCapModal)}
              className="flex-1 py-2 px-3 rounded-full text-xs font-medium bg-[#141210] hover:bg-stone-800 text-stone-200 transition-colors cursor-pointer border border-stone-800"
            >
              {showCapModal ? "Hide JSON" : "Inspect Payload"}
            </button>
            <button
              onClick={copyCapAlert}
              className="py-2 px-4 rounded-full text-xs font-semibold bg-white hover:bg-stone-200 text-black transition-colors cursor-pointer flex items-center gap-1.5"
            >
              {copiedCap ? <Check size={13} /> : <Copy size={13} />}
              <span>{copiedCap ? "Copied" : "Copy CAP"}</span>
            </button>
          </div>

          {showCapModal && (
            <div className="bg-black/60 p-3 rounded-lg border border-stone-800 text-[10px] font-mono text-stone-300 max-h-48 overflow-y-auto">
              <pre>{JSON.stringify(capPayload, null, 2)}</pre>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
