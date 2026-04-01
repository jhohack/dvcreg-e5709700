<?php
declare(strict_types=1);

use PHPMailer\PHPMailer\Exception as MailerException;
use PHPMailer\PHPMailer\PHPMailer;

bootstrap_runtime();
require_autoload_file();

if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') {
    http_response_code(204);
    exit;
}

function bootstrap_runtime(): void
{
    ob_start();
    set_api_headers();

    set_exception_handler(static function (Throwable $throwable): void {
        handle_uncaught_throwable($throwable);
    });

    set_error_handler(static function (int $severity, string $message, string $file = '', int $line = 0): bool {
        if ((error_reporting() & $severity) === 0) {
            return false;
        }

        throw new ErrorException($message, 0, $severity, $file, $line);
    });

    register_shutdown_function('handle_shutdown_error');
}

function require_autoload_file(): void
{
    $autoloadPath = __DIR__ . '/../vendor/autoload.php';
    if (!is_file($autoloadPath)) {
        error_response('Server dependencies are missing. Run composer install on the PHP host.', 500);
    }

    require_once $autoloadPath;

    if (!extension_loaded('curl')) {
        error_response('PHP cURL extension is required on the server.', 500);
    }
}

function set_api_headers(): void
{
    header('Content-Type: application/json');

    $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
    if ($origin !== '' && origin_is_allowed($origin)) {
        header("Access-Control-Allow-Origin: {$origin}");
        header('Vary: Origin');
        header('Access-Control-Allow-Headers: Content-Type');
        header('Access-Control-Allow-Methods: POST, OPTIONS');
        header('Access-Control-Allow-Credentials: true');
    }
}

function allowed_origins(): array
{
    static $origins = null;

    if (is_array($origins)) {
        return $origins;
    }

    $origins = [
        'http://localhost',
        'http://localhost:8080',
        'http://localhost:4173',
        'http://127.0.0.1',
        'http://127.0.0.1:8080',
        'http://127.0.0.1:4173',
    ];

    $configuredOrigins = trim((string) env_value('ALLOWED_ORIGINS', ''));
    if ($configuredOrigins !== '') {
        foreach (explode(',', $configuredOrigins) as $candidate) {
            $candidate = trim($candidate);
            if ($candidate !== '') {
                $origins[] = $candidate;
            }
        }
    }

    $origins = array_values(array_unique($origins));
    return $origins;
}

function origin_is_allowed(string $origin): bool
{
    return in_array($origin, allowed_origins(), true);
}

function env_config(): array
{
    static $config = null;

    if (is_array($config)) {
        return $config;
    }

    $config = [];
    foreach ([__DIR__ . '/../.env', __DIR__ . '/../.env.local'] as $path) {
        if (!is_file($path)) {
            continue;
        }

        $lines = file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
        if ($lines === false) {
            continue;
        }

        foreach ($lines as $line) {
            $trimmed = trim($line);
            if ($trimmed === '' || str_starts_with($trimmed, '#') || !str_contains($trimmed, '=')) {
                continue;
            }

            [$key, $value] = explode('=', $trimmed, 2);
            $key = trim($key);
            $value = trim($value);

            if (
                (str_starts_with($value, '"') && str_ends_with($value, '"')) ||
                (str_starts_with($value, "'") && str_ends_with($value, "'"))
            ) {
                $value = substr($value, 1, -1);
            }

            $config[$key] = $value;
        }
    }

    return $config;
}

function env_value(string $key, ?string $default = null): ?string
{
    $config = env_config();
    return $config[$key] ?? getenv($key) ?: $default;
}

function debug_enabled(): bool
{
    $flag = strtolower(trim((string) env_value('APP_DEBUG', '')));
    if (in_array($flag, ['1', 'true', 'yes', 'on'], true)) {
        return true;
    }

    $host = strtolower((string) ($_SERVER['HTTP_HOST'] ?? ''));
    return $host === 'localhost'
        || str_starts_with($host, 'localhost:')
        || $host === '127.0.0.1'
        || str_starts_with($host, '127.0.0.1:');
}

function require_env(string $key): string
{
    $value = env_value($key);
    if ($value === null || $value === '') {
        error_response("Missing required server configuration: {$key}", 500);
    }

    return $value;
}

