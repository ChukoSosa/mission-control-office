import { NextRequest, NextResponse } from "next/server";
import { onEvent, getListenerCount } from "@/app/api/server/event-bus";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const headers = new Headers({
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    "Connection": "keep-alive",
    "Access-Control-Allow-Origin": "*",
  });

  const responseStream = new ReadableStream({
    start(controller) {
      // Listener for events
      const unsubscribe = onEvent((event) => {
        try {
          const data = `data: ${JSON.stringify(event)}\n\n`;
          controller.enqueue(new TextEncoder().encode(data));
        } catch (error) {
          console.error("Error encoding event:", error);
        }
      });

      // Keep-alive: send a keep-alive message every 15 seconds
      const keepAliveInterval = setInterval(() => {
        try {
          controller.enqueue(new TextEncoder().encode(":keep-alive\n\n"));
        } catch (error) {
          clearInterval(keepAliveInterval);
          unsubscribe();
          controller.close();
        }
      }, 15000);

      // Cleanup on connection close
      request.signal.addEventListener("abort", () => {
        clearInterval(keepAliveInterval);
        unsubscribe();
        controller.close();
      });
    },
  });

  return new NextResponse(responseStream, { headers });
}
