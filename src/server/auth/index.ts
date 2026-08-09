import type { NextRequest } from "next/server";
import { loadConfig } from "@/server/config";

export type Role = "VIEWER" | "OPERATOR" | "ADMIN";
export interface Identity { id: string; displayName: string; role: Role; }

const rank: Record<Role, number> = { VIEWER: 0, OPERATOR: 1, ADMIN: 2 };

export function getIdentity(request: NextRequest): Identity {
  const config = loadConfig();
  if (config.env.AUTH_TRUSTED_PROXY) {
    const roleHeader = request.headers.get("x-pulseops-role")?.toUpperCase();
    const role = roleHeader === "ADMIN" || roleHeader === "OPERATOR" || roleHeader === "VIEWER"
      ? roleHeader
      : config.env.AUTH_DEFAULT_ROLE;
    return {
      id: request.headers.get("x-pulseops-user") ?? "unknown",
      displayName: request.headers.get("x-pulseops-name") ?? request.headers.get("x-pulseops-user") ?? "Unknown operator",
      role
    };
  }
  return { id: "local-user", displayName: "Local user", role: config.env.AUTH_DEFAULT_ROLE };
}

export function can(identity: Identity, required: Role) {
  return rank[identity.role] >= rank[required];
}
