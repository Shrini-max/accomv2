import { isAdminLoggedIn } from "@/lib/auth";
import { redirect } from "next/navigation";
import { ReactNode } from "react";
import { Toaster } from "@/components/ui/sonner";
import { AdminNav } from "@/components/AdminNav";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const loggedIn = await isAdminLoggedIn();
  if (!loggedIn) redirect("/login");

  return (
    <div className="min-h-screen bg-background">
      <AdminNav />
      <main>{children}</main>
      <Toaster richColors />
    </div>
  );
}
