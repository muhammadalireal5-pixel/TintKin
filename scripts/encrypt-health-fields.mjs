/**
 * One-time migration: encrypts the health-related skin profile answers
 * (pregnancy, sensitivity) that were stored in plaintext before field
 * encryption was added. Safe to re-run: already-encrypted values are skipped.
 *
 *   bun --preload ./scripts/shim-server-only.mjs scripts/encrypt-health-fields.mjs           # dry run
 *   bun --preload ./scripts/shim-server-only.mjs scripts/encrypt-health-fields.mjs --apply   # write
 *
 * Needs the same env as the app (MONGODB_URI etc.) and FIELD_ENCRYPTION_KEY.
 */
import { connectDb, User } from "../app/lib/mongoose.js";
import { encryptField, isEncrypted } from "../lib/utils/field-crypto.js";

const apply = process.argv.includes("--apply");
if (!process.env.FIELD_ENCRYPTION_KEY) {
  console.error("FIELD_ENCRYPTION_KEY is not set. Refusing to run.");
  process.exit(1);
}

await connectDb();
// Raw collection access: the model's getters would hand back decrypted values.
const cursor = User.collection.find(
  { "skinProfile.concerns.0": { $exists: true } },
  { projection: { "skinProfile.pregnancy": 1, "skinProfile.sensitivity": 1 } }
);

let seen = 0;
let toChange = 0;
for await (const doc of cursor) {
  seen += 1;
  const set = {};
  for (const field of ["pregnancy", "sensitivity"]) {
    const value = doc.skinProfile?.[field];
    if (typeof value === "string" && value && !isEncrypted(value)) set[`skinProfile.${field}`] = encryptField(value);
  }
  if (!Object.keys(set).length) continue;
  toChange += 1;
  if (apply) await User.collection.updateOne({ _id: doc._id }, { $set: set });
}

console.log(`${seen} accounts with a skin profile, ${toChange} ${apply ? "encrypted" : "need encrypting (dry run, nothing written)"}.`);
process.exit(0);
