import './globals.css'

export const metadata = {
  title: 'M&C Society - Billetterie',
  description: 'Plateforme de gestion d\'événements et billetterie',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <body>
        {children}
      </body>
    </html>
  );
}
