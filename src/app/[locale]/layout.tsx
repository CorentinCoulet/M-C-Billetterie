import { ReactNode } from 'react'

export default function LocaleLayout({
  children,
  params,
}: {
  children: ReactNode
  params: { locale: string }
}) {
  return (
    <html lang={params.locale} suppressHydrationWarning>
      <body suppressHydrationWarning>
        <div id="root">
          {children}
        </div>
      </body>
    </html>
  )
}