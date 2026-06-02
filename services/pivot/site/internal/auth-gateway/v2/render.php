<?php
declare(strict_types=1);

header('Content-Type: text/plain; charset=UTF-8');

/** Templates autorisés en mode safe (sous-dossier templates/). */
const TEMPLATES_SAFE = ['default', 'status'];

/**
 * Mode legacy-mirror (rollback BT-AUTH-4421) : résolution depuis la racine v2,
 * pas uniquement templates/ — comportement de régression documenté côté ops.
 */
const TEMPLATES_LEGACY = [
    'default',
    'status',
    'diag',
    'omega/proofs/foothold',
    'omega/logs/audit',
    'omega/ops/runbook',
    'omega/ops/mesh',
    'omega/ops/ssh-note',
    'omega/ops/tunnel-note',
    'omega/ops/cctv-token',
    'omega/ops/vault-token',
    'omega/ops/alarm-token',
    'omega/ops/root-lpe',
    'omega/ops/sudoers-fragment',
];

function normalize_param(string $value): string
{
    return strtolower(trim($value));
}

function is_path_blocked(string $tpl): bool
{
    return str_contains($tpl, '..')
        || str_contains($tpl, '%2e%2e')
        || str_contains($tpl, '\\');
}

$tpl = normalize_param($_GET['tpl'] ?? 'default');
$mode = normalize_param($_GET['mode'] ?? 'safe');

if (!in_array($mode, ['safe', 'legacy'], true)) {
    header('HTTP/1.1 400 Bad Request');
    echo "RENDER BLOCKED mode=invalid\n";
    exit;
}

$legacy = ($mode === 'legacy');
$allowed = $legacy ? TEMPLATES_LEGACY : TEMPLATES_SAFE;
$blocked = is_path_blocked($tpl);
$allowedTpl = in_array($tpl, $allowed, true);
$decision = ($blocked || !$allowedTpl) ? 'BLOCK' : 'ALLOW';

$rid = 'r' . date('YmdHis') . '-' . substr(preg_replace('/[^a-z0-9]/', '', $tpl), 0, 8);
$logLine = date(DATE_ATOM) . " mode={$mode} tpl={$tpl} rid={$rid} decision={$decision}\n";
file_put_contents(__DIR__ . '/render.log', $logLine, FILE_APPEND);

if ($decision === 'BLOCK') {
    echo "RENDER BLOCKED rid={$rid} mode={$mode}\n";
    exit;
}

// Régression legacy : chemins avec slash depuis la racine v2 ; noms courts → templates/.
if ($legacy && str_contains($tpl, '/')) {
    $templatePath = __DIR__ . '/' . $tpl . '.txt';
} else {
    $templatePath = __DIR__ . '/templates/' . $tpl . '.txt';
}

if (!is_readable($templatePath)) {
    echo "RENDER MISSING rid={$rid} mode={$mode} tpl={$tpl}\n";
    exit;
}

echo "RENDER OK tpl={$tpl} rid={$rid} mode={$mode}\n";
echo file_get_contents($templatePath);
