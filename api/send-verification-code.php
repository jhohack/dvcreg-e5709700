<?php
declare(strict_types=1);

require_once __DIR__ . '/bootstrap.php';

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    error_response('Method not allowed.', 405);
}

$input = json_input();
$email = normalized_email((string) ($input['email'] ?? ''));
$payload = $input['payload'] ?? null;
$legacyPayload = $input['legacyPayload'] ?? null;

if (!valid_email($email)) {
    error_response('Please enter a valid email address.', 422);
}

if (!is_array($payload) || !is_array($legacyPayload)) {
    error_response('Missing registration payload.', 422);
}

unset($payload['id'], $legacyPayload['id']);
$payload['email'] = $email;
$legacyPayload['email'] = $email;

$ttlMinutes = max(1, (int) env_value('MAIL_CODE_TTL_MINUTES', '10'));
$verificationCode = str_pad((string) random_int(0, 999999), 6, '0', STR_PAD_LEFT);
$expiresAt = gmdate('c', time() + ($ttlMinutes * 60));

$record = [
    'email' => $email,
    'payload' => $payload,
    'legacy_payload' => $legacyPayload,
    'code_hash' => password_hash($verificationCode, PASSWORD_DEFAULT),
    'expires_at' => $expiresAt,
];

$response = supabase_insert('registration_verifications', $record);
$created = is_array($response['body']) && isset($response['body'][0]) && is_array($response['body'][0])
    ? $response['body'][0]
    : null;

if ($response['status'] < 200 || $response['status'] >= 300 || !is_array($created) || empty($created['id'])) {
    error_response('Could not start email verification. Please try again.', 500);
}

try {
    send_verification_email($email, $verificationCode, $ttlMinutes);
} catch (Throwable $throwable) {
    supabase_delete('registration_verifications', ['id' => 'eq.' . $created['id']]);
    error_response($throwable->getMessage(), 500);
}

json_response([
    'ok' => true,
    'verificationId' => $created['id'],
    'expiresAt' => $expiresAt,
    'email' => $email,
]);
