import createMiddleware from 'next-intl/middleware';
import { NextRequest } from 'next/server';

const intlMiddleware = createMiddleware({
  // Locales supportées
  locales: ['en', 'fr'],

  // Locale par défaut
  defaultLocale: 'fr',

  // Stratégie de détection
  localeDetection: true,
});

export default function middleware(request: NextRequest) {
  // ✅ Appliquer le middleware i18n
  return intlMiddleware(request);
}

export const config = {
  // ✅ Matcher pour les routes internationalisées
  matcher: [
    // Matcher toutes les routes sauf les API et fichiers statiques
    '/((?!api|_next|_vercel|.*\\..*).*)',
    // Inclure la racine
    '/'
  ]
};
