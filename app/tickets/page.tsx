export default function TicketsPage() {
  return (
    <div>
      <section className="card">
        <h1>🎫 Mes Billets</h1>
        <p style={{ marginTop: '1rem', lineHeight: '1.6' }}>
          Gérez vos billets, téléchargez vos QR codes et suivez vos commandes.
        </p>
      </section>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '1.5rem' }}>
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h2>🎵 Concert Jazz Festival</h2>
            <span className="status-badge valid">✅ Valide</span>
          </div>
          <div style={{ margin: '1rem 0' }}>
            <p><strong>Date:</strong> 15 Mars 2024 - 20h00</p>
            <p><strong>Lieu:</strong> Salle Pleyel, Paris</p>
            <p><strong>Place:</strong> Section A, Rangée 12, Siège 8</p>
            <p><strong>Prix payé:</strong> 65€</p>
            <p><strong>Commande:</strong> #TKT-2024-001</p>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button className="btn btn-primary" style={{ flex: 1 }}>
              📱 QR Code
            </button>
            <button className="btn btn-success" style={{ flex: 1 }}>
              📄 PDF
            </button>
          </div>
        </div>

        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h2>🎭 Théâtre - Hamlet</h2>
            <span className="status-badge pending">⏳ En attente</span>
          </div>
          <div style={{ margin: '1rem 0' }}>
            <p><strong>Date:</strong> 22 Mars 2024 - 19h30</p>
            <p><strong>Lieu:</strong> Comédie Française, Paris</p>
            <p><strong>Place:</strong> Orchestre, Rangée 8, Siège 15</p>
            <p><strong>Prix payé:</strong> 45€</p>
            <p><strong>Commande:</strong> #TKT-2024-002</p>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button className="btn btn-secondary" disabled style={{ flex: 1 }}>
              📱 QR Code (bientôt)
            </button>
            <button className="btn btn-secondary" disabled style={{ flex: 1 }}>
              📄 PDF (bientôt)
            </button>
          </div>
        </div>
      </div>

      <section className="card">
        <h2>📊 Statistiques de mes billets</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem', marginTop: '1rem' }}>
          <div style={{ textAlign: 'center', padding: '1rem', background: '#f7fafc', borderRadius: '0.375rem' }}>
            <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#48bb78' }}>12</div>
            <div style={{ fontSize: '0.875rem', color: '#4a5568' }}>Billets achetés</div>
          </div>
          <div style={{ textAlign: 'center', padding: '1rem', background: '#f7fafc', borderRadius: '0.375rem' }}>
            <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#4299e1' }}>8</div>
            <div style={{ fontSize: '0.875rem', color: '#4a5568' }}>Événements assistés</div>
          </div>
          <div style={{ textAlign: 'center', padding: '1rem', background: '#f7fafc', borderRadius: '0.375rem' }}>
            <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#ed8936' }}>2</div>
            <div style={{ fontSize: '0.875rem', color: '#4a5568' }}>En attente</div>
          </div>
          <div style={{ textAlign: 'center', padding: '1rem', background: '#f7fafc', borderRadius: '0.375rem' }}>
            <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#38b2ac' }}>580€</div>
            <div style={{ fontSize: '0.875rem', color: '#4a5568' }}>Total dépensé</div>
          </div>
        </div>
      </section>

      <section className="card">
        <h2>🔍 Rechercher un billet</h2>
        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
          <input 
            type="text" 
            placeholder="Numéro de commande (ex: TKT-2024-001)"
            style={{ 
              flex: 1, 
              padding: '0.75rem', 
              border: '1px solid #cbd5e0', 
              borderRadius: '0.25rem',
              fontSize: '1rem'
            }}
          />
          <button className="btn btn-primary">
            🔍 Rechercher
          </button>
        </div>
      </section>
    </div>
  )
}
