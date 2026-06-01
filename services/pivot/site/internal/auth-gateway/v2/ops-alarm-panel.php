<?php
declare(strict_types=1);

/**
 * Console alerting (proxy interne) — clearance 2 + session relay liée.
 * Accessible depuis le navigateur via la gateway (ex. :18081), sans tunnel SSH.
 */
session_start();

const VALID_SESSION = 'ops-sess-8842';
const ALARM_BASE = 'http://alarm:8080';

function clearance(): int
{
    return (int) ($_SESSION['clearance'] ?? 0);
}

function has_bound_session(): bool
{
    return isset($_SESSION['ops_session']) && $_SESSION['ops_session'] === VALID_SESSION;
}

function render_gate_page(): void
{
    header('Content-Type: text/html; charset=UTF-8');
    $bound = has_bound_session();
    $cl = clearance();
    $relay = 'ops-relay.php';
    echo '<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"><title>Alerting — préparation session</title>';
    echo '<style>body{font-family:system-ui,sans-serif;background:#0d1117;color:#e6edf3;margin:2rem}.panel{max-width:520px;border:1px solid #30363d;border-radius:8px;padding:1.25rem}code{background:#161b22;padding:.1rem .3rem}a{color:#58a6ff}</style></head><body><div class="panel">';
    echo '<h1>Field Alerting — accès relay</h1>';
    echo '<p>Session : ' . ($bound ? 'liée' : 'non liée') . ' · clearance=' . $cl . ' (2 requis)</p>';
    if (!$bound) {
        echo '<p><a href="' . htmlspecialchars($relay, ENT_QUOTES, 'UTF-8') . '?bind=ops-sess-8842">1. Lier la session relay</a> (audit log / error.log)</p>';
    } elseif ($cl < 2) {
        echo '<p>2. Upgrade clearance (clé runbook / deploy-note) :</p>';
        echo '<form method="POST" action="' . htmlspecialchars($relay, ENT_QUOTES, 'UTF-8') . '">';
        echo '<input type="hidden" name="action" value="upgrade">';
        echo '<label>Clé <input type="password" name="key" required autocomplete="off"></label> ';
        echo '<button type="submit">Upgrade</button></form>';
        echo '<p><small>Puis recharger cette page.</small></p>';
    }
    echo '</div></body></html>';
    exit;
}

if (!has_bound_session() || clearance() < 2) {
    http_response_code(403);
    render_gate_page();
}

function alarm_fetch(string $path): string
{
    $url = rtrim(ALARM_BASE, '/') . $path;
    $ctx = stream_context_create([
        'http' => [
            'timeout' => 8,
            'ignore_errors' => true,
            'header' => "User-Agent: OMEGA-OPS-AlarmPanel/1.0\r\n",
        ],
    ]);
    $body = @file_get_contents($url, false, $ctx);
    return $body === false ? '' : $body;
}

$result = '';
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $token = trim((string) ($_POST['token'] ?? ''));
    $window = strtolower(trim((string) ($_POST['window'] ?? 'cam3')));
    $qs = http_build_query(['token' => $token, 'window' => $window]);
    $result = alarm_fetch('/api/silence.php?' . $qs);
}

$status = trim(alarm_fetch('/api/status.php'));
$armed = $status !== '' && !str_contains($status, 'armed=no');
$statusClass = $armed ? 'armed' : 'ok';

header('Content-Type: text/html; charset=UTF-8');
header('X-BT-Subsystem: ops-alarm-panel');
?>
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Black Tide — Field Alerting (ops relay)</title>
  <style>
    body { font-family: system-ui, sans-serif; background: #0d1117; color: #e6edf3; margin: 2rem; }
    .panel { max-width: 560px; border: 1px solid #30363d; border-radius: 8px; padding: 1.25rem; }
    .armed { color: #f85149; font-weight: bold; }
    .ok { color: #3fb950; font-weight: bold; }
    pre { background: #161b22; padding: 0.75rem; overflow-x: auto; font-size: 0.9rem; }
    input, button { margin: 0.25rem 0; padding: 0.4rem; }
    code { background: #161b22; padding: 0.1rem 0.3rem; }
  </style>
</head>
<body>
  <div class="panel">
    <h1>Field Alerting Console</h1>
    <p>Relais ops → <code>alarm:8080</code> (réseau interne)</p>
    <p class="<?= htmlspecialchars($statusClass, ENT_QUOTES, 'UTF-8') ?>">
      <?= $status !== '' ? htmlspecialchars($status, ENT_QUOTES, 'UTF-8') : 'Statut indisponible (service alarm ?)' ?>
    </p>
    <?php if ($result !== ''): ?>
    <h2>Dernière action</h2>
    <pre><?= htmlspecialchars($result, ENT_QUOTES, 'UTF-8') ?></pre>
    <?php endif; ?>
    <h2>Silencer (ops)</h2>
    <form method="POST">
      <label>Token <input type="password" name="token" autocomplete="off" required></label><br>
      <label>Fenêtre <input type="text" name="window" value="cam3" required></label><br>
      <button type="submit">Confirmer angle mort terrain</button>
    </form>
    <p><small>Token : pivot <code>omega/ops/alarm-token</code> · relay <code>action=probe&target=alarm</code></small></p>
  </div>
</body>
</html>
