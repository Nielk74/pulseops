import { notFound, redirect } from "next/navigation";
import { getMachineDetail } from "@/server/queries";

export default async function LegacyMachineDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!getMachineDetail(id)) notFound();
  redirect(`/fleet?machine=${encodeURIComponent(id)}&detail=machine`);
}
