import { useEffect, useState } from 'react';
import {
  Bell, Globe, Ruler, Lock, DoorOpen, ChevronLeft, ChevronRight, Check, Download, AlertTriangle, Pencil,
} from 'lucide-react';
import { apiFetch } from '../utils/api';
import { supabase } from '../utils/supabaseClient';
import { SUPPORTED_LANGUAGES, getLanguageChoice, setLanguageChoice } from '../utils/language';
import { getUnitPreference, setUnitPreference, type UnitPreference } from '../utils/units';
import { getNotificationPrefs, setNotificationPrefs, type NotificationPrefs } from '../utils/notifications';
import { useTranslation } from '../utils/translations';
import { C, display } from '../components/ui/jourzy-theme';

type Screen = 'root' | 'notifications' | 'language' | 'units' | 'privacy';

function Toggle({ on, onClick }: { on: boolean; onClick: () => void }) {
  return (
    <span onClick={onClick} className="relative rounded-full shrink-0 cursor-pointer" style={{ width: 40, height: 24, background: on ? C.green : C.line }}>
      <span className="absolute rounded-full bg-white transition-transform" style={{ width: 18, height: 18, top: 3, left: 3, transform: on ? "translateX(16px)" : "translateX(0)" }} />
    </span>
  );
}

function Row({ icon, label, value, onClick }: { icon: React.ReactNode; label: string; value?: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="w-full flex items-center gap-3 rounded-jz-card border border-jz-line bg-jz-card p-3.5 text-left">
      <div className="w-9 h-9 rounded-xl shrink-0 flex items-center justify-center" style={{ background: C.greenSoft, color: C.green }}>
        {icon}
      </div>
      <div className="flex-1 min-w-0 font-bold text-sm truncate" style={{ color: C.ink }}>
        {label}{value && <span className="font-medium" style={{ color: C.sub }}> · {value}</span>}
      </div>
      <ChevronRight size={16} style={{ color: C.sub }} className="shrink-0" />
    </button>
  );
}

function SubHeader({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <div className="flex items-center gap-2 mb-5">
      <button onClick={onBack} className="w-8 h-8 rounded-full flex items-center justify-center border border-jz-line shrink-0" style={{ color: C.ink }}>
        <ChevronLeft size={16} />
      </button>
      <h1 className="text-jz-title font-bold" style={{ color: C.ink }}>{title}</h1>
    </div>
  );
}

