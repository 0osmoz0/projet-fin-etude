const form = document.querySelector("form");
const emailInput = document.getElementById("emailPattern");
const targetUserInput = document.getElementById("targetUser");
const portalSubdomainInput = document.getElementById("portalSubdomain");
const portalStackInput = document.getElementById("portalStack");
const videoProviderInput = document.getElementById("videoProvider");
const internalProjectInput = document.getElementById("internalProject");
const operationRefInput = document.getElementById("operationRef");
const operationWindowInput = document.getElementById("operationWindow");
const exposedPortInput = document.getElementById("exposedPort");
const nextStep = document.getElementById("nextStep");
const result = document.getElementById("result");
const progress = document.getElementById("progress");

const FORM_FIELDS = {
  emailPattern: emailInput,
  targetUser: targetUserInput,
  portalSubdomain: portalSubdomainInput,
  portalStack: portalStackInput,
  videoProvider: videoProviderInput,
  internalProject: internalProjectInput,
  operationRef: operationRefInput,
  operationWindow: operationWindowInput,
  exposedPort: exposedPortInput,
};

const EXPECTED = {
  email: "prenom.nom@blacktide-corp.tld",
  user: "n.morel",
  portal: "/internal/auth-gateway/v2",
  stack: "nginx/1.27 + php-fpm",
  provider: "bt-sup-4421",
  project: "legacy-mirror",
  ref: "bt-auth-4421",
  window: "02:00-03:00 utc",
  bonusPortDoc: "8081",
  bonusPortLab: "18081",
};

function canonicalText(value) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function compactToken(value) {
  return canonicalText(value).replace(/[^a-z0-9]/g, "");
}

function canonicalPath(value) {
  const path = canonicalText(value).replace(/^https?:\/\/[^/]+/i, "");
  return path.startsWith("/") ? path : `/${path}`;
}

function canonicalWindow(value) {
  return canonicalText(value)
    .replace(/\s*-\s*/g, "-")
    .replace(/\s*:\s*/g, ":")
    .replace(/\s*utc\s*/g, " utc");
}

function evaluateAnswers() {
  const emailValue = canonicalText(emailInput.value);
  const targetValue = canonicalText(targetUserInput.value);
  const portalValue = canonicalPath(portalSubdomainInput.value);
  const stackValue = canonicalText(portalStackInput.value);
  const providerValue = compactToken(videoProviderInput.value);
  const projectValue = compactToken(internalProjectInput.value);
  const refValue = compactToken(operationRefInput.value);
  const windowValue = canonicalWindow(operationWindowInput.value);
  const portValue = canonicalText(exposedPortInput.value);

  const isEmailValid = emailValue === EXPECTED.email;
  const isTargetValid = targetValue === EXPECTED.user;
  const isPortalValid =
    portalValue === EXPECTED.portal || compactToken(portalValue) === "internalauthgatewayv2";
  const isStackValid =
    stackValue === EXPECTED.stack ||
    stackValue === "nginx/1.27 + php-fpm (legacy partner module)";
  const isProviderValid = providerValue === compactToken(EXPECTED.provider);
  const isProjectValid = projectValue === compactToken(EXPECTED.project);
  const isRefValid = refValue === compactToken(EXPECTED.ref);
  const isWindowValid = windowValue === EXPECTED.window || windowValue === "02:00-03:00";
  const isBonusPortValid =
    portValue === EXPECTED.bonusPortDoc || portValue === EXPECTED.bonusPortLab;

  const isCoreValidationValid =
    isEmailValid &&
    isTargetValid &&
    isPortalValid &&
    isStackValid &&
    isProviderValid &&
    isProjectValid &&
    isRefValid &&
    isWindowValid;

  const missing = [];
  if (!isEmailValid) missing.push("format email");
  if (!isTargetValid) missing.push("utilisateur cible");
  if (!isPortalValid) missing.push("sous-domaine/portail");
  if (!isStackValid) missing.push("stack technique");
  if (!isProviderValid) missing.push("prestataire videosurveillance");
  if (!isProjectValid) missing.push("projet interne actif");
  if (!isRefValid) missing.push("reference operationnelle");
  if (!isWindowValid) missing.push("fenetre temporelle");

  const coreScore =
    Number(isEmailValid) +
    Number(isTargetValid) +
    Number(isPortalValid) +
    Number(isStackValid) +
    Number(isProviderValid) +
    Number(isProjectValid) +
    Number(isRefValid) +
    Number(isWindowValid);

  return {
    isCoreValidationValid,
    isBonusPortValid,
    missing,
    coreScore,
  };
}

function persistDraft() {
  if (!window.OmegaMissionState) {
    return;
  }
  OmegaMissionState.saveDraft(OmegaMissionState.collectDraftFromForm(FORM_FIELDS));
}

function renderProgress() {
  const saved = window.OmegaMissionState && OmegaMissionState.read();
  if (saved) {
    const bonusText = saved.bonusPort ? " + bonus port OK" : "";
    progress.textContent = `Progression OSINT: 8/8${bonusText} (enregistree)`;
    return;
  }
  const { coreScore, isBonusPortValid } = evaluateAnswers();
  const bonusText = isBonusPortValid ? " + bonus port OK" : "";
  progress.textContent = `Progression OSINT: ${coreScore}/8${bonusText}`;
}

function showLabAccessPanel() {
  const panel = document.getElementById("labAccessPanel");
  if (window.OmegaLabAccess && panel) {
    OmegaLabAccess.renderAccessPanel(panel);
  }
}

function showValidatedSuccess(isBonusPortValid, alreadySaved) {
  const prefix = alreadySaved ? "Validation OSINT deja enregistree" : "Validation OSINT reussie";
  if (isBonusPortValid) {
    result.textContent = `${prefix} (8/8 + bonus port). Passage autorise vers Mail 2.`;
  } else {
    result.textContent = `${prefix} (8/8). Bonus port incorrect ou manquant.`;
  }
  nextStep.style.display = "block";
  showLabAccessPanel();
}

function restoreSavedValidation() {
  const saved = window.OmegaMissionState && OmegaMissionState.read();
  if (!saved) {
    return;
  }
  showValidatedSuccess(saved.bonusPort, true);
}

function restoreDraftAndValidation() {
  if (window.OmegaMissionState) {
    OmegaMissionState.applyDraftToForm(FORM_FIELDS);
  }
  restoreSavedValidation();
  renderProgress();
}

form.addEventListener("submit", function (e) {
  e.preventDefault();
  persistDraft();
  const { isCoreValidationValid, isBonusPortValid, missing } = evaluateAnswers();

  if (isCoreValidationValid && isBonusPortValid) {
    result.textContent =
      "Validation OSINT reussie (8/8 + bonus port). Passage autorise vers Mail 2.";
  } else if (isCoreValidationValid) {
    result.textContent =
      "Validation OSINT reussie (8/8). Bonus port incorrect ou manquant.";
  } else {
    result.textContent = `Validation incomplete. Champs a revoir: ${missing.join(", ")}.`;
  }

  if (isCoreValidationValid) {
    if (window.OmegaMissionState) {
      OmegaMissionState.saveValidated(
        isBonusPortValid,
        OmegaMissionState.collectDraftFromForm(FORM_FIELDS),
      );
    }
    nextStep.style.display = "block";
    renderProgress();
  } else {
    nextStep.style.display = "none";
  }
});

Object.values(FORM_FIELDS).forEach(function (input) {
  if (!input) {
    return;
  }
  input.addEventListener("input", function () {
    persistDraft();
    renderProgress();
  });
});

window.addEventListener("pagehide", persistDraft);

restoreDraftAndValidation();
