<?php
require_once '../../config/cors.php';
require_once '../../config/database.php';
require_once '../../config/auth.php';

$db = (new Database())->getConnection();
$user = validateToken($db);

$deceasedId = $_POST['deceased_id'] ?? null;

if (!$deceasedId) {
    http_response_code(400);
    echo json_encode(['message' => 'Deceased ID is required']);
    exit;
}

// Verify access
if ($user['role'] === 'client') {
    $stmt = $db->prepare("SELECT d.id FROM deceased_info d INNER JOIN reservations r ON r.burial_lot_id = d.burial_lot_id WHERE d.id = :id AND r.client_id = :client_id AND r.status IN ('approved', 'occupied')");
    $stmt->execute([':id' => $deceasedId, ':client_id' => $user['id']]);
    if (!$stmt->fetch()) {
        http_response_code(403);
        echo json_encode(['message' => 'You do not have access to this record']);
        exit;
    }
}

if (!isset($_FILES['image']) || $_FILES['image']['error'] !== UPLOAD_ERR_OK) {
    http_response_code(400);
    echo json_encode(['message' => 'Image file is required']);
    exit;
}

$file = $_FILES['image'];
$allowed = ['image/jpeg', 'image/png', 'image/webp'];

if (!in_array($file['type'], $allowed)) {
    http_response_code(400);
    echo json_encode(['message' => 'Only JPG, PNG, or WEBP images are allowed']);
    exit;
}

if ($file['size'] > 5 * 1024 * 1024) {
    http_response_code(400);
    echo json_encode(['message' => 'Image must be less than 5MB']);
    exit;
}

$uploadDir = '../../uploads/deceased/';
if (!is_dir($uploadDir)) {
    mkdir($uploadDir, 0755, true);
}

$ext = pathinfo($file['name'], PATHINFO_EXTENSION);
$filename = 'deceased_' . $deceasedId . '_' . time() . '.' . $ext;
$filepath = $uploadDir . $filename;

if (!move_uploaded_file($file['tmp_name'], $filepath)) {
    http_response_code(500);
    echo json_encode(['message' => 'Failed to upload image']);
    exit;
}

$imagePath = '/uploads/deceased/' . $filename;

// Delete old image if exists
$stmt = $db->prepare("SELECT image FROM deceased_info WHERE id = :id");
$stmt->execute([':id' => $deceasedId]);
$old = $stmt->fetch();
if ($old && $old['image']) {
    $oldFile = '../../' . ltrim($old['image'], '/');
    if (file_exists($oldFile)) unlink($oldFile);
}

$stmt = $db->prepare("UPDATE deceased_info SET image = :image, updated_at = NOW() WHERE id = :id");
$stmt->execute([':image' => $imagePath, ':id' => $deceasedId]);

echo json_encode(['message' => 'Image uploaded', 'image_path' => $imagePath]);
