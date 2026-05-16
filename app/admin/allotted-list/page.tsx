import { getAllottedStudents } from "@/lib/actions";
import { Student } from "@prisma/client";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import DownloadCSVButton from "./DownloadCSVButton";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 50;

interface Props {
  searchParams: { [key: string]: string | string[] | undefined };
}

export default async function AllottedListPage({ searchParams }: Props) {
  const pageParam = Array.isArray(searchParams.page) ? searchParams.page[0] : searchParams.page;
  const page = Math.max(1, parseInt(pageParam ?? "1") || 1);
  const { students, total } = await getAllottedStudents(page, PAGE_SIZE);
  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="container mx-auto p-4 md:p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Allotted Mess Cards</h1>
        <div className="flex gap-2">
          {students.length > 0 && <DownloadCSVButton />}
          <Link href="/admin/dashboard">
            <Button variant="outline">Back to Dashboard</Button>
          </Link>
        </div>
      </div>

      {students.length > 0 ? (
        <>
          <p className="text-sm text-gray-500 mb-4">
            Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} of {total} students
          </p>
          <Table>
            <TableCaption>Students with allotted mess cards.</TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead>Roll No.</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Mess Card Serial</TableHead>
                <TableHead>Allotted At</TableHead>
                <TableHead>Hostel (Room)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {students.map((student: Student) => (
                <TableRow key={student.id}>
                  <TableCell className="font-medium">{student.rollNo}</TableCell>
                  <TableCell>{student.name}</TableCell>
                  <TableCell>{student.department ?? "N/A"}</TableCell>
                  <TableCell>{student.messCardSerialNumber}</TableCell>
                  <TableCell>
                    {student.messCardAllottedAt
                      ? new Date(student.messCardAllottedAt).toLocaleDateString()
                      : "N/A"}
                  </TableCell>
                  <TableCell>{student.allottedHostel} ({student.roomNo})</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-3 mt-6">
              {page > 1 && (
                <Link href={`/admin/allotted-list?page=${page - 1}`}>
                  <Button variant="outline" size="sm">Previous</Button>
                </Link>
              )}
              <span className="text-sm text-gray-600">
                Page {page} of {totalPages}
              </span>
              {page < totalPages && (
                <Link href={`/admin/allotted-list?page=${page + 1}`}>
                  <Button variant="outline" size="sm">Next</Button>
                </Link>
              )}
            </div>
          )}
        </>
      ) : (
        <p className="text-center text-gray-500">No students have been allotted mess cards yet.</p>
      )}
    </div>
  );
}
