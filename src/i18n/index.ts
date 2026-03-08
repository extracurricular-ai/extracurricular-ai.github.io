import en from './en.json';
import zh from './zh.json';
import es from './es.json';
import fr from './fr.json';

export const locales = ['en', 'zh', 'es', 'fr'] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = 'en';

type TranslationKeys = typeof en;
const translations: Record<Locale, TranslationKeys> = { en, zh, es, fr };

export function t(locale: string, key: string, fallback?: string): string {
  const lang = (locales.includes(locale as Locale) ? locale : defaultLocale) as Locale;
  const [ns, k] = key.split('.') as [keyof TranslationKeys, string];
  const value = (translations[lang][ns] as Record<string, string>)?.[k];
  if (value !== undefined) return value;
  return ((en[ns] as Record<string, string>)?.[k]) ?? fallback ?? key;
}

export const localeNames: Record<Locale, string> = {
  en: 'English',
  zh: '中文',
  es: 'Español',
  fr: 'Français',
};

export function localizedPath(currentPath: string, targetLocale: Locale): string {
  const stripped = stripLocalePrefix(currentPath);
  return `/${targetLocale}${stripped === '/' ? '' : stripped}`;
}

function stripLocalePrefix(path: string): string {
  for (const loc of locales) {
    if (path === `/${loc}` || path.startsWith(`/${loc}/`)) {
      const s = path.slice(loc.length + 1);
      return s === '' ? '/' : s;
    }
  }
  return path;
}
