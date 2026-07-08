import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat("id-ID").format(value);
}

export function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`;
}

const APP_TIMEZONE = "Asia/Jakarta";

export function formatDate(date: Date | string): string {
  const formatted = new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: APP_TIMEZONE,
  }).format(new Date(date));

  return formatted.replace(/(\d{2})\.(\d{2})$/, "$1:$2");
}

export function formatDateShort(date: Date | string): string {
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: APP_TIMEZONE,
  }).format(new Date(date));
}
