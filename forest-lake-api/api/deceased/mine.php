<?php
require_once '../../config/cors.php';
require_once '../../config/database.php';
require_once '../../config/auth.php';

$db = (new Database())->getConnection();
$user = validateToken($db);

// Returns deceased records that belong to the authenticated client's own
// reservations only. Admins get all records.
if ($user['role'] === 'admin') {
    $stmt = $db->prepare("SELECT d.*, bl.lot_number, bl.section FROM deceased_info d INNER JOIN burial_lots bl ON d.burial_lot_id = bl.id ORDER BY d.created_at DESC");
    $stmt->execute();
} else {
    $stmt = $db->prepare(
        "SELECT d.*, bl.lot_number, bl.section
         FROM deceased_info d
         INNER JOIN burial_lots bl ON d.burial_lot_id = bl.id
         INNER JOIN reservations r ON d.reservation_id = r.id
         WHERE r.client_id = :client_id
         ORDER BY d.created_at DESC"
    );
    $stmt->execute([':client_id' => $user['id']]);
}

echo json_encode(['data' => $stmt->fetchAll()]);
