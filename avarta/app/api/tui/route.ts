import { NextResponse } from "next/server";
import { execFile } from "child_process";
import path from "path";
import fs from "fs";

// Resolve Python executable and script paths
function getExecutionPaths() {
  const cwd = process.cwd();
  const possibleRoots = [
    path.resolve(cwd, ".."), // If cwd is /.../avarta
    cwd,                     // If cwd is project root
  ];

  let pythonPath = "python3";
  let scriptPath = "";

  for (const root of possibleRoots) {
    const venvPython = path.join(root, ".venv", "bin", "python");
    if (fs.existsSync(venvPython)) {
      pythonPath = venvPython;
      scriptPath = path.join(root, "services", "tui_api_bridge.py");
      return { pythonPath, scriptPath, rootDir: root };
    }
  }

  // Fallback
  const rootDir = possibleRoots[0];
  return {
    pythonPath: "python3",
    scriptPath: path.join(rootDir, "services", "tui_api_bridge.py"),
    rootDir,
  };
}

async function runTuiCommand(
  cmd: string = "overview",
  caseName: string = "rainfall",
  themeName: string = "forest",
  width: number = 85
): Promise<{ status: string; html?: string; raw?: string; [key: string]: unknown }> {
  const { pythonPath, scriptPath, rootDir } = getExecutionPaths();

  return new Promise((resolve) => {
    const args = [
      scriptPath,
      cmd,
      "--case",
      caseName || "rainfall",
      "--theme",
      themeName || "forest",
      "--width",
      String(width || 85),
      "--json",
    ];

    execFile(
      /*turbopackIgnore: true*/
      pythonPath,
      args,
      {
        cwd: rootDir,
        timeout: 12000,
        maxBuffer: 10 * 1024 * 1024,
        env: {
          ...process.env,
          PYTHONUNBUFFERED: "1",
          FORCE_COLOR: "1",
          TERM: "xterm-256color",
        },
      },
      (error, stdout, stderr) => {
        if (error) {
          console.error("TUI Execution Error:", error, stderr);
          resolve({
            status: "error",
            error: error.message,
            stderr: stderr?.toString() || "",
            raw: `Command execution failed: ${error.message}\n${stderr || ""}`,
            html: `<div style="color: #ef4444; padding: 12px; font-weight: bold;">Error executing command '${cmd}': ${error.message}</div>`,
            command: cmd,
            case: caseName,
            theme: themeName,
          });
          return;
        }

        try {
          const parsed = JSON.parse(stdout.trim());
          resolve(parsed);
        } catch {
          resolve({
            status: "ok",
            command: cmd,
            case: caseName,
            theme: themeName,
            raw: stdout,
            html: `<pre style="color: #e2ede8; font-family: monospace;">${stdout}</pre>`,
          });
        }
      }
    );
  });
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const cmd = url.searchParams.get("cmd") || "overview";
  const caseName = url.searchParams.get("case") || "rainfall";
  const themeName = url.searchParams.get("theme") || "forest";
  const width = Number(url.searchParams.get("width") || "85");

  const result = await runTuiCommand(cmd, caseName, themeName, width);
  return NextResponse.json(result);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const cmd = body.cmd || body.command || "overview";
    const caseName = body.case || "rainfall";
    const themeName = body.theme || "forest";
    const width = Number(body.width || 85);

    const result = await runTuiCommand(cmd, caseName, themeName, width);
    return NextResponse.json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Invalid request payload";
    return NextResponse.json(
      { status: "error", error: message },
      { status: 400 }
    );
  }
}
