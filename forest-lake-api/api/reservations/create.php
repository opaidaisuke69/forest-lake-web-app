<?php
require_once '../../config/cors.php';
require_once '../../config/database.php';
require_once '../../config/auth.php';

$db = (new Database())->getConnection();
$user = validateToken($db);
requireRole($user, 'client');

$data = json_decode(file_get_contents("php://input"), true);

if (empty($data['burial_lot_id'])) {
    http_response_code(400);
    echo json_encode(['message' => 'Burial lot ID is required']);
    exit;
}

$slotNumber = isset($data['slot_number']) ? (int)$data['slot_number'] : null;

// Check lot exists and is available
$stmt = $db->prepare("SELECT * FROM burial_lots WHERE id = :id");
$stmt->execute([':id' => $data['burial_lot_id']]);
$lot = $stmt->fetch();

if (!$lot) {
    http_response_code(404);
    echo json_encode(['message' => 'Burial lot not found']);
    exit;
}

if ($lot['status'] === 'occupied') {
    http_response_code(400);
    echo json_encode(['message' => 'This lot is fully occupied']);
    exit;
}

// Check available slots
$maxSlots = (int)($lot['max_slots'] ?? 8);
$stmt = $db->prepare("SELECT COUNT(*) as count FROM reservations WHERE burial_lot_id = :lot_id AND status IN ('pending', 'approved', 'occupied')");
$stmt->execute([':lot_id' => $data['burial_lot_id']]);
$count = (int)$stmt->fetch()['count'];

if ($count >= $maxSlots) {
    http_response_code(400);
    echo json_encode(['message' => 'No available slots for this lot']);
    exit;
}

// Check if user already has pending reservation for this lot
$stmt = $db->prepare("SELECT id FROM reservations WHERE client_id = :client_id AND burial_lot_id = :lot_id AND status IN ('pending', 'approved')");
$stmt->execute([':client_id' => $user['id'], ':lot_id' => $data['burial_lot_id']]);
if ($stmt->fetch()) {
    http_response_code(400);
    echo json_encode(['message' => 'You already have an active reservation for this lot']);
    exit;
}

// Generate unique serial number: FL-LOTNUMBER-YYYY-XXXX
$year = date('Y');
$lotNumber = str_replace([' ', '-'], '', $lot['lot_number']);
$stmt = $db->prepare("SELECT COUNT(*) as count FROM reservations WHERE YEAR(created_at) = :year");
$stmt->execute([':year' => $year]);
$seq = (int)$stmt->fetch()['count'] + 1;
$serialNumber = 'FL-' . strtoupper($lotNumber) . '-' . $year . '-' . str_pad($seq, 4, '0', STR_PAD_LEFT);

$stmt = $db->prepare("INSERT INTO reservations (serial_number, client_id, burial_lot_id, slot_number, reservation_date, status, created_at, updated_at) VALUES (:serial, :client_id, :lot_id, :slot_number, NOW(), 'pending', NOW(), NOW())");
$stmt->execute([':serial' => $serialNumber, ':client_id' => $user['id'], ':lot_id' => $data['burial_lot_id'], ':slot_number' => $slotNumber]);

echo json_encode(['message' => 'Reservation request submitted', 'serial_number' => $serialNumber]);
