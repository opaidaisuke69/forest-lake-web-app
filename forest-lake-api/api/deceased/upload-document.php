<?php
require_once '../../config/cors.php';
require_once '../../config/database.php';
require_once '../../config/auth.php';

$db = (new Database())->getConnection();
$user = validateToken($db);

$deceasedId = $_POST['deceased_id'] ?? null;
$docType = $_POST['doc_type'] ?? null; // 'birth_certificate' | 'death_certificate'

$allowedTypes = ['birth_certificate', 'death_certificate'];

if (!$deceasedId || !in_array($docType, $allowedTypes, true)) {
    http_response_code(400);
    echo json_encode(['message' => 'Deceased ID and a valid document type are required']);
    exit;
}

// Verify access: client must own the reservation for this record.
if ($user['role'] === 'client') {
    $stmt = $db->prepare("SELECT d.id FROM deceased_info d INNER JOIN reservations r ON r.burial_lot_id = d.burial_lot_id WHERE d.id = :id AND r.client_id = :client_id AND r.status IN ('approved', 'occupied')");
    $stmt->execute([':id' => $deceasedId, ':client_id' => $user['id']]);
    if (!$stmt->fetch()) {
        http_response_code(403);
        echo json_encode(['message' => 'You do not have access to this record']);
        exit;
    }
}

if (!isset($_FILES['document']) || $_FILES['document']['error'] !== UPLOAD_ERR_OK) {
    http_response_code(400);
    echo json_encode(['message' => 'Document file is required']);
    exit;
}

$file = $_FILES['document'];
$allowed = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];

if (!in_array($file['type'], $allowed, true)) {
    http_response_code(400);
    echo json_encode(['message' => 'Only JPG, PNG, WEBP, or PDF files are allowed']);
    exit;
}

if ($file['size'] > 10 * 1024 * 1024) {
    http_response_code(400);
    echo json_encode(['message' => 'Document must be less than 10MB']);
    exit;
}

$uploadDir = '../../uploads/documents/';
if (!is_dir($uploadDir)) {
    mkdir($uploadDir, 0755, true);
}

$ext = pathinfo($file['name'], PATHINFO_EXTENSION);
$filename = $docType . '_' . $deceasedId . '_' . time() . '.' . $ext;
$filepath = $uploadDir . $filename;

if (!move_uploaded_file($file['tmp_name'], $filepath)) {
    http_response_code(500);
    echo json_encode(['message' => 'Failed to upload document']);
    exit;
}

$docPath = '/uploads/documents/' . $filename;

// Delete old document if present.
$stmt = $db->prepare("SELECT {$docType} AS doc FROM deceased_info WHERE id = :id");
$stmt->execute([':id' => $deceasedId]);
$old = $stmt->fetch();
if ($old && $old['doc']) {
    $oldFile = '../../' . ltrim($old['doc'], '/');
    if (file_exists($oldFile)) unlink($oldFile);
}

// $docType is validated against a whitelist above, safe to interpolate.
$stmt = $db->prepare("UPDATE deceased_info SET {$docType} = :path, updated_at = NOW() WHERE id = :id");
$stmt->execute([':path' => $docPath, ':id' => $deceasedId]);

echo json_encode(['message' => 'Document uploaded', 'path' => $docPath]);