export default function ProfileView() {
  const { t } = useTranslation();
  const [userId, setUserId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState('');

  const [name, setName] = useState('');
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState('');

  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(false);
  const [confirmEmailSent, setConfirmEmailSent] = useState(false);

  const [screen, setScreen] = useState<Screen>('root');
  const [language, setLanguage] = useState(getLanguageChoice());
  const [unit, setUnit] = useState<UnitPreference>(getUnitPreference());
  const [notifPrefs, setNotifPrefs] = useState<NotificationPrefs>(getNotificationPrefs());

  const [downloading, setDownloading] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const loadProfile = async (uid: string, sessionEmail?: string) => {
    setUserId(uid);
    if (sessionEmail) setUserEmail(sessionEmail);
    try {
      const resp = await apiFetch('/api/memory');
      if (resp.ok) {
        const data = await resp.json();
        setName(data?.memory?.preferences?.userName || '');
      }
    } catch (e) { console.error('Failed to load profile:', e); }
  };

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) loadProfile(session.user.id, session.user.email || '');
    })();
  }, []);

  const handleAuthSubmit = async () => {
    setAuthError(null);
    setAuthLoading(true);
    try {
      if (authMode === 'signin') {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) { setAuthError(error.message); return; }
        if (data.session) await loadProfile(data.session.user.id, data.session.user.email || '');
      } else {
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) { setAuthError(error.message); return; }
        if (data.session) {
          await loadProfile(data.session.user.id, data.session.user.email || '');
        } else {
          setConfirmEmailSent(true);
        }
      }
      setEmail('');
      setPassword('');
    } catch (e: any) {
      setAuthError(e?.message || t("settings.authGenericError"));
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setUserId(null);
    setUserEmail('');
    setName('');
    setScreen('root');
  };

  const saveName = async () => {
    const trimmed = nameDraft.trim().slice(0, 40);
    setEditingName(false);
    if (!trimmed || trimmed === name || !userId) return;
    setName(trimmed);
    try {
      const existingResp = await apiFetch('/api/memory');
      const existingPrefs = existingResp.ok ? (await existingResp.json())?.memory?.preferences || {} : {};
      await apiFetch('/api/memory', { method: 'POST', body: JSON.stringify({ preferences: { ...existingPrefs, userName: trimmed } }) });
    } catch (e) { console.error('Failed to save name:', e); }
  };

  const toggleNotif = (key: keyof NotificationPrefs) => {
    const next = { ...notifPrefs, [key]: !notifPrefs[key] };
    setNotifPrefs(next);
    setNotificationPrefs(next);
  };

  const chooseLanguage = (code: string) => {
    setLanguage(code);
    setLanguageChoice(code);
    setScreen('root');
  };

  const chooseUnit = (u: UnitPreference) => {
    setUnit(u);
    setUnitPreference(u);
    setScreen('root');
  };

  const downloadData = async () => {
    setDownloading(true);
    try {
      const resp = await apiFetch('/api/trips');
      const { trips } = await resp.json();
      const full = await Promise.all((trips || []).map(async (trip: any) => {
        const detailResp = await apiFetch(`/api/trips/${trip.id}`);
        return detailResp.ok ? await detailResp.json() : { trip };
      }));
      const blob = new Blob([JSON.stringify(full, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'jourzy-my-data.json';
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error('Failed to download data:', e);
    } finally {
      setDownloading(false);
    }
  };

  const deleteAccount = async () => {
    if (deleteConfirmText.trim().toLowerCase() !== userEmail.toLowerCase()) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      const resp = await apiFetch('/api/account', { method: 'DELETE' });
      if (!resp.ok) {
        setDeleteError(t("profile.deleteAccountError"));
        return;
      }
      await supabase.auth.signOut();
      setUserId(null);
      setUserEmail('');
      setName('');
      setScreen('root');
    } catch (e) {
      setDeleteError(t("profile.deleteAccountError"));
    } finally {
      setDeleting(false);
    }
  };

  if (!userId) {
    return (
      <div className="flex flex-col min-h-full px-4 pt-4">
        <div className="mb-6">
          <div className="text-jz-label font-bold uppercase tracking-wider text-jz-teal">{t("profile.account")}</div>
          <h1 className="mt-0.5 text-jz-screen font-semibold text-jz-ink">{t("nav.profile")}</h1>
        </div>
        <section className="bg-jz-card border border-jz-line rounded-jz-card p-5">
          {confirmEmailSent ? (
            <p className="text-xs text-jz-soft font-medium">{t("settings.confirmEmailSent")}</p>
          ) : (
            <>
              <p className="text-xs text-jz-soft font-medium mb-3">{t("settings.signInPrompt")}</p>
              <div className="space-y-2.5">
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder={t("settings.email")} autoCapitalize="none"
                  className="w-full bg-jz-bg border border-jz-line rounded-xl px-4 py-3 text-sm text-jz-ink placeholder-jz-soft focus:outline-none focus:border-jz-teal transition-all" />
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder={t("settings.password")}
                  className="w-full bg-jz-bg border border-jz-line rounded-xl px-4 py-3 text-sm text-jz-ink placeholder-jz-soft focus:outline-none focus:border-jz-teal transition-all" />
                {authError && <p className="text-xs font-medium" style={{ color: C.hanko }}>{authError}</p>}
                <button onClick={handleAuthSubmit} disabled={authLoading || !email.trim() || !password.trim()}
                  className="w-full py-3 rounded-xl bg-jz-teal text-white font-bold text-sm disabled:opacity-40">
                  {authLoading ? <span className="inline-block w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> : authMode === 'signin' ? t("settings.signIn") : t("settings.signUp")}
                </button>
                <button onClick={() => { setAuthMode(m => m === 'signin' ? 'signup' : 'signin'); setAuthError(null); }}
                  className="w-full text-center text-xs font-bold py-1" style={{ color: C.green }}>
                  {authMode === 'signin' ? t("settings.noAccountYet") : t("settings.haveAccountAlready")}
                </button>
              </div>
            </>
          )}
        </section>
      </div>
    );
  }

  if (screen === 'notifications') {
    return (
      <div className="px-4 pt-4 pb-24">
        <SubHeader title={t("profile.notifications")} onBack={() => setScreen('root')} />
        <p className="text-xs mb-4" style={{ color: C.sub }}>{t("profile.notificationsDisclaimer")}</p>
        <div className="space-y-2.5">
          {([
            ['tripReminders', t("profile.tripReminders")],
            ['newSuggestions', t("profile.newSuggestions")],
            ['productUpdates', t("profile.productUpdates")],
          ] as const).map(([key, label]) => (
            <div key={key} className="w-full flex items-center justify-between gap-3 rounded-jz-card border border-jz-line bg-jz-card p-3.5">
              <div className="font-bold text-sm" style={{ color: C.ink }}>{label}</div>
              <Toggle on={notifPrefs[key]} onClick={() => toggleNotif(key)} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (screen === 'language') {
    return (
      <div className="px-4 pt-4 pb-24">
        <SubHeader title={t("settings.language")} onBack={() => setScreen('root')} />
        <div className="space-y-2">
          {SUPPORTED_LANGUAGES.map((l) => (
            <button key={l.code} onClick={() => chooseLanguage(l.code)}
              className="w-full flex items-center justify-between gap-3 rounded-jz-card border border-jz-line bg-jz-card p-3.5 text-left">
              <span className="font-bold text-sm" style={{ color: C.ink }}>{l.label}</span>
              {language === l.code && <Check size={16} style={{ color: C.green }} />}
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (screen === 'units') {
    return (
      <div className="px-4 pt-4 pb-24">
        <SubHeader title={t("profile.units")} onBack={() => setScreen('root')} />
        <div className="space-y-2">
          {([['imperial', t("profile.imperial")], ['metric', t("profile.metric")]] as const).map(([u, label]) => (
            <button key={u} onClick={() => chooseUnit(u)}
              className="w-full flex items-center justify-between gap-3 rounded-jz-card border border-jz-line bg-jz-card p-3.5 text-left">
              <span className="font-bold text-sm" style={{ color: C.ink }}>{label}</span>
              {unit === u && <Check size={16} style={{ color: C.green }} />}
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (screen === 'privacy') {
    const confirmMatches = deleteConfirmText.trim().toLowerCase() === userEmail.toLowerCase() && userEmail.length > 0;
    return (
      <div className="px-4 pt-4 pb-24">
        <SubHeader title={t("profile.privacyData")} onBack={() => setScreen('root')} />
        <p className="text-xs mb-5 leading-relaxed" style={{ color: C.sub }}>{t("profile.privacyBlurb")}</p>

        <button onClick={downloadData} disabled={downloading}
          className="w-full flex items-center justify-center gap-2 rounded-jz-btn py-3.5 font-bold text-sm mb-8 disabled:opacity-60"
          style={{ background: C.greenSoft, color: C.green }}>
          {downloading ? <span className="w-4 h-4 border-2 border-current/40 border-t-current rounded-full animate-spin" /> : <Download size={16} />}
          {t("profile.downloadData")}
        </button>

        <div className="rounded-jz-card p-4" style={{ background: "rgba(196, 58, 47, 0.1)", border: `1px solid ${C.hanko}` }}>
          <div className="flex items-center gap-2 mb-1.5 font-bold text-sm" style={{ color: C.hanko }}>
            <AlertTriangle size={15} /> {t("profile.deleteAccount")}
          </div>
          <p className="text-xs leading-relaxed mb-3" style={{ color: C.hanko }}>{t("profile.deleteAccountWarning")}</p>
          <input
            type="email"
            value={deleteConfirmText}
            onChange={(e) => setDeleteConfirmText(e.target.value)}
            placeholder={t("profile.deleteConfirmPlaceholder")}
            autoCapitalize="none"
            className="w-full bg-jz-bg border rounded-xl px-3.5 py-2.5 text-xs text-jz-ink placeholder-jz-soft focus:outline-none mb-2.5"
            style={{ borderColor: C.hanko }}
          />
          {deleteError && <p className="text-xs font-medium mb-2" style={{ color: C.hanko }}>{deleteError}</p>}
          <button onClick={deleteAccount} disabled={!confirmMatches || deleting}
            className="w-full py-3 rounded-xl font-bold text-sm text-white disabled:opacity-40"
            style={{ background: C.hanko }}>
            {deleting ? <span className="inline-block w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> : t("profile.deleteAccountConfirmButton")}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 pt-4 pb-24">
      <div className="mb-6">
        <div className="text-jz-label font-bold uppercase tracking-wider text-jz-teal">{t("profile.account")}</div>
        <h1 className="mt-0.5 text-jz-screen font-semibold text-jz-ink">{t("nav.profile")}</h1>
      </div>

      <div className="flex flex-col items-center text-center mb-8">
        <div className="w-20 h-20 rounded-full flex items-center justify-center text-2xl font-bold mb-3" style={{ background: C.greenSoft, color: C.green, border: `1px solid ${C.line}` }}>
          {(name || userEmail)[0]?.toUpperCase() || "?"}
        </div>
        {editingName ? (
          <div className="flex items-center gap-2">
            <input autoFocus value={nameDraft} onChange={(e) => setNameDraft(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && saveName()}
              placeholder={t("settings.placeholderName")}
              className="text-jz-title font-bold text-center bg-transparent border-b focus:outline-none" style={{ color: C.ink, borderColor: C.green }} />
            <button onClick={saveName}><Check size={18} style={{ color: C.green }} /></button>
          </div>
        ) : (
          <button onClick={() => { setNameDraft(name); setEditingName(true); }} className="flex items-center gap-1.5">
            <span className="text-jz-title font-bold" style={{ ...display, color: C.ink }}>{name || t("settings.placeholderName")}</span>
            <Pencil size={13} style={{ color: C.sub }} />
          </button>
        )}
        <div className="text-jz-label mt-0.5" style={{ color: C.sub }}>{userEmail}</div>
      </div>

      <div className="text-jz-label font-bold uppercase tracking-wider mb-2" style={{ color: C.sub }}>{t("profile.preferences")}</div>
      <div className="space-y-2.5 mb-6">
        <Row icon={<Bell size={16} />} label={t("profile.notifications")} onClick={() => setScreen('notifications')} />
        <Row icon={<Globe size={16} />} label={t("settings.language")} value={SUPPORTED_LANGUAGES.find(l => l.code === language)?.label} onClick={() => setScreen('language')} />
        <Row icon={<Ruler size={16} />} label={t("profile.units")} value={unit === 'metric' ? t("profile.metric") : t("profile.imperial")} onClick={() => setScreen('units')} />
      </div>

      <div className="text-jz-label font-bold uppercase tracking-wider mb-2" style={{ color: C.sub }}>{t("profile.account")}</div>
      <div className="space-y-2.5">
        <Row icon={<Lock size={16} />} label={t("profile.privacyData")} onClick={() => setScreen('privacy')} />
        <Row icon={<DoorOpen size={16} />} label={t("settings.signOut")} onClick={handleSignOut} />
      </div>
    </div>
  );
}
