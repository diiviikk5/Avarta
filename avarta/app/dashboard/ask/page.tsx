import { AskPanel } from "@/components/dashboard/ReplayDashboard";
import PageHeading from "@/components/dashboard/PageHeading";

export default function AskPage() {
  return (
    <>
      <PageHeading
        eyebrow="09 / WHAT HAPPENS HERE?"
        title="Ask about your area"
        blurb="Plain-language briefings: expected rainfall, window, impacts, radius and confidence. Draft decision support only."
      />
      <AskPanel picked={null} />
    </>
  );
}
