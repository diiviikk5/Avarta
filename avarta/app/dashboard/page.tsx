"use client";

import { useState } from "react";
import DashboardHeader from "@/components/dashboard/Header";
import ThreatList from "@/components/dashboard/ThreatList";
import TuiConsoleExplainer from "@/components/dashboard/TuiConsoleExplainer";
import RealIMDTrainingViewer from "@/components/dashboard/RealIMDTrainingViewer";
import DownscalingViewer from "@/components/dashboard/DownscalingViewer";
import PhysicsGuardInspector from "@/components/dashboard/PhysicsGuardInspector";
import ImpactPanel from "@/components/dashboard/ImpactPanel";
import AgentCopilot from "@/components/dashboard/AgentCopilot";
import FoundationModelsExplorer from "@/components/dashboard/FoundationModelsExplorer";
import DatasetHubViewer from "@/components/dashboard/DatasetHubViewer";
import { MOCK_THREATS } from "@/lib/mock-weather-data";
import { Terminal, Database, Sparkles, ShieldCheck, Bot, Cpu, Layers } from "lucide-react";

export default function DashboardPage() {
  const [selectedThreatId, setSelectedThreatId] = useState<string>(MOCK_THREATS[0].id);
  const [activeCenterTab, setActiveCenterTab] = useState<"tui" | "training" | "downscaling" | "physics" | "benchmarks" | "models" | "agent">("tui");

  const selectedThreat = MOCK_THREATS.find((t) => t.id === selectedThreatId) || MOCK_THREATS[0];

  return (
    <div className="flex flex-col min-h-screen bg-[#0c0a09] text-[#f5f5f5] font-sans antialiased relative overflow-x-hidden selection:bg-[#f4c5a8]/25 selection:text-white">
      {/* Background Luminescence */}
      <div className="orb orb-mint -top-40 -left-40 pointer-events-none fixed opacity-15" />
      <div className="orb orb-sky top-1/3 -right-40 pointer-events-none fixed opacity-15" />
      <div className="orb orb-peach -bottom-40 left-1/3 pointer-events-none fixed opacity-15" />

      {/* Top Telemetry Header */}
      <DashboardHeader activeThreatCount={MOCK_THREATS.length} />

      {/* Main Mission Workspace */}
      <div className="flex-1 flex flex-col xl:flex-row overflow-hidden relative z-10">
        {/* Left Sidebar: 4D Threat Objects Dossier */}
        <ThreatList
          threats={MOCK_THREATS}
          selectedThreatId={selectedThreatId}
          onSelectThreat={(id) => setSelectedThreatId(id)}
        />

        {/* Center Operational Stage */}
        <div className="flex-1 flex flex-col min-w-0 border-r border-[#292524] bg-[#0c0a09]/80 backdrop-blur-sm">
          {/* Navigation Strip */}
          <div className="flex items-center justify-between px-6 py-2.5 bg-[#141210]/95 border-b border-[#292524] backdrop-blur-md overflow-x-auto">
            <div className="flex items-center gap-1.5 p-1 bg-[#1c1917] rounded-full border border-stone-800 shadow-xs shrink-0">
              <button
                onClick={() => setActiveCenterTab("tui")}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer ${
                  activeCenterTab === "tui"
                    ? "bg-cyan-400 text-black shadow-xs font-bold"
                    : "text-stone-400 hover:text-white hover:bg-stone-800/60"
                }`}
              >
                <Terminal size={13} className={activeCenterTab === "tui" ? "text-black" : "text-cyan-400"} />
                <span>TUI Mission Control</span>
              </button>

              <button
                onClick={() => setActiveCenterTab("training")}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer ${
                  activeCenterTab === "training"
                    ? "bg-white text-black shadow-xs font-semibold"
                    : "text-stone-400 hover:text-white hover:bg-stone-800/60"
                }`}
              >
                <Database size={13} className={activeCenterTab === "training" ? "text-black" : "text-emerald-400"} />
                <span>IMD 2025 Training & Data</span>
              </button>

              <button
                onClick={() => setActiveCenterTab("downscaling")}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer ${
                  activeCenterTab === "downscaling"
                    ? "bg-white text-black shadow-xs font-semibold"
                    : "text-stone-400 hover:text-white hover:bg-stone-800/60"
                }`}
              >
                <Sparkles size={13} className={activeCenterTab === "downscaling" ? "text-black" : "text-amber-400"} />
                <span>12km → 5km Downscaler</span>
              </button>

              <button
                onClick={() => setActiveCenterTab("physics")}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer ${
                  activeCenterTab === "physics"
                    ? "bg-white text-black shadow-xs font-semibold"
                    : "text-stone-400 hover:text-white hover:bg-stone-800/60"
                }`}
              >
                <ShieldCheck size={13} className={activeCenterTab === "physics" ? "text-black" : "text-teal-400"} />
                <span>Physics Conservation</span>
              </button>

              <button
                onClick={() => setActiveCenterTab("benchmarks")}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer ${
                  activeCenterTab === "benchmarks"
                    ? "bg-white text-black shadow-xs font-semibold"
                    : "text-stone-400 hover:text-white hover:bg-stone-800/60"
                }`}
              >
                <Layers size={13} className={activeCenterTab === "benchmarks" ? "text-black" : "text-stone-400"} />
                <span>SIH Lineage & Amphan</span>
              </button>

              <button
                onClick={() => setActiveCenterTab("models")}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer ${
                  activeCenterTab === "models"
                    ? "bg-white text-black shadow-xs font-semibold"
                    : "text-stone-400 hover:text-white hover:bg-stone-800/60"
                }`}
              >
                <Cpu size={13} className={activeCenterTab === "models" ? "text-black" : "text-stone-400"} />
                <span>Foundation Models</span>
              </button>

              <button
                onClick={() => setActiveCenterTab("agent")}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer ${
                  activeCenterTab === "agent"
                    ? "bg-white text-black shadow-xs font-semibold"
                    : "text-stone-400 hover:text-white hover:bg-stone-800/60"
                }`}
              >
                <Bot size={13} className={activeCenterTab === "agent" ? "text-black" : "text-stone-400"} />
                <span>Copilot Synthesis</span>
              </button>
            </div>

            {/* Ingestion & Training Live Badge */}
            <div className="hidden 2xl:flex items-center gap-2 text-xs text-stone-400 font-mono tracking-tight shrink-0 pl-4">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
              <span>IMD 2025 Model Synced (469.21 mm Peak)</span>
            </div>
          </div>

          {/* Dynamic Content Stage */}
          <div className="flex-1 overflow-y-auto">
            {activeCenterTab === "tui" && <TuiConsoleExplainer />}
            {activeCenterTab === "training" && <RealIMDTrainingViewer />}
            {activeCenterTab === "downscaling" && (
              <DownscalingViewer data={selectedThreat.downscaling} />
            )}
            {activeCenterTab === "physics" && (
              <PhysicsGuardInspector guard={selectedThreat.physics_guard} />
            )}
            {activeCenterTab === "benchmarks" && <DatasetHubViewer />}
            {activeCenterTab === "models" && <FoundationModelsExplorer />}
            {activeCenterTab === "agent" && <AgentCopilot threat={selectedThreat} />}
          </div>
        </div>

        {/* Right Sidebar: 5km Impact Dossier & CAP Protocol */}
        <ImpactPanel impact={selectedThreat.impact} />
      </div>
    </div>
  );
}
