"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useCallback } from "react";
import { Button } from "@/components/ui/button";
import { ArrowUpDown, ArrowUp, ArrowDown, X } from "lucide-react";

interface FilterBarProps {
  departments: string[];
  messes: string[];
  currentDept: string;
  currentMess: string;
  currentSort: string;
  currentOrder: string;
  total: number;
}

const SORT_COLUMNS = [
  { key: "name", label: "Name" },
  { key: "rollNo", label: "Roll No." },
  { key: "messCardSerialNumber", label: "Serial" },
  { key: "messCardAllottedAt", label: "Allotted At" },
];

export function FilterBar({
  departments, messes, currentDept, currentMess, currentSort, currentOrder, total,
}: FilterBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const updateParams = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (value === null || value === "") {
          params.delete(key);
        } else {
          params.set(key, value);
        }
      }
      params.delete("page"); // reset to page 1 on filter change
      router.push(`${pathname}?${params.toString()}`);
    },
    [router, pathname, searchParams]
  );

  const handleSort = (field: string) => {
    if (currentSort === field) {
      updateParams({ sort: field, order: currentOrder === "asc" ? "desc" : "asc" });
    } else {
      updateParams({ sort: field, order: "asc" });
    }
  };

  const hasFilters = currentDept || currentMess;

  const SortIcon = ({ field }: { field: string }) => {
    if (currentSort !== field) return <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground" />;
    return currentOrder === "asc"
      ? <ArrowUp className="h-3.5 w-3.5" />
      : <ArrowDown className="h-3.5 w-3.5" />;
  };

  return (
    <div className="space-y-3 mb-4">
      {/* Filters row */}
      <div className="flex flex-wrap gap-2 items-center">
        <select
          value={currentDept}
          onChange={(e) => updateParams({ dept: e.target.value })}
          className="text-sm border rounded-md px-3 py-1.5 bg-background text-foreground border-input focus:outline-none focus:ring-1 focus:ring-ring"
        >
          <option value="">All Departments</option>
          {departments.map((d) => <option key={d} value={d}>{d}</option>)}
        </select>

        <select
          value={currentMess}
          onChange={(e) => updateParams({ mess: e.target.value })}
          className="text-sm border rounded-md px-3 py-1.5 bg-background text-foreground border-input focus:outline-none focus:ring-1 focus:ring-ring"
        >
          <option value="">All Messes</option>
          {messes.map((m) => <option key={m} value={m}>{m}</option>)}
        </select>

        {hasFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => updateParams({ dept: null, mess: null })}
            className="gap-1 text-muted-foreground"
          >
            <X className="h-3.5 w-3.5" /> Clear filters
          </Button>
        )}

        <span className="ml-auto text-sm text-muted-foreground">{total} students</span>
      </div>

      {/* Sort row */}
      <div className="flex flex-wrap gap-1 items-center">
        <span className="text-xs text-muted-foreground mr-1">Sort by:</span>
        {SORT_COLUMNS.map(({ key, label }) => (
          <Button
            key={key}
            variant={currentSort === key ? "secondary" : "ghost"}
            size="sm"
            onClick={() => handleSort(key)}
            className="gap-1 h-7 text-xs"
          >
            {label}
            <SortIcon field={key} />
          </Button>
        ))}
      </div>
    </div>
  );
}
