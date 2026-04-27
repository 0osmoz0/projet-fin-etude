<?php
header('Content-Type: text/plain; charset=UTF-8');

$tpl = $_GET['tpl'] ?? 'default';
$tpl = strtolower(trim($tpl));
$mode = $_GET['mode'] ?? 'safe';
$mode = strtolower(trim($mode));
$allowedTemplates = ['default', 'status'];
if ($mode === 'legacy') {
    $allowedTemplates[] = 'diag';
}
$isBlocked = str_contains($tpl, '../') || str_contains($tpl, '%2e%2e');
$rid = 'r' . date('YmdHis') . '-' . substr(preg_replace('/[^a-z0-9]/', '', $tpl), 0, 8);
$decision = ($isBlocked || !in_array($tpl, $allowedTemplates, true)) ? 'BLOCK' : 'ALLOW';
$logLine = date(DATE_ATOM) . " mode={$mode} tpl={$tpl} rid={$rid} decision={$decision}\n";
file_put_contents(__DIR__ . '/render.log', $logLine, FILE_APPEND);

if ($isBlocked || !in_array($tpl, $allowedTemplates, true)) {
    echo "RENDER BLOCKED rid={$rid} mode={$mode}\n";
    exit;
}
echo "RENDER OK tpl={$tpl} rid={$rid} mode={$mode}\n";
$templatePath = __DIR__ . "/templates/{$tpl}.txt";
echo file_get_contents($templatePath);