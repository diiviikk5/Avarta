import { AskPanel } from "@/components/dashboard/ReplayDashboard";
import PageHeading from "@/components/dashboard/PageHeading";

export default function AskPage() {
  return (
    <>
      <PageHeading
        eyebrow="09 / WHAT HAPPENS HERE?"
        title="Ask about your area"
        blurb="Explore 29 Indian regions or any coordinate through animated rainfall timelines, local impact explanations, confidence drivers and practical next steps. Draft decision support only."
      />
      <AskPanel picked={null} />
    </>
  );
}
