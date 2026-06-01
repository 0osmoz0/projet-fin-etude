<?php
declare(strict_types=1);

header('Content-Type: text/html; charset=UTF-8');

const ADMIN_TOKEN = 'BT-CCTV-ADMIN-4421';

$token = trim($_POST['token'] ?? $_GET['token'] ?? '');
$authenticated = hash_equals(ADMIN_TOKEN, $token);

if ($_SERVER['REQUEST_METHOD'] === 'POST' && $authenticated) {
    header('Location: /api/export.php?id=int-cam3-plan&token=' . rawurlencode($token) . '&as=admin');
    exit;
}
?>
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>CCTV Operator Console</title>
</head>
<body>
  <h1>CCTV Operator Console</h1>
  <p>Internal — cam-3 plan / blindspot scheduling</p>
  <?php if (!$authenticated): ?>
    <form method="POST">
      <label>Operator token <input type="password" name="token" autocomplete="off"></label>
      <button type="submit">Unlock exports</button>
    </form>
    <p><small>Token provisioning: pivot ops lane (BT-AUTH-4421).</small></p>
  <?php else: ?>
    <p>Session: operator</p>
    <ul>
      <li><a href="/api/export.php?id=int-cam3-plan&amp;token=<?= htmlspecialchars($token, ENT_QUOTES) ?>&amp;as=admin">Download cam-3 plan export</a></li>
      <li><a href="/api/export.php?id=int-cam3-offline&amp;scope=legacy&amp;as=ops">Offline window (legacy)</a></li>
    </ul>
  <?php endif; ?>
</body>
</html>
