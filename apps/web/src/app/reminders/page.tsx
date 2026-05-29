import { PageHeading } from "@/components/page-heading";
import { ReminderBoard } from "@/components/reminder-board";

export default function RemindersPage() {
  return (
    <>
      <PageHeading kicker="Reminders" title="Things to come back to" copy="Reminders stay linked to the memory they came from - whether you set them yourself or Quipo spotted them in a dump." />
      <ReminderBoard />
    </>
  );
}
