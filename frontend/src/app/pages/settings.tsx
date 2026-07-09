import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { ArrowLeft, User as UserIcon, Globe, Sun, Moon, Check } from 'lucide-react';
import { apiFetch } from '../utils/api';
import { supabase } from '../utils/supabaseClient';
import { SUPPORTED_LANGUAGES, getLanguageChoice, setLanguageChoice } from '../utils/language';
import { getEffectiveTheme, setTheme, previewTheme, type ThemeChoice } from '../utils/theme';

export default function Settings() {
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [savedName, setSavedName] = useState('');
  const [language, setLanguage] = useState(getLanguageChoice());
  const [savedLanguage, setSavedLanguage] = useState(language);
  const [theme, setThemeState] = useState<ThemeChoice>(getEffectiveTheme());
  const [savedTheme, setSavedTheme] = useState(theme);

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

  // Restore whatever was actually saved if the traveler navigates away
  // without hitting Save, so a Light/Dark preview never silently sticks.
  // Tracked via a ref (not a [savedTheme] dependency) so this cleanup only
  // ever fires on real unmount — depending on savedTheme directly would
  // also fire it right after a successful save, flickering back to the
  // pre-save theme for a frame.
  const savedThemeRef = useRef(savedTheme);
  useEffect(() => { savedThemeRef.current = savedTheme; }, [savedTheme]);
  useEffect(() => {
    return () => { previewTheme(savedThemeRef.current); };
  }, []);

  const isDirty = name.trim().slice(0, 40) !== savedName || language !== savedLanguage || theme !== savedTheme;

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
      if (theme !== savedTheme) {
        setTheme(theme);
        setSavedTheme(theme);
      }
      setSaveStatus('saved');
      // Brief confirmation so the traveler sees the save actually happened,
      // then return to wherever they came from instead of leaving them
      // stranded on Settings.
      setTimeout(() => navigate(-1), 700);
    } catch (e) {
      console.error('Failed to save settings:', e);
      setSaveStatus('idle');
    }
  };

  return (
    <div className="min-h-screen bg-jz-outerBg text-jz-ink flex items-center justify-center sm:p-4 selection:bg-jz-tealTint">
      <div className="relative w-full max-w-[430px] h-[100dvh] sm:h-[min(920px,94vh)] bg-jz-bg sm:rounded-[36px] overflow-hidden sm:border-[10px] sm:border-jz-ink sm:shadow-2xl flex flex-col">

        <header className="flex items-center gap-3 px-4 py-3.5 bg-jz-card border-b-[1.5px] border-jz-line shrink-0">
          <button
            onClick={() => navigate('/')}
            aria-label="Back"
            className="w-10 h-10 rounded-xl flex items-center justify-center text-jz-ink hover:bg-jz-mist transition-all shrink-0"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <p className="font-black text-jz-title tracking-tight text-jz-ink">Settings</p>
        </header>

        <main className="flex-1 overflow-y-auto p-4 space-y-6 pb-28 no-scrollbar">

          {/* Profile */}
          <section className="bg-jz-card border-[1.5px] border-jz-line rounded-jz-card p-5">
            <div className="flex items-center gap-2 mb-4">
              <UserIcon className="w-5 h-5 text-jz-teal" />
              <h2 className="font-black text-jz-body-big text-jz-ink">Profile</h2>
            </div>
            <label className="block text-jz-label font-extrabold text-jz-soft uppercase tracking-wide mb-2">
              Your name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="What should JourZy call you?"
              disabled={!userId}
              className="w-full bg-jz-bg border-2 border-jz-line rounded-jz-btn px-4 py-3 text-jz-body-big text-jz-ink placeholder-jz-soft/60 focus:outline-none focus:border-jz-teal transition-all disabled:opacity-60"
            />
            {!userId && (
              <p className="text-jz-label text-jz-soft font-semibold mt-2">Sign in to save your name across visits.</p>
            )}
          </section>

          {/* Language */}
          <section className="bg-jz-card border-[1.5px] border-jz-line rounded-jz-card p-5">
            <div className="flex items-center gap-2 mb-4">
              <Globe className="w-5 h-5 text-jz-teal" />
              <h2 className="font-black text-jz-body-big text-jz-ink">Language</h2>
            </div>
            <p className="text-jz-label text-jz-soft font-semibold mb-3">
              JourZy's replies and generated trip plans will use this language.
            </p>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="w-full bg-jz-bg border-2 border-jz-line rounded-jz-btn px-4 py-3 text-jz-body-big text-jz-ink focus:outline-none focus:border-jz-teal transition-all"
            >
              {SUPPORTED_LANGUAGES.map(l => (
                <option key={l.code} value={l.code}>{l.label}</option>
              ))}
            </select>
          </section>

          {/* Appearance */}
          <section className="bg-jz-card border-[1.5px] border-jz-line rounded-jz-card p-5">
            <div className="flex items-center gap-2 mb-4">
              {theme === 'dark' ? <Moon className="w-5 h-5 text-jz-teal" /> : <Sun className="w-5 h-5 text-jz-teal" />}
              <h2 className="font-black text-jz-body-big text-jz-ink">Appearance</h2>
            </div>
            <div className="flex gap-2.5">
              <button
                onClick={() => handleThemeChange('light')}
                className={`flex-1 flex items-center justify-center gap-2 min-h-jz-touch rounded-jz-btn border-2 font-extrabold text-jz-body-big transition-all ${theme === 'light' ? 'border-jz-teal bg-jz-tealTint text-jz-teal' : 'border-jz-line text-jz-ink'
                  }`}
              >
                <Sun className="w-4.5 h-4.5" /> Light
              </button>
              <button
                onClick={() => handleThemeChange('dark')}
                className={`flex-1 flex items-center justify-center gap-2 min-h-jz-touch rounded-jz-btn border-2 font-extrabold text-jz-body-big transition-all ${theme === 'dark' ? 'border-jz-teal bg-jz-tealTint text-jz-teal' : 'border-jz-line text-jz-ink'
                  }`}
              >
                <Moon className="w-4.5 h-4.5" /> Dark
              </button>
            </div>
          </section>

        </main>

        {/* Single save action for the whole page */}
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-jz-bg via-jz-bg to-transparent">
          <button
            onClick={saveAll}
            disabled={!isDirty || saveStatus === 'saving'}
            className="w-full min-h-jz-touch rounded-jz-btn bg-jz-teal text-white font-extrabold text-jz-body-big flex items-center justify-center gap-2 transition-all disabled:opacity-40 shadow-lg"
          >
            {saveStatus === 'saving' ? (
              <span className="w-4.5 h-4.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
            ) : saveStatus === 'saved' ? (
              <><Check className="w-5 h-5" /> Saved</>
            ) : (
              'Save'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
