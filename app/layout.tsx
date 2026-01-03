import type { Metadata } from 'next'
import { LayoutWithNavigation } from '../src/components/layout/LayoutWithNavigation'
import { Toaster } from '../src/components/ui/sonner'
import { AppProvider } from '../src/context/AppContext'
import './globals.css'

export const metadata: Metadata = {
  title: 'Billetterie - Sécurisée',
  description: 'Application de billetterie avec sécurité avancée',
  keywords: 'billetterie, tickets, events, sécurité',
  authors: [{ name: 'Billetterie Team' }],
  icons: {
    icon: '/logo4.webp',
    shortcut: '/logo4.webp',
    apple: '/logo4.webp',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <AppProvider>
          <LayoutWithNavigation>
            {children}
          </LayoutWithNavigation>
          <Toaster position="bottom-right" visibleToasts={4} expand={true} richColors />
        </AppProvider>
      </body>
    </html>
  )
}