function json_input(): array
{
    $raw = file_get_contents('php://input');
    if ($raw === false || trim($raw) === '') {
        return [];
    }

    $decoded = json_decode($raw, true);
    if (!is_array($decoded)) {
        error_response('Invalid JSON request body.', 400);
    }

    return $decoded;
}

function json_response(array $data, int $status = 200): never
{
    http_response_code($status);
    echo json_encode($data, JSON_UNESCAPED_SLASHES);
    exit;
}

function error_message_for_throwable(Throwable $throwable): string
{
    if (debug_enabled()) {
        return sprintf(
            '%s in %s:%d',
            $throwable->getMessage(),
            basename($throwable->getFile()),
            $throwable->getLine()
        );
    }

    return 'Verification service error. Please try again in a moment.';
}

function handle_uncaught_throwable(Throwable $throwable): never
{
    while (ob_get_level() > 0) {
        ob_end_clean();
    }

    http_response_code(500);
    header('Content-Type: application/json');
    echo json_encode([
        'ok' => false,
        'message' => error_message_for_throwable($throwable),
    ], JSON_UNESCAPED_SLASHES);
    exit;
}

function handle_shutdown_error(): void
{
    $error = error_get_last();
    if (!is_array($error)) {
        if (ob_get_level() > 0) {
            ob_end_flush();
        }
        return;
    }

    $fatalTypes = [E_ERROR, E_PARSE, E_CORE_ERROR, E_COMPILE_ERROR, E_USER_ERROR];
    if (!in_array($error['type'] ?? 0, $fatalTypes, true)) {
        if (ob_get_level() > 0) {
            ob_end_flush();
        }
        return;
    }

    while (ob_get_level() > 0) {
        ob_end_clean();
    }

    $message = debug_enabled()
        ? sprintf(
            '%s in %s:%d',
            (string) ($error['message'] ?? 'Fatal error'),
            basename((string) ($error['file'] ?? 'unknown')),
            (int) ($error['line'] ?? 0)
        )
        : 'Verification service error. Please try again in a moment.';

    http_response_code(500);
    header('Content-Type: application/json');
    echo json_encode([
        'ok' => false,
        'message' => $message,
    ], JSON_UNESCAPED_SLASHES);
}

function error_response(string $message, int $status = 400, array $extra = []): never
{
    json_response([
        'ok' => false,
        'message' => $message,
        ...$extra,
    ], $status);
}

function http_json_request(string $method, string $url, array $headers = [], ?array $body = null): array
{
    $ch = curl_init($url);
    if ($ch === false) {
        error_response('Unable to initialize HTTP request.', 500);
    }

    $requestHeaders = $headers;
    if ($body !== null) {
        $requestHeaders[] = 'Content-Type: application/json';
    }

    curl_setopt_array($ch, [
        CURLOPT_CUSTOMREQUEST => $method,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_HTTPHEADER => $requestHeaders,
        CURLOPT_TIMEOUT => 20,
    ]);

    if ($body !== null) {
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($body, JSON_UNESCAPED_SLASHES));
    }

    $responseBody = curl_exec($ch);
    $statusCode = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curlError = curl_error($ch);
    curl_close($ch);

    if ($responseBody === false) {
        error_response($curlError !== '' ? $curlError : 'HTTP request failed.', 500);
    }

    $decoded = null;
    if ($responseBody !== '' && $responseBody !== 'null') {
        $decoded = json_decode($responseBody, true);
        if ($decoded === null && json_last_error() !== JSON_ERROR_NONE) {
            $decoded = $responseBody;
        }
    }

    return [
        'status' => $statusCode,
        'body' => $decoded,
    ];
}

function supabase_request(string $method, string $table, array $query = [], ?array $body = null, array $headers = []): array
{
    $baseUrl = rtrim(require_env('VITE_SUPABASE_URL'), '/');
    $serviceRoleKey = require_env('SUPABASE_SERVICE_ROLE_KEY');
    $url = "{$baseUrl}/rest/v1/{$table}";

    if ($query !== []) {
        $url .= '?' . http_build_query($query, '', '&', PHP_QUERY_RFC3986);
    }

    $baseHeaders = [
        "apikey: {$serviceRoleKey}",
        "Authorization: Bearer {$serviceRoleKey}",
        'Accept: application/json',
    ];

    return http_json_request($method, $url, [...$baseHeaders, ...$headers], $body);
}

