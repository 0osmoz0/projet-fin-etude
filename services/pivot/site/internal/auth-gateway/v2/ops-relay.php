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
const MESH_PATH = __DIR__ . '/omega/ops/mesh.txt';
const SSH_LEAK_PATH = '/opt/omega/ops/ssh/id_ops.leak';
const SSH_KEY_PATH = '/opt/omega/ops/ssh/id_ops';
const INTERNAL_TARGETS = [
    'cctv' => 'http://cctv:8080',
    'vault' => 'http://vault:8080',
    'alarm' => 'http://alarm:8080',
];

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

function require_clearance(int $min): void
{
    if (clearance() < $min) {
        respond(403, "RELAY DENIED clearance=insufficient (need {$min})\n");
    }
}

function internal_fetch(string $base, string $path): string
{
    if ($path === '' || $path[0] !== '/') {
        $path = '/' . $path;
    }
    if (str_contains($path, '..') || preg_match('#^https?://#i', $path)) {
        respond(400, "RELAY DENIED path=invalid\n");
    }
    $url = rtrim($base, '/') . $path;
    $ctx = stream_context_create([
        'http' => [
            'timeout' => 8,
            'ignore_errors' => true,
            'header' => "User-Agent: OMEGA-OPS-Relay/1.0\r\n",
        ],
    ]);
    $body = @file_get_contents($url, false, $ctx);
    if ($body === false) {
        respond(502, "RELAY ERROR upstream=unreachable url={$url}\n");
    }
    return $body;
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
        'actions: list | upgrade (POST) | export | mesh | probe | ssh-bundle',
        'current clearance=' . clearance(),
        'bound session=' . $_SESSION['ops_session'],
    ]) . "\n");
}

if ($action === 'list') {
    $lines = [
        'OPS-RELAY inventory clearance=' . clearance(),
        'artifact foothold status=cleared (external channel)',
        'artifact elevation status=' . (clearance() >= 2 ? 'exportable' : 'locked (clearance 2)'),
        'lane web=mesh,probe (clearance 2)',
        'lane shell=legacy-upload → /uploads/staging/*.phtml',
        'lane ssh=ssh-bundle export + ops@pivot:22 (see mesh)',
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
    require_clearance(2);
    $artifact = strtolower(trim((string) ($_GET['artifact'] ?? '')));
    if ($artifact !== 'elevation') {
        respond(400, "RELAY DENIED artifact=unknown (allowed: elevation)\n");
    }
    if (!is_readable(ELEVATION_PATH)) {
        respond(500, "RELAY ERROR artifact_store=unavailable\n");
    }
    respond(200, trim((string) file_get_contents(ELEVATION_PATH)) . "\n");
}

if ($action === 'mesh') {
    require_clearance(2);
    if (!is_readable(MESH_PATH)) {
        respond(500, "RELAY ERROR mesh=unavailable\n");
    }
    respond(200, trim((string) file_get_contents(MESH_PATH)) . "\n");
}

if ($action === 'probe') {
    require_clearance(2);
    $target = strtolower(trim((string) ($_GET['target'] ?? '')));
    if (!isset(INTERNAL_TARGETS[$target])) {
        respond(400, "RELAY DENIED target=invalid (allowed: " . implode(', ', array_keys(INTERNAL_TARGETS)) . ")\n");
    }
    $path = (string) ($_GET['path'] ?? '/');
    $body = internal_fetch(INTERNAL_TARGETS[$target], $path);
    respond(200, "RELAY PROBE target={$target}\n" . $body);
}

if ($action === 'ssh-bundle') {
    require_clearance(2);
    $lines = [
        'OPS-SSH-BUNDLE clearance=2',
        'user=ops port=22 auth=publickey',
        'key_leak_path=' . SSH_LEAK_PATH,
        'key_primary_path=' . SSH_KEY_PATH,
        'hint=world-readable leak intentional (backup misconfig)',
    ];
    if (is_readable(SSH_LEAK_PATH)) {
        $lines[] = '---BEGIN KEY LEAK---';
        $lines[] = trim((string) file_get_contents(SSH_LEAK_PATH));
        $lines[] = '---END KEY LEAK---';
    } else {
        $lines[] = 'status=key_leak_unavailable';
    }
    if (is_readable(__DIR__ . '/omega/ops/ssh-note.txt')) {
        $lines[] = trim((string) file_get_contents(__DIR__ . '/omega/ops/ssh-note.txt'));
    }
    respond(200, implode("\n", $lines) . "\n");
}

respond(400, "RELAY DENIED action=invalid\n");
