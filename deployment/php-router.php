<?php

$documentRoot = __DIR__;
$requestPath = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/';
$resolvedPath = realpath($documentRoot . $requestPath);

if ($resolvedPath !== false && str_starts_with($resolvedPath, $documentRoot) && is_file($resolvedPath)) {
    return false;
}

require $documentRoot . '/index.html';
