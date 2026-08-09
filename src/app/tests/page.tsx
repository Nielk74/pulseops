import { PageHeader } from "@/components/page-header";
import { TestsTable } from "@/components/tables/tests-table";
import { getTests } from "@/server/queries";

export const metadata = { title: "Tests" };

export default function TestsPage() {
  const tests = getTests();
  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Anomaly detection" title="Tests" description="Robust median and MAD baselines surface both slow runs and suspiciously fast incomplete execution." />
      <TestsTable data={tests.map((test) => ({ id: test.id, testName: test.testName, testType: test.testType, durationMs: test.durationMs, medianMs: test.baseline?.medianMs, deltaPercent: test.deltaPercent, anomalyType: test.anomalyType, probableCause: test.probableCause ?? undefined }))} />
    </div>
  );
}
