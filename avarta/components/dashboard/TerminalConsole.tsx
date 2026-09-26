"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Terminal as TerminalIcon,
  Play,
  RotateCcw,
  Copy,
  Check,
  Download,
  Maximize2,
  Minimize2,
  Sparkles,
  Layers,
  HelpCircle,
  FolderGit2,
} from "lucide-react";
import styles from "./terminal.module.css";

interface TerminalEntry {
  id: string;
  command: string;
  caseName: string;
  themeName: string;
  html: string;
  raw: string;
  timestamp: string;
  durationMs?: number;
}

const AVAILABLE_THEMES = [
  { id: "rose", label: "🌸 Argus Rose (Default)" },
  { id: "forest", label: "🌲 Forest" },
  { id: "midnight", label: "🌌 Midnight Slate" },
  { id: "cyan", label: "💠 Cyan Matrix" },
  { id: "amber", label: "🔥 Amber CRT" },
  { id: "aurora", label: "🔮 Aurora Violet" },
  { id: "crimson", label: "🚨 Crimson Alert" },
  { id: "synthwave", label: "🌆 Synthwave" },
  { id: "stealth", label: "🌑 Stealth Charcoal" },
  { id: "mono", label: "⚪ Monochrome" },
];

const AVAILABLE_CASES = [
  { id: "rainfall", label: "🌧️ Rainfall (Aug 2025)" },
  { id: "cyclone", label: "🌀 Cyclone Amphan (May 2020)" },
  { id: "heatwave", label: "☀️ Heat Dome (May 2024)" },
];

const QUICK_COMMANDS = [
  { label: "1 Overview", cmd: "overview" },
  { label: "2 Rain Map", cmd: "map" },
  { label: "3 Timeline", cmd: "timeline" },
  { label: "4 Benchmark", cmd: "benchmark" },
  { label: "5 Provenance", cmd: "sources" },
  { label: "6 Alerts", cmd: "alerts" },
  { label: "9 Risk Matrix", cmd: "risk" },
  { label: "10 Trajectories", cmd: "events" },
  { label: "11 Forecast (Delhi/NCR)", cmd: "forecast 28.40 77.31" },
  { label: "12 Spectral PSD", cmd: "spectral" },
  { label: "13 Agromet (GKMS)", cmd: "agromet" },
  { label: "14 CAP 1.2 XML", cmd: "cap" },
  { label: "15 5km GIS Lifelines", cmd: "gis" },
  { label: "🤖 What Happens Here", cmd: "ask 28.53 77.39" },
  { label: "☰ Menu", cmd: "menu" },
  { label: "📖 Help", cmd: "help" },
];

