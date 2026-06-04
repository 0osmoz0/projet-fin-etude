/**
 * Toolchain Kali GNU/Linux — VFS /usr/bin + exécution simulée dans le shell.
 */
(function (global) {
  "use strict";

  var KALI_CATEGORIES = {
    net: {
      label: "Information Gathering",
      tools: [
        "nmap", "masscan", "rustscan", "netdiscover", "arp-scan", "enum4linux", "enum4linux-ng",
        "smbclient", "rpcclient", "nbtscan", "responder", "crackmapexec", "kerbrute", "ldapsearch",
        "snmpwalk", "onesixtyone", "fierce", "dnsenum", "dnsrecon", "theharvester", "recon-ng",
        "dmitry", "whois", "netcat", "nc", "ncat", "socat", "proxychains4", "proxychains",
        "chisel", "ligolo-ng", "traceroute", "tracepath", "hping3", "nping",
      ],
    },
    web: {
      label: "Web Application Analysis",
      tools: [
        "nikto", "nuclei", "sqlmap", "wpscan", "joomscan", "commix", "ffuf", "gobuster", "dirb",
        "dirsearch", "feroxbuster", "wfuzz", "whatweb", "wafw00f", "burpsuite", "zaproxy", "zap",
        "beef-xss", "beef", "weevely", "httpx", "httprobe", "arjun", "dalfox",
      ],
    },
    exploit: {
      label: "Exploitation Tools",
      tools: [
        "msfvenom", "searchsploit", "exploitdb", "setoolkit", "set", "msfdb",
        "impacket-psexec", "impacket-secretsdump", "impacket-wmiexec", "evil-winrm", "psexec.py",
        "secretsdump.py", "kerberos-userenum", "bloodhound-python", "bloodhound", "pwncat",
      ],
    },
    crack: {
      label: "Password Attacks",
      tools: [
        "john", "hashcat", "hydra", "medusa", "ncrack", "patator", "crunch", "cewl", "ophcrack",
        "pdfcrack", "fcrackzip", "hashid", "haiti", "cupp", "pipal", "crowbar",
      ],
    },
    sniff: {
      label: "Sniffing & Spoofing",
      tools: [
        "tcpdump", "tshark", "wireshark", "ettercap", "ettercap-text-only", "bettercap", "mitmproxy",
        "sslscan", "testssl.sh", "sslyze",
      ],
    },
    wireless: {
      label: "Wireless Attacks",
      tools: [
        "aircrack-ng", "airmon-ng", "airodump-ng", "aireplay-ng", "wifite", "reaver", "bully",
        "kismet", "hostapd-mana", "wash", "pixiewps",
      ],
    },
    forensics: {
      label: "Forensics",
      tools: [
        "binwalk", "foremost", "volatility", "vol", "autopsy", "steghide", "exiftool", "strings",
        "xxd", "radare2", "r2", "gdb", "objdump", "readelf", "strace", "ltrace",
      ],
    },
    misc: {
      label: "Utilities",
      tools: [
        "wget", "git", "python3", "python", "perl", "ruby", "openssl", "sshpass",
        "rsync", "vim", "nano", "htop", "tmux", "lsof", "nload", "iftop", "base64",
        "gpg", "tor", "maltego", "kali-tools", "kat",
      ],
    },
  };

  var BIN_TO_CATEGORY = {};
  var ALL_BINS = [];

  Object.keys(KALI_CATEGORIES).forEach(function (cat) {
    KALI_CATEGORIES[cat].tools.forEach(function (name) {
      if (BIN_TO_CATEGORY[name]) return;
      BIN_TO_CATEGORY[name] = cat;
      ALL_BINS.push(name);
    });
  });

  ALL_BINS.sort();

  function baseName(cmd) {
    var c = String(cmd || "").trim();
    var i = c.lastIndexOf("/");
    return i === -1 ? c : c.slice(i + 1);
  }

  function isKaliBin(cmd) {
    return Object.prototype.hasOwnProperty.call(BIN_TO_CATEGORY, baseName(cmd));
  }

  function nowStamp() {
    return new Date().toISOString().replace("T", " ").slice(0, 19);
  }

  function nmapUsage() {
    return [
      "Nmap 7.94SVN ( https://nmap.org )",
      "Usage: nmap [Scan Type(s)] [Options] {target specification}",
      "TARGET SPECIFICATION:",
      "  Can pass hostnames, IP addresses, networks, etc.",
      "  Ex: scanme.nmap.org, 192.168.1.0/24, localhost",
      "SCAN TECHNIQUES:",
      "  -sS  TCP SYN scan    -sT  TCP connect scan    -sU  UDP scan",
      "  -sn  Ping scan       -sV  Version detection   -O   OS detection",
      "EXAMPLES:",
      "  nmap -sV pivot",
      "  nmap -p 22,80,443 127.0.0.1",
      "  nmap -sn 10.42.0.0/24",
      "",
      "See the man page for more options.",
    ];
  }

  function nmapScan(target, args) {
    var t = (target || "").toLowerCase();
    var ports = ["22/tcp  open  ssh", "80/tcp  open  http"];
    var host = target || "localhost";
    var ip = "127.0.0.1";

    if (t.indexOf("pivot") !== -1 || t === "10.42.0.12") {
      ip = "10.42.0.12";
      host = "pivot";
      ports = ["22/tcp   open  ssh", "8080/tcp open  http-proxy"];
    } else if (t.indexOf("18081") !== -1 || t.indexOf("partner") !== -1 || t.indexOf("blacktide") !== -1) {
      ip = "127.0.0.1";
      host = target;
      ports = ["8080/tcp open  http-alt", "443/tcp  closed https"];
    } else if (t.indexOf("18080") !== -1 || t === "localhost" || t === "127.0.0.1") {
      ports = ["8080/tcp open  http-alt"];
    } else if (t.indexOf("cctv") !== -1) {
      ip = "10.42.0.21";
      ports = ["8080/tcp open  http"];
    } else if (t.indexOf("alarm") !== -1) {
      ip = "10.42.0.22";
      ports = ["8080/tcp open  http"];
    } else if (t.indexOf("vault") !== -1) {
      ip = "10.42.0.23";
      ports = ["8080/tcp open  http"];
    }

    var pingOnly = args.indexOf("-sn") !== -1 || args.indexOf("-sP") !== -1;
    var lines = [
      "Starting Nmap 7.94SVN ( https://nmap.org ) at " + nowStamp(),
    ];
    if (pingOnly) {
      lines.push("Nmap scan report for " + host + " (" + ip + ")");
      lines.push("Host is up (0.00089s latency).");
      lines.push("Nmap done: 1 IP address (1 host up) scanned in 0.42 seconds");
      return lines;
    }

    lines.push("Nmap scan report for " + host + " (" + ip + ")");
    lines.push("Host is up (0.00041s latency).");
    lines.push("");
    lines.push("PORT     STATE SERVICE");
    ports.forEach(function (p) {
      lines.push(p);
    });
    lines.push("");
    lines.push("Nmap done: 1 IP address (1 host up) scanned in 1.24 seconds");
    return lines;
  }

  var wsReady = false;
  var wsDynamic = false;
  var wsBase = null;

  function workstationBase() {
    if (wsBase) return wsBase;
    if (
      typeof global.location !== "undefined" &&
      global.location.origin &&
      global.OMEGA_WORKSTATION_DIRECT !== true
    ) {
      wsBase = global.location.origin + "/workstation-api";
      return wsBase;
    }
    var host =
      typeof global.location !== "undefined" && global.location.hostname
        ? global.location.hostname
        : "127.0.0.1";
    var port = global.OMEGA_WORKSTATION_PORT || "18083";
    wsBase = "http://" + host + ":" + port;
    return wsBase;
  }

  function probeWorkstation(cb) {
    fetch(workstationBase() + "/api/health", { method: "GET" })
      .then(function (r) {
        return r.ok ? r.json() : null;
      })
      .then(function (d) {
        wsReady = !!(d && d.status === "ok");
        wsDynamic = !!(d && (d.mode === "kali-dynamic" || d.path_execution === true));
        if (cb) cb(wsReady, d);
      })
      .catch(function () {
        wsReady = false;
        if (cb) cb(false);
      });
  }

  function canRunRemote(name) {
    return wsReady && isKaliBin(name);
  }

  function execToolSimulated(name, args, sessionCtx) {
    var wantHelp = args.indexOf("-h") !== -1 || args.indexOf("--help") !== -1;
    var wantVer = args.indexOf("--version") !== -1 || args.indexOf("-V") !== -1;
    var cat = BIN_TO_CATEGORY[name] || "misc";

    if (wantVer) {
      return { lines: [name + " 2026.1.0"], exit: 0 };
    }

    if (name === "nmap") {
      var targets = args.filter(function (a) {
        return a[0] !== "-";
      });
      if (!targets.length && !args.some(function (a) {
        return a === "-sn" || a === "-sP";
      })) {
        return { lines: nmapUsage(), exit: 1 };
      }
      return { lines: nmapScan(targets[0] || "127.0.0.1", args), exit: 0 };
    }

    if (name === "masscan") {
      var t2 = args.filter(function (a) {
        return a[0] !== "-";
      })[0] || "127.0.0.1";
      return {
        lines: [
          "Starting masscan 1.3.2 at " + nowStamp(),
          "Initiating SYN Stealth Scan",
          "Scanning " + t2 + " [65535 ports]",
          "Discovered open port 8080/tcp on " + t2,
          "Discovered open port 22/tcp on " + t2,
        ],
        exit: 0,
      };
    }

    if (name === "sqlmap") {
      if (!args.length || wantHelp) {
        return {
          lines: [
            "sqlmap/1.8.4#stable",
            "Usage: python sqlmap.py [options]",
            "  -u URL, --data=DATA   Target URL",
            "  --batch               Never ask for user input",
          ],
          exit: 0,
        };
      }
      return {
        lines: [
          "[*] starting @ " + nowStamp(),
          "[INFO] testing connection to the target URL",
          "[WARNING] heuristic (basic) test shows that GET parameter might not be injectable",
          "[INFO] fetched data logged to text files under '~/.local/share/sqlmap/output/'",
        ],
        exit: 0,
      };
    }

    if (name === "gobuster" || name === "ffuf" || name === "dirb" || name === "dirsearch" || name === "feroxbuster") {
      var url = args.filter(function (a) {
        return a.indexOf("http") === 0;
      })[0];
      if (!url) {
        return {
          lines: [
            name + " — mode dir",
            "Usage: " + name + " dir -u http://TARGET/ -w /usr/share/wordlists/dirb/common.txt",
          ],
          exit: 1,
        };
      }
      return {
        lines: [
          "===============================================================",
          "Gobuster " + (name === "gobuster" ? "v3.6" : "") + " by OJ Reeves",
          "===============================================================",
          "[+] Url: " + url,
          "[+] Method: GET",
          "/partner.html        (Status: 200) [Size: 2048]",
          "/robots.txt          (Status: 200) [Size: 312]",
          "/internal            (Status: 403) [Size: 128]",
          "===============================================================",
          "Finished",
        ],
        exit: 0,
      };
    }

    if (name === "nikto") {
      return {
        lines: [
          "- Nikto v2.5.0",
          "+ Target IP:          127.0.0.1",
          "+ Target Hostname:    localhost",
          "+ Start Time:         " + nowStamp(),
          "+ Server: nginx/1.27",
          "+ /partner.html: Link found",
        ],
        exit: 0,
      };
    }

    if (name === "msfvenom") {
      return {
        lines: [
          "MsfVenom -- a Metasploit payload generator",
          "Usage: msfvenom -p payload LHOST=ip LPORT=port -f format",
        ],
        exit: 0,
      };
    }

    if (name === "searchsploit") {
      var q = args.filter(function (a) {
        return a[0] !== "-";
      }).join(" ");
      return {
        lines: q
          ? [
              "Exploit Database search: " + q,
              "Exploit Title                                      |  Path",
              "Black Tide Partner Gateway RCE                     |  php/webapps/4421.php",
            ]
          : ["Usage: searchsploit apache | php | nginx"],
        exit: 0,
      };
    }

    if (name === "john") {
      return {
        lines: [
          "John the Ripper 1.9.0-jumbo",
          "Usage: john [OPTIONS] [PASSWORD-FILES]",
          "Wordlist: /usr/share/wordlists/rockyou.txt.gz",
        ],
        exit: args.length ? 0 : 1,
      };
    }

    if (name === "hashcat") {
      return {
        lines: [
          "hashcat (v6.2.6) starting",
          "Usage: hashcat -m MODE hashfile wordfile",
          "OpenCL: Platform #0: Portable Computing Language",
        ],
        exit: 0,
      };
    }

    if (name === "hydra") {
      return {
        lines: [
          "Hydra v9.5 (c) 2023 by van Hauser/THC & David Maciejak",
          "Syntax: hydra -l user -P passlist target service",
        ],
        exit: 0,
      };
    }

    if (name === "aircrack-ng") {
      if (sessionCtx !== "pivot") {
        return {
          lines: [
            "No such wireless device: wlan0",
            "Available interfaces: eth0",
          ],
          exit: 1,
        };
      }
      return { lines: ["aircrack-ng 1.7 - (C) 2006-2023 Thomas d'Otreppe"], exit: 0 };
    }

    if (name === "wireshark" || name === "tshark") {
      return {
        lines: [
          name + " 4.2.5",
          "Capturing on 'eth0'",
          "1 packet captured",
        ],
        exit: 0,
      };
    }

    if (name === "tcpdump") {
      return {
        lines: [
          "tcpdump: verbose output suppressed, use -v[v]... for full protocol decode",
          "listening on eth0, link-type EN10MB (Ethernet), snapshot length 262144 bytes",
          "08:12:01.442 IP 10.0.0.1.54321 > 10.42.0.12.22: Flags [S], seq 1, win 64240",
        ],
        exit: 0,
      };
    }

    if (name === "burpsuite" || name === "zaproxy" || name === "zap") {
      return {
        lines: [
          "Burp Suite Community Edition",
          "Proxy listener: 127.0.0.1:8080 (inactive — start from Applications menu)",
        ],
        exit: 0,
      };
    }

    if (name === "setoolkit" || name === "set") {
      return {
        lines: [
          "[*] The Social-Engineer Toolkit (SET) v8.0.3",
          "  1) Social-Engineering Attacks",
          "  2) Penetration Testing (Fast-Track)",
          "  99) Exit the Social-Engineer Toolkit",
        ],
        exit: 0,
      };
    }

    if (name === "netcat" || name === "nc" || name === "ncat") {
      if (!args.length) {
        return { lines: [name + ": missing target/port — usage: nc -lvnp PORT"], exit: 1 };
      }
      return { lines: ["listening on [any] " + (args[args.length - 1] || "4444") + " ..."], exit: 0 };
    }

    if (name === "theharvester" || name === "dnsrecon" || name === "fierce" || name === "dnsenum") {
      return {
        lines: [
          "[*] Performing OSINT gathering...",
          "[+] Hosts found: 3",
          "partner.blacktide-corp.tld",
          "auth-gateway.internal",
        ],
        exit: 0,
      };
    }

    if (name === "crackmapexec" || name === "responder" || name === "enum4linux" || name === "enum4linux-ng") {
      return {
        lines: [
          "[*] " + name + " " + nowStamp(),
          "[+] Pivot 10.42.0.12 — SMB signing:False",
          "[+] Found share: ops$",
        ],
        exit: 0,
      };
    }

    if (wantHelp) {
      return {
        lines: [name + " — " + KALI_CATEGORIES[cat].label, "Try: " + name + " --help"],
        exit: 0,
      };
    }

    if (!args.length) {
      return {
        lines: [name + " — " + KALI_CATEGORIES[cat].label, "Run: " + name + " --help"],
        exit: 0,
      };
    }

    return {
      lines: ["[*] " + name + " " + args.join(" "), "[*] Done."],
      exit: 0,
    };
  }

  function installKaliVfs(addDir, addFile, addSymlink, opts) {
    var mt = opts.mtime;
    var mt2 = opts.mtime2;
    var root = { owner: "root", group: "root", mtime: mt2 };

    addDir("/bin", root);
    addDir("/sbin", root);
    addDir("/usr", root);
    addDir("/usr/bin", root);
    addDir("/usr/sbin", root);
    addDir("/usr/local", root);
    addDir("/usr/local/bin", root);
    addDir("/usr/share", root);
    addDir("/usr/share/kali-defaults", root);
    addDir("/usr/share/metasploit-framework", root);
    addDir("/usr/share/wordlists", root);
    addDir("/etc", root);

    addFile(
      "/etc/os-release",
      'PRETTY_NAME="Kali GNU/Linux Rolling"\n' +
        'NAME="Kali GNU/Linux"\n' +
        'VERSION_ID="2026.1"\n' +
        'VERSION="2026.1"\n' +
        'VERSION_CODENAME=kali-rolling\n' +
        'ID=kali\n' +
        'ID_LIKE=debian\n' +
        'HOME_URL="https://www.kali.org/"\n',
      { owner: "root", group: "root", mtime: mt2, size: 200 }
    );
    addFile("/etc/debian_version", "kali-rolling\n", root);
    addFile(
      "/usr/share/kali-defaults/kali-version",
      "Kali GNU/Linux Rolling 2026.1\n",
      root
    );
    addFile(
      "/usr/share/wordlists/README",
      "Wordlists: rockyou, dirb, seclists, wfuzz — /usr/share/wordlists/\n",
      root
    );
    addFile(
      "/usr/share/metasploit-framework/README",
      "Metasploit Framework — /usr/bin/msfvenom, searchsploit\n",
      root
    );

    var stubBody = "#!/bin/sh\n# Kali GNU/Linux\n";
    ALL_BINS.forEach(function (name) {
      addFile("/usr/bin/" + name, stubBody, {
        mode: "-rwxr-xr-x",
        owner: "root",
        group: "root",
        mtime: mt2,
        size: 24,
      });
    });

    ["tcpdump", "iptables"].forEach(function (name) {
      addFile("/usr/sbin/" + name, stubBody, {
        mode: "-rwxr-xr-x",
        owner: "root",
        group: "root",
        mtime: mt2,
        size: 24,
      });
    });

    var indexLines = ["Kali Linux — installed security tools (" + ALL_BINS.length + ")\n"];
    Object.keys(KALI_CATEGORIES).forEach(function (cat) {
      indexLines.push("\n## " + KALI_CATEGORIES[cat].label);
      KALI_CATEGORIES[cat].tools.forEach(function (t) {
        indexLines.push("  /usr/bin/" + t);
      });
    });
    addFile("/usr/share/kali-tools-index.txt", indexLines.join("\n") + "\n", root);
  }

  function dpkgListLines() {
    var lines = [
      "Desired=Unknown/Install/Remove/Purge/Hold",
      "Status=Not/Inst/Conf-files/Unpacked/halF-conf/Half-inst/trig-aWait/Trig-pend",
      "Err?=(none)/Reinst-required/...",
      "ii  kali-linux-default                 2026.1.0    amd64        Kali default toolset",
    ];
    ALL_BINS.slice(0, 60).forEach(function (name) {
      var pkg = "kali-tools-" + name.replace(/[^a-z0-9+]/gi, "-").slice(0, 28);
      lines.push("ii  " + pkg.padEnd(36) + " 2026.1.0    amd64        " + name);
    });
    return lines;
  }

  function execToolRemote(name, args, sessionCtx, done) {
    name = baseName(name);
    if (!canRunRemote(name)) {
      done(execToolSimulated(name, args, sessionCtx));
      return;
    }
    fetch(workstationBase() + "/api/v1/run", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tool: name,
        args: args || [],
        session: sessionCtx || "local",
      }),
    })
      .then(function (r) {
        return r.json();
      })
      .then(function (data) {
        if (data.fallback || !data.executed) {
          done(execToolSimulated(name, args, sessionCtx));
          return;
        }
        var lines = (data.stdout || "").split("\n");
        if (data.stderr) {
          lines = lines.concat(data.stderr.split("\n"));
        }
        if (data.duration_ms) {
          lines.push("[durée réelle: " + (data.duration_ms / 1000).toFixed(1) + " s]");
        }
        done({ lines: lines, exit: typeof data.exit_code === "number" ? data.exit_code : 0 });
      })
      .catch(function () {
        wsReady = false;
        done(execToolSimulated(name, args, sessionCtx));
      });
  }

  function execTool(name, args, sessionCtx) {
    return execToolSimulated(name, args, sessionCtx);
  }

  global.OmegaKaliFs = {
    ALL_BINS: ALL_BINS,
    KALI_CATEGORIES: KALI_CATEGORIES,
    isWorkstationDynamic: function () {
      return wsDynamic;
    },
    installKaliVfs: installKaliVfs,
    isKaliBin: isKaliBin,
    baseName: baseName,
    execTool: execTool,
    execToolSimulated: execToolSimulated,
    execToolRemote: execToolRemote,
    canRunRemote: canRunRemote,
    probeWorkstation: probeWorkstation,
    workstationBase: workstationBase,
    kaliStubResponse: function (cmd, args) {
      return execToolSimulated(baseName(cmd), args, "local");
    },
    dpkgListLines: dpkgListLines,
  };
})(window);
