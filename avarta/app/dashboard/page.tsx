import { getBenchmark, getReplay } from "@/lib/replay";
import ReplayDashboard from "@/components/dashboard/ReplayDashboard";

export default async function DashboardPage() {
  const [replay, benchmark] = await Promise.all([getReplay(), getBenchmark()]);
  return <ReplayDashboard replay={replay} benchmark={benchmark} />;
}
