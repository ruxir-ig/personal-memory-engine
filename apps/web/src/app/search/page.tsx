import { PageHeading } from "@/components/page-heading";
import { SearchWorkbench } from "@/components/search-workbench";

export default function SearchPage() {
  return (
    <>
      <PageHeading kicker="Search" title="Find anything you saved" copy="Search across every note, link, key, and file. Results show how strongly they match and why." />
      <SearchWorkbench />
    </>
  );
}
