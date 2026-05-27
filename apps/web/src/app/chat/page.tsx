import { ChatPanel } from "@/components/chat-panel";
import { PageHeading } from "@/components/page-heading";

export default function ChatPage() {
  return (
    <>
      <PageHeading
        kicker="Cited retrieval"
        title="Ask questions over memory, not loose model context"
        copy="This first chat path retrieves local chunks, reports uncertainty, and links every answer back to source artifacts."
      />
      <ChatPanel />
    </>
  );
}
