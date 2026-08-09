import { getTimeline } from "@/server/queries";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET(request: Request) {
  const encoder = new TextEncoder();
  let lastEventId = request.headers.get("last-event-id") ?? "";
  let timer: ReturnType<typeof setInterval> | undefined;
  const stream = new ReadableStream({
    start(controller) {
      const send = () => {
        const latest = getTimeline(1)[0];
        if (latest && latest.id !== lastEventId) {
          lastEventId = latest.id;
          controller.enqueue(encoder.encode(`id: ${latest.id}\nevent: operational-event\ndata: ${JSON.stringify(latest)}\n\n`));
        } else {
          controller.enqueue(encoder.encode(": keepalive\n\n"));
        }
      };
      send();
      timer = setInterval(send, 15_000);
    },
    cancel() { if (timer) clearInterval(timer); }
  });
  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive"
    }
  });
}
