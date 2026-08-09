import "@fontsource/fira-sans/400.css";
import "@fontsource/fira-sans/500.css";
import "@fontsource/fira-sans/600.css";
import "@fontsource/fira-sans/700.css";
import "@fontsource-variable/fira-code";
import "./globals.css";
import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { AppShell } from "@/components/app-shell";

export const metadata: Metadata = {
  title: { default: "PulseOps", template: "%s · PulseOps" },
  description: "Correlated engineering operations intelligence for builds, tests, deployments, services, machines, Git, and Oracle."
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, colorScheme: "dark", themeColor: "#020617" };
export const dynamic = "force-dynamic";

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en" className="dark">
      <body><AppShell>{children}</AppShell></body>
    </html>
  );
}
