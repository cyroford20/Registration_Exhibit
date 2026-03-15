const mysql = require("mysql2/promise");

let pool;

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
        const u = new URL(urlValue);
        return {
            host: u.hostname || "",
            user: decodeURIComponent(u.username || ""),
            password: decodeURIComponent(u.password || ""),
            database: (u.pathname || "").replace(/^\//, ""),
            port: u.port ? Number(u.port) : undefined,
        };
    } catch {
        return null;
    }
}

function getDbConfig() {
    const parsedUrl = parseMysqlUrl(
        firstNonEmptyEnv(["MYSQL_URL", "DATABASE_URL", "AIVEN_MYSQL_URL", "SERVICE_URI"])
    );

    const host = firstNonEmptyEnv(["DB_HOST", "MYSQL_HOST", "MYSQLHOST"]) || parsedUrl?.host || "";
    const user = firstNonEmptyEnv(["DB_USER", "MYSQL_USER", "MYSQLUSER", "DB_USERNAME"]) || parsedUrl?.user || "";
    const password =
        firstNonEmptyEnv(["DB_PASSWORD", "MYSQL_PASSWORD", "MYSQLPASS", "MYSQL_PASSWORD_PLAIN"]) || parsedUrl?.password || "";
    const database = firstNonEmptyEnv(["DB_NAME", "MYSQL_DATABASE", "MYSQLDATABASE"]) || parsedUrl?.database || "";
    const portRaw = firstNonEmptyEnv(["DB_PORT", "MYSQL_PORT", "MYSQLPORT"]);
    const port = Number(portRaw || parsedUrl?.port || 18356);

    if (!host || !user || !password || !database) {
        throw new Error("Database credentials are missing. Set DB_HOST, DB_USER, DB_PASSWORD, DB_NAME, DB_PORT (or MYSQL_URL) in Vercel environment variables.");
    }

    return { host, user, password, database, port };
}

function getPool() {
    if (!pool) {
        const cfg = getDbConfig();
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

    const normalized = sectors.map((s, i) => {
        if (!s || typeof s !== "object") {
            throw new Error(`Sector at index ${i} must be an object.`);
        }

        const label = String(s.label || "").trim();
        const color = String(s.color || "").trim().toUpperCase();
        const text = String(s.text || "").trim().toUpperCase();
        const weight = Number(s.weight ?? 1);

        if (!label) {
            throw new Error(`Sector at index ${i} is missing a label.`);
        }
        if (!isHexColor(color) || !isHexColor(text)) {
            throw new Error(`Sector at index ${i} has invalid color/text hex.`);
        }
        if (!Number.isFinite(weight) || weight < 0) {
            throw new Error(`Sector at index ${i} weight must be a number >= 0.`);
        }

        return { label, color, text, weight };
    });

    const totalWeight = normalized.reduce((sum, s) => sum + s.weight, 0);
    if (totalWeight <= 0) {
        throw new Error("At least one sector must have weight > 0.");
    }

    return { version, sectors: normalized };
}

async function ensureConfigTable(conn) {
    await conn.query(`
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

async function seedDefaultSectors(conn) {
    const [rows] = await conn.query("SELECT COUNT(*) AS total FROM wheel_sectors");
    const total = Number(rows?.[0]?.total || 0);

    if (total > 0) return;

    await conn.query(
        "INSERT INTO wheel_sectors (position_order, label, color, text, weight) VALUES (?, ?, ?, ?, ?)",
        [1, "Prize 1", "#FFBC03", "#FFFFFF", 1]
    );

    await conn.query(
        "INSERT INTO wheel_sectors (position_order, label, color, text, weight) VALUES (?, ?, ?, ?, ?)",
        [2, "Prize 2", "#FF5A5F", "#FFFFFF", 1]
    );
}

function getConfigErrorMessage(error) {
    if (error && typeof error.message === "string" && error.message.trim()) {
        return error.message;
    }

    return "Internal server error";
}

module.exports = async function handler(req, res) {
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0");

    try {
        const conn = await getPool().getConnection();

        try {
            await ensureConfigTable(conn);

            if (req.method === "GET") {
                await seedDefaultSectors(conn);

                const [rows] = await conn.query(
                    "SELECT label, color, text, weight FROM wheel_sectors ORDER BY position_order ASC, id ASC"
                );

                const sectors = rows.map((row) => ({
                    label: row.label,
                    color: String(row.color).toUpperCase(),
                    text: String(row.text).toUpperCase(),
                    weight: Number(row.weight),
                }));

                res.status(200).json({ version: 1, sectors });
                return;
            }

            if (req.method === "POST") {
                const normalized = normalizeConfig(req.body);

                await conn.beginTransaction();
                await conn.query("DELETE FROM wheel_sectors");

                for (let i = 0; i < normalized.sectors.length; i++) {
                    const sector = normalized.sectors[i];
                    await conn.query(
                        "INSERT INTO wheel_sectors (position_order, label, color, text, weight) VALUES (?, ?, ?, ?, ?)",
                        [i + 1, sector.label, sector.color, sector.text, sector.weight]
                    );
                }

                await conn.commit();
                res.status(200).json({ ok: true, config: normalized });
                return;
            }

            res.status(405).json({ error: "Method not allowed." });
        } catch (error) {
            await conn.rollback().catch(() => { });
            throw error;
        } finally {
            conn.release();
        }
    } catch (error) {
        res.status(500).json({ error: getConfigErrorMessage(error) });
    }
};