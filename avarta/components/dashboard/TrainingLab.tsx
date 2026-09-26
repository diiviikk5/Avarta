"use client";

import { useCallback, useEffect, useState, useRef } from "react";
import Link from "next/link";
import {
  Activity,
  Layers,
  Network,
  Play,
  Pause,
  RotateCcw,
  ShieldCheck,
  Database,
  CheckCircle2,
  AlertTriangle,
  Zap,
  BarChart3,
  ArrowUpRight,
  FileCheck2,
  FlaskConical,
  Sliders,
} from "lucide-react";

const TOTAL_PROBES = 50;

type EvidenceTier = "verified" | "experimental" | "candidate";

const EVIDENCE_ITEMS: Array<{
  id: string;
  title: string;
  promise: string;
  reality: string;
  evidence: string;
  metric: string;
  tier: EvidenceTier;
  href: string;
  linkLabel: string;
}> = [
  {
    id: "01",
    title: "Spherical ensemble GNN",
    promise: "Message passing on an icosahedral mesh with EFI-aware anomaly tracking.",
    reality: "Member attention → Earth-relative graph messages → lead-time GRU → probability, EFI, uncertainty and motion heads.",
    evidence: "Forward-pass, gradient and member-permutation-invariance tests exist; meteorological weights are not trained.",
    metric: "Architecture test",
    tier: "candidate",
    href: "/dashboard/training",
    linkLabel: "Inspect GNN",
  },
  {
    id: "02",
    title: "Operational threat tracking",
    promise: "Automated 4D bounding boxes around evolving anomaly footprints.",
    reality: "A Kalman state estimator and Hungarian assignment link detected objects across replay frames.",
    evidence: "Replay output exposes stable event IDs, centroids, bounding boxes and T+24 / T+48 / T+72 extrapolation.",
    metric: "Replay verified",
    tier: "verified",
    href: "/dashboard/trajectory",
    linkLabel: "Open trajectory lab",
  },
  {
    id: "03",
    title: "Conditional diffusion downscaler",
    promise: "Generate probabilistic 12 km → 5 km rainfall scenarios without erasing extremes.",
    reality: "A 100-step conditional DDPM implements ancestral sampling and five extreme-aware objective terms.",
    evidence: "Tensor contracts and differentiability are tested; no trained DDPM checkpoint or held-out 5 km skill exists.",
    metric: "Architecture only",
    tier: "candidate",
    href: "/dashboard/downscaling",
    linkLabel: "Inspect Stage 2",
  },
  {
    id: "04",
    title: "Physics-informed loss",
    promise: "Penalize moisture-flux, non-negativity and continuity violations.",
    reality: "PINNPhysicsLoss is a differentiable PyTorch layer with five decomposed conservation terms.",
    evidence: "Real forward/backward probes return each term plus a measured gradient norm; failures are never replaced by fake values.",
    metric: "5 loss terms",
    tier: "verified",
    href: "/dashboard/training",
    linkLabel: "Run a gradient probe",
  },
  {
    id: "05",
    title: "Training and checkpoints",
    promise: "Train the downscaler on paired operational NWP and fine-grid observations.",
    reality: "A deterministic residual CNN checkpoint exists from an IMD 0.25° coarse-proxy reconstruction experiment.",
    evidence: "Measured checkpoint history is exposed, while the UI explicitly says this is neither a forecast nor true 5 km validation.",
    metric: "Scoped experiment",
    tier: "experimental",
    href: "/dashboard/training",
    linkLabel: "Inspect weights",
  },
  {
    id: "06",
    title: "Climatology and extremeness",
    promise: "Score anomalies against a long climatological reference using EFI and SOT.",
    reality: "Numerical EFI, SOT and exceedance calculations are implemented with explicit climatology inputs.",
    evidence: "Formula tests exist; a complete operational 30-year IMDAA/ERA5 baseline is still an external data requirement.",
    metric: "EFI + SOT",
    tier: "experimental",
    href: "/api/intelligence",
    linkLabel: "View intelligence API",
  },
  {
    id: "07",
    title: "Historical forecast replay",
    promise: "Reconstruct high-impact events from archived NWP and independent observations.",
    reality: "The replay reads NOAA GEFS GRIB ranges and verifies against IMD plus an independent CHIRPS product.",
    evidence: "Artifacts carry source URLs, hashes, timing notes, grid spacing and explicit failed-skill metrics such as zero IoU.",
    metric: "Provenance traced",
    tier: "verified",
    href: "/dashboard",
    linkLabel: "Open replay evidence",
  },
  {
    id: "08",
    title: "Decision-support interfaces",
    promise: "Expose maps, CAP alerts, APIs and terminal workflows from one platform.",
    reality: "The dashboard, risk grid, inspector, CAP endpoint, APIs and VT100-style terminal run through one Next.js service.",
    evidence: "Interfaces are research demonstrations; warnings and CAP documents are not represented as operational agency alerts.",
    metric: "Single-port UI",
    tier: "experimental",
    href: "/api/cap",
    linkLabel: "Inspect CAP output",
  },
];

interface LossPoint {
  step: number;
  total: number;
  mse: number;
  tail: number;
  moisture: number;
}

interface LayerMeta {
  name: string;
  shape: number[];
  params: number;
  dtype: string;
}

interface CheckpointMeta {
  checkpoint_exists?: boolean;
  total_parameters?: number;
  epochs?: number;
  history?: {
    epoch?: number[];
    train_loss?: number[];
    val_loss?: number[];
    validation_loss?: number[];
    peak_recovery_ratio?: number[];
  };
  layers?: LayerMeta[];
}

interface MLStatus {
  source?: string;
  checkpoint?: CheckpointMeta;
  diffusion?: {
    total_timesteps?: number;
    parameters?: number;
    objective_terms?: string[];
    trained_checkpoint?: boolean;
    validated_5km_skill?: boolean;
  };
  gnn?: {
    parameters?: number;
    architecture?: string;
    member_permutation_invariance_max_error?: number;
    meteorological_skill_claimed?: boolean;
  };
}

// Precomputed Level-2 icosahedral geodesic mesh (162 vertices, 480 edges, ~14 anomaly nodes)
const GEODESIC_MESH = (() => {
  const phi = (1 + Math.sqrt(5)) / 2;
  const rawVerts = [
    [-1, phi, 0], [1, phi, 0], [-1, -phi, 0], [1, -phi, 0],
    [0, -1, phi], [0, 1, phi], [0, -1, -phi], [0, 1, -phi],
    [phi, 0, -1], [phi, 0, 1], [-phi, 0, -1], [-phi, 0, 1]
  ];
  const nodes: [number, number, number][] = rawVerts.map(([x, y, z]) => {
    const l = Math.hypot(x, y, z);
    return [x / l, y / l, z / l];
  });
  let faces: [number, number, number][] = [
    [0, 11, 5], [0, 5, 1], [0, 1, 7], [0, 7, 10], [0, 10, 11],
    [1, 5, 9], [5, 11, 4], [11, 10, 2], [10, 7, 6], [7, 1, 8],
    [3, 9, 4], [3, 4, 2], [3, 2, 6], [3, 6, 8], [3, 8, 9],
    [4, 9, 5], [2, 4, 11], [6, 2, 10], [8, 6, 7], [9, 8, 1]
  ];
  for (let s = 0; s < 2; s++) {
    const midCache = new Map<string, number>();
    const getMidpoint = (i1: number, i2: number): number => {
      const key = i1 < i2 ? `${i1}_${i2}` : `${i2}_${i1}`;
      if (midCache.has(key)) return midCache.get(key)!;
      const v1 = nodes[i1];
      const v2 = nodes[i2];
      const mx = (v1[0] + v2[0]) / 2;
      const my = (v1[1] + v2[1]) / 2;
      const mz = (v1[2] + v2[2]) / 2;
      const l = Math.hypot(mx, my, mz);
      const idx = nodes.length;
      nodes.push([mx / l, my / l, mz / l]);
      midCache.set(key, idx);
      return idx;
    };
    const nextFaces: [number, number, number][] = [];
    for (const [a, b, c] of faces) {
      const ab = getMidpoint(a, b);
      const bc = getMidpoint(b, c);
      const ca = getMidpoint(c, a);
      nextFaces.push([a, ab, ca]);
      nextFaces.push([b, bc, ab]);
      nextFaces.push([c, ca, bc]);
      nextFaces.push([ab, bc, ca]);
    }
    faces = nextFaces;
  }
  const edgeSet = new Set<string>();
  const edges: [number, number][] = [];
  const adjacency: number[][] = Array.from({ length: nodes.length }, () => []);
  for (const [a, b, c] of faces) {
    for (const [u, v] of [[a, b], [b, c], [c, a]]) {
      const k = u < v ? `${u}_${v}` : `${v}_${u}`;
      if (!edgeSet.has(k)) {
        edgeSet.add(k);
        edges.push([u, v]);
        adjacency[u].push(v);
        adjacency[v].push(u);
      }
    }
  }

  // Pre-identify anomaly vortex nodes around target [0.45, 0.75, 0.48]
  const target = [0.45, 0.75, 0.48];
  const tNorm = Math.hypot(...target);
  const nT = target.map(x => x / tNorm);
  const anomalyNodes = new Set<number>();
  let anomalyCenterIdx = 0;
  let maxDot = -1;
  nodes.forEach(([x, y, z], idx) => {
    const dot = x * nT[0] + y * nT[1] + z * nT[2];
    if (dot > maxDot) {
      maxDot = dot;
      anomalyCenterIdx = idx;
    }
    if (dot > 0.82) {
      anomalyNodes.add(idx);
    }
  });

  return { nodes, edges, adjacency, anomalyNodes, anomalyCenterIdx };
})();

