import { DemoSection } from "@/components/dashboard/ReplayDashboard";
import PageHeading from "@/components/dashboard/PageHeading";

export default function DemoPage() {
  return (
    <>
      <PageHeading
        eyebrow="DESIGN CONCEPT / SYNTHETIC"
        title="Prototype demo"
        blurb="Hand-authored interface concepts only. Not forecasts, observations, or validated warnings."
      />
      <DemoSection />
    </>
  );
}
