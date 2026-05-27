# Runbook — Infra Escape Game (Docker Compose)

## Prérequis
- Docker Desktop (ou Docker Engine) + Compose v2
- Fichier `.env` (copie de `.env.example`)
- Depuis la racine du projet (là où se trouve `docker-compose.yml`)

## Démarrer (build + run)
```bash
cp .env.example .env   # une seule fois
make up
# ou : docker compose up -d --build
```

## Valider la stack
```bash
make wait    # attend les healthchecks
make smoke   # HTTP hub + pivot + services internes
make test    # up + wait + smoke
```

## Vérifier que tout tourne
```bash
docker compose ps
```

## Suivre les logs
```bash
docker compose logs -f
```

## Vérifier l’accès (services exposés)
- Hub: `http://localhost:8080`
- Pivot: `http://localhost:8081`

## Arrêter
```bash
docker compose down
```

## Reset soft (redémarrage propre)
Garde l’état des volumes (si tu en ajoutes plus tard).

```bash
docker compose down
docker compose up -d
```

## Reset hard (remise à zéro complète)
Supprime les volumes + l’état persistant (si volumes présents).

```bash
docker compose down -v
docker compose up -d --build
```

## Debug rapide
### Valider la config Compose
```bash
docker compose config
```

### Voir l’état des healthchecks
```bash
docker ps --format 'table {{.Names}}\t{{.Status}}'
# ou
make ps
```

### Lint / config (avant PR)
```bash
make config
make lint
```

Guide complet : [devops.md](./devops.md).

