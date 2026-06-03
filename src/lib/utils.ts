import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Issue 6.3: Cryptographically secure UUID v4 — replaces Math.random()
export function generateId(): string {
  return crypto.randomUUID();
}

import { SUPPORTED_CURRENCIES, CurrencyCode } from '../types';
import Decimal from 'decimal.js';

export function formatCurrency(amount: number | Decimal, currency: string = 'USD'): string {
  // Convert Decimal to number if needed
  const numericAmount = amount instanceof Decimal ? amount.toNumber() : amount;

  // Validate currency code against supported list
  const validCurrency: string = (SUPPORTED_CURRENCIES as readonly string[]).includes(currency)
    ? currency
    : (() => {
        console.warn(`[formatCurrency] Invalid currency code "${currency}" — falling back to USD.`);
        return 'USD';
      })();

  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: validCurrency,
    }).format(numericAmount);
  } catch (err) {
    // Final safety net for any Intl.NumberFormat edge case
    console.warn(`[formatCurrency] Intl.NumberFormat failed for "${validCurrency}":`, err);
    return `$${numericAmount.toFixed(2)}`;
  }
}

export function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  }).format(date);
}

