// prisma/seed.ts
import { PrismaClient } from "@prisma/client";
import fs from "fs";
import path from "path";
import Papa from "papaparse";
import { CSV_COLUMN_MAP } from "../lib/constants";

interface CsvStudentRow {
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

const prisma = new PrismaClient();

async function main() {
  console.log("Start seeding ...");

  const csvFilePath = path.join(__dirname, "students_data.csv");
  if (!fs.existsSync(csvFilePath)) {
    console.error(`CSV file not found at ${csvFilePath}`);
    console.log("Please create 'prisma/students_data.csv' with your student data.");
    console.log(
      `Expected headers: ${Object.values(CSV_COLUMN_MAP).join(", ")}`
    );
    return;
  }

  const csvFile = fs.readFileSync(csvFilePath, "utf8");

  const parsed = Papa.parse<CsvStudentRow>(csvFile, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (header) => header.trim(),
  });

  if (parsed.errors.length > 0) {
    console.error("CSV Parsing errors:", parsed.errors);
    return;
  }

  for (const row of parsed.data) {
    const rollNo = row[CSV_COLUMN_MAP.rollNo]?.trim();
    if (!rollNo) {
      console.warn(`Skipping student with no Roll no.: ${row[CSV_COLUMN_MAP.name]}`);
      continue;
    }

    const existing = await prisma.student.findUnique({ where: { rollNo } });
    if (existing) {
      console.log(`Student with Roll No. ${rollNo} already exists. Skipping.`);
      continue;
    }

    const ageRaw = parseInt(row[CSV_COLUMN_MAP.age] ?? "");
    const email = row[CSV_COLUMN_MAP.email]?.trim() || null;

    const studentData = {
      rollNo,
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
      age: isNaN(ageRaw) ? null : ageRaw,
      email,
      department: row[CSV_COLUMN_MAP.department] || null,
    };

    try {
      await prisma.student.create({ data: studentData });
      console.log(`Created student: ${rollNo}`);
    } catch (e: unknown) {
      const prismaError = e as { code?: string; meta?: { target?: string[] } };
      if (prismaError.code === "P2002" && prismaError.meta?.target?.includes("rollNo")) {
        console.warn(`Roll No. ${rollNo} already exists (DB constraint). Skipping.`);
      } else if (prismaError.code === "P2002" && prismaError.meta?.target?.includes("email")) {
        console.warn(`Email conflict for ${rollNo}. Retrying without email.`);
        await prisma.student
          .create({ data: { ...studentData, email: null } })
          .catch((err: Error) => console.error(`Failed to create ${rollNo} even without email:`, err.message));
      } else {
        console.error(`Error creating ${rollNo}:`, (e as Error).message);
      }
    }
  }

  console.log("Seeding finished.");
}

main()
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
