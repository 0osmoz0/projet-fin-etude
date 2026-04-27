const urlBar = document.getElementById("urlBar");
const view = document.getElementById("view");
const translateBtn = document.getElementById("translateBtn");

let language = "fr";

const UI = {
  fr: {
    translate: "Langue: FR",
    startTitle: "Noeud de recherche OSINT",
    startBody:
      "Moteur indexe sur des artefacts operationnels. Priorisez les sources recentes, puis recoupez avec au moins deux familles de preuves.",
    syntax:
      "Syntaxe: recherche libre, phrase exacte \"...\", filtres site:<source> et type:<type>.",
    empty: "Aucun resultat utile. Elargissez la requete ou retirez un filtre trop strict.",
    query: "Requete",
    filters: "Filtres",
    results: "Resultats",
    about: "Environ",
    in: "en",
    seconds: "s",
    reportSummary: "Resume analyste",
    keyFindings: "Constats cles",
    confidence: "Confiance",
    relatedLinks: "Liens associes",
    relatedQueries: "Recherches conseillees",
    backToStart: "Retour au noeud de recherche",
    openDoc: "Ouvrir le document",
    noDoc: "Document introuvable.",
    noQuery: "Requete vide. Utilisez intel://start ou saisissez des mots-cles.",
    quick: "Requetes de demarrage",
  },
  en: {
    translate: "Language: EN",
    startTitle: "OSINT Search Node",
    startBody:
      "Search index built from operational artefacts. Prioritize recent sources, then correlate with at least two evidence families.",
    syntax:
      "Syntax: free search, exact phrase \"...\", filters site:<source> and type:<type>.",
    empty: "No actionable results. Broaden the query or remove a strict filter.",
    query: "Query",
    filters: "Filters",
    results: "Results",
    about: "About",
    in: "in",
    seconds: "s",
    reportSummary: "Analyst summary",
    keyFindings: "Key findings",
    confidence: "Confidence",
    relatedLinks: "Related links",
    relatedQueries: "Suggested searches",
    backToStart: "Back to start node",
    openDoc: "Open document",
    noDoc: "Document not found.",
    noQuery: "Empty query. Use intel://start or enter search terms.",
    quick: "Quick queries",
  },
};

const TYPE_LABELS = {
  fr: {
    forum: "forum",
    incident: "incident",
    memo: "memo",
    runbook: "runbook",
    scan: "scan",
    dns: "dns",
    procurement: "approvisionnement",
    crawl: "crawl",
    report: "rapport",
  },
  en: {
    forum: "forum",
    incident: "incident",
    memo: "memo",
    runbook: "runbook",
    scan: "scan",
    dns: "dns",
    procurement: "procurement",
    crawl: "crawl",
    report: "report",
  },
};

