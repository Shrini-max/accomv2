"use client";

import { useRef, useState, useTransition, DragEvent } from "react";
import { importStudentsFromCSV, clearAllStudents } from "@/lib/actions";
import type { ImportResult } from "@/lib/actions";
import { CSV_COLUMN_MAP } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader,
  AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Upload, FileText, CheckCircle, XCircle, AlertTriangle, Trash2, Download } from "lucide-react";
import Papa from "papaparse";

const EXPECTED_COLUMNS = Object.values(CSV_COLUMN_MAP);

const TEMPLATE_HEADERS = [
  "S. No", "Roll no.", "Name of the Student", "Gender", "Allotted Hostel",
  "Room no.", "Code", "Arrival date", "Departure date", "Allotted Mess",
  "Mess from", "Mess to", "Remarks", "Mess Preference", "Mobile no.",
  "Emergency contact", "PWD", "Age", "Email",
  "DataScience/ElectronicSystems Department",
];

const SAMPLE_ROW = [
  "1", "B22CS001", "Aarav Sharma", "Male", "Brahmaputra Hostel", "101",
  "A", "01-06-2025", "30-11-2025", "Mess A", "01-06-2025", "30-11-2025",
  "", "Veg", "9876543210", "9876543211", "No", "20",
  "aarav.sharma@college.edu", "CS",
];

function downloadTemplate() {
  const csv = Papa.unparse({ fields: TEMPLATE_HEADERS, data: [SAMPLE_ROW] });
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "students_template.csv";
  link.click();
  URL.revokeObjectURL(link.href);
}

interface PreviewRow {
  [key: string]: string;
}

export default function ImportPage() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [clearResult, setClearResult] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [previewRows, setPreviewRows] = useState<PreviewRow[]>([]);
  const [previewHeaders, setPreviewHeaders] = useState<string[]>([]);

  const [isImporting, startImportTransition] = useTransition();
  const [isClearing, startClearTransition] = useTransition();

  const processFile = (file: File) => {
    if (!file.name.endsWith(".csv")) return;
    setSelectedFile(file);
    setResult(null);
    setPreviewRows([]);
    setPreviewHeaders([]);

    // Parse first 5 rows for preview
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const parsed = Papa.parse<PreviewRow>(text, {
        header: true,
        skipEmptyLines: true,
        transformHeader: (h) => h.trim(),
        preview: 5,
      });
      if (parsed.meta.fields) setPreviewHeaders(parsed.meta.fields.slice(0, 8));
      setPreviewRows(parsed.data.slice(0, 5));
    };
    reader.readAsText(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  };

  const handleImport = () => {
    if (!selectedFile) return;
    const formData = new FormData();
    formData.append("csvFile", selectedFile);
    startImportTransition(async () => {
      const importResult = await importStudentsFromCSV(formData);
      setResult(importResult);
      if (importResult.imported > 0) setPreviewRows([]);
    });
  };

  const handleClear = () => {
    startClearTransition(async () => {
      const clearRes = await clearAllStudents();
      setClearResult(clearRes.message);
      setResult(null);
      setSelectedFile(null);
      setPreviewRows([]);
      if (fileInputRef.current) fileInputRef.current.value = "";
    });
  };

  return (
    <div className="container mx-auto p-4 md:p-8 max-w-3xl">
      <h1 className="text-3xl font-bold mb-6">Import Students</h1>

      {/* Upload Card */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Upload CSV File
            </CardTitle>
            <Button variant="outline" size="sm" onClick={downloadTemplate} className="gap-1.5">
              <Download className="h-4 w-4" />
              Download Template
            </Button>
          </div>
          <CardDescription>
            Existing students (matched by Roll No.) will be updated. Mess card allocations are preserved on re-import.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
              ${isDragging ? "border-primary bg-primary/5" : "border-border hover:border-muted-foreground"}`}
            onClick={() => fileInputRef.current?.click()}
            onDragOver={handleDragOver}
            onDragEnter={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <FileText className={`h-10 w-10 mx-auto mb-3 ${isDragging ? "text-primary" : "text-muted-foreground"}`} />
            {selectedFile ? (
              <div>
                <p className="font-medium">{selectedFile.name}</p>
                <p className="text-sm text-muted-foreground">
                  {(selectedFile.size / 1024).toFixed(1)} KB — click or drop to change
                </p>
              </div>
            ) : (
              <div>
                <p className="font-medium">{isDragging ? "Drop it here!" : "Click to select or drag & drop a CSV"}</p>
                <p className="text-sm text-muted-foreground">Only .csv files are accepted</p>
              </div>
            )}
            <input ref={fileInputRef} type="file" accept=".csv" onChange={handleFileChange} className="hidden" />
          </div>

          <Button onClick={handleImport} disabled={!selectedFile || isImporting} className="w-full">
            {isImporting ? "Importing..." : "Import Students"}
          </Button>
        </CardContent>
      </Card>

      {/* Row Preview */}
      {previewRows.length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-base">Preview (first {previewRows.length} rows)</CardTitle>
            <CardDescription>Verify your columns look correct before importing.</CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  {previewHeaders.map((h) => <TableHead key={h} className="text-xs whitespace-nowrap">{h}</TableHead>)}
                </TableRow>
              </TableHeader>
              <TableBody>
                {previewRows.map((row, i) => (
                  <TableRow key={i}>
                    {previewHeaders.map((h) => (
                      <TableCell key={h} className="text-xs whitespace-nowrap max-w-[120px] truncate">
                        {row[h] ?? "—"}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Import Result */}
      {result && (
        <Card className="mb-6">
          <CardHeader><CardTitle>Import Results</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2 text-green-700 dark:text-green-400">
              <CheckCircle className="h-5 w-5" />
              <span className="font-medium">{result.imported} students imported / updated</span>
            </div>
            {result.skipped > 0 && (
              <div className="flex items-center gap-2 text-yellow-600 dark:text-yellow-400">
                <AlertTriangle className="h-5 w-5" />
                <span>{result.skipped} rows skipped (missing Roll No.)</span>
              </div>
            )}
            {result.errors.length > 0 && (
              <div>
                <div className="flex items-center gap-2 text-destructive mb-2">
                  <XCircle className="h-5 w-5" />
                  <span className="font-medium">{result.errors.length} errors</span>
                </div>
                <ul className="text-sm text-destructive space-y-1 pl-7 list-disc">
                  {result.errors.map((err, i) => <li key={i}>{err}</li>)}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {clearResult && (
        <div className="mb-6 p-3 bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800 rounded-md text-orange-700 dark:text-orange-400 text-sm">
          {clearResult}
        </div>
      )}

      {/* Expected columns reference */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-base">Expected CSV Columns</CardTitle>
          <CardDescription>Your CSV must include these headers (extra columns are ignored):</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {EXPECTED_COLUMNS.map((col) => (
              <span key={col} className="px-2 py-1 bg-muted text-muted-foreground text-xs rounded font-mono">
                {col}
              </span>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Danger zone */}
      <Card className="border-destructive/30">
        <CardHeader>
          <CardTitle className="text-destructive flex items-center gap-2">
            <Trash2 className="h-5 w-5" /> Danger Zone
          </CardTitle>
          <CardDescription>
            Permanently delete all student records including accommodation card allocations. Cannot be undone.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" disabled={isClearing}>
                {isClearing ? "Clearing..." : "Clear All Student Data"}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete all student records?</AlertDialogTitle>
                <AlertDialogDescription>
                  This permanently deletes every student record and all accommodation card allocations.
                  You will need to re-import your data from a CSV file.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleClear} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                  Yes, delete everything
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>
    </div>
  );
}
