import { getReplay } from "@/lib/replay";
import { TrajectorySection } from "@/components/dashboard/ClientPages";
import PageHeading from "@/components/dashboard/PageHeading";

export default async function TrajectoryPage() {
  const replay = await getReplay();
  return (
    <>
      <PageHeading
        eyebrow="06 / EVENT TRACKING · T+24 / T+48 / T+72"
        title="Event tracking"
        blurb="Kalman-linked forecast footprints with extrapolated trajectory legs and dynamic 4D bounding boxes."
      />
      <TrajectorySection replay={replay} />
    </>
  );
}
