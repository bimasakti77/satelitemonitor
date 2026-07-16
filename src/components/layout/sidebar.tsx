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
  Menu,
  X,
  Moon,
  Sun,
  LogOut,
  ChevronDown,
  ChevronRight,
  BarChart3,
  ListTree,
  FolderKanban,
  Gauge,
  Layers3,
  ListChecks,
  Milestone,
  Files,
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
import { useEffect, useState } from "react";

type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  writeOnly?: boolean;
  adminOnly?: boolean;
  roles?: UserRole[];
  children?: NavItem[];
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
      {
        href: "/dossier",
        label: "Project Dossier",
        icon: FolderKanban,
        roles: ["ADMINISTRATOR", "EXECUTIVE"],
        children: [
          {
            href: "/dossier/dashboard",
            label: "Dashboard",
            icon: Gauge,
            roles: ["ADMINISTRATOR", "EXECUTIVE"],
          },
          {
            href: "/dossier/domain",
            label: "Domain",
            icon: Layers3,
            roles: ["ADMINISTRATOR", "EXECUTIVE"],
          },
          {
            href: "/dossier/indikator",
            label: "Indikator Baseline",
            icon: ListChecks,
            roles: ["ADMINISTRATOR", "EXECUTIVE"],
          },
          {
            href: "/dossier/roadmap",
            label: "Roadmap",
            icon: Milestone,
            roles: ["ADMINISTRATOR", "EXECUTIVE"],
          },
          {
            href: "/dossier/dokumen",
            label: "Dokumen",
            icon: Files,
            roles: ["ADMINISTRATOR", "EXECUTIVE"],
          },
        ],
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

function isActivePath(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(href + "/");
}

interface SidebarProps {
  user: { name: string; email: string; role: UserRole };
  unreadCount?: number;
}

export function Sidebar({ user, unreadCount = 0 }: SidebarProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openTrees, setOpenTrees] = useState<Record<string, boolean>>({});
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    setOpenTrees((prev) => {
      const next = { ...prev };
      for (const section of navSections) {
        for (const item of section.items) {
          if (item.children?.length && isActivePath(pathname, item.href)) {
            next[item.href] = true;
          }
        }
      }
      return next;
    });
  }, [pathname]);

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

      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
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
                  const children =
                    item.children?.filter((child) =>
                      isNavItemVisible(child, user.role)
                    ) ?? [];
                  const hasChildren = children.length > 0;
                  const branchOpen = Boolean(openTrees[item.href]);
                  const active = isActivePath(pathname, item.href);
                  const childActive = children.some((child) =>
                    isActivePath(pathname, child.href)
                  );

                  if (!hasChildren) {
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
                          <Badge
                            variant="default"
                            className="h-5 min-w-5 px-1.5 text-[10px]"
                          >
                            {unreadCount}
                          </Badge>
                        )}
                        {active && <ChevronRight className="h-3 w-3 opacity-50" />}
                      </Link>
                    );
                  }

                  return (
                    <div key={item.href} className="space-y-1">
                      <button
                        type="button"
                        onClick={() =>
                          setOpenTrees((prev) => ({
                            ...prev,
                            [item.href]: !prev[item.href],
                          }))
                        }
                        className={cn(
                          "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors",
                          active || childActive
                            ? "bg-primary/10 text-primary"
                            : "text-sidebar-foreground hover:bg-accent hover:text-accent-foreground"
                        )}
                      >
                        <Icon className="h-4 w-4 shrink-0" />
                        <span className="flex-1">{item.label}</span>
                        {branchOpen ? (
                          <ChevronDown className="h-3.5 w-3.5 opacity-70" />
                        ) : (
                          <ChevronRight className="h-3.5 w-3.5 opacity-70" />
                        )}
                      </button>

                      {branchOpen && (
                        <div className="ml-3 space-y-1 border-l border-sidebar-border pl-2">
                          {children.map((child) => {
                            const ChildIcon = child.icon;
                            const childIsActive = isActivePath(pathname, child.href);
                            return (
                              <Link
                                key={child.href}
                                href={child.href}
                                onClick={() => setMobileOpen(false)}
                                className={cn(
                                  "flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-sm transition-colors",
                                  childIsActive
                                    ? "bg-primary/10 font-medium text-primary"
                                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                                )}
                              >
                                <ChildIcon className="h-3.5 w-3.5 shrink-0" />
                                <span className="flex-1">{child.label}</span>
                              </Link>
                            );
                          })}
                        </div>
                      )}
                    </div>
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
            <button className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors hover:bg-accent">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/20 text-xs font-semibold text-primary">
                {user.name.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{user.name}</p>
                <p className="truncate text-xs text-muted-foreground">
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
            <DropdownMenuItem
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            >
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
