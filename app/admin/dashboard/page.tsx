import { Suspense } from "react";
import { StatsBar, StatsBarSkeleton } from "./StatsBar";
import DashboardClient from "./DashboardClient";

export default function AdminDashboard() {
  return (
    <div className="container mx-auto p-4 md:p-8">
      <Suspense fallback={<StatsBarSkeleton />}>
        <StatsBar />
      </Suspense>
      <DashboardClient />
    </div>
  );
}
