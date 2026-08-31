import type { ReactNode } from "react";
import PrivateOsPanel from "@/components/admin/PrivateOsPanel";

export default function MyAceLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <PrivateOsPanel />
      {children}
    </>
  );
}
