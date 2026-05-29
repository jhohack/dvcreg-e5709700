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

if (!function_exists('verify_stored_registration_code')) {
    function verify_stored_registration_code(string $code, string $storedHash): bool
    {
        if (str_starts_with($storedHash, 'sha256:')) {
            $pepper = (string) env_value('VERIFICATION_CODE_PEPPER', '');
            return hash_equals($storedHash, 'sha256:' . hash('sha256', "{$code}:{$pepper}"));
        }

        return $storedHash !== '' && password_verify($code, $storedHash);
    }
}

if (!function_exists('registration_request_is_usable')) {
    function registration_request_is_usable(array $record): bool
    {
        if (!empty($record['used_at']) || !empty($record['verified_at'])) {
            return false;
        }

        $expiresAt = strtotime((string) ($record['expires_at'] ?? ''));
        if ($expiresAt === false || $expiresAt < time()) {
            return false;
        }

        return (int) ($record['attempt_count'] ?? 0) < 5;
    }
}

if (!empty($record['used_at']) || !empty($record['verified_at'])) {
    if (admission_exists($verificationId)) {
        json_response(['ok' => true, 'alreadyVerified' => true]);
    }
}

$codeHash = (string) ($record['code_hash'] ?? '');
$matchedRecord = registration_request_is_usable($record) && $codeHash !== '' && verify_stored_registration_code($code, $codeHash)
    ? $record
    : null;

if ($matchedRecord === null) {
    $activeRequestsResponse = supabase_request('GET', 'registration_verifications', [
        'email' => 'eq.' . (string) ($record['email'] ?? ''),
        'used_at' => 'is.null',
        'verified_at' => 'is.null',
        'expires_at' => 'gt.' . gmdate('c'),
        'order' => 'created_at.desc',
        'limit' => '10',
    ]);

    if ($activeRequestsResponse['status'] < 200 || $activeRequestsResponse['status'] >= 300 || !is_array($activeRequestsResponse['body'])) {
        error_response('Verification service error. Please try again in a moment.', 500);
    }

    foreach ($activeRequestsResponse['body'] as $activeRequest) {
        if (!is_array($activeRequest) || ($activeRequest['id'] ?? null) === ($record['id'] ?? null) || !registration_request_is_usable($activeRequest)) {
            continue;
        }

        $activeCodeHash = (string) ($activeRequest['code_hash'] ?? '');
        if ($activeCodeHash !== '' && verify_stored_registration_code($code, $activeCodeHash)) {
            $matchedRecord = $activeRequest;
            break;
        }
    }
}

if ($matchedRecord === null) {
    if (!empty($record['used_at']) || !empty($record['verified_at'])) {
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

    supabase_update('registration_verifications', ['id' => 'eq.' . $verificationId], [
        'attempt_count' => $attemptCount + 1,
    ]);

    error_response('Incorrect verification code.', 422, [
        'remainingAttempts' => max(0, 4 - $attemptCount),
    ]);
}

$record = $matchedRecord;
$payload = $record['payload'] ?? null;
$legacyPayload = $record['legacy_payload'] ?? null;

if (!is_array($payload) || !is_array($legacyPayload)) {
    error_response('Stored verification data is invalid. Please submit the form again.', 500);
}

$matchedVerificationId = (string) ($record['id'] ?? $verificationId);
insert_admission_payloads($matchedVerificationId, $payload, $legacyPayload);

supabase_update('registration_verifications', ['id' => 'eq.' . $matchedVerificationId], [
    'verified_at' => gmdate('c'),
    'used_at' => gmdate('c'),
]);

json_response([
    'ok' => true,
]);
