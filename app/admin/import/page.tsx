"use client";

import { useRef, useState, useTransition } from "react";
import { importStudentsFromCSV, clearAllStudents } from "@/lib/actions";
import type { ImportResult } from "@/lib/actions";
import { CSV_COLUMN_MAP } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Upload, FileText, CheckCircle, XCircle, AlertTriangle, Trash2 } from "lucide-react";
import Link from "next/link";

const EXPECTED_COLUMNS = Object.values(CSV_COLUMN_MAP);

export default function ImportPage() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [clearResult, setClearResult] = useState<string | null>(null);

  const [isImporting, startImportTransition] = useTransition();
  const [isClearing, startClearTransition] = useTransition();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    setSelectedFile(file);
    setResult(null);
  };

  const handleImport = () => {
    if (!selectedFile) return;
    const formData = new FormData();
    formData.append("csvFile", selectedFile);

    startImportTransition(async () => {
      const importResult = await importStudentsFromCSV(formData);
      setResult(importResult);
    });
  };

  const handleClear = () => {
    startClearTransition(async () => {
      const clearRes = await clearAllStudents();
      setClearResult(clearRes.message);
      setResult(null);
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    });
  };

  return (
    <div className="container mx-auto p-4 md:p-8 max-w-3xl">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Import Students</h1>
        <Link href="/admin/dashboard">
          <Button variant="outline">Back to Dashboard</Button>
        </Link>
      </div>

      {/* Upload Card */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Upload CSV File
          </CardTitle>
          <CardDescription>
            Import student data from a CSV file. Existing students (matched by Roll No.) will have
            their details updated. Mess card allocations are preserved on updates.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div
            className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-gray-400 transition-colors"
            onClick={() => fileInputRef.current?.click()}
          >
            <FileText className="h-10 w-10 mx-auto mb-3 text-gray-400" />
            {selectedFile ? (
              <div>
                <p className="font-medium text-gray-700">{selectedFile.name}</p>
                <p className="text-sm text-gray-500">
                  {(selectedFile.size / 1024).toFixed(1)} KB — click to change
                </p>
              </div>
            ) : (
              <div>
                <p className="font-medium text-gray-700">Click to select a CSV file</p>
                <p className="text-sm text-gray-500">or drag and drop</p>
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="hidden"
            />
          </div>

          <Button
            onClick={handleImport}
            disabled={!selectedFile || isImporting}
            className="w-full"
          >
            {isImporting ? "Importing..." : "Import Students"}
          </Button>
        </CardContent>
      </Card>

      {/* Import Result */}
      {result && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Import Results</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2 text-green-700">
              <CheckCircle className="h-5 w-5" />
              <span className="font-medium">{result.imported} students imported / updated</span>
            </div>
            {result.skipped > 0 && (
              <div className="flex items-center gap-2 text-yellow-600">
                <AlertTriangle className="h-5 w-5" />
                <span>{result.skipped} rows skipped (missing Roll No.)</span>
              </div>
            )}
            {result.errors.length > 0 && (
              <div>
                <div className="flex items-center gap-2 text-red-600 mb-2">
                  <XCircle className="h-5 w-5" />
                  <span className="font-medium">{result.errors.length} errors</span>
                </div>
                <ul className="text-sm text-red-600 space-y-1 pl-7 list-disc">
                  {result.errors.map((err, i) => (
                    <li key={i}>{err}</li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Clear result banner */}
      {clearResult && (
        <div className="mb-6 p-3 bg-orange-50 border border-orange-200 rounded-md text-orange-700 text-sm">
          {clearResult}
        </div>
      )}

      {/* Expected columns reference */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-base">Expected CSV Columns</CardTitle>
          <CardDescription>
            Your CSV file should include these column headers (extra columns are ignored):
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {EXPECTED_COLUMNS.map((col) => (
              <span
                key={col}
                className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded font-mono"
              >
                {col}
              </span>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Danger zone */}
      <Card className="border-red-200">
        <CardHeader>
          <CardTitle className="text-red-600 flex items-center gap-2">
            <Trash2 className="h-5 w-5" />
            Danger Zone
          </CardTitle>
          <CardDescription>
            Permanently delete all student records from the database. This cannot be undone.
            Mess card allocations will also be lost.
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
                  This will permanently delete every student record including all mess card
                  allocations. This action cannot be undone. You will need to re-import your
                  data from a CSV file.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleClear}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
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
