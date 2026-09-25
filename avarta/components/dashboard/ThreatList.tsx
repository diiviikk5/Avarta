"use client";

import { ThreatObject } from "@/types/threat";
import { Wind, CloudRain, Flame, AlertCircle, ArrowUpRight } from "lucide-react";

interface ThreatListProps {
  threats: ThreatObject[];
  selectedThreatId: string;
  onSelectThreat: (id: string) => void;
}

export default function ThreatList({
  threats,
  selectedThreatId,
  onSelectThreat,
}: ThreatListProps) {
  const getHazardIcon = (type: string) => {
    switch (type) {
      case "CYCLONE":
        return <Wind size={15} className="text-[#0c0a09]" />;
      case "CLOUDBURST":
        return <CloudRain size={15} className="text-[#0c0a09]" />;
      case "HEAT_DOME":
        return <Flame size={15} className="text-[#0c0a09]" />;
      default:
        return <AlertCircle size={15} className="text-[#0c0a09]" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "INTENSIFYING":
        return "bg-[#f4c5a8]/35 text-[#0c0a09] border-[#f4c5a8]";
      case "PEAK":
        return "bg-[#e8b8c4]/35 text-[#0c0a09] border-[#e8b8c4]";
      case "FORMING":
        return "bg-[#a8c8e8]/35 text-[#0c0a09] border-[#a8c8e8]";
      default:
        return "bg-[#f0efed] text-[#4e4e4e] border-[#e7e5e4]";
    }
  };

  return (
    <aside className="w-full lg:w-[360px] shrink-0 border-r border-[#e7e5e4] bg-[#fafafa] flex flex-col justify-between">
      <div>
        {/* Section Header */}
        <div className="p-5 border-b border-[#e7e5e4] flex items-center justify-between">
          <div>
            <h2
              className="text-lg font-light text-[#0c0a09] tracking-tight"
              style={{ fontFamily: "var(--font-serif)" }}
            >
              Active 4D Threat Objects
            </h2>
            <p className="text-xs text-[#777169] mt-0.5">
              Isolated anomalies tracked across 3–10 day ensemble runs
            </p>
          </div>
          <span className="text-[11px] font-medium px-2.5 py-1 rounded-full bg-[#f0efed] text-[#292524] border border-[#e7e5e4]">
            {threats.length} Tracked
          </span>
        </div>

        {/* Threat Cards List */}
        <div className="p-4 space-y-3">
          {threats.map((threat) => {
            const isSelected = threat.id === selectedThreatId;
            return (
              <button
                key={threat.id}
                onClick={() => onSelectThreat(threat.id)}
                className={`w-full text-left p-4 rounded-[16px] transition-all duration-200 cursor-pointer relative ${
                  isSelected
                    ? "bg-white border-2 border-[#0c0a09] shadow-[0_8px_24px_rgba(0,0,0,0.06)]"
                    : "bg-white border border-[#e7e5e4] hover:border-[#d6d3d1] shadow-[0_2px_8px_rgba(0,0,0,0.02)]"
                }`}
              >
                {/* ID & Status Pill */}
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-mono font-medium text-[#777169]">
                    {threat.id}
                  </span>
                  <span
                    className={`text-[10px] font-medium tracking-wide uppercase px-2.5 py-0.5 rounded-full border ${getStatusBadge(
                      threat.status
                    )}`}
                  >
                    {threat.status}
                  </span>
                </div>

                {/* Threat Name */}
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-[#f0efed] flex items-center justify-center shrink-0">
                      {getHazardIcon(threat.hazard_type)}
                    </div>
                    <h3
                      className="text-base font-normal text-[#0c0a09] tracking-tight leading-snug"
                      style={{ fontFamily: "var(--font-serif)" }}
                    >
                      {threat.name}
                    </h3>
                  </div>
                  <ArrowUpRight
                    size={15}
                    className={`shrink-0 transition-transform ${
                      isSelected ? "text-[#0c0a09] translate-x-0.5 -translate-y-0.5" : "text-[#a8a29e]"
                    }`}
                  />
                </div>

                {/* Key Meteorological Indicators */}
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#f0efed] text-xs">
                  <div>
                    <span className="text-[10px] text-[#777169] block font-medium">EXTREME FORECAST INDEX</span>
                    <span className="text-sm font-light text-[#0c0a09]">
                      +{threat.efi_index.toFixed(2)}{" "}
                      <span className="text-[11px] text-[#777169]">({threat.historical_percentile}th %ile)</span>
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-[#777169] block font-medium">PEAK INTENSITY</span>
                    <span className="text-sm font-light text-[#0c0a09]">
                      {threat.intensity_current}{" "}
                      <span className="text-[11px] text-[#777169]">{threat.intensity_unit}</span>
                    </span>
                  </div>
                </div>

                {/* Threat-First Compute Allocation Tag */}
                <div className="mt-3 flex items-center justify-between text-[11px] text-[#777169] bg-[#fafafa] px-2.5 py-1.5 rounded-lg border border-[#f0efed]">
                  <span>Bounding Box: {threat.compute_region.min_lat}°N, {threat.compute_region.min_lon}°E</span>
                  <span className="text-[#0c0a09] font-medium">+{threat.compute_region.grid_cells_saved_percent}% efficiency</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Editorial Footer Note */}
      <div className="p-5 border-t border-[#e7e5e4] bg-[#f5f5f5]">
        <div className="flex items-center justify-between text-xs text-[#4e4e4e] mb-1">
          <span className="font-medium text-[#0c0a09]">Threat-First Compute Engine</span>
          <span className="text-[#16a34a] font-medium">Active</span>
        </div>
        <p className="text-[11px] text-[#777169] leading-relaxed">
          High-resolution 5 km reconstruction is dynamically focused strictly around evolving 4D threat objects, omitting redundant global computation.
        </p>
      </div>
    </aside>
  );
}
