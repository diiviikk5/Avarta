"use client";

import { ThreatObject } from "@/types/threat";
import { Wind, CloudRain, Flame, AlertCircle } from "lucide-react";

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
        return <Wind size={15} className="text-sky-400" />;
      case "CLOUDBURST":
        return <CloudRain size={15} className="text-emerald-400" />;
      case "HEAT_DOME":
        return <Flame size={15} className="text-rose-400" />;
      default:
        return <AlertCircle size={15} className="text-amber-400" />;
    }
  };

  return (
    <aside className="w-full lg:w-[320px] shrink-0 border-r border-stone-800/80 bg-[#110f0e] flex flex-col justify-between">
      <div className="p-4 space-y-4">
        {/* Section Header */}
        <div className="px-2 pt-2 pb-1 flex items-center justify-between">
          <h2
            className="text-base font-light text-white tracking-tight"
            style={{ fontFamily: "var(--font-serif)" }}
          >
            4D Threat Objects
          </h2>
          <span className="text-[10px] font-mono uppercase tracking-wider text-stone-500">
            {threats.length} Tracked
          </span>
        </div>

        {/* Threat Cards List */}
        <div className="space-y-2.5">
          {threats.map((threat) => {
            const isSelected = threat.id === selectedThreatId;
            return (
              <button
                key={threat.id}
                onClick={() => onSelectThreat(threat.id)}
                className={`w-full text-left p-4 rounded-xl transition-all duration-200 cursor-pointer relative ${
                  isSelected
                    ? "bg-[#1f1b18] border border-white/40 shadow-lg shadow-black/40 ring-1 ring-white/20"
                    : "bg-[#161412] border border-stone-800/70 hover:border-stone-700/90 text-stone-300"
                }`}
              >
                {/* Header: Hazard Icon + Name + Status */}
                <div className="flex items-center justify-between gap-2 mb-2.5">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-6 h-6 rounded-md bg-stone-800/60 flex items-center justify-center shrink-0">
                      {getHazardIcon(threat.hazard_type)}
                    </div>
                    <span
                      className="text-sm font-medium text-white truncate"
                      style={{ fontFamily: "var(--font-serif)" }}
                    >
                      {threat.name}
                    </span>
                  </div>

                  <span
                    className={`text-[9px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-full shrink-0 ${
                      threat.status === "PEAK"
                        ? "bg-rose-950/80 text-rose-300 border border-rose-800/50"
                        : threat.status === "INTENSIFYING"
                        ? "bg-amber-950/80 text-amber-300 border border-amber-800/50"
                        : "bg-stone-800 text-stone-300"
                    }`}
                  >
                    {threat.status}
                  </span>
                </div>

                {/* Key Numbers */}
                <div className="flex items-center justify-between text-xs pt-2 border-t border-stone-800/60">
                  <div>
                    <span className="text-[10px] text-stone-500 block uppercase font-mono">Intensity</span>
                    <span className="text-sm font-light text-white">
                      {threat.intensity_current}{" "}
                      <span className="text-[10px] text-stone-400 font-sans">{threat.intensity_unit}</span>
                    </span>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] text-stone-500 block uppercase font-mono">Anomaly Index</span>
                    <span className="text-sm font-mono text-emerald-400">
                      EFI +{threat.efi_index.toFixed(2)}
                    </span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Subtle Bottom Status */}
      <div className="p-4 border-t border-stone-800/60 text-[11px] font-mono text-stone-500 flex items-center justify-between">
        <span>ERA5 Reference Mesh</span>
        <span className="text-emerald-400">Synchronized</span>
      </div>
    </aside>
  );
}
