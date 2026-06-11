<?php
declare(strict_types=1);

require_once __DIR__ . '/bootstrap.php';

if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') {
    http_response_code(204);
    exit;
}

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    error_response('Method not allowed.', 405);
}

if (!extension_loaded('gd')) {
    error_response('PHP GD extension is required on the server.', 500);
}

function cleanup_temp_files(string ...$paths): void
{
    foreach ($paths as $path) {
        if ($path !== '' && is_file($path)) {
            @unlink($path);
        }
    }
}

function normalize_content_type(?string $value): string
{
    $contentType = strtolower(trim((string) $value));
    if ($contentType === '') {
        return '';
    }

    $semicolonPosition = strpos($contentType, ';');
    if ($semicolonPosition !== false) {
        $contentType = substr($contentType, 0, $semicolonPosition);
    }

    return trim($contentType);
}

function run_rembg_command(string $inputPath, string $outputPath): void
{
    if (!function_exists('exec')) {
        throw new RuntimeException('PHP exec() is disabled on the server. Enable it to run rembg.');
    }

    $command = trim((string) env_value('REMBG_COMMAND', 'rembg'));
    if ($command === '') {
        throw new RuntimeException('Missing REMBG_COMMAND server configuration.');
    }

    $model = trim((string) env_value('REMBG_MODEL', 'isnet-general-use'));
    if ($model === '') {
        $model = 'isnet-general-use';
    }

    $shellCommand = sprintf(
        '%s i -m %s %s %s 2>&1',
        $command,
        escapeshellarg($model),
        escapeshellarg($inputPath),
        escapeshellarg($outputPath)
    );

    $output = [];
    $exitCode = 0;
    exec($shellCommand, $output, $exitCode);

    if ($exitCode !== 0 || !is_file($outputPath)) {
        $details = trim(implode("\n", array_filter($output, static fn ($line) => is_string($line) && trim($line) !== '')));
        throw new RuntimeException(
            $details !== ''
                ? $details
                : 'rembg is not installed on the server. Install it and set REMBG_COMMAND if needed.',
        );
    }
}

function flatten_png_to_jpeg(string $pngPath): string
{
    $source = @imagecreatefromstring((string) file_get_contents($pngPath));
    if ($source === false) {
        throw new RuntimeException('Could not process the cleaned photo.');
    }

    $width = imagesx($source);
    $height = imagesy($source);

    $canvas = imagecreatetruecolor($width, $height);
    if ($canvas === false) {
        imagedestroy($source);
        throw new RuntimeException('Could not prepare the cleaned photo.');
    }

    $white = imagecolorallocate($canvas, 255, 255, 255);
    imagefill($canvas, 0, 0, $white);
    imagealphablending($canvas, true);
    imagesavealpha($canvas, false);
    imagecopy($canvas, $source, 0, 0, 0, 0, $width, $height);

    $jpegPath = $pngPath . '.jpg';
    $saved = imagejpeg($canvas, $jpegPath, 90);

    imagedestroy($source);
    imagedestroy($canvas);

    if ($saved !== true || !is_file($jpegPath)) {
        cleanup_temp_files($jpegPath);
        throw new RuntimeException('Could not render the cleaned photo.');
    }

    $jpegBytes = file_get_contents($jpegPath);
    cleanup_temp_files($jpegPath);

    if ($jpegBytes === false || $jpegBytes === '') {
        throw new RuntimeException('Could not render the cleaned photo.');
    }

    return $jpegBytes;
}

$contentType = normalize_content_type($_SERVER['CONTENT_TYPE'] ?? $_SERVER['HTTP_CONTENT_TYPE'] ?? null);
if ($contentType === '' || (!str_starts_with($contentType, 'image/') && $contentType !== 'application/octet-stream')) {
    error_response('Please upload an image file.', 422);
}

$sourceBytes = file_get_contents('php://input');
if ($sourceBytes === false || $sourceBytes === '') {
    error_response('Please upload an image file.', 422);
}

$inputPath = tempnam(sys_get_temp_dir(), 'rembg-in-');
if ($inputPath === false) {
    error_response('Unable to prepare the photo background cleanup.', 500);
}

$pngOutputPath = $inputPath . '.png';
$jpegBytes = null;
$errorMessage = null;

try {
    $writtenBytes = file_put_contents($inputPath, $sourceBytes);
    if ($writtenBytes === false || $writtenBytes === 0) {
        throw new RuntimeException('Unable to prepare the photo background cleanup.');
    }

    run_rembg_command($inputPath, $pngOutputPath);
    $jpegBytes = flatten_png_to_jpeg($pngOutputPath);
} catch (Throwable $throwable) {
    $errorMessage = $throwable->getMessage() !== ''
        ? $throwable->getMessage()
        : 'Could not remove the photo background.';
} finally {
    cleanup_temp_files($inputPath, $pngOutputPath, $pngOutputPath . '.jpg');
}

if ($errorMessage !== null) {
    error_response($errorMessage, 500);
}

while (ob_get_level() > 0) {
    ob_end_clean();
}

header('Content-Type: image/jpeg');
header('Cache-Control: no-store');
header('Content-Length: ' . strlen((string) $jpegBytes));

echo $jpegBytes;
