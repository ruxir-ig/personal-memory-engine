import { ListsBoard } from "@/components/lists-board";
import { PageHeading } from "@/components/page-heading";

export default function ListsPage() {
  return (
    <>
      <PageHeading kicker="Tasks" title="Tasks" copy="Track work locally and keep the agent's reusable prompt-tools visible." />
      <ListsBoard />
    </>
  );
}
