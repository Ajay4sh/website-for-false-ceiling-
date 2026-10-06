import fs from "node:fs";
import path from "node:path";

export function loadBusiness(file = process.env.BUSINESS_FILE ?? "businesses/ceilcraft.json") {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

export function dataFile(business, suffix = "") {
  return path.join(process.env.DATA_DIR ?? "data", `${business.id}${suffix}.json`);
}

export function requireEnv(...names) {
  const missing = names.filter((name) => !process.env[name]);
  if (missing.length) {
    console.error(`Missing settings in .env: ${missing.join(", ")}. See .env.example.`);
    process.exit(1);
  }
  return Object.fromEntries(names.map((name) => [name, process.env[name]]));
}
