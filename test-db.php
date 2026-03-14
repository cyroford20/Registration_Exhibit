<?php
// Database Connection Test Script
// Access this at: http://localhost:8000/test-db.php

declare(strict_types=1);

header('Content-Type: text/html; charset=utf-8');

?>
<!DOCTYPE html>
<html>

<head>
    <title>Database Connection Test</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            background: linear-gradient(135deg, #0a0e27 0%, #1a1f3a 50%, #0d2847 100%);
            color: #e0e0ff;
            padding: 20px;
            margin: 0;
        }

        .container {
            max-width: 800px;
            margin: 0 auto;
            background: rgba(26, 31, 58, 0.8);
            padding: 30px;
            border-radius: 8px;
            border: 2px solid rgba(0, 217, 255, 0.3);
        }

        h1 {
            color: #00d9ff;
            margin-top: 0;
        }

        .test-section {
            margin: 20px 0;
            padding: 15px;
            background: rgba(15, 20, 50, 0.6);
            border-left: 4px solid #00d9ff;
        }

        .success {
            color: #00ff88;
        }

        .error {
            color: #ff3366;
        }

        .info {
            color: #00d9ff;
        }

        code {
            background: rgba(0, 0, 0, 0.3);
            padding: 2px 6px;
            border-radius: 3px;
            font-family: "Courier New", monospace;
        }

        table {
            width: 100%;
            border-collapse: collapse;
            margin: 10px 0;
        }

        th,
        td {
            padding: 8px;
            text-align: left;
            border: 1px solid rgba(0, 217, 255, 0.2);
        }

        th {
            background: rgba(0, 217, 255, 0.1);
            color: #00d9ff;
        }

        button {
            background: rgba(0, 255, 136, 0.1);
            border: 2px solid #00ff88;
            color: #00ff88;
            padding: 10px 20px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
            margin: 5px;
        }

        button:hover {
            background: rgba(0, 255, 136, 0.2);
        }
    </style>
</head>

<body>
    <div class="container">
        <h1>🔧 Database Connection Test</h1>

        <?php
        require_once 'api/db-config.php';

        // Test 1: MySQL Connection
        echo '<div class="test-section">';
        echo '<h3>Test 1: MySQL Connection</h3>';

        try {
            $conn = getDBConnection();
            echo '<p class="success">✓ Successfully connected to MySQL database!</p>';
            echo '<p class="info">Database: <code>' . DB_NAME . '</code></p>';
            echo '<p class="info">Host: <code>' . DB_HOST . '</code></p>';
            echo '<p class="info">Port: <code>' . DB_PORT . '</code></p>';
            closeDBConnection($conn);
        } catch (Exception $e) {
            echo '<p class="error">✗ Connection failed: ' . htmlspecialchars($e->getMessage()) . '</p>';
            echo '<p>Make sure:</p>';
            echo '<ul>';
            echo '<li>WAMP MySQL is running</li>';
            echo '<li>Database "' . DB_NAME . '" exists</li>';
            echo '<li>MySQL credentials in api/db-config.php are correct</li>';
            echo '</ul>';
        }
        echo '</div>';

        // Test 2: Check Tables
        echo '<div class="test-section">';
        echo '<h3>Test 2: Database Tables</h3>';

        try {
            $conn = getDBConnection();

            $tables = ['users', 'spin_history', 'wheel_sectors', 'campuses', 'roles', 'genders'];
            echo '<table>';
            echo '<tr><th>Table Name</th><th>Status</th><th>Row Count</th></tr>';

            foreach ($tables as $table) {
                $result = $conn->query("SELECT COUNT(*) as count FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = '" . DB_NAME . "' AND TABLE_NAME = '" . $table . "'");
                $exists = $result && $result->fetch_assoc()['count'] > 0;

                if ($exists) {
                    $countResult = $conn->query("SELECT COUNT(*) as count FROM " . $table);
                    $countRow = $countResult->fetch_assoc();
                    $count = $countRow['count'];
                    echo '<tr><td>' . $table . '</td><td class="success">✓ Exists</td><td>' . $count . ' rows</td></tr>';
                } else {
                    echo '<tr><td>' . $table . '</td><td class="error">✗ Missing</td><td>-</td></tr>';
                }
            }

            echo '</table>';
            closeDBConnection($conn);
        } catch (Exception $e) {
            echo '<p class="error">✗ Error checking tables: ' . htmlspecialchars($e->getMessage()) . '</p>';
        }
        echo '</div>';

        // Test 3: Sample Users
        echo '<div class="test-section">';
        echo '<h3>Test 3: Registered Users</h3>';

        try {
            $conn = getDBConnection();

            $result = $conn->query("SELECT id, fullname, email, campus, role, registered_at FROM users ORDER BY registered_at DESC LIMIT 10");

            if ($result && $result->num_rows > 0) {
                echo '<p class="success">✓ Found ' . $result->num_rows . ' registered users</p>';
                echo '<table>';
                echo '<tr><th>Full Name</th><th>Email</th><th>Campus</th><th>Role</th><th>Registered</th></tr>';

                while ($row = $result->fetch_assoc()) {
                    echo '<tr>';
                    echo '<td>' . htmlspecialchars($row['fullname']) . '</td>';
                    echo '<td>' . htmlspecialchars($row['email']) . '</td>';
                    echo '<td>' . htmlspecialchars($row['campus']) . '</td>';
                    echo '<td>' . htmlspecialchars($row['role']) . '</td>';
                    echo '<td>' . $row['registered_at'] . '</td>';
                    echo '</tr>';
                }

                echo '</table>';
            } else {
                echo '<p class="info">ℹ No users registered yet</p>';
            }

            closeDBConnection($conn);
        } catch (Exception $e) {
            echo '<p class="error">✗ Error fetching users: ' . htmlspecialchars($e->getMessage()) . '</p>';
        }
        echo '</div>';

        // Test 4: Lookup Data
        echo '<div class="test-section">';
        echo '<h3>Test 4: Lookup Data</h3>';

        try {
            $conn = getDBConnection();

            echo '<p><strong>Campuses:</strong> ';
            $result = $conn->query("SELECT GROUP_CONCAT(name) as campuses FROM campuses");
            $row = $result->fetch_assoc();
            echo '<code>' . htmlspecialchars($row['campuses']) . '</code></p>';

            echo '<p><strong>Roles:</strong> ';
            $result = $conn->query("SELECT GROUP_CONCAT(name) as roles FROM roles");
            $row = $result->fetch_assoc();
            echo '<code>' . htmlspecialchars($row['roles']) . '</code></p>';

            echo '<p><strong>Genders:</strong> ';
            $result = $conn->query("SELECT GROUP_CONCAT(name) as genders FROM genders");
            $row = $result->fetch_assoc();
            echo '<code>' . htmlspecialchars($row['genders']) . '</code></p>';

            closeDBConnection($conn);
        } catch (Exception $e) {
            echo '<p class="error">✗ Error fetching lookup data: ' . htmlspecialchars($e->getMessage()) . '</p>';
        }
        echo '</div>';

        // Actions
        echo '<div class="test-section">';
        echo '<h3>Quick Actions</h3>';
        echo '<button onclick="location.href=\'admin.html\'">Go to Admin Panel</button>';
        echo '<button onclick="location.href=\'index.html\'">Go to Wheel</button>';
        echo '<button onclick="location.href=\'http://localhost/phpmyadmin\'">Open phpMyAdmin</button>';
        echo '</div>';
        ?>
    </div>
</body>

</html>