// Node module-resolution hooks so `node --test` can load app/lib source as-is:
// maps the "@/..." path alias (see jsconfig.json) to the repo root and retries
// extensionless relative imports with ".js", matching what Next's bundler does.
import path from "node:path";
import { pathToFileURL } from "node:url";

const ROOT_URL = pathToFileURL(path.resolve(import.meta.dirname, "../..") + path.sep).href;

export async function resolve(specifier, context, nextResolve) {
  const target = specifier.startsWith("@/") ? new URL(specifier.slice(2), ROOT_URL).href : specifier;
  try {
    return await nextResolve(target, context);
  } catch (err) {
    if (err?.code === "ERR_MODULE_NOT_FOUND" && !/\.[cm]?js$/.test(target)) {
      return nextResolve(`${target}.js`, context);
    }
    throw err;
  }
}
