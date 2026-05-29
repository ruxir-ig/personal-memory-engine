import { PageHeading } from "@/components/page-heading";
import { SettingsPanel } from "@/components/settings-panel";

export default function SettingsPage() {
  return (
    <>
      <PageHeading kicker="Settings" title="Profile & providers" copy="Your name, your AI provider, and capture defaults. Everything stays on your device." />
      <SettingsPanel />
    </>
  );
}
