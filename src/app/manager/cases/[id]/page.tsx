"use client";

import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { CaseCeremony } from "@/components/desk/case-ceremony";
import { DeskShell } from "@/components/desk/shell";
import { SignInScreen } from "@/components/desk/sign-in";
import { fetchSession, signOutSession, type SessionUser } from "@/lib/desk-client";
import { I18nProvider } from "@/lib/i18n";
import type { Role } from "@/preview/data";
import { StoreProvider, useDesk } from "@/preview/store";

function CasePageBody({ caseId, onSignOut }: { caseId: string; onSignOut: () => void }) {
  const desk = useDesk();
  const { openCase, caseId: openId, notes, user } = desk;
  const role = user.role as Role;

  useEffect(() => {
    if (openId !== caseId) openCase(caseId);
  }, [caseId, openCase, openId]);

  const alertCount = notes.filter((note) => {
    const audience = Array.isArray(note.audience) ? note.audience : [];
    return audience.includes(role) && !note.read;
  }).length;

  return (
    <DeskShell user={user} alertCount={alertCount} onSignOut={onSignOut}>
      <CaseCeremony />
    </DeskShell>
  );
}

function ManagerCaseInner() {
  const params = useParams();
  const router = useRouter();
  const caseId = String(params.id ?? "");
  const [user, setUser] = useState<SessionUser | null | undefined>(undefined);

  useEffect(() => {
    void fetchSession().then(setUser);
  }, []);

  const signOut = useCallback(async () => {
    await signOutSession();
    router.replace("/sign-in");
  }, [router]);

  if (user === undefined) return null;
  if (!user) return <SignInScreen onSignedIn={() => void fetchSession().then(setUser)} />;
  if (user.role !== "manager" && user.role !== "admin") {
    router.replace("/sign-in");
    return null;
  }

  return (
    <StoreProvider user={user}>
      <CasePageBody caseId={caseId} onSignOut={() => void signOut()} />
    </StoreProvider>
  );
}

export default function ManagerCasePage() {
  return (
    <I18nProvider>
      <ManagerCaseInner />
    </I18nProvider>
  );
}
