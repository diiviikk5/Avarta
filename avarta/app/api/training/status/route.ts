import { NextResponse } from "next/server";
import { exec } from "node:child_process";
import { promisify } from "node:util";
import { join } from "node:path";
import { existsSync, readFileSync } from "node:fs";

const execAsync = promisify(exec);

export async function GET() {
  const repoRoot = join(process.cwd(), "..");
  const venvPython = join(repoRoot, ".venv", "bin", "python");
  const scriptPath = join(repoRoot, "services", "live_ml_service.py");

  // Attempt real Python execution
  if (existsSync(venvPython) && existsSync(scriptPath)) {
    try {
      const { stdout } = await execAsync(`"${venvPython}" "${scriptPath}" status`, {
        cwd: repoRoot,
        timeout: 5000,
      });
      const data = JSON.parse(stdout);
      return NextResponse.json({
        success: true,
        source: "live_pytorch_environment",
        ...data,
      });
    } catch (e) {
      console.warn("Python execution fallback:", e);
    }
  }

  // Robust fallback metadata matching actual repo files
  const benchmarkFile = join(process.cwd(), "public", "replay", "training-benchmark.json");
  const checkpointFile = join(repoRoot, "checkpoints", "best_downscaler.pt");
  let benchmarkData = null;
  if (existsSync(benchmarkFile)) {
    try {
      benchmarkData = JSON.parse(readFileSync(benchmarkFile, "utf-8"));
    } catch {}
  }

  return NextResponse.json({
    success: true,
    source: "filesystem_only_fallback",
    checkpoint: {
      checkpoint_exists: existsSync(checkpointFile),
      path: checkpointFile,
      total_parameters: null,
      layers: [],
      imd_validation: benchmarkData,
      note: "Python checkpoint inspection was unavailable; no weights or metrics are fabricated by this fallback.",
    },
    diffusion: {
      total_timesteps: 100,
      diffusion_schedule: "Linear beta schedule [1e-4 -> 0.02]",
      trained_checkpoint: false,
      validated_5km_skill: false,
    },
    gnn: {
      level: 2,
      total_nodes: 162,
      total_edges: 960,
      architecture: "EnsembleTemporalSphericalGNN (edge geometry + member attention + GRU)",
      trained_checkpoint: false,
    },
  });
}
