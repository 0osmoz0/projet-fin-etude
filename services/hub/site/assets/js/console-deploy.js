/**
 * Déploiement des consoles Alarm/CCTV sur le bureau OMEGA (après tunnel ops).
 */
(function (global) {
  "use strict";

  var DEPLOY_TOKEN = "BT-OPS-TUNNEL-4421";

  function normalizeToken(value) {
    return String(value || "")
      .trim()
      .toUpperCase()
      .replace(/\s+/g, "");
  }

  function isDeployed() {
    return global.OmegaMissionState && OmegaMissionState.isConsolesDeployed();
  }

  function resolveConsoleUrls() {
    var base =
      global.OmegaLabAccess && OmegaLabAccess.pivotUrl
        ? OmegaLabAccess.pivotUrl()
        : "http://" + location.hostname + ":18081/";
    if (base.slice(-1) !== "/") base += "/";
    return {
      alarm: base + "internal/auth-gateway/v2/ops-alarm-panel.php",
      cctv: base + "internal/auth-gateway/v2/ops-cctv-panel.php",
    };
  }

  function setIconUrl(id, url) {
    var el = document.getElementById(id);
    if (el) el.dataset.url = url;
  }

  function showDeployOverlay(message, pct) {
    var overlay = document.getElementById("consoleDeployOverlay");
    var msgEl = document.getElementById("consoleDeployMsg");
    var bar = document.getElementById("consoleDeployBar");
    if (!overlay) return;
    overlay.hidden = false;
    overlay.setAttribute("aria-hidden", "false");
    if (msgEl && message) msgEl.textContent = message;
    if (bar && typeof pct === "number") bar.style.width = pct + "%";
  }

  function hideDeployOverlay() {
    var overlay = document.getElementById("consoleDeployOverlay");
    if (!overlay) return;
    overlay.hidden = true;
    overlay.setAttribute("aria-hidden", "true");
  }

  function revealConsoleIcons() {
    var urls = resolveConsoleUrls();
    setIconUrl("iconAlarm", urls.alarm);
    setIconUrl("iconCctv", urls.cctv);

    ["iconAlarm", "iconCctv"].forEach(function (id) {
      var el = document.getElementById(id);
      if (!el) return;
      el.hidden = false;
      el.removeAttribute("aria-hidden");
      el.tabIndex = 0;
      el.classList.remove("desk-icon--undeployed");
      el.classList.add("desk-icon--deploy-reveal");
      if (el.dataset.deployLabelDone !== "1") {
        el.setAttribute(
          "aria-label",
          (el.getAttribute("aria-label") || "") + " — liaison pivot active"
        );
        el.dataset.deployLabelDone = "1";
      }
    });
  }

  function hideConsoleIcons() {
    ["iconAlarm", "iconCctv"].forEach(function (id) {
      var el = document.getElementById(id);
      if (!el) return;
      el.hidden = true;
      el.setAttribute("aria-hidden", "true");
      el.tabIndex = -1;
      el.classList.add("desk-icon--undeployed");
      el.classList.remove("desk-icon--deploy-reveal");
    });
  }

  function updateGatewayIcon() {
    var gw = document.getElementById("iconGateway");
    if (!gw) return;
    var osintOk = global.OmegaMissionState && OmegaMissionState.isValidated();
    if (osintOk) {
      gw.classList.remove("desk-icon--hidden");
      gw.classList.add("desk-icon--gateway-ready");
      if (gw.dataset.gatewayRevealed !== "1") {
        gw.classList.add("desk-icon--gateway-reveal");
        gw.dataset.gatewayRevealed = "1";
      }
    } else {
      gw.classList.add("desk-icon--hidden");
      gw.classList.remove("desk-icon--gateway-ready", "desk-icon--gateway-reveal");
      delete gw.dataset.gatewayRevealed;
    }
  }

  function updateLiaisonIcon() {
    var liaison = document.getElementById("iconLiaison");
    if (!liaison) return;
    var osintOk = global.OmegaMissionState && OmegaMissionState.isValidated();
    if (osintOk) {
      liaison.classList.remove("desk-icon--hidden");
    } else {
      liaison.classList.add("desk-icon--hidden");
    }
    if (isDeployed()) {
      liaison.classList.add("desk-icon--deployed");
    } else {
      liaison.classList.remove("desk-icon--deployed");
    }

    var shell = document.getElementById("iconShell");
    if (shell) {
      if (osintOk) {
        shell.classList.add("desk-icon--shell-ready");
      } else {
        shell.classList.remove("desk-icon--shell-ready");
      }
    }

    updateGatewayIcon();
  }

  function playDeployAnimation(done) {
    var steps = [
      { msg: "Réception du bundle pivot…", pct: 18, ms: 400 },
      { msg: "Vérification jeton ops…", pct: 42, ms: 500 },
      { msg: "Établissement tunnel SSH…", pct: 68, ms: 600 },
      { msg: "Installation Alarm Console…", pct: 86, ms: 450 },
      { msg: "Installation CCTV Console…", pct: 100, ms: 500 },
    ];
    var i = 0;
    function next() {
      if (i >= steps.length) {
        hideDeployOverlay();
        revealConsoleIcons();
        if (done) done();
        return;
      }
      var s = steps[i++];
      showDeployOverlay(s.msg, s.pct);
      setTimeout(next, s.ms);
    }
    next();
  }

  function applyDesktopState(animate) {
    updateLiaisonIcon();
    if (isDeployed()) {
      hideDeployOverlay();
      revealConsoleIcons();
      return;
    }
    hideConsoleIcons();
  }

  function tryActivate(token) {
    if (normalizeToken(token) !== DEPLOY_TOKEN) {
      return false;
    }
    if (!global.OmegaMissionState) {
      return false;
    }
    if (!OmegaMissionState.isValidated()) {
      return false;
    }
    if (isDeployed()) {
      return true;
    }
    OmegaMissionState.saveConsolesDeployed();
    playDeployAnimation(function () {
      updateLiaisonIcon();
    });
    return true;
  }

  function init() {
    applyDesktopState(false);
    global.addEventListener("storage", function (e) {
      if (e.key === OmegaMissionState.STORAGE_KEY) {
        applyDesktopState(false);
      }
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  global.OmegaConsoleDeploy = {
    DEPLOY_TOKEN: DEPLOY_TOKEN,
    normalizeToken: normalizeToken,
    isDeployed: isDeployed,
    tryActivate: tryActivate,
    applyDesktopState: applyDesktopState,
    playDeployAnimation: playDeployAnimation,
  };
})(window);
