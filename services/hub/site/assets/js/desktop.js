/* =============================================================
   OMEGA-OS — Window Manager
   ============================================================= */

(function (global) {
  "use strict";

  var desktop = null;
  var taskbarApps = null;
  var windows = {};
  var zCounter = 100;

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

  function nextZ() {
    zCounter += 1;
    return zCounter;
  }

  function deskW() { return desktop ? desktop.offsetWidth  : window.innerWidth  }
  function deskH() { return desktop ? desktop.offsetHeight : window.innerHeight - 42 }

  /* ---- focus ---- */

  function focusWin(id) {
    var w = windows[id];
    if (!w) return;
    w.el.style.zIndex = nextZ();
    w.el.classList.add("focused");
    Object.keys(windows).forEach(function (k) {
      if (k !== id) windows[k].el.classList.remove("focused");
    });
    var btn = document.getElementById("tb-" + id);
    if (btn) {
      document.querySelectorAll(".tb-btn").forEach(function (b) { b.classList.remove("active") });
      btn.classList.add("active");
    }
  }

  /* ---- draggable ---- */

  function makeDraggable(handle, winEl) {
    var ox = 0, oy = 0;

    handle.addEventListener("mousedown", function (e) {
      if (e.target.classList.contains("wc")) return;
      e.preventDefault();
      ox = e.clientX - winEl.offsetLeft;
      oy = e.clientY - winEl.offsetTop;

      function onMove(e2) {
        var maxX = deskW() - 60;
        var maxY = deskH() - 30;
        winEl.style.left = clamp(e2.clientX - ox, 0, maxX) + "px";
        winEl.style.top  = clamp(e2.clientY - oy, 0, maxY) + "px";
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
    btn.addEventListener("click", function () {
      var w = windows[id];
      if (!w) return;
      if (w.minimized) {
        w.el.classList.remove("minimized");
        w.minimized = false;
        focusWin(id);
      } else if (w.el.style.zIndex == zCounter) {
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
    w = w || 900;
    h = h || 580;

    if (windows[id]) {
      var existing = windows[id];
      if (existing.minimized) {
        existing.el.classList.remove("minimized");
        existing.minimized = false;
      }
      focusWin(id);
      return;
    }

    var count = Object.keys(windows).length;
    var left = clamp(Math.round((deskW() - w) / 2) + count * 22, 0, deskW() - w);
    var top  = clamp(Math.round((deskH() - h) / 2) + count * 22, 0, deskH() - h);
    var z = nextZ();

    var winEl = el("div", "win focused");
    winEl.id = "win-" + id;
    winEl.style.cssText = "left:" + left + "px;top:" + top + "px;width:" + w + "px;height:" + h + "px;z-index:" + z;

    var titlebar = el("div", "win-titlebar");
    var ctrls    = el("div", "win-ctrls");
    var btnClose = el("button", "wc close"); btnClose.title = "Fermer";
    var btnMin   = el("button", "wc min");   btnMin.title   = "Minimiser";
    var btnMax   = el("button", "wc max");   btnMax.title   = "Maximiser";
    ctrls.appendChild(btnClose);
    ctrls.appendChild(btnMin);
    ctrls.appendChild(btnMax);

    var titleText = el("span", "win-title-text");
    titleText.textContent = title;

    var classifBadge = el("span", "win-classif");
    classifBadge.textContent = "ALPHA";

    titlebar.appendChild(ctrls);
    titlebar.appendChild(titleText);
    titlebar.appendChild(classifBadge);

    var content = el("div", "win-content");
    var iframe = document.createElement("iframe");
    iframe.src = url;
    iframe.title = title;
    iframe.setAttribute("loading", "lazy");
    content.appendChild(iframe);

    winEl.appendChild(titlebar);
    winEl.appendChild(content);
    desktop.appendChild(winEl);

    var entry = { el: winEl, title: title, url: url, minimized: false, maximized: false, savedRect: null };
    windows[id] = entry;

    makeDraggable(titlebar, winEl);
    addTaskbarBtn(id, title);

    winEl.addEventListener("mousedown", function () { focusWin(id) });

    /* contrôles */
    btnClose.addEventListener("click", function () { closeWin(id) });
    btnMin.addEventListener("click",   function () {
      entry.el.classList.add("minimized");
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
        entry.savedRect = { left: winEl.style.left, top: winEl.style.top, width: winEl.style.width, height: winEl.style.height };
        Object.assign(winEl.style, { left: "0px", top: "0px", width: deskW() + "px", height: deskH() + "px" });
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
    cl.textContent = new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  }
  setInterval(tick, 1000);

  /* ---- init ---- */

  function init() {
    desktop     = document.getElementById("desktop");
    taskbarApps = document.getElementById("tb-apps");
    if (!desktop || !taskbarApps) return;
    tick();

    /* URL des consoles Alarm/CCTV via OmegaLabAccess */
    function resolveConsoleUrls() {
      var base = (window.OmegaLabAccess && OmegaLabAccess.pivotUrl)
        ? OmegaLabAccess.pivotUrl()
        : "http://" + location.hostname + ":18081/";
      if (base.slice(-1) !== "/") base += "/";

      var iconAlarm = document.getElementById("iconAlarm");
      var iconCctv  = document.getElementById("iconCctv");
      if (iconAlarm) {
        iconAlarm.dataset.url = base + "internal/auth-gateway/v2/ops-alarm-panel.php";
      }
      if (iconCctv) {
        iconCctv.dataset.url = base + "internal/auth-gateway/v2/ops-cctv-panel.php";
      }
    }
    resolveConsoleUrls();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  /* API publique */
  global.OmegaDesktop = {
    open: openWin,
    close: closeWin,
    focus: focusWin,
  };

})(window);
