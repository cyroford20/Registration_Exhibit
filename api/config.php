<?php
// File-based read/write endpoint for wheel configuration.
// GET  -> returns JSON from wheel-config.json
// POST -> validates and writes JSON to wheel-config.json

declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');

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

function get_config_file_path(): string
{
  return dirname(__DIR__) . DIRECTORY_SEPARATOR . 'wheel-config.json';
}

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$configFile = get_config_file_path();

if ($method === 'GET') {
  if (!is_file($configFile)) {
    respond(404, ['error' => 'wheel-config.json not found.']);
  }

  $raw = file_get_contents($configFile);
  if ($raw === false) {
    respond(500, ['error' => 'Failed to read wheel-config.json.']);
  }

  $decoded = json_decode($raw, true);
  if (!is_array($decoded)) {
    respond(500, ['error' => 'wheel-config.json has invalid JSON.']);
  }

  try {
    $normalized = normalize_config($decoded);
    respond(200, $normalized);
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
    $json = json_encode($normalized, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    if ($json === false) {
      throw new RuntimeException('Failed to encode JSON.');
    }

    $written = file_put_contents($configFile, $json . PHP_EOL, LOCK_EX);
    if ($written === false) {
      throw new RuntimeException('Failed to write wheel-config.json.');
    }

    respond(200, ['ok' => true, 'config' => $normalized]);
  } catch (Throwable $e) {
    respond(400, ['error' => $e->getMessage()]);
  }
}

respond(405, ['error' => 'Method not allowed.']);
