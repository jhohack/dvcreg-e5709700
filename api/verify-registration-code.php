<?php
declare(strict_types=1);

require_once __DIR__ . '/bootstrap.php';

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    error_response('Method not allowed.', 405);
}

$input = json_input();
$verificationId = trim((string) ($input['verificationId'] ?? ''));
$code = preg_replace('/\D+/', '', (string) ($input['code'] ?? ''));

if ($verificationId === '' || !preg_match('/^[0-9]{6}$/', $code)) {
    error_response('Enter the 6-digit verification code.', 422);
}

$record = supabase_select_one('registration_verifications', ['id' => 'eq.' . $verificationId], '*');
if ($record === null) {
    error_response('Verification request not found. Please request a new code.', 404);
}

if (!empty($record['used_at']) || !empty($record['verified_at'])) {
    if (admission_exists($verificationId)) {
        json_response(['ok' => true, 'alreadyVerified' => true]);
    }

    error_response('This verification code has already been used.', 409);
}

$expiresAt = strtotime((string) ($record['expires_at'] ?? ''));
if ($expiresAt === false || $expiresAt < time()) {
    error_response('This verification code has expired. Please request a new one.', 410);
}

$attemptCount = (int) ($record['attempt_count'] ?? 0);
if ($attemptCount >= 5) {
    error_response('Too many incorrect attempts. Please request a new code.', 429);
}

$codeHash = (string) ($record['code_hash'] ?? '');
if ($codeHash === '' || !password_verify($code, $codeHash)) {
    supabase_update('registration_verifications', ['id' => 'eq.' . $verificationId], [
        'attempt_count' => $attemptCount + 1,
    ]);

    error_response('Incorrect verification code.', 422, [
        'remainingAttempts' => max(0, 4 - $attemptCount),
    ]);
}

$payload = $record['payload'] ?? null;
$legacyPayload = $record['legacy_payload'] ?? null;

if (!is_array($payload) || !is_array($legacyPayload)) {
    error_response('Stored verification data is invalid. Please submit the form again.', 500);
}

insert_admission_payloads($verificationId, $payload, $legacyPayload);

supabase_update('registration_verifications', ['id' => 'eq.' . $verificationId], [
    'verified_at' => gmdate('c'),
    'used_at' => gmdate('c'),
]);

json_response([
    'ok' => true,
]);
