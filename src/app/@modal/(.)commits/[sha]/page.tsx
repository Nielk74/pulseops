import CommitDetailPage from "@/app/commits/[sha]/page";
import { AppModal } from "@/components/app-modal";

export default function CommitDetailModal({ params }: { params: Promise<{ sha: string }> }) {
  return (
    <AppModal label="Commit details" context="Source change">
      <CommitDetailPage params={params} />
    </AppModal>
  );
}
