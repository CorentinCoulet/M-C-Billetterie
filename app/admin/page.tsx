export default function AdminPage() {
  return (
    <div>
      <section className="card">
        <h1>⚙️ Administration</h1>
        <p style={{ marginTop: '1rem', lineHeight: '1.6' }}>
          Dashboard administrateur pour gérer la sécurité, les événements et les statistiques.
        </p>
      </section>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
        <div className="card">
          <h2>🛡️ Sécurité WAF</h2>
          <div style={{ margin: '1rem 0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <span>Mode actuel:</span>
              <span className="status-badge premium">Premium</span>
            </div>
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                Changer de mode:
              </label>
              <select style={{ width: '100%', padding: '0.5rem', border: '1px solid #cbd5e0', borderRadius: '0.25rem' }}>
                <option value="premium">Premium (Recommandé)</option>
                <option value="free">Gratuit (Basique)</option>
              </select>
            </div>
            <button className="btn btn-primary" style={{ width: '100%', marginBottom: '0.5rem' }}>
              Appliquer les changements
            </button>
            <button className="btn btn-secondary" style={{ width: '100%' }}>
              📊 Voir les statistiques
            </button>
          </div>
        </div>

        <div className="card">
          <h2>📊 Statistiques Sécurité</h2>
          <div style={{ margin: '1rem 0' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '1rem' }}>
              <div style={{ textAlign: 'center', padding: '0.5rem', background: '#f7fafc', borderRadius: '0.25rem' }}>
                <div style={{ fontWeight: 'bold', color: '#e53e3e' }}>247</div>
                <div style={{ fontSize: '0.75rem' }}>Attaques bloquées</div>
              </div>
              <div style={{ textAlign: 'center', padding: '0.5rem', background: '#f7fafc', borderRadius: '0.25rem' }}>
                <div style={{ fontWeight: 'bold', color: '#48bb78' }}>99.8%</div>
                <div style={{ fontSize: '0.75rem' }}>Uptime</div>
              </div>
              <div style={{ textAlign: 'center', padding: '0.5rem', background: '#f7fafc', borderRadius: '0.25rem' }}>
                <div style={{ fontWeight: 'bold', color: '#4299e1' }}>18</div>
                <div style={{ fontSize: '0.75rem' }}>IPs bloquées</div>
              </div>
              <div style={{ textAlign: 'center', padding: '0.5rem', background: '#f7fafc', borderRadius: '0.25rem' }}>
                <div style={{ fontWeight: 'bold', color: '#ed8936' }}>0.1%</div>
                <div style={{ fontSize: '0.75rem' }}>Faux positifs</div>
              </div>
            </div>
            <button className="btn btn-success" style={{ width: '100%' }}>
              📈 Rapport détaillé
            </button>
          </div>
        </div>

        <div className="card">
          <h2>🎪 Gestion Événements</h2>
          <div style={{ margin: '1rem 0' }}>
            <div style={{ marginBottom: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span>Événements actifs:</span>
                <strong>12</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span>Billets vendus:</span>
                <strong>1,247</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span>Revenue total:</span>
                <strong>87,430€</strong>
              </div>
            </div>
            <button className="btn btn-primary" style={{ width: '100%', marginBottom: '0.5rem' }}>
              ➕ Nouvel événement
            </button>
            <button className="btn btn-secondary" style={{ width: '100%' }}>
              📋 Gérer les événements
            </button>
          </div>
        </div>

        <div className="card">
          <h2>👥 Utilisateurs</h2>
          <div style={{ margin: '1rem 0' }}>
            <div style={{ marginBottom: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span>Utilisateurs totaux:</span>
                <strong>2,847</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span>Actifs aujourd'hui:</span>
                <strong>156</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span>Nouvelles inscriptions:</span>
                <strong>23</strong>
              </div>
            </div>
            <button className="btn btn-secondary" style={{ width: '100%' }}>
              👥 Gérer les utilisateurs
            </button>
          </div>
        </div>

        <div className="card">
          <h2>💳 Paiements</h2>
          <div style={{ margin: '1rem 0' }}>
            <div style={{ marginBottom: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span>Revenue aujourd'hui:</span>
                <strong style={{ color: '#48bb78' }}>1,230€</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span>Transactions:</span>
                <strong>47</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span>Taux de réussite:</span>
                <strong style={{ color: '#48bb78' }}>98.7%</strong>
              </div>
            </div>
            <button className="btn btn-success" style={{ width: '100%' }}>
              💰 Rapports financiers
            </button>
          </div>
        </div>

        <div className="card">
          <h2>⚙️ Configuration</h2>
          <div style={{ margin: '1rem 0' }}>
            <div style={{ marginBottom: '1rem' }}>
              <div style={{ marginBottom: '0.5rem' }}>
                <input type="checkbox" id="maintenanceMode" style={{ marginRight: '0.5rem' }} />
                <label htmlFor="maintenanceMode">Mode maintenance</label>
              </div>
              <div style={{ marginBottom: '0.5rem' }}>
                <input type="checkbox" id="emailNotifs" defaultChecked style={{ marginRight: '0.5rem' }} />
                <label htmlFor="emailNotifs">Notifications email</label>
              </div>
              <div style={{ marginBottom: '0.5rem' }}>
                <input type="checkbox" id="autoBackup" defaultChecked style={{ marginRight: '0.5rem' }} />
                <label htmlFor="autoBackup">Sauvegardes automatiques</label>
              </div>
            </div>
            <button className="btn btn-primary" style={{ width: '100%', marginBottom: '0.5rem' }}>
              💾 Sauvegarder config
            </button>
            <button className="btn btn-danger" style={{ width: '100%' }}>
              🔧 Paramètres avancés
            </button>
          </div>
        </div>
      </div>

      <section className="card">
        <h2>📝 Actions Rapides</h2>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '1rem' }}>
          <button className="btn btn-primary">🔄 Redémarrer WAF</button>
          <button className="btn btn-success">📊 Exporter données</button>
          <button className="btn btn-warning">🔧 Maintenance DB</button>
          <button className="btn btn-secondary">📧 Test emails</button>
          <button className="btn btn-info">🔍 Audit sécurité</button>
          <button className="btn btn-danger">🚨 Rapport incident</button>
        </div>
      </section>

      <section className="card">
        <h2>🔗 API Endpoints Admin</h2>
        <div style={{ marginTop: '1rem', fontFamily: 'monospace', fontSize: '0.875rem' }}>
          <div style={{ marginBottom: '1rem' }}>
            <strong>Sécurité:</strong>
            <ul style={{ margin: '0.5rem 0', paddingLeft: '1rem' }}>
              <li><code>POST /api/admin/security/mode</code> - Changer mode WAF</li>
              <li><code>GET /api/admin/security/stats</code> - Statistiques</li>
              <li><code>GET /api/admin/security/config</code> - Configuration</li>
              <li><code>POST /api/admin/security/block-ip</code> - Bloquer IP</li>
            </ul>
          </div>
          <div style={{ padding: '0.75rem', background: '#f7fafc', borderRadius: '0.25rem', border: '1px solid #e2e8f0' }}>
            <strong>Authentification requise:</strong> Bearer Token dans l'en-tête Authorization
          </div>
        </div>
      </section>
    </div>
  )
}
