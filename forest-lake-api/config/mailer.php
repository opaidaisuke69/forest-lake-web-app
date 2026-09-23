<?php
// Reusable email sender built on PHPMailer.

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

require_once __DIR__ . '/../vendor/autoload.php';

/**
 * Send an HTML email via SMTP.
 *
 * @param string $toEmail   Recipient email address.
 * @param string $subject   Email subject.
 * @param string $htmlBody  HTML body of the message.
 * @param string $altBody   Optional plain-text fallback.
 * @return array{success:bool, error:?string}
 */
function sendMail($toEmail, $subject, $htmlBody, $altBody = '') {
    $config = require __DIR__ . '/mail.php';

    $mail = new PHPMailer(true);
    try {
        $mail->isSMTP();
        $mail->Host       = $config['host'];
        $mail->SMTPAuth   = true;
        $mail->Username   = $config['username'];
        $mail->Password   = $config['password'];
        $mail->Port       = (int) $config['port'];

        if ($config['encryption'] === 'ssl') {
            $mail->SMTPSecure = PHPMailer::ENCRYPTION_SMTPS;
        } else {
            $mail->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;
        }

        $mail->CharSet = 'UTF-8';
        $mail->setFrom($config['from_email'], $config['from_name']);
        $mail->addAddress($toEmail);

        $mail->isHTML(true);
        $mail->Subject = $subject;
        $mail->Body    = $htmlBody;
        $mail->AltBody = $altBody !== '' ? $altBody : strip_tags($htmlBody);

        $mail->send();
        return ['success' => true, 'error' => null];
    } catch (Exception $e) {
        return ['success' => false, 'error' => $mail->ErrorInfo ?: $e->getMessage()];
    }
}

/**
 * Build a branded OTP email body.
 */
function buildOtpEmail($otp, $purpose = 'verification') {
    $title = $purpose === 'reset' ? 'Password Reset Code' : 'Email Verification Code';
    $intro = $purpose === 'reset'
        ? 'Use the code below to reset your password. It expires in 15 minutes.'
        : 'Use the code below to verify your email address. It expires in 15 minutes.';

    return '
    <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px; background: #f7f9f7; border-radius: 12px;">
        <h2 style="color: #1f5130; margin: 0 0 8px;">Forest Lake Memorial Park</h2>
        <p style="color: #555; font-size: 15px; margin: 0 0 20px;">' . htmlspecialchars($title) . '</p>
        <p style="color: #444; font-size: 14px;">' . htmlspecialchars($intro) . '</p>
        <div style="background: #fff; border: 1px solid #e2e8e2; border-radius: 10px; text-align: center; padding: 20px; margin: 20px 0;">
            <span style="font-size: 34px; letter-spacing: 10px; font-weight: bold; color: #1f5130;">' . htmlspecialchars($otp) . '</span>
        </div>
        <p style="color: #888; font-size: 12px;">If you did not request this, you can safely ignore this email.</p>
    </div>';
}
