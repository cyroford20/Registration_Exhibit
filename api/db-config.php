<?php
// Database configuration
declare(strict_types=1);

// MySQL database credentials
define('DB_HOST', 'localhost');
define('DB_USER', 'root');
define('DB_PASSWORD', '');
define('DB_NAME', 'cyber_spin_wheel');
define('DB_PORT', 3306);

// Create connection
function getDBConnection()
{
    $conn = new mysqli(DB_HOST, DB_USER, DB_PASSWORD, DB_NAME, DB_PORT);

    // Check connection
    if ($conn->connect_error) {
        throw new RuntimeException('Database connection failed: ' . $conn->connect_error);
    }

    // Set charset
    $conn->set_charset("utf8mb4");
    return $conn;
}

// Close connection safely
function closeDBConnection($conn)
{
    if ($conn instanceof mysqli) {
        $conn->close();
    }
}
