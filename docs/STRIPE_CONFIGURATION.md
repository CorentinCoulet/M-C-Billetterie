# Configuration de l'API Stripe

## Configuration Complète

La configuration Stripe est maintenant entièrement personnalisable via les variables d'environnement.

### Variables d'environnement principales

```bash
# =================================
# STRIPE API CONFIGURATION
# =================================

# Version de l'API Stripe utilisée
STRIPE_API_VERSION=2025-06-30.basil

# Version par défaut si STRIPE_API_VERSION n'est pas définie
STRIPE_DEFAULT_API_VERSION=2025-06-30.basil

# Versions supportées (séparées par des virgules)
STRIPE_SUPPORTED_VERSIONS=2025-06-30.basil,2024-06-20,2024-04-10,2024-02-15,2023-10-16

# =================================
# CURRENCY CONFIGURATION
# =================================

# Devise par défaut
STRIPE_DEFAULT_CURRENCY=EUR

# Devises supportées (séparées par des virgules)
STRIPE_SUPPORTED_CURRENCIES=EUR,USD,GBP

# =================================
# WEBHOOK & PERFORMANCE SETTINGS
# =================================

# Tolérance pour les webhooks (en secondes)
STRIPE_WEBHOOK_TOLERANCE=300

# Nombre maximum de tentatives en cas d'échec
STRIPE_MAX_RETRIES=3

# Délai entre les tentatives (en millisecondes)
STRIPE_RETRY_DELAY=1000

# Taille maximum du cache d'événements
STRIPE_MAX_PROCESSED_EVENTS=1000

# Taille de nettoyage du cache
STRIPE_CACHE_CLEANUP_SIZE=500

# Intervalle de nettoyage du cache (en millisecondes)
STRIPE_CACHE_CLEANUP_INTERVAL=3600000
```

### Versions supportées

Les versions suivantes sont supportées et testées :

- `2025-06-30.basil` (par défaut - recommandée)
- `2024-06-20`
- `2024-04-10`
- `2024-02-15`
- `2023-10-16`

### Mise à jour de version

1. **Vérifiez la compatibilité** : Consultez la [documentation Stripe](https://stripe.com/docs/api/versioning) pour les changements breaking
2. **Testez en développement** : Changez la variable d'environnement et testez tous les paiements
3. **Mise à jour de la configuration** : Ajoutez la nouvelle version dans `src/config/stripe.ts`
4. **Déployez progressivement** : Testez en staging avant la production

### Avantages de cette approche

- ✅ **Flexibilité totale** : Tous les paramètres configurables via l'environnement
- ✅ **Pas de code en dur** : Aucune valeur fixée dans le code source
- ✅ **Environnements multiples** : Configuration différente par environnement
- ✅ **Contrôle granulaire** : Ajustement fin des performances et comportements
- ✅ **Sécurité** : Validation automatique des paramètres
- ✅ **Monitoring** : Logs automatiques de la configuration utilisée
- ✅ **Rollback facile** : Changement de variables d'environnement uniquement

### Configuration par environnement

#### Développement
```bash
STRIPE_API_VERSION=2024-06-20
STRIPE_DEFAULT_CURRENCY=EUR
STRIPE_MAX_PROCESSED_EVENTS=100
STRIPE_CACHE_CLEANUP_INTERVAL=1800000  # 30 minutes
```

#### Production
```bash
STRIPE_API_VERSION=2025-06-30.basil
STRIPE_DEFAULT_CURRENCY=EUR
STRIPE_MAX_PROCESSED_EVENTS=5000
STRIPE_CACHE_CLEANUP_INTERVAL=3600000  # 1 heure
STRIPE_MAX_RETRIES=5
```

### Exemple de rollback

En cas de problème avec une nouvelle version :

```bash
# Revenir à la version précédente
STRIPE_API_VERSION=2024-06-20
```

Puis redémarrer l'application.

### Notes importantes

- Si aucune version n'est spécifiée, la version par défaut sera utilisée
- Les versions non supportées génèrent un warning et utilisent la version par défaut
- Toujours tester les webhooks après un changement de version d'API
