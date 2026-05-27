import { PageHeading } from "@/components/page-heading";
import { ReminderBoard } from "@/components/reminder-board";

export default function RemindersPage() {
  return (
    <>
      <PageHeading
        kicker="Actions"
        title="Reminders stay linked to their source memory"
        copy="V0 supports explicit reminders, confirmed reminder proposals from capture, and browser notification permission. Calendar integration is intentionally deferred."
      />
      <ReminderBoard />
    </>
  );
}
