/**
 * Navigation hub : liens stables + "Consoles" dynamiques (pivot).
 */
(function (global) {
  function byId(id) {
    return global.document ? global.document.getElementById(id) : null;
  }

  function withTrailingSlash(url) {
    if (!url) {
      return null;
    }
    return url.endsWith("/") ? url : url + "/";
  }

  function pivotBaseUrl() {
    if (global.OmegaLabAccess && typeof global.OmegaLabAccess.pivotUrl === "function") {
      return withTrailingSlash(global.OmegaLabAccess.pivotUrl());
    }
    // fallback : mapping lab par défaut (Docker)
    const host =
      global.location && global.location.hostname ? global.location.hostname : "localhost";
    return `http://${host}:18081/`;
  }

  function setHref(id, href) {
    const el = byId(id);
    if (!el || !href) {
      return;
    }
    el.setAttribute("href", href);
  }

  function init() {
    const base = pivotBaseUrl();
    setHref("navConsolesAlarm", base + "internal/auth-gateway/v2/ops-alarm-panel.php");
    setHref("navConsolesCctv", base + "internal/auth-gateway/v2/ops-cctv-panel.php");
    setHref("navPivotTarget", base);
  }

  if (global.document && global.document.readyState === "loading") {
    global.document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})(window);

