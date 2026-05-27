import { addMessages, init, getLocaleFromNavigator, locale } from 'svelte-i18n';
import en from '../../../locales/en.json';
import hi from '../../../locales/hi.json';
import mr from '../../../locales/mr.json';

// Bundle all locale messages at compile time — no HTTP fetch, works in SSR.
addMessages('en', en);
addMessages('hi', hi);
addMessages('mr', mr);

let _initialized = false;

export function setupI18n() {
  if (_initialized) return;
  _initialized = true;
  // Always init with 'en' — same value on server and client avoids hydration mismatch.
  init({ fallbackLocale: 'en', initialLocale: 'en' });
}

export function applyClientLocale() {
  if (typeof window === 'undefined') return;
  const saved = localStorage.getItem('locale');
  const nav = getLocaleFromNavigator();
  const preferred = saved ?? nav?.split('-')[0] ?? 'en';
  if (preferred !== 'en') locale.set(preferred);
}

export const SUPPORTED_LOCALES = [
  { code: 'en', label: 'English' },
  { code: 'hi', label: 'हिन्दी' },
  { code: 'mr', label: 'मराठी' },
] as const;
