import type { ReactNode } from "react";
import PrivateOsPanel from "@/components/admin/PrivateOsPanel";
import VoiceInboxLink from "@/components/admin/VoiceInboxLink";
import QuestEvidencePanel from "@/components/my-ace/QuestEvidencePanel";

export default function MyAceLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <PrivateOsPanel />
      <VoiceInboxLink />
      <QuestEvidencePanel />
      {children}
    </>
  );
}
