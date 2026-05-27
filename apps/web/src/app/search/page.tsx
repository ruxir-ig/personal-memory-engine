import { PageHeading } from "@/components/page-heading";
import { SearchWorkbench } from "@/components/search-workbench";

export default function SearchPage() {
  return (
    <>
      <PageHeading
        kicker="Hybrid retrieval"
        title="Search memories with inspectable ranking"
        copy="The v0 search path combines keyword matches with semantic-like overlap, graph context, recency, and feedback placeholders. Postgres full-text and pgvector are modeled in the schema for the durable path."
      />
      <SearchWorkbench />
    </>
  );
}
