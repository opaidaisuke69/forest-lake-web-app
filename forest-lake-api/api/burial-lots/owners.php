<?php
require_once '../../config/cors.php';
require_once '../../config/database.php';

$db = (new Database())->getConnection();

$lotId = $_GET['lot_id'] ?? null;

if (!$lotId) {
    http_response_code(400);
    echo json_encode(['message' => 'Lot ID is required']);
    exit;
}

// Soft auth: resolve the current user WITHOUT hard-failing for anonymous
// visitors. The map is public, but reservation ownership (who reserved a lot,
// their contact number and serial) is private and only exposed to admins or
// to the reserving client themselves.
function resolveCurrentUser($db) {
    $headers = function_exists('getallheaders') ? getallheaders() : [];
    $authHeader = $headers['Authorization'] ?? $headers['authorization'] ?? '';
    if (!preg_match('/Bearer\s+(.+)/', $authHeader, $m)) return null;
    $stmt = $db->prepare("SELECT u.* FROM users u INNER JOIN user_tokens ut ON u.id = ut.user_id WHERE ut.token = :token AND ut.expires_at > NOW()");
    $stmt->execute([':token' => $m[1]]);
    return $stmt->fetch() ?: null;
}

$currentUser = resolveCurrentUser($db);
$isAdmin = $currentUser && $currentUser['role'] === 'admin';

// Get owners (clients with approved/occupied reservations for this lot)
$stmt = $db->prepare("
    SELECT r.id as reservation_id, r.client_id, r.serial_number, r.status as reservation_status,
           cp.first_name, cp.last_name, cp.contact_number
    FROM reservations r
    INNER JOIN client_profiles cp ON r.client_id = cp.user_id
    WHERE r.burial_lot_id = :lot_id AND r.status IN ('approved', 'occupied')
    ORDER BY r.created_at ASC
");
$stmt->execute([':lot_id' => $lotId]);
$owners = $stmt->fetchAll();

// Get deceased info per reservation, and enforce reservation privacy.
foreach ($owners as &$owner) {
    $stmt2 = $db->prepare("SELECT * FROM deceased_info WHERE reservation_id = :reservation_id ORDER BY created_at ASC");
    $stmt2->execute([':reservation_id' => $owner['reservation_id']]);
    $owner['deceased'] = $stmt2->fetchAll();

    // The reserving client may see their own details; admins see everyone's.
    $ownsThis = $currentUser && (int)$currentUser['id'] === (int)$owner['client_id'];
    if (!$isAdmin && !$ownsThis) {
        // Mask the private reservation/owner identity for other viewers.
        $owner['first_name'] = 'Reserved';
        $owner['last_name'] = '';
        $owner['contact_number'] = null;
        $owner['serial_number'] = null;
        $owner['is_private'] = true;
    }
    unset($owner['client_id']);
}
unset($owner);

echo json_encode(['data' => $owners]);
