<?php
require_once '../../config/cors.php';
require_once '../../config/database.php';
require_once '../../config/auth.php';

$db = (new Database())->getConnection();
$user = validateToken($db);

// Only admin can update/manage deceased records
if ($user['role'] !== 'admin') {
    http_response_code(403);
    echo json_encode(['message' => 'Only administrators can manage deceased records']);
    exit;
}

$data = json_decode(file_get_contents("php://input"), true);

if (empty($data['id'])) {
    http_response_code(400);
    echo json_encode(['message' => 'Deceased record ID is required']);
    exit;
}

$status = $data['status'] ?? 'approved';

// Load the existing record so we can validate the linked reservation/slot.
$stmt = $db->prepare("SELECT d.*, r.status AS reservation_status, bl.status AS lot_status FROM deceased_info d LEFT JOIN reservations r ON d.reservation_id = r.id LEFT JOIN burial_lots bl ON d.burial_lot_id = bl.id WHERE d.id = :id");
$stmt->execute([':id' => $data['id']]);
$record = $stmt->fetch();

if (!$record) {
    http_response_code(404);
    echo json_encode(['message' => 'Deceased record not found']);
    exit;
}

// A deceased record can only be ACCEPTED (approved) when its slot is occupied.
// Rejection is always allowed so admins can reject non-compliant submissions.
if ($status === 'approved') {
    $slotOccupied = ($record['reservation_status'] === 'occupied') || ($record['lot_status'] === 'occupied');
    if (!$slotOccupied) {
        http_response_code(400);
        echo json_encode(['message' => 'Cannot accept deceased information: the slot is not occupied yet. Mark the reservation as occupied first.']);
        exit;
    }
}

// A rejection must include a reason/remarks so it appears in the client's history.
if ($status === 'rejected' && trim((string)($data['admin_remarks'] ?? '')) === '') {
    http_response_code(400);
    echo json_encode(['message' => 'Please provide a reason when rejecting a deceased record']);
    exit;
}

$stmt = $db->prepare("UPDATE deceased_info SET name = :name, gender = :gender, date_of_birth = :date_of_birth, date_of_death = :date_of_death, relationship_to_client = :relationship, burial_date = :burial_date, status = :status, admin_remarks = :admin_remarks, updated_at = NOW() WHERE id = :id");
$stmt->execute([
    ':name' => $data['name'] ?? '',
    ':gender' => $data['gender'] ?? null,
    ':date_of_birth' => $data['date_of_birth'] ?: null,
    ':date_of_death' => $data['date_of_death'] ?: null,
    ':relationship' => $data['relationship_to_client'] ?? '',
    ':burial_date' => $data['burial_date'] ?: null,
    ':status' => $status,
    ':admin_remarks' => $data['admin_remarks'] ?? null,
    ':id' => $data['id'],
]);

echo json_encode(['message' => 'Deceased information updated']);
