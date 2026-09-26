import { Suspense } from "react";
import TerminalConsole from "@/components/dashboard/TerminalConsole";

export const metadata = {
  title: "Terminal & CLI | Avarta Meteorological Engine",
  description:
    "Interactive web-based Terminal User Interface (TUI) and CLI console for running real-time meteorological tracking, Fourier PSD spectral diagnostics, PINN physics assertions, and OASIS CAP 1.2 generation.",
};

function TerminalPageContent({ searchParams }: { searchParams?: { case?: string } }) {
  const initialCase = searchParams?.case || "rainfall";

  return (
    <div style={{ padding: "10px 0" }}>
      <div style={{ marginBottom: "14px", display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: "10px" }}>
        <div>
          <h1 style={{ fontSize: "20px", fontWeight: "700", margin: "0 0 4px", color: "var(--foreground, #153c35)" }}>
            Terminal & CLI Mission Control
          </h1>
          <p style={{ margin: 0, fontSize: "12.5px", color: "var(--muted, #6c887e)" }}>
            Full-featured interactive web emulator for <code>avarta_tui.py</code>. Run all 15 operational analysis views, pinpoint GIS queries, and physical loss benchmarks.
          </p>
        </div>
        <div style={{ display: "flex", gap: "8px", fontSize: "11px", color: "var(--muted, #6c887e)" }}>
          <span>VT100 / XTerm-256color</span>
          <span>•</span>
          <span>Python 3.14 + Rich</span>
        </div>
      </div>

      <TerminalConsole initialCase={initialCase} />
    </div>
  );
}

export default function TerminalPage({ searchParams }: { searchParams?: { case?: string } }) {
  return (
    <Suspense fallback={<div style={{ padding: "40px", textAlign: "center", color: "#6c887e" }}>Initializing Avarta Terminal Console…</div>}>
      <TerminalPageContent searchParams={searchParams} />
    </Suspense>
  );
}
