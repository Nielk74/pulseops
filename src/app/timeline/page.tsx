import { PageHeader } from "@/components/page-header";
import { TimelineFilter } from "@/components/timeline-filter";
import { getTimeline } from "@/server/queries";

export const metadata = { title: "Timeline" };

export default function TimelinePage() {
  const items = getTimeline(250).map((item) => ({ ...item, timestamp: item.timestamp.toISOString() }));
  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Correlation spine" title="Unified timeline" description="Commits, builds, deployments, service changes, tests, agents, Oracle, and actions normalized into one sequence." />
      <TimelineFilter items={items} />
    </div>
  );
}
