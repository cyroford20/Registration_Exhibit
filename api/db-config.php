<?php
// Database configuration
declare(strict_types=1);

function envFirst(array $keys, string $default = ''): string
{
    foreach ($keys as $key) {
        $value = getenv($key);
        if ($value !== false) {
            $normalized = trim((string)$value);
            if ($normalized !== '') {
                return $normalized;
            }
        }
    }

    return $default;
}

function parseMysqlUrl(string $url): array
{
    $parts = parse_url($url);
    if ($parts === false) {
        return [];
    }

    return [
        'host' => isset($parts['host']) ? (string)$parts['host'] : '',
        'port' => isset($parts['port']) ? (string)$parts['port'] : '3306',
        'user' => isset($parts['user']) ? rawurldecode((string)$parts['user']) : '',
        'pass' => isset($parts['pass']) ? rawurldecode((string)$parts['pass']) : '',
        'name' => isset($parts['path']) ? ltrim((string)$parts['path'], '/') : '',
    ];
}

// Support either DATABASE_URL/MYSQL_URL or individual env vars.
$dbUrl = envFirst(['DATABASE_URL', 'MYSQL_URL', 'JAWSDB_URL', 'CLEARDB_DATABASE_URL'], '');
$urlCfg = $dbUrl !== '' ? parseMysqlUrl($dbUrl) : [];

define('DB_HOST', envFirst(['DB_HOST', 'MYSQL_HOST', 'MYSQLHOST', 'DB_SERVER', 'SQL_HOST'], $urlCfg['host'] ?? 'mysql-2325669c-z2e4r1o-8be1.f.aivencloud.com'));
define('DB_USER', envFirst(['DB_USER', 'MYSQL_USER', 'MYSQLUSER', 'DB_USERNAME', 'SQL_USER'], $urlCfg['user'] ?? 'avnadmin'));
define('DB_PASSWORD', envFirst(['DB_PASSWORD', 'MYSQL_PASSWORD', 'MYSQLPASSWORD', 'MYSQL_PASS', 'DB_PASS', 'SQL_PASSWORD'], $urlCfg['pass'] ?? 'CpPqnUb8b5'));
define('DB_NAME', envFirst(['DB_NAME', 'MYSQL_DATABASE', 'MYSQLDATABASE', 'DB_DATABASE', 'SQL_DATABASE'], $urlCfg['name'] ?? 'defaultdb'));
define('DB_PORT', (int)envFirst(['DB_PORT', 'MYSQL_PORT', 'MYSQLPORT', 'SQL_PORT'], $urlCfg['port'] ?? '18356'));

// Create connection
function getDBConnection()
{
    $conn = mysqli_init();
    if (!$conn) {
        throw new RuntimeException('Database initialization failed.');
    }

    // Aiven requires TLS/SSL for MySQL connections.
    mysqli_ssl_set($conn, null, null, null, null, null);

    $ok = mysqli_real_connect(
        $conn,
        DB_HOST,
        DB_USER,
        DB_PASSWORD,
        DB_NAME,
        DB_PORT,
        null,
        MYSQLI_CLIENT_SSL | MYSQLI_CLIENT_SSL_DONT_VERIFY_SERVER_CERT
    );

    if (!$ok) {
        throw new RuntimeException('Database connection failed: ' . mysqli_connect_error());
    }

    // Set charset
    mysqli_set_charset($conn, 'utf8mb4');
    return $conn;
}

// Close connection safely
function closeDBConnection($conn)
{
    if ($conn instanceof mysqli) {
        $conn->close();
    }
}
