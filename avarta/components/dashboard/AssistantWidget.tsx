"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Bot, ChevronRight, CornerDownLeft, Sparkles, X } from "lucide-react";
import styles from "./replay.module.css";

interface AssistantLink {
  label: string;
  href: string;
}

interface Message {
  id: number;
  role: "assistant" | "user";
  text: string;
  links?: AssistantLink[];
}

const CITY_COORDS: Record<string, [number, number, string]> = {
  delhi: [28.61, 77.21, "Delhi (NCR)"],
  faridabad: [28.40, 77.31, "Faridabad"],
  noida: [28.53, 77.39, "Noida"],
  gurugram: [28.46, 77.03, "Gurugram"],
  mumbai: [19.07, 72.87, "Mumbai"],
  kolkata: [22.57, 88.36, "Kolkata"],
  chennai: [13.08, 80.27, "Chennai"],
  bengaluru: [12.97, 77.59, "Bengaluru"],
  bangalore: [12.97, 77.59, "Bengaluru"],
  hyderabad: [17.38, 78.48, "Hyderabad"],
  ahmedabad: [23.02, 72.57, "Ahmedabad"],
  jaipur: [26.91, 75.79, "Jaipur"],
  lucknow: [26.85, 80.95, "Lucknow"],
  chandigarh: [30.73, 76.78, "Chandigarh"],
  patna: [25.60, 85.14, "Patna"],
  bhubaneswar: [20.29, 85.82, "Bhubaneswar"],
  guwahati: [26.14, 91.73, "Guwahati"],
  pune: [18.52, 73.85, "Pune"],
  shimla: [31.10, 77.17, "Shimla"],
  srinagar: [34.08, 74.80, "Srinagar"],
  amritsar: [31.63, 74.87, "Amritsar"],
  dehradun: [30.31, 78.03, "Dehradun"],
};

const SUGGESTIONS = [
  "Risk bands explained",
  "What is PINN loss?",
  "Why downscale?",
  "Forecast for Delhi",
  "Cyclone Amphan replay",
];

const QUICK_NAV: AssistantLink[] = [
  { label: "Overview", href: "/dashboard" },
  { label: "Risk Map", href: "/dashboard/risk" },
  { label: "Downscaling", href: "/dashboard/downscaling" },
  { label: "Trajectory", href: "/dashboard/trajectory" },
  { label: "Validation", href: "/dashboard/validation" },
];

let msgId = 1;
const createMessage = (text: string, links?: AssistantLink[]): Message => ({
  id: msgId++,
  role: "assistant",
  text,
  links,
});

