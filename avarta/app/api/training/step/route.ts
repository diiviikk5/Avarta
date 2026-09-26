import { NextResponse } from "next/server";
import { exec } from "node:child_process";
import { promisify } from "node:util";
import { join } from "node:path";
import { existsSync } from "node:fs";

const execAsync = promisify(exec);

export async function POST(req: Request) {
  let step = 1;
  let hazard = "rainfall";
  try {
    const body = await req.json();
    if (body.step) step = Number(body.step);
    if (body.hazard) hazard = String(body.hazard);
  } catch {}

  const repoRoot = join(process.cwd(), "..");
  const venvPython = join(repoRoot, ".venv", "bin", "python");
  const scriptPath = join(repoRoot, "services", "live_ml_service.py");

  if (existsSync(venvPython) && existsSync(scriptPath)) {
    try {
      const { stdout } = await execAsync(`"${venvPython}" "${scriptPath}" step ${step}`, {
        cwd: repoRoot,
        timeout: 10000,
      });
      const data = JSON.parse(stdout);
      return NextResponse.json({
        success: true,
        source: "live_pytorch_forward_backward_pass",
        ...data,
      });
    } catch (e) {
      console.warn("Python training step fallback:", e);
    }
  }

  return NextResponse.json({
    success: false,
    source: "training_runtime_unavailable",
    step,
    hazard,
    error: "The local PyTorch step did not complete. No simulated loss curve was substituted.",
  }, { status: 503 });
}
