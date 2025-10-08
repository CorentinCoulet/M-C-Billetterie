# 🚀 Guide de démarrage des tests de performance

## Installation et configuration

### 1. Installer Artillery
```bash
yarn add --dev artillery
```

### 2. Démarrer l'application
```bash
yarn dev
# Ou en production:
yarn start
```

## Types de tests disponibles

### 📊 Test de charge standard (`yarn perf:load`)
- **Durée**: ~7 minutes
- **Charge**: 5-25 req/s en moyenne
- **Usage**: Test quotidien de performance
- **Seuils**: P95 < 500ms, P99 < 1s

### 💥 Test de stress (`yarn perf:stress`)
- **Durée**: ~4,5 minutes  
- **Charge**: Jusqu'à 100 req/s (simulation Black Friday)
- **Usage**: Test de résistance aux pics
- **Seuils**: P95 < 2s, P99 < 5s

### 🎯 Test de capacité (`yarn perf:capacity`)
- **Durée**: ~10 minutes
- **Charge**: 200-500 req/s
- **Usage**: Trouver les limites système
- **Seuils**: P95 < 3s, erreurs < 5%

## Commandes disponibles

```bash
# Tests Artillery (Load Testing)
yarn perf:load      # Test de charge normal
yarn perf:stress    # Test de stress
yarn perf:capacity  # Test de capacité
yarn perf:artillery # Test Artillery standard
yarn perf:artillery:extreme # Test de charge extrême
yarn perf:artillery:report  # Générer un rapport HTML

# Tests Jest (Benchmarks)
yarn perf:api       # Benchmarks des API endpoints
yarn perf:db        # Benchmarks de la base de données
yarn perf:cache     # Tests de performance du cache Redis
yarn perf:all       # Tous les tests de performance Jest

# Tous les tests (environ 20 minutes)
yarn perf:test

# Test manuel avec Artillery
yarn artillery run tests/performance/load-test.yml
```

## Lecture des résultats

### Métriques importantes
- **Request rate**: Requêtes par seconde
- **Response time**: 
  - Median: 50% des requêtes
  - P95: 95% des requêtes
  - P99: 99% des requêtes
- **Status codes**: Répartition des réponses HTTP
- **Errors**: Nombre total d'erreurs

### Seuils de performance recommandés

| Métrique | Normal | Stress | Critique |
|----------|--------|--------|----------|
| P95 Response Time | < 500ms | < 2s | < 5s |
| P99 Response Time | < 1s | < 5s | < 10s |
| Error Rate | < 0.1% | < 1% | < 5% |
| Request Rate | > 50/s | > 80/s | > 20/s |

## Rapports générés

Les rapports sont sauvés dans `reports/performance/`:
- **JSON**: Données brutes pour analyse
- **HTML**: Graphiques et visualisations

## Monitoring pendant les tests

### Vérifier les métriques Prometheus
```bash
# Pendant les tests, consulter:
curl http://localhost:3000/api/metrics

# Vérifier la santé:
curl http://localhost:3000/api/health
```

### Surveiller les ressources système
```bash
# CPU et mémoire
top
htop

# Base de données
docker stats postgres

# Redis
docker stats redis
```

## Troubleshooting

### Test échoue avec "ECONNRESET"
- L'application n'est pas démarrée
- Port 3000 occupé par un autre processus
- Timeout trop court pour votre système

### Performance dégradée
1. Vérifier les ressources système (CPU, RAM)
2. Vérifier la base de données (connexions)
3. Vérifier Redis (mémoire)
4. Consulter les logs applicatifs

### Trop d'erreurs 503
- Rate limiting activé (normal sous forte charge)
- Manque de ressources système
- Base de données surchargée

## Optimisations recommandées

### Si P95 > 500ms en normal
1. Optimiser les requêtes DB
2. Ajouter de la mise en cache
3. Optimiser les endpoints lents

### Si erreurs > 1% en stress
1. Augmenter les limites de rate limiting
2. Optimiser la gestion des connexions DB
3. Ajouter du load balancing

### Si capacité < 200 req/s
1. Scaler horizontalement
2. Optimiser les ressources (CPU/RAM)
3. Utiliser un CDN pour les assets

## Intégration CI/CD

```yaml
# GitHub Actions example
- name: Performance Tests
  run: |
    yarn dev &
    sleep 10
    yarn perf:load
    kill %1
```

## Scripts personnalisés

Vous pouvez modifier les fichiers YAML dans `tests/performance/` pour:
- Ajuster les phases de charge
- Modifier les endpoints testés
- Changer les seuils de performance
- Ajouter des scénarios métier
