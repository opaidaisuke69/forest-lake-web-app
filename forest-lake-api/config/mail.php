<?php
// SMTP mail configuration for PHPMailer.
// These credentials are used to send OTP and notification emails.

return [
    'host'        => 'mail.quickycloud.com',
    'port'        => 465,
    'username'    => 'forestlake@quickycloud.com',
    'password'    => 'Edrian010902*',
    // 'ssl' for port 465 (implicit TLS), 'tls' for port 587 (STARTTLS).
    'encryption'  => 'ssl',
    'from_email'  => 'forestlake@quickycloud.com',
    'from_name'   => 'Forest Lake Memorial Park',
];
