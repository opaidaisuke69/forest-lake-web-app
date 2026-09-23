<?php
require_once '../../config/cors.php';
require_once '../../config/database.php';
require_once '../../config/auth.php';

$db = (new Database())->getConnection();
$user = validateToken($db);
requireRole($user, 'admin');

$data = json_decode(file_get_contents("php://input"), true);

$required = ['lot_number', 'section', 'block'];
foreach ($required as $field) {
    if (empty($data[$field])) {
        http_response_code(400);
        echo json_encode(['message' => "Field '{$field}' is required"]);
        exit;
    }
}

// Check duplicate lot number
$stmt = $db->prepare("SELECT id FROM burial_lots WHERE lot_number = :lot_number");
$stmt->execute([':lot_number' => $data['lot_number']]);
if ($stmt->fetch()) {
    http_response_code(409);
    echo json_encode(['message' => 'Lot number already exists']);
    exit;
}

try {
    $stmt = $db->prepare("INSERT INTO burial_lots (lot_number, section, block, square_meter, lot_type, price, latitude, longitude, status, description, created_at, updated_at) VALUES (:lot_number, :section, :block, :square_meter, :lot_type, :price, :latitude, :longitude, :status, :description, NOW(), NOW())");
    $stmt->execute([
        ':lot_number' => $data['lot_number'],
        ':section' => $data['section'],
        ':block' => $data['block'],
        ':square_meter' => $data['square_meter'] ?? null,
        ':lot_type' => $data['lot_type'] ?? 'lawn',
        ':price' => (isset($data['price']) && $data['price'] !== '') ? $data['price'] : null,
        ':latitude' => $data['latitude'] ?? null,
        ':longitude' => $data['longitude'] ?? null,
        ':status' => $data['status'] ?? 'available',
        ':description' => $data['description'] ?? '',
    ]);

    echo json_encode(['message' => 'Burial lot created', 'id' => $db->lastInsertId()]);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['message' => 'Database error: ' . $e->getMessage()]);
}
