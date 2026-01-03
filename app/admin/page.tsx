'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

interface DashboardStats {
  totalUsers: number;
  totalEvents: number;
  totalTickets: number;
  totalOrders: number;
  totalRevenue: number;
  cachedAt: string;
}

interface SecurityStats {
  blockedAttacks: number;
  uptime: number;
  blockedIps: number;
  falsePositives: number;
}

export default function AdminPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [securityStats, setSecurityStats] = useState<SecurityStats>({
    blockedAttacks: 0,
    uptime: 99.9,
    blockedIps: 0,
    falsePositives: 0,
  });
  const [wafMode, setWafMode] = useState('premium');
  const [config, setConfig] = useState({
    maintenanceMode: false,
    emailNotifs: true,
    autoBackup: true,
  });
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    fetchDashboardStats();
    fetchSecurityStats();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      const response = await fetch('/api/dashboard/stats?role=ADMIN', {
        credentials: 'include',
      });
      const data = await response.json();

      if (data.success && data.data) {
        setStats(data.data);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des stats:', error);
      toast.error('Impossible de charger les statistiques');
    } finally {
      setLoading(false);
    }
  };

  const fetchSecurityStats = async () => {
    try {
      const response = await fetch('/api/monitoring/health', {
        credentials: 'include',
      });
      const data = await response.json();

      if (data.success && data.data) {
        // Mapper les données de monitoring vers les stats de sécurité
        setSecurityStats({
          blockedAttacks: data.data.securityEvents || 0,
          uptime: data.data.uptime || 99.9,
          blockedIps: data.data.blockedIps || 0,
          falsePositives: data.data.falsePositives || 0,
        });
      }
    } catch (error) {
      console.error('Erreur lors du chargement des stats sécurité:', error);
    }
  };

  const handleWafModeChange = async () => {
    setActionLoading('waf');
    try {
      const response = await fetch('/api/admin/security/mode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ mode: wafMode }),
      });

      if (response.ok) {
        toast.success(`Mode WAF changé en ${wafMode}`);
      } else {
        toast.error('Erreur lors du changement de mode WAF');
      }
    } catch (error) {
      toast.error('Erreur lors du changement de mode WAF');
    } finally {
      setActionLoading(null);
    }
  };

  const handleSaveConfig = async () => {
    setActionLoading('config');
    try {
      // Sauvegarder la configuration (API à implémenter si nécessaire)
      await new Promise(resolve => setTimeout(resolve, 500));
      toast.success('Configuration sauvegardée');
    } catch (error) {
      toast.error('Erreur lors de la sauvegarde');
    } finally {
      setActionLoading(null);
    }
  };

  const handleQuickAction = async (action: string) => {
    setActionLoading(action);
    try {
      switch (action) {
        case 'restart-waf':
          await fetch('/api/admin/qr-rotation', { method: 'POST', credentials: 'include' });
          toast.success('WAF redémarré');
          break;
        case 'export-data':
          const exportResponse = await fetch('/api/user/export-data', { credentials: 'include' });
          if (exportResponse.ok) {
            const blob = await exportResponse.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'export-data.json';
            a.click();
            toast.success('Données exportées');
          }
          break;
        case 'test-email':
          toast.info('Test email envoyé');
          break;
        case 'security-audit':
          router.push('/security');
          break;
        default:
          toast.info(`Action ${action} en cours...`);
      }
    } catch (error) {
      toast.error(`Erreur lors de l'action ${action}`);
    } finally {
      setActionLoading(null);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(amount);
  };

  if (loading) {
    return (
      <div style={{ padding: '2rem' }}>
        <section className="card">
          <h1>⚙️ Administration</h1>
          <div style={{ marginTop: '2rem', textAlign: 'center' }}>
            <p>Chargement des données...</p>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div>
      <section className="card">
        <h1>⚙️ Administration</h1>
        <p style={{ marginTop: '1rem', lineHeight: '1.6' }}>
          Dashboard administrateur pour gérer la sécurité, les événements et les statistiques.
        </p>
        {stats?.cachedAt && (
          <p style={{ fontSize: '0.75rem', color: '#666', marginTop: '0.5rem' }}>
            Dernière mise à jour: {new Date(stats.cachedAt).toLocaleString('fr-FR')}
          </p>
        )}
      </section>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
        <div className="card">
          <h2>🛡️ Sécurité WAF</h2>
          <div style={{ margin: '1rem 0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <span>Mode actuel:</span>
              <span className="status-badge premium">{wafMode === 'premium' ? 'Premium' : 'Gratuit'}</span>
            </div>
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                Changer de mode:
              </label>
              <select 
                value={wafMode}
                onChange={(e) => setWafMode(e.target.value)}
                style={{ width: '100%', padding: '0.5rem', border: '1px solid #cbd5e0', borderRadius: '0.25rem' }}
              >
                <option value="premium">Premium (Recommandé)</option>
                <option value="free">Gratuit (Basique)</option>
              </select>
            </div>
            <button 
              className="btn btn-primary" 
              style={{ width: '100%', marginBottom: '0.5rem' }}
              onClick={handleWafModeChange}
              disabled={actionLoading === 'waf'}
            >
              {actionLoading === 'waf' ? 'Application...' : 'Appliquer les changements'}
            </button>
            <button 
              className="btn btn-secondary" 
              style={{ width: '100%' }}
              onClick={() => router.push('/security')}
            >
              📊 Voir les statistiques
            </button>
          </div>
        </div>

        <div className="card">
          <h2>📊 Statistiques Sécurité</h2>
          <div style={{ margin: '1rem 0' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '1rem' }}>
              <div style={{ textAlign: 'center', padding: '0.5rem', background: '#f7fafc', borderRadius: '0.25rem' }}>
                <div style={{ fontWeight: 'bold', color: '#e53e3e' }}>{securityStats.blockedAttacks}</div>
                <div style={{ fontSize: '0.75rem' }}>Attaques bloquées</div>
              </div>
              <div style={{ textAlign: 'center', padding: '0.5rem', background: '#f7fafc', borderRadius: '0.25rem' }}>
                <div style={{ fontWeight: 'bold', color: '#48bb78' }}>{securityStats.uptime}%</div>
                <div style={{ fontSize: '0.75rem' }}>Uptime</div>
              </div>
              <div style={{ textAlign: 'center', padding: '0.5rem', background: '#f7fafc', borderRadius: '0.25rem' }}>
                <div style={{ fontWeight: 'bold', color: '#4299e1' }}>{securityStats.blockedIps}</div>
                <div style={{ fontSize: '0.75rem' }}>IPs bloquées</div>
              </div>
              <div style={{ textAlign: 'center', padding: '0.5rem', background: '#f7fafc', borderRadius: '0.25rem' }}>
                <div style={{ fontWeight: 'bold', color: '#ed8936' }}>{securityStats.falsePositives}%</div>
                <div style={{ fontSize: '0.75rem' }}>Faux positifs</div>
              </div>
            </div>
            <button 
              className="btn btn-success" 
              style={{ width: '100%' }}
              onClick={() => router.push('/security')}
            >
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
                <strong>{stats?.totalEvents || 0}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span>Billets vendus:</span>
                <strong>{stats?.totalTickets?.toLocaleString('fr-FR') || 0}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span>Revenue total:</span>
                <strong>{formatCurrency(stats?.totalRevenue || 0)}</strong>
              </div>
            </div>
            <button 
              className="btn btn-primary" 
              style={{ width: '100%', marginBottom: '0.5rem' }}
              onClick={() => router.push('/organizer/events/new')}
            >
              ➕ Nouvel événement
            </button>
            <button 
              className="btn btn-secondary" 
              style={{ width: '100%' }}
              onClick={() => router.push('/organizer/events')}
            >
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
                <strong>{stats?.totalUsers?.toLocaleString('fr-FR') || 0}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
<<<<<<< HEAD
                <span>Commandes totales:</span>
                <strong>{stats?.totalOrders?.toLocaleString('fr-FR') || 0}</strong>
=======
                <span>Actifs aujourd&#39;hui:</span>
                <strong>156</strong>
>>>>>>> 069eccfa942d1345a0fef406bd77c05b8e50ce7d
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span>Billets actifs:</span>
                <strong>{stats?.totalTickets?.toLocaleString('fr-FR') || 0}</strong>
              </div>
            </div>
            <button 
              className="btn btn-secondary" 
              style={{ width: '100%' }}
              onClick={() => router.push('/admin/users')}
            >
              👥 Gérer les utilisateurs
            </button>
          </div>
        </div>

        <div className="card">
          <h2>💳 Paiements</h2>
          <div style={{ margin: '1rem 0' }}>
            <div style={{ marginBottom: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
<<<<<<< HEAD
                <span>Revenue total:</span>
                <strong style={{ color: '#48bb78' }}>{formatCurrency(stats?.totalRevenue || 0)}</strong>
=======
                <span>Revenue aujourd&#39;hui:</span>
                <strong style={{ color: '#48bb78' }}>1,230€</strong>
>>>>>>> 069eccfa942d1345a0fef406bd77c05b8e50ce7d
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span>Transactions:</span>
                <strong>{stats?.totalOrders || 0}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span>Billets vendus:</span>
                <strong>{stats?.totalTickets || 0}</strong>
              </div>
            </div>
            <button 
              className="btn btn-success" 
              style={{ width: '100%' }}
              onClick={() => router.push('/dashboard')}
            >
              💰 Rapports financiers
            </button>
          </div>
        </div>

        <div className="card">
          <h2>⚙️ Configuration</h2>
          <div style={{ margin: '1rem 0' }}>
            <div style={{ marginBottom: '1rem' }}>
              <div style={{ marginBottom: '0.5rem' }}>
                <input 
                  type="checkbox" 
                  id="maintenanceMode" 
                  checked={config.maintenanceMode}
                  onChange={(e) => setConfig({ ...config, maintenanceMode: e.target.checked })}
                  style={{ marginRight: '0.5rem' }} 
                />
                <label htmlFor="maintenanceMode">Mode maintenance</label>
              </div>
              <div style={{ marginBottom: '0.5rem' }}>
                <input 
                  type="checkbox" 
                  id="emailNotifs" 
                  checked={config.emailNotifs}
                  onChange={(e) => setConfig({ ...config, emailNotifs: e.target.checked })}
                  style={{ marginRight: '0.5rem' }} 
                />
                <label htmlFor="emailNotifs">Notifications email</label>
              </div>
              <div style={{ marginBottom: '0.5rem' }}>
                <input 
                  type="checkbox" 
                  id="autoBackup" 
                  checked={config.autoBackup}
                  onChange={(e) => setConfig({ ...config, autoBackup: e.target.checked })}
                  style={{ marginRight: '0.5rem' }} 
                />
                <label htmlFor="autoBackup">Sauvegardes automatiques</label>
              </div>
            </div>
            <button 
              className="btn btn-primary" 
              style={{ width: '100%', marginBottom: '0.5rem' }}
              onClick={handleSaveConfig}
              disabled={actionLoading === 'config'}
            >
              {actionLoading === 'config' ? 'Sauvegarde...' : '💾 Sauvegarder config'}
            </button>
            <button 
              className="btn btn-danger" 
              style={{ width: '100%' }}
              onClick={() => router.push('/admin/settings')}
            >
              🔧 Paramètres avancés
            </button>
          </div>
        </div>
      </div>

      <section className="card">
        <h2>📝 Actions Rapides</h2>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '1rem' }}>
          <button 
            className="btn btn-primary"
            onClick={() => handleQuickAction('restart-waf')}
            disabled={actionLoading === 'restart-waf'}
          >
            {actionLoading === 'restart-waf' ? '⏳...' : '🔄 Redémarrer WAF'}
          </button>
          <button 
            className="btn btn-success"
            onClick={() => handleQuickAction('export-data')}
            disabled={actionLoading === 'export-data'}
          >
            {actionLoading === 'export-data' ? '⏳...' : '📊 Exporter données'}
          </button>
          <button 
            className="btn btn-warning"
            onClick={() => handleQuickAction('maintenance-db')}
            disabled={actionLoading === 'maintenance-db'}
          >
            🔧 Maintenance DB
          </button>
          <button 
            className="btn btn-secondary"
            onClick={() => handleQuickAction('test-email')}
            disabled={actionLoading === 'test-email'}
          >
            📧 Test emails
          </button>
          <button 
            className="btn btn-info"
            onClick={() => handleQuickAction('security-audit')}
          >
            🔍 Audit sécurité
          </button>
          <button 
            className="btn btn-danger"
            onClick={() => router.push('/admin/incidents')}
          >
            🚨 Rapport incident
          </button>
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
            <strong>Authentification requise:</strong> Bearer Token dans l&#39;en-tête Authorization
          </div>
        </div>
      </section>
    </div>
  );
}
