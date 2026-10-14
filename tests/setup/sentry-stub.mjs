// Stand-in for `@sentry/nextjs` used only under `node --test` (see
// resolve-hooks.mjs). The real package's CJS build assigns its named exports
// in a runtime `Object.keys(node).forEach(...)` loop rather than static
// `exports.x = ...` lines; Node's ESM/CJS interop uses cjs-module-lexer to
// statically detect named exports for `import * as X from "cjs-module"`,
// which can't see dynamically-assigned ones. So under the native test
// runner, `Sentry.captureException` (and every other named export) comes
// back `undefined`, even though `require("@sentry/nextjs").captureException`
// works fine — Next's own bundler resolves this correctly in the real app.
// This stub just no-ops every function the app actually calls, so a test
// exercising an error/catch path doesn't crash on a missing Sentry method.
const noop = () => {};

export const init = noop;
export const captureException = noop;
export const captureMessage = noop;
export const captureRequestError = noop;
export const setUser = noop;
export const setTag = noop;
export const setContext = noop;
export const withScope = (fn) => fn({ setTag: noop, setContext: noop, setUser: noop });
