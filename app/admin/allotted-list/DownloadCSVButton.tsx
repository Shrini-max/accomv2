"use client";

import { Button } from "@/components/ui/button";
import { generateAllottedStudentsCSV } from "@/lib/actions";
import { useTransition } from "react";
import { Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Props {
  filters?: { department?: string; mess?: string };
}

export default function DownloadCSVButton({ filters }: Props) {
  const [isDownloading, startDownloadTransition] = useTransition();
  const { toast } = useToast();

  const handleDownload = () => {
    startDownloadTransition(async () => {
      try {
        const csvString = await generateAllottedStudentsCSV(filters);
        if (!csvString) {
          toast({ title: "No Data", description: "No allotted students to download." });
          return;
        }
        const blob = new Blob([csvString], { type: "text/csv;charset=utf-8;" });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.href = url;
        link.download = "allotted_mess_cards.csv";
        link.style.visibility = "hidden";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        toast({ title: "Success", description: "CSV download started." });
      } catch {
        toast({ title: "Error", description: "Failed to generate CSV.", variant: "destructive" });
      }
    });
  };

  return (
    <Button onClick={handleDownload} disabled={isDownloading} size="sm" className="gap-1.5">
      <Download className="h-4 w-4" />
      {isDownloading ? "Downloading..." : "Download CSV"}
    </Button>
  );
}
