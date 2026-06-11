<?php
declare(strict_types=1);

require_once __DIR__ . '/bootstrap.php';

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    error_response('Method not allowed.', 405);
}

$input = json_input();
$registrationDraftId = trim((string) ($input['registrationDraftId'] ?? ''));
$mediaKind = trim((string) ($input['mediaKind'] ?? ''));
$fileName = trim((string) ($input['fileName'] ?? ''));
$contentType = trim((string) ($input['contentType'] ?? ''));
$contentBase64 = preg_replace('/\s+/', '', (string) ($input['contentBase64'] ?? '')) ?? '';
$processingStatus = trim((string) ($input['processingStatus'] ?? 'ready'));
$processingError = isset($input['processingError']) ? trim((string) $input['processingError']) : null;

if (!preg_match('/^[0-9a-fA-F-]{36}$/', $registrationDraftId)) {
    error_response('Invalid registration draft id.', 422);
}

if (!in_array($mediaKind, ['profile_photo', 'signature'], true)) {
    error_response('Invalid media type.', 422);
}

if ($fileName === '') {
    error_response('File name is required.', 422);
}

if ($contentType === '' || !str_starts_with($contentType, 'image/')) {
    error_response('Only image uploads are supported.', 422);
}

if ($contentBase64 === '' || base64_decode($contentBase64, true) === false) {
    error_response('Invalid image content.', 422);
}

if (!in_array($processingStatus, ['processing', 'ready', 'error'], true)) {
    $processingStatus = 'ready';
}

$args = [
    'p_registration_draft_id' => $registrationDraftId,
    'p_media_kind' => $mediaKind,
    'p_file_name' => $fileName,
    'p_content_type' => $contentType,
    'p_content_base64' => $contentBase64,
    'p_processing_status' => $processingStatus,
    'p_processing_error' => $processingError !== '' ? $processingError : null,
];

$response = supabase_rpc('upsert_registration_media_asset', $args);

if ($response['status'] >= 300) {
    $body = is_array($response['body']) ? $response['body'] : [];
    $message = (string) ($body['message'] ?? '');
    $missingNewSignature = str_contains(strtolower($message), 'could not find the function')
        || str_contains(strtolower($message), 'function public.upsert_registration_media_asset')
        || str_contains(strtolower($message), 'no function matches');

    if ($missingNewSignature) {
        $response = supabase_rpc('upsert_registration_media_asset', array_slice($args, 0, 5, true));
    }
}

if ($response['status'] < 200 || $response['status'] >= 300 || !is_array($response['body'])) {
    $message = is_array($response['body'])
        ? (string) ($response['body']['message'] ?? 'Could not upload the file.')
        : 'Could not upload the file.';
    error_response($message, 500);
}

json_response([
    'ok' => true,
    'asset' => $response['body'],
]);
