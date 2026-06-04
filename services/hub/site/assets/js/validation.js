const form = document.getElementById("cfForm") || document.querySelector("form");
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

const FIELD_ORDER = [
  "emailPattern",
  "targetUser",
  "portalSubdomain",
  "portalStack",
  "videoProvider",
  "internalProject",
  "operationRef",
  "operationWindow",
];

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

  const fieldValid = {
    emailPattern: emailValue === EXPECTED.email,
    targetUser: targetValue === EXPECTED.user,
    portalSubdomain:
      portalValue === EXPECTED.portal ||
      compactToken(portalValue) === "internalauthgatewayv2",
    portalStack:
      stackValue === EXPECTED.stack ||
      stackValue === "nginx/1.27 + php-fpm (legacy partner module)",
    videoProvider: providerValue === compactToken(EXPECTED.provider),
    internalProject: projectValue === compactToken(EXPECTED.project),
    operationRef: refValue === compactToken(EXPECTED.ref),
    operationWindow:
      windowValue === EXPECTED.window || windowValue === "02:00-03:00",
    exposedPort:
      portValue === EXPECTED.bonusPortDoc || portValue === EXPECTED.bonusPortLab,
  };

  const isCoreValidationValid = FIELD_ORDER.every(function (key) {
    return fieldValid[key];
  });
  const isBonusPortValid = fieldValid.exposedPort;

  const missing = [];
  if (!fieldValid.emailPattern) missing.push("format email");
  if (!fieldValid.targetUser) missing.push("utilisateur cible");
  if (!fieldValid.portalSubdomain) missing.push("sous-domaine/portail");
  if (!fieldValid.portalStack) missing.push("stack technique");
  if (!fieldValid.videoProvider) missing.push("prestataire videosurveillance");
  if (!fieldValid.internalProject) missing.push("projet interne actif");
  if (!fieldValid.operationRef) missing.push("reference operationnelle");
  if (!fieldValid.operationWindow) missing.push("fenetre temporelle");

  const coreScore = FIELD_ORDER.reduce(function (n, key) {
    return n + Number(fieldValid[key]);
  }, 0);

  return {
    isCoreValidationValid,
    isBonusPortValid,
    missing,
    coreScore,
    fieldValid,
  };
}

window.evaluateAnswers = evaluateAnswers;

function persistDraft() {
  if (!window.OmegaMissionState) {
    return;
  }
  enforceValidationGate();
  OmegaMissionState.saveDraft(OmegaMissionState.collectDraftFromForm(FORM_FIELDS));
}

function setResultMessage(text, type) {
  if (!result) return;
  result.textContent = text;
  result.className = "cf-result";
  if (type === "success") result.classList.add("success");
  else if (type === "error") result.classList.add("error");
}

function enforceValidationGate() {
  if (!window.OmegaMissionState) return false;
  const { isCoreValidationValid } = evaluateAnswers();
  if (OmegaMissionState.isValidated() && !isCoreValidationValid) {
    OmegaMissionState.revokeValidation();
    if (nextStep) nextStep.hidden = true;
    const panel = document.getElementById("labAccessPanel");
    if (panel) panel.hidden = true;
    if (window.parent && window.parent.OmegaMailNotify) {
      window.parent.OmegaMailNotify.update();
    }
    return true;
  }
  return false;
}

function syncClearanceUI() {
  const scoreEl = document.getElementById("cfScore");
  const fillEl = document.getElementById("cfFill");
  const submitBtn = document.getElementById("cfSubmitBtn");
  if (!scoreEl) return;

  enforceValidationGate();

  const osintValidated =
    window.OmegaMissionState && OmegaMissionState.isValidated();
  const { coreScore, isBonusPortValid, fieldValid } = evaluateAnswers();
  const score = osintValidated ? 8 : coreScore;
  const pct = Math.round((score / 8) * 100);

  scoreEl.textContent = score + " / 8";
  if (fillEl) fillEl.style.width = pct + "%";

  FIELD_ORDER.forEach(function (fid, i) {
    const row = document.getElementById("row-" + fid);
    if (row) {
      if (osintValidated || fieldValid[fid]) row.classList.add("valid");
      else row.classList.remove("valid");
    }
    const seg = document.getElementById("seg-" + i);
    if (seg) seg.className = "cf-seg" + (osintValidated || fieldValid[fid] ? " done" : "");
    const ctx = document.getElementById("ctx-" + (i + 1));
    if (ctx) {
      if (osintValidated || fieldValid[fid]) ctx.classList.add("done");
      else ctx.classList.remove("done");
    }
  });

  const bonusSeg = document.getElementById("seg-bonus");
  if (bonusSeg) {
    bonusSeg.className =
      "cf-seg" +
      ((osintValidated && window.OmegaMissionState.readState().bonusPort) ||
      isBonusPortValid
        ? " bonus"
        : "");
  }
  const bonusRow = document.getElementById("row-exposedPort");
  if (bonusRow) {
    if (
      (osintValidated && window.OmegaMissionState.readState().bonusPort) ||
      isBonusPortValid
    )
      bonusRow.classList.add("valid");
    else bonusRow.classList.remove("valid");
  }

  if (submitBtn) {
    if (coreScore === 8 && !osintValidated) submitBtn.classList.add("ready");
    else if (osintValidated) submitBtn.classList.add("ready");
    else submitBtn.classList.remove("ready");
  }

  const dotOsint = document.getElementById("ctxDotOsint");
  const lblOsint = document.getElementById("ctxLabelOsint");
  const dotMail2 = document.getElementById("ctxDotMail2");
  const lblMail2 = document.getElementById("ctxLabelMail2");

  if (osintValidated) {
    if (dotOsint) dotOsint.className = "ctx-dot ok";
    if (lblOsint) lblOsint.textContent = "OSINT — validé";
    if (dotMail2) {
      dotMail2.className = "ctx-dot ok";
      dotMail2.style.opacity = "";
    }
    if (lblMail2) {
      lblMail2.textContent = "Mail 2 — déverrouillé";
      lblMail2.style.opacity = "";
    }
  } else {
    if (dotMail2) {
      dotMail2.className = "ctx-dot";
      dotMail2.style.opacity = "0.35";
    }
    if (lblMail2) {
      lblMail2.textContent = "Mail 2 — après soumission 8/8";
      lblMail2.style.opacity = "0.5";
    }
    if (score > 0) {
      if (dotOsint) dotOsint.className = "ctx-dot pending";
      if (lblOsint) lblOsint.textContent = "OSINT — en cours (" + score + "/8)";
    } else {
      if (dotOsint) dotOsint.className = "ctx-dot";
      if (lblOsint) lblOsint.textContent = "OSINT — en attente";
    }
  }
}

