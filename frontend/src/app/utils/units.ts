// frontend/src/app/utils/units.ts
// Temperature/wind display units — same device-local pattern as
// language.ts's getLanguageChoice/setLanguageChoice (no account sync; a
// display preference, not trip data).

const STORAGE_KEY = 'jzUnits';

export type UnitPreference = 'imperial' | 'metric';

export function getUnitPreference(): UnitPreference {
  return localStorage.getItem(STORAGE_KEY) === 'metric' ? 'metric' : 'imperial';
}

export function setUnitPreference(unit: UnitPreference) {
  localStorage.setItem(STORAGE_KEY, unit);
  window.dispatchEvent(new Event('unitsChanged'));
}

export function formatTemp(value: number | undefined | null): string {
  if (value == null) return '—';
  return `${value}°${getUnitPreference() === 'metric' ? 'C' : 'F'}`;
}

export function windUnitLabel(): string {
  return getUnitPreference() === 'metric' ? 'km/h' : 'mph';
}
