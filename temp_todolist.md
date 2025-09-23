# 📋 TODO LIST - ÉPURATION PROJET BILLETTERIE

*Généré le 23 septembre 2025*

## ✅ **PHASE 1 : NETTOYAGE IMMÉDIAT** (TERMINÉ)

### ✅ **Supprimer les fichiers temporaires**
- [x] Supprimer `app\api\payments\webhook\route.ts.bak` ✅
- [x] Supprimer `src\services\ticketQRService.ts.backup` ✅ (n'existait pas)
- [x] Supprimer `node_modules\nwsapi\dist\lint.log` ✅ (fichier système)

### ✅ **Scripts obsolètes à supprimer**
- [x] Supprimer `scripts/fix-typescript-errors.js` ✅
- [x] Supprimer `scripts/validate-webhook-translation.js` ✅
- [x] Supprimer `scripts/validate-middleware-p1.js` ✅
- [x] Supprimer `scripts/validate-transactions-p1.js` ✅
- [x] Supprimer `scripts/validate-webhook-p1.js` ✅
- [x] Supprimer les doublons de validation ✅

### ✅ **Docker - Configurations gardées séparées**
- [x] Garder `docker-compose.prod.local.yml` (env. local) ✅
- [x] Garder `docker-compose.prod.yml` (vraie production) ✅
- [x] Vérifier `docker-compose.monitoring.yml` ✅ (utilisé activement)

## ✅ **PHASE 2 : AUDIT DES DÉPENDANCES** (TERMINÉ)

### ✅ **Packages vérifiés - TOUS UTILISÉS (gardés)**
- [x] **commander** (`^12.1.0`) - ✅ Utilisé dans `scripts/security.ts` pour CLI
- [x] **embla-carousel-react** (`^8.5.2`) - ✅ Utilisé dans `src/components/ui/carousel.tsx`
- [x] **input-otp** (`^1.4.2`) - ✅ Utilisé dans `src/components/ui/input-otp.tsx` (2FA)
- [x] **vaul** (`^1.1.2`) - ✅ Utilisé dans `src/components/ui/drawer.tsx`
- [x] **cmdk** (`^1.1.1`) - ✅ Utilisé dans `src/components/ui/command.tsx`

### ✅ **Dépendances Express obsolètes - SUPPRIMÉES**
- [x] **express-rate-limit** (`^8.0.1`) - ✅ SUPPRIMÉ (remplacé par middleware Next.js)
- [x] **express-session** (`^1.18.2`) - ✅ SUPPRIMÉ (remplacé par JWT + cookies)
- [x] **next-connect** (`^1.0.0`) - ✅ SUPPRIMÉ (obsolète avec App Router Next.js 15)
- [x] **@types/express-session** - ✅ SUPPRIMÉ (type definition obsolète)

### ✅ **Actions de nettoyage**
```bash
✅ FAIT: yarn remove express-rate-limit express-session next-connect @types/express-session
✅ FAIT: yarn cache clean --all
```

## ✅ **PHASE 3 : RESTRUCTURATION** (EN COURS)

### ✅ **Simplifier la structure des tests**
- [x] Fusionner `tests/basic/` avec `tests/unit/` ✅
- [x] Supprimer `tests/debug/` (dossier de débogage temporaire) ✅
- [ ] Réviser `tests/performance/` - garder seulement les tests essentiels
- [ ] Réviser `tests/security/` - consolider les tests redondants

### 📊 **Réduire les diagrammes PlantUML**
- [ ] Garder seulement les diagrammes principaux :
  - `diagrams/architecture/deployment-architecture.puml`
  - `diagrams/entity-relationship/` (modèle de données)
  - `diagrams/use-cases/` (flux principaux)
- [ ] Supprimer les diagrammes redondants ou obsolètes
- [ ] Archiver les diagrammes de conception détaillés

### ✅ **Consolider les scripts redondants**
- [x] **Scripts de déploiement** - Scripts redondants supprimés :
  - `deploy-production.sh` (gardé - script principal) ✅
  - `deploy-production-complete.sh` (supprimé) ✅
  - `deploy-production-database.sh` (supprimé) ✅
  - `deploy-secure.sh` (supprimé) ✅

- [x] **Scripts de sauvegarde** - Consolidation :
  - `backup.sh` (gardé - script principal) ✅
  - `backup-production.sh` (supprimé - redondant) ✅
  - `backup.ts` (gardé - usage spécifique TypeScript) ✅

- [ ] **Scripts de test** - À consolider : 4 fichiers `test-*.ts` restants

## 📚 **PHASE 4 : DOCUMENTATION** (Priorité Basse)

### 📖 **Simplifier la documentation**
- [ ] Fusionner `FRONTEND_PRD.md` dans le `README.md` principal
- [ ] Fusionner `DOCKER_ENVIRONMENTS.md` dans `README.md`
- [ ] Vérifier les doublons dans `/docs` (13 fichiers)
- [ ] Créer un index central dans `docs/_INDEX.md`

### ✅ **Résoudre les TODOs dans le code**
- [x] Résoudre le TODO dans `app/contact/page.tsx` ligne 22 ✅
- [x] Vérifier les autres TODOs détectés par grep ✅ (surtout dans generated code)

## ⚡ **PHASE 5 : OPTIMISATION PERFORMANCE** (Priorité Basse)

### ✅ **Nettoyage espace disque**
- [x] Nettoyer le cache Yarn : `yarn cache clean --all` ✅
- [ ] Vérifier les gros fichiers binaires Prisma générés
- [ ] Nettoyer les rapports de coverage anciens
- [ ] Optimiser `.gitignore` et `.dockerignore`

### 🔄 **Optimisations build**
- [ ] Vérifier si tous les fichiers dans `src/generated/` sont nécessaires
- [ ] Optimiser les imports - supprimer les imports inutilisés
- [ ] Vérifier la configuration TypeScript pour les chemins

## 🧪 **PHASE 6 : VALIDATION** (Après nettoyage)

### ✅ **Tests de régression**
- [ ] Exécuter tous les tests : `yarn test`
- [ ] Vérifier le build : `yarn build`
- [ ] Tester les environnements Docker
- [ ] Vérifier que l'application démarre correctement

### 📊 **Mesure des gains**
- [ ] Mesurer la taille du projet avant/après
- [ ] Compter le nombre de fichiers supprimés
- [ ] Mesurer l'amélioration du temps de build
- [ ] Documenter les optimisations dans `CHANGELOG.md`

## 🎯 **COMMANDES RAPIDES**

### 🗑️ **Suppression immédiate des fichiers temporaires**
```bash
# Supprimer les fichiers de backup
Remove-Item "app\api\payments\webhook\route.ts.bak" -Force
Remove-Item "src\services\ticketQRService.ts.backup" -Force

# Supprimer les scripts obsolètes
Remove-Item "scripts\fix-typescript-errors.js" -Force
Remove-Item "scripts\validate-*-p1.js" -Force
Remove-Item "scripts\validate-webhook-translation.js" -Force
```

### 📦 **Nettoyage dépendances (après audit)**
```bash
# Nettoyer le cache
yarn cache clean --all

# Réinstaller proprement
rm -rf node_modules
yarn install

# Audit de sécurité
yarn audit --level moderate
```

### 🔍 **Commandes d'analyse**
```bash
# Trouver les imports inutilisés
npx depcheck

# Analyser la taille du bundle
yarn build:analyze

# Chercher les TODOs restants
grep -r "TODO\|FIXME\|XXX" --include="*.ts" --include="*.tsx" --include="*.js" src/
```

## 📈 **ESTIMATION DES GAINS**

| Catégorie | Gain estimé |
|-----------|-------------|
| 💾 **Espace disque** | 200-300 MB |
| 📁 **Nombre de fichiers** | -50 à -100 fichiers |
| ⚡ **Temps de build** | -10 à -20% |
| 🧹 **Complexité** | Significatif |
| 🔧 **Maintenabilité** | Très améliorée |

## ⚠️ **PRÉCAUTIONS**

- [ ] **Sauvegarder** le projet avant toute suppression majeure
- [ ] **Tester** après chaque phase de nettoyage
- [ ] **Vérifier** les dépendances croisées avant suppression
- [ ] **Documenter** les changements dans le CHANGELOG
- [ ] **Commit** régulièrement pendant le processus

---

## 📈 **RÉSULTATS OBTENUS**

### ✅ **Gains réalisés :**
- **🗑️ Fichiers supprimés** : ~15 fichiers temporaires/obsolètes
- **📦 Dépendances nettoyées** : 4 packages Express obsolètes supprimés
- **📁 Structure simplifiée** : `tests/basic/` fusionné, `tests/debug/` supprimé
- **🔧 Scripts consolidés** : 4 scripts de déploiement → 1 script principal
- **💾 Cache nettoyé** : Cache Yarn vidé (gain d'espace)
- **🐛 TODOs résolus** : TODO principal dans `app/contact/page.tsx` implémenté

### ⚠️ **Points d'attention identifiés :**
- **Erreurs TypeScript** : ✅ **Réduites de 409 à ~100** (middlewares, Sentry, Stripe corrigés)
- **Middlewares** : ✅ Imports `next-connect` et `express-session` supprimés 
- **Types Prisma** : ⚠️ Incompatibilités de schéma à résoudre

## 🏁 **CHECKLIST DE FIN**

- [ ] Corriger les erreurs TypeScript critiques
- [ ] Mettre à jour les middlewares pour Next.js 15
- [ ] Tous les tests passent
- [ ] Le build fonctionne
- [ ] L'application démarre correctement
- [ ] Documentation mise à jour
- [ ] CHANGELOG mis à jour
- [ ] Commit final avec message descriptif

**Objectif** : Projet plus lean, maintenable et performant ! 🚀

---

*Dernière mise à jour : 23 septembre 2025*
*Estimé : 4-6h de travail réparti sur plusieurs sessions*
