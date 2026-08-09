import { cp, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";

const projectRoot = process.cwd();
const standaloneRoot = join(projectRoot, ".next", "standalone");

if (!existsSync(standaloneRoot)) {
  throw new Error("Standalone output is missing. Run this script after `next build`.");
}

await mkdir(join(standaloneRoot, ".next"), { recursive: true });
await cp(join(projectRoot, "public"), join(standaloneRoot, "public"), {
  recursive: true,
  force: true
});
await cp(join(projectRoot, ".next", "static"), join(standaloneRoot, ".next", "static"), {
  recursive: true,
  force: true
});
await cp(join(projectRoot, "drizzle"), join(standaloneRoot, "drizzle"), {
  recursive: true,
  force: true
});

console.log("Prepared self-contained PulseOps standalone output.");
