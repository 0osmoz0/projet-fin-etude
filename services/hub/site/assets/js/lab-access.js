/**
 * Cartographie ports : OSINT (documentaire) vs poste lab Docker (hôte).
 * Aligné sur .env.example (HUB_PORT=18080, PIVOT_PORT=18081).
 */
(function (global) {
  const DOC_HUB_PORT = "8080";
  const DOC_PIVOT_PORT = "8081";
  const LAB_HUB_PORT = "18080";
  const LAB_PIVOT_PORT = "18081";

  function host() {
    return global.location && global.location.hostname ? global.location.hostname : "localhost";
  }

  function labUrl(port) {
    return `http://${host()}:${port}/`;
  }

  function renderAccessPanel(container) {
    if (!container) {
      return;
    }
    container.hidden = false;
    container.innerHTML =
      "<h2>Acces labo (navigateur)</h2>" +
      "<p>La validation OSINT utilise les ports <strong>documentaires</strong> " +
      `<code>${DOC_HUB_PORT}</code> (hub) et <code>${DOC_PIVOT_PORT}</code> (partenaire). ` +
      "Sur le poste d'entrainement Docker, le mapping hôte est decale pour eviter les conflits Mac :</p>" +
      "<ul class=\"lab-access-links\">" +
      `<li>Hub (briefing) : <a href="${labUrl(LAB_HUB_PORT)}" target="_blank" rel="noopener">${labUrl(LAB_HUB_PORT)}</a></li>` +
      `<li>Portail partenaire Black Tide (cible) : <a href="${labUrl(LAB_PIVOT_PORT)}" target="_blank" rel="noopener">${labUrl(LAB_PIVOT_PORT)}</a></li>` +
      "</ul>" +
      "<p><small>Si votre <code>.env</code> utilise d'autres ports, adaptez l'URL (voir README).</small></p>";
  }

  global.OmegaLabAccess = {
    DOC_HUB_PORT,
    DOC_PIVOT_PORT,
    LAB_HUB_PORT,
    LAB_PIVOT_PORT,
    labUrl,
    hubUrl: function () {
      return labUrl(LAB_HUB_PORT);
    },
    pivotUrl: function () {
      return labUrl(LAB_PIVOT_PORT);
    },
    isDocPivotPort: function (value) {
      return String(value).trim() === DOC_PIVOT_PORT;
    },
    isLabPivotPort: function (value) {
      return String(value).trim() === LAB_PIVOT_PORT;
    },
    isAcceptedBonusPort: function (value) {
      const v = String(value).trim();
      return v === DOC_PIVOT_PORT || v === LAB_PIVOT_PORT;
    },
    renderAccessPanel,
  };
})(window);
