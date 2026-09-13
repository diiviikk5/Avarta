import { NextResponse } from "next/server";
import { getReplay } from "@/lib/replay";

/** Honest tier comparison: V1 bilinear is real, V2 CNN is experimental, diffusion is architecture-only. */
export async function GET() {
  const replay = await getReplay();
  const field = replay.raster.forecast_field ?? replay.raster.forecast_mm_day ?? [[0]];
  const flat = field.flat();
  const coarsePeak = flat.length > 0 ? Math.max(...flat) : 0;
  // Bilinear over a 12->5 km style factor on a demo patch keeps the payload small.
  const patch = field.slice(0, 8).map((r) => r.slice(0, 8));
  const patchFlat = patch.flat();
  const patchPeak = patchFlat.length > 0 ? Math.max(...patchFlat) : 0;
  return NextResponse.json({
    case_id: replay.id,
    coarse_peak: Math.round(coarsePeak * 100) / 100,
    methods: {
      v1_bilinear: {
        available: true,
        peak: Math.round(patchPeak * 100) / 100,
        note: "Transparent interpolation baseline. No learned detail.",
      },
      v2_cnn: {
        available: false,
        peak: null,
        note: "Residual CNN checkpoint is a separate coarse-proxy experiment, not a deployed 5 km model.",
      },
      advanced_diffusion: {
        available: false,
        peak: null,
        note: "Conditional DDPM architecture exists with no trained weights or 5 km skill result.",
      },
    },
    validation:
      "Bilinear is the only deployed path. CNN/diffusion need paired forecast/high-resolution targets and event holdouts before any skill claim.",
  });
}
