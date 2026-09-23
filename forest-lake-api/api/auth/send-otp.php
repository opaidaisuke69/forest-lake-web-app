<?php
require_once '../../config/cors.php';
require_once '../../config/database.php';
require_once '../../config/mailer.php';

$db = (new Database())->getConnection();
$data = json_decode(file_get_contents("php://input"), true);

if (empty($data['email'])) {
    http_response_code(400);
    echo json_encode(['message' => 'Email is required']);
    exit;
}

$email = trim($data['email']);
$type = ($data['type'] ?? 'verification') === 'reset' ? 'reset' : 'verification';

if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    http_response_code(400);
    echo json_encode(['message' => 'Invalid email address']);
    exit;
}

// Generate the OTP server-side so it is never exposed to the client.
$otp = str_pad((string) random_int(0, 999999), 6, '0', STR_PAD_LEFT);

// Replace any previous OTPs of this type for the email, then store the new one.
$stmt = $db->prepare("DELETE FROM otp_codes WHERE email = :email AND type = :type");
$stmt->execute([':email' => $email, ':type' => $type]);

$stmt = $db->prepare("INSERT INTO otp_codes (email, otp, type, expires_at) VALUES (:email, :otp, :type, DATE_ADD(NOW(), INTERVAL 15 MINUTE))");
$stmt->execute([':email' => $email, ':otp' => $otp, ':type' => $type]);

$subject = $type === 'reset'
    ? 'Your Forest Lake password reset code'
    : 'Your Forest Lake verification code';

$result = sendMail($email, $subject, buildOtpEmail($otp, $type));

if (!$result['success']) {
    http_response_code(500);
    echo json_encode(['message' => 'Failed to send email', 'error' => $result['error']]);
    exit;
}

echo json_encode(['message' => 'OTP sent to your email']);
