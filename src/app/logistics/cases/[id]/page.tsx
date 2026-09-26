"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect } from "react";
import { CaseCeremony } from "@/components/desk/case-ceremony";
import { RolePage } from "@/components/desk/role-page";
import { DeskShell } from "@/components/desk/shell";
import type { SessionUser } from "@/lib/desk-client";
import { StoreProvider, useDesk } from "@/preview/store";

function CasePageBody({ caseId, onSignOut }: { caseId: string; onSignOut: () => void }) {
  const router = useRouter();
  const { openCase, user } = useDesk();

  useEffect(() => openCase(caseId), [caseId, openCase]);

  return (
    <DeskShell user={user} onSignOut={onSignOut}>
      <CaseCeremony onBack={() => router.push("/logistics")} />
    </DeskShell>
  );
}

export default function LogisticsCasePage() {
  const params = useParams();
  const caseId = String(params.id ?? "");
  return (
    <RolePage
      roles={["logistics", "admin"]}
      render={(user: SessionUser, signOut) => (
        <StoreProvider user={user}>
          <CasePageBody caseId={caseId} onSignOut={signOut} />
        </StoreProvider>
      )}
    />
  );
}
