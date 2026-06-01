<?php
declare(strict_types=1);

/**
 * Helpers partagés pour les consoles ops relay (alarm / CCTV).
 */
const OPS_CONSOLE_VALID_SESSION = 'ops-sess-8842';
const OPS_CONSOLE_RELAY = 'ops-relay.php';

function ops_console_clearance(): int
{
    return (int) ($_SESSION['clearance'] ?? 0);
}

function ops_console_bound(): bool
{
    return isset($_SESSION['ops_session'])
        && $_SESSION['ops_session'] === OPS_CONSOLE_VALID_SESSION;
}

function ops_console_authorized(): bool
{
    return ops_console_bound() && ops_console_clearance() >= 2;
}

function ops_console_internal_fetch(string $base, string $path): string
{
    if ($path === '' || $path[0] !== '/') {
        $path = '/' . $path;
    }
    $url = rtrim($base, '/') . $path;
    $ctx = stream_context_create([
        'http' => [
            'timeout' => 10,
            'ignore_errors' => true,
            'header' => "User-Agent: OMEGA-OPS-Console/1.0\r\n",
        ],
    ]);
    $body = @file_get_contents($url, false, $ctx);
    return $body === false ? '' : $body;
}

function ops_console_render_gate(string $title): void
{
    http_response_code(403);
    header('Content-Type: text/html; charset=UTF-8');
    $bound = ops_console_bound();
    $cl = ops_console_clearance();
    $relay = htmlspecialchars(OPS_CONSOLE_RELAY, ENT_QUOTES, 'UTF-8');
    ?>
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title><?= htmlspecialchars($title, ENT_QUOTES, 'UTF-8') ?> — accès relay</title>
  <link rel="stylesheet" href="/internal/auth-gateway/v2/assets/ops-console.css">
</head>
<body>
  <header class="topbar">
    <h1>OMEGA · Relais ops</h1>
    <span class="meta">Black Tide pivot gateway</span>
  </header>
  <main class="gate-main">
    <div class="card gate-card">
      <h2><?= htmlspecialchars($title, ENT_QUOTES, 'UTF-8') ?></h2>
      <p>Session : <strong><?= $bound ? 'liée' : 'non liée' ?></strong> · clearance=<strong><?= $cl ?></strong> (2 requis)</p>
      <?php if (!$bound): ?>
        <p><a class="btn" href="<?= $relay ?>?bind=ops-sess-8842">1. Lier la session relay</a></p>
        <p class="hint">Indice : audit log / <code>error.log</code> (BT-AUTH-4421).</p>
      <?php elseif ($cl < 2): ?>
        <p>2. Upgrade clearance (clé runbook / deploy-note) :</p>
        <form method="POST" action="<?= $relay ?>" class="inline">
          <input type="hidden" name="action" value="upgrade">
          <label>Clé upgrade <input type="password" name="key" required autocomplete="off"></label>
          <button type="submit">Upgrade clearance</button>
        </form>
        <p class="hint">Rechargez ensuite la console.</p>
      <?php endif; ?>
    </div>
  </main>
</body>
</html>
    <?php
    exit;
}

function ops_console_require_clearance(string $title): void
{
    session_start();
    if (!ops_console_authorized()) {
        ops_console_render_gate($title);
    }
}

function ops_console_alarm_armed(string $status): bool
{
    return $status !== '' && !str_contains($status, 'armed=no');
}