function supabase_insert(string $table, array $row): array
{
    return supabase_request('POST', $table, [], $row, ['Prefer: return=representation']);
}

function supabase_select_one(string $table, array $filters, string $select = '*'): ?array
{
    $response = supabase_request('GET', $table, ['select' => $select, ...$filters]);
    if ($response['status'] >= 300) {
        return null;
    }

    $rows = $response['body'];
    if (!is_array($rows) || !isset($rows[0]) || !is_array($rows[0])) {
        return null;
    }

    return $rows[0];
}

function supabase_update(string $table, array $filters, array $updates): array
{
    return supabase_request('PATCH', $table, ['select' => '*', ...$filters], $updates, ['Prefer: return=representation']);
}

function supabase_delete(string $table, array $filters): array
{
    return supabase_request('DELETE', $table, $filters);
}

function admission_exists(string $id): bool
{
    return supabase_select_one('admission', ['id' => 'eq.' . $id], 'id') !== null;
}

function is_missing_academic_columns_error(array|string|null $body): bool
{
    if (!is_array($body)) {
        return false;
    }

    $message = (string) ($body['message'] ?? '');
    return str_contains($message, "column admission.education_level does not exist")
        || str_contains($message, "column admission.program does not exist")
        || str_contains($message, "column admission.level does not exist")
        || str_contains($message, "could not find the 'education_level' column")
        || str_contains($message, "could not find the 'program' column")
        || str_contains($message, "could not find the 'level' column");
}

function insert_admission_payloads(string $id, array $payload, array $legacyPayload): void
{
    $payload['id'] = $id;
    $legacyPayload['id'] = $id;

    $response = supabase_insert('admission', $payload);
    if ($response['status'] >= 200 && $response['status'] < 300) {
        return;
    }

    if ($response['status'] === 409 && admission_exists($id)) {
        return;
    }

    if (is_missing_academic_columns_error($response['body'])) {
        $fallback = supabase_insert('admission', $legacyPayload);
        if (($fallback['status'] >= 200 && $fallback['status'] < 300) || ($fallback['status'] === 409 && admission_exists($id))) {
            return;
        }

        error_response('Verification succeeded, but saving the registration failed.', 500);
    }

    error_response('Verification succeeded, but saving the registration failed.', 500);
}

function send_verification_email(string $recipientEmail, string $code, int $ttlMinutes): void
{
    $mail = new PHPMailer(true);

    try {
        $mail->isSMTP();
        $mail->Host = require_env('SMTP_HOST');
        $mail->SMTPAuth = true;
        $mail->Username = require_env('SMTP_USERNAME');
        $mail->Password = require_env('SMTP_PASSWORD');
        $mail->Port = (int) require_env('SMTP_PORT');
        $mail->CharSet = 'UTF-8';

        $smtpSecure = strtolower((string) env_value('SMTP_SECURE', 'tls'));
        $mail->SMTPSecure = $smtpSecure === 'ssl'
            ? PHPMailer::ENCRYPTION_SMTPS
            : PHPMailer::ENCRYPTION_STARTTLS;

        $mail->setFrom(
            env_value('MAIL_FROM_ADDRESS', require_env('SMTP_USERNAME')),
            env_value('MAIL_FROM_NAME', 'DVC Registration')
        );
        $mail->addAddress($recipientEmail);
        $mail->isHTML(true);
        $mail->Subject = 'Your DVC registration verification code';
        $mail->Body = sprintf(
            '<p>Your verification code is:</p><p style="font-size: 28px; font-weight: 700; letter-spacing: 6px;">%s</p><p>This code will expire in %d minutes.</p><p>If you did not request this, you can ignore this email.</p>',
            htmlspecialchars($code, ENT_QUOTES, 'UTF-8'),
            $ttlMinutes
        );
        $mail->AltBody = "Your DVC registration verification code is {$code}. It expires in {$ttlMinutes} minutes.";
        $mail->send();
    } catch (MailerException $exception) {
        throw new RuntimeException('Failed to send the verification email. Please try again.', 0, $exception);
    }
}

function normalized_email(string $email): string
{
    return strtolower(trim($email));
}

function valid_email(string $email): bool
{
    return filter_var($email, FILTER_VALIDATE_EMAIL) !== false;
}
