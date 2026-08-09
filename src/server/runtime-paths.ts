import path from "node:path";

export function runtimeRoot() {
  return process.env.PULSEOPS_ROOT ?? process.env.INIT_CWD ?? process.cwd();
}

export function resolveRuntimePath(value: string) {
  return path.isAbsolute(value) ? value : path.resolve(runtimeRoot(), value);
}
