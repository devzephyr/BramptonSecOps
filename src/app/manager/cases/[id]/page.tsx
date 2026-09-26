"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect } from "react";
import { CaseCeremony } from "@/components/desk/case-ceremony";
import { RolePage } from "@/components/desk/role-page";
import { DeskShell } from "@/components/desk/shell";
import type { SessionUser } from "@/lib/desk-client";
import type { Role } from "@/preview/data";
import { StoreProvider, useDesk } from "@/preview/store";

function CasePageBody({ caseId, onSignOut }: { caseId: string; onSignOut: () => void }) {
  const router = useRouter();
  const { openCase, notes, user } = useDesk();
  const role = user.role as Role;

  useEffect(() => openCase(caseId), [caseId, openCase]);

  const alertCount = notes.filter((note) => note.audience.includes(role) && !note.read).length;

  return (
    <DeskShell user={user} alertCount={alertCount} onSignOut={onSignOut}>
      <CaseCeremony onBack={() => router.push("/manager")} />
    </DeskShell>
  );
}

export default function ManagerCasePage() {
  const params = useParams();
  const caseId = String(params.id ?? "");
  return (
    <RolePage
      roles={["manager", "admin"]}
      render={(user: SessionUser, signOut) => (
        <StoreProvider user={user}>
          <CasePageBody caseId={caseId} onSignOut={signOut} />
        </StoreProvider>
      )}
    />
  );
}
