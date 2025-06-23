# Configuration Docker pour M&C Society - Billetterie

Ce document décrit les modifications apportées à la configuration Docker pour assurer un fonctionnement optimal de l'application.

## Modifications effectuées

### 1. Correction du nom du fichier d'override

- Renommé `docker.compose.override.yml` en `docker-compose.override.yml` pour respecter la convention de nommage standard

### 2. Amélioration des Dockerfiles

#### Dockerfile.dev

```dockerfile
FROM node:slim

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

# Generate Prisma client
RUN npx prisma generate

EXPOSE 3000

# Use a shell to run multiple commands
CMD ["sh", "-c", "npx prisma migrate deploy && npm run dev"]
```

#### Dockerfile.prod

```dockerfile
FROM node:slim AS builder

WORKDIR /app
COPY package*.json ./
RUN npm install

COPY . .
# Generate Prisma client before building
RUN npx prisma generate
RUN npm run build

# --- Runtime image
FROM node:slim
WORKDIR /app

COPY --from=builder /app ./
ENV NODE_ENV=production

RUN npm install --omit=dev
# Generate Prisma client again in the runtime image
RUN npx prisma generate

EXPOSE 3000

# Use a shell to run multiple commands
CMD ["sh", "-c", "npx prisma migrate deploy && npm run start"]
```

### 3. Ajout de healthcheck pour la base de données

Dans `docker-compose.yml`, ajout d'un healthcheck pour le service de base de données :

```yaml
db:
  image: postgres:16
  # ...
  healthcheck:
    test: ["CMD-SHELL", "pg_isready -U postgres"]
    interval: 5s
    timeout: 5s
    retries: 5
```

### 4. Dépendance sur le healthcheck

Les services web et adminer dépendent maintenant de l'état de santé de la base de données :

```yaml
web:
  # ...
  depends_on:
    db:
      condition: service_healthy

adminer:
  # ...
  depends_on:
    db:
      condition: service_healthy
```

### 5. Mise à jour du .dockerignore

Le fichier `.env` n'est plus exclu du build Docker pour permettre l'accès aux variables d'environnement :

```
# Allow .env file to be included in the Docker build
# .env
```

## Utilisation

Pour lancer l'application avec Docker :

```bash
docker-compose up --build
```

L'application sera disponible sur : `http://localhost:3000`
La base de données via Adminer sera disponible sur : `http://localhost:8080`