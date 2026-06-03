<?php
declare(strict_types=1);

session_start();

header('Content-Type: text/html; charset=UTF-8');
header('X-CCTV-Subsystem: nvr-operator-console');

const ADMIN_TOKEN = 'BT-CCTV-ADMIN-4421';

function alarm_status(): string
{
    $ctx = stream_context_create([
        'http' => ['timeout' => 3, 'header' => "User-Agent: CCTV-Console/1.0\r\n"],
    ]);
    $body = @file_get_contents('http://alarm:8080/api/status.php', false, $ctx);
    return is_string($body) ? trim($body) : '';
}

function alarm_silenced(): bool
{
    $s = alarm_status();
    return $s !== '' && str_contains($s, 'armed=no');
}

$token = trim($_POST['token'] ?? $_GET['token'] ?? $_SESSION['cctv_admin_token'] ?? '');
$authenticated = $token !== '' && hash_equals(ADMIN_TOKEN, $token);

if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['token'])) {
    if ($authenticated) {
        $_SESSION['cctv_admin_token'] = $token;
    }
}

$exportPreview = '';
$exportAction = trim($_POST['export'] ?? '');
if ($exportAction !== '' && $authenticated) {
    $paths = [
        'plan' => '/api/export.php?id=int-cam3-plan&token=' . rawurlencode($token) . '&as=admin',
        'offline' => '/api/export.php?id=int-cam3-offline&scope=legacy&as=ops',
        'blindspot' => '/api/export.php?id=int-cam3-offline&scope=legacy&as=ops',
    ];
    if (isset($paths[$exportAction])) {
        $ctx = stream_context_create(['http' => ['timeout' => 8, 'ignore_errors' => true]]);
        $exportPreview = (string) @file_get_contents('http://localhost' . $paths[$exportAction], false, $ctx);
    }
}

$alarm = alarm_status();
$silenced = alarm_silenced();
?>
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Black Tide — NVR Operator Console</title>
  <link rel="stylesheet" href="/assets/bt-console.css">
</head>
<body>
  <header class="topbar">
    <h1>BLACK TIDE · NVR Operator</h1>
    <span class="meta">cam-3 · blindspot / plan terrain</span>
  </header>
  <div class="layout">
    <aside class="sidebar">
      <nav>
        <a href="/">Accueil NVR</a>
        <a href="/console.php" class="active">Console</a>
      </nav>
    </aside>
    <main class="main">
      <div class="grid">
        <div class="card">
          <h2>Session</h2>
          <?php if ($authenticated): ?>
            <p class="stat ok">OPERATOR</p>
            <span class="pill pill-clear">authentifié</span>
          <?php else: ?>
            <p class="stat danger">LOCKED</p>
            <span class="pill pill-armed">token requis</span>
          <?php endif; ?>
        </div>
        <div class="card">
          <h2>Field alerting</h2>
          <?php if ($silenced): ?>
            <p class="stat ok">SILENCED</p>
            <span class="pill pill-clear">plan autorisé</span>
          <?php else: ?>
            <p class="stat danger">ARMED</p>
            <span class="pill pill-armed">gate actif</span>
          <?php endif; ?>
        </div>
        <div class="card">
          <h2>Caméra cible</h2>
          <p class="stat" style="font-size:1.1rem">cam-3</p>
          <p class="hint">loading-bay-north</p>
        </div>
      </div>

      <div class="cam-grid" style="margin-top:1rem">
        <div class="card">
          <div class="cam-tile">CAM-1 · lobby</div>
          <span class="pill pill-clear">en ligne</span>
        </div>
        <div class="card">
          <div class="cam-tile">CAM-2 · quai</div>
          <span class="pill pill-clear">en ligne</span>
        </div>
        <div class="card">
          <div class="cam-tile">CAM-3 · zone nord</div>
          <span class="pill <?= $silenced ? 'pill-clear' : 'pill-armed' ?>"><?= $silenced ? 'angle mort' : 'alerte' ?></span>
        </div>
      </div>

      <?php if (!$authenticated): ?>
      <div class="card" style="margin-top:1rem">
        <h2>Authentification opérateur</h2>
        <form method="POST" class="inline">
          <label>Token admin <input type="password" name="token" autocomplete="off" required></label>
          <button type="submit">Déverrouiller la console</button>
        </form>
        <p class="hint">Provisioning : pivot <code>omega/ops/cctv-token</code></p>
      </div>
      <?php else: ?>

      <div class="card" style="margin-top:1rem">
        <h2>Exports</h2>
        <table>
          <thead>
            <tr><th>Artefact</th><th>ID</th><th>Action</th></tr>
          </thead>
          <tbody>
            <tr>
              <td>Preuve blindspot</td>
              <td><code>int-cam3-offline</code></td>
              <td>
                <form method="POST" style="display:inline">
                  <input type="hidden" name="token" value="<?= htmlspecialchars($token, ENT_QUOTES) ?>">
                  <input type="hidden" name="export" value="blindspot">
                  <button type="submit" class="secondary">Exporter</button>
                </form>
              </td>
            </tr>
            <tr>
              <td>Plan terrain</td>
              <td><code>int-cam3-plan</code></td>
              <td>
                <?php if ($silenced): ?>
                <form method="POST" style="display:inline">
                  <input type="hidden" name="token" value="<?= htmlspecialchars($token, ENT_QUOTES) ?>">
                  <input type="hidden" name="export" value="plan">
                  <button type="submit">Télécharger plan</button>
                </form>
                <?php else: ?>
                <span class="hint">Silencer l’alerting d’abord (alarm)</span>
                <?php endif; ?>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <?php if ($exportPreview !== ''): ?>
      <div class="card" style="margin-top:1rem">
        <h2>Résultat export</h2>
        <pre class="log"><?= htmlspecialchars($exportPreview, ENT_QUOTES, 'UTF-8') ?></pre>
      </div>
      <?php endif; ?>

      <?php if ($alarm !== ''): ?>
      <div class="card" style="margin-top:1rem">
        <h2>Liaison alerting</h2>
        <pre class="log"><?= htmlspecialchars($alarm, ENT_QUOTES, 'UTF-8') ?></pre>
      </div>
      <?php endif; ?>

      <?php endif; ?>
    </main>
  </div>
</body>
</html>
