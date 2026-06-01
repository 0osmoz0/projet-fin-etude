# Projet fin d’études — Escape game cyber « Angle mort »

Infra **Docker Compose** pour un scénario OSINT / pentest pédagogique : infiltration de l’organisation fictive **Black Tide**, pivot vers un réseau interne (CCTV, alerting terrain, coffre de preuves), et exfiltration du **Dossier OMEGA** pour la cellule **OMEGA**.

> **Usage** : laboratoire local, formation ou démonstration PFE. Toutes les données et organisations sont fictives. Ne pas exposer cette stack sur Internet sans durcissement supplémentaire.

---

## Sommaire

- [Scénario](#scénario)
- [Architecture](#architecture)
- [Prérequis](#prérequis)
- [Démarrage rapide](#démarrage-rapide)
- [Accès exposés](#accès-exposés)
- [Réseau interne et pivot](#réseau-interne-et-pivot)
- [Parcours joueur (résumé)](#parcours-joueur-résumé)
- [Consoles ops (navigateur)](#consoles-ops-navigateur)
- [SSH ops et clé après rebuild](#ssh-ops-et-clé-après-rebuild)
- [Preuves / flags](#preuves--flags)
- [Structure du dépôt](#structure-du-dépôt)
- [Commandes Make](#commandes-make)
- [Documentation](#documentation)
- [CI et qualité](#ci-et-qualité)
- [Feuille de route](#feuille-de-route)
- [Contribution et licence](#contribution-et-licence)

---

## Scénario

**Pitch :** vous êtes l’agent cyber d’une unité discrète. Une équipe terrain doit intervenir sur un site Black Tide ; vous devez préparer l’**angle mort** (flux caméra, fenêtre offline), **couper l’alerting** sur la zone cible, puis **exfiltrer le dossier de preuves** sans détruire l’infrastructure.

| Élément | Détail |
|--------|--------|
| Nom de mission | **ANGLE MORT** |
| Niveau | Débutant → intermédiaire |
| Durée cible | 60–120 min |
| Lore détaillé | [`LORE_ET_SCENARIO_01.md`](LORE_ET_SCENARIO_01.md) |
| Walkthrough technique | [`docs/scenario-attack-paths.md`](docs/scenario-attack-paths.md) |

Chaque étape produit une **preuve** (ligne de flag) vérifiable par les scripts `make smoke` / `make smoke-ssh`.

---

## Architecture

```text
                    public_net                         internal_net (non routable depuis l'hôte)
              ┌─────────────────────┐              ┌──────────────────────────────────┐
  Navigateur  │  Hub OSINT :18080   │              │  CCTV (NVR)      alarm (field)   │
       │      │  Gateway  :18081 ───┼──► pivot ────┼──► vault (coffre OMEGA)          │
       │      │  DVWA (décor lab)   │   dual-homed │     *.8080 HTTP interne only     │
       └──────┤  SSH ops  :2222 ────┘              └──────────────────────────────────┘
```

| Service | Rôle | Réseau | Port hôte |
|---------|------|--------|-----------|
| **hub** | Portail OSINT / indices mission | `public_net` | `${HUB_PORT}` (18080) |
| **blacktide_gateway** | Reverse proxy vers le pivot (vitrine partenaire) | `public_net` | `${PIVOT_PORT}` (18081) |
| **pivot** | Auth-gateway, webshell, relay ops, SSH | `public_net` + `internal_net` | `${PIVOT_SSH_PORT}` (2222) |
| **cctv** | Console NVR / exports cam-3 | `internal_net` uniquement | — |
| **alarm** | Alerting terrain (gate plan CCTV) | `internal_net` uniquement | — |
| **vault** | Dossier OMEGA | `internal_net` uniquement | — |
| **blacktide_vuln** | DVWA (surface d’entraînement optionnelle) | `public_net` | non publié directement |

Le réseau `internal_net` est **`internal: true`** : depuis votre Mac, **impossible** d’atteindre `cctv`, `alarm` ou `vault` sans passer par le **pivot** (shell, relay HTTP, panneaux ops ou tunnel SSH).

---

## Prérequis

- **Docker** et **Docker Compose** v2 (Docker Desktop ou moteur Linux)
- **Make**, **bash**, **curl**
- Ports libres sur la machine hôte (par défaut **18080**, **18081**, **2222**) — vérifiés par `make ports-check`
- Optionnel (développement) : `yamllint`, `hadolint`, `shellcheck`, `actionlint`, `pre-commit`

---

## Démarrage rapide

```bash
git clone https://github.com/0osmoz0/projet-fin-etude.git
cd projet-fin-etude
git checkout develop

cp .env.example .env    # ajuster les ports si besoin
make up                 # build + démarrage
make wait               # attend les healthchecks
make smoke              # valide le parcours relay (foothold → OMEGA)
make smoke-ssh          # valide la voie SSH ops
```

**URLs une fois la stack démarrée :**

| Rôle | URL |
|------|-----|
| Hub OSINT | http://127.0.0.1:18080/ |
| Pivot (gateway Black Tide) | http://127.0.0.1:18081/ |
| Santé auth-gateway | http://127.0.0.1:18081/internal/auth-gateway/v2/health.php |

Arrêt : `make down` — reset complet (volumes) : `make reset-hard`.

---

## Accès exposés

Variables dans [`.env.example`](.env.example) (copiées vers `.env`) :

| Variable | Défaut | Description |
|----------|--------|-------------|
| `PROJECT_NAME` | `pfe-escape` | Préfixe réseau Docker |
| `HUB_PORT` | `18080` | Hub OSINT |
| `PIVOT_PORT` | `18081` | Gateway → pivot |
| `PIVOT_SSH_PORT` | `2222` | SSH utilisateur `ops` sur le pivot |

---

## Réseau interne et pivot

**Règle du scénario :** CCTV, alarm et vault ne sont joignables que depuis le conteneur **pivot** (ou via un mécanisme qui s’appuie sur lui).

| Méthode | Exemple |
|---------|---------|
| **Relay HTTP** (clearance 2) | `ops-relay.php?action=probe&target=cctv&path=...` |
| **Consoles navigateur** | `ops-alarm-panel.php`, `ops-cctv-panel.php` sur `:18081` |
| **Shell sur pivot** | `www-data` (webshell) ou `ops` (SSH) → `curl http://cctv:8080/...` |
| **Port-forward SSH** | Depuis le Mac : `ssh -L 18082:cctv:8080 -p 2222 ops@127.0.0.1` |

Le hub et DVWA servent d’**entrée narrative / OSINT** ; le **foothold** et le **pivot réel** se font sur l’auth-gateway v2 (`/internal/auth-gateway/v2/`).

---

## Parcours joueur (résumé)

Ordre **logique** (plusieurs chemins possibles : web, shell, SSH) :

```text
Hub OSINT  →  Pivot (foothold web/shell)
           →  Relay ops (bind session + upgrade clearance 2)
           →  Alarme : silence cam-3 (débloque le plan terrain)
           →  CCTV : blindspot puis plan cam-3
           →  Vault : exfil Dossier OMEGA  ✓ mission
```

**Indices clés (non exhaustifs) :**

- Incident **BT-AUTH-4421**, opérateur **n.morel**, profil **legacy-mirror**
- Session relay : journal d’audit (`omega/logs/audit` via `render.php?mode=legacy`)
- Clé upgrade : `reverse(BT-AUTH-4421):n.morel` → documentée dans le runbook ops
- Tokens ops : canaux `omega/ops/*-token` (render legacy ou `action=mesh` après clearance 2)

Détail pas à pas, commandes `curl` et variantes : **[`docs/scenario-attack-paths.md`](docs/scenario-attack-paths.md)**.

---

## Consoles ops (navigateur)

Après **bind** + **upgrade** sur le relay (même navigateur pour conserver le cookie de session) :

| Console | Chemin |
|---------|--------|
| Field alerting | http://127.0.0.1:18081/internal/auth-gateway/v2/ops-alarm-panel.php |
| NVR / CCTV | http://127.0.0.1:18081/internal/auth-gateway/v2/ops-cctv-panel.php |
| Relay (CLI texte) | http://127.0.0.1:18081/internal/auth-gateway/v2/ops-relay.php |

1. Lier la session : `ops-relay.php?bind=ops-sess-8842` (valeur dans l’audit log).
2. Upgrade : clé dérivée du runbook (`1442-HTUA-TB:n.morel`).
3. Alarm : silencer la fenêtre **cam3** (token dans `omega/ops/alarm-token`).
4. CCTV : token admin (`omega/ops/cctv-token`) → export blindspot → export plan (si alerting = `armed=no`).

Les services **alarm** et **cctv** ont aussi une UI native sur le réseau interne (utile avec tunnel SSH depuis le Mac).

---

## SSH ops et clé après rebuild

Compte **`ops`** sur le pivot (clé volontairement lisible côté lab : `id_ops.leak`).

**Depuis le Mac** (recommandé après chaque `docker compose up --build pivot`) :

```bash
docker compose exec -T pivot cat /opt/omega/ops/ssh/id_ops.leak > /tmp/id_ops_pivot
chmod 600 /tmp/id_ops_pivot
ssh -t -i /tmp/id_ops_pivot -p 2222 -o StrictHostKeyChecking=no ops@127.0.0.1
```

Exemples une fois en `ops@pivot` :

```bash
curl -fsS 'http://alarm:8080/api/silence.php?token=BT-ALARM-OPS-4421&window=cam3'
curl -fsS 'http://cctv:8080/api/export.php?id=int-cam3-offline&scope=legacy&as=ops'
curl -fsS 'http://vault:8080/api/dossier.php?token=OMEGA-VAULT-SA-4421'
```

**Depuis un reverse shell `www-data` :** ne pas exécuter la clé comme un script ; utiliser `ssh -i '/opt/omega/ops/ssh/id_ops.leak'` avec `HOME=/tmp` et `UserKnownHostsFile=/dev/null`, ou `sudo -u ops ssh ...` (voir runbook / note SSH sur le pivot).

---

## Preuves / flags

| Ordre | Flag (préfixe ou forme) | Où |
|-------|--------------------------|-----|
| 1 | `FOOTHOLD: CASE-2194-A` | Pivot `/opt/omega/proofs/` ou render legacy |
| 2 | `ELEVATION: OPS-CLEARANCE-2` | Relay `action=export&artifact=elevation` |
| 3 | `CCTV: BLINDSPOT-OK-` *timestamp* | Export `int-cam3-offline` (scope legacy) |
| 4 | `ALERT: SILENCED-BT-4421` | Alarm `api/silence.php` |
| 5 | `TERRAIN: CAM3-PLAN-EXPORT-` *hex* | Export `int-cam3-plan` (alarme silencée) |
| 6 | `OMEGA: DOSSIER-OMEGA-SHA256=` *64 hex* | Vault `api/dossier.php` |

Validation automatique : `make smoke` et `make smoke-ssh`.

---

## Structure du dépôt

```text
.
├── docker-compose.yml      # Stack lab (hub, pivot, gateway, internes)
├── Makefile                # up, smoke, lint, …
├── LORE_ET_SCENARIO_01.md  # Lore et intention de design
├── docs/
│   ├── scenario-attack-paths.md  # Walkthrough attaquant
│   ├── devops.md                 # Exploitation / ops stack
│   └── runbook.md                # Exploitation équipe
├── scripts/
│   ├── smoke-test.sh       # Parcours HTTP relay
│   └── smoke-ssh.sh        # Parcours SSH ops
└── services/
    ├── hub/                # OSINT
    ├── pivot/              # Auth-gateway v2, relay, uploads
    ├── blacktide-gateway/  # Nginx → pivot
    ├── cctv/               # NVR interne
    ├── alarm/              # Alerting terrain
    ├── vault/              # Coffre OMEGA
    └── scoreboard/         # Optionnel (non démarré par compose par défaut)
```

Chemins pivot importants :

```text
internal/auth-gateway/v2/
├── ops-relay.php          # Session, upgrade, probe mesh
├── ops-alarm-panel.php    # Console alerting (proxy)
├── ops-cctv-panel.php     # Console NVR (proxy)
├── legacy-upload.php      # Foothold upload
├── render.php             # Mode legacy (indices / preuves)
└── omega/ops/             # runbook, mesh, tokens
```

---

## Commandes Make

```bash
make help          # Liste des cibles
make up            # Démarre la stack
make down          # Arrête
make build         # Rebuild images
make ps / make logs
make smoke         # Tests fumée HTTP (parcours complet relay)
make smoke-ssh     # Tests fumée SSH ops
make test          # up + wait + smoke
make lint          # yamllint, hadolint, shellcheck, actionlint
make reset-hard    # down -v + rebuild (état alarm/CCTV réinitialisé)
```

---

## Documentation

| Document | Contenu |
|----------|---------|
| [`LORE_ET_SCENARIO_01.md`](LORE_ET_SCENARIO_01.md) | Univers, étapes, indices pédagogiques |
| [`docs/scenario-attack-paths.md`](docs/scenario-attack-paths.md) | Voies d’attaque détaillées (web, SSH, tunnels) |
| [`docs/devops.md`](docs/devops.md) | Exploitation Docker, réseaux, CI |
| [`docs/runbook.md`](docs/runbook.md) | Runbook exploitation / démo |
| [`CONTRIBUTING.md`](CONTRIBUTING.md) | Conventions de contribution |
| [`SECURITY.md`](SECURITY.md) | Signalement et périmètre sécurité |

---

## CI et qualité

GitHub Actions (branche `develop`) : build des images, `docker compose config`, smoke tests, linters (YAML, Dockerfile, shell, workflows).

En local :

```bash
make lint
pre-commit install   # optionnel, voir .pre-commit-config.yaml
```

---

## Feuille de route

| Statut | Sujet |
|--------|--------|
| ✅ | Scénario ANGLE MORT v1–v3 (hub, pivot, relay, SSH ops, vault) |
| ✅ | Alarme terrain + gate export plan CCTV |
| ✅ | Consoles ops alarm / CCTV sur la gateway |
| 🔲 | Privesc `ops` → `root` (`ROOT`) — branche prévue `root-lpe` |
| 🔲 | Scoreboard intégré au compose (service présent, non branché par défaut) |
| 🔲 | Hints hub / polish DVWA décoratif |

---

## Contribution et licence

- Contributions : voir [`CONTRIBUTING.md`](CONTRIBUTING.md) et le modèle de PR [`.github/pull_request_template.md`](.github/pull_request_template.md).
- Licence : [`LICENSE`](LICENSE).

**Auteur / contexte :** projet de fin d’études — infrastructure de lab, pas un produit durci pour production.

---

## Dépannage rapide

| Problème | Piste |
|----------|--------|
| Port déjà utilisé | Modifier `HUB_PORT` / `PIVOT_PORT` / `PIVOT_SSH_PORT` dans `.env` |
| `make smoke` échoue | `make reset-hard` puis `make test` |
| SSH `Permission denied` | Réexporter `id_ops.leak` après rebuild pivot (voir ci-dessus) |
| Plan CCTV bloqué | Vérifier `armed=no` sur alarm avant `int-cam3-plan` |
| Reverse shell bizarre | Utiliser les panneaux `:18081` ou SSH ops depuis le Mac |

Pour le détail technique : [`docs/scenario-attack-paths.md`](docs/scenario-attack-paths.md) et [`docs/devops.md`](docs/devops.md).
