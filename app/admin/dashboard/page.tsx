import { getStudentStats } from "@/lib/actions";
import DashboardClient from "./DashboardClient";

export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  const stats = await getStudentStats();
  return <DashboardClient stats={stats} />;
}
