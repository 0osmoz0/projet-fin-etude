/**
 * GUI simulées pour les outils Kali (icônes bureau + kali-apps).
 */
(function (global) {
  "use strict";

  var LAB_TARGET = "pivot";
  var LAB_URL = "http://127.0.0.1:18081/";

  var TOOL_META = {
    nmap: { title: "Nmap", subtitle: "Network Mapper 7.99", accent: "#3ecf8e" },
    burpsuite: { title: "Burp Suite", subtitle: "Community Edition", accent: "#ff6633" },
    searchsploit: { title: "Exploit Database", subtitle: "searchsploit", accent: "#58a6ff" },
    wireshark: { title: "Wireshark", subtitle: "4.2.5", accent: "#1679a8" },
    sqlmap: { title: "sqlmap", subtitle: "1.8.4#stable", accent: "#d29922" },
    john: { title: "John the Ripper", subtitle: "1.9.0-jumbo", accent: "#f0883e" },
    hashcat: { title: "hashcat", subtitle: "6.2.6", accent: "#a371f7" },
    hydra: { title: "Hydra", subtitle: "9.5", accent: "#f85149" },
    gobuster: { title: "Gobuster", subtitle: "v3.6", accent: "#3fb950" },
    nikto: { title: "Nikto", subtitle: "2.5.0", accent: "#79c0ff" },
    "aircrack-ng": { title: "Aircrack-ng", subtitle: "1.7", accent: "#56d364" },
    ffuf: { title: "ffuf", subtitle: "Fuzzer", accent: "#bc8cff" },
    setoolkit: { title: "Social-Engineer Toolkit", subtitle: "8.0.3", accent: "#ff7b72" },
    ettercap: { title: "Ettercap", subtitle: "0.8.3", accent: "#ffa657" },
    maltego: { title: "Maltego CE", subtitle: "Graph view", accent: "#539bf5" },
  };

  function meta(tool) {
    return TOOL_META[tool] || { title: tool, subtitle: "Kali GNU/Linux", accent: "#58a6ff" };
  }

  function qs(name) {
    var m = new RegExp("[?&]" + name + "=([^&]*)").exec(global.location.search);
    return m ? decodeURIComponent(m[1].replace(/\+/g, " ")) : "";
  }

  function el(tag, cls, html) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html !== undefined) e.innerHTML = html;
    return e;
  }

  function defaultForm(tool) {
    var f = el("div");
    f.innerHTML =
      '<label>Cible</label><input type="text" class="wide ktg-in-target" value="' +
      (tool.indexOf("http") === 0 ? LAB_URL : LAB_TARGET) +
      '">';
    return f;
  }

  function buildToolbar(tool, root) {
    var bar = el("div", "ktg-toolbar");
    var m = meta(tool);

    if (tool === "nmap") {
      bar.innerHTML =
        '<label>Hôte</label><input class="ktg-in-target" value="pivot">' +
        '<label>Ports</label><input class="ktg-in-ports" value="22,8080" style="width:90px">' +
        '<label><input type="checkbox" class="ktg-in-sv"> -sV</label>';
    } else if (tool === "gobuster" || tool === "ffuf" || tool === "dirb") {
      bar.innerHTML =
        '<label>URL</label><input class="wide ktg-in-target" value="' +
        LAB_URL +
        '">' +
        '<label>Wordlist</label><input class="ktg-in-wl" value="/usr/share/wordlists/dirb/common.txt" style="min-width:200px">';
    } else if (tool === "nikto" || tool === "sqlmap" || tool === "wpscan") {
      bar.innerHTML =
        '<label>URL</label><input class="wide ktg-in-target" value="' +
        LAB_URL +
        'partner.html">';
    } else if (tool === "searchsploit") {
      bar.innerHTML =
        '<label>Recherche</label><input class="wide ktg-in-target" value="apache">';
    } else if (tool === "hydra") {
      bar.innerHTML =
        '<label>Cible</label><input class="ktg-in-target" value="pivot">' +
        '<label>Service</label><select class="ktg-in-svc"><option>ssh</option><option>http-post</option></select>' +
        '<label>User</label><input class="ktg-in-user" value="ops" style="width:70px">';
    } else if (tool === "john" || tool === "hashcat") {
      bar.innerHTML =
        '<label>Hash file</label><input class="wide ktg-in-target" value="/tmp/hash.txt">' +
        '<label>Wordlist</label><input class="ktg-in-wl" value="/usr/share/wordlists/rockyou.txt">';
    } else if (tool === "burpsuite") {
      bar.innerHTML =
        '<span style="color:#8b949e">Proxy</span> <code>127.0.0.1:8080</code> · Scope: <input class="wide ktg-in-target" value="' +
        LAB_URL +
        '">';
    } else if (tool === "wireshark") {
      bar.innerHTML =
        '<label>Interface</label><select><option>eth0 (active)</option><option>any</option></select>' +
        '<label>Filtre</label><input class="ktg-in-target" value="tcp port 8080" style="min-width:160px">';
    } else if (tool === "aircrack-ng") {
      bar.innerHTML =
        '<label>Interface</label><select><option>wlan0 (non disponible — lab eth0)</option></select>' +
        '<label>Capture</label><input value="lab-01.cap" style="width:120px">';
    } else {
      bar.appendChild(defaultForm(tool));
    }

    var run = el("button", "ktg-btn", "Exécuter");
    run.type = "button";
    run.addEventListener("click", function () {
      runScan(tool, root, bar);
    });
    bar.appendChild(run);
    return bar;
  }

  function buildCanvas(tool) {
    var c = el("div", "ktg-canvas");
    if (tool === "wireshark") {
      c.innerHTML =
        '<table class="ktg-packet-table"><thead><tr><th>No.</th><th>Time</th><th>Source</th><th>Destination</th><th>Protocol</th><th>Info</th></tr></thead>' +
        "<tbody>" +
        "<tr><td>1</td><td>0.000</td><td>10.0.0.1</td><td>10.42.0.12</td><td>TCP</td><td>8080 → 54321 [SYN]</td></tr>" +
        "<tr><td>2</td><td>0.012</td><td>10.42.0.12</td><td>10.0.0.1</td><td>TCP</td><td>54321 → 8080 [SYN, ACK]</td></tr>" +
        "<tr><td>3</td><td>0.441</td><td>10.0.0.1</td><td>10.42.0.12</td><td>HTTP</td><td>GET /partner.html</td></tr>" +
        "</tbody></table>";
    } else if (tool === "maltego") {
      c.innerHTML =
        '<div class="ktg-graph">' +
        '<span class="ktg-node" style="left:12%;top:35%">blacktide-corp.tld</span>' +
        '<span class="ktg-node" style="left:42%;top:20%">pivot</span>' +
        '<span class="ktg-node" style="left:68%;top:45%">auth-gateway</span>' +
        '<span class="ktg-node" style="left:35%;top:62%">ops@pivot</span>' +
        "</div>";
    } else if (tool === "burpsuite") {
      c.className = "ktg-canvas ktg-burp-layout";
      c.innerHTML =
        '<div class="ktg-pane"><strong>Target</strong> — Scope: partenaire Black Tide</div>' +
        '<div class="ktg-pane"><strong>Proxy</strong> — Intercept: off · Historique vide</div>' +
        '<div class="ktg-pane"><strong>Scanner</strong> — Prêt (mode Community)</div>';
    } else if (tool === "setoolkit") {
      c.innerHTML =
        "<pre style='margin:0;color:#c9d1d9'>[*] The Social-Engineer Toolkit (SET)\n" +
        "  1) Social-Engineering Attacks\n" +
        "  2) Penetration Testing (Fast-Track)\n" +
        "  3) Third Party Modules\n" +
        "  99) Exit\n\n" +
        "Choisissez une option dans la barre puis Exécuter.</pre>";
    } else if (tool === "ettercap") {
      c.innerHTML =
        "<pre style='margin:0'>Hosts unifiés:\n" +
        "  10.0.0.1    ops-workstation\n" +
        "  10.42.0.12  pivot\n" +
        "MITM: désactivé (mode lab)</pre>";
    } else {
      c.innerHTML =
        '<p style="color:#8b949e;margin:0">Configurez les paramètres puis cliquez <strong>Exécuter</strong>.</p>';
    }
    return c;
  }

  function argsForTool(tool, bar) {
    var t = bar.querySelector(".ktg-in-target");
    var target = t ? t.value.trim() : LAB_TARGET;
    if (tool === "nmap") {
      var ports = (bar.querySelector(".ktg-in-ports") || {}).value || "22,8080";
      var args = ["-p", ports, target];
      if (bar.querySelector(".ktg-in-sv") && bar.querySelector(".ktg-in-sv").checked) {
        args = ["-sV", "-p", ports, target];
      }
      return args;
    }
    if (tool === "gobuster") {
      return [
        "dir",
        "-u",
        target,
        "-w",
        (bar.querySelector(".ktg-in-wl") || {}).value || "/usr/share/wordlists/dirb/common.txt",
      ];
    }
    if (tool === "ffuf") {
      var u = target.indexOf("FUZZ") !== -1 ? target : target.replace(/\/?$/, "/") + "FUZZ";
      return [
        "-u",
        u,
        "-w",
        (bar.querySelector(".ktg-in-wl") || {}).value || "/usr/share/wordlists/dirb/common.txt",
      ];
    }
    if (tool === "nikto") return ["-h", target];
    if (tool === "sqlmap") return ["-u", target, "--batch"];
    if (tool === "searchsploit") return target.split(/\s+/).filter(Boolean);
    if (tool === "hydra") {
      return [
        "-l",
        (bar.querySelector(".ktg-in-user") || {}).value || "ops",
        "-P",
        "/usr/share/wordlists/rockyou.txt",
        target,
        (bar.querySelector(".ktg-in-svc") || {}).value || "ssh",
      ];
    }
    if (tool === "john") return ["--wordlist=" + ((bar.querySelector(".ktg-in-wl") || {}).value || "/usr/share/wordlists/rockyou.txt"), target];
    if (tool === "hashcat") return ["-m", "0", target, (bar.querySelector(".ktg-in-wl") || {}).value || "/usr/share/wordlists/rockyou.txt"];
    if (tool === "burpsuite" || tool === "wireshark" || tool === "maltego" || tool === "setoolkit" || tool === "ettercap" || tool === "aircrack-ng") {
      return ["--help"];
    }
    return ["--help"];
  }

  function runScan(tool, root, bar) {
    var out = root.querySelector(".ktg-output");
    var status = root.querySelector(".ktg-status");
    if (!out) return;
    out.classList.remove("ktg-output--dim");
    out.textContent = "[*] Exécution en cours…\n";
    if (status) status.textContent = tool + " — running";

    var args = argsForTool(tool, bar);
    var name = tool === "metasploit" ? "searchsploit" : tool;

    function show(res) {
      out.textContent = (res.lines || []).join("\n");
      if (status) {
        status.textContent = tool + " — " + (res.exit === 0 ? "terminé" : "code " + res.exit);
      }
    }

    if (global.OmegaKaliFs && OmegaKaliFs.canRunRemote(name)) {
      OmegaKaliFs.probeWorkstation(function () {
        if (OmegaKaliFs.canRunRemote(name)) {
          OmegaKaliFs.execToolRemote(name, args, "local", show);
        } else {
          show(global.OmegaKaliFs.execTool(name, args, "local"));
        }
      });
    } else if (global.OmegaKaliFs && OmegaKaliFs.execTool) {
      show(OmegaKaliFs.execTool(name, args, "local"));
    } else {
      out.textContent = "[!] Module outils non chargé.";
    }
  }

  function mount(tool) {
    tool = (tool || "nmap").toLowerCase();
    if (tool === "metasploit") tool = "searchsploit";
    if (tool === "burp") tool = "burpsuite";
    if (tool === "set") tool = "setoolkit";
    if (tool === "aircrack") tool = "aircrack-ng";

    var m = meta(tool);
    document.title = "OMEGA · " + m.title;

    var app = el("div", "ktg-app");
    var menubar = el("div", "ktg-menubar");
    ["Fichier", "Édition", "Vue", "Outils", "Aide"].forEach(function (l) {
      menubar.appendChild(el("span", "", l));
    });

    var tabs = el("div", "ktg-tabs");
    ["Tableau de bord", "Session", "Résultats"].forEach(function (t, i) {
      tabs.appendChild(el("div", "ktg-tab" + (i === 0 ? " active" : ""), t));
    });

    var body = el("div", "ktg-body");
    var sidebar = el("div", "ktg-sidebar");
    ["Scan", "Cibles", "Profils", "Logs"].forEach(function (n, i) {
      sidebar.appendChild(el("div", "ktg-nav-item" + (i === 0 ? " active" : ""), n));
    });

    var main = el("div", "ktg-main");
    main.appendChild(buildToolbar(tool, app));
    main.appendChild(buildCanvas(tool));

    var output = el("div", "ktg-output ktg-output--dim");
    output.textContent = m.title + " — " + m.subtitle + "\nPrêt. Cible lab : pivot / " + LAB_URL;

    var status = el("div", "ktg-status");
    status.textContent = m.title + " — idle";

    main.appendChild(output);
    body.appendChild(sidebar);
    body.appendChild(main);

    app.appendChild(menubar);
    app.appendChild(tabs);
    app.appendChild(body);
    app.appendChild(status);

    document.body.appendChild(app);
    app._output = output;
  }

  global.KaliToolGui = { mount: mount, meta: meta };
})(window);
