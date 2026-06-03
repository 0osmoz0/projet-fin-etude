# Guide DevOps — Projet fin d’étude (escape game)

Ce dépôt suit une approche **infra-as-code** avec validation automatique en CI et commandes locales via `Makefile`.

## Arborescence outillage

| Élément | Rôle |
|--------|------|
| `Makefile` | Commandes quotidiennes (`make up`, `make test`, `make lint`) |
| `docker-compose.yml` | Stack complète, healthchecks, réseau interne isolé |
| `scripts/smoke-test.sh` | Vérifie Hub + Pivot + services internes |
| `scripts/wait-healthy.sh` | Attend le démarrage avant les tests |
| `.github/workflows/ci.yml` | Lint, build, smoke test, scan Trivy |
| `.github/dependabot.yml` | Mises à jour hebdo Actions + images de base |
| `.pre-commit-config.yaml` | Hooks locaux (optionnel) |

## Démarrage rapide

```bash
cp .env.example .env
make up
make wait
make smoke
```

Pipeline locale complète : `make test` (= up + wait + smoke).

## CI (GitHub Actions)

À chaque push/PR vers `main` (et branches `feat/**`, `fix/**`) :

1. **Lint** — validation Compose, yamllint, hadolint, shellcheck, actionlint  
2. **Integration** — `docker compose build`, démarrage, smoke tests  
3. **Security** — Trivy misconfig sur Dockerfiles/Compose + scan des images maison  

Voir le runbook opérationnel : [runbook.md](./runbook.md).

## Bonnes pratiques de contribution

### Branches

- `main` — stable, déployable  
- `feat/*` — fonctionnalités / scénario  
- `fix/*` — correctifs  

### Commits

Messages courts en anglais ou français, préfixe type : `feat(hub):`, `chore(ci):`, `fix(pivot):`.

### Push

**Poussez par petits commits logiques**, pas toute la branche d’un coup :

1. `chore: fondations devops (gitignore, makefile, scripts)`  
2. `ci: workflow github actions`  
3. `docs: runbook et guide devops`  
4. `infra: durcissement compose`  

Cela facilite la review et le rollback.

### Pre-commit (recommandé)

```bash
pip install pre-commit
make pre-commit-install
```

## Sécurité réseau

- `internal_net` est **internal: true** — CCTV, vault, alarm ne sont pas routables depuis l’hôte.  
- Seuls **Hub** (`HUB_PORT`) et **Black Tide gateway** (`PIVOT_PORT`) sont exposés.  
- L’image DVWA est volontairement vulnérable (lab) ; ne pas l’exposer sur Internet sans isolation.

## Dépannage CI

```bash
make config
make lint    # nécessite yamllint, hadolint, shellcheck en local
make test
```

En cas d’échec sur `blacktide_vuln` (healthcheck lent) : augmenter `TIMEOUT` pour `wait-healthy.sh`.
