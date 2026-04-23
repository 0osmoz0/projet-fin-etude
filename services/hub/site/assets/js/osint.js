const urlBar = document.getElementById("urlBar");
const view = document.getElementById("view");

function navigate(rawUrl) {
  const query = rawUrl.trim().toLowerCase();
  urlBar.value = query;

  if (!query) {
    view.innerHTML = "URL vide";
    return;
  }

  if (query.startsWith("intel://start")) {
    view.innerHTML = "<h2>Start Node</h2><p>Point d'entree OSINT initialise.</p><a href='#' data-url='intel://forum'>Ouvrir forum snapshot</a>";
  } else if (query.startsWith("intel://forum")) {
    view.innerHTML = "<h2>Forum Snapshot</h2><p>Pseudo observe: n.morel</p><p>Fenetre d'activite: 02:00-03:00 UTC</p><a href='#' data-url='intel://market'>Ouvrir market listing</a>";
  } else if (query.startsWith("intel://market")) {
    view.innerHTML = "<h2>Market Listing</h2><p>Reference: BT-SUP-4421</p><a href='#' data-url='intel://leak'>Ouvrir note de fuite</a>";
  } else if (query.startsWith("intel://leak")) {
    view.innerHTML = "<h2>Leak Note</h2><p>Email pattern repere: prenom.nom@blacktide-corp.tld</p>";
  } else {
    view.innerHTML = "URL inconnue";
  }
}

view.addEventListener("click", function (ev) {
  const link = ev.target.closest("a[data-url]");
  if (!link) return;
  ev.preventDefault();
  navigate(link.dataset.url);
});

urlBar.addEventListener("keydown", function (e) {
  if (e.key !== "Enter") return;
  navigate(urlBar.value);
});

urlBar.focus();
navigate("intel://start");
