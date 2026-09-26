import { getReplay } from "@/lib/replay";
import { TrajectorySection } from "@/components/dashboard/ClientPages";
import PageHeading from "@/components/dashboard/PageHeading";

export default async function TrajectoryPage() {
  const replay = await getReplay();
  return (
    <>
      <PageHeading
        eyebrow="06 / EVENT TRACKING · T+24 / T+48 / T+72"
        title="Trajectory intelligence"
        blurb="An interactive command view for linked event identities, measured motion vectors, projected centroids, uncertainty envelopes and dynamic 4D footprints."
      />
      <TrajectorySection replay={replay} />
    </>
  );
}
