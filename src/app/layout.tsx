// Initialize QR code rotation service server-side
import '@/lib/qr-rotation-init';
import './globals.css';

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
    <html lang="fr" suppressHydrationWarning={true}>
      <body suppressHydrationWarning={true}>{children}</body>
    </html>
  );
}
