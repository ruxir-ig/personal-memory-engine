"use client";

import { ChatPanel } from "@/components/chat-panel";
import { PageHeading } from "@/components/page-heading";
import { useCanvasLayout } from "@/client/hooks";

export default function ChatPage() {
  const layout = useCanvasLayout(new Date().toISOString());
  const suggestions = layout.data?.blocks.find((block) => block.type === "ask")?.suggestions ?? [];

  return (
    <>
      <PageHeading kicker="Ask" title="Ask your memory" copy="Ask questions in plain language. Quipo answers only from what you have saved and links back to the source." />
      <ChatPanel suggestions={suggestions} />
    </>
  );
}
