import ServiceDetailPage from "@/app/services/[id]/page";
import { AppModal } from "@/components/app-modal";

export default function ServiceDetailModal({ params }: { params: Promise<{ id: string }> }) {
  return (
    <AppModal label="Service details" context="Dependency health">
      <ServiceDetailPage params={params} />
    </AppModal>
  );
}
