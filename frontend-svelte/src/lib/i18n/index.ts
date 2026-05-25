import { register, init, getLocaleFromNavigator } from 'svelte-i18n';

export function setupI18n() {
  register('en', () => import('../../locales/en.json'));
  register('hi', () => import('../../locales/hi.json'));
  register('mr', () => import('../../locales/mr.json'));

  const savedLocale =
    typeof window !== 'undefined' ? localStorage.getItem('locale') : null;

  init({
    fallbackLocale: 'en',
    initialLocale: savedLocale ?? getLocaleFromNavigator() ?? 'en',
  });
}

export const SUPPORTED_LOCALES = [
  { code: 'en', label: 'English' },
  { code: 'hi', label: 'हिन्दी' },
  { code: 'mr', label: 'मराठी' },
] as const;
