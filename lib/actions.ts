"use server";

import { Student } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { cookies, headers } from "next/headers";
import Papa from "papaparse";
import { timingSafeEqual } from "crypto";
import { prisma } from "@/lib/prisma";
import { ADMIN_SESSION_KEY, MESS_CARD_SERIAL_LENGTH, CSV_COLUMN_MAP } from "@/lib/constants";

// --- Rate limiting ---
const loginAttempts = new Map<string, { count: number; resetAt: number }>();
const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 15 * 60 * 1000;

function getClientIp(): string {
  const headersList = headers();
  return (
    headersList.get("x-forwarded-for")?.split(",")[0].trim() ??
    headersList.get("x-real-ip") ??
    "unknown"
  );
}

function checkRateLimit(ip: string): { allowed: boolean; retryAfterSeconds?: number } {
  const now = Date.now();
  const record = loginAttempts.get(ip);
  if (record && now < record.resetAt && record.count >= MAX_ATTEMPTS) {
    return { allowed: false, retryAfterSeconds: Math.ceil((record.resetAt - now) / 1000) };
  }
  if (!record || now >= record.resetAt) {
    loginAttempts.set(ip, { count: 0, resetAt: now + LOCKOUT_MS });
  }
  return { allowed: true };
}

function recordFailedAttempt(ip: string) {
  const now = Date.now();
  const record = loginAttempts.get(ip);
  if (record && now < record.resetAt) {
    record.count += 1;
  } else {
    loginAttempts.set(ip, { count: 1, resetAt: now + LOCKOUT_MS });
  }
}

function clearAttempts(ip: string) {
  loginAttempts.delete(ip);
}

// --- Auth ---
export async function attemptLogin(
  password: string
): Promise<{ success: boolean; message: string }> {
  const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
  if (!ADMIN_PASSWORD) {
    console.error("ADMIN_PASSWORD environment variable is not set.");
    return { success: false, message: "Server configuration error." };
  }

  const ip = getClientIp();
  const rateCheck = checkRateLimit(ip);
  if (!rateCheck.allowed) {
    return {
      success: false,
      message: `Too many failed attempts. Try again in ${Math.ceil(rateCheck.retryAfterSeconds! / 60)} minutes.`,
    };
  }

  let isMatch = false;
  try {
    isMatch = timingSafeEqual(Buffer.from(password), Buffer.from(ADMIN_PASSWORD));
  } catch {
    isMatch = false;
  }

  if (isMatch) {
    clearAttempts(ip);
    cookies().set(ADMIN_SESSION_KEY, "true", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 7,
      path: "/",
    });
    return { success: true, message: "Login successful!" };
  }

  recordFailedAttempt(ip);
  return { success: false, message: "Invalid password." };
}

export async function handleLogout() {
  const { logout } = await import("@/lib/auth");
  await logout();
  revalidatePath("/", "layout");
}

// --- Stats ---
export async function getStudentStats(): Promise<{
  total: number;
  allotted: number;
  unallotted: number;
}> {
  try {
    const [total, allotted] = await Promise.all([
      prisma.student.count(),
      prisma.student.count({ where: { messCardSerialNumber: { not: null } } }),
    ]);
    return { total, allotted, unallotted: total - allotted };
  } catch {
    return { total: 0, allotted: 0, unallotted: 0 };
  }
}

// --- Student queries ---
export async function getStudentByRollNo(rollNo: string): Promise<Student | null> {
  if (!rollNo?.trim()) return null;
  try {
    return await prisma.student.findUnique({
      where: { rollNo: rollNo.trim().toUpperCase() },
    });
  } catch (error) {
    console.error("Error fetching student:", error);
    return null;
  }
}

