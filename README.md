# Projet fin d’étude — Escape game cyber

Infra Docker Compose pour un scénario OSINT / pivot / services internes (CCTV, vault, alarm).  
Lore et déroulé : [LORE_ET_SCENARIO_01.md](LORE_ET_SCENARIO_01.md).

## Démarrage rapide

```bash
git clone <url-du-repo>
cd projet-fin-etude
cp .env.example .env
make up
```

- **Hub (OSINT)** : http://localhost:18080 (voir `HUB_PORT` dans `.env`)  
- **Black Tide (pivot public)** : http://localhost:18081 (voir `PIVOT_PORT`)  

Vérification : `make smoke` ou `make test`.

## Documentation

| Doc | Contenu |
|-----|---------|
| [docs/runbook.md](docs/runbook.md) | Opérations Docker (start/stop/reset) |
| [docs/devops.md](docs/devops.md) | CI, Makefile, bonnes pratiques push/branch |
| [CONTRIBUTING.md](CONTRIBUTING.md) | Comment contribuer |

## Stack

| Service | Rôle | Exposé |
|---------|------|--------|
| hub | Portail OSINT | Oui (`8080`) |
| blacktide_gateway + DVWA | Pivot public | Oui (`8081`) |
| pivot | Auth gateway PHP | Interne + pivot réseau |
| cctv, vault, alarm | Services internes | Non (réseau `internal`) |

## DevOps

```bash
make help      # toutes les commandes
make lint      # linters (outils à installer localement)
make test      # up + health + smoke
```

La CI GitHub (`.github/workflows/ci.yml`) reproduit lint + build + smoke à chaque PR.

## Licence

Voir [LICENSE](LICENSE).
