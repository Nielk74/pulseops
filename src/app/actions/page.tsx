import { redirect } from "next/navigation";

export const metadata = { title: "Actions" };

export default function LegacyActionsPage() {
  redirect("/fleet#machine-actions");
}
