import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import Link from 'next/link';

export default function TicketsPage() {
  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 md:pt-6">
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Mes Tickets</h1>
          <p className="text-gray-600">
            Ici vous pourrez voir tous vos tickets achetés et leur statut.
          </p>
          <div className="mt-8 text-center">
            <div className="bg-gray-100 rounded-lg p-8">
              <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
              </svg>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Aucun ticket</h3>
              <p className="text-gray-500 mb-4">Vous n&#39;avez pas encore acheté de tickets</p>
              <Link
                href="/events"
                className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors"
              >
                Parcourir les événements
              </Link>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
