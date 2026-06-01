<?php
declare(strict_types=1);

/**
 * Console NVR/CCTV (proxy pivot) — clearance 2, navigateur via gateway :18081.
 */
require_once __DIR__ . '/ops-console-lib.php';

ops_console_require_clearance('NVR / CCTV');

const CCTV_BASE = 'http://cctv:8080';
const ALARM_BASE = 'http://alarm:8080';
const CCTV_ADMIN_TOKEN = 'BT-CCTV-ADMIN-4421';

$token = trim((string) ($_POST['cctv_token'] ?? $_SESSION['ops_cctv_token'] ?? ''));
if ($token !== '' && hash_equals(CCTV_ADMIN_TOKEN, $token)) {
    $_SESSION['ops_cctv_token'] = $token;
}
$authenticated = isset($_SESSION['ops_cctv_token'])
    && hash_equals(CCTV_ADMIN_TOKEN, (string) $_SESSION['ops_cctv_token']);

$exportPreview = '';
$exportKind = trim((string) ($_POST['export'] ?? ''));
if ($authenticated && $exportKind !== '') {
    $paths = [
        'blindspot' => '/api/export.php?id=int-cam3-offline&scope=legacy&as=ops',
        'plan' => '/api/export.php?id=int-cam3-plan&token=' . rawurlencode((string) $_SESSION['ops_cctv_token']) . '&as=admin',
    ];
    if (isset($paths[$exportKind])) {
        $exportPreview = trim(ops_console_internal_fetch(CCTV_BASE, $paths[$exportKind]));
    }
}

$alarmStatus = trim(ops_console_internal_fetch(ALARM_BASE, '/api/status.php'));
$silenced = !ops_console_alarm_armed($alarmStatus);

header('Content-Type: text/html; charset=UTF-8');
header('X-BT-Subsystem: ops-cctv-panel');
?>
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>OMEGA · NVR Console (relay)</title>
  <link rel="stylesheet" href="/internal/auth-gateway/v2/assets/ops-console.css">
</head>
<body>
  <header class="topbar">
    <h1>OMEGA · NVR Operator</h1>
    <span class="meta">relay → cctv:8080</span>
    <div class="nav-links">
      <a href="ops-alarm-panel.php">Alerting</a>
      <a href="ops-relay.php?action=mesh">Mesh</a>
    </div>
  </header>
  <div class="layout">
    <aside class="sidebar">
      <nav>
        <a href="ops-alarm-panel.php">Alerting</a>
        <a href="ops-cctv-panel.php" class="active">NVR / CCTV</a>
      </nav>
    </aside>
    <main class="main">
      <div class="grid">
        <div class="card">
          <h2>Session NVR</h2>
          <?php if ($authenticated): ?>
            <p class="stat ok">OPERATOR</p>
            <span class="pill pill-clear">token OK</span>
          <?php else: ?>
            <p class="stat danger">LOCKED</p>
          <?php endif; ?>
        </div>
        <div class="card">
          <h2>Alerting</h2>
          <p class="stat <?= $silenced ? 'ok' : 'danger' ?>"><?= $silenced ? 'SILENCED' : 'ARMED' ?></p>
        </div>
        <div class="card">
          <h2>Caméra</h2>
          <p class="stat" style="font-size:1rem">cam-3</p>
        </div>
      </div>

      <div class="cam-grid" style="margin-top:1rem">
        <div class="card"><div class="cam-tile">CAM-1</div><span class="pill pill-clear">live</span></div>
        <div class="card"><div class="cam-tile">CAM-2</div><span class="pill pill-clear">live</span></div>
        <div class="card">
          <div class="cam-tile">CAM-3 · terrain</div>
          <span class="pill <?= $silenced ? 'pill-clear' : 'pill-armed' ?>"><?= $silenced ? 'clear' : 'gated' ?></span>
        </div>
      </div>

      <?php if (!$authenticated): ?>
      <div class="card" style="margin-top:1rem">
        <h2>Token opérateur</h2>
        <form method="POST">
          <label>Token admin CCTV <input type="password" name="cctv_token" autocomplete="off" required></label>
          <button type="submit">Déverrouiller</button>
        </form>
        <p class="hint"><code>omega/ops/cctv-token</code></p>
      </div>
      <?php else: ?>

      <div class="card" style="margin-top:1rem">
        <h2>Exports</h2>
        <table>
          <tr>
            <th>Artefact</th>
            <th>Action</th>
          </tr>
          <tr>
            <td>Blindspot <code>int-cam3-offline</code></td>
            <td>
              <form method="POST" style="display:inline">
                <input type="hidden" name="export" value="blindspot">
                <button type="submit" class="btn secondary">Exporter</button>
              </form>
            </td>
          </tr>
          <tr>
            <td>Plan terrain <code>int-cam3-plan</code></td>
            <td>
              <?php if ($silenced): ?>
              <form method="POST" style="display:inline">
                <input type="hidden" name="export" value="plan">
                <button type="submit">Exporter plan</button>
              </form>
              <?php else: ?>
              <span class="hint">Silencer l’alerting (panneau Alarm)</span>
              <?php endif; ?>
            </td>
          </tr>
        </table>
      </div>

      <?php if ($exportPreview !== ''): ?>
      <div class="card" style="margin-top:1rem">
        <h2>Résultat</h2>
        <pre class="log"><?= htmlspecialchars($exportPreview, ENT_QUOTES, 'UTF-8') ?></pre>
      </div>
      <?php endif; ?>

      <?php endif; ?>

      <?php if ($alarmStatus !== ''): ?>
      <div class="card" style="margin-top:1rem">
        <h2>Liaison alerting</h2>
        <pre class="log"><?= htmlspecialchars($alarmStatus, ENT_QUOTES, 'UTF-8') ?></pre>
      </div>
      <?php endif; ?>
    </main>
  </div>
</body>
</html>
