const form = document.querySelector("form");
const emailInput = document.getElementById("emailPattern");
const targetUserInput = document.getElementById("targetUser");
const nextStep = document.getElementById("nextStep");
const result = document.getElementById("result");

form.addEventListener("submit", function (e) {
  e.preventDefault();
  const emailValue = emailInput.value.trim().toLowerCase();
  const targetValue = targetUserInput.value.trim().toLowerCase();

  const isEmailValid = emailValue === "prenom.nom@blacktide-corp.tld";
  const isTargetValid = targetValue === "n.morel";

  result.textContent = isEmailValid && isTargetValid
    ? "Validation OSINT reussie. Passage autorise vers Mail 2."
    : "Validation incomplete. Verifiez vos recoupements OSINT.";

  if (isEmailValid && isTargetValid) {
    nextStep.style.display = "block";
  } else {
    nextStep.style.display = "none";
  }
});
