/**
 * Badge + animation « réception mail » sur le bureau OMEGA-OS.
 */
(function (global) {
  "use strict";

  var ARRIVE_MS = 2200;
  var STORAGE_KEY = "omega-osint-validation-v1";

  function readStateFallback() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        return {
          validated: false,
          mail1Read: false,
          mail2Read: false,
          mail1NotifShown: false,
          mail2NotifShown: false,
        };
      }
      var data = JSON.parse(raw);
      return {
        validated: data.validated === true,
        mail1Read: data.mail1Read === true,
        mail2Read: data.mail2Read === true,
        mail1NotifShown: data.mail1NotifShown === true,
        mail2NotifShown: data.mail2NotifShown === true,
      };
    } catch (e) {
      return {
        validated: false,
        mail1Read: false,
        mail2Read: false,
        mail1NotifShown: false,
        mail2NotifShown: false,
      };
    }
  }

  function getUnreadCount() {
    if (global.OmegaMissionState && typeof OmegaMissionState.getMailUnreadCount === "function") {
      return OmegaMissionState.getMailUnreadCount();
    }
    var s = readStateFallback();
    var n = 0;
    if (!s.mail1Read) n += 1;
    if (s.validated && !s.mail2Read) n += 1;
    return n;
  }

  function shouldPlayArrival(msgId) {
    if (global.OmegaMissionState && typeof OmegaMissionState.shouldPlayMailArrival === "function") {
      return OmegaMissionState.shouldPlayMailArrival(msgId);
    }
    var s = readStateFallback();
    if (msgId === "msg1") return !s.mail1Read && !s.mail1NotifShown;
    if (msgId === "msg2") return s.validated && !s.mail2Read && !s.mail2NotifShown;
    return false;
  }

  function markNotifShown(msgId) {
    if (global.OmegaMissionState && typeof OmegaMissionState.markMailNotifShown === "function") {
      OmegaMissionState.markMailNotifShown(msgId);
      return;
    }
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      var data = raw ? JSON.parse(raw) : {};
      if (msgId === "msg1") data.mail1NotifShown = true;
      if (msgId === "msg2") data.mail2NotifShown = true;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      /* ignore */
    }
  }

  function playMailArrival(msgId) {
    var icon = document.getElementById("iconMail");
    var badge = document.getElementById("mailDeskBadge");
    var wrap = icon ? icon.querySelector(".icon-wrap") : null;

    if (icon) {
      icon.classList.remove("desk-icon--mail-arrive");
      void icon.offsetWidth;
      icon.classList.add("desk-icon--mail-arrive");
      window.setTimeout(function () {
        icon.classList.remove("desk-icon--mail-arrive");
      }, ARRIVE_MS);
    }

    if (wrap) {
      wrap.classList.remove("desk-icon-wrap--ping");
      void wrap.offsetWidth;
      wrap.classList.add("desk-icon-wrap--ping");
      window.setTimeout(function () {
        wrap.classList.remove("desk-icon-wrap--ping");
      }, ARRIVE_MS);
    }

    if (badge && !badge.hidden) {
      badge.classList.remove("desk-icon-badge--pop");
      void badge.offsetWidth;
      badge.classList.add("desk-icon-badge--pop");
      window.setTimeout(function () {
        badge.classList.remove("desk-icon-badge--pop");
      }, 900);
    }

    if (msgId) markNotifShown(msgId);
  }

  function updateMailDeskBadge() {
    var badge = document.getElementById("mailDeskBadge");
    if (!badge) return;
    var n = getUnreadCount();
    if (n > 0) {
      badge.textContent = String(n);
      badge.hidden = false;
      badge.setAttribute("aria-label", n + " message(s) non lu(s)");
    } else {
      badge.hidden = true;
      badge.removeAttribute("aria-label");
    }
  }

  function checkMailArrivals() {
    updateMailDeskBadge();
    if (shouldPlayArrival("msg1")) playMailArrival("msg1");
    if (
      global.OmegaMissionState &&
      typeof OmegaMissionState.isValidated === "function" &&
      OmegaMissionState.isValidated() &&
      shouldPlayArrival("msg2")
    ) {
      playMailArrival("msg2");
    }
  }

  function init() {
    if (!global.OmegaMissionState) {
      console.warn("[mail-notify] OmegaMissionState absent — rechargement conseillé (Ctrl+Shift+R)");
    } else if (typeof OmegaMissionState.getMailUnreadCount !== "function") {
      console.warn(
        "[mail-notify] mission-state.js obsolète en cache — utilisez mission-state.js?v=mail2gate"
      );
    }
    checkMailArrivals();
    global.addEventListener("storage", function (e) {
      if (e.key === STORAGE_KEY) checkMailArrivals();
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  global.OmegaMailNotify = {
    update: updateMailDeskBadge,
    checkArrivals: checkMailArrivals,
    playArrival: playMailArrival,
  };
})(window);
