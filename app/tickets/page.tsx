'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

interface Ticket {
  id: string;
  eventName: string;
  eventDate: string;
  venue: string;
  seatNumber?: string;
  price: number;
  status: 'pending' | 'paid' | 'cancelled' | 'used';
  orderId: string;
  qrCode?: string;
}

interface TicketStats {
  total: number;
  attended: number;
  pending: number;
  totalSpent: number;
}

export default function TicketsPage() {
  const router = useRouter();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [stats, setStats] = useState<TicketStats>({
    total: 0,
    attended: 0,
    pending: 0,
    totalSpent: 0,
  });
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showQrModal, setShowQrModal] = useState<string | null>(null);

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
        const ticketList = Array.isArray(data.data) ? data.data : [];
        setTickets(ticketList);
        
        // Calculer les statistiques
        const total = ticketList.length;
        const attended = ticketList.filter((t: Ticket) => t.status === 'used').length;
        const pending = ticketList.filter((t: Ticket) => t.status === 'pending' || t.status === 'paid').length;
        const totalSpent = ticketList.reduce((sum: number, t: Ticket) => sum + (t.price || 0), 0);
        
        setStats({ total, attended, pending, totalSpent });
      }
    } catch (error) {
      console.error('Erreur lors du chargement des billets:', error);
      toast.error('Impossible de charger les billets');
    } finally {
      setLoading(false);
    }
  };

  const handleShowQr = (ticketId: string) => {
    setShowQrModal(ticketId);
  };

  const handleDownloadPdf = async (ticketId: string) => {
    try {
      const response = await fetch(`/api/tickets/${ticketId}/pdf`, {
        credentials: 'include',
      });
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `ticket-${ticketId}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        toast.success('PDF téléchargé');
      } else {
        toast.error('Erreur lors du téléchargement du PDF');
      }
    } catch (error) {
      console.error('Erreur téléchargement PDF:', error);
      toast.error('Erreur lors du téléchargement du PDF');
    }
  };

  const handleSearch = () => {
    if (!searchQuery.trim()) {
      fetchTickets();
      return;
    }
    
    const filtered = tickets.filter(
      (t) =>
        t.orderId.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.eventName.toLowerCase().includes(searchQuery.toLowerCase())
    );
    setTickets(filtered);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return <span className="status-badge valid">✅ Valide</span>;
      case 'used':
        return <span className="status-badge" style={{ background: '#e2e8f0', color: '#4a5568' }}>✓ Utilisé</span>;
      case 'pending':
        return <span className="status-badge pending">⏳ En attente</span>;
      case 'cancelled':
        return <span className="status-badge" style={{ background: '#fed7d7', color: '#c53030' }}>❌ Annulé</span>;
      default:
        return <span className="status-badge">{status}</span>;
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '2rem' }}>
        <section className="card">
          <h1>🎫 Mes Billets</h1>
          <div style={{ marginTop: '2rem', textAlign: 'center' }}>
            <p>Chargement des billets...</p>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div>
      <section className="card">
        <h1>🎫 Mes Billets</h1>
        <p style={{ marginTop: '1rem', lineHeight: '1.6' }}>
          Gérez vos billets, téléchargez vos QR codes et suivez vos commandes.
        </p>
      </section>

      {tickets.length === 0 ? (
        <section className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          <h2>📭 Aucun billet</h2>
          <p style={{ marginTop: '1rem', color: '#666' }}>
            Vous n'avez pas encore de billets. Parcourez nos événements pour en acheter !
          </p>
          <button 
            className="btn btn-primary" 
            style={{ marginTop: '1.5rem' }}
            onClick={() => router.push('/events')}
          >
            🎉 Découvrir les événements
          </button>
        </section>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '1.5rem' }}>
          {tickets.map((ticket) => (
            <div key={ticket.id} className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h2>🎵 {ticket.eventName}</h2>
                {getStatusBadge(ticket.status)}
              </div>
              <div style={{ margin: '1rem 0' }}>
                <p><strong>Date:</strong> {new Date(ticket.eventDate).toLocaleDateString('fr-FR', { 
                  day: 'numeric', 
                  month: 'long', 
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}</p>
                <p><strong>Lieu:</strong> {ticket.venue || 'Non spécifié'}</p>
                {ticket.seatNumber && <p><strong>Place:</strong> {ticket.seatNumber}</p>}
                <p><strong>Prix payé:</strong> {ticket.price}€</p>
                <p><strong>Commande:</strong> #{ticket.orderId}</p>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                {ticket.status === 'paid' ? (
                  <>
                    <button 
                      className="btn btn-primary" 
                      style={{ flex: 1 }}
                      onClick={() => handleShowQr(ticket.id)}
                    >
                      📱 QR Code
                    </button>
                    <button 
                      className="btn btn-success" 
                      style={{ flex: 1 }}
                      onClick={() => handleDownloadPdf(ticket.id)}
                    >
                      📄 PDF
                    </button>
                  </>
                ) : (
                  <>
                    <button className="btn btn-secondary" disabled style={{ flex: 1 }}>
                      📱 QR Code (bientôt)
                    </button>
                    <button className="btn btn-secondary" disabled style={{ flex: 1 }}>
                      📄 PDF (bientôt)
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <section className="card">
        <h2>📊 Statistiques de mes billets</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem', marginTop: '1rem' }}>
          <div style={{ textAlign: 'center', padding: '1rem', background: '#f7fafc', borderRadius: '0.375rem' }}>
            <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#48bb78' }}>{stats.total}</div>
            <div style={{ fontSize: '0.875rem', color: '#4a5568' }}>Billets achetés</div>
          </div>
          <div style={{ textAlign: 'center', padding: '1rem', background: '#f7fafc', borderRadius: '0.375rem' }}>
            <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#4299e1' }}>{stats.attended}</div>
            <div style={{ fontSize: '0.875rem', color: '#4a5568' }}>Événements assistés</div>
          </div>
          <div style={{ textAlign: 'center', padding: '1rem', background: '#f7fafc', borderRadius: '0.375rem' }}>
            <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#ed8936' }}>{stats.pending}</div>
            <div style={{ fontSize: '0.875rem', color: '#4a5568' }}>En attente</div>
          </div>
          <div style={{ textAlign: 'center', padding: '1rem', background: '#f7fafc', borderRadius: '0.375rem' }}>
            <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#38b2ac' }}>{stats.totalSpent}€</div>
            <div style={{ fontSize: '0.875rem', color: '#4a5568' }}>Total dépensé</div>
          </div>
        </div>
      </section>

      <section className="card">
        <h2>🔍 Rechercher un billet</h2>
        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
          <input 
            type="text" 
            placeholder="Numéro de commande ou nom d'événement"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            style={{ 
              flex: 1, 
              padding: '0.75rem', 
              border: '1px solid #cbd5e0', 
              borderRadius: '0.25rem',
              fontSize: '1rem'
            }}
          />
          <button className="btn btn-primary" onClick={handleSearch}>
            🔍 Rechercher
          </button>
        </div>
      </section>

      {/* QR Code Modal */}
      {showQrModal && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
          onClick={() => setShowQrModal(null)}
        >
          <div 
            className="card"
            style={{ maxWidth: '400px', textAlign: 'center' }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2>📱 QR Code du billet</h2>
            <div style={{ 
              margin: '2rem auto', 
              width: '200px', 
              height: '200px', 
              background: '#f0f0f0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '0.5rem',
            }}>
              {/* Placeholder pour le QR code - à remplacer par une vraie génération */}
              <span style={{ fontSize: '4rem' }}>📲</span>
            </div>
            <p style={{ color: '#666', marginBottom: '1rem' }}>
              Présentez ce code à l'entrée de l'événement
            </p>
            <button 
              className="btn btn-primary"
              onClick={() => setShowQrModal(null)}
            >
              Fermer
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
