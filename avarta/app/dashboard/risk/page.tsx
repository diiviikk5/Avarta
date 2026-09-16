import { getReplay } from "@/lib/replay";
import { RiskSection } from "@/components/dashboard/ClientPages";
import PageHeading from "@/components/dashboard/PageHeading";

export default async function RiskPage() {
  const replay = await getReplay();
  return (
    <>
      <PageHeading
        eyebrow="07 / RISK MAP · 0–100"
        title="Risk map"
        blurb="Categorized spatial alerts across north India. Click a pin to open its pinpoint briefing in the inspector."
      />
      <RiskSection replay={replay} />
    </>
  );
}
