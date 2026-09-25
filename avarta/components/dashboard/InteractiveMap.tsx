"use client";

import { useState, useEffect, useRef } from "react";
import { ThreatObject } from "@/types/threat";
import { Play, Pause, RotateCcw, Compass, Eye, SlidersHorizontal } from "lucide-react";

interface InteractiveMapProps {
  threat: ThreatObject;
}

export default function InteractiveMap({ threat }: InteractiveMapProps) {
  const [activeTimeStep, setActiveTimeStep] = useState(2); // default T+0
  const [isPlaying, setIsPlaying] = useState(false);
  const [showEnsembleMembers, setShowEnsembleMembers] = useState(true);
  const [showUncertaintyCorridor, setShowUncertaintyCorridor] = useState(true);
  const [showComputeRegion, setShowComputeRegion] = useState(true);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const timeSteps = threat.trajectory;

  // Auto-play scrubber animation
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isPlaying) {
      interval = setInterval(() => {
        setActiveTimeStep((prev) => (prev + 1) % timeSteps.length);
      }, 1600);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isPlaying, timeSteps.length]);

  // Project lat/lon to canvas pixels
  const project = (lat: number, lon: number, width: number, height: number) => {
    const minLat = 8;
    const maxLat = 36;
    const minLon = 68;
    const maxLon = 96;

    const x = ((lon - minLon) / (maxLon - minLon)) * width;
    const y = height - ((lat - minLat) / (maxLat - minLat)) * height;
    return { x, y };
  };

  // Render Canvas Map with Editorial Cartography
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // 1. Editorial Alabaster Canvas Background
    ctx.fillStyle = "#fbfaf8";
    ctx.fillRect(0, 0, width, height);

    // Subtle Ocean Tint
    ctx.fillStyle = "#f2f5f8";
    ctx.fillRect(0, 0, width, height);

    // 2. Graticule Lines (subtle hairlines)
    ctx.strokeStyle = "rgba(12, 10, 9, 0.04)";
    ctx.lineWidth = 1;
    for (let lat = 10; lat <= 35; lat += 5) {
      const p1 = project(lat, 68, width, height);
      const p2 = project(lat, 96, width, height);
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();

      ctx.fillStyle = "#a8a29e";
      ctx.font = "10px Inter, sans-serif";
      ctx.fillText(`${lat}° N`, 14, p1.y - 4);
    }
    for (let lon = 70; lon <= 95; lon += 5) {
      const p1 = project(8, lon, width, height);
      const p2 = project(36, lon, width, height);
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();

      ctx.fillStyle = "#a8a29e";
      ctx.font = "10px Inter, sans-serif";
      ctx.fillText(`${lon}° E`, p1.x + 4, height - 12);
    }

    // 3. Indian Subcontinent Coastline & Landmass
    const coastNodes = [
      { lat: 24.5, lon: 68.2 }, // Gujarat Kutch
      { lat: 22.8, lon: 69.5 },
      { lat: 20.8, lon: 70.4 }, // Saurashtra
      { lat: 21.6, lon: 72.5 }, // Gulf of Khambhat
      { lat: 18.9, lon: 72.8 }, // Mumbai
      { lat: 15.3, lon: 73.8 }, // Goa
      { lat: 12.9, lon: 74.8 }, // Mangalore
      { lat: 9.9, lon: 76.2 },  // Kochi
      { lat: 8.1, lon: 77.5 },  // Kanyakumari
      { lat: 9.3, lon: 79.1 },  // Rameswaram
      { lat: 13.1, lon: 80.3 }, // Chennai
      { lat: 16.5, lon: 82.2 }, // Machilipatnam
      { lat: 17.7, lon: 83.3 }, // Visakhapatnam
      { lat: 19.8, lon: 85.8 }, // Puri
      { lat: 21.6, lon: 87.5 }, // Digha / West Bengal
      { lat: 22.2, lon: 89.2 }, // Sundarbans
      { lat: 22.8, lon: 91.8 }  // Chittagong
    ];

    // Landmass Fill
    ctx.fillStyle = "#f7f6f3";
    ctx.beginPath();
    coastNodes.forEach((pt, i) => {
      const p = project(pt.lat, pt.lon, width, height);
      if (i === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    });
    // Close towards North-West land interior
    const inlandNW = project(35, 68.2, width, height);
    const inlandNE = project(35, 91.8, width, height);
    ctx.lineTo(inlandNE.x, inlandNE.y);
    ctx.lineTo(inlandNW.x, inlandNW.y);
    ctx.closePath();
    ctx.fill();

    // Coastline Hairline
    ctx.strokeStyle = "#c8c4be";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    coastNodes.forEach((pt, i) => {
      const p = project(pt.lat, pt.lon, width, height);
      if (i === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    });
    ctx.stroke();

    // 4. Threat Compute Region (Quiet Architectural Box)
    if (showComputeRegion) {
      const { min_lat, max_lat, min_lon, max_lon } = threat.compute_region;
      const nw = project(max_lat, min_lon, width, height);
      const se = project(min_lat, max_lon, width, height);
      const boxW = se.x - nw.x;
      const boxH = se.y - nw.y;

      // Soft pastel atmospheric tint (Sky orb token #a8c8e8)
      ctx.fillStyle = "rgba(168, 200, 232, 0.12)";
      ctx.fillRect(nw.x, nw.y, boxW, boxH);

      ctx.strokeStyle = "rgba(41, 37, 36, 0.35)";
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.strokeRect(nw.x, nw.y, boxW, boxH);
      ctx.setLineDash([]);

      ctx.fillStyle = "#292524";
      ctx.font = "500 10px Inter, sans-serif";
      ctx.fillText("5 km Threat-First Compute Region", nw.x + 8, nw.y + 16);
      ctx.fillStyle = "#777169";
      ctx.font = "400 9px Inter, sans-serif";
      ctx.fillText(`Dynamically bounded: ${boxW.toFixed(0)}×${boxH.toFixed(0)} px`, nw.x + 8, nw.y + 28);
    }

    // 5. Uncertainty Corridor (Soft Peach/Lavender atmospheric envelope)
    if (showUncertaintyCorridor) {
      const leftBoundary: { x: number; y: number }[] = [];
      const rightBoundary: { x: number; y: number }[] = [];

      timeSteps.forEach((step, idx) => {
        const pt = project(step.lat, step.lon, width, height);
        const rPx = (step.uncertainty_radius_km / 111) * (height / (36 - 8));

        let dx = 0;
        let dy = -1;
        if (idx < timeSteps.length - 1) {
          const nextPt = project(timeSteps[idx + 1].lat, timeSteps[idx + 1].lon, width, height);
          dx = nextPt.x - pt.x;
          dy = nextPt.y - pt.y;
          const len = Math.sqrt(dx * dx + dy * dy) || 1;
          dx /= len;
          dy /= len;
        }

        const px = -dy * rPx;
        const py = dx * rPx;
        leftBoundary.push({ x: pt.x + px, y: pt.y + py });
        rightBoundary.push({ x: pt.x - px, y: pt.y - py });
      });

      // Atmospheric soft peach bloom
      ctx.fillStyle = "rgba(244, 197, 168, 0.22)";
      ctx.beginPath();
      leftBoundary.forEach((p, i) => {
        if (i === 0) ctx.moveTo(p.x, p.y);
        else ctx.lineTo(p.x, p.y);
      });
      for (let i = rightBoundary.length - 1; i >= 0; i--) {
        ctx.lineTo(rightBoundary[i].x, rightBoundary[i].y);
      }
      ctx.closePath();
      ctx.fill();

      ctx.strokeStyle = "rgba(244, 197, 168, 0.75)";
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    // 6. Ensemble Member Trajectories (Thin editorial hairlines)
    if (showEnsembleMembers) {
      const ensembleColors = [
        "rgba(100, 116, 139, 0.5)",
        "rgba(148, 163, 184, 0.6)",
        "rgba(71, 85, 105, 0.4)",
        "rgba(120, 113, 108, 0.5)",
        "rgba(168, 162, 158, 0.5)",
        "rgba(82, 82, 91, 0.4)"
      ];

      threat.ensemble_members.forEach((ens, i) => {
        ctx.strokeStyle = ensembleColors[i % ensembleColors.length];
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ens.trajectory.forEach((pt, j) => {
          const p = project(pt.lat, pt.lon, width, height);
          if (j === 0) ctx.moveTo(p.x, p.y);
          else ctx.lineTo(p.x, p.y);
        });
        ctx.stroke();
      });
    }

    // 7. Consensus Trajectory (Warm Near-Black Ink)
    ctx.strokeStyle = "#0c0a09";
    ctx.lineWidth = 2.0;
    ctx.beginPath();
    timeSteps.forEach((pt, i) => {
      const p = project(pt.lat, pt.lon, width, height);
      if (i === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    });
    ctx.stroke();

    // 8. Trajectory Nodes
    timeSteps.forEach((pt, i) => {
      const p = project(pt.lat, pt.lon, width, height);
      const isCurrent = i === activeTimeStep;

      // Circle node
      ctx.fillStyle = isCurrent ? "#0c0a09" : "#ffffff";
      ctx.strokeStyle = "#0c0a09";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(p.x, p.y, isCurrent ? 5 : 3.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Timestamp tag
      ctx.fillStyle = isCurrent ? "#0c0a09" : "#777169";
      ctx.font = isCurrent ? "600 10px Inter, sans-serif" : "400 9px Inter, sans-serif";
      const label = `T${pt.time_offset_hours >= 0 ? "+" : ""}${pt.time_offset_hours}h`;
      ctx.fillText(label, p.x + 8, p.y + 3);
    });

    // 9. Active Scrubber Position: Threat Centroid
    const activePt = timeSteps[activeTimeStep];
    if (activePt) {
      const cur = project(activePt.lat, activePt.lon, width, height);

      // Soft circular indicator
      ctx.strokeStyle = "rgba(12, 10, 9, 0.4)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(cur.x, cur.y, 14, 0, Math.PI * 2);
      ctx.stroke();

      // Velocity Arrow Vector
      const rad = ((threat.bearing_deg - 90) * Math.PI) / 180;
      const arrowLen = 28;
      const ax = cur.x + Math.cos(rad) * arrowLen;
      const ay = cur.y + Math.sin(rad) * arrowLen;

      ctx.strokeStyle = "#0c0a09";
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(cur.x, cur.y);
      ctx.lineTo(ax, ay);
      ctx.stroke();

      // Threat Label Card on Map
      ctx.fillStyle = "#0c0a09";
      ctx.font = "500 11px Inter, sans-serif";
      ctx.fillText(`${threat.name}`, cur.x + 18, cur.y - 8);
      ctx.fillStyle = "#777169";
      ctx.font = "400 10px Inter, sans-serif";
      ctx.fillText(`${threat.velocity_kmh} km/h · Heading ${threat.bearing_deg}°`, cur.x + 18, cur.y + 6);
    }
  }, [threat, activeTimeStep, showEnsembleMembers, showUncertaintyCorridor, showComputeRegion]);

  return (
    <div className="flex flex-col h-full bg-[#fbfaf8] border-b border-[#e7e5e4]">
      {/* Top Map Action Bar */}
      <div className="px-6 py-3.5 border-b border-[#e7e5e4] bg-white flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Compass size={17} className="text-[#0c0a09]" />
          <div>
            <h3
              className="text-base font-light text-[#0c0a09] tracking-tight"
              style={{ fontFamily: "var(--font-serif)" }}
            >
              4D Spatio-Temporal Corridor & Ensemble Evolution
            </h3>
            <span className="text-xs text-[#777169]">
              Centroid: {threat.centroid.lat.toFixed(2)}°N, {threat.centroid.lon.toFixed(2)}°E · Lead time: {threat.lead_time_days} days
            </span>
          </div>
        </div>

        {/* Layer Toggles */}
        <div className="flex items-center gap-2 text-xs">
          <button
            onClick={() => setShowComputeRegion(!showComputeRegion)}
            className={`px-3 py-1.5 rounded-full transition-colors cursor-pointer border ${
              showComputeRegion
                ? "bg-[#0c0a09] text-white border-[#0c0a09]"
                : "bg-white text-[#4e4e4e] border-[#e7e5e4] hover:border-[#d6d3d1]"
            }`}
          >
            Compute Region
          </button>
          <button
            onClick={() => setShowUncertaintyCorridor(!showUncertaintyCorridor)}
            className={`px-3 py-1.5 rounded-full transition-colors cursor-pointer border ${
              showUncertaintyCorridor
                ? "bg-[#0c0a09] text-white border-[#0c0a09]"
                : "bg-white text-[#4e4e4e] border-[#e7e5e4] hover:border-[#d6d3d1]"
            }`}
          >
            Uncertainty Envelope
          </button>
          <button
            onClick={() => setShowEnsembleMembers(!showEnsembleMembers)}
            className={`px-3 py-1.5 rounded-full transition-colors cursor-pointer border ${
              showEnsembleMembers
                ? "bg-[#0c0a09] text-white border-[#0c0a09]"
                : "bg-white text-[#4e4e4e] border-[#e7e5e4] hover:border-[#d6d3d1]"
            }`}
          >
            Ensemble Paths ({threat.ensemble_members.length})
          </button>
        </div>
      </div>

      {/* Canvas Viewport */}
      <div className="flex-1 relative w-full h-[400px] sm:h-[480px]">
        <canvas
          ref={canvasRef}
          width={920}
          height={520}
          className="w-full h-full object-cover"
        />

        {/* Editorial Legend Plate */}
        <div className="absolute top-5 left-5 bg-white/95 backdrop-blur-sm p-3.5 rounded-[14px] border border-[#e7e5e4] shadow-[0_4px_16px_rgba(0,0,0,0.03)] text-xs space-y-2 pointer-events-none">
          <div className="text-[10px] font-medium tracking-wider uppercase text-[#777169] mb-1">
            Cartographic Layers
          </div>
          <div className="flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#0c0a09] inline-block" />
            <span className="text-[#292524]">Consensus Deterministic Mean</span>
          </div>
          <div className="flex items-center gap-2.5">
            <span className="w-3 h-0.5 bg-[#94a3b8] inline-block" />
            <span className="text-[#777169]">EPS Perturbation Members</span>
          </div>
          <div className="flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-[#f4c5a8]/60 inline-block" />
            <span className="text-[#777169]">95% Trajectory Uncertainty</span>
          </div>
          <div className="flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-[#a8c8e8]/50 border border-dashed border-[#292524] inline-block" />
            <span className="text-[#777169]">Dynamic 5km Compute Crop</span>
          </div>
        </div>

        {/* Selected Timestep Stamp */}
        <div className="absolute top-5 right-5 bg-white/95 backdrop-blur-sm px-4 py-2.5 rounded-[14px] border border-[#e7e5e4] shadow-[0_4px_16px_rgba(0,0,0,0.03)] text-right pointer-events-none">
          <span className="text-[10px] tracking-wide uppercase text-[#777169] block">
            Forecast Horizon
          </span>
          <span
            className="text-xl font-light text-[#0c0a09] block"
            style={{ fontFamily: "var(--font-serif)" }}
          >
            T{timeSteps[activeTimeStep].time_offset_hours >= 0 ? "+" : ""}
            {timeSteps[activeTimeStep].time_offset_hours} Hours
          </span>
          <span className="text-[11px] text-[#777169]">
            {timeSteps[activeTimeStep].timestamp}
          </span>
        </div>
      </div>

      {/* Timeline Scrubber */}
      <div className="px-6 py-4 border-t border-[#e7e5e4] bg-white flex items-center gap-4">
        <button
          onClick={() => setIsPlaying(!isPlaying)}
          className="h-9 px-4 rounded-full bg-[#0c0a09] hover:bg-[#292524] text-white text-xs font-medium transition-colors cursor-pointer flex items-center gap-2 shrink-0"
        >
          {isPlaying ? <Pause size={13} /> : <Play size={13} />}
          <span>{isPlaying ? "Pause" : "Play Forecast"}</span>
        </button>

        <button
          onClick={() => setActiveTimeStep(2)}
          className="h-9 w-9 rounded-full bg-[#f0efed] hover:bg-[#e7e5e4] text-[#4e4e4e] transition-colors cursor-pointer flex items-center justify-center shrink-0"
          title="Reset to T+0h"
        >
          <RotateCcw size={13} />
        </button>

        {/* Scrubber slider */}
        <div className="flex-1 flex flex-col gap-1.5">
          <div className="flex justify-between text-xs text-[#777169]">
            {timeSteps.map((step, idx) => (
              <button
                key={step.timestamp}
                onClick={() => setActiveTimeStep(idx)}
                className={`cursor-pointer transition-colors ${
                  idx === activeTimeStep
                    ? "text-[#0c0a09] font-semibold"
                    : "hover:text-[#0c0a09]"
                }`}
              >
                T{step.time_offset_hours >= 0 ? "+" : ""}
                {step.time_offset_hours}h
              </button>
            ))}
          </div>

          <input
            type="range"
            min={0}
            max={timeSteps.length - 1}
            value={activeTimeStep}
            onChange={(e) => setActiveTimeStep(parseInt(e.target.value))}
            className="w-full accent-[#0c0a09] cursor-pointer h-1.5 bg-[#e7e5e4] rounded-lg"
          />
        </div>
      </div>
    </div>
  );
}
