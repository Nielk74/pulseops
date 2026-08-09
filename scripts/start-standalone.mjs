process.env.PULSEOPS_ROOT ??= process.cwd();

await import("../.next/standalone/server.js");
