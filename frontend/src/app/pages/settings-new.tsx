import { useEffect, useRef, useState } from 'react';
import { User as UserIcon, Globe, Sun, Moon, Check } from 'lucide-react';
import { apiFetch } from '../utils/api';
import { supabase } from '../utils/supabaseClient';
import { SUPPORTED_LANGUAGES, getLanguageChoice, setLanguageChoice } from '../utils/language';
import { getEffectiveTheme, setTheme, previewTheme, type ThemeChoice } from '../utils/theme';
import { useTranslation } from '../utils/translations';
import { C, display } from '../components/ui/jourzy-theme';

export default function SettingsPage() {
  const { t } = useTranslation();
  const [userId, setUserId] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [savedName, setSavedName] = useState('');
  const [language, setLanguage] = useState(getLanguageChoice());
  const [savedLanguage, setSavedLanguage] = useState(language);
  const [themeState, setThemeState] = useState<ThemeChoice>(getEffectiveTheme());
  const [savedTheme, setSavedTheme] = useState(themeState);

  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');

  useEffect(() => {
    const loadProfile = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      setUserId(session.user.id);
      try {
        const resp = await apiFetch('/api/memory');
        if (resp.ok) {
          const data = await resp.json();
          const existingName = data?.memory?.preferences?.userName || '';
          setName(existingName);
          setSavedName(existingName);
        }
      } catch (e) { console.error('Failed to load profile:', e); }
    };
    loadProfile();
  }, []);

  const savedThemeRef = useRef(savedTheme);
  useEffect(() => { savedThemeRef.current = savedTheme; }, [savedTheme]);
  useEffect(() => {
    return () => { previewTheme(savedThemeRef.current); };
  }, []);

  const isDirty = name.trim().slice(0, 40) !== savedName || language !== savedLanguage || themeState !== savedTheme;

  const handleThemeChange = (choice: ThemeChoice) => {
    previewTheme(choice);
    setThemeState(choice);
  };

  const saveAll = async () => {
    if (!isDirty || saveStatus === 'saving') return;
    setSaveStatus('saving');
    try {
      const trimmedName = name.trim().slice(0, 40);
      if (userId && trimmedName && trimmedName !== savedName) {
        const existingResp = await apiFetch('/api/memory');
        const existingPrefs = existingResp.ok ? (await existingResp.json())?.memory?.preferences || {} : {};
        await apiFetch('/api/memory', {
          method: 'POST',
          body: JSON.stringify({ preferences: { ...existingPrefs, userName: trimmedName } }),
        });
        setSavedName(trimmedName);
      }
      if (language !== savedLanguage) {
        setLanguageChoice(language);
        setSavedLanguage(language);
      }
      if (themeState !== savedTheme) {
        setTheme(themeState);
        setSavedTheme(themeState);
      }
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (e) {
      console.error('Failed to save settings:', e);
      setSaveStatus('idle');
    }
  };

  return (
    <div className="flex flex-col min-h-full px-4 pt-4">
      <div className="text-center mb-6">
        <h1 className="text-xl font-bold" style={{ color: C.ink }}>{t("settings.title")}</h1>
      </div>

      <div className="flex-1 space-y-6 pb-24">
        {/* Profile */}
        <section className="bg-white border border-[#E4E6E0] rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4 text-[#1B2333]">
            <UserIcon size={18} className="text-[#0E7A5F]" />
            <h2 className="font-bold text-sm">{t("settings.profile")}</h2>
          </div>
          <label className="block text-xs font-bold text-[#6B7280] uppercase tracking-wide mb-2">
            {t("settings.yourName")}
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t("settings.placeholderName")}
            disabled={!userId}
            className="w-full bg-[#F5F6F2] border border-[#E4E6E0] rounded-xl px-4 py-3 text-sm text-[#1B2333] placeholder-[#6B7280] focus:outline-none focus:border-[#0E7A5F] transition-all disabled:opacity-60"
          />
          {!userId && (
            <p className="text-xs text-[#6B7280] font-medium mt-2">{t("settings.signInPrompt")}</p>
          )}
        </section>

        {/* Language */}
        <section className="bg-white border border-[#E4E6E0] rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4 text-[#1B2333]">
            <Globe size={18} className="text-[#0E7A5F]" />
            <h2 className="font-bold text-sm">{t("settings.language")}</h2>
          </div>
          <p className="text-xs text-[#6B7280] font-medium mb-3">
            {t("settings.langDesc")}
          </p>
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className="w-full bg-[#F5F6F2] border border-[#E4E6E0] rounded-xl px-4 py-3 text-sm text-[#1B2333] focus:outline-none focus:border-[#0E7A5F] transition-all"
          >
            {SUPPORTED_LANGUAGES.map(l => (
              <option key={l.code} value={l.code}>{l.label}</option>
            ))}
          </select>
        </section>

        {/* Appearance */}
        <section className="bg-white border border-[#E4E6E0] rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4 text-[#1B2333]">
            {themeState === 'dark' ? <Moon size={18} className="text-[#0E7A5F]" /> : <Sun size={18} className="text-[#0E7A5F]" />}
            <h2 className="font-bold text-sm">{t("settings.appearance")}</h2>
          </div>
          <div className="flex gap-2.5">
            <button
              onClick={() => handleThemeChange('light')}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border text-sm font-bold transition-all ${themeState === 'light' ? 'border-[#0E7A5F] bg-[#E3F2EC] text-[#0E7A5F]' : 'border-[#E4E6E0] text-[#1B2333]'
                }`}
            >
              <Sun size={16} /> {t("settings.light")}
            </button>
            <button
              onClick={() => handleThemeChange('dark')}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border text-sm font-bold transition-all ${themeState === 'dark' ? 'border-[#0E7A5F] bg-[#E3F2EC] text-[#0E7A5F]' : 'border-[#E4E6E0] text-[#1B2333]'
                }`}
            >
              <Moon size={16} /> {t("settings.dark")}
            </button>
          </div>
        </section>
      </div>

      <div className="sticky bottom-0 w-full py-2 bg-gradient-to-t from-[#F5F6F2] via-[#F5F6F2] to-[#F5F6F2] pb-0 z-10">
        <button
          onClick={saveAll}
          disabled={!isDirty || saveStatus === 'saving'}
          className="w-full py-3.5 rounded-2xl bg-[#0E7A5F] text-white font-bold text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-40 shadow-lg"
        >
          {saveStatus === 'saving' ? (
            <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
          ) : saveStatus === 'saved' ? (
            <><Check size={16} /> {t("settings.saved")}</>
          ) : (
            t("settings.save")
          )}
        </button>
      </div>
    </div>
  );
}
