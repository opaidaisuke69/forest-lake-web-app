<?php
require_once '../../config/cors.php';
require_once '../../config/database.php';

$db = (new Database())->getConnection();

$query = $_GET['q'] ?? '';

if (strlen($query) < 2) {
    echo json_encode(['data' => []]);
    exit;
}

// Search deceased by name, also return lot info for directions
$stmt = $db->prepare("
    SELECT d.id, d.name, d.date_of_death, d.image, d.gender,
           bl.id as lot_id, bl.lot_number, bl.section, bl.block, bl.latitude, bl.longitude
    FROM deceased_info d
    INNER JOIN burial_lots bl ON d.burial_lot_id = bl.id
    WHERE d.name LIKE :query AND d.status = 'approved'
    ORDER BY d.name ASC
    LIMIT 10
");
$stmt->execute([':query' => '%' . $query . '%']);
$results = $stmt->fetchAll();

echo json_encode(['data' => $results]);
