import { RiInbox2Line } from "@remixicon/react";
import { Card } from "@/components/tremor/card";

export function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <Card className="grid min-h-52 place-items-center p-8 text-center">
      <div>
        <RiInbox2Line aria-hidden="true" className="mx-auto h-8 w-8 text-slate-500" />
        <h2 className="mt-3 font-semibold text-slate-200">{title}</h2>
        <p className="mt-1 text-sm text-slate-400">{description}</p>
      </div>
    </Card>
  );
}