export async function getUnallottedStudents(
  page = 1,
  pageSize = 50
): Promise<{ students: Student[]; total: number }> {
  try {
    const where = { messCardSerialNumber: null };
    const [students, total] = await Promise.all([
      prisma.student.findMany({
        where,
        orderBy: { rollNo: "asc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.student.count({ where }),
    ]);
    return { students, total };
  } catch {
    return { students: [], total: 0 };
  }
}

export async function allotMessCard(
  studentId: string,
  serialNumber: string
): Promise<{ success: boolean; message: string; student?: Student }> {
  if (!serialNumber || serialNumber.length !== MESS_CARD_SERIAL_LENGTH || !/^\d{4}$/.test(serialNumber)) {
    return { success: false, message: `Serial number must be ${MESS_CARD_SERIAL_LENGTH} digits.` };
  }

  try {
    const existingCard = await prisma.student.findFirst({
      where: { messCardSerialNumber: serialNumber },
    });
    if (existingCard && existingCard.id !== studentId) {
      return {
        success: false,
        message: `Serial number ${serialNumber} is already allotted to ${existingCard.rollNo}.`,
      };
    }

    const updatedStudent = await prisma.student.update({
      where: { id: studentId },
      data: { messCardSerialNumber: serialNumber, messCardAllottedAt: new Date() },
    });
    revalidatePath("/admin/dashboard");
    revalidatePath("/admin/allotted-list");
    return { success: true, message: "Mess card allotted successfully!", student: updatedStudent };
  } catch (error: unknown) {
    console.error("Error allotting mess card:", error);
    const prismaError = error as { code?: string; meta?: { target?: string[] } };
    if (prismaError.code === "P2002" && prismaError.meta?.target?.includes("messCardSerialNumber")) {
      return { success: false, message: `Serial number ${serialNumber} is already in use.` };
    }
    return { success: false, message: "Failed to allot mess card. Database error." };
  }
}

export async function updateMessCardSerial(
  studentId: string,
  newSerial: string
): Promise<{ success: boolean; message: string; student?: Student }> {
  if (!newSerial || newSerial.length !== MESS_CARD_SERIAL_LENGTH || !/^\d{4}$/.test(newSerial)) {
    return { success: false, message: `Serial number must be ${MESS_CARD_SERIAL_LENGTH} digits.` };
  }

  try {
    const existing = await prisma.student.findFirst({
      where: { messCardSerialNumber: newSerial },
    });
    if (existing && existing.id !== studentId) {
      return {
        success: false,
        message: `Serial number ${newSerial} is already allotted to ${existing.rollNo}.`,
      };
    }

    const updatedStudent = await prisma.student.update({
      where: { id: studentId },
      data: { messCardSerialNumber: newSerial },
    });
    revalidatePath("/admin/dashboard");
    revalidatePath("/admin/allotted-list");
    return { success: true, message: "Serial number updated successfully!", student: updatedStudent };
  } catch (error: unknown) {
    console.error("Error updating serial:", error);
    const prismaError = error as { code?: string; meta?: { target?: string[] } };
    if (prismaError.code === "P2002") {
      return { success: false, message: `Serial number ${newSerial} is already in use.` };
    }
    return { success: false, message: "Failed to update serial number." };
  }
}

export async function revokeMessCard(
  studentId: string
): Promise<{ success: boolean; message: string; student?: Student }> {
  try {
    const student = await prisma.student.findUnique({ where: { id: studentId } });
    if (!student) return { success: false, message: "Student not found." };
    if (!student.messCardSerialNumber) {
      return { success: false, message: "No mess card is currently allotted to this student." };
    }

    const updatedStudent = await prisma.student.update({
      where: { id: studentId },
      data: { messCardSerialNumber: null, messCardAllottedAt: null },
    });
    revalidatePath("/admin/dashboard");
    revalidatePath("/admin/allotted-list");
    return { success: true, message: "Mess card revoked successfully!", student: updatedStudent };
  } catch (error) {
    console.error("Error revoking mess card:", error);
    return { success: false, message: "Failed to revoke mess card. Database error." };
  }
}

export async function getAllottedStudents(
  page = 1,
  pageSize = 50,
  filters?: { department?: string; mess?: string },
  sort?: { field: string; order: "asc" | "desc" }
): Promise<{ students: Student[]; total: number }> {
  try {
    const where = {
      messCardSerialNumber: { not: null },
      messCardAllottedAt: { not: null },
      ...(filters?.department ? { department: filters.department } : {}),
      ...(filters?.mess ? { allottedMess: filters.mess } : {}),
    };

    const orderBy = sort?.field === "rollNo"
      ? { rollNo: sort.order }
      : sort?.field === "messCardAllottedAt"
      ? { messCardAllottedAt: sort.order }
      : sort?.field === "messCardSerialNumber"
      ? { messCardSerialNumber: sort.order }
      : { name: (sort?.order ?? "asc") as "asc" | "desc" };

    const [students, total] = await Promise.all([
      prisma.student.findMany({
        where,
        orderBy,
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.student.count({ where }),
    ]);
    return { students, total };
  } catch (error) {
    console.error("Error fetching allotted students:", error);
    return { students: [], total: 0 };
  }
}

export async function getAllottedFilters(): Promise<{
  departments: string[];
  messes: string[];
}> {
  try {
    const students = await prisma.student.findMany({
      where: { messCardSerialNumber: { not: null } },
      select: { department: true, allottedMess: true },
    });
    const departments = [...new Set(students.map((s) => s.department).filter(Boolean) as string[])].sort();
    const messes = [...new Set(students.map((s) => s.allottedMess))].sort();
    return { departments, messes };
  } catch {
    return { departments: [], messes: [] };
  }
}

export async function generateAllottedStudentsCSV(
  filters?: { department?: string; mess?: string }
): Promise<string> {
  try {
    const where = {
      messCardSerialNumber: { not: null },
      messCardAllottedAt: { not: null },
      ...(filters?.department ? { department: filters.department } : {}),
      ...(filters?.mess ? { allottedMess: filters.mess } : {}),
    };

    const students = await prisma.student.findMany({
      where,
      orderBy: { name: "asc" },
    });

    if (!students.length) return "";

    const csvData = students.map((student) => ({
      "Roll No.": student.rollNo,
      Name: student.name,
      Department: student.department ?? "N/A",
      "Allotted Hostel": student.allottedHostel,
      "Room No.": student.roomNo,
      "Mess Card Serial No.": student.messCardSerialNumber,
      "Allotted At": student.messCardAllottedAt
        ? new Date(student.messCardAllottedAt).toLocaleString()
        : "N/A",
      Email: student.email ?? "N/A",
      "Mobile No.": student.mobileNo ?? "N/A",
    }));

    return Papa.unparse(csvData);
  } catch (error) {
    console.error("Error generating CSV:", error);
    return "";
  }
}

// --- CSV Import ---
export interface CsvStudentRow {
  "S. No"?: string;
  "Roll no.": string;
  "Name of the Student": string;
  Gender: string;
  "Allotted Hostel": string;
  "Room no.": string;
  Code?: string;
  "Arrival date"?: string;
  "Departure date"?: string;
  "Allotted Mess": string;
  "Mess from"?: string;
  "Mess to"?: string;
  Remarks?: string;
  "Mess Preference"?: string;
  "Mobile no."?: string;
  "Emergency contact"?: string;
  PWD?: string;
  Age?: string;
  Email?: string;
  "DataScience/ElectronicSystems Department"?: string;
}

export interface ImportResult {
  imported: number;
  skipped: number;
  errors: string[];
}

export async function importStudentsFromCSV(formData: FormData): Promise<ImportResult> {
  const file = formData.get("csvFile") as File | null;
  if (!file || file.size === 0) {
    return { imported: 0, skipped: 0, errors: ["No file provided."] };
  }

  const text = await file.text();

  const parsed = Papa.parse<CsvStudentRow>(text, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (header) => header.trim(),
  });

  if (parsed.errors.length > 0) {
    const messages = parsed.errors.slice(0, 5).map((e) => `Row ${e.row}: ${e.message}`);
    return { imported: 0, skipped: 0, errors: messages };
  }

  let imported = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const row of parsed.data) {
    const rollNo = row[CSV_COLUMN_MAP.rollNo]?.trim();
    if (!rollNo) { skipped++; continue; }

    const email = row[CSV_COLUMN_MAP.email]?.trim() || null;
    const ageRaw = parseInt(row[CSV_COLUMN_MAP.age] ?? "");
    const age = isNaN(ageRaw) ? null : ageRaw;

    const studentData = {
      rollNo: rollNo.toUpperCase(),
      name: row[CSV_COLUMN_MAP.name] || "N/A",
      gender: row[CSV_COLUMN_MAP.gender] || "N/A",
      allottedHostel: row[CSV_COLUMN_MAP.allottedHostel] || "N/A",
      roomNo: row[CSV_COLUMN_MAP.roomNo] || "N/A",
      code: row[CSV_COLUMN_MAP.code] || null,
      arrivalDate: row[CSV_COLUMN_MAP.arrivalDate] || null,
      departureDate: row[CSV_COLUMN_MAP.departureDate] || null,
      allottedMess: row[CSV_COLUMN_MAP.allottedMess] || "N/A",
      messFrom: row[CSV_COLUMN_MAP.messFrom] || null,
      messTo: row[CSV_COLUMN_MAP.messTo] || null,
      remarks: row[CSV_COLUMN_MAP.remarks] || null,
      messPreference: row[CSV_COLUMN_MAP.messPreference] || null,
      mobileNo: row[CSV_COLUMN_MAP.mobileNo] || null,
      emergencyContact: row[CSV_COLUMN_MAP.emergencyContact] || null,
      pwd: row[CSV_COLUMN_MAP.pwd] || null,
      age,
      email,
      department: row[CSV_COLUMN_MAP.department] || null,
    };

    try {
      await prisma.student.upsert({
        where: { rollNo: studentData.rollNo },
        update: {
          name: studentData.name,
          gender: studentData.gender,
          allottedHostel: studentData.allottedHostel,
          roomNo: studentData.roomNo,
          allottedMess: studentData.allottedMess,
          mobileNo: studentData.mobileNo,
          email: studentData.email,
          department: studentData.department,
        },
        create: studentData,
      });
      imported++;
    } catch (error: unknown) {
      const prismaError = error as { code?: string; meta?: { target?: string[] } };
      if (prismaError.code === "P2002" && prismaError.meta?.target?.includes("email")) {
        try {
          await prisma.student.upsert({
            where: { rollNo: studentData.rollNo },
            update: { name: studentData.name, gender: studentData.gender, allottedHostel: studentData.allottedHostel, roomNo: studentData.roomNo, allottedMess: studentData.allottedMess, mobileNo: studentData.mobileNo, department: studentData.department },
            create: { ...studentData, email: null },
          });
          imported++;
        } catch (retryError) {
          errors.push(`${rollNo}: ${(retryError as Error).message}`);
        }
      } else {
        errors.push(`${rollNo}: ${(error as Error).message}`);
      }
    }
  }

  revalidatePath("/admin/dashboard");
  revalidatePath("/admin/allotted-list");
  return { imported, skipped, errors };
}

export async function clearAllStudents(): Promise<{ success: boolean; message: string; count: number }> {
  try {
    const { count } = await prisma.student.deleteMany({});
    revalidatePath("/admin/dashboard");
    revalidatePath("/admin/allotted-list");
    return { success: true, message: `Deleted ${count} student records.`, count };
  } catch (error) {
    console.error("Error clearing students:", error);
    return { success: false, message: "Failed to clear student data.", count: 0 };
  }
}
