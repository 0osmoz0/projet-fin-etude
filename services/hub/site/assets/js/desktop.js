/* =============================================================
   OMEGA-OS — Window Manager
   ============================================================= */

(function (global) {
  "use strict";

  var desktop     = null;
  var taskbarApps = null;
  var windows     = {};
  var zCounter    = 100;

  /* ---- utilitaires ---- */

  function el(tag, cls, html) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html !== undefined) e.innerHTML = html;
    return e;
  }

  function clamp(val, min, max) {
    return Math.max(min, Math.min(max, val));
  }

  function nextZ() { zCounter += 1; return zCounter }

  function deskW() { return desktop ? desktop.offsetWidth  : window.innerWidth  }
  function deskH() { return desktop ? desktop.offsetHeight : window.innerHeight - 38 }

  /* ---- icône SVG dans la titlebar (identique à l'icône bureau) ---- */
  var APP_ICONS = {
    mail:  '<svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="2"/><polyline points="3,5 12,13 21,5"/></svg>',
    osint: '<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><line x1="16.5" y1="16.5" x2="21" y2="21"/></svg>',
    valid: '<svg viewBox="0 0 24 24"><path d="M9 12l2 2 4-4"/><path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><polyline points="14 3 14 9 20 9"/></svg>',
    alarm: '<svg viewBox="0 0 24 24"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>',
    cctv:  '<svg viewBox="0 0 24 24"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/></svg>',
  };

  /* ---- focus ---- */

  function focusWin(id) {
    var w = windows[id];
    if (!w) return;
    w.el.style.zIndex = nextZ();
    w.el.classList.add("focused");
    Object.keys(windows).forEach(function (k) {
      if (k !== id) windows[k].el.classList.remove("focused");
    });
    document.querySelectorAll(".tb-btn").forEach(function (b) { b.classList.remove("active") });
    var btn = document.getElementById("tb-" + id);
    if (btn) btn.classList.add("active");
  }

  /* ---- drag titlebar ---- */

  function makeDraggable(handle, winEl) {
    handle.addEventListener("mousedown", function (e) {
      if (e.target.classList.contains("wc")) return;
      e.preventDefault();
      var ox = e.clientX - winEl.offsetLeft;
      var oy = e.clientY - winEl.offsetTop;

      function onMove(e2) {
        winEl.style.left = clamp(e2.clientX - ox, 0, deskW() - 80) + "px";
        winEl.style.top  = clamp(e2.clientY - oy, 0, deskH() - 30) + "px";
      }
      function onUp() {
        document.removeEventListener("mousemove", onMove);
        document.removeEventListener("mouseup", onUp);
      }
      document.addEventListener("mousemove", onMove);
      document.addEventListener("mouseup", onUp);
    });
  }

  /* ---- resize coin bas-droit ---- */

  function makeResizable(handle, winEl) {
    handle.addEventListener("mousedown", function (e) {
      e.preventDefault(); e.stopPropagation();
      var ox = e.clientX - winEl.offsetWidth;
      var oy = e.clientY - winEl.offsetHeight;

      function onMove(e2) {
        var nw = Math.max(320, e2.clientX - ox);
        var nh = Math.max(200, e2.clientY - oy);
        winEl.style.width  = nw + "px";
        winEl.style.height = nh + "px";
      }
      function onUp() {
        document.removeEventListener("mousemove", onMove);
        document.removeEventListener("mouseup", onUp);
      }
      document.addEventListener("mousemove", onMove);
      document.addEventListener("mouseup", onUp);
    });
  }

  /* ---- taskbar button ---- */

  function addTaskbarBtn(id, title) {
    var btn = el("button", "tb-btn active");
    btn.id = "tb-" + id;
    btn.textContent = title;
    btn.title = title;
    btn.setAttribute("role", "listitem");
    btn.addEventListener("click", function () {
      var w = windows[id];
      if (!w) return;
      if (w.minimized) {
        w.el.classList.remove("minimized");
        w.minimized = false;
        focusWin(id);
      } else if (Number(w.el.style.zIndex) === zCounter) {
        /* déjà au premier plan : minimiser */
        w.el.classList.add("minimized");
        w.minimized = true;
        btn.classList.remove("active");
      } else {
        focusWin(id);
      }
    });
    taskbarApps.appendChild(btn);
  }

  /* ---- ouvrir une fenêtre ---- */

  function openWin(id, title, url, w, h) {
    w = w || 900; h = h || 560;

    if (windows[id]) {
      var ex = windows[id];
      if (ex.minimized) {
        ex.el.classList.remove("minimized");
        ex.minimized = false;
      }
      focusWin(id);
      return;
    }

    var count = Object.keys(windows).length;
    var left  = clamp(Math.round((deskW() - w) / 2) + count * 20, 0, Math.max(0, deskW() - w));
    var top   = clamp(Math.round((deskH() - h) / 2) + count * 20, 0, Math.max(0, deskH() - h));
    var z     = nextZ();

    var winEl = el("div", "win focused");
    winEl.id  = "win-" + id;
    winEl.style.cssText = [
      "left:" + left + "px", "top:" + top + "px",
      "width:" + w + "px", "height:" + h + "px",
      "z-index:" + z
    ].join(";");

    /* titlebar */
    var titlebar = el("div", "win-titlebar");
    var ctrls    = el("div", "win-ctrls");
    var btnClose = el("button", "wc close"); btnClose.title = "Fermer";
    var btnMin   = el("button", "wc min");   btnMin.title   = "Minimiser";
    var btnMax   = el("button", "wc max");   btnMax.title   = "Agrandir";
    ctrls.appendChild(btnClose);
    ctrls.appendChild(btnMin);
    ctrls.appendChild(btnMax);

    var iconWrap = el("div", "win-icon");
    iconWrap.innerHTML = APP_ICONS[id] || APP_ICONS.mail;
    iconWrap.setAttribute("aria-hidden", "true");

    var titleText = el("span", "win-title-text");
    titleText.textContent = title;

    var classifBadge = el("span", "win-classif");
    classifBadge.textContent = "ALPHA";
    classifBadge.setAttribute("aria-hidden", "true");

    titlebar.appendChild(ctrls);
    titlebar.appendChild(iconWrap);
    titlebar.appendChild(titleText);
    titlebar.appendChild(classifBadge);

    /* contenu */
    var content = el("div", "win-content");
    var iframe  = document.createElement("iframe");
    iframe.src   = url;
    iframe.title = title;
    iframe.setAttribute("loading", "lazy");
    content.appendChild(iframe);

    /* resize handle */
    var resizeHandle = el("div", "win-resize");
    resizeHandle.setAttribute("aria-hidden", "true");

    winEl.appendChild(titlebar);
    winEl.appendChild(content);
    winEl.appendChild(resizeHandle);
    desktop.appendChild(winEl);

    var entry = {
      el: winEl, title: title, url: url,
      minimized: false, maximized: false, savedRect: null
    };
    windows[id] = entry;

    makeDraggable(titlebar, winEl);
    makeResizable(resizeHandle, winEl);
    addTaskbarBtn(id, title);

    winEl.addEventListener("mousedown", function () { focusWin(id) });

    /* contrôles */
    btnClose.addEventListener("click", function () { closeWin(id) });
    btnMin.addEventListener("click", function () {
      winEl.classList.add("minimized");
      entry.minimized = true;
      var btn = document.getElementById("tb-" + id);
      if (btn) btn.classList.remove("active");
    });
    btnMax.addEventListener("click", function () {
      if (entry.maximized) {
        var r = entry.savedRect;
        Object.assign(winEl.style, { left: r.left, top: r.top, width: r.width, height: r.height });
        entry.maximized = false;
      } else {
        entry.savedRect = {
          left: winEl.style.left, top: winEl.style.top,
          width: winEl.style.width, height: winEl.style.height
        };
        Object.assign(winEl.style, {
          left: "0px", top: "0px",
          width: deskW() + "px", height: deskH() + "px"
        });
        entry.maximized = true;
      }
    });
  }

  function closeWin(id) {
    var w = windows[id];
    if (!w) return;
    w.el.remove();
    delete windows[id];
    var btn = document.getElementById("tb-" + id);
    if (btn) btn.remove();
  }

  /* ---- horloge ---- */

  function tick() {
    var cl = document.getElementById("os-clock");
    if (!cl) return;
    cl.textContent = new Date().toLocaleTimeString("fr-FR", {
      hour: "2-digit", minute: "2-digit", second: "2-digit"
    });
  }
  setInterval(tick, 1000);

  /* ---- init ---- */

  function init() {
    desktop     = document.getElementById("desktop");
    taskbarApps = document.getElementById("tb-apps");
    if (!desktop || !taskbarApps) return;
    tick();

    /* résolution des URLs consoles via OmegaLabAccess */
    function resolveConsoles() {
      var base = (window.OmegaLabAccess && OmegaLabAccess.pivotUrl)
        ? OmegaLabAccess.pivotUrl()
        : "http://" + location.hostname + ":18081/";
      if (base.slice(-1) !== "/") base += "/";

      var iconAlarm = document.getElementById("iconAlarm");
      var iconCctv  = document.getElementById("iconCctv");
      if (iconAlarm) iconAlarm.dataset.url = base + "internal/auth-gateway/v2/ops-alarm-panel.php";
      if (iconCctv)  iconCctv.dataset.url  = base + "internal/auth-gateway/v2/ops-cctv-panel.php";
    }
    resolveConsoles();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  global.OmegaDesktop = { open: openWin, close: closeWin, focus: focusWin };

})(window);
