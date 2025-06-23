export default function HomePage() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          🎟️ M&C Society
        </h1>
        <p className="text-gray-600">
          Plateforme de billetterie événementielle
        </p>
        <div className="mt-8 space-x-4">
          <a href="/api/events" className="bg-blue-500 text-white px-4 py-2 rounded">
            Test API Events
          </a>
          <a href="/api/auth/register" className="bg-green-500 text-white px-4 py-2 rounded">
            Test API Auth
          </a>
        </div>
      </div>
    </div>
  );
}