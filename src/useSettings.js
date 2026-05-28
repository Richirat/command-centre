import { useEffect, useState } from 'react';

// -----------------------------------------------------------------------------
// useSettings
// -----------------------------------------------------------------------------
// Single source of truth for all user-configurable settings on the dashboard.
//
// • Persists to localStorage under STORAGE_KEY.
// • Applies the `dark` class to <html> based on settings.theme, including
//   live updates when system preference changes (theme === 'system').
// • Exposes { settings, updateSetting, resetSettings } — designed to be hoisted
//   into <App /> once and threaded into the settings panel + consumers.
//
// Adding a new setting:
//   1. Add a key + default to DEFAULT_SETTINGS.
//   2. Read it via the settings object returned by the hook.
//   3. Write it via updateSetting('key', value).
// -----------------------------------------------------------------------------

const STORAGE_KEY = 'command-centre-settings';

export const DEFAULT_SETTINGS = {
  theme: 'dark',                // 'light' | 'dark' | 'system' (light/system enabled once Light styles land)
  accent: 'indigo',             // 'indigo' | 'teal' | 'amber' | 'rose'
  density: 'comfortable',       // 'comfortable' | 'compact' | 'focus'
  landingTab: 'overview',       // 'overview' | '🔬 PhD' | '💼 P1 Freelance' | ...
  autoRefresh: false,
  autoRefreshMinutes: 15,       // 5 | 15 | 30 | 60
  hideCompleted: false,
  currency: 'GBP',              // 'GBP' | 'EUR' | 'USD'
  numberLocale: 'en-GB',        // BCP-47 locale used by Intl.NumberFormat
};

function loadSettings() {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw);
    // Merge so newly added keys pick up their defaults on upgrade.
    return { ...DEFAULT_SETTINGS, ...parsed };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

function applyTheme(theme) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  const effective =
    theme === 'system'
      ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
      : theme;
  root.classList.toggle('dark', effective === 'dark');
}

export default function useSettings() {
  const [settings, setSettings] = useState(loadSettings);

  // Persist any change.
  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch {
      /* quota or privacy mode — silently ignore */
    }
  }, [settings]);

  // Apply theme class to <html>; if 'system', also listen for OS changes.
  useEffect(() => {
    applyTheme(settings.theme);
    if (settings.theme !== 'system' || typeof window === 'undefined') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => applyTheme('system');
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [settings.theme]);

  // Apply accent palette via [data-accent] on <html> — CSS variables in
  // index.css define the colour for each palette.
  useEffect(() => {
    if (typeof document === 'undefined') return;
    document.documentElement.dataset.accent = settings.accent;
  }, [settings.accent]);

  const updateSetting = (key, value) =>
    setSettings(prev => ({ ...prev, [key]: value }));

  const resetSettings = () => setSettings(DEFAULT_SETTINGS);

  return { settings, updateSetting, resetSettings };
}
