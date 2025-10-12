# Comptes de Test - Seed Database

## Connexion Adminer

**URL:** http://localhost:8081

**Parametres de connexion:**
- **Systeme:** PostgreSQL
- **Serveur:** `db-dev` (ou `postgres-dev`)
- **Utilisateur:** `postgres`
- **Mot de passe:** `postgres123`
- **Base de donnees:** `billetterie`

**Autres outils:**
- **Redis Commander:** http://localhost:8084 (admin / admin)
- **Mailhog:** http://localhost:8025
- **Application:** http://localhost:3001

---

## Admin

- **Email:** admin@demo.com
- **Password:** admin123
- **Role:** ADMIN

## Organisateurs (tous: organizer123)

1. **Music Events Pro**
   - Email: music.events@demo.com
   - Evenements: 3 concerts/festivals

2. **Sports Manager**
   - Email: sports.manager@demo.com
   - Evenements: 3 evenements sportifs

3. **Tech Conferences Inc**
   - Email: tech.conferences@demo.com
   - Evenements: 2 conferences tech

4. **Culture Events**
   - Email: culture.events@demo.com
   - Evenements: 3 evenements culturels

## Utilisateurs (tous: user123)

1. Alice Martin - alice.martin@demo.com
2. Bob Dubois - bob.dubois@demo.com
3. Claire Bernard - claire.bernard@demo.com
4. David Petit - david.petit@demo.com
5. Emma Durand - emma.durand@demo.com

## Statistiques

- **1** Admin
- **4** Organisateurs
- **5** Utilisateurs
- **11** Evenements
- **8** Commandes

## Demarrage

```powershell
.\docker-manager.ps1 -Action dev
```

Le seed s'execute automatiquement au demarrage.
