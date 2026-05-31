import { PageHeading } from "@/components/page-heading";
import { SettingsPanel } from "@/components/settings-panel";

export default function SettingsPage() {
  return (
    <>
      <PageHeading kicker="Settings" title="Preferences" copy="Profile, appearance, vault, and AI keys — stored on this device only." />
      <SettingsPanel />
    </>
  );
}
