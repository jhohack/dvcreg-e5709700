<?php
declare(strict_types=1);

require_once __DIR__ . '/bootstrap.php';

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    error_response('Method not allowed.', 405);
}

$input = json_input();
$payload = [
    'first_name' => $input['firstName'] ?? '',
    'middle_name' => $input['middleName'] ?? '',
    'last_name' => $input['lastName'] ?? '',
    'date_of_birth' => $input['dateOfBirth'] ?? '',
];

json_response([
    'ok' => true,
    'exists' => admission_full_name_exists($payload),
]);
