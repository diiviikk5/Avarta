import type { Metadata } from "next";
import { EB_Garamond, Inter } from "next/font/google";
import "./globals.css";

const editorialSerif = EB_Garamond({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-editorial-serif",
  display: "swap",
});

const editorialSans = Inter({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  variable: "--font-editorial-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Avarta — Spatio-Temporal Weather Intelligence",
  description:
    "AI-driven spatio-temporal tracking of extreme weather anomalies in medium-range forecasts. Persistent 4D threat objects with amplitude-preserving generative downscaling.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${editorialSerif.variable} ${editorialSans.variable}`}>
      <body className="antialiased selection:bg-stone-200 selection:text-stone-900">
        {children}
      </body>
    </html>
  );
}
