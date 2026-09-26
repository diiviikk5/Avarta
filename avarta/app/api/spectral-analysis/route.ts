import { NextResponse } from "next/server";

export async function GET() {
  const k_vals = [
    0.0065, 0.0125, 0.0188, 0.0249, 0.0312, 0.0372, 0.0435, 0.0525, 0.0645, 0.0770, 0.0885, 0.0985
  ];
  const wl_vals = k_vals.map((k) => Math.round((1.0 / k) * 10) / 10);

  const psd_db = {
    ground_truth: [0.0, -12.4, -24.8, -36.6, -28.2, -19.4, -26.1, -32.7, -38.5, -41.8, -44.2, -39.6],
    generative_diffusion: [2.6, -11.8, -23.9, -35.2, -26.8, -33.4, -28.9, -36.0, -35.1, -37.4, -40.6, -37.9],
    residual_cnn: [0.5, -13.1, -22.5, -30.6, -27.4, -31.3, -34.8, -43.8, -45.2, -47.5, -51.2, -53.5],
    bilinear: [-0.3, -15.8, -28.6, -43.2, -33.5, -32.7, -48.6, -70.4, -62.3, -50.7, -68.4, -72.2],
  };

  return NextResponse.json({
    evidence_scope: "synthetic_metric_fixture",
    candidate_field: "hand_constructed_diffusion_like_field_not_model_output",
    validated_5km_skill: false,
    wavenumbers_k: k_vals,
    wavelengths_km: wl_vals,
    psd_db: psd_db,
    preservation_metrics: {
      diffusion_retention_ratio: 0.507,
      cnn_retention_ratio: 0.117,
      bilinear_retention_ratio: 0.017,
      spectral_smoothing_resolved: true,
    },
    scientific_interpretation:
      "On this hand-constructed synthetic stress test, the diffusion-like candidate retains more high-frequency power than the smoothed baselines. This validates the PSD metric and objective, not a trained model or real 5 km skill.",
  });
}
