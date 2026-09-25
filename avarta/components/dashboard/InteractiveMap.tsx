"use client";

import { useState, useEffect, useRef } from "react";
import { ThreatObject } from "@/types/threat";
import { Play, Pause, RotateCcw, Compass, SlidersHorizontal } from "lucide-react";

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

  // Render Canvas Map with Luxury Dark Cartography
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // 1. Midnight Dark Ocean Canvas
    ctx.fillStyle = "#0a0c10";
    ctx.fillRect(0, 0, width, height);

    // Subtle bathymetric gradient
    const oceanGrad = ctx.createRadialGradient(width * 0.6, height * 0.6, 50, width * 0.5, height * 0.5, width * 0.8);
    oceanGrad.addColorStop(0, "#0e1117");
    oceanGrad.addColorStop(1, "#07080b");
    ctx.fillStyle = oceanGrad;
    ctx.fillRect(0, 0, width, height);

    // 2. Graticule Lines (Subtle dark hairlines)
    ctx.strokeStyle = "rgba(255, 255, 255, 0.05)";
    ctx.lineWidth = 1;
    for (let lat = 10; lat <= 35; lat += 5) {
      const p1 = project(lat, 68, width, height);
      const p2 = project(lat, 96, width, height);
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();

      ctx.fillStyle = "#52525b";
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

      ctx.fillStyle = "#52525b";
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

    // Landmass Fill (Charcoal Slate)
    ctx.fillStyle = "#15181f";
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
    ctx.strokeStyle = "#2e3440";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    coastNodes.forEach((pt, i) => {
      const p = project(pt.lat, pt.lon, width, height);
      if (i === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    });
    ctx.stroke();

    // 4. Threat Compute Region
    if (showComputeRegion) {
      const { min_lat, max_lat, min_lon, max_lon } = threat.compute_region;
      const nw = project(max_lat, min_lon, width, height);
      const se = project(min_lat, max_lon, width, height);
      const boxW = se.x - nw.x;
      const boxH = se.y - nw.y;

      // Soft glowing cyan tint
      ctx.fillStyle = "rgba(168, 200, 232, 0.08)";
      ctx.fillRect(nw.x, nw.y, boxW, boxH);

      ctx.strokeStyle = "rgba(168, 200, 232, 0.4)";
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.strokeRect(nw.x, nw.y, boxW, boxH);
      ctx.setLineDash([]);

      ctx.fillStyle = "#e2e8f0";
      ctx.font = "500 10px Inter, sans-serif";
      ctx.fillText("5 km Threat-First Compute Region", nw.x + 8, nw.y + 16);
      ctx.fillStyle = "#94a3b8";
      ctx.font = "400 9px Inter, sans-serif";
      ctx.fillText(`Dynamically bounded: ${boxW.toFixed(0)}×${boxH.toFixed(0)} px`, nw.x + 8, nw.y + 28);
    }

    // 5. Uncertainty Corridor
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

      // Soft peach/amber glowing bloom
      ctx.fillStyle = "rgba(244, 197, 168, 0.16)";
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

      ctx.strokeStyle = "rgba(244, 197, 168, 0.5)";
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    // 6. Ensemble Member Trajectories
    if (showEnsembleMembers) {
      const ensembleColors = [
        "rgba(148, 163, 184, 0.35)",
        "rgba(203, 213, 225, 0.45)",
        "rgba(100, 116, 139, 0.35)",
        "rgba(148, 163, 184, 0.4)",
        "rgba(168, 162, 158, 0.35)",
        "rgba(214, 211, 209, 0.3)"
      ];

      threat.ensemble_members.forEach((ens, i) => {
        ctx.strokeStyle = ensembleColors[i % ensembleColors.length];
        ctx.lineWidth = 1.0;
        ctx.beginPath();
        ens.trajectory.forEach((pt, j) => {
          const p = project(pt.lat, pt.lon, width, height);
          if (j === 0) ctx.moveTo(p.x, p.y);
          else ctx.lineTo(p.x, p.y);
        });
        ctx.stroke();
      });
    }

    // 7. Consensus Trajectory (Crisp Pure White)
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 2.2;
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
      ctx.fillStyle = isCurrent ? "#ffffff" : "#1c1917";
      ctx.strokeStyle = isCurrent ? "#60a5fa" : "#e2e8f0";
      ctx.lineWidth = 2.0;
      ctx.beginPath();
      ctx.arc(p.x, p.y, isCurrent ? 5.5 : 3.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Timestamp tag
      ctx.fillStyle = isCurrent ? "#ffffff" : "#94a3b8";
      ctx.font = isCurrent ? "600 10px Inter, sans-serif" : "400 9px Inter, sans-serif";
      const label = `T${pt.time_offset_hours >= 0 ? "+" : ""}${pt.time_offset_hours}h`;
      ctx.fillText(label, p.x + 8, p.y + 3);
    });

    // 9. Active Scrubber Position: Threat Centroid
    const activePt = timeSteps[activeTimeStep];
    if (activePt) {
      const cur = project(activePt.lat, activePt.lon, width, height);

      // Glowing circular pulse
      ctx.strokeStyle = "rgba(96, 165, 250, 0.8)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(cur.x, cur.y, 14, 0, Math.PI * 2);
      ctx.stroke();

      // Velocity Arrow Vector
      const rad = ((threat.bearing_deg - 90) * Math.PI) / 180;
      const arrowLen = 28;
      const ax = cur.x + Math.cos(rad) * arrowLen;
      const ay = cur.y + Math.sin(rad) * arrowLen;

      ctx.strokeStyle = "#60a5fa";
      ctx.lineWidth = 2.0;
      ctx.beginPath();
      ctx.moveTo(cur.x, cur.y);
      ctx.lineTo(ax, ay);
      ctx.stroke();

      // Threat Label Card on Map
      ctx.fillStyle = "#ffffff";
      ctx.font = "600 11px Inter, sans-serif";
      ctx.fillText(`${threat.name}`, cur.x + 18, cur.y - 8);
      ctx.fillStyle = "#94a3b8";
      ctx.font = "400 10px Inter, sans-serif";
      ctx.fillText(`${threat.velocity_kmh} km/h · Heading ${threat.bearing_deg}°`, cur.x + 18, cur.y + 6);
    }
  }, [threat, activeTimeStep, showEnsembleMembers, showUncertaintyCorridor, showComputeRegion]);

  return (
    <div className="flex flex-col h-full bg-[#0a0c10] border-b border-[#292524] text-stone-100">
      {/* Top Map Action Bar */}
      <div className="px-6 py-3.5 border-b border-[#292524] bg-[#141210] flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Compass size={17} className="text-white" />
          <div>
            <h3
              className="text-base font-light text-white tracking-tight"
              style={{ fontFamily: "var(--font-serif)" }}
            >
              4D Spatio-Temporal Corridor & Ensemble Evolution
            </h3>
            <span className="text-xs text-stone-400">
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
                ? "bg-white text-black border-white font-medium"
                : "bg-[#1c1917] text-stone-300 border-stone-800 hover:border-stone-700"
            }`}
          >
            Compute Region
          </button>
          <button
            onClick={() => setShowUncertaintyCorridor(!showUncertaintyCorridor)}
            className={`px-3 py-1.5 rounded-full transition-colors cursor-pointer border ${
              showUncertaintyCorridor
                ? "bg-white text-black border-white font-medium"
                : "bg-[#1c1917] text-stone-300 border-stone-800 hover:border-stone-700"
            }`}
          >
            Uncertainty Envelope
          </button>
          <button
            onClick={() => setShowEnsembleMembers(!showEnsembleMembers)}
            className={`px-3 py-1.5 rounded-full transition-colors cursor-pointer border ${
              showEnsembleMembers
                ? "bg-white text-black border-white font-medium"
                : "bg-[#1c1917] text-stone-300 border-stone-800 hover:border-stone-700"
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

        {/* Editorial Legend Plate (Dark) */}
        <div className="absolute top-5 left-5 bg-[#141210]/90 backdrop-blur-md p-3.5 rounded-[14px] border border-stone-800 shadow-xl text-xs space-y-2 pointer-events-none">
          <div className="text-[10px] font-medium tracking-wider uppercase text-stone-400 mb-1">
            Cartographic Layers
          </div>
          <div className="flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-white inline-block" />
            <span className="text-stone-200">Consensus Deterministic Mean</span>
          </div>
          <div className="flex items-center gap-2.5">
            <span className="w-3 h-0.5 bg-[#94a3b8] inline-block" />
            <span className="text-stone-400">EPS Perturbation Members</span>
          </div>
          <div className="flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-[#f4c5a8]/60 inline-block" />
            <span className="text-stone-400">95% Trajectory Uncertainty</span>
          </div>
          <div className="flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-[#a8c8e8]/50 border border-dashed border-sky-400 inline-block" />
            <span className="text-stone-400">Dynamic 5km Compute Crop</span>
          </div>
        </div>

        {/* Selected Timestep Stamp (Dark) */}
        <div className="absolute top-5 right-5 bg-[#141210]/90 backdrop-blur-md px-4 py-2.5 rounded-[14px] border border-stone-800 shadow-xl text-right pointer-events-none">
          <span className="text-[10px] tracking-wide uppercase text-stone-400 block">
            Forecast Horizon
          </span>
          <span
            className="text-xl font-light text-white block"
            style={{ fontFamily: "var(--font-serif)" }}
          >
            T{timeSteps[activeTimeStep].time_offset_hours >= 0 ? "+" : ""}
            {timeSteps[activeTimeStep].time_offset_hours} Hours
          </span>
          <span className="text-[11px] text-stone-400">
            {timeSteps[activeTimeStep].timestamp}
          </span>
        </div>
      </div>

      {/* Timeline Scrubber (Dark) */}
      <div className="px-6 py-4 border-t border-[#292524] bg-[#141210] flex items-center gap-4">
        <button
          onClick={() => setIsPlaying(!isPlaying)}
          className="h-9 px-4 rounded-full bg-white text-black hover:bg-stone-200 text-xs font-semibold transition-colors cursor-pointer flex items-center gap-2 shrink-0 shadow-sm"
        >
          {isPlaying ? <Pause size={13} /> : <Play size={13} />}
          <span>{isPlaying ? "Pause" : "Play Forecast"}</span>
        </button>

        <button
          onClick={() => setActiveTimeStep(2)}
          className="h-9 w-9 rounded-full bg-stone-800 hover:bg-stone-700 text-stone-300 transition-colors cursor-pointer flex items-center justify-center shrink-0 border border-stone-700"
          title="Reset to T+0h"
        >
          <RotateCcw size={13} />
        </button>

        {/* Scrubber slider */}
        <div className="flex-1 flex flex-col gap-1.5">
          <div className="flex justify-between text-xs text-stone-400">
            {timeSteps.map((step, idx) => (
              <button
                key={step.timestamp}
                onClick={() => setActiveTimeStep(idx)}
                className={`cursor-pointer transition-colors ${
                  idx === activeTimeStep
                    ? "text-white font-semibold"
                    : "hover:text-white"
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
            className="w-full accent-white cursor-pointer h-1.5 bg-stone-800 rounded-lg"
          />
        </div>
      </div>
    </div>
  );
}
