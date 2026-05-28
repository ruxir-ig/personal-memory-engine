import { CaptureComposer } from "@/components/capture-composer";
import { PageHeading } from "@/components/page-heading";

export default function IngestPage() {
  return (
    <>
      <PageHeading
        kicker="Ingest"
        title="Add memory"
        copy="Use this as the clean input surface for notes, deadlines, files, and context. The canvas stays focused on quick glance."
      />
      <div className="ingest-layout">
        <CaptureComposer />
      </div>
    </>
  );
}
