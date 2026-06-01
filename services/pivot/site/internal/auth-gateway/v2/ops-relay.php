<?php
declare(strict_types=1);

/**
 * Console relais ops (maintenance BT-AUTH-4421).
 * Nécessite liaison de session + clé runbook pour clearance 2.
 */
session_start();

header('Content-Type: text/plain; charset=UTF-8');
header('X-BT-Trace: BT-AUTH-4421');
header('X-BT-Subsystem: ops-relay');

const VALID_SESSION = 'ops-sess-8842';
const UPGRADE_KEY = '1442-HTUA-TB:n.morel';
const ELEVATION_PATH = '/opt/omega/proofs/ELEVATION.txt';

function respond(int $code, string $body): void
{
    http_response_code($code);
    echo $body;
    exit;
}

function clearance(): int
{
    return (int) ($_SESSION['clearance'] ?? 0);
}

function has_bound_session(): bool
{
    return isset($_SESSION['ops_session']) && $_SESSION['ops_session'] === VALID_SESSION;
}

$action = strtolower(trim($_GET['action'] ?? $_POST['action'] ?? ''));

if (isset($_GET['bind'])) {
    $bind = trim((string) $_GET['bind']);
    if ($bind !== VALID_SESSION) {
        respond(403, "RELAY DENIED bind=invalid_session\n");
    }
    $_SESSION['ops_session'] = VALID_SESSION;
    $_SESSION['clearance'] = 1;
    respond(200, "RELAY BOUND session={$bind} clearance=1\n");
}

if (!has_bound_session()) {
    respond(403, "RELAY DENIED reason=unbound_session (use ?bind=<session_from_audit_log>)\n");
}

if ($action === '' || $action === 'help') {
    respond(200, implode("\n", [
        'OPS-RELAY help',
        'actions: list | upgrade (POST) | export',
        'current clearance=' . clearance(),
        'bound session=' . $_SESSION['ops_session'],
    ]) . "\n");
}

if ($action === 'list') {
    $lines = [
        'OPS-RELAY inventory clearance=' . clearance(),
        'artifact foothold status=cleared (external channel)',
        'artifact elevation status=' . (clearance() >= 2 ? 'exportable' : 'locked (clearance 2)'),
    ];
    respond(200, implode("\n", $lines) . "\n");
}

if ($action === 'upgrade') {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        respond(405, "RELAY DENIED upgrade_requires_post\n");
    }
    $key = trim((string) ($_POST['key'] ?? ''));
    if ($key === '') {
        respond(400, "RELAY DENIED key=missing\n");
    }
    if (!hash_equals(UPGRADE_KEY, $key)) {
        respond(403, "RELAY DENIED key=invalid_upgrade_material\n");
    }
    $_SESSION['clearance'] = 2;
    respond(200, "RELAY UPGRADED clearance=2 operator_lane=ops\n");
}

if ($action === 'export') {
    if (clearance() < 2) {
        respond(403, "RELAY DENIED clearance=insufficient (need 2)\n");
    }
    $artifact = strtolower(trim((string) ($_GET['artifact'] ?? '')));
    if ($artifact !== 'elevation') {
        respond(400, "RELAY DENIED artifact=unknown (allowed: elevation)\n");
    }
    if (!is_readable(ELEVATION_PATH)) {
        respond(500, "RELAY ERROR artifact_store=unavailable\n");
    }
    respond(200, trim((string) file_get_contents(ELEVATION_PATH)) . "\n");
}

respond(400, "RELAY DENIED action=invalid\n");
