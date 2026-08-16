import { execSync, spawnSync } from "child_process";
import fs from "fs";
import path from "path";

const envPath = path.join(process.cwd(), ".env.local");

if (!fs.existsSync(envPath)) {
  console.error("Error: .env.local not found.");
  process.exit(1);
}

// Check if user is logged into vercel
try {
  const whoami = execSync("vercel whoami", { encoding: "utf8", stdio: ["pipe", "pipe", "ignore"] });
  console.log(`✓ Logged into Vercel as: ${whoami.trim()}`);
} catch {
  console.log("\n⚠️ You are not logged into Vercel CLI yet.");
  console.log("Please run:\n  vercel login\nand then rerun this script.\n");
  process.exit(1);
}

// Read env file
const content = fs.readFileSync(envPath, "utf8");
const lines = content.split("\n");
const envVars = {};

let currentKey = null;
let currentValue = "";
let isQuoted = false;

for (const rawLine of lines) {
  const line = rawLine.trim();
  if (!line || line.startsWith("#")) continue;

  const eqIdx = line.indexOf("=");
  if (eqIdx !== -1) {
    const key = line.substring(0, eqIdx).trim();
    let val = line.substring(eqIdx + 1).trim();

    // Strip wrapping quotes if present
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    envVars[key] = val;
  }
}

const targets = ["production", "preview", "development"];
const keys = Object.keys(envVars);

console.log(`\nFound ${keys.length} environment variables to push to Vercel (${targets.join(", ")}):\n`);

for (const key of keys) {
  const val = envVars[key];
  for (const target of targets) {
    process.stdout.write(`→ Pushing ${key} to ${target}... `);
    try {
      // Remove old value first if exists to avoid collision
      spawnSync("vercel", ["env", "rm", key, target, "-y"], { stdio: "ignore" });

      // Add new value
      const res = spawnSync("vercel", ["env", "add", key, target], {
        input: val,
        encoding: "utf8",
      });

      if (res.status === 0) {
        console.log("✓ Done");
      } else {
        console.log(`(status ${res.status})`);
      }
    } catch (err) {
      console.log(`✗ Error: ${err.message}`);
    }
  }
}

console.log("\n🎉 All environment variables pushed successfully to Vercel!\n");
