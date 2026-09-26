import { getBenchmark, getReplay } from "@/lib/replay";
import { ValidationSection } from "@/components/dashboard/ReplayDashboard";
import PageHeading from "@/components/dashboard/PageHeading";
import BenchmarkScorecard from "@/components/dashboard/BenchmarkScorecard";

export default async function ValidationPage() {
  const [replay, benchmark] = await Promise.all([getReplay(), getBenchmark()]);
  return (
    <>
      <PageHeading
        eyebrow="04 / EVIDENCE & LIMITS"
        title="Validation"
        blurb="Retrospective verification against IMD and CHIRPS, plus the separate residual-CNN benchmark."
      />
      <ValidationSection replay={replay} benchmark={benchmark} />
      <BenchmarkScorecard />
    </>
  );
}
