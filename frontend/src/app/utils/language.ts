// frontend/src/app/utils/language.ts
// Manual language override for JourZy's replies and generated itinerary
// content. Auto-detecting from navigator.language (still the default) isn't
// reliable for everyone — shared devices, browsers left on English, or
// travelers who just want a specific language regardless of browser locale.
// Codes here must match backend/prompts.js's LANGUAGE_NAMES map.

const STORAGE_KEY = 'jzLanguage';

export const SUPPORTED_LANGUAGES: { code: string; label: string }[] = [
  { code: 'auto', label: 'Auto-detect (browser language)' },
  { code: 'en', label: 'English' },
  { code: 'vi', label: 'Tiếng Việt' },
  { code: 'es', label: 'Español' },
  { code: 'fr', label: 'Français' },
  { code: 'ja', label: '日本語' },
  { code: 'ko', label: '한국어' },
  { code: 'zh', label: '中文' },
];

// What's actually sent to the backend with every chat/itinerary request.
export function getPreferredLanguage(): string {
  const saved = localStorage.getItem(STORAGE_KEY);
  return saved && saved !== 'auto' ? saved : navigator.language;
}

// What the Settings dropdown should show as selected — distinct from
// getPreferredLanguage() so "Auto-detect" stays shown/selected even though
// it resolves to a real browser language code under the hood.
export function getLanguageChoice(): string {
  const saved = localStorage.getItem(STORAGE_KEY);
  return saved || 'auto';
}

export function setLanguageChoice(code: string) {
  localStorage.setItem(STORAGE_KEY, code);
  window.dispatchEvent(new Event('languageChanged'));
}
