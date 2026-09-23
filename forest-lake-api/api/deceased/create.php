<?php
require_once '../../config/cors.php';
require_once '../../config/database.php';
require_once '../../config/auth.php';

$db = (new Database())->getConnection();
$user = validateToken($db);

$data = json_decode(file_get_contents("php://input"), true);

if (empty($data['burial_lot_id']) || empty($data['name'])) {
    http_response_code(400);
    echo json_encode(['message' => 'Burial lot ID and name are required']);
    exit;
}

// If client, verify they own an OCCUPIED reservation for this lot.
// Deceased information can only be submitted once the slot is occupied.
if ($user['role'] === 'client') {
    $stmt = $db->prepare("SELECT id, status FROM reservations WHERE client_id = :client_id AND burial_lot_id = :lot_id AND status IN ('approved', 'occupied') ORDER BY FIELD(status,'occupied','approved') LIMIT 1");
    $stmt->execute([':client_id' => $user['id'], ':lot_id' => $data['burial_lot_id']]);
    $ownedReservation = $stmt->fetch();

    if (!$ownedReservation) {
        http_response_code(403);
        echo json_encode(['message' => 'You do not have access to this lot']);
        exit;
    }

    if ($ownedReservation['status'] !== 'occupied') {
        http_response_code(400);
        echo json_encode(['message' => 'Deceased information cannot be submitted until the slot is marked as occupied']);
        exit;
    }
}

// Check max slots for this lot
$stmt = $db->prepare("SELECT max_slots FROM burial_lots WHERE id = :lot_id");
$stmt->execute([':lot_id' => $data['burial_lot_id']]);
$lot = $stmt->fetch();
$maxSlots = $lot ? (int)$lot['max_slots'] : 8;

// Check per-reservation limit (1 deceased per reservation)
if (!empty($data['reservation_id'])) {
    $stmt = $db->prepare("SELECT COUNT(*) as count FROM deceased_info WHERE reservation_id = :reservation_id");
    $stmt->execute([':reservation_id' => $data['reservation_id']]);
    if ((int)$stmt->fetch()['count'] >= 1) {
        http_response_code(400);
        echo json_encode(['message' => 'You already have a deceased record for this reservation']);
        exit;
    }
}

// Check total lot capacity
$stmt = $db->prepare("SELECT COUNT(*) as count FROM deceased_info WHERE burial_lot_id = :lot_id");
$stmt->execute([':lot_id' => $data['burial_lot_id']]);
$count = $stmt->fetch()['count'];

if ($count >= $maxSlots) {
    http_response_code(400);
    echo json_encode(['message' => "Maximum of $maxSlots deceased records per lot has been reached"]);
    exit;
}

$stmt = $db->prepare("INSERT INTO deceased_info (burial_lot_id, reservation_id, name, gender, date_of_birth, date_of_death, relationship_to_client, burial_date, status) VALUES (:burial_lot_id, :reservation_id, :name, :gender, :date_of_birth, :date_of_death, :relationship, :burial_date, :status)");
$stmt->execute([
    ':burial_lot_id' => $data['burial_lot_id'],
    ':reservation_id' => $data['reservation_id'] ?? null,
    ':name' => $data['name'],
    ':gender' => $data['gender'] ?? null,
    ':date_of_birth' => $data['date_of_birth'] ?: null,
    ':date_of_death' => $data['date_of_death'] ?: null,
    ':relationship' => $data['relationship_to_client'] ?? '',
    ':burial_date' => $data['burial_date'] ?: null,
    ':status' => $user['role'] === 'admin' ? 'approved' : 'pending',
]);

echo json_encode(['message' => $user['role'] === 'admin' ? 'Deceased information added' : 'Deceased information submitted for review', 'id' => $db->lastInsertId()]);