function renderProgress() {
  syncClearanceUI();
}

function showLabAccessPanel() {
  const panel = document.getElementById("labAccessPanel");
  if (window.OmegaLabAccess && panel) {
    OmegaLabAccess.renderAccessPanel(panel);
    panel.hidden = false;
  }
}

function showValidatedSuccess(isBonusPortValid, alreadySaved) {
  const prefix = alreadySaved ? "Validation OSINT déjà enregistrée" : "Validation OSINT réussie";
  if (isBonusPortValid) {
    setResultMessage(
      prefix + " (8/8 + bonus port). Passage autorisé vers Mail 2.",
      "success",
    );
  } else {
    setResultMessage(
      prefix + " (8/8). Bonus port incorrect ou manquant.",
      "success",
    );
  }
  if (nextStep) nextStep.hidden = false;
  showLabAccessPanel();
  syncClearanceUI();
}

function restoreSavedValidation() {
  enforceValidationGate();
  const { isCoreValidationValid } = evaluateAnswers();
  const saved = window.OmegaMissionState && OmegaMissionState.read();
  if (!saved || !isCoreValidationValid) {
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

function initProgressSegments() {
  const segsEl = document.getElementById("cfSegs");
  if (!segsEl || segsEl.childElementCount > 0) return;
  FIELD_ORDER.forEach(function (_, i) {
    const s = document.createElement("span");
    s.className = "cf-seg";
    s.id = "seg-" + i;
    segsEl.appendChild(s);
  });
  const bonus = document.createElement("span");
  bonus.className = "cf-seg";
  bonus.id = "seg-bonus";
  segsEl.appendChild(bonus);
}

if (form) {
  form.addEventListener("submit", function (e) {
    e.preventDefault();
    persistDraft();
    const { isCoreValidationValid, isBonusPortValid, missing } = evaluateAnswers();

    if (isCoreValidationValid && isBonusPortValid) {
      setResultMessage(
        "Validation OSINT réussie (8/8 + bonus port). Passage autorisé vers Mail 2.",
        "success",
      );
    } else if (isCoreValidationValid) {
      setResultMessage(
        "Validation OSINT réussie (8/8). Bonus port incorrect ou manquant.",
        "success",
      );
    } else {
      setResultMessage(
        "Validation incomplète. Champs à revoir : " + missing.join(", ") + ".",
        "error",
      );
    }

    if (isCoreValidationValid) {
      if (window.OmegaMissionState) {
        OmegaMissionState.saveValidated(
          isBonusPortValid,
          OmegaMissionState.collectDraftFromForm(FORM_FIELDS),
        );
        if (window.parent && window.parent.OmegaMailNotify) {
          window.parent.OmegaMailNotify.checkArrivals();
        }
        if (window.parent && window.parent.OmegaConsoleDeploy) {
          window.parent.OmegaConsoleDeploy.applyDesktopState(false);
        }
      }
      if (nextStep) nextStep.hidden = false;
      showLabAccessPanel();
      renderProgress();
    } else if (nextStep) {
      nextStep.hidden = true;
    }
  });
}

Object.values(FORM_FIELDS).forEach(function (input) {
  if (!input) {
    return;
  }
  input.addEventListener("input", function () {
    persistDraft();
    renderProgress();
    if (result && result.textContent) {
      result.textContent = "";
      result.className = "cf-result";
    }
  });
});

window.addEventListener("pagehide", persistDraft);

initProgressSegments();
restoreDraftAndValidation();
