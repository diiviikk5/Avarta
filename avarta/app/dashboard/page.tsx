import { getReplay } from "@/lib/replay";
import { OverviewSection } from "@/components/dashboard/ClientPages";

export default async function DashboardPage() {
  const replay = await getReplay();
  return <OverviewSection replay={replay} />;
}
