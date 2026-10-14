// Node module-resolution hooks so `node --test` can load app/lib source as-is:
// maps the "@/..." path alias (see jsconfig.json) to the repo root and retries
// extensionless relative imports with ".js", matching what Next's bundler does.
import path from "node:path";
import { pathToFileURL } from "node:url";

const ROOT_URL = pathToFileURL(path.resolve(import.meta.dirname, "../..") + path.sep).href;

// `@sentry/nextjs`'s CJS build loses its named exports under Node's native
// ESM/CJS interop (see sentry-stub.mjs for why) — redirect every import of it
// to a no-op stub so app code that calls Sentry.* in a catch/error path
// doesn't crash the test run with "is not a function".
const SENTRY_STUB_URL = new URL("./sentry-stub.mjs", import.meta.url).href;

export async function resolve(specifier, context, nextResolve) {
  if (specifier === "@sentry/nextjs") {
    return nextResolve(SENTRY_STUB_URL, context);
  }

  const isAliased = specifier.startsWith("@/");
  const isRelative = specifier.startsWith(".") || specifier.startsWith("/");
  const target = isAliased ? new URL(specifier.slice(2), ROOT_URL).href : specifier;
  try {
    return await nextResolve(target, context);
  } catch (err) {
    // Only retry our own alias/relative imports with an appended ".js" — a
    // bare package specifier that fails to resolve (e.g. a dependency that's
    // actually missing) must never be rewritten here. A scoped package name
    // like "@sentry/nextjs" has a dot in it, so blindly appending ".js" to
    // anything without a .js/.mjs/.cjs suffix turned a real "module not
    // found" into resolving a different, wrong specifier instead.
    if ((isAliased || isRelative) && err?.code === "ERR_MODULE_NOT_FOUND" && !/\.[cm]?js$/.test(target)) {
      return nextResolve(`${target}.js`, context);
    }
    throw err;
  }
}