export default function TerminalConsole({ initialCase = "rainfall" }: { initialCase?: string }) {
  const [history, setHistory] = useState<TerminalEntry[]>([]);
  const [inputCmd, setInputCmd] = useState("");
  const [activeCase, setActiveCase] = useState(initialCase);
  const [activeTheme, setActiveTheme] = useState("rose");
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [historyIdx, setHistoryIdx] = useState(-1);
  const [fontSize, setFontSize] = useState<"sm" | "md" | "lg">("md");

  const terminalBodyRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll terminal body on new output
  useEffect(() => {
    if (terminalBodyRef.current) {
      terminalBodyRef.current.scrollTop = terminalBodyRef.current.scrollHeight;
    }
  }, [history, isLoading]);

  // Execute command function
  const runCommand = useCallback(
    async (cmdToRun: string) => {
      const trimmed = cmdToRun.trim();
      if (!trimmed) return;

      // Handle client-side commands
      const lower = trimmed.toLowerCase();
      if (lower === "clear" || lower === "cls") {
        setHistory([]);
        setInputCmd("");
        return;
      }

      if (lower.startsWith("theme ")) {
        const themeArg = lower.replace("theme ", "").trim();
        if (AVAILABLE_THEMES.some((t) => t.id === themeArg)) {
          setActiveTheme(themeArg);
          setHistory((prev) => [
            ...prev,
            {
              id: Math.random().toString(),
              command: trimmed,
              caseName: activeCase,
              themeName: themeArg,
              html: `<div style="color: #ffb4c8; font-weight: bold;">Switched TUI theme to: ${themeArg}</div>`,
              raw: `Switched TUI theme to: ${themeArg}`,
              timestamp: new Date().toLocaleTimeString(),
              durationMs: 1,
            },
          ]);
          setInputCmd("");
          return;
        }
      }

      if (lower.startsWith("case ")) {
        const caseArg = lower.replace("case ", "").trim();
        if (AVAILABLE_CASES.some((c) => c.id === caseArg)) {
          setActiveCase(caseArg);
          setHistory((prev) => [
            ...prev,
            {
              id: Math.random().toString(),
              command: trimmed,
              caseName: caseArg,
              themeName: activeTheme,
              html: `<div style="color: #ffb4c8; font-weight: bold;">Switched active hazard case to: ${caseArg}</div>`,
              raw: `Switched active hazard case to: ${caseArg}`,
              timestamp: new Date().toLocaleTimeString(),
              durationMs: 1,
            },
          ]);
          setInputCmd("");
          return;
        }
      }

      // Add to command history
      setCommandHistory((prev) => [...prev, trimmed]);
      setHistoryIdx(-1);
      setIsLoading(true);
      setInputCmd("");

      try {
        const response = await fetch("/api/tui", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            cmd: trimmed,
            case: activeCase,
            theme: activeTheme,
            width: 85,
          }),
        });

        const data = await response.json();

        setHistory((prev) => [
          ...prev,
          {
            id: Math.random().toString(),
            command: trimmed,
            caseName: data.case || activeCase,
            themeName: data.theme || activeTheme,
            html: data.html || `<pre>${data.raw || "No output"}</pre>`,
            raw: data.raw || "No output",
            timestamp: new Date().toLocaleTimeString(),
            durationMs: data.execution_time_ms,
          },
        ]);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Failed to reach TUI service";
        setHistory((prev) => [
          ...prev,
          {
            id: Math.random().toString(),
            command: trimmed,
            caseName: activeCase,
            themeName: activeTheme,
            html: `<div style="color: #ef4444; font-weight: bold;">Network or execution error: ${message}</div>`,
            raw: `Error: ${message}`,
            timestamp: new Date().toLocaleTimeString(),
          },
        ]);
      } finally {
        setIsLoading(false);
        // Refocus input
        setTimeout(() => inputRef.current?.focus(), 50);
      }
    },
    [activeCase, activeTheme]
  );

  // Initial greeting run on mount
  useEffect(() => {
    const initial = window.setTimeout(() => void runCommand("overview"), 0);
    return () => window.clearTimeout(initial);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keyboard navigation for history (Up / Down)
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      runCommand(inputCmd);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (commandHistory.length > 0) {
        const nextIdx = historyIdx === -1 ? commandHistory.length - 1 : Math.max(0, historyIdx - 1);
        setHistoryIdx(nextIdx);
        setInputCmd(commandHistory[nextIdx]);
      }
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      if (historyIdx !== -1) {
        const nextIdx = historyIdx + 1;
        if (nextIdx < commandHistory.length) {
          setHistoryIdx(nextIdx);
          setInputCmd(commandHistory[nextIdx]);
        } else {
          setHistoryIdx(-1);
          setInputCmd("");
        }
      }
    } else if (e.key === "l" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      setHistory([]);
    } else if (e.key === "Tab") {
      e.preventDefault();
      // Simple tab completion
      const matches = QUICK_COMMANDS.map((q) => q.cmd).filter((c) =>
        c.startsWith(inputCmd.toLowerCase().trim())
      );
      if (matches.length > 0) {
        setInputCmd(matches[0]);
      }
    }
  };

  const copyLog = () => {
    const fullLog = history
      .map(
        (h) =>
          `[${h.timestamp}] avarta@ncmrwf:~$ ${h.command}\n${"-".repeat(70)}\n${h.raw}\n`
      )
      .join("\n\n");
    navigator.clipboard.writeText(fullLog);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadLog = () => {
    const fullLog = history
      .map(
        (h) =>
          `[${h.timestamp}] avarta@ncmrwf:~$ ${h.command}\n${"-".repeat(70)}\n${h.raw}\n`
      )
      .join("\n\n");
    const blob = new Blob([fullLog], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `avarta-tui-${activeCase}-${Date.now()}.log`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const fontSizeClass =
    fontSize === "sm" ? { fontSize: "11.5px" } : fontSize === "lg" ? { fontSize: "14px" } : { fontSize: "12.5px" };

  return (
    <div
      className={styles.terminalContainer}
      style={
        isFullscreen
          ? {
              position: "fixed",
              top: 0,
              left: 0,
              width: "100vw",
              height: "100vh",
              zIndex: 9999,
              borderRadius: 0,
            }
          : {}
      }
    >
      {/* Chrome Topbar */}
      <div className={styles.terminalChrome}>
        <div className={styles.windowControls}>
          <div className={styles.dotRed} onClick={() => setHistory([])} title="Clear terminal" />
          <div
            className={styles.dotYellow}
            onClick={() => setFontSize((f) => (f === "sm" ? "md" : f === "md" ? "lg" : "sm"))}
            title="Cycle font size"
          />
          <div
            className={styles.dotGreen}
            onClick={() => setIsFullscreen((prev) => !prev)}
            title="Toggle fullscreen"
          />
          <div className={styles.terminalTitle}>
            <TerminalIcon size={14} color="#ffb4c8" />
            <span>avarta-tui — python avarta_tui.py</span>
            <span className={styles.statusBadge}>
              <span className={styles.statusDot} />
              LIVE TUI · VT100
            </span>
          </div>
        </div>

        <div className={styles.terminalToolbar}>
          {/* Multi-hazard Case Selector */}
          <select
            className={styles.selectorSelect}
            value={activeCase}
            onChange={(e) => {
              const newCase = e.target.value;
              setActiveCase(newCase);
              runCommand(`overview --case ${newCase}`);
            }}
            title="Select Hazard Case"
          >
            {AVAILABLE_CASES.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>

          {/* Theme Palette Selector */}
          <select
            className={styles.selectorSelect}
            value={activeTheme}
            onChange={(e) => {
              const newTheme = e.target.value;
              setActiveTheme(newTheme);
              runCommand(`overview --theme ${newTheme}`);
            }}
            title="Select Terminal Theme"
          >
            {AVAILABLE_THEMES.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
          </select>

          {/* Action buttons */}
          <button className={styles.toolBtn} onClick={copyLog} title="Copy full session log">
            {copied ? <Check size={12} color="#ffb4c8" /> : <Copy size={12} />}
            <span>{copied ? "Copied" : "Copy Log"}</span>
          </button>

          <button className={styles.toolBtn} onClick={downloadLog} title="Export as text log file">
            <Download size={12} />
            <span>Export</span>
          </button>

          <button
            className={styles.toolBtn}
            onClick={() => setHistory([])}
            title="Clear terminal session (Ctrl+L)"
          >
            <RotateCcw size={12} />
            <span>Clear</span>
          </button>

          <button
            className={styles.toolBtn}
            onClick={() => setIsFullscreen((prev) => !prev)}
            title="Toggle Fullscreen"
          >
            {isFullscreen ? <Minimize2 size={12} /> : <Maximize2 size={12} />}
          </button>
        </div>
      </div>

      {/* Quick Action Ribbon */}
      <div className={styles.quickRibbon}>
        <span className={styles.ribbonLabel}>QUICK RUN:</span>
        {QUICK_COMMANDS.map((q) => (
          <button
            key={q.cmd}
            className={styles.quickChip}
            onClick={() => runCommand(q.cmd)}
            disabled={isLoading}
          >
            <span>{q.label}</span>
          </button>
        ))}
      </div>

      {/* Terminal Output Area */}
      <div
        className={styles.terminalBody}
        ref={terminalBodyRef}
        style={fontSizeClass}
        onClick={() => inputRef.current?.focus()}
      >
        <div className={styles.terminalWelcome}>
          <div className={styles.welcomeAscii}>
{`   ___ _   _____ _____ _____ ___ 
  / _ \\ | / / _ |_   _|_   _/ _ \\
 / // / |/ / __ | | |   | |/ // /
/_/ \\_\\___/_/ |_| |_|   |_/_/ \\_\\
Evidence-First Terminal User Interface · NCMRWF #26078`}
          </div>
          <div className={styles.welcomeText}>
            Connected to <strong>Avarta Meteorological Engine (Python Rich Runtime)</strong>.
          </div>
          <div style={{ color: "#a1a1aa", fontSize: "11px" }}>
            Type any command (e.g. <code>overview</code>, <code>map</code>, <code>spectral</code>, <code>forecast 28.40 77.31</code>, or <code>1</code>–<code>15</code>) below or click the quick action chips.
          </div>
        </div>

        {/* Output History */}
        {history.map((entry) => (
          <div key={entry.id} className={styles.historyBlock}>
            <div className={styles.commandPromptLine}>
              <div>
                <span className={styles.promptUser}>avarta</span>
                <span className={styles.promptAt}>@</span>
                <span className={styles.promptHost}>ncmrwf</span>:
                <span className={styles.promptPath}>~</span>
                <span className={styles.promptDollar}>$</span>
                <span className={styles.commandExecuted}>{entry.command}</span>
              </div>
              <div className={styles.commandMeta}>
                <span>{entry.timestamp}</span>
                {entry.durationMs !== undefined && (
                  <span style={{ marginLeft: "8px", color: "#ffb4c8" }}>
                    {entry.durationMs.toFixed(1)}ms
                  </span>
                )}
              </div>
            </div>

            <div
              className={styles.terminalOutput}
              dangerouslySetInnerHTML={{ __html: entry.html }}
            />
          </div>
        ))}

        {/* Loading Spinner */}
        {isLoading && (
          <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#ffb4c8", margin: "10px 0" }}>
            <span className={styles.loadingSpinner} />
            <span style={{ fontSize: "12px", fontStyle: "italic" }}>
              Executing meteorological computation via Python backend…
            </span>
          </div>
        )}
      </div>

      {/* Input Prompt Bar */}
      <div className={styles.inputBar}>
        <div className={styles.promptPrefix}>
          <span className={styles.promptUser}>avarta</span>
          <span className={styles.promptAt}>@</span>
          <span className={styles.promptHost}>ncmrwf</span>:
          <span className={styles.promptPath}>~</span>
          <span className={styles.promptDollar}>$</span>
        </div>

        <input
          ref={inputRef}
          type="text"
          className={styles.cmdInput}
          value={inputCmd}
          onChange={(e) => setInputCmd(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type command (e.g. 'map', 'spectral', 'forecast 28.40 77.31', 'help')..."
          autoFocus
          disabled={isLoading}
        />

        <button
          className={styles.runBtn}
          onClick={() => runCommand(inputCmd)}
          disabled={isLoading || !inputCmd.trim()}
        >
          <Play size={12} />
          <span>Execute</span>
        </button>
      </div>

      {/* Keyboard Shortcuts Hint Bar */}
      <div className={styles.hintBar}>
        <div>
          <span>Shortcuts: </span>
          <kbd>Enter</kbd> execute &nbsp;•&nbsp; <kbd>↑ / ↓</kbd> history &nbsp;•&nbsp; <kbd>Tab</kbd> autocomplete &nbsp;•&nbsp; <kbd>Ctrl+L</kbd> clear
        </div>
        <div>
          <span>Active Case: </span>
          <strong style={{ color: "#ffb4c8" }}>{activeCase.toUpperCase()}</strong>
          &nbsp;•&nbsp;
          <span>Theme: </span>
          <strong style={{ color: "#60a5fa" }}>{activeTheme}</strong>
        </div>
      </div>
    </div>
  );
}
