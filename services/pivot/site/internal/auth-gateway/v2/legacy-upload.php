<?php
declare(strict_types=1);

/**
 * Dépôt fichiers partenaire (profil legacy BT-AUTH-4421).
 * Filtre d'extension assoupli pour compatibilité templates — ne pas exposer publiquement.
 */
header('Content-Type: text/plain; charset=UTF-8');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo "UPLOAD METHOD=POST required\n";
    echo "hint=partner maintenance drop accepts file field 'artifact'\n";
    exit;
}

$staging = '/var/www/html/uploads/staging';
if (!is_dir($staging) && !mkdir($staging, 0755, true)) {
    http_response_code(500);
    echo "UPLOAD ERROR staging=unavailable\n";
    exit;
}

if (!isset($_FILES['artifact']) || !is_uploaded_file($_FILES['artifact']['tmp_name'])) {
    http_response_code(400);
    echo "UPLOAD DENIED field=artifact missing\n";
    exit;
}

$name = basename((string) ($_FILES['artifact']['name'] ?? 'drop.bin'));
$ext = strtolower(pathinfo($name, PATHINFO_EXTENSION));
$allowed = ['txt', 'pdf', 'phtml'];

if (!in_array($ext, $allowed, true)) {
    http_response_code(403);
    echo "UPLOAD DENIED extension={$ext} allowed=" . implode(',', $allowed) . "\n";
    exit;
}

$dest = $staging . '/' . $name;
if (!move_uploaded_file($_FILES['artifact']['tmp_name'], $dest)) {
    http_response_code(500);
    echo "UPLOAD ERROR store=failed\n";
    exit;
}

chmod($dest, 0644);
echo "UPLOAD OK name={$name} path=/uploads/staging/{$name}\n";
echo "note=legacy template handlers may execute .phtml in staging (rollback profile)\n";