const DOCS = [
  {
    id: "inc-bt-auth-4421",
    uri: "intel://incident/bt-auth-4421",
    source: "incident_registry",
    type: "incident",
    date: "2026-04-24T03:11:00Z",
    tags: ["bt-auth-4421", "mirror", "auth-gateway", "critical"],
    confidence: "high",
    title: {
      fr: "Fiche incident BT-AUTH-4421",
      en: "Incident card BT-AUTH-4421",
    },
    summary: {
      fr: "Incident de reference sur le portail partenaire. Le declenchement est lie au mode mirror=legacy et a un selecteur de template.",
      en: "Reference incident on the partner portal. Trigger is linked to mirror=legacy and a template selector.",
    },
    findings: {
      fr: [
        "Reference operationnelle confirmee: BT-AUTH-4421.",
        "Surface touchee: fallback /internal/auth-gateway/v2.",
        "Le profil legacy-mirror est cite dans la chronologie corrective.",
      ],
      en: [
        "Operational reference confirmed: BT-AUTH-4421.",
        "Impacted surface: fallback /internal/auth-gateway/v2.",
        "legacy-mirror profile appears in corrective timeline.",
      ],
    },
    body: {
      fr:
        "Le rapport de crise indique que le flux partenaire bascule encore vers un parseur legacy en cas de degradation.\n\nLes controles de securite cote fallback restent partiels tant que le profil de compatibilite n'est pas retire.\n\nLa cellule recommande de corriger en priorite les routes exposees par le miroir d'authentification.",
      en:
        "The crisis report states the partner flow still falls back to a legacy parser during degraded mode.\n\nFallback-side controls remain partial until the compatibility profile is removed.\n\nThe team recommends prioritizing remediation on auth mirror exposed routes.",
    },
    relatedQueries: ["legacy-mirror timeline", "auth-gateway fallback", "n.morel operations"],
    relatedDocIds: ["relay-profile-map", "dns-partner-fallback", "robots-archive"],
  },
  {
    id: "relay-profile-map",
    uri: "intel://relay/profile-map",
    source: "relay_memo",
    type: "memo",
    date: "2026-04-24T04:30:00Z",
    tags: ["legacy-mirror", "relay", "project", "ops"],
    confidence: "medium-high",
    title: {
      fr: "Cartographie des profils relay",
      en: "Relay profile map",
    },
    summary: {
      fr: "Le profil interne actif est legacy-mirror. Il alimente a la fois le fallback auth-gateway et certains exports CCTV.",
      en: "Active internal profile is legacy-mirror. It feeds both auth fallback and selected CCTV exports.",
    },
    findings: {
      fr: [
        "Nom de projet interne actif: legacy-mirror.",
        "Usage transversal: auth gateway + chaines export CCTV.",
        "Mode compatibilite uniquement, mais encore en production.",
      ],
      en: [
        "Active internal project name: legacy-mirror.",
        "Cross-usage: auth gateway + CCTV export chain.",
        "Compatibility mode only, still in production.",
      ],
    },
    body: {
      fr:
        "Le memo technique confirme que le profil legacy-mirror sert de rustine operationnelle pendant les fenetres de charge.\n\nLes analystes notent que ce profil a ete conserve pour des raisons de continuites partenaires, au prix d'une reduction de robustesse sur les controles d'entree.\n\nPlusieurs incidents recents y font explicitement reference.",
      en:
        "Technical memo confirms legacy-mirror is used as an operational patch during load windows.\n\nAnalysts note it was retained for partner continuity, reducing input-control robustness.\n\nSeveral recent incidents explicitly reference it.",
    },
    relatedQueries: ["incident bt-auth-4421", "cctv export legacy", "deploy window 02:00"],
    relatedDocIds: ["ops-deploy-window", "inc-bt-auth-4421"],
  },
  {
    id: "ops-deploy-window",
    uri: "intel://runbook/deploy-cadence",
    source: "ops_dump",
    type: "runbook",
    date: "2026-04-24T02:03:00Z",
    tags: ["window", "02:00-03:00", "n.morel", "deploy"],
    confidence: "high",
    title: {
      fr: "Runbook ops: cadence de deploiement",
      en: "Ops runbook: deployment cadence",
    },
    summary: {
      fr: "Fenetre d'action recurrente 02:00-03:00 UTC. Les changements urgents sont attribues au relais n.morel.",
      en: "Recurring action window 02:00-03:00 UTC. Urgent changes routed to n.morel relay.",
    },
    findings: {
      fr: [
        "Fenetre temporelle validee: 02:00-03:00 UTC.",
        "Operateur de relais privilegie: n.morel.",
        "Rollback standard lie a legacy-mirror.",
      ],
      en: [
        "Validated window: 02:00-03:00 UTC.",
        "Privileged relay operator: n.morel.",
        "Standard rollback linked to legacy-mirror.",
      ],
    },
    body: {
      fr:
        "Le runbook mentionne une politique de deploiement volontairement concentree entre 02:00 et 03:00 UTC afin de reduire la visibilite externe.\n\nLes interventions d'urgence passent par un noeud relai identifie comme n.morel.\n\nLa procedure de retour arriere cite explicitement le profil legacy-mirror.",
      en:
        "Runbook describes a deployment policy intentionally concentrated between 02:00 and 03:00 UTC to reduce external visibility.\n\nEmergency interventions go through relay node n.morel.\n\nRollback procedure explicitly cites legacy-mirror profile.",
    },
    relatedQueries: ["n.morel forum", "legacy-mirror rollback", "incident timeline 24 april"],
    relatedDocIds: ["forum-7782", "relay-profile-map"],
  },
  {
    id: "forum-7782",
    uri: "intel://forum/7782",
    source: "bt_forum_mirror",
    type: "forum",
    date: "2026-04-23T02:17:00Z",
    tags: ["forum", "n.morel", "window", "coordination"],
    confidence: "medium",
    title: {
      fr: "Capture forum #7782 (miroir recent)",
      en: "Forum scrape #7782 (recent mirror)",
    },
    summary: {
      fr: "Des messages de coordination recoupent l'alias n.morel et une activite dense pendant 02:00-03:00 UTC.",
      en: "Coordination messages cross-reference alias n.morel and heavy activity during 02:00-03:00 UTC.",
    },
    findings: {
      fr: [
        "Alias observe de maniere repetee: n.morel.",
        "Concentration d'activite autour de la fenetre nocturne.",
        "References implicites a un fallback partenaire.",
      ],
      en: [
        "Repeated observed alias: n.morel.",
        "Activity concentration around night window.",
        "Implicit references to partner fallback.",
      ],
    },
    body: {
      fr:
        "La capture forum reste une source secondaire mais utile pour valider le tempo operationnel.\n\nLe ton des echanges suggere une routine de maintenance clandestine et des bascules preparees a l'avance.\n\nLes elements convergent avec le runbook ops, sans le remplacer comme source primaire.",
      en:
        "Forum capture remains a secondary source but useful for validating operational tempo.\n\nMessage tone suggests clandestine maintenance routine and pre-planned failovers.\n\nSignals converge with ops runbook, without replacing it as primary source.",
    },
    relatedQueries: ["runbook deploy cadence", "mirror fallback partner", "incident bt-auth-4421"],
    relatedDocIds: ["ops-deploy-window", "inc-bt-auth-4421"],
  },
  {
    id: "forum-5511",
    uri: "intel://forum/5511",
    source: "bt_forum_mirror",
    type: "forum",
    date: "2026-03-02T11:42:00Z",
    tags: ["forum", "decoy", "stale", "n.moreau"],
    confidence: "low",
    title: {
      fr: "Archive forum #5511 (obsolescent)",
      en: "Forum archive #5511 (stale)",
    },
    summary: {
      fr: "Archive ancienne qui cite n.moreau et une fenetre 00:00-01:00 UTC. Les analystes la classent comme potentiellement trompeuse.",
      en: "Old archive mentioning n.moreau and 00:00-01:00 UTC window. Analysts classify it as potentially misleading.",
    },
    findings: {
      fr: [
        "Alias divergent: n.moreau.",
        "Fenetre temporelle non coherente avec les traces recentes.",
        "Document conserve comme leurre historique.",
      ],
      en: [
        "Divergent alias: n.moreau.",
        "Time window not consistent with recent traces.",
        "Kept as historical decoy material.",
      ],
    },
    body: {
      fr:
        "Cette archive est volontairement maintenue dans l'index pour reproduire le bruit d'une collecte OSINT reelle.\n\nElle ne doit pas etre utilisee seule pour une conclusion operative.\n\nLe protocole recommande de la declasser face a tout artefact date du 24 avril.",
      en:
        "This archive is intentionally kept in index to emulate real OSINT noise.\n\nIt should not be used alone for operational conclusions.\n\nProtocol recommends downgrading it against any April 24 artefact.",
    },
    relatedQueries: ["n.morel window", "recent incident registry", "ops runbook 24 april"],
    relatedDocIds: ["ops-deploy-window", "inc-bt-auth-4421"],
  },
  {
    id: "dns-partner-fallback",
    uri: "intel://dns/partner-fallback",
    source: "passive_dns",
    type: "dns",
    date: "2026-04-24T16:18:00Z",
    tags: ["dns", "path", "auth-gateway", "fallback"],
    confidence: "medium-high",
    title: {
      fr: "Indice DNS passif: fallback partenaire",
      en: "Passive DNS clue: partner fallback",
    },
    summary: {
      fr: "Annotations de resolvers indiquant la route /internal/auth-gateway/v2 comme chemin de secours.",
      en: "Resolver annotations indicating /internal/auth-gateway/v2 as fallback path.",
    },
    findings: {
      fr: [
        "Chemin confirme: /internal/auth-gateway/v2.",
        "Source non intrusive, utile pour reconnaissance passive.",
        "A recouper avec robots archive et fiches incident.",
      ],
      en: [
        "Confirmed path: /internal/auth-gateway/v2.",
        "Non-intrusive source useful for passive recon.",
        "Cross-check with robots archive and incident cards.",
      ],
    },
    body: {
      fr:
        "Le signal DNS ne prouve pas a lui seul une vulnérabilité, mais il fournit une piste d'exposition fonctionnelle.\n\nLa repetition de ce chemin dans des sources distinctes renforce sa credibilite.\n\nLe niveau de confiance passe a eleve lorsqu'il est recoupe avec BT-AUTH-4421.",
      en:
        "DNS signal alone does not prove a vulnerability, but it provides functional exposure lead.\n\nPath repetition across independent sources strengthens credibility.\n\nConfidence rises to high when correlated with BT-AUTH-4421.",
    },
    relatedQueries: ["robots auth-gateway", "bt-auth-4421 fallback", "legacy mirror path"],
    relatedDocIds: ["robots-archive", "inc-bt-auth-4421"],
  },
  {
    id: "stack-edge-fingerprint",
    uri: "intel://fingerprint/portal-edge",
    source: "header_capture",
    type: "scan",
    date: "2026-04-24T05:55:00Z",
    tags: ["stack", "nginx", "php-fpm", "partner-module"],
    confidence: "medium-high",
    title: {
      fr: "Empreinte edge du portail partenaire",
      en: "Partner portal edge fingerprint",
    },
    summary: {
      fr: "Pile technique observee: nginx/1.27 + php-fpm (legacy partner module). Donnee coherent avec le fallback legacy.",
      en: "Observed stack: nginx/1.27 + php-fpm (legacy partner module). Consistent with legacy fallback behavior.",
    },
    findings: {
      fr: [
        "Stack attendue pour validation: nginx/1.27 + php-fpm.",
        "Mention explicite du module legacy partner.",
        "Les traces apache sont referencees comme anciennes.",
      ],
      en: [
        "Validation stack: nginx/1.27 + php-fpm.",
        "Explicit mention of legacy partner module.",
        "Apache traces marked as outdated.",
      ],
    },
    body: {
      fr:
        "Le fingerprint HTTP est issu d'une capture passive appliquee au frontal partenaire.\n\nLa combinaison nginx + php-fpm apparait stable sur la periode d'observation.\n\nLa note analytique recommande d'ignorer les captures historiques non datees ou pre-migration.",
      en:
        "HTTP fingerprint comes from passive capture on partner edge.\n\nnginx + php-fpm combination remains stable over observation period.\n\nAnalytical note recommends ignoring undated or pre-migration historical captures.",
    },
    relatedQueries: ["apache deprecated header", "legacy partner module", "incident auth stack"],
    relatedDocIds: ["stack-old-sample", "inc-bt-auth-4421"],
  },
  {
    id: "stack-old-sample",
    uri: "intel://fingerprint/deprecated",
    source: "header_capture",
    type: "scan",
    date: "2026-02-18T13:09:00Z",
    tags: ["apache", "obsolete", "decoy", "history"],
    confidence: "low",
    title: {
      fr: "Echantillon d'en-tete obsolete",
      en: "Deprecated header sample",
    },
    summary: {
      fr: "Trace ancienne apache/2.4 conservee pour contexte historique. Non fiable pour la campagne en cours.",
      en: "Old apache/2.4 trace kept for historical context. Not reliable for current campaign.",
    },
    findings: {
      fr: [
        "Horodatage antérieur a la migration.",
        "Peut induire de faux positifs de stack.",
        "A classer comme bruit historique.",
      ],
      en: [
        "Timestamp predates migration.",
        "Can induce stack false positives.",
        "Should be classified as historical noise.",
      ],
    },
    body: {
      fr:
        "La presence de cet echantillon simule les contradictions habituelles d'un environnement OSINT realiste.\n\nIl reste utile pour illustrer l'evolution de l'infrastructure, pas pour valider l'etat courant.\n\nLe score de confiance est volontairement bas.",
      en:
        "This sample simulates common contradictions of realistic OSINT environments.\n\nUseful to illustrate infrastructure evolution, not to validate current state.\n\nConfidence score is intentionally low.",
    },
    relatedQueries: ["nginx php-fpm current", "date:2026-04 stack", "partner edge fingerprint"],
    relatedDocIds: ["stack-edge-fingerprint"],
  },
  {
    id: "directory-pattern-current",
    uri: "intel://directory/pattern-update",
    source: "directory_sync",
    type: "memo",
    date: "2026-04-22T19:48:00Z",
    tags: ["email", "identity", "blacktide-corp.tld", "pattern"],
    confidence: "high",
    title: {
      fr: "Mise a jour annuaire: format d'email interne",
      en: "Directory update: internal email format",
    },
    summary: {
      fr: "Format actif valide: prenom.nom@blacktide-corp.tld. Les alias legacy existent mais ne servent pas a la validation.",
      en: "Active validated format: prenom.nom@blacktide-corp.tld. Legacy aliases exist but are not mission-valid.",
    },
    findings: {
      fr: [
        "Pattern de validation: prenom.nom@blacktide-corp.tld.",
        "Alias secondaires encore visibles en historique.",
        "Le memo indique explicitement le format a retenir.",
      ],
      en: [
        "Validation pattern: prenom.nom@blacktide-corp.tld.",
        "Secondary aliases still visible in historical data.",
        "Memo explicitly states which format to keep.",
      ],
    },
    body: {
      fr:
        "Le changement de domaine a ete finalise mais les artefacts anciens restent indexables.\n\nLa cellule identite recommande de ne pas utiliser les seeds pre-migration pour eviter les erreurs de ciblage.\n\nLe format actuel est etabli comme standard unique de validation.",
      en:
        "Domain migration was finalized but old artefacts remain indexable.\n\nIdentity team recommends avoiding pre-migration seeds to reduce targeting errors.\n\nCurrent format is established as unique validation standard.",
    },
    relatedQueries: ["legacy seed email", "target user n.morel", "identity sync april"],
    relatedDocIds: ["directory-legacy-seed", "forum-7782"],
  },
  {
    id: "directory-legacy-seed",
    uri: "intel://directory/legacy-seed",
    source: "directory_sync",
    type: "memo",
    date: "2025-12-14T10:12:00Z",
    tags: ["email", "legacy", "decoy", "pre-migration"],
    confidence: "low",
    title: {
      fr: "Seed annuaire legacy (pre-migration)",
      en: "Legacy directory seed (pre-migration)",
    },
    summary: {
      fr: "Ancien format first.last@blacktide.local. Utile comme leurre historique, non conforme a l'etat actuel.",
      en: "Old format first.last@blacktide.local. Useful as historical decoy, not current-state compliant.",
    },
    findings: {
      fr: [
        "Format non valide pour la mission.",
        "Document conserve a des fins d'archive.",
        "Confiance faible pour analyses en temps reel.",
      ],
      en: [
        "Format is not mission-valid.",
        "Document retained for archival context.",
        "Low confidence for real-time analysis.",
      ],
    },
    body: {
      fr:
        "Ce seed correspond a un annuaire exporte avant la normalisation du domaine principal.\n\nIl peut tromper une collecte superficielle en donnant des identifiants plausibles mais inexploitables.\n\nA declasser systematiquement face aux memos 2026.",
      en:
        "This seed corresponds to directory export before primary-domain standardization.\n\nIt can mislead shallow collection with plausible but unusable identifiers.\n\nShould be systematically downgraded against 2026 memos.",
    },
    relatedQueries: ["prenom.nom blacktide-corp.tld", "identity update april", "n.morel account pattern"],
    relatedDocIds: ["directory-pattern-current"],
  },
  {
    id: "proc-bt-sup-4421",
    uri: "intel://procurement/bt-sup-4421",
    source: "vendor_exchange_dump",
    type: "procurement",
    date: "2026-04-20T09:10:00Z",
    tags: ["bt-sup-4421", "supplier", "cctv", "lot"],
    confidence: "medium-high",
    title: {
      fr: "Extrait approvisionnement: lot BT-SUP-4421",
      en: "Procurement extract: lot BT-SUP-4421",
    },
    summary: {
      fr: "Le lot BT-SUP-4421 est associe aux flux de maintenance videosurveillance. Le nom legal du fournisseur est masque dans l'extrait.",
      en: "Lot BT-SUP-4421 is linked to CCTV maintenance flows. Supplier legal name is redacted in this extract.",
    },
    findings: {
      fr: [
        "Reference fournisseur exploitable: BT-SUP-4421.",
        "Perimetre: maintenance relay + handoff exports camera.",
        "Nom de prestataire non publie dans cette source.",
      ],
      en: [
        "Actionable supplier reference: BT-SUP-4421.",
        "Scope: relay maintenance + camera export handoff.",
        "Provider name not published in this source.",
      ],
    },
    body: {
      fr:
        "Le document procure un identifiant lot robuste, suffisant pour lier les traces techniques au volet contractuel.\n\nLe masquage de la contrepartie est coherent avec une politique de cloisonnement fournisseurs.\n\nDans ce scenario, BT-SUP-4421 doit etre considere comme cle de recoupement principale.",
      en:
        "Document provides a robust lot identifier, enough to link technical traces to contractual layer.\n\nCounterparty redaction matches compartmentalized supplier policy.\n\nIn this scenario, BT-SUP-4421 should be treated as main correlation key.",
    },
    relatedQueries: ["cctv supplier lot", "export handoff relay", "vendor maintenance black tide"],
    relatedDocIds: ["cctv-audit-brief", "relay-profile-map"],
  },
  {
    id: "cctv-audit-brief",
    uri: "intel://report/cctv-handoff-audit",
    source: "audit_cell",
    type: "report",
    date: "2026-04-25T00:44:00Z",
    tags: ["cctv", "handoff", "legacy", "bt-sup-4421"],
    confidence: "medium",
    title: {
      fr: "Audit express: chaine de handoff CCTV",
      en: "Rapid audit: CCTV handoff chain",
    },
    summary: {
      fr: "Le lot BT-SUP-4421 apparait dans les traces de maintenance et recoupe les profils legacy utilises en mode degrade.",
      en: "Lot BT-SUP-4421 appears in maintenance traces and correlates with legacy profiles used in degraded mode.",
    },
    findings: {
      fr: [
        "Recoupement lot BT-SUP-4421 avec flux CCTV.",
        "Presence de profils legacy dans les chemins d'export.",
        "Risque accru pendant les fenetres de maintenance.",
      ],
      en: [
        "BT-SUP-4421 lot correlated with CCTV flows.",
        "Legacy profiles present in export paths.",
        "Elevated risk during maintenance windows.",
      ],
    },
    body: {
      fr:
        "L'audit relie le volet videosurveillance aux memes compromis de compatibilite que ceux observes sur auth-gateway.\n\nCette convergence renforce l'hypothese d'un modele operationnel commun, base sur des bascules legacy temporaires mais frequentes.\n\nLe rapport recommande de surveiller en priorite les handoffs pendant 02:00-03:00 UTC.",
      en:
        "Audit links CCTV layer to same compatibility compromises observed on auth-gateway.\n\nThis convergence strengthens hypothesis of common operational model based on temporary yet frequent legacy failovers.\n\nReport recommends prioritizing handoff monitoring during 02:00-03:00 UTC.",
    },
    relatedQueries: ["bt-sup-4421", "legacy cctv export", "maintenance window"],
    relatedDocIds: ["proc-bt-sup-4421", "ops-deploy-window"],
  },
  {
    id: "robots-archive",
    uri: "intel://crawl/robots-archive",
    source: "crawler",
    type: "crawl",
    date: "2026-04-24T06:10:00Z",
    tags: ["robots", "internal", "auth-gateway", "path"],
    confidence: "medium",
    title: {
      fr: "Archive robots: chemins internes exposes",
      en: "Robots archive: exposed internal paths",
    },
    summary: {
      fr: "Les directives disallow confirment la presence de /internal/auth-gateway/v2 et ses sous-chemins.",
      en: "Disallow directives confirm /internal/auth-gateway/v2 and subpaths.",
    },
    findings: {
      fr: [
        "Chemin internal/auth-gateway/v2 visible indirectement.",
        "Source utile en reconnaissance passive.",
        "A recouper avec incident registry pour eviter les faux positifs.",
      ],
      en: [
        "Path internal/auth-gateway/v2 indirectly visible.",
        "Useful passive recon source.",
        "Cross-check with incident registry to avoid false positives.",
      ],
    },
    body: {
      fr:
        "Le fichier robots n'accorde pas d'acces, mais il signale souvent des zones jugées sensibles.\n\nDans ce cas, la repetition des memes segments de chemin dans plusieurs sources augmente nettement la valeur probante.\n\nLe document n'est pas suffisant seul, mais il devient decisif dans une chaine de recoupement.",
      en:
        "robots file does not grant access, but often signals sensitive zones.\n\nHere, repeated path segments across multiple sources significantly increase evidential value.\n\nDocument is not enough alone, but becomes decisive in a correlation chain.",
    },
    relatedQueries: ["site:crawler auth-gateway", "incident fallback path", "dns partner fallback"],
    relatedDocIds: ["dns-partner-fallback", "inc-bt-auth-4421"],
  },
  {
    id: "local-port-note",
    uri: "intel://ops/local-exposure",
    source: "ops_note",
    type: "note",
    date: "2026-04-25T08:02:00Z",
    tags: ["8081", "partner", "bonus", "lab"],
    confidence: "medium",
    title: {
      fr: "Note ops: exposition locale environnement lab",
      en: "Ops note: local lab exposure",
    },
    summary: {
      fr: "Le portail partenaire est mappe en local sur 8081, tandis que le hub reste sur 8080 pour le briefing.",
      en: "Partner portal is locally mapped to 8081 while hub remains on 8080 for briefing.",
    },
    findings: {
      fr: [
        "Port bonus attendu: 8081.",
        "Port hub briefing/validation: 8080.",
        "Information specifique a l'environnement d'entrainement.",
      ],
      en: [
        "Expected bonus port: 8081.",
        "Hub briefing/validation port: 8080.",
        "Info specific to training environment.",
      ],
    },
    body: {
      fr:
        "La note n'est pas une preuve d'infrastructure cible, mais un repere de cartographie locale pour l'equipe de simulation.\n\nElle aide a distinguer les surfaces narratives (hub) des surfaces techniques (partner/pivot).\n\nA utiliser comme indice secondaire dans la validation.",
      en:
        "Note is not target-infrastructure proof, but local mapping reference for simulation team.\n\nIt helps separate narrative surfaces (hub) from technical surfaces (partner/pivot).\n\nUse as secondary hint during validation.",
    },
    relatedQueries: ["port partenaire local", "hub 8080", "pivot 8081"],
    relatedDocIds: ["inc-bt-auth-4421"],
  },
];

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;");
}

