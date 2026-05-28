import React from 'react';
import { X, Sun, Moon, Monitor } from 'lucide-react';

// -----------------------------------------------------------------------------
// SettingsPanel
// -----------------------------------------------------------------------------
// Right-side slide-over panel matching the existing Card aesthetic
// (rounded borders, zinc colour ramp, font-display headings, tracking-widest
// label kickers). Pure presentation: all state lives in useSettings().
//
// In this commit (UI shell), every control persists to localStorage but the
// effects across the dashboard are wired up in subsequent commits. The Theme
// `Light` and `System` options are intentionally disabled until the Light
// styling pass lands.
// -----------------------------------------------------------------------------

const ACCENTS = [
  { id: 'indigo', label: 'Indigo', color: '#6366f1' },
  { id: 'teal',   label: 'Teal',   color: '#14b8a6' },
  { id: 'amber',  label: 'Amber',  color: '#f59e0b' },
  { id: 'rose',   label: 'Rose',   color: '#f43f5e' },
];

const DENSITY_OPTIONS = [
  { id: 'comfortable', label: 'Comfortable', desc: 'Default cards' },
  { id: 'compact',     label: 'Compact',     desc: 'Denser rows' },
  { id: 'focus',       label: 'Focus',       desc: 'Queue + calendar only' },
];

const REFRESH_INTERVALS = [5, 15, 30, 60];

const CURRENCIES = [
  { id: 'GBP', symbol: '£' },
  { id: 'EUR', symbol: '€' },
  { id: 'USD', symbol: '$' },
];

const LOCALES = [
  { id: 'en-GB', label: 'en-GB · 1,234.56' },
  { id: 'en-US', label: 'en-US · 1,234.56' },
  { id: 'de-DE', label: 'de-DE · 1.234,56' },
  { id: 'fr-FR', label: 'fr-FR · 1 234,56' },
];

const LANDING_TABS = [
  { id: 'overview',        label: 'Overview' },
  { id: '🔬 PhD',          label: 'PhD' },
  { id: '💼 P1 Freelance', label: 'Freelance' },
  { id: '🖨️ P2 STL',      label: 'STL' },
  { id: '🛍️ P3 POD',      label: 'POD' },
  { id: '⚙️ Admin',        label: 'Admin' },
];

// -----------------------------------------------------------------------------
// Primitive bits (kept local — match existing card aesthetic).
// -----------------------------------------------------------------------------

const Field = ({ label, children, hint }) => (
  <div className="mb-5">
    <div className="text-[10px] uppercase tracking-[0.18em] text-zinc-500 font-medium mb-2">{label}</div>
    {children}
    {hint && <div className="text-[10px] text-zinc-400 dark:text-zinc-600 mt-1.5 italic">{hint}</div>}
  </div>
);

const Pill = ({ active, disabled, onClick, accent, children }) => (
  <button
    type="button"
    onClick={disabled ? undefined : onClick}
    disabled={disabled}
    className={`px-3 py-1.5 rounded text-xs font-medium border transition-colors ${
      active
        ? 'bg-zinc-200/80 dark:bg-zinc-800/80 border-zinc-400 dark:border-zinc-600 text-zinc-900 dark:text-zinc-100'
        : 'bg-zinc-50/40 dark:bg-zinc-950/40 border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:border-zinc-300 dark:hover:border-zinc-700 hover:text-zinc-800 dark:hover:text-zinc-200'
    } ${disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
    style={active && accent ? { borderColor: accent, color: accent } : undefined}
  >
    {children}
  </button>
);

const Toggle = ({ on, onChange }) => (
  <button
    type="button"
    onClick={() => onChange(!on)}
    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
      on ? 'bg-emerald-500/80' : 'bg-zinc-300 dark:bg-zinc-700'
    }`}
    aria-pressed={on}
  >
    <span
      className={`inline-block h-4 w-4 rounded-full bg-zinc-900 dark:bg-zinc-100 transition-transform ${
        on ? 'translate-x-4' : 'translate-x-0.5'
      }`}
    />
  </button>
);

const SelectInput = ({ value, onChange, children }) => (
  <select
    value={value}
    onChange={(e) => onChange(e.target.value)}
    className="w-full bg-zinc-50/40 dark:bg-zinc-950/40 border border-zinc-200 dark:border-zinc-800 rounded px-3 py-2 text-xs text-zinc-800 dark:text-zinc-200 focus:outline-none focus:border-zinc-400 dark:focus:border-zinc-600 transition-colors"
  >
    {children}
  </select>
);

// -----------------------------------------------------------------------------
// Panel
// -----------------------------------------------------------------------------

