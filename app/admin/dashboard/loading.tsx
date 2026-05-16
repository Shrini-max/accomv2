export default function DashboardLoading() {
  return (
    <div className="container mx-auto p-4 md:p-8 animate-pulse">
      {/* Stats bar */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-20 rounded-lg bg-muted" />
        ))}
      </div>
      {/* Tab buttons */}
      <div className="flex gap-2 mb-4">
        <div className="h-8 w-32 rounded-md bg-muted" />
        <div className="h-8 w-32 rounded-md bg-muted" />
      </div>
      {/* Search bar */}
      <div className="flex gap-2 mb-6">
        <div className="h-10 flex-grow rounded-md bg-muted" />
        <div className="h-10 w-24 rounded-md bg-muted" />
      </div>
    </div>
  );
}
