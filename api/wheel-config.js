const fs = require("fs/promises");
const path = require("path");

function getConfigPath() {
    return path.join(process.cwd(), "wheel-config.json");
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

module.exports = async function handler(req, res) {
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0");

    try {
        if (req.method === "GET") {
            const config = await readConfigFromFile();
            res.status(200).json(config);
            return;
        }

        if (req.method === "POST") {
            const normalized = normalizeConfig(req.body);
            await writeConfigToFile(normalized);
            res.status(200).json({ ok: true, config: normalized });
            return;
        }

        res.status(405).json({ error: "Method not allowed." });
    } catch (error) {
        if (error && (error.code === "EROFS" || error.code === "EPERM" || error.code === "EACCES")) {
            res.status(500).json({
                error:
                    "Config file is read-only in this deployment environment. Display uses wheel-config.json, but saving must use a writable backend.",
            });
            return;
        }

        res.status(500).json({ error: error && error.message ? error.message : "Internal server error" });
    }
};