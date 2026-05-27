import { CaptureComposer } from "@/components/capture-composer";
import { InboxPanel } from "@/components/inbox-panel";
import { PageHeading } from "@/components/page-heading";

export default function CapturePage() {
  return (
    <>
      <PageHeading
        kicker="Capture inbox"
        title="Classify before storing or acting"
        copy="Every note and import passes through the intent layer. Low-risk memory and summaries are created immediately; reminders, retention decisions, and preferences stay reviewable."
      />
      <div className="grid-dashboard">
        <CaptureComposer />
        <InboxPanel />
      </div>
    </>
  );
}
