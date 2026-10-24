// Lets scripts import app code that starts with `import "server-only"` (Bun only).
import { plugin } from "bun";
plugin({ name: "server-only-shim", setup(b) { b.module("server-only", () => ({ exports: {}, loader: "object" })); } });
