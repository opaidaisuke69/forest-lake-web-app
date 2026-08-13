<?php
require_once '../../config/cors.php';
require_once '../../config/database.php';

$db = (new Database())->getConnection();

$query = $_GET['q'] ?? '';

if (strlen($query) < 2) {
    echo json_encode(['lots' => [], 'deceased' => []]);
    exit;
}

// Search lots by lot_number, section, block
$stmt = $db->prepare("
    SELECT id, lot_number, section, block, latitude, longitude, status
    FROM burial_lots
    WHERE lot_number LIKE :query OR section LIKE :query2 OR block LIKE :query3
    ORDER BY lot_number ASC
    LIMIT 5
");
$stmt->execute([':query' => '%' . $query . '%', ':query2' => '%' . $query . '%', ':query3' => '%' . $query . '%']);
$lots = $stmt->fetchAll();

// Search deceased by name
$stmt = $db->prepare("
    SELECT d.id, d.name, d.date_of_death, d.image,
           bl.id as lot_id, bl.lot_number, bl.section, bl.block, bl.latitude, bl.longitude
    FROM deceased_info d
    INNER JOIN burial_lots bl ON d.burial_lot_id = bl.id
    WHERE d.name LIKE :query AND d.status = 'approved'
    ORDER BY d.name ASC
    LIMIT 5
");
$stmt->execute([':query' => '%' . $query . '%']);
$deceased = $stmt->fetchAll();

echo json_encode(['lots' => $lots, 'deceased' => $deceased]);
