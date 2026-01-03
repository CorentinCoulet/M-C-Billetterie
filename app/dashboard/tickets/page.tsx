'use client';

import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import Link from 'next/link';

interface Ticket {
  id: string;
  eventName?: string;
  eventDate?: string;
  venue?: string;
  seatNumber?: string;
  price?: number;
  status: string;
  orderId?: string;
  event?: {
    title: string;
    date: string;
    venue?: { name: string };
  };
}

export default function TicketsPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTickets();
  }, []);

  const fetchTickets = async () => {
    try {
      const response = await fetch('/api/tickets', {
        credentials: 'include',
      });
      const data = await response.json();

      if (data.success && data.data) {
        setTickets(Array.isArray(data.data) ? data.data : []);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des tickets:', error);
      toast.error('Impossible de charger les tickets');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      paid: 'bg-green-100 text-green-800',
      pending: 'bg-yellow-100 text-yellow-800',
      used: 'bg-gray-100 text-gray-800',
      cancelled: 'bg-red-100 text-red-800',
    };
    const labels: Record<string, string> = {
      paid: 'Payé',
      pending: 'En attente',
      used: 'Utilisé',
      cancelled: 'Annulé',
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status] || 'bg-gray-100 text-gray-800'}`}>
        {labels[status] || status}
      </span>
    );
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 md:pt-6">
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="animate-pulse space-y-4">
              <div className="h-8 bg-gray-200 rounded w-1/4"></div>
              <div className="h-32 bg-gray-200 rounded"></div>
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 md:pt-6">
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Mes Tickets</h1>
          <p className="text-gray-600 mb-6">
            Gérez vos tickets achetés et consultez leur statut.
          </p>

          {tickets.length === 0 ? (
            <div className="mt-8 text-center">
              <div className="bg-gray-100 rounded-lg p-8">
                <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
                </svg>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Aucun ticket</h3>
                <p className="text-gray-500 mb-4">Vous n'avez pas encore acheté de tickets</p>
                <Link
                  href="/events"
                  className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors"
                >
                  Parcourir les événements
                </Link>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Événement
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Lieu
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Statut
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {tickets.map((ticket) => (
                    <tr key={ticket.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {ticket.event?.title || ticket.eventName || 'Événement'}
                        </div>
                        {ticket.seatNumber && (
                          <div className="text-xs text-gray-500">Place: {ticket.seatNumber}</div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {ticket.event?.date || ticket.eventDate
                          ? new Date(ticket.event?.date || ticket.eventDate!).toLocaleDateString('fr-FR', {
                              day: 'numeric',
                              month: 'long',
                              year: 'numeric',
                            })
                          : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {ticket.event?.venue?.name || ticket.venue || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(ticket.status)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {ticket.status === 'paid' && (
                          <div className="flex space-x-2">
                            <button
                              onClick={() => toast.info('QR Code: fonctionnalité à venir')}
                              className="text-blue-600 hover:text-blue-800"
                            >
                              📱 QR
                            </button>
                            <button
                              onClick={() => toast.info('Téléchargement PDF à venir')}
                              className="text-green-600 hover:text-green-800"
                            >
                              📄 PDF
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
