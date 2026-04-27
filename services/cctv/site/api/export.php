<?php
header('Content-Type: text/plain; charset=UTF-8');

$id = strtolower(trim($_GET['id'] ?? ''));
$scope = strtolower(trim($_GET['scope'] ?? 'default'));
$requester = strtolower(trim($_GET['as'] ?? 'viewer'));

$exports = [
    'pub-lobby' => __DIR__ . '/../exports/pub-lobby.txt',
    'pub-loading-bay' => __DIR__ . '/../exports/pub-loading-bay.txt',
    'int-cam3-offline' => __DIR__ . '/../exports/int-cam3-offline.txt',
];

if (!isset($exports[$id])) {
    http_response_code(404);
    echo "EXPORT NOT FOUND\n";
    exit;
}

$isInternalExport = str_starts_with($id, 'int-');
$legacyBypass = ($scope === 'legacy');
$isOperator = in_array($requester, ['ops', 'admin'], true);

// Intended policy: internal exports require operator role.
// Vulnerability for the challenge: legacy scope bypasses that policy.
if ($isInternalExport && !$isOperator && !$legacyBypass) {
    http_response_code(403);
    echo "EXPORT BLOCKED policy=role-check id={$id}\n";
    exit;
}

$logLine = sprintf(
    "%s id=%s scope=%s as=%s internal=%s bypass=%s\n",
    date(DATE_ATOM),
    $id,
    $scope,
    $requester,
    $isInternalExport ? 'yes' : 'no',
    $legacyBypass ? 'yes' : 'no'
);
file_put_contents(__DIR__ . '/../exports/access.log', $logLine, FILE_APPEND);

echo "EXPORT OK id={$id} scope={$scope}\n";
echo file_get_contents($exports[$id]);
