/**
 * Class-name composer for the design system (DL-40). Merges conditional clsx
 * input and resolves Tailwind utility conflicts via tailwind-merge so later
 * classes win deterministically.
 */
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
