// frontend/src/app/utils/theme.ts
// Explicit light/dark toggle, backed by the .dark class on <html> (see the
// dark-palette overrides in styles/tailwind.css) and localStorage. The
// initial class is already applied by an inline script in index.html before
// first paint — this module just keeps it in sync after that.

export type ThemeChoice = 'light' | 'dark';

const STORAGE_KEY = 'jzTheme';

export function getStoredTheme(): ThemeChoice | null {
  const saved = localStorage.getItem(STORAGE_KEY);
  return saved === 'dark' || saved === 'light' ? saved : null;
}

export function getEffectiveTheme(): ThemeChoice {
  return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
}

export function setTheme(theme: ThemeChoice) {
  localStorage.setItem(STORAGE_KEY, theme);
  document.documentElement.classList.toggle('dark', theme === 'dark');
}

// Applies the visual class only, without persisting — lets Settings show a
// live preview as the traveler taps Light/Dark, while the choice only
// actually sticks once they hit the page's single Save button. If they
// navigate away without saving, the next load re-applies whatever was last
// truly saved (see the inline script in index.html), discarding the preview.
export function previewTheme(theme: ThemeChoice) {
  document.documentElement.classList.toggle('dark', theme === 'dark');
}
