# Escape Game Cyber — Lore & Scénario 01 (V1)

## Pitch (1 phrase)
Vous êtes l’agent cyber d’une cellule gouvernementale clandestine. Votre mission: infiltrer l’infrastructure d’une organisation criminelle pour **exfiltrer un dossier sensible** et **assister une équipe terrain** (caméras / alarmes) sans faire tomber les systèmes.

## Univers / Lore
- **Agence**: Cellule OMEGA (unité d’appui cyber, opérations discrètes).
- **Adversaire**: *Black Tide*, réseau criminel semi-professionnel (prestataires IT, portails web, infra “bricolée” mais fonctionnelle).
- **Enjeu**: une équipe terrain s’apprête à intervenir. Vous devez préparer “l’angle mort” (CCTV), réduire le risque d’alerte, et récupérer le dossier de preuves.
- **Ton**: réaliste, procédural, peu de “magie” — tout ce qui arrive a un support technique plausible (portails, API, configs, identifiants, journaux).

## Objectif final (succès de mission)
**Exfiltrer le “Dossier OMEGA”** (archive ou enregistrements) et fournir une **preuve vérifiable**.

## Format infra (intention de design)
Réseau type “mini-entreprise”:
- **Public**: 1 point d’entrée (portail exposé).
- **Interne**: services non exposés (CCTV / coffre / supervision).
- **Pivot**: l’accès initial doit permettre un pivot vers l’interne (sans “tout ouvrir”).

## Scénario 01 — “ANGLE MORT”
### Niveau / Durée
- **Niveau cible**: débutant → intermédiaire
- **Durée cible**: 60–120 minutes

### Services / “machines” (4–6, réaliste)
1) **Portail public** (exposé)
   - Rôle: vitrine / portail de contact / dépôt de fichiers (prétexte plausible).
   - Ce service est la **porte d’entrée**.
2) **Hôte pivot** (interne + public)
   - Rôle: serveur applicatif du portail (ou bastion de l’équipe adverse).
   - C’est là qu’on obtient un **shell** puis une **élévation de privilèges**.
3) **CCTV / NVR** (interne)
   - Rôle: console web caméras / export de snapshots (objectif “angle mort”).
4) **Coffre OMEGA** (interne)
   - Rôle: stockage des preuves (archive, exports, base).
5) *(Optionnel V1)* **Supervision / Alarme** (interne)
   - Rôle: “alerting” simple (webhook, règles) pour ajouter une étape “désactiver l’alerte”.

## Progression d’attaque (réaliste HTB, sans kernel exploit)
Chaque étape produit une preuve (artefact) que tu peux vérifier côté admin.

### Étape 1 — Accès initial (web → foothold)
**Objectif joueur**
- Obtenir un premier accès à l’hôte pivot via le service web.

**Mécaniques réalistes possibles (au choix)**
- **Upload** mal filtré (webshell déguisé / extension contournée).
- **LFI** menant à lecture de secrets (clé API, creds) puis RCE via endpoint interne.
- **SSRF** vers un service interne (metadata / admin port) pour récupérer un token puis RCE.

**Résultat attendu**
- Reverse shell (ou commande à distance) en tant que compte applicatif (ex: `www-data`, `app`).

**Preuve / Flag 1 (FOOTHOLD)**
- Un fichier local lisible uniquement depuis le shell, ex:
  - `/opt/omega/proofs/FOOTHOLD.txt`
- Contenu: un identifiant de mission du type `FOOTHOLD: CASE-2194-A`.

**Indice in-universe (soft)**
- Une note sur le portail: “le dépôt de fichiers ‘simplifie’ la vie des opérateurs”.

---

### Étape 2 — Élévation de privilèges “light” (privesc réaliste)
**Objectif joueur**
- Passer du compte applicatif à un compte plus privilégié (idéalement root, ou un compte “ops” donnant accès au pivot interne).

**Mécaniques réalistes possibles (au choix)**
- `sudo` mal configuré (NOPASSWD) sur un binaire détournable (ex: `tar`, `find`, `python`, `vim`, `less`).
- Secrets lisibles (ex: credentials dans `.env`, backups, scripts de déploiement) menant à un compte plus privilégié.
- Permissions de fichiers: clé SSH interne accessible au compte applicatif.
- Cron/script de maintenance modifiable par le compte applicatif (classique mais crédible si mal géré).

