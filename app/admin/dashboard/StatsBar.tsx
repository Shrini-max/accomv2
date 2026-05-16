import { getStudentStats } from "@/lib/actions";
import { Card } from "@/components/ui/card";

export async function StatsBar() {
  const stats = await getStudentStats();
  return (
    <div className="grid grid-cols-3 gap-4 mb-6">
      <Card className="text-center py-3">
        <p className="text-2xl font-bold">{stats.total}</p>
        <p className="text-xs text-muted-foreground">Total Students</p>
      </Card>
      <Card className="text-center py-3">
        <p className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.allotted}</p>
        <p className="text-xs text-muted-foreground">Cards Allotted</p>
      </Card>
      <Card className="text-center py-3">
        <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{stats.unallotted}</p>
        <p className="text-xs text-muted-foreground">Pending</p>
      </Card>
    </div>
  );
}

export function StatsBarSkeleton() {
  return (
    <div className="grid grid-cols-3 gap-4 mb-6 animate-pulse">
      {[0, 1, 2].map((i) => (
        <div key={i} className="h-20 rounded-lg bg-muted" />
      ))}
    </div>
  );
}
