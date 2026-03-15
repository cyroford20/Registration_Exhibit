const fs = require("fs/promises");
const path = require("path");
const mysql = require("mysql2/promise");

let pool;

function getConfigPath() {
    return path.join(process.cwd(), "wheel-config.json");
}

function firstNonEmptyEnv(keys) {
    for (const key of keys) {
        const value = process.env[key];
        if (typeof value === "string" && value.trim() !== "") {
            return value.trim();
        }
    }
    return "";
}

function parseMysqlUrl(urlValue) {
    if (!urlValue) return null;

    try {
        const parsed = new URL(urlValue);
        return {
            host: parsed.hostname || "",
            user: decodeURIComponent(parsed.username || ""),
            password: decodeURIComponent(parsed.password || ""),
            database: (parsed.pathname || "").replace(/^\//, ""),
            port: parsed.port ? Number(parsed.port) : undefined,
        };
    } catch {
        return null;
    }
}

function getDbConfigIfPresent() {
    const parsedUrl = parseMysqlUrl(
        firstNonEmptyEnv(["MYSQL_URL", "DATABASE_URL", "AIVEN_MYSQL_URL", "SERVICE_URI"])
    );

    const host = firstNonEmptyEnv(["DB_HOST", "MYSQL_HOST", "MYSQLHOST"]) || parsedUrl?.host || "";
    const user = firstNonEmptyEnv(["DB_USER", "MYSQL_USER", "MYSQLUSER", "DB_USERNAME"]) || parsedUrl?.user || "";
    const password =
        firstNonEmptyEnv(["DB_PASSWORD", "DB_PASS", "MYSQL_PASSWORD", "MYSQLPASS", "MYSQL_PASSWORD_PLAIN"]) || parsedUrl?.password || "";
    const database = firstNonEmptyEnv(["DB_NAME", "MYSQL_DATABASE", "MYSQLDATABASE"]) || parsedUrl?.database || "";
    const portRaw = firstNonEmptyEnv(["DB_PORT", "MYSQL_PORT", "MYSQLPORT"]);
    const port = Number(portRaw || parsedUrl?.port || 3306);

    if (!host || !user || !password || !database) {
        return null;
    }

    return { host, user, password, database, port };
}

function getPoolIfConfigured() {
    const cfg = getDbConfigIfPresent();
    if (!cfg) {
        return null;
    }

    if (!pool) {
        pool = mysql.createPool({
            host: cfg.host,
            user: cfg.user,
            password: cfg.password,
            database: cfg.database,
            port: cfg.port,
            waitForConnections: true,
            connectionLimit: 5,
            queueLimit: 0,
            ssl: { rejectUnauthorized: false },
        });
    }

    return pool;
}

function isHexColor(value) {
    return /^#[0-9a-fA-F]{6}$/.test(value);
}

function normalizeConfig(data) {
    const version = Number.isInteger(data?.version) ? data.version : 1;
    const sectors = data?.sectors;

    if (!Array.isArray(sectors) || sectors.length < 2) {
        throw new Error('Config must include "sectors" array with at least 2 items.');
    }

    const normalized = sectors.map((sector, index) => {
        if (!sector || typeof sector !== "object") {
            throw new Error(`Sector at index ${index} must be an object.`);
        }

        const label = String(sector.label || "").trim();
        const color = String(sector.color || "").trim().toUpperCase();
        const text = String(sector.text || "").trim().toUpperCase();
        const weight = Number(sector.weight ?? 1);

        if (!label) {
            throw new Error(`Sector at index ${index} is missing a label.`);
        }
        if (!isHexColor(color) || !isHexColor(text)) {
            throw new Error(`Sector at index ${index} has invalid color/text hex.`);
        }
        if (!Number.isFinite(weight) || weight < 0) {
            throw new Error(`Sector at index ${index} weight must be a number >= 0.`);
        }

        return { label, color, text, weight };
    });

    const totalWeight = normalized.reduce((sum, sector) => sum + sector.weight, 0);
    if (totalWeight <= 0) {
        throw new Error("At least one sector must have weight > 0.");
    }

    return { version, sectors: normalized };
}

async function readConfigFromFile() {
    const configPath = getConfigPath();
    const raw = await fs.readFile(configPath, "utf8");
    const parsed = JSON.parse(raw);
    return normalizeConfig(parsed);
}

async function writeConfigToFile(config) {
    const configPath = getConfigPath();
    const raw = JSON.stringify(config, null, 2) + "\n";
    await fs.writeFile(configPath, raw, "utf8");
}

async function ensureConfigTable(connection) {
    await connection.query(`
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
    `);
}

async function readConfigFromDb(connection) {
    const [rows] = await connection.query(
        "SELECT label, color, text, weight FROM wheel_sectors ORDER BY position_order ASC, id ASC"
    );

    if (!Array.isArray(rows) || rows.length < 2) {
        return null;
    }

    return normalizeConfig({
        version: 1,
        sectors: rows.map((row) => ({
            label: row.label,
            color: String(row.color).toUpperCase(),
            text: String(row.text).toUpperCase(),
            weight: Number(row.weight),
        })),
    });
}

async function writeConfigToDb(connection, config) {
    await connection.beginTransaction();
    try {
        await connection.query("DELETE FROM wheel_sectors");
        for (let i = 0; i < config.sectors.length; i++) {
            const sector = config.sectors[i];
            await connection.query(
                "INSERT INTO wheel_sectors (position_order, label, color, text, weight) VALUES (?, ?, ?, ?, ?)",
                [i + 1, sector.label, sector.color, sector.text, sector.weight]
            );
        }
        await connection.commit();
    } catch (error) {
        await connection.rollback();
        throw error;
    }
}

module.exports = async function handler(req, res) {
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0");

    try {
        const dbPool = getPoolIfConfigured();

        if (req.method === "GET") {
            if (dbPool) {
                const connection = await dbPool.getConnection();
                try {
                    await ensureConfigTable(connection);

                    const dbConfig = await readConfigFromDb(connection);
                    if (dbConfig) {
                        res.status(200).json(dbConfig);
                        return;
                    }

                    const fileConfig = await readConfigFromFile();
                    await writeConfigToDb(connection, fileConfig);
                    res.status(200).json(fileConfig);
                    return;
                } finally {
                    connection.release();
                }
            }

            const config = await readConfigFromFile();
            res.status(200).json(config);
            return;
        }

        if (req.method === "POST") {
            const normalized = normalizeConfig(req.body);

            if (dbPool) {
                const connection = await dbPool.getConnection();
                try {
                    await ensureConfigTable(connection);
                    await writeConfigToDb(connection, normalized);
                } finally {
                    connection.release();
                }
            } else {
                await writeConfigToFile(normalized);
            }

            res.status(200).json({ ok: true, config: normalized });
            return;
        }

        res.status(405).json({ error: "Method not allowed." });
    } catch (error) {
        if (error && (error.code === "EROFS" || error.code === "EPERM" || error.code === "EACCES")) {
            res.status(500).json({
                error:
                    "Config file is read-only in this deployment environment. Set DB_* env vars so saves can use the database backend.",
            });
            return;
        }

        res.status(500).json({ error: error && error.message ? error.message : "Internal server error" });
    }
};