export type ThemeMode = 'auto' | 'light' | 'dark';
export type ResolvedTheme = 'light' | 'dark';

export const THEME_STORAGE_KEY = 'playo-theme-mode';

export function isThemeMode(value: unknown): value is ThemeMode {
  return value === 'auto' || value === 'light' || value === 'dark';
}

export function themeForHour(hour: number): ResolvedTheme {
  return hour >= 6 && hour < 18 ? 'light' : 'dark';
}

export function resolveTheme(mode: ThemeMode, date = new Date()): ResolvedTheme {
  return mode === 'auto' ? themeForHour(date.getHours()) : mode;
}

export function nextAutomaticThemeBoundary(date = new Date()): Date {
  const next = new Date(date);
  const hour = date.getHours();
  if (hour < 6) next.setHours(6, 0, 0, 0);
  else if (hour < 18) next.setHours(18, 0, 0, 0);
  else {
    next.setDate(next.getDate() + 1);
    next.setHours(6, 0, 0, 0);
  }
  return next;
}
