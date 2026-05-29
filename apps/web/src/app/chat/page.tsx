import { ChatPanel } from "@/components/chat-panel";
import { PageHeading } from "@/components/page-heading";

export default function ChatPage() {
  return (
    <>
      <PageHeading kicker="Ask" title="Ask your memory" copy="Ask questions in plain language. Quipo answers only from what you have saved and links back to the source." />
      <ChatPanel />
    </>
  );
}
