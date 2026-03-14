<?php
// User registration/management endpoint (MySQL version)
// GET  -> returns all users
// POST -> registers new user
// DELETE -> removes a user

declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');

require_once 'db-config.php';

function respond(int $status, array $payload): void
{
    http_response_code($status);
    echo json_encode($payload, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
    exit;
}

// GET: retrieve all users
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    try {
        $conn = getDBConnection();

        $query = "SELECT id, user_id, fullname, email, gender, college, campus, role, registered_at 
                  FROM users ORDER BY registered_at DESC";

        $result = $conn->query($query);

        if (!$result) {
            throw new RuntimeException('Query failed: ' . $conn->error);
        }

        $users = [];
        while ($row = $result->fetch_assoc()) {
            $users[] = [
                'id' => $row['id'],
                'user_id' => $row['user_id'],
                'fullname' => $row['fullname'],
                'email' => $row['email'],
                'gender' => $row['gender'],
                'college' => $row['college'],
                'campus' => $row['campus'],
                'role' => $row['role'],
                'registered_at' => $row['registered_at']
            ];
        }

        $result->free();
        closeDBConnection($conn);

        respond(200, ['success' => true, 'users' => $users]);
    } catch (Exception $e) {
        respond(500, ['error' => $e->getMessage()]);
    }
    exit;
}

// POST: register new user
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    try {
        $body = file_get_contents('php://input');
        $payload = json_decode($body, true);

        if (!is_array($payload)) {
            throw new RuntimeException('Invalid JSON payload');
        }

        $fullname = isset($payload['fullname']) ? trim((string)$payload['fullname']) : '';
        $email = isset($payload['email']) ? trim((string)$payload['email']) : '';
        $gender = isset($payload['gender']) ? trim((string)$payload['gender']) : '';
        $college = isset($payload['college']) ? trim((string)$payload['college']) : '';
        $campus = isset($payload['campus']) ? trim((string)$payload['campus']) : '';
        $role = isset($payload['role']) ? trim((string)$payload['role']) : '';

        if ($fullname === '' || $email === '' || $gender === '' || $college === '' || $campus === '' || $role === '') {
            throw new RuntimeException('All fields are required');
        }

        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            throw new RuntimeException('Invalid email format');
        }

        $conn = getDBConnection();

        // Check for duplicate email
        $checkStmt = $conn->prepare("SELECT id FROM users WHERE LOWER(email) = LOWER(?)");
        if (!$checkStmt) {
            throw new RuntimeException('Prepare failed: ' . $conn->error);
        }

        $checkStmt->bind_param("s", $email);
        $checkStmt->execute();
        $checkStmt->store_result();

        if ($checkStmt->num_rows > 0) {
            $checkStmt->close();
            closeDBConnection($conn);
            throw new RuntimeException('User with this email already exists');
        }

        $checkStmt->close();

        // Generate unique user ID
        $userId = 'user_' . uniqid(true);

        // Insert new user
        $insertStmt = $conn->prepare(
            "INSERT INTO users (user_id, fullname, email, gender, college, campus, role) 
             VALUES (?, ?, ?, ?, ?, ?, ?)"
        );

        if (!$insertStmt) {
            throw new RuntimeException('Prepare failed: ' . $conn->error);
        }

        $insertStmt->bind_param("sssssss", $userId, $fullname, $email, $gender, $college, $campus, $role);

        if (!$insertStmt->execute()) {
            throw new RuntimeException('Insert failed: ' . $conn->error);
        }

        $insertStmt->close();

        // Retrieve all users for response
        $selectStmt = $conn->prepare(
            "SELECT id, user_id, fullname, email, gender, college, campus, role, registered_at 
             FROM users ORDER BY registered_at DESC"
        );

        if (!$selectStmt) {
            throw new RuntimeException('Prepare failed: ' . $conn->error);
        }

        $selectStmt->execute();
        $result = $selectStmt->get_result();

        $users = [];
        while ($row = $result->fetch_assoc()) {
            $users[] = [
                'id' => $row['id'],
                'user_id' => $row['user_id'],
                'fullname' => $row['fullname'],
                'email' => $row['email'],
                'gender' => $row['gender'],
                'college' => $row['college'],
                'campus' => $row['campus'],
                'role' => $row['role'],
                'registered_at' => $row['registered_at']
            ];
        }

        $selectStmt->close();
        closeDBConnection($conn);

        respond(201, [
            'success' => true,
            'message' => 'User registered successfully',
            'users' => $users
        ]);
    } catch (Exception $e) {
        respond(400, ['error' => $e->getMessage()]);
    }
    exit;
}

// DELETE: remove user
if ($_SERVER['REQUEST_METHOD'] === 'DELETE') {
    try {
        $userId = $_GET['id'] ?? '';

        if ($userId === '') {
            throw new RuntimeException('User ID is required');
        }

        $conn = getDBConnection();

        // Delete user
        $deleteStmt = $conn->prepare("DELETE FROM users WHERE id = ?");

        if (!$deleteStmt) {
            throw new RuntimeException('Prepare failed: ' . $conn->error);
        }

        $userId = (int)$userId;
        $deleteStmt->bind_param("i", $userId);

        if (!$deleteStmt->execute()) {
            throw new RuntimeException('Delete failed: ' . $conn->error);
        }

        if ($deleteStmt->affected_rows === 0) {
            $deleteStmt->close();
            closeDBConnection($conn);
            throw new RuntimeException('User not found');
        }

        $deleteStmt->close();

        // Retrieve remaining users
        $selectStmt = $conn->prepare(
            "SELECT id, user_id, fullname, email, gender, college, campus, role, registered_at 
             FROM users ORDER BY registered_at DESC"
        );

        if (!$selectStmt) {
            throw new RuntimeException('Prepare failed: ' . $conn->error);
        }

        $selectStmt->execute();
        $result = $selectStmt->get_result();

        $users = [];
        while ($row = $result->fetch_assoc()) {
            $users[] = [
                'id' => $row['id'],
                'user_id' => $row['user_id'],
                'fullname' => $row['fullname'],
                'email' => $row['email'],
                'gender' => $row['gender'],
                'college' => $row['college'],
                'campus' => $row['campus'],
                'role' => $row['role'],
                'registered_at' => $row['registered_at']
            ];
        }

        $selectStmt->close();
        closeDBConnection($conn);

        respond(200, [
            'success' => true,
            'message' => 'User deleted successfully',
            'users' => $users
        ]);
    } catch (Exception $e) {
        respond(400, ['error' => $e->getMessage()]);
    }
    exit;
}

// Unsupported method
respond(405, ['error' => 'Method not allowed']);
respond(405, ['error' => 'Method not allowed']);
