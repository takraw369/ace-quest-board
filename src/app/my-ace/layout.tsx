import type { ReactNode } from "react";
import PrivateOsPanel from "@/components/admin/PrivateOsPanel";
import VoiceInboxLink from "@/components/admin/VoiceInboxLink";

export default function MyAceLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <PrivateOsPanel />
      <VoiceInboxLink />
      {children}
    </>
  );
}
