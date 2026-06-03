/**
 * Persistance locale hub : brouillon du formulaire OSINT + validation Mail 2.
 */
(function (global) {
  const STORAGE_KEY = "omega-osint-validation-v1";

  const CONSOLE_DEPLOY_TOKEN = "BT-OPS-TUNNEL-4421";

  function defaultState() {
    return {
      validated: false,
      bonusPort: false,
      validatedAt: null,
      consolesDeployed: false,
      consolesDeployedAt: null,
      draft: {},
    };
  }

  function normalizeState(data) {
    if (!data || typeof data !== "object") {
      return defaultState();
    }
    const draft =
      data.draft && typeof data.draft === "object" ? { ...data.draft } : {};
    return {
      validated: data.validated === true,
      bonusPort: Boolean(data.bonusPort),
      validatedAt: data.validatedAt || null,
      consolesDeployed: data.consolesDeployed === true,
      consolesDeployedAt: data.consolesDeployedAt || null,
      draft,
    };
  }

  function readState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        return defaultState();
      }
      return normalizeState(JSON.parse(raw));
    } catch {
      return defaultState();
    }
  }

  function writeState(state) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  /** État « validé » (compat pages OSINT / Mail 2). */
  function read() {
    const state = readState();
    if (!state.validated) {
      return null;
    }
    return {
      validated: true,
      bonusPort: state.bonusPort,
      validatedAt: state.validatedAt,
    };
  }

  function isValidated() {
    return readState().validated;
  }

  function isConsolesDeployed() {
    return readState().consolesDeployed;
  }

  function saveConsolesDeployed() {
    const state = readState();
    state.consolesDeployed = true;
    state.consolesDeployedAt = new Date().toISOString();
    writeState(state);
  }

  /** Réinitialise uniquement le déploiement Alarm/CCTV (garde la validation OSINT). */
  function resetConsolesDeployed() {
    const state = readState();
    state.consolesDeployed = false;
    state.consolesDeployedAt = null;
    writeState(state);
  }

  function saveDraft(partialDraft) {
    const state = readState();
    state.draft = { ...state.draft, ...partialDraft };
    writeState(state);
  }

  function saveValidated(bonusPortOk, draft) {
    const state = readState();
    state.validated = true;
    state.bonusPort = Boolean(bonusPortOk);
    state.validatedAt = new Date().toISOString();
    if (draft && typeof draft === "object") {
      state.draft = { ...state.draft, ...draft };
    }
    writeState(state);
  }

  function applyDraftToForm(fieldElementsById) {
    const { draft } = readState();
    Object.keys(fieldElementsById).forEach(function (id) {
      const el = fieldElementsById[id];
      if (!el || !Object.prototype.hasOwnProperty.call(draft, id)) {
        return;
      }
      el.value = draft[id];
    });
  }

  function collectDraftFromForm(fieldElementsById) {
    const draft = {};
    Object.keys(fieldElementsById).forEach(function (id) {
      const el = fieldElementsById[id];
      if (el) {
        draft[id] = el.value;
      }
    });
    return draft;
  }

  global.OmegaMissionState = {
    STORAGE_KEY,
    CONSOLE_DEPLOY_TOKEN,
    read,
    readState,
    isValidated,
    isConsolesDeployed,
    saveConsolesDeployed,
    resetConsolesDeployed,
    saveDraft,
    saveValidated,
    applyDraftToForm,
    collectDraftFromForm,
  };
})(window);
