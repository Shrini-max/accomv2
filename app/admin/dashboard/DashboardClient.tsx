"use client";

import { useState, useTransition, FormEvent } from "react";
import { Student } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle,
} from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader,
  AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  getStudentByRollNo, allotMessCard, revokeMessCard,
  updateMessCardSerial, getUnallottedStudents,
} from "@/lib/actions";
import { MESS_CARD_SERIAL_LENGTH } from "@/lib/constants";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { Copy, Check, Pencil, Users } from "lucide-react";

export default function DashboardClient() {
  const [rollNo, setRollNo] = useState("");
  const [searchedStudent, setSearchedStudent] = useState<Student | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [messCardSerial, setMessCardSerial] = useState("");
  const [editSerial, setEditSerial] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const [activeTab, setActiveTab] = useState<"search" | "unallotted">("search");
  const [unallottedStudents, setUnallottedStudents] = useState<Student[]>([]);
  const [unallottedTotal, setUnallottedTotal] = useState(0);
  const [unallottedPage, setUnallottedPage] = useState(1);
  const PAGE_SIZE = 20;

  const [isSearching, startSearchTransition] = useTransition();
  const [isAllotting, startAllotTransition] = useTransition();
  const [isRevoking, startRevokeTransition] = useTransition();
  const [isEditing, startEditTransition] = useTransition();
  const [isLoadingUnallotted, startUnallottedTransition] = useTransition();

  const { toast } = useToast();
  const router = useRouter();

  const handleSearch = (e?: FormEvent) => {
    if (e) e.preventDefault();
    if (!rollNo.trim()) {
      toast({ title: "Input Error", description: "Please enter a roll number.", variant: "destructive" });
      return;
    }
    setNotFound(false);
    setSearchedStudent(null);
    startSearchTransition(async () => {
      const student = await getStudentByRollNo(rollNo);
      if (student) {
        setSearchedStudent(student);
      } else {
        setNotFound(true);
        toast({ title: "Not Found", description: `Student ${rollNo} not found.` });
      }
    });
  };

  const handleAllotCard = () => {
    if (!searchedStudent) return;
    if (!messCardSerial || messCardSerial.length !== MESS_CARD_SERIAL_LENGTH || !/^\d{4}$/.test(messCardSerial)) {
      toast({ title: "Input Error", description: `Serial must be ${MESS_CARD_SERIAL_LENGTH} digits.`, variant: "destructive" });
      return;
    }
    startAllotTransition(async () => {
      const result = await allotMessCard(searchedStudent.id, messCardSerial);
      if (result.success && result.student) {
        setSearchedStudent(result.student);
        setMessCardSerial("");
        setDialogOpen(false);
        toast({ title: "Success", description: result.message });
        router.refresh();
      } else {
        toast({ title: "Error", description: result.message, variant: "destructive" });
      }
    });
  };

  const handleEditSerial = () => {
    if (!searchedStudent) return;
    if (!editSerial || editSerial.length !== MESS_CARD_SERIAL_LENGTH || !/^\d{4}$/.test(editSerial)) {
      toast({ title: "Input Error", description: `Serial must be ${MESS_CARD_SERIAL_LENGTH} digits.`, variant: "destructive" });
      return;
    }
    startEditTransition(async () => {
      const result = await updateMessCardSerial(searchedStudent.id, editSerial);
      if (result.success && result.student) {
        setSearchedStudent(result.student);
        setEditSerial("");
        setEditDialogOpen(false);
        toast({ title: "Success", description: result.message });
        router.refresh();
      } else {
        toast({ title: "Error", description: result.message, variant: "destructive" });
      }
    });
  };

  const handleRevokeCard = () => {
    if (!searchedStudent?.messCardSerialNumber) return;
    startRevokeTransition(async () => {
      const result = await revokeMessCard(searchedStudent.id);
      if (result.success && result.student) {
        setSearchedStudent(result.student);
        toast({ title: "Success", description: result.message });
        router.refresh();
      } else {
        toast({ title: "Error", description: result.message, variant: "destructive" });
      }
    });
  };

  const handleCopySerial = (serial: string) => {
    navigator.clipboard.writeText(serial).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const loadUnallotted = (page: number) => {
    startUnallottedTransition(async () => {
      const result = await getUnallottedStudents(page, PAGE_SIZE);
      setUnallottedStudents(result.students);
      setUnallottedTotal(result.total);
      setUnallottedPage(page);
    });
  };

  const handleTabChange = (tab: "search" | "unallotted") => {
    setActiveTab(tab);
    if (tab === "unallotted" && unallottedStudents.length === 0) {
      loadUnallotted(1);
    }
  };

  return (
    <>
      {/* Tab switcher */}
      <div className="flex gap-2 mb-4">
        <Button variant={activeTab === "search" ? "default" : "outline"} onClick={() => handleTabChange("search")} size="sm">
          Search Student
        </Button>
        <Button variant={activeTab === "unallotted" ? "default" : "outline"} onClick={() => handleTabChange("unallotted")} size="sm" className="gap-1.5">
          <Users className="h-4 w-4" /> Pending
        </Button>
      </div>

      {/* Search tab */}
      {activeTab === "search" && (
        <>
          <form onSubmit={handleSearch} className="flex gap-2 mb-6 items-end">
            <div className="flex-grow">
              <Label htmlFor="rollNo">Search by Roll No.</Label>
              <Input
                id="rollNo"
                value={rollNo}
                onChange={(e) => setRollNo(e.target.value.toUpperCase())}
                placeholder="E.g., B22CS001"
                disabled={isSearching}
              />
            </div>
            <Button type="submit" disabled={isSearching}>
              {isSearching ? "Searching..." : "Search"}
            </Button>
          </form>

          {notFound && <p className="text-destructive text-center">Student not found.</p>}

          {searchedStudent && (
            <Card>
              <CardHeader>
                <CardTitle>{searchedStudent.name} ({searchedStudent.rollNo})</CardTitle>
                <CardDescription>Department: {searchedStudent.department ?? "N/A"}</CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><Label>Gender:</Label> {searchedStudent.gender}</div>
                <div><Label>Email:</Label> {searchedStudent.email ?? "N/A"}</div>
                <div><Label>Mobile No:</Label> {searchedStudent.mobileNo ?? "N/A"}</div>
                <div><Label>Hostel:</Label> {searchedStudent.allottedHostel} ({searchedStudent.roomNo})</div>
                <div><Label>Allotted Mess:</Label> {searchedStudent.allottedMess}</div>
                {searchedStudent.messFrom && <div><Label>Mess From:</Label> {searchedStudent.messFrom}</div>}
                {searchedStudent.messTo && <div><Label>Mess To:</Label> {searchedStudent.messTo}</div>}

                {searchedStudent.messCardSerialNumber ? (
                  <div className="md:col-span-2 p-3 bg-green-100 dark:bg-green-900/30 rounded-md flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-green-700 dark:text-green-400">
                        Accom Card: #{searchedStudent.messCardSerialNumber}
                      </p>
                      <p className="text-sm text-green-600 dark:text-green-500">
                        Allotted on: {new Date(searchedStudent.messCardAllottedAt!).toLocaleDateString()}
                      </p>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => handleCopySerial(searchedStudent.messCardSerialNumber!)} title="Copy serial">
                      {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                ) : (
                  <div className="md:col-span-2 p-3 bg-yellow-100 dark:bg-yellow-900/30 rounded-md">
                    <p className="font-semibold text-yellow-700 dark:text-yellow-400">Card Not Yet Allotted</p>
                  </div>
                )}
              </CardContent>
              <CardFooter className="flex justify-end gap-2">
                {!searchedStudent.messCardSerialNumber ? (
                  <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) setMessCardSerial(""); }}>
                    <DialogTrigger asChild>
                      <Button>Provide Card</Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[425px]">
                      <DialogHeader>
                        <DialogTitle>Allot Card for {searchedStudent.name}</DialogTitle>
                        <DialogDescription>Enter the {MESS_CARD_SERIAL_LENGTH}-digit serial number.</DialogDescription>
                      </DialogHeader>
                      <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                          <Label htmlFor="serial" className="text-right">Serial No.</Label>
                          <Input id="serial" value={messCardSerial} onChange={(e) => setMessCardSerial(e.target.value)} className="col-span-3" maxLength={MESS_CARD_SERIAL_LENGTH} placeholder="E.g., 1234" disabled={isAllotting} />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                        <Button onClick={handleAllotCard} disabled={isAllotting || messCardSerial.length !== MESS_CARD_SERIAL_LENGTH}>
                          {isAllotting ? "Allotting..." : "Allot Card"}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                ) : (
                  <div className="flex gap-2">
                    <Dialog open={editDialogOpen} onOpenChange={(open) => { setEditDialogOpen(open); if (!open) setEditSerial(""); }}>
                      <DialogTrigger asChild>
                        <Button variant="outline" className="gap-1.5"><Pencil className="h-4 w-4" /> Edit Serial</Button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-[425px]">
                        <DialogHeader>
                          <DialogTitle>Edit Card Serial</DialogTitle>
                          <DialogDescription>Current: #{searchedStudent.messCardSerialNumber}. Enter the new {MESS_CARD_SERIAL_LENGTH}-digit serial.</DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                          <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="editSerial" className="text-right">New Serial</Label>
                            <Input id="editSerial" value={editSerial} onChange={(e) => setEditSerial(e.target.value)} className="col-span-3" maxLength={MESS_CARD_SERIAL_LENGTH} placeholder="E.g., 5678" disabled={isEditing} />
                          </div>
                        </div>
                        <DialogFooter>
                          <Button variant="outline" onClick={() => setEditDialogOpen(false)}>Cancel</Button>
                          <Button onClick={handleEditSerial} disabled={isEditing || editSerial.length !== MESS_CARD_SERIAL_LENGTH}>
                            {isEditing ? "Saving..." : "Save Changes"}
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>

                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive" disabled={isRevoking}>{isRevoking ? "Revoking..." : "Revoke Card"}</Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will revoke card <strong>#{searchedStudent.messCardSerialNumber}</strong> from <strong>{searchedStudent.name}</strong>.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={handleRevokeCard} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                            {isRevoking ? "Revoking..." : "Yes, Revoke"}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                )}
              </CardFooter>
            </Card>
          )}
        </>
      )}

      {/* Unallotted tab */}
      {activeTab === "unallotted" && (
        <div>
          {isLoadingUnallotted ? (
            <div className="space-y-2 animate-pulse">
              {Array.from({ length: 8 }).map((_, i) => <div key={i} className="h-12 rounded-md bg-muted" />)}
            </div>
          ) : unallottedStudents.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">All students have been allotted cards.</p>
          ) : (
            <>
              <p className="text-sm text-muted-foreground mb-3">
                {unallottedTotal} students pending — click a row to open in search
              </p>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Roll No.</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Hostel (Room)</TableHead>
                    <TableHead>Mess</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {unallottedStudents.map((student) => (
                    <TableRow
                      key={student.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => { setRollNo(student.rollNo); setSearchedStudent(student); setNotFound(false); setActiveTab("search"); }}
                    >
                      <TableCell className="font-medium">{student.rollNo}</TableCell>
                      <TableCell>{student.name}</TableCell>
                      <TableCell>{student.department ?? "N/A"}</TableCell>
                      <TableCell>{student.allottedHostel} ({student.roomNo})</TableCell>
                      <TableCell>{student.allottedMess}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {Math.ceil(unallottedTotal / PAGE_SIZE) > 1 && (
                <div className="flex justify-center items-center gap-3 mt-4">
                  {unallottedPage > 1 && <Button variant="outline" size="sm" onClick={() => loadUnallotted(unallottedPage - 1)}>Previous</Button>}
                  <span className="text-sm text-muted-foreground">Page {unallottedPage} of {Math.ceil(unallottedTotal / PAGE_SIZE)}</span>
                  {unallottedPage < Math.ceil(unallottedTotal / PAGE_SIZE) && <Button variant="outline" size="sm" onClick={() => loadUnallotted(unallottedPage + 1)}>Next</Button>}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </>
  );
}
