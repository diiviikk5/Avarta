import { getReplay } from "@/lib/replay";
import { InspectorSection } from "@/components/dashboard/ClientPages";
import PageHeading from "@/components/dashboard/PageHeading";

function toNumber(value: string | string[] | undefined, fallback: number) {
  const parsed = Number(Array.isArray(value) ? value[0] : value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export default async function InspectorPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const replay = await getReplay();
  return (
    <>
      <PageHeading
        eyebrow="05 / LOCATION INSPECTOR"
        title="What happens here?"
        blurb="Click anywhere on the forecast map for a pinpoint briefing: normal vs forecast rainfall, anomaly σ, risk band, impacts and timing."
      />
      <InspectorSection
        replay={replay}
        initialLat={toNumber(params.lat, 28.4)}
        initialLon={toNumber(params.lon, 77.31)}
      />
    </>
  );
}