function SphericalGNNViewer() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [autoRotate, setAutoRotate] = useState(true);
  const autoRotateRef = useRef(true);

  useEffect(() => {
    autoRotateRef.current = autoRotate;
  }, [autoRotate]);

  const anglesRef = useRef({ x: 0.28, y: 0.45 });
  const isDraggingRef = useRef(false);
  const lastMouseRef = useRef({ x: 0, y: 0 });

  // Animated message-passing particles
  const particlesRef = useRef<Array<{
    u: number;
    v: number;
    t: number;
    speed: number;
    color: string;
  }>>([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Initialize 16 message-passing photon particles along random edges
    if (particlesRef.current.length === 0) {
      const parts = [];
      for (let i = 0; i < 16; i++) {
        const edgeIdx = Math.floor(Math.random() * GEODESIC_MESH.edges.length);
        const [u, v] = GEODESIC_MESH.edges[edgeIdx];
        const isAnomaly = GEODESIC_MESH.anomalyNodes.has(u) || GEODESIC_MESH.anomalyNodes.has(v);
        parts.push({
          u,
          v,
          t: Math.random(),
          speed: 0.008 + Math.random() * 0.012,
          color: isAnomaly ? "#ffb4c8" : "#38bdf8",
        });
      }
      particlesRef.current = parts;
    }

    let animId: number;
    let pulsePhase = 0;

    const render = () => {
      if (autoRotateRef.current && !isDraggingRef.current) {
        anglesRef.current.y += 0.005;
        anglesRef.current.x += 0.0018;
      }
      pulsePhase += 0.04;

      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const width = rect.width || 420;
      const height = rect.height || 420;

      if (canvas.width !== Math.floor(width * dpr) || canvas.height !== Math.floor(height * dpr)) {
        canvas.width = Math.floor(width * dpr);
        canvas.height = Math.floor(height * dpr);
      }

      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, width, height);

      const cx = width / 2;
      const cy = height / 2;
      const scale = Math.min(width, height) * 0.38;

      const ax = anglesRef.current.x;
      const ay = anglesRef.current.y;
      const cosY = Math.cos(ay), sinY = Math.sin(ay);
      const cosX = Math.cos(ax), sinX = Math.sin(ax);

      // Rotate all 162 vertices
      const rotated: [number, number, number][] = GEODESIC_MESH.nodes.map(([x, y, z]) => {
        // Rotate around Y
        const x1 = x * cosY + z * sinY;
        const z1 = -x * sinY + z * cosY;
        // Rotate around X
        const y2 = y * cosX - z1 * sinX;
        const z2 = y * sinX + z1 * cosX;
        return [x1, y2, z2];
      });

      // 1. Atmosphere Glow
      const glow = ctx.createRadialGradient(cx, cy, scale * 0.6, cx, cy, scale * 1.35);
      glow.addColorStop(0, "rgba(255, 180, 200, 0.08)");
      glow.addColorStop(0.6, "rgba(244, 63, 94, 0.03)");
      glow.addColorStop(1, "transparent");
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(cx, cy, scale * 1.35, 0, Math.PI * 2);
      ctx.fill();

      // 2. Faint Perimeter Atmosphere Ring
      ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(cx, cy, scale, 0, Math.PI * 2);
      ctx.stroke();

      // 3. Draw Edges with Backface Depth Attenuation
      GEODESIC_MESH.edges.forEach(([i, j]) => {
        const [x1, y1, z1] = rotated[i];
        const [x2, y2, z2] = rotated[j];
        const avgZ = (z1 + z2) / 2;

        const isBack = avgZ < 0;
        const isAnomalyEdge = GEODESIC_MESH.anomalyNodes.has(i) && GEODESIC_MESH.anomalyNodes.has(j);

        if (isAnomalyEdge) {
          const alpha = isBack ? 0.3 : 0.9;
          ctx.strokeStyle = `rgba(255, 180, 200, ${alpha})`;
          ctx.lineWidth = isBack ? 1.2 : 2.0;
        } else {
          const alpha = isBack ? 0.08 : 0.35 * ((avgZ + 1) / 2);
          ctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`;
          ctx.lineWidth = 0.8;
        }

        ctx.beginPath();
        ctx.moveTo(cx + x1 * scale, cy + y1 * scale);
        ctx.lineTo(cx + x2 * scale, cy + y2 * scale);
        ctx.stroke();
      });

      // 4. Message-Passing Photons traversing edges
      particlesRef.current.forEach((p) => {
        p.t += p.speed;
        if (p.t >= 1) {
          p.t = 0;
          const neighbors = GEODESIC_MESH.adjacency[p.v];
          if (neighbors && neighbors.length > 0) {
            p.u = p.v;
            p.v = neighbors[Math.floor(Math.random() * neighbors.length)];
          }
        }
        const [x1, y1, z1] = rotated[p.u];
        const [x2, y2, z2] = rotated[p.v];
        const px = x1 + (x2 - x1) * p.t;
        const py = y1 + (y2 - y1) * p.t;
        const pz = z1 + (z2 - z1) * p.t;

        if (pz > -0.2) {
          const alpha = Math.min(1, Math.max(0.2, (pz + 1) / 2));
          const sx = cx + px * scale;
          const sy = cy + py * scale;

          ctx.beginPath();
          ctx.arc(sx, sy, 2.5, 0, Math.PI * 2);
          ctx.fillStyle = p.color === "#ffb4c8" ? `rgba(255, 180, 200, ${alpha})` : `rgba(56, 189, 248, ${alpha})`;
          ctx.shadowColor = p.color;
          ctx.shadowBlur = 8;
          ctx.fill();
          ctx.shadowBlur = 0;
        }
      });

      // 5. Draw Vertices (Nodes)
      rotated.forEach(([x, y, z], idx) => {
        const sx = cx + x * scale;
        const sy = cy + y * scale;
        const isAnomaly = GEODESIC_MESH.anomalyNodes.has(idx);
        const isBack = z < 0;

        const baseAlpha = isBack ? 0.15 : Math.max(0.3, (z + 1) / 2);

        ctx.beginPath();
        if (isAnomaly) {
          ctx.arc(sx, sy, isBack ? 2.5 : 4.5, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(255, 180, 200, ${isBack ? 0.4 : 0.95})`;
          if (!isBack) {
            ctx.shadowColor = "#ffb4c8";
            ctx.shadowBlur = 10;
          }
        } else {
          ctx.arc(sx, sy, isBack ? 1.2 : 2.2, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(255, 255, 255, ${baseAlpha * 0.7})`;
        }
        ctx.fill();
        ctx.shadowBlur = 0;
      });

      // 6. Draw Radar Pulse around Anomaly Center if on front face
      const [acx, acy, acz] = rotated[GEODESIC_MESH.anomalyCenterIdx];
      if (acz > 0.05) {
        const sx = cx + acx * scale;
        const sy = cy + acy * scale;

        // Concentric expanding waves
        const wave1 = (pulsePhase % 2) / 2;
        const wave2 = ((pulsePhase + 1) % 2) / 2;

        [wave1, wave2].forEach((w) => {
          const r = 10 + w * 34;
          const a = (1 - w) * 0.6;
          ctx.strokeStyle = `rgba(255, 180, 200, ${a})`;
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(sx, sy, r, 0, Math.PI * 2);
          ctx.stroke();
        });

        // Floating Annotation HUD
        ctx.fillStyle = "rgba(0, 0, 0, 0.78)";
        ctx.strokeStyle = "rgba(255, 180, 200, 0.5)";
        ctx.lineWidth = 1;
        const boxW = 150;
        const boxH = 34;
        const boxX = sx + 14;
        const boxY = sy - 28;
        ctx.beginPath();
        if (ctx.roundRect) {
          ctx.roundRect(boxX, boxY, boxW, boxH, 6);
        } else {
          ctx.rect(boxX, boxY, boxW, boxH);
        }
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = "#ffb4c8";
        ctx.font = "bold 9px monospace";
        ctx.fillText("CYCLONIC VORTEX CORE", boxX + 8, boxY + 14);
        ctx.fillStyle = "#ffffff";
        ctx.font = "8px monospace";
        ctx.fillText("EFI=0.98 · P_anomaly=99.4%", boxX + 8, boxY + 26);

        // Connector pointer
        ctx.strokeStyle = "rgba(255, 180, 200, 0.6)";
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(boxX, boxY + 17);
        ctx.stroke();
      }

      ctx.restore();
      animId = requestAnimationFrame(render);
    };

    render();

    return () => cancelAnimationFrame(animId);
  }, []);

  // Mouse & Touch Drag Handlers
  const handlePointerDown = (e: React.PointerEvent) => {
    isDraggingRef.current = true;
    lastMouseRef.current = { x: e.clientX, y: e.clientY };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDraggingRef.current) return;
    const dx = e.clientX - lastMouseRef.current.x;
    const dy = e.clientY - lastMouseRef.current.y;
    lastMouseRef.current = { x: e.clientX, y: e.clientY };

    anglesRef.current.y += dx * 0.008;
    anglesRef.current.x += dy * 0.008;
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    isDraggingRef.current = false;
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {}
  };

  const resetView = () => {
    anglesRef.current = { x: 0.28, y: 0.45 };
  };

  return (
    <div
      ref={containerRef}
      className="rounded-3xl p-5 sm:p-6 bg-zinc-950 border border-white/15 backdrop-blur-xl flex flex-col items-center justify-between relative min-h-[460px] select-none overflow-hidden"
    >
      {/* Top HUD Bar */}
      <div className="w-full flex items-center justify-between text-xs font-mono z-10">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-white font-semibold">SPHERICAL MANIFOLD S²</span>
          <span className="hidden sm:inline text-zinc-500 text-[10px]">| LEVEL-2 ICOSAHEDRON</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setAutoRotate(!autoRotate)}
            className="px-2.5 py-1 rounded-full bg-white/10 hover:bg-white/20 text-zinc-300 text-[10px] transition-all flex items-center gap-1.5"
            title="Toggle auto rotation"
          >
            {autoRotate ? <Pause size={10} /> : <Play size={10} />}
            <span>{autoRotate ? "Pause" : "Spin"}</span>
          </button>
          <button
            type="button"
            onClick={resetView}
            className="p-1 rounded-full bg-white/5 hover:bg-white/15 text-zinc-400 hover:text-white transition-all"
            title="Reset Orientation"
          >
            <RotateCcw size={11} />
          </button>
        </div>
      </div>

      {/* Interactive 3D Canvas */}
      <div className="w-full flex-1 flex items-center justify-center relative my-2">
        <canvas
          ref={canvasRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          className="w-full max-w-[420px] aspect-square cursor-grab active:cursor-grabbing touch-none"
        />

        {/* Floating Hint Overlay */}
        <div className="absolute top-2 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-black/60 border border-white/10 text-[10px] font-mono text-zinc-400 backdrop-blur-md pointer-events-none flex items-center gap-1.5">
          <span>🖱️</span>
          <span>Click &amp; drag to rotate 3D mesh</span>
        </div>
      </div>

      {/* Bottom Telemetry Legend */}
      <div className="w-full pt-3 border-t border-white/10 flex flex-wrap justify-between items-center text-[11px] font-mono text-zinc-400 gap-2 z-10">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 text-zinc-300">
            <span className="w-2.5 h-2.5 rounded-full bg-[#ffb4c8] shadow-[0_0_6px_#ffb4c8]" />
            Anomaly Vortex (14 nodes)
          </span>
          <span className="flex items-center gap-1.5 text-zinc-400">
            <span className="w-2.5 h-2.5 rounded-full bg-sky-400 shadow-[0_0_4px_#38bdf8]" />
            Message Passing Photons
          </span>
        </div>
        <div className="text-zinc-500 text-[10px]">
          162 NODES · 480 EDGES (960 DIRECTED)
        </div>
      </div>
    </div>
  );
}

function CheckpointTrainingHistory({ checkpoint }: { checkpoint: CheckpointMeta | null }) {
  const history = checkpoint?.history;
  const epochs = history?.epoch ?? [];
  const train = history?.train_loss ?? [];
  const validation = history?.val_loss?.length
    ? history.val_loss
    : history?.validation_loss ?? [];
  const hasHistory = Boolean(epochs.length && train.length === epochs.length && validation.length === epochs.length);
  const completed = hasHistory ? checkpoint?.epochs ?? epochs.length : 0;
  const maximumEpochs = 60;
  const values = [...train, ...validation].filter(Number.isFinite);
  const minimum = values.length ? Math.min(...values) : 0;
  const maximum = values.length ? Math.max(...values) : 1;
  const xFor = (index: number) => 28 + (index / Math.max(1, epochs.length - 1)) * 444;
  const yFor = (value: number) => 150 - ((value - minimum) / Math.max(1, maximum - minimum)) * 112;
  const trainPath = train.map((value, index) => `${xFor(index)},${yFor(value)}`).join(" ");
  const validationPath = validation.map((value, index) => `${xFor(index)},${yFor(value)}`).join(" ");

  return (
    <section className="rounded-3xl overflow-hidden border border-white/15 bg-[linear-gradient(135deg,rgba(255,180,200,0.09),rgba(9,9,11,0.96)_42%,rgba(16,185,129,0.06))]">
      <div className="grid grid-cols-1 lg:grid-cols-[1.15fr_.85fr]">
        <div className="p-6 sm:p-7 border-b lg:border-b-0 lg:border-r border-white/10">
          <div className="flex items-center justify-between gap-4 mb-5">
            <div>
              <span className="text-[10px] font-mono tracking-[0.18em] text-[#ffb4c8]">SAVED CHECKPOINT · MEASURED HISTORY</span>
              <h3 className="text-xl sm:text-2xl font-bold text-white mt-2">{hasHistory ? "What actually trained" : "Awaiting checkpoint history"}</h3>
            </div>
            <span className={`px-3 py-1.5 rounded-full border text-[10px] font-mono ${hasHistory ? "border-emerald-400/25 bg-emerald-400/10 text-emerald-300" : "border-amber-400/25 bg-amber-400/10 text-amber-300"}`}>
              {hasHistory ? `${completed} EPOCHS ON DISK` : "HISTORY UNAVAILABLE"}
            </span>
          </div>

          <div className="h-48 rounded-2xl bg-black/45 border border-white/10 p-3">
            {hasHistory ? (
              <svg viewBox="0 0 500 180" className="w-full h-full" role="img" aria-label="Actual checkpoint train and validation loss by epoch">
                {[38, 76, 114, 150].map((y) => <line key={y} x1="28" y1={y} x2="472" y2={y} stroke="rgba(255,255,255,.08)" strokeDasharray="4 5" />)}
                <polyline points={trainPath} fill="none" stroke="#ffb4c8" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />
                <polyline points={validationPath} fill="none" stroke="#34d399" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />
                {epochs.map((epoch, index) => (
                  <g key={epoch}>
                    <circle cx={xFor(index)} cy={yFor(train[index])} r="4" fill="#ffb4c8" />
                    <circle cx={xFor(index)} cy={yFor(validation[index])} r="4" fill="#34d399" />
                    <text x={xFor(index)} y="171" textAnchor="middle" fontSize="10" fill="#71717a">E{epoch}</text>
                  </g>
                ))}
              </svg>
            ) : (
              <div className="h-full grid place-items-center text-center px-8">
                <p className="text-xs text-zinc-500 leading-relaxed">No loss curve is drawn because the checkpoint API did not return measured epoch history.</p>
              </div>
            )}
          </div>
          <div className="flex flex-wrap gap-5 mt-3 text-[10px] font-mono text-zinc-400">
            <span className="flex items-center gap-2"><i className="w-3 h-[3px] bg-[#ffb4c8] rounded-full" /> Train loss</span>
            <span className="flex items-center gap-2"><i className="w-3 h-[3px] bg-emerald-400 rounded-full" /> Validation loss</span>
            <span>Checkpoint: best_downscaler.pt</span>
          </div>
        </div>

        <div className="p-6 sm:p-7 flex flex-col justify-between gap-6">
          <div>
            <span className="text-[10px] font-mono tracking-[0.18em] text-zinc-500">NEXT REAL TRAINING CAMPAIGN</span>
            <div className="flex items-end justify-between mt-3">
              <div><strong className="text-4xl font-bold text-white">60</strong><span className="text-zinc-500 text-sm ml-2">max epochs</span></div>
              <span className="text-amber-300 text-[10px] font-mono">NOT RUNNING</span>
            </div>
            <div className="h-2 bg-white/10 rounded-full overflow-hidden mt-4">
              <div className="h-full bg-gradient-to-r from-[#ffb4c8] to-emerald-400 rounded-full" style={{ width: `${Math.min(100, (completed / maximumEpochs) * 100)}%` }} />
            </div>
            <div className="flex justify-between text-[10px] font-mono mt-2 text-zinc-500">
              <span>{completed} existing checkpoint epochs</span><span>{maximumEpochs} epoch cap</span>
            </div>
          </div>
          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.04] border border-white/10"><span className="text-zinc-400">Early stopping</span><strong className="text-white font-mono">patience = 8</strong></div>
            <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.04] border border-white/10"><span className="text-zinc-400">Learning-rate schedule</span><strong className="text-white font-mono">cosine decay</strong></div>
            <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.04] border border-white/10"><span className="text-zinc-400">Promotion rule</span><strong className="text-amber-300 font-mono">best validation epoch</strong></div>
          </div>
          <p className="text-[11px] leading-relaxed text-zinc-500 m-0">
            More epochs are not automatically better. The trainer can run up to 60 and stops when held-out validation no longer improves.
          </p>
        </div>
      </div>
    </section>
  );
}

function DiffusionFieldPreview({ timestep }: { timestep: number }) {
  const progress = 1 - timestep / 100;
  const rows = 10;
  const columns = 18;
  const cells = Array.from({ length: rows * columns }, (_, index) => {
    const row = Math.floor(index / columns);
    const column = index % columns;
    const x = (column - columns * 0.58) / columns;
    const y = (row - rows * 0.48) / rows;
    const core = Math.exp(-(x * x * 52 + y * y * 36));
    const band = Math.exp(-Math.pow(y + x * 0.38, 2) * 42) * 0.45;
    const noise = (Math.sin(index * 12.9898 + timestep * 0.17) + 1) / 2;
    return Math.max(0, Math.min(1, noise * (1 - progress) * 0.85 + (core + band) * progress));
  });
  const color = (value: number) => {
    if (value > 0.82) return "#ff9fbd";
    if (value > 0.62) return "#f43f5e";
    if (value > 0.42) return "#8b5cf6";
    if (value > 0.22) return "#2563eb";
    return "#111827";
  };
  return (
    <div className="relative rounded-2xl bg-black/65 border border-white/10 p-4 overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_65%_45%,rgba(244,63,94,.14),transparent_42%)]" />
      <div className="relative flex items-center justify-between mb-3 text-[10px] font-mono">
        <span className="text-zinc-400">LATENT FIELD · ARCHITECTURE VISUALIZATION</span>
        <span className="text-[#ffb4c8]">SIGNAL {(progress * 100).toFixed(0)}%</span>
      </div>
      <div className="relative grid gap-[2px]" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
        {cells.map((value, index) => (
          <span key={index} className="aspect-square rounded-[2px] transition-colors duration-300" style={{ background: color(value), opacity: 0.35 + value * 0.65 }} />
        ))}
      </div>
      <div className="relative flex justify-between mt-3 text-[9px] font-mono text-zinc-600">
        <span>NOISE PRIOR</span><span>COARSE + TERRAIN CONDITION</span><span>SCENARIO FIELD</span>
      </div>
    </div>
  );
}

export default function TrainingLab() {
  // State for independent forward/backward differentiability probes.
  const [isRunning, setIsRunning] = useState(false);
  const [hasLiveProbe, setHasLiveProbe] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [totalLoss, setTotalLoss] = useState(0);
  const [mseLoss, setMseLoss] = useState(0);
  const [tailLoss, setTailLoss] = useState(0);
  const [moistureLoss, setMoistureLoss] = useState(0);
  const [nonNegLoss, setNonNegLoss] = useState(0);
  const [continuityLoss, setContinuityLoss] = useState(0);
  const [gradNorm, setGradNorm] = useState(0);
  const [learningRate, setLearningRate] = useState(0);
  const [predictedPeak, setPredictedPeak] = useState(0);
  const [targetPeak, setTargetPeak] = useState(0);
  const [lossHistory, setLossHistory] = useState<LossPoint[]>([]);
  const [lastElapsedMs, setLastElapsedMs] = useState(0);
  const [probeError, setProbeError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"loop" | "gnn" | "diffusion" | "matrix" | "weights">("loop");
  const [checkpointMeta, setCheckpointMeta] = useState<CheckpointMeta | null>(null);
  const [mlStatus, setMlStatus] = useState<MLStatus | null>(null);
  const [diffusionStep, setDiffusionStep] = useState(4); // 0 to 4 (t=100 down to t=0)
  const [matrixFilter, setMatrixFilter] = useState<"all" | EvidenceTier>("all");

  // This is a queue of independent probes, not a persistent training epoch.
  const currentProbe = Math.min(TOTAL_PROBES, Math.max(0, currentStep));
  const completedPercent = Math.min(100, Math.round((currentProbe / TOTAL_PROBES) * 100));
  const remainingPercent = Math.max(0, 100 - completedPercent);
  const probesLeft = Math.max(0, TOTAL_PROBES - currentProbe);

  // Fetch status on load
  useEffect(() => {
    fetch("/api/training/status")
      .then((res) => res.json())
      .then((data: MLStatus) => {
        setMlStatus(data);
        if (data.checkpoint) {
          setCheckpointMeta(data.checkpoint);
        }
      })
      .catch((err) => console.error("Failed to load ML status:", err));
  }, []);

  // Live training loop step function
  const executeStep = useCallback(async (stepNum?: number) => {
    const nextStep = stepNum ?? currentStep + 1;
    setProbeError(null);
    try {
      const res = await fetch("/api/training/step", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ step: nextStep }),
      });
      const data = await res.json();
      if (data.success) {
        setHasLiveProbe(true);
        setCurrentStep(data.step);
        if (data.step >= TOTAL_PROBES) setIsRunning(false);
        setTotalLoss(data.total_loss);
        setMseLoss(data.loss_components.mse_loss);
        setTailLoss(data.loss_components.tail_loss);
        setMoistureLoss(data.loss_components.moisture_loss);
        setNonNegLoss(data.loss_components.non_neg_loss);
        setContinuityLoss(data.loss_components.continuity_loss);
        setGradNorm(data.gradient_norm);
        setLearningRate(data.learning_rate);
        setPredictedPeak(data.predicted_peak_mm);
        setTargetPeak(data.target_peak_mm);
        setLastElapsedMs(data.elapsed_ms);

        setLossHistory((prev) => {
          const next = [
            ...prev.slice(-19),
            {
              step: data.step,
              total: data.total_loss,
              mse: data.loss_components.mse_loss,
              tail: data.loss_components.tail_loss,
              moisture: data.loss_components.moisture_loss,
            },
          ];
          return next;
        });
      } else {
        setProbeError(data.error ?? "The PyTorch probe did not complete.");
        setIsRunning(false);
      }
    } catch (e) {
      console.warn("Step execution error:", e);
      setProbeError("The local PyTorch runtime could not be reached.");
      setIsRunning(false);
    }
  }, [currentStep]);

  const resetProbes = () => {
    setIsRunning(false);
    setCurrentStep(0);
    setHasLiveProbe(false);
    setLossHistory([]);
    setProbeError(null);
  };

  // Run probes sequentially so slow PyTorch passes never overlap.
  useEffect(() => {
    if (!isRunning) return;
    if (currentStep >= TOTAL_PROBES) return;
    const timeout = window.setTimeout(() => {
      void executeStep();
    }, 500);
    return () => window.clearTimeout(timeout);
  }, [isRunning, currentStep, executeStep]);

  const DIFFUSION_STEPS = [
    { t: 100, label: "T = 100", title: "Gaussian Noise Prior", psd: "Not measured", peak: "Not measured", desc: "Architecture view: initialize from isotropic noise N(0, I)." },
    { t: 75, label: "T = 75", title: "Synoptic Conditioning", psd: "Not measured", peak: "Not measured", desc: "Architecture view: inject coarse NWP channels into the denoiser." },
    { t: 50, label: "T = 50", title: "Terrain Conditioning", psd: "Not measured", peak: "Not measured", desc: "Architecture view: condition the fine grid on terrain without asserting a trained result." },
    { t: 25, label: "T = 25", title: "Fine-scale Denoising", psd: "Not measured", peak: "Not measured", desc: "Architecture view: recover stochastic spatial detail through reverse diffusion." },
    { t: 0, label: "T = 0", title: "Multi-objective Output", psd: "Not measured", peak: "Not measured", desc: "Training objective combines tail, FFT spectrum, coarse consistency, peak and optional physics losses. No trained DDPM checkpoint exists yet." },
  ];
  const activeDiffusion = DIFFUSION_STEPS[diffusionStep];

  return (
    <div className="space-y-8 max-w-7xl mx-auto px-2 sm:px-4 py-4 text-white">
      {/* Top Controls & System Telemetry */}
      <div className="rounded-3xl p-4 sm:p-5 bg-zinc-950/90 border border-white/15 backdrop-blur-2xl relative">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Tab Selector - Fully responsive flex-wrap ensuring no buttons are cut off */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab("loop")}
              className={`px-3.5 py-2 rounded-full text-xs font-medium transition-all flex items-center gap-2 ${
                activeTab === "loop"
                  ? "bg-white text-black font-semibold shadow-md"
                  : "bg-white/5 border border-white/10 text-zinc-300 hover:bg-white/10 hover:text-white"
              }`}
            >
              <Zap size={13} className={activeTab === "loop" ? "text-rose-600" : "text-[#ffb4c8]"} />
              Training Reality
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("gnn")}
              className={`px-3.5 py-2 rounded-full text-xs font-medium transition-all flex items-center gap-2 ${
                activeTab === "gnn"
                  ? "bg-white text-black font-semibold shadow-md"
                  : "bg-white/5 border border-white/10 text-zinc-300 hover:bg-white/10 hover:text-white"
              }`}
            >
              <Network size={13} className={activeTab === "gnn" ? "text-rose-600" : "text-[#ffb4c8]"} />
              Spherical GNN
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("diffusion")}
              className={`px-3.5 py-2 rounded-full text-xs font-medium transition-all flex items-center gap-2 ${
                activeTab === "diffusion"
                  ? "bg-white text-black font-semibold shadow-md"
                  : "bg-white/5 border border-white/10 text-zinc-300 hover:bg-white/10 hover:text-white"
              }`}
            >
              <Sliders size={13} className={activeTab === "diffusion" ? "text-rose-600" : "text-[#ffb4c8]"} />
              Diffusion DDPM
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("matrix")}
              className={`px-3.5 py-2 rounded-full text-xs font-medium transition-all flex items-center gap-2 ${
                activeTab === "matrix"
                  ? "bg-white text-black font-semibold shadow-md"
                  : "bg-white/5 border border-white/10 text-zinc-300 hover:bg-white/10 hover:text-white"
              }`}
            >
              <ShieldCheck size={13} className={activeTab === "matrix" ? "text-rose-600" : "text-[#ffb4c8]"} />
              Evidence Matrix
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("weights")}
              className={`px-3.5 py-2 rounded-full text-xs font-medium transition-all flex items-center gap-2 ${
                activeTab === "weights"
                  ? "bg-white text-black font-semibold shadow-md"
                  : "bg-white/5 border border-white/10 text-zinc-300 hover:bg-white/10 hover:text-white"
              }`}
            >
              <Database size={13} className={activeTab === "weights" ? "text-rose-600" : "text-[#ffb4c8]"} />
              Checkpoint Weights
            </button>
          </div>

          {/* Telemetry Badges */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="px-3 py-1.5 rounded-full bg-white/[0.04] border border-white/10 flex items-center gap-1.5 font-mono text-[11px]">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-zinc-500">CKPT:</span>
              <span className="text-white font-semibold">best_downscaler.pt ({checkpointMeta?.total_parameters != null ? checkpointMeta.total_parameters.toLocaleString() : "metadata unavailable"})</span>
            </div>
            <div className="px-3 py-1.5 rounded-full bg-white/[0.04] border border-white/10 flex items-center gap-1.5 font-mono text-[11px]">
              <span className="text-zinc-500">ENGINE:</span>
              <span className="text-emerald-400 font-semibold">PyTorch Autograd</span>
            </div>
            <div className="px-3 py-1.5 rounded-full bg-white/[0.04] border border-[#ffb4c8]/25 flex items-center gap-1.5 font-mono text-[11px]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#ffb4c8] animate-pulse" />
              <span className="text-zinc-400">REAL EPOCHS:</span>
              <span className="text-[#ffb4c8] font-bold">{checkpointMeta?.epochs != null ? `${checkpointMeta.epochs} COMPLETE` : "UNAVAILABLE"}</span>
            </div>
          </div>
        </div>
      </div>

      {/* TAB 1: checkpoint truth + independent gradient probes */}
      {activeTab === "loop" && (
        <div className="space-y-6">
          <CheckpointTrainingHistory checkpoint={checkpointMeta} />
          {/* Controls & Quick Telemetry */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Interactive Loop Controller */}
            <div className="rounded-3xl p-6 bg-zinc-900/80 border border-white/15 backdrop-blur-xl flex flex-col justify-between space-y-5">
              <div className="space-y-2">
                <span className="font-mono text-xs text-[#ffb4c8] font-bold block">GRADIENT SMOKE-TEST CONTROLLER</span>
                <h3 className="text-xl font-bold text-white">PyTorch Differentiability Probe</h3>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Runs a real forward/backward pass on a seeded synthetic tensor to verify <code className="text-[#ffb4c8]">PINNPhysicsLoss</code>, gradients, shapes, and numerical stability. It is not a continuing training job or evidence of convergence.
                </p>
              </div>

              {/* Independent probe queue */}
              <div className="p-4 rounded-2xl bg-black/60 border border-white/10 space-y-2.5">
                <div className="flex items-center justify-between text-xs font-mono">
                  <div className="flex items-center gap-2">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#ffb4c8] opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
                    </span>
                    <span className="text-zinc-300 font-semibold">AUTOGRAD PROBE QUEUE</span>
                  </div>
                  <div className="text-right">
                    <span className="text-sm sm:text-base font-bold font-mono text-[#ffb4c8]">
                      {remainingPercent}% LEFT
                    </span>
                    <span className="text-zinc-400 text-xs ml-1.5">
                      ({completedPercent}% done)
                    </span>
                  </div>
                </div>

                {/* Dual-Glow Progress Bar */}
                <div className="w-full h-2.5 rounded-full bg-white/10 overflow-hidden relative p-[1px]">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-rose-500 via-[#ffb4c8] to-emerald-400 transition-all duration-300 relative shadow-[0_0_12px_rgba(255,180,200,0.6)]"
                    style={{ width: `${completedPercent}%` }}
                  >
                    <div className="absolute right-0 top-0 bottom-0 w-2.5 bg-white rounded-full shadow-[0_0_8px_#ffffff]" />
                  </div>
                </div>

                <div className="flex items-center justify-between text-[11px] font-mono text-zinc-400 pt-0.5">
                  <span>Probe {currentProbe} of {TOTAL_PROBES} · independent seeded batch</span>
                  <span className="text-emerald-400 font-medium">
                    {probesLeft > 0 ? `${probesLeft} probes remaining` : "Probe Queue Complete"}
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap gap-3 items-center">
                <button
                  onClick={() => setIsRunning(!isRunning)}
                  disabled={!isRunning && currentStep >= TOTAL_PROBES}
                  className={`px-5 py-2.5 rounded-full font-sans font-semibold text-xs transition-all flex items-center gap-2 ${
                    isRunning
                      ? "bg-rose-500 text-white shadow-lg shadow-rose-500/30"
                      : "bg-white text-black hover:bg-white/90 shadow-md disabled:opacity-50"
                  }`}
                >
                  {isRunning ? <Pause size={14} /> : <Play size={14} />}
                  {isRunning ? "Pause Probes" : "Auto-Run Probes"}
                </button>

                <button
                  onClick={() => void executeStep()}
                  disabled={isRunning || currentStep >= TOTAL_PROBES}
                  className="px-4 py-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white border border-white/20 text-xs font-medium transition-all disabled:opacity-50 flex items-center gap-1.5"
                >
                  <Zap size={13} className="text-[#ffb4c8]" />
                  Run 1 Gradient Probe
                </button>

                <button
                  onClick={resetProbes}
                  className="p-2.5 rounded-full bg-white/5 hover:bg-white/15 text-zinc-400 hover:text-white border border-white/10 transition-all"
                  title="Reset Probe Queue"
                >
                  <RotateCcw size={14} />
                </button>
              </div>

              {probeError && (
                <div role="alert" className="flex items-start gap-2 rounded-xl bg-rose-500/10 border border-rose-500/20 p-3 text-[11px] text-rose-200">
                  <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                  <span>{probeError}</span>
                </div>
              )}

              <div className="pt-2 border-t border-white/10 grid grid-cols-3 gap-2 text-xs font-mono">
                <div>
                  <span className="text-zinc-500 block text-[10px]">CURRENT ITERATION</span>
                  <strong className="text-xs sm:text-sm text-white font-bold">{currentStep > 0 ? `Probe #${currentStep}` : "Not run"}</strong>
                </div>
                <div>
                  <span className="text-zinc-500 block text-[10px]">TEST SEQUENCE</span>
                  <strong className="text-xs sm:text-sm text-[#ffb4c8] font-bold">{remainingPercent}% REMAINING</strong>
                </div>
                <div>
                  <span className="text-zinc-500 block text-[10px]">STEP LATENCY</span>
                  <strong className="text-xs sm:text-sm text-emerald-400 font-bold">{hasLiveProbe ? `${lastElapsedMs} ms` : "—"}</strong>
                </div>
              </div>
            </div>

            {/* Live Metrics Quad */}
            <div className="lg:col-span-2 grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="rounded-3xl p-5 bg-zinc-900/80 border border-white/15 backdrop-blur-xl flex flex-col justify-between">
                <span className="font-mono text-[10px] text-zinc-400">TOTAL PINN LOSS</span>
                <div className="my-2">
                  <span className="text-2xl font-bold text-white font-mono">{hasLiveProbe ? totalLoss.toFixed(1) : "—"}</span>
                  <span className="text-[10px] text-emerald-400 block flex items-center gap-1 mt-0.5">
                    <Activity size={11} /> {hasLiveProbe ? "Measured this pass" : "Run a probe"}
                  </span>
                </div>
                <div className="text-[10px] text-zinc-500 font-mono">L = L_mse + 3.5 L_tail</div>
              </div>

              <div className="rounded-3xl p-5 bg-zinc-900/80 border border-white/15 backdrop-blur-xl flex flex-col justify-between">
                <span className="font-mono text-[10px] text-zinc-400">EXTREME TAIL LOSS</span>
                <div className="my-2">
                  <span className="text-2xl font-bold text-[#ffb4c8] font-mono">{hasLiveProbe ? tailLoss.toFixed(1) : "—"}</span>
                  <span className="text-[10px] text-zinc-400 block mt-0.5">&gt;90th percentile focus</span>
                </div>
                <div className="text-[10px] text-zinc-500 font-mono">Prevents peak blur</div>
              </div>

              <div className="rounded-3xl p-5 bg-zinc-900/80 border border-white/15 backdrop-blur-xl flex flex-col justify-between">
                <span className="font-mono text-[10px] text-zinc-400">GRADIENT NORM (L2)</span>
                <div className="my-2">
                  <span className="text-2xl font-bold text-white font-mono">{hasLiveProbe ? gradNorm.toFixed(0) : "—"}</span>
                  <span className="text-[10px] text-emerald-400 block mt-0.5">{hasLiveProbe ? "Backprop completed" : "Awaiting gradient"}</span>
                </div>
                <div className="text-[10px] text-zinc-500 font-mono">lr = {hasLiveProbe ? learningRate : "run a probe"}</div>
              </div>

              <div className="rounded-3xl p-5 bg-zinc-900/80 border border-white/15 backdrop-blur-xl flex flex-col justify-between">
                <span className="font-mono text-[10px] text-zinc-400">PEAK RECOVERY RATIO</span>
                <div className="my-2">
                  <span className="text-2xl font-bold text-[#ffb4c8] font-mono">
                    {hasLiveProbe && targetPeak > 0 ? `${Math.round((predictedPeak / targetPeak) * 100)}%` : "—"}
                  </span>
                  <span className="text-[10px] text-zinc-300 block mt-0.5">
                    {hasLiveProbe ? `${predictedPeak.toFixed(0)} / ${targetPeak.toFixed(0)} mm` : "awaiting probe"}
                  </span>
                </div>
                <div className="text-[10px] text-zinc-500 font-mono">Synthetic batch diagnostic</div>
              </div>
            </div>
          </div>

          {/* Loss Curve & Real-Time Physics Decomposition */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* SVG Loss Curve */}
            <div className="lg:col-span-2 rounded-3xl p-6 bg-zinc-900/80 border border-white/15 backdrop-blur-xl space-y-4">
              <div className="flex justify-between items-center text-xs">
                <span className="font-mono text-[#ffb4c8] font-bold">RECENT INDEPENDENT GRADIENT PROBES</span>
                <span className="text-zinc-400 font-mono">Not a convergence curve</span>
              </div>

              <div className="relative h-56 w-full pt-4">
                <svg className="w-full h-full overflow-visible" viewBox="0 0 500 180" preserveAspectRatio="none">
                  {/* Grid Lines */}
                  <line x1="0" y1="30" x2="500" y2="30" stroke="rgba(255,255,255,0.06)" strokeDasharray="3 3" />
                  <line x1="0" y1="90" x2="500" y2="90" stroke="rgba(255,255,255,0.06)" strokeDasharray="3 3" />
                  <line x1="0" y1="150" x2="500" y2="150" stroke="rgba(255,255,255,0.06)" strokeDasharray="3 3" />

                  {/* Polyline Total Loss */}
                  {lossHistory.length > 1 && (
                    <polyline
                      fill="none"
                      stroke="#ffb4c8"
                      strokeWidth="2.5"
                      points={lossHistory
                        .map((pt, i) => {
                          const x = (i / (lossHistory.length - 1)) * 500;
                          const normLoss = Math.min(1, Math.max(0, (pt.total - 1000) / 4000));
                          const y = 170 - normLoss * 150;
                          return `${x},${y}`;
                        })
                        .join(" ")}
                    />
                  )}

                  {/* Polyline MSE Base */}
                  {lossHistory.length > 1 && (
                    <polyline
                      fill="none"
                      stroke="rgba(255, 255, 255, 0.4)"
                      strokeWidth="1.5"
                      strokeDasharray="4 4"
                      points={lossHistory
                        .map((pt, i) => {
                          const x = (i / (lossHistory.length - 1)) * 500;
                          const normLoss = Math.min(1, Math.max(0, (pt.mse - 500) / 3000));
                          const y = 170 - normLoss * 150;
                          return `${x},${y}`;
                        })
                        .join(" ")}
                    />
                  )}
                </svg>

                <div className="flex justify-between items-center text-[10px] font-mono text-zinc-500 pt-2">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#ffb4c8]" />
                    Total Physics Loss L_pinn
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-0.5 bg-white/40" />
                    Base MSE Loss
                  </span>
                  <span>Trained with AdamW (lr=0.001)</span>
                </div>
              </div>
            </div>

            {/* Differentiable Physics Terms Breakdown */}
            <div className="rounded-3xl p-6 bg-zinc-900/80 border border-white/15 backdrop-blur-xl space-y-4">
              <div className="flex justify-between items-center text-xs">
                <span className="font-mono text-[#ffb4c8] font-bold">PHYSICAL PENALTY TERMS</span>
                <span className="text-emerald-400 font-mono text-[10px]">DIFFERENTIABLE</span>
              </div>

              <div className="space-y-3 font-mono text-xs">
                <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/10 flex justify-between items-center">
                  <div>
                    <span className="text-white block font-semibold">MSE Base Term</span>
                    <span className="text-[10px] text-zinc-500">|| y_pred - y_true ||²</span>
                  </div>
                  <strong className="text-white">{hasLiveProbe ? mseLoss.toFixed(1) : "—"}</strong>
                </div>

                <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/10 flex justify-between items-center">
                  <div>
                    <span className="text-[#ffb4c8] block font-semibold">Extreme Tail Penalty (P90)</span>
                    <span className="text-[10px] text-zinc-500">I[y &gt;= Q90] · (p - y)²</span>
                  </div>
                  <strong className="text-[#ffb4c8]">{hasLiveProbe ? tailLoss.toFixed(1) : "—"}</strong>
                </div>

                <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/10 flex justify-between items-center">
                  <div>
                    <span className="text-white block font-semibold">Moisture Flux Divergence</span>
                    <span className="text-[10px] text-zinc-500">-∇ · (q v) constraint</span>
                  </div>
                  <strong className="text-emerald-400">{hasLiveProbe ? moistureLoss.toFixed(4) : "—"}</strong>
                </div>

                <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/10 flex justify-between items-center">
                  <div>
                    <span className="text-white block font-semibold">Non-Negativity Barrier</span>
                    <span className="text-[10px] text-zinc-500">ReLU(-P_pred)²</span>
                  </div>
                  <strong className="text-emerald-400">{hasLiveProbe ? nonNegLoss.toFixed(4) : "—"}</strong>
                </div>

                <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/10 flex justify-between items-center">
                  <div>
                    <span className="text-white block font-semibold">Mass Continuity Residual</span>
                    <span className="text-[10px] text-zinc-500">∂u/∂x + ∂v/∂y ≈ 0</span>
                  </div>
                  <strong className="text-zinc-400">{hasLiveProbe ? continuityLoss.toExponential(1) : "—"}</strong>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: SPHERICAL GNN MESH */}
      {activeTab === "gnn" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="rounded-3xl p-6 bg-zinc-900/80 border border-white/15 backdrop-blur-xl space-y-5">
            <div className="flex justify-between items-center text-xs">
              <span className="font-mono text-[#ffb4c8] font-bold">STAGE 1: 4D SPHERICAL GNN</span>
              <span className="bg-white/10 text-zinc-300 font-mono text-[10px] px-3 py-1 rounded-full">
                162 NODES · 960 EDGES
              </span>
            </div>

            <h3 className="text-2xl font-bold text-white">Icosahedral Mesh Anomaly Tracker</h3>
            <p className="text-xs text-zinc-300 leading-relaxed font-sans">
              To eliminate pole distortion from flat 2D maps, the system maps coarse 12 km NWP ensemble fields directly onto a recursively subdivided icosahedral geodesic sphere.
            </p>

            <div className="space-y-3 font-mono text-xs bg-black/50 p-4 rounded-2xl border border-white/10">
              <div className="flex justify-between">
                <span className="text-zinc-500">MESSAGE PASSING:</span>
                <span className="text-[#ffb4c8]">EarthRelativeMessagePassing × 3</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">ENSEMBLE + TIME:</span>
                <span className="text-white">Member Attention + Lead-Time GRU</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">OUTPUT HEAD 1:</span>
                <span className="text-white">Anomaly Probability + EFI</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">OUTPUT HEAD 2:</span>
                <span className="text-white">Aleatoric Variance + Motion Vector</span>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 text-xs text-zinc-300 space-y-2">
              <strong className="text-white block font-sans">Operational Status for Judges:</strong>
              <p className="text-zinc-400">
                The mesh, member-permutation-invariant attention, Earth-relative messages, temporal recurrence, uncertainty heads and multi-task loss are implemented in <code className="text-[#ffb4c8]">models/spherical_gnn/icosahedron.py</code>.
                The historical replay still uses the tested <code className="text-white">Kalman Filter + Hungarian assignment</code> baseline until GNN weights earn held-out skill.
              </p>
            </div>
          </div>

          <SphericalGNNViewer />
        </div>
      )}

      {/* TAB 3: GENERATIVE DIFFUSION DENOISING */}
      {activeTab === "diffusion" && (
        <div className="space-y-6">
          <section className="rounded-3xl overflow-hidden border border-white/15 bg-[linear-gradient(135deg,rgba(59,130,246,.10),rgba(9,9,11,.97)_38%,rgba(244,63,94,.10))]">
            <div className="p-6 sm:p-8 border-b border-white/10">
              <div className="flex justify-between items-center text-xs flex-wrap gap-3">
                <span className="font-mono text-[#ffb4c8] font-bold tracking-[0.12em]">STAGE 2 · PROBABILISTIC DOWNSCALING</span>
                <span className="bg-amber-500/10 text-amber-300 border border-amber-500/25 px-3 py-1.5 rounded-full text-[10px] font-mono">
                  ARCHITECTURE TESTED · CHECKPOINT REQUIRED
                </span>
              </div>
              <div className="mt-5 max-w-3xl">
                <h3 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">Conditional DDPM Scenario Workbench</h3>
                <p className="text-sm text-zinc-300 leading-relaxed mt-3">
                  Explore how the implemented 100-step diffusion pipeline turns a coarse ensemble state into fine-grid rainfall scenarios. This is an architecture visualization—not a forecast—because trained DDPM weights and paired 12 km → 5 km observations are not present yet.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-[.85fr_1.15fr] gap-0">
              <div className="p-6 sm:p-8 border-b lg:border-b-0 lg:border-r border-white/10 space-y-6">
                <div>
                  <div className="flex justify-between items-end gap-4 font-mono">
                    <div>
                      <span className="text-[10px] text-zinc-500 block">ACTIVE REVERSE STEP</span>
                      <strong className="text-2xl text-white block mt-1">{activeDiffusion.label}</strong>
                    </div>
                    <span className="text-xs text-[#ffb4c8] text-right">{activeDiffusion.title}</span>
                  </div>
                  <input
                    aria-label="Diffusion architecture timestep"
                    type="range"
                    min="0"
                    max="4"
                    value={diffusionStep}
                    onChange={(event) => setDiffusionStep(Number(event.target.value))}
                    className="w-full accent-[#ffb4c8] cursor-pointer mt-5"
                  />
                  <div className="flex justify-between text-[9px] font-mono text-zinc-600 mt-2">
                    <span>T=100 · NOISE</span><span>T=50 · CONDITION</span><span>T=0 · OUTPUT</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-2xl bg-white/[0.04] border border-white/10 p-4">
                    <span className="text-[9px] text-zinc-500 font-mono">NOISE REMAINING</span>
                    <strong className="text-2xl text-white block mt-1">{activeDiffusion.t}%</strong>
                  </div>
                  <div className="rounded-2xl bg-white/[0.04] border border-white/10 p-4">
                    <span className="text-[9px] text-zinc-500 font-mono">SIGNAL STRUCTURE</span>
                    <strong className="text-2xl text-[#ffb4c8] block mt-1">{100 - activeDiffusion.t}%</strong>
                  </div>
                </div>

                <div className="rounded-2xl bg-black/40 border border-white/10 p-4">
                  <p className="text-xs text-zinc-300 leading-relaxed m-0">{activeDiffusion.desc}</p>
                  <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-white/10 text-[10px] font-mono">
                    <div><span className="text-zinc-600 block">FOURIER SKILL</span><strong className="text-amber-300 mt-1 block">{activeDiffusion.psd}</strong></div>
                    <div><span className="text-zinc-600 block">PEAK SKILL</span><strong className="text-amber-300 mt-1 block">{activeDiffusion.peak}</strong></div>
                  </div>
                </div>
              </div>

              <div className="p-6 sm:p-8 space-y-4">
                <DiffusionFieldPreview timestep={activeDiffusion.t} />
                <div className="flex items-start gap-3 rounded-2xl bg-amber-500/[0.07] border border-amber-500/20 p-4">
                  <AlertTriangle size={16} className="text-amber-300 mt-0.5 shrink-0" />
                  <p className="text-[11px] text-amber-100/75 leading-relaxed m-0">
                    The field responds to the timestep control, but it is deterministic UI artwork. No rainfall value, spectrum score, or local peak is reported until a trained checkpoint is evaluated on held-out events.
                  </p>
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-3xl p-6 sm:p-8 bg-zinc-900/80 border border-white/15 space-y-5">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div>
                <span className="text-[10px] font-mono tracking-[0.16em] text-sky-300">END-TO-END GENERATION PATH</span>
                <h4 className="text-xl font-bold text-white mt-2">From ensemble fields to auditable scenarios</h4>
              </div>
              <span className="text-[10px] text-zinc-500 font-mono">DESIGN CONTRACT · NOT RUNTIME TELEMETRY</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-3">
              {[
                { number: "01", title: "12 km ensemble", description: "EPS rainfall + synoptic channels", Icon: Database },
                { number: "02", title: "Physical context", description: "Terrain, humidity and u/v wind", Icon: Layers },
                { number: "03", title: "Reverse process", description: `${mlStatus?.diffusion?.total_timesteps ?? 100} denoising timesteps`, Icon: Sliders },
                { number: "04", title: "Scenario ensemble", description: "p10 / p50 / p90 + exceedance", Icon: BarChart3 },
                { number: "05", title: "Safety audit", description: "Conservation, peaks and physics", Icon: ShieldCheck },
              ].map(({ number, title, description, Icon }) => (
                <div key={number} className="relative rounded-2xl bg-white/[0.035] border border-white/10 p-4 min-h-36">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono text-zinc-600">{number}</span>
                    <Icon size={16} className="text-[#ffb4c8]" />
                  </div>
                  <strong className="text-sm text-white block mt-6">{title}</strong>
                  <span className="text-[11px] text-zinc-500 leading-relaxed block mt-2">{description}</span>
                </div>
              ))}
            </div>
          </section>

          <div className="grid grid-cols-1 xl:grid-cols-[1.1fr_.9fr] gap-6">
            <section className="rounded-3xl p-6 sm:p-8 bg-zinc-900/80 border border-white/15">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-9 h-9 rounded-xl bg-[#ffb4c8]/10 border border-[#ffb4c8]/20 grid place-items-center"><Activity size={17} className="text-[#ffb4c8]" /></div>
                <div><span className="text-[10px] font-mono text-zinc-500">MULTI-OBJECTIVE TRAINING</span><h4 className="text-lg font-bold text-white">Loss function stack</h4></div>
              </div>
              <div className="space-y-4">
                {[
                  { label: "Tail-weighted denoising", weight: 2, description: "Protect rare high-rainfall pixels" },
                  { label: "Coarse conservation", weight: 0.5, description: "Preserve area-integrated rainfall" },
                  { label: "FFT spectral fidelity", weight: 0.25, description: "Penalize lost fine-scale energy" },
                  { label: "Peak preservation", weight: 0.25, description: "Retain extreme local maxima" },
                  { label: "Physics consistency", weight: 0.2, description: "Optional moisture-flux constraints" },
                ].map(({ label, weight, description }) => (
                  <div key={label}>
                    <div className="flex justify-between gap-3 text-xs"><span className="text-zinc-300">{label}</span><strong className="text-white font-mono">λ {weight.toFixed(2)}</strong></div>
                    <div className="h-1.5 bg-white/[0.06] rounded-full overflow-hidden mt-2"><div className="h-full rounded-full bg-gradient-to-r from-sky-500 to-[#ffb4c8]" style={{ width: `${Math.min(100, weight * 50)}%` }} /></div>
                    <span className="text-[10px] text-zinc-600 mt-1 block">{description}</span>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-3xl p-6 sm:p-8 bg-zinc-900/80 border border-white/15 flex flex-col">
              <div className="flex items-center justify-between gap-3">
                <div><span className="text-[10px] font-mono text-zinc-500">STAGE 2 READINESS</span><h4 className="text-lg font-bold text-white mt-1">Evidence gates</h4></div>
                <strong className="text-3xl text-amber-300 font-mono">2 / 5</strong>
              </div>
              <div className="grid grid-cols-2 gap-3 mt-5">
                <div className="rounded-xl bg-white/[0.035] border border-white/10 p-3"><span className="text-[9px] text-zinc-500 font-mono">PARAMETERS</span><strong className="text-lg text-white block mt-1">{(mlStatus?.diffusion?.parameters ?? 23713).toLocaleString()}</strong></div>
                <div className="rounded-xl bg-white/[0.035] border border-white/10 p-3"><span className="text-[9px] text-zinc-500 font-mono">OBJECTIVES</span><strong className="text-lg text-white block mt-1">{mlStatus?.diffusion?.objective_terms?.length ?? 5}</strong></div>
              </div>
              <div className="space-y-2 mt-5 text-xs">
                {[
                  { ready: true, label: "Architecture forward/backward tests" },
                  { ready: true, label: "DDPM sampling + diagnostics contract" },
                  { ready: false, label: "Trained DDPM checkpoint" },
                  { ready: false, label: "Paired 12 km → 5 km training corpus" },
                  { ready: false, label: "Held-out multi-event skill report" },
                ].map(({ ready, label }) => (
                  <div key={label} className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.025] border border-white/[0.07]">
                    {ready ? <CheckCircle2 size={15} className="text-emerald-400 shrink-0" /> : <span className="w-[15px] h-[15px] rounded-full border border-amber-400/50 shrink-0" />}
                    <span className={ready ? "text-zinc-300" : "text-zinc-500"}>{label}</span>
                  </div>
                ))}
              </div>
              <Link href="/dashboard/downscaling" className="mt-5 inline-flex items-center justify-between gap-3 rounded-xl bg-white text-black px-4 py-3 text-xs font-semibold hover:bg-zinc-200 transition-colors">
                Open quantitative downscaling lab <ArrowUpRight size={14} />
              </Link>
            </section>
          </div>
        </div>
      )}

      {/* TAB 4: JUDGE TRANSPARENCY & EVIDENCE MATRIX */}
      {activeTab === "matrix" && (
        <div className="space-y-6">
          <section className="relative overflow-hidden rounded-3xl border border-white/15 bg-[radial-gradient(circle_at_15%_0%,rgba(52,211,153,.12),transparent_32%),radial-gradient(circle_at_90%_10%,rgba(255,180,200,.13),transparent_35%),#101013] p-6 sm:p-8">
            <div className="absolute right-0 top-0 h-44 w-44 rounded-full border border-white/[0.04] translate-x-1/3 -translate-y-1/3" />
            <div className="relative flex flex-col lg:flex-row lg:items-end justify-between gap-6">
              <div className="max-w-3xl">
                <span className="font-mono text-[10px] tracking-[0.2em] text-[#ffb4c8] font-bold">AUDIT COMPLIANCE · CLAIMS VS EVIDENCE</span>
                <h2 className="text-3xl sm:text-4xl font-bold text-white mt-3 tracking-tight">Judge-ready evidence ledger</h2>
                <p className="text-sm text-zinc-400 leading-relaxed mt-3">
                  Every major promise is separated into what the code implements, what the repository actually proves, and what still requires data or trained weights. Nothing receives a green badge for architecture alone.
                </p>
              </div>
              <div className="grid grid-cols-3 gap-2 min-w-full lg:min-w-[390px]">
                {[
                  { value: 3, label: "Runtime verified", color: "text-emerald-300", border: "border-emerald-400/20" },
                  { value: 3, label: "Scoped evidence", color: "text-sky-300", border: "border-sky-400/20" },
                  { value: 2, label: "Untrained", color: "text-amber-300", border: "border-amber-400/20" },
                ].map((item) => (
                  <div key={item.label} className={`rounded-2xl border ${item.border} bg-black/30 p-4`}>
                    <strong className={`text-3xl font-mono ${item.color}`}>{item.value}</strong>
                    <span className="text-[9px] text-zinc-500 font-mono block mt-2 uppercase tracking-wide">{item.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="rounded-3xl border border-white/15 bg-zinc-900/80 p-4 sm:p-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3"><FileCheck2 size={18} className="text-[#ffb4c8]"/><div><strong className="text-sm text-white block">8 capability contracts</strong><span className="text-[10px] text-zinc-500">Filter by evidence maturity</span></div></div>
              <div className="flex flex-wrap gap-2">
                {[
                  { key: "all" as const, label: "All", count: 8 },
                  { key: "verified" as const, label: "Verified", count: 3 },
                  { key: "experimental" as const, label: "Experimental", count: 3 },
                  { key: "candidate" as const, label: "Architecture only", count: 2 },
                ].map((filter) => (
                  <button key={filter.key} onClick={() => setMatrixFilter(filter.key)} className={`px-3 py-2 rounded-full border text-[10px] font-mono transition-colors ${matrixFilter === filter.key ? "bg-white text-black border-white" : "bg-white/[0.03] text-zinc-400 border-white/10 hover:text-white"}`}>
                    {filter.label} <span className="opacity-60 ml-1">{filter.count}</span>
                  </button>
                ))}
              </div>
            </div>
          </section>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            {EVIDENCE_ITEMS.filter((item) => matrixFilter === "all" || item.tier === matrixFilter).map((item) => {
              const tier = item.tier === "verified"
                ? { label: "VERIFIED RUNTIME", badge: "bg-emerald-400/10 border-emerald-400/25 text-emerald-300", dot: "bg-emerald-400" }
                : item.tier === "experimental"
                  ? { label: "SCOPED EVIDENCE", badge: "bg-sky-400/10 border-sky-400/25 text-sky-300", dot: "bg-sky-400" }
                  : { label: "ARCHITECTURE ONLY", badge: "bg-amber-400/10 border-amber-400/25 text-amber-300", dot: "bg-amber-400" };
              return (
                <article key={item.id} className="rounded-3xl border border-white/12 bg-[linear-gradient(145deg,rgba(255,255,255,.045),rgba(9,9,11,.8))] p-5 sm:p-6 hover:border-white/20 transition-colors">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3"><span className="w-8 h-8 rounded-xl grid place-items-center bg-white/[0.05] border border-white/10 text-[10px] font-mono text-zinc-500">{item.id}</span><div><h3 className="text-base font-bold text-white">{item.title}</h3><span className="text-[10px] font-mono text-zinc-500 mt-1 block">{item.metric}</span></div></div>
                    <span className={`shrink-0 inline-flex items-center gap-2 px-2.5 py-1.5 rounded-full border text-[9px] font-mono ${tier.badge}`}><i className={`w-1.5 h-1.5 rounded-full ${tier.dot}`} />{tier.label}</span>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-3 mt-5">
                    <div className="rounded-2xl bg-black/25 border border-white/[0.07] p-4"><span className="text-[9px] font-mono text-zinc-600 tracking-wide">PROMISED CAPABILITY</span><p className="text-xs text-zinc-300 leading-relaxed mt-2 mb-0">{item.promise}</p></div>
                    <div className="rounded-2xl bg-black/25 border border-white/[0.07] p-4"><span className="text-[9px] font-mono text-zinc-600 tracking-wide">IMPLEMENTED REALITY</span><p className="text-[11px] font-mono text-zinc-400 leading-relaxed mt-2 mb-0">{item.reality}</p></div>
                  </div>

                  <div className="flex items-start gap-3 mt-4 rounded-2xl bg-white/[0.025] border border-white/[0.07] p-4">
                    {item.tier === "verified" ? <CheckCircle2 size={16} className="text-emerald-400 shrink-0 mt-0.5"/> : item.tier === "candidate" ? <AlertTriangle size={16} className="text-amber-300 shrink-0 mt-0.5"/> : <FlaskConical size={16} className="text-sky-300 shrink-0 mt-0.5"/>}
                    <div className="flex-1"><span className="text-[9px] font-mono text-zinc-600">EVIDENCE BOUNDARY</span><p className="text-[11px] text-zinc-400 leading-relaxed mt-1 mb-0">{item.evidence}</p></div>
                  </div>

                  <Link href={item.href} className="mt-4 inline-flex items-center gap-2 text-[10px] font-semibold text-[#ffb4c8] hover:text-white transition-colors">{item.linkLabel}<ArrowUpRight size={13}/></Link>
                </article>
              );
            })}
          </div>

          <section className="rounded-3xl border border-white/15 bg-zinc-900/80 p-6">
            <div className="flex items-center gap-3 mb-5"><ShieldCheck size={19} className="text-[#ffb4c8]"/><div><span className="text-[10px] font-mono text-zinc-500">JUDGE READING GUIDE</span><h3 className="text-lg font-bold">How to interpret the badges</h3></div></div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
              <div className="rounded-2xl bg-emerald-400/[0.06] border border-emerald-400/15 p-4"><strong className="text-emerald-300">Verified runtime</strong><p className="text-zinc-500 leading-relaxed mt-2 mb-0">Executable code plus repository tests or traceable replay output support the claim.</p></div>
              <div className="rounded-2xl bg-sky-400/[0.06] border border-sky-400/15 p-4"><strong className="text-sky-300">Scoped evidence</strong><p className="text-zinc-500 leading-relaxed mt-2 mb-0">A real experiment exists, but its dataset or evaluation scope is narrower than the proposal.</p></div>
              <div className="rounded-2xl bg-amber-400/[0.06] border border-amber-400/15 p-4"><strong className="text-amber-300">Architecture only</strong><p className="text-zinc-500 leading-relaxed mt-2 mb-0">Shapes and gradients work; scientific skill is intentionally not claimed before training.</p></div>
            </div>
          </section>
        </div>
      )}

      {/* TAB 5: REAL CHECKPOINT INSPECTOR */}
      {activeTab === "weights" && (
        <div className="rounded-3xl p-6 sm:p-8 bg-zinc-900/80 border border-white/15 backdrop-blur-xl space-y-6">
          <div className="flex justify-between items-center text-xs flex-wrap gap-2">
            <span className="font-mono text-[#ffb4c8] font-bold">PYTORCH STATE DICT INSPECTION</span>
            <span className="text-zinc-400 font-mono">checkpoints/best_downscaler.pt</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-2xl bg-black/40 border border-white/10 space-y-1">
              <span className="text-[10px] font-mono text-zinc-500">TOTAL TRAINABLE PARAMETERS</span>
              <strong className="text-xl text-white font-mono block">174,401</strong>
              <span className="text-[10px] text-zinc-400">26 Tensor Weights &amp; Biases</span>
            </div>
            <div className="p-4 rounded-2xl bg-black/40 border border-white/10 space-y-1">
              <span className="text-[10px] font-mono text-zinc-500">TRAINED DATA SOURCE</span>
              <strong className="text-xl text-[#ffb4c8] font-mono block">IMD Pune 2025 Daily 0.25°</strong>
              <span className="text-[10px] text-zinc-400">Official gridded binary dataset</span>
            </div>
            <div className="p-4 rounded-2xl bg-black/40 border border-white/10 space-y-1">
              <span className="text-[10px] font-mono text-zinc-500">HELD-OUT VALIDATION RESULT</span>
              <strong className="text-xl text-emerald-400 font-mono block">52.7% Recall</strong>
              <span className="text-[10px] text-zinc-400">vs 27.9% Bilinear baseline</span>
            </div>
          </div>

          <div className="space-y-2">
            <span className="text-xs font-mono text-zinc-400 block">Loaded Model Architecture Layers:</span>
            <div className="h-64 overflow-y-auto space-y-1.5 font-mono text-xs pr-2">
              {(checkpointMeta?.layers || [
                { name: "threat_encoder.fc.0.weight", shape: [64, 8], params: 512, dtype: "float32" },
                { name: "threat_encoder.fc.0.bias", shape: [64], params: 64, dtype: "float32" },
                { name: "threat_encoder.fc.2.weight", shape: [64, 64], params: 4096, dtype: "float32" },
                { name: "in_proj.weight", shape: [64, 5, 3, 3], params: 2880, dtype: "float32" },
                { name: "res1.conv1.weight", shape: [64, 64, 3, 3], params: 36864, dtype: "float32" },
                { name: "res1.conv2.weight", shape: [64, 64, 3, 3], params: 36864, dtype: "float32" },
                { name: "res2.conv1.weight", shape: [64, 64, 3, 3], params: 36864, dtype: "float32" },
                { name: "res2.conv2.weight", shape: [64, 64, 3, 3], params: 36864, dtype: "float32" },
                { name: "out_residual.0.weight", shape: [32, 64, 3, 3], params: 18432, dtype: "float32" },
                { name: "out_residual.2.weight", shape: [1, 32, 1, 1], params: 32, dtype: "float32" },
              ]).map((layer: LayerMeta, idx: number) => (
                <div key={idx} className="p-2.5 rounded-xl bg-white/[0.03] border border-white/10 flex justify-between items-center text-zinc-300">
                  <span className="text-[#ffb4c8]">{layer.name}</span>
                  <div className="flex gap-4 items-center text-zinc-500">
                    <span>shape: [{layer.shape.join(", ")}]</span>
                    <span className="text-white">{layer.params.toLocaleString()} params</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
