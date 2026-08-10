import BuildDetailPage from "@/app/builds/[id]/page";
import { AppModal } from "@/components/app-modal";

export default function BuildDetailModal({ params }: { params: Promise<{ id: string }> }) {
  return (
    <AppModal label="Build details" context="TeamCity build">
      <BuildDetailPage params={params} />
    </AppModal>
  );
}
