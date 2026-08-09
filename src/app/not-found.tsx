import Link from "next/link";
import { EmptyState } from "@/components/empty-state";

export default function NotFound() {
  return (
    <div className="space-y-6">
      <EmptyState title="That operational record was not found" description="It may have aged out of retention or the identifier may be incorrect." />
      <div className="text-center"><Link className="button-secondary" href="/">Return to overview</Link></div>
    </div>
  );
}
