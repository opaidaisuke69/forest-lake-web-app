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

$stmt = $db->prepare("UPDATE deceased_info SET name = :name, gender = :gender, date_of_birth = :date_of_birth, date_of_death = :date_of_death, relationship_to_client = :relationship, burial_date = :burial_date, status = :status, updated_at = NOW() WHERE id = :id");
$stmt->execute([
    ':name' => $data['name'] ?? '',
    ':gender' => $data['gender'] ?? null,
    ':date_of_birth' => $data['date_of_birth'] ?: null,
    ':date_of_death' => $data['date_of_death'] ?: null,
    ':relationship' => $data['relationship_to_client'] ?? '',
    ':burial_date' => $data['burial_date'] ?: null,
    ':status' => $status,
    ':id' => $data['id'],
]);

echo json_encode(['message' => 'Deceased information updated']);
