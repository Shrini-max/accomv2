"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import { handleLogout } from "@/lib/actions";
import { useTransition } from "react";
import { LayoutDashboard, Upload, List, ChevronRight, LogOut } from "lucide-react";

const navLinks = [
  { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/import", label: "Import", icon: Upload },
  { href: "/admin/allotted-list", label: "Allotted List", icon: List },
];

const breadcrumbMap: Record<string, string> = {
  "/admin/dashboard": "Dashboard",
  "/admin/import": "Import Students",
  "/admin/allotted-list": "Allotted List",
};

export function AdminNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [isLoggingOut, startLogoutTransition] = useTransition();

  const onLogout = () => {
    startLogoutTransition(async () => {
      await handleLogout();
      router.push("/login");
      router.refresh();
    });
  };

  const breadcrumb = breadcrumbMap[pathname] ?? "Admin";

  return (
    <header className="border-b bg-background sticky top-0 z-10">
      <div className="container mx-auto px-4 md:px-8 flex items-center justify-between h-14">
        {/* Left: logo + breadcrumb */}
        <div className="flex items-center gap-2 text-sm">
          <span className="font-semibold text-base">Mess Portal</span>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
          <span className="text-muted-foreground">{breadcrumb}</span>
        </div>

        {/* Center: nav links */}
        <nav className="hidden md:flex items-center gap-1">
          {navLinks.map(({ href, label, icon: Icon }) => (
            <Link key={href} href={href}>
              <Button
                variant={pathname === href ? "secondary" : "ghost"}
                size="sm"
                className="gap-1.5"
              >
                <Icon className="h-4 w-4" />
                {label}
              </Button>
            </Link>
          ))}
        </nav>

        {/* Right: theme toggle + logout */}
        <div className="flex items-center gap-1">
          <ThemeToggle />
          <Button
            variant="ghost"
            size="sm"
            onClick={onLogout}
            disabled={isLoggingOut}
            className="gap-1.5"
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden md:inline">{isLoggingOut ? "Logging out..." : "Logout"}</span>
          </Button>
        </div>
      </div>

      {/* Mobile nav */}
      <div className="md:hidden flex border-t px-4 py-1 gap-1">
        {navLinks.map(({ href, label, icon: Icon }) => (
          <Link key={href} href={href} className="flex-1">
            <Button
              variant={pathname === href ? "secondary" : "ghost"}
              size="sm"
              className="w-full gap-1.5 text-xs"
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </Button>
          </Link>
        ))}
      </div>
    </header>
  );
}
