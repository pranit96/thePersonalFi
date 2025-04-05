import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number, showCents: boolean = true): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: showCents ? 2 : 0,
    maximumFractionDigits: showCents ? 2 : 0,
  }).format(amount);
}

export function calculatePercentage(value: number, total: number): number {
  return Math.round((value / total) * 100);
}

export function formatPercentage(value: number): string {
  return `${value}%`;
}

export function calculateChange(current: number, previous: number): number {
  if (previous === 0) return 0;
  return Math.round(((current - previous) / previous) * 100);
}

export function getChangeDirection(value: number): 'increase' | 'decrease' | 'none' {
  if (value > 0) return 'increase';
  if (value < 0) return 'decrease';
  return 'none';
}

export function getChangeColor(value: number, inverted: boolean = false): string {
  const isPositive = value > 0;
  const isNegative = value < 0;
  
  if (inverted) {
    return isPositive ? 'text-red-400' : isNegative ? 'text-secondary' : 'text-text/70';
  }
  
  return isPositive ? 'text-secondary' : isNegative ? 'text-red-400' : 'text-text/70';
}

export function getDayOfWeek(date: Date): string {
  return new Intl.DateTimeFormat('en-US', { weekday: 'short' }).format(date);
}

export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '...';
}