export default function SettingsPanel({ open, onClose, settings, updateSetting, resetSettings }) {
  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <aside
        className="fixed top-0 right-0 bottom-0 w-full max-w-sm bg-zinc-50 dark:bg-zinc-950 border-l border-zinc-200/80 dark:border-zinc-800/80 z-50 flex flex-col shadow-2xl"
        role="dialog"
        aria-label="Settings"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-200/80 dark:border-zinc-800/80">
          <div>
            <h2 className="font-display text-xl text-zinc-900 dark:text-zinc-100 leading-none">Settings</h2>
            <div className="text-[10px] uppercase tracking-[0.2em] text-zinc-500 font-mono mt-1">stored locally</div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded border border-zinc-300 dark:border-zinc-700 hover:border-zinc-500 text-zinc-600 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 transition-colors"
            aria-label="Close settings"
          >
            <X size={14} />
          </button>
        </div>

        {/* Body — scrollable */}
        <div className="flex-1 overflow-y-auto px-5 py-5">
          {/* Theme */}
          <Field label="Theme" hint="System follows your OS preference.">
            <div className="flex gap-2">
              <Pill
                active={settings.theme === 'light'}
                onClick={() => updateSetting('theme', 'light')}
              >
                <Sun size={11} className="inline mr-1 -mt-0.5" /> Light
              </Pill>
              <Pill
                active={settings.theme === 'dark'}
                onClick={() => updateSetting('theme', 'dark')}
              >
                <Moon size={11} className="inline mr-1 -mt-0.5" /> Dark
              </Pill>
              <Pill
                active={settings.theme === 'system'}
                onClick={() => updateSetting('theme', 'system')}
              >
                <Monitor size={11} className="inline mr-1 -mt-0.5" /> System
              </Pill>
            </div>
          </Field>

          {/* Accent palette */}
          <Field label="Accent palette">
            <div className="flex gap-2 flex-wrap">
              {ACCENTS.map((a) => (
                <Pill
                  key={a.id}
                  active={settings.accent === a.id}
                  accent={a.color}
                  onClick={() => updateSetting('accent', a.id)}
                >
                  <span
                    className="inline-block w-2 h-2 rounded-full mr-1.5 align-middle"
                    style={{ background: a.color }}
                  />
                  {a.label}
                </Pill>
              ))}
            </div>
          </Field>

          {/* Layout density */}
          <Field label="Layout density">
            <div className="grid grid-cols-3 gap-2">
              {DENSITY_OPTIONS.map((d) => {
                const active = settings.density === d.id;
                return (
                  <button
                    key={d.id}
                    onClick={() => updateSetting('density', d.id)}
                    className={`rounded border p-2.5 text-left transition-colors ${
                      active
                        ? 'border-zinc-500 bg-zinc-200/40 dark:bg-zinc-800/40'
                        : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 bg-zinc-50/30 dark:bg-zinc-950/30'
                    }`}
                  >
                    <div className="text-[11px] text-zinc-900 dark:text-zinc-100 font-medium">{d.label}</div>
                    <div className="text-[9px] text-zinc-500 mt-0.5">{d.desc}</div>
                  </button>
                );
              })}
            </div>
          </Field>

          {/* Default landing tab */}
          <Field label="Default landing tab" hint="Which tab opens when the page loads.">
            <SelectInput
              value={settings.landingTab}
              onChange={(v) => updateSetting('landingTab', v)}
            >
              {LANDING_TABS.map((t) => (
                <option key={t.id} value={t.id}>{t.label}</option>
              ))}
            </SelectInput>
          </Field>

          {/* Auto-refresh */}
          <Field label="Auto-refresh">
            <div className="flex items-center justify-between">
              <span className="text-xs text-zinc-700 dark:text-zinc-300">Re-fetch data.json automatically</span>
              <Toggle
                on={settings.autoRefresh}
                onChange={(v) => updateSetting('autoRefresh', v)}
              />
            </div>
            {settings.autoRefresh && (
              <div className="mt-3 flex gap-2 flex-wrap">
                {REFRESH_INTERVALS.map((m) => (
                  <Pill
                    key={m}
                    active={settings.autoRefreshMinutes === m}
                    onClick={() => updateSetting('autoRefreshMinutes', m)}
                  >
                    {m} min
                  </Pill>
                ))}
              </div>
            )}
          </Field>

          {/* Hide completed */}
          <Field label="Completed tasks">
            <div className="flex items-center justify-between">
              <span className="text-xs text-zinc-700 dark:text-zinc-300">Hide tasks marked Done</span>
              <Toggle
                on={settings.hideCompleted}
                onChange={(v) => updateSetting('hideCompleted', v)}
              />
            </div>
          </Field>

          {/* Currency */}
          <Field label="Currency & number format">
            <div className="flex gap-2 mb-2 flex-wrap">
              {CURRENCIES.map((c) => (
                <Pill
                  key={c.id}
                  active={settings.currency === c.id}
                  onClick={() => updateSetting('currency', c.id)}
                >
                  <span className="font-mono mr-1">{c.symbol}</span>{c.id}
                </Pill>
              ))}
            </div>
            <SelectInput
              value={settings.numberLocale}
              onChange={(v) => updateSetting('numberLocale', v)}
            >
              {LOCALES.map((l) => (
                <option key={l.id} value={l.id}>{l.label}</option>
              ))}
            </SelectInput>
          </Field>
        </div>

        {/* Footer */}
        <div className="border-t border-zinc-200/80 dark:border-zinc-800/80 px-5 py-3 flex items-center justify-between">
          <button
            onClick={resetSettings}
            className="text-[11px] text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors uppercase tracking-widest font-medium"
          >
            Reset defaults
          </button>
          <span className="text-[10px] text-zinc-400 dark:text-zinc-600 font-mono">v1</span>
        </div>
      </aside>
    </>
  );
}
