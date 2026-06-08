import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(dateInput: string | Date | null | undefined, includeYear = true): string {
  if (!dateInput) return 'TBD';
  try {
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return 'TBD';
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const day = d.getDate();
    const monthStr = months[d.getMonth()];
    if (includeYear) {
      return `${monthStr} ${day}, ${d.getFullYear()}`;
    } else {
      return `${monthStr} ${day}`;
    }
  } catch {
    return 'TBD';
  }
}
