# Comptes de Test - Seed Database

Tous les identifiants de test sont fournis via les variables d'environnement et le script seed Prisma.

## Connexion Adminer

**URL:** http://localhost:8081

**Paramètres de connexion:**
- **Système:** PostgreSQL
- **Serveur:** `db-dev` (alias Docker `postgres-dev`)
- **Utilisateur:** valeur de `POSTGRES_USER`
- **Mot de passe:** valeur de `POSTGRES_PASSWORD`
- **Base de données:** valeur de `POSTGRES_DB`

Ces variables sont définies dans `.env.docker` et recopiées depuis `.env.example`. Utilisez `Get-Content .env.docker | Select-String POSTGRES_` pour vérifier les valeurs au besoin.

**Autres outils:**
- **Redis Commander:** http://localhost:8084 (identifiants consultables via `REDIS_*` dans `.env.docker`)
- **Mailhog:** http://localhost:8025
- **Application:** http://localhost:3001

---

## Comptes applicatifs

Les adresses e-mail ci-dessous sont injectées par le seed Prisma. Les mots de passe sont générés à partir des variables `SEED_ADMIN_PASSWORD`, `SEED_ORGANIZER_PASSWORD` et `SEED_USER_PASSWORD` définies dans `.env.example`.

### Admin

- **Email:** admin@demo.com
- **Role:** ADMIN

### Organisateurs

| Nom | Email | Événements |
| --- | --- | --- |
| Music Events Pro | music.events@demo.com | 3 concerts/festivals |
| Sports Manager | sports.manager@demo.com | 3 événements sportifs |
| Tech Conferences Inc | tech.conferences@demo.com | 2 conférences tech |
| Culture Events | culture.events@demo.com | 3 événements culturels |

### Utilisateurs

| Nom | Email |
| --- | --- |
| Alice Martin | alice.martin@demo.com |
| Bob Dubois | bob.dubois@demo.com |
| Claire Bernard | claire.bernard@demo.com |
| David Petit | david.petit@demo.com |
| Emma Durand | emma.durand@demo.com |

Les mots de passe sont affichés dans les logs du seed lors de l'exécution (voir section ci‑dessous) et ne sont jamais commités en clair.

## Statistiques générées par le seed

- **1** Admin
- **4** Organisateurs
- **5** Utilisateurs
- **11** Événements
- **8** Commandes

## Démarrage

```powershell
.\docker-manager.ps1 -Action dev
```

Le seed s'exécute automatiquement au démarrage. Si vous avez besoin de forcer un nouveau seed, exécutez `yarn db:reset` puis redémarrez les services.
