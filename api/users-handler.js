const mysql = require("mysql2/promise");

let pool;

function getPool() {
    if (!pool) {
        pool = mysql.createPool({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME,
            port: Number(process.env.DB_PORT || 3306),
            waitForConnections: true,
            connectionLimit: 5,
            queueLimit: 0,
            ssl: { rejectUnauthorized: false },
        });
    }

    return pool;
}

async function ensureUsersTable(conn) {
    await conn.query(`
    CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id VARCHAR(64) NOT NULL UNIQUE,
      fullname VARCHAR(255) NOT NULL,
      email VARCHAR(255) NOT NULL UNIQUE,
      gender VARCHAR(50),
      college VARCHAR(255),
      campus VARCHAR(100),
      role VARCHAR(100),
      spin ENUM('yes','no') DEFAULT 'no',
      prizeGet VARCHAR(255) NULL,
      registered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);
}

function rowToUser(row) {
    return {
        id: row.id,
        user_id: row.user_id,
        fullname: row.fullname,
        email: row.email,
        gender: row.gender,
        college: row.college,
        campus: row.campus,
        role: row.role,
        registered_at: row.registered_at,
        updated_at: row.updated_at ?? null,
        spin: row.spin ?? "no",
        prizeGet: row.prizeGet ?? null,
    };
}

async function getAllUsers(conn) {
    const [rows] = await conn.query(
        "SELECT id, user_id, fullname, email, gender, college, campus, role, registered_at, updated_at, spin, prizeGet FROM users ORDER BY registered_at DESC"
    );

    return rows.map(rowToUser);
}

module.exports = async function handler(req, res) {
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0");

    let conn;

    try {
        conn = await getPool().getConnection();
        await ensureUsersTable(conn);

        // GET – list all users
        if (req.method === "GET") {
            const users = await getAllUsers(conn);
            res.status(200).json({ success: true, users });
            return;
        }

        // POST – register a new user
        if (req.method === "POST") {
            const body = req.body || {};
            const fullname = String(body.fullname || "").trim();
            const email = String(body.email || "").trim();
            const college = String(body.college || "").trim();
            const gender = String(body.gender || "").trim();
            const campus = String(body.campus || "").trim();
            const role = String(body.role || "").trim();

            if (!fullname || !email || !college || !gender || !campus || !role) {
                res.status(400).json({ error: "All fields are required" });
                return;
            }

            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                res.status(400).json({ error: "Invalid email format" });
                return;
            }

            // Duplicate check – email OR fullname
            const [dupes] = await conn.query(
                "SELECT id FROM users WHERE LOWER(email) = LOWER(?) OR LOWER(fullname) = LOWER(?)",
                [email, fullname]
            );

            if (dupes.length > 0) {
                res.status(400).json({ error: "You are already registered" });
                return;
            }

            const userId = "user_" + Date.now() + "_" + Math.random().toString(36).slice(2, 9);

            await conn.query(
                "INSERT INTO users (user_id, fullname, email, gender, college, campus, role) VALUES (?, ?, ?, ?, ?, ?, ?)",
                [userId, fullname, email, gender, college, campus, role]
            );

            const users = await getAllUsers(conn);
            res.status(201).json({ success: true, message: "User registered successfully", users });
            return;
        }

        // DELETE – remove user by id (?id=...)
        if (req.method === "DELETE") {
            const userId = req.query?.id ? String(req.query.id) : "";

            if (!userId) {
                res.status(400).json({ error: "User ID is required" });
                return;
            }

            const [result] = await conn.query("DELETE FROM users WHERE id = ?", [Number(userId)]);

            if (result.affectedRows === 0) {
                res.status(404).json({ error: "User not found" });
                return;
            }

            const users = await getAllUsers(conn);
            res.status(200).json({ success: true, message: "User deleted successfully", users });
            return;
        }

        // PATCH – update spin/prize for a user
        if (req.method === "PATCH") {
            const body = req.body || {};
            const email = String(body.email || "").trim();
            const spin = String(body.spin || "yes").trim();
            const prizeGet = String(body.prizeGet || "").trim();

            if (!email) {
                res.status(400).json({ error: "Email is required" });
                return;
            }

            if (spin !== "yes" && spin !== "no") {
                res.status(400).json({ error: "Invalid spin value" });
                return;
            }

            await conn.query(
                "UPDATE users SET spin = ?, prizeGet = ?, updated_at = NOW() WHERE LOWER(email) = LOWER(?)",
                [spin, prizeGet, email]
            );

            res.status(200).json({ success: true, message: "Spin result saved" });
            return;
        }

        res.status(405).json({ error: "Method not allowed" });
    } catch (error) {
        res.status(500).json({ error: error.message || "Internal server error" });
    } finally {
        if (conn) conn.release();
    }
};
