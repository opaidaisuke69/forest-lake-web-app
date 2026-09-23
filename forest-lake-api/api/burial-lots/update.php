<?php
require_once '../../config/cors.php';
require_once '../../config/database.php';
require_once '../../config/auth.php';

$db = (new Database())->getConnection();
$user = validateToken($db);
requireRole($user, 'admin');

$data = json_decode(file_get_contents("php://input"), true);

if (empty($data['id'])) {
    http_response_code(400);
    echo json_encode(['message' => 'Lot ID is required']);
    exit;
}

try {
    $stmt = $db->prepare("UPDATE burial_lots SET lot_number = :lot_number, section = :section, block = :block, square_meter = :square_meter, lot_type = :lot_type, price = :price, latitude = :latitude, longitude = :longitude, status = :status, description = :description, updated_at = NOW() WHERE id = :id");
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
        ':id' => $data['id'],
    ]);

    echo json_encode(['message' => 'Burial lot updated']);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['message' => 'Database error: ' . $e->getMessage()]);
}