async function fetchPointForecast(lat: number, lon: number): Promise<{ precipitation_mm?: number; band?: string; risk_score?: number } | null> {
  try {
    const res = await fetch(`/api/forecast?lat=${lat.toFixed(2)}&lon=${lon.toFixed(2)}`);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

async function generateReply(input: string): Promise<Message> {
  const query = input.toLowerCase().trim();
  const includesAny = (...keywords: string[]) => keywords.some((kw) => query.includes(kw));

  if (!query) {
    return createMessage("Feel free to ask me anything about extreme weather forecasts, physics downscaling, or navigating the platform! 🌦️");
  }

  // Greetings
  if (includesAny("hello", "hi", "hey", "namaste", "morning", "evening")) {
    return createMessage(
      "Namaste! I'm Avarta Assistant, your meteorological AI guide. I can query pinpoint forecasts for any Indian city, explain physical downscaling & PINN loss, or guide you through risk maps and cyclone tracking.",
      QUICK_NAV,
    );
  }

  // Gratitude
  if (includesAny("thank", "thanks", "awesome", "great", "cool", "shukriya")) {
    return createMessage("You're very welcome! Let me know if you need to inspect forecasts, run downscaling, or check risk metrics. 🌤️");
  }

  // City pinpoint weather query
  for (const [key, [lat, lon, cityName]] of Object.entries(CITY_COORDS)) {
    if (query.includes(key)) {
      const forecast = await fetchPointForecast(lat, lon);
      if (forecast) {
        const precip = forecast.precipitation_mm ?? 0;
        const band = forecast.band ?? "LOW";
        const score = forecast.risk_score ?? 0;
        return createMessage(
          `Pinpoint forecast for ${cityName} (${lat.toFixed(2)}°N, ${lon.toFixed(2)}°E):\n• Rain rate: ${precip.toFixed(1)} mm/day\n• Risk Score: ${score}/100 (${band})\n• Downscaled Grid: 5 km orography-corrected mesh.`,
          [
            { label: "Open Inspector", href: `/dashboard/inspector?lat=${lat}&lon=${lon}` },
            { label: "View Risk Map", href: "/dashboard/risk" },
          ],
        );
      }
      return createMessage(
        `Found coordinates for ${cityName}: ${lat.toFixed(2)}°N, ${lon.toFixed(2)}°E. Click below to inspect localized physical anomalies:`,
        [{ label: `Inspect ${cityName}`, href: `/dashboard/inspector?lat=${lat}&lon=${lon}` }],
      );
    }
  }

  // Risk bands
  if (includesAny("risk band", "risk score", "bands", "severity", "low moderate high severe")) {
    return createMessage(
      "Avarta classifies extreme weather into 4 distinct risk bands:\n" +
      "🟢 LOW (0–30): Routine vigilance, no immediate asset disruption.\n" +
      "🟡 MODERATE (30–60): Urban runoff watch, clearing arterial drains.\n" +
      "🟠 HIGH (60–80): District-level staging, power grid substations on standby.\n" +
      "🔴 SEVERE (80–100): Immediate NDRF mobilization & reservoir discharge protocol.",
      [{ label: "Open 3D Risk Map", href: "/dashboard/risk" }],
    );
  }

  // PINN loss / Physics
  if (includesAny("pinn", "physics", "loss", "conservation", "moisture flux")) {
    return createMessage(
      "Our Physics-Informed Neural Network (PINN) loss enforces fundamental atmospheric laws during ML downscaling:\n" +
      "1. Moisture Flux Conservation: -∇·(q v)\n" +
      "2. Continuity Mass Conservation: ∇·v = 0\n" +
      "3. One-sided barrier function: ReLU(-y)² strictly preventing non-physical negative rainfall\n" +
      "4. Asymmetric tail penalty preserving 95th+ climatological extreme peaks.",
      [{ label: "Downscaling Lab", href: "/dashboard/downscaling" }],
    );
  }

  // Downscaling & Spectral smoothing
  if (includesAny("downscal", "spectral", "smoothing", "resolution", "diffusion", "5km")) {
    return createMessage(
      "Standard deep learning models (CNNs, U-Nets) suffer from 'spectral smoothing' — blurring localized extremes.\n" +
      "Avarta couples a Conditional Diffusion Model with a 5 km DEM Topography Engine. In our 2D Fourier PSD benchmark:\n" +
      "• Bilinear interpolation: 1.7% high-frequency energy\n" +
      "• Standard CNN: 11.7% energy\n" +
      "• Avarta PINN/Diffusion: 50.7% energy retained!",
      [{ label: "Inspect Spectral PSD", href: "/dashboard/downscaling" }],
    );
  }

  // Cyclone Amphan
  if (includesAny("cyclone", "amphan", "vorticity", "track", "eye")) {
    return createMessage(
      "Super Cyclone Amphan (May 2020) Replay:\n" +
      "• Min Central Pressure: 907 hPa\n" +
      "• Peak Wind Gusts: 260 km/h\n" +
      "• 850 hPa Relative Vorticity: +4.2 × 10⁻⁴ s⁻¹\n" +
      "• 3- to 7-day cone-of-uncertainty tracking with Kalman state estimation.",
      [{ label: "Replay Amphan Case", href: "/dashboard?case=cyclone" }],
    );
  }

  // Heatwave
  if (includesAny("heat", "heatwave", "temperature", "wet-bulb", "heat dome")) {
    return createMessage(
      "May 2024 North India Heat Dome Replay:\n" +
      "• Peak Observed Temp: 49.6°C (Mungeshpur/Najafgarh)\n" +
      "• 500 hPa Geopotential Ridge: >5,940 gpm\n" +
      "• NOAA Heat Index: 56.2°C (Extreme Danger)\n" +
      "• Stull Psychrometric Wet-Bulb: 32.4°C (near fatal physiological threshold).",
      [{ label: "Replay Heatwave Case", href: "/dashboard?case=heatwave" }],
    );
  }

  // Alerts & CAP
  if (includesAny("alert", "cap", "warning", "ndma", "agromet", "farmer")) {
    return createMessage(
      "Avarta generates machine-readable OASIS CAP 1.2 XML feeds for state disaster authorities (NDMA/SDMA) and GKMS agricultural advisories tailored to crop growth stages (paddy, cotton, groundnut). Note: This prototype provides decision-support drafts; official warnings are issued by IMD.",
      [
        { label: "View CAP & Agromet", href: "/dashboard/downscaling" },
        { label: "Overview Alerts", href: "/dashboard" },
      ],
    );
  }

  // Navigation shortcuts
  if (includesAny("page", "navigate", "where", "show me", "menu", "section")) {
    return createMessage(
      "Here are the primary dashboard workspaces available in Avarta:",
      QUICK_NAV,
    );
  }

  // Default fallback
  return createMessage(
    `I can help analyze "${input.slice(0, 45)}...". You can ask me to look up any Indian city's forecast, explain PINN physics loss, describe risk bands, or switch between Cyclone Amphan and Heatwave replays.`,
    QUICK_NAV,
  );
}

export default function AssistantWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    createMessage(
      "Hello! I am Avarta's AI Assistant. How can I assist your meteorological workflow today?",
      QUICK_NAV.slice(0, 3),
    ),
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, isTyping, isOpen]);

  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
    }
  }, [isOpen]);

  const handleToggle = () => {
    setIsOpen((prev) => !prev);
    setHasInteracted(true);
  };

  const handleSend = async (textToSend: string) => {
    const trimmed = textToSend.trim();
    if (!trimmed || isTyping) return;

    setMessages((prev) => [...prev, { id: msgId++, role: "user", text: trimmed }]);
    setInput("");
    setIsTyping(true);

    try {
      // Simulate rapid AI inference
      await new Promise((res) => setTimeout(res, 400));
      const reply = await generateReply(trimmed);
      setMessages((prev) => [...prev, reply]);
    } catch {
      setMessages((prev) => [
        ...prev,
        createMessage("Apologies, I encountered an issue analyzing the query. Please try again!"),
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className={styles.assistantRoot}>
      {isOpen && (
        <section
          className={styles.assistantPanel}
          role="dialog"
          aria-label="Avarta AI Assistant Chat"
          aria-modal="false"
        >
          {/* Header */}
          <header className={styles.assistantHeader}>
            <div className={styles.assistantIdentity}>
              <div className={styles.assistantAvatar}>
                <Bot size={18} />
                <span className={styles.assistantOnlineDot} />
              </div>
              <div>
                <strong>Avarta AI Assistant</strong>
                <span className={styles.assistantStatusText}>Meteorological Copilot · Online</span>
              </div>
            </div>
            <button
              type="button"
              className={styles.assistantCloseBtn}
              onClick={() => setIsOpen(false)}
              aria-label="Close Assistant"
              title="Close Assistant (Esc)"
            >
              <X size={15} />
            </button>
          </header>

          {/* Messages scroll area */}
          <div className={styles.assistantMessages} ref={scrollRef}>
            {messages.map((m) => (
              <div
                key={m.id}
                className={m.role === "user" ? styles.assistantUserRow : styles.assistantBotRow}
              >
                {m.role === "assistant" && (
                  <span className={styles.assistantMiniAvatar} aria-hidden="true">
                    <Bot size={13} />
                  </span>
                )}
                <div
                  className={m.role === "user" ? styles.assistantUserBubble : styles.assistantBotBubble}
                >
                  <p className={styles.assistantMessageText}>{m.text}</p>
                  {m.links && m.links.length > 0 && (
                    <div className={styles.assistantLinkRow}>
                      {m.links.map((link) => (
                        <Link
                          key={link.href + link.label}
                          href={link.href}
                          className={styles.assistantLinkPill}
                          onClick={() => setIsOpen(false)}
                        >
                          {link.label} <ChevronRight size={11} />
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {isTyping && (
              <div className={styles.assistantBotRow}>
                <span className={styles.assistantMiniAvatar} aria-hidden="true">
                  <Bot size={13} />
                </span>
                <div className={styles.assistantBotBubble}>
                  <div className={styles.assistantTypingIndicator}>
                    <span />
                    <span />
                    <span />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Suggestions */}
          <div className={styles.assistantSuggestions} aria-label="Suggested questions">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                type="button"
                className={styles.assistantChip}
                onClick={() => void handleSend(s)}
              >
                <Sparkles size={10} /> {s}
              </button>
            ))}
          </div>

          {/* Input Form */}
          <form
            className={styles.assistantInputForm}
            onSubmit={(e) => {
              e.preventDefault();
              void handleSend(input);
            }}
          >
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about forecasts, PINN, risk bands…"
              aria-label="Message to Avarta AI Assistant"
              maxLength={300}
              className={styles.assistantInput}
            />
            <button
              type="submit"
              disabled={!input.trim() || isTyping}
              className={styles.assistantSendBtn}
              aria-label="Send query"
              title="Send (Enter)"
            >
              <CornerDownLeft size={14} />
            </button>
          </form>
        </section>
      )}

      {/* Floating Action Button (FAB) */}
      <button
        type="button"
        className={`${styles.assistantFab} ${isOpen ? styles.assistantFabActive : ""}`}
        onClick={handleToggle}
        aria-label={isOpen ? "Close AI Assistant" : "Open AI Assistant"}
        title={isOpen ? "Close AI Assistant" : "Ask Avarta AI Assistant"}
        aria-expanded={isOpen}
      >
        {!hasInteracted && !isOpen && (
          <span className={styles.assistantBadge} aria-hidden="true">
            1
          </span>
        )}
        {isOpen ? <X size={20} /> : <Bot size={20} />}
      </button>
    </div>
  );
}
