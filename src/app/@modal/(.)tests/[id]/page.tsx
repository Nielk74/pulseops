import TestDetailPage from "@/app/tests/[id]/page";
import { AppModal } from "@/components/app-modal";

export default function TestDetailModal({ params }: { params: Promise<{ id: string }> }) {
  return (
    <AppModal label="Test explanation" context="Anomaly details">
      <TestDetailPage params={params} />
    </AppModal>
  );
}
