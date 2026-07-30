"use client";

import { SessionProvider } from "@/context/SessionContext";
import { useParams } from "next/navigation";
import LiveSessionContent from "./LiveSessionContent";

export default function LiveSessionPage() {
  const params = useParams();
  const sessionId = params.id as string;

  return (
    <SessionProvider sessionId={sessionId}>
      <LiveSessionContent sessionId={sessionId} />
    </SessionProvider>
  );
}
