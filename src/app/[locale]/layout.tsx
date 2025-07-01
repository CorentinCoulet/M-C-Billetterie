import { CartSidebar } from '@/components/cart/CartSidebar';
import { Navigation } from '@/components/layout/Navigation';
import { CartProvider } from '@/contexts/CartContext';
import { ReactNode } from 'react';

export default function LocaleLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: { locale: string };
}) {
  return (
    <html lang={params.locale} suppressHydrationWarning>
      <body suppressHydrationWarning>
        <CartProvider>
          <div id="root">
            <Navigation />
            <main>
              {children}
            </main>
            <CartSidebar />
          </div>
        </CartProvider>
      </body>
    </html>
  );
}