import { NextIntlClientProvider } from 'next-intl';
import { notFound } from 'next/navigation';

interface LocaleLayoutProps {
  children: React.ReactNode;
  params: Promise<{ locale: string }>; // ✅ Promise dans Next.js 15
}

const locales = ['en', 'fr']; // Définir vos locales supportées

export default async function LocaleLayout({ 
  children, 
  params 
}: LocaleLayoutProps) {
  // ✅ Await params avant utilisation
  const { locale } = await params;

  // Validation de la locale
  if (!locales.includes(locale)) {
    notFound();
  }

  let messages;
  try {
    // ✅ Import dynamique sécurisé
    messages = (await import(`../../locales/${locale}/common.json`)).default;
  } catch (error) {
    // Fallback vers 'en' si fichier manquant
    messages = (await import(`../../locales/en/common.json`)).default;
  }

  return (
    <html lang={locale} suppressHydrationWarning>
      <body>
        <NextIntlClientProvider messages={messages} locale={locale}>
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}

// ✅ Générer les segments statiques
export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}
