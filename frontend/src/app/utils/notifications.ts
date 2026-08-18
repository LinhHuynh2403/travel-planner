// frontend/src/app/utils/notifications.ts
// Real, persisted notification preferences — same device-local pattern as
// language.ts/units.ts. NOTE: this app has no push/email delivery pipeline
// yet, so these toggles are genuinely saved but nothing currently reads them
// to actually send anything — same as any preferences screen built ahead of
// its backend. The Notifications sub-screen says this plainly.

const STORAGE_KEY = 'jzNotificationPrefs';

export interface NotificationPrefs {
  tripReminders: boolean;
  newSuggestions: boolean;
  productUpdates: boolean;
}

const DEFAULTS: NotificationPrefs = {
  tripReminders: true,
  newSuggestions: true,
  productUpdates: false,
};

export function getNotificationPrefs(): NotificationPrefs {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? { ...DEFAULTS, ...JSON.parse(saved) } : DEFAULTS;
  } catch {
    return DEFAULTS;
  }
}

export function setNotificationPrefs(prefs: NotificationPrefs) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
}
