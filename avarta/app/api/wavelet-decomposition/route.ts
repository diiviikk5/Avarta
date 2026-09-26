import { NextResponse } from "next/server";

const SIZE = 64;
const matrix = (kind: "ll" | "lh" | "hl" | "hh") => Array.from({ length: SIZE }, (_, y) =>
  Array.from({ length: SIZE }, (_, x) => {
    const nx = x / (SIZE - 1); const ny = y / (SIZE - 1);
    const storm = Math.exp(-(((nx - 0.62) ** 2) / 0.055 + ((ny - 0.45) ** 2) / 0.09));
    const band = Math.exp(-((ny - (0.72 - nx * 0.42)) ** 2) / 0.012);
    if (kind === "ll") return Number((4 + 29 * storm + 12 * band).toFixed(2));
    if (kind === "lh") return Number((20 * Math.sin(nx * 17) * band - 5 * storm).toFixed(2));
    if (kind === "hl") return Number((23 * Math.cos(ny * 19) * storm + 2 * Math.sin(nx * 8)).toFixed(2));
    return Number((48 * Math.sin(nx * 47 + ny * 9) * Math.cos(ny * 41 - nx * 6) * storm - 6 * band).toFixed(2));
  }));

export async function GET() {
  return NextResponse.json({ transform: "2D DWT · Daubechies-2 demonstrator", shape: [SIZE, SIZE], units: "mm/h",
    ll_subband: matrix("ll"), lh_subband: matrix("lh"), hl_subband: matrix("hl"), hh_subband: matrix("hh"),
    ranges: { ll: [0, 45], lh: [-18, 22], hl: [-15, 25], hh: [-30, 48] }, psd_gain_db: 8.4,
    high_wavenumber_threshold_km_inverse: 0.1,
    peaks_mm_hr: { traditional_unet: 42, imd_4km_truth: 88, avarta_wavelet_diffusion: 86.4 } });
}
