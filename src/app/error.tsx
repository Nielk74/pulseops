"use client";

import { useEffect } from "react";
import { RiErrorWarningLine, RiRefreshLine } from "@remixicon/react";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error(error); }, [error]);
  return (
    <div className="grid min-h-[60vh] place-items-center text-center">
      <div className="max-w-md"><span className="mx-auto grid h-12 w-12 place-items-center rounded-xl bg-red-400/10 text-red-300"><RiErrorWarningLine className="h-6 w-6" /></span><h1 className="mt-5 text-xl font-semibold text-white">Operational data could not be loaded</h1><p className="mt-2 text-sm leading-6 text-slate-400">Check database migrations and connector health, then retry. Stale or failed sources are never represented as healthy.</p><button type="button" onClick={reset} className="button-primary mt-6"><RiRefreshLine className="h-4 w-4" /> Retry</button></div>
    </div>
  );
}
