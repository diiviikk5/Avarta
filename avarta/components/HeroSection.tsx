"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";

/* ─── Video catalogue (local zero-latency streaming) ─────── */
const VIDEOS = [
  {
    url: "/videos/video-0.mp4",
    label: "Golden Hour",
  },
  {
    url: "/videos/video-1.mp4",
    label: "Still Water",
  },
  {
    url: "/videos/video-2.mp4",
    label: "Deep Woods",
  },
  {
    url: "/videos/video-3.mp4",
    label: "Quiet Dawn",
  },
] as const;

const OVERLAY_URL =
  "https://soft-zoom-63098134.figma.site/_assets/v11/0b4a435b2df2747593c43d7a1c9b4578f7d8d90c.png";

const NAV_LINKS = ["How It Works", "Features", "Use Cases", "Open API"];

const STATS = [
  "12 km → 5 km Downscaling",
  "Ensemble EFI Tracking",
  "4D Threat Objects",
  "Physics-Informed AI",
];

export default function HeroSection() {
  const [activeVideo, setActiveVideo] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const [email, setEmail] = useState("");
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Transition to next video smoothly and pause inactive ones to eliminate GPU/decoder lag
  const triggerTransition = (nextIndex: number) => {
    const nextVideo = videoRefs.current[nextIndex];
    if (nextVideo) {
      nextVideo.play().catch(() => {});
    }

    setActiveVideo(nextIndex);

    // After crossfade completes (1000ms), pause all other videos to preserve 60fps performance
    setTimeout(() => {
      videoRefs.current.forEach((vid, i) => {
        if (vid && i !== nextIndex) {
          vid.pause();
        }
      });
    }, 1100);
  };

  // Start initial active video
  useEffect(() => {
    const currentVideo = videoRefs.current[0];
    if (currentVideo) {
      currentVideo.play().catch(() => {});
    }

    // Auto cycle every 3 seconds
    timerRef.current = setInterval(() => {
      setActiveVideo((prev) => {
        const next = (prev + 1) % VIDEOS.length;
        triggerTransition(next);
        return next;
      });
    }, 3000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  function switchVideo(idx: number) {
    if (idx === activeVideo) return;
    triggerTransition(idx);

    // Reset 3s interval on manual tap
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setActiveVideo((prev) => {
        const next = (prev + 1) % VIDEOS.length;
        triggerTransition(next);
        return next;
      });
    }, 3000);
  }

  /* lock body scroll when mobile menu is open */
  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  return (
    <section className="relative w-full min-h-screen bg-black select-none flex flex-col justify-between">
      {/* ── 1. Video layer (Hardware accelerated, paused when hidden) ─ */}
      {VIDEOS.map((v, i) => (
        <video
          key={v.url}
          ref={(el) => {
            videoRefs.current[i] = el;
          }}
          src={v.url}
          muted
          loop
          playsInline
          preload="auto"
          className="hero-video absolute inset-0 w-full h-full object-cover pointer-events-none"
          style={{
            opacity: i === activeVideo ? 1 : 0,
            transition: "opacity 1000ms ease-in-out",
            zIndex: 0,
          }}
        />
      ))}

      {/* ── 2. PNG overlay (train-bob GPU accelerated) ─── */}
      <img
        src={OVERLAY_URL}
        alt=""
        aria-hidden
        className="train-bob absolute inset-0 w-full h-full object-cover pointer-events-none"
        style={{ zIndex: 1 }}
      />

      {/* ── 3. High-contrast Cinematic Scrim (Ensures 100% text readability) ─ */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse at center, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0.3) 50%, rgba(0,0,0,0.75) 100%), linear-gradient(to bottom, rgba(0,0,0,0.4) 0%, rgba(0,0,0,0.15) 35%, rgba(0,0,0,0.2) 65%, rgba(0,0,0,0.7) 100%)",
          zIndex: 1,
        }}
      />

      {/* ── 4. Mobile menu overlay ───────────────────── */}
      {menuOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md"
          onClick={() => setMenuOpen(false)}
        >
          <div
            className="flex flex-col items-center gap-8 px-8 py-12"
            onClick={(e) => e.stopPropagation()}
          >
            {NAV_LINKS.map((link, i) => (
              <a
                key={link}
                href="#"
                className="text-white text-3xl font-light hover:text-blue-300 transition-colors"
                style={{
                  fontFamily: "system-ui, sans-serif",
                  opacity: menuOpen ? 1 : 0,
                  transform: menuOpen ? "translateY(0)" : "translateY(1rem)",
                  transition: `opacity 500ms cubic-bezier(0.4,0,0.2,1) ${100 + i * 50}ms, transform 500ms cubic-bezier(0.4,0,0.2,1) ${100 + i * 50}ms`,
                }}
              >
                {link}
              </a>
            ))}
            <Link
              href="/dashboard"
              onClick={() => setMenuOpen(false)}
              className="mt-4 px-8 py-3 rounded-full bg-white text-black text-base font-semibold hover:bg-neutral-200 transition-colors shadow-lg"
              style={{
                fontFamily: "system-ui, sans-serif",
                opacity: menuOpen ? 1 : 0,
                transform: menuOpen ? "scale(1)" : "scale(0.9)",
                transition: `opacity 500ms cubic-bezier(0.4,0,0.2,1) 300ms, transform 500ms cubic-bezier(0.4,0,0.2,1) 300ms`,
              }}
            >
              Launch Console
            </Link>
          </div>
        </div>
      )}

      {/* ── 5. Content layer ─────────────────────────── */}
      <div
        className="relative flex flex-col min-h-screen px-5 sm:px-8 md:px-12 py-6 sm:py-8 justify-between"
        style={{ zIndex: 2 }}
      >
        {/* ── Navigation ───────────────────────────── */}
        <nav className="flex items-center justify-between w-full">
          {/* Logo */}
          <Link
            href="/"
            className="text-white text-xl sm:text-2xl select-none tracking-tight drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)] hover:opacity-90"
            style={{ fontFamily: "'GeistPixel', 'Geist Mono', monospace", letterSpacing: "0.02em" }}
          >
            Avarta
          </Link>

          {/* Desktop nav pill */}
          <div className="hidden md:flex liquid-glass items-center gap-1 rounded-full px-2 py-1.5 bg-black/35 backdrop-blur-md border border-white/10 shadow-lg">
            {NAV_LINKS.map((link) => (
              <a
                key={link}
                href={link === "How It Works" ? "/dashboard" : "#"}
                className="px-4 py-1.5 rounded-full text-white/90 text-sm hover:text-white transition-colors duration-200 font-medium"
                style={{ fontFamily: "system-ui, sans-serif" }}
              >
                {link}
              </a>
            ))}
            <Link
              href="/dashboard"
              className="ml-1 px-5 py-1.5 rounded-full bg-white text-black text-sm font-semibold hover:bg-neutral-200 transition-colors shadow-sm"
              style={{ fontFamily: "system-ui, sans-serif" }}
            >
              Launch Console
            </Link>
          </div>

          {/* Mobile hamburger */}
          <button
            className="md:hidden liquid-glass rounded-xl p-2.5 relative w-10 h-10 bg-black/40 border border-white/15"
            onClick={() => setMenuOpen((o) => !o)}
            aria-label="Toggle menu"
          >
            <Menu
              size={18}
              className="text-white absolute inset-0 m-auto"
              style={{
                opacity: menuOpen ? 0 : 1,
                transform: menuOpen ? "rotate(90deg) scale(0.75)" : "rotate(0deg) scale(1)",
                transition: "opacity 300ms, transform 300ms",
              }}
            />
            <X
              size={18}
              className="text-white absolute inset-0 m-auto"
              style={{
                opacity: menuOpen ? 1 : 0,
                transform: menuOpen ? "rotate(0deg)" : "rotate(-90deg)",
                transition: "opacity 300ms, transform 300ms",
              }}
            />
          </button>
        </nav>

        {/* ── Hero content ─────────────────────────── */}
        <div className="flex flex-col items-center justify-center flex-1 text-center gap-5 sm:gap-6 -mt-3 sm:mt-0 max-w-4xl mx-auto">

          {/* Badge */}
          <div
            className="liquid-glass rounded-full px-4 py-2 flex items-center gap-2 bg-black/40 backdrop-blur-md border border-white/15 shadow-xl"
          >
            <span
              className="w-2.5 h-2.5 rounded-full bg-blue-400 radar-pulse inline-block shrink-0 shadow-[0_0_8px_rgba(96,165,250,0.8)]"
            />
            <span
              className="text-xs sm:text-sm font-medium text-white tracking-wide drop-shadow-sm"
              style={{
                fontFamily: "system-ui, sans-serif",
              }}
            >
              Live ensemble tracking · 3–10 day forecast window
            </span>
          </div>

          {/* Main Title — AVARTA in Geist Pixel */}
          <h1
            className="text-6xl sm:text-7xl md:text-8xl lg:text-[7.5rem] leading-none tracking-tight font-normal uppercase text-white drop-shadow-[0_4px_24px_rgba(0,0,0,0.95)]"
            style={{
              fontFamily: "'GeistPixel', 'Geist Mono', monospace",
              letterSpacing: "0.03em",
            }}
          >
            AVARTA
          </h1>

          {/* Line below title text */}
          <h2
            className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-light tracking-tight text-white drop-shadow-[0_2px_12px_rgba(0,0,0,0.95)] -mt-2 sm:-mt-1"
            style={{
              fontFamily: "system-ui, sans-serif",
            }}
          >
            Extreme Weather, <em className="italic font-normal text-blue-200">Precisely</em> Tracked.
          </h2>

          {/* Subtext */}
          <p
            className="max-w-xl text-sm sm:text-base leading-relaxed text-white/90 font-normal drop-shadow-[0_2px_8px_rgba(0,0,0,0.95)] px-4 sm:px-0"
            style={{
              fontFamily: "system-ui, sans-serif",
            }}
          >
            Avarta fuses spherical GNN anomaly detection with physics-constrained
            diffusion downscaling — turning 12 km ensemble noise into hyper-local
            5 km threat intelligence, continuously tracked as evolving 4D objects.
          </p>

          {/* Email / Action Pill */}
          <div className="liquid-glass rounded-full flex items-center gap-2 px-3 py-2 w-full max-w-xs sm:max-w-sm bg-black/40 backdrop-blur-md border border-white/20 shadow-xl mt-1">
            <input
              type="email"
              placeholder="Your work email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="flex-1 bg-transparent outline-none text-sm text-white placeholder:text-white/50 min-w-0 px-2"
              style={{ fontFamily: "system-ui, sans-serif" }}
            />
            <Link
              href="/dashboard"
              className="shrink-0 px-4 py-1.5 rounded-full bg-white text-black text-sm font-semibold hover:bg-neutral-200 transition-colors"
              style={{ fontFamily: "system-ui, sans-serif" }}
            >
              Enter Console
            </Link>
          </div>

          {/* Video switcher */}
          <div className="flex items-center gap-2 sm:gap-4 mt-2 bg-black/40 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-white/15 shadow-xl">
            {VIDEOS.map((v, i) => (
              <button
                key={v.label}
                onClick={() => switchVideo(i)}
                className={`text-xs sm:text-sm px-2.5 py-0.5 rounded-full transition-all duration-300 cursor-pointer ${
                  i === activeVideo
                    ? "bg-white/25 text-white font-medium shadow-sm border border-white/30"
                    : "text-white/65 hover:text-white hover:bg-white/10"
                }`}
                style={{
                  fontFamily: "system-ui, sans-serif",
                }}
              >
                {v.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── Bottom stats ─────────────────────────── */}
        <div
          className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 pb-2 bg-black/35 backdrop-blur-md py-2 px-5 rounded-full max-w-fit mx-auto border border-white/10 shadow-lg mt-auto"
          style={{ fontFamily: "system-ui, sans-serif" }}
        >
          {STATS.map((s, i) => (
            <span key={s} className="flex items-center gap-4 text-xs sm:text-sm text-white font-medium drop-shadow-[0_1px_4px_rgba(0,0,0,0.85)]">
              {i > 0 && (
                <span className="hidden sm:inline text-white/30">|</span>
              )}
              {s}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
