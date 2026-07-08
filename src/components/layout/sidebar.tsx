"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Building2,
  AppWindow,
  FileSpreadsheet,
  Bell,
  Shield,
  FileText,
  Menu,
  X,
  Moon,
  Sun,
  LogOut,
  ChevronRight,
  BarChart3,
  ListTree,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useTheme } from "@wrksz/themes/client";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { logoutAction } from "@/lib/actions/auth";
import { APP_SHORT_NAME, ROLE_LABELS } from "@/lib/constants";
import type { UserRole } from "@prisma/client";
import { useState } from "react";

type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  writeOnly?: boolean;
  adminOnly?: boolean;
  roles?: UserRole[];
};

type NavSection = {
  separatorBefore?: boolean;
  items: NavItem[];
};

const navSections: NavSection[] = [
  {
    items: [
      { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { href: "/services", label: "Daftar Layanan", icon: ListTree },
      { href: "/reports", label: "Laporan", icon: BarChart3 },
      {
        href: "/import",
        label: "Import / Export Data",
        icon: FileSpreadsheet,
        writeOnly: true,
      },
    ],
  },
  {
    separatorBefore: true,
    items: [
      { href: "/master/uke", label: "UKE", icon: Building2, adminOnly: true },
      {
        href: "/master/applications",
        label: "Aplikasi",
        icon: AppWindow,
        adminOnly: true,
      },
    ],
  },
  {
    separatorBefore: true,
    items: [
      { href: "/notifications", label: "Notifikasi", icon: Bell },
      {
        href: "/audit",
        label: "Audit Log",
        icon: Shield,
        roles: ["ADMINISTRATOR", "EXECUTIVE"],
      },
    ],
  },
];

function isNavItemVisible(item: NavItem, role: UserRole): boolean {
  if (item.roles && !item.roles.includes(role)) return false;
  if (item.writeOnly && role === "EXECUTIVE") return false;
  if (item.adminOnly && role !== "ADMINISTRATOR") return false;
  return true;
}

interface SidebarProps {
  user: { name: string; email: string; role: UserRole };
  unreadCount?: number;
}

export function Sidebar({ user, unreadCount = 0 }: SidebarProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { theme, setTheme } = useTheme();

  const NavContent = () => (
    <>
      <div className="flex h-14 items-center gap-2 border-b border-sidebar-border px-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground text-xs font-bold">
          SA
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-semibold leading-tight">{APP_SHORT_NAME}</span>
          <span className="text-[10px] text-muted-foreground">Executive Monitor</span>
        </div>
      </div>

      <nav className="flex-1 space-y-1 p-3">
        {navSections.map((section, sectionIndex) => {
          const visibleItems = section.items.filter((item) =>
            isNavItemVisible(item, user.role)
          );
          if (visibleItems.length === 0) return null;

          return (
            <div key={sectionIndex}>
              {section.separatorBefore && (
                <div
                  className="my-3 border-t border-sidebar-border"
                  role="separator"
                  aria-hidden="true"
                />
              )}
              <div className="space-y-1">
                {visibleItems.map((item) => {
                  const Icon = item.icon;
                  const active =
                    pathname === item.href || pathname.startsWith(item.href + "/");

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileOpen(false)}
                      className={cn(
                        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                        active
                          ? "bg-primary/10 text-primary"
                          : "text-sidebar-foreground hover:bg-accent hover:text-accent-foreground"
                      )}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      <span className="flex-1">{item.label}</span>
                      {item.href === "/notifications" && unreadCount > 0 && (
                        <Badge variant="default" className="h-5 min-w-5 px-1.5 text-[10px]">
                          {unreadCount}
                        </Badge>
                      )}
                      {active && <ChevronRight className="h-3 w-3 opacity-50" />}
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>

      <div className="border-t border-sidebar-border p-3">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left hover:bg-accent transition-colors">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/20 text-primary text-xs font-semibold">
                {user.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{user.name}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {ROLE_LABELS[user.role]}
                </p>
              </div>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <div className="px-2 py-1.5">
              <p className="text-sm font-medium">{user.name}</p>
              <p className="text-xs text-muted-foreground">{user.email}</p>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
              {theme === "dark" ? (
                <Sun className="mr-2 h-4 w-4" />
              ) : (
                <Moon className="mr-2 h-4 w-4" />
              )}
              {theme === "dark" ? "Light Mode" : "Dark Mode"}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onClick={() => logoutAction()}
            >
              <LogOut className="mr-2 h-4 w-4" />
              Keluar
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </>
  );

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="fixed left-4 top-4 z-50 lg:hidden"
        onClick={() => setMobileOpen(!mobileOpen)}
      >
        {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </Button>

      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-sidebar-border bg-sidebar transition-transform lg:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <NavContent />
      </aside>
    </>
  );
}
