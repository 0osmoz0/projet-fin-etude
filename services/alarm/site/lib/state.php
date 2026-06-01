<?php
declare(strict_types=1);

const ALERT_STATE_FILE = '/var/www/html/data/alert.state';

function alert_is_silenced(): bool
{
    if (!is_readable(ALERT_STATE_FILE)) {
        return false;
    }
    return trim((string) file_get_contents(ALERT_STATE_FILE)) === 'silenced';
}

function alert_set_silenced(): bool
{
    return file_put_contents(ALERT_STATE_FILE, "silenced\n", LOCK_EX) !== false;
}

function alert_status_line(): string
{
    $armed = alert_is_silenced() ? 'no' : 'yes';
    return "armed={$armed} window=cam3 service=field-alerting\n";
}
