<?php
declare(strict_types=1);

header('Content-Type: text/plain; charset=UTF-8');
header('X-Vault-Subsystem: evidence-api');

const SA_TOKEN = 'OMEGA-VAULT-SA-4421';
const DOSSIER_PATH = __DIR__ . '/../evidence/DOSSIER-OMEGA.txt';

$token = trim($_GET['token'] ?? $_SERVER['HTTP_X_VAULT_TOKEN'] ?? '');

if (!hash_equals(SA_TOKEN, $token)) {
    http_response_code(403);
    echo "VAULT DENIED reason=invalid_service_token\n";
    echo "hint=service account token on pivot (omega/ops/vault-token)\n";
    exit;
}

if (!is_readable(DOSSIER_PATH)) {
    http_response_code(500);
    echo "VAULT ERROR dossier=unavailable\n";
    exit;
}

$hash = hash_file('sha256', DOSSIER_PATH);
echo "VAULT OK dossier=DOSSIER-OMEGA.txt\n";
echo "OMEGA: DOSSIER-OMEGA-SHA256={$hash}\n";
