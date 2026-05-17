import { getAllottedStudents, getAllottedFilters, generateAllottedStudentsCSV } from "@/lib/actions";
import { Student } from "@prisma/client";
import {
  Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import DownloadCSVButton from "./DownloadCSVButton";
import { FilterBar } from "./FilterBar";
import { CopyButton } from "./CopyButton";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 50;

interface Props {
  searchParams: { [key: string]: string | string[] | undefined };
}

function getParam(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] : value ?? "";
}

export default async function AllottedListPage({ searchParams }: Props) {
  const page = Math.max(1, parseInt(getParam(searchParams.page)) || 1);
  const dept = getParam(searchParams.dept);
  const mess = getParam(searchParams.mess);
  const sort = getParam(searchParams.sort) || "name";
  const order = (getParam(searchParams.order) || "asc") as "asc" | "desc";

  const filters = { department: dept || undefined, mess: mess || undefined };
  const sortObj = { field: sort, order };

  const [{ students, total }, { departments, messes }] = await Promise.all([
    getAllottedStudents(page, PAGE_SIZE, filters, sortObj),
    getAllottedFilters(),
  ]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  const buildPageUrl = (p: number) => {
    const params = new URLSearchParams();
    if (dept) params.set("dept", dept);
    if (mess) params.set("mess", mess);
    if (sort !== "name") params.set("sort", sort);
    if (order !== "asc") params.set("order", order);
    params.set("page", String(p));
    return `/admin/allotted-list?${params.toString()}`;
  };

  return (
    <div className="container mx-auto p-4 md:p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Allotted Cards</h1>
        {students.length > 0 && (
          <DownloadCSVButton filters={{ department: dept || undefined, mess: mess || undefined }} />
        )}
      </div>

      <FilterBar
        departments={departments}
        messes={messes}
        currentDept={dept}
        currentMess={mess}
        currentSort={sort}
        currentOrder={order}
        total={total}
      />

      {students.length > 0 ? (
        <>
          {totalPages > 1 && (
            <p className="text-sm text-muted-foreground mb-3">
              Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} of {total}
            </p>
          )}
          <Table>
            <TableCaption>Students with allotted mess cards.</TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead>Roll No.</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Serial</TableHead>
                <TableHead>Allotted At</TableHead>
                <TableHead>Hostel (Room)</TableHead>
                <TableHead>Mess</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {students.map((student: Student) => (
                <TableRow key={student.id}>
                  <TableCell className="font-medium">{student.rollNo}</TableCell>
                  <TableCell>{student.name}</TableCell>
                  <TableCell>{student.department ?? "N/A"}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      {student.messCardSerialNumber}
                      <CopyButton value={student.messCardSerialNumber!} />
                    </div>
                  </TableCell>
                  <TableCell>
                    {student.messCardAllottedAt
                      ? new Date(student.messCardAllottedAt).toLocaleDateString()
                      : "N/A"}
                  </TableCell>
                  <TableCell>{student.allottedHostel} ({student.roomNo})</TableCell>
                  <TableCell>{student.allottedMess}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-3 mt-6">
              {page > 1 && (
                <Link href={buildPageUrl(page - 1)}>
                  <Button variant="outline" size="sm">Previous</Button>
                </Link>
              )}
              <span className="text-sm text-muted-foreground">Page {page} of {totalPages}</span>
              {page < totalPages && (
                <Link href={buildPageUrl(page + 1)}>
                  <Button variant="outline" size="sm">Next</Button>
                </Link>
              )}
            </div>
          )}
        </>
      ) : (
        <p className="text-center text-muted-foreground py-12">
          {dept || mess ? "No students match the current filters." : "No students have been allotted cards yet."}
        </p>
      )}
    </div>
  );
}
