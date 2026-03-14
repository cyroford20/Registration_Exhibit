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

define('DB_HOST', envFirst(['DB_HOST', 'MYSQL_HOST', 'MYSQLHOST', 'DB_SERVER', 'SQL_HOST'], $urlCfg['host'] ?? '127.0.0.1'));
define('DB_USER', envFirst(['DB_USER', 'MYSQL_USER', 'MYSQLUSER', 'DB_USERNAME', 'SQL_USER'], $urlCfg['user'] ?? 'root'));
define('DB_PASSWORD', envFirst(['DB_PASSWORD', 'MYSQL_PASSWORD', 'MYSQLPASSWORD', 'MYSQL_PASS', 'DB_PASS', 'SQL_PASSWORD'], $urlCfg['pass'] ?? ''));
define('DB_NAME', envFirst(['DB_NAME', 'MYSQL_DATABASE', 'MYSQLDATABASE', 'DB_DATABASE', 'SQL_DATABASE'], $urlCfg['name'] ?? 'sql12819977'));
define('DB_PORT', (int)envFirst(['DB_PORT', 'MYSQL_PORT', 'MYSQLPORT', 'SQL_PORT'], $urlCfg['port'] ?? '3306'));

function databaseExists(mysqli $conn, string $dbName): bool
{
    $escaped = $conn->real_escape_string($dbName);
    $result = $conn->query("SHOW DATABASES LIKE '{$escaped}'");
    if (!$result) {
        return false;
    }

    $exists = $result->num_rows > 0;
    $result->free();
    return $exists;
}

// Create connection
function getDBConnection()
{
    $conn = new mysqli(DB_HOST, DB_USER, DB_PASSWORD, '', DB_PORT);

    // Check connection
    if ($conn->connect_error) {
        throw new RuntimeException('Database connection failed: ' . $conn->connect_error);
    }

    $candidates = array_values(array_unique([
        DB_NAME,
        'sql12819977',
        'cyber_spin_wheel',
    ]));

    $selectedDb = '';
    foreach ($candidates as $candidate) {
        if ($candidate !== '' && databaseExists($conn, $candidate)) {
            $selectedDb = $candidate;
            break;
        }
    }

    // If configured DB doesn't exist, try creating it (works for local dev with permissions).
    if ($selectedDb === '' && DB_NAME !== '') {
        $escapedDb = str_replace('`', '``', DB_NAME);
        $createSql = "CREATE DATABASE IF NOT EXISTS `{$escapedDb}` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci";
        if ($conn->query($createSql)) {
            $selectedDb = DB_NAME;
        }
    }

    if ($selectedDb === '') {
        throw new RuntimeException('No usable database found. Set DB_NAME to an existing database.');
    }

    if (!$conn->select_db($selectedDb)) {
        throw new RuntimeException('Failed to select database: ' . $conn->error);
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