**Résultat attendu**
- Accès privilégié (root ou “ops”) + capacité à lire des fichiers réseau/cred internes.

**Preuve / Flag 2 (ELEVATION)**
- `/opt/omega/proofs/ELEVATION.txt`
- Contenu: `ELEVATION: OPS-CLEARANCE-2`.

**Indice in-universe**
- Un “runbook” interne mal protégé mentionne une commande de maintenance (qui trahit la mauvaise pratique).

---

### Étape 3 — Pivot vers le réseau interne
**Objectif joueur**
- Atteindre des services internes non exposés (CCTV / coffre) depuis la machine pivot.

**Mécaniques réalistes possibles (au choix)**
- Tunnel SSH (local port forward) si l’attaquant obtient des creds.
- SOCKS proxy via SSH.
- Pivot via un outil minimal (ex: `chisel`) ou `ssh -D` (selon ce que tu veux autoriser).

**Résultat attendu**
- Accès à la console CCTV interne (HTTP interne) via tunnel.

**Preuve / Flag 3 (CCTV)**
- Sur le service CCTV, récupérer un token / snapshot horodaté:
  - `CCTV: BLINDSPOT-OK-<timestamp>`

**Indice in-universe**
- Une page “status” interne liste les services (CCTV, Vault) uniquement accessible depuis l’interne.

---

### Étape 4 — “Angle mort” CCTV (objectif terrain)
**Objectif joueur**
- Fournir à l’équipe terrain un angle mort: récupérer le plan caméra + confirmer quel flux sera “aveuglé”.

**Mécaniques réalistes (au choix)**
- Accès admin via creds récupérés sur l’hôte pivot.
- Mauvaise gestion de sessions (token réutilisé / endpoint non protégé).
- IDOR sur exports (accès à des snapshots sans authentification forte).

**Résultat attendu**
- Extraction d’un artefact utile (ex: snapshot “Cam-3 offline schedule”, ou “Plan des caméras”).

**Preuve**
- Un identifiant d’export ou hash de l’image/zip.

---

### Étape 5 — Exfiltration du Dossier OMEGA (objectif final)
**Objectif joueur**
- Récupérer le dossier de preuves dans le coffre interne.

**Mécaniques réalistes (au choix)**
- Accès au **Vault** via token/service account trouvé sur pivot.
- Lecture d’un partage interne (SMB/NFS/HTTP interne) depuis le pivot.
- API interne mal protégée (clé dans un fichier de config).

**Preuve / Flag final (OMEGA)**
- Fichier/artefact: `OMEGA: DOSSIER-OMEGA-SHA256=<hash>`
- Le joueur doit fournir le hash (ou un ID unique) comme preuve d’exfiltration.

---

## Indices (système d’aide, 3 niveaux)
### Étape 1 (web)
- **Hint 1**: regardez les fonctionnalités “pratiques” (upload, export, preview).
- **Hint 2**: cherchez un contournement de type extension / MIME / chemins.
- **Hint 3**: l’objectif est d’obtenir une exécution côté serveur (RCE) puis un shell.

### Étape 2 (privesc)
- **Hint 1**: inspectez `sudo -l` et les scripts de maintenance.
- **Hint 2**: cherchez des secrets dans des fichiers de déploiement/config.
- **Hint 3**: exploitez un binaire autorisé par sudo de façon détournée (GTFOBins).

### Étape 3 (pivot)
- **Hint 1**: l’interne n’est pas exposé; il faut un tunnel.
- **Hint 2**: SSH forward (ou SOCKS) suffit pour atteindre HTTP interne.
- **Hint 3**: ciblez d’abord la console CCTV, puis le coffre.

## Notes de réalisme / sécurité (design)
- Préférer des objectifs “preuve à récupérer” (read-only) pour éviter de casser le jeu en réseau partagé.
- Éviter les exploits kernel: privilégier mauvaises configs, secrets, et erreurs d’architecture (plus réaliste et stable).
- Garder tout fictif (noms, adresses, données) mais plausible.

