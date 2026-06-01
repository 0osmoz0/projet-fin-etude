<?php
declare(strict_types=1);

/**
 * Console alerting (proxy pivot) — clearance 2, navigateur via gateway :18081.
 */
require_once __DIR__ . '/ops-console-lib.php';

ops_console_require_clearance('Field Alerting');

const ALARM_BASE = 'http://alarm:8080';

$result = '';
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $token = trim((string) ($_POST['token'] ?? ''));
    $window = strtolower(trim((string) ($_POST['window'] ?? 'cam3')));
    $qs = http_build_query(['token' => $token, 'window' => $window]);
    $result = trim(ops_console_internal_fetch(ALARM_BASE, '/api/silence.php?' . $qs));
}

$status = trim(ops_console_internal_fetch(ALARM_BASE, '/api/status.php'));
$armed = ops_console_alarm_armed($status);

header('Content-Type: text/html; charset=UTF-8');
header('X-BT-Subsystem: ops-alarm-panel');
?>
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>OMEGA · Field Alerting (relay)</title>
  <link rel="stylesheet" href="/internal/auth-gateway/v2/assets/ops-console.css">
</head>
<body>
  <header class="topbar">
    <h1>OMEGA · Field Alerting</h1>
    <span class="meta">relay → alarm:8080</span>
    <div class="nav-links">
      <a href="ops-cctv-panel.php">Console CCTV</a>
      <a href="ops-relay.php?action=mesh">Mesh</a>
    </div>
  </header>
  <div class="layout">
    <aside class="sidebar">
      <nav>
        <a href="ops-alarm-panel.php" class="active">Alerting</a>
        <a href="ops-cctv-panel.php">NVR / CCTV</a>
      </nav>
    </aside>
    <main class="main">
      <div class="grid">
        <div class="card">
          <h2>État</h2>
          <p class="stat <?= $armed ? 'danger' : 'ok' ?>"><?= $armed ? 'ARMED' : 'SILENCED' ?></p>
          <span class="pill <?= $armed ? 'pill-armed' : 'pill-clear' ?>"><?= $armed ? 'ARMED' : 'CLEAR' ?></span>
        </div>
        <div class="card">
          <h2>Fenêtre</h2>
          <p class="stat">cam-3</p>
        </div>
        <div class="card">
          <h2>Gate CCTV</h2>
          <p class="hint"><?= $armed ? 'Plan terrain bloqué' : 'Export plan autorisé' ?></p>
        </div>
      </div>

      <?php if ($status !== ''): ?>
      <div class="card" style="margin-top:1rem">
        <h2>Statut live</h2>
        <pre class="log"><?= htmlspecialchars($status, ENT_QUOTES, 'UTF-8') ?></pre>
      </div>
      <?php endif; ?>

      <?php if ($result !== ''): ?>
      <div class="card" style="margin-top:1rem">
        <h2>Dernière action</h2>
        <pre class="log"><?= htmlspecialchars($result, ENT_QUOTES, 'UTF-8') ?></pre>
      </div>
      <?php endif; ?>

      <div class="card" style="margin-top:1rem">
        <h2>Silencer ops</h2>
        <form method="POST">
          <label>Token <input type="password" name="token" autocomplete="off" required></label>
          <label>Fenêtre <input type="text" name="window" value="cam3" required></label>
          <button type="submit">Confirmer angle mort terrain</button>
        </form>
        <p class="hint">Token : <code>omega/ops/alarm-token</code> · CLI : <code>action=probe&target=alarm</code></p>
      </div>
    </main>
  </div>
</body>
</html>