function t(key) {
  return UI[language][key];
}

function displayType(type) {
  return TYPE_LABELS[language][type] || type;
}

function localizeText(fieldObj) {
  if (!fieldObj) return "";
  return fieldObj[language] || fieldObj.fr || fieldObj.en || "";
}

function refreshTranslateButton() {
  translateBtn.textContent = language === "fr" ? "Langue: FR" : "Language: EN";
}

function extractPhrase(query) {
  const match = query.match(/\"([^\"]+)\"/);
  return match ? match[1].toLowerCase() : "";
}

function parseQuery(rawQuery) {
  const query = rawQuery.trim().toLowerCase();
  const phrase = extractPhrase(query);
  const tokens = query.replace(/\"([^\"]+)\"/g, " ").split(/\s+/).filter(Boolean);

  const parsed = { raw: query, phrase: phrase, site: "", type: "", terms: [] };
  tokens.forEach(function (token) {
    if (token.startsWith("site:")) {
      parsed.site = token.slice(5);
      return;
    }
    if (token.startsWith("type:")) {
      parsed.type = token.slice(5);
      return;
    }
    parsed.terms.push(token);
  });
  return parsed;
}

function scoreDoc(doc, parsed) {
  if (parsed.site && !doc.source.includes(parsed.site)) return -1;
  if (parsed.type && doc.type !== parsed.type) return -1;

  const title = localizeText(doc.title).toLowerCase();
  const summary = localizeText(doc.summary).toLowerCase();
  const body = localizeText(doc.body).toLowerCase();
  const findings = localizeText({ fr: (doc.findings.fr || []).join(" "), en: (doc.findings.en || []).join(" ") }).toLowerCase();
  const tags = doc.tags.join(" ").toLowerCase();
  const haystack = `${title} ${summary} ${body} ${findings} ${tags} ${doc.id}`.toLowerCase();

  let score = 0;
  if (parsed.phrase && haystack.includes(parsed.phrase)) score += 12;

  parsed.terms.forEach(function (term) {
    if (title.includes(term)) score += 7;
    if (summary.includes(term)) score += 5;
    if (body.includes(term)) score += 3;
    if (findings.includes(term)) score += 4;
    if (tags.includes(term)) score += 3;
    if (doc.id.includes(term)) score += 1;
  });

  score += Math.floor(new Date(doc.date).getTime() / 100000000000);
  if (doc.confidence === "high") score += 4;
  if (doc.confidence === "medium-high") score += 2;
  if (doc.confidence === "low") score -= 2;
  return score;
}

function searchDocs(rawQuery) {
  const parsed = parseQuery(rawQuery);
  const started = performance.now();

  const scored = DOCS.map(function (doc) {
    return { doc: doc, score: scoreDoc(doc, parsed) };
  }).filter(function (row) {
    if (row.score < 0) return false;
    if (!parsed.terms.length && !parsed.phrase) return true;
    return row.score > 0;
  });

  scored.sort(function (a, b) {
    if (b.score !== a.score) return b.score - a.score;
    return new Date(b.doc.date) - new Date(a.doc.date);
  });

  const elapsed = (performance.now() - started + 3) / 1000;
  return {
    parsed: parsed,
    results: scored.slice(0, 10).map(function (row) { return row.doc; }),
    total: scored.length,
    elapsed: elapsed.toFixed(2),
  };
}

function renderRelatedLinks(doc) {
  const linkedDocs = doc.relatedDocIds
    .map(function (id) { return DOCS.find(function (entry) { return entry.id === id; }); })
    .filter(Boolean)
    .slice(0, 3)
    .map(function (linkedDoc) {
      return `<a href="#" data-doc-id="${escapeHtml(linkedDoc.id)}">${escapeHtml(localizeText(linkedDoc.title))}</a>`;
    })
    .join(" · ");

  const linkedQueries = (doc.relatedQueries || [])
    .slice(0, 3)
    .map(function (query) {
      return `<a href="#" data-query="${escapeHtml(query)}">${escapeHtml(query)}</a>`;
    })
    .join(" · ");

  return `
    <p><strong>${t("relatedLinks")}:</strong> ${linkedDocs || "-"}</p>
    <p><strong>${t("relatedQueries")}:</strong> ${linkedQueries || "-"}</p>
  `;
}

function renderDoc(docId) {
  const doc = DOCS.find(function (item) { return item.id === docId; });
  if (!doc) {
    view.innerHTML = `<p>${escapeHtml(t("noDoc"))}</p>`;
    return;
  }

  const findings = (doc.findings[language] || []).map(function (line) {
    return `<li>${escapeHtml(line)}</li>`;
  }).join("");

  const confidenceLabel = doc.confidence === "medium-high"
    ? (language === "fr" ? "moyenne-haute" : "medium-high")
    : doc.confidence;

  view.innerHTML = `
    <article>
      <p>${escapeHtml(doc.source)} · ${escapeHtml(displayType(doc.type))} · ${escapeHtml(doc.date)}</p>
      <h2>${escapeHtml(localizeText(doc.title))}</h2>
      <p>${escapeHtml(doc.uri)}</p>
      <p><strong>${t("reportSummary")}:</strong> ${escapeHtml(localizeText(doc.summary))}</p>
      <p><strong>${t("confidence")}:</strong> ${escapeHtml(confidenceLabel)}</p>
      <p>${escapeHtml(localizeText(doc.body))}</p>
      <p><strong>${t("keyFindings")}:</strong></p>
      <ul>${findings}</ul>
      ${renderRelatedLinks(doc)}
      <p><a href="#" data-url="intel://start">${t("backToStart")}</a></p>
    </article>
  `;
}

function renderSearch(rawQuery) {
  const search = searchDocs(rawQuery);
  const parsed = search.parsed;
  const queryLabel = escapeHtml(rawQuery.trim());
  const activeFilters = [parsed.site ? `site:${parsed.site}` : "", parsed.type ? `type:${parsed.type}` : ""]
    .filter(Boolean)
    .join(" ");

  if (!search.results.length) {
    view.innerHTML = `
      <h2>${t("results")}</h2>
      <p><strong>${t("query")}:</strong> ${queryLabel || "(vide)"}</p>
      <p>${t("empty")}</p>
    `;
    return;
  }

  const cards = search.results.map(function (doc) {
    const findings = (doc.findings[language] || []).slice(0, 2).map(function (line) {
      return `<li>${escapeHtml(line)}</li>`;
    }).join("");

    const related = (doc.relatedQueries || []).slice(0, 2).map(function (query) {
      return `<a href="#" data-query="${escapeHtml(query)}">${escapeHtml(query)}</a>`;
    }).join(" · ");

    return `
      <article>
        <p>${escapeHtml(doc.source)} · ${escapeHtml(displayType(doc.type))} · ${escapeHtml(doc.date)}</p>
        <h3><a href="#" data-doc-id="${escapeHtml(doc.id)}">${escapeHtml(localizeText(doc.title))}</a></h3>
        <p>${escapeHtml(doc.uri)}</p>
        <p><strong>${t("reportSummary")}:</strong> ${escapeHtml(localizeText(doc.summary))}</p>
        <p><strong>${t("keyFindings")}:</strong></p>
        <ul>${findings}</ul>
        <p><strong>${t("relatedQueries")}:</strong> ${related || "-"}</p>
      </article>
      <hr>
    `;
  }).join("");

  view.innerHTML = `
    <section>
      <h2>${t("results")}</h2>
      <p><strong>${t("query")}:</strong> ${queryLabel || "(vide)"}</p>
      <p><strong>${t("filters")}:</strong> ${activeFilters || "none"} · <strong>${t("results")}:</strong> ${search.total}</p>
      <p>${t("about")} ${search.total} ${t("results")} ${t("in")} ${search.elapsed}${t("seconds")}</p>
      <hr>
      ${cards}
    </section>
  `;
}

function renderStart() {
  view.innerHTML = `
    <section>
      <h2>${t("startTitle")}</h2>
      <p>${t("startBody")}</p>
      <p>${t("syntax")}</p>
      <p><strong>${t("quick")}:</strong></p>
      <p>
        <a href="#" data-query="incident auth-gateway 4421">incident auth-gateway 4421</a> ·
        <a href="#" data-query="n.morel window">n.morel window</a> ·
        <a href="#" data-query="type:scan nginx php-fpm">type:scan nginx php-fpm</a> ·
        <a href="#" data-query="email pattern blacktide-corp">email pattern blacktide-corp</a> ·
        <a href="#" data-query="supplier bt-sup-4421 cctv">supplier bt-sup-4421 cctv</a>
      </p>
    </section>
  `;
}

function navigate(rawInput) {
  const query = rawInput.trim();
  urlBar.value = query;

  if (!query) {
    view.innerHTML = `<p>${escapeHtml(t("noQuery"))}</p>`;
    return;
  }

  const lowered = query.toLowerCase();
  if (lowered === "intel://start" || lowered === "intel://help") {
    renderStart();
    return;
  }

  if (lowered.startsWith("doc://")) {
    renderDoc(lowered.slice(6));
    return;
  }

  renderSearch(query);
}

view.addEventListener("click", function (event) {
  const docLink = event.target.closest("a[data-doc-id]");
  if (docLink) {
    event.preventDefault();
    navigate(`doc://${docLink.dataset.docId}`);
    return;
  }

  const queryLink = event.target.closest("a[data-query]");
  if (queryLink) {
    event.preventDefault();
    navigate(queryLink.dataset.query);
    return;
  }

  const urlLink = event.target.closest("a[data-url]");
  if (urlLink) {
    event.preventDefault();
    navigate(urlLink.dataset.url);
  }
});

urlBar.addEventListener("keydown", function (event) {
  if (event.key !== "Enter") return;
  navigate(urlBar.value);
});

translateBtn.addEventListener("click", function () {
  language = language === "fr" ? "en" : "fr";
  refreshTranslateButton();
  navigate(urlBar.value || "intel://start");
});

refreshTranslateButton();
urlBar.focus();
navigate("intel://start");
