<?php
// MySQL read/write endpoint for the wheel configuration.
// GET  -> returns JSON config from database
// POST -> saves JSON config to database (expects application/json)

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

function is_hex_color(string $value): bool
{
  return preg_match('/^#[0-9a-fA-F]{6}$/', $value) === 1;
}

function ensureConfigTable(mysqli $conn): void
{
  $sql = "
        CREATE TABLE IF NOT EXISTS wheel_sectors (
            id INT AUTO_INCREMENT PRIMARY KEY,
            position_order INT NOT NULL,
            label VARCHAR(255) NOT NULL,
            color CHAR(7) NOT NULL,
            text CHAR(7) NOT NULL,
            weight DECIMAL(10,4) NOT NULL DEFAULT 1,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            UNIQUE KEY uniq_position_order (position_order)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    ";

  if (!$conn->query($sql)) {
    throw new RuntimeException('Failed to ensure wheel_sectors table: ' . $conn->error);
  }
}

function seedDefaultSectors(mysqli $conn): void
{
  $countResult = $conn->query('SELECT COUNT(*) AS total FROM wheel_sectors');
  if (!$countResult) {
    throw new RuntimeException('Failed to read wheel_sectors count: ' . $conn->error);
  }

  $row = $countResult->fetch_assoc();
  $countResult->free();
  $total = (int)($row['total'] ?? 0);

  if ($total > 0) {
    return;
  }

  $defaults = [
    ['label' => 'Prize 1', 'color' => '#FFBC03', 'text' => '#FFFFFF', 'weight' => 1.0],
    ['label' => 'Prize 2', 'color' => '#FF5A5F', 'text' => '#FFFFFF', 'weight' => 1.0],
  ];

  $stmt = $conn->prepare('INSERT INTO wheel_sectors (position_order, label, color, text, weight) VALUES (?, ?, ?, ?, ?)');
  if (!$stmt) {
    throw new RuntimeException('Prepare failed while seeding sectors: ' . $conn->error);
  }

  foreach ($defaults as $index => $sector) {
    $position = $index + 1;
    $label = $sector['label'];
    $color = $sector['color'];
    $text = $sector['text'];
    $weight = $sector['weight'];
    $stmt->bind_param('isssd', $position, $label, $color, $text, $weight);
    if (!$stmt->execute()) {
      $stmt->close();
      throw new RuntimeException('Failed to seed default sectors: ' . $stmt->error);
    }
  }

  $stmt->close();
}

function normalize_config(array $data): array
{
  $version = isset($data['version']) && is_int($data['version']) ? $data['version'] : 1;
  $sectors = $data['sectors'] ?? null;

  if (!is_array($sectors) || count($sectors) < 2) {
    throw new RuntimeException('Config must include "sectors" array with at least 2 items.');
  }

  $normalized = [];
  foreach ($sectors as $i => $s) {
    if (!is_array($s)) {
      throw new RuntimeException("Sector at index $i must be an object.");
    }

    $label = isset($s['label']) ? trim((string)$s['label']) : '';
    $color = isset($s['color']) ? trim((string)$s['color']) : '';
    $text = isset($s['text']) ? trim((string)$s['text']) : '';
    $weightRaw = $s['weight'] ?? 1;

    if ($label === '') {
      throw new RuntimeException("Sector at index $i is missing a label.");
    }
    if (!is_hex_color($color) || !is_hex_color($text)) {
      throw new RuntimeException("Sector at index $i has invalid color/text hex.");
    }

    if (!is_numeric($weightRaw)) {
      throw new RuntimeException("Sector at index $i has non-numeric weight.");
    }

    $weight = (float)$weightRaw;
    if ($weight < 0) {
      throw new RuntimeException("Sector at index $i weight must be >= 0.");
    }

    $normalized[] = [
      'color' => strtoupper($color),
      'text' => strtoupper($text),
      'label' => $label,
      'weight' => $weight,
    ];
  }

  $totalWeight = 0.0;
  foreach ($normalized as $s) {
    $totalWeight += $s['weight'];
  }
  if ($totalWeight <= 0) {
    throw new RuntimeException('At least one sector must have weight > 0.');
  }

  return [
    'version' => $version,
    'sectors' => $normalized,
  ];
}

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

if ($method === 'GET') {
  try {
    $conn = getDBConnection();
    ensureConfigTable($conn);
    seedDefaultSectors($conn);

    $result = $conn->query('SELECT label, color, text, weight FROM wheel_sectors ORDER BY position_order ASC, id ASC');
    if (!$result) {
      throw new RuntimeException('Failed to load wheel sectors: ' . $conn->error);
    }

    $sectors = [];
    while ($row = $result->fetch_assoc()) {
      $sectors[] = [
        'label' => $row['label'],
        'color' => strtoupper((string)$row['color']),
        'text' => strtoupper((string)$row['text']),
        'weight' => (float)$row['weight'],
      ];
    }
    $result->free();

    closeDBConnection($conn);
    respond(200, ['version' => 1, 'sectors' => $sectors]);
  } catch (Throwable $e) {
    respond(500, ['error' => $e->getMessage()]);
  }
}

if ($method === 'POST') {
  $raw = file_get_contents('php://input');
  if ($raw === false || trim($raw) === '') {
    respond(400, ['error' => 'Missing JSON body.']);
  }

  $decoded = json_decode($raw, true);
  if (!is_array($decoded)) {
    respond(400, ['error' => 'Invalid JSON body.']);
  }

  try {
    $normalized = normalize_config($decoded);
    $conn = getDBConnection();
    ensureConfigTable($conn);

    if (!$conn->begin_transaction()) {
      throw new RuntimeException('Failed to start transaction: ' . $conn->error);
    }

    if (!$conn->query('DELETE FROM wheel_sectors')) {
      throw new RuntimeException('Failed to clear sectors: ' . $conn->error);
    }

    $stmt = $conn->prepare('INSERT INTO wheel_sectors (position_order, label, color, text, weight) VALUES (?, ?, ?, ?, ?)');
    if (!$stmt) {
      throw new RuntimeException('Prepare failed: ' . $conn->error);
    }

    foreach ($normalized['sectors'] as $index => $sector) {
      $position = $index + 1;
      $label = $sector['label'];
      $color = $sector['color'];
      $text = $sector['text'];
      $weight = (float)$sector['weight'];

      $stmt->bind_param('isssd', $position, $label, $color, $text, $weight);
      if (!$stmt->execute()) {
        $stmt->close();
        throw new RuntimeException('Insert failed: ' . $stmt->error);
      }
    }

    $stmt->close();
    $conn->commit();
    closeDBConnection($conn);
    respond(200, ['ok' => true, 'config' => $normalized]);
  } catch (Throwable $e) {
    if (isset($conn) && $conn instanceof mysqli) {
      $conn->rollback();
      closeDBConnection($conn);
    }
    respond(400, ['error' => $e->getMessage()]);
  }
}

respond(405, ['error' => 'Method not allowed.']);
