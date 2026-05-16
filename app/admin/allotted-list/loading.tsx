export default function AllottedListLoading() {
  return (
    <div className="container mx-auto p-4 md:p-8 animate-pulse">
      <div className="flex justify-between items-center mb-6">
        <div className="h-9 w-56 rounded-md bg-muted" />
        <div className="h-8 w-32 rounded-md bg-muted" />
      </div>
      {/* Filter bar */}
      <div className="flex gap-2 mb-4">
        <div className="h-8 w-40 rounded-md bg-muted" />
        <div className="h-8 w-40 rounded-md bg-muted" />
      </div>
      {/* Table rows */}
      <div className="space-y-2">
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="h-12 rounded-md bg-muted" />
        ))}
      </div>
    </div>
  );
}
