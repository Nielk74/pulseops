export default function Loading() {
  return (
    <div aria-busy="true" aria-label="Loading operational data" className="space-y-6">
      <div className="h-8 w-64 animate-pulse rounded bg-slate-800 motion-reduce:animate-none" />
      <div className="h-5 w-full max-w-2xl animate-pulse rounded bg-slate-900 motion-reduce:animate-none" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">{Array.from({ length: 5 }, (_, index) => <div key={index} className="h-36 animate-pulse rounded-xl border border-pulse-border bg-pulse-surface motion-reduce:animate-none" />)}</div>
      <div className="grid gap-4 lg:grid-cols-2">{Array.from({ length: 2 }, (_, index) => <div key={index} className="h-80 animate-pulse rounded-xl border border-pulse-border bg-pulse-surface motion-reduce:animate-none" />)}</div>
    </div>
  );
}
