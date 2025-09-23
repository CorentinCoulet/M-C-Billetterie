export default function SecurityDocsPage() {
  return (
    <div>
      <section className="card">
        <h1>🛡️ Documentation Sécurité</h1>
        <p style={{ marginTop: '1rem', lineHeight: '1.6' }}>
          Guide complet du système de sécurité avancé de notre billetterie.
        </p>
      </section>

      <div className="card">
        <h2>🔧 Architecture WAF (Web Application Firewall)</h2>
        <p style={{ margin: '1rem 0', lineHeight: '1.6' }}>
          Notre WAF utilise une architecture dual-mode permettant de basculer entre un mode gratuit et premium selon vos besoins.
        </p>
        
        <h3 style={{ marginTop: '1.5rem', marginBottom: '0.5rem' }}>Mode Gratuit</h3>
        <ul style={{ margin: '0.5rem 0', paddingLeft: '1.5rem' }}>
          <li>Protection basique contre SQL Injection</li>
          <li>Détection XSS simple</li>
          <li>Rate limiting standard (60 req/min)</li>
          <li>Blocage automatique après 10 tentatives</li>
          <li>Patterns de sécurité essentiels (5 patterns)</li>
        </ul>

        <h3 style={{ marginTop: '1.5rem', marginBottom: '0.5rem' }}>Mode Premium</h3>
        <ul style={{ margin: '0.5rem 0', paddingLeft: '1.5rem' }}>
          <li>Protection avancée SQL Injection (15+ patterns)</li>
          <li>Détection XSS multi-niveaux avec analyse contextuelle</li>
          <li>Rate limiting adaptatif (300 req/min)</li>
          <li>Analyse comportementale en temps réel</li>
          <li>Détection de bots et crawlers malveillants</li>
          <li>Protection contre Command Injection</li>
          <li>Détection de Directory Traversal</li>
          <li>Analyse des User-Agents suspects</li>
          <li>Blocage intelligent avec scoring</li>
          <li>Statistiques détaillées et alertes</li>
        </ul>
      </div>

      <div className="card">
        <h2>🔐 Endpoints API de Sécurité</h2>
        
        <h3 style={{ marginBottom: '0.5rem' }}>Endpoints Publics</h3>
        <div style={{ fontFamily: 'monospace', background: '#f8f9fa', padding: '1rem', borderRadius: '0.375rem', margin: '0.5rem 0' }}>
          <div style={{ marginBottom: '0.5rem' }}>
            <strong>GET /api/security/status</strong><br/>
            <span style={{ color: '#666' }}>Retourne le statut actuel du WAF et les statistiques publiques</span>
          </div>
        </div>

        <h3 style={{ marginTop: '1.5rem', marginBottom: '0.5rem' }}>Endpoints Admin (Authentification requise)</h3>
        <div style={{ fontFamily: 'monospace', background: '#f8f9fa', padding: '1rem', borderRadius: '0.375rem', margin: '0.5rem 0' }}>
          <div style={{ marginBottom: '0.5rem' }}>
            <strong>POST /api/admin/security/mode</strong><br/>
            <span style={{ color: '#666' }}>Change le mode WAF (free/premium)</span><br/>
            <code style={{ fontSize: '0.8em' }}>{"Body: { \"mode\": \"premium\" }"}</code>
          </div>
          
          <div style={{ marginBottom: '0.5rem' }}>
            <strong>GET /api/admin/security/stats</strong><br/>
            <span style={{ color: '#666' }}>Statistiques complètes de sécurité</span>
          </div>
          
          <div style={{ marginBottom: '0.5rem' }}>
            <strong>GET /api/admin/security/config</strong><br/>
            <span style={{ color: '#666' }}>Configuration actuelle du WAF</span>
          </div>
          
          <div style={{ marginBottom: '0.5rem' }}>
            <strong>POST /api/admin/security/block-ip</strong><br/>
            <span style={{ color: '#666' }}>Bloquer manuellement une IP</span><br/>
            <code style={{ fontSize: '0.8em' }}>{"Body: { \"ip\": \"192.168.1.100\", \"reason\": \"Activité suspecte\" }"}</code>
          </div>
          
          <div style={{ marginBottom: '0.5rem' }}>
            <strong>POST /api/admin/security/unblock-ip</strong><br/>
            <span style={{ color: '#666' }}>Débloquer une IP</span><br/>
            <code style={{ fontSize: '0.8em' }}>{"Body: { \"ip\": \"192.168.1.100\" }"}</code>
          </div>
          
          <div style={{ marginBottom: '0.5rem' }}>
            <strong>GET /api/admin/security/blocked-ips</strong><br/>
            <span style={{ color: '#666' }}>Liste des IPs bloquées</span>
          </div>
          
          <div>
            <strong>POST /api/admin/security/clear-stats</strong><br/>
            <span style={{ color: '#666' }}>Réinitialiser les statistiques</span>
          </div>
        </div>
      </div>

      <div className="card">
        <h2>⚡ Patterns de Détection</h2>
        
        <h3 style={{ marginBottom: '0.5rem' }}>SQL Injection</h3>
        <ul style={{ margin: '0.5rem 0', paddingLeft: '1.5rem', fontSize: '0.9rem' }}>
          <li>Mots-clés SQL dangereux (UNION, SELECT, DROP, etc.)</li>
          <li>Caractères spéciaux d'injection (', --, ;)</li>
          <li>Fonctions SQL système (@@version, information_schema)</li>
          <li>Techniques d'évasion et obfuscation</li>
        </ul>

        <h3 style={{ marginTop: '1rem', marginBottom: '0.5rem' }}>Cross-Site Scripting (XSS)</h3>
        <ul style={{ margin: '0.5rem 0', paddingLeft: '1.5rem', fontSize: '0.9rem' }}>
          <li>Balises HTML malveillantes (&lt;script&gt;, &lt;iframe&gt;, etc.)</li>
          <li>Événements JavaScript (onload, onerror, onclick)</li>
          <li>Protocols dangereux (javascript:, data:, vbscript:)</li>
          <li>Encodage d'évasion (URL, HTML entities)</li>
        </ul>

        <h3 style={{ marginTop: '1rem', marginBottom: '0.5rem' }}>Command Injection</h3>
        <ul style={{ margin: '0.5rem 0', paddingLeft: '1.5rem', fontSize: '0.9rem' }}>
          <li>Commandes système (rm, cat, wget, curl)</li>
          <li>Opérateurs de chaînage (&&, ||, ;, |)</li>
          <li>Variables d'environnement ($PATH, $HOME)</li>
          <li>Redirections et pipes</li>
        </ul>
      </div>

      <div className="card">
        <h2>📊 Monitoring et Alertes</h2>
        
        <h3 style={{ marginBottom: '0.5rem' }}>Métriques Surveillées</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', margin: '1rem 0' }}>
          <div style={{ background: '#f8f9fa', padding: '1rem', borderRadius: '0.375rem' }}>
            <strong style={{ color: '#e53e3e' }}>Attaques Bloquées</strong>
            <p style={{ fontSize: '0.9rem', margin: '0.5rem 0 0 0' }}>Nombre total d'attaques détectées et bloquées</p>
          </div>
          <div style={{ background: '#f8f9fa', padding: '1rem', borderRadius: '0.375rem' }}>
            <strong style={{ color: '#48bb78' }}>Taux de Réussite</strong>
            <p style={{ fontSize: '0.9rem', margin: '0.5rem 0 0 0' }}>Pourcentage de requêtes légitimes passées</p>
          </div>
          <div style={{ background: '#f8f9fa', padding: '1rem', borderRadius: '0.375rem' }}>
            <strong style={{ color: '#4299e1' }}>IPs Bloquées</strong>
            <p style={{ fontSize: '0.9rem', margin: '0.5rem 0 0 0' }}>Nombre d'IPs actuellement bloquées</p>
          </div>
          <div style={{ background: '#f8f9fa', padding: '1rem', borderRadius: '0.375rem' }}>
            <strong style={{ color: '#ed8936' }}>Faux Positifs</strong>
            <p style={{ fontSize: '0.9rem', margin: '0.5rem 0 0 0' }}>Taux de fausses détections (&lt; 0.1%)</p>
          </div>
        </div>

        <h3 style={{ marginTop: '1.5rem', marginBottom: '0.5rem' }}>Types d'Alertes</h3>
        <ul style={{ margin: '0.5rem 0', paddingLeft: '1.5rem' }}>
          <li><strong>Critique:</strong> Attaque active détectée et bloquée</li>
          <li><strong>Élevé:</strong> Multiple tentatives depuis la même IP</li>
          <li><strong>Moyen:</strong> Pattern suspect détecté</li>
          <li><strong>Faible:</strong> Rate limiting appliqué</li>
        </ul>
      </div>

      <div className="card">
        <h2>🔒 Authentification Admin</h2>
        <p style={{ margin: '1rem 0', lineHeight: '1.6' }}>
          L'accès aux endpoints d'administration nécessite une authentification par token Bearer. 
          Le token doit être inclus dans l'en-tête Authorization de chaque requête.
        </p>
        
        <div style={{ fontFamily: 'monospace', background: '#f8f9fa', padding: '1rem', borderRadius: '0.375rem', margin: '1rem 0' }}>
          <div style={{ marginBottom: '0.5rem' }}>
            <strong>Header requis:</strong><br/>
            <code>Authorization: Bearer YOUR_ADMIN_TOKEN</code>
          </div>
        </div>

        <div className="alert alert-warning">
          <strong>⚠️ Sécurité:</strong> Les tokens d'administration ne doivent jamais être exposés côté client. 
          Utilisez uniquement depuis votre backend sécurisé.
        </div>
      </div>

      <div className="card">
        <h2>🚀 Performance</h2>
        <p style={{ margin: '1rem 0', lineHeight: '1.6' }}>
          Le WAF est optimisé pour avoir un impact minimal sur les performances tout en maximisant la protection.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', margin: '1rem 0' }}>
          <div style={{ background: '#e6fffa', padding: '1rem', borderRadius: '0.375rem', border: '1px solid #81e6d9' }}>
            <strong style={{ color: '#234e52' }}>Latence Ajoutée</strong>
            <p style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#0d9488', margin: '0.5rem 0' }}>&lt; 5ms</p>
            <p style={{ fontSize: '0.9rem' }}>Par requête en moyenne</p>
          </div>
          <div style={{ background: '#f0fff4', padding: '1rem', borderRadius: '0.375rem', border: '1px solid #9ae6b4' }}>
            <strong style={{ color: '#22543d' }}>Débit Max</strong>
            <p style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#38a169', margin: '0.5rem 0' }}>10,000 req/s</p>
            <p style={{ fontSize: '0.9rem' }}>Avec mise en cache</p>
          </div>
          <div style={{ background: '#fef5e7', padding: '1rem', borderRadius: '0.375rem', border: '1px solid #f6e05e' }}>
            <strong style={{ color: '#744210' }}>Précision</strong>
            <p style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#d69e2e', margin: '0.5rem 0' }}>99.9%</p>
            <p style={{ fontSize: '0.9rem' }}>Détection d'attaques</p>
          </div>
        </div>
      </div>
    </div>
  )
}
