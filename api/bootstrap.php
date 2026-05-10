<?php
declare(strict_types=1);

bootstrap_runtime();
require_runtime_extensions();

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

function require_runtime_extensions(): void
{
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
        || str_contains($message, "column admission.profile_photo_path does not exist")
        || str_contains($message, "column admission.profile_photo_file_name does not exist")
        || str_contains($message, "column admission.signature_path does not exist")
        || str_contains($message, "column admission.signature_file_name does not exist")
        || str_contains($message, "could not find the 'education_level' column")
        || str_contains($message, "could not find the 'program' column")
        || str_contains($message, "could not find the 'level' column")
        || str_contains($message, "could not find the 'profile_photo_path' column")
        || str_contains($message, "could not find the 'profile_photo_file_name' column")
        || str_contains($message, "could not find the 'signature_path' column")
        || str_contains($message, "could not find the 'signature_file_name' column");
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

function smtp_client_hostname(): string
{
    $hostname = trim((string) gethostname());
    if ($hostname === '') {
        return 'localhost';
    }

    $sanitized = preg_replace('/[^A-Za-z0-9.-]/', '-', $hostname);
    return $sanitized !== null && $sanitized !== '' ? $sanitized : 'localhost';
}

function smtp_security_mode(): string
{
    $mode = strtolower(trim((string) env_value('SMTP_SECURE', 'tls')));

    return match ($mode) {
        '', 'none', 'off' => 'none',
        'ssl', 'smtps' => 'ssl',
        default => 'tls',
    };
}

function smtp_timeout_seconds(): float
{
    $configuredTimeout = (float) env_value('SMTP_TIMEOUT_SECONDS', '20');
    return $configuredTimeout > 0 ? $configuredTimeout : 20.0;
}

function smtp_connection_target(string $host, int $port, string $security): string
{
    $protocol = $security === 'ssl' ? 'ssl' : 'tcp';
    return sprintf('%s://%s:%d', $protocol, $host, $port);
}

/**
 * @return resource
 */
function smtp_open_connection()
{
    $host = require_env('SMTP_HOST');
    $port = (int) require_env('SMTP_PORT');
    $security = smtp_security_mode();

    if ($security !== 'none' && !extension_loaded('openssl')) {
        throw new RuntimeException('PHP OpenSSL extension is required for SMTP encryption.');
    }

    $context = stream_context_create([
        'ssl' => [
            'verify_peer' => true,
            'verify_peer_name' => true,
            'allow_self_signed' => false,
        ],
    ]);

    $target = smtp_connection_target($host, $port, $security);
    $socket = @stream_socket_client(
        $target,
        $errorCode,
        $errorMessage,
        smtp_timeout_seconds(),
        STREAM_CLIENT_CONNECT,
        $context
    );

    if (!is_resource($socket)) {
        throw new RuntimeException(
            sprintf('Unable to connect to the SMTP server (%s).', $errorMessage !== '' ? $errorMessage : $host)
        );
    }

    stream_set_timeout($socket, (int) ceil(smtp_timeout_seconds()));

    return $socket;
}

/**
 * @param resource $socket
 * @return array{code:int,message:string}
 */
function smtp_read_response($socket): array
{
    $responseLines = [];

    while (true) {
        $line = fgets($socket, 515);
        if ($line === false) {
            $metadata = stream_get_meta_data($socket);
            if (($metadata['timed_out'] ?? false) === true) {
                throw new RuntimeException('Timed out while waiting for the SMTP server.');
            }

            throw new RuntimeException('The SMTP server closed the connection unexpectedly.');
        }

        $responseLines[] = rtrim($line, "\r\n");

        if (strlen($line) < 4 || $line[3] !== '-') {
            break;
        }
    }

    $firstLine = $responseLines[0] ?? '';
    $statusCode = (int) substr($firstLine, 0, 3);

    return [
        'code' => $statusCode,
        'message' => trim(implode(' ', $responseLines)),
    ];
}

/**
 * @param resource $socket
 */
function smtp_write_line($socket, string $line): void
{
    $bytesWritten = fwrite($socket, $line . "\r\n");
    if ($bytesWritten === false) {
        throw new RuntimeException('Failed to write to the SMTP server.');
    }
}

/**
 * @param resource $socket
 */
function smtp_assert_response($socket, array $expectedCodes, string $context, bool $sensitive = false): string
{
    $response = smtp_read_response($socket);
    if (!in_array($response['code'], $expectedCodes, true)) {
        $contextLabel = $sensitive ? '[redacted]' : $context;
        throw new RuntimeException(sprintf('SMTP command failed (%s): %s', $contextLabel, $response['message']));
    }

    return $response['message'];
}

/**
 * @param resource $socket
 */
function smtp_command($socket, string $command, array $expectedCodes, bool $sensitive = false): string
{
    smtp_write_line($socket, $command);
    return smtp_assert_response($socket, $expectedCodes, $command, $sensitive);
}

/**
 * @param resource $socket
 */
function smtp_enable_starttls($socket): void
{
    $enabled = @stream_socket_enable_crypto($socket, true, STREAM_CRYPTO_METHOD_TLS_CLIENT);
    if ($enabled !== true) {
        throw new RuntimeException('Failed to negotiate TLS with the SMTP server.');
    }
}

function encode_mail_header(string $value): string
{
    return preg_match('/^[\x20-\x7E]+$/', $value) === 1
        ? $value
        : '=?UTF-8?B?' . base64_encode($value) . '?=';
}

function format_email_address(string $email, ?string $name = null): string
{
    $address = trim($email);
    if ($name === null || trim($name) === '') {
        return sprintf('<%s>', $address);
    }

    return sprintf('%s <%s>', encode_mail_header(trim($name)), $address . '>');
}

function normalize_mail_body(string $body): string
{
    return str_replace(["\r\n", "\r"], "\n", $body);
}

function encode_mail_body(string $body): string
{
    return rtrim(chunk_split(base64_encode(normalize_mail_body($body)), 76, "\r\n"));
}

function smtp_build_message(
    string $fromAddress,
    string $fromName,
    string $recipientEmail,
    string $subject,
    string $htmlBody,
    string $textBody
): string {
    $boundary = 'b' . bin2hex(random_bytes(16));

    $headers = [
        'Date: ' . gmdate('D, d M Y H:i:s O'),
        'From: ' . format_email_address($fromAddress, $fromName),
        'To: ' . format_email_address($recipientEmail),
        'Subject: ' . encode_mail_header($subject),
        'MIME-Version: 1.0',
        sprintf('Content-Type: multipart/alternative; boundary="%s"', $boundary),
    ];

    $body = [
        "--{$boundary}",
        'Content-Type: text/plain; charset=UTF-8',
        'Content-Transfer-Encoding: base64',
        '',
        encode_mail_body($textBody),
        '',
        "--{$boundary}",
        'Content-Type: text/html; charset=UTF-8',
        'Content-Transfer-Encoding: base64',
        '',
        encode_mail_body($htmlBody),
        '',
        "--{$boundary}--",
    ];

    return implode("\r\n", [...$headers, '', ...$body]);
}

function smtp_escape_data(string $message): string
{
    $normalized = str_replace(["\r\n", "\r"], "\n", $message);
    $escaped = preg_replace('/^\./m', '..', $normalized);
    $prepared = $escaped ?? $normalized;

    return str_replace("\n", "\r\n", $prepared) . "\r\n.\r\n";
}

function smtp_send_email(
    string $fromAddress,
    string $fromName,
    string $recipientEmail,
    string $subject,
    string $htmlBody,
    string $textBody
): void {
    $security = smtp_security_mode();
    $username = require_env('SMTP_USERNAME');
    $password = require_env('SMTP_PASSWORD');
    $socket = smtp_open_connection();

    try {
        smtp_assert_response($socket, [220], 'connect');
        smtp_command($socket, 'EHLO ' . smtp_client_hostname(), [250]);

        if ($security === 'tls') {
            smtp_command($socket, 'STARTTLS', [220]);
            smtp_enable_starttls($socket);
            smtp_command($socket, 'EHLO ' . smtp_client_hostname(), [250]);
        }

        smtp_command($socket, 'AUTH LOGIN', [334]);
        smtp_command($socket, base64_encode($username), [334], true);
        smtp_command($socket, base64_encode($password), [235], true);
        smtp_command($socket, sprintf('MAIL FROM:<%s>', $fromAddress), [250]);
        smtp_command($socket, sprintf('RCPT TO:<%s>', $recipientEmail), [250, 251]);
        smtp_command($socket, 'DATA', [354]);

        $message = smtp_build_message($fromAddress, $fromName, $recipientEmail, $subject, $htmlBody, $textBody);
        $bytesWritten = fwrite($socket, smtp_escape_data($message));
        if ($bytesWritten === false) {
            throw new RuntimeException('Failed to send the email body to the SMTP server.');
        }

        smtp_assert_response($socket, [250], 'DATA');
        smtp_command($socket, 'QUIT', [221]);
    } finally {
        if (is_resource($socket)) {
            fclose($socket);
        }
    }
}

function send_verification_email(string $recipientEmail, string $code, int $ttlMinutes): void
{
    try {
        smtp_send_email(
            env_value('MAIL_FROM_ADDRESS', require_env('SMTP_USERNAME')),
            env_value('MAIL_FROM_NAME', 'DVC Registration'),
            $recipientEmail,
            'Your DVC registration verification code',
            sprintf(
                '<p>Your verification code is:</p><p style="font-size: 28px; font-weight: 700; letter-spacing: 6px;">%s</p><p>This code will expire in %d minutes.</p><p>If you did not request this, you can ignore this email.</p>',
                htmlspecialchars($code, ENT_QUOTES, 'UTF-8'),
                $ttlMinutes
            ),
            "Your DVC registration verification code is {$code}. It expires in {$ttlMinutes} minutes."
        );
    } catch (Throwable $exception) {
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
