<?php
// Minimal JSON read/write endpoint for the wheel configuration.
// GET  -> returns JSON config
// POST -> saves JSON config (expects application/json)

declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');

$root = dirname(__DIR__);
$configPath = $root . DIRECTORY_SEPARATOR . 'wheel-config.json';

function respond(int $status, array $payload): void {
  http_response_code($status);
  echo json_encode($payload, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
  exit;
}

function is_hex_color(string $value): bool {
  return preg_match('/^#[0-9a-fA-F]{6}$/', $value) === 1;
}

function normalize_config(array $data): array {
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
    $text  = isset($s['text']) ? trim((string)$s['text']) : '';
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

  // Ensure at least one sector is selectable.
  $totalWeight = 0.0;
  foreach ($normalized as $s) { $totalWeight += $s['weight']; }
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
  if (!file_exists($configPath)) {
    respond(404, ['error' => 'Config file not found.']);
  }

  $raw = file_get_contents($configPath);
  if ($raw === false) {
    respond(500, ['error' => 'Failed to read config file.']);
  }

  $decoded = json_decode($raw, true);
  if (!is_array($decoded)) {
    respond(500, ['error' => 'Config file contains invalid JSON.']);
  }

  respond(200, $decoded);
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
  } catch (Throwable $e) {
    respond(400, ['error' => $e->getMessage()]);
  }

  $json = json_encode($normalized, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
  if ($json === false) {
    respond(500, ['error' => 'Failed to encode JSON.']);
  }

  $ok = file_put_contents($configPath, $json . "\n", LOCK_EX);
  if ($ok === false) {
    respond(500, ['error' => 'Failed to write config file.']);
  }

  respond(200, ['ok' => true, 'config' => $normalized]);
}

respond(405, ['error' => 'Method not allowed.']);
