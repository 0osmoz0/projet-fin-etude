<?php
declare(strict_types=1);

require_once __DIR__ . '/../lib/state.php';

header('Content-Type: text/plain; charset=UTF-8');
header('X-Alarm-Subsystem: field-alerting');

const OPS_TOKEN = 'BT-ALARM-OPS-4421';
const VALID_WINDOW = 'cam3';

$token = trim($_POST['token'] ?? $_GET['token'] ?? '');
$window = strtolower(trim($_POST['window'] ?? $_GET['window'] ?? ''));

if (!hash_equals(OPS_TOKEN, $token)) {
    http_response_code(403);
    echo "ALARM DENIED reason=invalid_token\n";
    echo "hint=token on pivot (omega/ops/alarm-token legacy tpl)\n";
    exit;
}

if ($window !== VALID_WINDOW) {
    http_response_code(400);
    echo "ALARM DENIED reason=invalid_window (expected: " . VALID_WINDOW . ")\n";
    exit;
}

if (alert_is_silenced()) {
    echo "ALARM OK state=already_silenced\n";
    echo "ALERT: SILENCED-BT-4421\n";
    exit;
}

if (!alert_set_silenced()) {
    http_response_code(500);
    echo "ALARM ERROR state=write_failed\n";
    exit;
}

echo "ALARM OK state=silenced window={$window}\n";
echo "terrain_lane=cleared\n";
echo "ALERT: SILENCED-BT-4421\n";
