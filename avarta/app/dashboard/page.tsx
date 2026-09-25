"use client";

import { useState } from "react";
import DashboardHeader from "@/components/dashboard/Header";
import ThreatList from "@/components/dashboard/ThreatList";
import InteractiveMap from "@/components/dashboard/InteractiveMap";
import DownscalingViewer from "@/components/dashboard/DownscalingViewer";
import PhysicsGuardInspector from "@/components/dashboard/PhysicsGuardInspector";
import ImpactPanel from "@/components/dashboard/ImpactPanel";
import AgentCopilot from "@/components/dashboard/AgentCopilot";
import { MOCK_THREATS } from "@/lib/mock-weather-data";
import { Layers, Sparkles, ShieldCheck, Bot, Compass, Activity, Database } from "lucide-react";

export default function DashboardPage() {
  const [selectedThreatId, setSelectedThreatId] = useState<string>(MOCK_THREATS[0].id);
  const [activeCenterTab, setActiveCenterTab] = useState<"map" | "downscaling" | "physics" | "agent">("map");

  const selectedThreat = MOCK_THREATS.find((t) => t.id === selectedThreatId) || MOCK_THREATS[0];

  return (
    <div className="flex flex-col min-h-screen bg-[var(--canvas)] text-[var(--ink)] font-sans antialiased relative overflow-x-hidden selection:bg-[#f4c5a8]/40 selection:text-[var(--ink)]">
      {/* Editorial Pastel Atmospheric Atmosphere (Drifting Orbs) */}
      <div className="orb orb-mint -top-40 -left-40 pointer-events-none fixed" />
      <div className="orb orb-sky top-1/3 -right-40 pointer-events-none fixed" />
      <div className="orb orb-peach -bottom-40 left-1/3 pointer-events-none fixed" />

      {/* Top Editorial Telemetry Header */}
      <DashboardHeader activeThreatCount={MOCK_THREATS.length} />

      {/* Main Editorial Workspace */}
      <div className="flex-1 flex flex-col xl:flex-row overflow-hidden relative z-10">
        {/* Left Sidebar: 4D Threat Objects Dossier */}
        <ThreatList
          threats={MOCK_THREATS}
          selectedThreatId={selectedThreatId}
          onSelectThreat={(id) => setSelectedThreatId(id)}
        />

        {/* Center Editorial Stage */}
        <div className="flex-1 flex flex-col min-w-0 border-r border-stone-200/80 bg-white/40 backdrop-blur-sm">
          {/* Editorial Stage Navigation Strip */}
          <div className="flex items-center justify-between px-6 py-2.5 bg-white/80 border-b border-stone-200/80 backdrop-blur-md">
            <div className="flex items-center gap-1.5 p-1 bg-stone-100/80 rounded-full border border-stone-200/60 shadow-xs">
              <button
                onClick={() => setActiveCenterTab("map")}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer ${
                  activeCenterTab === "map"
                    ? "bg-[var(--ink)] text-white shadow-xs"
                    : "text-stone-600 hover:text-stone-900 hover:bg-white/60"
                }`}
              >
                <Layers size={13} className={activeCenterTab === "map" ? "text-white" : "text-stone-500"} />
                <span>4D Corridor</span>
              </button>

              <button
                onClick={() => setActiveCenterTab("downscaling")}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer ${
                  activeCenterTab === "downscaling"
                    ? "bg-[var(--ink)] text-white shadow-xs"
                    : "text-stone-600 hover:text-stone-900 hover:bg-white/60"
                }`}
              >
                <Sparkles size={13} className={activeCenterTab === "downscaling" ? "text-white" : "text-stone-500"} />
                <span>12km → 5km Downscaler</span>
              </button>

              <button
                onClick={() => setActiveCenterTab("physics")}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer ${
                  activeCenterTab === "physics"
                    ? "bg-[var(--ink)] text-white shadow-xs"
                    : "text-stone-600 hover:text-stone-900 hover:bg-white/60"
                }`}
              >
                <ShieldCheck size={13} className={activeCenterTab === "physics" ? "text-white" : "text-stone-500"} />
                <span>Physics Conservation</span>
              </button>

              <button
                onClick={() => setActiveCenterTab("agent")}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer ${
                  activeCenterTab === "agent"
                    ? "bg-[var(--ink)] text-white shadow-xs"
                    : "text-stone-600 hover:text-stone-900 hover:bg-white/60"
                }`}
              >
                <Bot size={13} className={activeCenterTab === "agent" ? "text-white" : "text-stone-500"} />
                <span>Copilot Synthesis</span>
              </button>
            </div>

            {/* Editorial Status Tag */}
            <div className="hidden lg:flex items-center gap-2 text-xs text-stone-500 font-mono tracking-tight">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span>ERA5 Climatology Engine Synced</span>
            </div>
          </div>

          {/* Dynamic Editorial Content View */}
          <div className="flex-1 overflow-y-auto">
            {activeCenterTab === "map" && <InteractiveMap threat={selectedThreat} />}
            {activeCenterTab === "downscaling" && (
              <DownscalingViewer data={selectedThreat.downscaling} />
            )}
            {activeCenterTab === "physics" && (
              <PhysicsGuardInspector guard={selectedThreat.physics_guard} />
            )}
            {activeCenterTab === "agent" && <AgentCopilot threat={selectedThreat} />}
          </div>
        </div>

        {/* Right Sidebar: 5km Impact Dossier & CAP Protocol */}
        <ImpactPanel impact={selectedThreat.impact} />
      </div>
    </div>
  );
}
