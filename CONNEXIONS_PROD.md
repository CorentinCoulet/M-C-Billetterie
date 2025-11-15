# 🔐 Informations de Connexion - Environnement PRODUCTION
⚠️ **ATTENTION CRITIQUE** : 
- Ces informations sont HAUTEMENT SENSIBLES
- Ne JAMAIS commiter ce fichier dans Git
- Accès restreint aux administrateurs système uniquement
- Changer TOUS les mots de passe par défaut avant la mise en production
## 🌐 Applications Web
### Application Principale
- **URL Production** : https://billetterie.votredomaine.com
- **URL Staging** : https://staging.billetterie.votredomaine.com
- **Description** : Application Next.js de billetterie
- **SSL/TLS** : Activé avec Let's Encrypt / Certificat valide
- **CDN** : Cloudflare / Autre (à configurer)
### Monitoring Grafana
- **URL** : https://monitoring.billetterie.votredomaine.com
- **Utilisateur** : `À DÉFINIR - NE PAS UTILISER "admin"`
- **Mot de passe** : `À GÉNÉRER - Minimum 24 caractères`
- **2FA** : OBLIGATOIRE
### Prometheus
- **URL** : https://prometheus.billetterie.votredomaine.com
- **Accès** : Interne uniquement (VPN requis)
- **Auth** : Basic Auth + IP Whitelist
### AlertManager
- **URL** : https://alerts.billetterie.votredomaine.com
- **Accès** : Interne uniquement (VPN requis)
## 🗄️ Bases de Données (Connexions Production)
### PostgreSQL Production
- **Provider** : Supabase / AWS RDS / DigitalOcean / Auto-hébergé
- **Host** : `À DÉFINIR - db.prod.votredomaine.com`
- **Port** : `5432` (ou custom)
- **User** : `À DÉFINIR - NE PAS UTILISER "postgres"`
- **Password** : `À GÉNÉRER - Minimum 32 caractères aléatoires`
- **Database** : `billetterie_prod`
- **SSL Mode** : `require` (OBLIGATOIRE)
- **Connection String** : `postgresql://USER:PASSWORD@HOST:PORT/DATABASE?sslmode=require`
- **Backup** : Automatique quotidien + rétention 30 jours minimum
### Redis Production
- **Provider** : Redis Cloud / AWS ElastiCache / Upstash / Auto-hébergé
- **Host** : `À DÉFINIR - redis.prod.votredomaine.com`
- **Port** : `6379` (ou custom)
- **Password** : `À GÉNÉRER - Minimum 32 caractères aléatoires`
- **SSL/TLS** : OBLIGATOIRE
- **Connection String** : `rediss://:PASSWORD@HOST:PORT`
- **Max Memory Policy** : `allkeys-lru`
- **Persistence** : AOF + RDB
## 🔑 Variables d'Environnement Critiques
### Secrets à générer OBLIGATOIREMENT
```bash
# JWT Secret (64+ caractères aléatoires)
JWT_SECRET=À_GÉNÉRER_AVEC_openssl_rand_-base64_64
# Encryption Key (64+ caractères aléatoires)
ENCRYPTION_KEY=À_GÉNÉRER_AVEC_openssl_rand_-base64_64
# Session Secret (64+ caractères aléatoires)
SESSION_SECRET=À_GÉNÉRER_AVEC_openssl_rand_-base64_64
# CSRF Token Secret (64+ caractères aléatoires)
CSRF_SECRET=À_GÉNÉRER_AVEC_openssl_rand_-base64_64
```
### Stripe (Production)
- **Publishable Key** : `pk_live_...` (Stripe Dashboard)
- **Secret Key** : `sk_live_...` (Stripe Dashboard - NE JAMAIS EXPOSER)
- **Webhook Secret** : `whsec_...` (Stripe Dashboard)
- **Mode** : `live`
### Email (Production)
- **Provider** : SendGrid / AWS SES / Resend / Mailgun
- **API Key** : `À CONFIGURER depuis le provider`
- **Sender Email** : `noreply@votredomaine.com`
- **Sender Name** : `Nom de votre billetterie`
### Sentry (Monitoring d'erreurs)
- **DSN** : `https://...@sentry.io/...`
- **Environment** : `production`
- **Sample Rate** : `0.1` (10% des transactions)
## 👤 Comptes Administrateurs (À créer manuellement)
### Super Admin Principal
- **Email** : `admin@votredomaine.com` (email réel)
- **Mot de passe** : `À GÉNÉRER - Minimum 20 caractères + 2FA OBLIGATOIRE`
- **Rôle** : SUPER_ADMIN
- **2FA** : TOTP (Google Authenticator / Authy)
### Admin Technique
- **Email** : `tech@votredomaine.com` (email réel)
- **Mot de passe** : `À GÉNÉRER - Minimum 20 caractères + 2FA OBLIGATOIRE`
- **Rôle** : ADMIN
- **2FA** : TOTP
⚠️ **NE JAMAIS créer de comptes de test en production**
## 🛡️ Sécurité
### Checklist Pré-Production
- [ ] Tous les mots de passe par défaut changés
- [ ] JWT_SECRET généré (64+ caractères)
- [ ] ENCRYPTION_KEY généré (64+ caractères)
- [ ] SSL/TLS activé partout
- [ ] HTTPS strict (HSTS activé)
- [ ] Firewall configuré (ports minimaux ouverts)
- [ ] Rate limiting activé
- [ ] CORS configuré strictement
- [ ] CSP headers configurés
- [ ] Backup automatique configuré
- [ ] Monitoring et alertes actifs
- [ ] 2FA obligatoire pour tous les admins
- [ ] Logs centralisés et protégés
- [ ] Plan de reprise après sinistre documenté
### IP Whitelisting (si applicable)
- Admin Panel : `Liste d'IPs autorisées`
- Database : `Liste d'IPs autorisées`
- API Management : `Liste d'IPs autorisées`
## 🚨 Contact d'Urgence
### Équipe Technique
- **Responsable Principal** : Nom + Email + Téléphone
- **Responsable Backup** : Nom + Email + Téléphone
- **Astreinte 24/7** : Téléphone
### Providers Externes
- **Hébergeur** : Support + Numéro d'urgence
- **Database Provider** : Support + Numéro d'urgence
- **Stripe Support** : https://support.stripe.com
## 📊 Exporters & Métriques (Production)
- **Node Exporter** : Accès interne uniquement
- **PostgreSQL Exporter** : Accès interne uniquement
- **Redis Exporter** : Accès interne uniquement
- **Application Metrics** : `/api/metrics` (authentifié)
## 🐳 Déploiement Kubernetes (si applicable)
### Contextes
```bash
# Production
kubectl config use-context billetterie-prod
# Staging
kubectl config use-context billetterie-staging
# Vérifier le contexte actuel
kubectl config current-context
```
### Secrets Management
- **Provider** : Sealed Secrets / External Secrets / Vault
- **Rotation** : Automatique tous les 90 jours
## 📝 Notes Importantes
1. **Ce fichier ne doit JAMAIS être commité dans Git**
2. **Ajouter ce fichier au .gitignore**
3. **Stocker les secrets dans un gestionnaire sécurisé** (1Password, Vault, AWS Secrets Manager, etc.)
4. **Changer tous les mots de passe tous les 90 jours**
5. **Faire des audits de sécurité réguliers**
6. **Tenir ce document à jour**
7. **Restreindre l'accès à ce document**
## 🔄 Dernière Mise à Jour
- **Date** : À REMPLIR
- **Par** : À REMPLIR
- **Changements** : À DOCUMENTER
