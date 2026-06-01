<?php
declare(strict_types=1);

require_once __DIR__ . '/../lib/state.php';

header('Content-Type: text/plain; charset=UTF-8');
header('X-Alarm-Subsystem: field-alerting');

echo alert_status_line();
if (alert_is_silenced()) {
    echo "terrain_lane=cleared (cam-3 plan export allowed)\n";
} else {
    echo "terrain_lane=blocked until silence confirmed\n";
    echo "hint=POST /api/silence.php with ops token (see pivot omega/ops/alarm-token)\n";
}
