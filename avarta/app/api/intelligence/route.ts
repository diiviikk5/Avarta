import { NextResponse } from "next/server";
import { getReplay } from "@/lib/replay";

const Z90 = 1.6448536269514722;

function wilson90(hits: number, trials: number): [number, number] {
  const p = hits / trials;
  const z2 = Z90 * Z90;
  const denominator = 1 + z2 / trials;
  const center = (p + z2 / (2 * trials)) / denominator;
  const margin =
    (Z90 / denominator) *
    Math.sqrt((p * (1 - p)) / trials + z2 / (4 * trials * trials));
  return [Math.max(0, center - margin), Math.min(1, center + margin)];
}

function cellAreaKm2(lat: number, dLat: number, dLon: number) {
  const radius = 6371.0088;
  const south = ((lat - dLat / 2) * Math.PI) / 180;
  const north = ((lat + dLat / 2) * Math.PI) / 180;
  return radius * radius * Math.abs(Math.sin(north) - Math.sin(south)) * Math.abs((dLon * Math.PI) / 180);
}

export async function GET(request: Request) {
  const replay = await getReplay();
  const field = replay.raster.member_exceedance_probability;
  const members = replay.forecast.members.length;
  const requested = Number(new URL(request.url).searchParams.get("probability") ?? "0.5");
  const detectionProbability = Number.isFinite(requested)
    ? Math.max(0, Math.min(1, requested))
    : 0.5;
  if (!field || members < 2) {
    return NextResponse.json(
      { error: "This case has no finite-ensemble probability artifact." },
      { status: 422 },
    );
  }

  const rows = field.length;
  const cols = field[0]?.length ?? 0;
  const visited = Array.from({ length: rows }, () => Array(cols).fill(false));
  const dLat = Math.abs(replay.raster.latitudes[1] - replay.raster.latitudes[0]);
  const dLon = Math.abs(replay.raster.longitudes[1] - replay.raster.longitudes[0]);
  const footprints: Array<Record<string, unknown>> = [];
  let maximumRawProbability = 0;

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      maximumRawProbability = Math.max(maximumRawProbability, field[row][col]);
      if (visited[row][col] || field[row][col] < detectionProbability) continue;
      const queue: Array<[number, number]> = [[row, col]];
      const cells: Array<[number, number]> = [];
      visited[row][col] = true;
      while (queue.length) {
        const [r, c] = queue.shift()!;
        cells.push([r, c]);
        for (let dr = -1; dr <= 1; dr++) {
          for (let dc = -1; dc <= 1; dc++) {
            const nr = r + dr;
            const nc = c + dc;
            if (
              (dr !== 0 || dc !== 0) && nr >= 0 && nr < rows && nc >= 0 && nc < cols &&
              !visited[nr][nc] && field[nr][nc] >= detectionProbability
            ) {
              visited[nr][nc] = true;
              queue.push([nr, nc]);
            }
          }
        }
      }

      let area = 0;
      let weightedLat = 0;
      let weightedLon = 0;
      let weightSum = 0;
      let peak = cells[0];
      for (const [r, c] of cells) {
        const cellArea = cellAreaKm2(replay.raster.latitudes[r], dLat, dLon);
        const weight = cellArea * Math.max(field[r][c], 1e-6);
        area += cellArea;
        weightedLat += replay.raster.latitudes[r] * weight;
        weightedLon += replay.raster.longitudes[c] * weight;
        weightSum += weight;
        if (field[r][c] > field[peak[0]][peak[1]]) peak = [r, c];
      }
      if (area < 1000) continue;
      const peakHits = Math.round(field[peak[0]][peak[1]] * members);
      const interval = wilson90(peakHits, members);
      footprints.push({
        footprint_id: `ARCHIVE-PROB-${String(footprints.length + 1).padStart(3, "0")}`,
        centroid: [Number((weightedLat / weightSum).toFixed(4)), Number((weightedLon / weightSum).toFixed(4))],
        area_km2: Number(area.toFixed(1)),
        peak_raw_probability: peakHits / members,
        probability_interval_90: interval.map((value) => Number(value.toFixed(4))),
        supporting_members: peakHits,
      });
    }
  }

  return NextResponse.json({
    case_id: replay.id,
    hazard: replay.hazard,
    source_model: replay.forecast.model,
    members,
    probability_kind: "raw_finite_ensemble",
    member_probability_resolution: Number((1 / members).toFixed(4)),
    credible_interval: "Wilson score, 90% (UI audit)",
    detection_probability: detectionProbability,
    maximum_raw_probability: maximumRawProbability,
    footprints,
    operationally_calibrated: false,
    unavailable_from_reduced_artifact: ["EFI", "shift_of_tails", "member_intensity_spread"],
    decision: "research_evidence_only",
    note: "Five archived members can demonstrate the pipeline, but cannot support a precise warning probability.",
  });
}
