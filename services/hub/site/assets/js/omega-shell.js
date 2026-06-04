/**
 * Shell OMEGA-OS — émulation bash (VFS locale + session pivot).
 */
(function (global) {
  "use strict";

  var SESSION_LOCAL = "local";
  var SESSION_PIVOT = "pivot";
  var DEPLOY_TOKEN = "BT-OPS-TUNNEL-4421";
  var LAST_EXIT = 0;

  var session = SESSION_LOCAL;
  var cwdLocal = "/home/operator";
  var cwdPivot = "/home/ops";
  var sshHostKeyAccepted = false;
  var history = [];
  var histIdx = -1;

  var ENV_LOCAL = {
    USER: "operator",
    LOGNAME: "operator",
    HOME: "/home/operator",
    SHELL: "/bin/bash",
    TERM: "xterm-256color",
    LANG: "fr_FR.UTF-8",
    PATH: "/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin",
    HOSTNAME: "kali",
    MAIL: "/var/mail/operator",
    SSH_AUTH_SOCK: "/run/user/1000/ssh-agent.sock",
  };

  var ENV_PIVOT = {
    USER: "ops",
    LOGNAME: "ops",
    HOME: "/home/ops",
    SHELL: "/bin/bash",
    TERM: "xterm-256color",
    LANG: "C.UTF-8",
    PATH: "/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin",
    HOSTNAME: "pivot",
    MAIL: "/var/mail/ops",
  };

  /** @type {Record<string, {type:'dir'|'file', mode:string, owner:string, group:string, size:number, mtime:string, content?:string}>} */
  var VFS = {};

  /** Secours si kali-fs.js absent du cache navigateur */
  var SHELL_KALI_FALLBACK = {
    nmap: 1,
    masscan: 1,
    sqlmap: 1,
    nikto: 1,
    gobuster: 1,
    ffuf: 1,
    dirb: 1,
    burpsuite: 1,
    msfconsole: 1,
    msfvenom: 1,
    john: 1,
    hashcat: 1,
    hydra: 1,
    "aircrack-ng": 1,
    wireshark: 1,
    tcpdump: 1,
    netcat: 1,
    nc: 1,
    searchsploit: 1,
    enum4linux: 1,
    crackmapexec: 1,
    theharvester: 1,
    responder: 1,
    setoolkit: 1,
  };

  function toolBaseName(cmd) {
    var c = String(cmd || "").trim();
    var i = c.lastIndexOf("/");
    return i === -1 ? c : c.slice(i + 1);
  }

  function isToolCommand(cmd) {
    var name = toolBaseName(cmd);
    if (global.OmegaKaliFs && OmegaKaliFs.isKaliBin(name)) return true;
    if (SHELL_KALI_FALLBACK[name]) return true;
    var node = vfsNode("/usr/bin/" + name) || vfsNode("/usr/sbin/" + name);
    return !!(node && (node.type === "file" || node.type === "symlink"));
  }

  function countVfsBins() {
    var n = 0;
    Object.keys(VFS).forEach(function (k) {
      if (k.indexOf("/usr/bin/") === 0 && VFS[k].type === "file") n += 1;
    });
    return n || (global.OmegaKaliFs ? OmegaKaliFs.ALL_BINS.length : 150);
  }

  function dispatchKaliTool(cmd, args, out, onComplete) {
    if (!isToolCommand(cmd)) return false;
    var name = toolBaseName(cmd);

    function finish(res) {
      printLines(out, res.lines);
      setExit(res.exit);
    }

    if (
      global.OmegaKaliFs &&
      typeof OmegaKaliFs.execToolRemote === "function" &&
      OmegaKaliFs.canRunRemote(name)
    ) {
      printLines(out, ["[*] Exécution distante (workstation)…"], "sh-dim");
      OmegaKaliFs.execToolRemote(name, args, session, function (res) {
        finish(res);
        if (onComplete) onComplete();
      });
      return "async";
    }

    var res;
    if (global.OmegaKaliFs && typeof OmegaKaliFs.execTool === "function") {
      res = OmegaKaliFs.execTool(name, args, session);
    } else if (global.OmegaKaliFs && OmegaKaliFs.kaliStubResponse) {
      res = OmegaKaliFs.kaliStubResponse(name, args);
    } else {
      res = {
        lines: [
          name + ": erreur de chargement des outils Kali.",
          "Rechargez la page (Ctrl+Shift+R) ou videz le cache du navigateur.",
        ],
        exit: 127,
      };
    }
    finish(res);
    return true;
  }

  function pad2(n) {
    return n < 10 ? "0" + n : String(n);
  }

  function fmtMtime(d) {
    var months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return months[d.getMonth()] + " " + pad2(d.getDate()) + " " + String(d.getFullYear()).slice(2);
  }

  function addNode(path, node) {
    VFS[path] = node;
  }

  function addDir(path, opts) {
    opts = opts || {};
    addNode(path, {
      type: "dir",
      mode: opts.mode || "drwxr-xr-x",
      owner: opts.owner || "operator",
      group: opts.group || "operator",
      size: 4096,
      mtime: opts.mtime,
    });
  }

  function addFile(path, content, opts) {
    opts = opts || {};
    var body = content || "";
    addNode(path, {
      type: "file",
      mode: opts.mode || "-rw-r--r--",
      owner: opts.owner || "operator",
      group: opts.group || "operator",
      size: opts.size || body.length,
      mtime: opts.mtime,
      content: body,
    });
  }

  function addSymlink(path, target, opts) {
    opts = opts || {};
    addNode(path, {
      type: "symlink",
      mode: "lrwxrwxrwx",
      owner: opts.owner || "operator",
      group: opts.group || "operator",
      size: target.length,
      mtime: opts.mtime,
      target: target,
    });
  }

  function vfsResolve(path) {
    var guard = 0;
    while (guard++ < 12) {
      var node = vfsNode(path);
      if (!node || node.type !== "symlink") {
        return { path: path, node: node };
      }
      var parent = path.replace(/\/[^/]+$/, "") || "/";
      path = resolvePath(node.target, parent);
    }
    return { path: path, node: null };
  }

  function buildVfs() {
    var d = new Date(2026, 5, 3, 8, 12, 0);
    var d2 = new Date(2026, 4, 12, 14, 0, 0);
    var mt = fmtMtime(d);
    var mt2 = fmtMtime(d2);
    var op = { owner: "operator", group: "operator", mtime: mt };
    var ops = { owner: "ops", group: "ops", mtime: mt };

    /* --- Poste opérateur (profil Linux complet) --- */
    addDir("/home/operator", { mode: "drwxr-x---", mtime: mt });
    addFile(
      "/home/operator/.bashrc",
      "# ~/.bashrc — OMEGA poste opérateur\n" +
        "# Ne pas modifier sans autorisation commandement\n" +
        "[ -z \"$PS1\" ] && return\n" +
        "export HISTSIZE=1000\n" +
        "export HISTFILESIZE=2000\n" +
        "export HISTCONTROL=ignoredups:erasedups\n" +
        "export PATH=\"$HOME/.local/bin:$PATH\"\n" +
        "alias ll='ls -alF'\n" +
        "alias la='ls -la'\n" +
        "alias l='ls -CF'\n" +
        "alias mission='cd ~/Documents/DOSSIER_OMEGA && ls'\n" +
        "alias kali='ls /usr/bin | head -40'\n" +
        "alias tools='cat /usr/share/kali-tools-index.txt | less'\n" +
        "PS1='\\[\\033[01;32m\\]\\u@\\h\\[\\033[00m\\]:\\[\\033[01;34m\\]\\w\\[\\033[00m\\]\\$ '\n",
      { mtime: mt2, size: 3526 }
    );
    addFile(
      "/home/operator/.profile",
      "# ~/.profile\nif [ \"$BASH\" ]; then\n  [ -f ~/.bashrc ] && . ~/.bashrc\nfi\nmesg n 2>/dev/null || true\n",
      { mtime: mt2, size: 807 }
    );
    addFile("/home/operator/.bash_logout", "# ~/.bash_logout\nclear\n", { mtime: mt2, size: 220 });
    addFile(
      "/home/operator/.bash_history",
      "ls -la\n" +
        "cd Documents/DOSSIER_OMEGA\n" +
        "ls incidents/\n" +
        "cat incidents/BT-AUTH-4421.txt\n" +
        "cd ~/\n" +
        "ls Desktop/\n" +
        "cat Desktop/README-poste.txt\n" +
        "ssh ops@pivot\n",
      { mode: "-rw-------", size: 140 }
    );

    var xdg = ["Desktop", "Documents", "Downloads", "Music", "Pictures", "Public", "Templates", "Videos"];
    xdg.forEach(function (name) {
      addDir("/home/operator/" + name, op);
    });

    addDir("/home/operator/.ssh", { mode: "drwx------" });
    addFile(
      "/home/operator/.ssh/config",
      "Host pivot\n  HostName pivot\n  User ops\n  IdentityFile ~/.ssh/id_ops\n  StrictHostKeyChecking ask\n",
      { mode: "-rw-------", size: 96 }
    );
    addFile(
      "/home/operator/.ssh/known_hosts",
      "|1|7Kx9mP2nQ8vR4sT1uW6yZ3aB5cD0eF2gH4jL6mN8pQ=| pivot ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAI...\n",
      { mode: "-rw-r--r--", size: 120 }
    );
    addSymlink("/home/operator/.ssh/id_ops", "../keys/id_ops.leak", op);

    addDir("/home/operator/.local", { mode: "drwx------" });
    addDir("/home/operator/.local/share", { mode: "drwx------" });
    addDir("/home/operator/.config", { mode: "drwx------" });
    addDir("/home/operator/.cache", { mode: "drwx------" });

    addDir("/home/operator/keys", { mode: "drwx------" });
    addFile(
      "/home/operator/keys/id_ops.leak",
      "-----BEGIN OPENSSH PRIVATE KEY-----\n" +
        "b3BlbnNzaC1rZXktdjEAAAAABG5vbmUAAAAEbm9uZQAAAAAAAAABAAAAMwAAAAtzc2gtZW\n" +
        "QyNTUxOQAAACB7fJ8xK9vL3mP0nQx8vR2hT4sWqN1yB8cF6dE9gH0jK5lM2nP4qR8sT6uV1w==\n" +
        "-----END OPENSSH PRIVATE KEY-----\n",
      { mode: "-rw-------", size: 419 }
    );

    /* Desktop — raccourcis .desktop + dossiers + notes lore */
    var desk = "/home/operator/Desktop";
    addFile(
      desk + "/SecureMail.desktop",
      "[Desktop Entry]\nName=SecureMail OMEGA\nComment=Messagerie opérateur sécurisée\nExec=omega-browser mail.html\nIcon=internet-mail\nTerminal=false\nType=Application\nCategories=Network;Email;\n",
      { mode: "-rwxr-xr-x", size: 168 }
    );
    addFile(
      desk + "/ClearanceForm.desktop",
      "[Desktop Entry]\nName=ClearanceForm\nComment=Validation OSINT — niveau clearance ALPHA\nExec=omega-browser validation.html\nIcon=security-high\nTerminal=false\nType=Application\nCategories=Security;\n",
      { mode: "-rwxr-xr-x", size: 172 }
    );
    addFile(
      desk + "/OMEGA-Shell.desktop",
      "[Desktop Entry]\nName=OMEGA Shell\nComment=Terminal opérateur (mesh pivot)\nExec=omega-terminal\nIcon=utilities-terminal\nTerminal=false\nType=Application\nCategories=System;TerminalEmulator;\n",
      { mode: "-rwxr-xr-x", size: 160 }
    );
    addFile(
      desk + "/README-poste.txt",
      "Poste opérateur OMEGA — classification ALPHA\n\n" +
        "Applications bureau :\n" +
        "  SecureMail.desktop   — messagerie interne chiffrée\n" +
        "  DOSSIER_OMEGA/       — dossier de mission (incidents, memos, ops…)\n" +
        "  ClearanceForm.desktop — validation clearance terrain\n" +
        "  OMEGA-Shell.desktop  — terminal mesh pivot (phase 2)\n" +
        "  Kali-Tools/          — raccourcis Nmap, Burp, Metasploit, …\n\n" +
        "Système : Kali GNU/Linux Rolling 2026.1\n" +
        "Outils : /usr/bin (" +
        (global.OmegaKaliFs ? OmegaKaliFs.ALL_BINS.length : "150+") +
        ") · /usr/share/kali-tools-index.txt\n\n" +
        "Données mission : ~/Documents/DOSSIER_OMEGA\n" +
        "Clé SSH pivot   : ~/keys/id_ops.leak (ou ~/.ssh/id_ops)\n",
      { size: 380 }
    );
    addSymlink(desk + "/DOSSIER_OMEGA", "../Documents/DOSSIER_OMEGA", op);
    addFile(
      desk + "/Trash",
      "",
      { mode: "drwx------", size: 4096 }
    );

    /* Downloads */
    addFile(
      "/home/operator/Downloads/omega-os-quickstart.pdf",
      "[fichier PDF chiffré — déclassifié à la validation]\n",
      { size: 87232 }
    );
    addFile(
      "/home/operator/Downloads/.directory",
      "[Desktop Entry]\nType=Directory\nName=Downloads\n",
      { size: 48 }
    );

    /* Pictures */
    addFile(
      "/home/operator/Pictures/wallpaper-omega.jpg",
      "[image JPEG — fond d'écran OMEGA-OS v2]\n",
      { size: 204800 }
    );
    addFile(
      "/home/operator/Pictures/logo-omega-alpha.png",
      "[image PNG — logo classifié]\n",
      { size: 12440 }
    );

    /* Templates */
    addFile(
      "/home/operator/Templates/rapport-incident.md",
      "# Rapport incident — OMEGA\n\nDate :\nOpérateur :\nRéférence :\n\n## Résumé\n\n## Actions\n\n## Statut\n",
      { size: 96 }
    );
    addFile(
      "/home/operator/Templates/note-ops.txt",
      "NOTE OPS [DATE] — [OPÉRATEUR]\n==============================\n",
      { size: 56 }
    );

    addFile("/home/operator/Music/.gitkeep", "", { mode: "-rw-r--r--", size: 0 });
    addFile("/home/operator/Videos/.gitkeep", "", { mode: "-rw-r--r--", size: 0 });
    addFile("/home/operator/Public/.gitkeep", "", { mode: "-rw-r--r--", size: 0 });

    /* DOSSIER_OMEGA (miroir explorateur graphique) */
    var dossier = "/home/operator/Documents/DOSSIER_OMEGA";
    addDir(dossier, op);
    addFile(
      dossier + "/README.txt",
      "Index mission OMEGA — voir aussi l'explorateur graphique sur le bureau.\n" +
        "Sous-dossiers : incidents memos runbooks forums dns scans procurement reports crawls ops\n",
      { size: 200 }
    );
    var subdirs = [
      "incidents",
      "memos",
      "runbooks",
      "forums",
      "dns",
      "scans",
      "procurement",
      "reports",
      "crawls",
      "ops",
    ];
    subdirs.forEach(function (s) {
      addDir(dossier + "/" + s, op);
    });
    addFile(
      dossier + "/incidents/BT-AUTH-4421.txt",
      "Incident BT-AUTH-4421 — portail partenaire legacy-mirror.\nSurface : /internal/auth-gateway/v2/\n",
      { size: 96 }
    );
    addFile(
      dossier + "/memos/directory-pattern-current.txt",
      "[MED-HI] Format email actif — 2026-04-22\nPattern valide : prenom.nom@blacktide-corp.tld\nChangement de domaine finalisé. Seeds pré-migration à ne pas utiliser.\n",
      { size: 148 }
    );
    addFile(
      dossier + "/memos/directory-legacy-seed.txt",
      "[LOW] Seed annuaire legacy — 2025-12-14\nFormat first.last@blacktide.local — LEURRE, non conforme mission.\nArchive seule ; à déclasser face aux memos 2026.\n",
      { size: 152 }
    );
    addFile(
      dossier + "/memos/relay-profile-map.txt",
      "[MED-HI] Cartographie profils relay — 2026-04-24\nProfil interne actif : legacy-mirror\nUsage : auth gateway + chaînes export CCTV\nMode compatibilité, encore en production.\n",
      { size: 172 }
    );
    addFile(
      dossier + "/runbooks/ops-deploy-window.txt",
      "[HIGH] Runbook ops — fenêtre déploiement — 2026-04-24\nFenêtre d'action : 02:00–03:00 UTC\nRelais opérateur : n.morel\nRollback : profil legacy-mirror\n",
      { size: 136 }
    );
    addFile(
      dossier + "/forums/forum-7782.txt",
      "[MED] Capture forum #7782 — 2026-04-23\nAlias n.morel, activité 02:00–03:00 UTC.\nSource secondaire — converge avec runbook.\n",
      { size: 120 }
    );
    addFile(
      dossier + "/forums/forum-5511.txt",
      "[LOW] Archive forum #5511 — 2026-03-02\nAlias n.moreau, fenêtre 00:00–01:00 UTC. — LEURRE historique.\n",
      { size: 96 }
    );
    addFile(
      dossier + "/dns/dns-partner-fallback.txt",
      "[MED-HI] DNS passif — 2026-04-24\nResolvers → /internal/auth-gateway/v2\nÀ croiser avec incident BT-AUTH-4421.\n",
      { size: 112 }
    );
    addFile(
      dossier + "/scans/stack-edge-fingerprint.txt",
      "[MED-HI] Empreinte edge — 2026-04-24\nnginx/1.27 + php-fpm (legacy partner module)\n",
      { size: 80 }
    );
    addFile(
      dossier + "/scans/stack-old-sample.txt",
      "[LOW] Echantillon obsolète — 2026-02-18\napache/2.4 pré-migration. LEURRE.\n",
      { size: 72 }
    );
    addFile(
      dossier + "/procurement/lot-BT-SUP-4421.txt",
      "[MED-HI] Approvisionnement — 2026-04-20\nLot BT-SUP-4421 — flux CCTV / maintenance relay\nRéférence clé de recoupement.\n",
      { size: 112 }
    );
    addFile(
      dossier + "/reports/cctv-handoff-audit.txt",
      "[MED] Audit handoff CCTV — 2026-04-25\nBT-SUP-4421 dans traces maintenance.\nProfils legacy dans les exports. Risque accru 02:00–03:00 UTC.\n",
      { size: 144 }
    );
    addFile(
      dossier + "/crawls/robots-archive.txt",
      "[MED] Archive robots — 2026-04-24\nDisallow: /internal/auth-gateway/v2\nÀ croiser avec incident registry.\n",
      { size: 104 }
    );
    addFile(
      dossier + "/ops/local-port-note.txt",
      "[MED] Note ops — ports lab — 2026-04-25\nPorts documentaires OSINT : hub 8080, partenaire 8081\nPorts hôte Docker : hub 18080, cible 18081\n",
      { size: 128 }
    );

    addFile(
      "/home/operator/Documents/notes-mission.txt",
      "NOTES MISSION — opérateur terrain (ALPHA)\n" +
        "==========================================\n\n" +
        "Phase 1 : collecte OSINT\n" +
        "  - SecureMail : lire Mail 1, Mail 2\n" +
        "  - DOSSIER_OMEGA : incidents/, memos/, runbooks/\n" +
        "  - Valider via ClearanceForm\n\n" +
        "Phase 2 : infiltration\n" +
        "  - Clé SSH pivot : ~/keys/id_ops.leak\n" +
        "  - ssh ops@pivot\n" +
        "  - bash ~/scripts/preflight-internal.sh --deploy-consoles\n" +
        "  - Jeton → Liaison pivot (bureau OMEGA-OS)\n\n" +
        "Phase 3 : opération terrain (après déploiement consoles)\n" +
        "  - Alarm Console  → panneau alertes\n" +
        "  - CCTV Console   → flux caméra\n",
      { size: 520 }
    );
    addDir("/home/operator/Documents/archives", op);
    addFile(
      "/home/operator/Documents/archives/mission-precedente.tar.gz.enc",
      "[archive chiffrée — AES-256-GCM — accès restreint]\n",
      { mode: "-rw-------", size: 153600 }
    );
    addDir("/home/operator/.local/share/recently-used", { mode: "drwx------" });
    addFile(
      "/home/operator/.local/share/recently-used/xbel",
      "<?xml version=\"1.0\"?>\n<xbel version=\"1.0\">\n" +
        "  <bookmark href=\"file:///home/operator/Documents/DOSSIER_OMEGA/incidents/BT-AUTH-4421.txt\"/>\n" +
        "  <bookmark href=\"file:///home/operator/Documents/notes-mission.txt\"/>\n" +
        "</xbel>\n",
      { mode: "-rw-r--r--", size: 260 }
    );

    addDir("/opt/omega", { owner: "root", group: "root", mtime: mt2 });
    addFile(
      "/opt/omega/ops-hint.txt",
      "relay: /internal/auth-gateway/v2/omega/ops/runbook.txt\n",
      { owner: "root", group: "omega" }
    );

    /* --- Pivot ops --- */
    addDir("/home/ops", { mode: "drwxr-x---", owner: "ops", group: "ops", mtime: mt });
    addDir("/home/ops/scripts", ops);
    addFile(
      "/home/ops/scripts/preflight-internal.sh",
      "#!/bin/bash\n# Black Tide — internal mesh preflight (ops)\nset -euo pipefail\n",
      { mode: "-rwxr-xr-x", owner: "ops", group: "ops", size: 512 }
    );
    addDir("/home/ops/.ssh", { mode: "drwx------", owner: "ops", group: "ops" });
    addFile(
      "/home/ops/.ssh/authorized_keys",
      "ssh-ed25519 AAAA… operator@omega-poste\n",
      { mode: "-rw-------", owner: "ops", group: "ops", size: 89 }
    );
    addFile(
      "/home/ops/.bash_history",
      "ls -la\n" +
        "ls scripts/\n" +
        "bash ~/scripts/preflight-internal.sh\n" +
        "curl -fsS http://cctv:8080/\n" +
        "curl -fsS http://alarm:8080/\n" +
        "cat /opt/omega/ops/runbook.txt\n" +
        "bash ~/scripts/preflight-internal.sh --deploy-consoles\n",
      { mode: "-rw-------", owner: "ops", group: "ops", size: 196 }
    );
    addDir("/home/ops/logs", ops);
    addFile(
      "/home/ops/logs/preflight-2026-06-02.log",
      "[preflight] host=pivot user=ops\n" +
        "[preflight] cctv:8080 -> HTTP 200\n" +
        "[preflight] alarm:8080 -> HTTP 200\n" +
        "[preflight] vault:8080 -> HTTP 200\n" +
        "[preflight] done\n",
      { owner: "ops", group: "ops", size: 148 }
    );

    if (global.OmegaKaliFs && OmegaKaliFs.installKaliVfs) {
      OmegaKaliFs.installKaliVfs(addDir, addFile, addSymlink, { mtime: mt, mtime2: mt2 });
    } else {
      Object.keys(SHELL_KALI_FALLBACK).forEach(function (name) {
        addFile("/usr/bin/" + name, "#!/bin/sh\n", {
          mode: "-rwxr-xr-x",
          owner: "root",
          group: "root",
          mtime: mt2,
          size: 16,
        });
      });
      addFile("/etc/os-release", 'PRETTY_NAME="Kali GNU/Linux Rolling"\nID=kali\n', {
        owner: "root",
        group: "root",
        mtime: mt2,
      });
    }

    /* Bureau — raccourcis outils Kali (immersion) */
    var kaliDesk = desk + "/Kali-Tools";
    addDir(kaliDesk, op);
    var kaliLaunchers = [
      ["nmap.desktop", "Nmap", "nmap --help"],
      ["burpsuite.desktop", "Burp Suite", "burpsuite --help"],
      ["metasploit.desktop", "Metasploit", "msfconsole --help"],
      ["wireshark.desktop", "Wireshark", "wireshark --help"],
      ["sqlmap.desktop", "SQLmap", "sqlmap --help"],
      ["john.desktop", "John", "john --help"],
      ["hashcat.desktop", "Hashcat", "hashcat --help"],
      ["hydra.desktop", "Hydra", "hydra --help"],
      ["aircrack-ng.desktop", "Aircrack-ng", "aircrack-ng --help"],
      ["gobuster.desktop", "Gobuster", "gobuster --help"],
      ["nikto.desktop", "Nikto", "nikto --help"],
      ["maltego.desktop", "Maltego", "maltego --help"],
      ["setoolkit.desktop", "SET", "setoolkit --help"],
      ["ettercap.desktop", "Ettercap", "ettercap --help"],
      ["ffuf.desktop", "FFuf", "ffuf --help"],
    ];
    kaliLaunchers.forEach(function (entry) {
      addFile(
        kaliDesk + "/" + entry[0],
        "[Desktop Entry]\nType=Application\nName=" +
          entry[1] +
          "\nComment=Kali GNU/Linux\nExec=omega-shell-run " +
          entry[2] +
          "\nIcon=kali-security\nTerminal=true\nCategories=Security;\n",
        { mode: "-rwxr-xr-x", size: 140 }
      );
    });
    addFile(
      desk + "/Kali-Tools.desktop",
      "[Desktop Entry]\nType=Application\nName=Kali Tools\nComment=Index outillage sécurité offensive\nExec=omega-browser kali-apps.html\nIcon=kali-logo\nTerminal=false\nCategories=System;Security;\n",
      { mode: "-rwxr-xr-x", size: 160 }
    );
    addSymlink(desk + "/kali-tools", "Kali-Tools", op);
  }

  buildVfs();

  if (global.OmegaKaliFs && OmegaKaliFs.ALL_BINS) {
    OmegaKaliFs.ALL_BINS.forEach(function (b) {
      SHELL_KALI_FALLBACK[b] = 1;
    });
  }

  function homeDir() {
    return session === SESSION_PIVOT ? "/home/ops" : "/home/operator";
  }

  function cwd() {
    return session === SESSION_PIVOT ? cwdPivot : cwdLocal;
  }

  function setCwd(path) {
    if (session === SESSION_PIVOT) cwdPivot = path;
    else cwdLocal = path;
  }

  function env() {
    return session === SESSION_PIVOT ? ENV_PIVOT : ENV_LOCAL;
  }

  function isOsintOk() {
    return global.OmegaMissionState && OmegaMissionState.isValidated();
  }

  function isDeployed() {
    try {
      var p = window.parent;
      if (p && p.OmegaConsoleDeploy) return p.OmegaConsoleDeploy.isDeployed();
    } catch (e) {}
    return global.OmegaConsoleDeploy && OmegaConsoleDeploy.isDeployed();
  }

  function parentDeploy(token) {
    try {
      var p = window.parent;
      if (p && p.OmegaConsoleDeploy) return p.OmegaConsoleDeploy.tryActivate(token);
    } catch (e) {}
    return global.OmegaConsoleDeploy && OmegaConsoleDeploy.tryActivate(token);
  }

  function promptPath() {
    var h = homeDir();
    var c = cwd();
    if (c === h) return "~";
    if (c.indexOf(h + "/") === 0) return "~" + c.slice(h.length);
    return c;
  }

  function prompt() {
    var e = env();
    return e.USER + "@" + e.HOSTNAME + ":" + promptPath() + "$ ";
  }

  function resolvePath(raw, base) {
    var p = String(raw || "").trim();
    base = base || cwd();
    if (!p) return base;
    if (p === "~") return homeDir();
    if (p.indexOf("~/") === 0) return homeDir() + p.slice(1);
    if (p[0] !== "/") {
      p = base + (base[base.length - 1] === "/" ? "" : "/") + p;
    }
    var parts = [];
    p.split("/").forEach(function (seg) {
      if (!seg || seg === ".") return;
      if (seg === "..") {
        parts.pop();
        return;
      }
      parts.push(seg);
    });
    return "/" + parts.join("/");
  }

  function vfsNode(path) {
    return VFS[path] || null;
  }

  function isDir(path) {
    var r = vfsResolve(path);
    return r.node && r.node.type === "dir";
  }

  function isFile(path) {
    var r = vfsResolve(path);
    return r.node && r.node.type === "file";
  }

  function listDir(path) {
    var prefix = path === "/" ? "/" : path + "/";
    var names = [];
    Object.keys(VFS).forEach(function (k) {
      if (k === path) return;
      if (k.indexOf(prefix) !== 0) return;
      var rest = k.slice(prefix.length);
      if (rest.indexOf("/") !== -1) return;
      names.push(rest);
    });
    return names.sort();
  }

  function setExit(code) {
    LAST_EXIT = code;
  }

  function printLines(out, lines, cls) {
    (lines || []).forEach(function (line) {
      if (line === null || line === undefined) return;
      var div = document.createElement("div");
      div.className = "sh-line" + (cls ? " " + cls : "");
      div.textContent = line;
      out.appendChild(div);
    });
  }

  function err(out, msg) {
    printLines(out, [msg], "sh-err");
    setExit(1);
  }

  function formatLsLong(path, name) {
    var full = path + "/" + name;
    if (path === "/") full = "/" + name;
    var node = vfsNode(full);
    if (!node) return null;
    var suffix = node.type === "symlink" ? " -> " + node.target : "";
    return (
      node.mode +
      " 1 " +
      node.owner.padEnd(8) +
      " " +
      node.group.padEnd(8) +
      String(node.size).padStart(5) +
      " " +
      node.mtime +
      " " +
      name +
      suffix
    );
  }

  function cmdLs(out, args) {
    var long = false;
    var all = false;
    var target = cwd();
    args.forEach(function (a) {
      if (a === "-l" || a === "-la" || a === "-al") long = true;
      if (a === "-a" || a === "-la" || a === "-al") all = true;
      else if (a[0] !== "-") target = resolvePath(a);
    });

    if (!isDir(target) && !isFile(target)) {
      err(out, "ls: cannot access '" + args.join(" ").replace(/^-[\w]*\s*/, "").trim() + "': No such file or directory");
      return;
    }
    if (isFile(target)) {
      var base = target.split("/").pop();
      printLines(out, long ? [formatLsLong(target.replace("/" + base, ""), base)] : [base]);
      setExit(0);
      return;
    }

    var names = listDir(target);
    if (all) {
      names = [".", ".."].concat(names);
    }
    if (long) {
      var blocks = ["total " + (names.length * 4)];
      names.forEach(function (n) {
        var line;
        if (n === "." || n === "..") {
          var node = n === ".." ? null : vfsNode(target);
          if (n === "..") {
            var parent = target.replace(/\/[^/]+$/, "") || "/";
            node = vfsNode(parent) || { mode: "drwxr-xr-x", owner: "root", group: "root", size: 4096, mtime: fmtMtime(new Date()) };
          }
          line =
            node.mode +
            " 1 " +
            node.owner.padEnd(8) +
            " " +
            node.group.padEnd(8) +
            String(node.size).padStart(5) +
            " " +
            node.mtime +
            " " +
            n;
        } else {
          line = formatLsLong(target, n);
        }
        if (line) blocks.push(line);
      });
      printLines(out, blocks);
    } else {
      var visible = all
        ? names
        : names.filter(function (n) {
            return n[0] !== ".";
          });
      printLines(out, [visible.join("  ")]);
    }
    setExit(0);
  }

  function cmdCd(out, arg) {
    var dest = arg ? resolvePath(arg) : homeDir();
    var resolved = vfsResolve(dest);
    if (!resolved.node || resolved.node.type !== "dir") {
      err(out, "bash: cd: " + (arg || "") + ": No such file or directory");
      return;
    }
    setCwd(resolved.path);
    setExit(0);
  }

  function cmdCat(out, args) {
    if (!args.length) {
      err(out, "cat: missing operand");
      return;
    }
    args.forEach(function (a) {
      if (a[0] === "-") return;
      var p = resolvePath(a);
      var resolved = vfsResolve(p);
      if (!resolved.node || resolved.node.type !== "file") {
        if (resolved.node && resolved.node.type === "dir") {
          err(out, "cat: " + a + ": Is a directory");
        } else {
          err(out, "cat: " + a + ": No such file or directory");
        }
        return;
      }
      printLines(out, (resolved.node.content || "").split("\n"));
    });
    setExit(0);
  }

  function printPreflight(out, withDeploy) {
    printLines(out, [
      "[preflight] host=pivot user=ops",
      "[preflight] cctv:8080 -> HTTP 200",
      "[preflight] alarm:8080 -> HTTP 200",
      "[preflight] vault:8080 -> HTTP 200",
    ]);
    if (withDeploy) {
      printLines(out, [
        "[preflight] tunnel ops: OK",
        "OMEGA-CONSOLE-DEPLOY: " + DEPLOY_TOKEN,
        "[preflight] coller le jeton dans Liaison pivot sur le poste OMEGA",
      ]);
    }
    printLines(out, ["[preflight] done"]);
    setExit(0);
  }

  function tokenize(line) {
    var parts = [];
    var cur = "";
    var inQ = false;
    var q = "";
    for (var i = 0; i < line.length; i++) {
      var c = line[i];
      if ((c === '"' || c === "'") && !inQ) {
        inQ = true;
        q = c;
        continue;
      }
      if (inQ && c === q) {
        inQ = false;
        q = "";
        continue;
      }
      if (!inQ && /\s/.test(c)) {
        if (cur) {
          parts.push(cur);
          cur = "";
        }
      } else {
        cur += c;
      }
    }
    if (cur) parts.push(cur);
    return parts;
  }

  function runCommand(line, out, onComplete) {
    setExit(0);
    var trimmed = line.trim();
    if (!trimmed) {
      if (onComplete) onComplete();
      return;
    }

    var asyncPending = false;
    try {

    if (trimmed === "!!") {
      err(out, "bash: !!: event not found");
      return;
    }

    var parts = tokenize(trimmed);
    var cmd = parts[0];
    var args = parts.slice(1);

    if (cmd === "sudo") {
      err(out, "operator is not in the sudoers file.  This incident will be reported.");
      return;
    }

    if (cmd === "clear") {
      out.innerHTML = "";
      setExit(0);
      return;
    }

    if (cmd === "pwd") {
      printLines(out, [cwd()]);
      setExit(0);
      return;
    }

    if (cmd === "cd") {
      cmdCd(out, args[0]);
      return;
    }

    if (cmd === "ls") {
      cmdLs(out, args);
      return;
    }

    if (cmd === "cat") {
      cmdCat(out, args);
      return;
    }

    if (cmd === "echo") {
      printLines(out, [args.join(" ").replace(/^['"]|['"]$/g, "")]);
      setExit(0);
      return;
    }

    if (cmd === "whoami") {
      printLines(out, [env().USER]);
      setExit(0);
      return;
    }

    if (cmd === "id") {
      var u = env().USER;
      if (session === SESSION_PIVOT) {
        printLines(out, ["uid=1001(ops) gid=1001(ops) groups=1001(ops),27(sudo)"]);
      } else {
        printLines(out, ["uid=1000(operator) gid=1000(operator) groups=1000(operator),100(users)"]);
      }
      setExit(0);
      return;
    }

    if (cmd === "hostname") {
      printLines(out, [env().HOSTNAME]);
      setExit(0);
      return;
    }

    if (cmd === "uname") {
      var a = args.indexOf("-a") !== -1 || args.indexOf("-all") !== -1;
      if (a) {
        printLines(out, [
          "Linux " +
            env().HOSTNAME +
            " 6.6.0-kali3-amd64 #1 SMP PREEMPT_DYNAMIC x86_64 GNU/Linux",
        ]);
      } else {
        printLines(out, ["Linux"]);
      }
      setExit(0);
      return;
    }

    if (cmd === "date") {
      printLines(out, [new Date().toString()]);
      setExit(0);
      return;
    }

    if (cmd === "env" || cmd === "printenv") {
      var e = env();
      var lines = Object.keys(e)
        .sort()
        .map(function (k) {
          return k + "=" + e[k];
        });
      if (cmd === "printenv" && args[0]) {
        lines = e[args[0]] ? [args[0] + "=" + e[args[0]]] : [];
        if (!lines.length) setExit(1);
      }
      printLines(out, lines);
      setExit(lines.length ? 0 : 1);
      return;
    }

    if (cmd === "which") {
      var bins = {
        ssh: "/usr/bin/ssh",
        bash: "/usr/bin/bash",
        cat: "/bin/cat",
        curl: "/usr/bin/curl",
        ls: "/bin/ls",
        grep: "/bin/grep",
        find: "/usr/bin/find",
        nmap: "/usr/bin/nmap",
        python3: "/usr/bin/python3",
      };
      if (!args[0]) {
        setExit(1);
        return;
      }
      var wn = args[0];
      if (bins[wn]) printLines(out, [bins[wn]]);
      else if (isToolCommand(wn)) printLines(out, ["/usr/bin/" + toolBaseName(wn)]);
      else setExit(1);
      return;
    }

    if (cmd === "type") {
      if (!args[0]) {
        err(out, "type: usage: type [-a] name [name ...]");
        return;
      }
      if (args[0] === "omega-deploy") {
        printLines(out, ["omega-deploy is a shell function"], "sh-dim");
      } else if (isToolCommand(args[0])) {
        printLines(out, [args[0] + " is hashed (/usr/bin/" + toolBaseName(args[0]) + ")"], "sh-dim");
      } else {
        printLines(out, [args[0] + " is /usr/bin/" + args[0]], "sh-dim");
      }
      setExit(0);
      return;
    }

    if (cmd === "help") {
      printLines(out, [
        "GNU bash, version 5.2.15(1)-release (x86_64-pc-linux-gnu)",
        "Shell built-in commands: cd, pwd, echo, exit, help, history",
        "Kali Rolling — " + (global.OmegaKaliFs ? OmegaKaliFs.ALL_BINS.length : "150+") + " outils sous /usr/bin",
        "Index : cat /usr/share/kali-tools-index.txt · dpkg -l | grep kali-tools",
        "Voir aussi: man bash, man nmap",
      ]);
      setExit(0);
      return;
    }

    if (cmd === "dpkg") {
      if (args[0] === "-l" || args[0] === "--list" || !args[0]) {
        printLines(
          out,
          global.OmegaKaliFs ? OmegaKaliFs.dpkgListLines() : ["ii  kali-defaults 2026.1.0 amd64"],
          "sh-dim"
        );
        setExit(0);
        return;
      }
      if (args[0] === "-s" && args[1]) {
        printLines(out, ["Package: kali-tools-" + args[1], "Status: install ok installed", "Architecture: amd64"]);
        setExit(0);
        return;
      }
      err(out, "dpkg: operation not supported (try: dpkg -l)");
      return;
    }

    if (cmd === "apt" || cmd === "apt-get" || cmd === "apt-cache") {
      printLines(out, [
        "Reading package lists... Done",
        "kali-linux-default is already the newest version (2026.1.0).",
        "0 upgraded, 0 newly installed, 0 to remove and 0 not upgraded.",
      ]);
      setExit(0);
      return;
    }

    if (cmd === "kali-tools" || cmd === "kat") {
      printLines(out, [
        "Kali Tools — " + countVfsBins() + " packages installed",
        "Categories: Information Gathering, Web App, Exploitation, Password, Wireless, Forensics",
        "ls /usr/bin | wc -l",
        "cat /usr/share/kali-tools-index.txt",
      ]);
      setExit(0);
      return;
    }

    if (cmd === "history") {
      history.forEach(function (h, i) {
        printLines(out, [String(i + 1).padStart(5) + "  " + h], "sh-dim");
      });
      setExit(0);
      return;
    }

    if (cmd === "exit" || cmd === "logout") {
      if (session === SESSION_PIVOT) {
        session = SESSION_LOCAL;
        setCwd(homeDir());
        printLines(out, ["logout"], "sh-dim");
        setExit(0);
      } else {
        printLines(out, ["exit"], "sh-dim");
      }
      return;
    }

    if (cmd === "ssh") {
      if (!isOsintOk()) {
        err(out, "Permission denied (publickey).");
        return;
      }
      var target = "";
      args.forEach(function (a) {
        if (a.indexOf("ops@") === 0 || a.indexOf("@pivot") !== -1) target = a;
      });
      if (!target || target.indexOf("ops@") !== 0) {
        err(out, "usage: ssh [-o Option] user@host");
        return;
      }
      var autoYes = args.some(function (a) {
        return a.indexOf("StrictHostKeyChecking=no") !== -1;
      });
      if (!sshHostKeyAccepted && !autoYes) {
        printLines(out, [
          "The authenticity of host 'pivot (10.42.0.12)' can't be established.",
          "ED25519 key fingerprint is SHA256:7Kx9mP2nQ8vR4sT1uW6yZ3aB5cD0eF2gH4jL6mN8pQ.",
          "This key is known by the following other names/addresses:",
          "    ~/.ssh/known_hosts:1: [hashed name]",
          "Are you sure you want to continue connecting (yes/no/[fingerprint])? ",
        ], "sh-warn");
        setExit(255);
        return;
      }
      sshHostKeyAccepted = true;
      session = SESSION_PIVOT;
      setCwd("/home/ops");
      printLines(out, [
        "Warning: Permanently added 'pivot' (ED25519) to the list of known hosts.",
      ], "sh-dim");
      printLines(out, [
        "Linux pivot 5.15.0-omega #1 SMP x86_64",
        "",
        "Black Tide — internal relay (ops lane)",
        "Authorized use only. All activity is logged.",
        "",
      ]);
      setExit(0);
      return;
    }

    if (cmd === "bash" || cmd === "sh") {
      if (!isOsintOk()) {
        err(out, "bash: permission denied");
        return;
      }
      if (session !== SESSION_PIVOT) {
        err(out, "bash: " + (args[0] || "") + ": No such file or directory");
        return;
      }
      var scriptArg = args[args.length - 1] || "";
      var scriptPath = resolvePath(scriptArg.replace(/^bash\s+/, ""));
      if (scriptPath.indexOf("preflight-internal.sh") === -1) {
        err(out, "bash: " + scriptArg + ": No such file or directory");
        return;
      }
      var deploy = args.indexOf("--deploy-consoles") !== -1;
      printPreflight(out, deploy);
      return;
    }

    if (cmd === "omega-deploy") {
      if (!isOsintOk()) {
        err(out, "omega-deploy: command not found");
        return;
      }
      var tok = args[0] || "";
      if (!tok) {
        err(out, "omega-deploy: missing token operand");
        return;
      }
      if (parentDeploy(tok)) {
        printLines(out, ["OK — déploiement des consoles terrain en cours sur le poste OMEGA."], "sh-ok");
        setExit(0);
      } else {
        err(out, "omega-deploy: invalid token");
      }
      return;
    }

    if (cmd === "grep") {
      var pattern = "";
      var targets = [];
      var recursive = false;
      var noCase = false;
      args.forEach(function (a) {
        if (a === "-r" || a === "-R" || a === "-rl" || a === "--recursive") recursive = true;
        else if (a === "-i") noCase = true;
        else if (a[0] === "-") { /* other flags ignored */ }
        else if (!pattern) pattern = a;
        else targets.push(a);
      });
      if (!pattern) { err(out, "grep: usage: grep [options] PATTERN [FILE...]"); return; }
      var re;
      try { re = new RegExp(pattern, noCase ? "i" : ""); } catch (e) {
        err(out, "grep: invalid regex: " + pattern); return;
      }
      var matched = false;
      function grepFile(p, label) {
        var r = vfsResolve(p);
        if (!r.node || r.node.type !== "file") return;
        (r.node.content || "").split("\n").forEach(function (line, idx) {
          if (re.test(line)) {
            var prefix = targets.length > 1 || recursive ? label + ":" : "";
            printLines(out, [prefix + line], "sh-ok");
            matched = true;
          }
        });
      }
      function grepDir(base) {
        Object.keys(VFS).forEach(function (k) {
          if (k.indexOf(base + "/") !== 0) return;
          var rest = k.slice(base.length + 1);
          if (rest.indexOf("/") !== -1 && !recursive) return;
          if (VFS[k].type === "file") grepFile(k, k);
        });
      }
      if (!targets.length) { err(out, "grep: missing file operand"); return; }
      targets.forEach(function (t) {
        var p = resolvePath(t);
        if (isDir(p) && recursive) grepDir(p);
        else grepFile(p, t);
      });
      if (!matched) setExit(1); else setExit(0);
      return;
    }

    if (cmd === "find") {
      var findBase = args[0] && args[0][0] !== "-" ? resolvePath(args[0]) : cwd();
      var nameFlag = args.indexOf("-name");
      var nameGlob = nameFlag !== -1 ? args[nameFlag + 1] : null;
      var typeFlag = args.indexOf("-type");
      var typeVal  = typeFlag !== -1 ? args[typeFlag + 1] : null;
      var results = [];
      Object.keys(VFS).sort().forEach(function (k) {
        if (k.indexOf(findBase) !== 0) return;
        var node = VFS[k];
        if (typeVal === "f" && node.type !== "file") return;
        if (typeVal === "d" && node.type !== "dir") return;
        if (nameGlob) {
          var base = k.split("/").pop();
          var rx = new RegExp("^" + nameGlob.replace(/\./g, "\\.").replace(/\*/g, ".*").replace(/\?/g, ".") + "$");
          if (!rx.test(base)) return;
        }
        results.push(k);
      });
      printLines(out, results.length ? results : []);
      setExit(results.length ? 0 : 1);
      return;
    }

    if (cmd === "head" || cmd === "tail") {
      var nFlag = args.indexOf("-n");
      var nLines = nFlag !== -1 ? (parseInt(args[nFlag + 1]) || 10) : 10;
      var headFile = args[args.length - 1];
      if (!headFile || headFile[0] === "-") { err(out, cmd + ": missing file operand"); return; }
      var rh = vfsResolve(resolvePath(headFile));
      if (!rh.node || rh.node.type !== "file") { err(out, cmd + ": " + headFile + ": No such file or directory"); return; }
      var allLines = (rh.node.content || "").split("\n");
      var slice = cmd === "head" ? allLines.slice(0, nLines) : allLines.slice(-nLines);
      printLines(out, slice);
      setExit(0);
      return;
    }

    if (cmd === "less" || cmd === "more") {
      var lessFile = args[args.length - 1];
      if (!lessFile || lessFile[0] === "-") { err(out, cmd + ": missing filename"); return; }
      var rl = vfsResolve(resolvePath(lessFile));
      if (!rl.node || rl.node.type !== "file") { err(out, cmd + ": " + lessFile + ": No such file or directory"); return; }
      printLines(out, (rl.node.content || "").split("\n"));
      printLines(out, ["(END)"], "sh-dim");
      setExit(0);
      return;
    }

    if (cmd === "wc") {
      var wcFile = args[args.length - 1];
      if (!wcFile || wcFile[0] === "-") { err(out, "wc: missing file operand"); return; }
      var rw = vfsResolve(resolvePath(wcFile));
      if (!rw.node || rw.node.type !== "file") { err(out, "wc: " + wcFile + ": No such file or directory"); return; }
      var body = rw.node.content || "";
      var lc = body.split("\n").length;
      var wc2 = body.split(/\s+/).filter(Boolean).length;
      var cc = body.length;
      printLines(out, [String(lc).padStart(4) + " " + String(wc2).padStart(4) + " " + String(cc).padStart(5) + " " + wcFile]);
      setExit(0);
      return;
    }

    if (cmd === "file") {
      if (!args[0]) { err(out, "file: missing operand"); return; }
      args.forEach(function (a) {
        if (a[0] === "-") return;
        var p = resolvePath(a);
        var r = vfsResolve(p);
        if (!r.node) { printLines(out, [a + ": ERROR: No such file or directory"]); return; }
        var desc;
        if (r.node.type === "dir") desc = "directory";
        else if (r.node.type === "symlink") desc = "symbolic link to " + r.node.target;
        else if (a.indexOf(".sh") !== -1) desc = "Bourne-Again shell script, ASCII text executable";
        else if (a.indexOf(".gz") !== -1) desc = "gzip compressed data";
        else if (a.indexOf(".pdf") !== -1) desc = "PDF document, version 1.5";
        else if (a.indexOf(".jpg") !== -1 || a.indexOf(".jpeg") !== -1) desc = "JPEG image data, JFIF standard 1.01";
        else if (a.indexOf(".png") !== -1) desc = "PNG image data, 1920 x 1080, 8-bit/color RGB";
        else if (a.indexOf(".desktop") !== -1) desc = "ASCII text";
        else if (a.indexOf("id_ops") !== -1 || a.indexOf(".leak") !== -1) desc = "OpenSSH private key";
        else desc = "ASCII text";
        printLines(out, [a + ": " + desc]);
      });
      setExit(0);
      return;
    }

    if (cmd === "stat") {
      if (!args[0]) { err(out, "stat: missing operand"); return; }
      var sp = resolvePath(args[0]);
      var sr = vfsResolve(sp);
      if (!sr.node) { err(out, "stat: cannot stat '" + args[0] + "': No such file or directory"); return; }
      var sn = sr.node;
      printLines(out, [
        "  File: " + sr.path,
        "  Size: " + sn.size + "\tBlocks: " + Math.ceil(sn.size / 512) + "\tIO Block: 4096  " + sn.type,
        "Device: fd01h/64769d\tInode: " + (Math.floor(Math.random() * 900000) + 100000) + "\tLinks: 1",
        "Access: (" + sn.mode + ")\tUid: ( 1000/ " + sn.owner + ")\tGid: ( 1000/ " + sn.group + ")",
        "Modify: " + sn.mtime,
      ]);
      setExit(0);
      return;
    }

    if (cmd === "ping") {
      var pingHost = args[args.length - 1] || "";
      if (!pingHost || pingHost[0] === "-") { err(out, "ping: missing host operand"); return; }
      if (session !== SESSION_PIVOT && (pingHost === "cctv" || pingHost === "alarm" || pingHost === "vault")) {
        err(out, "ping: " + pingHost + ": Destination Host Unreachable"); return;
      }
      var pingIp = pingHost === "pivot" ? "10.42.0.12"
        : pingHost === "cctv"  ? "10.42.0.21"
        : pingHost === "alarm" ? "10.42.0.22"
        : pingHost === "vault" ? "10.42.0.23"
        : pingHost === "localhost" || pingHost === "127.0.0.1" ? "127.0.0.1"
        : "8.8.8.8";
      var cnt = parseInt((args[args.indexOf("-c") + 1]) || "4");
      if (isNaN(cnt) || cnt < 1) cnt = 4;
      printLines(out, ["PING " + pingHost + " (" + pingIp + ") 56(84) bytes of data."]);
      for (var pi = 0; pi < Math.min(cnt, 4); pi++) {
        printLines(out, ["64 bytes from " + pingHost + " (" + pingIp + "): icmp_seq=" + (pi + 1) + " ttl=64 time=" + (1.2 + pi * 0.3).toFixed(3) + " ms"]);
      }
      printLines(out, [
        "",
        "--- " + pingHost + " ping statistics ---",
        cnt + " packets transmitted, " + Math.min(cnt, 4) + " received, 0% packet loss",
        "rtt min/avg/max/mdev = 1.200/1.500/1.800/0.300 ms",
      ]);
      setExit(0);
      return;
    }

    if (cmd === "ip") {
      var sub = args[0] || "";
      if (sub === "addr" || sub === "a" || (sub === "address")) {
        var isP = session === SESSION_PIVOT;
        printLines(out, [
          "1: lo: <LOOPBACK,UP,LOWER_UP> mtu 65536 qdisc noqueue state UNKNOWN",
          "    link/loopback 00:00:00:00:00:00 brd 00:00:00:00:00:00",
          "    inet 127.0.0.1/8 scope host lo",
          "2: eth0: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc mq state UP",
          "    link/ether 02:42:0a:00:0" + (isP ? "c" : "1") + ":01 brd ff:ff:ff:ff:ff:ff",
          "    inet " + (isP ? "10.42.0.12" : "10.0.0.1") + "/24 brd " + (isP ? "10.42.0.255" : "10.0.0.255") + " scope global eth0",
        ]);
      } else if (sub === "route" || sub === "r") {
        printLines(out, [
          "default via 10.42.0.1 dev eth0",
          "10.42.0.0/24 dev eth0 proto kernel scope link src " + (session === SESSION_PIVOT ? "10.42.0.12" : "10.0.0.1"),
        ]);
      } else {
        err(out, "ip: Object \"" + sub + "\" is unknown, try \"ip help\".");
      }
      setExit(0);
      return;
    }

    if (cmd === "ifconfig") {
      var isP2 = session === SESSION_PIVOT;
      printLines(out, [
        "eth0: flags=4163<UP,BROADCAST,RUNNING,MULTICAST>  mtu 1500",
        "        inet " + (isP2 ? "10.42.0.12" : "10.0.0.1") + "  netmask 255.255.255.0  broadcast " + (isP2 ? "10.42.0.255" : "10.0.0.255"),
        "        ether 02:42:0a:2a:00:0c  txqueuelen 0  (Ethernet)",
        "",
        "lo: flags=73<UP,LOOPBACK,RUNNING>  mtu 65536",
        "        inet 127.0.0.1  netmask 255.0.0.0",
      ]);
      setExit(0);
      return;
    }

    if (cmd === "ps") {
      var full = args.indexOf("aux") !== -1 || args.indexOf("a") !== -1;
      if (full) {
        printLines(out, [
          "USER       PID %CPU %MEM    VSZ   RSS TTY      STAT START   TIME COMMAND",
          (env().USER).padEnd(8) + "     1  0.0  0.0   4624   892 ?        Ss   08:12   0:00 /bin/bash",
          (env().USER).padEnd(8) + "    12  0.0  0.0  36092  3148 ?        S    08:12   0:00 sshd: " + env().USER + "@pts/0",
          (env().USER).padEnd(8) + "    42  0.0  0.0  36676  2976 pts/0    R+   08:12   0:00 ps aux",
        ]);
      } else {
        printLines(out, [
          "  PID TTY          TIME CMD",
          "    1 pts/0    00:00:00 bash",
          "   42 pts/0    00:00:00 ps",
        ]);
      }
      setExit(0);
      return;
    }

    if (cmd === "netstat" || cmd === "ss") {
      printLines(out, [
        "Proto Recv-Q Send-Q Local Address           Foreign Address         State",
        "tcp        0      0 0.0.0.0:22              0.0.0.0:*               LISTEN",
        "tcp        0      0 0.0.0.0:8080            0.0.0.0:*               LISTEN",
        "tcp        0      0 " + (session === SESSION_PIVOT ? "10.42.0.12" : "10.0.0.1") + ":22  10.42.0.1:54321        ESTABLISHED",
      ]);
      setExit(0);
      return;
    }

    if (cmd === "man") {
      var pages = {
        ssh: "SSH(1) — OpenSSH remote login client\n  ssh [-o option] user@host\n  Exemple: ssh -o StrictHostKeyChecking=no ops@pivot",
        bash: "BASH(1) — GNU Bourne-Again SHell\n  Interpréteur de commandes. Voir aussi: help, history",
        grep: "GREP(1) — print lines matching a pattern\n  grep [options] PATTERN [FILE...]\n  -r : recursif   -i : insensible à la casse",
        find: "FIND(1) — search for files\n  find [path] [-name glob] [-type f|d]",
        "preflight-internal.sh": "preflight-internal.sh — Black Tide mesh preflight\n  bash ~/scripts/preflight-internal.sh [--deploy-consoles]",
        nmap: "NMAP(1) — Network exploration tool\n  nmap [options] target\n  Lab : pivot / port 18081",
        sqlmap: "SQLMAP(1) — automatic SQL injection\n  sqlmap -u URL --batch",
        msfconsole: "MSFCONSOLE(1) — Metasploit Framework console\n  Canal mission : render.php legacy tpl",
        john: "JOHN(1) — password cracker\n  Wordlists : /usr/share/wordlists/",
      };
      var page = pages[args[0]] || ("man: pas de page de manuel pour \"" + (args[0] || "") + "\"");
      printLines(out, page.split("\n"), args[0] && pages[args[0]] ? "" : "sh-err");
      setExit(args[0] && pages[args[0]] ? 0 : 1);
      return;
    }

    if (cmd === "touch" || cmd === "mkdir" || cmd === "rm" || cmd === "mv" || cmd === "cp" || cmd === "chmod") {
      err(out, cmd + ": permission denied: filesystem read-only");
      return;
    }

    if (cmd === "curl") {
      if (session !== SESSION_PIVOT) {
        err(out, "curl: (6) Could not resolve host: " + (args[args.length - 1] || ""));
        return;
      }
      var curlUrl = args[args.length - 1] || "";
      if (!curlUrl || curlUrl[0] === "-") { err(out, "curl: no URL specified"); return; }
      if (curlUrl.indexOf("cctv") !== -1) {
        printLines(out, ["HTTP/1.1 200 OK", "Server: nginx/1.27", "Content-Type: text/html", "", "<!-- CCTV relay panel -->"]);
        setExit(0); return;
      }
      if (curlUrl.indexOf("alarm") !== -1) {
        printLines(out, ["HTTP/1.1 200 OK", "Server: nginx/1.27", "Content-Type: text/html", "", "<!-- Alarm relay panel -->"]);
        setExit(0); return;
      }
      if (curlUrl.indexOf("vault") !== -1) {
        printLines(out, ["HTTP/1.1 403 Forbidden", "Server: nginx/1.27", ""]);
        setExit(0); return;
      }
      err(out, "curl: (6) Could not resolve host: " + curlUrl);
      return;
    }

    if (cmd === "scp" || cmd === "sftp") {
      err(out, cmd + ": mesh relay — utilisez ssh ops@pivot");
      return;
    }

    if (cmd === "source" || cmd === ".") {
      setExit(0); return;
    }

    if (cmd === "export" || cmd === "unset" || cmd === "set") {
      setExit(0); return;
    }

    if (cmd === "true") { setExit(0); return; }
    if (cmd === "false") { setExit(1); return; }

    if (cmd === "alias") {
      printLines(out, [
        "alias la='ls -la'",
        "alias ll='ls -alF'",
        "alias l='ls -CF'",
        "alias mission='cd ~/Documents/DOSSIER_OMEGA && ls'",
        "alias kali='ls /usr/bin | head -40'",
        "alias tools='cat /usr/share/kali-tools-index.txt | less'",
      ]);
      setExit(0);
      return;
    }

    if (dispatchKaliTool(cmd, args, out, onComplete) === "async") {
      asyncPending = true;
      return;
    }

    err(out, "bash: " + cmd + ": command not found");
    setExit(127);
    } finally {
      if (!asyncPending && onComplete) onComplete();
    }
  }

  function motd(out) {
    var toolCount = global.OmegaKaliFs ? OmegaKaliFs.ALL_BINS.length : Object.keys(SHELL_KALI_FALLBACK).length;
    printLines(out, [
      "Linux kali 6.6.0-kali3-amd64 #1 SMP PREEMPT_DYNAMIC x86_64 GNU/Linux",
      "",
      "The programs included with the Kali GNU/Linux system are free software;",
      "the exact distribution terms for each program are described in the",
      "individual files in /usr/share/doc/*/copyright.",
      "",
      "Kali GNU/Linux Rolling 2026.1 comes with " + toolCount + " security tools (/usr/bin).",
      "Last login: " + new Date().toLocaleString("en-US") + " on tty1",
      "",
    ], "sh-dim");
  }

  function init() {
    var out = document.getElementById("shellOut");
    var input = document.getElementById("shellInput");
    var promptEl = document.getElementById("shellPrompt");
    if (!out || !input || !promptEl) return;

    function syncPrompt() {
      promptEl.textContent = prompt();
    }

    function startup() {
      out.innerHTML = "";
      motd(out);
      if (global.OmegaKaliFs && OmegaKaliFs.probeWorkstation) {
        OmegaKaliFs.probeWorkstation(function (ok, data) {
          if (ok && data && data.mode === "kali-dynamic") {
            printLines(
              out,
              [
                "Workstation Kali active — binaires réels (PATH dynamique, " +
                  (data.bins_in_path || "?") +
                  " exécutables).",
              ],
              "sh-ok"
            );
          } else if (ok && data && data.real_tools) {
            printLines(
              out,
              [
                "Workstation active — exécution réelle : " +
                  data.real_tools.slice(0, 8).join(", ") +
                  (data.real_tools.length > 8 ? ", …" : ""),
              ],
              "sh-ok"
            );
          } else {
            printLines(
              out,
              [
                "Workstation hors ligne — démarrez : docker compose up -d workstation",
                "Outils en mode local jusqu'à connexion (port 18083).",
              ],
              "sh-warn"
            );
          }
          out.scrollTop = out.scrollHeight;
        });
      }
      if (!isOsintOk()) {
        printLines(out, [
          "*** ACCÈS PIVOT VERROUILLÉ — valider ClearanceForm (ssh ops@pivot) ***",
        ], "sh-warn");
      }
      syncPrompt();
    }

    startup();

    var preset = "";
    try {
      preset = sessionStorage.getItem("omegaShellRun") || "";
      if (preset) sessionStorage.removeItem("omegaShellRun");
    } catch (e) {}
    if (preset) {
      runCommand(preset, out);
      syncPrompt();
    }

    function submitLine() {
      var line = input.value;
      input.value = "";
      if (!line.trim()) {
        syncPrompt();
        return;
      }

      if (line.trim() === "yes" && !sshHostKeyAccepted && isOsintOk()) {
        sshHostKeyAccepted = true;
        history.push(line);
        histIdx = history.length;
        var echoY = document.createElement("div");
        echoY.className = "sh-line sh-cmd";
        echoY.textContent = prompt() + line;
        out.appendChild(echoY);
        printLines(out, ["Warning: Permanently added 'pivot' (ED25519) to the list of known hosts."], "sh-dim");
        printLines(out, ["(tapez: ssh ops@pivot)"], "sh-dim");
        syncPrompt();
        return;
      }

      history.push(line);
      histIdx = history.length;

      var echo = document.createElement("div");
      echo.className = "sh-line sh-cmd";
      echo.textContent = prompt() + line;
      out.appendChild(echo);

      input.disabled = true;
      function done() {
        input.disabled = false;
        syncPrompt();
        out.scrollTop = out.scrollHeight;
        input.focus();
      }
      runCommand(line, out, done);
    }

    input.addEventListener("keydown", function (e) {
      if (e.key === "Enter") {
        e.preventDefault();
        submitLine();
        return;
      }
      if (e.key === "Tab") {
        e.preventDefault();
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        if (!history.length) return;
        histIdx = Math.max(0, histIdx - 1);
        input.value = history[histIdx] || "";
        return;
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        if (!history.length) return;
        histIdx = Math.min(history.length, histIdx + 1);
        input.value = histIdx >= history.length ? "" : history[histIdx];
      }
    });

    input.focus();
    global.OmegaShell = {
      resetSession: function () {
        session = SESSION_LOCAL;
        cwdLocal = "/home/operator";
        cwdPivot = "/home/ops";
        sshHostKeyAccepted = false;
        startup();
      },
      getExitCode: function () {
        return LAST_EXIT;
      },
    };
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})(window);
