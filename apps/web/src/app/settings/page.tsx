import { PageHeading } from "@/components/page-heading";
import { SettingsPanel } from "@/components/settings-panel";

export default function SettingsPage() {
  return (
    <>
      <PageHeading
        kicker="Profile"
        title="Profile and API keys"
        copy="Keep your local profile, model provider, and capture defaults in one place. API keys stay in the local prototype store."
      />
      <SettingsPanel />
    </>
  );
}
