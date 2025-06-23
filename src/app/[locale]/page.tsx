export default function LocalePage({
  params,
}: {
  params: { locale: string }
}) {
  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          🎟️ M&C Society
        </h1>
        <p className="text-xl text-gray-600 mb-4">
          Plateforme de Billetterie
        </p>
        <div className="px-4 py-2 bg-blue-100 text-blue-800 rounded-lg">
          🌍 Langue : {params.locale}
        </div>
        <div className="mt-8 space-y-4">
          <div className="px-6 py-3 bg-green-600 text-white rounded-lg">
            ✅ Route Locale Fonctionnelle
          </div>
        </div>
      </div>
    </main>
  )
}