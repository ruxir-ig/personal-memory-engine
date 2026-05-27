import { PageHeading } from "@/components/page-heading";
import { SettingsPanel } from "@/components/settings-panel";

export default function SettingsPage() {
  return (
    <>
      <PageHeading
        kicker="Settings"
        title="Configure providers, retention, notifications, and UI preferences"
        copy="V0 accepts API provider credentials in the local store. This keeps the browser app simple while marking encryption as a required hardening step before hosted or multi-user use."
      />
      <SettingsPanel />
    </>
  );
}
